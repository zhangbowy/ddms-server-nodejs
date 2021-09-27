"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DHPay = void 0;
const expressbase_1 = require("./expressbase");
const TeTool_1 = require("../lib/TeTool");
const RechargeMgr_1 = require("../mgr/RechargeMgr");
const serverMgr_1 = require("../NetMgr/serverMgr");
const OnlinePlayer_1 = require("../mgr/OnlinePlayer");
const NetMgr_1 = require("../NetMgr/NetMgr");
const AppMgr_1 = require("../mgr/AppMgr");
var eQueryType;
(function (eQueryType) {
    eQueryType[eQueryType["charinfo"] = 0] = "charinfo";
    eQueryType[eQueryType["dhpay"] = 1] = "dhpay";
})(eQueryType || (eQueryType = {}));
class DHPay extends expressbase_1.ExpressBase {
    constructor(app, type) {
        super(app, type);
        this.appid = '1684303219';
        this._time_out_ = 5 * 1000;
        this._query_cache = new TeTool_1.TeMap();
        /*-------------------电魂支付相关--------------------*/
        this._app.all('/dhpay/charinfo', this.queryinfo.bind(this));
        this._app.all('/dhpay/queryarea', this.queryarea.bind(this));
        this._app.all('/dhpay/recharge', this.recharge.bind(this));
        setInterval(this._update_.bind(this), 2000);
    }
    get s_plt_map() {
        let args = AppMgr_1.AppUnit.get_args(this.appid);
        if (!args)
            args = {};
        return args;
    }
    _update_() {
        let curr = Date.now();
        let keys = this._query_cache.keys;
        for (let i = 0; i < keys.length; i++) {
            let r_query = this._query_cache.get(keys[i]);
            if (r_query.time + this._time_out_ < curr) {
                // 超时处理
                this.onQueryResponse(r_query.qid, null);
            }
        }
    }
    addQueryList(eType, param, res) {
        let qid = this.get_query_id();
        this._query_cache.set(qid, { qid: qid, type: eType, param: param, res: res, time: Date.now() });
        return qid;
    }
    queryinfo(req, res) {
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
        console.log("dhpay queryinfo time[" + Date.now() + "]:" + JSON.stringify(param));
        let qid = this.addQueryList(eQueryType.charinfo, param, res);
        if (!param.accountid || !param.areaid) {
            this.onQueryResponse(qid, null);
            return;
        }
        let uid = parseInt(param.accountid.toString());
        // 查询用户信息
        var clsID = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(uid, this._areaid2plt(param.areaid));
        NetMgr_1.netMgrInst.sendQueryPlayerInfo(clsID, uid, "baseInfo", qid);
    }
    recharge(req, res) {
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
        console.log("dhpay recharge time[" + Date.now() + "]:" + JSON.stringify(param));
        if (!param.param) {
            res.writeHead(200);
            res.write(JSON.stringify({
                status: 'fail',
                reason: 'no param'
            }));
            res.end();
            return;
        }
        let qid = this.addQueryList(eQueryType.dhpay, param, res);
        RechargeMgr_1.rechargeMgrInst.rechargeDHAPI({
            Channel: param.source.toString(),
            appId: '1684303219',
            accountId: param.accountid,
            amount: (param.money * 100).toString(),
            cpOrderId: param.param,
            memo: '',
            orderId: '',
            sign: '',
        }, this._areaid2plt(param.areaid), this.onQueryResponse.bind(this, qid));
    }
    _areaid2plt(areaid) {
        for (let key in this.s_plt_map) {
            let r = this.s_plt_map[key];
            if (r && r[2] == areaid) {
                return key;
            }
        }
        console.log("dhpay not find areaid [" + areaid + "]");
        return "sdw";
    }
    queryarea(req, res) {
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
        let ret_list = [];
        for (let key in this.s_plt_map) {
            let value = this.s_plt_map[key];
            if (serverMgr_1.serverMonitInst.get_server_info(key).length >= 1) {
                ret_list.push({
                    areaid: value[2],
                    name: value[0],
                    status: 'ok',
                    channel: value[1]
                });
            }
            else {
                ret_list.push({
                    areaid: value[2],
                    name: value[0],
                    status: '4',
                    channel: value[1]
                });
            }
        }
        res.writeHead(200);
        res.write(JSON.stringify(ret_list));
        res.end();
    }
    onQueryResponse(qid, data) {
        let query = this._query_cache.get(qid);
        if (!query)
            return false;
        if (!query.res.finished) {
            switch (query.type) {
                case eQueryType.charinfo:
                    this.queryinforet(query.param, query.res, data);
                    break;
                case eQueryType.dhpay:
                    this.recharge_ret(query.param, query.res, data);
                    break;
                default: break;
            }
        }
        this._query_cache.del(qid);
        return true;
    }
    queryinforet(param, res, data) {
        if (!res.headersSent)
            res.writeHead(200);
        if (!data || !data.info || !data.info.charname || !data.info.level) {
            res.write(JSON.stringify({
                status: 'fail',
                account: param.accountid,
                guestid: '',
                areaid: param.areaid,
                name: '',
                vip: '0',
                level: '0',
                desc: ''
            }));
        }
        else {
            res.write(JSON.stringify({
                status: 'ok',
                account: param.accountid,
                guestid: '',
                areaid: param.areaid,
                name: data.info.charname,
                vip: '0',
                level: data.info.level,
                desc: '',
            }));
        }
        res.end();
    }
    recharge_ret(param, res, status) {
        if (!status)
            status = 'fail';
        if (!res.headersSent)
            res.writeHead(200);
        res.write(JSON.stringify({
            status: status
        }));
        res.end();
    }
}
exports.DHPay = DHPay;
//# sourceMappingURL=dhpay.js.map