import { HashMap } from '../lib/TeTool';
import { netInst } from '../NetMgr/SeNetMgr';
import { configInst } from '../lib/TeConfig';

export var Servers = ['cloudserver','raceserver']


class SeLinkInfo {
    public constructor(nid) {
        this.nid = nid;
    }
    public ready: boolean = false;
    public type: string = 'unknow';
    public sid: string = null;
    public nid: string;
    public url: string = '';
    public plt: string = '';
}


class ServerMgr {
    //只加不减的服务器数据统计变量
    private _no_recy_server_: {[key: string]: {}} = {};    
    private _all_server_: HashMap<SeLinkInfo> = new HashMap<SeLinkInfo>();
    private _sid_type_ = {};

    private _find_(type: string, key: string, v: string) {
        return this._all_server_.find(type, key, v);
    }

    get_server(sid: string) {
        var type = this._sid_type_[sid];
        var s = this._find_(type, 'sid', sid);
        if (s && s.length > 0) return s[0];
        return null;
    }

    find_server(nid: string) {
        var keys = this._all_server_.keys;
        for (var key in keys) {
            var o = this._all_server_.find(keys[key], 'nid', nid);
            if (o && o.length > 0) return o[0];
        }

        return null;
    }

    find_race_by_rurl(rurl: string) {
        var keys = this._all_server_.keys;
        for (var key in keys) {
            var o = this._all_server_.find(keys[key], 'url', rurl);
            if (o && o.length > 0) return o[0];
        }

        return null;
    }

    find_servers_by_type(type: string, plt: string) {
        var servers = this._all_server_.find(type, 'type', type);
        var outs = [];
        for (var i = 0; i < servers.length; i++) {
            if (servers[i].plt == plt) {
                outs.push(servers[i]);
            }
        }

        return outs;
    }

    add_server(type: string, nid: string, sid: string, url: string, plt: string) {
        //统计
        if (!this._no_recy_server_[plt + type]) this._no_recy_server_[plt + type] = {};
        this._no_recy_server_[plt + type][sid] = 1;

        if (url) {
            // url = url.replace('119.90.49.203', 'ddms-server.shandw.com');
            // url = url.replace('192.168.218.73', 'localhost');
        }

        this._sid_type_[sid] = type;

        var s = new SeLinkInfo(nid);
        s.sid = sid;
        s.url = url;
        s.type = type;
        s.plt = plt;
        this._all_server_.add(type, s);
    }

    del_server(nid: string) {
        var s = this.find_server(nid);
        if (s) this._all_server_.find2Del(s.type, 'nid', nid);
    }

    batchByType(type: string, info: any) {
        var all_server = this._all_server_.get(type);
        for (var i = 0; i < all_server.length; i++) {
            var rs = all_server[i];
            if (rs) netInst.sendData(info, rs.nid);
        }
    }

    count_no_recy_server(type: string, plt: string) {
        if (configInst.get('debug')) {
            return 0;
        }

        let servers = this._no_recy_server_[plt + type];
        if (!servers) {
            return 0;
        }

        console.log(servers);
        return Object.keys(servers).length;
    }
}

export var serverMgrInst = new ServerMgr();
