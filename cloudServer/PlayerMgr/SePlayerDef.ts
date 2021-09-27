import { SeLogicFormation, SePvpOpp, SeCharMailInfo, SeChartUnit } from "../SeDefine";
import { iApp } from '../app';
import { ifLevelTeHui,ifBMSale,ifOpenBoxUnit } from './SeShopMgr';
import { type } from "os";
declare var global: iApp;


export class SeItem {
    kItemID: string;
    iPileCount: number;
    end?: number;
}

export enum SeUpgradeType {
    HERO,
    SOLDIER,
    SKILL1,
    SKILL2,
    LORDSKILL,
}
export enum SoldierType {
    ARROW = 0,          //弓手
    CAVALRY,            //轻骑
    FOOTMAN,            //步兵
}

export class SeHeroCard {
    public constructor(oldObj = {}) {
        for (var key in oldObj) {
            if (this.hasOwnProperty(key)) {
                this[key] = oldObj[key];
            }
        }
    }

    public kHeroID: string = '0000';
    public iCount: number = 0;
    public iLevel: number = 1;
    //扩展字段
    public oExtra: Object = null;
}

export class SeEquip {
    public constructor(oldObj = {}, uid: number, count: number) {
        for (var key in oldObj) {
            if (this.hasOwnProperty(key)) {
                this[key] = oldObj[key];
            }
        }
        this.eId = uid + "_" + this.kId + "_" + count;
    }
    public eId: string;
    public kId: string = '';
    public kName: string = '';
    public eType: number = 0;
    public iColor: number = 0;
    public enchant: {iUnitAtk: number, iUnitHp: number, iMagicAtk: number, iCastleAtk: number, iCastleHp: number} = {iUnitAtk: 0, iUnitHp: 0, iMagicAtk: 0, iCastleAtk: 0, iCastleHp: 0};
    public last_enchant: {iUnitAtk: number, iUnitHp: number, iMagicAtk: number, iCastleAtk: number, iCastleHp: number} = {iUnitAtk: 0, iUnitHp: 0, iMagicAtk: 0, iCastleAtk: 0, iCastleHp: 0};
    public eLevel: number = 1;
    public eStar: number = 0;
    public eEXP: number = 0;
    public isWeared: boolean = false;
    public isLocked: boolean = false;
}

export class SePveMapData {
    mapid: string;
    num: number;
    time: number;
}

export class SePveMapNum {
    mapid: string;
    time: number;
}

export class SeAdventureMapNum {
    mapid: string;
    raceinfo: any;
}

export enum LockType {
    NULL = 0,
    TimeLock = 1,   // 限时封锁，短时间内无法登陆，会自动解锁的
    NormalLock = 2, // 普通封锁，不解锁一直无法登陆
}

export enum ShangJinState {
    NOENTER = 0,    //赏金赛未报名
    ENTER = 1,   // 赏金赛已报名
    FINISH = 2, //赏金赛已结束但奖励未领取
}

export class SeDailyInfo extends Object {
    shareCount = 0;
    freshTime = Date.now();
    daily_friend_send: number[] = [];
    daily_friend_recive: number = 0;
    duowangfree: number = 1;
    meiribaoxia: number = 1; // 每日宝箱任务次数 一天一次
    adBaoXiaCount: number = DEFINE.ACC_BOX_MAX;// 每日开结算宝箱次数 一天三次
    adWatchTimeCount: number = 0; //每天观看广告次数
    adWatchTimeCount_array: Array<number> = [0]; //每天观看广告次数
    eSmallGameCount: number = 0;  //每天进小游戏次数限制
    fromFollowPublicCount: number = 0; //每天从公众号进入的次数限制
    fightAwardLimit: Object = {};    //每天的奖励限制
    shangxianBuffCount: number = 0; //每天上线通知次数

