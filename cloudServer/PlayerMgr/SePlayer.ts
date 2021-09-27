import * as TableRes from "../Res/interface";
import { SeResUnit, SeResTownItem, SeEnumTownItemeTypeA, SeEnumnoticetexteType, SeEnumTownItemiProperty, SeResrecharge, SeResSystemMail, SeEnumTownBuffereType, SeEnumTaskiTab } from "../Res/interface";
import { SeItemMgr } from './SeItemMgr';
import { SeHeroCard, SeBaseCharInfo, SeItem, RechargeInfo, LockType, SeDailyInfo,SeFlipLottery, DEFINE, DeAddDelItemReason, ShangJinState, SeToyInfo, SeNewYearTreasure } from './SePlayerDef';
import { SeHeroCardMgr } from './SeHeroCardMgr';
import { CharState, SeCharLoadFlag, SeLogicFormation, SeCharMailInfo, SeDBInfoHead, SeChartType, SeMailType, SeNationTypeNames, IFLoginInfo, SeRaceOpp, ifRecharge1, TaskAction, NameCheckCode, BattleAction, PlayerProperty, NumType, ifExtInfo, SCORE_INIT_VALUE, SeGuildPlayer, toy_totcharge_100, PVE_PK_INIT_VALUE } from '../SeDefine';
import { iApp } from "../app";
import { SeShopMgr, ifOpenBoxUnit } from './SeShopMgr';
import { SePvpMgr } from './SePvpMgr';
import { SeEquipMgr } from './SeEquipMgr';
import { SeResUnitEx, SeResSeasonEx } from "../ResMgr/SeResMgr";
import { configInst } from '../lib/TeConfig';
import { TeDate, formationName, arrayRandomT, getByteLen, LangID } from '../TeTool';
import { DBLoader, mysqlLoaderInst, ReHash, ReList } from './TePlayerLoader';
import { SeTaskMgr } from './SeTaskMgr';
import { SeBufferMgr } from './SeBuffMgr';
import { SeFriendMgr } from "./SeFriendMgr";
import { UpgradeLib } from "./VerUpgrade";
import { SeEnumrechargeiProperty } from "../Res/interface";
import { createHash } from "crypto";
import { SeMailMgr, SeMailMgrV2 } from "./SeMailMgr";
import { SePveMgr } from "./SePveMgr";
import { SeSignMgr } from "./SeSignMgr";
import { SeCallBackMgr } from "./SeCallBackMgr";
import { SePveNewMgr } from "./SePveNewMgr";
import { SeGuildMgr } from "./SeGuildMgr";
var http = require('http');

declare var global: iApp;
export class SePlayer {
    public linkid: string;
    public account: string;
    public _state: any;
    public loadflag: number = 0;
    public needdelete: number = 0;

    bInitComplete = false;

    // //每个业务动作(每次请求)获得的物品,请求开始前清零
    // tmp_items: {[item: string]: number};

    get state() {
        return this._state;
    }

    set state(v) {
        this._state = v;
    }

    get baseInfoDB(): ReHash<any> {
        return this.m_kDBLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
    }
    public baseInfo: SeBaseCharInfo = new SeBaseCharInfo();

    get offline_mailInfoDB(): ReList<any> {
        return this.m_kDBLoader.getDB<ReList<any>>(SeDBInfoHead.mailInfo);
    }

    get pvpDb(): ReHash<any> {
        return this.m_kDBLoader.getDB<ReHash<any>>(SeDBInfoHead.pvpInfo);
    }

    get rechargeDB(): ReHash<any> {
        return this.m_kDBLoader.getDB<ReHash<any>>(SeDBInfoHead.rechargeInfo);
    }

    get taskDb(): ReHash<any> {
        return this.m_kDBLoader.getDB<ReHash<any>>(SeDBInfoHead.taskinfo);
    }

    get shopDb(): ReHash<any> {
        return this.m_kDBLoader.getDB<ReHash<any>>(SeDBInfoHead.shopinfo);
    }


    public m_pkItemMgr: SeItemMgr = new SeItemMgr(this);
    public m_pkHeroCardMgr: SeHeroCardMgr = new SeHeroCardMgr(this);
    public m_shangjinHeroCardMgr: SeHeroCardMgr = new SeHeroCardMgr(this);
    public m_pkShopMgr: SeShopMgr = new SeShopMgr(this);
    public pvpMgr: SePvpMgr = new SePvpMgr(this);
    public m_taskMgr: SeTaskMgr = new SeTaskMgr(this);
    public m_buffMgr: SeBufferMgr = new SeBufferMgr(this);
    public friendMgr: SeFriendMgr = new SeFriendMgr(this);
    public pveMgr: SePveMgr = new SePveMgr(this);
    public pveNewMgr: SePveNewMgr = new SePveNewMgr(this);
    public m_equipMgr: SeEquipMgr = new SeEquipMgr(this);
    public m_signMgr: SeSignMgr = new SeSignMgr(this);
    public m_guildMgr: SeGuildMgr = new SeGuildMgr(this);
    public m_callbackMgr: SeCallBackMgr = new SeCallBackMgr(this);

    public mailMgr: SeMailMgr = new SeMailMgrV2(this);

    public loginInfo: IFLoginInfo;

    public maxRobinfo: { maxFood: number, maxGold: number };        // 这里当作临时数据记录好了，不用记录到数据库了

    m_kDBLoader: DBLoader;

    plt: string = 'sdw';

    setRaceID(arg0: any): any {
        this.pvpMgr.setRaceID(arg0);
    }

    constructor(charid: number, account: string, plt: string) {
        this.plt = configInst.get("plt");
        this.account = account;
        this.baseInfo = new SeBaseCharInfo({ charid: charid });
        this.baseInfo.charid = charid;

        this.m_kDBLoader = mysqlLoaderInst.getLoader(charid);

        var nationType: number = Math.round(Math.random() * 2);
        this.baseInfo.nation = SeNationTypeNames[nationType];

        this.loadReload();

        // this.m_kDBLoader.once(SeCharLoadFlag.baseinfo.toString(), this.loadbaseInfo.bind(this));
    }


    private _loaderComplete(bSucc: boolean) {
        if (!bSucc) {
            // 一般不会出现
        }

        if (!this.loadbaseInfo(bSucc)) {
            bSucc = false;
        }

        if (bSucc) {
            this.loadPvpInfo(bSucc);
            this.loadTaskInfo(bSucc);
            this.loadShopInfo(bSucc);
            this.operateLoading(SeCharLoadFlag.dbcomplete);
        }
    }

    // 刷新数据
    freshkey(key: string) {
        let keys = key.split('.');
        if (keys.length < 2) return;
        switch (keys[0].toLowerCase()) {
            case 'baseinfo':
                if (this.baseInfo.hasOwnProperty(keys[1])) {
                    this.baseInfo[keys[1]] = this.baseInfoDB.get(keys[1]);
                }
                break;
            default:
                console.log("no operate " + keys[0]);
                break;
        }
    }

    get dailyInfo() {
        if (TeDate.isdiffday(this.baseInfo.dailyInfo.freshTime)) {
            this.baseInfo.dailyInfo = new SeDailyInfo();
            this.saveBaseInfo('dailyInfo');
            this.updateDailyInfo();
        }

        return this.baseInfo.dailyInfo;
    }

