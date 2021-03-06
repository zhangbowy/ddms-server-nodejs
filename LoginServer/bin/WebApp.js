"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebApp = void 0;
const fs = require("fs");
const HTTP = require("http");
const HTTPS = require("https");
const net = require("net");
const events_1 = require("events");
const express = require("express");
const bodyParser = require("body-parser");
const dhpay_1 = require("./expresslist/dhpay");
const sdwpay_1 = require("./expresslist/sdwpay");
const monitor_1 = require("./expresslist/monitor");
const TeConfig_1 = require("./lib/TeConfig");
const TeTool_1 = require("./lib/TeTool");
const gamebase_1 = require("./expresslist/gamebase");
var defautl_ssl_ = {
    cert: "",
    key: ""
};
function _t_read_(f, df) {
    var d = df;
    try {
        var bd = fs.readFileSync(f);
        if (bd)
            d = bd.toString();
    }
    catch (e) {
    }
    return d;
}
defautl_ssl_.cert = _t_read_('./ssl/shandw.crt', defautl_ssl_.cert);
defautl_ssl_.key = _t_read_('./ssl/shandw.key', defautl_ssl_.key);
class WebApp extends events_1.EventEmitter {
    constructor() {
        super();
        this._childs = new TeTool_1.TeMap();
        this.ready = false;
        this._open_list_ = [];
        this._app = express();
    }
    static get inst() {
        if (!this._inst)
            this._inst = new WebApp();
        return this._inst;
    }
    init(port, ssl_port, proxy_port) {
        if (this.ready)
            return;
        this.port = port;
        this.ssl_port = ssl_port;
        HTTP.createServer(this._app).listen(port);
        if (ssl_port && defautl_ssl_.cert != "" && defautl_ssl_.key != "") {
            HTTPS.createServer(defautl_ssl_, this._app).listen(ssl_port, function () {
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
            }).bind(this, req, res));
            next();
        });
        /*--------------- ??????????????????????????? --------------------*/
        /*--------------- ?????????????????? --------------------*/
        this._app.get('/icon', this._proxyIcon.bind(this));
        this._app.all("/crash", function (req, res) {
            process.nextTick(function () {
                res.writeHead(200);
                console.log('?????? crash error');
                JSON.parse("aaaaa");
                res.end();
            });
        });
        this._childs.set('base', new gamebase_1.GameBase(this._app, 'base'));
        this._childs.set('dhpay', new dhpay_1.DHPay(this._app, 'dhpay'));
        this._childs.set('sdwpay', new sdwpay_1.SDWPay(this._app, 'sdwpay'));
        this._childs.set('monit', new monitor_1.MonitorWeb(this._app, 'monit'));
        this.ready = true;
        this._load_list_();
    }
    _load_list_() {
        try {
            var fdata = fs.readFileSync('./iconurls.log');
            this._open_list_ = JSON.parse(fdata.toString());
        }
        catch (e) {
        }
    }
    _save_list_() {
        fs.writeFileSync('./iconurls.log', JSON.stringify(this._open_list_, null, 4), { flag: 'w+' });
    }
    /**
     * ???????????? host ???????????????????????????
     * @param url
     */
    _check_icon_host_(url) {
        if (this._open_list_.indexOf(url) < 0) {
            this._open_list_.push(url);
            this._save_list_();
        }
    }
    _proxyIcon(req, res) {
        // ???????????????????????????????????????????????????????????????????????????
        var bHttps = false;
        var p;
        try {
            var uurl = decodeURIComponent(req.query['url'] || '');
            bHttps = (uurl.indexOf('https://') == 0);
            p = require("url").parse(uurl);
        }
        catch (e) {
            var EE = e;
            res.setHeader('Access-Control-Allow-Origin', TeConfig_1.configInst.get('webhost'));
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
        // ??????????????????????????????????????????????????? ????????????
        this._check_icon_host_(p.hostname);
        if (req.headers && req.headers['origin'] && !TeConfig_1.configInst.get('local')) {
            var hostlist = TeConfig_1.configInst.get('hostlist');
            var origin = req.headers['origin'];
            if (hostlist.indexOf(origin) >= 0) {
                res.setHeader('Access-Control-Allow-Origin', origin);
            }
        }
        else {
            res.setHeader('Access-Control-Allow-Origin', TeConfig_1.configInst.get('webhost'));
        }
        var reqProxy;
        if (bHttps) {
            reqProxy = HTTPS.request(options, (function (resProxy) {
                resProxy.pipe(res);
            }).bind(this));
        }
        else {
            reqProxy = HTTP.request(options, (function (resProxy) {
                resProxy.pipe(res);
            }).bind(this));
        }
        reqProxy.on('error', function (e) {
            res.writeHead(404, e.code);
            res.end();
        });
        reqProxy.end();
    }
    _http_https_proxy_(socket) {
        socket.once('data', (buf) => {
            // https???????????????????????????????????????16??????????????????????????????22
            var address = buf[0] === 22 ? this.ssl_port : this.port;
            //??????????????????https???http??????????????????
            var proxy = net.createConnection(address.toString(), function () {
                proxy.write(buf);
                //????????????????????????tcp??????????????????????????????????????????????????????????????????????????????socket??????????????????
                socket.pipe(proxy).pipe(socket);
            });
            proxy.on('error', function (err) { });
        });
        socket.on('error', function (err) { });
    }
    onQueryResponse(qid, data) {
        let types = qid.split('_');
        if (types.length < 3 || types[0] != 'web')
            return false;
        let r = this._childs.get(types[1]);
        if (!r)
            return false;
        return r.onQueryResponse(qid, data);
    }
}
exports.WebApp = WebApp;
//# sourceMappingURL=WebApp.js.map