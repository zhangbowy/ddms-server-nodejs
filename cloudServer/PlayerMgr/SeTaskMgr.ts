import { SePlayer } from "./SePlayer";
import { iApp } from '../app';
import { SeEnumTaskiType, SeEnumTaskiModule, SeEnumTaskiTimeProperty, SeEnumTaskiTab, SeEnumrechargeiProperty } from "../Res/interface";
import { TaskAction, EnumRaceType, BattleAction, SeMailType } from '../SeDefine';
import { SeTaskItem, SeItem, ShangJinState } from './SePlayerDef';
import { SeResTaskEx } from "../ResMgr/SeResMgr";
import { ReHash } from "./TePlayerLoader";
import { TeDate } from "../TeTool";
import { configInst } from "../lib/TeConfig";
declare var global: iApp;
export class SeTaskMgr {
    private _always_add_tasks: SeEnumTaskiModule[] = [];
    private _baseInfo: ReHash<any>;
    private _parent: SePlayer;
    private _typeHash: any;
    private _listener: any;
    constructor(parent: SePlayer) {
        this._parent = parent;
        this._listener = {};
        this._typeHash = {};

        this._registType(SeEnumTaskiType.WuJiangShengJi, TaskAction.HeroUp, -2);

        this._registType(SeEnumTaskiType.PaiWeiLianSheng, TaskAction.FightComplete, true, EnumRaceType.Pvp726, true);
        this._registType(SeEnumTaskiType.XiaoFeiZuanShi, TaskAction.UseMoney, -1);
        // this._registType(SeEnumTaskiType.LeiJiChongZhi, TaskAction.Recharge, -2);   // 累计充值任务  目前换实现了，所以注销掉老的 2018年8月2日
        this._registType(SeEnumTaskiType.ShouChong, TaskAction.FirstPay, -2);   // 累计充值任务

        this._registType(SeEnumTaskiType.ShiYongKaPai, TaskAction.Battle, BattleAction.UseCard);
        this._registType(SeEnumTaskiType.ChengChiShuChu, TaskAction.Battle, BattleAction.AttackBoss);


        this._registType(SeEnumTaskiType.XiaoHaoJinBi, TaskAction.UseGold, -1);
        this._registType(SeEnumTaskiType.GuanKanLuXiang, TaskAction.LookVideo, 1);
        this._registType(SeEnumTaskiType.HuoDeJiFen, TaskAction.GetPoint, -1);
        this._registType(SeEnumTaskiType.ShiYongBiaoQing, TaskAction.SayHello, 1);
        this._registType(SeEnumTaskiType.DengLuYouXi, TaskAction.Login, 1);

        // 战斗相关
        this._registType(SeEnumTaskiType.PiPeiShengLi, TaskAction.FightComplete, true, EnumRaceType.Pvp726);
        this._registType(SeEnumTaskiType.PiPeiPoCheng, TaskAction.FightBossKill, true, EnumRaceType.Pvp726);
        this._registType(SeEnumTaskiType.ZhanDouShengLi, TaskAction.FightComplete, true, -1);

        //巅峰赛
        this._registType(SeEnumTaskiType.ZhanDouCanYu, TaskAction.FightJoin);
        this._registType(SeEnumTaskiType.ZhengBaSaiShengLi, TaskAction.FightComplete, true, EnumRaceType.peakPvp);

        this._registType(SeEnumTaskiType.ZhengBaSaiFenShu, TaskAction.AddScore, -2);

        //赏金赛
        // this._registType(SeEnumTaskiType.PiPeiShengLi, TaskAction.FightComplete, true, EnumRaceType.shangjinPvp);
        // 开箱子相关
        this._registType(SeEnumTaskiType.KaiQiXiangZi, TaskAction.OpenBox, 1);
        this._registType(SeEnumTaskiType.KaiChuKaPai, TaskAction.OpenCard, true);

        // 好友相关
        this._registType(SeEnumTaskiType.ZengSongYueChi, TaskAction.GiveKey, 1);
        this._registType(SeEnumTaskiType.HaoYou1v1, TaskAction.FightComplete, null, EnumRaceType.olPvp);
        this._registType(SeEnumTaskiType.HaoYou2v2, TaskAction.FightComplete, null, EnumRaceType.olPvp);

        this._registType(SeEnumTaskiType.HuoQuDaoJu, TaskAction.AddItem);
        this._registType(SeEnumTaskiType.ShanChuDaoJu, TaskAction.DelItem);

        this._registType(SeEnumTaskiType.RenWuTongJi, TaskAction.FinishTask);
        this._registType(SeEnumTaskiType.GuanZhuTouTiaoHao, TaskAction.Foucs, 1);
        this._registType(SeEnumTaskiType.FenXiangShiPin, TaskAction.ShareVideo, 1);
        this._registType(SeEnumTaskiType.FenXiangYouXi, TaskAction.ShareText, 1);

        this._registType(SeEnumTaskiType.MeiRiLingJiang, TaskAction.AdAward);

        this._registType(SeEnumTaskiType.LianXuChongZhi, TaskAction.Recharge, -3);
        this._registType(SeEnumTaskiType.JinRuChangJingZhi, TaskAction.FromScene, -3);
        // 商城购买
        this._registType(SeEnumTaskiType.ShangChengGouMai, TaskAction.ShopBuy);
        this._registType(SeEnumTaskiType.WeiXinKeFuXiaoXi, TaskAction.WxMessage, -3);
        this._registType(SeEnumTaskiType.LeiJiChongZhiTianShu, TaskAction.Recharge, -3);
        //pve
        this._registType(SeEnumTaskiType.NanDuXingShu, TaskAction.PveStar);
        this._registType(SeEnumTaskiType.ZhuangBeiQiangHua, TaskAction.EquipEnhance);
        this._registType(SeEnumTaskiType.ZhuangBeiShengXing, TaskAction.EquipStar);
        this._registType(SeEnumTaskiType.ZhuangBeiShengXingJingYan, TaskAction.EquipExp);
        this._registType(SeEnumTaskiType.ZhuangBeiFuMo, TaskAction.EquipEnchant);
        this._registType(SeEnumTaskiType.SaoDangGuanKa, TaskAction.PveSweep);
        this._registType(SeEnumTaskiType.TongGuanGuanKa, TaskAction.PveWin);
        this._registType(SeEnumTaskiType.JinXingGuanKa, TaskAction.PveFight);
        this._registType(SeEnumTaskiType.HuoDeZhuangBei, TaskAction.EquipAdd);
        this._registType(SeEnumTaskiType.DanBiChongZhi, TaskAction.OnceRecharge, -2);
        this._registType(SeEnumTaskiType.ZongChongZhiEDu, TaskAction.HuiGuiRecharge, -1);
        this._registType(SeEnumTaskiType.TongMengJuanXian, TaskAction.GuildContribute);
        this._registType(SeEnumTaskiType.TongMengJuanKa, TaskAction.GuildHelp);
        this._registType(SeEnumTaskiType.FenXiangLianJie, TaskAction.ShareLink);
        this._registType(SeEnumTaskiType.ZhuHouFaDongPaiMing, TaskAction.PvePkRank, -2);

        this._always_add_tasks.push(SeEnumTaskiModule.JiFenXiangZi);
        this._always_add_tasks.push(SeEnumTaskiModule.WanChengShuaXin);
    }