    wx_share_send: number[] = [];
    wx_share_send_zhanqi: number[] = [];
    wx_share_send_other: number[] = [];
    wx_shared_get: { uid: number, icon: string, award: boolean }[] = [];
    wx_shared_get_zhanqi: { uid: number, icon: string, award: boolean }[] = [];
    wx_shared_get_other: { uid: number, icon: string, award: boolean }[] = [];
    onlinetimeDaily: number = 0;
    adFree: number = 1;
    power_adWatchTimeCount: number = 0; //每天观看广告次数 用于购买体力
    power_buyCount: number = 0; //每天购买体力次数
    peak_cross_protect: number = global.resMgr.getConfig("peak_cross_protect")? parseInt(global.resMgr.getConfig("peak_cross_protect")) : 0;//跨服争霸赛每日保护分
    person_signCount: number = 0; //修改个人签名次数
    meiriTaskRefreshCount: number = 0;//每日任务刷新次数
    lose_box_open: number = 0; //连续失败的每日宝箱开启
    pve_pk_fight_count: number = global.resMgr.getConfig("JJC_freetimes")? parseInt(global.resMgr.getConfig("JJC_freetimes").split(',')[0]) : 0;//每日竞技场挑战次数
    pve_pk_fight_buy_count: number = 0;//每日竞技场挑战购买次数
    // pve_pk_refresh_count: number = global.resMgr.getConfig("JJC_freetimes")? parseInt(global.resMgr.getConfig("JJC_freetimes").split(',')[1]) : 0;//每日竞技场刷新次数
    pve_pk_watch_id: Array<number> = []; //诸侯伐董侦查过的id
    pve_pk_refresh: boolean = false; //诸侯伐董每日刷新
    guild_contribute: number = 0; //每日同盟捐献。用于上限判定
    guild_task_id: Array<string> = []; //同盟每日任务id
    guild_help_count: Array<number> = []; //同盟每日捐卡数量
    select_guild_task_id: string = ""; //选择后的同盟每日任务
}

export class SeGuildInfo{
    public constructor() {
        this.guild_id = 0;
        this.help_info = [];
        this.exchange_info = [];
        this.apply_info = [];
        this.quite_time = 0;
        this.last_id = 0;
        this.last_ask_help_time = [];
        this.guild_name = '';
        this.invite_info = [];
        this.quit_or_kick = 0;
    }
    guild_name: string;
    guild_id: number; //当前加入的同盟id
    help_info: Array<{ id: number, name: string, count: number, heroId: string}>;   //暂时没有用起来
    exchange_info: Array<{ id: number, name: string, count: number, heroId: string, use_card:{count: number, heroId: string}}>; //暂时没有用起来
    apply_info: Array<{ id: number}>;
    quite_time: number; //退出同盟时间
    last_id: number; //上次退出的同盟id，用于24小时内反悔
    last_ask_help_time: Array<number>; //上次请求捐卡时间
    invite_info: Array<{ guild_id: number, inviter_id: number, inviter_name: string}>; //邀请信息
    quit_or_kick: number; //1代表自己退出，2代表被T
}

export class SeToyInfo extends Object{
    id: number = -1; //当前加入的阵营id
    contribution: number = 0; //贡献值
    get_reward: boolean = false;
}

export class SeNewYearTreasure extends Object{
    lucky_id: string = ""; //大奖id
    lucky_count: number = 0; //大奖数量
    level: number = 0; //当前层数
    treasure_count: number = 0; //当前已抽取的奖励数
    treasure_info: Array<{itemId: string, count: number}> = []; //对应的奖励信息
    lucky_before: boolean = false; //是否很幸运，前5次就抽到了大奖
    lucky_get: boolean = false; //当前大奖是否领取
}

export class SeFlipLottery extends Object {
    id: string;
    freshTime = Date.now();
    nextFreshTime = Date.now();
    lotterys: [{item: string, num: number, type: number, isOpen: number}];
    refreshDay: number;
    //特殊奖励张数限制
    maxNumLimit: number;
    minNumLimit: number;
    heroBoxZZYid: string;
    refreshCount: number;
    isBought: number = 0;
}

export class SeEquipInfo extends Object {
    haveEquips: Array<any> = [];
    allEquips: number = 0;
}

export class SignItem {
    iDay: number = 0;
    signTime: number = 0;
    rewardTime: number = 0;
}

export interface ifBufferInfo {
    id: string;
    optime: number;
    ftime: number;
    value: number;
    nodel: boolean;
}

/**
 * 赛季的历史数据
 */
