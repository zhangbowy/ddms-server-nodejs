"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitorWeb = void 0;
const expressbase_1 = require("./expressbase");
const LogMgr_1 = require("../lib/LogMgr");
const serverMgr_1 = require("../NetMgr/serverMgr");
const NetMgr_1 = require("../NetMgr/NetMgr");
const GameControl_1 = require("../mgr/GameControl");
class MonitorWeb extends expressbase_1.ExpressBase {
    constructor(app, type) {
        super(app, type);
        /*--------------- 监控相关的请求 --------------------*/
        this._app.all('/memory', this._onMemory.bind(this));
        this._app.get('/logs', this._onlogs.bind(this));
        this._app.get('/logs/get', this._onlogsget.bind(this));
        this._app.get('/erros', this._onerrors.bind(this));
        this._app.get('/erros/get', this._onerrorsget.bind(this));
        this._app.get('/test/sub', this._ontestsub.bind(this));
        this._app.get('/redbaginfo', this._onRedCount.bind(this));
        this._app.get('/change/GameControl', this._onChangeGameControl.bind(this));
    }
    _onMemory(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req['query'];
        }
        else if (req.method == 'POST') {
            param = req['body'];
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        res.writeHead(200);
        res.write(JSON.stringify(process.memoryUsage()));
        res.end();
    }
    _onlogs(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req['query'];
        }
        else if (req.method == 'POST') {
            param = req['body'];
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        // 返回所有logs的名目
        let out = [];
        let log_keys = LogMgr_1.LogMgr.lastOutCache.keys;
        for (let i = 0; i < log_keys.length; i++) {
            out.push(`<a href="${req.url}/get?key=${log_keys[i]}">${log_keys[i]}</a>`);
        }
        let str = '<head><meta charset="utf-8"></head><body>' + out.join('<br>') + '</body>';
        res.writeHead(200);
        res.write(str);
        res.end();
    }
    _onlogsget(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req['query'];
        }
        else if (req.method == 'POST') {
            param = req['body'];
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        // 返回所有logs的名目
        let loginfo = LogMgr_1.LogMgr.lastOutCache.get(param.key) || '';
        res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
        res.write(loginfo);
        res.end();
    }
    _onerrors(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req['query'];
        }
        else if (req.method == 'POST') {
            param = req['body'];
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        // 返回所有logs的名目
        let out = [];
        let log_keys = LogMgr_1.LogMgr.lastErrorCache.keys;
        for (let i = 0; i < log_keys.length; i++) {
            out.push(`<a href="${req.url}/get?key=${log_keys[i]}">${log_keys[i]}</a>`);
        }
        let str = '<head><meta charset="utf-8"></head><body>' + out.join('<br>') + '</body>';
        res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
        res.write(str);
        res.end();
    }
    _onerrorsget(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req['query'];
        }
        else if (req.method == 'POST') {
            param = req['body'];
        }
        else {
            res.writeHead(404);
            res.end();
            return;
        }
        // 返回所有logs的名目
        let loginfo = LogMgr_1.LogMgr.lastErrorCache.get(param.key) || '';
        let str = '<head><meta charset="utf-8"></head><body>' + loginfo + '</body>';
        res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
        res.write(str);
        res.end();
    }
    _ontestsub(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req['query'];
        }
        else if (req.method == 'POST') {
            param = req['body'];
        }
        else {
            res.writeHead(404);
            res.end();
            return;
        }
        let servers = serverMgr_1.serverMonitInst.get_server_by_type_all('subls');
        if (servers && servers.length > 0) {
            for (let i = 0; i < servers.length; i++) {
                NetMgr_1.netMgrInst.sendData({
                    cmd: 'testinfo',
                    info: param
                }, servers[i].linkid);
            }
        }
        // 返回所有logs的名目
        let loginfo = (servers && servers.length > 0) ? "succ" : 'empty';
        let str = '<head><meta charset="utf-8"></head><body>' + loginfo + '</body>';
        res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
        res.write(str);
        res.end();
    }
    _onRedCount(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req['query'];
        }
        else if (req.method == 'POST') {
            param = req['body'];
        }
        else {
            res.writeHead(404);
            res.end();
            return;
        }
        if (!param['type'] || !param['plt']) {
            res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
            res.write("缺少参数");
            res.end();
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
        res.write(GameControl_1.GameControl.inst.get_curr_show(param['plt'], param['type']));
        res.end();
    }
    _onChangeGameControl(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req['query'];
        }
        else if (req.method == 'POST') {
            param = req['body'];
        }
        else {
            res.writeHead(404);
            res.end();
            return;
        }
        if (!param['type'] || !param['plt'] || !param['value'] || param['seccode'] != "ssxinifinso") {
            res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
            res.write("缺少参数");
            res.end();
            return;
        }
        GameControl_1.GameControl.inst.add_config_value(param['plt'], param['type'], parseFloat(param['value']));
        res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
        res.write(GameControl_1.GameControl.inst.get_curr_show(param['plt'], param['type']));
        res.end();
    }
}
exports.MonitorWeb = MonitorWeb;
//# sourceMappingURL=monitor.js.map