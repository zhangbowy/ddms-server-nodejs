//import SePlayer from "./SePlayer";
import { SeBaseCharInfo, SeItem, DeAddDelItemReason } from './SePlayerDef';
import { SeResTownItem, SeEnumTownItemiProperty, SeEnumTownItemeTypeA } from "../Res/interface";
import { iApp } from "../app";
import { SePlayer } from "./SePlayer";
import { func_copy, SeOprType, SeMailType, SeCharMailInfo, TaskAction, SeShareType } from '../SeDefine';
import { TeDate } from '../TeTool';
import { UpgradeLib } from './VerUpgrade';
import { SeResMgr } from '../ResMgr/SeResMgr';
declare var global: iApp;
// 这个是处理玩家道具的信息
class SeItemMgr {
    private m_pkParent: SePlayer;
    get baseInfo(): SeBaseCharInfo {
        return this.m_pkParent.baseInfo;
    };

    constructor(parent: any) {
        this.m_pkParent = parent;
    }

    public check_item_whenload() {
        let items = ['AV007', 'ZQ001'];
        for(let i = 0; i < items.length; i++){
            let item_id = items[i];
            if (!this.getItemCount(item_id)) {
                // this.addItem('AV007', 1, 'defaulticon');
                this.baseInfo.items.push({
                    kItemID: item_id,
                    iPileCount: 1
                });
            }
        }
       

        if (UpgradeLib.itemUpgrade(this.baseInfo.items, this.baseInfo.version, global.resMgr.getConfig('userver'))) {
            this.m_pkParent.saveBaseInfo('items');
        }
    }

    /**
   * 获取道具，一定是限时道具
   * @param typeid 
   * @param timeLimit 
   */
    public getItems(typeid: string) {
        let outs = [];
        let curr = Date.now();
        let change = false;
        for (let i = 0; i < this.baseInfo.items.length; i++) {
            let rkBagItem: SeItem = this.baseInfo.items[i];
            if (!rkBagItem || (rkBagItem.end && rkBagItem.end < curr)) {
                this.baseInfo.items.splice(i, 1);
                i--;
                change = true;
                continue;
            }

            if (rkBagItem.end && rkBagItem.end < curr) continue;
            if (rkBagItem.kItemID != typeid) continue;
            outs.push(rkBagItem);
        }

        if (change) this.m_pkParent.saveBaseInfo('items');

        return outs;
    }