export interface ifSeasonInfo {
    /**
     * 赛季id
     */
    kid: string;
    /**
     * 赛季的积分
     */
    pvpscore: number;
    /**
     * 赛季的段位
     */
    pvplevel: number;
    /**
     * 赛季奖励数量
     */
    awards: any[];
    viewed: boolean;

    newscore: number;
    newlevel: number;

    /**
     * 赛季成就信息
     */
    // tasks: Object;
    log1v1: Object;
    log2v2: Object;

    /**
     * 赛季巅峰积分
     */
    peakscore: number;
    //是否封王满级
    fengwangCount?: number;
    levelSpeed?: any[];
    gloryScore?: number;
}

// 这里考虑吧玩家数据拆分开来存储，增加存储玩家数据的速度和精度
export class SeBaseCharInfo {
    public uid: number = 0;
    public charid: number = 0;
    public charname: string = '';
    public isRename: boolean = false;
    public forcename: number = 0;
    public icon: string = '';
    public iconid: string = '';
    public realicon: string = '';
    public nation: string = '';
    public servertime: number = Date.now();
    public timezone: number = new Date().getTimezoneOffset();

    public phoneNum: string = '';

    public lockType: LockType = 0;
    public lockTime: number = 0;

    public score: number = 0;
    public level: number = 0;

    public checkMail: number = 0;
    public checkPveStar: number = 0;
    public checkPvePk: number = 0;
    public checkGuild: number = 0;
    /**--------------战斗中相关的信息---------------**/
    /**战斗地块配置 */
    public battleField: string = '';
    /**战斗表情配置 */
    public battleTalks: string[] = [];
    /**战旗配置 */
    public battleBanner: string = '';
    /**
     * 特权信息 最多 30 个有效位
     */
    public property: number = 0;
    public guide: number = 1;
    public heros: Array<any> = [];
    //heros_skin:{"U101":{"skins":[{kid:xx, time:xxx}],"curskin":xxx}}
    public heros_skin: { [heroid: string]: {} } = {};
    /**
     * 主城配置相关
     */
    public bosss: { [id: string]: number } = { Z000: 10180180211923 };

    /**
     * 主公
     */
    public lord: string = 'Z008';    //当前主公
    public lords: { [id: string]: {timeout:number, wear_equips: Array<string>} } = { Z008: {timeout: 10180180211923, wear_equips:[]}};   //主公列表

    public shangjin_lord: string = 'Z008';
    public shangjin_lords: Array<string> = ['Z008'];
    public defaultPlan: number = 0;
    public formation: Array<Array<string>> = [];
    //用于带pve属性的放置阵容
    public pve_pk_formation: Array<any> = [];
    public formationName: Array<string> = [];
    public lordFormation = [];
    public shangjinFormation: Array<string> = [];
    public bossFormation: string = 'Z000';
    public battlecampboss: string = 'Z008';
    public items: Array<SeItem> = [];

    public sign: Array<SignItem> = [];
    public monthsign: { sign: number, tot: number, last: number } = { sign: 0, tot: 0, last: 0 };
    public daysign: { sign: number, tot: number, last: number } = { sign: 0, tot: 0, last: 0 };
    /**
     * 玩家的每日数据，每日会初始化
     */
    public dailyInfo = new SeDailyInfo();

    //翻牌子
    public flipLotterys = {};
    //装备系统相关
    public equipInfo: SeEquipInfo = {haveEquips: [], allEquips: 0};

    // 关卡相关

    public gold: number = 0;

    public money: number = 0;

    public onlinetime: number = 0;
    public createtime: number = Date.now();

    /**
     * 上次离线时间
     */
    public lastLogoutTime: number = 0;
    public lastLoginTime: number = 0;
    public loginTime: number = 0;

    public shangjinCount: number = 0;  //当前赏金赛轮次
    public shangjinState: ShangJinState = 0;  //赏金赛用户状态类型 0：未报名 1：已报名 2：奖励待领取
    public shangjinPrivilege: number = 0;//赏金赛特权
    public drawTimes: number = 0;      //赏金赛初始抽奖次数
    public shangjinHeroPool:{ [id: string]: {weight: number, pool: Array<ifOpenBoxUnit>, s_pool: ifOpenBoxUnit[]}} = {};  //赏金赛用户抽卡卡池
    public shangjinHeroCards: Array<any> = [];      //赏金赛用户卡组

