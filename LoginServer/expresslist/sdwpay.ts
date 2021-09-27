import { rechargeMgrInst, ifSdwAPI } from "../mgr/RechargeMgr";
import { configInst } from "../lib/TeConfig";
import * as HTTP from "http";
import { BodyIncomingMessage, ExpressBase } from "./expressbase";
import { InviteCodeMgrInst } from "../mgr/InviteCodeMgr";

export class SDWPay extends ExpressBase {
    constructor(app, type) {
        super(app, type);

        /*--------------- 闪电玩支付相关的请求 --------------------*/
        this._app.post('/recharge/ret', this._recharge.bind(this));
        this._app.all('/recharge/requestPay', this._requestWxPay.bind(this));
        this._app.all('/recharge/requestPayList', this._requestPayList.bind(this));

        this._app.all('/code/giftcode', this._gift_code.bind(this));
    }

    private _recharge(req: BodyIncomingMessage, res: HTTP.ServerResponse) {
        var param: any;
        if (req.method == 'POST') {
            param = req.body;
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }

        console.log("sdwpay time[" + Date.now() + "]:" + JSON.stringify(param));

        var ret = rechargeMgrInst.rechargeSdwAPI(<ifSdwAPI>param) ? 'success' : 'fail';

        let headers: HTTP.OutgoingHttpHeaders = {};
        if (!req.headers['host'] || req.headers['host'].indexOf(configInst.get('webAppMgr.port')) >= 0) {
            headers["Access-Control-Allow-Origin"] = configInst.get<string>('webhost');
        }
        res.writeHead(200, headers);

        res.write(ret);
        res.end();
    }

    private _requestPayList(req: BodyIncomingMessage, res: HTTP.ServerResponse) {
        var param: any;
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

        rechargeMgrInst.requestPayList(param["plt"] || "wx", param["appid"] || '1145326931', (function (_req, _res, _out) {
            let headers: HTTP.OutgoingHttpHeaders = { 'Content-Type': 'text/html;charset=UTF-8' };
            if (!_req.headers['host'] || _req.headers['host'].indexOf(configInst.get('webAppMgr.port')) >= 0) {
                headers["Access-Control-Allow-Origin"] = configInst.get<string>('webhost');
            }
            _res.writeHead(200, headers);
            _res.write(_out);
            _res.end();
        }).bind(this, req, res));
    }


    private _requestWxPay(req: BodyIncomingMessage, res: HTTP.ServerResponse) {
        var param: any;
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

        rechargeMgrInst.requestPay(plt, param as any, (function (_req, _res, _out) {
            let headers: HTTP.OutgoingHttpHeaders = { 'Content-Type': 'text/html;charset=UTF-8' };
            if (!_req.headers['host'] || _req.headers['host'].indexOf(configInst.get('webAppMgr.port')) >= 0) {
                headers["Access-Control-Allow-Origin"] = configInst.get<string>('webhost');
            }
            _res.writeHead(200, headers);
            _res.write(JSON.stringify(_out));
            _res.end();
        }).bind(this, req, res));
    }


    private _gift_code(req: BodyIncomingMessage, res: HTTP.ServerResponse) {
        var param: any;
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
            this._gift_code_answer(req, res, { result: 1, uid: param.uid, code: param.code, msg: 'no node or uid' })
        }
        else {
            res.removeAllListeners('timeout');
            res.setTimeout(10000, this._gift_code_answer.bind(this, req, res, { result: 1, uid: param.uid, code: param.code }))

            InviteCodeMgrInst.checkInvite_web(param.plt || "wx", param.code, parseInt(param.uid.toString()), this._gift_code_answer.bind(this, req, res));
        }
    }

    private _gift_code_answer(_req: BodyIncomingMessage, _res: HTTP.ServerResponse, _out: any) {
        if (!_res.finished) {

            if (!_res.headersSent) {
                let headers: HTTP.OutgoingHttpHeaders = { 'Content-Type': 'text/html;charset=UTF-8' };
                if (!_req.headers['host'] || _req.headers['host'].indexOf(configInst.get('webAppMgr.port')) >= 0) {
                    headers["Access-Control-Allow-Origin"] = configInst.get<string>('webhost');
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