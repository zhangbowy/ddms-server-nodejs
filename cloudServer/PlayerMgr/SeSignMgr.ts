import { SePlayer } from "./SePlayer";
import { SignItem, DeAddDelItemReason } from "./SePlayerDef";
import { SeResMgr } from "../ResMgr/SeResMgr";
import { iApp } from "../app";
import { TeDate } from "../TeTool";
import { SeEnumMonthSignetype, SeEnumFestivalSignetype } from "../Res/interface";

declare var global: iApp;

export class SeSignMgr {
    parrent: SePlayer;
    constructor(p: SePlayer) {
        this.parrent = p;
    }

    get baseInfo() {
        return this.parrent.baseInfo;
    }

    saveBaseInfo(v: string | string[]) {
        return this.parrent.saveBaseInfo(v)
    }

    sign() {
        if (!this.baseInfo.sign) {
            this.baseInfo.sign = [];
        }
        let len = 7 - this.baseInfo.sign.length;
        for (let i = 0; i < len; i++) {
            let item = new SignItem();
            item.iDay = this.baseInfo.sign.length + 1;
            item.signTime = 0;
            item.rewardTime = 0;
            this.baseInfo.sign[item.iDay - 1] = item;
        }
        this.saveBaseInfo("sign");
    }


    public signReward(isWatchAD?: boolean) {
        if (this.baseInfo.sign.length == 0) return false;
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


        var pkSignItem = SeResMgr.inst.getSignItem(dayItem.iDay);
        var itemId = dayItem.rewardTime == 0 ? pkSignItem.kItemID : pkSignItem.kItemID1;
        var num = dayItem.rewardTime == 0 ? pkSignItem.iNum : pkSignItem.iNum1;
        dayItem.signTime = d.getTime();
        if (dayItem.rewardTime == 0) {
            dayItem.rewardTime = d.getTime();
        }
        //?????????????????????
        if (isWatchAD) { num = num * 2; }

        this.parrent.addItem(itemId, num, DeAddDelItemReason.sign);
        this.saveBaseInfo("sign");
        global.netMgr.onSignBack(this.parrent.linkid, this.baseInfo.sign);
        global.logMgr.signLog(this.parrent, 'signreward', dayItem.iDay);

        return true;
    }

    private _check_month_fresh() {
        if (this.baseInfo.monthsign.sign != 0 && TeDate.isdiffmonth(this.baseInfo.monthsign.last)) {
            this.baseInfo.monthsign.sign = 0;
            this.baseInfo.monthsign.tot = 0;
            this.baseInfo.monthsign.last = Date.now();
        }
    }

    /**???????????? */
    public monthSign(iDay: number, retry: boolean, isad: boolean) {
        let timeDate = new Date();
        // ??????????????????????????????
        let currDate = timeDate.getDate();
        // ??????????????????????????????
        if (iDay > currDate) return false;
        if (iDay < currDate && !retry) return false;

        this._check_month_fresh();

        if (this.baseInfo.monthsign.sign & (1 << iDay)) {
            // ??????????????????
            return false;
        }

        // ?????????????????????????????????????????????
        if (retry && !(this.baseInfo.monthsign.sign & (1 << (iDay + 1)))) {
            return false;
        }


        // ???????????????????????????

        let cost = parseInt(SeResMgr.inst.getConfig('monthSignCost'));
        if (isNaN(cost) || !cost) {
            cost = 20;
        }
        if (retry && !this.parrent.decMoney(cost, "monthsign")) {
            return false;
        }

        this.baseInfo.monthsign.sign |= (1 << iDay);

        this.baseInfo.monthsign.last = timeDate.getTime();
        // ???????????????????????????
        let signDate = timeDate.getTime() - (currDate - iDay) * 24 * 3600 * 1000;

        // ???????????????
        let currDay = (new Date(signDate)).getDay();
        let singRes = SeResMgr.inst.getMonthSignRes(SeEnumMonthSignetype.QianDaoJiangLi, currDay);
        if (singRes) {
            // ??????????????????????????????
            this.parrent.addItem(singRes.kItemID, singRes.iNum * (isad ? 2 : 1), DeAddDelItemReason.monthsign);
        }
        this.saveBaseInfo('monthsign');

        global.netMgr.sendCharMiscUpdate(this.parrent.linkid, "monthsign", this.baseInfo.monthsign, undefined, undefined, true);

        global.logMgr.signLog(this.parrent, "monthsign", iDay, isad ? 1 : 0);

        return true;
    }

     /**??????????????? */
     public daySign(currDay: number, retry: boolean, isad: boolean) {
        let timeDate = new Date();
        // ?????????????????????
        let activity = global.resMgr.activityRes.getRes('A018');
        // ????????????????????????
        let currDate = TeDate.daydiff(Date.parse(activity.kStartTime));
        // ??????????????????????????????
        if (currDay > currDate) return false;
        if (currDay < currDate && !retry) return false;

        if (this.baseInfo.daysign.sign & (1 << currDay)) {
            // ??????????????????
            return false;
        }

        // ?????????????????????????????????????????????
        if (retry && !(this.baseInfo.daysign.sign & (1 << (currDay + 1)))) {
            return false;
        }


        // ???????????????????????????

        let cost = parseInt(SeResMgr.inst.getConfig('daySignCost'));
        if (isNaN(cost) || !cost) {
            cost = 20;
        }
        if (retry && !this.parrent.decMoney(cost, "daysign")) {
            return false;
        }

        

        this.baseInfo.daysign.last = timeDate.getTime();
        // ???????????????????????????
        // let signDate = timeDate.getTime() - (currDate - currDay) * 24 * 3600 * 1000;

        
        this.baseInfo.daysign.sign |= (1 << currDay);
        let singRes = SeResMgr.inst.getFestivalSignRes(SeEnumFestivalSignetype.JieRiQianDao, currDay);
        if (singRes) {
            // ??????????????????????????????
            this.parrent.addItem(singRes.kItemID, singRes.iNum * (isad ? 2 : 1), DeAddDelItemReason.monthsign);
        }
        this.saveBaseInfo('daysign');

        global.netMgr.sendCharMiscUpdate(this.parrent.linkid, "daysign", this.baseInfo.daysign, undefined, undefined, true);

        global.logMgr.signLog(this.parrent, "daysign", currDay, isad ? 1 : 0);

        return true;
    }

    /**?????????????????? */
    public getTotSignAward(iDay: number) {
        this._check_month_fresh();

        let signRes = SeResMgr.inst.getMonthSignRes(SeEnumMonthSignetype.LeiJiQianDaoJiangLi, iDay);
        if (!signRes) return false;

        if (this.baseInfo.monthsign.tot & (1 << iDay)) return false;

        let loop = 0;
        for (let i = 1; i < 32; i++) {
            if (this.baseInfo.monthsign.sign & (1 << i)) {
                loop++
            }
        }

        // ????????????????????????
        if (loop < iDay) return false;
        this.baseInfo.monthsign.tot |= (1 << iDay);

        this.baseInfo.monthsign.last = Date.now();

        this.parrent.addItem(signRes.kItemID, signRes.iNum, DeAddDelItemReason.monthsign);

        this.saveBaseInfo('monthsign');

        global.netMgr.sendCharMiscUpdate(this.parrent.linkid, "monthsign", this.baseInfo.monthsign, undefined, undefined, true);
        global.logMgr.signLog(this.parrent, "monthsigntot", iDay);
        
        return true;
    }
}