    public initDb(d: ReHash<any>) {
        this._baseInfo = d;
    }

    public inittask() {
        this.updateTaskConfig(true);
    }

    public gettasklist(): any {
        var hash = this._baseInfo.value;
        var list = {};
        for (var kId in hash) {
            if (!hash[kId].hasOwnProperty("kId")) continue;
            list[kId] = hash[kId];
        }
        return { l: list, a: hash["accumulation"] };
    }

    /**
     * 初始化玩家任务数据，负责添加新的任务和删除不存在的任务，添加未完成的任务到任务处理器中
     * @param isInit 
     */
    private updateTaskConfig(isInit: boolean = false) {
        if (!this._baseInfo) return;
        this._listener = {};
        // 更新所有的任务
        let info = TaskModule.init_tasks(this._parent, this._baseInfo);
        let configHash = this._baseInfo.value;
        for (let kId in configHash) {
            let pkTaskRes = global.resMgr.getTaskRes(kId);
            let taskItem: SeTaskItem = this._baseInfo.get(kId);
            // 检查任务是否存在或者过期了
            if (pkTaskRes && pkTaskRes.iStatistics && taskItem) {
                // 积分箱子和每日刷新任务都需要独立累计的 或者可以一直进行下去的需要添加
                if (this._always_add_tasks.indexOf(pkTaskRes.iModule) != -1 || taskItem.value < pkTaskRes.iValue) {
                    this._addListener(pkTaskRes.iType);
                }
            }
        }

        if (!isInit && (info.update.length || info.add.length || info.del.length)) {
            this._syncTask(info.update, info.add, info.del);
        }
    }

    /**
     * 更新某个任务
     * @param iModule 
     */
    public updateModuleTask(notice: boolean, iModule: SeEnumTaskiModule, ...args: any[]) {
        let info = TaskModule.refresh_module(iModule, this._parent, this._baseInfo, ...args);

        // 变更后删除的需要移除监听
        for (let i = 0; i < info.removelisten.length; i++) {
            let rtaskid = info.removelisten[i];
            let taskres = global.resMgr.getTaskRes(rtaskid);
            if (taskres) {
                this._removeListener(taskres.iType);
            }
        }

        // 变更后增加的需要添加监听
        for (let i = 0; i < info.addlisten.length; i++) {
            let rtaskid = info.addlisten[i];
            let taskres = global.resMgr.getTaskRes(rtaskid);
            if (taskres) {
                this._addListener(taskres.iType);
            }
        }

        if (notice && (info.update.length || info.add.length || info.del.length)) {
            this._syncTask(info.update, info.add, info.del);
        }

        return info;
    }

    public doAction(action: TaskAction, ...arg) {
        if (!this._listener[action]) return;
        var updateList = [];
        var taskItem: SeTaskItem;
        var hash = this._baseInfo.value;
        for (var kId in hash) {
            if (!hash[kId].hasOwnProperty("kId")) continue;
            taskItem = this._checkTask(hash[kId], action, ...arg);
            if (taskItem) {
                updateList.push(taskItem);
                this._baseInfo.save(taskItem.kId, taskItem);
            }
        }
        if (updateList.length > 0) {
            this._syncTask(updateList);
            return true;
        }
    }

    /**
     * doAction 的翻版，但是这个不通知玩家
     * @param action 
     * @param arg 
     */
    public doAction_slince(action: TaskAction, ...arg) {
        if (!this._listener[action]) return;
        var updateList = [];
        var taskItem: SeTaskItem;
        var hash = this._baseInfo.value;
        for (var kId in hash) {
            if (!hash[kId].hasOwnProperty("kId")) continue;
            taskItem = this._checkTask(hash[kId], action, ...arg);
            if (taskItem) {
                updateList.push(taskItem);
                this._baseInfo.save(taskItem.kId, taskItem);
            }
        }
    }


