import { configInst } from '../lib/TeConfig';
import { Hash, createHash } from 'crypto';
import { ReHashMember } from "../lib/TeRedis";
import { if_sys_, TeMap, func_copy } from '../lib/TeTool';
import { onlineMgrInst } from './OnlinePlayer';
import { netMgrInst } from '../NetMgr/NetMgr';
import { redistInst } from './GMMgr';
import { LogMgr } from '../lib/LogMgr';
import { SeResModule } from '../lib/ResModule';
import { SeResShopMall, SeResrecharge, SeEnumShopMalleType } from '../Res/interface';
import { setInterval } from 'timers';
import { serverMonitInst } from '../NetMgr/serverMgr';
import { SeLoginCheck } from './LoginCheck';
import { AppUnit } from './AppMgr';

// 这里是充值使用的管理模块，要保证玩家充值成功，需要维护一些状态信息的

var log = LogMgr.log('RechargeMgr');

export interface ifRecharge1 {
    appId?: string,
    amount?: number,
    wxopenid?: string,// 微信的openid
    subject?: string,// 
    channel?: number,
    //----------------------//
    accountId?: number,
    cpOrderId?: string,//订单号来自服务器自身

    //----------------------//
    call_back_url?: string,   // 充值回调的界面，有些入口触发，有些不触发 real:https://www.shandw.com/mobile/details.html?gid=[Appid]&channel=[channel] local:https://www.shandw.com/mobile/details.html?gid=[Appid]&channel=[channel]&sdw_test=true
    merchant_url?: string,//支付过程中中断后跳转地址
    timestamp?: number,
    sign?: string,

    //----------------------//
    memo?: string,//透传的数据，这里是可以存储自己的数据，用来后面恢复状态
};

export interface ifSdwAPI {
    Channel: string,//	渠道id（不是必传）
    appId: string,//	游戏id
    accountId: string,//	玩家id
    amount: string,//	支付金额(分)
    cpOrderId: string,//	游戏自己的订单号id，支付请求时的游戏订单号
    memo: string,//	支付之前透传的参数
    orderId: string,//	支付成功平台返回的订单id
    sign: string,//	加密串， 加密方法：MD5(accountId = { 0}& amount={ 1}& appId={ 2}& cpOrderId={ 3}& orderId={ 4}{5})
    // 加密说明：
    // { 0 }:accountId
    // { 1 }:amount
    // { 2 }:appId
    // { 3 }:cpOrderId
    // { 4 }:orderId
    // { 5 }:分配的游戏key
}

interface ifOrderInfo {
    order: string,      // 充值的订单数据
    uid: number,        // 玩家id
    timestamp: number,  // 表示最后一次操作数据的时间
    channel: number,    // 渠道
    amount: number,     // 数量
    plt: string,        // 平台
    outside: boolean,
    state: 'wait' | 'addmoney' | 'finish',  // 充值状态,wait：表示生成订单，但是还没有付费，'addmoney'：这个表示后台收到充值请求，'finish'：这个表示玩家确实已经到账

}

class RechargeMgr {
    shopMallRes: TeMap<SeResModule<SeResShopMall>> = new TeMap();
    rechargeRes: TeMap<SeResModule<SeResrecharge>> = new TeMap();

    constructor() {
        setInterval(this._update_.bind(this), 5 * 1000);
    }

    /**发送给服务器失败的缓存下来 */
    private _update_list_: { info: any, plt: string }[] = [];

    // 增加一个容错，虽然不太会出现
    private _update_() {
        if (this._update_list_.length == 0) return;
        let list = [];
        for (let i = 0; i < this._update_list_.length; i++) {
            let info = this._update_list_[i].info;
            let plt = this._update_list_[i].plt;
            var clsid = onlineMgrInst.getOnlinePlayerCSId(parseInt(info.accountId), plt || 'sdw');
            if (!netMgrInst.sendRechargeRet(clsid, 'addmoney', info)) {
                list.push(this._update_list_[i]);
            }
        }

        this._update_list_ = list;
    }


    getAllShopMall(plt: string) {
        if (!this.shopMallRes.has(plt)) {
            this.shopMallRes.set(plt, new SeResModule<SeResShopMall>('ShopMall.json', plt));
        }
        return this.shopMallRes.get(plt).getAllRes();
    }

    getShopRes(plt: string, mallId: string) {
        if (!this.shopMallRes.has(plt)) {
            this.shopMallRes.set(plt, new SeResModule<SeResShopMall>('ShopMall.json', plt));
        }
        let shop_res = this.shopMallRes.get(plt).getRes(mallId);
        if (!shop_res) return null;

        return shop_res;
    }

    getRechargeRes(plt: string, mallId: string) {
        let shop_mall = this.getShopRes(plt, mallId);
        if (!shop_mall) return null;
        if (!this.rechargeRes.has(plt)) {
            this.rechargeRes.set(plt, new SeResModule<SeResrecharge>('recharge.json', plt));
        }
        return this.rechargeRes.get(plt).getRes(shop_mall.akContent[0]);
    }


