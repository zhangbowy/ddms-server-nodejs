"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeSignMgr = void 0;
const SePlayerDef_1 = require("./SePlayerDef");
const SeResMgr_1 = require("../ResMgr/SeResMgr");
const TeTool_1 = require("../TeTool");
const interface_1 = require("../Res/interface");
class SeSignMgr {
    constructor(p) {
        this.parrent = p;
    }
    get baseInfo() {
        return this.parrent.baseInfo;
    }
    saveBaseInfo(v) {
        return this.parrent.saveBaseInfo(v);
    }
    sign() {
        if (!this.baseInfo.sign) {
            this.baseInfo.sign = [];
        }
        let len = 7 - this.baseInfo.sign.length;
        for (let i = 0; i < len; i++) {
            let item = new SePlayerDef_1.SignItem();
            item.iDay = this.baseInfo.sign.length + 1;
            item.signTime = 0;
            item.rewardTime = 0;
            this.baseInfo.sign[item.iDay - 1] = item;
        }
        this.saveBaseInfo("sign");
    }
    signReward(isWatchAD) {
        if (this.baseInfo.sign.length == 0)
            return false;
        var d = new Date();
        d.setHours(0, 0, 0, 0);
        var dayItem;
        for (var i = 0; i < this.baseInfo.sign.length; i++) {
            var item = this.baseInfo.sign[i];
            if (item.rewardTime == d.getTime() || item.signTime == d.getTime()) {
                return;
            }
            else if (item.rewardTime == 0 || (item.signTime == 0 && this.baseInfo.sign[7 - 1].rewardTime != 0)) {
                dayItem = item;
                break;
            }
        }
        if (!dayItem) {
            for (var i = 0; i < this.baseInfo.sign.length; i++) {
                var item = this.baseInfo.sign[i];
                item.signTime = 0;
            }
            dayItem = this.baseInfo.sign[0];
        }
        var pkSignItem = SeResMgr_1.SeResMgr.inst.getSignItem(dayItem.iDay);
        var itemId = dayItem.rewardTime == 0 ? pkSignItem.kItemID : pkSignItem.kItemID1;
        var num = dayItem.rewardTime == 0 ? pkSignItem.iNum : pkSignItem.iNum1;
        dayItem.signTime = d.getTime();
        if (dayItem.rewardTime == 0) {
            dayItem.rewardTime = d.getTime();
        }
        //是否看广告双倍
        if (isWatchAD) {
            num = num * 2;
        }
        this.parrent.addItem(itemId, num, SePlayerDef_1.DeAddDelItemReason.sign);
        this.saveBaseInfo("sign");
        global.netMgr.onSignBack(this.parrent.linkid, this.baseInfo.sign);
        global.logMgr.signLog(this.parrent, 'signreward', dayItem.iDay);
        return true;
    }
    _check_month_fresh() {
        if (this.baseInfo.monthsign.sign != 0 && TeTool_1.TeDate.isdiffmonth(this.baseInfo.monthsign.last)) {
            this.baseInfo.monthsign.sign = 0;
            this.baseInfo.monthsign.tot = 0;
            this.baseInfo.monthsign.last = Date.now();
        }
    }
    /**签到补签 */
    monthSign(iDay, retry, isad) {
        let timeDate = new Date();
        // 当前是一个月的第几天
        let currDate = timeDate.getDate();
        // 签到时间超过了不计算
        if (iDay > currDate)
            return false;
        if (iDay < currDate && !retry)
            return false;
        this._check_month_fresh();
        if (this.baseInfo.monthsign.sign & (1 << iDay)) {
            // 已经签到过了
            return false;
        }
        // 补签的后一天要是签到过的才能签
        if (retry && !(this.baseInfo.monthsign.sign & (1 << (iDay + 1)))) {
            return false;
        }
        // 如果是补签的话扣钱
        let cost = parseInt(SeResMgr_1.SeResMgr.inst.getConfig('monthSignCost'));
        if (isNaN(cost) || !cost) {
            cost = 20;
        }
        if (retry && !this.parrent.decMoney(cost, "monthsign")) {
            return false;
        }
        this.baseInfo.monthsign.sign |= (1 << iDay);
        this.baseInfo.monthsign.last = timeDate.getTime();
        // 判断一下签到的日期
        let signDate = timeDate.getTime() - (currDate - iDay) * 24 * 3600 * 1000;
        // 当前是周几
        let currDay = (new Date(signDate)).getDay();
        let singRes = SeResMgr_1.SeResMgr.inst.getMonthSignRes(interface_1.SeEnumMonthSignetype.QianDaoJiangLi, currDay);
        if (singRes) {
            // 如果有配置的话发奖励
            this.parrent.addItem(singRes.kItemID, singRes.iNum * (isad ? 2 : 1), SePlayerDef_1.DeAddDelItemReason.monthsign);
        }
        this.saveBaseInfo('monthsign');
        global.netMgr.sendCharMiscUpdate(this.parrent.linkid, "monthsign", this.baseInfo.monthsign, undefined, undefined, true);
        global.logMgr.signLog(this.parrent, "monthsign", iDay, isad ? 1 : 0);
        return true;
    }
    /**日签到补签 */
    daySign(currDay, retry, isad) {
        let timeDate = new Date();
        // 签到日是第几日
        let activity = global.resMgr.activityRes.getRes('A018');
        // 当前是活动第几天
        let currDate = TeTool_1.TeDate.daydiff(Date.parse(activity.kStartTime));
        // 签到时间超过了不计算
        if (currDay > currDate)
            return false;
        if (currDay < currDate && !retry)
            return false;
        if (this.baseInfo.daysign.sign & (1 << currDay)) {
            // 已经签到过了
            return false;
        }
        // 补签的后一天要是签到过的才能签
        if (retry && !(this.baseInfo.daysign.sign & (1 << (currDay + 1)))) {
            return false;
        }
        // 如果是补签的话扣钱
        let cost = parseInt(SeResMgr_1.SeResMgr.inst.getConfig('daySignCost'));
        if (isNaN(cost) || !cost) {
            cost = 20;
        }
        if (retry && !this.parrent.decMoney(cost, "daysign")) {
            return false;
        }
        this.baseInfo.daysign.last = timeDate.getTime();
        // 判断一下签到的日期
        // let signDate = timeDate.getTime() - (currDate - currDay) * 24 * 3600 * 1000;
        this.baseInfo.daysign.sign |= (1 << currDay);
        let singRes = SeResMgr_1.SeResMgr.inst.getFestivalSignRes(interface_1.SeEnumFestivalSignetype.JieRiQianDao, currDay);
        if (singRes) {
            // 如果有配置的话发奖励
            this.parrent.addItem(singRes.kItemID, singRes.iNum * (isad ? 2 : 1), SePlayerDef_1.DeAddDelItemReason.monthsign);
        }
        this.saveBaseInfo('daysign');
        global.netMgr.sendCharMiscUpdate(this.parrent.linkid, "daysign", this.baseInfo.daysign, undefined, undefined, true);
        global.logMgr.signLog(this.parrent, "daysign", currDay, isad ? 1 : 0);
        return true;
    }
    /**获取连续奖励 */
    getTotSignAward(iDay) {
        this._check_month_fresh();
        let signRes = SeResMgr_1.SeResMgr.inst.getMonthSignRes(interface_1.SeEnumMonthSignetype.LeiJiQianDaoJiangLi, iDay);
        if (!signRes)
            return false;
        if (this.baseInfo.monthsign.tot & (1 << iDay))
            return false;
        let loop = 0;
        for (let i = 1; i < 32; i++) {
            if (this.baseInfo.monthsign.sign & (1 << i)) {
                loop++;
            }
        }
        // 判断天数是否足够
        if (loop < iDay)
            return false;
        this.baseInfo.monthsign.tot |= (1 << iDay);
        this.baseInfo.monthsign.last = Date.now();
        this.parrent.addItem(signRes.kItemID, signRes.iNum, SePlayerDef_1.DeAddDelItemReason.monthsign);
        this.saveBaseInfo('monthsign');
        global.netMgr.sendCharMiscUpdate(this.parrent.linkid, "monthsign", this.baseInfo.monthsign, undefined, undefined, true);
        global.logMgr.signLog(this.parrent, "monthsigntot", iDay);
        return true;
    }
}
exports.SeSignMgr = SeSignMgr;
//# sourceMappingURL=SeSignMgr.js.map