"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeNet = void 0;
// 拷贝函数 是否包括函数拷贝
const events_1 = require("events");
const WS = require("ws");
const zlib = require("zlib");
const TeLog_1 = require("./TeLog");
const TeConfig_1 = require("../lib/TeConfig");
// 这是一个redis的管理模块，负责生成对应的redis对象
var debug = require('debug')('TeNet');
class TeNet extends events_1.EventEmitter {
    constructor() {
        super();
        this.zlib_open = false;
        this.checkPing = false;
        this.net_opt = {
            "log level": 4,
            "heartbeat interval": 5,
            "close timeout": 10,
            "reconnection delay": 1
        };
        this.time_out_time = 10;
        this.ports = [];
        this.on('data', (...arg) => { debug(arg); });
        this.on('connected', () => { });
        this.on('disconnect', () => { });
        this.on('error', () => { });
        this.checkPing = TeConfig_1.configInst.get('plt') == 'test';
    }
    /**
    * 监听http的
    * @param port
    * @param opts
    */
    listen(port, ...args) {
        if (!this._server) {
            var opt = {
                // host?: string;
                port: port,
                // backlog?: number;
                // verifyClient?: VerifyClientCallbackAsync | VerifyClientCallbackSync;
                // handleProtocols?: any;
                // path?: string;
                // noServer?: boolean;
                // clientTracking?: boolean;
                // perMessageDeflate?: boolean | PerMessageDeflateOptions;
                // maxPayload?: number;
            };
            let n_opt = args[0];
            if (n_opt && n_opt["log level"]) {
                for (let k in args[0]) {
                    if (this.net_opt.hasOwnProperty(k)) {
                        this.net_opt[k] = args[0][k];
                    }
                }
            }
            this._server = new WS.Server(opt);
            this._sockets = this._server.clients;
            this._server.on('connection', this.__onAccept__.bind(this));
            clearInterval(this._update_.bind(this));
            setInterval(this._update_.bind(this), this.net_opt["heartbeat interval"] * 1000);
        }
    }
    getIPAdress() {
        var out = [];
        var interfaces = require('os').networkInterfaces();
        for (var devName in interfaces) {
            if (devName.indexOf('VMware Network Adapter') >= 0) {
                continue;
            }
            var iface = interfaces[devName];
            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                    out.push(alias.address);
                }
            }
        }
        return out;
    }
    _update_() {
        // 这里检查是否超时了
        let curr = Date.now();
        let dis_list = [];
        let ping_list = [];
        this._sockets.forEach((v1, v2, s) => {
            if (curr - v1['__act__'] >= this.net_opt["close timeout"] * 1000) {
                // 提示超时了
                v1['__timeout_count__'] = (v1['__timeout_count__'] || 0) + 1;
                // 设置成活跃了
                v1['__act__'] = curr;
            }
            //发送一个ping, 侦测是否连接断开
            if (this.checkPing && v1['__timeout_count__'] > 1) {
                ping_list.push(v1.linkid);
            }
            if (v1['__timeout_count__'] && v1['__timeout_count__'] > this.net_opt["reconnection delay"]) {
                // 超时轮数满足条件了，那么就人为他断开了
                dis_list.push(v1.linkid);
            }
            //console.log('timeout count:' + v1['__timeout_count__']);
        });
        for (let i = 0; i < ping_list.length; i++) {
            this._sendPing(ping_list[i]);
        }
        for (let i = 0; i < dis_list.length; i++) {
            this.disconnect(dis_list[i]);
        }
    }
    __onAccept__(socket) {
        if (!socket) {
            return;
        }
        if (!socket.linkid) {
            socket.linkid = TeNet.getGen();
        }
        else {
        }
        socket.removeAllListeners('message');
        socket.on('message', ((_socket, _data) => {
            let length = _data.length;
            try {
                _data = JSON.parse(_data);
            }
            catch (e) {
            }
            // 收到数据了的话重置一下活跃时间和超时轮数
            _socket.__act__ = Date.now();
            _socket.__timeout_count__ = 0;
            if (_data && _data.cmd && _data.cmd == 'heart') {
                if (_socket.readyState == _socket.OPEN)
                    _socket.send(JSON.stringify({ __cmd__: 'h' }));
            }
            else {
                TeLog_1.Logger.debug(Date.now() + ", p_cmd: " + _data.cmd + ", lid: " + _socket.linkid + ", len: " + length);
                this.emit('data', _socket.linkid, _data);
            }
        }).bind(this, socket));
        socket.on('close', this.__onDisconnect__.bind(this, socket));
        socket.on('error', () => { });
        this.emit('connected', socket.linkid);
        if (this.zlib_open) {
            if (socket.readyState == socket.OPEN)
                socket.send(JSON.stringify({ __cmd__: 'zlib', data: this.zlib_open }));
        }
    }
    __onDisconnect__(_socket, type) {
        //console.log('__onDisconnect__');
        // 断开的时候需要处理一下之前监听的信息
        if (_socket.removeAllListeners) {
            _socket.removeAllListeners('message');
            _socket.removeAllListeners('close');
        }
        this.emit('disconnect', _socket.linkid, type);
    }
    _sendPing(linkid) {
        var rkSocket = this.getSocket(linkid);
        if (rkSocket) {
            try {
                rkSocket.ping();
            }
            catch (e) {
                console.log('send ping err:' + e);
            }
        }
    }
    ;
    getSocket(linkid) {
        var sockets = this._sockets;
        if (!sockets) {
            return null;
        }
        var so_list = [];
        sockets.forEach((v1, v2, s) => {
            so_list.push(v1);
        });
        for (var i = 0; i < so_list.length; i++) {
            var r_s = so_list[i];
            if (r_s && r_s.linkid == linkid) {
                return r_s;
            }
        }
        return null;
    }
    sendData(data, linkid = null) {
        // data = JSON.stringify(data);
        var rkSocket = this.getSocket(linkid);
        if (!rkSocket || !rkSocket.OPEN) {
            debug('send error:' + data);
            return false;
        }
        if (this.zlib_open && TeConfig_1.configInst.get('plt') != 'swan') {
            try {
                var ot = JSON.stringify(data);
                // console.log(ot);
                if (ot.length > 512) {
                    ot = zlib.deflateSync(Buffer.from(ot));
                    TeLog_1.Logger.debug(Date.now() + ", zb s_p_cmd: " + data.cmd + ", lid: " + linkid + ", len: " + ot.length);
                    if (rkSocket.readyState == rkSocket.OPEN)
                        rkSocket.send(JSON.stringify({ __cmd__: 'zlibdata', data: ot }));
                    return true;
                }
            }
            catch (e) {
            }
        }
        if (rkSocket.readyState == rkSocket.OPEN) {
            let _data = JSON.stringify(data);
            TeLog_1.Logger.debug(Date.now() + ", s_p_cmd: " + data.cmd + ", lid: " + linkid + ", len: " + _data.length);
            rkSocket.send(_data);
        }
        // rkSocket.emit('data', data);
        return true;
    }
    disconnect(linkid) {
        var rkSocket = this.getSocket(linkid);
        if (!rkSocket) {
            return false;
        }
        rkSocket.close();
        return true;
    }
    ;
    static getGen() {
        this._genid++;
        return this._genkey + this._genid;
    }
    sendAll(data) {
        if (this._server) {
            this._sockets.forEach((v1, v2, s) => {
                if (!v1)
                    return;
                if (v1 != this._server && v1.readyState == v1.OPEN) {
                    v1.send(JSON.stringify(data));
                }
            });
        }
        else {
            this.sendData(data);
        }
        return true;
    }
}
exports.TeNet = TeNet;
TeNet._genid = 0;
TeNet._genkey = 'L';
//# sourceMappingURL=TeWSNet.js.map