"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rechargeMgrInst = void 0;
const TeConfig_1 = require("../lib/TeConfig");
const crypto_1 = require("crypto");
const TeTool_1 = require("../lib/TeTool");
const OnlinePlayer_1 = require("./OnlinePlayer");
const NetMgr_1 = require("../NetMgr/NetMgr");
const GMMgr_1 = require("./GMMgr");
const LogMgr_1 = require("../lib/LogMgr");
const ResModule_1 = require("../lib/ResModule");
const interface_1 = require("../Res/interface");
const timers_1 = require("timers");
const serverMgr_1 = require("../NetMgr/serverMgr");
const AppMgr_1 = require("./AppMgr");
// 这里是充值使用的管理模块，要保证玩家充值成功，需要维护一些状态信息的
var log = LogMgr_1.LogMgr.log('RechargeMgr');
;
class RechargeMgr {
    constructor() {
        this.shopMallRes = new TeTool_1.TeMap();
        this.rechargeRes = new TeTool_1.TeMap();
        /**发送给服务器失败的缓存下来 */
        this._update_list_ = [];
        this._show_list = [interface_1.SeEnumShopMalleType.ZuanShiShangCheng, interface_1.SeEnumShopMalleType.YinCangShangCheng, interface_1.SeEnumShopMalleType.FengWangZhiLuTeHui, interface_1.SeEnumShopMalleType.FengWangZhiLuTongXingZheng, interface_1.SeEnumShopMalleType.ShanDianMaShangCheng];
        timers_1.setInterval(this._update_.bind(this), 5 * 1000);
    }
    // 增加一个容错，虽然不太会出现
    _update_() {
        if (this._update_list_.length == 0)
            return;
        let list = [];
        for (let i = 0; i < this._update_list_.length; i++) {
            let info = this._update_list_[i].info;
            let plt = this._update_list_[i].plt;
            var clsid = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(parseInt(info.accountId), plt || 'sdw');
            if (!NetMgr_1.netMgrInst.sendRechargeRet(clsid, 'addmoney', info)) {
                list.push(this._update_list_[i]);
            }
        }
        this._update_list_ = list;
    }
    getAllShopMall(plt) {
        if (!this.shopMallRes.has(plt)) {
            this.shopMallRes.set(plt, new ResModule_1.SeResModule('ShopMall.json', plt));
        }
        return this.shopMallRes.get(plt).getAllRes();
    }
    getShopRes(plt, mallId) {
        if (!this.shopMallRes.has(plt)) {
            this.shopMallRes.set(plt, new ResModule_1.SeResModule('ShopMall.json', plt));
        }
        let shop_res = this.shopMallRes.get(plt).getRes(mallId);
        if (!shop_res)
            return null;
        return shop_res;
    }
    getRechargeRes(plt, mallId) {
        let shop_mall = this.getShopRes(plt, mallId);
        if (!shop_mall)
            return null;
        if (!this.rechargeRes.has(plt)) {
            this.rechargeRes.set(plt, new ResModule_1.SeResModule('recharge.json', plt));
        }
        return this.rechargeRes.get(plt).getRes(shop_mall.akContent[0]);
    }
    rechargeOpr(_sys_, sid, type, info) {
        switch (type) {
            case 'check':
                // 玩家发起充值请求，服务器生成一个校验信息
                info = info;
                NetMgr_1.netMgrInst.sendRechargeRet(sid, type, this._check_recharge_order(_sys_.plt, info));
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
    _finish_recharge_ret(_sys_t, _info, db) {
        if (!_info || _info.state == 'finish')
            return;
        if (_info.plt && _info.plt != _sys_t.plt) {
            // 表示充值到了错误的平台去了
            log('charge plt error:' + _info.order);
            return;
        }
        _info.timestamp = Date.now();
        _info.state = 'finish';
        db.save(_info);
    }
    _check_recharge_order(plt, info) {
        info.call_back_url = info.call_back_url || (TeConfig_1.configInst.get('payInfo.call_back_url') + `gid=${info.appId}&channel=${info.channel}`);
        info.merchant_url = info.merchant_url || (TeConfig_1.configInst.get('payInfo.merchant_url') + `gid=${info.appId}&channel=${info.channel}`);
        info.timestamp = Math.floor(Date.now() / 1000);
        var stringA = '';
        var keys = Object.keys(info);
        keys.sort((a, b) => {
            if (a < b)
                return -1;
            if (a > b)
                return 1;
            return 0;
        });
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var v = info[key];
            if (key == 'memo')
                continue;
            if (v == null || v == undefined)
                continue;
            if (typeof v == 'string' && v.length == 0)
                continue;
            if (i != 0)
                stringA += '&';
            stringA += `${key}=${v}`;
        }
        stringA += AppMgr_1.AppUnit.get_appkey(info.appId);
        var md5sum = crypto_1.createHash('md5');
        md5sum.update(stringA, 'utf8');
        info.sign = md5sum.digest('hex');
        // 记录一下单号信息，防止找不到送达方
        var orderInfo = {
            order: info.cpOrderId,
            uid: parseInt(info.accountId ? info.accountId.toString() : '0'),
            timestamp: info.timestamp,
            channel: parseInt(info.channel ? info.channel.toString() : '0'),
            amount: parseInt(info.amount ? info.amount.toString() : '1'),
            plt: plt,
            state: 'wait',
            outside: false,
        };
        this.saveRechargeOrderInfo(orderInfo);
        return info;
    }
    /**
     * 来自闪电玩的充值api回调
     */
    rechargeSdwAPI(info) {
        if (!AppMgr_1.AppUnit.get_appkey(info.appId))
            return false;
        //	加密串， 加密方法：MD5(accountId = { 0}& amount={ 1}& appId={ 2}& cpOrderId={ 3}& orderId={ 4}{5})
        // 加密说明：
        // { 0 }:accountId
        // { 1 }:amount
        // { 2 }:appId
        // { 3 }:cpOrderId
        // { 4 }:orderId
        // { 5 }:分配的游戏key
        var stringA = `accountId=${info.accountId}&amount=${info.amount}&appId=${info.appId}&cpOrderId=${info.cpOrderId}&orderId=${info.orderId}${AppMgr_1.AppUnit.get_appkey(info.appId)}`;
        var md5sum = crypto_1.createHash('md5');
        md5sum.update(stringA, 'utf8');
        if (info.sign == md5sum.digest('hex')) {
            this.loadRechargeOrderInfo(info.cpOrderId, this._rechargeOrderRet.bind(this, info, 'sdw', null));
            return true;
        }
        return false;
    }
    rechargeDHAPI(info, source, cb) {
        this.loadRechargeOrderInfo(info.cpOrderId, this._rechargeOrderRet.bind(this, info, source, cb));
    }
    rechargeMainLS(info) {
        this.loadRechargeOrderInfo(info.cpOrderId, this._rechargeOrderRet.bind(this, info, 'sdw', null));
    }
    _rechargeOrderRet(info, dplt, cb, orderInfo, db) {
        if (!orderInfo) {
            // 表示收到一个外部来的充值订单，莫名增加的
            // 抄送给子服务，看看是不是他们的业务产生的
            let servers = serverMgr_1.serverMonitInst.get_server_by_type_all('subls');
            if (servers && servers.length > 0) {
                for (let i = 0; i < servers.length; i++) {
                    NetMgr_1.netMgrInst.sendData({
                        cmd: 'recharge',
                        info: TeTool_1.func_copy(info)
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
                    plt: dplt,
                    state: 'wait',
                    outside: true
                };
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
        var clsid = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(parseInt(info.accountId), orderInfo.plt || dplt);
        if (!NetMgr_1.netMgrInst.sendRechargeRet(clsid, 'addmoney', info)) {
            this._update_list_.push({ info: info, plt: orderInfo.plt || dplt });
        }
        orderInfo.state = 'addmoney';
        db.save(orderInfo);
        cb && cb("ok");
        return;
    }
    requestPayList(plt, appid, cb) {
        let allRes = this.getAllShopMall(plt);
        let outList = ["appId,appName,areaId,url,productId,productName,productPrice,desc"];
        for (let key in allRes) {
            let r_info = allRes[key];
            if (this._show_list.indexOf(r_info.eType) < 0)
                continue;
            let recharge_res = this.getRechargeRes(plt, r_info.kID);
            if (!recharge_res)
                continue;
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
    requestPay(plt, info, cb) {
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
        check_string += "&key=" + TeConfig_1.configInst.get("appkey");
        let sign = crypto_1.createHash('md5').update(check_string).digest('hex');
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
                        wxopenid: info.wxOpenId,
                        subject: rechargeRes.kName,
                        channel: parseInt(info.channel),
                        cpOrderId: `BID${info.productId}UID${info.sdwUid}T${Math.floor(Date.now() / 1000)}R${Math.floor(Math.random() * 10)}` // 生成订单号
                    };
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
    loadRechargeOrderInfo(order, cb) {
        var loader = GMMgr_1.redistInst.getHashMember('recharge', order);
        loader.load(this._loadRechargeOrderInfoRet.bind(this, loader, cb));
    }
    _loadRechargeOrderInfoRet(loader, cb, succ) {
        if (!cb)
            return;
        cb((succ ? loader.value : null), loader);
    }
    saveRechargeOrderInfo(info) {
        var loader = GMMgr_1.redistInst.getHashMember('recharge', info.order);
        loader.save(info);
    }
}
exports.rechargeMgrInst = new RechargeMgr();
//# sourceMappingURL=RechargeMgr.js.map