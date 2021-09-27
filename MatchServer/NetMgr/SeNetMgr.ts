import { TeNet } from '../lib/TeNet';
import { EventEmitter } from 'events';
import { configInst } from '../lib/TeConfig';

export class TeNetSolt {
    private _parent_: TeNetMgr;
    nid: string = '';
    server: boolean = false;
    conn: TeNet;
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
export class TeNetMgr extends EventEmitter {
    private genID: number = 0;

    private _listenPorts: Array<number> = [];
    private _connectUrls: Array<string> = [];
    private _allNet: Object = {};

    private _proc_cost_: Object = {};
    private _proc_sum_time: number = 0;
    private _cmd_sum_: Object = {};
    public add_proc_cost(stype: string, event: string, num: number) {
        let name = stype + '.' + event;
        this._proc_cost_[name] = (this._proc_cost_[name] || 0) + num;
        this._proc_sum_time += num;
        this._cmd_sum_[name] = (this._cmd_sum_[name] || 0) + 1;
    }


    constructor() {
        super();
        this.setMaxListeners(200);
        setInterval(this._update_.bind(this), 1000);
    }

    private _update_() {

        try {
            this.emit('local.update');
        }
        catch (e) {
            console.error(e);
        }

        if (this._proc_sum_time >= 100) {
            this.report_to_gm('update_cost', { procs: this._proc_cost_, tot: this._proc_sum_time });
        }

        this._cmd_sum_ = {};
        this._proc_cost_ = {};
        this._proc_sum_time = 0;
    }

    /**
     * 上报给gm 程序开销
     * @param type 
     * @param infos 
     */
    report_to_gm(type, infos: any) {
        var cmd = {
            cmd: 'up_match_info',
            type: type,
            infos: infos
        }

        this.sendData2Type(cmd, 'ls');
    }

    regist(event: string, listen) {
        this.on(event, listen);
    }

    delete(event: string, listen?) {
        this.removeListener(event, listen);
    }

    /**
     * 查找第一个符合条件的对象
     * @param key 
     * @param v 
     */
    findNet(fkey: string, v: string): TeNetSolt {
        for (var key in this._allNet) {
            var rs = this._allNet[key];
            if (!rs) continue;
            if (rs[fkey] == v) return rs;
        }

        return null;
    }

    /**
     * 获取网络连接服务
     * @param id 
     */
    getNet(nid: string): TeNetSolt {
        if (!this._allNet.hasOwnProperty(nid)) {
            return null;
        }

        return this._allNet[nid];
    }

    /**
     * 检查端口是否已经开放过
     * @param iPort 
     */
    checkPort(iPort: number) {
        return this._listenPorts.indexOf(iPort) >= 0;
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
    public listen(type: string, port: number, flag?: any, registKeys?: string | Array<string>, oneKeyMode: boolean = false): TeNetSolt {
        flag = flag || {
            "log level": 4,
            "heartbeat interval": 5,
            "close timeout": 10,
            "reconnection delay": 1
        }
        if (this.checkPort(port)) return null;
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

        net.conn = new TeNet();
        net.conn.zlib_open = true;
        net.conn.listen(port, flag);
        net.conn.on('data', this._onData.bind(this, net));
        net.conn.on('connected', this._onConnected.bind(this, net));
        net.conn.on('disconnect', this._onDisconnect.bind(this, net));

        this._allNet[net.nid] = net;
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

        net.conn = new TeNet();
        net.conn.connect(url, flag);
        net.conn.on('data', this._onData.bind(this, net));
        net.conn.on('connected', this._onConnected.bind(this, net));
        net.conn.on('disconnect', this._onDisconnect.bind(this, net));

        this._allNet[net.nid] = net;
        return net;
    }

    /**
     * 接收数据，这里实现一个简单的验证机制，高级的机制需要业务逻辑自己处理
     * @param s 
     * @param linkid 
     * @param data 
     */
    private _onData(s: TeNetSolt, linkid: string, data: string) {

        try {
            var nlinkid = s.nid + '_' + linkid;
            switch (data['cmd']) {
                case '_regist_': {
                    if (s.server && s.registKeys.indexOf(data['registKey']) >= 0) {
                        var registCmd = {
                            cmd: '_regist_ret_',
                            registKey: s.registKeys[0],
                        }
                        s.conn.sendData(registCmd, linkid);
                        this.emit(s.type+'.'+ NetEvent.connected, nlinkid);
                        s.delCheckLinkID(linkid);
                    }
                    break;
                }
                case '_regist_ret_': {
                    if (!s.server) {
                        this.emit(s.type+'.'+NetEvent.connected, nlinkid);
                    }
                    break;
                }
                default:
                    if (data['cmd']) {
                        this.emit(s.type + '.' + data['cmd'], nlinkid, data);
                    }
                    else {
                        this.emit(s.type + '.' + 'data', nlinkid, data);
                    }
                    break;
            }
        }
        catch (e) {
            console.error(e);
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
            this.emit(s.type+'.'+ NetEvent.connected, nlinkid);
        }
    }

    private _onDisconnect(s: TeNetSolt, linkid: string, uid: number) {
        linkid = s.nid + '_' + linkid;
        this.emit(s.type+'.'+ NetEvent.disconnect, linkid, uid);
    }

    /**
     * 给一个链接发送信息
     * @param data 
     * @param linkid 
     */
    public sendData(data: any, linkid: string) {
        data['_sys_'] = { plt: configInst.get('plt'), serverid: configInst.get('serverid') }

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
   * 给一个链接发送信息
   * @param data 
   * @param linkid 
   */
    public sendData2Type(data: any, type: string) {
        var r = this.findNet('type', type);
        if (r) {
            return this.sendData(data, r.nid);
        }
        return false;
    }

    /**
     * 给一个服务的房间广播信息
     * @param data 
     * @param room 
     * @param nid 
     */
    public sendRoom(data: any, room: string, nid: string) {
        var sps = nid.split('_', 2);
        nid = sps[0] || '';
        var net = this.getNet(nid);
        if (net) {
            return net.conn.sendRoom(room, data);
        }

        return false;
    }

    /**
     * 给一个服务器广播信息
     * @param data 
     * @param nid 
     */
    public sendAll(data: any, nid: string) {
        var net = this.getNet(nid);
        if (net) {
            return net.conn.sendAll(data);
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
     * 加入一个房间
     * @param linkid 
     * @param room 
     */
    public jionRoom(linkid: string, room: string) {
        var sps = linkid.split('_', 2);
        var nid = sps[0] || '';
        var linkid = sps[1] || '';
        var net = this.getNet(nid);
        if (net) {
            return net.conn.joinRoom(linkid, room);
        }

        return false;
    }

    /**
     * 离开房间
     * @param linkid 
     * @param room 
     */
    public leaveRoom(linkid: string, room: string) {
        var sps = linkid.split('_', 2);
        var nid = sps[0] || '';
        var linkid = sps[1] || '';
        var net = this.getNet(nid);
        if (net) {
            return net.conn.leaveRoom(linkid, room);
        }

        return false;
    }

    public getRooms(linkid: string) {
        var sps = linkid.split('_', 2);
        var nid = sps[0] || '';
        var linkid = sps[1] || '';
        var net = this.getNet(nid);
        if (net) {
            return net.conn.getRooms(linkid);
        }

        return null;
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