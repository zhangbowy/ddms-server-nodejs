import { TeMap, HashMap } from '../lib/TeTool';
import { netMgrInst } from './NetMgr';
import * as fs from 'fs';
import { join } from 'path';

// 这里管理所有的 服务器
// 主要是 cls的能力，修改容量，修改


export class ServerInfo {
    constructor(linkid) {
        this.linkid = linkid;
    }

    public id: string;
    public linkid;
    public type: string;     // 服务器的类型
    public ready = false;

    public plt: string;
    // cls 使用
    public onlinenum: number = 0;
    public url?: string;
}

interface OtherConfig {
    sid: string;
}

interface ClsConfig {
    sid: string;        // 服务ID
    mx_num: number;    // 最大承载数量
    open: boolean;     // s是否开放

    force_ip_2_url_map: Object;       // 玩家ip和url地址的映射 这个是备用手段，修改错误的地址的时候
}

class MonitClass {

    config_path = '';

    private serverID_2_linkID_map: TeMap<string> = new TeMap<string>();
    private server_map: TeMap<ServerInfo> = new TeMap<ServerInfo>();

    private _timeout_list_: HashMap<string> = new HashMap<string>();


    constructor() {
        this.config_path = join(__dirname, '../server_conf.json');

        setInterval(this.update.bind(this), 1000);

        fs.watchFile(this.config_path, this._watchFile.bind(this));
        this._load_server_config();
    }

    update() {
        this._update_timeout_();
    }

    private _update_timeout_() {
        var d_t = Math.floor(Date.now() / 1000) % 15;
        var rList = this._timeout_list_.get(d_t);

        for (var i = 0; i < rList.length; i++) {
            var server = this.server_map.get(rList[i]);
            if (server && !server.ready) {
                netMgrInst.disconnect(server.linkid);
            }
        }

        this._timeout_list_.del(d_t);
    }

    /**
     * 添加新的连接
     * @param linkID 连接id 
     */
    add_server(linkID: string) {
        var s = new ServerInfo(linkID);
        this.server_map.set(linkID, s);
        this._timeout_list_.add(Math.floor(Date.now() / 1000) % 15, linkID);
    }

    regist_server(linkid: string, serverid: string) {
        if (this.server_map.has(linkid)) {
            this.serverID_2_linkID_map.set(serverid, linkid);
        }

        var rserver = this.server_map.get(linkid);
        this._check_cls_config(rserver);
    }

    /**
     * 获取服务对象
     * @param id 服务id
     */
    get_server(id: string) {
        var linkid = this.serverID_2_linkID_map.get(id);
        return this.get_server_l(linkid);
    }

    /**
     * 获取服务对象
     * @param linkid 链接对象
     */
    get_server_l(linkid: string) {
        return this.server_map.get(linkid);
    }

    public get_server_by_type_all(type: string, plt?: string): ServerInfo[] {
        var out = [];
        this.server_map.forEach((key, r_s) => {
            if (!r_s) return false;
            if (r_s.type != type) return false;
            if (plt && r_s.plt != plt) return false;
            out.push(r_s)
        });

        return out;
    }


    /**
    * 链接 是否存在
    * @param linkid 链接对象
    */
    has_linkID(linkid: string) {
        return this.server_map.has(linkid);
    }

    /**
     * 大区ID 是否存在
     * @param serverid 链接对象
     */
    has_serverID(serverid: string) {
        return this.serverID_2_linkID_map.has(serverid);
    }

    /**
     * 删除服务对象
     * @param sid 服务id
     */
    del_server(sid: string) {
        if (!this.serverID_2_linkID_map.has(sid)) return;
        this.del_server_l(this.serverID_2_linkID_map.get(sid));
    }

    /**
     * 删除服务对象
     * @param linkid 连接id 
     */
    del_server_l(linkid: string) {
        if (!this.server_map.has(linkid)) return;

        var rs = this.server_map.get(linkid);
        if (rs.id) this.serverID_2_linkID_map.del(rs.id);
        this.server_map.del(linkid);
    }

    // 按照类型发送信息
    public get_server_link_by_type(type: string, plt: string) {
        var out = this.server_map.forEach((key, r_s) => {
            if (!r_s) return false;
            if (r_s.type != type) return false;
            if (plt && r_s.plt != plt) return false;
            return true;
        });

        return out && out.linkid;
    }

    public get_server_link_by_type_all(type: string, plt?: string) {
        var out = [];
        this.server_map.forEach((key, r_s) => {
            if (!r_s) return false;
            if (r_s.type != type) return false;
            if (plt && r_s.plt != plt) return false;
            out.push(r_s.linkid)
        });

        return out;
    }

    public add_online_num(serverid: string) {
        var linkServer: ServerInfo = this.get_server(serverid);
        if (linkServer) {
            linkServer.onlinenum++;
        }
    }

    public del_online_num(serverid: string) {
        var linkServer: ServerInfo = this.get_server(serverid);
        if (linkServer) {
            linkServer.onlinenum--;
        }
    }