    updateDailyInfo() {
        this.saveBaseInfo('dailyInfo');
        if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'dailyinfo', this.dailyInfo);
    }


    get flipLottery() {
        //翻牌子时间
        var activity = global.resMgr.getActivityByType(TableRes.SeEnumActivityeType.JieRiFanPai);
        if(activity && Date.parse(activity.kStartTime) < Date.now() && Date.parse(activity.kEndTime) > Date.now()){
            //如果是上一期的活动，都删除
            for(var key in this.baseInfo.flipLotterys){
                if(!this.baseInfo.flipLotterys[key].freshTime || this.baseInfo.flipLotterys[key].freshTime < Date.parse(activity.kStartTime)){
                    delete this.baseInfo.flipLotterys[key];
                }
            }
            //shopmall获取类型刷新天数，如果是每日刷新，刷新时间填当日0点，隔日刷新需要判断当前是第一天还是第二天，填第一天0点
            let shopMalls = global.resMgr.getShopMailByType(TableRes.SeEnumShopMalleType.JieRiFanPai);
            for(var key in shopMalls){
                let flipLottery = this.baseInfo.flipLotterys[shopMalls[key].kID];
                if(!flipLottery){
                    flipLottery = {
                        id: shopMalls[key].kID,
                        refreshDay: 0,
                        //特殊奖励张数限制
                        minNumLimit: 0,
                        maxNumLimit: 0,
                        heroBoxZZYid: shopMalls[key].kAdContent,
                        lotterys: [],
                        refreshCount: 0,
                        isBought: 0
                    }
                    switch(shopMalls[key].eFreshType){
                        case TableRes.SeEnumShopMalleFreshType.MeiRi:
                            flipLottery.refreshDay = 1;
                            flipLottery.minNumLimit = Number(global.resMgr.getConfig('card_need_low').split(',')[0]);
                            flipLottery.maxNumLimit = Number(global.resMgr.getConfig('card_need_low').split(',')[1]);
                            break;
                        case TableRes.SeEnumShopMalleFreshType.MeiLiangRi:
                            flipLottery.refreshDay = 2;
                            flipLottery.minNumLimit = Number(global.resMgr.getConfig('card_need_high').split(',')[0]);
                            flipLottery.maxNumLimit = Number(global.resMgr.getConfig('card_need_high').split(',')[1]);
                            break;
                        case TableRes.SeEnumShopMalleFreshType.MeiSanRi:
                            flipLottery.refreshDay = 3;
                            flipLottery.minNumLimit = Number(global.resMgr.getConfig('card_need_high').split(',')[0]);
                            flipLottery.maxNumLimit = Number(global.resMgr.getConfig('card_need_high').split(',')[1]);
                            break;
                        case TableRes.SeEnumShopMalleFreshType.MeiSiRi:
                            flipLottery.refreshDay = 4;
                            flipLottery.minNumLimit = Number(global.resMgr.getConfig('card_need_top').split(',')[0]);
                            flipLottery.maxNumLimit = Number(global.resMgr.getConfig('card_need_top').split(',')[1]);
                            break;
                        case TableRes.SeEnumShopMalleFreshType.BuShuaXin:
                            flipLottery.minNumLimit = Number(global.resMgr.getConfig('card_need_top').split(',')[0]);
                            flipLottery.maxNumLimit = Number(global.resMgr.getConfig('card_need_top').split(',')[1]);
                            break;
                    }
                    flipLottery = this._refreshFlipLottery(flipLottery, true, true, activity.kStartTime);
                    this.baseInfo.flipLotterys[shopMalls[key].kID] = flipLottery;
                }
                else{
                    //判断是否需要刷新
                    if((flipLottery.refreshDay == 1 && TeDate.isdiffday(flipLottery.freshTime)) || (flipLottery.refreshDay == 2 && TeDate.daydiff(flipLottery.freshTime) >=2) || (flipLottery.refreshDay == 3 && TeDate.daydiff(flipLottery.freshTime) >=3) || (flipLottery.refreshDay == 4 && TeDate.daydiff(flipLottery.freshTime) >=4)){
                        //刷新时间在活动开始之前的
                        // if(TeDate.daydiff(flipLottery.freshTime) >=7){
                        if(flipLottery.freshTime < activity.kStartTime){
                            flipLottery = this._refreshFlipLottery(flipLottery, true, true, activity.kStartTime);
                        }
                        else{
                            flipLottery = this._refreshFlipLottery(flipLottery, true, false, activity.kStartTime);
                        }
                        
                    }
                    
                }
            }
            this.saveBaseInfo('flipLotterys');
        }
        return this.baseInfo.flipLotterys;
    }

    public openLottery(mallId: string, location: string){
        let locations = location.split(",");
        for(var key in locations){
            if(this.baseInfo.flipLotterys[mallId].lotterys[locations[key]]){
                this.baseInfo.flipLotterys[mallId].lotterys[locations[key]].isOpen = 1;
            }
        }
        this.saveBaseInfo('flipLotterys');
    }

    //手动刷新
    public refreshFlipLottery(mallId: string){
        let refreshCount = this.baseInfo.flipLotterys[mallId].refreshCount;
        var price = Math.min((Math.ceil(refreshCount / 5)) * 10, 50);
        if (price > 0 && !this.decMoney(price, "refresh_" + mallId)) {
            return;
        }
        this.baseInfo.flipLotterys[mallId].refreshCount++;
        this.baseInfo.flipLotterys[mallId] = this._refreshFlipLottery(this.baseInfo.flipLotterys[mallId], false, false);
        this.saveBaseInfo('flipLotterys');
        return this.baseInfo.flipLotterys[mallId];
    }
    //刷新翻牌子
    private _refreshFlipLottery(flipLottery: SeFlipLottery, dailyFresh: boolean = false, firstFresh: boolean, startTime?: string) {
        var upNeedHeros = [];
        flipLottery.lotterys.splice(0,flipLottery.lotterys.length);
        //检查阵容
        var card_types;
        if(firstFresh){
            //首次开盒，必得
            card_types = global.resMgr.getConfig("card_types_first").split(',');
        }
        else{
            card_types = global.resMgr.getConfig("card_types").split(',');
        }
        
        for(var key in  card_types){
            let upNeedNum = this.m_pkHeroCardMgr.check_card_num_limit(card_types[key], flipLottery.heroBoxZZYid);
            if(upNeedNum && upNeedNum >= flipLottery.minNumLimit && upNeedNum <= flipLottery.maxNumLimit){
                upNeedHeros.push({heroId: card_types[key], upNeedNum: upNeedNum});
            }
            // else if(firstFresh){
            //     upNeedHeros.push({heroId: card_types[key], upNeedNum: flipLottery.maxNumLimit});
            // }
        }
        var lucky_cards = [];
        //日常刷新才有特殊奖励
        if(upNeedHeros.length > 0 && dailyFresh){
            //随机获取一个特殊奖励
            let upNeedHero = upNeedHeros[Math.floor(Math.random() * (upNeedHeros.length - 1))];
            let lottery = {
                item: upNeedHero.heroId,
                num: upNeedHero.upNeedNum,
                type: 2,
                isOpen: 0
            }
            flipLottery.lotterys.push(lottery);
            //获取1-3级奖励
            
            if(flipLottery.heroBoxZZYid == 'HD01'){
                lucky_cards = this.m_pkShopMgr._rand_cards_('HD03'); 
            } 
            else if(flipLottery.heroBoxZZYid == 'HD02'){
                lucky_cards = this.m_pkShopMgr._rand_cards_('HD04'); 
            }
            if(flipLottery.heroBoxZZYid == 'HD05'){
                lucky_cards = this.m_pkShopMgr._rand_cards_('HD07'); 
            } 
            else if(flipLottery.heroBoxZZYid == 'HD06'){
                lucky_cards = this.m_pkShopMgr._rand_cards_('HD08'); 
            }
            else if(flipLottery.heroBoxZZYid == 'HD09'){
                lucky_cards = this.m_pkShopMgr._rand_cards_('HD10'); 
            }
            else if(flipLottery.heroBoxZZYid == 'HD11'){
                lucky_cards = this.m_pkShopMgr._rand_cards_('HD12'); 
            }
        }
        //获取普通奖励
        else{
            lucky_cards = this.m_pkShopMgr._rand_cards_(flipLottery.heroBoxZZYid);
        }

        for(let i = 0; i < lucky_cards.length;i++){
            let lottery = {
                item: lucky_cards[i].kid,
                num: lucky_cards[i].num,
                type: lucky_cards[i].type,
                isOpen: 0
            }
            flipLottery.lotterys.push(lottery);
        }

        //打乱位置
        flipLottery.lotterys = this.shuffle(flipLottery.lotterys);

        if(dailyFresh){
            //两天刷新一次
            if(flipLottery.refreshDay == 2){
                if(TeDate.daydiff(Date.parse(startTime)) % 2 == 0){
                    flipLottery.freshTime = new Date().setHours(0, 0, 0, 0);
                }
                //第二天登录刷新时间设置成第一天
                else{
                    let curDate = new Date().setHours(0, 0, 0, 0);
                    flipLottery.freshTime = curDate - 24*60*60*1000;
                }
                flipLottery.nextFreshTime = flipLottery.freshTime + 2*24*60*60*1000;;
                //每两日刷新一次的翻牌子需要重置购买次数
                this.m_pkShopMgr.refreshLimitCount(flipLottery.id);
            }
            else if(flipLottery.refreshDay == 1){
                flipLottery.freshTime = new Date().setHours(0, 0, 0, 0);
                flipLottery.nextFreshTime = flipLottery.freshTime + 24*60*60*1000;;
            }
            else if(flipLottery.refreshDay == 3){
                if(TeDate.daydiff(Date.parse(startTime)) % 3 == 0){
                    flipLottery.freshTime = new Date().setHours(0, 0, 0, 0);
                }
                //第二天和第三天登录刷新时间设置成第一天
                else{
                    let curDate = new Date().setHours(0, 0, 0, 0);
                    flipLottery.freshTime = curDate - 24*60*60*1000 * (TeDate.daydiff(Date.parse(startTime)) % 3);
                }
                flipLottery.nextFreshTime = flipLottery.freshTime + 3*24*60*60*1000;;
                //每多日刷新一次的翻牌子需要重置购买次数
                this.m_pkShopMgr.refreshLimitCount(flipLottery.id);
            }
            else if(flipLottery.refreshDay == 4){
                if(TeDate.daydiff(Date.parse(startTime)) % 4 == 0){
                    flipLottery.freshTime = new Date().setHours(0, 0, 0, 0);
                }
                //刷新时间设置成第一天
                else{
                    let curDate = new Date().setHours(0, 0, 0, 0);
                    flipLottery.freshTime = curDate - 24*60*60*1000 * (TeDate.daydiff(Date.parse(startTime)) % 4);
                }
                flipLottery.nextFreshTime = flipLottery.freshTime + 4*24*60*60*1000;
                //每多日刷新一次的翻牌子需要重置购买次数
                this.m_pkShopMgr.refreshLimitCount(flipLottery.id);
            }
            flipLottery.refreshCount = 0,
            flipLottery.isBought = 0;
        }
        return flipLottery;
    }

    shuffle(arr) {
        for (let i=arr.length-1; i>=0; i--) {
            let rIndex = Math.floor(Math.random()*(i+1));
            // 打印交换值
            // console.log(i, rIndex);
            let temp = arr[rIndex];
            arr[rIndex] = arr[i];
            arr[i] = temp;
        }
        return arr;
    }

    getDBValue(type: string) {
        var vvv = null;
        // switch (type) {
        //     case 'baseInfo': vvv = this.baseInfoDB.value; break;
        //     case 'mailInfo': vvv = this.mailInfoDB.value; break;
        //     // case 'campainInfo': vvv = this.campainDB.value; break;
        //     // case 'chapterInfo': vvv = this.chapterDB.value; break;
        //     // case 'homecityInfo': vvv = this.homecityDB.value; break;
        //     case 'pvpInfo': vvv = this.pvpDb.value; break;
        //     case 'rechargeInfo': vvv = this.rechargeDB.value; break;
        //     case 
        // }

        var r = this.m_kDBLoader.getDB<ReHash<any> | ReList<any>>(SeDBInfoHead[type]);
        if (r) {
            vvv = r.value;
        }

        return vvv;
    }

    public loadReload() {
        this.m_kDBLoader.load();
        this.m_kDBLoader.once('complete', this._loaderComplete.bind(this));
    }

    get heroCards(): Array<SeHeroCard> {
        return this.m_pkHeroCardMgr.heroCards;
    }

    get shangjinHeroCards(): Array<string> {
        return this.m_shangjinHeroCardMgr.shangjinHeroCards;
    }

    public delItem(itemType: string, num: number, reason?: string, subReason?: string) {
        return this.m_pkItemMgr.delItem(itemType, num, reason, subReason);
    }

    public addItem(itemType: string, num: number, reason?: string, subReason?: string) {
        return this.m_pkItemMgr.addItem(itemType, num, reason, subReason);
    }

    public seasonview(seasonid: string) {
        return this.pvpMgr.seasonview(seasonid);
    }

    public addItems(akItems: Array<SeItem>, reason?: string, subreason?) {
        var num = 0;
        for (var i = 0; i < akItems.length; i++) {
            var rkItem = akItems[i];
            if (isNaN(rkItem.iPileCount) || rkItem.iPileCount <= 0 || rkItem.kItemID.length < 4) {
                continue;
            }
            if (this.m_pkItemMgr.addItem(rkItem.kItemID, rkItem.iPileCount, reason, subreason)) {
                num++;
            }
        }
        return num;
    }

    /**
     * 设置特权信息
     * @param e 
     */
    setProperty(e: PlayerProperty) {
        this.baseInfo.property = e;
        this.saveBaseInfo('property');
    }

    addProperty(e: PlayerProperty) {
        this.baseInfo.property = this.baseInfo.property | e;
        this.saveBaseInfo('property');
    }

    /**
     * 删除特权信息
     * @param e 
     */
    delProperty(e: PlayerProperty) {
        this.baseInfo.property = this.baseInfo.property & (~e);
    }

    get property() {
        return this.baseInfo.property;
    }

    /**
     * 判断特权信息
     * @param e 
     */
    hasProperty(e: PlayerProperty) {
        return (this.baseInfo.property & e) == e;
    }

    get loadComplete(): boolean { return !(this.state == CharState.loading || this.state == CharState.nochar || this.state == CharState.offline); }

    public hasCharLoadFlag(flag: SeCharLoadFlag): boolean { return (this.loadflag & flag) == flag; }

    /*
     基础信息加载  老版本是使用一个字符串的，现在要改个版本，使用hash数组的模式
     */
    private loadbaseInfo(bSuccess) {
        // if (this.checkDB != num) return;
        var dbValue = this.baseInfoDB.value;
        // global.logMgr.log(dbValue);
        if (bSuccess && dbValue['level']) {
            this.baseInfo = new SeBaseCharInfo(this.baseInfoDB.value);
            // this.baseInfo.dailyInfo = new SeDailyInfo();
            this.baseInfo.lastLoginTime = this.baseInfo.loginTime || this.baseInfo.createtime;
            this.baseInfo.loginTime = Date.now();
            this.saveBaseInfo('lastLoginTime');
            this.saveBaseInfo('loginTime');

            // 检查一下是否被锁了
            var bLock = false;
            if (this.baseInfo.lockType == LockType.TimeLock) {
                if (this.baseInfo.lockTime > Date.now()) {
                    bLock = true;
                }
            }
            else if (this.baseInfo.lockType == LockType.NormalLock) {
                bLock = true;
            }

            if (bLock) {
                this.state = CharState.lock;
                global.netMgr.sendCharInfoInit(this.linkid, 'lock', null, [], [], null, null);
                global.netMgr.disconnect(this.linkid, true);
                return false;
            }
            else {
                this.m_callbackMgr.init();
                this.operateLoading(SeCharLoadFlag.baseinfo);
                return true;
            }
        }
        else {
            this.state = CharState.nochar;
            global.netMgr.sendCharInfoInit(this.linkid, 'nochar', null, [], [], null, null);
            return false;
        }
    }

    public saveBaseInfo(savekey: string | string[] = null) {
        if (savekey) {
            if (savekey instanceof Array) {
                var lists: Array<{ k: string, v: any }> = [];
                for (var i = 0; i < savekey.length; i++) {
                    var rkey = savekey[i];
                    if (this.baseInfo.hasOwnProperty(rkey)) {
                        lists.push({ k: rkey, v: this.baseInfo[rkey] });
                    }
                }
                this.baseInfoDB.msave(lists);
            }
            else {
                if (this.baseInfo.hasOwnProperty(savekey)) {
                    this.baseInfoDB.save(savekey, this.baseInfo[savekey]);
                }
            }

        }
        else {
            var lists: Array<{ k: string, v: any }> = [];
            for (var key in this.baseInfo) {
                var rkValue = this.baseInfo[key];
                if (rkValue != undefined) {
                    lists.push({ k: key, v: this.baseInfo[key] })
                }
                else {
                    this.baseInfoDB.del(key);
                }
            }
            this.baseInfoDB.msave(lists);
        }
    }

    private loadPvpInfo(bSuccess) {
        if (bSuccess) {
            this.pvpMgr.initDbInfo(this.pvpDb.value);
        }
        this.operateLoading(SeCharLoadFlag.pvpInfo);
        return bSuccess;
    }

    private loadTaskInfo(bSuccess) {
        if (bSuccess) {
            this.m_taskMgr.initDb(this.taskDb);
        }
        this.operateLoading(SeCharLoadFlag.taskinfo);
        return bSuccess;
    }

    private loadShopInfo(bSuccess) {
        if (bSuccess) {
            this.m_pkShopMgr.initDb(this.shopDb.value);
        }
        this.operateLoading(SeCharLoadFlag.shopinfo);
        return bSuccess;
    }

    //--------------------------

    public leaveGame() {

        this.cancell_match();

        if (this.room_state_info.roomkey != '') {
            this.room_state_info.roomkey = '';
            this.room_state_info.roomleavetype = '';
        }

        let data = {
            cmd: 'roomopr',
            type: 'force_leave',
            uid: this.id,
            p: {
                uid: this.id,
            }
        };
        // 改成强制离线房间信息吧
        if(configInst.get('globalMgr.url-all')){
            global.globalMgrAll.sendMSData(data);
        }
        global.matchMgr.sendMSData(data);

        // 检查一下buff
        this.m_buffMgr.checkbuff(false);

        this.pvpMgr.onLeave(true);
        this.pveNewMgr.onLogout();
        this.baseInfo.lastLogoutTime = Date.now();
        this.baseInfo.onlinetime += (this.baseInfo.lastLogoutTime - this.baseInfo.loginTime);
        //若是第二天，只保留当日0点
        if(TeDate.isdiffday(this.baseInfo.loginTime)){
            this.baseInfo.dailyInfo.onlinetimeDaily += (this.baseInfo.lastLogoutTime - new Date().setHours(0,0,0,0));
        }
        else{
            this.baseInfo.dailyInfo.onlinetimeDaily += (this.baseInfo.lastLogoutTime - this.baseInfo.loginTime);
        }
        // 离开的时候再保存一次数据
        this.saveBaseInfo();
        if (this.loadComplete) this.m_kDBLoader.saveInfo();

        this.setState(CharState.offline);
    }

    get id() { return this.baseInfo.charid; }

    set name(name: string) { this.baseInfo.charname = formationName(name); }

    get name() { return this.baseInfo.charname; }

    set servertime(servertime: number) { this.baseInfo.servertime = servertime; }

    get servertime() { return this.baseInfo.servertime; }

    get timezome() { return this.baseInfo.timezone; }

    set nation(nation: string) { this.baseInfo.nation = nation; }

    get nation() { return this.baseInfo.nation; }

    get level() { return this.baseInfo.level; }

    get openid() { return (this._extInfo && this._extInfo.openid) || ''; }
    get openkey() { return (this._extInfo && this._extInfo.openkey) || ''; }

    /**
     * 检查等级
     */
    check_level() {
        var pkBattleLevel = global.resMgr.BattleLevelRes.getRes(this.level);
        if (!pkBattleLevel || !pkBattleLevel.iNeedScore || pkBattleLevel.iNeedScore > this.baseInfo.score) return;

        var pkNextLevel = global.resMgr.BattleLevelRes.getRes(this.level + 1);
        if (!pkBattleLevel) return;

        this.baseInfo.score -= pkBattleLevel.iNeedScore;
        this.baseInfo.level++;
        if (this.baseInfo.level >= 9) {
            this.sendAnnouncement(SeEnumnoticetexteType.ShengJi, { playerlevel: this.baseInfo.level }, this);
        }

        this.check_level();
    }

    get score(): number { return this.baseInfo.score || 0; }

    get realScore(): number {
        var rscore = 0;
        for (var i = 1; i < this.level; i++) {
            var pkRes = global.resMgr.BattleLevelRes.getRes(i);
            if (pkRes) {
                rscore += pkRes.iNeedScore;
            }
        }

        return rscore + this.score;
    }

    set score(score: number) {
        if (typeof score != 'number' || this.score == Infinity || this.score == null) return;

        if (this.baseInfo.score == score) return;

        // 这里要做好日志监控，防止出现问题
        if (score < this.score) {
            global.logMgr.scoreLog(this, 'del', score, this.score);
        }
        else {
            global.logMgr.scoreLog(this, 'add', score, this.score);
        }
        this.baseInfo.score = score;

        this.check_level();


        if (this.loadComplete) {
            if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'score', this.score, this.level);
            this.baseInfoDB.msave([{ k: 'score', v: this.score }, { k: 'level', v: this.level }]);

            if (this.level >= 3) global.chartMgr.addPlayerLevelChart(this.pvpMgr.seasonid, SeChartType.SCT_SCORE, { seasonid: this.pvpMgr.seasonid, id: this.id, name: this.name, score: this.realScore, icon: this.icon, avatar: this.avatar, igroup: this.pvpMgr.groupId, is_vip: this.baseInfo.is_vip, vip_level: this.baseInfo.vip_level});
        }

        return;
    }

    get avatar() {
        return {
            vip: this.isMonthVip ? 1 : 0,
            iconid: this.baseInfo.iconid,
        }
    }

    get top_pvp_level() {
        return this.pvpMgr.top_pvp_level;
    }

    get top_pvp_rank() {
        return this.pvpMgr.top_pvp_rank;
    }

    get pvp_level() {
        return this.pvpMgr.pvp_level;
    }

    get pvp_score() {
        return this.pvpMgr.pvp_score;
    }

    get peak_score() {
        return this.pvpMgr.peak_score;
    }

    get max_pve_pk_rank() {
        return this.pvpMgr.max_pve_pk_rank;
    }

    get pvp_star() {
        return this.pvpMgr.pvp_star;
    }

    get tot_charge() {
        return this._totalRechargeCount;
    }

    get icon() { return this.baseInfo.icon; }

    set icon(icon) {
        // // 这里要对于上报的头像做一次转码处理，就是在链接上增加一个代理机制
        // var systemicon = false;
        // if (!icon || icon == 'null' || icon.length == 0) {
        //     systemicon = true;
        //     icon = 'heroicon/lord_9.png';
        // }
        // else if (['qzone', 'wx', 'oppo', 'tt'].indexOf(configInst.get('plt')) >= 0) {
        //     // 玩吧调用qq自己的头像没有跨域的问题，这里不需要自己代理
        //     systemicon = true;
        // }
        // else if (['xiaomi'].indexOf(configInst.get('plt')) >= 0) {
        //     icon = decodeURIComponent(icon);
        //     if (icon.indexOf('//') == 0) {
        //         icon = 'https:' + icon;
        //     }
        //     systemicon = false;
        // }
        // else if (icon.search('http') >= 0 || icon.search('https') >= 0) {
        //     systemicon = false;
        // }
        // else {
        //     systemicon = true;
        // }

        let change = false;
        if (!icon || icon == '' || icon.indexOf("http") == 0) {
            // 如果是 http头像的或者空头像的，使用 默认头像
            icon = 'TX001';
            change = true;
        }


        if (this.baseInfo.realicon != icon) {
            this.baseInfo.realicon = icon;
            this.baseInfoDB.save('realicon', icon);
        }

        if (this.baseInfo.icon != icon) {
            this.baseInfo.icon = icon;
            if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'icon', this.icon);
        }

        // if (systemicon) {
        //     this.baseInfo.icon = this.baseInfo.realicon;
        // }
        // else {
        //     this.baseInfo.icon = global.iconProxy + this.baseInfo.realicon;
        // }
    }

    get guide() {
        return this.baseInfo.guide;
    }

    set guide(val: number) {
        this.baseInfo.guide = val;
    }

    get money() { return this.baseInfo.money; }

    /**
     * 扣除钻石的接口，需要写明扣除原因
     * @param num 
     * @param reason recharge buyitem lottery 
     */
    public decMoney(num: number, reason: string, ...subParam: Array<string>) {
        if (!num) return false;
        // if (typeof num != 'number') return false;
        var addList = ['chapteraward', 'recharge', 'zuanshiitem', 'callbackadd'];

        if (num < 0 && addList.indexOf(reason) < 0) return false;

        if (this.baseInfo.money < num) return false;

        var before = this.baseInfo.money;
        this.baseInfo.money = before - num;
        if (num > 0) {
            this.taskAction(TaskAction.UseMoney, num);
        }
        // 这里要做好日志监控，防止出现问题
        global.logMgr.moneylog(this, reason, this.baseInfo.money, before, ...subParam);

        // 操作完成后必须立即保存一次数据库
        this.saveBaseInfo('money');
        if (this.loadComplete) {
            if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'money', this.money);
        }
        return true;
    }

    /**
     * 
     * @param num 消耗金币数量
     * @param noEnoughBuy 金币不足是否消耗钻石补足 默认true
     */
    public useGold(num: number, noEnoughBuy: boolean = true): boolean {
        if (!num) return false;
        if (num <= 0) return false;
        if (this.baseInfo.gold < num) {
            if (!noEnoughBuy) return;
            var needMoney = Math.ceil((num - this.baseInfo.gold) / 10);
            if (!this.decMoney(needMoney, "buyGold")) return;
            this.gold = 0;
        }
        else {
            this.gold -= num;
        }
        return true;
    }

    get gold() { return this.baseInfo.gold; }

    private _changeGold(gold: number, maxLimit: boolean, reason?: Object, notice: boolean = true) {
        if (typeof gold != 'number') {
            return;
        }

        if (gold < 0) {
            gold = 0;
        }

        if (this.baseInfo.gold == gold) {
            return;
        }

        // 这里要做好日志监控，防止出现问题
        if (gold < this.baseInfo.gold) {
            this.taskAction(TaskAction.UseGold, this.baseInfo.gold - gold);
            global.logMgr.goldLog(this, 'del', gold, this.baseInfo.gold);
        }
        else {
            global.logMgr.goldLog(this, 'add', gold, this.baseInfo.gold);
        }
        this.baseInfo.gold = gold;

        // 操作完成后必须立即保存一次数据库
        this.saveBaseInfo('gold');
        if (this.loadComplete) {
            if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'gold', this.gold, null, notice? reason : null);
        }
        return;
    }

    set gold(number: number) { this._changeGold(number, true); }

    // 可以不受上限控制的增加金币
    set forcegold(number: number) { this._changeGold(number, false); }

    //带上原因的更改金币
    public changeGold(number: number, reason: Object, notice: boolean = true) { this._changeGold(number, true, reason, notice); }

    public onCreateChar(shareUid: number) {
        this.baseInfo.createtime = Date.now();
        this.m_pkHeroCardMgr.checkHerosWhenLoad();
        this.m_pkHeroCardMgr.checkFormationsWhenLoad();
        this.m_pkItemMgr.check_item_whenload();
        this.friendMgr.upload_when_create();
        this.m_callbackMgr.onCreateChar(shareUid);

        let guide = parseInt(global.resMgr.getConfig('baseguide') || '1');
        if (isNaN(guide) || !guide) {
            guide = 1;
        }

        this.baseInfo.guide = guide;
    }

    public slince_mode: boolean = false;

    private _sdw_pay() {
        let str = this.loginInfo.appid + '|' + this.id + '|' + this.loginInfo.channel + '|' + this.plt;
        str += '|' + createHash('md5').update(('' + this.loginInfo.appid + this.plt + this.loginInfo.channel + this.id)).digest("hex");
        return str;
    }

    public _real_level = 1;

    get real_level() {
        return Math.max(this.level, this._real_level);
    }

    public sum_tot_level() {
        this._real_level = this.level;

        let curr_gold = this.gold;
        let curr_score = this.score;
        let curr_level = this.level;

        for (let i = 0; i < this.baseInfo.heros.length; i++) {
            let r_hero: SeHeroCard = this.baseInfo.heros[i];
            if (!r_hero) {
                continue;
            }
            let t_hero: SeHeroCard = {
                kHeroID: r_hero.kHeroID,
                iLevel: r_hero.iLevel,
                iCount: r_hero.iCount,
                oExtra: null,
            }
            let mxLevel = global.resMgr.getHeroMxLevel(t_hero.kHeroID);
            // 模拟这个英雄卡，看能升级到几级
            for (let j = t_hero.iLevel; j < mxLevel; j++) {
                var cost = global.resMgr.cardLvlCost(t_hero.kHeroID, t_hero.iLevel);
                if (!cost) break;
                if (t_hero.iCount < cost.card && cost.card >= 0) break;
                if (cost.gold > curr_gold) break;

                t_hero.iCount -= cost.card;
                curr_gold -= cost.gold;
                curr_score += cost.exp;
                t_hero.iLevel++;
            }
        }

        // 计算一下 tmp level
        for (let i = curr_level; i < global.resMgr.MaxLvl; i++) {
            var pkBattleLevel = global.resMgr.BattleLevelRes.getRes(curr_level);
            if (!pkBattleLevel || !pkBattleLevel.iNeedScore || pkBattleLevel.iNeedScore > curr_score) break;

            curr_score -= pkBattleLevel.iNeedScore;
            curr_level++;
        }

        // 这里是算出来的简易等级
        this._real_level = curr_level;

        // if (this._real_level != this.level) {
        //     if (configInst.get("cheatmode")) {
        //         global.netMgr.sendAnnouncement(this.name + ": 测试环境下的，东鹏哥哥，你的主城等级是" + this.level + "你太懒了，快升级到" + this._real_level, '', this.linkid, this.id);
        //     }
        // }
    }

    public operateLoading(flag: number) {
        flag = flag || 0;
        this.loadflag = this.loadflag | flag;
        if (this.hasCharLoadFlag(SeCharLoadFlag.complete)) {
            this.slince_mode = true;
            // 再设置一次icon的检查
            this.icon = this.baseInfo.realicon;
            this.setState(CharState.loadcomplete);
            // 加载数据完成通知玩家 目前数据一次加载，以后考虑拆分数据加载
            if (!this.pvpDb.get('pvp_level')) {
                this.pvpDb.save('pvp_level', 1);
            }

            try {
                // 数据转换的时候加一个容错，防止重复操作数据
                this.m_pkHeroCardMgr.checkHerosWhenLoad();
                this.m_pkHeroCardMgr.checkFormationsWhenLoad();
                this.m_pkItemMgr.check_item_whenload();

                this.score = UpgradeLib.ScoreUpgrade(this.baseInfo.level, this.baseInfo.score, this.baseInfo.version, global.resMgr.getConfig('userver'));
            }
            catch (e) {
                console.error(e);
            }

            var currVer = global.resMgr.getConfig('userver');
            if (this.baseInfo.version != currVer) {
                this.m_pkShopMgr.refreshDaily();

                // 某一个版本要调整数值，这里就需要记录一下啊了,做一个功能实现一下
                this.baseInfo.version = currVer;
                this.saveBaseInfo('version');
            }
            // 任务系统初始化
            this.m_taskMgr.inittask();
            //如果盟军任务id没有，从同盟服去取
            this.get_task_id();
            this.checkcurMedal();
            this.checkChargeInfoWhenLoad();
            if (this.baseInfo.nation == "") {
                var nationType: number = Math.round(Math.random() * 2);
                this.baseInfo.nation = SeNationTypeNames[nationType];
            }

           
            this.pvpMgr.onLogin();

            //初始化赏金赛奖励池子，把已有的英雄去掉
            this.m_pkShopMgr.shangjinHeroBoxInit();
            
            /**
             * 这个地方插入一段逻辑, 用来解决玩家身上武将满溢的情况
             */
            this.m_pkHeroCardMgr.clearHeroCard();
            this.refreshLords();
            let [PVP_MAILS, AUTO_MAILS, ThreeUrlMails, SeasonRewards, LevelSpeedSeasonRewards, GuildItem, PvePkSeasonRewards, CallBackMsgs] = this.onLogin();

            this.m_taskMgr.doAction_slince(TaskAction.Recharge, this._totalRechargeCount);
            this.m_taskMgr.doAction_slince(TaskAction.FirstPay, this._iFirstPay);

            this.bInitComplete = true;
            global.netMgr.sendMailsInit(this.linkid, this.mails);
            global.netMgr.sendPvpInfoInit(this.pvpMgr.getInfo(), this.linkid);
            let _o = this.m_taskMgr.gettasklist();
            global.netMgr.initTask(this.linkid, _o.l, _o.a);

            this.m_pkShopMgr.update_runhuan_gift();
            global.netMgr.initShop(this.linkid, this.m_pkShopMgr.getInfo());
            this.m_pkShopMgr.updateTeHuiInfo2Player();
            this.refreshCurMedal();
            this.baseInfo.servertime = Date.now();
            this.baseInfo.timezone = new Date().getTimezoneOffset();
            this.baseInfo.wxSubscribeMessage = global.playerMgr.subscribePlayers[this.loginInfo.openid] || [];
            //删除baseinfo里无用的活动信息
            this.refreshActivity();
            this.m_pkHeroCardMgr.refreshPvePkFormation();
            this.name = this.baseInfo.charname;
            global.netMgr.sendCharInfoInit(this.linkid, 'success', this.baseInfo, this.rechargeOrders, [], this._extInfo, this._sdw_pay(), global.lsMgr.getconfigs());
            this.checkSystemMail();
            this.taskAction(TaskAction.Login);

            global.logMgr.enter(this);

            this._use_login_mails(PVP_MAILS, AUTO_MAILS, ThreeUrlMails, SeasonRewards, LevelSpeedSeasonRewards, GuildItem, PvePkSeasonRewards, CallBackMsgs);

            global.chartMgr.queryranks(this.pvpMgr.seasonid, this.id, SeChartType.SCT_PVP_SCORE);
            global.globalChartMgr.queryranks(this.pvpMgr.seasonid, this.id, SeChartType.SCT_GLOBAL_PVE_OFFLINE);
            this.slince_mode = false;

            this.friendMgr.upload_state();
            this.m_guildMgr.upload_state();
            //有上线通知buff
            if(this.m_buffMgr.isHadBuff('B008') && this.dailyInfo.shangxianBuffCount < Number(global.resMgr.TownBufferRes.getRes('B008').kValue)){
                this.sendAnnouncement(TableRes.SeEnumnoticetexteType.ShangXianTongZhi,{},this);
                this.dailyInfo.shangxianBuffCount++;
                this.updateDailyInfo();
            }
            //删除封王排行榜邮件
            let check_num = 2;
            if(this.baseInfo.checkMail != check_num){
                this.mailMgr.checkAndDelMail();
                this.baseInfo.checkMail = check_num;
                this.saveBaseInfo('checkMail');
            }
            
            // 拉取一下好友信息
            this.friendMgr.loadInfo();

            // 检查一下是否有点击链接进入的信息
            if (global.plt.indexOf('wx') == 0 || global.plt.indexOf('qq') == 0 || global.plt.indexOf('gowan') == 0 || global.plt.indexOf('tt') == 0) {
                this.m_pkItemMgr.share_keys_award(this.loginInfo.shareuid, this.loginInfo.sharetime, this.loginInfo.sharetype);
            }

            //巅峰模块信息
            //统计全部名将
            // global.countMgrInst.general_num_add(this.id, this.pvpMgr.getInfo().pvp_level);
            // global.countMgrInst.sendgeneralNum(this.linkid);

            global.netMgr.sendData({ cmd: "peakInit", generalNum: 0, isOpen: true, gmIsOpen: true }, this.linkid);

            global.lsMgr.sendPlayerReady(this.account, this.id, this.linkid, this.loginInfo, this.baseInfo.loginTime, { lvl: this.level, icon: this.icon, name: this.name });

            this.sum_tot_level();

            //初始化不回收奖励池子
            this.m_pkShopMgr.poolInit();
            this.force_check_name();

            this.pvpMgr.check_last_race();

            this.pveNewMgr.dailyRefresh();
            this.pveNewMgr.onLogin();
            //老玩家直接开启屠龙秘宝
            if(this.baseInfo.tlmb_finish_time == 0 && this.baseInfo.createtime < Date.parse(global.resMgr.getConfig('tlmb_open_date'))){
                this.baseInfo.tlmb_finish_time = Date.now() + parseInt(global.resMgr.getConfig('tlmb_last_time')) * 60 * 60 * 1000;
                this.saveBaseInfo('tlmb_finish_time');
                global.netMgr.sendCharMiscUpdate(this.linkid, 'tlmb_finish_time', this.baseInfo.tlmb_finish_time);
            }
            //老玩家回归活动
            if(this.level >= 3 && TeDate.daydiff(this.baseInfo.lastLoginTime) >= 14 && TeDate.daydiff(this.baseInfo.lastLoginTime) <= 365){
                this.oldPlayerRefresh();
            }
            var currVer = global.resMgr.getConfig('userver');
            //sdw平台需要上报胜场数
            if(configInst.get('plt') == 'sdw'){
                //this.pvpMgr.send_win_count_sdw();
            }
            //检测vip是否过期
            this.checkVIPOff();
            //检测发送vip周邮件
            this.checkVIPWeekmail();
            //由于bug，每个玩家登陆都重新发送pve星数
            let check_pve_num = 1;
            //有groupid时再发送，防止出现重复的榜单
            if(this.baseInfo.checkPveStar != check_pve_num && this.pvpMgr.groupId){
                //获取所有星数
                let star_count = this.pveNewMgr.getAllStarCount();
                if(star_count > 0){
                    //用时
                    let pve_start = Date.parse(global.resMgr.getConfig('pve_star_rank_date'));
                    let time1 = Math.floor((Date.now() - Math.max(pve_start,this.baseInfo.createtime))/1000);

                    let score = star_count + 1- (time1 / (10*10000*10000));
                    global.chartMgr.addPlayerLevelChart(this.pvpMgr.seasonid,
                        TableRes.SeEnumChartTableeType.pveXingShuBang,
                        {
                            id: this.id,
                            name: this.name,
                            score: score,
                            icon: this.icon,
                            avatar: this.avatar, 
                            igroup: this.pvpMgr.groupId,
                            time: time1,
                            is_vip: this.baseInfo.is_vip,
                            vip_level: this.baseInfo.vip_level
                        });
                }
                this.baseInfo.checkPveStar = check_num;
                this.saveBaseInfo('checkPveStar');
            }
            //检测阵营对抗奖励
            this.check_toy_reward();
            //每天刷新一次竞技场对手
            if(!this.dailyInfo.pve_pk_refresh){
                this.pvpMgr.pve_pk_refresh([0,1,2], true);
                this.dailyInfo.pve_pk_refresh = true;
                this.updateDailyInfo();
            }
            let check_pve_pk = 3;
            if(this.baseInfo.checkPvePk != check_pve_pk){
                this.pvpMgr.set_pve_pk_rank(PVE_PK_INIT_VALUE);
                global.globalChartMgr.queryranks(this.pvpMgr.seasonid, this.id, SeChartType.SCT_GLOBAL_PVE_OFFLINE);
                this.baseInfo.checkPvePk = check_pve_pk;
                this.saveBaseInfo('checkPvePk');
            }
            //同盟bug修复
            let check_guild = Number(global.resMgr.getConfig('check_guild'));
            let check_guild_time = Number(global.resMgr.getConfig('check_guild_time'))
            if(check_guild && check_guild_time && this.baseInfo.checkGuild != check_guild){
                if(Date.now() < check_guild_time && this.baseInfo.guild_info.guild_id){
                    this.m_taskMgr.chx_tmp_refresh();
                    this.m_guildMgr.guild_opr({cmd: 'guild_opr', type: 'get_task_id', id: this.baseInfo.guild_info.guild_id});
                }
                this.baseInfo.checkGuild = check_guild;
                this.saveBaseInfo('checkGuild');
            }
        }
    };

    public get_task_id() {
         //如果盟军任务id没有，从同盟服去取
         if(this.baseInfo.guild_info.guild_id && this.dailyInfo.guild_task_id && this.dailyInfo.guild_task_id.length == 0){
            this.m_guildMgr.guild_opr({cmd: 'guild_opr', type: 'get_task_id', id: this.baseInfo.guild_info.guild_id})
        }
    }

    private check_toy_reward(){
        //阵营已完成且自身奖励未领取
        let toy_id = this.baseInfo.toy_camp.id;
        if(global.playerMgr.toy_info[toy_id] && global.playerMgr.toy_info[toy_id].is_complete && !this.baseInfo.toy_camp.get_reward){
            //发送阳光普照奖
            let rewards_all = global.resMgr.getConfig('zydk_reward_everyone')[global.playerMgr.toy_info[toy_id].complete_rank];
            if(rewards_all){
                let rewards = rewards_all.split('|');
                let items: Array<SeItem> = [];
                for(let reward of rewards){
                    items.push({ kItemID: reward.split(',')[0], iPileCount: Number(reward.split(',')[1])});
                }
                global.playerMgr.onGiveMail(this.plt, this.id, SeMailType.SYSTEM, LangID("5705"), items, 0, LangID("5706"));
                
                this.baseInfo.toy_camp.get_reward = true;
                this.saveBaseInfo('toy_camp');
            }
        }
    }

    public random_toy_camp(){
        //堆玩具玩法获得阵营
        if(this.baseInfo.toy_camp && this.baseInfo.toy_camp.id != -1) return;
        let toy_activity = global.resMgr.getActivityByType(TableRes.SeEnumActivityeType.ZhenYingDuiKang);
        if(Date.parse(toy_activity.kStartTime) > Date.now() || Date.parse(toy_activity.kEndTime) < Date.now()) return;
        let id = -1;
        //先判断是否在前100名
        let index = toy_totcharge_100.indexOf(this.id);
        if(index != -1){
            // 若从0、1、2分别加入ABC阵营，3、4、5分别加入CBA阵营、789分别加入ABC阵营，以此类推。
            let temp = index % 6;
            if(temp >= 3){
                id = 5 - temp
            }
            else{
                id = temp;
            }
        }
        else{
            //如果有充值，选充值最少的，没充值选人数最少的
            if(this.tot_charge != 0){
                let min_charge = Number.MAX_VALUE;
                for(let toy of global.playerMgr.toy_info){
                    if(toy.totcharge < min_charge){
                        id = toy.id;
                        min_charge = toy.totcharge;
                    }
                }
            }
            else{
                let min_player_count = Number.MAX_VALUE;
                for(let toy of global.playerMgr.toy_info){
                    if(toy.player_count < min_player_count){
                        id = toy.id;
                        min_player_count = toy.player_count;
                    }
                }
            }
        }
        if(id == -1) return;
        global.globalChartMgr.sendCSData({cmd: 'join_camp', uid: this.id, id: id, totcharge: this.tot_charge / 100})
        this.baseInfo.toy_camp.id = id;
        this.saveBaseInfo('toy_camp');
        global.netMgr.sendCharMiscUpdate(this.linkid, 'toy_camp', this.baseInfo.toy_camp);
    }

    //老玩家回归相关数据刷新
    private oldPlayerRefresh(){
        this.baseInfo.old_player_time = Date.now();
        this.saveBaseInfo('old_player_time');
        global.netMgr.sendCharMiscUpdate(this.linkid, 'old_player_time', this.baseInfo.old_player_time);
        //回归初始奖励任务刷新,删除旧的，添加新的,并直接完成任务
        this.m_taskMgr.updateModuleTask(true, TableRes.SeEnumTaskiModule.HuiGuiShuaXin, Math.floor(this._totalRechargeCount / 100));
        this.taskAction(TaskAction.HuiGuiRecharge, 5000)
        //回归道具令牌清除
        this.delItem('W032', this.itemCount('W032'), 'oldPlayerRefresh');
        //商城回归礼包限购刷新
        let shopmall_res = global.resMgr.getShopMailByType(TableRes.SeEnumShopMalleType.HuiGuiLiBao);
        for(let res of shopmall_res){
            this.m_pkShopMgr.refreshLimitCount(res.kID);
        }
    }

    private checkVIPOff(){
        if(this.baseInfo.is_vip && this.baseInfo.vip_level > 0){
            let vip_res = global.resMgr.getVIPResByVIPLevel(this.baseInfo.vip_level);
            if(vip_res && vip_res.iExpirationDate){
                if(Date.now() > (this.baseInfo.last_recharge_time + (vip_res.iExpirationDate * 24 * 60 * 60 * 1000))){
                    this.baseInfo.is_vip = false;
                    this.saveBaseInfo('is_vip');
                    global.netMgr.sendCharMiscUpdate(this.linkid, 'is_vip', this.baseInfo.is_vip);
                }
            }
        }
    }

    private checkVIPWeekmail(){
        if(this.baseInfo.is_vip && this.baseInfo.vip_level > 0){
            let vip_res = global.resMgr.getVIPResByVIPLevel(this.baseInfo.vip_level);
            if(vip_res && vip_res.akRewardWeek){
                if(TeDate.isdiffweek(this.baseInfo.vip_weekmail_time)){
                   this.send_vip_week_email(this.baseInfo.vip_level);
                }
            }
        }
    }

    private refreshCurMedal(){
        for(let i = 0; i < this.baseInfo.curMedals.length; i++){
            if(!global.resMgr.BadgeRes.getRes(this.baseInfo.curMedals[i])){
                this.baseInfo.curMedals.splice(i,1);
                this.saveBaseInfo("curMedals");
            }
        }
    }

    private refreshActivity(){
        let activity = global.resMgr.activityRes.getRes('A018');
        if(activity){
            if(this.baseInfo.daysign.last < Date.parse(activity.kStartTime)){
                this.baseInfo.daysign = { sign: 0, tot: 0, last: 0 };
            }
        }
        //阵营对抗
        let toy_activity = global.resMgr.getActivityByType(TableRes.SeEnumActivityeType.ZhenYingDuiKang);
        // buff单独配置过期时间，以后有活动需求可以再用回来
        // if(!toy_activity || Date.now() < Date.parse(toy_activity.kStartTime) || Date.now() > Date.parse(toy_activity.kEndTime)){
        //     this.m_buffMgr.del_buffer('B016');
        // }
        if(!toy_activity || Date.now() < Date.parse(toy_activity.kStartTime) || Date.now() > Date.parse(toy_activity.kShowEndTime)){
            this.baseInfo.toy_camp = new SeToyInfo();
        }
        //神秘商店代币返还
        let store_activity = global.resMgr.getActivityByType(TableRes.SeEnumActivityeType.ShenMiShangDian);
        if(store_activity && Date.now() > Date.parse(store_activity.kEndTime)){
            let items = [];
            let count = this.m_pkItemMgr.getItemCount('W033');
            if(count > 0 && this.delItem('W033', count, 'return_money')){
                items.push({kItemID: 'W001', iPileCount: count * 2});
                let content = '您在2021年2月定制商店活动中，剩余' + count + '代币，共返还' + count * 2 + '钻石，请接收';
                let title = '神秘代币返还';
                global.playerMgr.onGiveMail(this.plt, this.id, SeMailType.SYSTEM, content, items, 0, title);
            }
            this.baseInfo.random_discount = 100;
            this.baseInfo.selectHeros = [];
            this.saveBaseInfo(['random_discount','selectHeros']);
        }
        //年兽秘宝代币返还
        let treasure_activity = global.resMgr.getActivityByType(TableRes.SeEnumActivityeType.NianShouMiBao);
        if(treasure_activity && Date.now() > Date.parse(treasure_activity.kEndTime)){
            let items = [];
            let count = this.m_pkItemMgr.getItemCount('DH016');
            if(count > 0 && this.delItem('DH016', count, 'return_money')){
                items.push({kItemID: 'W001', iPileCount: count * 20});
                let content = '由于活动结束，以一个爆竹20钻石的价格对您的爆竹进行回收，由于您剩余' + count +'个爆竹，故返还给您' + count * 20 +'钻石，请查收~';
                let title = '未使用爆竹钻石返还';
                global.playerMgr.onGiveMail(this.plt, this.id, SeMailType.SYSTEM, content, items, 0, title);
            }
            this.baseInfo.new_year_treasure = new SeNewYearTreasure();
        }
        //由于第一期神秘商店抽到的折扣在结束时没有重置，故第二期添加此代码
        if(!this.baseInfo.random_refresh_v2){
            this.baseInfo.random_refresh_v2 = true;
            this.baseInfo.random_discount = 100;
            this.baseInfo.selectHeros = [];
            this.saveBaseInfo(['random_refresh_v2','random_discount', 'selectHeros']);
        }
        
    }

    private _use_login_mails(PVP_MAILS: any[], AUTO_MAILS: any[], ThreeUrlMails: any[], Peak_DailyReward_Mails: any[], LevelSpeedSeasonRewards: any[], GuildItem: any[], PvePkSeasonRewards: any[], CallBackMsgs: any[]) {
        try {
            for (let i = 0; i < PVP_MAILS.length; i++) {
                let data = PVP_MAILS[i];
                //获取上赛季的结束时间
                let last_season_finish_time = 0;
                var allSeasinfos = global.resMgr.seasonRes.getAllRes();
                for (var key in allSeasinfos) {
                    var r = <SeResSeasonEx>allSeasinfos[key];
                    if (r.kNextID == this.pvpMgr.seasonid) {
                        last_season_finish_time = Date.parse(r.kEndTime);
                        break;
                    }
                }
                //上赛季的战斗不结算
                if(data.finishTime > last_season_finish_time){
                    //离线战斗
                    this.pvpMgr.onMatchPvpOlFight_MS_BACK(data.bwin, data.time, data.isBossDie, data.mode, data.pvp_score, data.rmode, data.rid, data.bTeam, data.oppname || '', data.state || 'finish', data.isUnSync, data.isCross, data.opplevel, data.host_id, data.host_skills, data.times, data.index, data.formation_1v2);
                }
            }

            for (let i = 0; i < AUTO_MAILS.length; i++) {
                this.addMail(AUTO_MAILS[i]);
            }

            for (let i = 0; i < ThreeUrlMails.length; i++) {
                let d = ThreeUrlMails[i];
                if (d && d.param && d.data) {
                    this.urlrequestback(d.param, d.data);
                }
            }

            for (let i = 0; i < Peak_DailyReward_Mails.length; i++) {
                this.pvpMgr.giveSeasonReward(Peak_DailyReward_Mails[i]);
            }

            for (let i = 0; i < LevelSpeedSeasonRewards.length; i++) {
                let data = LevelSpeedSeasonRewards[i];
                this.pvpMgr.giveLevelSpeedSeasonReward(data.reward, data.chartype);
            }

            for(let i = 0; i < PvePkSeasonRewards.length; i++){
                this.pvpMgr.givePvePkSeasonCrossReward(PvePkSeasonRewards[i]);
            }
            for (let i = 0; i < GuildItem.length; i++) {
                let data = GuildItem[i];
                this.m_guildMgr.deal_guild_opr(data);
            }

            if (CallBackMsgs && CallBackMsgs.length > 0) this.m_callbackMgr.onReciveMsg(CallBackMsgs);

        }
        catch (e) {

        }

    }

    room_state_info = {
        roomkey: '',
        roomleavetype: '',
        roomtype: ''     // 暂时没有使用
    };

    public setState(state: string) {
        if (state == this.state) return;
        this.state = state;
        this.friendMgr.upload_state();
        this.m_guildMgr.upload_state();
    }

    public onStartForceGame(self: SeRaceOpp, opp: SeRaceOpp) {
        var info = {
            cmd: 'pvp',
            id: opp.Id,
            self: self.Formation,
            opp: opp.Formation,
            succecc: true,
        };
        global.netMgr.sendData(info, this.linkid);
    }

    public onChangeFormation(plan: number, formation: any) {
        // 先判断一下阵型是否是全空的.
        // var allEmpty = true;
        // for (var key in formation) {
        //     if (formation[key]) {
        //         allEmpty = false;
        //         break;
        //     }
        // }
        //判断是否有重复上阵，防止作弊
        for (let i = 0; i < formation.length; i++) {
            let heroId = formation[i];
            for(let j = i+1; j < formation.length; j++){
                if(heroId == formation[j]){
                    return;
                }
            }
        }
        var bSuccess = true;
        var nodeFromat = this.m_pkHeroCardMgr.setPlanFormation(plan, formation);
        global.netMgr.sendCharFormationOpr(this.linkid, true, plan, nodeFromat, this.state);
    }

    public onChangePVEPKFormation(plan: number, formation: any) {
        this.m_pkHeroCardMgr.setPlanPVEPKFormation(plan, formation);
        global.netMgr.sendCharPVEPKFormationOpr(this.linkid, true, plan, formation, this.state);
    }
    
    public onChangeFormationName(plan: number, name: string) {
        if(getByteLen(name) > 10){
            global.netMgr.sendFormationName(this.linkid, false, plan, this.baseInfo.formationName[plan]);
            return;
        }
        this._process_forbid_name_check(this.id, name, function(plan, name, result = true) {
            if(result){
                this.baseInfo.formationName[plan] = name;
                this.saveBaseInfo('formationName');
            }
            global.netMgr.sendFormationName(this.linkid, result, plan, this.baseInfo.formationName[plan] || '');
        }.bind(this, plan));
        
    }

    public onChangeShangJinFormation(shangjinFormation: any) {
        var nodeFromat = this.m_pkHeroCardMgr.setShangjinFormation(shangjinFormation);
        global.netMgr.sendCharShangJinFormationOpr(this.linkid, true, nodeFromat, this.state);
    }

    public onChangeShangJinLord(lordId: any) {
        if(this.baseInfo.shangjin_lords.indexOf(lordId) == -1) return;
        this.baseInfo.shangjin_lord = lordId;
        this.saveBaseInfo('shangjin_lord');
        global.netMgr.sendCharMiscUpdate(this.linkid, 'shangjin_lord', this.baseInfo.shangjin_lord);
    }

    get mails() {
        return this.mailMgr.mails;
    }

    public checkMail() {
        return this.mailMgr.check_mails();
    }

    public addMail(kMails: SeCharMailInfo | SeCharMailInfo[]): boolean {
        return this.mailMgr.addMail(kMails);
    }

    public useMail(mailid: string) {
        if (!this.mailMgr.useMail(mailid)) {
            console.log(`<no find mail> id<${this.id}> mailid<${mailid}>`);
        }
    }

    public delMail(mailid: string) {
        return this.mailMgr.delMail(mailid);
    }

    public addNewBox(boxType: number, level: number, num: number) {
        this.pvpMgr.addNewBox(boxType, level, num);
    }

    // 这里只负责处理使用道具的逻辑，扣除道具检查道具数量在 useItem 函数中
    public _useItem(typeid: string, num: number, param1: any = null, param2: any = null): boolean {
        var useDel = true;
        //[兵粮卡:0] [金元宝:1] [经验丸:2] [技能书:3] [领主技:4] [补给箱:5] [英雄经验丸:6]
        var pkTownItemRes: SeResTownItem = global.resMgr.TownItemRes.getRes(typeid);
        if (!pkTownItemRes) {
            return false;
        }

        switch (pkTownItemRes.eTypeA) {
            case SeEnumTownItemeTypeA.JinYuanBao: {
                //[金元宝:1]
                var addnum = num * parseInt(pkTownItemRes.kValueA);
                if (!addnum) {
                    addnum = 0;
                }
                this.gold = this.gold + addnum;
                break;
            }
            case SeEnumTownItemeTypeA.YingXiongKa: {
                this.m_pkHeroCardMgr.addHeroCard(pkTownItemRes.kValueA, num);
                break;
            }
            case SeEnumTownItemeTypeA.TiYanYingXiongKa: {
                let level: number = parseInt(pkTownItemRes.kValueC || '1')
                let extra = {}
                let str: string = pkTownItemRes.kValueB;
                if (str) {
                    var jLists = str.split(':');
                    if (jLists.length == 2) {
                        switch (jLists[0]) {
                            case 'rank': extra['ltype'] = 'rank'; extra['lvalue'] = parseInt(jLists[1]); break;
                            case 'date': extra['ltype'] = 'date'; extra['lvalue'] = Date.now() + (parseInt(jLists[1]) * 86400000); break;
                            case 'match': extra['ltype'] = 'match'; extra['lvalue'] = parseInt(jLists[1]); break;
                        }
                    }
                }
                this.m_pkHeroCardMgr.addTryHeroCard(pkTownItemRes.kValueA, level, extra);
                break;
            }
            case SeEnumTownItemeTypeA.WanJiaJingYan: {
                this.score = this.score + num * parseInt(pkTownItemRes.kValueA);
                break;
            }
            case SeEnumTownItemeTypeA.DengJiBaoXiang: {
                let boxType = parseInt(pkTownItemRes.kValueB);
                let level = parseInt(pkTownItemRes.kValueA || this.level.toString());
                var heroBoxTypeRes = global.resMgr.getResHeroBoxType(boxType);
                if (!heroBoxTypeRes) return false;
                if (pkTownItemRes.iProperty & SeEnumTownItemiProperty.BaoXiangTianJia) {
                    this.addNewBox(boxType, level, num);
                }
                else {
                    this.m_pkShopMgr.openBoxBatch(pkTownItemRes.kId, num, level, boxType);
                }
                break;
            }
            case SeEnumTownItemeTypeA.DuanWeiBaoXiang: {
                let boxType = parseInt(pkTownItemRes.kValueB);
                let level = parseInt(pkTownItemRes.kValueA || this.top_pvp_level.toString());
                var heroBoxTypeRes = global.resMgr.getResHeroBoxType(boxType);
                if (!heroBoxTypeRes) return false;
                // if (heroBoxTypeRes.eAniType == SeEnumHeroBoxTypeeAniType.JingGang) {
                //     this.m_pkShopMgr.randHeroCards01(level, parseInt(pkTownItemRes.kValueB));
                //     return false;
                // }
                // if (heroBoxTypeRes.eAniType == SeEnumHeroBoxTypeeAniType.XuanTie) {
                //     this.m_pkShopMgr.randHeroCards02(level, parseInt(pkTownItemRes.kValueB));
                //     return false;
                // }
                if (pkTownItemRes.iProperty & SeEnumTownItemiProperty.BaoXiangTianJia) {
                    this.addNewBox(boxType, level, num);
                }
                else {
                    this.m_pkShopMgr.openBoxBatch(pkTownItemRes.kId, num, level, boxType, false, true);
                }
                break;
            }
            case SeEnumTownItemeTypeA.HeZi: {
                let addItmes: SeItem[] = [];
                if (pkTownItemRes.kValueA) {
                    let items = pkTownItemRes.kValueA.split('|');
                    for (let i = 0; i < items.length; i++) {
                        let item = items[i].split(',');
                        let item_id = item[0];
                        if (!item_id) continue;
                        let item_count = parseInt(item[1] || '1');
                        if (!item_count || isNaN(item_count)) {
                            item_count = 1;
                        }

                        addItmes.push({
                            kItemID: item_id,
                            iPileCount: item_count * num
                        })

                    }
                }
                if (addItmes.length > 0) this.addItems(addItmes, "unzip pack");

                break;
            }
            case SeEnumTownItemeTypeA.LiBao:
            case SeEnumTownItemeTypeA.BaoXiang:
            case SeEnumTownItemeTypeA.SaiJiKaBao: {
                this.m_pkShopMgr.openChanceBox(pkTownItemRes.kId, pkTownItemRes.kValueA, num);
                break;
            }
            case SeEnumTownItemeTypeA.ZuanShi: {
                var count = Math.floor(num * parseInt(pkTownItemRes.kValueA || "0"));
                if (count != 0) {
                    this.decMoney(-count, 'zuanshiitem');
                }
                break;
            }
            case SeEnumTownItemeTypeA.BuffKa: {
                if (pkTownItemRes.kValueA) this.m_buffMgr.add_buffer(pkTownItemRes.kValueA);
                if (pkTownItemRes.kValueB) this.m_buffMgr.add_buffer(pkTownItemRes.kValueB);
                break;
            }
            case SeEnumTownItemeTypeA.ZhenFaSuiPian: {
                if (num < parseInt(pkTownItemRes.kValueB)) {
                    return false;
                }
                this.m_pkHeroCardMgr.addHeroCard(pkTownItemRes.kValueA, 1);
                break;
            }
            case SeEnumTownItemeTypeA.TouXiangKuang: {
                // 使用头像框道具 就是给自己装备上当前的头像框
                this.baseInfo.iconid = pkTownItemRes.kId;
                this.saveBaseInfo('iconid');
                if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, "iconid", this.baseInfo.iconid);
                // 这里最好的话推送一下好友，告诉他们这个好消息
                this.friendMgr.upload_state();
                this.m_guildMgr.upload_state();
                // 道具不需要删除
                useDel = false;
                break;
            }
            case SeEnumTownItemeTypeA.PiPeiJiFen: {
                var addnum = num * parseInt(pkTownItemRes.kValueA);
                if (!addnum) {
                    addnum = 0;
                }
                this.pvpMgr.pvp_score = this.pvpMgr.pvp_score + addnum;
                break;
            }
            case SeEnumTownItemeTypeA.DuanWeiXingXing: {
                var addnum = num * parseInt(pkTownItemRes.kValueA);
                if (!addnum) {
                    addnum = 0;
                }
                this.pvpMgr.pvp_star = this.pvpMgr.pvp_star + addnum;
                break;
            }
            case SeEnumTownItemeTypeA.ZengJiaFengWangYinJi: {
                var addnum = num * parseInt(pkTownItemRes.kValueA);
                if (!addnum) {
                    addnum = 0;
                }
                this.pvpMgr.fengwang_count = this.pvpMgr.fengwang_count + addnum;
                break;
            }
            case SeEnumTownItemeTypeA.ZhuChengJingYan: {
                var addnum = num * parseInt(pkTownItemRes.kValueA);
                if (!addnum) {
                    addnum = 0;
                }
                this.score = this.score + addnum;
                break;
            }
            case SeEnumTownItemeTypeA.LeiJiChongZhi: {
                let rInfo: RechargeInfo = {
                    orderid: "repaire" + Date.now(),
                    uid: this.id,
                    mailid: "",
                    amount: num * 100,
                    finish: true,
                    time: Date.now(),
                    sid: this.pvpMgr.seasonid,
                }

                this.rechargeDB.save(rInfo.orderid, rInfo);
                if (this.bInitComplete) {
                    global.netMgr.sendCharMiscUpdate(this.linkid, 'rechargestate', rInfo);
                    this.calculate_recharge(rInfo);
                    // 检查一下重置任务
                    this.m_taskMgr.doAction(TaskAction.Recharge, this._totalRechargeCount);
                    this.m_taskMgr.doAction(TaskAction.FirstPay, this._iFirstPay);
                }

                break;
            }
            case SeEnumTownItemeTypeA.ZhuChengPiFu: {
                let mcityid = pkTownItemRes.kValueA;
                if (mcityid) {
                    let str: string = pkTownItemRes.kValueB;
                    if (str) {
                        var jLists = str.split(':');
                        if (jLists.length == 2) {
                            switch (jLists[0]) {
                                case 'day': this.m_pkHeroCardMgr.addbosss(mcityid, Date.now() + (parseInt(jLists[1]) * 86400000), parseInt(pkTownItemRes.kValueC), typeid); break;
                            }
                        }
                    }
                }
                break;
            }
            case SeEnumTownItemeTypeA.HuiZhang: {
                let badgeid = pkTownItemRes.kValueA;
                if (badgeid) {
                    let str: string = pkTownItemRes.kValueB;
                    if (str) {
                        let time = Date.now();
                        if(this.baseInfo.medals[badgeid] && this.baseInfo.medals[badgeid] > time){
                            time = this.baseInfo.medals[badgeid];
                        }
                        var jLists = str.split(':');
                        if (jLists.length == 2) {
                            switch (jLists[0]) {
                                case 'day': this.addMedal(badgeid, time + (parseInt(jLists[1]) * 86400000)); break;
                            }
                        }
                    }
                }
                let buff = pkTownItemRes.kValueC;
                if(buff){
                    let buffIds:string[] = buff.split(",");
                    for(let i = 0; i < buffIds.length; i++){
                        this.m_buffMgr.add_buffer(buffIds[i]);
                    }
                }
                break;
            }
            case SeEnumTownItemeTypeA.YingXiongPiFu: {
                let mskinid = pkTownItemRes.kValueA;
                if (mskinid) {
                    let str: string = pkTownItemRes.kValueB;
                    if (str) {
                        var jLists = str.split(':');
                        if (jLists.length == 2) {
                            switch (jLists[0]) {
                                case 'day': this.m_pkHeroCardMgr.addskin(mskinid, Date.now() + (parseInt(jLists[1]) * 86400000), parseInt(pkTownItemRes.kValueC), typeid); break;
                            }
                        }
                    }
                }
                break;
            }
            case SeEnumTownItemeTypeA.BuHuiShouJiangChi: {
                let chanceid = pkTownItemRes.kValueA;
                if (chanceid) {
                    let action = pkTownItemRes.kValueB;
                    let item;
                    switch (action) {
                        case 'is_fresh': {
                            this.m_pkShopMgr.poolFlush(chanceid);
                            let activityId =  pkTownItemRes.kValueC;
                            if(activityId){
                                this.m_pkShopMgr.activityFlush(activityId);
                            }
                            break;
                        }
                        case 'is_all_get': {
                            item = this.m_pkShopMgr.poolRandom(chanceid);
                            while (item) {
                                this.addItem(item.tid, item.num, param1, param2);
                                item = this.m_pkShopMgr.poolRandom(chanceid);
                            }
                            break;
                        }
                        default: {
                            item = this.m_pkShopMgr.poolRandom(chanceid);
                            if (item) this.addItem(item.tid, item.num, param1, param2);
                        }
                    }
                }
                break;
            }
            case SeEnumTownItemeTypeA.QuanYingXiongLiBao: {
                // 使用了一个全英雄道具，这个很危险，使用的时候都打印一下
                console.log(`use item QuanYingXiongLiBao [${this.id}] ID [${pkTownItemRes.kId}:${num}] Time [${TeDate.DateToStr(Date.now())}]`);
                let list: { kid: string, type: number, num: number }[] = [];
                var allHeros = global.resMgr.UnitRes.getAllRes();
                for (var key in allHeros) {
                    var rkUnitRes: SeResUnit = allHeros[key];
                    if (rkUnitRes.iOpenGrade > 0 && rkUnitRes.iOpenGrade <= 99) {
                        // this.m_pkHeroCardMgr.addHeroCard(rkUnitRes.kID);
                        list.push({
                            kid: rkUnitRes.kID,
                            num: num,
                            type: TableRes.SeEnumchancekItemType.DanWei,
                        })
                    }
                }

                this.addHeroCardBatch(list);
                this.saveBaseInfo();
                break;
            }
            case SeEnumTownItemeTypeA.YinDaoZuoBiDaoJu: {
                let newNum = Math.floor(parseInt(pkTownItemRes.kValueA || '0') * num + this.guide);
                if (newNum < 1) newNum = 1;
                if (!isNaN(newNum)) {
                    this.guide = newNum;
                    this.saveBaseInfo("guide");
                }
                break;
            }

            case SeEnumTownItemeTypeA.ZhuangBei: {
                let data = {type: 'add', kId: pkTownItemRes.kValueA};
                for(let i = 0; i < num; i++){
                    if(param1 == 'pvenewawards'){
                        this.m_equipMgr.equip_opr(data, false);
                    }else{
                        this.m_equipMgr.equip_opr(data);
                    }
                }
                break;
            }

            case SeEnumTownItemeTypeA.ShangPinJieSuo: {
                pkTownItemRes
                this.m_pkShopMgr.update_shop_limit_time(pkTownItemRes.kValueA, parseInt(pkTownItemRes.kValueB || '1'));
                break;
            }

            case SeEnumTownItemeTypeA.ZhuGongKa: {
                this.addLord(pkTownItemRes.kValueA);
                break;
            }
            case SeEnumTownItemeTypeA.QinMiDuBuff: {
                let skin_id = pkTownItemRes.kValueA;
                if(this.baseInfo.hero_skin_record.indexOf(skin_id) == -1){
                    this.baseInfo.hero_skin_record.push(skin_id);
                    this.saveBaseInfo('hero_skin_record');
                    if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'hero_skin_record', this.baseInfo.hero_skin_record);
                }
                break;
            }
            case SeEnumTownItemeTypeA.ShenMiShangDianZiXuan: {
                let amount = pkTownItemRes.kValueA;
                let heroId = this.baseInfo.buyHeroId;
                let items = this.baseInfo.selectHerosCompose[heroId][amount];
                this.addItems(items, 'ShenMiShangDianZiXuan');
                break;
            }
            case SeEnumTownItemeTypeA.ZengJiaLianSheng: {
                var Seracetype = {"1011":"pvp_wincount","1111":"pvp_winpeakliancount","1311":"pvp_winshangjinliancount","1022":"pvp_win2v2count"}
                this.pvpMgr[Seracetype[pkTownItemRes.kValueB]] += Number(pkTownItemRes.kValueA) * num ;
                //通知榜单服
                var chartTable = global.resMgr.chartTable.getAllRes();
                for (let i in chartTable) {
                    if (pkTownItemRes.kValueB == '1011' && chartTable[i].eType == TableRes.SeEnumChartTableeType.PaiWeiLianSheng) {
                        this.pvpMgr.pvp_top_wincount = this.pvpMgr.pvp_wincount;
                        if (chartTable[i].iOpenGrade <= this.pvp_level) {
                            if (this.pvpMgr.pvp_top_wincount >= 2) {
                                global.chartMgr.addPlayerLevelChart(this.pvpMgr.seasonid, SeChartType.SCT_1V1_WIN, { seasonid: this.pvpMgr.seasonid, id: this.id, name: this.name, score: this.pvpMgr.pvp_top_wincount, icon: this.icon, avatar: this.avatar, igroup: this.pvpMgr.groupId, is_vip: this.baseInfo.is_vip, vip_level: this.baseInfo.vip_level});
                            }
                        }
                    }
                    if (pkTownItemRes.kValueB == '1022' && chartTable[i].eType == TableRes.SeEnumChartTableeType.ZuDuiLianSheng) {
                        this.pvpMgr.pvp_top_win2v2count = this.pvpMgr.pvp_win2v2count;
                        if (chartTable[i].iOpenGrade <= this.pvp_level) {
                            if (this.pvpMgr.pvp_top_win2v2count >= 2) {
                                global.chartMgr.addPlayerLevelChart(this.pvpMgr.seasonid, SeChartType.SCT_2V2_WIN, { seasonid: this.pvpMgr.seasonid, id: this.id, name: this.name, score: this.pvpMgr.pvp_top_win2v2count, icon: this.icon, avatar: this.avatar, igroup: this.pvpMgr.groupId, is_vip: this.baseInfo.is_vip, vip_level: this.baseInfo.vip_level});
                            }
                        }
                    }
                }
                break;
            }
            default: {
                // return false;
                break;
            }
        }

        if ((pkTownItemRes.iProperty & SeEnumTownItemiProperty.TuiSongDiSanFang) == SeEnumTownItemiProperty.TuiSongDiSanFang) {
            // 使用效果是推送给别人的 这里只是一个例子，实际还是需要单独写逻辑的
            this.TuiSongDiSanFang(pkTownItemRes, num);
        }

        // 使用成功后都需要给玩家发送一个道具视野消息，防止玩家不知道原因
        if (this.loadComplete && param1 != 'pvenewawards') {
            this.addCommonNotice('useitem', '道具', '成功使用道具[' + pkTownItemRes.kName + ']*' + num);
        }

        global.logMgr.itemLog(this, typeid, num, 0, 'use');

        return useDel;
    }

    public addCommonNotice(type: string, title?, notice?, show = false) {
        global.netMgr.sendCommonNotice(this.linkid, type, title, notice, show);
    }

    public useItem(typeid: string, num: number, param1: any = null, param2: any = null): boolean {
        if (num <= 0) {
            return false;
        }
        // 玩家没有道具存储系统，所有的道具都是立即使用掉的，使用后增加对应的一些数据
        if (this.m_pkItemMgr.getItemCount(typeid) < num) {
            // 数量不够的时候不能使用
            return false;
        }

        if (!this._useItem(typeid, num, param1, param2)) {
            return false;
        }

        this.m_pkItemMgr.delItem(typeid, num, DeAddDelItemReason.useitem);

        return true;
    }

    public itemCount(typeid: string) {
        return this.m_pkItemMgr.getItemCount(typeid);
    }

    // 暂时是提供给字模块使用的，不对前段直接开放
    public addHeroCard(kHeroID: string, num: number = 1, nosave: boolean = false) {
        return this.m_pkHeroCardMgr.addHeroCard(kHeroID, num, nosave);
    }

    public addHeroCardBatch(arr: Array<{ kid: string, type: number, num: number }>, notice: boolean = true, boxID?) {
        return this.m_pkHeroCardMgr.addHeroCardBatch(arr, notice, boxID);
    }

    public upgradeCard(kHeroID: string) {
        return this.m_pkHeroCardMgr.upgradeCard(kHeroID);
    }

    public cheatMsg(params: Array<string>) {
        switch (params[0]) {
            case '-addhero': {
                this.m_pkHeroCardMgr.addHeroCard(params[1], params[2] ? parseInt(params[2]) : 1);
                break;
            }
            case '-setsoldier': {
                var rkCard = this.m_pkHeroCardMgr.getHeroCard(params[1]);
                if (!rkCard) {
                    break;
                }
                global.netMgr.sendChooseSoldierRet(this.linkid, true, params[1], params[2]);
                break;
            }
            case '-addbox': {
                var addcount = parseInt(params[1]) || 1;
                break;
            }
            case '-gold': {
                global.playerMgr.onGiveMail(this.plt, this.id, SeMailType.SYSTEM, '想通过作弊拿钱，做梦吧', [{ kItemID: params[1], iPileCount: parseInt(params[2]) || 1 }]);
                break;
            }
            case '-getitem': {
                global.playerMgr.onGiveMail(this.plt, this.id, SeMailType.SYSTEM, '你通过作弊拿到的道具,可耻', [{ kItemID: params[1], iPileCount: parseInt(params[2]) || 1 }]);
                break;
            }
            case '-equip_opr': {
                this.m_equipMgr.equip_opr({type: params[1], kId: params[2]});
                break;
            }
            case '-allhero': {
                // 解锁所有英雄
                let list: { kid: string, type: number, num: number }[] = [];
                var allHeros = global.resMgr.UnitRes.getAllRes();
                for (var key in allHeros) {
                    var rkUnitRes: SeResUnit = allHeros[key];
                    if (rkUnitRes.iOpenGrade > 0 && rkUnitRes.iOpenGrade <= 99) {
                        // this.m_pkHeroCardMgr.addHeroCard(rkUnitRes.kID);
                        list.push({
                            kid: rkUnitRes.kID,
                            num: 1,
                            type: TableRes.SeEnumchancekItemType.DanWei,
                        })
                    }
                }

                this.addHeroCardBatch(list);
                this.saveBaseInfo();
                break;
            }
            case '-onekeycheat': {
                // 一键全满
                this.score += parseInt(params[1] || '0') || 1000000000;
                var allHeros = global.resMgr.UnitRes.getAllRes();
                for (var key in allHeros) {
                    var rkUnitRes: SeResUnit = allHeros[key];
                    this.m_pkHeroCardMgr.addHeroCard(rkUnitRes.kID);
                    var card: SeHeroCard = this.m_pkHeroCardMgr.getHeroCard(rkUnitRes.kID);
                    //       card.iSkillA = 10;
                    //       card.iSkillB = 10;

                }

                this.saveBaseInfo();
                break;
            }
            case '-addscore': {
                this.score = this.score + parseInt(params[1]);
                break;
            }
            case "-delitem": {
                this.m_pkItemMgr.delItem(params[1], parseInt(params[2]), DeAddDelItemReason.cheatdel);
                break;
            }
            // case '-query': {
            //     // this.onQueryBlock();
            //     var tt = Date.now();
            //     for (var i = 0; i < 1000; i++)                this.m_pkShopMgr.test_rand_cards();
            //     console.log(Date.now() - tt);
            //     break;
            // }
            case '-guide': {
                this.guideNext({ step: parseInt(params[1]), index: 0 })
                break;
            }
            case '-boxtest': {
                var pkItemRes = global.resMgr.TownItemRes.getRes(params[1]);
                if (pkItemRes && pkItemRes.eTypeA == SeEnumTownItemeTypeA.DengJiBaoXiang) {
                    var type = parseInt(pkItemRes.kValueB || '0');
                    var iLevel = parseInt(pkItemRes.kValueA || '0');
                    this.m_pkShopMgr.openBoxBatch(pkItemRes.kId, parseInt(params[2] || '1'), iLevel, type, true);
                }
                break;
            }
            // case '-getandopen': {
            //     var rkBox = this.pvpMgr.boxTest();
            //     global.netMgr.sendCommonNotice(this.linkid, 'get_box_test', ``, `${JSON.stringify(rkBox)}`, true);
            //     break;
            // }
            case '-zhiyangbox': {
                var zhiyangBox;
                if(params[1] == 'pve'){
                    zhiyangBox = this.pveNewMgr.test_finishfight(params[2].split('-')[0], parseInt(params[2].split('-')[1] || '1'));
                }else{
                    zhiyangBox = this.m_pkShopMgr.test_rand_cards(params[1], parseInt(params[2] || '1'));
                }
                
                global.netMgr.sendCommonNotice(this.linkid, 'get_box_test', ``, `${JSON.stringify(zhiyangBox)}`, true);
                break;
            }
            case '-alllevel': {
                if (params) params.shift();
                this.m_pkHeroCardMgr.resetHeroLv(...params);
                break;
            }
            case '-addtask': {
                this.m_taskMgr.addDailyTask(params[1]);
                break;
            }

            case '-settaskvalue': {
                this.m_taskMgr.setTaskValue_cheat(params[1], params[2]);
                break;
            }
            case '-inittest': {
                let addNum = parseInt(params[1] || '1');
                if (isNaN(addNum) || !addNum) {
                    addNum = 1;
                }
                this.m_pkHeroCardMgr.resetHeroLv(6 + addNum, 4 + addNum, 2 + addNum, addNum);
                this.baseInfo.level = 6 + addNum;
                this.baseInfoDB.msave([{ k: 'level', v: this.level }]);
                if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'score', this.score, this.level);
                break;
            }
            case '-setlvl': {
                this.pvpMgr.cheat_pvp_level(parseInt(params[1]));
                break;
            }
            case '-refreshshop': {
                this.m_pkShopMgr.refreshDaily();
                break;
            }
            case '-star': {
                this.pvpMgr.pvp_star++;
                break;
            }
            case '-tehuibuy': {
                // 作弊购买
                var kid: string = params[1];
                // this.m_pkShopMgr.finishLevelTehui()

                var pkMail = global.resMgr.ShopMallRes.getRes(kid);
                if (!pkMail) break;
                var pkRecharge = global.resMgr.RechargeRes.getRes(pkMail.akContent);
                if (!pkRecharge) break;

                var amoutInfo: RechargeInfo = {
                    orderid: 'BID' + kid + 'UID' + this.id + Date.now(),
                    uid: this.id,
                    mailid: kid,
                    amount: pkRecharge.iRMB * 100,
                    sid: this.pvpMgr.seasonid,
                    time: Date.now(),
                    finish: true,
                }
                this.rechargeDB.save(amoutInfo.orderid, amoutInfo);
                this.addRecharge(amoutInfo);
                if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'rechargestate', amoutInfo);
                break;
            }
            case '-addbuff': {
                var kid: string = params[1];
                this.m_buffMgr.add_buffer(kid);
                break;
            }
            case '-delbuff': {
                var kid: string = params[1];
                this.m_buffMgr.del_buffer(kid);
                break;
            }
            case '-addelo': {
                if (!params[1]) return;
                this.pvpMgr.pvp_score += parseInt(params[1]);
                break;
            }
            case '-addpeakelo': {
                if (!params[1]) return;
                this.pvpMgr.peak_score += parseInt(params[1]);
                break;
            }
            case '-saijiback': {
                this.pvpMgr.cheat_checkSeason();
                // this.pvpMgr.peak_score = 1600;
                break;
            }
            case '-testPeak': {
                this.pvpMgr.cheat_test_peak();
                // this.pvpMgr.peak_score = 1600;
                break;
            }
            case '-setpeak': {
                this.pvpMgr.peak_score = parseInt(params[1]);
                this.pvpMgr.test(this.pvpMgr.peak_score);
                break;
            }
            case '-addmail': {
                var mailType = parseInt(params[1]);
                var count = parseInt(params[2]) || 1;
                for(let i = 0; i < count; i++){
                    if ([SeMailType.FriendKey, SeMailType.PvpResult].indexOf(mailType) < 0 && mailType <= SeMailType.Chart) {
                        global.playerMgr.onGiveMail(this.plt, this.id, parseInt(params[1]), '作弊测试邮件类型的 ' + params[1].toString(), [{ kItemID: 'W001', iPileCount: 1 }]);
                    }
                }
                
                break;
            }
            case '-useAllMail': {
                for(var key in this.baseInfo.mails){
                    var rkMail: SeCharMailInfo = this.baseInfo.mails[key];
                    if (rkMail && rkMail.mailstate == 0) {
                        this.mailMgr._use_mail_item(rkMail);
                        global.logMgr.maillog(this, rkMail.mailid, 'use', JSON.stringify({ items: rkMail.items }));
                        rkMail.mailstate = 1;
                        this.saveBaseInfo('mails');
                    }

                    if(rkMail && rkMail.mailstate == 1){
                        this.mailMgr.delMail(rkMail.mailid);
                    }
                }
                break;
            }
            case '-addLevelTehui': {
                this.addLevelTehui(parseInt(params[1]));
                break;
            }
            case '-downgrade': {
                // 重置到上个版本的用户数值
                var vs = global.resMgr.getUpdateKeyVer('userver');
                var pre = '';
                for (var i = 0; i < vs.length; i++) {
                    if (vs[i] == this.baseInfo.version) break;
                    pre = vs[i];
                }

                this.baseInfo.version = pre;
                this.saveBaseInfo('version');
                break;
            }
            case '-share_uid': {
                this.baseInfo.share_uid = parseInt(params[1]);
                this.saveBaseInfo('share_uid');
                break;
            }
            case '-chartcheat': {
                params.splice(0, 1);
                global.chartMgr.sendCSData({ cmd: 'cheat', data: params });
                break;
            }
            case '-shopclear': {
                this.m_pkShopMgr.clear_limit();
                break;
            }
            case '-resetdaily': {
                this.baseInfo.dailyInfo = new SeDailyInfo();
                this.updateDailyInfo();
                break;
            }
            case '-linkclick': {
                let inviteReward = global.resMgr.getConfig('inviteReward');
                if (!inviteReward) {
                    return;
                }
                let item = inviteReward.split(',');
                let uid = parseInt(params[1]);
                global.playerMgr.onGiveMail(this.plt, this.id, SeMailType.ShareBack, JSON.stringify({ uid: uid, icon: this.icon, avatar: this.avatar }), [{ kItemID: item[0], iPileCount: parseInt(item[1]) }]);

                break;
            }
            case '-testegg': {
                let ret = [];
                let count = parseInt(params[1]);
                for (let i = 0; i < count; i++) {
                    let _ret = [];
                    this.m_pkShopMgr.poolFlush('JD001');
                    let item = this.m_pkShopMgr.poolRandom('JD001');
                    while (item) {
                        _ret.push(item);
                        item = this.m_pkShopMgr.poolRandom('JD001');
                    }
                    ret.push(_ret);
                }
                global.netMgr.sendData({ cmd: "testegg", ret: ret }, this.linkid);
                break;
            }
            case '-notice': {
                this.sendAnnouncement(SeEnumnoticetexteType.ShengJi, { playerlevel: this.baseInfo.level }, this);
                break;
            }
            case '-test':{
                break;
            }
            case '-deleteme': {
                this.offline_mailInfoDB.clearAll();
                this.baseInfoDB.clearAll();
                this.shopDb.clearAll();
                this.pvpDb.clearAll();
                this.rechargeDB.clearAll();
                this.taskDb.clearAll();

                this.needdelete = 1;
                global.playerMgr.kickPlayer(this.baseInfo.charid);
                break;
            }
            case '-xiaodu': {
                global.playerMgr.xiaoDuRecharge(this.id, [{name : 'baiduOrderReferenceId', value : params[1]}]);;
            }
            case '-addShangjinCount': {
                for(let i =0 ; i < parseInt(params[1]); i++){
                    this.pvpMgr.on_match_pvp_fight_shangjin(true, 0, true, 1500, false, '', '');
                }
                break;
            }
            case '-setLord': {
                this.lord = params[1];
                break;
            }
            case '-getweapon': {
                this.m_equipMgr.cheat_add_equip(params[1], params[2], params[3]);
                break;
            }
            case '-setAllEquip': {
                this.m_equipMgr.cheat_set_equip_All(params[1], params[2]);
                break;
            }
            case '-cmd':{
                global.netMgr._onReciveData(this.linkid, JSON.parse(params[1]));
                break;
            }
            case '-pveStar':{
                var pveInfo = global.resMgr.pveInfoRes.getAllRes();
                for(var key in pveInfo){
                    if(pveInfo[key].iType != Number(params[1])){
                        continue;
                    }
                    var id = pveInfo[key].kid;
                    if(this.pvpMgr.getInfo().levelInfo[id]){
                        this.pvpMgr.getInfo().levelInfo[id].star = 3;
                    }
                    this.pvpMgr.saveInfo(['levelInfo']);
                }
                break;
            }

            case '-testglorywin':{
                let glory_score_add = parseInt(global.resMgr.getConfig('glory_score').split(',')[parseInt(params[1]) - 1]);
                this.pvpMgr.glory_score += glory_score_add;
                this.pvpMgr.glory_score_all += glory_score_add;
                this.pvpMgr.saveInfo(["glory_score", "glory_score_all"]);
                break;
            }
            case '-changePvePkRank':{
                global.globalChartMgr.queryinfo(this.pvpMgr.seasonid, this.id, Number(params[1]), SeChartType.SCT_GLOBAL_PVE_OFFLINE);
                break;
            }
            case '-useHeroSkin':{
                let skin_id = params[1];
                let count = parseInt(params[2]);
                if(!this.baseInfo.hero_skin_use[skin_id]) this.baseInfo.hero_skin_use[skin_id] = 0;
                this.baseInfo.hero_skin_use[skin_id] = count;
                this.saveBaseInfo('hero_skin_use');
                if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'hero_skin_use', this.baseInfo.hero_skin_use);
                break;
            }
        }
    }

    public getHistoryChart(charType: SeChartType, iCurrentPage: number, length: number) {
        if (charType == SeChartType.SCT_PUTONG_LEVEL_SPEED) {
            global.chartMgr.getPlayerHistoryLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[0]);
        }
        else if (charType == SeChartType.SCT_KUNNAN_LEVEL_SPEED) {
            global.chartMgr.getPlayerHistoryLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[1]);
        }
        else if (charType == SeChartType.SCT_DIYU_LEVEL_SPEED) {
            global.chartMgr.getPlayerHistoryLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[2]);
        }
        else if (charType == SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED) {
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[0]);
            }
        }
        else if (charType == SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED) {
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerHistoryLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[1]);
            }
        }
        else if (charType == SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED) {
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerHistoryLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[2]);
            }
        }
        else if (charType == SeChartType.SCT_GLORY_SCORE) {
            global.chartMgr.getPlayerHistoryLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.glory_score);
        }
        else if (charType == SeChartType.SCT_GLOBAL_GLORY_SCORE) {
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerHistoryLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.glory_score);
            }
        }
    }

    public getChart(charType: SeChartType, iCurrentPage: number, length: number) {
        if (charType == SeChartType.SCT_GROUP_PVP_SCORE) {
            global.chartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, this.pvpMgr.groupId.toString());
        }
        else if(charType == SeChartType.SCT_GLOBAL_PVP_SCORE){
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null);
            }
        }
        else if(charType == SeChartType.SCT_GLOBAL_PEAK_SCORE){
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.peak_score);
            }
        }
        else if (charType == SeChartType.SCT_PEAK_SCORE) {
            global.chartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.peak_score);
        }
        else if (charType == SeChartType.SCT_PUTONG_LEVEL_SPEED) {
            global.chartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[0]);
        }
        else if (charType == SeChartType.SCT_KUNNAN_LEVEL_SPEED) {
            global.chartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[1]);
        }
        else if (charType == SeChartType.SCT_DIYU_LEVEL_SPEED) {
            global.chartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[2]);
        }
        else if(charType == SeChartType.SCT_GLORY_SCORE){
            global.chartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.glory_score_all);
        }
        else if(charType == SeChartType.SCT_GLOBAL_GLORY_SCORE){
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.glory_score_all);
            }
        }
        else if (charType == SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED) {
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[0]);
            }
        }
        else if (charType == SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED) {
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[1]);
            }
        }
        else if (charType == SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED) {
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.pvpMgr.level_speed[2]);
            }
        }
        else if (charType == TableRes.SeEnumChartTableeType.ZhenYingDuiKangWei || charType == TableRes.SeEnumChartTableeType.ZhenYingDuiKangShu || charType == TableRes.SeEnumChartTableeType.ZhenYingDuiKangWu) {
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.baseInfo.toy_camp.contribution);
            }
        }
        else if (charType == SeChartType.SCT_GLOBAL_PVE_OFFLINE) {
            if(configInst.get('globalCsMgr.url')){
                global.globalChartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null, this.baseInfo.toy_camp.contribution);
            }
        }
        else {
            global.chartMgr.getPlayerLevelChart(this.pvpMgr.seasonid, charType, iCurrentPage, length, this.id, null);
        }
    }

    public getkillrecord() {
        if(configInst.get('globalMgr.url-all')){
            var info = {
                cmd: 'getkillrecord',
                uid: this.id,
            }
            global.globalMgrAll.sendMSData(info);
        }
    }

    public getHisChart(charType: number, seasionid: string) {
        global.chartMgr.getPlayerLevelChart(seasionid, charType, 0, 10, this.id, this.pvpMgr.groupId.toString());
    }

    private _rankCache = {};

    public onGetRankRet(v: { type: number, rank: number }[]) {
        for (var i = 0; i < v.length; i++) {
            this._rankCache[v[i].type] = v[i].rank;
            v[i].type == SeChartType.SCT_PVP_SCORE && this.pvpMgr && (this.pvpMgr.top_pvp_rank = v[i].rank);
            v[i].type == SeChartType.SCT_GLOBAL_PVE_OFFLINE && this.pvpMgr && this.pvpMgr.set_pve_pk_rank(v[i].rank);
        }

        global.netMgr.sendData({
            cmd: 'chartrank',
            uid: this.id,
            infos: v
        }, this.linkid);
    }

    public onGetCharRet(charType: number, startIndex: number, length: number, rankInfo: any, rank: number) {
        //多维度的排行榜对score进行取整
        if(charType == TableRes.SeEnumChartTableeType.pveXingShuBang){
            for(let i = 0; i < rankInfo.length; i++){
                rankInfo[i].score = parseInt(rankInfo.score);
                rankInfo[i].value.score = parseInt(rankInfo[i].value.score);
            }
        }
        if(charType == TableRes.SeEnumChartTableeType.LianJunJingJiChang){
            global.playerMgr.pve_pk_length = length;
        }
        if (startIndex == undefined) {
            global.netMgr.sendChartInfoRet(this.linkid, charType, rankInfo, 0, 0, rank);
            return;
        }

        global.netMgr.sendChartInfoRet(this.linkid, charType, rankInfo, startIndex, length, rank);
        return;
    }

    public onGetHistoryCharRet(charType: number, startIndex: number, length: number, rankInfo: any, rank: number) {
        if (startIndex == undefined) {
            global.netMgr.sendHistoryChartInfoRet(this.linkid, charType, rankInfo, 0, 0, rank);
            return;
        } 

        global.netMgr.sendHistoryChartInfoRet(this.linkid, charType, rankInfo, startIndex, length, rank);
        return;
    }

    public onGetHisCharRet(charType: SeChartType, sid: string, rankInfo: any, rank: number) {
        global.netMgr.sendChartHisInfoRet(this.linkid, charType, rankInfo, rank, sid);
        return;
    }

    /**
     * 完成引导不走
     * @param {any} data
     */
    guideNext(data) {
        global.logMgr.guideLog(this, data.step, this.guide, data.index);
        if (data.step > this.guide) {
            if (data.step >= 8 && !this.pvpMgr.groupId && !this.pvpMgr.groupState) {
                this.pvpMgr.groupState = 'new';
                global.chartMgr.apply_group_id(this.pvpMgr.seasonid, SeChartType.SCT_GROUP_PVP_SCORE, this.id, this.pvpMgr.groupState);
            }

            var rewards = global.resMgr.getGuideAward(this.guide);
            rewards && this.addItems(rewards, 'guide');
            this.guide = data.step;
            this.saveBaseInfo("guide");
        }
    }

    getHeroCard(heroId: string): SeHeroCard {
        return this.m_pkHeroCardMgr.getHeroCard(heroId);
    }

    /**
     * 更新限制卡状态
     * @param ltype [match]
     */
    updateTryHeroCard(ltype: string) {
        return this.m_pkHeroCardMgr.updateTryHeroCard(ltype);
    }

    getPlanFormation(plan: number) {
        return this.m_pkHeroCardMgr.getPlanFormation(plan);
    }

    setDefaultPlan(index: number) {
        if (!this.loadComplete) {
            return;
        }

        this.m_pkHeroCardMgr.defaultPlan = index;
        this.lord = this.baseInfo.lordFormation[index];
    }

    getLogFormation() {
        let formation = this.m_pkHeroCardMgr.defaultFomation;
        let out: { id: string, level: number }[] = []
        for (let i = 0; i < formation.length; i++) {
            let id = formation[i];
            let r = this.getHeroCard(id);
            if (r) {
                out.push({
                    id: r.kHeroID,
                    level: r.iLevel
                })
            }
            else {
                out.push({
                    id: id,
                    level: 1
                })
            }
        }
        return out;
    }

    revertFormation(formation_1v2: Array<SeLogicFormation>) {
        let out: { id: string, level: number }[] = []
        for (let r of formation_1v2) {
            if (r) {
                out.push({
                    id: r.kHeroID,
                    level: r.iLevel
                })
            }
        }
        return out;
    }

    getMatchFScore() {
        return global.resMgr.getHeroFightScore(this.matchFormation).iReal;
    }

    get matchFormation() {
        return this.m_pkHeroCardMgr.matchFormation;
    }

    get matchShangjinFormation() {
        return this.m_pkHeroCardMgr.matchShangjinFormation;
    }

    get bossFormation() {
        return this.baseInfo.bossFormation;
    }

    get pve_pk_extra_info() {
        let pve_pk_extra_info = {};
        pve_pk_extra_info['medals'] = this.baseInfo.curMedals;
        pve_pk_extra_info['guild_id'] = this.baseInfo.guild_info.guild_id;
        pve_pk_extra_info['guild_name'] = this.baseInfo.guild_info.guild_name;
        pve_pk_extra_info['zhanqi'] = this.baseInfo.battleBanner;
        return pve_pk_extra_info;
    }

    get battleCampBoss() {
        return this.baseInfo.battlecampboss;
    }

    /**
     * 获取比赛专用的第4套方案，这套方案是特殊的
     */
    get roomFormation() {
        var df: string[] = this.m_pkHeroCardMgr.defaultFomation;
        var fm: Array<SeLogicFormation> = [];
        for (var i = 0; i < df.length; i++) {
            var kID = df[i];
            fm.push({ kHeroID: kID, iLevel: global.resMgr.getHeroPerLevel(kID), kSkin: this.m_pkHeroCardMgr.getHeroSkin(df[i]) });
        }

        return fm;
    }

    public queryItemSales(itemid: string) {
        return this.m_pkShopMgr.queryShopItem(itemid);
    }

    /**
     * 获得过的总卡牌数量
     */
    get totalCard() {
        return this.m_pkHeroCardMgr.totalCard;
    }
    /**
       * 获得过的总卡牌数量
       */
    get totalCardScore() {
        return this.m_pkHeroCardMgr.totalCardScore;
    }
    /**
     * 获得的总英雄数量
     */
    get totalHero() {
        return this.m_pkHeroCardMgr.totalHero;
    }

    get maxTeamScore(): number {
        var allHero: Array<any> = this.m_pkHeroCardMgr.heroCards && this.m_pkHeroCardMgr.heroCards.concat();
        allHero.sort(function (a: any, b: any): number {
            var aPkHero: SeResUnitEx = global.resMgr.UnitRes.getRes(a.kHeroID);
            var bPkHero: SeResUnitEx = global.resMgr.UnitRes.getRes(b.kHeroID);
            var aScore = aPkHero ? aPkHero.aiBattleScore[a.iLevel] : 0;
            var bScore = bPkHero ? bPkHero.aiBattleScore[b.iLevel] : 0;
            if (aScore > bScore) return -1;
            if (aScore < bScore) return 1;
            return 0;
        });
        var score: number = 0;
        for (var i = 0; i < allHero.length && i < 8; i++) {
            var pkHero: SeResUnitEx = global.resMgr.UnitRes.getRes(allHero[i].kHeroID);
            score += pkHero ? pkHero.aiBattleScore[allHero[i].iLevel] : 0;
        }
        return score;
    }

    rechargeIdChgange(mailid) {
        switch (mailid) {
            case 'K017': mailid = 'M509'; break;
            case 'K018': mailid = 'M510'; break;
            case 'K019': mailid = 'M511'; break;
            case 'K020': mailid = 'M512'; break;
            case 'K021': mailid = 'M513'; break;
            case 'K022': mailid = 'M514'; break;
            case 'K023': mailid = 'M515'; break;
            default: break;
        }
        return mailid;
    }

    private last_recharge_check_time: number = 0;

    //--------------------支付相关的
    /**
     * 用户发起的充值验证请求 
     * @param type 
     * @param info 
     */
    rechargeOpr(type, info: ifRecharge1, mailid: string) {
        switch (type) {
            case 'check': {
                // 支付发起增加一个时间限制，3s内只能发起一次
                let curr = Date.now();
                if (curr - this.last_recharge_check_time < 3000) {
                    console.log("<recharge too near> id<" + this.id + "> time<" + curr + ">");
                    return;
                }

                this.last_recharge_check_time = curr;

                if (global.plt == 'wx' && this.loginInfo && this.loginInfo.device_os == 'ios') {
                    // 这里判断ios的微信版本支付开关
                    if (!parseInt(global.resMgr.getConfig('iospay') || '0')) {
                        global.netMgr.sendRechargeRet(this.linkid, 'notopen', {});
                        return;
                    }
                }

                // 生成验证用的数据
                mailid = this.rechargeIdChgange(mailid);

                let mallRes = global.resMgr.ShopMallRes.getRes(mailid);
                if (!mallRes) return;

                // 检查一下是否可以购买
                if (this.m_pkShopMgr.is_shop_limit(mailid, 1)) {
                    return;
                }

                // 这里可能需要检查一下数量
                if (info.amount <= 0) {
                    return;
                }

                // 需要添加上一部分数据，然后提交给登陆服务器
                info.accountId = this.id;       // 记录玩家id
                info.cpOrderId = `BID${mailid}UID${this.id}T${Math.floor(curr / 1000)}R${Math.floor(Math.random() * 10)}`; // 生成订单号
                global.lsMgr.sendRecharge(type, info);

                global.logMgr.rechargeStateLog(this, mallRes.akContent[0], info.amount, curr, info.cpOrderId, 'make order');
                break;
            }
        }
    }

    private _totalRechargeCount = 0;
    private _iFirstPay = 0;

    /**
     * 计算充值相关的任务
     * @param rInfo 
     */
    private calculate_recharge(rInfo: RechargeInfo) {
        // 老数据存储的是 shopmall的记录，所以没法直接关联 recharge表格
        // 如果策划误删除了相关记录的话，就当首充和累计充值是记录进去的

        if (!rInfo) return;
        let mall_res = global.resMgr.ShopMallRes.getRes(rInfo.mailid);
        if (!mall_res || !mall_res.akContent || !mall_res.akContent[0]) {
            // 老的充值订单的话就算计去，以后最好不要老是删除数据
            this._totalRechargeCount += rInfo.amount;
            this._iFirstPay = 1;
            return;
        }
        let recharge_info = global.resMgr.RechargeRes.getRes(mall_res.akContent[0]);
        if (!recharge_info) {
            this._totalRechargeCount += rInfo.amount;
            this._iFirstPay = 1;
            return;
        }
        if ((recharge_info.iProperty & SeEnumrechargeiProperty.BuJiRuLeiJiChongZhi) != SeEnumrechargeiProperty.BuJiRuLeiJiChongZhi) {
            this._totalRechargeCount += rInfo.amount;
        }

        if ((recharge_info.iProperty & SeEnumrechargeiProperty.BuJiRuShouChong) != SeEnumrechargeiProperty.BuJiRuShouChong) {
            this._iFirstPay = 1;
        }
    }

    public cact_time_from_order(order: string) {
        // 这里在历史上有两个版本的订单规则
        // 第二版 BID_UID_T_R 时间是按照秒的
        try {
            let idx_st = order.indexOf('T');
            let idx_ed = order.indexOf('R');
            let v2_str = order.substring(idx_st + 1, idx_ed);
            if (v2_str.length == 10) return parseInt(v2_str) * 1000;

            // 第一版 BID_UID_TO_TO_TO 时间是按照毫秒的
            let v1_arr = order.split('TO');
            if (v1_arr.length == 4) return parseInt(v1_arr[2]);
        }
        catch (e) {

        }
        return Date.parse('2018-01-10');
    }

    /**
     * 登陆的时候检查离线充值数据
     */
    public checkChargeInfoWhenLoad() {
        var infos = this.rechargeDB.value;
        for (var key in infos) {
            var rInfo = <RechargeInfo>infos[key];
            if (!rInfo) continue;
            // this._totalRechargeCount += rInfo.amount;
            this.calculate_recharge(rInfo);

            if (rInfo.mailid != this.rechargeIdChgange(rInfo.mailid)) {
                rInfo.mailid = this.rechargeIdChgange(rInfo.mailid);
                rInfo.finish = false;
                console.log('rechargeid to maillid bug fix:' + rInfo.orderid);
            }

            if (rInfo.finish) {
                if (!rInfo.time) {
                    rInfo.time = this.cact_time_from_order(rInfo.orderid);
                    this.rechargeDB.save(key, rInfo);
                }
                continue;
            }
            else {
                rInfo.finish = true;
                rInfo.time = Date.now();
                rInfo.sid = this.pvpMgr.seasonid;
                this.rechargeDB.save(key, rInfo);
                this.addRecharge(rInfo, true);
            }
        }
    }

    public addRecharge(amoutInfo: RechargeInfo, slince: boolean = false) {
        // 通过充值的额度获取配置信息
        var pkRes: SeResrecharge;
        var realAdd = 0;
        var pkmail = global.resMgr.ShopMallRes.getRes(amoutInfo.mailid);
        if (!pkmail) return;
        if (pkmail && pkmail.akContent) pkRes = global.resMgr.RechargeRes.getRes(pkmail.akContent[0]);
        //判定限购
        if(this.m_pkShopMgr.is_shop_limit(pkmail.kID,1)){
            //添加同等金额的钻石
            this.addItem('W001', pkRes.iReturnDiamond * 10, "recharge_shop_limit_" + amoutInfo.mailid);
            global.logMgr.moneylog(this, 'rechargeadd', this.baseInfo.money + realAdd, this.baseInfo.money, amoutInfo.orderid, realAdd.toString());

            global.logMgr.rechargeLog(this, pkRes.kID, amoutInfo.amount, amoutInfo.time, amoutInfo.orderid);
            global.logMgr.rechargeStateLog(this, pkRes.kID, amoutInfo.amount, amoutInfo.time, amoutInfo.orderid, 'order finish');    
            return;
        }
        // 订单号里面有购买的道具id
        var addItems: SeItem[] = [];

        this.m_pkShopMgr.add_shop_limit(amoutInfo.mailid, 1);
        // this.m_pkShopMgr.update_lgift_time(amoutInfo.mailid, true);

        //新手礼包跑马灯
        if (amoutInfo.mailid == 'MA004') {
            this.sendAnnouncement(TableRes.SeEnumnoticetexteType.GouMaiXinShouDaLi, { charname: this.name }, this);
        }
        
        if (!pkRes || pkRes == undefined) {
            global.logMgr.log('charge error:' + amoutInfo.orderid);
            return false;
        }

        if (pkRes.iRMB && (pkRes.iRMB * 100 != amoutInfo.amount)) {
            return false;
        }

        var plus = 1;
        if (pkRes.iFirstDouble && !this.hasSameAmountOrder(amoutInfo.mailid, amoutInfo.orderid, this.pvpMgr.seasonid)) {
            plus = 2;
        }


        //tga rechargeadd 记录的id
        var rechargeIds = 'A016,A017,A018,A019,A020,A021';
        for (var i = 0; i < pkRes.akItem.length; i++) {
            var r_item = pkRes.akItem[i].split(',');
            var kid = r_item[0];
            var num = parseInt(r_item[1] || '1');
            var pkItemRes = global.resMgr.TownItemRes.getRes(kid);
            if (pkItemRes) {
                addItems.push({
                    kItemID: pkItemRes.kId,
                    iPileCount: num * plus
                })
            }

            if (pkItemRes.eTypeA == SeEnumTownItemeTypeA.ZuanShi) {
                realAdd = num * plus;
            }
            else if(pkItemRes.eTypeA == SeEnumTownItemeTypeA.HeZi && rechargeIds.indexOf(pkItemRes.kId) >= 0){
                let items = pkItemRes.kValueA.split('|');
                let add_num = 0;
                for(let j = 0; j < items.length; j++){
                    if(items[j].split(',')[0] == 'W001'){
                        add_num += parseInt(items[j].split(',')[1]);
                    }
                }
                realAdd = add_num * plus;
            }
        }

        var mailitems: SeItem[] = [];

        if (addItems.length > 0) {
            // this.addItems(addItems);
            for (var i = 0; i < addItems.length; i++) {
                var rkItem = addItems[i];
                mailitems.push({ kItemID: rkItem.kItemID, iPileCount: rkItem.iPileCount });
                // global.playerMgr.onGiveMail(this.plt,this.id, SeMailType.SYSTEM, "充值奖励道具到账", [{ kItemID: rkItem.kItemID, iPileCount: rkItem.iPileCount }]);
            }
        }

        // 充值都通过邮件发送到玩家手上

        // var ids = global.resMgr.getItemTypeBySubType(SeEnumTownItemeTypeA.ZuanShi, '1');
        // mailitems.push({ kItemID: ids[0] || 'W001', iPileCount: realAdd });

        var mailNotice;
        if (pkRes.kMailMsg) {
            mailNotice = pkRes.kMailMsg;
        }

        for (var i = 0; i < mailitems.length;) {
            var mitems = [];
            if (mailitems[i]) {
                mitems.push(mailitems[i]);
                i++;
            }
            if (mailitems[i]) {
                mitems.push(mailitems[i]);
                i++;
            }
            if (mailitems[i]) {
                mitems.push(mailitems[i]);
                i++;
            }
            if (mailitems[i]) {
                mitems.push(mailitems[i]);
                i++;
            }
            if (mailitems[i]) {
                mitems.push(mailitems[i]);
                i++;
            }
            let mailType = SeMailType.Charge;
            if ((pkRes.iProperty & SeEnumrechargeiProperty.LiJiShiYong) == SeEnumrechargeiProperty.LiJiShiYong) {
                mailType = SeMailType.AutoUse;
            }
            global.playerMgr.onGiveMail(this.plt, this.id, mailType, mailNotice, mitems);
        }

        // this.decMoney(-realAdd, 'recharge', amoutInfo.orderid); 

        global.logMgr.moneylog(this, 'rechargeadd', this.baseInfo.money + realAdd, this.baseInfo.money, amoutInfo.orderid, realAdd.toString());

        global.logMgr.rechargeLog(this, pkRes.kID, amoutInfo.amount, amoutInfo.time, amoutInfo.orderid);
        global.logMgr.rechargeStateLog(this, pkRes.kID, amoutInfo.amount, amoutInfo.time, amoutInfo.orderid, 'order finish');

        if (!slince) {
            // this._totalRechargeCount += amoutInfo.amount;
            this.calculate_recharge(amoutInfo);

            this.m_taskMgr.doAction(TaskAction.Recharge, this._totalRechargeCount);
            this.m_taskMgr.doAction(TaskAction.FirstPay, this._iFirstPay);
            this.taskAction(TaskAction.ShopBuy, amoutInfo.mailid, 1);
        }
        this.m_taskMgr.doAction(TaskAction.OnceRecharge, Math.floor(amoutInfo.amount / 100));

        if (Math.random() < 0.25) {
            this.addLevelTehui(this.pvp_level);
        }

        this.m_callbackMgr.onAddRecharge(amoutInfo.amount, amoutInfo.time);

        //充值数量到达一定后vip检测
        this.check_recharge_vip();
        //如果购买屠龙秘宝，刷新秘宝剩余时间
        if(pkmail.eType == TableRes.SeEnumShopMalleType.TuLongMiBao){
            if(pkmail.kID == 'TL004'){
                this.baseInfo.tlmb_finish_time = -1;
            }
            else{
                this.baseInfo.tlmb_finish_time = Date.now() + parseInt(global.resMgr.getConfig('tlmb_last_time')) * 60 * 60 * 1000;
            }
            this.saveBaseInfo('tlmb_finish_time');
            global.netMgr.sendCharMiscUpdate(this.linkid, 'tlmb_finish_time', this.baseInfo.tlmb_finish_time);
        }
        return true;
    }

    private check_recharge_vip(){
        if(global.resMgr.getConfig('vip_system_open') == 'false') return;
        //如果vip已过期则重新打开
        if(!this.baseInfo.is_vip && this.baseInfo.vip_level > 0){
            this.baseInfo.is_vip = true;
            this.saveBaseInfo('is_vip');
            global.netMgr.sendCharMiscUpdate(this.linkid, 'is_vip', this.baseInfo.is_vip);
            //重新打开时加上关卡购买次数
            let vip_res = global.resMgr.getVIPResByVIPLevel(this.baseInfo.vip_level);
            if(vip_res && vip_res.iLevelPurchase){
                this.pveNewMgr.addCanBuyTimes(vip_res.iLevelPurchase);      
            }
        }
        let orders = this.rechargeOrders;
        let recharge_amount = 0;
        for (let i = 0; i < orders.length; i++) {
            let r_order = orders[i];
            if (!r_order) continue;
            recharge_amount += r_order.amount;
        }
        recharge_amount = Math.floor(recharge_amount / 100);
        //计算vip等级
        let vip_level = 0;
        let vip_res_all = global.resMgr.getVIPResOrderByLevel();
        for(let i = 0; i < vip_res_all.length; i++){
            if(recharge_amount >= vip_res_all[i].iPrice){
                vip_level = vip_res_all[i].iRank;
            }
        }
        //升级到下一等级
        if(vip_level > this.baseInfo.vip_level){
            for(let new_level = this.baseInfo.vip_level + 1; new_level <= vip_level; new_level++){
                //增加两个等级间关卡购买次数差距
                let vip_res1 = global.resMgr.getVIPResByVIPLevel(this.baseInfo.vip_level);
                let vip_res2 = global.resMgr.getVIPResByVIPLevel(new_level);
                let diff = (vip_res2.iLevelPurchase || 0) - (vip_res1.iLevelPurchase || 0);
                if(diff > 0){
                    this.pveNewMgr.addCanBuyTimes(diff);
                }
                //vip等级提升
                this.baseInfo.vip_level = new_level;
                this.saveBaseInfo('vip_level');
                global.netMgr.sendCharMiscUpdate(this.linkid, 'vip_level', this.baseInfo.vip_level);
                //第一次到达该等级，发送一次性奖励
                if(vip_res2 && vip_res2.akRewardOnce){
                    this.send_vip_once_email(new_level)            
                }
                //第一次到达该等级，发送周奖励
                this.send_vip_week_email(new_level);
            }
            this.baseInfo.is_vip = true;
            this.saveBaseInfo('is_vip');
            global.netMgr.sendCharMiscUpdate(this.linkid, 'is_vip', this.baseInfo.is_vip);
        }
        
        //充值金额超过5000发邮件
        if(global.resMgr.getConfig('vip_sendmail_open') && global.resMgr.getConfig('vip_sendmail_open') == 'true' && !this.baseInfo.send_vip_mail){
            if(recharge_amount >= 5000){
                global.playerMgr.onGiveMail(this.plt, this.id, SeMailType.GM, global.resMgr.getConfig('vip_sendmail_content'), [], 0, global.resMgr.getConfig('vip_sendmail_title'));
                this.baseInfo.send_vip_mail = true;
                this.saveBaseInfo('send_vip_mail');
            }
        }
        //记录下最后充值时间;
        this.baseInfo.last_recharge_time = Date.now();
        this.saveBaseInfo('last_recharge_time');
       
    }
    //发送vip周奖励
    private send_vip_week_email(vip_level){
        if(vip_level > 0){
            let vip_res = global.resMgr.getVIPResByVIPLevel(vip_level);
            if(vip_res && vip_res.akRewardWeek){
                let items = [];
                for(let i = 0; i < vip_res.akRewardWeek.length; i++){
                    items.push({kItemID: vip_res.akRewardWeek[i].split(',')[0], iPileCount: parseInt(vip_res.akRewardWeek[i].split(',')[1])});
                }
                if(items.length > 0){
                    let content = LangID(vip_res.akWeekMail[0]);
                    let title = LangID(vip_res.akWeekMail[1]);
                    global.playerMgr.onGiveMail(this.plt, this.id, SeMailType.SYSTEM, content, items, 0, title);
                    this.baseInfo.vip_weekmail_time = Date.now();
                    this.saveBaseInfo('vip_weekmail_time');
                }
            }
        }
    }

    //发送vip一次性奖励
    private send_vip_once_email(vip_level){
        let vip_res = global.resMgr.getVIPResByVIPLevel(vip_level);
        if(vip_res && vip_res.akRewardOnce){
            let items = [];
            for(let i = 0; i < vip_res.akRewardOnce.length; i++){
                items.push({kItemID: vip_res.akRewardOnce[i].split(',')[0], iPileCount: parseInt(vip_res.akRewardOnce[i].split(',')[1])});
            }
            if(items.length > 0){
                let content = LangID(vip_res.akOnceMail[0]);
                let title = LangID(vip_res.akOnceMail[1]);
                global.playerMgr.onGiveMail(this.plt, this.id, SeMailType.SYSTEM, content, items, 0, title);
            }
        }
    }
    /**
     * 获取所有充值订单信息
     */

    get rechargeOrders() {
        var out: Array<RechargeInfo> = [];
        var orders = this.rechargeDB.value;
        for (var key in orders) {
            out.push(orders[key]);
        }

        return out;
    }

    hasSameAmountOrder(mid: string, order: string, sid: string) {
        var orders = this.rechargeDB.value;
        for (var key in orders) {
            var rk = <RechargeInfo>orders[key];
            if (rk && rk.mailid == mid && rk.orderid != order && (rk.sid == sid)) return true;
        }

        return false;

    }

    public openPvpBox(index: number) {
        this.pvpMgr.startOpenBox(index);
    }

    public accOpenBox(index: number) {
        this.pvpMgr.accOpenBox(index);
    }

    public openTempleteBox() {
        this.pvpMgr.openTempleteBox();
    }

    public completePvpBox(index: number) {
        this.pvpMgr.completeOpenBox(index);
    }

    public openBox(itmeid: string, level: number, type: number = 1) {
        this.m_pkShopMgr.openBox(itmeid, level, type)
    }

    public onShareOk(type: string) {
        if (this.dailyInfo.shareCount < DEFINE.SHARE_DAILY_MAX) {
            let dailyShare = global.resMgr.getConfig('dailyShare');
            if (dailyShare) {
                let item = dailyShare.split(',');
                if (item.length >= 2) {
                    this.addItem(item[0], parseInt(item[1]), DeAddDelItemReason.share);
                }
            }

            // global.playerMgr.onGiveMail(this.id, SeMailType.SYSTEM, '分享成功奖励', [{ kItemID: 'W001', iPileCount: 10 }]);
        }
        this.dailyInfo.shareCount++;

        this.updateDailyInfo();

        global.logMgr.shareLog(this, type, this.dailyInfo.shareCount, this.dailyInfo.shareCount - 1);

        this.taskAction(TaskAction.ShareText);
    }

    public onbindPhoneNumOk(phoneNum: string) {
        if (this.baseInfo.phoneNum) {
            return;
        }


        this.addItem("W001", 100, DeAddDelItemReason.bindPhoneNum);
        this.addItem("W002", 2000, DeAddDelItemReason.bindPhoneNum);

        this.baseInfo.phoneNum = phoneNum;

        this.saveBaseInfo("phoneNum");

        if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'phoneNum', this.baseInfo.phoneNum);
    }

    public onAdWatchOk(itemId: string) {
        let lottery_str = global.resMgr.getConfig("lottery_cool_down");
        if (!lottery_str) { return; }
        let lotterys = lottery_str.split(",");

        //check, 每天只能6次
        let limit_counts = parseInt(global.resMgr.getConfig("lottery_max_times") || '1');
        if (isNaN(limit_counts)) {
            limit_counts = 1;
        }

        if (this.dailyInfo.adWatchTimeCount >= limit_counts) {
            return;
        }

        var now = Date.now();
        if (now > (this.baseInfo.adWatchTime || 0)) {
            this.addItem(itemId, 1, DeAddDelItemReason.adwatch);

            //根据次数获取等待时间
            let etime = 0;
            this.dailyInfo.adWatchTimeCount = this.dailyInfo.adWatchTimeCount || 0;
            if (this.dailyInfo.adWatchTimeCount < lotterys.length) {
                etime = parseInt(lotterys[this.dailyInfo.adWatchTimeCount]) * 1000;
            }
            else {
                etime = parseInt(lotterys[lotterys.length - 1]) * 1000;
            }

            this.dailyInfo.adWatchTimeCount++;
            this.updateDailyInfo();

            this.baseInfo.adWatchTime = now + Math.min((new Date().setHours(24, 0, 0, 0) - now), etime);
            this.saveBaseInfo('adWatchTime');

            if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'adWatchTime', this.baseInfo.adWatchTime);

            this.taskAction(TaskAction.AdAward, 1);
        }
    }

    public onAdWatchArrayOk(index: number, itemId: string) {
        let lottery_str = global.resMgr.getConfig("lottery_cool_down");
        if (!lottery_str) { return; }
        let lotterys = lottery_str.split(",");

        //check, 每天只能6次
        let limit_counts = 3;

        if (this.dailyInfo.adWatchTimeCount_array[index] >= limit_counts) {
            return;
        }

        var now = Date.now();
        if (now > (this.baseInfo.adWatchTime_array[index] || 0)) {
            this.addItem(itemId, 1, DeAddDelItemReason.adwatch);

            //根据次数获取等待时间
            let etime = 0;
            this.dailyInfo.adWatchTimeCount_array[index] = this.dailyInfo.adWatchTimeCount_array[index] || 0;
            if (this.dailyInfo.adWatchTimeCount_array[index] < lotterys.length) {
                etime = parseInt(lotterys[this.dailyInfo.adWatchTimeCount_array[index]]) * 1000;
            }
            else {
                etime = parseInt(lotterys[lotterys.length - 1]) * 1000;
            }

            this.dailyInfo.adWatchTimeCount_array[index]++;
            this.updateDailyInfo();

            this.baseInfo.adWatchTime_array[index] = now + Math.min((new Date().setHours(24, 0, 0, 0) - now), etime);
            this.saveBaseInfo('adWatchTime_array');

            if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'adWatchTime_array', this.baseInfo.adWatchTime_array);

            this.taskAction(TaskAction.AdAward, 1);
        }
    }

    //进入小游戏
    public enterSmallGame(appid: string) {
        //平台限制
        if (global.plt.indexOf('wx') != 0) {
            return;
        }

        //次数限制
        if (!this.dailyInfo.eSmallGameCount) {
            this.dailyInfo.eSmallGameCount = 0;
        }
        if (this.dailyInfo.eSmallGameCount >= 10) {
            return;
        }

        //只有第一次进入有奖励
        if (this.baseInfo.enterSmallGameAward.hasOwnProperty(appid)) {
            return;
        }

        this.dailyInfo.eSmallGameCount++;
        this.updateDailyInfo();

        this.addItem('W001', 10, DeAddDelItemReason.esmallgame);

        this.baseInfo.enterSmallGameAward[appid] = 1;
        this.saveBaseInfo("enterSmallGameAward");

        global.logMgr.enterProgram(this, appid, this._totalRechargeCount);

        if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'enterSmallGameAward', this.baseInfo.enterSmallGameAward);
    }

    //完成添加小程序
    public completeSmallProgram() {
        global.logMgr.smallProgram(this, true, false);
    }

    //添加小程序奖励
    public addSmallProgram() {
        if (this.baseInfo.smallProgramAward && this.baseInfo.smallProgramAward > 0) {
            return;
        }

        this.baseInfo.smallProgramAward = 1;
        this.saveBaseInfo("smallProgramAward");


        this.addItem('W001', 30, DeAddDelItemReason.smallprogram);
        global.logMgr.smallProgram(this, true, true);
    }

    //完成关注公众号
    public completeFollowPublic() {
        global.logMgr.followPublic(this, true, false);
    }

    //关注公众号奖励
    public addFollowPublic() {
        if (this.baseInfo.followPublicAward && this.baseInfo.followPublicAward > 0) {
            return;
        }

        this.baseInfo.followPublicAward = 1;
        this.saveBaseInfo("followPublicAward");


        this.addItem('W001', 30, DeAddDelItemReason.smallprogram);
        global.logMgr.followPublic(this, true, true);
    }


    //公众号进入奖励
    public fromFollowPublic() {
        // 校验
        if (this.dailyInfo.fromFollowPublicCount && this.dailyInfo.fromFollowPublicCount > 0) {
            return;
        }

        this.dailyInfo.fromFollowPublicCount = 1;
        this.updateDailyInfo();


        this.addItem('W003', 20, DeAddDelItemReason.smallprogram);
        // global.logMgr.fromFollowPublicCount(this, true, true);
    }

     //浮窗进入奖励
     public fromScene(scene: string) {
        this.m_taskMgr.doAction_slince(TaskAction.FromScene, scene);
        // global.logMgr.fromFollowPublicCount(this, true, true);
    }


    /**
     * 检查登陆信息，然后抛出所有的立即使用的邮件内容出来
     */
    public onLogin() {
        // 加载的第一步把离线邮件放到在线池子中去
        let curr = Date.now();
        let [PVP_MAILS, AUTO_MAILS, ThreeUrlMails, SeasonRewards, LevelSpeedSeasonRewards, GuildItem, PvePkSeasonRewards, CallBackMsgs] = this.checkMail();
        // 检查一下道具的有效期
        let items = this.baseInfo.items.concat();
        let newItems: Array<SeItem> = [];
        let hashDel = false;
        for (let i = 0; i < items.length; i++) {
            let item: SeItem = items[i];
            let pkItemRes = global.resMgr.TownItemRes.getRes(item.kItemID);
            if (!item || !pkItemRes || (item.end && item.end < curr)) {
                hashDel = true;
            }
            else if (!pkItemRes.kEndTime) {
                newItems.push(item);
            }
            else {
                var endTime = Date.parse(pkItemRes.kEndTime);
                if (endTime < curr) {
                    hashDel = true;
                }
                else {
                    newItems.push(item);
                }
            }
        }

        if (hashDel) {
            this.baseInfo.items = newItems;
            this.saveBaseInfo("items");
        }

        this.m_signMgr.sign();

        this.m_buffMgr.checkbuff(true);
        this.m_buffMgr.check_monthvip_buff();
        this.m_buffMgr.check_monthvip_buff_v2();

        return [PVP_MAILS, AUTO_MAILS, ThreeUrlMails, SeasonRewards, LevelSpeedSeasonRewards, GuildItem, PvePkSeasonRewards, CallBackMsgs];
    }

    public signReward(isWatchAD?: boolean) {
        let [PVP_MAILS, AUTO_MAILS, ThreeUrlMails, SeasonRewards, LevelSpeedSeasonRewards, GuildItem, PvePkSeasonRewards, CallBackMsgs] = this.onLogin();

        this._use_login_mails(PVP_MAILS, AUTO_MAILS, ThreeUrlMails, SeasonRewards, LevelSpeedSeasonRewards, GuildItem, PvePkSeasonRewards, CallBackMsgs);

        this.m_signMgr.signReward(isWatchAD);
    }

    public monthTotSign(iDay: number) {
        return this.m_signMgr.getTotSignAward(iDay);
    }

    public monthSign(iDay: number, retry: boolean, isad: boolean) {
        return this.m_signMgr.monthSign(iDay, retry, isad);
    }

    public daySign(iDay: number, retry: boolean, isad: boolean) {
        return this.m_signMgr.daySign(iDay, retry, isad);
    }

    //删除体验英雄
    public delTryHeroCard(heroIDs: string[]) {
        this.m_pkHeroCardMgr.delTryHeroCard(heroIDs);
    }


    //-------------------------------------------------//

    public recive_room_info(type: string, joinkey: string, info: any, room_type: number) {
        switch (type) {
            case 'd_join':
                this.room_state_info.roomkey = joinkey;
                this.room_state_info.roomleavetype = NumType.N_lv_room;
                break;
            case 'join':
                this.room_state_info.roomkey = joinkey;
                this.room_state_info.roomleavetype = NumType.N_2v2_leave_room;
                break;
            case 'd_leave':
                this.room_state_info.roomkey = '';
                this.room_state_info.roomleavetype = '';
                break;
            case 'leave':
                this.room_state_info.roomkey = '';
                this.room_state_info.roomleavetype = '';
                break;
            case "startmatch":
                this.setState(CharState.matching);
                break;
            case "1v2_startmatch":
                this.setState(CharState.matching);
                break;
        }

        global.netMgr.sendData({ cmd: 'room_opr', type: type, info: info, joinkey: joinkey, room_type: room_type }, this.linkid);
    }

    cancell_match() {
        if (this.state == CharState.matching || this.state == CharState.inrace) {
            this.setState(CharState.loadcomplete);
            global.logMgr.buttonClickLog(this, 'olpvpcancell', 'olpvp');
            if(configInst.get('globalMgr.url-all')){
                global.globalMgrAll.cancellOnline(this.id, this.pvpMgr.match_score, this.pvpMgr.mode);
            }
            global.matchMgr.cancellOnline(this.id, this.pvpMgr.match_score, this.pvpMgr.mode);
        }
    }

    /**
     * 开始改名流程
     * @param name 
     */
    changeName(name: string) {
        if (global.resMgr.getConfig('closename') == 'true') {
            global.netMgr.sendCheckName(this.linkid, NameCheckCode.HasUsed, this.name);
            return;
        }

        if (this.name == name) {
            return;
        }
        //全渠道都接数美屏蔽字
        this._process_forbid_name_check(this.id, name, this._changeName.bind(this));
        // if (configInst.get('plt').indexOf('wx') == 0 || configInst.get('cheatmode') == true) {
        //     global.lsMgr && global.lsMgr.check_forbid_name(this.id, 'changeName', name, this.name, this.loginInfo.appid);
        // }
        // else {
        //     this._changeName(name);
        // }
    }

    changePersonSign(personSign: string) {
        if(this.dailyInfo.person_signCount >= 15 || global.resMgr.getConfig('change_person_sign') != 'true'){
            global.netMgr.sendCheckPersonSign(this.linkid, NameCheckCode.CountLimit, this.baseInfo.personSign);
            return;
        }

        if (this.baseInfo.personSign == personSign) {
            return;
        }
        //全渠道都接数美屏蔽字
        this._process_forbid_name_check(this.id, personSign, this._changePersonSign.bind(this));
    }

    //数美屏蔽字
    public _process_forbid_name_check(uid: number, name: string, cb: Function){
        if(name == '') {
            cb(name,true);
            return;
        }
        //hago不判定
        if (configInst.get('plt').indexOf('hago') == 0) {
            cb(name, true);
            return;
        }
        var post_data={
            "accessKey": 'JRERULr09ijxpJNIKBHW',
            "type": "GAME",
            "appId":"DSGO",
            "data": {
                "channel": "NAME_FILTER",
                "text": "",
                "nickname": name,
                "tokenId": '' + uid
            }
        }
        var content=JSON.stringify(post_data);
        var options = {
            hostname: 'api.fengkongcloud.com',
            port: '80',
            path: '/v2/saas/anti_fraud/text',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
              }
        };
        var req = http.request(options, (function (res) {
            res.on('data', function(data){
                data = JSON.parse(data);
                if(data.code == 1100 && data.riskLevel == 'PASS'){
                    cb(name,true);
                }
                else{
                    cb(name, false);
                    // console.log(data);
                }
             }.bind(this));
        }).bind(this));
        req.write(content);
        req.end();
    }

    _changeName(name: string, result: boolean = true) {
        if(!result){
            global.netMgr.sendCheckName(this.linkid, NameCheckCode.HasUsed, name);
            return;
        }
        if (this.name == name) {
            global.netMgr.sendCheckName(this.linkid, NameCheckCode.HasUsed, this.name);
            return;
        }
        else {
            mysqlLoaderInst.checkname(name, this.changeNameDBLoaded.bind(this, name));
        }
    }

    _forceRename(name,result:boolean = true){
        //检查通过不改名
        if(result) return;
        else{
            this.froce_rename('******');
        }
    }
    _changePersonSign(personSign: string, result: boolean = true) {
        if(!result){
            global.netMgr.sendCheckPersonSign(this.linkid, NameCheckCode.HasUsed, this.baseInfo.personSign);
            return;
        }
        this.baseInfo.personSign = personSign;
        this.saveBaseInfo(['personSign']);

        global.netMgr.sendCheckPersonSign(this.linkid, NameCheckCode.Ok, this.baseInfo.personSign);
        this.dailyInfo.person_signCount++;
        this.updateDailyInfo();
    }
    /**
     * 数据库检查是否重名后返回
     * @param newName 
     * @param err 
     * @param db 
     */
    changeNameDBLoaded(newName: string, err: boolean, db: any) {
        if (this.state == CharState.offline) return;
        if (db && db.value) {
            global.netMgr.sendCheckName(this.linkid, NameCheckCode.HasUsed, this.name);
        }
        else {
            if (this.baseInfo.isRename) {
                if (this.money >= 100) {
                    this.decMoney(100, "nameEdit");
                } else {
                    return;
                }
            }

            mysqlLoaderInst.renamename(this.name, newName, this.id)

            this.baseInfo.isRename = true;
            this.name = newName;

            this.saveBaseInfo(['charname', 'isRename']);
            global.netMgr.sendCharMiscUpdate(this.linkid, "isRename", this.baseInfo.isRename)
            global.netMgr.sendCheckName(this.linkid, NameCheckCode.Ok, this.name);
        }
    }

    private check_name_code = 4;
    force_check_name() {
        if (this.baseInfo.forcename != this.check_name_code){
            // 这里还要询问第三方借口
            if (configInst.get('plt').indexOf('hago') == -1){
                this._process_forbid_name_check(this.id, this.name, this._forceRename.bind(this));
            }
            this.baseInfo.forcename = this.check_name_code;
            this.saveBaseInfo(['forcename']);
        }
    }

    froce_rename(newName: string) {
        this.baseInfo.forcename = this.check_name_code;
        if (this.name == newName) return;
        mysqlLoaderInst.renamename(this.name, newName, this.id)


        this.name = newName;
        //改名完可免费改名一次
        this.baseInfo.isRename = false;
        global.netMgr.sendCharMiscUpdate(this.linkid, "isRename", this.baseInfo.isRename)
        this.saveBaseInfo(['charname', 'forcename', 'isRename']);

        global.netMgr.sendCheckName(this.linkid, NameCheckCode.Ok, this.name);
    }

    //--------------任务成就相关---------------//

    taskAction(action: TaskAction, ...arg) {
        this.m_taskMgr.doAction(action, ...arg);
    }

    getTaskAward(kId: string, extinfo: string) {
        this.m_taskMgr.getReward(kId, extinfo);
    }

    battleAction(action: number, ...arg) {
        this.taskAction(TaskAction.Battle, action, ...arg);
        if (action == BattleAction.UseCard) {
            this.pvpMgr.useHero(arg[0]);
        }
        else if(action == BattleAction.UseSkin){
            let skin_id = arg[0];
            let count = 1;
            if(this.baseInfo.hero_skin_record.indexOf(skin_id) >= 0){
                count = 100;
            }
            if(!this.baseInfo.hero_skin_use[skin_id]) this.baseInfo.hero_skin_use[skin_id] = 0;
            this.baseInfo.hero_skin_use[skin_id] += count;
            this.saveBaseInfo('hero_skin_use');
            if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'hero_skin_use', this.baseInfo.hero_skin_use);
        }
    }


    clientTaskAction(action: TaskAction, ...arg) {
        var arr = [TaskAction.LookVideo, TaskAction.SayHello, TaskAction.Foucs, TaskAction.ShareVideo];
        if (arr.indexOf(action) > -1) {
            this.taskAction(action, ...arg);
        }
    }


    dailyFresh() {
        this.m_taskMgr.dailyFresh();
        this.pveNewMgr.dailyRefresh();
        this.dailyInfo;
    }

    /**
     * 只对赛季结算开放
     */
    checkSeasonChengJiu_start(pre_season_id: string) {
        return this.m_taskMgr.seasion_finish_call();
    }

    checkSeasonChengJiu_finish() {
        return this.m_taskMgr.seasion_start_call();
    }

    //-----------------xxx-------------------//

    buyShopMall(mallId: string, marketId: string, count: number) {
        this.m_pkShopMgr.buyShopMall(mallId, marketId, count);
    }

    updateShopConfig() {
        this.m_pkShopMgr.updateShopConfig();
    }

    updateDynamicRes() {
        this.m_pkShopMgr.update_dynamic_res();
    }

    getShopInfo() {
        this.m_pkShopMgr.getShopInfo();
    }

    addLevelTehui(level: number) {
        this.m_pkShopMgr.addLevelTehui(level);
    }

    /**
     * 返回是否是月卡用户
     */
    get isMonthVip() {
        return this.m_buffMgr.isMonthVip;
    }

    checkSystemMail() {
        let hashs = [global.resMgr.systemMailRes.getAllRes(), global.lsMgr.getgmsystemmailres()];
        let now = Date.now();
        let waitList: Array<SeResSystemMail> = [];
        for (let h_i = 0; h_i < hashs.length; h_i++) {
            let hash = hashs[h_i];
            if (!hash) continue;
            for (let key in hash) {
                let pkSysMail: SeResSystemMail = hash[key];
                if (this.baseInfo.sysmailCeche && this.baseInfo.sysmailCeche[pkSysMail.kID] == pkSysMail.kStartTime) continue;
                if ((pkSysMail.iProperty & TableRes.SeEnumSystemMailiProperty.JinXianFuFei) == TableRes.SeEnumSystemMailiProperty.JinXianFuFei && this._iFirstPay == 0) continue;
                if ((pkSysMail.iProperty & TableRes.SeEnumSystemMailiProperty.JinXianiOS) == TableRes.SeEnumSystemMailiProperty.JinXianiOS && this.loginInfo.device_os != 'ios') continue;
                if ((pkSysMail.iProperty & TableRes.SeEnumSystemMailiProperty.JinXianAnZhuo) == TableRes.SeEnumSystemMailiProperty.JinXianAnZhuo && this.loginInfo.device_os != 'andriod') continue;
                if ((pkSysMail.iProperty & TableRes.SeEnumSystemMailiProperty.JinXianPC) == TableRes.SeEnumSystemMailiProperty.JinXianPC && this.loginInfo.device_os != 'pc') continue;

                let startTime = Date.parse(pkSysMail.kStartTime);
                let endTime = startTime + pkSysMail.iDuration * 3600 * 1000;

                if (((pkSysMail.iProperty & TableRes.SeEnumSystemMailiProperty.BuPanDingZhuCe) == TableRes.SeEnumSystemMailiProperty.BuPanDingZhuCe
                    || this.baseInfo.createtime < startTime)
                    && now >= startTime
                    && now <= endTime) {
                    let items: Array<SeItem> = [];
                    for (let i = 0; pkSysMail.akItems && i < pkSysMail.akItems.length; i++) {
                        let arr = pkSysMail.akItems[i].split(",");
                        let itemId = arr[0];
                        let iNum = parseInt(arr[1]) || 0;
                        if (itemId && iNum > 0) {
                            items.push({ kItemID: itemId, iPileCount: iNum });
                        }
                    }
                    !this.baseInfo.sysmailCeche && (this.baseInfo.sysmailCeche = {});
                    this.baseInfo.sysmailCeche[pkSysMail.kID] = pkSysMail.kStartTime;
                    global.playerMgr.onGiveMail(this.plt, this.id, SeMailType.SYSTEM_NO_DEL, pkSysMail.kDesc, items, (startTime - now) / 1000, pkSysMail.kTitle, endTime);
                } else if (now < startTime) {
                    waitList.push(pkSysMail);
                }
            }
        }

        this.saveBaseInfo("sysmailCeche");
        if (waitList.length > 0) {
            global.netMgr.sendSystemMail(this.linkid, waitList);
        }
    }

    public sendAnnouncement(type: SeEnumnoticetexteType, content: any, player: { linkid: string, id: number } | SePlayer) {
        if (content) {
            content.charname = this.name;
            //添加称号
            let buffId = this.m_buffMgr.getMaxChenHaoBuff();
            if(buffId){
                content.chartitle = global.resMgr.TownBufferRes.getRes(buffId).kValue;
            }else{
                content.chartitle = '';
            }
        }
        global.playerMgr.sendAnnouncement(type, content, player.linkid, player.id);
    }

    public sendAnnouncement2(type: SeEnumnoticetexteType, content: any, player: { linkid: string, id: number } | SePlayer) {
        if (content) {
            content.charname = this.name;
            let buffId = this.m_buffMgr.getMaxChenHaoBuff();
            if(buffId){
                content.chartitle = global.resMgr.TownBufferRes.getRes(buffId).kValue;
            }else{
                content.chartitle = '';
            }
        }
        global.playerMgr.sendAnnouncement2(type, content, player.linkid, player.id);
    }

    public takeDeskAward() {
        if (this.loginInfo && !this.baseInfo.bDeskAward1) {
            this.addItem('W001', 50, DeAddDelItemReason.deskAward);
            this.baseInfo.bDeskAward1 = true;
            this.saveBaseInfo('bDeskAward1');
        }
    }

    public checkMonthVip() {
        this.m_buffMgr.check_monthvip_buff();
        this.m_buffMgr.check_monthvip_buff_v2();
    }

    public getliveraces(mode: number) {
        if (!this.hasProperty(PlayerProperty.GM_OB)) {
            return;
        }

        global.matchMgr.sendMSData({
            cmd: 'liveraces',
            uid: this.id,
            mode: mode
        })
    }

    public checkTryHeroCard() {
        return this.m_pkHeroCardMgr.checkTryHeroCard();
    }

    public checkDuplicateHeroCard() {
        return this.m_pkHeroCardMgr.checkDuplicateHeroCard();
    }

    public getUnlockgrade(type: TableRes.SeEnumUnlockeType) {
        let grade = 0;
        switch (type) {
            case TableRes.SeEnumUnlockeType.DangQianDuanWei:
                grade = this.pvp_level;
                break;
            case TableRes.SeEnumUnlockeType.LiShiDuanWei:
                grade = this.top_pvp_level;
                break;
            case TableRes.SeEnumUnlockeType.ZhuChengDengJi:
                grade = this.level;
                break;
        }
        return grade;
    }

    private refreshLords(){
        //刷新格式，由于数据格式有变化
        if(typeof(this.baseInfo.lords[this.baseInfo.lord]) == 'number'){
            this.baseInfo.lords[this.baseInfo.lord] = {timeout: 10180180211923, wear_equips:[]};
        }
    }
    public getroommatch(type: string, value: string, ready?: boolean, kuid?: string, index?: number) {
        //匹配前出阵英雄校验
        if (!this.checkTryHeroCard()) {
            return;
        }
        this.refreshLords();
        

        let data;
        switch (type) {
            case NumType.N_2v2_join_room:
            case NumType.N_1v1:
            case NumType.N_pve_pk:
            case NumType.N_jn_room:
            case NumType.N_ct_room:
            case NumType.N_1v2_join_room:
                {
                    data = {
                        cmd: 'roomopr',
                        type: type,
                        uid: this.id,
                        p: {
                            uid: this.id,
                            formation: this.getPvpMatchInfo(true),
                            pve_pk_formation: this.baseInfo.pve_pk_formation[0],
                            name: this.name,
                            level: 15,
                            icon: this.icon,
                            avatar: this.avatar,
                            medals: this.curMedals,
                            pvp_score: this.pvp_score,
                            pvp_level: this.pvp_level,
                            pve : this.pveData(),
                            beans_1v2: this.itemCount('W029'),
                            index: index || 0,
                        },
                        key: value
                    };  
                    break;
                }
            default: {
                data = {
                    cmd: 'roomopr',
                    type: type,
                    uid: this.id,
                    p: {
                        uid: this.id,
                        kuid: kuid
                    },
                    key: value,
                    ready: ready
                }
                break;
            }
        }
        //如果是1v2，带上皮肤信息和房间底分信息
        if(type == NumType.N_1v2_join_room){
            data.p.formation.heros_skin = this.baseInfo.heros_skin;
        }
        //如果是放置玩法，主公要改成阵容里的
        else if(type == NumType.N_pve_pk){
            let lordId = '';
            for(var key in this.baseInfo.pve_pk_formation[0]){
                var hero_res = global.resMgr.UnitRes.getRes(key);
                if(hero_res.iLord == 1){
                    lordId = key;
                    break;
                }
            }
            if(lordId && this.baseInfo.lords[lordId].wear_equips){
                var wear_equips = [];
                for(let i = 0; i < this.baseInfo.lords[lordId].wear_equips.length; i++){
                    wear_equips.push(this.m_equipMgr.getHaveEquip(this.baseInfo.lords[lordId].wear_equips[i]));
                }
                data.p.formation.lordUnit = {kHeroID: lordId, iLevel: this.level, wear_equips: wear_equips};
            }
            
        }
        if(configInst.get('globalMgr.url-all')) {
            switch (type) {
                case NumType.N_2v2_join_room:
                case NumType.N_2v2_ready_room:
                case NumType.N_2v2_leave_room:
                    if(global.resMgr.getConfig("2v2_cross_server") == 'true'){
                        global.globalMgrAll.sendMSData(data);
                        return;
                    }
                    break;
                case NumType.N_1v2_join_room:
                case NumType.N_1v2_ready_room:
                case NumType.N_1v2_leave_room:
                    if(global.resMgr.getConfig("Chibi_cross_server") == 'true'){
                        global.globalMgrAll.sendMSData(data);
                        return;
                    }
                    break;
            }
        }
        global.matchMgr.sendMSData(data);
    }

    public exchange(activityId: string, exchangeId: string, extInfo: string, excount: number) {
        if (!excount || excount < 0) excount = 1;
        this.m_pkShopMgr.exchange(activityId, exchangeId, extInfo, excount);
    }

    get ext_vip_level() {
        if (this._extInfo && this._extInfo.info && this._extInfo.info.vipinfo && this._extInfo.info.vipinfo.level) {
            return this._extInfo.info.vipinfo.level;
        }

        return 0;
    }

    public onMatchOver() {
        this.pvpMgr.onMatchOver();
    }

    public pvpTopLevelUp() {
        this.m_pkShopMgr.levelUpCheck();
    }

    public refreshDailyShop(type: number) {
        this.m_pkShopMgr.payToReFresh(type);
    }

    public box_view(boxID: string) {
        this.m_pkShopMgr.box_view(boxID);
    }

    public syncDrawTimes(){
        global.netMgr.sendData({
            cmd: 'drawTimes',
            infos: this.baseInfo.drawTimes,
        }, this.linkid);
    }

    public _extInfo: ifExtInfo = null;

    public loadExtInfo(f: ifExtInfo) {
        this._extInfo = f;
        this.operateLoading(SeCharLoadFlag.extinfo);
        this.friendMgr.load_plt_friend();

        if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'ext_info', this._extInfo);
    }

    /**
     * 发送给某个玩家QQ信息
     * @param frd 
     * @param msgtype 
     * @param content 
     * @param qua 
     */
    public send_gamebar_msg(frd: string, msgtype: number, content: string, qua: string) {
        if (this._extInfo) global.lsMgr.sendgamebar_msg(this.id, this._extInfo.openid, this._extInfo.openkey, frd, msgtype, content, qua);
    }

    public get_buffer_value(v: SeEnumTownBuffereType) {
        let o_v = this.m_buffMgr.get_buffer_value(v);
        if (v == SeEnumTownBuffereType.XiangZiJiaSu && this.isMonthVip) {
            // 月卡用户至少有5%的加成，以后功能改的时候记得要修改掉
            let pkRes = global.resMgr.TownBufferRes.getRes('B003');
            if (pkRes) {
                o_v = Math.max(o_v, parseInt(pkRes.kValue) || 0);
            }
        }

        return o_v;
    }

    loadGroupId(iGroupId: string) {
        this.pvpMgr.setGroupId(iGroupId);
        if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'iGroupId', iGroupId);
    }


    public get_share_award(uid: number) {
        this.m_pkItemMgr.get_share_award(uid);
    }

    /**
     * 添加主公
     */
    public addLord(id: string, timeout = 10180180211923) {
        //永久的替代限时的
        if (this.baseInfo.lords[id] && this.baseInfo.lords[id].timeout >= timeout) {
            return;
        }
        this.baseInfo.lords[id] ={timeout: timeout, wear_equips:[]};
        this.saveBaseInfo('lords');
        if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'lords', this.baseInfo.lords);
    }

    get lord(): string {
        return this.baseInfo.lord;
    }

    get lords(): { [id: string]: {timeout:number, wear_equips: Array<string>} } {
        return this.baseInfo.lords;
    }

    set lord(id: string) {
        //检查是否已经拥有
        if (!this.baseInfo.lords[id]) return;
        this.baseInfo.lord = id;
        this.saveBaseInfo('lord');
        this.baseInfo.lordFormation[this.baseInfo.defaultPlan] = id;
        if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'lord', this.baseInfo.lord);
    }

    /**
     * 随机发送限时礼包
     */
    // public check_limited_gift() {
    //     //校验
    //     if (!this.m_pkShopMgr.check_lgift_time()) {
    //         return;
    //     }

    //     var typeRes = global.resMgr.LimitedGiftTypeRes.getAllRes();
    //     var rateRes = global.resMgr.LimitedGiftRateRes.getAllRes();

    //     //筛选出RMB还是钻石
    //     let r: TableRes.SeResLimitedGiftType;
    //     for (let id in typeRes) {
    //         r = typeRes[id];
    //         if (this.money >= r.iValueMin && this.money <= r.iValueMax) {
    //             break;
    //         }
    //     }

    //     let total = r.iWeightDiamond + r.iWeightRMB;
    //     let _type: TableRes.SeEnumLimitedGiftRateeType;
    //     let _value: number = this.money;
    //     if (Math.random() * total <= r.iWeightDiamond) {
    //         _type = TableRes.SeEnumLimitedGiftRateeType.ZuanShiLiBao;
    //     }
    //     else {
    //         _type = TableRes.SeEnumLimitedGiftRateeType.RenMinBiLiBao;

    //         //需要累计充值字段
    //         _value = 0;
    //         for (let i = 0; i < this.rechargeOrders.length; i++) {
    //             _value = _value + this.rechargeOrders[i]['amount'];
    //         }
    //         //存储的时候是按 分 存的
    //         _value = _value / 100;
    //     }

    //     let _r: TableRes.SeResLimitedGiftRate;
    //     for (let _id in rateRes) {
    //         _r = rateRes[_id];
    //         if (_r.eType == _type && _value >= _r.iValueMin && _value <= _r.iValueMax) {
    //             break;
    //         }
    //     }

    //     let eType: TableRes.SeEnumShopMalleType;
    //     if (_r.eType == TableRes.SeEnumLimitedGiftRateeType.ZuanShiLiBao) {
    //         eType = TableRes.SeEnumShopMalleType.XianShiZuanShi;
    //     } else {
    //         eType = TableRes.SeEnumShopMalleType.XianShiRenMinBi;
    //     }

    //     //随机选择一个礼包
    //     let index = getProbabilityResult(_r.aiGiftWeight);

    //     //更新玩家的shop属性
    //     this.m_pkShopMgr.update_lgift_time(_r.akGiftName[index], false, Date.now() + (_r.aiLimitedtime[index] * 3600000), Date.now() + (_r.aiCoolDown[index] * 3600000), eType);

    //     //统计
    //     global.logMgr.limitedGiftLog(this, _r.akGiftName[index]);
    // }

    /**
     * 获得勋章
     */
    public addMedal(id: string, timeout: number) {
        //永久的替代限时的
        if (this.baseInfo.medals[id] && this.baseInfo.medals[id] >= timeout) {
            return;
        }

        this.baseInfo.medals[id] = timeout;
        this.saveBaseInfo('medals');
        if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'medals', this.baseInfo.medals);
    }

    get curMedals() {
        return this.baseInfo.curMedals;
    }

    /**
     * 设置勋章
     */
    public setcurMedal(id: string, oid: string) {
        //校验id
        if (!this.baseInfo.medals[id] || this.baseInfo.medals[id] < Date.now()) {
            return;
        }
        if (this.baseInfo.curMedals.indexOf(id) >= 0) {
            return;
        }

        //校验oid
        let pos = this.baseInfo.curMedals.length;
        if (pos >= 6 && !oid) {
            return;
        }
        if (oid) {
            pos = this.baseInfo.curMedals.indexOf(oid);
            if (pos < 0) {
                return;
            }
        }

        this.baseInfo.curMedals.splice(pos, 1, id);
        this.saveBaseInfo('curMedals');
        if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'curMedals', this.baseInfo.curMedals);
    }

    public enterShangJinSai(type: string): boolean{
        if(this.baseInfo.shangjinState != ShangJinState.NOENTER){
            return false;
        }
        let count = global.resMgr.getConfig("hunterTicketCost");
        //扣除报名费
        if(type == 'item'){
            if(this.useItem('W024',Number(count))){
                this.baseInfo.shangjinState = ShangJinState.ENTER;
            }
        }else if(type == 'zuanshi'){
            //废弃钻石报名赏金赛
            return false;
            let menpiao : TableRes.SeResSuperMarket = global.resMgr.SuperMarketRes.getRes("SJS1");
            if(this.decMoney(menpiao.iPrice * Number(count), 'buyitem', "SJS1", count)){
                this.baseInfo.shangjinState = ShangJinState.ENTER;
            }
        }
        if(this.baseInfo.shangjinState == ShangJinState.ENTER){
            //初始抽奖次数
            this.baseInfo.shangjinCount++;
            this.saveBaseInfo(['shangjinState','shangjinCount']);
            //刷新胜场数及赏金任务 阵容
            this.pvpMgr.refreshShangjinCount();
            this.m_taskMgr.baomingFresh(SeEnumTaskiTab.ShangJinSaiShengChang);
            
            //通知状态
            global.netMgr.sendCharMiscUpdate(this.linkid, 'shangjinState', this.baseInfo.shangjinState);
            global.netMgr.sendCharMiscUpdate(this.linkid, 'drawTimes', this.baseInfo.drawTimes);

            //通知成功
            global.netMgr.sendCharMiscUpdate(this.linkid, 'shangjinHeroCards', this.shangjinHeroCards);
            return true;
        }else{
            return false;
        }
    
    }

    public addShangJinPrivilege(): boolean{
        if(this.baseInfo.shangjinState == ShangJinState.NOENTER){
            return false;
        }
        if(this.baseInfo.shangjinPrivilege){
            return false;
        }

        let iPrice = global.resMgr.getConfig("sjs_privilege");
        //扣除报名费
        if(this.decMoney(Number(iPrice), 'sjs_privilege', "sjs_privilege", iPrice)){
            this.baseInfo.shangjinPrivilege = 1;
        }
        global.netMgr.sendCharMiscUpdate(this.linkid, 'shangjinPrivilege', this.baseInfo.shangjinPrivilege);
        return true;
    }

    public getShangJinPrivilege(type: string){
        if(this.baseInfo.shangjinPrivilege == 0){
            return false;
        }

        let exchange = global.resMgr.exchangeRes.getRes(type);
        if(exchange && exchange.iPrice == this.pvpMgr.getInfo().win_shangjin_count){
            this.addItem(exchange.akTargetD[0].split(',')[0],Number(exchange.akTargetD[0].split(',')[1]), 'sjs_privilege' , exchange.kID);
            this.baseInfo.shangjinPrivilege = 0;
            global.netMgr.sendCharMiscUpdate(this.linkid, 'shangjinPrivilege', this.baseInfo.shangjinPrivilege);
        }
    }

    public openShangJinLord(lordId: string){
        if(this.baseInfo.shangjin_lords.indexOf(lordId) != -1) return;
        let price = global.resMgr.getConfig("sjs_unlock_lord_zuanshi");
        if(this.decMoney(Number(price), 'shangjin_lord', "shangjin_lord", price)){
            this.baseInfo.shangjin_lords.push(lordId);
            this.saveBaseInfo('shangjin_lords');
            global.netMgr.sendCharMiscUpdate(this.linkid, 'shangjin_lords', this.baseInfo.shangjin_lords);
        }
    }
    public chooseShangJinHero(type: string){
        if(this.baseInfo.shangjinState != ShangJinState.ENTER || this.baseInfo.drawTimes <= 0){
            return false;
        }
        //抽卡
        let poolByType = this.baseInfo.shangjinHeroPool[type];
        //抽完了返回消息
        if(poolByType.pool.length == 0){
            global.netMgr.sendData({cmd:"shangjinPoolEmpty"}, this.linkid);
            return false;
        }
        var heroBoxZZYRes = global.resMgr.HeroBoxZZYRes.getRes(type);
        var luckys = [];
        for(let i = 0; i < heroBoxZZYRes.iTypeCount; i++){
            let lucky: ifOpenBoxUnit = arrayRandomT(poolByType.pool,'weight',true);
            if (lucky) {
                this.baseInfo.shangjinHeroCards.push(lucky.id);
                this.saveBaseInfo('shangjinHeroCards');
                luckys.push(lucky.id);
            }
        }
        this.baseInfo.drawTimes--;
        this.saveBaseInfo('drawTimes');
        //刷新用户卡组
        global.netMgr.sendCharMiscUpdate(this.linkid, 'shangjinHeroCards', this.shangjinHeroCards);
        global.netMgr.sendCharMiscUpdate(this.linkid, 'chooseShangJinHero', luckys);
        global.netMgr.sendCharMiscUpdate(this.linkid, 'drawTimes', this.baseInfo.drawTimes);
        global.netMgr.sendCharMiscUpdate(this.linkid, 'poolLength', poolByType.pool.length, type);
        return luckys;
    }

    //添加赏金赛抽奖次数
    public addDrawTimes(type: string, count: number ){
        if(this.baseInfo.shangjinState != ShangJinState.ENTER){
            return false;
        }
        let result: boolean = false;
        //扣除报名费
        if(type == 'item'){
            if(this.useItem('W025',count)){
                result = true;
            }
        }else if(type == 'zuanshi'){
            let item : TableRes.SeResSuperMarket = global.resMgr.SuperMarketRes.getRes("SJS2");
            if(this.decMoney(item.iPrice * count, 'buyitem', "SJS2", count.toString())){
                result = true;
            }
        }
        if(result == true){
            for(let i = 0; i < count; i++){
                this.baseInfo.drawTimes++;
                this.saveBaseInfo('drawTimes');
            }
        }

        global.netMgr.sendCharMiscUpdate(this.linkid, 'drawTimes', this.baseInfo.drawTimes);
        return result;
    }

    public cancelShangJinSai(needGetReward:boolean = false){
        if(this.baseInfo.shangjinState != ShangJinState.ENTER){
            return;
        }
        if(needGetReward){
            this.baseInfo.shangjinState = ShangJinState.FINISH;
        }
        else{
            this.pvpMgr.refreshShangjinCount();
            this.baseInfo.shangjinState = ShangJinState.NOENTER;
        }
        this.saveBaseInfo('shangjinState');
        

         //通知状态
         global.netMgr.sendCharMiscUpdate(this.linkid, 'shangjinState', this.baseInfo.shangjinState);
    }
    //校验勋章是否过期
    public checkcurMedal() {
        for (let i = 0; i < this.baseInfo.curMedals.length;) {
            let id = this.baseInfo.curMedals[i];
            if (this.baseInfo.medals[id] <= Date.now()) {
                this.baseInfo.curMedals.splice(i, 1);
            }
            else {
                i = i + 1;
            }
        }
    }

    public getOnlinetimeDaily(){
        //若是第二天，只保留当日0点
        if(TeDate.isdiffday(this.baseInfo.loginTime)){
            return this.dailyInfo.onlinetimeDaily + (Date.now() - new Date().setHours(0,0,0,0));
        }
        else{
            return this.dailyInfo.onlinetimeDaily + (Date.now() - this.baseInfo.loginTime);
        }
    }
    /**
     * 客户端需要缓存的持久化数据
     */
    public set_client_cache(key: string, value: string) {
        if (key == "") {
            return;
        }

        if (!this.baseInfo.clientCache) {
            this.baseInfo.clientCache = {};
        }

        this.baseInfo.clientCache[key] = value;
        this.saveBaseInfo('clientCache');
    }

    private TuiSongDiSanFang(pkTownItemRes: SeResTownItem, num) {
        if (!pkTownItemRes) return;
        let data: any = {};
        let ctime = Date.now();
        let type: string = '';
        let datatype: 'text' | 'json' = 'text';
        switch (pkTownItemRes.kValueC) {
            // 闪电玩红包实现接口
            case "http://192.168.218.16:9061/cpRedPktOrder":
            case "https://platform.shandw.com/cpRedPktOrder": {
                type = "reduseitem";
                if (global.resMgr.getConfig(type) != 'true') return;
                data.cpOrderId = "UID" + this.id + 'PLT' + this.plt + 'T' + Math.floor(ctime / 1000);
                let appid = (this.loginInfo && this.loginInfo.appid) ? this.loginInfo.appid : '1145326931';
                data.appId = appid;
                data.uid = this.id;
                data.amount = num * 10;
                data.openId = (this.loginInfo && this.loginInfo.openid) ? this.loginInfo.openid : '';
                data.userName = this.name;
                data.timestamp = ctime;
                data.ext = "";

                datatype = 'json';
                global.logMgr.threeOrderlogs(this, type, 'start', data.cpOrderId, pkTownItemRes.kId, num);

                break;
            }
            // 电魂支付红包发放接口
            case "https://mapi-pay.17m3.com/weixinpay/RedPackToUser.aspx": {
                type = "reduseitem2";
                if (global.resMgr.getConfig(type) != 'true') return;
                data.wxappId = "wxdba811af3ac0f3b5";
                data.appId = this.loginInfo.appid;
                data.orderId = "UID" + this.id + 'PLT' + this.plt + 'T' + Math.floor(ctime / 1000);
                data.openid = this.loginInfo.openid;
                data.amount = (num / 10).toFixed(2);    // 只支持2位小数，金额必须为1-200元之间。最大转账金额以对应用限制的限额为准。
                let notices = (pkTownItemRes.kValueB || "").split('|');
                // data.send_name
                data.wishing = notices[0] || '恭喜您中奖';
                data.act_name = notices[1] || "节日红包";
                data.remark = notices[2] || "";
                data.timestamp = Math.floor(ctime / 1000);
                global.logMgr.threeOrderlogs(this, type, 'start', data.cpOrderId, pkTownItemRes.kId, num);
                break;
            }
            case "https://mapi-pay.17m3.com/weixinpay/MchPaymentToUser.aspx": {
                // 企业账号直接到账的红包
                type = "reduseitem3";
                if (global.resMgr.getConfig(type) != 'true') {
                    // 还给玩家
                    this.urlrequestback({ type: type, cpOrderId: data.cpOrderId, itemid: pkTownItemRes.kId, count: num }, { result: -1, message: "server close" });
                    return;
                }
                data.mch_appid = 'wxdba811af3ac0f3b5';
                data.appId = this.loginInfo.appid;
                data.orderId = "UID" + this.id + 'PLT' + this.plt + 'T' + Math.floor(ctime / 1000);
                data.openid = this.loginInfo.openid;
                data.amount = (num / 10);
                // data.re_user_name = this.loginInfo.wxinfo ? this.loginInfo.wxinfo.nickName : this.name;
                data.re_user_name = '';
                data.desc = pkTownItemRes.kValueB || "恭喜您中奖";
                data.spbill_create_ip = global.netMgr.getIPAdress()[0] || '127.0.0.1';
                data.timestamp = Math.floor(ctime / 1000);
                break;
            }
            default: break;
        }

        global.lsMgr.sendUrlRequest('post', pkTownItemRes.kValueC, data, this.id, { type: type, cpOrderId: data.cpOrderId, itemid: pkTownItemRes.kId, count: num }, datatype, this.loginInfo.appid);
    }

    public urlrequestback(param: any, data: any | null) {
        // 这里
        if (!param || !param.type) return;
        switch (param.type) {
            case 'reduseitem3':
            case 'reduseitem2':
            case 'reduseitem': {
                // 成功失败判断
                if (!param.itemid) break;
                let pkTownItemRes = global.resMgr.TownItemRes.getRes(param.itemid);
                if (!pkTownItemRes) break;
                let succ = false;
                if (data && (data.result == "1" || data.result == 1)) {
                    // 成功
                    succ = true;
                }

                global.netMgr.sendData({
                    cmd: "reduseitem",
                    type: param.type,
                    itemid: param.itemid,
                    count: param.count,
                    suss: succ,
                    msg: data.message || ""
                }, this.linkid);

                if (succ) {
                    global.logMgr.threeOrderlogs(this, param.type, "finish", param.cpOrderId, param.itemid, param.count, data.data || "");
                    global.lsMgr.sendLSData({
                        cmd: "GameControl",
                        type: param.type,
                        value: param.count / 10
                    })
                }
                else {
                    // 失败的时候把道具还给玩家
                    this.addItem(param.itemid, param.count, param.type, param.cpOrderId);
                    global.logMgr.threeOrderlogs(this, param.type, "urlfailed", param.cpOrderId, param.itemid, param.count, data.message || "");
                }
                break;
            }
            default:
                break;
        }
    }

    /**
     * 获取战斗用的匹配信息
     * @param perMode 是否开启平衡模式 默认false 
     * @param isShangjin 是否用于赏金赛模式 默认false 
     */
    getPvpMatchInfo(perMode: boolean = false, isShangjin: boolean = false) {
        var wear_equips = [];
        this.refreshLords();
        if(isShangjin){
            var default_equip = global.resMgr.getConfig('sjs_lord_equip');
            wear_equips.push({eLevel: parseInt(default_equip[0].split(',')[2]), eStar: parseInt(default_equip[0].split(',')[1]), kId: default_equip[0].split(',')[0], eType: TableRes.SeEnumequipattreType.WuQi});
            wear_equips.push({eLevel: parseInt(default_equip[1].split(',')[2]), eStar: parseInt(default_equip[1].split(',')[1]), kId: default_equip[1].split(',')[0], eType: TableRes.SeEnumequipattreType.KuiJia});
            wear_equips.push({eLevel: parseInt(default_equip[2].split(',')[2]), eStar: parseInt(default_equip[2].split(',')[1]), kId: default_equip[2].split(',')[0], eType: TableRes.SeEnumequipattreType.BaoWu});
        }
        else{
            for(let i = 0; i < this.baseInfo.lords[this.baseInfo.lord].wear_equips.length; i++){
                wear_equips.push(this.m_equipMgr.getHaveEquip(this.baseInfo.lords[this.baseInfo.lord].wear_equips[i]));
            }
        }
        
        if (perMode) {
            // 如果是平衡模式，那么多有等级信息需要平衡
            return {
                h_f: isShangjin? this.matchShangjinFormation : this.roomFormation,
                b_f: this.m_pkHeroCardMgr.matchBossFormation,
                castle_level: global.resMgr.getPerLevel(),
                battleEquip: {
                    battleField: this.baseInfo.battleField,
                    battleTalks: this.baseInfo.battleTalks,
                    battleBanner: this.baseInfo.battleBanner
                },
                synccheck: this.pvpMgr.fight_check(),
                areaid: this.pvpMgr.groupId,
                lordUnit : {kHeroID: isShangjin? this.baseInfo.shangjin_lord : this.baseInfo.lord, iLevel: global.resMgr.getPerLevel(), wear_equips: wear_equips},
                pve : this.pveData(),
                is_vip : this.baseInfo.is_vip,
                vip_level : this.baseInfo.vip_level,
                guild_info: this.guild_simple_info(),
            }
        }
        else {
            return {
                h_f: isShangjin? this.matchShangjinFormation : this.matchFormation,
                b_f: this.m_pkHeroCardMgr.matchBossFormation,
                castle_level: this.level,
                battleEquip: {
                    battleField: this.baseInfo.battleField,
                    battleTalks: this.baseInfo.battleTalks,
                    battleBanner: this.baseInfo.battleBanner
                },
                synccheck: this.pvpMgr.fight_check(),
                areaid: this.pvpMgr.groupId,
                lordUnit : {kHeroID: isShangjin? this.baseInfo.shangjin_lord : this.baseInfo.lord, iLevel: this.level, wear_equips: wear_equips},
                pve : this.pveData(),
                is_vip : this.baseInfo.is_vip,
                vip_level : this.baseInfo.vip_level,
                guild_info: this.guild_simple_info(),
            }
        }
    }

    /**
     * 关卡地图的通关次数 输入的是levelid
     * @param mapid 
     */
    getMapCount(isPve: boolean, mapid: string): { count: number, win: number } {
        if (isPve) {
            return this.pveMgr.getMapCount(mapid);
        }

        return { count: 0, win: 0 };
    }

    getBattleSkins() {
        let out = ['BF101'];
        for (let i = 0; i < this.baseInfo.items.length; i++) {
            let item = this.baseInfo.items[i];
            if (!item || !item.kItemID) continue;
            let itemRes = global.resMgr.TownItemRes.getRes(item.kItemID);
            if (itemRes.eTypeA == SeEnumTownItemeTypeA.ZhenDiPiFu) {
                out.push(itemRes.kValueA);
            }
        }
        return out;
    }

    getBattleBanners() {
        let out = [''];
        for (let i = 0; i < this.baseInfo.items.length; i++) {
            let item = this.baseInfo.items[i];
            if (!item || !item.kItemID) continue;
            let itemRes = global.resMgr.TownItemRes.getRes(item.kItemID);
            if (itemRes.eTypeA == SeEnumTownItemeTypeA.ZhanQi) {
                out.push(itemRes.kId);
            }
        }
        return out;
    }

    /**
     * 设置战斗中的地块和聊天信息等
     * @param type 
     * @param list 
     */
    equip_battle(type: 'BattleField' | 'BattleTalk' | 'BattleBanner', list: string[]) {
        let find = false;
        switch (type) {
            case 'BattleField': {
                if (list.length < 1) break;
                let ownIds = this.getBattleSkins();
                if (ownIds.indexOf(list[0]) >= 0) {
                    this.baseInfo.battleField = list[0];
                    this.saveBaseInfo('battleField');
                    global.netMgr.sendCharMiscUpdate(this.linkid, 'battleField', list[0]);
                }
                break;
            }
            case 'BattleTalk':
                {
                    let quiplist = [];
                    for (let i = 0; i < list.length; i++) {
                        let talkId = list[i];
                        let talkRes = global.resMgr.RaceTalkRes.getRes(talkId);
                        if (!talkRes) continue;
                        if (talkRes.iProperty & TableRes.SeEnumRaceTalkiProperty.DaoJuChiYou) {
                            if (this.itemCount(talkRes.kItemID) < 0) {
                                continue;;
                            }
                        }
                        if (talkRes.iProperty & TableRes.SeEnumRaceTalkiProperty.YueKaZhuanShu) {
                            if (!this.isMonthVip) {
                                continue;
                            }
                        }
                        quiplist.push(talkId);
                    }

                    if (!this.baseInfo.battleTalks || this.baseInfo.battleTalks.join(',') != quiplist.join(',')) {
                        find = true;
                        this.baseInfo.battleTalks = quiplist;
                        this.saveBaseInfo('battleTalks');
                        this.loadComplete && global.netMgr.sendCharMiscUpdate(this.linkid, 'battleTalks', quiplist);
                    }

                    break;
                }
            case 'BattleBanner':
                {
                    if (list.length < 1) break;
                    let ownIds = this.getBattleBanners();
                    if (ownIds.indexOf(list[0]) >= 0) {
                        this.baseInfo.battleBanner = list[0];
                        this.saveBaseInfo('battleBanner');
                        global.netMgr.sendCharMiscUpdate(this.linkid, 'battleBanner', list[0]);
                    }
                    break;
                }
            default: break;
        }
        return find;
    }

    switchauth(auth: boolean) {
        this.baseInfo.isAuth = auth;
        this.saveBaseInfo('isAuth');
        global.netMgr.sendCharMiscUpdate(this.linkid, "auth", auth);
    }

    public addWxSubscribe(data: any){
        if(!this.loginInfo.openid) return;
        this.baseInfo.wxSubscribeMessage = global.playerMgr.subscribePlayers[this.loginInfo.openid] || [];
        for(var index in data){
            if(!this.baseInfo.wxSubscribeMessage[index]){
                this.baseInfo.wxSubscribeMessage[index] = {curr: 0, total:0, noticeTime: 0, country: this.loginInfo.countryCode || 'id'};
            }
            this.baseInfo.wxSubscribeMessage[index].curr++;
            if(this.baseInfo.wxSubscribeMessage[index].curr > 1){
                this.baseInfo.wxSubscribeMessage[index].curr = 1;
            }
            this.baseInfo.wxSubscribeMessage[index].total++;
            this.baseInfo.wxSubscribeMessage[index].noticeTime = Number(data[index]) + Date.now();
        }
        //添加到待处理队列
        if(this.plt.indexOf('wx') != -1){
            global.playerMgr.addSubscribePlayers(this.loginInfo.openid,this.baseInfo.wxSubscribeMessage);
        }
        else if(this.plt.indexOf('hago') != -1){
            global.playerMgr.addSubscribePlayers(this.loginInfo.openid,this.baseInfo.wxSubscribeMessage,'hago');
        }
        else if(this.plt.indexOf('qq') != -1){
            global.playerMgr.addSubscribePlayers(this.loginInfo.openid,this.baseInfo.wxSubscribeMessage,'qq');
        }
    }

    public refreshtlmb() {
        if(Date.now() < this.baseInfo.tlmb_finish_time || this.baseInfo.tlmb_finish_time == 0) return;
        let price = global.resMgr.getConfig("tlmb_restart_zuanshi");
        //扣除报名费
        if(this.decMoney(Number(price), 'tlmb_restart', "tlmb_restart", price)){
            this.baseInfo.tlmb_finish_time = Date.now() + parseInt(global.resMgr.getConfig('tlmb_last_time')) * 60 * 60 * 1000;
            this.saveBaseInfo('tlmb_finish_time');
            global.netMgr.sendCharMiscUpdate(this.linkid, 'tlmb_finish_time', this.baseInfo.tlmb_finish_time);
        }
        return true;
    }

    public back_1v2_cost(index: number) {
        let result = false;
        let cost = Number(global.resMgr.getConfig('ChibiReset').split(',')[index]);
        if(this.delItem('W029', cost, 'refresh_1v2')){
            result = true;
        }
        global.netMgr.sendData({ cmd: "back_1v2_cost_ret", success: result }, this.linkid);
    }

    //阵营捐献
    public contribute(count: number){
        if(this.baseInfo.toy_camp.id == -1) return;
        if(count > 400) return;
        if(this.delItem('W034', count, 'contribute')){
            this.baseInfo.toy_camp.contribution += count;
            this.saveBaseInfo('toy_camp');
            global.netMgr.sendCharMiscUpdate(this.linkid, 'toy_camp', this.baseInfo.toy_camp);
            let charttype;
            switch (this.baseInfo.toy_camp.id){
                case 0:
                    charttype = TableRes.SeEnumChartTableeType.ZhenYingDuiKangWei;
                    break;
                case 1:
                    charttype = TableRes.SeEnumChartTableeType.ZhenYingDuiKangShu;
                    break;
                case 2:
                    charttype = TableRes.SeEnumChartTableeType.ZhenYingDuiKangWu;
                    break;
            }
            if(this.baseInfo.toy_camp.contribution >= 20){
                global.globalChartMgr.addPlayerLevelChart(this.pvpMgr.seasonid,
                    charttype,
                    {
                        seasonid: this.pvpMgr.seasonid,
                        id: this.id,
                        name: this.name,
                        score: this.baseInfo.toy_camp.contribution,
                        icon: this.icon,
                        avatar: this.avatar,
                        igroup: this.pvpMgr.groupId,
                        is_vip: this.baseInfo.is_vip,
                        vip_level: this.baseInfo.vip_level,
                    });
            }
            let multi = parseInt(global.resMgr.getConfig('zydk_point'));
            if(!multi) multi = 1;
            global.globalChartMgr.sendCSData({cmd: 'contribute', uid: this.id, id: this.baseInfo.toy_camp.id, count: count * multi});
            let reward_id = 'FL34';
            switch(count){
                case 1:
                    reward_id = 'FL34';
                    break;
                case 10:
                    reward_id = 'FL35';
                    break;
                case 100:
                    reward_id = 'FL36';
                    break;
                case 400:
                    reward_id = 'FL37';
                    break;
                        
            }
            this.addItem(reward_id, 1, 'contribute');
        }
    }

    public selectHeros(heroIds: Array<string>){
        if(heroIds.length != 4) return;
        this.baseInfo.selectHeros = heroIds;
        this.saveBaseInfo('selectHeros');
        global.netMgr.sendCharMiscUpdate(this.linkid, 'selectHeros', this.baseInfo.selectHeros);
    }

    amount_score_max = {30: 2000, 98: 3500, 198: 7000, 648: 20500};
    public selectHerosCompose(heroId: string, items: Array<{kItemID: string, iPileCount: number}>, amount: number){
        if(this.baseInfo.selectHeros.indexOf(heroId) == -1) return;
        //验证数量及道具是否作弊
        let score = 0;
        for(let i = 0; i < items.length; i++){
            let itemRes = global.resMgr.TownItemRes.getRes(items[i].kItemID);
            if(!itemRes){
                console.error("no item " + JSON.stringify(items));
                return;
            }
            score += Number(itemRes.iItemValue) * items[i].iPileCount;
        }
        if(score > this.amount_score_max[amount]){
            console.error("cheat score" + JSON.stringify(items));
            return;
        }
        if(!this.baseInfo.selectHerosCompose[heroId]) this.baseInfo.selectHerosCompose[heroId] = {};
        this.baseInfo.selectHerosCompose[heroId][amount] = items;
        this.saveBaseInfo('selectHerosCompose');
        global.netMgr.sendCharMiscUpdate(this.linkid, 'selectHerosCompose', this.baseInfo.selectHerosCompose);
    }

    
    public pve_pk_buy(type: string){
        let cost;
        let count;
        switch(type){
            // case 'refresh':
            //     cost = parseInt(global.resMgr.getConfig('JJC_cost').split(',')[1]);
            //     count = parseInt(global.resMgr.getConfig('JJC_freetimes').split(',')[1]);
            //     if(this.decMoney(cost, 'pve_pk_refresh')){
            //         this.dailyInfo.pve_pk_refresh_count += count;
            //     }
            //     break;
            // case 'watch':
            //     cost = parseInt(global.resMgr.getConfig('JJC_cost').split(',')[0]);
            //         this.dailyInfo.pve_pk_watch_id.push(watch_id);
            //     break;
            case 'fight':
                let cost_arr = global.resMgr.getConfig('JJC_cost').split(',');
                if(this.dailyInfo.pve_pk_fight_buy_count >= cost_arr.length - 1) cost = cost_arr[cost_arr.length - 1];
                else cost = cost_arr[this.dailyInfo.pve_pk_fight_buy_count];
                count = parseInt(global.resMgr.getConfig('JJC_freetimes').split(',')[0]);
                if(this.decMoney(parseInt(cost), 'pve_pk_refresh')){
                    this.dailyInfo.pve_pk_fight_count += count;
                    this.dailyInfo.pve_pk_fight_buy_count++;
                }
                break;
        }
        this.updateDailyInfo();
    }
    
    public random_discount(){
        if(this.baseInfo.random_discount != 100 && !this.decMoney(50, 'random_discount')){
            //首次(初始折扣100)免费，之后需要50钻
           return;
        }
        let vip_res = global.resMgr.getVIPResByVIPLevel(this.baseInfo.vip_level);
        if(vip_res.kchance){
            let chance = vip_res.kchance.split(',');
            let pool = [];
            for(let i = 0; i < chance.length; i++){
                pool.push({discount: i * 10 + 50, weight: Number(chance[i])});
            }
            let lucky = arrayRandomT(pool, 'weight');
            this.baseInfo.random_discount = lucky.discount;
            this.saveBaseInfo('random_discount');
            global.netMgr.sendCharMiscUpdate(this.linkid, 'random_discount', this.baseInfo.random_discount);
        }
    }
    
    /**生成pve默认数据 测试用*/
    private pveData() {
        var pve = {
            BossArr: [{kHeroID: 'B001', iLevel: 1}],
            BossLevelId: 1,
            LevelConstId: [],
            GamePurpose: 1,
        }
        return pve;
    }

    private guild_simple_info() {
        var info = {
            guild_id: this.baseInfo.guild_info.guild_id,
            guild_name: this.baseInfo.guild_info.guild_name,
            // guild_id: this.baseInfo.guild_info.guild_id,
            // guild_id: this.baseInfo.guild_info.guild_id,
        }
        return info;
    }
    //年兽秘宝
    get new_year_treasure(){
        return  this.baseInfo.new_year_treasure;
    }

    set new_year_treasure(value: SeNewYearTreasure){
        this.baseInfo.new_year_treasure = value;
        this.saveBaseInfo('new_year_treasure');
    }
    //选择大奖
    public selectLuckyItem(itemId: string, count: number){
        let new_year_treasure = this.new_year_treasure;
        //翻一次之后大奖不可变
        if(new_year_treasure.treasure_count > 0) return;
        new_year_treasure.lucky_id = itemId;
        new_year_treasure.lucky_count = Number(count);
        this.new_year_treasure = new_year_treasure;
        if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'new_year_treasure', this.baseInfo.new_year_treasure);
    }
    //前往下一层
    public goToNextLevel(){
        let new_year_treasure = this.new_year_treasure;
        //开到大奖才可以进入下一层
        if(new_year_treasure.level >= 15 || !new_year_treasure.lucky_get) return;
        new_year_treasure.lucky_id = "";
        new_year_treasure.lucky_count = 0;
        new_year_treasure.treasure_info = [];
        new_year_treasure.level++;
        new_year_treasure.lucky_get = false;
        new_year_treasure.treasure_count = 0;
        this.new_year_treasure = new_year_treasure;
        if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'new_year_treasure', this.baseInfo.new_year_treasure);
        return;
    }
    //年兽秘宝单个兑换
    public treasureExchangeSimple(index: number, notice = true){
        let lucky_get = false;//是否开到大奖
        if(this.new_year_treasure.treasure_info[index] || this.new_year_treasure.lucky_get || !this.new_year_treasure.lucky_id) return;
        let treasure = this.new_year_treasure;
        let pkTownItemRes = global.resMgr.TownItemRes.getRes('DH016');
        if(this.delItem('DH016',1)){
            let result =  this.m_pkShopMgr._rand_cards_(pkTownItemRes.kValueA, 1);
            //如果前一轮前5次出大奖，则前5次不出大奖
            while(treasure.lucky_before && result[0].kid == 'A202' && treasure.treasure_count < 5){
                result = this.m_pkShopMgr._rand_cards_(pkTownItemRes.kValueA, 1);
            }
            //判断是否有非常幸运的逻辑
            if(treasure.treasure_count < 5 && result[0].kid == 'A202'){
                treasure.lucky_before = true;
            }
            else if(treasure.treasure_count >= 5){
                treasure.lucky_before = false;
            }
            //特殊逻辑，如果是最后一个格子了，必出大奖, 
            //VIP6及以上的用户，在第一层时若前两次均为小奖，则第三次必定为大奖。
            if(treasure.treasure_count == 24 || result[0].kid == 'A202' || (this.baseInfo.is_vip && this.baseInfo.vip_level >= 6 && treasure.level == 0 && treasure.treasure_count >=2)){
                result[0].kid = treasure.lucky_id;
                result[0].num = treasure.lucky_count;
                lucky_get = true;
                treasure.lucky_get = lucky_get;
            }
            treasure.treasure_info[index] = {itemId: result[0].kid, count: result[0].num};
            treasure.treasure_count++;
            this.addItem(result[0].kid, result[0].num, 'new_year_treasure');
            this.new_year_treasure = treasure;
            if (notice && this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'new_year_treasure', this.baseInfo.new_year_treasure);
        }
        return lucky_get;
    }

    //年兽秘宝多个兑换
    public treasureExchangeBatch(){
        if(this.new_year_treasure.lucky_get) return;
        let index_array = [];
        let treasure = this.new_year_treasure;
        //看看有哪些要抽
        for(let i = 0; i < 25; i++){
            if(!treasure.treasure_info[i]) index_array.push(i);
        }
        index_array.sort((a,b) => Math.random() - 0.5);
        for(let i = 0; i < index_array.length; i++){
            if(this.treasureExchangeSimple(index_array[i], false)) {
                if(this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'new_year_treasure', this.baseInfo.new_year_treasure);
                return;
            }
        }
        if(this.bInitComplete) global.netMgr.sendCharMiscUpdate(this.linkid, 'new_year_treasure', this.baseInfo.new_year_treasure);
    }

}
