"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeAddDelItemReason = exports.PvpLogInfo = exports.EnumMallType = exports.SeShopInfo = exports.RechargeInfo = exports.PaTaLevelStage = exports.PaTaID = exports.DEFINE = exports.ITEM_DEFINE = exports.HeroBoxColorScore = exports.SeActiveInfo = exports.SePvpBox = exports.SeTaskItem = exports.SePvpInfo = exports.SeACInfo = exports.SeBaseCharInfo = exports.SignItem = exports.SeEquipInfo = exports.SeFlipLottery = exports.SeNewYearTreasure = exports.SeToyInfo = exports.SeGuildInfo = exports.SeDailyInfo = exports.ShangJinState = exports.LockType = exports.SeAdventureMapNum = exports.SePveMapNum = exports.SePveMapData = exports.SeEquip = exports.SeHeroCard = exports.SoldierType = exports.SeUpgradeType = exports.SeItem = void 0;
class SeItem {
}
exports.SeItem = SeItem;
var SeUpgradeType;
(function (SeUpgradeType) {
    SeUpgradeType[SeUpgradeType["HERO"] = 0] = "HERO";
    SeUpgradeType[SeUpgradeType["SOLDIER"] = 1] = "SOLDIER";
    SeUpgradeType[SeUpgradeType["SKILL1"] = 2] = "SKILL1";
    SeUpgradeType[SeUpgradeType["SKILL2"] = 3] = "SKILL2";
    SeUpgradeType[SeUpgradeType["LORDSKILL"] = 4] = "LORDSKILL";
})(SeUpgradeType = exports.SeUpgradeType || (exports.SeUpgradeType = {}));
var SoldierType;
(function (SoldierType) {
    SoldierType[SoldierType["ARROW"] = 0] = "ARROW";
    SoldierType[SoldierType["CAVALRY"] = 1] = "CAVALRY";
    SoldierType[SoldierType["FOOTMAN"] = 2] = "FOOTMAN";
})(SoldierType = exports.SoldierType || (exports.SoldierType = {}));
class SeHeroCard {
    constructor(oldObj = {}) {
        this.kHeroID = '0000';
        this.iCount = 0;
        this.iLevel = 1;
        //扩展字段
        this.oExtra = null;
        for (var key in oldObj) {
            if (this.hasOwnProperty(key)) {
                this[key] = oldObj[key];
            }
        }
    }
}
exports.SeHeroCard = SeHeroCard;
class SeEquip {
    constructor(oldObj = {}, uid, count) {
        this.kId = '';
        this.kName = '';
        this.eType = 0;
        this.iColor = 0;
        this.enchant = { iUnitAtk: 0, iUnitHp: 0, iMagicAtk: 0, iCastleAtk: 0, iCastleHp: 0 };
        this.last_enchant = { iUnitAtk: 0, iUnitHp: 0, iMagicAtk: 0, iCastleAtk: 0, iCastleHp: 0 };
        this.eLevel = 1;
        this.eStar = 0;
        this.eEXP = 0;
        this.isWeared = false;
        this.isLocked = false;
        for (var key in oldObj) {
            if (this.hasOwnProperty(key)) {
                this[key] = oldObj[key];
            }
        }
        this.eId = uid + "_" + this.kId + "_" + count;
    }
}
exports.SeEquip = SeEquip;
class SePveMapData {
}
exports.SePveMapData = SePveMapData;
class SePveMapNum {
}
exports.SePveMapNum = SePveMapNum;
class SeAdventureMapNum {
}
exports.SeAdventureMapNum = SeAdventureMapNum;
var LockType;
(function (LockType) {
    LockType[LockType["NULL"] = 0] = "NULL";
    LockType[LockType["TimeLock"] = 1] = "TimeLock";
    LockType[LockType["NormalLock"] = 2] = "NormalLock";
})(LockType = exports.LockType || (exports.LockType = {}));
var ShangJinState;
(function (ShangJinState) {
    ShangJinState[ShangJinState["NOENTER"] = 0] = "NOENTER";
    ShangJinState[ShangJinState["ENTER"] = 1] = "ENTER";
    ShangJinState[ShangJinState["FINISH"] = 2] = "FINISH";
})(ShangJinState = exports.ShangJinState || (exports.ShangJinState = {}));
class SeDailyInfo extends Object {
    constructor() {
        super(...arguments);
        this.shareCount = 0;
        this.freshTime = Date.now();
        this.daily_friend_send = [];
        this.daily_friend_recive = 0;
        this.duowangfree = 1;
        this.meiribaoxia = 1; // 每日宝箱任务次数 一天一次
        this.adBaoXiaCount = exports.DEFINE.ACC_BOX_MAX; // 每日开结算宝箱次数 一天三次
        this.adWatchTimeCount = 0; //每天观看广告次数
        this.adWatchTimeCount_array = [0]; //每天观看广告次数
        this.eSmallGameCount = 0; //每天进小游戏次数限制
        this.fromFollowPublicCount = 0; //每天从公众号进入的次数限制
        this.fightAwardLimit = {}; //每天的奖励限制
        this.shangxianBuffCount = 0; //每天上线通知次数
        this.wx_share_send = [];
        this.wx_share_send_zhanqi = [];
        this.wx_share_send_other = [];
        this.wx_shared_get = [];
        this.wx_shared_get_zhanqi = [];
        this.wx_shared_get_other = [];
        this.onlinetimeDaily = 0;
        this.adFree = 1;
        this.power_adWatchTimeCount = 0; //每天观看广告次数 用于购买体力
        this.power_buyCount = 0; //每天购买体力次数
        this.peak_cross_protect = global.resMgr.getConfig("peak_cross_protect") ? parseInt(global.resMgr.getConfig("peak_cross_protect")) : 0; //跨服争霸赛每日保护分
        this.person_signCount = 0; //修改个人签名次数
        this.meiriTaskRefreshCount = 0; //每日任务刷新次数
        this.lose_box_open = 0; //连续失败的每日宝箱开启
        this.pve_pk_fight_count = global.resMgr.getConfig("JJC_freetimes") ? parseInt(global.resMgr.getConfig("JJC_freetimes").split(',')[0]) : 0; //每日竞技场挑战次数
        this.pve_pk_fight_buy_count = 0; //每日竞技场挑战购买次数
        // pve_pk_refresh_count: number = global.resMgr.getConfig("JJC_freetimes")? parseInt(global.resMgr.getConfig("JJC_freetimes").split(',')[1]) : 0;//每日竞技场刷新次数
        this.pve_pk_watch_id = []; //诸侯伐董侦查过的id
        this.pve_pk_refresh = false; //诸侯伐董每日刷新
        this.guild_contribute = 0; //每日同盟捐献。用于上限判定
        this.guild_task_id = []; //同盟每日任务id
        this.guild_help_count = []; //同盟每日捐卡数量
        this.select_guild_task_id = ""; //选择后的同盟每日任务
    }
}
exports.SeDailyInfo = SeDailyInfo;
class SeGuildInfo {
    constructor() {
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
}
exports.SeGuildInfo = SeGuildInfo;
class SeToyInfo extends Object {
    constructor() {
        super(...arguments);
        this.id = -1; //当前加入的阵营id
        this.contribution = 0; //贡献值
        this.get_reward = false;
    }
}
exports.SeToyInfo = SeToyInfo;
class SeNewYearTreasure extends Object {
    constructor() {
        super(...arguments);
        this.lucky_id = ""; //大奖id
        this.lucky_count = 0; //大奖数量
        this.level = 0; //当前层数
        this.treasure_count = 0; //当前已抽取的奖励数
        this.treasure_info = []; //对应的奖励信息
        this.lucky_before = false; //是否很幸运，前5次就抽到了大奖
        this.lucky_get = false; //当前大奖是否领取
    }
}
exports.SeNewYearTreasure = SeNewYearTreasure;
class SeFlipLottery extends Object {
    constructor() {
        super(...arguments);
        this.freshTime = Date.now();
        this.nextFreshTime = Date.now();
        this.isBought = 0;
    }
}
exports.SeFlipLottery = SeFlipLottery;
class SeEquipInfo extends Object {
    constructor() {
        super(...arguments);
        this.haveEquips = [];
        this.allEquips = 0;
    }
}
exports.SeEquipInfo = SeEquipInfo;
class SignItem {
    constructor() {
        this.iDay = 0;
        this.signTime = 0;
        this.rewardTime = 0;
    }
}
exports.SignItem = SignItem;
// 这里考虑吧玩家数据拆分开来存储，增加存储玩家数据的速度和精度
class SeBaseCharInfo {
    constructor(obj = null) {
        this.uid = 0;
        this.charid = 0;
        this.charname = '';
        this.isRename = false;
        this.forcename = 0;
        this.icon = '';
        this.iconid = '';
        this.realicon = '';
        this.nation = '';
        this.servertime = Date.now();
        this.timezone = new Date().getTimezoneOffset();
        this.phoneNum = '';
        this.lockType = 0;
        this.lockTime = 0;
        this.score = 0;
        this.level = 0;
        this.checkMail = 0;
        this.checkPveStar = 0;
        this.checkPvePk = 0;
        this.checkGuild = 0;
        /**--------------战斗中相关的信息---------------**/
        /**战斗地块配置 */
        this.battleField = '';
        /**战斗表情配置 */
        this.battleTalks = [];
        /**战旗配置 */
        this.battleBanner = '';
        /**
         * 特权信息 最多 30 个有效位
         */
        this.property = 0;
        this.guide = 1;
        this.heros = [];
        //heros_skin:{"U101":{"skins":[{kid:xx, time:xxx}],"curskin":xxx}}
        this.heros_skin = {};
        /**
         * 主城配置相关
         */
        this.bosss = { Z000: 10180180211923 };
        /**
         * 主公
         */
        this.lord = 'Z008'; //当前主公
        this.lords = { Z008: { timeout: 10180180211923, wear_equips: [] } }; //主公列表
        this.shangjin_lord = 'Z008';
        this.shangjin_lords = ['Z008'];
        this.defaultPlan = 0;
        this.formation = [];
        //用于带pve属性的放置阵容
        this.pve_pk_formation = [];
        this.formationName = [];
        this.lordFormation = [];
        this.shangjinFormation = [];
        this.bossFormation = 'Z000';
        this.battlecampboss = 'Z008';
        this.items = [];
        this.sign = [];
        this.monthsign = { sign: 0, tot: 0, last: 0 };
        this.daysign = { sign: 0, tot: 0, last: 0 };
        /**
         * 玩家的每日数据，每日会初始化
         */
        this.dailyInfo = new SeDailyInfo();
        //翻牌子
        this.flipLotterys = {};
        //装备系统相关
        this.equipInfo = { haveEquips: [], allEquips: 0 };
        // 关卡相关
        this.gold = 0;
        this.money = 0;
        this.onlinetime = 0;
        this.createtime = Date.now();
        /**
         * 上次离线时间
         */
        this.lastLogoutTime = 0;
        this.lastLoginTime = 0;
        this.loginTime = 0;
        this.shangjinCount = 0; //当前赏金赛轮次
        this.shangjinState = 0; //赏金赛用户状态类型 0：未报名 1：已报名 2：奖励待领取
        this.shangjinPrivilege = 0; //赏金赛特权
        this.drawTimes = 0; //赏金赛初始抽奖次数
        this.shangjinHeroPool = {}; //赏金赛用户抽卡卡池
        this.shangjinHeroCards = []; //赏金赛用户卡组
        this.zuanshiScore = 0; // 钻石开卡的伪随机积分
        this.zuanshiTime = 0; // 最后一次钻石数据操作的时间
        this.adWatchTime = 0; //最后一次观看广告的时间
        this.adWatchTime_array = [0]; //最后一次观看广告的时间
        this.enterSmallGameAward = {}; //小游戏分流的奖励
        this.smallProgramAward = 0; //完成小程序的奖励
        this.followPublicAward = 0; //关注公众号的奖励
        this.wxSubscribeMessage = []; //微信订阅次数记录
        this.bDeskAward1 = false;
        this.sysmailCeche = null;
        this.bufferdatas = {};
        this.bufferundays = 0;
        this.bufferunitems = {};
        this.bufferundays_v2 = [];
        this.bufferunitems_v2 = [];
        //用于判断至尊邮件
        this.send_vip_mail = false;
        //判断vip系统是否过期
        this.is_vip = false;
        this.vip_level = 0;
        this.last_recharge_time = 0;
        this.vip_weekmail_time = 0;
        this.curMedals = []; //当前佩戴的勋章列表
        this.medals = {}; //总的勋章列表
        //Object {total:[{tid:, weight: }], cur:[{tid:, weight: }, length: ]}
        this.chancePools = {}; //玩家身上的不回收奖池
        this.clientCache = {}; //客户端需要的持久化数据(类似localStorage)
        this.mails = {}; // SeCharMailInfo[] = [];
        /**默认是开启授权的 */
        this.isAuth = true;
        /**
         * 玩家的数据版本
         * 方便以后数据版本升级使用
         */
        this.version = '';
        this.channel = '';
        this.share_uid = 0;
        this.personSign = '';
        this.powerNextAdWatchTime = Date.now(); //增加体力的下一次看广告时间
        this.next_chongzhu_time = 0;
        //屠龙秘宝到期时间
        this.tlmb_finish_time = 0;
        //骰子晶石数量
        this.shaizi_activity_count = 0;
        this.guild_info = new SeGuildInfo();
        this.guild_love_info = [];
        //老玩家回归时间
        this.old_player_time = 0;
        this.toy_camp = new SeToyInfo();
        //神秘商店选择英雄
        this.selectHeros = [];
        this.selectHerosCompose = {};
        this.buyHeroId = ''; //记录下即将购买的神秘商店英雄宝箱
        //神秘商店刷新折扣
        this.random_discount = 100;
        //神秘商店是否重置
        this.random_refresh_v2 = false;
        //亲密度皮肤使用情况
        this.hero_skin_use = {};
        this.hero_skin_record = [];
        //年兽秘宝
        this.new_year_treasure = new SeNewYearTreasure();
        this.callbackinfo = { from_uid: 0, join_uids: [], recharges: [], cangetaward: 0, totaward: 0, ver: '' };
        var jsonObj = obj;
        if (!obj) {
            return;
        }
        for (var key in jsonObj) {
            if (this.hasOwnProperty(key)) {
                if (key == 'heros') {
                    var copyHero = jsonObj[key];
                    for (var heroi = 0; heroi < copyHero.length; heroi++) {
                        var heroCard = new SeHeroCard(copyHero[heroi]);
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
exports.SeBaseCharInfo = SeBaseCharInfo;
class SeACInfo {
    constructor() {
        this.number = 0;
        this.fh_lv = 0;
    }
}
exports.SeACInfo = SeACInfo;
class SePvpInfo {
    constructor(obj = null) {
        this.uid = 0;
        this.boxList = null;
        this.templeteBox = null;
        this.openingIndex = -1;
        /**
         * 宝箱的随机分值
         */
        this.sequence = 0;
        // public scoreTime: number = 0;
        this.genBoxID = 0;
        /**
         * 当前1v1连胜场数
         */
        this.win_count = 0;
        this.lose_count = 0;
        this.top_win_count = 0;
        // public top_lose_count: number = 0;
        /**
         * 当前各pve最短用时
         */
        this.level_speed = [];
        //当前赛季竞速赛关卡
        this.level_speed_level = "";
        /**
         * 当前2v2连胜场数
         */
        this.win_2v2_count = 0;
        this.lose_2v2_count = 0;
        this.top_win_2v2_count = 0;
        // public top_lose_2v2_count: number = 0;    
        /**
         * 最近两场历史战斗对手
         */
        this.lone_oppname = [];
        /**
         * 总比赛场数
         */
        this.fight_count = 0;
        /**
         * pvp 的隐藏积分
         */
        this.pvp_score = 1500;
        /**
         * pvp 的段位
         */
        this.pvp_level = 1;
        /**
         * 玩家的巅峰段位
         */
        this.top_pvp_level = 1;
        /**
         * 当前段位的星星数
         */
        this.pvp_star = 0;
        /**
         * 保护积分
         */
        this.pvp_protect_score = 0;
        /**
         * 巅峰赛积分
         */
        this.peak_score = 1500;
        /**
         * 赏金赛积分
         */
        this.shangjin_score = 1500;
        /**
         * 当前巅峰赛胜场数
         */
        this.win_peak_count = 0;
        this.lose_peak_count = 0;
        /**
         * 当前赏金赛胜场数
         */
        this.win_shangjin_count = 0;
        this.lose_shangjin_count = 0;
        /**
         * 当前巅峰赛连胜场数
         */
        this.win_peak_lian_count = 0;
        this.lose_peak_lian_count = 0;
        this.top_win_peak_lian_count = 0;
        // public top_lose_peak_count: number = 0;
        /**
         * 当前赏金赛连胜场数
         */
        this.win_shangjin_lian_count = 0;
        this.lose_shangjin_lian_count = 0;
        this.top_win_shangjin_lian_count = 0;
        /**
         * 当前1v2连胜场数
         */
        this.win_1v2_lian_count = 0;
        this.lose_1v2_lian_count = 0;
        this.top_win_1v2_lian_count = 0;
        /**
         * 巅峰赛季历史数据
         */
        this.peak_season_log = [];
        /**
         * 榜单相关的缓存
         */
        this.peak_day_etime = 0;
        this.pve_pk_day_etime = 0;
        this.checked_sid = '';
        /**1v1的战斗记录信息 */
        this.log_1v1 = null;
        /**2v2的战斗记录信息 */
        this.log_2v2 = null;
        this.log_wuxianhuoli = null;
        /**巅峰赛的战斗记录信息 */
        this.log_peak = null;
        this.log_shangjin = null;
        this.log_1v2 = null;
        /**大师赛历史最高等级 */
        this.top_pvp_rank = 0;
        this.fengwang_count = 0;
        this.duowang_count = 0;
        this.high_duowang_count = 0;
        this.seasonid = 'S000';
        this.seasoninfo = [];
        this.raceinfo = "";
        // 默认开启检测
        this.synccheckinfo = { s_l: 0, us_l: 0, open: true };
        // public season_shop: { mallid: string, start: number }[] = [{ mallid: 'M601', start: 0 }];
        this.iGroupId = '';
        this.groupState = '';
        this.pve_chapters = {};
        this.pve_maps = {};
        this.pve_start_time = 0;
        //pve_new 相关数据
        this.levelInfo = {};
        //每日攻打次数刷新时间
        this.free_fight_fresh_time = 0;
        this.pve_new_start_time = 0;
        //恢复体力已过时间，如果大于设置值则减去
        this.leftTime = 0;
        this.power_fresh_time = 0;
        this.pve_cheat_times = [0, 0, 0];
        //荣耀战区击杀荣耀积分
        this.glory_score = 0;
        this.glory_score_all = 0;
        this.glory_kill = 0; //荣耀战区击杀人数
        this.glory_kill_all = 0;
        this.pve_pk_rank = 10001; //诸侯伐董排名
        //诸侯伐董对战记录
        this.pve_pk_record = [];
        this.pve_pk_opp = []; //诸侯伐董对手信息
        this.pve_pk_refresh_time = 0; //诸侯伐董上次刷新时间
        //诸侯伐董最大排名,10001-当前排名，越大代表越靠前
        this.max_pve_pk_rank = 0;
        this.pve_pk_fight_time = 0;
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
exports.SePvpInfo = SePvpInfo;
class SeTaskItem {
    constructor() {
        this.kId = "";
        this.checkId = "";
        this.value = 0;
        this.isGet = false;
        this.historyValue = 0;
        this.time = Date.now();
        /*------ 计算每日限制额度的功能 ---------*/
        // 上次刷新时间
        this.freshtime = Date.now();
        // 昨日数据
        this.lastD = 0;
    }
}
exports.SeTaskItem = SeTaskItem;
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
class SePvpBox {
    constructor() {
        this.up_count = 0;
    }
}
exports.SePvpBox = SePvpBox;
class SeActiveInfo {
}
exports.SeActiveInfo = SeActiveInfo;
/**
 * 一张卡的品质系数
 */
exports.HeroBoxColorScore = [0, 1, 4, 10, 20];
exports.ITEM_DEFINE = {
    TILI: 'W009',
    GEZI: 'W008',
    TUDI: 'W011',
    PATA: 'W018',
};
exports.DEFINE = {
    TILI_CHAPTER: 6,
    TILI_FIGHT: 0,
    SHARE_DAILY_MAX: 1,
    ACC_BOX_MAX: 3
};
exports.PaTaID = 'C900';
exports.PaTaLevelStage = 10;
class RechargeInfo {
    constructor() {
        this.orderid = '';
        this.uid = 0;
        this.mailid = "";
        this.amount = 0;
        this.time = 0;
        this.finish = false;
        this.sid = '';
    }
}
exports.RechargeInfo = RechargeInfo;
class SeShopInfo {
    constructor(obj = null) {
        this.uid = 0;
        // dailyItems: Array<SeMallItem> = [];
        // 随机商城
        this.modfiyItems = [];
        // 限购道具购买次数
        this.limit_count = {};
        /**
         * 动态开启的商品
         */
        this.limitedShop = {};
        this.dailyUpdateTime = 0;
        this.activityHash = null;
        // refreshCount: number = 0;
        this.refreshList = [];
        /**
         * n序列类所获得的状态
         */
        this.n_aloneheroCard = {};
        this.n_seasonCard = {};
        this.n_allwuCard = {};
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
exports.SeShopInfo = SeShopInfo;
var EnumMallType;
(function (EnumMallType) {
    EnumMallType[EnumMallType["Item"] = 0] = "Item";
    EnumMallType[EnumMallType["Hero"] = 1] = "Hero";
    EnumMallType[EnumMallType["Charge"] = 2] = "Charge";
    EnumMallType[EnumMallType["Equip"] = 3] = "Equip";
})(EnumMallType = exports.EnumMallType || (exports.EnumMallType = {}));
class PvpLogInfo {
    constructor() {
        this.winCount = 0;
        this.loseCount = 0;
        this.fightCount = 0;
        this.killBoss = 0;
        this.useCard = {};
    }
}
exports.PvpLogInfo = PvpLogInfo;
exports.DeAddDelItemReason = {
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
};
//# sourceMappingURL=SePlayerDef.js.map