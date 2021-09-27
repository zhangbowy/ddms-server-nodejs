"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeShopMgr = void 0;
const TableRes = require("../Res/interface");
const TeTool_1 = require("../TeTool");
const SePlayerDef_1 = require("./SePlayerDef");
const TeLogMgr_1 = require("../TeLogMgr");
const SeDefine_1 = require("../SeDefine");
const TeConfig_1 = require("../lib/TeConfig");
var BMPayType = {
    W025: 'W025',
    Gold: 'Gold',
};
const Card_Gold_Price = [0, 20, 80, 400, 5000]; //卡牌的金币价格
class SeShopMgr {
    constructor(_parent) {
        this.poolName2use = {};
        this._parent = _parent;
    }
    get Player() {
        return this._parent;
    }
    get baseInfo() {
        return this.Player.baseInfo;
    }
    get dbInfo() {
        return this.Player.shopDb;
    }
    initDb(d) {
        this._shopInfo = new SePlayerDef_1.SeShopInfo(d);
        this._checkDaily();
        for (let key in this._shopInfo.limit_count) {
            let r_info = this._shopInfo.limit_count[key];
            if (typeof r_info == 'number' || typeof r_info == 'string') {
                this._shopInfo.limit_count[key] = {
                    buy: this._shopInfo[key],
                    cttime: Date.now()
                };
            }
        }
    }
    _item_sort(a, b) {
        if (a.iPos > b.iPos)
            return 1;
        if (a.iPos < b.iPos)
            return -1;
        return a.kID > b.kID ? 1 : -1;
    }
    check_platform_limit(pkShopMallRes) {
        if (this._parent.loginInfo) {
            if (pkShopMallRes.iPlatform == TableRes.SeEnumShopMalliPlatform.FeiPingGuo && this._parent.loginInfo.device_os == 'ios') {
                return true;
            }
            if (pkShopMallRes.iPlatform == TableRes.SeEnumShopMalliPlatform.PingGuo && this._parent.loginInfo.device_os != 'ios') {
                return true;
            }
        }
        return false;
    }
    getInfo() {
        this.checkLevelTehui();
        this.checkActivity();
        var d = [];
        var list = [];
        for (var key in TableRes.SeEnumShopMalleType) {
            var idx = parseInt(key);
            if (isNaN(idx))
                continue;
            if (idx == TableRes.SeEnumShopMalleType.MeiRiJingXuan || idx == TableRes.SeEnumShopMalleType.CangBaoGe) {
                d[idx] = { list: [], updateTime: this._shopInfo.dailyUpdateTime };
            }
            else {
                d[idx] = { list: [] };
            }
            list[idx] = [];
        }
        var res = global.resMgr.ShopMallRes.getAllRes();
        for (var kid in res) {
            var pkShopMallRes = res[kid];
            // if (pkShopMallRes.kForceFinishTime && (new Date(pkShopMallRes.kForceFinishTime)).getTime() < Date.now()) continue;
            if (pkShopMallRes) {
                if (list[pkShopMallRes.eType]) {
                    list[pkShopMallRes.eType].push(pkShopMallRes);
                }
                else {
                    list[pkShopMallRes.eType] = [pkShopMallRes];
                }
            }
        }
        var item;
        var resultList;
        for (var i = 0; i < list.length; i++) {
            if (!d[i])
                continue;
            resultList = d[i].list;
            for (let j = 0; j < list[i].length; j++) {
                pkShopMallRes = list[i][j];
                if (this.check_platform_limit(pkShopMallRes))
                    continue;
                item = this._getFullItem(pkShopMallRes);
                if (item) {
                    resultList.push(item);
                }
            }
            d[i].list.sort(this._item_sort);
        }
        var out = {
            list: d,
            activity: this._shopInfo.activityHash,
            // refreshCount: this._shopInfo.refreshCount,
            refreshList: this._shopInfo.refreshList,
            shoplimit: this._shopInfo.limit_count,
            shopGiftTime: null,
            leveltehui: (this.dbInfo.get('leveltehui') || [])
        };
        return out;
    }
    updateShopConfig() {
        global.netMgr.initShop(this.Player.linkid, this.getInfo());
    }
    getShopInfo() {
        this._checkDaily();
        global.netMgr.initShop(this.Player.linkid, this.getInfo());
    }
    payToReFresh(type = TableRes.SeEnumShopMalleType.MeiRiJingXuan) {
        let refreshCount = this._shopInfo.refreshList[type] || 0;
        var price = refreshCount == 0 ? 0 : 10 * Math.pow(2, refreshCount - 1);
        if (price > 0 && !this._parent.decMoney(price, "refresh_" + type)) {
            return;
        }
        this._shopInfo.refreshList[type] = refreshCount + 1;
        this.saveInfo("refreshList");
        this._limit_clear(type);
        this._shopInfo.modfiyItems[type] = [];
        switch (type) {
            case TableRes.SeEnumShopMalleType.MeiRiJingXuan:
                this._refreshDailyShop();
                break;
            case TableRes.SeEnumShopMalleType.CangBaoGe:
                this._refreshCangBaoGeShop();
                break;
        }
        global.netMgr.initShop(this.Player.linkid, this.getInfo());
    }
    // public payToReFreshDaily(type: TableRes.SeEnumShopMalleType = TableRes.SeEnumShopMalleType.MeiRiJingXuan) {
    //     this.payToReFreshDaily(TableRes.SeEnumShopMalleType.MeiRiJingXuan);
    // }
    // public payToReFreshCangbaoge() {
    //     this.payToReFreshDaily(TableRes.SeEnumShopMalleType.CangBaoGe);
    // }
    _get_modfiy_item(type, pos) {
        if (!this._shopInfo.modfiyItems)
            return null;
        if (!this._shopInfo.modfiyItems[type])
            return null;
        if (pos == undefined || pos == -1 || pos == null) {
            return this._shopInfo.modfiyItems[type];
        }
        if (!this._shopInfo.modfiyItems[type][pos])
            return null;
        return this._shopInfo.modfiyItems[type][pos];
    }
    _set_modfiy_item(type, pos, value) {
        if (!this._shopInfo.modfiyItems)
            this._shopInfo.modfiyItems = [];
        if (!this._shopInfo.modfiyItems[type])
            this._shopInfo.modfiyItems[type] = [];
        if (pos == undefined || pos == -1 || pos == null) {
            this._shopInfo.modfiyItems[type] = [];
            return;
        }
        this._shopInfo.modfiyItems[type][pos] = value;
    }
    levelUpCheck() {
        var res = global.resMgr.ShopMallRes.getAllRes();
        for (var kid in res) {
            var pkShopMallRes = res[kid];
            if (pkShopMallRes.eType == TableRes.SeEnumShopMalleType.MeiRiJingXuan) {
                if (this.Player.top_pvp_level >= pkShopMallRes.iOpenGrade && !this._get_modfiy_item(pkShopMallRes.eType, pkShopMallRes.iPos)) {
                    this._refreshDailyShop();
                    global.netMgr.initShop(this.Player.linkid, this.getInfo());
                    return;
                }
            }
        }
    }
    //更新动态的礼包
    //目前就是轮换礼包
    update_dynamic_res() {
        var result = {};
        var ids = global.resMgr.ShopMallRes.update();
        //筛选出需要同步的商品类型
        for (let i = 0; i < ids.length; i++) {
            let pkShopMallRes = global.resMgr.ShopMallRes.getRes(ids[i]);
            if (!result[pkShopMallRes.eType]) {
                result[pkShopMallRes.eType] = [];
            }
        }
        var res = global.resMgr.ShopMallRes.getAllRes();
        for (var kid in res) {
            let _pkShopMallRes = res[kid];
            let item = this._getFullItem(_pkShopMallRes);
            if (result[_pkShopMallRes.eType])
                result[_pkShopMallRes.eType].push(item);
            if (_pkShopMallRes.eType == TableRes.SeEnumShopMalleType.LunHuanLiBao && this._shopInfo.limit_count[_pkShopMallRes.kID]) {
                if (_pkShopMallRes.kStartTime == '' || new Date(_pkShopMallRes.kStartTime).getTime() > this._shopInfo.limit_count[_pkShopMallRes.kID]['cttime']) {
                    this.reset_shop_limit(_pkShopMallRes.kID);
                }
            }
        }
        global.netMgr.updateShop(this.Player.linkid, result);
    }
    //更新下this._shopInfo.limit_count
    //现在更新玩家的轮换礼包限制次数
    //每次登录的时候 判断一下
    update_runhuan_gift() {
        for (var kid in this._shopInfo.limit_count) {
            let _pkShopMallRes = global.resMgr.ShopMallRes.getRes(kid);
            if (_pkShopMallRes && _pkShopMallRes.eType == TableRes.SeEnumShopMalleType.LunHuanLiBao) {
                if (_pkShopMallRes.kStartTime == '' || new Date(_pkShopMallRes.kStartTime).getTime() > this._shopInfo.limit_count[kid]['cttime']) {
                    delete this._shopInfo.limit_count[kid];
                }
            }
        }
        this.saveInfo("limit_count");
    }
    /**
     * 更新商城限购道具的开启时间
     * @param mallid
     * @param lastHours
     */
    update_shop_limit_time(mallid, lastHours) {
        let pkMallRes = global.resMgr.ShopMallRes.getRes(mallid);
        if (!pkMallRes)
            return;
        if (this.check_platform_limit(pkMallRes))
            return;
        let curr = Date.now();
        if (!this._shopInfo.limitedShop.hasOwnProperty(mallid)) {
            this._shopInfo.limitedShop[mallid] = {
                begin: curr,
                last: lastHours
            };
        }
        else {
            let limitInfo = this._shopInfo.limitedShop[mallid];
            if (limitInfo.begin + limitInfo.last * 60 * 60 * 1000 >= curr + lastHours * 60 * 60 * 1000) {
                // 时间有效期没有变不需要改动
                return;
            }
            limitInfo.begin = curr;
            limitInfo.last = lastHours;
        }
        this.saveInfo('limitedShop');
        // 这里需要通知玩家商城信息有变动，动态变更商店信息
        let shomInfo = this._getFullItem(pkMallRes);
        global.netMgr.sendCharMiscUpdate(this._parent.linkid, "singleshopinfo", mallid, shomInfo);
    }
    // //校验限制礼包的有效性
    // public check_lgift_time() {
    //     var gtime = this._shopInfo.limitedGiftTime;
    //     if (!gtime) { return true; }
    //     //礼包是否过期
    //     return Date.now() > (gtime['ftime'] || 0);
    // }
    // //更新限时礼包状态
    // public update_lgift_time(mallId: string, isBuy: boolean, time?: number, ftime?: number, eType?: number) {
    //     //不是限时礼包不走这里
    //     var pkShopMallRes = global.resMgr.ShopMallRes.getRes(mallId);
    //     if (pkShopMallRes.eType != TableRes.SeEnumShopMalleType.XianShiZuanShi && pkShopMallRes.eType != TableRes.SeEnumShopMalleType.XianShiRenMinBi) {
    //         return;
    //     }
    //     if (!this._shopInfo.limitedGiftTime) {
    //         this._shopInfo.limitedGiftTime = {};
    //     }
    //     this._shopInfo.limitedGiftTime['mallId'] = mallId;
    //     this._shopInfo.limitedGiftTime['buy'] = isBuy ? 1 : 0;
    //     this._shopInfo.limitedGiftTime['time'] = time ? time : Date.now();
    //     if (ftime) this._shopInfo.limitedGiftTime['ftime'] = ftime;
    //     if (eType) this._shopInfo.limitedGiftTime['type'] = eType;
    //     this.saveInfo("limitedGiftTime");
    //     global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'limitedGiftTime', this._shopInfo.limitedGiftTime);
    // }
    clear_limit() {
        if (this._parent.bInitComplete) {
            for (var key in this._shopInfo.limit_count) {
                global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'limit_count', key, null);
            }
        }
        this._shopInfo.limit_count = {};
        this.saveInfo("limit_count");
    }
    get_shop_limit(mallId) {
        var pkShopMallRes = global.resMgr.ShopMallRes.getRes(mallId);
        if (!pkShopMallRes)
            return {
                buy: 0,
                cttime: Date.now(),
            };
        var limit_info = this._shopInfo.limit_count[mallId];
        if (pkShopMallRes.iCount > 0) {
            let bfresh = false;
            if (limit_info) {
                if (typeof limit_info == 'number') {
                    // 处理老版本数据
                    bfresh = true;
                }
                else {
                    // 判断一下限购是否满足刷新条件
                    switch (pkShopMallRes.eFreshType) {
                        case TableRes.SeEnumShopMalleFreshType.BuShuaXin:
                            break;
                        case TableRes.SeEnumShopMalleFreshType.MeiRi:
                            if (TeTool_1.TeDate.isdiffday(limit_info.cttime)) {
                                bfresh = true;
                            }
                            break;
                        case TableRes.SeEnumShopMalleFreshType.MeiZhou:
                            if (TeTool_1.TeDate.isdiffweek(limit_info.cttime)) {
                                bfresh = true;
                            }
                            break;
                        case TableRes.SeEnumShopMalleFreshType.MeiYue:
                            if (TeTool_1.TeDate.isdiffmonth(limit_info.cttime)) {
                                bfresh = true;
                            }
                            break;
                        case TableRes.SeEnumShopMalleFreshType.MeiSaiJi:
                            if (this._parent.pvpMgr.isdiffseason(limit_info.cttime)) {
                                bfresh = true;
                            }
                            break;
                        case TableRes.SeEnumShopMalleFreshType.SiBaXiaoShi: {
                            let time = TeConfig_1.configInst.get("cheatmode") ? 60 * 1000 : 48 * 60 * 60 * 1000;
                            if (Date.now() - limit_info.cttime >= time) {
                                bfresh = true;
                            }
                            break;
                        }
                        case TableRes.SeEnumShopMalleFreshType.ShiErXiaoShi: {
                            let time = TeConfig_1.configInst.get("cheatmode") ? 60 * 1000 : 12 * 60 * 60 * 1000;
                            if (Date.now() - limit_info.cttime >= time) {
                                bfresh = true;
                            }
                            break;
                        }
                        case TableRes.SeEnumShopMalleFreshType.ErSiXiaoShi: {
                            let time = TeConfig_1.configInst.get("cheatmode") ? 60 * 1000 : 24 * 60 * 60 * 1000;
                            if (Date.now() - limit_info.cttime >= time) {
                                bfresh = true;
                            }
                            break;
                        }
                        case TableRes.SeEnumShopMalleFreshType.MeiLiangRi: {
                            if (TeTool_1.TeDate.daydiff(limit_info.cttime) >= 2) {
                                bfresh = true;
                            }
                            break;
                        }
                    }
                }
            }
            else {
                bfresh = true;
            }
            if (bfresh) {
                limit_info = {
                    buy: 0,
                    cttime: Date.now(),
                };
            }
        }
        return limit_info;
    }
    // 限购判断
    is_shop_limit(mallId, count) {
        let pkShopMallRes = global.resMgr.ShopMallRes.getRes(mallId);
        let limit_info = this.get_shop_limit(mallId);
        if (pkShopMallRes && pkShopMallRes.iCount > 0 && (limit_info.buy + count) > pkShopMallRes.iCount) {
            // 数量限购
            return true;
        }
        if (pkShopMallRes && pkShopMallRes.kPreID) {
            // 是否有前置购买，目前前置购买项也需要设置限购才可以被判断到
            limit_info = this.get_shop_limit(pkShopMallRes.kPreID);
            if (limit_info && limit_info.buy <= 0) {
                return true;
            }
        }
        //vip等级限购
        if (pkShopMallRes.iVipNeedLevel) {
            if (!this.baseInfo.is_vip || this.baseInfo.vip_level < pkShopMallRes.iVipNeedLevel) {
                return true;
            }
        }
        return false;
    }
    add_shop_limit(mallId, count = 1) {
        var pkShopMallRes = global.resMgr.ShopMallRes.getRes(mallId);
        //限时礼包不走这里
        if (!pkShopMallRes || pkShopMallRes.eType == TableRes.SeEnumShopMalleType.XianShiZuanShi || pkShopMallRes.eType == TableRes.SeEnumShopMalleType.XianShiRenMinBi) {
            return;
        }
        var limit_info = this.get_shop_limit(mallId);
        if (pkShopMallRes && pkShopMallRes.iCount > 0) {
            limit_info.buy += count;
            this._shopInfo.limit_count[mallId] = limit_info;
            this.saveInfo("limit_count");
            if (this._parent.bInitComplete)
                global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'limit_count', mallId, this._shopInfo.limit_count[mallId]);
        }
    }
    buyShopMall(mallId, marketId, count = 1) {
        var pkShopMallRes = global.resMgr.ShopMallRes.getRes(mallId);
        if (!pkShopMallRes)
            return false;
        if (pkShopMallRes.eType != TableRes.SeEnumShopMalleType.JinJiTeHui) {
            if (pkShopMallRes.iOpenRank && pkShopMallRes.iOpenRank > this.Player.pvp_level)
                return false;
            if (pkShopMallRes.iOpenELO && pkShopMallRes.iOpenELO > this.Player.pvp_score)
                return false;
            if (pkShopMallRes.iOpenJJCRank && pkShopMallRes.iOpenJJCRank > this.Player.max_pve_pk_rank)
                return false;
        }
        var price = 0;
        var payId = '';
        var num = count;
        if (!num || isNaN(num) || num == null || num == undefined) {
            // 判断一下数量一定要是 合法值
            num = 1;
        }
        var priceType = TableRes.SeEnumSuperMarketeType.JinBi;
        var mallType = SePlayerDef_1.EnumMallType.Item;
        // 强制关闭时间
        // if (pkShopMallRes.kForceFinishTime && (new Date(pkShopMallRes.kForceFinishTime)).getTime() < Date.now()) return false;
        var mallInfo;
        var pkMarketRes = global.resMgr.SuperMarketRes.getRes(marketId);
        var iDiscount = 1;
        if ([TableRes.SeEnumShopMalleType.MeiRiJingXuan, TableRes.SeEnumShopMalleType.CangBaoGe].indexOf(pkShopMallRes.eType) >= 0) {
            mallInfo = this._get_modfiy_item(pkShopMallRes.eType, pkShopMallRes.iPos);
            if (!mallInfo)
                return false;
            if (mallInfo.mallType == SePlayerDef_1.EnumMallType.Item) {
                pkMarketRes = global.resMgr.SuperMarketRes.getRes(marketId);
                if (!pkMarketRes)
                    return false;
                if (!isNaN(pkMarketRes.iDiscount))
                    iDiscount = pkMarketRes.iDiscount;
                price = pkMarketRes.iPrice;
                priceType = pkMarketRes.eType;
                payId = pkMarketRes.kPayItem;
            }
            else {
                price = mallInfo.iPrice;
                payId = mallInfo.payId;
                priceType = mallInfo.ePriceType;
            }
            mallType = mallInfo.mallType;
        }
        else {
            pkMarketRes = global.resMgr.SuperMarketRes.getRes(marketId);
            if (!pkMarketRes)
                return false;
            price = pkMarketRes.iPrice;
            priceType = pkMarketRes.eType;
            payId = pkMarketRes.kPayItem;
        }
        // 超出数量的不购买
        if (this.is_shop_limit(mallId, num)) {
            return false;
        }
        if (pkShopMallRes.eType == TableRes.SeEnumShopMalleType.WanBaTeJia) {
            if (TeConfig_1.configInst.get('plt') != 'qzone' || (this._parent.ext_vip_level < (pkShopMallRes.aiValue[0] || 0)))
                return false;
        }
        price = Math.ceil(price * iDiscount) * num;
        //vip有打折
        if (pkShopMallRes.iVipDisount == 1) {
            if (this.baseInfo.is_vip && this.baseInfo.vip_level > 0) {
                let vip_res = global.resMgr.getVIPResByVIPLevel(this.baseInfo.vip_level);
                if (vip_res && vip_res.iShopDiscount) {
                    price = Math.floor(price * vip_res.iShopDiscount / 100);
                }
            }
        }
        //神秘商店打折
        if ((pkShopMallRes.iProperty & TableRes.SeEnumShopMalliProperty.ShenMiShangDianZheKou) == TableRes.SeEnumShopMalliProperty.ShenMiShangDianZheKou) {
            if (this.baseInfo.random_discount && this.baseInfo.random_discount > 0 && this.baseInfo.random_discount < 100) {
                price = Math.floor(price * this.baseInfo.random_discount / 100);
            }
        }
        //神秘商店的记录英雄id
        if (pkShopMallRes.eType == TableRes.SeEnumShopMalleType.ShenMiShangDianYingXiong) {
            if (this.Player.baseInfo.selectHeros.indexOf(pkShopMallRes.kExtraValue) == -1)
                return false;
            this.Player.baseInfo.buyHeroId = pkShopMallRes.kExtraValue;
        }
        if (price < 0)
            return false;
        if (pkMarketRes && pkMarketRes.akExtraPay) {
            for (let i = 0; i < pkMarketRes.akExtraPay.length; i++) {
                if (!this.Player.delItem(pkMarketRes.akExtraPay[i].split(',')[0], Number(pkMarketRes.akExtraPay[i].split(',')[1]), SePlayerDef_1.DeAddDelItemReason.shopdel, mallId))
                    return false;
            }
        }
        var payType = '';
        switch (priceType) {
            case TableRes.SeEnumSuperMarketeType.JinBi:
                if (price && !this._parent.useGold(price))
                    return false;
                payType = TeLogMgr_1.PayTypeLog.jinbi;
                break;
            case TableRes.SeEnumSuperMarketeType.ZuanShi:
                if (price && !this.Player.decMoney(price, 'buyitem', marketId, num.toString()))
                    return false;
                payType = TeLogMgr_1.PayTypeLog.zuanshi;
                break;
            case TableRes.SeEnumSuperMarketeType.DaoJu:
                if (price && !this.Player.delItem(payId, price, SePlayerDef_1.DeAddDelItemReason.shopdel, mallId))
                    return false;
                payType = payId;
                break;
            case TableRes.SeEnumSuperMarketeType.MeiRiCiShu:
                if (price) {
                    if (!this.Player.dailyInfo.hasOwnProperty(payId))
                        return false;
                    if (this.Player.dailyInfo[payId] < price)
                        return false;
                    this.Player.dailyInfo[payId] = (this.Player.dailyInfo[payId] || 0) - price;
                    this._parent.updateDailyInfo();
                }
                payType = payId;
                break;
            case 5:
                // 看广告免费
                break;
            default: return false;
        }
        //这里区分下礼包类型
        this.add_shop_limit(mallId, num);
        // this.update_lgift_time(mallId, true);
        if (mallInfo && mallType == SePlayerDef_1.EnumMallType.Hero) {
            for (var i = 0; i < mallInfo.akItemID.length; i++) {
                var item = mallInfo.akItemID[i].split(',');
                this.Player.addHeroCard(item[0], (parseInt(item[1]) || 1) * num);
            }
            global.logMgr.market(this._parent, "card", payType, price, mallInfo.marketId, num, Math.floor(iDiscount * 100));
        }
        else if (mallInfo && mallType == SePlayerDef_1.EnumMallType.Equip) {
            for (var i = 0; i < mallInfo.akItemID.length; i++) {
                var item = mallInfo.akItemID[i].split(',');
                this.Player.addItem(item[0], (parseInt(item[1]) || 1) * num, SePlayerDef_1.DeAddDelItemReason.shopbuy, mallId);
            }
            global.logMgr.market(this._parent, "equip", payType, price, mallInfo.marketId, num, Math.floor(iDiscount * 100));
        }
        else {
            for (var i = 0; i < pkMarketRes.akItemID.length; i++) {
                var item = pkMarketRes.akItemID[i].split(',');
                this.Player.addItem(item[0], (parseInt(item[1]) || 1) * num, SePlayerDef_1.DeAddDelItemReason.shopbuy, mallId);
            }
            global.logMgr.market(this._parent, pkMarketRes.kID, payType, price, pkMarketRes.akItemID.join('_'), num, Math.floor(iDiscount * 100));
        }
        // 确仍是不是特惠来的
        this.finishLevelTehui(mallId);
        // 触发购买事件
        this._parent.taskAction(SeDefine_1.TaskAction.ShopBuy, mallId, num);
    }
    /**
     * 展示一个礼包中的所有内容
     * @param chanceId
     */
    get_random_pool(boxid) {
        let outs = [];
        let res_herobox = global.resMgr.HeroBoxZZYRes.getRes(boxid);
        if (!res_herobox) {
            res_herobox = global.resMgr.getResHeroBoxZZY(0, 0);
            if (!res_herobox)
                return global.netMgr.sendData({ cmd: 'randompool', boxid: boxid, pools: outs });
        }
        /**
         * 颜色对应的字符串 橙色 紫色 蓝色 绿色 白色
         */
        let cards_pool = this._rand_card_mod_1_init(this._parent.top_pvp_level, res_herobox.akCardPools, res_herobox.akEquitablePool);
        for (let i = 0; i < cards_pool.length; i++) {
            let r_pool = cards_pool[i];
            for (let j = 0; j < r_pool.pool.length; j++) {
                let r_chance = r_pool.pool[j];
                outs.push({
                    kid: r_chance.id,
                    type: r_chance.type,
                    num: r_chance.num,
                });
            }
        }
        return global.netMgr.sendData({ cmd: 'randompool', boxid: boxid, pools: outs }, this._parent.linkid);
    }
    _getFullItem(res) {
        let curr = Date.now();
        var result = {
            kID: res.kID,
            iOpenGrade: res.iOpenGrade,
            iCount: res.iCount,
            iOpenRank: res.iOpenRank,
            iOpenELO: res.iOpenELO,
            iOpenJJCRank: res.iOpenJJCRank,
            iStartTime: null,
            akItemID: [],
            iLasttime: res.iLasttime,
            iPos: res.iPos,
            akUISkin: res.akUISkin,
            iTab: res.iTab,
            eType: 0,
            kMark: '',
            kName: '',
            iOriginalCost: 0,
            iProperty: res.iProperty,
            eFreshType: res.eFreshType,
            kAdContent: res.kAdContent,
            kPreID: res.kPreID,
            iLabel: 0,
            iVipDisount: res.iVipDisount,
            iVipNeedLevel: res.iVipNeedLevel,
            kExtraValue: res.kExtraValue,
            iAllianceRank: res.iAllianceRank,
        };
        // 判断一下商品的开始和结束时间，增加一套开启和结束时间功能
        if (res.iIsOpen == 0) {
            if (!this._shopInfo.limitedShop.hasOwnProperty(res.kID)) {
                return null;
            }
            let limitTime = this._shopInfo.limitedShop[res.kID];
            if (curr > limitTime.begin + (limitTime.last * 60 * 60 * 1000)) {
                // 已经结束了的就不要了
                return null;
            }
            result.iStartTime = limitTime.begin;
            result.iLasttime = limitTime.last;
        }
        else {
            if (res.kStartTime != "") {
                result.iStartTime = (new Date(res.kStartTime)).getTime();
            }
        }
        if (res.iUseLoginTime && res.iUseLoginTime == 1) {
            if (this.baseInfo.guide <= 8) {
                //引导模式永远存在
                result.iStartTime = Date.now();
            }
            else {
                result.iStartTime = Math.max(result.iStartTime, this.baseInfo.createtime);
            }
        }
        // if (res.kForceFinishTime != "" && Date.now() > (new Date(res.kForceFinishTime)).getTime()) {
        //     return null;
        // }
        result.eType = res.eType;
        let idx = [TableRes.SeEnumShopMalleType.MeiRiJingXuan, TableRes.SeEnumShopMalleType.CangBaoGe].indexOf(res.eType);
        if (idx >= 0) {
            let target = this._get_modfiy_item(res.eType, res.iPos);
            if (target) {
                for (let key in target) {
                    if (key == 'iCount')
                        continue;
                    result[key] = target[key];
                }
                if (target.mallType == SePlayerDef_1.EnumMallType.Item) {
                    let pkSuperMarketRes = global.resMgr.SuperMarketRes.getRes(target.marketId);
                    if (pkSuperMarketRes) {
                        result.iDiscount = pkSuperMarketRes.iDiscount;
                        result.akItemID = pkSuperMarketRes.akItemID;
                        result.iPrice = pkSuperMarketRes.iPrice;
                        result.ePriceType = pkSuperMarketRes.eType;
                        result.payId = pkSuperMarketRes.kPayItem;
                        result.kMark = pkSuperMarketRes.kMark;
                        result.kName = pkSuperMarketRes.kName;
                        result.iOriginalCost = pkSuperMarketRes.iOriginalCost;
                    }
                }
                else if (target.mallType == SePlayerDef_1.EnumMallType.Hero) {
                    if (!target.akItemID || target.akItemID.length == 0) {
                        // 这里检查一下英雄版本升级后的容错 一般不会出现
                        target.akItemID = [[target.marketId, target['iNum'] || 1].join(',')];
                    }
                }
                else if (target.mallType == SePlayerDef_1.EnumMallType.Equip) {
                }
            }
        }
        else if (res.eItemType == TableRes.SeEnumShopMalleItemType.Recharge) {
            result.marketId = res.akContent && res.akContent[0];
            result.mallType = SePlayerDef_1.EnumMallType.Charge;
        }
        else if (res.eItemType == TableRes.SeEnumShopMalleItemType.Supermarket) {
            let target = global.resMgr.SuperMarketRes.getRes(res.akContent[0]);
            if (!target)
                return null;
            result.marketId = target.kID;
            result.mallType = (target.eItemType == TableRes.SeEnumSuperMarketeItemType.Item) ? SePlayerDef_1.EnumMallType.Item : SePlayerDef_1.EnumMallType.Hero;
            result.ePriceType = target.eType;
            result.iDiscount = 1;
            result.akItemID = target.akItemID;
            result.iPrice = target.iPrice;
            result.payId = target.kPayItem;
            result.kMark = target.kMark;
            result.kName = target.kName;
            result.iOriginalCost = target.iOriginalCost;
            result.iLabel = target.iLabel;
        }
        else if (res.eItemType == TableRes.SeEnumShopMalleItemType.TownItem) {
            result.marketId = res.akContent && res.akContent[0];
            // result.mallType = EnumMallType.Charge;
        }
        return result;
    }
    refreshDaily() {
        this._checkDaily(true);
    }
    _checkDaily(force = false) {
        let refreshTime = this._shopInfo.dailyUpdateTime;
        if (refreshTime == 0 || Date.now() - refreshTime >= 24 * 3600 * 1000 || force) {
            this._limit_clear(TableRes.SeEnumShopMalleType.CangBaoGe);
            this._set_modfiy_item(TableRes.SeEnumShopMalleType.CangBaoGe);
            this._limit_clear(TableRes.SeEnumShopMalleType.MeiRiJingXuan);
            this._set_modfiy_item(TableRes.SeEnumShopMalleType.MeiRiJingXuan);
            let d = new Date();
            d.setHours(0, 0, 0, 0);
            this._shopInfo.dailyUpdateTime = d.getTime();
            this.saveInfo("dailyUpdateTime");
            this._shopInfo.refreshList = [];
            this.saveInfo("refreshList");
            this._refreshCangBaoGeShop();
            this._refreshDailyShop();
        }
    }
    _limit_clear(type) {
        let shop_list = this._get_modfiy_item(type);
        if (shop_list) {
            for (var i = 0; i < shop_list.length; i++) {
                let sssr = shop_list[i];
                if (sssr) {
                    let res = global.resMgr.ShopMallRes.getRes(sssr.kID);
                    if (res && res.eFreshType == TableRes.SeEnumShopMalleFreshType.BuShuaXin)
                        continue;
                    this.reset_shop_limit(sssr.kID);
                }
            }
        }
    }
    _random_shop_mall_item(Mallid, excepts) {
        let out;
        let res = global.resMgr.ShopMallRes.getRes(Mallid);
        if (!res)
            return out;
        let parsed_conntents = [];
        for (let i = 0; i < res.akContent.length; i++) {
            let p_ones = res.akContent[i].split(',');
            let p_one;
            if (p_ones.length == 1) {
                p_one = {
                    v: p_ones[0].trimLeft(),
                    p: 1
                };
            }
            else if (p_ones.length >= 1) {
                p_one = {
                    v: p_ones[0].trimLeft(),
                    p: parseFloat(p_ones[1].trimLeft())
                };
            }
            else {
                continue;
            }
            if (isNaN(p_one.p)) {
                p_one.p = 0;
            }
            if (excepts.indexOf(p_one.v) >= 0)
                continue;
            parsed_conntents.push(p_one);
        }
        /**道具生成机制一共有好几种，分为随机和不随机的，提供给客户端的只有一个结果，所以akContent需要处理过的 */
        switch (res.eItemType) {
            /**来自于chance表的随机结果 */
            case TableRes.SeEnumShopMalleItemType.Chance: {
                let luck = parsed_conntents[0];
                if (res.akContent.length > 1) {
                    // 需要随机
                    luck = TeTool_1.arrayRandomT(parsed_conntents, 'p');
                }
                if (!luck)
                    break;
                let pool = global.resMgr.getChanceList(luck.v, this._parent.top_pvp_level);
                let s_pool = [];
                for (let i = 0; i < pool.length; i++) {
                    let r_unit = pool[i];
                    if (excepts.indexOf(r_unit.id) >= 0)
                        continue;
                    s_pool.push(r_unit);
                }
                let luckItem = TeTool_1.arrayRandomT(s_pool, 'weight');
                if (!luckItem)
                    break;
                let randomPrice = 1;
                if (res.aiValue.length >= 2) {
                    randomPrice = Math.random() * (res.aiValue[1] - res.aiValue[0]) + res.aiValue[0];
                }
                let per_price = 99999;
                //随机到的是item还是hero
                let itemType;
                //装备和卡牌价格不一样
                if (luckItem.type == TableRes.SeEnumchancekItemType.ZhuangBei) {
                    per_price = 15000;
                    itemType = SePlayerDef_1.EnumMallType.Equip;
                }
                else {
                    let card_res = global.resMgr.UnitRes.getRes(luckItem.id);
                    if (!card_res)
                        break;
                    per_price = card_res.iSoldPrice || 100000;
                    itemType = SePlayerDef_1.EnumMallType.Hero;
                }
                let count = Math.max(1, Math.floor(randomPrice / per_price));
                out = {
                    type: res.eItemType,
                    value: {
                        item: luckItem.id,
                        count: count,
                        price: count * per_price,
                        type: itemType,
                    }
                };
                break;
            }
            /**来自于recharge的表项目 */
            case TableRes.SeEnumShopMalleItemType.Recharge:
                out = {
                    type: res.eItemType,
                    value: res.akContent[0]
                };
                break;
            /**来自于supermarket的表项目 */
            case TableRes.SeEnumShopMalleItemType.Supermarket:
                // 几个里面随机一个 shop mall
                let luck = parsed_conntents[0].v;
                if (parsed_conntents.length > 1) {
                    luck = TeTool_1.arrayRandomT(parsed_conntents, 'p').v;
                }
                out = {
                    type: res.eItemType,
                    value: luck
                };
                break;
            /**来自于道具表的项目 */
            case TableRes.SeEnumShopMalleItemType.Unit: {
                let unitId = res.akContent[0];
                let card_res = global.resMgr.UnitRes.getRes(unitId);
                let per_price = card_res.iSoldPrice || 100000;
                out = {
                    type: res.eItemType,
                    value: {
                        item: res.akContent[0],
                        count: 1,
                        price: per_price
                    }
                };
                break;
            }
            /**默认项目 */
            default:
        }
        return out;
    }
    _modfiy_item_change(type, iPos, res, luckItem) {
        if (luckItem.type == TableRes.SeEnumShopMalleItemType.Unit || luckItem.type == TableRes.SeEnumShopMalleItemType.Chance) {
            // market
            let selItem = luckItem.value;
            let price = selItem.price;
            let paytype = TableRes.SeEnumSuperMarketeType.JinBi;
            if (type == TableRes.SeEnumShopMalleType.CangBaoGe) {
                price = Math.ceil(selItem.price / 10);
                paytype = TableRes.SeEnumSuperMarketeType.ZuanShi;
            }
            this._set_modfiy_item(type, iPos, {
                kID: res.kID,
                marketId: selItem.item,
                mallType: selItem.type == undefined ? SePlayerDef_1.EnumMallType.Hero : selItem.type,
                akItemID: [[selItem.item, selItem.count].join(',')],
                iPrice: price,
                ePriceType: paytype,
                iCount: res.iCount,
            });
        }
        else if (luckItem.type == TableRes.SeEnumShopMalleItemType.Supermarket) {
            let selItem = luckItem.value;
            this._set_modfiy_item(type, iPos, {
                kID: res.kID,
                marketId: selItem,
                mallType: SePlayerDef_1.EnumMallType.Item,
                iCount: res.iCount,
            });
        }
        else if (luckItem.type == TableRes.SeEnumShopMalleItemType.Recharge) {
            //    目前不会出现这种
        }
        return true;
    }
    _refreshCangBaoGeShop() {
        // 这里一共有6个格子，给玩家随机一下实际销售的道具
        let mallResHash = [];
        let maxPos = 0;
        let open_types = [];
        // 先判断一下开放级别等信息
        let types = global.resMgr.getShopMailByType(TableRes.SeEnumShopMalleType.CangBaoGe);
        for (let i = 0; i < types.length; i++) {
            let pkRes = types[i];
            if (!pkRes || this.Player.top_pvp_level < pkRes.iOpenGrade)
                continue;
            maxPos = Math.max(pkRes.iPos, maxPos);
            mallResHash.push(pkRes.kID);
            open_types[pkRes.iPos] = pkRes;
        }
        let use_heros = [];
        let changed = false;
        // 找到所有开放了的项目，然后随机道具
        for (let i = 0; i < open_types.length; i++) {
            let res = open_types[i];
            if (!res)
                continue;
            let selItem = this._random_shop_mall_item(res.kID, use_heros);
            if (!selItem)
                continue;
            if (typeof selItem == 'object') {
                use_heros.push(selItem.value['item']);
            }
            if (res && res.eFreshType != TableRes.SeEnumShopMalleFreshType.BuShuaXin) {
                this.reset_shop_limit(res.kID);
            }
            this._modfiy_item_change(TableRes.SeEnumShopMalleType.CangBaoGe, i, res, selItem);
            changed = true;
        }
        changed && this.saveInfo("modfiyItems");
    }
    _refreshDailyShop() {
        // 这里一共有6个格子，给玩家随机一下实际销售的道具
        let mallResHash = [];
        let maxPos = 0;
        let open_types = [];
        // 先判断一下开放级别等信息
        let types = global.resMgr.getShopMailByType(TableRes.SeEnumShopMalleType.MeiRiJingXuan);
        for (let i = 0; i < types.length; i++) {
            let pkRes = types[i];
            if (!pkRes || this.Player.top_pvp_level < pkRes.iOpenGrade)
                continue;
            maxPos = Math.max(pkRes.iPos, maxPos);
            mallResHash.push(pkRes.kID);
            open_types[pkRes.iPos] = pkRes;
        }
        let changed = false;
        let use_heros = [];
        // 找到所有开放了的项目，然后随机道具
        for (let i = 0; i < open_types.length; i++) {
            let res = open_types[i];
            if (!res)
                continue;
            let luckItem = this._random_shop_mall_item(res.kID, use_heros);
            if (!luckItem)
                continue;
            if (typeof luckItem == 'object') {
                use_heros.push(luckItem.value['item']);
            }
            this.reset_shop_limit(res.kID);
            this._modfiy_item_change(TableRes.SeEnumShopMalleType.MeiRiJingXuan, i, res, luckItem);
            changed = true;
        }
        changed && this.saveInfo("modfiyItems");
    }
    //---------------普通商城部分 supermarket -------------//
    _isShopResOpen(pkShopRes) {
        var succ = false;
        if (!pkShopRes)
            return succ;
        switch (pkShopRes.eOpen) {
            case TableRes.SeEnumSuperMarketeOpen.GuanBi:
                succ = false;
                break;
            case TableRes.SeEnumSuperMarketeOpen.KaiQi:
                succ = true;
                break;
            default: break;
        }
        if (succ && pkShopRes.iOpenGrade > 0 && pkShopRes.iOpenGrade != this.Player.top_pvp_level) {
            succ = false;
        }
        return succ;
    }
    queryShopItem(kItemID) {
        var out = [];
        if (kItemID == 'all') {
            var allSales = global.resMgr.SuperMarketRes.getAllRes();
            for (var key in allSales) {
                if (this._isShopResOpen(allSales[key])) {
                    out.push(allSales[key]);
                }
            }
        }
        else {
            var allTSales = global.resMgr.getSuperMarketSales(kItemID);
            for (var i = 0; i < allTSales.length; i++) {
                if (this._isShopResOpen(allTSales[i])) {
                    out.push(allTSales[i]);
                }
            }
        }
        global.netMgr.sendQueryItemRet(this.Player.linkid, kItemID, out);
    }
    openboxnotice(boxID, cardList) {
        for (var i = 0; i < cardList.length; i++) {
            var rcard = cardList[i];
            if (!rcard)
                continue;
            var pkPvpBox = global.resMgr.HeroBoxZZYRes.getRes(boxID);
            var pkRes = global.resMgr.UnitRes.getRes(rcard.kid);
            //橙卡或者橙色item需要记录
            if (pkRes) {
                if (pkRes.iColour == TableRes.SeEnumUnitiColour.Cheng) {
                    this._parent.sendAnnouncement(TableRes.SeEnumnoticetexteType.DeChengKa, { cardname: pkRes.kID, cardnumber: rcard.num, boxname: pkPvpBox.kID }, this._parent);
                }
                //盲盒通知，橙色紫色都需要
                if (pkPvpBox.eType == TableRes.SeEnumHeroBoxZZYeType.MangHe && (pkRes.iColour == TableRes.SeEnumUnitiColour.Cheng)) {
                    this.checkAndAddLuckyBoxRecord(pkRes.kID, rcard.num, { charid: this._parent.id, charname: this._parent.name, boxname: pkPvpBox.kName, itemname: pkRes.kName, itemnum: rcard.num });
                }
                //一元福袋需要通知
                if (pkPvpBox.eType == TableRes.SeEnumHeroBoxZZYeType.YiYuanFuDai) {
                    if (pkRes.iColour == TableRes.SeEnumUnitiColour.Zi) {
                        this._parent.sendAnnouncement2(TableRes.SeEnumnoticetexteType.ZiSeFuDaiJiangPin, { itemname: rcard.kid, boxname: pkPvpBox.kID, charname: this._parent.name, itemnumber: rcard.num }, this._parent);
                    }
                    else if (pkRes.iColour == TableRes.SeEnumUnitiColour.Cheng) {
                        this._parent.sendAnnouncement2(TableRes.SeEnumnoticetexteType.ChengSeFuDaiJiangPin, { itemname: rcard.kid, boxname: pkPvpBox.kID, charname: this._parent.name, itemnumber: rcard.num }, this._parent);
                    }
                }
            }
            else {
                //道具
                let _pkRes = global.resMgr.TownItemRes.getRes(rcard.kid);
                //盲盒通知，橙色紫色都需要
                if (pkPvpBox.eType == TableRes.SeEnumHeroBoxZZYeType.MangHe && (_pkRes.iColor == TableRes.SeEnumTownItemiColor.Cheng)) {
                    this.checkAndAddLuckyBoxRecord(_pkRes.kId, rcard.num, { charid: this._parent.id, charname: this._parent.name, boxname: pkPvpBox.kName, itemname: _pkRes.kName, itemnum: rcard.num });
                }
                //一元福袋需要通知
                if (_pkRes && pkPvpBox.eType == TableRes.SeEnumHeroBoxZZYeType.YiYuanFuDai) {
                    if (_pkRes.iColor == TableRes.SeEnumTownItemiColor.Zi) {
                        this._parent.sendAnnouncement2(TableRes.SeEnumnoticetexteType.ZiSeFuDaiJiangPin, { itemname: rcard.kid, boxname: pkPvpBox.kID, charname: this._parent.name, itemnumber: rcard.num }, this._parent);
                    }
                    else if (_pkRes.iColor == TableRes.SeEnumTownItemiColor.Cheng) {
                        this._parent.sendAnnouncement2(TableRes.SeEnumnoticetexteType.ChengSeFuDaiJiangPin, { itemname: rcard.kid, boxname: pkPvpBox.kID, charname: this._parent.name, itemnumber: rcard.num }, this._parent);
                    }
                }
                //开到橙装需要通知
                if (_pkRes && _pkRes.eTypeA == TableRes.SeEnumTownItemeTypeA.ZhuangBei && _pkRes.iColor == TableRes.SeEnumTownItemiColor.Cheng) {
                    this._parent.sendAnnouncement(TableRes.SeEnumnoticetexteType.DeChengZhuang, { equipname: _pkRes.kId, boxname: pkPvpBox.kID, charname: this._parent.name }, this._parent);
                }
            }
        }
    }
    checkAndAddLuckyBoxRecord(itemid, itemNum, obj) {
        var limit_res = global.resMgr.getNoticeText(TableRes.SeEnumnoticetexteType.MangHeDaJiang)[0].akContent;
        let limit = true;
        for (let i = 0; i < limit_res.length; i++) {
            if (limit_res[i].split(',')[0] == itemid && limit_res[i].split(',')[1] > itemNum) {
                limit = false;
                break;
            }
        }
        if (limit) {
            global.playerMgr.addLuckyBoxRecord(obj);
        }
    }
    _openCardColor(cardList) {
        var colorList = [];
        for (var i = 0; i < cardList.length; i++) {
            var rUnit = cardList[i];
            if (!rUnit)
                continue;
            var res_unit = global.resMgr.UnitRes.getRes(rUnit.kid);
            if (!res_unit)
                continue;
            if (!colorList[res_unit.iColour]) {
                colorList[res_unit.iColour] = 0;
            }
            colorList[res_unit.iColour] += rUnit.num;
        }
        this._parent.taskAction(SeDefine_1.TaskAction.OpenCard, colorList);
    }
    //---------------开箱子部分-------------//
    openBox(itmeid, level, type = 1) {
        // 这里取所有普通难度通关章节的最大index
        var res_herobox = global.resMgr.getResHeroBoxZZY(level, type);
        if (!res_herobox)
            return;
        var cardList = this._rand_cards_(res_herobox.kID);
        var out = this.Player.addHeroCardBatch(cardList);
        global.logMgr.pvpBoxLog(this._parent, 'box_hero', -1, type, level, cardList);
        if (this._parent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'ocard', { cards: cardList, changes: out['changes'], type: type, level: level, boxid: itmeid, count: 1 });
        this._parent.taskAction(SeDefine_1.TaskAction.OpenBox, level, type, 1);
        this._openCardColor(cardList);
        this.openboxnotice(res_herobox.kID, cardList);
    }
    _openBoxBatch_(itemid, count, boxId, cheat = false, isBox = true, notice = true) {
        count = Math.max(Math.min(count, 1000), 1);
        var res_herobox = global.resMgr.HeroBoxZZYRes.getRes(boxId);
        if (!res_herobox)
            return;
        var cardList = [];
        if (res_herobox.eType == TableRes.SeEnumHeroBoxZZYeType.TiQianKaiLiBao) {
            for (var mallId in this._parent.baseInfo.flipLotterys) {
                if (this._parent.baseInfo.flipLotterys[mallId].heroBoxZZYid == boxId && this._parent.baseInfo.flipLotterys[mallId].isBought == 0) {
                    for (var key in this._parent.baseInfo.flipLotterys[mallId].lotterys) {
                        let rt = {
                            kid: this._parent.baseInfo.flipLotterys[mallId].lotterys[key].item,
                            type: this._parent.baseInfo.flipLotterys[mallId].lotterys[key].type,
                            num: this._parent.baseInfo.flipLotterys[mallId].lotterys[key].num
                        };
                        cardList = cardList.concat(rt);
                    }
                    this._parent.baseInfo.flipLotterys[mallId].isBought = 1;
                }
            }
        }
        else {
            for (var i = 0; i < count; i++) {
                var rt = this._rand_cards_(res_herobox.kID);
                cardList = cardList.concat(rt);
            }
        }
        //特殊需求特殊处理，如果两者都有，不产出，只有一个，必产出另外一个
        if (res_herobox.eType == TableRes.SeEnumHeroBoxZZYeType.MangHe) {
            if (this._parent.itemCount('BF108') > 0 && this._parent.baseInfo.bosss['Z100']) {
                while (cardList[0].kid == 'A161' || cardList[0].kid == 'A162') {
                    cardList = this._rand_cards_(res_herobox.kID);
                }
            }
            else if (this._parent.itemCount('BF108') > 0) {
                if (boxId == 'MH002') {
                    cardList = [{
                            kid: 'ZCPF050',
                            type: TableRes.SeEnumchancekItemType.DaoJu,
                            num: 1
                        }];
                }
                else if (boxId == 'MH003') {
                    cardList = [{
                            kid: 'ZCPF050',
                            type: TableRes.SeEnumchancekItemType.DaoJu,
                            num: 1
                        }, {
                            kid: 'A163',
                            type: TableRes.SeEnumchancekItemType.DaoJu,
                            num: 10
                        }];
                }
            }
            else if (this._parent.baseInfo.bosss['Z100']) {
                if (boxId == 'MH002') {
                    cardList = [{
                            kid: 'BF108',
                            type: TableRes.SeEnumchancekItemType.DaoJu,
                            num: 1
                        }];
                }
                else if (boxId == 'MH003') {
                    cardList = [{
                            kid: 'BF108',
                            type: TableRes.SeEnumchancekItemType.DaoJu,
                            num: 1
                        }, {
                            kid: 'A163',
                            type: TableRes.SeEnumchancekItemType.DaoJu,
                            num: 10
                        }];
                }
            }
        }
        global.logMgr.pvpBoxLog(this._parent, 'box_hero', -1, res_herobox.eType, res_herobox.iLevel, cardList);
        var out = this.Player.addHeroCardBatch(cardList, notice, res_herobox.kID);
        if (cheat) {
            global.netMgr.sendCommonNotice(this.Player.linkid, 'box_test', `${count}次开卡测试的结果`, `${JSON.stringify(out['ids'])}`, true);
        }
        else {
            if (this._parent.bInitComplete && notice)
                global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'ocard', { cards: cardList, changes: out['changes'], type: res_herobox.eType, level: res_herobox.iLevel, boxid: itemid, count: count });
            if (isBox)
                this._parent.taskAction(SeDefine_1.TaskAction.OpenBox, res_herobox.iLevel, res_herobox.eType, count);
            this._openCardColor(cardList);
        }
        this.openboxnotice(res_herobox.kID, cardList);
        return out;
    }
    openBoxBatch(itmeid, count, level, type, cheat = false, isBox = true, notice = true) {
        count = Math.max(Math.min(count, 1000), 1);
        var res_herobox = global.resMgr.getResHeroBoxZZY(level, type);
        if (res_herobox)
            return this._openBoxBatch_(itmeid, count, res_herobox.kID, cheat, isBox, notice);
    }
    _randomCard(cards, exp) {
        var totalCard = this.Player.totalCard;
        var totalScore = this.Player.totalCardScore;
        var totalHero = this.Player.totalHero;
        var cardList = [];
        var totalP = 0;
        for (var i = 0; i < cards.length; i++) {
            var heroID = cards[i];
            if (exp.indexOf(heroID) >= 0)
                continue;
            var rkCard = this.Player.getHeroCard(heroID);
            var pkHeroCardRes = global.resMgr.UnitRes.getRes(heroID);
            if (!pkHeroCardRes)
                continue;
            var cardRandom = 0, tA = 0;
            if (!rkCard) {
                tA = Math.floor(totalScore / totalHero);
            }
            else {
                tA = (global.resMgr.cardSumCostToLevel(rkCard.iLevel - 1) + rkCard.iCount + 1) * (SePlayerDef_1.HeroBoxColorScore[pkHeroCardRes.iColour] || 1);
            }
            var cardRandom = 1 - tA / (tA + 2 * totalScore / totalHero);
            totalP += cardRandom;
            cardList.push({ kid: heroID, num: cardRandom });
        }
        var fR = totalP * Math.random();
        for (var i = 0; i < cardList.length; i++) {
            fR -= cardList[i].num;
            if (fR < 0) {
                return cardList[i].kid;
            }
        }
        return TeTool_1.arrayRandom(cards);
    }
    // /**
    //  * 开礼包
    //  * @param kGiftID 礼包的id
    //  */
    openChanceBox(itmeid, kGiftID, num, notice = true) {
        var pkRes = global.resMgr.HeroBoxZZYRes.getRes(kGiftID);
        if (!pkRes)
            return;
        return this._openBoxBatch_(itmeid, num, pkRes.kID, false, false, notice);
    }
    test_rand_cards(boxID, count) {
        var pkRes = global.resMgr.HeroBoxZZYRes.getRes(boxID);
        if (!pkRes)
            return;
        var outs = [];
        for (let i = 0; i < count; i++) {
            outs.push(...this._rand_cards_(pkRes.kID));
        }
        // console.log(outs);
        return outs;
    }
    randomUpTown(num) {
        // 获取小数部分
        var large = Math.floor(num);
        var small = num - large;
        if (Math.random() <= small) {
            large = large + 1;
        }
        return large;
    }
    getPoolNameUse(poolname) {
        return this.poolName2use[poolname] || 0;
    }
    addPoolNameUse(poolname) {
        this.poolName2use[poolname] = this.getPoolNameUse(poolname) + 1;
    }
    /**
     * 随机一个池子，从池子中随机一个卡牌
     * @param res_herobox
     * @param name_pools 池子中卡片的概率权重
     */
    _rand_card_mod_2_init(res_herobox, name_pools) {
        let random_pool = [];
        // 随机一下池子
        for (let i = 0; i < res_herobox.akCardPools.length; i++) {
            let r_pool = res_herobox.akCardPools[i];
            if (r_pool.imaxuse > 0 && r_pool.imaxuse <= this.getPoolNameUse(r_pool.name)) {
                continue;
            }
            random_pool.push(r_pool);
        }
        if (random_pool.length == 0) {
            return null;
        }
        let luck_boy = this._rand_pool_mod_2_ex(res_herobox, random_pool);
        if (!luck_boy) {
            luck_boy = TeTool_1.arrayRandomT(random_pool, "iweight");
        }
        // 记录下池子使用次数
        this.addPoolNameUse(luck_boy.name);
        // 从池子里面取出一个
        let sel_pool = null;
        for (let i = 0; i < name_pools.length; i++) {
            let r_name_pool = name_pools[i];
            if (r_name_pool.pool_name == luck_boy.name) {
                sel_pool = r_name_pool;
                break;
            }
        }
        /**随机一个卡牌 */
        if (sel_pool && sel_pool.pool.length > 0) {
            let remove = true;
            if (res_herobox.iReturnBack == 1)
                remove = false;
            let luck = TeTool_1.arrayRandomT(sel_pool.pool, 'weight', remove);
            sel_pool.s_pool.push(luck);
            return luck;
        }
        return null;
    }
    _rand_pool_mod_2_ex(res_herobox, random_pool, select_boy) {
        let n_key;
        switch (res_herobox.eType) {
            case TableRes.SeEnumHeroBoxZZYeType.SaiJiXianDingKaBao:
                n_key = 'n_seasonCard';
                break;
            case TableRes.SeEnumHeroBoxZZYeType.QuanWuJiangKaBao:
                n_key = 'n_allwuCard';
                break;
            case TableRes.SeEnumHeroBoxZZYeType.ZhangLiaoXianDingKaBao:
                n_key = 'n_aloneheroCard';
                break;
            // case TableRes.SeEnumHeroBoxZZYeType.TiQianKaiLiBao:
            //     n_key = 'n_tiqiankaiheroCard';
            //     break;
            default:
                break;
        }
        if (!n_key) {
            return;
        }
        //总权重
        let total = 0;
        for (let i in res_herobox.akCardPools) {
            total = total + res_herobox.akCardPools[i].iweight;
        }
        //取出玩家身上的N序列号
        if (!this._shopInfo[n_key] || Object.keys(this._shopInfo[n_key]).length != res_herobox.akCardPools.length) {
            //策划改了配置表, 玩家身上的N序列对不上了, 那就重置
            this._shopInfo[n_key] = {};
        }
        let n_map = this._shopInfo[n_key];
        //初始化的时候需要随出初始值
        if (Object.keys(n_map).length == 0) {
            for (let i in res_herobox.akCardPools) {
                let _herobox = res_herobox.akCardPools[i];
                let _rate = _herobox.iweight / total;
                n_map[_herobox.name] = (n_map[_herobox.name] || 0) + 1 / _rate + TeTool_1.TeMath.get_gaussian_distribution_table_reverse(Math.random()) / _rate / 3;
            }
        }
        //取出
        let luck_boy = random_pool[0];
        //如果有默认的池子,那么就不走取权重最小的池子逻辑
        if (!select_boy) {
            let random_pool_map = {};
            for (let i in random_pool) {
                random_pool_map[random_pool[i].name] = i;
            }
            for (let name in n_map) {
                //取出最小的N值, 并且存在于name_pools
                if (n_map[luck_boy.name] > n_map[name] && random_pool[random_pool_map[name]]) {
                    luck_boy = random_pool[random_pool_map[name]];
                }
            }
            //阀值保护
            if (n_map[luck_boy.name] > 100000000) {
                for (let name in n_map) {
                    n_map[name] = n_map[name] - n_map[luck_boy.name];
                }
            }
        }
        else {
            luck_boy = select_boy;
        }
        //重新赋值
        let __rate = luck_boy.iweight / total;
        n_map[luck_boy.name] = (n_map[luck_boy.name] || 0) + 1 / __rate + TeTool_1.TeMath.get_gaussian_distribution_table_reverse(Math.random()) / __rate / 3;
        //保存
        this.saveInfo(n_key);
        return luck_boy;
    }
    /**
     * 抽卡流程 2017年10月14日 动工
     */
    _rand_cards_(chanceId, rand_level = this.Player.top_pvp_level) {
        //第一次抽赛季限定卡包时, 需要替换成新手卡包
        if (chanceId == 'CK6' && (!this._shopInfo['n_aloneheroCard'] || Object.keys(this._shopInfo['n_aloneheroCard']).length == 0)) {
            this._shopInfo['n_aloneheroCard'] = { test: 'old' };
            this.saveInfo('n_aloneheroCard');
            chanceId = 'CK5';
        }
        this.poolName2use = {};
        let outs = [];
        let res_herobox = global.resMgr.HeroBoxZZYRes.getRes(chanceId);
        if (!res_herobox) {
            res_herobox = global.resMgr.getResHeroBoxZZY(0, 0);
            if (!res_herobox)
                return [];
        }
        // 首先确定可以抽几张牌
        let less_card_count = res_herobox.iTypeCount;
        // 一、算抽到的金币
        let gold = this._rand_gold(res_herobox.iGoldMin, res_herobox.iGoldMax);
        let gold_itemIDs = global.resMgr.getItemTypeBySubType(TableRes.SeEnumTownItemeTypeA.JinYuanBao, 1);
        if (gold && gold_itemIDs.length > 0) {
            less_card_count--;
            outs.push({
                kid: gold_itemIDs[0],
                type: TableRes.SeEnumchancekItemType.DaoJu,
                num: gold,
                extnum: 1
            });
        }
        /**
         * 颜色对应的字符串 橙色 紫色 蓝色 绿色 白色
         */
        if (!res_herobox.akCardPools) {
            console.log("res_herobox.akCardPools undefined:" + res_herobox.kID);
        }
        let cards_pool = this._rand_card_mod_1_init(this._parent.top_pvp_level, res_herobox.akCardPools, res_herobox.akEquitablePool);
        let baodi_count = 0;
        let baodi_type_count = 0;
        less_card_count = Math.min(less_card_count, res_herobox.iCardCount);
        // 三、算保底收入
        // 从高级颜色到低级颜色扫一遍
        let luck_cards = [];
        for (let i = 0; i < res_herobox.akCardPools.length; i++) {
            let rPool = res_herobox.akCardPools[i];
            let color_count = rPool.imin;
            if (!color_count)
                continue;
            if (rPool.imaxuse > 0 && rPool.imaxuse <= this.getPoolNameUse(rPool.name))
                continue;
            // 刷新概率
            this._rand_pool_mod_2_ex(res_herobox, res_herobox.akCardPools, rPool);
            this.addPoolNameUse(rPool.name);
            // 如果有保底的就先出一个保底的卡
            let r_sel_pool = cards_pool[i];
            // 出卡
            let result = this._rand_card_result(r_sel_pool.weight, r_sel_pool.pool);
            r_sel_pool.pool = result.pool;
            r_sel_pool.s_pool.push(result.luck);
            r_sel_pool.weight = result.total_weight;
            baodi_count += color_count;
            luck_cards.push(result.luck);
            less_card_count--;
            baodi_type_count++;
        }
        /**
         * 剩余的卡牌池子
         */
        // let left_cards_pool = this._rand_card_mod_2_init(res_herobox, res_herobox.akCardPools, cards_pool);
        // let left_all = left_cards_pool[res_herobox.akCardPools.length];
        // while (less_card_count > 0 && left_all.total_weight > 0) {
        //     let result = this._rand_card_result(left_all.total_weight, left_all.pool);
        //     left_all.pool = result.pool;
        //     left_all.total_weight = result.total_weight;
        //     less_card_count--;
        //     luck_cards.push(result.luck);
        // }
        /**
         * 剩余的卡牌池子
         */
        while (less_card_count > 0) {
            let result = this._rand_card_mod_2_init(res_herobox, cards_pool);
            less_card_count--;
            if (result) {
                luck_cards.push(result);
            }
        }
        // 第四步
        let luck_cards_weight = this._rand_cards_count_init(rand_level, res_herobox, luck_cards, res_herobox.akCardPools);
        // 第五步生成卡牌数量
        //n=当前参与随机卡牌总数= 卡牌总数-武将种类-(保底卡牌总数-保底种类)
        let r_n = res_herobox.iCardCount - luck_cards.length - (baodi_count - baodi_type_count);
        let out_heros = new TeTool_1.HashMap();
        r_n = Math.max(r_n, 0);
        let left_n = r_n;
        for (let i = 0; i < luck_cards_weight.length; i++) {
            let r_hero = luck_cards_weight[i];
            let count = left_n;
            if (count < 0)
                continue;
            if (i != luck_cards_weight.length - 1) {
                count = r_n * r_hero.weight + Math.sqrt(r_n) * r_hero.weight * TeTool_1.TeMath.get_gaussian_distribution_table_reverse(Math.random());
            }
            let rPool = res_herobox.akCardPools[r_hero.ipool];
            let color_count = rPool.imin || 0;
            count = Math.min(Math.max(this.randomUpTown(count), 0), left_n);
            let color_mx = rPool.imax || 0;
            if (color_mx > 0) {
                count = Math.min(color_mx - 1, count);
            }
            if (!color_count) {
                outs.push({ kid: r_hero.id, num: (count + 1), type: r_hero.type, extnum: r_hero.num });
            }
            else {
                out_heros.add(r_hero.ipool, { id: r_hero.id, count: count + 1, type: r_hero.type, num: r_hero.num, orgweight: r_hero.orgweight, whithout_hand: r_hero.whithout_hand });
            }
            left_n -= count;
        }
        // 第六步
        // 最后将剩余保底的卡牌数量卡牌数量按照武将权重平均分给武将, 将余数部分分给权重最大的武将, 并加上第一次随机品质时的1张
        for (let i = 0; i < res_herobox.akCardPools.length; i++) {
            let i_r_heros = out_heros.get(i);
            let rPool = res_herobox.akCardPools[i];
            if (!i_r_heros || i_r_heros.length == 0 || !rPool)
                continue;
            let j_color_count = rPool.imin || 0;
            let color_mx = rPool.imax || 0;
            let j_color_mx = color_mx - j_color_count;
            j_color_count = j_color_count - 1;
            if (i_r_heros.length == 1) {
                outs.push({ kid: i_r_heros[0].id, num: (i_r_heros[0].count + j_color_count), type: i_r_heros[0].type, extnum: i_r_heros[0].num });
            }
            else {
                let j_total = 0;
                for (let j = 0; j < i_r_heros.length; j++) {
                    let j_r_hero = i_r_heros[j];
                    // if (!j_r_hero) {
                    //     console.log('err');
                    //     continue;
                    // }
                    j_total += this._get_hero_base_weight(j_r_hero.id, j_r_hero.orgweight, j_r_hero.whithout_hand);
                }
                let j_total_count = j_color_count;
                if (j_color_count == 0) {
                    j_total_count = 0;
                }
                let j_total_left = j_total_count;
                for (let j = 0; j < i_r_heros.length; j++) {
                    let j_r_hero = i_r_heros[j];
                    let out_hero_count = Math.round(j_total_count * this._get_hero_base_weight(j_r_hero.id, j_r_hero.orgweight, j_r_hero.whithout_hand) / j_total);
                    out_hero_count = Math.min(out_hero_count, j_total_left);
                    if (j_color_mx > 0) {
                        // 限制大的了 那么就不给额外的了
                        out_hero_count = Math.min(out_hero_count, j_color_mx - 1);
                    }
                    j_total_left -= out_hero_count;
                    outs.push({ kid: i_r_heros[j].id, num: i_r_heros[j].count + out_hero_count, type: i_r_heros[j].type, extnum: i_r_heros[j].num });
                }
                if (j_total_left) {
                    outs[outs.length - 1].num += j_total_left;
                }
            }
        }
        let realOuts = [];
        for (let i = 0; i < outs.length; i++) {
            let rout = outs[i];
            //所有的礼包开出的结果都不叠加
            // if(res_herobox.iReturnBack){
            //     remove_duplicatev2({kid: rout.kid,type: rout.type,num: rout.num * rout.extnum}, realOuts, 'kid', 'num');
            // }
            // else{
            realOuts.push({ kid: rout.kid, type: rout.type, num: rout.num * rout.extnum });
            // }
        }
        return realOuts;
    }
    /**
     * 随机生成金钱数量 2017年10月14日 动工
     * @param base_gold 基础金币
     * @return 随机的金额
     */
    _rand_gold(base_gold_min, base_gold_max) {
        if (base_gold_max == 0)
            return 0;
        var diff = base_gold_max - base_gold_min;
        return Math.round(Math.random() * diff) + base_gold_min;
    }
    /**
     * 初始化保底卡牌随机抽取的数据
     * @param ilevel
     * @param mxColor
     */
    _rand_card_mod_1_init(ilevel, akCardPools, akEquitablePool) {
        var name_pools = [];
        for (var i = 0; i < akCardPools.length; i++) {
            name_pools.push(this._rand_card_color_init(i, ilevel, akCardPools[i], akEquitablePool));
        }
        return name_pools;
    }
    /**
     * 随机卡牌
     * @param icolor
     * @param ilevel
     */
    _rand_card_color_init(ipool, ilevel, poolcof, akEquitablePool) {
        let pool_name = poolcof.name;
        akEquitablePool = akEquitablePool || [];
        let random_card = akEquitablePool.indexOf(poolcof.name) >= 0;
        var color_pool = global.resMgr.getChanceList(poolcof.name, ilevel, random_card);
        if (!color_pool || color_pool.length == 0)
            return { weight: 0, pool: [], s_pool: [], pool_name: pool_name };
        var total_weight = 0;
        var hero_weights = [];
        for (var i = 0; i < color_pool.length; i++) {
            var r = color_pool[i];
            if (!r)
                continue;
            // var pkHeroCardRes = global.resMgr.UnitRes.getRes(r.id);
            // if (!pkHeroCardRes) continue;
            var weight = this._get_hero_base_weight(r.id, r.weight, random_card);
            hero_weights.push({ id: r.id, weight: weight, num: r.num, type: r.type, orgweight: r.weight, ipool: ipool, whithout_hand: r.whithout_hand });
            total_weight += weight;
        }
        return { weight: total_weight, pool: hero_weights, s_pool: [], pool_name: pool_name };
    }
    /**
     * 初始化池子里卡牌权重
     * 需要考虑每个颜色的权重
     */
    _random_luck_pool_unit(res, rPool, name_pools) {
        var out = {
            total_weight: 0,
            pool: []
        };
        ;
        let sel_pool = null;
        for (let i = 0; i < name_pools.length; i++) {
            let r_name_pool = name_pools[i];
            if (r_name_pool.pool_name == rPool.name) {
                sel_pool = r_name_pool;
                break;
            }
        }
        if (sel_pool && sel_pool.pool.length > 0) {
            let color_out = [];
            let color_weight_rate = rPool.iweight || 0;
            let color_total_weight = 0;
            for (let j = 0; j < sel_pool.pool.length; j++) {
                let ssel_one = sel_pool.pool[j];
                // 普通武将概率 P'(b)=武将品质权重/所有品质权重和*武将权重/当前品质全武将权重和
                let ssel_weight = color_weight_rate * ssel_one.weight;
                color_total_weight += ssel_weight;
                color_out.push({ id: ssel_one.id, weight: ssel_weight, type: ssel_one.type, num: ssel_one.num, orgweight: ssel_one.orgweight, ipool: ssel_one.ipool, whithout_hand: ssel_one.whithout_hand });
            }
            out = {
                total_weight: color_total_weight,
                pool: color_out
            };
        }
        return out;
    }
    /**
     * 依据权重和总权重 随机武将
     * @param total_weight
     * @param hero_weights
     */
    _rand_card_result(total_weight, hero_weights) {
        var luck_boy = total_weight * Math.random();
        var luck_hero;
        for (var i = 0; i < hero_weights.length; i++) {
            luck_boy -= hero_weights[i].weight;
            if (luck_boy < 0) {
                luck_hero = hero_weights[i];
                total_weight -= luck_hero.weight;
                hero_weights.splice(i, 1);
                break;
            }
        }
        return { luck: luck_hero, total_weight: total_weight, pool: hero_weights };
    }
    _get_hero_base_weight(heroid, extRate, random_card) {
        var tA = 1;
        if (!random_card) {
            var rkCard = this._parent.getHeroCard(heroid);
            if (rkCard && rkCard.iCount > 2) {
                tA = global.resMgr.cardSumCostToLevel(rkCard.iLevel - 1) + rkCard.iCount + 1;
                tA = Math.log(tA) / Math.log(2);
            }
            else if (!rkCard || rkCard.iCount == 0) {
                return 500;
            }
        }
        var weight = 10000 / tA;
        return weight * extRate;
    }
    _cards_weight_sort(a, b) {
        if (a.ipool < b.ipool) {
            return 1;
        }
        if (a.ipool > b.ipool) {
            return -1;
        }
        if (a.weight > b.weight) {
            return 1;
        }
        if (a.weight < b.weight) {
            return -1;
        }
        return a.id > b.id ? 1 : (a.id == b.id ? 0 : -1);
    }
    /**
     * 初始化卡组数据
     */
    _rand_cards_count_init(ilevel, res, lucky_boys, akCardPools) {
        /**
         * 所有武将品质权重和
         */
        var total_all_color_weight = 0;
        for (var i = 0; i < akCardPools.length; i++) {
            total_all_color_weight += akCardPools[i].iweight || 0;
        }
        var hero_weights = [];
        var color_count = [];
        var color_weights = [];
        // 初始化基础权重和收集颜色
        for (var i = 0; i < lucky_boys.length; i++) {
            var rLuckyHero = lucky_boys[i];
            if (!rLuckyHero)
                continue;
            // var pkHeroCardRes = global.resMgr.UnitRes.getRes(rLuckyHero.id);
            // if (!pkHeroCardRes) continue;
            var weight = this._get_hero_base_weight(rLuckyHero.id, rLuckyHero.orgweight, rLuckyHero.whithout_hand);
            color_count[rLuckyHero.ipool] = (color_count[rLuckyHero.ipool] || 0) + 1;
            color_weights[rLuckyHero.ipool] = (color_weights[rLuckyHero.ipool] || 0) + weight;
            hero_weights.push({ id: rLuckyHero.id, weight: weight, type: rLuckyHero.type, ipool: rLuckyHero.ipool, num: rLuckyHero.num, orgweight: rLuckyHero.orgweight, whithout_hand: rLuckyHero.whithout_hand });
        }
        // 把基础权重转换成数量概率
        for (var i = 0; i < hero_weights.length; i++) {
            var rhero = hero_weights[i];
            if (!rhero)
                continue;
            // P(a)=武将品质权重/所有品质权重*武将权重/当前品质所有出现的武将权重和
            var rPool = akCardPools[rhero.ipool];
            if (!rPool)
                continue;
            var pro = rPool.iweight / total_all_color_weight * rhero.weight / color_weights[rhero.ipool];
            rhero.weight = pro;
        }
        hero_weights.sort(this._cards_weight_sort);
        return hero_weights;
    }
    saveInfo(savekey = null) {
        if (savekey) {
            if (this._shopInfo.hasOwnProperty(savekey)) {
                this.Player.shopDb.save(savekey, this._shopInfo[savekey]);
            }
        }
        else {
            for (var key in this._shopInfo) {
                var rkValue = this._shopInfo[key];
                if (rkValue) {
                    this.Player.shopDb.save(key, this._shopInfo[key]);
                }
                else {
                    this.Player.shopDb.del(key);
                }
            }
        }
    }
    //#################### 不回收奖池类实现 ###########################//
    /**
     * 随机卡牌
     * @param icolor
     * @param ilevel
     */
    _rand_card_init(ipool, ilevel, poolname, weight, shangjinUsed) {
        var color_pool = global.resMgr.getChanceList(poolname, ilevel, true);
        if (!color_pool || color_pool.length == 0)
            return { weight: 0, pool: [], s_pool: [], pool_name: poolname };
        var total_weight = 0;
        weight = weight * 100;
        var hero_weights = [];
        for (var i = 0; i < color_pool.length; i++) {
            var r = color_pool[i];
            if (!r)
                continue;
            //移除赏金赛已经拥有的卡牌
            if (shangjinUsed) {
                if (this._parent.shangjinHeroCards.indexOf(r.id) != -1) {
                    continue;
                }
            }
            // var pkHeroCardRes = global.resMgr.UnitRes.getRes(r.id);
            // if (!pkHeroCardRes) continue;
            // var weight = this._get_hero_base_weight(r.id, r.weight, true);
            hero_weights.push({ id: r.id, weight: weight, num: r.num, type: r.type, orgweight: r.weight, ipool: ipool, whithout_hand: r.whithout_hand });
            total_weight += weight;
        }
        return { weight: total_weight, pool: hero_weights, s_pool: [], pool_name: poolname };
    }
    //登录的时候初始化一下
    poolInit() {
        let chances = global.resMgr.HeroBoxEggRes.getAllRes();
        for (let kid in chances) {
            if (!this._parent.baseInfo.chancePools[chances[kid].kID]) {
                this.poolFlush(chances[kid].kID);
            }
        }
        //删除已经不在配置表里的不回收奖池
        for (let chanceId in this._parent.baseInfo.chancePools) {
            if (!chances["k" + chanceId]) {
                this._parent.baseInfo.chancePools[chanceId] = null;
            }
        }
    }
    shangjinHeroBoxInit() {
        let chances = global.resMgr.HeroBoxZZYRes.getAllRes();
        for (let kid in chances) {
            if (chances[kid].eType == TableRes.SeEnumHeroBoxZZYeType.BuZhongFuBaoXiang) {
                this.shangjinPoolFlush(chances[kid]);
            }
        }
    }
    shangjinPoolFlush(chance) {
        let chanceId = chance.kID;
        let pool = {
            weight: 0,
            pool: [],
            s_pool: []
        };
        for (var i = 0; i < chance.akPoolName.length; i++) {
            let sel_pool = this._rand_card_init(i, 99, chance.akPoolName[i], chance.aiPoolWeight[i], true);
            pool.weight += sel_pool.weight;
            pool.pool = pool.pool.concat(sel_pool.pool);
            pool.s_pool = pool.s_pool.concat(sel_pool.s_pool);
        }
        if (!this._parent.baseInfo.shangjinHeroPool[chanceId])
            this._parent.baseInfo.shangjinHeroPool[chanceId] = {
                weight: 0,
                pool: [],
                s_pool: []
            };
        this._parent.baseInfo.shangjinHeroPool[chanceId] = pool;
        this._parent.saveBaseInfo('shangjinHeroPool');
        // global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'shangjinHeroPool', chanceId, this._parent.baseInfo.shangjinHeroPool[chanceId]);
        global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'poolLength', pool.pool.length, chanceId);
    }
    activityFlush(activityId) {
        this._shopInfo.activityHash[activityId] = {};
        global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'activity', activityId, this._shopInfo.activityHash[activityId]);
    }
    poolFlush(chanceId) {
        let chanceRes = global.resMgr.HeroBoxEggRes.getRes(chanceId);
        let retPools1 = [];
        let retPools2 = [];
        for (var i = 0; i < chanceRes.akPoolName.length; i++) {
            let sel_pool = this._rand_card_init(i, this.Player.top_pvp_level, chanceRes.akPoolName[i], 1, false);
            let luck = TeTool_1.arrayRandomT(sel_pool.pool, 'weight', true);
            if (luck) {
                retPools1.push({ tid: luck.id, num: luck.num }); //, poolid: i
                retPools2.push({ tid: luck.id, num: luck.num, weight: chanceRes.aiPoolWeight[i], limit: chanceRes.aiTurnLimit[i], poolid: i });
            }
        }
        if (!this._parent.baseInfo.chancePools[chanceId])
            this._parent.baseInfo.chancePools[chanceId] = {};
        this._parent.baseInfo.chancePools[chanceId] = { total: retPools1, cur: retPools2 };
        this._parent.saveBaseInfo('chancePools');
        global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'chancePools', chanceId, this._parent.baseInfo.chancePools[chanceId]);
    }
    poolRandom(chanceId) {
        let Pools = this._parent.baseInfo.chancePools[chanceId];
        if (!Pools) {
            return;
        }
        if (Pools['cur'].length == 0) {
            return;
        }
        let count = Pools['total'].length - Pools['cur'].length + 1;
        let curPool = Pools['cur'];
        //copy
        let retPool = SeDefine_1.func_copy(curPool);
        let item;
        while (retPool.length > 0) {
            item = TeTool_1.arrayRandomT(retPool, 'weight', true);
            if (item.limit <= count)
                break;
        }
        for (let i = 0; i < curPool.length; i++) {
            if (curPool[i].poolid == item.poolid) {
                curPool.splice(i, 1);
                break;
            }
        }
        this._parent.saveBaseInfo('chancePools');
        global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'chancePools', chanceId, this._parent.baseInfo.chancePools[chanceId]);
        //不回收奖池需要通知橙卡
        let _pkRes = global.resMgr.TownItemRes.getRes(item.tid);
        //橙卡需要通知
        if (_pkRes) {
            if (_pkRes.iColor == TableRes.SeEnumTownItemiColor.Cheng) {
                this._parent.sendAnnouncement(TableRes.SeEnumnoticetexteType.ChengSeBuHuiShouJiangChiJiangPin, { eggname: chanceId, charname: this._parent.name, itemname: item.tid }, this._parent);
            }
        }
        return { tid: item.tid, num: item.num };
    }
    /////############################ end ##############################////////
    // 特惠相关的处理，记录等级特惠显示的条目等信息
    // 检查升级特惠信息
    checkLevelTehui(level = 0) {
        var hasNoBuy = false;
        var nTime = Date.now();
        var pvpInfos = this.dbInfo.get('leveltehui');
        if (pvpInfos) {
            var lft = [];
            for (var i = 0; i < pvpInfos.length; i++) {
                // 检查一下是否过期
                var ro = pvpInfos[i];
                if (ro.finishtime > nTime || ro.hasbuy) {
                    lft.push(ro);
                }
                else if (ro.level == level) {
                    hasNoBuy = true;
                }
            }
            this.dbInfo.save('leveltehui', lft);
            pvpInfos = lft;
        }
        return hasNoBuy;
    }
    checkActivity() {
        if (this._shopInfo.activityHash) {
            for (var activityId in this._shopInfo.activityHash) {
                var pkActivityRes = global.resMgr.activityRes.getRes(activityId);
                if (!pkActivityRes || (pkActivityRes.kEndTime && Date.parse(pkActivityRes.kEndTime) < Date.now())) {
                    delete this._shopInfo.activityHash[activityId];
                }
            }
            this.saveInfo("activityHash");
        }
    }
    checkSeasonActivity() {
        // 清理赛季结算的时候触发
        let change = false;
        for (var activityId in this._shopInfo.activityHash) {
            var pkActivityRes = global.resMgr.activityRes.getRes(activityId);
            if (!pkActivityRes)
                continue;
            if ((pkActivityRes.iProperty & TableRes.SeEnumActivityiProperty.SaiJiZhongZhi) == TableRes.SeEnumActivityiProperty.SaiJiZhongZhi) {
                delete this._shopInfo.activityHash[activityId];
                change = true;
            }
        }
        if (change) {
            this.saveInfo("activityHash");
        }
    }
    finishLevelTehui(Mailid) {
        var bfind = false;
        var pvpInfos = (this.dbInfo.get('leveltehui') || []);
        var pkMailRes = global.resMgr.ShopMallRes.getRes(Mailid);
        if (pkMailRes.eType == TableRes.SeEnumShopMalleType.TeHuiHuoDong) {
            pvpInfos.push({
                kID: Mailid,
                level: 0,
                starttime: 0,
                finishtime: Date.now(),
                hasbuy: true,
            });
            bfind = true;
        }
        else {
            for (var i = 0; i < pvpInfos.length; i++) {
                var rr_o = pvpInfos[i];
                if (rr_o && rr_o.kID == Mailid && !rr_o.hasbuy) {
                    rr_o.hasbuy = true;
                    rr_o.finishtime = Date.now();
                    bfind = true;
                    break;
                }
            }
        }
        if (bfind) {
            this.dbInfo.save('leveltehui', pvpInfos);
            this.updateTeHuiInfo2Player();
        }
    }
    // 玩家升级到一个等级的时候开放的
    addLevelTehui(level) {
        if (this.checkLevelTehui(level)) {
            // 如果有了特惠了 就不添加了
            return;
        }
        var res = global.resMgr.ShopMallRes.getAllRes();
        var list = [];
        for (var kid in res) {
            var pkShopMallRes = res[kid];
            !list[pkShopMallRes.eType] && (list[pkShopMallRes.eType] = []);
            list[pkShopMallRes.eType].push(pkShopMallRes);
        }
        var s_list = list[TableRes.SeEnumShopMalleType.JinJiTeHui];
        if (s_list) {
            var level_res;
            for (var i = 0; i < s_list.length; i++) {
                var r_o = s_list[i];
                if (r_o && r_o.iOpenRank == level) {
                    level_res = r_o;
                    break;
                }
            }
            if (level_res) {
                var leveltehui = (this.dbInfo.get('leveltehui') || []);
                for (var i = 0; i < leveltehui.length; i++) {
                    var rr_o = leveltehui[i];
                    if (rr_o && rr_o.level == level) {
                        level_res = null;
                    }
                    // 过期掉其它特惠
                    // if (rr_o && rr_o.level < level && !rr_o.hasbuy) {
                    //     rr_o.finishtime = Date.now() - 10 * 1000;
                    // }
                }
                if (level_res) {
                    leveltehui.push({
                        kID: level_res.kID,
                        level: level,
                        starttime: Date.now(),
                        finishtime: Date.now() + level_res.iLasttime * 60 * 60 * 1000,
                        hasbuy: false,
                    });
                }
                this.dbInfo.save('leveltehui', leveltehui);
                if (level_res)
                    this.updateTeHuiInfo2Player();
            }
        }
    }
    updateTeHuiInfo2Player() {
        if (this._parent.loadComplete) {
            var leveltehui = (this.dbInfo.get('leveltehui') || []);
            global.netMgr.sendData({
                cmd: "leveltehui",
                infos: leveltehui
            }, this._parent.linkid);
        }
    }
    exchange(activityId, exchangeId, extInfo, excount) {
        var pkExchangeRes = global.resMgr.exchangeRes.getRes(exchangeId);
        if (!pkExchangeRes)
            return;
        var activityLog = { kActivityId: activityId, kExchangeId: exchangeId, buyCount: 0, extInfo: extInfo };
        if (activityId != 'exchange') {
            // 不判断活动的就不需要检查开启时间和数量了
            var pkActivityRes = global.resMgr.activityRes.getRes(activityId);
            if (!pkActivityRes)
                return;
            if (pkActivityRes.kStartTime && Date.parse(pkActivityRes.kStartTime) > Date.now())
                return;
            if (pkActivityRes.kEndTime && Date.parse(pkActivityRes.kEndTime) < Date.now())
                return;
            if (this._shopInfo.activityHash && this._shopInfo.activityHash[activityId] && this._shopInfo.activityHash[activityId][exchangeId]) {
                activityLog = this._shopInfo.activityHash[activityId][exchangeId];
            }
            var remindCount = 1;
            for (var i = 0; i < pkActivityRes.akExChanges.length; i++) {
                var arr = pkActivityRes.akExChanges[i].split(",");
                var eId = arr[0];
                var limitCount = parseInt(arr[1] || "1");
                if (eId == exchangeId) {
                    if (limitCount >= 0)
                        remindCount = limitCount - activityLog.buyCount;
                    break;
                }
            }
            if (remindCount < excount)
                return;
        }
        //交换的准入条件
        var amount = pkExchangeRes.iAmount;
        if (amount) {
            switch (pkExchangeRes.eConditionType) {
                case TableRes.SeEnumExchangeeConditionType.JinBi:
                    if (this._parent.gold < amount)
                        return false;
                    break;
                case TableRes.SeEnumExchangeeConditionType.ZuanShi:
                    if (this._parent.money < amount)
                        return false;
                    break;
                case TableRes.SeEnumExchangeeConditionType.DaoJu:
                    var conditionNum = this._parent.itemCount(pkExchangeRes.kConditionItem);
                    if (conditionNum < amount)
                        return false;
                    break;
                case TableRes.SeEnumExchangeeConditionType.ZhuChengDengJi:
                    var level = this._parent.level;
                    if (level < amount)
                        return false;
                    break;
                default: return false;
            }
        }
        var price = pkExchangeRes.iPrice * excount;
        var targets = pkExchangeRes.akTargetD;
        switch (pkExchangeRes.ePriceType) {
            case TableRes.SeEnumExchangeePriceType.JinBi:
                if (pkExchangeRes.iConsumable == 0) {
                    // 表示不消耗的
                    if (this._parent.gold < price)
                        return false;
                }
                else {
                    if (!this._parent.useGold(price))
                        return false;
                }
                break;
            case TableRes.SeEnumExchangeePriceType.ZuanShi:
                if (pkExchangeRes.iConsumable == 0) {
                    // 表示不消耗的
                    if (this._parent.money < price)
                        return false;
                }
                else {
                    if (!this.Player.decMoney(price, 'exchange', exchangeId, targets.toString()))
                        return false;
                }
                break;
            case TableRes.SeEnumExchangeePriceType.DaoJu:
                var itemNum = this._parent.itemCount(pkExchangeRes.kPriceItem);
                if (itemNum < price)
                    return false;
                if (pkExchangeRes.iConsumable == 1)
                    this._parent.delItem(pkExchangeRes.kPriceItem, price, SePlayerDef_1.DeAddDelItemReason.exchangecost, exchangeId);
                break;
            case TableRes.SeEnumExchangeePriceType.DuoZhongDaoJu:
                let items = pkExchangeRes.akExchangeItems;
                for (let i = 0; i < items.length; i++) {
                    let itemId = items[i].split(',')[0];
                    let itemPrice = Number(items[i].split(',')[1]);
                    if (itemId == 'W001') {
                        if (this._parent.money < itemPrice)
                            return false;
                        if (pkExchangeRes.iConsumable == 1 && !this.Player.decMoney(itemPrice, 'exchange', exchangeId, targets.toString()))
                            return false;
                    }
                    else if (itemId == 'W002') {
                        if (this._parent.gold < itemPrice)
                            return false;
                        if (pkExchangeRes.iConsumable == 1 && !this._parent.useGold(itemPrice))
                            return false;
                    }
                    else {
                        if (this._parent.itemCount(itemId) < itemPrice)
                            return false;
                        if (pkExchangeRes.iConsumable == 1)
                            this._parent.delItem(itemId, itemPrice, SePlayerDef_1.DeAddDelItemReason.exchangecost, exchangeId);
                    }
                }
                break;
            default: return false;
        }
        if (pkExchangeRes.eType == TableRes.SeEnumExchangeeType.DaoJu) {
            for (let i in targets) {
                let args = targets[i].split(',');
                this._parent.addItem(args[0], parseInt(args[1]) * excount, SePlayerDef_1.DeAddDelItemReason.exchange, exchangeId);
            }
            global.logMgr.activityExchange(this._parent, activityId, exchangeId, "item", targets.toString());
        }
        else if (pkExchangeRes.eType == TableRes.SeEnumExchangeeType.WuJiang) {
            for (let i in targets) {
                let args = targets[i].split(',');
                this._parent.addHeroCard(args[0], parseInt(args[1]) * excount);
            }
            global.logMgr.activityExchange(this._parent, activityId, exchangeId, "hero", targets.toString());
        }
        if (activityId != 'exchange') {
            activityLog.buyCount += excount;
            !this._shopInfo.activityHash && (this._shopInfo.activityHash = {});
            !this._shopInfo.activityHash[activityId] && (this._shopInfo.activityHash[activityId] = {});
            this._shopInfo.activityHash[activityId][exchangeId] = activityLog;
            //因为活动和exchange绑定再了一起, 所以一些有时效性的特定逻辑直接写死, 后续删除也比较方便
            this.__exchange(activityId, exchangeId, excount);
            this.saveInfo("activityHash");
            global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'activity', activityId, this._shopInfo.activityHash[activityId]);
        }
    }
    __exchange(activityId, exchangeId, excount) {
        //砸金蛋活动的刷新
        if (exchangeId == 'E055') {
            this._shopInfo.activityHash[activityId] = {};
        }
        //砸金蛋活动最后一个免费刷新
        if (exchangeId == 'E061' || exchangeId == 'E062') {
            this._parent.addItem('ZD01', excount);
            this._shopInfo.activityHash[activityId] = {};
        }
    }
    _box_view_(boxid) {
        var pkHeroBoxRes = global.resMgr.HeroBoxZZYRes.getRes(boxid);
        if (!pkHeroBoxRes)
            return [];
        var outItems = [];
        for (var i = 0; i < pkHeroBoxRes.akCardPools.length; i++) {
            outItems = outItems.concat(global.resMgr.getChanceList(pkHeroBoxRes.akCardPools[i].name, this._parent.top_pvp_level));
        }
        // 这里取出垃圾信息，只保留有效信息
        var shotInfoMap = new TeTool_1.TeMap();
        for (var i = 0; i < outItems.length; i++) {
            var one_ = outItems[i];
            if (one_)
                shotInfoMap.set(one_.id + one_.num + one_.type, one_);
        }
        var out = [];
        var rKeys = shotInfoMap.keys;
        for (var i = 0; i < rKeys.length; i++) {
            out.push(shotInfoMap.get(rKeys[i]));
        }
        return out;
    }
    box_view(boxid) {
        var outs = this._box_view_(boxid);
        global.netMgr.sendData({
            cmd: 'box_view',
            infos: outs
        }, this._parent.linkid);
    }
    reset_shop_limit(mallid) {
        if (this._shopInfo.limit_count.hasOwnProperty(mallid)) {
            delete this._shopInfo.limit_count[mallid];
            this.saveInfo("limit_count");
            if (this._parent.bInitComplete)
                global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'limit_count', mallid, this._shopInfo.limit_count[mallid]);
        }
    }
    refreshLimitCount(mallid) {
        this._shopInfo.limit_count[mallid] = {
            buy: 0,
            cttime: Date.now(),
        };
        this.saveInfo("limit_count");
        if (this._parent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.Player.linkid, 'limit_count', mallid, this._shopInfo.limit_count[mallid]);
    }
}
exports.SeShopMgr = SeShopMgr;
//# sourceMappingURL=SeShopMgr.js.map