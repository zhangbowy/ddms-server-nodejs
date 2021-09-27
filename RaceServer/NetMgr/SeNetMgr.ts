import * as TeNet from '../lib/TeNet';
import * as TeWSNet from '../lib/TeWSNet';
import { EventEmitter } from 'events';
import { TeMap } from '../lib/TeTool';
import { configInst } from '../lib/TeConfig';

export class TeNetSolt {
    private _parent_: TeNetMgr;
    nid: string = '';
    server: boolean = false;
    conn: TeNet.TeNet | TeWSNet.TeNet;
    /**
     * 链接的类型，这个用户自定义
     */
    type: string;
    /**
     * 用户验证的key，服务端作为验证检查用的，连接端作为连接上报用
     */
    registKeys: Array<string> = [];

    checkTimeOut: number = 10 * 1000;
    checkSel: number = 0;
    /**
     * 没有验证的id 这个采用两个容器处理，做一个最小 
     */
    unchecklinkid: Array<Array<string>> = [[], []];

    constructor(_parent: TeNetMgr) {
        this._parent_ = _parent;
        setTimeout(this.check.bind(this), this.checkTimeOut);
    }

    isIn(nid: string) {
        var _nid = this.nid;
        var _linkid;
        var al = nid.split('_');
        if (al.length == 2) {
            _nid = al[0];
            _linkid = al[1];
        }
        else if (al.length == 1) {
            _linkid = al[0];
        }

        if (nid == this.nid) return true;
        return false;
    }

    addCheckLinkID(linkid) {
        if (!this.server || this.registKeys.length == 0) {
            return;
        }

        this.unchecklinkid[1 - this.checkSel].push(linkid);
    }

    delCheckLinkID(linkid) {
        if (!this.server || this.registKeys.length == 0) {
            return;
        }

        var list = this.unchecklinkid[1 - this.checkSel];
        var index = list.indexOf(linkid);
        if (index >= 0) {
            list.splice(index, 1);
        }
    }

    private check() {
        if (!this.server || this.registKeys.length == 0) {
            return;
        }

        var list = this.unchecklinkid[this.checkSel];
        for (var i = 0; i < list.length; i++) {
            this.conn.disconnect(list[i]);
        }

        this.unchecklinkid[this.checkSel] = [];
        this.checkSel = 1 - this.checkSel;

        setTimeout(this.check.bind(this), this.checkTimeOut);
    }
}

/**
 * 这里负责管理所有的链接
 * 自带一个简易的验证机制，防止恶性连接的不断接入
 */
export class TeNetMgr {
    private genID: number = 0;

    private _eventEmitter: EventEmitter;

    private _connectUrls: Array<string> = [];
    private _allNet: TeMap<TeNetSolt> = new TeMap<TeNetSolt>();

    constructor() {
        this._eventEmitter = new EventEmitter();
    }

    public on(stype: string, event: string, listener: Function) {
        return this._eventEmitter.on(stype + '|' + event, listener as any);
    }

    public once(stype: string, event: string, listener: Function) {
        return this._eventEmitter.once(stype + '|' + event, listener as any);
    }

    public removeListener(stype: string, event: string, listener: Function) {
        return this._eventEmitter.removeListener(stype + '|' + event, listener as any);
    }

    // public removeAllListeners(stype: string, event?: string) {
    //     return this._eventEmitter.removeAllListeners(stype + '|' + event);
    // }

    public emit(stype: string, event: string, ...args: any[]) {
        return this._eventEmitter.emit(stype + '|' + event, ...args);
    }

    /**
     * 获取网络连接服务
     * @param id 
     */
    getNet(id: string): TeNetSolt {
        return this._allNet.get(id);
    }

    /**
     * 检查url是否已经连接过
     * @param sUrl 
     */
    checkUrl(sUrl: string) {
        return this._connectUrls.indexOf(sUrl) >= 0;
    }

    /**
     * 
     * @param type 用户定义的类型
     * @param port 监听的端口
     * @param flag 监听的网络设置
     * @param registKeys 链接用的注册key 如果不为空表示注册需要携带的key，验证成功后才会抛出connected给上层
     * @param oneKeyMode 表示一个注册key是否只能有一个连接，默认是否
     */
    public listen(type: string, port: number, flag?: any, open_http_https: boolean = false, registKeys?: string | Array<string>, oneKeyMode: boolean = false): TeNetSolt {
        flag = flag || {
            "log level": 4,
            "heartbeat interval": 5,
            "close timeout": 10,
            "reconnection delay": 1
        }

        var net = new TeNetSolt(this);
        net.server = true;
        net.type = type;
        net.nid = 'n' + this.genID++;
        if (registKeys) {
            if (registKeys instanceof Array) {
                net.registKeys = registKeys;
            }
            else {
                net.registKeys.push(registKeys);
            }
        }

        let plt = configInst.get('plt');

        // if (plt.indexOf('sdw') == 0 || plt.indexOf('qzone') == 0 || plt.indexOf('zlzy') == 0) {
        //     net.conn = new TeNet.TeNet();
        //     if (open_http_https) {
        //         net.conn.listen(port + 80, flag, port + 443, null, port);
        //     }
        //     else {
        //         net.conn.listen(port, flag);
        //     }
        // }
        // else {
            net.conn = new TeWSNet.TeNet();
            net.conn.listen(port, flag);
        // }

        net.conn.on('data', this._onData.bind(this, net));
        net.conn.on('connected', this._onConnected.bind(this, net));
        net.conn.on('disconnect', this._onDisconnect.bind(this, net));

        this._allNet.set(net.nid, net);
        return net;
    }