    public addItem(typeid: string, num: number, reason?: string, subReason?: string) {
        if (num == null || num == undefined || num == 0 || isNaN(num)) return false;

        let precount = this.getItemCount(typeid);

        // 这里可能添加进来的道具有立即使用特性的，出现了的话就立即使用掉
        var pkTownItemRes: SeResTownItem = global.resMgr.TownItemRes.getRes(typeid);
        if (!pkTownItemRes) {
            return false;
        }

        if (pkTownItemRes.kEndTime && Date.parse(pkTownItemRes.kEndTime) <= Date.now()) return false;

        //任务统计
        if (global.resMgr.isTaskItem(typeid)) {
            this.m_pkParent.taskAction(TaskAction.AddItem, typeid, pkTownItemRes.eTypeA, num);
        }

        // 这里增加一个道具日志
        // 这里增加一个道具日志
        if((pkTownItemRes.iProperty & SeEnumTownItemiProperty.ManZuTiaoJianTiHuanWuPin) == SeEnumTownItemiProperty.ManZuTiaoJianTiHuanWuPin){
            if(pkTownItemRes.kValueB){
                let condition_item = global.resMgr.TownItemRes.getRes(pkTownItemRes.kValueB);
                switch(condition_item.eTypeA){
                    case SeEnumTownItemeTypeA.YingXiongPiFu:
                        if(this.hadSkin(condition_item.kValueA)){
                            this.addItem(pkTownItemRes.kValueC, num, reason, 'condition_exchange');
                            return true;
                        }
                        break; 
                }
            }
        }

        if ((pkTownItemRes.iProperty & SeEnumTownItemiProperty.HuoQuShiShiYongBingTongZhi) == SeEnumTownItemiProperty.HuoQuShiShiYongBingTongZhi) {
             //如果皮肤已拥有，返回钻石
             if (pkTownItemRes.eTypeA == SeEnumTownItemeTypeA.YingXiongPiFu){
                if(this.hadSkin(pkTownItemRes.kValueA)){
                    this.addItem('W001', Number(pkTownItemRes.kValueC) * num, 'repeat_' + typeid, subReason);
                    return true;
                }
            }
            global.logMgr.itemLog(this.m_pkParent, typeid, num, 0, 'add', reason);
            global.netMgr.sendCharItemUpdate(this.m_pkParent.linkid, 'additem_unsave', { kItemID: typeid, iPileCount: num }, reason, subReason);
            // 表示有立即使用特性
            if (this.m_pkParent._useItem(typeid, num, reason, subReason)) {
                global.logMgr.itemLog(this.m_pkParent, typeid, 0, num, 'del', reason);
                return true;
            }
        }
        else if ((pkTownItemRes.iProperty & SeEnumTownItemiProperty.HuoQuJiShiYong) == SeEnumTownItemiProperty.HuoQuJiShiYong) {
             //如果皮肤已拥有，返回钻石
             if (pkTownItemRes.eTypeA == SeEnumTownItemeTypeA.YingXiongPiFu){
                if(this.hadSkin(pkTownItemRes.kValueA)){
                    this.addItem('W001', Number(pkTownItemRes.kValueC) * num, 'repeat_' + typeid, subReason);
                    return true;
                }
            }
            global.logMgr.itemLog(this.m_pkParent, typeid, num, 0, 'add', reason);
            // 表示有立即使用特性
            if (this.m_pkParent._useItem(typeid, num, reason, subReason)) {
                global.logMgr.itemLog(this.m_pkParent, typeid, 0, num, 'del', reason);
                return true;
            }
        }

        let log_type = 'add';
        let bfind = false;
        // 道具增加有时间道具和无时间道具
        // 这里两种类型的道具不能互相叠加
        // 时间限制道具叠加的时候按照时间按照数量平衡的原则
        let curr = Date.now();
        if ((pkTownItemRes.iProperty & SeEnumTownItemiProperty.BuKeDieJia) != SeEnumTownItemiProperty.BuKeDieJia) {
            // 如果没有不可叠加特性，那么找找身上的道具，添加到身上去
            for (let i = 0; i < this.baseInfo.items.length; i++) {
                let r_item = this.baseInfo.items[i];
                if (!r_item || (r_item.end && r_item.end < curr)) {
                    // 检查老的是否已经过期 
                    this.baseInfo.items.splice(i, 1);
                    i--;
                    continue;
                }
                if (r_item.kItemID != typeid) continue;
                if (r_item.end && !pkTownItemRes.iDurationTime) continue;
                if (!r_item.end && pkTownItemRes.iDurationTime) continue;

                bfind = true;
                let notice = true;

                if ((pkTownItemRes.iProperty & SeEnumTownItemiProperty.FuGaiTianJia) == SeEnumTownItemiProperty.FuGaiTianJia) {
                    // 覆盖添加的时候替换掉之前的次数
                    r_item.iPileCount = num;
                    if (pkTownItemRes.iDurationTime) r_item.end = pkTownItemRes.iDurationTime * 60 * 1000 + curr;
                    log_type = 'radd';
                }
                // 如果道具已经到最大值了，那么添加后实际数量不变化，自动吃掉多余的数量，主要是有些功能道具实现冗余激活的
                else if (pkTownItemRes.iMaxPileCount && r_item.iPileCount >= pkTownItemRes.iMaxPileCount) {
                    // 道具满了，那么有效期
                    notice = false;
                    log_type = 'madd';
                }
                else if (pkTownItemRes.iDurationTime) {
                    // 时间限制道具的话添加的时候需要重新计算有效期
                    let mx = pkTownItemRes.iMaxPileCount ? Math.min(r_item.iPileCount + num, pkTownItemRes.iMaxPileCount) : (r_item.iPileCount + num);
                    let r_add_num = mx - r_item.iPileCount;
                    let leftTime = (r_item.end - curr) * r_item.iPileCount + r_add_num * pkTownItemRes.iDurationTime * 60 * 1000;
                    r_item.iPileCount = r_item.iPileCount + r_add_num;
                    r_item.end = curr + Math.ceil(leftTime / r_item.iPileCount);
                    //如果同时有赛季清除特性，取最小值
                    if((pkTownItemRes.iProperty & SeEnumTownItemiProperty.SaiJiJieSuanHouZhongZhi) == SeEnumTownItemiProperty.SaiJiJieSuanHouZhongZhi 
                        || (pkTownItemRes.iProperty & SeEnumTownItemiProperty.SaiJiJieSuanQianZhongZhi) == SeEnumTownItemiProperty.SaiJiJieSuanQianZhongZhi){
                        let seasonRes = global.resMgr.seasonRes.getRes(this.m_pkParent.pvpMgr.seasonid);
                        r_item.end = Math.min(r_item.end, (new Date(seasonRes.kEndTime)).getTime());
                    }
                }
                else {
                    if (pkTownItemRes.iMaxPileCount) {
                        log_type = 'madd';
                        r_item.iPileCount = Math.min(r_item.iPileCount + num, pkTownItemRes.iMaxPileCount);
                    }
                    else r_item.iPileCount = r_item.iPileCount + num;
                }
                notice && global.netMgr.sendCharItemUpdate(this.m_pkParent.linkid, 'updateitem', r_item, reason, subReason);
                break;
            }
        }

        // 不可叠加道具
        if (!bfind) {
            let newItem = new SeItem();
            newItem.iPileCount = num;
            newItem.kItemID = typeid;
            if (pkTownItemRes.iDurationTime) {
                // 时间限制道具的话，就覆盖上去
                newItem.end = pkTownItemRes.iDurationTime * 60 * 1000 + curr;
            }

            if (pkTownItemRes.iMaxPileCount && newItem.iPileCount > pkTownItemRes.iMaxPileCount) {
                log_type = 'madd';
                newItem.iPileCount = pkTownItemRes.iMaxPileCount;
            }

            this.baseInfo.items.push(newItem);

            global.netMgr.sendCharItemUpdate(this.m_pkParent.linkid, 'additem', newItem, reason, subReason);
        }

        this.m_pkParent.saveBaseInfo('items');

        if ((pkTownItemRes.iProperty & SeEnumTownItemiProperty.HuoQuJiShiYong) != SeEnumTownItemiProperty.HuoQuJiShiYong) {
            global.logMgr.itemLog(this.m_pkParent, typeid, this.getItemCount(typeid), precount, log_type, reason);
        }

        this.checkItemWhenChart(typeid);
        return true;
    }