    public rechargeOpr(_sys_: if_sys_, sid: string, type: string, info: ifRecharge1 | string) {
        switch (type) {
            case 'check':
                // 玩家发起充值请求，服务器生成一个校验信息
                info = <ifRecharge1>info;
                netMgrInst.sendRechargeRet(sid, type, this._check_recharge_order(_sys_.plt, info));
                break;
            case 'recheck':
                break;
            case 'finish':
                // cloudserver 充值完成，重新设置状态
                if (typeof info == 'string') {
                    this.loadRechargeOrderInfo(info, this._finish_recharge_ret.bind(this, _sys_));
                }
                break;
        }
    }

    private _finish_recharge_ret(_sys_t: if_sys_, _info: ifOrderInfo, db: ReHashMember) {
        if (!_info || _info.state == 'finish') return;

        if (_info.plt && _info.plt != _sys_t.plt) {
            // 表示充值到了错误的平台去了
            log('charge plt error:' + _info.order);
            return;
        }

        _info.timestamp = Date.now();
        _info.state = 'finish';
        db.save(_info);
    }

    private _check_recharge_order(plt: string, info: ifRecharge1) {
        info.call_back_url = info.call_back_url || (configInst.get('payInfo.call_back_url') + `gid=${info.appId}&channel=${info.channel}`);
        info.merchant_url = info.merchant_url || (configInst.get('payInfo.merchant_url') + `gid=${info.appId}&channel=${info.channel}`);
        info.timestamp = Math.floor(Date.now() / 1000);
        var stringA = '';
        var keys = Object.keys(info);
        keys.sort((a, b) => {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        });
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var v = info[key];

            if (key == 'memo') continue;
            if (v == null || v == undefined) continue;
            if (typeof v == 'string' && v.length == 0) continue;

            if (i != 0) stringA += '&';
            stringA += `${key}=${v}`;
        }

        stringA += AppUnit.get_appkey(info.appId);

        var md5sum: Hash = createHash('md5');
        md5sum.update(stringA, 'utf8');
        info.sign = md5sum.digest('hex');

