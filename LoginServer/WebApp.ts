
import * as fs from 'fs';
import * as HTTP from 'http';
import * as HTTPS from 'https';
import * as net from 'net';
import { EventEmitter } from 'events';
import { ExpressBase, BodyIncomingMessage } from './expresslist/expressbase';
import { Application } from 'express';
import express = require('express');
import bodyParser = require('body-parser');
import { DHPay } from './expresslist/dhpay';
import { SDWPay } from './expresslist/sdwpay';
import { MonitorWeb } from './expresslist/monitor';
import { configInst } from './lib/TeConfig';
import { TeMap } from './lib/TeTool';
import { GameBase } from './expresslist/gamebase';

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

export class WebApp extends EventEmitter {
    private static _inst: WebApp;
    static get inst() {
        if (!this._inst) this._inst = new WebApp();

        return this._inst;
    }

    private _childs: TeMap<ExpressBase> = new TeMap();

    private port: number;
    private ssl_port: number;

    private ready = false;
    private _app: Application;

    constructor() {
        super();
        this._app = express();
    }

    init(port: number, ssl_port?: number, proxy_port?: number) {
        if (this.ready) return;
        this.port = port;
        this.ssl_port = ssl_port;

        HTTP.createServer(<any>this._app).listen(port);
        if (ssl_port && defautl_ssl_.cert != "" && defautl_ssl_.key != "") {
            HTTPS.createServer(defautl_ssl_, <any>this._app).listen(ssl_port, function () {
                console.log('HTTPS Server is running on: https://localhost:' + ssl_port);
            });
        }

        proxy_port && net.createServer(this._http_https_proxy_.bind(this)).listen(proxy_port);

        this._app.use(bodyParser.urlencoded({ extended: true }));
        this._app.use(bodyParser.json());

        this._app.all('*', function (req, res, next) {
            res.setTimeout(30000, (function (req, res) {
                console.log('close req', req.url);
                if (!res.headersSent) {
                    res.writeHead(404);
                }
                if (!res.finished) {
                    res.end();
                }

                console.log('close req finish', req.url);
            }).bind(this, req, res))
            next();
        })

        /*--------------- 负载分服相关的请求 --------------------*/
        /*--------------- 头像代理请求 --------------------*/
        this._app.get('/icon', this._proxyIcon.bind(this));

        this._app.all("/crash", function (req, res) {
            process.nextTick(function () {
                res.writeHead(200);
                console.log('测试 crash error');
                JSON.parse("aaaaa")
                res.end();
            })
        })

        
        this._childs.set('base', new GameBase(this._app, 'base'));
        this._childs.set('dhpay', new DHPay(this._app, 'dhpay'));
        this._childs.set('sdwpay', new SDWPay(this._app, 'sdwpay'));
        this._childs.set('monit', new MonitorWeb(this._app, 'monit'));

        this.ready = true;

        this._load_list_();
    }

    private _load_list_() {
        try {
            var fdata = fs.readFileSync('./iconurls.log');
            this._open_list_ = JSON.parse(fdata.toString());
        }
        catch (e) {

        }
    }

    private _save_list_() {
        fs.writeFileSync('./iconurls.log', JSON.stringify(this._open_list_, null, 4), { flag: 'w+' });
    }
    private _open_list_: string[] = [];

    /**
     * 检查一下 host 是否在开放列表中的
     * @param url 
     */
    private _check_icon_host_(url: string) {
        if (this._open_list_.indexOf(url) < 0) {
            this._open_list_.push(url);
            this._save_list_();
        }
    }

    private _proxyIcon(req: BodyIncomingMessage, res: HTTP.ServerResponse) {
        // 这里代理的是别人的地址，所以我们要代替他们查询一下
        var bHttps = false;
        var p;
        try {
            var uurl = decodeURIComponent(req.query['url'] || '');
            bHttps = (uurl.indexOf('https://') == 0)
            p = require("url").parse(uurl);
        }
        catch (e) {
            var EE = e as NodeJS.ErrnoException
            res.setHeader('Access-Control-Allow-Origin', configInst.get<string>('webhost'));
            res.writeHead(404, EE.code);
            res.end();
            return;
        }
        //var content = data;//qs.stringify(data);
        var options = {
            hostname: p.hostname,
            port: p.port,
            path: p.path,
            method: 'GET'
        };
        // 这个在实际使用中会修改成发布版本的 正确域名
        this._check_icon_host_(p.hostname);

        if (req.headers && req.headers['origin'] && !configInst.get<string>('local')) {
            var hostlist = configInst.get<string[]>('hostlist');
            var origin = req.headers['origin'] as string;
            if (hostlist.indexOf(origin) >= 0) {
                res.setHeader('Access-Control-Allow-Origin', origin);
            }
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', configInst.get<string>('webhost'));
        }

        var reqProxy: HTTP.ClientRequest;
        if (bHttps) {
            reqProxy = HTTPS.request(options, (function (resProxy: HTTP.IncomingMessage) {
                resProxy.pipe(res);
            }).bind(this));
        }
        else {
            reqProxy = HTTP.request(options, (function (resProxy: HTTP.IncomingMessage) {
                resProxy.pipe(res);
            }).bind(this));

        }

        reqProxy.on('error', function (e: NodeJS.ErrnoException) {
            res.writeHead(404, e.code);
            res.end();
        });
        reqProxy.end();
    }



    private _http_https_proxy_(socket) {
        socket.once('data', (buf) => {
            // https数据流的第一位是十六进制“16”，转换成十进制就是22
            var address = buf[0] === 22 ? this.ssl_port : this.port;
            //创建一个指向https或http服务器的链接
            var proxy = net.createConnection(address.toString(), function () {
                proxy.write(buf);
                //反向代理的过程，tcp接受的数据交给代理链接，代理链接服务器端返回数据交由socket返回给客户端
                socket.pipe(proxy).pipe(socket);
            });

            proxy.on('error', function (err) { });
        });

        socket.on('error', function (err) { });
    }

    public onQueryResponse(qid: string, data: any) {
        let types = qid.split('_');
        if (types.length < 3 || types[0] != 'web') return false;
        let r = this._childs.get(types[1]);
        if (!r) return false;
        return r.onQueryResponse(qid, data);
    }
}