    private _server_sorted(a: { id: string, num: number }, b: { id: string, num: number }) {
        if (a.num > b.num) return 1;
        if (b.num > a.num) return -1;
        return a.id > b.id ? 1 : -1;
    }

    /**
     * 这里返回各个cls的id给前端
     * @param type 
     * @param localip 
     */
    public get_minimum_num_ip_by_type(type: string, plt: string) {
        var match_server: { id: string, num: number, url: string }[] = [];
        this.server_map.forEach((key, rkServer) => {
            if (rkServer.type != type || rkServer.plt != plt) {
                return false;
            }

            // 这里看看有没有 配置
            if (!this._check_cls_config(rkServer)) return false;

            match_server.push({
                id: rkServer.id,
                num: rkServer.onlinenum,
                url: rkServer.url
            })
        });

        var outids = {
            id: '',
            url: '',
        };

        match_server.sort(this._server_sorted);
        if (match_server.length > 0) {
            var lucky = match_server[0];

            if (lucky.url && lucky.url.length > 0) {
                outids.url = lucky.url;
            }

            outids.id = lucky.id;
        }

        return outids;
    }

    public get_num_by_type(type: string, plt: string) {
        var match_server: number[] = [];
        this.server_map.forEach((key, rkServer) => {
            if (rkServer.type != type || rkServer.plt != plt) {
                return false;
            }

            match_server[rkServer.id] = rkServer.onlinenum;
        });

        return match_server;
    }

    public get_server_links(type: string, plt: string) {
        var match_server: string[] = [];
        this.server_map.forEach((key, rkServer) => {
            if (rkServer.type != type || rkServer.plt != plt) {
                return false;
            }

            match_server.push(rkServer.linkid);
        });

        return match_server;
    }


    //------------------------------------//

    private _watchFile(curr: fs.Stats, prev: fs.Stats) {
        if (prev.ctime.getTime() == 0 && curr.ctime.getTime() != 0) {
            //console.log('文件被创建!');
            this._load_server_config();
        } else if (curr.ctime.getTime() == 0) {
            // console.log('文件被删除!');
            // 文件删除了，但是配置先不要响应删除操作了
            this._server_config_.clear();

        } else if (curr.mtime.getTime() != prev.mtime.getTime()) {
            // console.log('文件有修改');
            this._load_server_config();
        }
    }

    private _server_config_: TeMap<any> = new TeMap<any>();
    private _load_server_config() {
        this._server_config_.clear();
        var configs = {};
        try {
            var infos = fs.readFileSync(this.config_path);
            configs = JSON.parse(infos.toString());
        }
        catch (e) {
            configs = {};
        }

        // 初始化内容
        for (var key in configs) {
            this._server_config_.set(key, configs[key]);
        }
    }

    get_server_config(sid: string, type: string): ClsConfig | OtherConfig {
        var r_map = this._server_config_.get(type);
        if (!r_map) r_map = {};
        switch (type) {
            case 'cls': return r_map[sid];
            default:
                return r_map[sid];
        }
    }

    private _check_cls_config(server: ServerInfo) {
        // return true;
        var r_conf = this.get_server_config(server.id, server.type) as ClsConfig;
        if (!r_conf) return true;

        if (r_conf.open != undefined && !r_conf.open) return false;

        if (r_conf.mx_num != undefined && server.onlinenum >= r_conf.mx_num) return false;

        if (!r_conf.force_ip_2_url_map != undefined && r_conf.force_ip_2_url_map.hasOwnProperty(server.url)) {
            // 如果这个里面有映射系统
            server.url = r_conf.force_ip_2_url_map[server.url];
        }

        return true;
    }

    public modify_server(sid: string, info: any) {
        // 这里需要先确认服务在线上
        if (!this.has_serverID(sid)) return false;
        var r_s = this.get_server(sid);

        this._modify_config(sid, r_s.type, info);
        this._save_file_();

        return true;
    }

    private _modify_config(sid: string, type: string, info: any) {
        var r_conf = this.get_server_config(sid, type);
        if (!r_conf) {
            var r_map = this._server_config_.get(type);
            r_map[sid] = info;
            this._server_config_.set(type, r_map);
        }
        else {
            for (var key in info) {
                r_conf[key] = info[key];
            }
        }
    }

    private _save_file_() {
        fs.writeFileSync(this.config_path, JSON.stringify(this._server_config_._data, null, 4));
    }

    /**
     * 获取服务器状态，这里有两个部分，一个服务器信息，一个配置信息
     * @param type 
     */
    public get_server_info(plt: string) {
        var infos: {
            sid: string,
            config: any,
            plt: string,
            // cls 使用
            onlinenum: number,
            url?: string
        }[] = [];

        this.server_map.forEach((key: string, v: ServerInfo) => {
            if (plt != v.plt) return false;

            var confg = this.get_server_config(v.id, v.type)

            infos.push({
                sid: v.id,
                config: confg || { sid: v.id },
                plt: v.plt,
                // cls 使用
                onlinenum: v.onlinenum,
                url: v.url
            });
            return false;
        });

        return infos;
    }
}

export var serverMonitInst = new MonitClass();