        // 记录一下单号信息，防止找不到送达方
        var orderInfo: ifOrderInfo = {
            order: info.cpOrderId,
            uid: parseInt(info.accountId ? info.accountId.toString() : '0'),
            timestamp: info.timestamp,
            channel: parseInt(info.channel ? info.channel.toString() : '0'),
            amount: parseInt(info.amount ? info.amount.toString() : '1'),
            plt: plt,
            state: 'wait',
            outside: false,
        }
        this.saveRechargeOrderInfo(orderInfo);
        return info;
    }

    /**
     * 来自闪电玩的充值api回调
     */
    public rechargeSdwAPI(info: ifSdwAPI) {
        if (!AppUnit.get_appkey(info.appId)) return false;
        //	加密串， 加密方法：MD5(accountId = { 0}& amount={ 1}& appId={ 2}& cpOrderId={ 3}& orderId={ 4}{5})
        // 加密说明：
        // { 0 }:accountId
        // { 1 }:amount
        // { 2 }:appId
        // { 3 }:cpOrderId
        // { 4 }:orderId
        // { 5 }:分配的游戏key

        var stringA = `accountId=${info.accountId}&amount=${info.amount}&appId=${info.appId}&cpOrderId=${info.cpOrderId}&orderId=${info.orderId}${AppUnit.get_appkey(info.appId)}`;

        var md5sum: Hash = createHash('md5');
        md5sum.update(stringA, 'utf8');
        if (info.sign == md5sum.digest('hex')) {

            this.loadRechargeOrderInfo(info.cpOrderId, this._rechargeOrderRet.bind(this, info, 'sdw', null));
            return true;
        }

        return false;
    }

    public rechargeDHAPI(info: ifSdwAPI, source: string, cb: (succ: boolean) => void) {
        this.loadRechargeOrderInfo(info.cpOrderId, this._rechargeOrderRet.bind(this, info, source, cb));
    }

    public rechargeMainLS(info: ifSdwAPI) {
        this.loadRechargeOrderInfo(info.cpOrderId, this._rechargeOrderRet.bind(this, info, 'sdw', null));
    }

    private _rechargeOrderRet(info: ifSdwAPI, dplt: string, cb: (status: string) => void, orderInfo: ifOrderInfo, db: ReHashMember) {
        if (!orderInfo) {
            // 表示收到一个外部来的充值订单，莫名增加的
            // 抄送给子服务，看看是不是他们的业务产生的
            let servers = serverMonitInst.get_server_by_type_all('subls');
            if (servers && servers.length > 0) {
                for (let i = 0; i < servers.length; i++) {
                    netMgrInst.sendData({
                        cmd: 'recharge',
                        info: func_copy(info)
                    }, servers[i].linkid);
                }

                console.log("three order", JSON.stringify(info));
                return;
            }
            else {
                orderInfo = {
                    order: info.cpOrderId,
                    uid: parseInt(info.accountId),
                    timestamp: Date.now(),
                    channel: parseInt(info.Channel),
                    amount: parseInt(info.amount),
                    plt: dplt, // 如果不存在的时候假装就是闪电玩的
                    state: 'wait',
                    outside: true
                }
            }
        }
        else if (orderInfo.state == 'addmoney' && orderInfo.timestamp + 3 * 1000 < Date.now()) {
            cb && cb("repeat");
            return;
        }
        else if (orderInfo.state == 'finish') {
            // 充值成功的玩家就不需要再充值了
            cb && cb("repeat");
            return;
        }

        var clsid = onlineMgrInst.getOnlinePlayerCSId(parseInt(info.accountId), orderInfo.plt || dplt);
        if (!netMgrInst.sendRechargeRet(clsid, 'addmoney', info)) {
            this._update_list_.push({ info: info, plt: orderInfo.plt || dplt });
        }

        orderInfo.state = 'addmoney';
        db.save(orderInfo);
        cb && cb("ok");
        return;
    }

    private _show_list = [SeEnumShopMalleType.ZuanShiShangCheng, SeEnumShopMalleType.YinCangShangCheng, SeEnumShopMalleType.FengWangZhiLuTeHui, SeEnumShopMalleType.FengWangZhiLuTongXingZheng, SeEnumShopMalleType.ShanDianMaShangCheng];

    public requestPayList(plt: string, appid: string, cb: (data: any) => void) {
        let allRes = this.getAllShopMall(plt);
        let outList = ["appId,appName,areaId,url,productId,productName,productPrice,desc"];

        for (let key in allRes) {
            let r_info = allRes[key] as SeResShopMall;
            if (this._show_list.indexOf(r_info.eType) < 0) continue;

            let recharge_res = this.getRechargeRes(plt, r_info.kID);
            if (!recharge_res) continue;

            let c_info_list = [];
            c_info_list.push(appid);
            c_info_list.push('怼怼三国');
            c_info_list.push('');
            c_info_list.push('');
            c_info_list.push(r_info.kID);
            c_info_list.push(recharge_res.kName);
            c_info_list.push(recharge_res.iRMB * 100);
            c_info_list.push(recharge_res.kDesc || '');
            outList.push(c_info_list.join(","));
        }

        cb(outList.join('<br/>'));
    }

    /*-------------------------------------*/
    /**
     * 提供给闪电码使用的接口
     */
    public requestPay(plt: string, info: { sdwUid: string, wxOpenId: string, appId: string, channel: string, serverId: string, productId: string, money: number, time: number, signType: string, sign: string }, cb: (out: any) => void) {
        let check_keys = ['appId', 'channel', 'money', 'productId', 'sdwUid', 'wxOpenId', 'serverId', 'time'];
        check_keys.sort(function (a, b) {
            return a > b ? 1 : -1;
        });
        let check_string = '';
        for (let i = 0; i < check_keys.length; i++) {
            if (i > 0) {
                check_string += '&';
            }
            check_string += check_keys[i] + '=' + (info[check_keys[i]] || '');
        }
        check_string += "&key=" + configInst.get("appkey");

        let sign = createHash('md5').update(check_string).digest('hex');
        if (sign == info.sign) {
            let shopMallRes = this.getShopRes(plt, info.productId);
            if (!shopMallRes) {
                // 没有这个资源
                cb({
                    result: 3,
                    msg: '找不到商品'
                });
            }
            else if (this._show_list.indexOf(shopMallRes.eType) < 0) {
                cb({
                    result: 4,
                    msg: '商品类型不开放购买'
                });
            }
            else {
                let rechargeRes = this.getRechargeRes(plt, info.productId);
                if (!rechargeRes) {
                    cb({
                        result: 3,
                        msg: '找不到商品'
                    });
                }
                else {
                    // 生成订单信息
                    let order_info = {
                        accountId: parseInt(info.sdwUid),
                        appId: info.appId,
                        amount: info.money,
                        wxopenid: info.wxOpenId,// 微信的openid
                        subject: rechargeRes.kName,
                        channel: parseInt(info.channel),
                        cpOrderId: `BID${info.productId}UID${info.sdwUid}T${Math.floor(Date.now() / 1000)}R${Math.floor(Math.random() * 10)}` // 生成订单号
                    }

                    cb({
                        result: 1,
                        msg: '成功',
                        data: this._check_recharge_order(plt, order_info)
                    });
                }
            }
        }
        else {
            // 签名错误
            cb({
                result: 2,
                msg: '签名错误'
            });
        }
    }

    /*-------------------------------------*/
    loadRechargeOrderInfo(order: string, cb: (info, db: ReHashMember) => void) {
        var loader = redistInst.getHashMember('recharge', order);
        loader.load(this._loadRechargeOrderInfoRet.bind(this, loader, cb));
    }

    private _loadRechargeOrderInfoRet(loader: ReHashMember, cb: (info, db: ReHashMember) => void, succ: boolean) {
        if (!cb) return;

        cb((succ ? loader.value : null), loader);
    }

    saveRechargeOrderInfo(info: ifOrderInfo) {
        var loader = redistInst.getHashMember('recharge', info.order);
        loader.save(info);
    }
}

export var rechargeMgrInst = new RechargeMgr();