    public zuanshiScore: number = 0;    // 钻石开卡的伪随机积分
    public zuanshiTime: number = 0;      // 最后一次钻石数据操作的时间

    public adWatchTime: number = 0;      //最后一次观看广告的时间
    public adWatchTime_array: Array<number> = [0];      //最后一次观看广告的时间
    public enterSmallGameAward: { [appid: string]: number } = {}  //小游戏分流的奖励
    public smallProgramAward: number = 0; //完成小程序的奖励
    public followPublicAward: number = 0; //关注公众号的奖励
    public wxSubscribeMessage: Array<{curr: number, total:number, noticeTime:number}> = [];//微信订阅次数记录
    public bDeskAward1: boolean = false;

    public sysmailCeche: any = null;
    public bufferdatas = {};
    public bufferundays = 0;
    public bufferunitems = {};
    public bufferundays_v2 = [];
    public bufferunitems_v2 = [];
    //用于判断至尊邮件
    public send_vip_mail = false;
    //判断vip系统是否过期
    public is_vip = false;
    public vip_level = 0;
    public last_recharge_time = 0;
    public vip_weekmail_time = 0;
    public curMedals = [];   //当前佩戴的勋章列表
    public medals: { [id: string]: number } = {};     //总的勋章列表

    //Object {total:[{tid:, weight: }], cur:[{tid:, weight: }, length: ]}
    public chancePools: { [chanceID: string]: Object } = {};  //玩家身上的不回收奖池

    public clientCache: Object = {} //客户端需要的持久化数据(类似localStorage)

    public mails: Object = {};// SeCharMailInfo[] = [];


    /**默认是开启授权的 */
    public isAuth: boolean = true;

    /**
     * 玩家的数据版本
     * 方便以后数据版本升级使用
     */
    public version: string = '';
    public channel: string = '';

    public share_uid: number = 0;
    public personSign: string = '';

    public powerNextAdWatchTime: number = Date.now(); //增加体力的下一次看广告时间
    public next_chongzhu_time: number = 0;
    //屠龙秘宝到期时间
    public tlmb_finish_time: number = 0;
    //骰子晶石数量
    public shaizi_activity_count: number = 0;
    public guild_info = new SeGuildInfo();
    public guild_love_info: Array<{guild_id: number, guild_name: string, count: number, exchange_count_green: number, exchange_count_blue: number,exchange_count_purple: number,exchange_count_orange: number, task_count: number, contribute_count: number}>= [];
    //老玩家回归时间
    public old_player_time = 0;
    public toy_camp = new SeToyInfo();
    //神秘商店选择英雄
    public selectHeros: Array<string> = [];
    public selectHerosCompose: {[heroId: string]:{[amount: number]: Array<SeItem>}} = {};
    public buyHeroId: string = ''; //记录下即将购买的神秘商店英雄宝箱
    //神秘商店刷新折扣
    public random_discount: number = 100;
    //神秘商店是否重置
    public random_refresh_v2: boolean = false;
    //亲密度皮肤使用情况
    public hero_skin_use: {[kId: string]: number} = {};
    public hero_skin_record: Array<string> = [];
    //年兽秘宝
    public new_year_treasure = new SeNewYearTreasure();
    public callbackinfo: {
        from_uid: number,
        join_uids: number[],
        recharges: { uid: number, time: number, amount: number, value: number }[],
        cangetaward: number,
        totaward: number,
        ver: string
    } = { from_uid: 0, join_uids: [], recharges: [], cangetaward: 0, totaward: 0, ver: '' };

    public constructor(obj = null) {
        var jsonObj = obj;
        if (!obj) {
            return;
        }
        for (var key in jsonObj) {
            if (this.hasOwnProperty(key)) {
                if (key == 'heros') {
                    var copyHero = jsonObj[key];
                    for (var heroi = 0; heroi < copyHero.length; heroi++) {
                        var heroCard: SeHeroCard = new SeHeroCard(copyHero[heroi]);
                        if (heroCard) {
                            this.heros.push(heroCard);
                        }
                    }
                }
                else if (key == 'formation') {
                    var copyFormation = jsonObj[key];
                    for (var formation in copyFormation) {
                        this.formation.push(copyFormation[formation]);
                    }
                }
                else {
                    this[key] = jsonObj[key];
                }
            }
        }
    }
}

