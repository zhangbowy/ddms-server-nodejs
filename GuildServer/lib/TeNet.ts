// 拷贝函数 是否包括函数拷贝
import { EventEmitter } from "events";
import { Debugger } from "debug";

import * as SocketIOStatic from 'socket.io';
import * as SocketIOClientStatic from 'socket.io-client';
import * as HTTP from 'http';
import * as HTTPS from 'https';
import * as fs from 'fs';
import * as net from 'net';
import * as  zlib from 'zlib';

var defautl_ssl_ = {
    cert: "",
    key: ""
}


function _t_read_(f: string, df: string) {
    var d = df;
    try {
        var bd = fs.readFileSync(f);
        if (bd) d = bd.toString();
    }
    catch (e) {

    }

    return d;
}

defautl_ssl_.cert = _t_read_('./ssl/shandw.crt', defautl_ssl_.cert);
defautl_ssl_.key = _t_read_('./ssl/shandw.key', defautl_ssl_.key);

export interface TeSocket extends SocketIO.Socket {
    linkid: string;
}

function func_copy(obj, bFunc = false) {
    var out = {};
    if (obj instanceof Array) {
        out = [];
    }

    if (typeof obj == 'object') {
        for (var key in obj) {
            if (key == 'clone') {
                continue;
            }
            if (typeof obj[key] == 'function' && !bFunc) {
                continue;
            }
            if (obj[key] == null) {
                out[key] = null;
            }
            else if (typeof obj[key] == 'object') {
                out[key] = func_copy(obj[key], false);
            }
            else {
                out[key] = obj[key];
            }
        }
    }
    else {
        out = obj;
    }
    return out;
}
// 这是一个redis的管理模块，负责生成对应的redis对象
var debug: Debugger = require('debug')('TeNet');
export class TeNet extends EventEmitter {
    zlib_open = false;
    constructor() {
        super();
        this.on('data', (...arg) => { });
        this.on('connected', () => { });
        this.on('disconnect', () => { });
        this.on('error', () => { });
    }

    public getSocketIP(linkid: string) {
        var socket: TeSocket = <TeSocket>this.getSocket(linkid);
        var ip = '';
        if (!socket) {
            return ip;
        }

        if (socket.client && socket.client.request) {
            var tips: string = socket.client.request['X-Forwarded-For'];
            if (tips && tips.length > 0) {
                var aips = tips.split(',');
                if (aips.length > 0) {
                    return aips[0];
                }
            }
        }


        if (!socket.handshake) {
            ip = socket['io']['uri'];
        }
        else {
            ip = socket.handshake.address;
            // 这里对ip再处理一下，去掉冗余的东西
            ip = ip.replace('::ffff:', '');
        }

        return ip;
    }

    public getSocketUserAgent(linkid: string) {
        var socket: TeSocket = <TeSocket>this.getSocket(linkid);
        var ip = '';
        if (!socket) {
            return ip;
        }

        if (socket.handshake) {
            ip = socket.handshake.headers['user-agent'] || '';
        }
        ip = ip.replace(',', ';');
        return ip;
    }


    static isPriviteIP(ip: string): boolean {
        var ipdst = ip.split('.');
        if (ipdst[0] == '10') {
            return true;
        }

        if (ipdst[0] == '192' && ipdst[1] == '168') {
            return true;
        }
        if (ipdst[0] == '172' && (ipdst[1] >= '16' && ipdst[1] <= '31')) {
            return true;
        }

        if (ipdst[0] == '127') {
            return true;
        }

        return false;
    }