    /**
     * 链接一个服务
     * @param type 自定义链接的类型 
     * @param url 链接地址
     * @param flag 链接配置
     * @param registKey 链接成功后发送的验证密钥，如果为空，那么就不发送
     * @param registID 验证的时候上报自己的id，做唯一性检查
     */
    connect(type: string, url: string, flag?: any, registKey?: string, registID?: string): TeNetSolt {
        flag = flag || {
            "log level": 4,
            "heartbeat interval": 5,
            "close timeout": 10,
            "reconnection delay": 1
        }
        if (this.checkUrl(url)) return null;
        var net = new TeNetSolt(this);
        net.nid = 'n' + this.genID++;
        net.type = type;
        if (registKey) {
            net.registKeys.push(registKey);
        }

        net.conn = new TeNet.TeNet();
        net.conn.connect(url, flag);
        net.conn.on('data', this._onData.bind(this, net));
        net.conn.on('connected', this._onConnected.bind(this, net));
        net.conn.on('disconnect', this._onDisconnect.bind(this, net));

        this._allNet.set(net.nid, net);
        return net;
    }

    /**
     * 接收数据，这里实现一个简单的验证机制，高级的机制需要业务逻辑自己处理
     * @param s 
     * @param linkid 
     * @param data 
     */
    private _onData(s: TeNetSolt, linkid: string, data: string) {
        var nlinkid = s.nid + '_' + linkid;
        switch (data['cmd']) {
            case '_regist_': {
                if (s.server && s.registKeys.indexOf(data['registKey']) >= 0) {
                    var registCmd = {
                        cmd: '_regist_ret_',
                        registKey: s.registKeys[0],
                    }
                    s.conn.sendData(registCmd, linkid);
                    this.emit(s.type, NetEvent.connected, nlinkid);
                    s.delCheckLinkID(linkid);
                }
                break;
            }
            case '_regist_ret_': {
                if (!s.server) {
                    this.emit(s.type, NetEvent.connected, nlinkid);
                }
                break;
            }
            default:
                if (data['cmd']) {
                    this.emit(s.type, data['cmd'], nlinkid, data);
                }
                else {
                    this.emit(s.type, 'data', nlinkid, data);
                }
                break;
        }
    }

    private _onConnected(s: TeNetSolt, linkid: string) {
        // 这里抛出的linkid 需要加上nid 给上层
        var nlinkid = s.nid + '_' + linkid;
        if (s && s.registKeys && s.registKeys.length != 0) {
            if (!s.server) {
                var registCmd = {
                    cmd: '_regist_',
                    registKey: s.registKeys[0],
                }
                s.conn.sendData(registCmd);
            }
            else {
                s.addCheckLinkID(linkid);
            }
        }
        else {
            this.emit(s.type, NetEvent.connected, nlinkid);
        }
    }

    private _onDisconnect(s: TeNetSolt, linkid: string, uid: number) {
        linkid = s.nid + '_' + linkid;
        this.emit(s.type, NetEvent.disconnect, linkid, uid);
    }

    /**
     * 给一个链接发送信息
     * @param data 
     * @param linkid 
     */
    public sendData(data: any, linkid: string) {
        data['_sys_'] = {
            plt: configInst.get('plt'),
            serverid: configInst.get('serverid')
        }

        if (!linkid) return false;
        var sps = linkid.split('_', 2);
        var nid = sps[0] || '';
        var linkid = sps[1] || '';
        var net = this.getNet(nid);
        if (net) {
            return net.conn.sendData(data, linkid);
        }

        return false;
    }

    /**
     * 断开某一个链接
     * @param linkid 
     */
    public disconnect(linkid: string) {
        var sps = linkid.split('_', 2);
        var nid = sps[0] || '';
        var linkid = sps[1] || '';
        var net = this.getNet(nid);
        if (net) {
            return net.conn.disconnect(linkid);
        }

        return false;
    }

    /**
     * 关闭某一个服务
     * @param nid 
     */
    public closeNet(nid: string) {
        var net = this.getNet(nid);
        if (net) {
            net
        }

        return false;
    }

    /**
     * 添加到定时过期列表，未删除就会自动断开
     * @param linkid 
     */
    addCheckLink(linkid: string) {
        var sps = linkid.split('_', 2);
        var nid = sps[0] || '';
        var linkid = sps[1] || '';
        var net = this.getNet(nid);
        net && net.addCheckLinkID(linkid);
    }

    /**
     * 从定时过期列表中去除
     * @param linkid 
     */
    delCheckLink(linkid: string) {
        var sps = linkid.split('_', 2);
        var nid = sps[0] || '';
        var linkid = sps[1] || '';
        var net = this.getNet(nid);
        net && net.delCheckLinkID(linkid);
    }

    /**
     * 获取一个类型的连接的nid
     * @param type 
     */
    getNets(type: string) {
        var out: Array<string> = [];
        var net_keys = this._allNet.keys;
        for (var i = 0; i < net_keys.length; i++) {
            var r_net = this._allNet.get(net_keys[i]);
            if (r_net && r_net.type == type) {
                out.push(r_net.nid);
            }
        }

        return out;
    }

}

export var netInst = new TeNetMgr();

export var NetEvent = {
    /**
     * 抛出的事件链接成功 function( linkid: string);
     */
    connected: 'connected',
    /**
     * 抛出的事件接收到数据 function(linkid: string,data:any);
     */
    data: 'data',

    /**
     * 抛出的事件断开链接 function(linkid: string);
     */
    disconnect: 'disconnect',
}