export class SeACInfo {
    public kID: string;
    public number: number = 0;
    public fh_lv: number = 0;
}


export class SePvpInfo {
    public uid: number = 0;
    public boxList: Array<SePvpBox> = null;
    public templeteBox: SePvpBox = null;
    public openingIndex: number = -1;


    /**
     * 宝箱的随机分值
     */
    public sequence: number = 0;
    // public scoreTime: number = 0;
    public genBoxID: number = 0;


    /**
     * 当前1v1连胜场数
     */
    public win_count: number = 0;
    public lose_count: number = 0;

    public top_win_count: number = 0;
    // public top_lose_count: number = 0;
    /**
     * 当前各pve最短用时
     */
    public level_speed: Array<number> = [];
    //当前赛季竞速赛关卡
    public level_speed_level: string = "";

    /**
     * 当前2v2连胜场数
     */
    public win_2v2_count: number = 0;
    public lose_2v2_count: number = 0;

    public top_win_2v2_count: number = 0;
    // public top_lose_2v2_count: number = 0;

    /**
     * 最近两场历史战斗对手
     */
    public lone_oppname: Array<string> = [];

    /**
     * 总比赛场数
     */
    public fight_count: number = 0;

    /**
     * pvp 的隐藏积分
     */
    public pvp_score: number = 1500;

    /**
     * pvp 的段位
     */
    public pvp_level: number = 1;

    /**
     * 玩家的巅峰段位
     */
    public top_pvp_level: number = 1;

    /**
     * 当前段位的星星数
     */
    public pvp_star: number = 0;

    /**
     * 保护积分
     */
    public pvp_protect_score: number = 0;

    /**
     * 巅峰赛积分
     */
    public peak_score: number = 1500;

    /**
     * 赏金赛积分
     */
    public shangjin_score: number = 1500;
    /**
     * 当前巅峰赛胜场数
     */
    public win_peak_count: number = 0;
    public lose_peak_count: number = 0;

    /**
     * 当前赏金赛胜场数
     */
    public win_shangjin_count: number = 0;
    public lose_shangjin_count: number = 0;
    /**
     * 当前巅峰赛连胜场数
     */
    public win_peak_lian_count: number = 0;
    public lose_peak_lian_count: number = 0;
    public top_win_peak_lian_count: number = 0;
    // public top_lose_peak_count: number = 0;

    /**
     * 当前赏金赛连胜场数
     */
    public win_shangjin_lian_count: number = 0;
    public lose_shangjin_lian_count: number = 0;
    public top_win_shangjin_lian_count: number = 0;

    /**
     * 当前1v2连胜场数
     */
    public win_1v2_lian_count: number = 0;
    public lose_1v2_lian_count: number = 0;
    public top_win_1v2_lian_count: number = 0;

    /**
     * 巅峰赛季历史数据
     */
    public peak_season_log: Array<Object> = [];

    /**
     * 榜单相关的缓存
     */
    public peak_day_etime: number = 0;
    public pve_pk_day_etime: number = 0;

    public checked_sid: string = '';

    /**1v1的战斗记录信息 */
    public log_1v1: PvpLogInfo = null;
    /**2v2的战斗记录信息 */
    public log_2v2: PvpLogInfo = null;
    public log_wuxianhuoli: PvpLogInfo = null;
    /**巅峰赛的战斗记录信息 */
    public log_peak: PvpLogInfo = null;
    public log_shangjin: PvpLogInfo = null;
    public log_1v2: PvpLogInfo = null;
    /**大师赛历史最高等级 */
    public top_pvp_rank: number = 0;
    public fengwang_count: number = 0;
    public duowang_count: number = 0;
    public high_duowang_count: number = 0;
    public seasonid: string = 'S000';
    public seasoninfo: Array<ifSeasonInfo> = [];

    public raceinfo: string = "";