    static getIPAdress() {
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
    // 这里网络模块分成两种，功能的
    public connect(url: string, flag: any = {}) {
        var opt: SocketIOClient.ConnectOpts = flag;
        opt.transports = ['websocket', 'polling'];
        if (this._client) {
            this._client.close();
            delete this._client;
        }
        this._client = SocketIOClientStatic.connect(url, opt);
        this._client.compress(true);
        this._client.on('connect', this.__onAccept__.bind(this, this._client));
    }

    ports: Array<number> = [];
    /**
    * 监听http的
    * @param port 
    * @param opts 
    */
    public listen(port: number, opts: any = {}, ssl_port?: number, ssl?: { key: string, cert: string }, proxy_port?: number) {
        // this._server = SocketIOStatic.listen(port, opts);
        ssl = ssl || defautl_ssl_;
        if (!this._server) {
            this._server = SocketIOStatic(opts);
            this._sockets = <{ [id: string]: TeSocket }>this._server.sockets.sockets;
            this._server.on('connection', this.__onAccept__.bind(this));
        }

        if (port && this.ports.indexOf(port) < 0) {
            this._server.attach(HTTP.createServer().listen(port));
            this.ports.push(port);
        }

        if (ssl_port && this.ports.indexOf(ssl_port) < 0 && ssl.cert != "" && ssl.key != "") {
            this._server.attach(HTTPS.createServer(ssl).listen(ssl_port));
            this.ports.push(ssl_port);
        }

        if (proxy_port && this.ports.indexOf(proxy_port) < 0) {
            net.createServer((socket) => {
                socket.once('data', (buf) => {
                    // console.log(buf[0]);
                    // https数据流的第一位是十六进制“16”，转换成十进制就是22
                    var address = buf[0] === 22 ? ssl_port : port;

                    //创建一个指向https或http服务器的链接
                    var proxy = net.createConnection(address.toString(), function () {
                        proxy.write(buf);
                        //反向代理的过程，tcp接受的数据交给代理链接，代理链接服务器端返回数据交由socket返回给客户端
                        socket.pipe(proxy).pipe(socket);
                    });

                    socket['bindproxy'] = proxy;

                    proxy.on('error', function (err) {
                        // console.log(err);
                    });
                });

                socket.on('error', function (err: NodeJS.ErrnoException) {
                    // if (err.code != "ECONNRESET") console.log(err);
                    if (socket['bindproxy']) {
                        socket['bindproxy'].end();
                        socket.end();
                    }
                });
            }).listen(proxy_port);
        }
    }

    private __onAccept__(socket: TeSocket) {
        if (!socket) {
            return;
        }
        socket.compress(true);

        if (!socket.linkid) {
            socket.linkid = TeNet.getGen();
            debug('connect linkid:' + socket.linkid + '   id:' + socket.id);
        }
        else {
            debug('reconnect linkid:' + socket.linkid + '   id:' + socket.id);
        }
        socket.removeAllListeners('data');
        socket.on('data', ((_socket, _data) => {

            this.emit('data', _socket.linkid, _data);
        }).bind(this, socket));

        socket.removeAllListeners('zlibdata');
        socket.on('zlibdata', ((_socket, _data) => {
            // 表示数据压缩过的
            _data = zlib.inflateSync(_data);
            try {
                _data = JSON.parse(_data);
            }
            catch (e) {

            }

            this.emit('data', _socket.linkid, _data);
        }).bind(this, socket));

        socket.on('disconnect', this.__onDisconnect__.bind(this, socket));

        this.emit('connected', socket.linkid);

        if (this.zlib_open) {
            // setTimeout(() => {
            socket.emit('zlib', this.zlib_open);
            // }, 1);
        }
    }

    private __onDisconnect__(_socket: TeSocket, type) {
        // 断开的时候需要处理一下之前监听的信息
        if (_socket.removeAllListeners) {
            _socket.removeAllListeners('data');
            _socket.removeAllListeners('disconnect');
        }

        this.emit('disconnect', _socket.linkid, type);
    }

    public getSocket(linkid: string): SocketIOClient.Socket | TeSocket {
        var sockets: { [id: string]: TeSocket } = this._sockets;
        if (!sockets) {
            return this._client;
        }

        for (var key in sockets) {
            var rkSocket: TeSocket = sockets[key];
            if (rkSocket && rkSocket.linkid == linkid) {
                return rkSocket;
            }
        }

        return null;
    }

    public sendData(data: any, linkid: string = null) {
        // data = JSON.stringify(data);

        var rkSocket: TeSocket = <TeSocket>this.getSocket(linkid);
        if (!rkSocket || !rkSocket.connected) {
            debug('send error:' + data);
            return false;
        }

        if (this.zlib_open) {
            try {
                var ot = JSON.stringify(data) as any;
                if (ot.length > 512) {
                    ot = zlib.deflateSync(Buffer.from(ot)) as any;
                    rkSocket.emit('zlibdata', ot);
                    return true;
                }
            }
            catch (e) {

            }
        }

        rkSocket.emit('data', data);
        return true;
    }

    public disconnect(linkid) {
        var rkSocket: TeSocket = <TeSocket>this.getSocket(linkid);
        if (!rkSocket) {
            return false;
        }

        rkSocket.disconnect();
        return true;
    };

    static _genid: number = 0;
    static _genkey: string = 'L';
    static getGen() {
        this._genid++;
        return this._genkey + this._genid;
    }

    public joinRoom(linkid: string, roomid: string): boolean {
        if (this._client) {
            return false;
        }

        var rkSocket: TeSocket = <TeSocket>this.getSocket(linkid);
        if (!rkSocket) {
            return false;
        }

        rkSocket.join(roomid);
        return true;
    }

    public getRooms(linkid: string) {
        if (this._client) {
            return null;
        }

        var rkSocket: TeSocket = <TeSocket>this.getSocket(linkid);
        if (!rkSocket) {
            return false;
        }

        return rkSocket.rooms;
    }

    public leaveRoom(linkid: string, roomid: string): boolean {
        if (this._client) {
            return false;
        }

        var rkSocket: TeSocket = <TeSocket>this.getSocket(linkid);
        if (!rkSocket) {
            return false;
        }

        rkSocket.leave(roomid);
        return true;
    }

    public sendRoom(roomid: string, data: any) {
        if (this._server) {
            var room = this._server.sockets.in(roomid);
            room.emit('data', data);
        }
        else {
            this.sendData(data);
        }
    }

    public sendAll(data: any): boolean {
        if (this._server) {
            var room = this._server.sockets.emit('data', data);
        }
        else {
            this.sendData(data);
        }

        return true;
    }

    private _client: SocketIOClient.Socket;
    private _server: SocketIO.Server;
    private _sockets: { [id: string]: TeSocket };
}


// var TestServer:TeNet = new TeNet();
// var TestClient:TeNet = new TeNet();
// console.log(TeNet.getIPAdress());

// TestServer.listen(1088,{
//    'log level': 4,
//    'heartbeat interval': 5,
//    'close timeout': 10,
//    'reconnection delay': 1
// });

// TestServer.on('connected',(id)=>{
//   // TestServer.sendData('hello',id);
//     TestServer.joinRoom(id,'ss');
//     TestServer.joinRoom(id,'sss');
// });

// TestServer.on('data',function(...arg){
//     console.log(arg);
//     TestServer.sendRoom("ss","TestServer nihao");
//     TestServer.sendRoom("sss","TestServer nihao");
// })

// TestClient.connect('http://127.0.0.1:1088');

// TestClient.on('data',(...arg)=>{
//     console.log(arg);
// });

// TestClient.on('connected',(id)=>{
//     TestClient.sendData("TestClient nihao");
// });