    private hadSkin(skinId) : boolean{
        let skinRes = global.resMgr.HeroSkinRes.getRes(skinId);
        if(skinRes){
            let heroId = skinRes.kHeroId;
            let skins = this.m_pkParent.baseInfo.heros_skin[heroId];
            if(skins && skins['skins']){
                for (let i = 0; i < skins['skins'].length; i++) {
                    if(skins['skins'][i].kid == skinId){
                        return true;
                    }
                }
            }
        }
        return false;
    }
    public getItemCount(typeid: string): number {
        let curr = Date.now();
        var rkItems: SeItem[] = this.getItems(typeid);
        let tot = 0;
        for (let i = 0; i < rkItems.length; i++) {
            let rItem = rkItems[i];
            if (rItem && rItem.end && rItem.end < curr) {
                continue;
            }
            tot += rkItems[i].iPileCount;
        }

        return tot;
    }

    public delItem(typeid: string, num: number, reason?: any, subReason?: any): boolean {
        if (num == 0) return true;
        let packNum = this.getItemCount(typeid);
        if (packNum < num) {
            return false;
        }

        let leftcount = num;
        for (let i = 0; i < this.baseInfo.items.length && leftcount > 0; i++) {
            let r = this.baseInfo.items[i];
            if (!r || r.kItemID != typeid) {
                continue;
            }
            if (r.iPileCount <= leftcount) {
                leftcount = leftcount - r.iPileCount;
                r.iPileCount = 0;
                global.netMgr.sendCharItemUpdate(this.m_pkParent.linkid, 'delitem', r, reason, subReason);
                this.baseInfo.items.splice(i, 1);
                i--;
            }
            else {
                r.iPileCount = r.iPileCount - leftcount;
                global.netMgr.sendCharItemUpdate(this.m_pkParent.linkid, 'updateitem', r, reason, subReason);
                leftcount = 0;
            }
        }

        this.m_pkParent.saveBaseInfo('items');
        global.logMgr.itemLog(this.m_pkParent, typeid, packNum - num, packNum, 'del', reason);

        let pkTownItemRes = global.resMgr.TownItemRes.getRes(typeid);
        if (pkTownItemRes && global.resMgr.isTaskItem(typeid)) {
            this.m_pkParent.taskAction(TaskAction.DelItem, typeid, pkTownItemRes.eTypeA, num);
        }
        return true;
    }