    // 默认开启检测
    public synccheckinfo: { /**连续同步*/s_l: number, /**连续不同步*/us_l: number,/**是否检测*/ open: boolean } = { s_l: 0, us_l: 0, open: true };

    // public season_shop: { mallid: string, start: number }[] = [{ mallid: 'M601', start: 0 }];

    public iGroupId: string = '';
    public groupState: 'new' | 'old' | '' = '';

    public pve_chapters: { [chapter: string]: number } = {};
    public pve_maps: { [map: string]: { count: number, win: number, damage: number } } = {}
    public pve_start_time: number = 0;

    //pve_new 相关数据
    public levelInfo :{[kId: string]: {star: number, freeTimes: number, canBuyTimes: number, first: number}} = {};
    //每日攻打次数刷新时间
    public free_fight_fresh_time: number = 0;
    public pve_new_start_time: number = 0;
    //恢复体力已过时间，如果大于设置值则减去
    public leftTime = 0;
    public power_fresh_time = 0;
    public pve_cheat_times = [0,0,0];
    //荣耀战区击杀荣耀积分
    public glory_score: number = 0;
    public glory_score_all: number = 0;
    public glory_kill: number = 0; //荣耀战区击杀人数
    public glory_kill_all: number = 0;
    public pve_pk_rank: number = 10001;//诸侯伐董排名
    //诸侯伐董对战记录
    public pve_pk_record: Array<{season_id: string, time: number, opp_name: string, type: number, is_win: boolean, rank: number, rank_change: number}> = [];
    public pve_pk_opp: Array<SeChartUnit> = []; //诸侯伐董对手信息
    public pve_pk_refresh_time: number = 0;//诸侯伐董上次刷新时间
    //诸侯伐董最大排名,10001-当前排名，越大代表越靠前
    public max_pve_pk_rank: number = 0;
    public pve_pk_fight_time: number = 0;
    public constructor(obj = null) {
        var jsonObj = obj;
        if (!obj) {
            return;
        }
        for (var key in jsonObj) {
            if (this.hasOwnProperty(key)) {
                this[key] = jsonObj[key];
            }
        }
        if (!this.log_1v1) {
            this.log_1v1 = new PvpLogInfo();
        }
        if (!this.log_2v2) {
            this.log_2v2 = new PvpLogInfo();
        }
        if (!this.log_peak) {
            this.log_peak = new PvpLogInfo();
        }
        if (!this.log_shangjin) {
            this.log_shangjin = new PvpLogInfo();
        }
        if (!this.log_1v2) {
            this.log_1v2 = new PvpLogInfo();
        }
    }
}

export class SeTaskItem {
    kId: string = "";
    checkId: string = "";
    value: number = 0;
    isGet: boolean = false;
    historyValue: number = 0;
    time: number = Date.now();

    /*------ 计算每日限制额度的功能 ---------*/
    // 上次刷新时间
    freshtime: number = Date.now();
    // 昨日数据
    lastD: number = 0;
}

// export class SeTaskFullItem extends SeTaskItem {
//     iTab: number = 0;
//     iModule: number = 0;
//     kDescription: string = "";
//     iValue: number = 0;
//     aContent: Array<string> = null;
//     iLevel: number = 0;
//     iStatistics: number = 0;
//     akAwards: Array<string> = null;
//     iType: number = 0;
//     iGroup: number = 0;
//     iIndex: number = 0;
//     kName: string = "";
//     kBg: string = "";
//     iPoints: number = 0;
// }

export class SePvpBox {
    id: number;
    /**
     * 宝箱开启需要时间
     */
    optime: number;
    /**
     * 实际开箱子时间
     */
    org_time: number;
    /**
     * 宝箱开启时间
     */
    ftime: number;
    /**
     * 宝箱类型
     */
    type: number;
    /**
     * 宝箱等级
     */
    level: number;
    up_count: number = 0;
}

export class SeActiveInfo {
    kID: string;
    iValue: string;
    iVer: number;
    state: string;
}


/**
 * 一张卡的品质系数
 */
export var HeroBoxColorScore = [0, 1, 4, 10, 20];

export var ITEM_DEFINE = {
    TILI: 'W009',
    GEZI: 'W008',
    TUDI: 'W011',
    PATA: 'W018',
}

