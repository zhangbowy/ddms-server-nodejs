"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeEnumGuildItemReason = exports.NumType = exports.PlayerProperty = exports.PlayerPvpInfo = exports.PlayerInfo = exports.SeFriendInfo = exports.NameCheckCode = exports.BattleAction = exports.TaskAction = exports.EnumRaceType = exports.GetRobotDefine = exports.toy_totcharge_100 = exports.SeOprType = exports.SeTownBuffType = exports.PVE_PK_INIT_VALUE = exports.SCORE_INIT_VALUE = exports.SeAdventureType = exports.SeCityChartUnit = exports.SeCityChangingFlag = exports.SeFightScheme = exports.SeNationTypeNames = exports.SeNationType = exports.SeChartType = exports.SeDBInfoHead = exports.SeOpenBoxItem = exports.SeChartUnit = exports.SeCharMailInfo = exports.func_copy = exports.SeRaceBeginInfo = exports.SeLogicFormation = exports.SePvpOpp = exports.SeRaceOpp = exports.SeCharLoadFlag = exports.CharState = exports.SeMailType = exports.SeItemType = exports.SePveData = exports.SeShareType = void 0;
var SeCharLoadFlag;
(function (SeCharLoadFlag) {
    SeCharLoadFlag[SeCharLoadFlag["baseinfo"] = 1] = "baseinfo";
    SeCharLoadFlag[SeCharLoadFlag["mailinfo"] = 2] = "mailinfo";
    SeCharLoadFlag[SeCharLoadFlag["pvpInfo"] = 4] = "pvpInfo";
    SeCharLoadFlag[SeCharLoadFlag["recharge"] = 8] = "recharge";
    SeCharLoadFlag[SeCharLoadFlag["taskinfo"] = 32] = "taskinfo";
    SeCharLoadFlag[SeCharLoadFlag["shopinfo"] = 64] = "shopinfo";
    SeCharLoadFlag[SeCharLoadFlag["dbcomplete"] = 111] = "dbcomplete";
    SeCharLoadFlag[SeCharLoadFlag["extinfo"] = 128] = "extinfo";
    SeCharLoadFlag[SeCharLoadFlag["complete"] = 239] = "complete";
})(SeCharLoadFlag || (SeCharLoadFlag = {}));
exports.SeCharLoadFlag = SeCharLoadFlag;
var SeCityChangingFlag;
(function (SeCityChangingFlag) {
    SeCityChangingFlag[SeCityChangingFlag["weinationinfo"] = 1] = "weinationinfo";
    SeCityChangingFlag[SeCityChangingFlag["shunationinfo"] = 2] = "shunationinfo";
    SeCityChangingFlag[SeCityChangingFlag["wunationinfo"] = 4] = "wunationinfo";
    SeCityChangingFlag[SeCityChangingFlag["complete"] = 7] = "complete";
})(SeCityChangingFlag || (SeCityChangingFlag = {}));
exports.SeCityChangingFlag = SeCityChangingFlag;
var SeShareType;
(function (SeShareType) {
    SeShareType[SeShareType["yaoshi"] = 0] = "yaoshi";
    SeShareType[SeShareType["zhanqi"] = 1] = "zhanqi";
    SeShareType[SeShareType["other"] = 2] = "other";
})(SeShareType = exports.SeShareType || (exports.SeShareType = {}));
var SeDBInfoHead = {
    baseInfo: 'baseinfo_',
    mailInfo: 'mailsinfo_',
    pvpInfo: 'pvp_',
    rechargeInfo: "recharge_",
    taskinfo: "taskinfo_",
    shopinfo: "shopinfo_",
};
exports.SeDBInfoHead = SeDBInfoHead;
var CharState = {
    offline: 'offline',
    loading: 'loading',
    nochar: 'nochar',
    lock: 'lock',
    loadcomplete: 'loadcomplete',
    matching: 'matching',
    inrace: 'inrace'
};
exports.CharState = CharState;
// 拷贝函数 是否包括函数拷贝
function func_copy(obj, bFunc = false) {
    var out = {};
    if (obj instanceof Array) {
        out = [];
    }
    if (typeof obj == 'object') {
        for (var key in obj) {
            if (key == 'clone' || key == 'global') {
                continue;
            }
            if (typeof obj[key] == 'function' && !bFunc) {
                continue;
            }
            if (obj[key] == null) {
                out[key] = null;
            }
            else if (typeof obj[key] == 'object') {
                out[key] = func_copy(obj[key], false);
            }
            else {
                out[key] = obj[key];
            }
        }
    }
    else {
        out = obj;
    }
    return out;
}
exports.func_copy = func_copy;
class SeLogicFormation {
    constructor() {
        this.kHeroID = '0000';
        this.iLevel = 1;
    }
}
exports.SeLogicFormation = SeLogicFormation;
class SePveData {
}
exports.SePveData = SePveData;
class SeRaceOpp {
}
exports.SeRaceOpp = SeRaceOpp;
class SePvpOpp extends SeRaceOpp {
    constructor() {
        super(...arguments);
        this.killed = false;
    }
}
exports.SePvpOpp = SePvpOpp;
class SeRaceBeginInfo {
}
exports.SeRaceBeginInfo = SeRaceBeginInfo;
var SeMailType;
(function (SeMailType) {
    SeMailType[SeMailType["SYSTEM"] = 0] = "SYSTEM";
    SeMailType[SeMailType["AutoUse"] = 1] = "AutoUse";
    SeMailType[SeMailType["Charge"] = 2] = "Charge";
    SeMailType[SeMailType["PvpResult"] = 3] = "PvpResult";
    SeMailType[SeMailType["FriendKey"] = 4] = "FriendKey";
    SeMailType[SeMailType["SYSTEM_NO_DEL"] = 5] = "SYSTEM_NO_DEL";
    SeMailType[SeMailType["GM"] = 6] = "GM";
    SeMailType[SeMailType["Chart"] = 7] = "Chart";
    SeMailType[SeMailType["Record"] = 8] = "Record";
    SeMailType[SeMailType["ShareBack"] = 9] = "ShareBack";
    SeMailType[SeMailType["ThreeUrlBack"] = 10] = "ThreeUrlBack";
    SeMailType[SeMailType["Peak_SeasonReward"] = 11] = "Peak_SeasonReward";
    SeMailType[SeMailType["Peak_DailyReward"] = 12] = "Peak_DailyReward";
    SeMailType[SeMailType["LevelSpeed_SeasonReward"] = 13] = "LevelSpeed_SeasonReward";
    SeMailType[SeMailType["CallBackMsg"] = 14] = "CallBackMsg";
    SeMailType[SeMailType["Guild_Opr"] = 15] = "Guild_Opr";
    SeMailType[SeMailType["PvePk_SeasonReward"] = 16] = "PvePk_SeasonReward";
})(SeMailType || (SeMailType = {}));
exports.SeMailType = SeMailType;
class SeCharMailInfo {
    constructor(mailid = '', mailType = SeMailType.SYSTEM, message = '', items = [], title = "", endTime = 0) {
        this.mailid = ''; // 邮件的认证id
        this.uid = 0;
        this.message = ''; // 邮件的消息信息
        this.title = ''; //标题
        this.endTime = 0; //过期时间，0的话表示永久
        this.items = [];
        this.mailtype = SeMailType.SYSTEM;
        this.cttime = Date.now();
        this.mailstate = 0; //邮件状态0未领取，1已领取
        this.message = message;
        this.mailid = mailid;
        this.mailtype = mailType;
        this.title = title;
        this.items = items;
        this.endTime = endTime;
    }
}
exports.SeCharMailInfo = SeCharMailInfo;
class SeCityChartUnit {
    constructor() {
        this.id = 0;
        this.name = '';
        this.score = 0;
        this.level = 0;
        this.nation = '';
    }
}
exports.SeCityChartUnit = SeCityChartUnit;
class SeChartUnit {
    constructor() {
        this.seasonid = '';
        this.id = 0;
        this.name = '';
        this.score = 0;
        this.icon = '';
        this.igroup = '';
        this.time = 0;
        this.lordId = '';
        this.equip = [];
        this.curr = 0;
        this.is_vip = false;
        this.vip_level = 0;
        this.pve_pk_formation = {};
        this.pve_pk_extra_info = {}; //诸侯伐董需要用到的额外信息，同盟，徽章，战旗
        this.avatar = {};
    }
}
exports.SeChartUnit = SeChartUnit;
class SeOpenBoxItem {
    constructor() {
        this.kItemID = '';
        this.iItemNumber = 0;
        this.icolour = 0;
    }
    loadRes(obj) {
        var target = this;
        for (var key in target) {
            if (obj.hasOwnProperty(key)) {
                target[key] = func_copy(obj[key]);
            }
        }
    }
}
exports.SeOpenBoxItem = SeOpenBoxItem;
var SCORE_INIT_VALUE = 1500;
exports.SCORE_INIT_VALUE = SCORE_INIT_VALUE;
var PVE_PK_INIT_VALUE = 10001;
exports.PVE_PK_INIT_VALUE = PVE_PK_INIT_VALUE;
class SeChartType {
}
exports.SeChartType = SeChartType;
SeChartType.SCT_SCORE = 0;
SeChartType.SCT_PVP_SCORE = 1;
/**
 * 战区使用的榜单系统
 */