    public getReward(kId: string, extinfo: string) {
        var taskItem: SeTaskItem = this._baseInfo.get(kId);
        if (!taskItem || taskItem.isGet) return false;
        var pkTaskRes = global.resMgr.getTaskRes(taskItem.kId);
        if (!pkTaskRes) return false;
        var value = this._getValue(taskItem, pkTaskRes);

        let curr = Date.now();
        if ((pkTaskRes.iTimeProperty & SeEnumTaskiTimeProperty.DuiRiQiYouXiao) == SeEnumTaskiTimeProperty.DuiRiQiYouXiao) {
            // 表示是总的这个时间段
            if (Date.parse(pkTaskRes.kStartTime) > curr || Date.parse(pkTaskRes.kEndTime) < curr) {
                return false;
            }
        }
        else if ((pkTaskRes.iTimeProperty & SeEnumTaskiTimeProperty.DuiShiJianYouXiao) == SeEnumTaskiTimeProperty.DuiShiJianYouXiao) {
            // 总的时间段也检查一下
            if (Date.parse(pkTaskRes.kStartTime) > curr || Date.parse(pkTaskRes.kEndTime) < curr) {
                return false;
            }

            // 表示是每天的这个时间段
            if (!TeDate.isInTime(Date.parse(pkTaskRes.kStartTime), Date.parse(pkTaskRes.kEndTime), curr)) {
                return false;
            }
        }

        if (value < pkTaskRes.iValue) return false;
        var award: Array<SeItem> = [];

        for (var i = 0; pkTaskRes.akAwards && i < pkTaskRes.akAwards.length; i++) {
            var arr = pkTaskRes.akAwards[i].split(",");
            if (arr.length >= 2) {
                award.push({ kItemID: arr[0], iPileCount: parseInt(arr[1]) });
            }
        }

        if ((pkTaskRes.iTimeProperty & SeEnumTaskiTimeProperty.JiangLiFaSongZhiYouXiang) == SeEnumTaskiTimeProperty.JiangLiFaSongZhiYouXiang) {
            global.playerMgr.onGiveMail(this._parent.plt, this._parent.id, SeMailType.SYSTEM, pkTaskRes.kDescription, award, 0, pkTaskRes.kName);
        }
        else {
            this._parent.addItems(award, 'task');
        }

        if (!isNaN(pkTaskRes.iPoints) && pkTaskRes.iPoints > 0) {
            this.doAction(TaskAction.GetPoint, pkTaskRes.iPoints);
        }
        taskItem.isGet = true;
        if (pkTaskRes.iModule == SeEnumTaskiModule.JiFenXiangZi) {
            this._baseInfo.del(kId);
            this.updateModuleTask(true, pkTaskRes.iModule, taskItem.value - pkTaskRes.iValue);
        }
        else if (pkTaskRes.iModule == SeEnumTaskiModule.MeiRiBaoXia) {
            this._baseInfo.del(kId);
            this._syncTask([], [], [taskItem]);
            this.updateModuleTask(true, pkTaskRes.iModule, taskItem);
        }
        else if (pkTaskRes.iModule == SeEnumTaskiModule.WanChengShuaXin) {
            taskItem = new SeTaskItem();
            taskItem.kId = pkTaskRes.kTaskID;
            taskItem.checkId = pkTaskRes.kCheckId;
            this._baseInfo.save(kId, taskItem);
            this._syncTask([taskItem]);
        }
        else {
            this._baseInfo.save(kId, taskItem);
            this._syncTask([taskItem]);
        }

        let iModule = pkTaskRes.content['iModule'] || 0;
        if (iModule) this._parent.taskAction(TaskAction.FinishTask, iModule);

        //有些任务需要领取了之后才能进行下一个任务
        if (pkTaskRes.iAccumulation) {
            var _acc = this._baseInfo.get('accumulation');
            if (!_acc[pkTaskRes.iModule]) _acc[pkTaskRes.iModule] = {};
            _acc[pkTaskRes.iModule][pkTaskRes.iGroup] = pkTaskRes.iIndex + 1;
            this._baseInfo.save('accumulation', _acc);
            global.netMgr.syncTaskacc(this._parent.linkid, pkTaskRes.iModule, pkTaskRes.iGroup, pkTaskRes.iIndex + 1);
        }

        global.logMgr.taskLog(this._parent, 'finish', kId);

        //赏金赛任务完成后重置赏金赛状态
        if(taskItem.kId.indexOf('SJS') != -1){
            this._parent.baseInfo.shangjinState = ShangJinState.NOENTER;
            this._parent.pvpMgr.refreshShangjinCount();
             //通知状态
            global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'shangjinState', this._parent.baseInfo.shangjinState);
        }        
        //盟军每日任务完成通知同盟
        if(pkTaskRes.iTab == SeEnumTaskiTab.MengJunTongMengRenWu && this._parent.m_guildMgr.guild_info.guild_id){
            this._parent.m_guildMgr.guild_opr({cmd: 'guild_opr', type: 'complete_task', id: this._parent.m_guildMgr.guild_info.guild_id, taskId: taskItem.kId});
            this._parent.m_guildMgr.addGuildTaskValue(taskItem.kId, -1);
        }
        return true;
    }

    public dailyFresh() {

        let dailyout = this.updateModuleTask(false, SeEnumTaskiModule.MeiRi);
        let nofresh = this.updateModuleTask(false, SeEnumTaskiModule.MeiRiShuaXin);

        this._syncTask([...dailyout.update, ...nofresh.update], [...dailyout.add, ...nofresh.add], [...dailyout.del, ...nofresh.del]);

        // 检查一下每日充值的任务
        this.doAction(TaskAction.Recharge, this._parent.tot_charge);
    }

    public refreshTask(taskId: string) {
        if(!this._baseInfo.get(taskId))return;
        let refreshCount = this._parent.dailyInfo.meiriTaskRefreshCount || 0;
        if (refreshCount > 0 && !this._parent.decMoney(parseInt(global.resMgr.getConfig('change_daily_task')), "refresh_Task")) {
            return;
        }
        this.updateModuleTask(true, SeEnumTaskiModule.MeiRi, true, taskId);
        this._parent.dailyInfo.meiriTaskRefreshCount =  refreshCount + 1;
        this._parent.updateDailyInfo();
    }

    public selectGuildTask(taskId: string){
        if(!this._baseInfo.get(taskId))return;
        let deleteList = [];
        let alltasks: { [taskid: string]: SeTaskItem } = this._baseInfo.value;
        for (let key in alltasks) {
            let taskItem = alltasks[key];
            let res = global.resMgr.getTaskRes(taskItem.kId);
            if(res && res.iModule == SeEnumTaskiModule.MeiRi && res.iTab == SeEnumTaskiTab.MengJunTongMengRenWu && taskItem.kId != taskId){
                deleteList.push(taskItem);
                this._baseInfo.del(taskItem.kId);
            }
        }
        this._syncTask([], [], deleteList);
        var taskItem: SeTaskItem = this._baseInfo.get(taskId);
        this._parent.m_guildMgr.addGuildTaskValue(taskId, taskItem.value);
        this._parent.dailyInfo.select_guild_task_id = taskId;
        this._parent.updateDailyInfo();
    }

    public chx_tmp_refresh(){
        let deleteList = [];
        let alltasks: { [taskid: string]: SeTaskItem } = this._baseInfo.value;
        for (let key in alltasks) {
            let taskItem = alltasks[key];
            let res = global.resMgr.getTaskRes(taskItem.kId);
            if(res && res.iModule == SeEnumTaskiModule.MeiRi && res.iTab == SeEnumTaskiTab.MengJunTongMengRenWu){
                deleteList.push(taskItem);
                this._baseInfo.del(taskItem.kId);
            }
        }
        this._syncTask([], [], deleteList);
        this._parent.dailyInfo.select_guild_task_id = "";
        this._parent.updateDailyInfo();
    }

    public baomingFresh(type :SeEnumTaskiTab){
        let out = this.updateModuleTask(false, SeEnumTaskiModule.BaoMingShuaXin, type);

        this._syncTask(out.update, out.add, out.del);
    }

    public setTaskValue_cheat(taskId: string, value: string | number) {
        if (taskId == undefined || taskId == null || taskId == '') return false;

        if (typeof value == 'string') {
            value = parseInt(value);
        }

        if (value < 0 || value == undefined || value == null || isNaN(value)) {
            return false;
        }

        if (!configInst.get('cheatmode')) {
            return false;
        }
        var pkTaskRes = global.resMgr.getTaskRes(taskId);
        if (!pkTaskRes) return false;

        let taskItem = this._baseInfo.get(pkTaskRes.kTaskID) as SeTaskItem;
        if (!taskItem) return false;
        taskItem.value = value;
        this._baseInfo.save(pkTaskRes.kTaskID, taskItem);
        this._syncTask([taskItem], null, null);
        return true;
    }

    /**作弊命令 */
    public addDailyTask(taskId?: string) {
        let pkTaskRes = global.resMgr.getTaskRes(taskId);
        if (!pkTaskRes) {
            // 任务不存在，那么刷新一下每日任务和积分箱子任务
            let alltasks: { [taskid: string]: SeTaskItem } = this._baseInfo.value;
            for (let key in alltasks) {
                let rInfo = alltasks[key];
                if (!rInfo || !rInfo.hasOwnProperty("kId")) continue;
                let taskres = global.resMgr.getTaskRes(rInfo.kId);
                if (taskres.iModule == SeEnumTaskiModule.JiFenXiangZi) {
                    this._baseInfo.del(rInfo.kId);
                }
            }

            this._baseInfo.save("preUpdateTime", 0);

            this.updateModuleTask(true, SeEnumTaskiModule.MeiRi);
            this.updateModuleTask(true, SeEnumTaskiModule.JiFenXiangZi);
        } else {
            let deleteList = [];
            // 只能修改固定的每日任务
            if (pkTaskRes.iModule != SeEnumTaskiModule.MeiRi) return;
            let hash = this._baseInfo.value;
            for (let kId in hash) {
                if (!hash[kId].hasOwnProperty("kId")) continue;
                let taskItem: SeTaskItem = hash[kId];
                let taskRes = global.resMgr.getTaskRes(taskItem.kId);
                if (taskRes && taskRes.iModule == SeEnumTaskiModule.MeiRi && taskRes.iGroup == pkTaskRes.iGroup) {
                    deleteList.push(taskItem);
                    this._baseInfo.del(taskItem.kId);
                    this._removeListener(pkTaskRes.iType);
                }
            }
            let taskItem = this._createTask(pkTaskRes);
            let addList = [taskItem];
            this._baseInfo.save(pkTaskRes.kTaskID, taskItem);
            this._addListener(pkTaskRes.iType);
            if ((addList && addList.length > 0) || (deleteList && deleteList.length > 0)) {
                this._syncTask(null, addList, deleteList);
            }
        }
    }

    private _checkTask(taskItem: SeTaskItem, action: TaskAction, ...arg): SeTaskItem {
        var pkTaskRes: SeResTaskEx = global.resMgr.getTaskRes(taskItem.kId);
        if (!pkTaskRes || !pkTaskRes.iStatistics || !this._typeHash[pkTaskRes.iType] || this._typeHash[pkTaskRes.iType][0] != action) return null;
        // 变更任务的时候判断下时候是按序的
        if (pkTaskRes.iAccumulation) {
            if (!this._baseInfo.get('accumulation')) {
                return null;
            }
            var _acc = this._baseInfo.get('accumulation');
            if (!_acc[pkTaskRes.iModule] || !_acc[pkTaskRes.iModule][pkTaskRes.iGroup] || _acc[pkTaskRes.iModule][pkTaskRes.iGroup] != pkTaskRes.iIndex) {
                return null;
            }
        }

        let nowTime = Date.now();
        if (TeDate.isdiffday(taskItem.freshtime, nowTime)) {
            taskItem.lastD = taskItem.value;
            taskItem.freshtime = nowTime;
        }

        // 变更任务数据的时候判断一下任务是否在有效期内，有效期内才能变动任务数据
        if (pkTaskRes.kStartTime && nowTime < Date.parse(pkTaskRes.kStartTime)) {
            // 统计时间还没开始
            return null;
        }

        if (pkTaskRes.kEndTime && nowTime > Date.parse(pkTaskRes.kEndTime)) {
            // 统计时间结束了
            return null;
        }

        if (this._parent.pvp_level < pkTaskRes.iPvpLv) return null;
        if (taskItem.value >= pkTaskRes.iValue && this._always_add_tasks.indexOf(pkTaskRes.iModule) == -1) return null;

        var typeArg = this._typeHash[pkTaskRes.iType];

        switch (action) {
            case TaskAction.FightJoin:
                var raceTypes = pkTaskRes.content["race_type"] ? pkTaskRes.content["race_type"].split(',') : [];
                var bwin = arg[1];
                var bwin_check = pkTaskRes.content["isWin"]? true: false;
                if(raceTypes.length == 0 && (!bwin_check || bwin_check == bwin)){
                    taskItem.value++;
                }
                else{
                    for(let k = 0; k < raceTypes.length; k++){
                        if (arg[0] == raceTypes[k] && (!bwin_check || bwin_check == bwin)) {
                            taskItem.value++;
                        }
                    }
                }
                break;
            case TaskAction.FightBossKill:
            case TaskAction.FightComplete: {
                var isWin = arg[0];
                var raceType: EnumRaceType = arg[1];
                let oppNum = arg[2];
                var gloryMatch = arg[3]; //跨服
                var isWin1 = typeArg[1];
                var raceType1 = typeArg[2];
                var iGloryMatch = pkTaskRes.content["iGloryMatch"]? pkTaskRes.content["iGloryMatch"] : 0;
                if (iGloryMatch != 0 && gloryMatch != iGloryMatch) return null;
                let oppNum1 = pkTaskRes.content["oppNum"] ? pkTaskRes.content["oppNum"] : 0;
                var isNeedLianSheng: boolean = typeArg[3];
                //如果oppNUM1为1，oppNum不为2，进度也加
                if(oppNum1 == 1 && oppNum !=2) oppNum = oppNum1;
                if (oppNum1 != 0 && oppNum != oppNum1) return null;
                if (raceType == raceType1 || raceType1 == -1 ) {
                    if (isNeedLianSheng) {
                        if (isWin) {
                            taskItem.value++;
                        } else {
                            taskItem.historyValue = Math.max(taskItem.value, taskItem.historyValue);
                            taskItem.value = 0;
                        }
                    }
                    else if (isWin1 == null) {
                        taskItem.value++;
                    } 
                    else if (isWin == isWin1) {
                        taskItem.value++;
                    }
                }
                else {
                    return null;
                }
                break;
            }
            case TaskAction.Battle: {
                var battleAction = arg[0];
                let oppNum = arg[2];
                let oppNum1 = pkTaskRes.content["oppNum"] ? pkTaskRes.content["oppNum"] : 0;
                if (oppNum1 != 0 && oppNum != oppNum1) return null;
                if (battleAction != typeArg[1]) return;
                if (battleAction == BattleAction.AttackBoss) {
                    taskItem.value += arg[1];
                } else if (battleAction == BattleAction.UseCard) {
                    var pkUnitRes = global.resMgr.UnitRes.getRes(arg[1]);
                    if (!pkUnitRes) return null;
                    if (pkTaskRes.content["minEnergy"] && pkUnitRes.iPreCD < pkTaskRes.content["minEnergy"]) {
                        return null;
                    }
                    if (pkTaskRes.content["maxEnergy"] && pkUnitRes.iPreCD > pkTaskRes.content["maxEnergy"]) {
                        return null;
                    }

                    if (pkTaskRes.content["soldierType"] && pkUnitRes.iSoldierType != pkTaskRes.content["soldierType"]) {
                        return null;
                    }

                    if (pkTaskRes.content["soldierTypes"]) {
                        var soldierTypes = pkTaskRes.content["soldierTypes"].split(",");
                        if (soldierTypes.indexOf(pkUnitRes.iSoldierType.toString()) == -1) {
                            return null;
                        }
                    }

                    if (pkTaskRes.content["iGroup"] && !(pkUnitRes.akGroupUnits && pkUnitRes.akGroupUnits.length > 1 && pkTaskRes.content["iGroup"] != 0)) {
                        return null;
                    }

                    if (pkTaskRes.content["unitId"] && pkUnitRes.kID != pkTaskRes.content["unitId"]) {
                        return null;
                    }

                    if (pkTaskRes.content["iColour"] && pkUnitRes.iColour != pkTaskRes.content["iColour"]) {
                        return null;
                    }
                    taskItem.value++;
                }
                break;
            }
            case TaskAction.OpenBox: {
                var boxlevel = arg[0];
                var boxtype = arg[1];
                var boxnum = arg[2];

                if (pkTaskRes.content["boxtype"] && boxtype != pkTaskRes.content["boxtype"]) {
                    return null;
                }
                if (pkTaskRes.content["boxlevel"] && boxlevel != pkTaskRes.content["boxlevel"]) {
                    return null;
                }

                taskItem.value += boxnum;
                break;
            }
            case TaskAction.OpenCard: {
                var colorList = arg[0];
                if (!pkTaskRes.content["iColour"]) return null;
                if (!colorList[pkTaskRes.content["iColour"]]) {
                    return null;
                }

                taskItem.value += colorList[pkTaskRes.content["iColour"]] || 0;
                break;
            }
            case TaskAction.AddItem:
            case TaskAction.DelItem: {
                var itemTypeID = arg[0];
                var itemtype = arg[1];
                var num = arg[2] || 1;

                if (!pkTaskRes.content["itemid"] && !pkTaskRes.content["itemtype"]) return null;

                if (pkTaskRes.content["itemid"] && pkTaskRes.content["itemid"] != itemTypeID) return null;
                if (pkTaskRes.content["itemtype"] && pkTaskRes.content["itemtype"] != itemtype) return null;

                taskItem.value += num;
                break;
            }
            case TaskAction.FinishTask: {
                var moduleID = arg[0];
                if (pkTaskRes.content["iModule"] && moduleID != pkTaskRes.content["iModule"]) {
                    return null;
                }
                taskItem.value++;
                break;
            }
            case TaskAction.HeroUp: {
                var pkUnitRes = global.resMgr.UnitRes.getRes(arg[0]);
                if (!pkUnitRes) return null;

                if (pkTaskRes.content["unitId"] && pkUnitRes.kID != pkTaskRes.content["unitId"]) {
                    return null;
                }
                if (typeArg[1] > 0) {
                    taskItem.value += typeArg[1];
                } else if (typeArg[1] == -1) {
                    taskItem.value += arg[1];
                }
                else if (typeArg[1] == -2) {
                    var vv = arg[1];
                    if (vv != Infinity && vv != null && vv != undefined) {
                        taskItem.value = Math.max(vv, taskItem.value);
                    }
                }
                else {
                    taskItem.value++;
                }
                break;
            }
            case TaskAction.ShopBuy: {
                if (pkTaskRes.content['shopMallId']){
                    let shopMallIds = pkTaskRes.content['shopMallId'].split(',');
                    for(let k = 0; k < shopMallIds.length; k++){
                        if(arg[0] == shopMallIds[k]){
                            taskItem.value += arg[1];
                        }
                    }
                }
                else{
                    taskItem.value += arg[1];
                }
                break;
            }
            case TaskAction.FromScene: {
                taskItem.value = arg[0];
                break;
            }
            case TaskAction.WxMessage: {
                taskItem.value = arg[0];
                break;
            }
            case TaskAction.PveStar:{
                if (!pkTaskRes.content["type"] || pkTaskRes.content["type"] != arg[0]) return null;
                taskItem.value += arg[1];
                break;
            }
            case TaskAction.EquipEnhance:{
                if (pkTaskRes.content["equipType"] && pkTaskRes.content["equipType"] != arg[1]) return null;
                if (pkTaskRes.content["iLevel"] && pkTaskRes.content["iLevel"] != arg[2]) return null;
                var iColor = pkTaskRes.content["iColor"] ? pkTaskRes.content["iColor"].split(',') : [];
                if(iColor.length == 0){
                    taskItem.value += arg[0];
                }
                else{
                    for(let k = 0; k < iColor.length; k++){
                        if (arg[3] == iColor[k]) {
                            taskItem.value += arg[0];
                        }
                    }
                }
                break;
            }
            case TaskAction.EquipStar:{
                if (pkTaskRes.content["equipType"] && pkTaskRes.content["equipType"] != arg[1]) return null;
                if (pkTaskRes.content["iStar"] && pkTaskRes.content["iStar"] != arg[2]) return null;
                var iColor = pkTaskRes.content["iColor"] ? pkTaskRes.content["iColor"].split(',') : [];
                if(iColor.length == 0){
                    taskItem.value += arg[0];
                }
                else{
                    for(let k = 0; k < iColor.length; k++){
                        if (arg[3] == iColor[k]) {
                            taskItem.value += arg[0];
                        }
                    }
                }
                break;
            }
            case TaskAction.EquipExp:{
                if (pkTaskRes.content["equipType"] && pkTaskRes.content["equipType"] != arg[1]) return null;
                if (pkTaskRes.content["iStarExp"] && pkTaskRes.content["iStarExp"] > arg[2]) return null;
                taskItem.value += arg[0];
                break;
            }
            case TaskAction.EquipEnchant:{
                if (pkTaskRes.content["equipType"] && pkTaskRes.content["equipType"] != arg[1]) return null;
                taskItem.value += arg[0];
                var iColor = pkTaskRes.content["iColor"] ? pkTaskRes.content["iColor"].split(',') : [];
                if(iColor.length == 0){
                    taskItem.value += arg[0];
                }
                else{
                    for(let k = 0; k < iColor.length; k++){
                        if (arg[2] == iColor[k]) {
                            taskItem.value += arg[0];
                        }
                    }
                }
                break;
            }
            case TaskAction.PveFight:{
                if (pkTaskRes.content["levelid"] && pkTaskRes.content["levelid"] != arg[1]) return null;
                taskItem.value += arg[0];
                break;
            }
            case TaskAction.PveWin:{
                if (pkTaskRes.content["levelid"] && pkTaskRes.content["levelid"] != arg[1]) return null;
                taskItem.value += arg[0];
                break;
            }
            case TaskAction.PveSweep:{
                if (pkTaskRes.content["levelid"] && pkTaskRes.content["levelid"] != arg[1]) return null;
                taskItem.value += arg[0];
                break;
            }
            case TaskAction.EquipAdd:{
                if (pkTaskRes.content["equipType"] && pkTaskRes.content["equipType"] != arg[1]) return null;
                if (pkTaskRes.content["iColour"] && pkTaskRes.content["iColour"] != arg[2]) return null;
                taskItem.value += arg[0];
                break;
            }
            case TaskAction.GuildContribute:{
                if (pkTaskRes.content["itemid"] && pkTaskRes.content["itemid"] != arg[1]) return null;
                if (pkTaskRes.content["iColor"] && pkTaskRes.content["iColor"] != arg[2]) return null;
                taskItem.value += arg[0];
                break;
            }
            case TaskAction.GuildHelp:{
                if (pkTaskRes.content["itemid"] && pkTaskRes.content["itemid"] != arg[1]) return null;
                if (pkTaskRes.content["iColor"] && pkTaskRes.content["iColor"] != arg[2]) return null;
                taskItem.value += arg[0];
                break;
            }
            default: {
                if (typeArg[1] > 0) {
                    taskItem.value += typeArg[1];
                } else if (typeArg[1] == -1) {
                    taskItem.value += arg[0];
                }
                else if (typeArg[1] == -2) {
                    var vv = arg[0];
                    if (vv != Infinity && vv != null && vv != undefined) {
                        taskItem.value = Math.max(vv, taskItem.value);
                    }
                }
                else if (typeArg[1] == -3) {
                    taskItem.value = this._getValue(taskItem, pkTaskRes);
                }
                else {
                    taskItem.value++;
                }
                break;
            }
        }

        if (pkTaskRes.iDayLimit) {
            taskItem.value = Math.min(taskItem.value, taskItem.lastD + pkTaskRes.iDayLimit);
        }

        if (taskItem.value >= pkTaskRes.iValue && this._always_add_tasks.indexOf(pkTaskRes.iModule) == -1) {
            this._removeListener(pkTaskRes.iType);
        }

        //先保存一下，防止自动领取的数据没刷新
        this._baseInfo.save(taskItem.kId, taskItem);
        //盟军每日任务通知同盟刷新
        if(pkTaskRes.iTab == SeEnumTaskiTab.MengJunTongMengRenWu && this._parent.m_guildMgr.guild_info.guild_id && this._parent.dailyInfo.select_guild_task_id && taskItem.kId == this._parent.dailyInfo.select_guild_task_id){
            this._parent.m_guildMgr.addGuildTaskValue(taskItem.kId, taskItem.value);
        }
        if ((pkTaskRes.iTimeProperty & SeEnumTaskiTimeProperty.ZiDongLingQu) == SeEnumTaskiTimeProperty.ZiDongLingQu && taskItem.value >= pkTaskRes.iValue && !taskItem.isGet) {      
            // 有自动领取特性的，那么完成的时候触发一个自动领取
            if (this.getReward(taskItem.kId, '')) {
                return this._baseInfo.get(taskItem.kId);
            }
            else {
                return taskItem;
            }
        }
        else {
            return taskItem;
        }

         
    }

    /**
     * 
     * @param type 任务类型
     * @param action 绑定激活动作
     * @param arg 默认第一个为每次激活增加value值，-1则为使用传入参数,-2 表示数值取传入值和当前值的较大者，特殊动作如FightComplete根据类型来,-3表示从getvalue中获取
     */
    private _registType(type: SeEnumTaskiType, action: TaskAction, ...arg) {
        if (!arg) {
            arg = [];
        }
        arg.unshift(action);
        this._typeHash[type] = arg;
    }

    private _addListener(type: SeEnumTaskiType) {
        var action = this._typeHash[type] ? this._typeHash[type][0] : null;
        if (action != null) {
            if (this._listener[action] == null) this._listener[action] = 0;
            this._listener[action]++;
        }
    }

    private _removeListener(type: SeEnumTaskiType) {
        var action = this._typeHash[type] ? this._typeHash[type][0] : null;
        if (action != null && this._listener[action] > 0) {
            this._listener[action]--;
        }
    }

    private _syncTask(updateList: Array<SeTaskItem>, addList?: Array<SeTaskItem>, delList?: Array<SeTaskItem>) {
        if (updateList.length == 0 && addList.length == 0 && delList.length == 0) return;

        var list: Array<any> = [];
        for (var i = 0; addList && i < addList.length; i++) {
            list.push(addList[i]);
        }
        updateList && updateList.length > 0 && (list = list.concat(updateList));

        global.netMgr.syncTask(this._parent.linkid, list, delList);
    }

    /**
     * 获取任务完成度
     * 如果任务是客户端判断的，完成度服务器要计算一边，目前 kstarttime kendtime 只支持累计充值
     * 如果是服务器判断的 有效期功能都支持
     * @param taskItem 
     * @param pkTaskRes 
     */
    private _getValue(taskItem: SeTaskItem, pkTaskRes: SeResTaskEx): number {
        if (!pkTaskRes) return 0;

        let taskStart = (pkTaskRes.kStartTime && Date.parse(pkTaskRes.kStartTime)) || 0;
        let taskEnd = (pkTaskRes.kStartTime && Date.parse(pkTaskRes.kEndTime)) || 0;

        var content = pkTaskRes.content;
        var value = 0;
        switch (pkTaskRes.iType) {
            // 武将数量统计
            case SeEnumTaskiType.WuJiangShuLiang:
                var heroCards = this._parent.heroCards;
                for (var j = 0; j < heroCards.length; j++) {
                    if (content["unitId"] && content["unitId"] != heroCards[j].kHeroID) continue;
                    if (content["iLevel"] && heroCards[j].iLevel < parseInt(content["iLevel"])) continue;
                    var pkHeroRes = global.resMgr.UnitRes.getRes(heroCards[j].kHeroID);
                    if (content["iColor"] && pkHeroRes.iColour < parseInt(content["iColor"])) continue;
                    value++;
                }
                break;
            case SeEnumTaskiType.DuanWeiTiSheng:
                value = this._parent.top_pvp_level;
                break;
            case SeEnumTaskiType.DuoWangJiFen:
                if (this._parent.top_pvp_level == global.resMgr.MaxLvl) {
                    value = this._parent.pvp_score;
                }
                break;
            case SeEnumTaskiType.YueKaWanJia:
                if (this._parent.isMonthVip) {
                    value = 1;
                }
                break;
            case SeEnumTaskiType.LeiJiChongZhi:
                // 这里要重新计算一下玩家的充值订单数据
                let orders = this._parent.rechargeOrders;
                for (let i = 0; i < orders.length; i++) {
                    let r_order = orders[i];
                    if (!r_order) continue;
                    if (taskStart && r_order.time < taskStart) continue;
                    if (taskEnd && r_order.time > taskEnd) continue;
                    value += r_order.amount;
                }
                value = Math.floor(value / 100);
                break;
            case SeEnumTaskiType.ZhuChengJiBie:
                value = this._parent.level;
                break;
            case SeEnumTaskiType.DiTuTongGuan:
                if (pkTaskRes.content) {
                    value = this._parent.getMapCount(true, pkTaskRes.content.mapID).win;
                }
                break;
            case SeEnumTaskiType.LianXuChongZhi: {
                // 需要遍历充值项查询是否满足连续充值天数
                let recharge_list = [];
                let orders = this._parent.rechargeOrders;
                let curr = Date.now();
                for (let i = 0; i < orders.length; i++) {
                    let r_order = orders[i];
                    if (!r_order) continue;
                    if (taskStart && r_order.time < taskStart) continue;
                    if (taskEnd && r_order.time > taskEnd) continue;
                    let diffDate = TeDate.daydiff(r_order.time, curr);
                    recharge_list[Math.abs(diffDate)] = 1;
                }

                value = recharge_list[0] || 0;
                for (let i = 1; i < recharge_list.length; i++) {
                    if (recharge_list[i] != 1) break;
                    value++;
                }
                break;
            }
            case SeEnumTaskiType.LeiJiChongZhiTianShu: {
                // 需要遍历充值项查询是否满足累计充值天数
                let recharge_list = [];
                let orders = this._parent.rechargeOrders;
                let curr = Date.now();
                for (let i = 0; i < orders.length; i++) {
                    let r_order = orders[i];
                    if (!r_order) continue;
                    if (taskStart && r_order.time < taskStart) continue;
                    if (taskEnd && r_order.time > taskEnd) continue;
                    let pkmail = global.resMgr.ShopMallRes.getRes(r_order.mailid);
                    if (pkmail && pkmail.akContent) {
                        let pkRes = global.resMgr.RechargeRes.getRes(pkmail.akContent[0]);
                        if(pkRes && pkRes.iProperty == SeEnumrechargeiProperty.BuJiRuLeiJiChongZhiTianShu) continue;
                    }
                    let diffDate = TeDate.daydiff(r_order.time, curr);
                    recharge_list[Math.abs(diffDate)] = 1;
                }

                value = recharge_list[0] || 0;
                for (let i = 1; i < recharge_list.length; i++) {
                    if (recharge_list[i] == 1){
                        value++;
                    }
                }
                break;
            }
            default: {
                if (pkTaskRes.iStatistics) value = taskItem.value;
                break;
            }
        }


        return value;
    }

    public _checkTaskCanComplete(pkTaskRes: SeResTaskEx): boolean {
        if (pkTaskRes.content["soldierTypes"]) {
            var soldierTypes = pkTaskRes.content["soldierTypes"].split(",");
            var allHeros = this._parent.heroCards;
            for (var i = 0; i < allHeros.length; i++) {
                var pkUnitRes = global.resMgr.UnitRes.getRes(allHeros[i].kHeroID);
                if (!pkUnitRes) continue;
                if (soldierTypes.indexOf(pkUnitRes.iSoldierType.toString()) != -1) {
                    return true;
                }
            }
            return false;
        }

        if (pkTaskRes.content["unitId"] && !this._parent.getHeroCard(pkTaskRes.content["unitId"])) {
            return false
        }

        if (pkTaskRes.content["iGroup"] != null) {
            var allHeros = this._parent.heroCards;
            for (var i = 0; i < allHeros.length; i++) {
                var pkUnitRes = global.resMgr.UnitRes.getRes(allHeros[i].kHeroID);
                if (!pkUnitRes) continue;
                if (pkUnitRes.akGroupUnits && pkUnitRes.akGroupUnits.length > 1 && pkTaskRes.content["iGroup"] != 0) {
                    return true;
                }
            }
            return false;
        }

        if (pkTaskRes.content["iColour"] != null) {
            var allHeros = this._parent.heroCards;
            for (var i = 0; i < allHeros.length; i++) {
                var pkUnitRes = global.resMgr.UnitRes.getRes(allHeros[i].kHeroID);
                if (!pkUnitRes) continue;
                if (pkUnitRes.iColour == pkTaskRes.content["iColour"]) {
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    private _createTask(pkTaskRes: SeResTaskEx): SeTaskItem {
        var newItem = new SeTaskItem();
        newItem.kId = pkTaskRes.kTaskID;
        newItem.checkId = pkTaskRes.kCheckId;
        newItem.value = 0;
        newItem.isGet = false;
        newItem.historyValue = 0;
        newItem.lastD = 0;
        newItem.freshtime = 0;
        return newItem;
    }

    /**
     * 老赛季结算使用的接口，负责清理掉老的数据
     */
    public seasion_finish_call() {
        var hash = this._baseInfo.value;
        var list = {};

        var clearTaskIDs = [];

        for (var kId in hash) {
            if (!hash[kId].hasOwnProperty("kId")) continue;
            var taskRes = global.resMgr.getTaskRes(kId);
            if (!taskRes) continue;
            if (taskRes.iModule != SeEnumTaskiModule.HuoDong) continue;
            var rTask = <SeTaskItem>hash[kId];
            clearTaskIDs.push(kId);

            rTask.value = this._getValue(rTask, global.resMgr.getTaskRes(rTask.kId));
            if (!rTask.value) continue;
            list[kId] = hash[kId];
        }

        this._baseInfo.del(clearTaskIDs)
        return list;
    }

    /**
    * 新赛季开始使用的接口
    */
    public seasion_start_call() {
        this._listener = {};
        this.updateTaskConfig(true);
    }
}

interface ifRefreshResult { type: 'add' | 'refresh' | 'newrefresh' | 'del', task: SeTaskItem }

/**返回值的type: 添加 刷新 刷新同时添加任务监听 删除 */
interface ifRefreshFunc {
    (player: SePlayer, db: ReHash<any>, taskres: { [taskid: string]: SeResTaskEx }, taskinfo: { [taskid: string]: SeTaskItem }, ...args: any[]): ifRefreshResult[]
}

export class TaskModule {

    private static refresh_pools: { [iModule: number]: ifRefreshFunc } = {};

    static regist_pool(module: string | number, refresh: ifRefreshFunc) {
        this.refresh_pools[module] = refresh;
    }

    static load_module() {
        require("./tasktypes/common")
        require("./tasktypes/jifenxiangzi")
        require("./tasktypes/meiri")
        require("./tasktypes/meiribaoxiang")
        require("./tasktypes/meirishuaxin")
        require("./tasktypes/baomingshuaxin")
        require("./tasktypes/huiguishuaxin")
    }

    /**
     * 初始化玩家数据，负责数据库的操作了
     * @param taskDB 
     * @param tot_tasks 
     */
    static init_tasks(player: SePlayer, taskDB: ReHash<any>) {
        // 先清理一遍玩家的任务数据，按照module分类一下
        let classify_out = this.classify(taskDB);

        // 处理每个类型的数据的更新
        let refresh_out = this.refresh(player, taskDB, classify_out.info);

        // 汇总结果
        refresh_out.del.push(...classify_out.del);

        // 把所有要删除的数据删除一下，
        let db_del_list: string[] = [];
        for (let i = 0; i < refresh_out.del.length; i++) {
            db_del_list.push(refresh_out.del[i].kId);
        }

        // 汇总所有需要保存的数据
        let msave_list: { k: string, v: any }[] = [];
        for (let i = 0; i < refresh_out.add.length; i++) {
            msave_list.push({ k: refresh_out.add[i].kId, v: refresh_out.add[i] });
        }

        for (let i = 0; i < refresh_out.update.length; i++) {
            msave_list.push({ k: refresh_out.update[i].kId, v: refresh_out.update[i] });
        }

        // 更新和删除数据库数据
        taskDB.msave(msave_list);
        taskDB.del(db_del_list);
        // 返回需要通知玩家的数据

        // 数据库操作好了，处理一下连续性任务
        let hash = taskDB.value;
        let noClearAccByGroup = {};
        if (!hash['accumulation']) {
            hash['accumulation'] = {};
        }

        for (let kId in hash) {
            if (!hash[kId].hasOwnProperty("kId")) continue;
            let taskItem: SeTaskItem = hash[kId];
            let pkTaskRes = global.resMgr.getTaskRes(taskItem.kId);
            if (!pkTaskRes || !pkTaskRes.iAccumulation) continue;
            if (!noClearAccByGroup[pkTaskRes.iModule]) noClearAccByGroup[pkTaskRes.iModule] = {};
            if (!noClearAccByGroup[pkTaskRes.iModule][pkTaskRes.iGroup]) noClearAccByGroup[pkTaskRes.iModule][pkTaskRes.iGroup] = 1;
            //不存在的任务状态初始化一下
            if (!hash['accumulation'][pkTaskRes.iModule]) hash['accumulation'][pkTaskRes.iModule] = {};
            if (!hash['accumulation'][pkTaskRes.iModule][pkTaskRes.iGroup]) hash['accumulation'][pkTaskRes.iModule][pkTaskRes.iGroup] = 1;
        }

        for (let imodule in hash['accumulation']) {
            for (let group in hash['accumulation'][imodule]) {
                if (!noClearAccByGroup[imodule] || !noClearAccByGroup[imodule][group]) {
                    delete hash['accumulation'][imodule][group];
                }
            }
        }

        taskDB.save('accumulation', hash['accumulation']);

        return refresh_out;
    }

    /**
     * 分析任务数据，负责删除不存在的任务和分类任务，方便做后续的处理
     * @param taskDB 
     */
    private static classify(taskDB: ReHash<SeTaskItem>) {
        let del_task_infos: SeTaskItem[] = [];
        let task_info_module_map: { [iModule: number]: { [taskid: string]: SeTaskItem } } = {}

        let tot_values = taskDB.value;
        // 遍历玩家身上的任务，找出不存在了的任务
        for (let key in tot_values) {
            let r_task = tot_values[key] as SeTaskItem;
            if (!r_task.hasOwnProperty('kId')) continue;
            let pk_task_res = global.resMgr.getTaskRes(r_task.kId);
            if (!pk_task_res) {
                // 表示任务不存在了
                del_task_infos.push(r_task);
                continue;
            }

            // 收集已经存在了的任务
            if (!task_info_module_map[pk_task_res.iModule]) task_info_module_map[pk_task_res.iModule] = {}
            task_info_module_map[pk_task_res.iModule][pk_task_res.kTaskID] = r_task;
        }

        // 返回整理后的任务数据和废弃了的任务数据
        return { info: task_info_module_map, del: del_task_infos }
    }

    /**
     * 负责归类数据的重置和刷新，附加等操作
     * @param task_res_module_map 对应的模块任务
     * @param task_info_module_map 对应的模块数据
     * @returns [update_list, add_list, del_list]
     */
    private static refresh(player: SePlayer, db: ReHash<any>, task_info_module_map: { [iModule: number]: { [taskid: string]: SeTaskItem } }) {
        let add_list: SeTaskItem[] = [];
        let del_list: SeTaskItem[] = [];
        let update_list: SeTaskItem[] = [];


        let task_res_module_map = global.resMgr.getTaskMaps();
        // 遍历任务数据
        for (let kModule in task_res_module_map) {
            let task_res_module = task_res_module_map[kModule];
            let iModule = parseInt(kModule);

            // 找到注册的任务处理方法
            let refresh_func = this.refresh_pools[iModule] || this.refresh_pools['common'];

            // 人物刷新
            let outinfos: ifRefreshResult[] = refresh_func(player, db, task_res_module, task_info_module_map[iModule] || {});
            if (!outinfos) continue;
            // 分析结果，整理增删改的内容
            for (let i = 0; i < outinfos.length; i++) {
                let rinfo = outinfos[i];
                if (rinfo.type == 'add') {
                    add_list.push(rinfo.task);
                }
                else if (rinfo.type == 'del') {
                    del_list.push(rinfo.task);
                }
                else {
                    update_list.push(rinfo.task);
                }
            }
        }

        // 这里需要通知数据库操作数据了
        return { update: update_list, add: add_list, del: del_list }
    }

    static refresh_module(iModule: SeEnumTaskiModule, player: SePlayer, taskDB: ReHash<any>, ...args: any[]) {
        let add_list: SeTaskItem[] = [];
        let del_list: SeTaskItem[] = [];
        let update_list: SeTaskItem[] = [];

        let addListenIds: string[] = [];
        let removeListenIds: string[] = [];

        let moduletaskinfo: { [taskid: string]: SeTaskItem } = {};
        let resModuleTasks = global.resMgr.getTaskAllRes(iModule);
        for (let key in resModuleTasks) {
            let resinfo = resModuleTasks[key];
            let dbinfo = taskDB.get(resinfo.kTaskID);
            if (dbinfo) moduletaskinfo[resinfo.kTaskID] = taskDB.get(resinfo.kTaskID);
        }
            
        

        // 找到注册的任务处理方法
        let refresh_func = this.refresh_pools[iModule] || this.refresh_pools['common'];
        let outinfos: ifRefreshResult[] = refresh_func(player, taskDB, resModuleTasks, moduletaskinfo, ...args);
        // 分析结果，整理增删改的内容
        for (let i = 0; i < outinfos.length; i++) {
            let rinfo = outinfos[i];
            if (rinfo.type == 'add') {
                add_list.push(rinfo.task);
                addListenIds.push(rinfo.task.kId)
            }
            else if (rinfo.type == 'del') {
                del_list.push(rinfo.task);
                removeListenIds.push(rinfo.task.kId);
            }
            else {
                if (rinfo.type == 'newrefresh') {
                    addListenIds.push(rinfo.task.kId)
                }
                update_list.push(rinfo.task);
            }
        }

        let refresh_out = { update: update_list, add: add_list, del: del_list, addlisten: addListenIds, removelisten: removeListenIds };
        // 把所有要删除的数据删除一下，
        let db_del_list: string[] = [];
        for (let i = 0; i < refresh_out.del.length; i++) {
            db_del_list.push(refresh_out.del[i].kId);
        }

        // 汇总所有需要保存的数据
        let msave_list: { k: string, v: any }[] = [];
        for (let i = 0; i < refresh_out.add.length; i++) {
            msave_list.push({ k: refresh_out.add[i].kId, v: refresh_out.add[i] });
        }

        for (let i = 0; i < refresh_out.update.length; i++) {
            msave_list.push({ k: refresh_out.update[i].kId, v: refresh_out.update[i] });
        }

        // 更新和删除数据库数据
        taskDB.msave(msave_list);
        taskDB.del(db_del_list);

        // 这里需要通知数据库操作数据了
        return refresh_out;
    }

    static create_task(pkTaskRes: SeResTaskEx): SeTaskItem {
        var newItem = new SeTaskItem();
        newItem.kId = pkTaskRes.kTaskID;
        newItem.checkId = pkTaskRes.kCheckId;
        newItem.value = 0;
        newItem.isGet = false;
        newItem.historyValue = 0;
        newItem.lastD = 0;
        newItem.freshtime = 0;
        return newItem;
    }
}