export var DEFINE = {
    TILI_CHAPTER: 6,
    TILI_FIGHT: 0,
    SHARE_DAILY_MAX: 1,
    ACC_BOX_MAX: 3
}

export var PaTaID = 'C900';
export var PaTaLevelStage = 10;

export class RechargeInfo {
    orderid: string = '';
    uid: number = 0;
    mailid: string = "";
    amount: number = 0;
    time: number = 0;
    finish: boolean = false;
    sid: string = '';
}

export interface ifShopLimit {
    buy: number, //购买的次数
    cttime: number,  // 上次购买的时间
}

export class SeShopInfo {
    uid: number = 0;
    // dailyItems: Array<SeMallItem> = [];

    // 随机商城
    modfiyItems: SeMallItem[][] = [];

    // 限购道具购买次数
    limit_count: {
        [shopid: string]: {
            /**已经购买的次数 */
            buy: number,
            /**次数刷新的时候使用的时间属性 */
            cttime: number
        }
    } = {};

    /**
     * 动态开启的商品
     */
    limitedShop: {
        [mailID: string]: {
            /**开启时间 */
            begin: number,
            /**持续时间 */
            last: number
        }
    } = {};

    dailyUpdateTime: number = 0;

    activityHash: any = null;
    // refreshCount: number = 0;
    refreshList: number[] = [];

    /**
     * n序列类所获得的状态
     */
    public n_aloneheroCard: Object = {};
    public n_seasonCard: Object = {};
    public n_allwuCard: Object = {};

    public constructor(obj = null) {
        var jsonObj = obj;
        if (!obj) {
            return;
        }
        for (var key in jsonObj) {
            if (this.hasOwnProperty(key)) {
                this[key] = jsonObj[key];
            }
        }
    }
}


export interface SeMallItem {
    kID: string;
    marketId?: string;
    mallType?: EnumMallType;

    akItemID: string[];
    iCount: number;

    ePriceType?: number;
    payId?: string;
    iPrice?: number;
    /**剩余购买次数 */
}

export interface SeMallFullItem extends SeMallItem {
    iOpenGrade: number;
    iDiscount?: number;

    iOpenRank: number;
    iOpenELO: number;
    iOpenJJCRank: number;

    iStartTime: number;
    iLasttime: number;
    iPos: number;
    akUISkin: Array<string>;
    eType: number;
    eFreshType: number;
    iTab: number;
    kMark: string;
    kName: string;
    iOriginalCost: number;
    kAdContent: string;
    kPreID: string;

    iProperty: number;
    iLabel: number;
    iVipDisount: number;
    iVipNeedLevel: number;
    kExtraValue: string;
    iAllianceRank: number;
}

export enum EnumMallType {
    Item,           //商品
    Hero,           //武将
    Charge,         //充值
    Equip,
}

export interface IExtResult {
    time: number,
    win: number,
    stmp: string,
    rid: string,
    score: number,
    f_score: number,
    addBoxId: number
}

export interface iFightResult {
    star: number,
    items: SeItem[],
    gameinfo: IExtResult
}

export class PvpLogInfo {
    winCount: number = 0;
    loseCount: number = 0;
    fightCount: number = 0;
    killBoss: number = 0;
    useCard: any = {};
}

export interface ActivityLog {
    kActivityId: string,
    kExchangeId: string,
    buyCount: number,
    itemInfo?: Object,
    extInfo?: Object
}

export var DeAddDelItemReason = {
    cheatdel: 'cheatdel',
    useitem: 'useitem',
    buyBoxKey: 'buyBoxKey',
    shopdel: 'shopdel',
    exchangecost: 'exchangecost',
    share: 'share',
    bindPhoneNum: 'bindPhoneNum',
    get_share_award: 'get_share_award',
    get_share_zhanqi_award: 'get_share_zhanqi_award',
    share_keys_award: 'share_keys_award',
    adwatch: 'adwatch',
    esmallgame: 'esmallgame',
    smallprogram: 'smallprogram',
    sign: 'sign',
    deskAward: 'deskAward',
    yueka: 'yueka',
    shopbuy: 'shopbuy',
    exchange: 'exchange',
    monthsign: 'monthsign'
}