SeChartType.SCT_GROUP_PVP_SCORE = 2;
/**连胜 */
SeChartType.SCT_1V1_WIN = 3;
SeChartType.SCT_2V2_WIN = 4;
SeChartType.SCT_PEAK_SCORE = 5;
SeChartType.SCT_GLOBAL_PVP_SCORE = 12;
SeChartType.SCT_GLOBAL_PEAK_SCORE = 13;
SeChartType.SCT_PUTONG_LEVEL_SPEED = 15;
SeChartType.SCT_KUNNAN_LEVEL_SPEED = 16;
SeChartType.SCT_DIYU_LEVEL_SPEED = 17;
SeChartType.SCT_GLORY_SCORE = 18;
SeChartType.SCT_GLOBAL_GLORY_SCORE = 19;
SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED = 20;
SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED = 21;
SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED = 22;
SeChartType.SCT_GLOBAL_TOY_WEI = 80;
SeChartType.SCT_GLOBAL_TOY_SHU = 81;
SeChartType.SCT_GLOBAL_TOY_WU = 82;
SeChartType.SCT_GLOBAL_PVE_OFFLINE = 83;
// export enum SeTownItemProperty {
//     NULL = 0,
//     EVENT_DOUBLE = 1 << 0,
//     QUICK_USE = 1 << 1,
//     NOSTACK = 1 << 2,   //不叠加
//     NOFAILD = 1 << 3,   // 战斗失败豁免
// }
var SeItemType;
(function (SeItemType) {
    SeItemType[SeItemType["NULL"] = 0] = "NULL";
    SeItemType[SeItemType["FOOD"] = 1] = "FOOD";
    SeItemType[SeItemType["GOLD"] = 2] = "GOLD";
    SeItemType[SeItemType["HEROSCORE"] = 3] = "HEROSCORE";
    SeItemType[SeItemType["SKILLBOOK"] = 4] = "SKILLBOOK";
    SeItemType[SeItemType["LORDSKILL"] = 5] = "LORDSKILL";
    SeItemType[SeItemType["OPENBOX"] = 6] = "OPENBOX";
    SeItemType[SeItemType["DSTHEROSCORE"] = 7] = "DSTHEROSCORE";
    SeItemType[SeItemType["HEROCARD"] = 8] = "HEROCARD";
    SeItemType[SeItemType["JUNGONG"] = 9] = "JUNGONG";
    SeItemType[SeItemType["RANDOMITEM"] = 10] = "RANDOMITEM";
    SeItemType[SeItemType["FAST_UPGRAGE"] = 11] = "FAST_UPGRAGE";
    SeItemType[SeItemType["KAOSHANG"] = 12] = "KAOSHANG";
    SeItemType[SeItemType["ACITEM"] = 13] = "ACITEM";
    SeItemType[SeItemType["RANDITEM"] = 14] = "RANDITEM";
    SeItemType[SeItemType["ADDTARVEN"] = 20] = "ADDTARVEN";
    SeItemType[SeItemType["Energy"] = 21] = "Energy";
    SeItemType[SeItemType["HunShi"] = 22] = "HunShi";
    SeItemType[SeItemType["ShengWang"] = 23] = "ShengWang";
    SeItemType[SeItemType["ShuaXinGuanKa"] = 24] = "ShuaXinGuanKa";
    SeItemType[SeItemType["MAX_GOLD_ADD"] = 100] = "MAX_GOLD_ADD";
    SeItemType[SeItemType["MAX_FOOD_ADD"] = 101] = "MAX_FOOD_ADD";
    SeItemType[SeItemType["MAX_HERO_LEVEL"] = 102] = "MAX_HERO_LEVEL";
    SeItemType[SeItemType["MAX_FORMAT_NUM"] = 103] = "MAX_FORMAT_NUM";
    SeItemType[SeItemType["MAX_LORDSKILL_NUM"] = 104] = "MAX_LORDSKILL_NUM";
})(SeItemType = exports.SeItemType || (exports.SeItemType = {}));
var SeAdventureType;
(function (SeAdventureType) {
    SeAdventureType[SeAdventureType["CITY"] = 2] = "CITY";
    SeAdventureType[SeAdventureType["RESOURCE"] = 3] = "RESOURCE";
    SeAdventureType[SeAdventureType["NPC"] = 4] = "NPC";
    SeAdventureType[SeAdventureType["PLAYER"] = 5] = "PLAYER";
})(SeAdventureType || (SeAdventureType = {}));
exports.SeAdventureType = SeAdventureType;
var SeNationType = {
    SNT_WEI: 'WEI',
    SNT_SHU: 'SHU',
    SNT_WU: 'WU',
};
exports.SeNationType = SeNationType;
var SeFightScheme;
(function (SeFightScheme) {
    SeFightScheme[SeFightScheme["SFS_WEI"] = 0] = "SFS_WEI";
    SeFightScheme[SeFightScheme["SFS_SHU"] = 1] = "SFS_SHU";
    SeFightScheme[SeFightScheme["SFS_WU"] = 2] = "SFS_WU";
})(SeFightScheme || (SeFightScheme = {}));
exports.SeFightScheme = SeFightScheme;
var SeNationTypeNames = ['WEI', 'SHU', 'WU'];
exports.SeNationTypeNames = SeNationTypeNames;
var SeTownBuffType;
(function (SeTownBuffType) {
    SeTownBuffType[SeTownBuffType["NULL"] = 0] = "NULL";
    SeTownBuffType[SeTownBuffType["BUILD_FOOD_ADD"] = 1] = "BUILD_FOOD_ADD";
    SeTownBuffType[SeTownBuffType["BUILD_GOLD_ADD"] = 2] = "BUILD_GOLD_ADD";
    SeTownBuffType[SeTownBuffType["EXP_ADD"] = 3] = "EXP_ADD";
    SeTownBuffType[SeTownBuffType["BUILD_COST_DEC"] = 4] = "BUILD_COST_DEC";
    SeTownBuffType[SeTownBuffType["FIGHT_COST_DEC"] = 5] = "FIGHT_COST_DEC";
    SeTownBuffType[SeTownBuffType["HIRE_COST_DEC"] = 6] = "HIRE_COST_DEC";
    SeTownBuffType[SeTownBuffType["UNIT_ATTACK_ADD"] = 1001] = "UNIT_ATTACK_ADD";
    SeTownBuffType[SeTownBuffType["UNIT_ARMOR_ADD"] = 1002] = "UNIT_ARMOR_ADD";
    SeTownBuffType[SeTownBuffType["UNIT_HP_ADD"] = 1003] = "UNIT_HP_ADD";
    SeTownBuffType[SeTownBuffType["MAGIC_ADD"] = 1004] = "MAGIC_ADD";
})(SeTownBuffType = exports.SeTownBuffType || (exports.SeTownBuffType = {}));
var SeOprType;
(function (SeOprType) {
})(SeOprType = exports.SeOprType || (exports.SeOprType = {}));
exports.toy_totcharge_100 = [1854833100, 1914775057, 1852693008, 1863883747,
    1852860068, 1878254767, 1846383135, 1947158163, 1846097571, 1919698835, 1923769061, 1914320203, 1916070196,
    1927867607, 1948816571, 1955040158, 1915811540, 1845463319, 1867153918, 1977481968, 1869533837, 1859288509,
    1864697371, 1873087526, 1868738049, 1867170749, 1857593137, 1847473512, 1859571042, 1848362335, 1958846917,
    1949761032, 1863250947, 1919902306, 1868490470, 1955493224, 1914568460, 1926069347, 1854978132, 1860313623,
    1866128068, 2015883780, 1859371653, 1853237109, 1857480464, 1852098415, 1852314350, 1999549973, 1951257272,
    1845601060, 1846860950, 1852393774, 1876373550, 1858292161, 1847244130, 1866352871, 1949869305, 1923224255,
    1863685681, 1873493211, 1860952718, 1873300537, 1858558733, 1871313371, 1959968756, 1856337108, 1917383478,
    1852994016, 1857404996, 1864035486, 1849935098, 1842276694, 1875576482, 1852773543, 1875713428, 1952812983,
    1856557202, 1946228572, 1863446411, 1955118632, 1951103450, 1846481652, 1861333049, 1867176402, 1933509911,
    1851032490, 1878300755, 1847236059, 1845575654, 1873347048, 2014028497, 1849720167, 1867223027, 2020845815,
    1859885754, 1920277424, 1853527148, 1847749503, 1875785767, 1866089302, 1857595219, 1930343921, 1847333419,
    1845110334, 1854290979, 1846324467, 1923540797];