    /**
     * 获取分享玩家进入成功奖励
     */
    public get_share_award(uid: number) {
        let inviteReward = global.resMgr.getConfig('inviteReward');
        if (!inviteReward) {
            return;
        }
        let item = inviteReward.split(',');
        if (item.length < 2) {
            return;
        }
        let itemID;
        let itemNum;
        let awards;
        
        itemID = item[0];
        itemNum = parseInt(item[1]);
        awards = this.m_pkParent.dailyInfo.wx_shared_get;

        for (let i = 0; i < awards.length; i++) {
            let r = awards[i];
            if (r && r.uid == uid) {
                if (r.award) {
                    this._share_keys_award('share_awared_fail');
                }
                else {
                    r.award = true;
                    this.addItem(itemID, itemNum, DeAddDelItemReason.get_share_award);
                    this._share_keys_award('share_awared_succ');
                }
                this.m_pkParent.updateDailyInfo();
                return;
            }
        }

        return;
    }

    private _can_send_award_(uid: number, type) {
        if ((!type || type == SeShareType.yaoshi) && this.m_pkParent.dailyInfo.wx_share_send.indexOf(uid) >= 0) {
            return false;
        }
        else if (type == SeShareType.zhanqi && this.m_pkParent.dailyInfo.wx_share_send_zhanqi.indexOf(uid) >= 0) {
            return false;
        }
        else if (type == SeShareType.other && this.m_pkParent.dailyInfo.wx_share_send_other.indexOf(uid) >= 0) {
            return false;
        }
        return true;
    }

    /**
     * 分析每日分享送的钥匙数据
     */
    public add_daily_share_links_(mailInfo: SeCharMailInfo) {
        // 这里做一个时间判断
        if (TeDate.isdiffday(mailInfo.cttime)) return;

        try {
            let d_info = JSON.parse(mailInfo.message);
            
            if(!d_info.share_type || d_info.share_type == SeShareType.yaoshi){
                d_info.award = false;
                let awards = this.m_pkParent.dailyInfo.wx_shared_get;
                if (awards.length >= 5) {
                    return;
                }
    
                for (let i = 0; i < awards.length; i++) {
                    let r = awards[i];
                    if (r && r.uid == d_info.uid) {
                        return;
                    }
                }
    
                this.m_pkParent.dailyInfo.wx_shared_get.push(d_info);
                this.m_pkParent.updateDailyInfo();
            }
            else if(d_info.share_type == SeShareType.zhanqi){
                d_info.award = true;
                if (!this.m_pkParent.dailyInfo.wx_shared_get_zhanqi) this.m_pkParent.dailyInfo.wx_shared_get_zhanqi = [];
                let awards = this.m_pkParent.dailyInfo.wx_shared_get_zhanqi;
                if (awards.length >= 3) {
                    return;
                }
    
                for (let i = 0; i < awards.length; i++) {
                    let r = awards[i];
                    if (r && r.uid == d_info.uid) {
                        return;
                    }
                }
                this.m_pkParent.addItems(mailInfo.items, DeAddDelItemReason.get_share_zhanqi_award);
                this.m_pkParent.dailyInfo.wx_shared_get_zhanqi.push(d_info);
                this.m_pkParent.updateDailyInfo();
            }
            else if(d_info.share_type == SeShareType.other){
                d_info.award = true;
                if (!this.m_pkParent.dailyInfo.wx_shared_get_other) this.m_pkParent.dailyInfo.wx_shared_get_other = [];
                let awards = this.m_pkParent.dailyInfo.wx_shared_get_other;
                // if (awards.length >= 3) {
                //     return;
                // }
    
                for (let i = 0; i < awards.length; i++) {
                    let r = awards[i];
                    if (r && r.uid == d_info.uid) {
                        return;
                    }
                }
                this.m_pkParent.taskAction(TaskAction.ShareLink);
                this.m_pkParent.dailyInfo.wx_shared_get_other.push(d_info);
                this.m_pkParent.updateDailyInfo();
            }
        }
        catch (e) {
           
        }
    }

