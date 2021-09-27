import { ExpressBase, BodyIncomingMessage } from "./expressbase";
import { ServerResponse } from "http";
import { TeMap } from "../lib/TeTool";
import { rechargeMgrInst } from "../mgr/RechargeMgr";
import { serverMonitInst } from "../NetMgr/serverMgr";
import { onlineMgrInst } from "../mgr/OnlinePlayer";
import { netMgrInst } from "../NetMgr/NetMgr";
import { AppUnit } from "../mgr/AppMgr";

enum eQueryType {
    charinfo,
    dhpay
}

/**
 * 查询玩家信息
 */
interface ifCharInfo {
    accountid: string,
    guestid: string,
    areaid: string
}


interface ifRecharge {
    orderid: string,
    accountid: string,
    guestid: string,
    areaid: string,
    paytime: string,
    money: number,
    param: string,
    source: number,
    productid: string,
    productname: string
}

export class DHPay extends ExpressBase {
    constructor(app, type) {
        super(app, type);

        /*-------------------电魂支付相关--------------------*/
        this._app.all('/dhpay/charinfo', this.queryinfo.bind(this));
        this._app.all('/dhpay/queryarea', this.queryarea.bind(this));
        this._app.all('/dhpay/recharge', this.recharge.bind(this));

        setInterval(this._update_.bind(this), 2000);
    }

    private appid: string = '1684303219';

    private get s_plt_map() {
        let args = AppUnit.get_args(this.appid);
        if (!args) args = {};
        return args;
    }

    private _time_out_ = 5 * 1000;
    private _update_() {
        let curr = Date.now();
        let keys = this._query_cache.keys;
        for (let i = 0; i < keys.length; i++) {
            let r_query = this._query_cache.get(keys[i])
            if (r_query.time + this._time_out_ < curr) {
                // 超时处理
                this.onQueryResponse(r_query.qid, null);
            }
        }
    }

    private addQueryList(eType: eQueryType, param: any, res: ServerResponse) {
        let qid = this.get_query_id();
        this._query_cache.set(qid, { qid: qid, type: eType, param: param, res: res, time: Date.now() });
        return qid;
    }

    private _query_cache: TeMap<{ qid: string, type: eQueryType, param: any, res: ServerResponse, time: number }> = new TeMap();
    private queryinfo(req: BodyIncomingMessage, res: ServerResponse) {
        var param: ifCharInfo;
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
        var clsID = onlineMgrInst.getOnlinePlayerCSId(uid, this._areaid2plt(param.areaid));
        netMgrInst.sendQueryPlayerInfo(clsID, uid, "baseInfo", qid);
    }

    private recharge(req: BodyIncomingMessage, res: ServerResponse) {
        var param: ifRecharge;
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
        rechargeMgrInst.rechargeDHAPI({
            Channel: param.source.toString(),//	渠道id（不是必传）
            appId: '1684303219',//	游戏id
            accountId: param.accountid,//	玩家id
            amount: (param.money * 100).toString(),//	支付金额(分)
            cpOrderId: param.param,//	游戏自己的订单号id，支付请求时的游戏订单号
            memo: '',//	支付之前透传的参数
            orderId: '',//	支付成功平台返回的订单id
            sign: '',
        }, this._areaid2plt(param.areaid), this.onQueryResponse.bind(this, qid));
    }

    private _areaid2plt(areaid: string) {
        for (let key in this.s_plt_map) {
            let r = this.s_plt_map[key];
            if (r && r[2] == areaid) {
                return key;
            }
        }

        console.log("dhpay not find areaid [" + areaid + "]")

        return "sdw";
    }

    private queryarea(req: BodyIncomingMessage, res: ServerResponse) {
        var param: ifRecharge;
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

        let ret_list: { "areaid": string, "name": string, "status": string, "channel": string }[] = []
        for (let key in this.s_plt_map) {
            let value = this.s_plt_map[key];
            if (serverMonitInst.get_server_info(key).length >= 1) {
                ret_list.push({
                    areaid: value[2],
                    name: value[0],
                    status: 'ok',
                    channel: value[1]
                })
            }
            else {
                ret_list.push({
                    areaid: value[2],
                    name: value[0],
                    status: '4',
                    channel: value[1]
                })
            }
        }

        res.writeHead(200);
        res.write(JSON.stringify(ret_list));
        res.end();
    }

    public onQueryResponse(qid: string, data: any) {
        let query = this._query_cache.get(qid);
        if (!query) return false;
        if (!query.res.finished) {
            switch (query.type) {
                case eQueryType.charinfo: this.queryinforet(query.param, query.res, data); break;
                case eQueryType.dhpay: this.recharge_ret(query.param, query.res, data); break;
                default: break;
            }
        }

        this._query_cache.del(qid);
        return true;
    }

    private queryinforet(param: ifCharInfo, res: ServerResponse, data: { info: { charname: string, level: number, viplevel: number, desc: string } }) {
        if (!res.headersSent) res.writeHead(200);
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

    private recharge_ret(param: ifRecharge, res: ServerResponse, status: string) {
        if (!status) status = 'fail';
        if (!res.headersSent) res.writeHead(200);
        res.write(JSON.stringify({
            status: status
        }));
        res.end();
    }
}