;
exports.GetRobotDefine = {
    colorScore: [100, 120, 145, 175],
    colorDScore: [10, 12, 15, 18],
    count: 8
};
var EnumRaceType;
(function (EnumRaceType) {
    EnumRaceType[EnumRaceType["Normal"] = 0] = "Normal";
    EnumRaceType[EnumRaceType["Pvp726"] = 1] = "Pvp726";
    EnumRaceType[EnumRaceType["MatchPvp"] = 2] = "MatchPvp";
    EnumRaceType[EnumRaceType["video"] = 3] = "video";
    EnumRaceType[EnumRaceType["olPvp"] = 4] = "olPvp";
    EnumRaceType[EnumRaceType["peakPvp"] = 5] = "peakPvp";
    EnumRaceType[EnumRaceType["shangjinPvp"] = 6] = "shangjinPvp";
    EnumRaceType[EnumRaceType["pvepk"] = 7] = "pvepk";
})(EnumRaceType = exports.EnumRaceType || (exports.EnumRaceType = {}));
var TaskAction;
(function (TaskAction) {
    TaskAction[TaskAction["FightComplete"] = 0] = "FightComplete";
    TaskAction[TaskAction["FightBossKill"] = 1] = "FightBossKill";
    TaskAction[TaskAction["HeroUp"] = 2] = "HeroUp";
    TaskAction[TaskAction["LevelUp"] = 3] = "LevelUp";
    TaskAction[TaskAction["UseMoney"] = 4] = "UseMoney";
    TaskAction[TaskAction["Recharge"] = 5] = "Recharge";
    TaskAction[TaskAction["Battle"] = 6] = "Battle";
    TaskAction[TaskAction["OpenBox"] = 7] = "OpenBox";
    TaskAction[TaskAction["LookVideo"] = 8] = "LookVideo";
    TaskAction[TaskAction["UseGold"] = 9] = "UseGold";
    TaskAction[TaskAction["GetPoint"] = 10] = "GetPoint";
    TaskAction[TaskAction["SayHello"] = 11] = "SayHello";
    TaskAction[TaskAction["Login"] = 12] = "Login";
    TaskAction[TaskAction["Elo"] = 13] = "Elo";
    TaskAction[TaskAction["OpenCard"] = 14] = "OpenCard";
    TaskAction[TaskAction["GiveKey"] = 15] = "GiveKey";
    TaskAction[TaskAction["AddItem"] = 16] = "AddItem";
    TaskAction[TaskAction["FirstPay"] = 17] = "FirstPay";
    TaskAction[TaskAction["FightJoin"] = 18] = "FightJoin";
    TaskAction[TaskAction["AddScore"] = 19] = "AddScore";
    TaskAction[TaskAction["FinishTask"] = 20] = "FinishTask";
    TaskAction[TaskAction["DelItem"] = 21] = "DelItem";
    TaskAction[TaskAction["UseItem"] = 22] = "UseItem";
    TaskAction[TaskAction["MonthVip"] = 23] = "MonthVip";
    TaskAction[TaskAction["Foucs"] = 24] = "Foucs";
    TaskAction[TaskAction["ShareVideo"] = 25] = "ShareVideo";
    TaskAction[TaskAction["ShopBuy"] = 26] = "ShopBuy";
    TaskAction[TaskAction["AdAward"] = 27] = "AdAward";
    TaskAction[TaskAction["ShareText"] = 28] = "ShareText";
    TaskAction[TaskAction["Ditutongguan"] = 29] = "Ditutongguan";
    TaskAction[TaskAction["FromScene"] = 30] = "FromScene";
    TaskAction[TaskAction["WxMessage"] = 31] = "WxMessage";
    TaskAction[TaskAction["PveStar"] = 32] = "PveStar";
    TaskAction[TaskAction["PveFight"] = 33] = "PveFight";
    TaskAction[TaskAction["PveWin"] = 34] = "PveWin";
    TaskAction[TaskAction["PveSweep"] = 35] = "PveSweep";
    TaskAction[TaskAction["EquipStar"] = 36] = "EquipStar";
    TaskAction[TaskAction["EquipExp"] = 37] = "EquipExp";
    TaskAction[TaskAction["EquipEnhance"] = 38] = "EquipEnhance";
    TaskAction[TaskAction["EquipEnchant"] = 39] = "EquipEnchant";
    TaskAction[TaskAction["EquipAdd"] = 40] = "EquipAdd";
    TaskAction[TaskAction["OnceRecharge"] = 41] = "OnceRecharge";
    TaskAction[TaskAction["HuiGuiRecharge"] = 42] = "HuiGuiRecharge";
    TaskAction[TaskAction["GuildContribute"] = 43] = "GuildContribute";
    TaskAction[TaskAction["ShareLink"] = 44] = "ShareLink";
    TaskAction[TaskAction["PvePkRank"] = 45] = "PvePkRank";
    TaskAction[TaskAction["GuildHelp"] = 46] = "GuildHelp";
})(TaskAction = exports.TaskAction || (exports.TaskAction = {}));
var BattleAction;
(function (BattleAction) {
    BattleAction[BattleAction["UseCard"] = 0] = "UseCard";
    BattleAction[BattleAction["AttackBoss"] = 1] = "AttackBoss";
    BattleAction[BattleAction["UseSkin"] = 2] = "UseSkin";
})(BattleAction = exports.BattleAction || (exports.BattleAction = {}));
var NameCheckCode;
(function (NameCheckCode) {
    NameCheckCode[NameCheckCode["Ok"] = 0] = "Ok";
    NameCheckCode[NameCheckCode["HasUsed"] = 1] = "HasUsed";
    NameCheckCode[NameCheckCode["CountLimit"] = 2] = "CountLimit";
})(NameCheckCode = exports.NameCheckCode || (exports.NameCheckCode = {}));
class SeFriendInfo {
    constructor() {
        this.uid = 0;
        this.name = "";
        this.icon = "";
        this.formation = [];
        this.level = 0;
        this.pvp_level = 0;
        this.pvp_score = 0;
        this.pvp_star = 0;
    }
}
exports.SeFriendInfo = SeFriendInfo;
class PlayerInfo {
    constructor() {
        this.charid = 0;
        this.name = "";
        this.icon = "";
        this.avatar = {};
        this.level = 0;
        this.score = 0;
        this.cardNum = 0;
        this.topPvpLevel = 0;
        this.topPvpRank = 0;
        this.pvpScore = 0;
        this.pvp1v1Info = null;
        this.pvp2v2Info = null;
        this.pvpPeakInfo = null;
        this.formation = null;
        this.pvp_score = 0;
        this.seasonid = 'S000';
        this.bossFormation = "";
        this.battleCampBoss = '';
        this.curMedals = [];
        this.lord = 'Z008';
        this.personSign = ''; //主公
        this.fengwang_count = 0;
        this.duowang_count = 0;
        this.high_duowang_count = 0;
        this.lord_equip = [];
        this.is_vip = false;
        this.vip_level = 0;
        this.battleBanner = "";
    }
}
exports.PlayerInfo = PlayerInfo;
class PlayerPvpInfo {
    constructor() {
        this.level = 0;
        this.cardId = "";
        this.brokenNum = 0;
        this.winCount = 0;
        this.maxWin = 0;
    }
}
exports.PlayerPvpInfo = PlayerPvpInfo;
var PlayerProperty;
(function (PlayerProperty) {
    PlayerProperty[PlayerProperty["GM_SHOW_ID"] = 1] = "GM_SHOW_ID";
    PlayerProperty[PlayerProperty["GM_TITLE"] = 2] = "GM_TITLE";
    PlayerProperty[PlayerProperty["GM_OB"] = 4] = "GM_OB";
    PlayerProperty[PlayerProperty["GM_COMPETIOR"] = 8] = "GM_COMPETIOR";
    PlayerProperty[PlayerProperty["GM_RECHARGE_TEST"] = 16] = "GM_RECHARGE_TEST";
})(PlayerProperty = exports.PlayerProperty || (exports.PlayerProperty = {}));
exports.NumType = {
    N_1v1: '1v1',
    N_pve_pk: 'pve_pk',
    // N_2v2_team: '2v2',  // 组队参加2v2的比赛
    // N_2v2_pk: '2v2_pk',
    N_cancell: 'cancell',
    // N_1v1_room: '1v1_rm',    // 1v1 开房间战斗
    N_2v2_join_room: 'join_room',
    N_2v2_ready_room: 'ready_room',
    N_2v2_leave_room: 'leave_room',
    N_1v2_join_room: '1v2_join_room',
    N_1v2_leave_room: '1v2_leave_room',
    N_1v2_ready_room: '1v2_ready_room',
    // 约战准备的房间界面数据
    N_ct_room: 'd_create_room',
    N_jn_room: 'd_join_room',
    N_lv_room: 'd_leave_room',
    N_rd_room: 'd_ready_room',
};
var SeEnumGuildItemReason;
(function (SeEnumGuildItemReason) {
    SeEnumGuildItemReason["cancel_exchange"] = "cancel_exchange";
    SeEnumGuildItemReason["normal"] = "normal";
})(SeEnumGuildItemReason = exports.SeEnumGuildItemReason || (exports.SeEnumGuildItemReason = {}));
//# sourceMappingURL=SeDefine.js.map