    /**
     * 登陆的时候判断一下，是否有钥匙需要提示获取
     * @param share_uid  分享链接的玩家
     * @param share_time 分享链接发起的时间
     */
    public share_keys_award(share_uid: string, share_time: number, share_type: number) {
        if (!share_uid || !share_time) return;

        let uid = parseInt(share_uid);

        if (TeDate.isdiffday(share_time)) {
            // 说明连接过期了
            this._share_keys_award('timeout');
        }
        else {
            if(!share_type || share_type == SeShareType.yaoshi){
                let inviteCount = parseInt(global.resMgr.getConfig('inviteCount')) || 0;
                if (this.m_pkParent.isMonthVip) {
                    inviteCount = inviteCount * 2;
                }
                if (this._can_send_award_(uid, share_type)) {
                    let inviteReward = global.resMgr.getConfig('inviteReward');
                    if (!inviteReward) {
                        return;
                    }
                    let item = inviteReward.split(',');
                    if (item.length < 2) {
                        return;
                    }
    
                    let itemID = item[0];
                    let itemNum = parseInt(item[1]);
    
                    if (this.m_pkParent.dailyInfo.wx_share_send.length < inviteCount) {
                        // 自己获得一个奖励
                        this.addItem(itemID, itemNum, DeAddDelItemReason.share_keys_award);
                        this._share_keys_award('link_award', itemID, itemNum);
                    }
                    else {
                        this._share_keys_award('link_count_limit', itemID, itemNum);
                    }
    
                    // 发送一个奖励消息给别人
                    if (uid != this.m_pkParent.id) global.playerMgr.onGiveMail(this.m_pkParent.plt, uid, SeMailType.ShareBack, JSON.stringify({ uid: this.m_pkParent.id, icon: this.m_pkParent.icon, avatar: this.m_pkParent.avatar, share_type: share_type }), [{ kItemID: item[0], iPileCount: parseInt(item[1]) }]);
                    this.m_pkParent.dailyInfo.wx_share_send.push(uid);
    
                    this.m_pkParent.updateDailyInfo();
                }
                else {
                    this._share_keys_award('link_repeat');
                }
            }
            else if(share_type == SeShareType.zhanqi){
                if (this._can_send_award_(uid, share_type)) {
                    // 发送一个奖励消息给别人
                    let itemID = 'DH014';
                    let itemNum = 1;
                    if (uid != this.m_pkParent.id) global.playerMgr.onGiveMail(this.m_pkParent.plt, uid, SeMailType.ShareBack, JSON.stringify({ uid: this.m_pkParent.id, icon: this.m_pkParent.icon, avatar: this.m_pkParent.avatar, share_type: share_type }), [{ kItemID: itemID, iPileCount: itemNum }]);
                    if(!this.m_pkParent.dailyInfo.wx_share_send_zhanqi) this.m_pkParent.dailyInfo.wx_share_send_zhanqi = [];
                    this.m_pkParent.dailyInfo.wx_share_send_zhanqi.push(uid);
    
                    this.m_pkParent.updateDailyInfo();
                }
            }
            else if(share_type == SeShareType.other){
                if (this._can_send_award_(uid, share_type)) {
                   // 发送一个奖励消息给别人
                   if (uid != this.m_pkParent.id) global.playerMgr.onGiveMail(this.m_pkParent.plt, uid, SeMailType.ShareBack, JSON.stringify({ uid: this.m_pkParent.id, icon: this.m_pkParent.icon, avatar: this.m_pkParent.avatar, share_type: share_type }), []);
                   if(!this.m_pkParent.dailyInfo.wx_share_send_other) this.m_pkParent.dailyInfo.wx_share_send_other = [];
                   this.m_pkParent.dailyInfo.wx_share_send_other.push(uid);
   
                   this.m_pkParent.updateDailyInfo();
                }
            }
        }
    }
    private _share_keys_award(type: string, itemdID?: string, count?: number) {
        global.netMgr.sendData({ cmd: 'share_keys_award', type: type, itemdID: itemdID, count: count }, this.m_pkParent.linkid)
    }

