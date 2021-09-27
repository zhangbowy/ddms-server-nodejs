import { ExpressBase } from "./expressbase";
import { ServerResponse } from "http";
import { LogMgr } from "../lib/LogMgr";
import { serverMonitInst } from "../NetMgr/serverMgr";
import { netMgrInst } from "../NetMgr/NetMgr";
import { GameControl } from "../mgr/GameControl";

export class MonitorWeb extends ExpressBase {
    constructor(app, type) {
        super(app, type);

        /*--------------- 监控相关的请求 --------------------*/
        this._app.all('/memory', this._onMemory.bind(this));
        this._app.get('/logs', this._onlogs.bind(this));
        this._app.get('/logs/get', this._onlogsget.bind(this));
        this._app.get('/erros', this._onerrors.bind(this));
        this._app.get('/erros/get', this._onerrorsget.bind(this));
        this._app.get('/test/sub', this._ontestsub.bind(this));
        this._app.get('/redbaginfo',this._onRedCount.bind(this));
        this._app.get('/change/GameControl',this._onChangeGameControl.bind(this));
    }

    private _onMemory(req: Request, res: ServerResponse) {
        var param: any;
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


    private _onlogs(req: Request, res: ServerResponse) {
        var param: any;
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
        let log_keys = LogMgr.lastOutCache.keys;
        for (let i = 0; i < log_keys.length; i++) {
            out.push(`<a href="${req.url}/get?key=${log_keys[i]}">${log_keys[i]}</a>`);
        }

        let str = '<head><meta charset="utf-8"></head><body>' + out.join('<br>') + '</body>';
        res.writeHead(200);
        res.write(str);
        res.end();
    }

    private _onlogsget(req: Request, res: ServerResponse) {
        var param: any;
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
        let loginfo = LogMgr.lastOutCache.get(param.key) || '';
        res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
        res.write(loginfo);
        res.end();
    }

    private _onerrors(req: Request, res: ServerResponse) {
        var param: any;
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
        let log_keys = LogMgr.lastErrorCache.keys;
        for (let i = 0; i < log_keys.length; i++) {
            out.push(`<a href="${req.url}/get?key=${log_keys[i]}">${log_keys[i]}</a>`);
        }

        let str = '<head><meta charset="utf-8"></head><body>' + out.join('<br>') + '</body>';
        res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
        res.write(str);
        res.end();
    }

    private _onerrorsget(req: Request, res: ServerResponse) {
        var param: any;
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
        let loginfo = LogMgr.lastErrorCache.get(param.key) || '';
        let str = '<head><meta charset="utf-8"></head><body>' + loginfo + '</body>';
        res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
        res.write(str);
        res.end();
    }

    private _ontestsub(req: Request, res: ServerResponse) {
        var param: any;
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

        let servers = serverMonitInst.get_server_by_type_all('subls');
        if (servers && servers.length > 0) {
            for (let i = 0; i < servers.length; i++) {
                netMgrInst.sendData({
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

    private _onRedCount(req: Request, res: ServerResponse) {
        var param: any;
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
        res.write(GameControl.inst.get_curr_show(param['plt'], param['type']));
        res.end();
    }

    private _onChangeGameControl(req: Request, res: ServerResponse) {
        var param: any;
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

        GameControl.inst.add_config_value(param['plt'],param['type'],parseFloat(param['value']));

        res.writeHead(200, { 'Content-Type': 'text/html;charset=UTF-8' });
        res.write(GameControl.inst.get_curr_show(param['plt'], param['type']));
        res.end();
    }
}