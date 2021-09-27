"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SDWPay = void 0;
const RechargeMgr_1 = require("../mgr/RechargeMgr");
const TeConfig_1 = require("../lib/TeConfig");
const expressbase_1 = require("./expressbase");
const InviteCodeMgr_1 = require("../mgr/InviteCodeMgr");
class SDWPay extends expressbase_1.ExpressBase {
    constructor(app, type) {
        super(app, type);
        /*--------------- 闪电玩支付相关的请求 --------------------*/
        this._app.post('/recharge/ret', this._recharge.bind(this));
        this._app.all('/recharge/requestPay', this._requestWxPay.bind(this));
        this._app.all('/recharge/requestPayList', this._requestPayList.bind(this));
        this._app.all('/code/giftcode', this._gift_code.bind(this));
    }
    _recharge(req, res) {
        var param;
        if (req.method == 'POST') {
            param = req.body;
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        console.log("sdwpay time[" + Date.now() + "]:" + JSON.stringify(param));
        var ret = RechargeMgr_1.rechargeMgrInst.rechargeSdwAPI(param) ? 'success' : 'fail';
        let headers = {};
        if (!req.headers['host'] || req.headers['host'].indexOf(TeConfig_1.configInst.get('webAppMgr.port')) >= 0) {
            headers["Access-Control-Allow-Origin"] = TeConfig_1.configInst.get('webhost');
        }
        res.writeHead(200, headers);
        res.write(ret);
        res.end();
    }
    _requestPayList(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req.query;
        }
        else if (req.method == 'POST') {
            param = req.body;
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        RechargeMgr_1.rechargeMgrInst.requestPayList(param["plt"] || "wx", param["appid"] || '1145326931', (function (_req, _res, _out) {
            let headers = { 'Content-Type': 'text/html;charset=UTF-8' };
            if (!_req.headers['host'] || _req.headers['host'].indexOf(TeConfig_1.configInst.get('webAppMgr.port')) >= 0) {
                headers["Access-Control-Allow-Origin"] = TeConfig_1.configInst.get('webhost');
            }
            _res.writeHead(200, headers);
            _res.write(_out);
            _res.end();
        }).bind(this, req, res));
    }
    _requestWxPay(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req.query;
        }
        else if (req.method == 'POST') {
            param = req.body;
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        // let player = onlineMgrInst.getOnlinePlayer(param.sdwUid, "wx");
        // 检查一下玩家是否在线，本身先不承担逻辑,后期需要制作限购什么的时候使用
        let plt = param['serverId'];
        if (!plt || plt == '') {
            plt = 'wx';
        }
        RechargeMgr_1.rechargeMgrInst.requestPay(plt, param, (function (_req, _res, _out) {
            let headers = { 'Content-Type': 'text/html;charset=UTF-8' };
            if (!_req.headers['host'] || _req.headers['host'].indexOf(TeConfig_1.configInst.get('webAppMgr.port')) >= 0) {
                headers["Access-Control-Allow-Origin"] = TeConfig_1.configInst.get('webhost');
            }
            _res.writeHead(200, headers);
            _res.write(JSON.stringify(_out));
            _res.end();
        }).bind(this, req, res));
    }
    _gift_code(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req.query;
        }
        else if (req.method == 'POST') {
            param = req.body;
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        if (!param.code || !param.uid) {
            this._gift_code_answer(req, res, { result: 1, uid: param.uid, code: param.code, msg: 'no node or uid' });
        }
        else {
            res.removeAllListeners('timeout');
            res.setTimeout(10000, this._gift_code_answer.bind(this, req, res, { result: 1, uid: param.uid, code: param.code }));
            InviteCodeMgr_1.InviteCodeMgrInst.checkInvite_web(param.plt || "wx", param.code, parseInt(param.uid.toString()), this._gift_code_answer.bind(this, req, res));
        }
    }
    _gift_code_answer(_req, _res, _out) {
        if (!_res.finished) {
            if (!_res.headersSent) {
                let headers = { 'Content-Type': 'text/html;charset=UTF-8' };
                if (!_req.headers['host'] || _req.headers['host'].indexOf(TeConfig_1.configInst.get('webAppMgr.port')) >= 0) {
                    headers["Access-Control-Allow-Origin"] = TeConfig_1.configInst.get('webhost');
                }
                if (typeof _out == 'object') {
                    _out = JSON.stringify(_out);
                }
                _res.writeHead(200, headers);
            }
            _res.write(_out);
            _res.end();
        }
        // }
    }
}
exports.SDWPay = SDWPay;
//# sourceMappingURL=sdwpay.js.map