    public clear_season_before_item() {
        let change = false;
        for (let i = 0; i < this.baseInfo.items.length; i++) {
            let r_item = this.baseInfo.items[i];
            if (!r_item) continue
            let pkTownItemRes = global.resMgr.TownItemRes.getRes(r_item.kItemID);
            if (!pkTownItemRes) continue;
            if ((pkTownItemRes.iProperty & SeEnumTownItemiProperty.SaiJiJieSuanQianZhongZhi) == SeEnumTownItemiProperty.SaiJiJieSuanQianZhongZhi) {
                this.baseInfo.items.splice(i, 1);
                i--;
                change = true;
            }
        }

        if (change) this.m_pkParent.saveBaseInfo('items');
    }

    public clear_season_after_item() {
        let change = false;
        for (let i = 0; i < this.baseInfo.items.length; i++) {
            let r_item = this.baseInfo.items[i];
            if (!r_item) continue
            let pkTownItemRes = global.resMgr.TownItemRes.getRes(r_item.kItemID);
            if (!pkTownItemRes) continue;
            if ((pkTownItemRes.iProperty & SeEnumTownItemiProperty.SaiJiJieSuanHouZhongZhi) == SeEnumTownItemiProperty.SaiJiJieSuanHouZhongZhi) {
                this.baseInfo.items.splice(i, 1);
                i--;
                change = true;
            }
        }

        if (change) this.m_pkParent.saveBaseInfo('items');
    }


    /**
     * 当道具变更的时候检查一下是否是榜单系统需要的道具
     */
    public checkItemWhenChart(typeId: string) {
        // 
        let charId = SeResMgr.inst.getItem2CharType(typeId);
        if (charId == null) return;
        // 判断榜单是否存在
        let pkChartRes = SeResMgr.inst.chartTable.getRes(charId);
        if (!pkChartRes) return;
        // 检查榜单的时间
        if (pkChartRes.kStartDate && Date.now() < Date.parse(pkChartRes.kStartDate)) return;
        if (pkChartRes.kEndDate && Date.now() > Date.parse(pkChartRes.kEndDate)) return;

        let itemcount = this.getItemCount(typeId);

        global.chartMgr.addPlayerLevelChart(this.m_pkParent.pvpMgr.seasonid,
            pkChartRes.eType,
            {
                seasonid: this.m_pkParent.pvpMgr.seasonid,
                id: this.m_pkParent.id,
                name: this.m_pkParent.name,
                score: itemcount,
                icon: this.m_pkParent.icon,
                avatar: this.m_pkParent.avatar,
                igroup: this.m_pkParent.pvpMgr.groupId,
                is_vip: this.m_pkParent.baseInfo.is_vip,
                vip_level: this.m_pkParent.baseInfo.vip_level,
            });
    }
}
export { SeItemMgr };