import { SeEquip } from "./PlayerMgr/SePlayerDef";

enum SeCharLoadFlag {
    baseinfo = 1 << 0,
    mailinfo = 1 << 1,
    pvpInfo = 1 << 2,
    recharge = 1 << 3,
    taskinfo = 1 << 5,
    shopinfo = 1 << 6,

    dbcomplete = baseinfo | mailinfo | pvpInfo | recharge | taskinfo | shopinfo,

    extinfo = 1 << 7,   // 这个是从登陆服务器过来的数据
    complete = extinfo | dbcomplete,
}

export interface IFLoginInfo {
    channel: string,
    appid: string,
    uid: string,
    time: string,
    sign: string,
    shareuid: string,
    sharetime: number,
    sharetype: number,
    sdw_from: string,
    openid: string,
    openkey: string,
    scene: string,
    countryCode: string,
    device_os: 'ios' | 'andriod' | 'pc',
    wxinfo: {
        avatarUrl: string,
        city: string,
        country: string,
        gender: number,
        language: string,
        nickName: string,
        province: string
    },
    plt: string
}

enum SeCityChangingFlag {
    weinationinfo = 1 << 0,
    shunationinfo = 1 << 1,
    wunationinfo = 1 << 2,
    complete = weinationinfo | shunationinfo | wunationinfo
}

export enum SeShareType {
    yaoshi = 0,
    zhanqi = 1,
    other = 2,
}

var SeDBInfoHead = {
    baseInfo: 'baseinfo_',
    mailInfo: 'mailsinfo_',
    pvpInfo: 'pvp_',
    rechargeInfo: "recharge_",
    taskinfo: "taskinfo_",
    shopinfo: "shopinfo_",
};

var CharState = {
    offline: 'offline',
    loading: 'loading',
    nochar: 'nochar',
    lock: 'lock',
    loadcomplete: 'loadcomplete',
    matching: 'matching',
    inrace: 'inrace'
};


// 拷贝函数 是否包括函数拷贝
function func_copy<T>(obj: T | any, bFunc = false): T {
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
    return <T>out;
}


class SeLogicFormation {
    public kHeroID: string = '0000';
    public iLevel: number = 1;
    public kSkin?: string;
}

export class SePveData {
    BossArr?: Array<{kHeroID: string,iLevel: number;}>;
    BossLevelId?: number;           //Level表的iLevelID
    LevelConstId?: Array<string>;   //对应levelConst表kID 
    GamePurpose?: number;           //Level表iGamePurpose, 记录数据在这里, 方便初始boss或者主城
}

class SeRaceOpp {
    Id: number;
    Name: string;
    Formation: Array<SeLogicFormation>;
    pvp_score: number;
    pvp_level: number;
    castle_level: number;
    Icon: string;
    rurl?: string;
    checkKey?: string;
}

class SePvpOpp extends SeRaceOpp {
    public killed: boolean = false;
}

class SeRaceBeginInfo {
    public raceid: any;
    public myName: string;
    public myFormation: Array<SeLogicFormation>;
    public myJudgeValue: number;
    public myLevel: number;
    public myIcon: string;

    public oppId: number;
    public oppName: string;
    public oppFormation: Array<SeLogicFormation>;
    public oppJudgeValue: number;
    public oppLevel: number;
    public oppIcon: string;
}

enum SeMailType {
    SYSTEM,
    AutoUse,        // 获取及使用
    Charge,
    PvpResult,       // 结算用的特殊邮件
    FriendKey,       // 特殊的钥匙邮件
    SYSTEM_NO_DEL,   // systemmail 表上的邮件
    GM,
    Chart,
    Record,
    ShareBack,      // 微信版本分享连接进入后，给对方送钥匙
    ThreeUrlBack,   // 第三方请求结果返回

    Peak_SeasonReward,   // 巅峰赛赛季结算
    Peak_DailyReward,   // 巅峰赛每日奖励
    LevelSpeed_SeasonReward,   // 关卡竞速赛季结算
    CallBackMsg,        // 招募活动的消息
    Guild_Opr, //同盟离线操作，比如发送奖励
    PvePk_SeasonReward,   // 诸侯伐董赛季结算
}

class SeCharMailInfo {
    constructor(mailid: string = '', mailType: SeMailType = SeMailType.SYSTEM, message: string = '', items: Array<{ kItemID: string, iPileCount: number }> = [], title: string = "", endTime: number = 0) {
        this.message = message;
        this.mailid = mailid;
        this.mailtype = mailType;
        this.title = title;
        this.items = items;
        this.endTime = endTime;
    }
    public mailid: string = '';     // 邮件的认证id
    public uid: number = 0;
    public message: string = '';    // 邮件的消息信息
    public title: string = '';         //标题
    public endTime: number = 0;            //过期时间，0的话表示永久
    public items: Array<{ kItemID: string, iPileCount: number }> = [];
    public mailtype: SeMailType = SeMailType.SYSTEM;
    public cttime: number = Date.now();
    public mailstate: number = 0;          //邮件状态0未领取，1已领取
    public plt: string;
}

class SeCityChartUnit {
    public id: number = 0;
    public name: string = '';
    public score: number = 0;
    public level: number = 0;
    public nation: string = '';
}

class SeChartUnit {
    public seasonid: string = '';
    public id: number = 0;
    public name: string = '';
    public score: number = 0;
    public icon: string = '';
    public igroup: string = '';
    public time?: number = 0;
    public lordId?: string = '';
    public equip? = [];
    public curr?: number = 0;
    public is_vip?: boolean = false;
    public vip_level?: number = 0;
    public pve_pk_formation? = {};
    public pve_pk_extra_info? = {}; //诸侯伐董需要用到的额外信息，同盟，徽章，战旗
    public avatar? = {};
}

class SeOpenBoxItem {
    public kItemID: string = '';
    public exItemID: string;    // 表示道具兑换成钱了
    public iItemNumber: number = 0;
    public icolour: number = 0;
    public opened: boolean;

    public loadRes(obj: any) {
        var target: any = this;
        for (var key in target) {
            if (obj.hasOwnProperty(key)) {
                target[key] = func_copy(obj[key]);
            }
        }
    }
}

var SCORE_INIT_VALUE = 1500;
var PVE_PK_INIT_VALUE = 10001;
class SeChartType {
    public static SCT_SCORE = 0;
    public static SCT_PVP_SCORE = 1;
    /**
     * 战区使用的榜单系统
     */
    public static SCT_GROUP_PVP_SCORE = 2;
    /**连胜 */
    public static SCT_1V1_WIN = 3;
    public static SCT_2V2_WIN = 4;
    public static SCT_PEAK_SCORE = 5;
    public static SCT_GLOBAL_PVP_SCORE = 12;
    public static SCT_GLOBAL_PEAK_SCORE = 13;
    public static SCT_PUTONG_LEVEL_SPEED = 15;
    public static SCT_KUNNAN_LEVEL_SPEED = 16;
    public static SCT_DIYU_LEVEL_SPEED = 17;
    public static SCT_GLORY_SCORE = 18;
    public static SCT_GLOBAL_GLORY_SCORE = 19;
    public static SCT_GLOBAL_PUTONG_LEVEL_SPEED = 20;
    public static SCT_GLOBAL_KUNNAN_LEVEL_SPEED = 21;
    public static SCT_GLOBAL_DIYU_LEVEL_SPEED = 22;
    public static SCT_GLOBAL_TOY_WEI = 80;
    public static SCT_GLOBAL_TOY_SHU = 81;
    public static SCT_GLOBAL_TOY_WU = 82;
    public static SCT_GLOBAL_PVE_OFFLINE = 83;
}


// export enum SeTownItemProperty {
//     NULL = 0,
//     EVENT_DOUBLE = 1 << 0,
//     QUICK_USE = 1 << 1,
//     NOSTACK = 1 << 2,   //不叠加
//     NOFAILD = 1 << 3,   // 战斗失败豁免
// }

export enum SeItemType {
    NULL,
    FOOD,
    GOLD,
    HEROSCORE,
    SKILLBOOK,
    LORDSKILL,
    OPENBOX,
    DSTHEROSCORE,
    HEROCARD,
    JUNGONG,
    RANDOMITEM,
    FAST_UPGRAGE, // 快速升级图纸
    KAOSHANG,
    ACITEM,
    RANDITEM,       //随机装备14
    ADDTARVEN = 20,
    Energy = 21,
    HunShi = 22,
    ShengWang = 23,
    ShuaXinGuanKa = 24,

    MAX_GOLD_ADD = 100,// 仓库扩容
    MAX_FOOD_ADD,      // 粮仓扩容
    MAX_HERO_LEVEL,    // 英雄上限扩容
    MAX_FORMAT_NUM,    // 最大阵容英雄扩容
    MAX_LORDSKILL_NUM,  // 领主技能扩容 

}

enum SeAdventureType {
    CITY = 2,
    RESOURCE,
    NPC,
    PLAYER,
}

var SeNationType = {
    SNT_WEI: 'WEI',
    SNT_SHU: 'SHU',
    SNT_WU: 'WU',
};

enum SeFightScheme {
    SFS_WEI,
    SFS_SHU,
    SFS_WU,
}

var SeNationTypeNames = ['WEI', 'SHU', 'WU'];

export { SeMailType, CharState, SeCharLoadFlag, SeRaceOpp, SePvpOpp, SeLogicFormation, SeRaceBeginInfo, func_copy, SeCharMailInfo, SeChartUnit, SeOpenBoxItem, SeDBInfoHead, SeChartType, SeNationType, SeNationTypeNames, SeFightScheme, SeCityChangingFlag, SeCityChartUnit, SeAdventureType, SCORE_INIT_VALUE, PVE_PK_INIT_VALUE };

export enum SeTownBuffType {
    NULL = 0,
    BUILD_FOOD_ADD = 1, //[收粮增益:1]
    BUILD_GOLD_ADD = 2,//[收钱增益:2]
    EXP_ADD = 3,//[经验增益:3]
    BUILD_COST_DEC = 4,//[鲁班之力:4]
    FIGHT_COST_DEC = 5,//[屯田之法:5]
    HIRE_COST_DEC = 6,//[招贤礼士:6]

    UNIT_ATTACK_ADD = 1001,// [攻击加成:7]
    UNIT_ARMOR_ADD = 1002,//[护甲加成:8]
    UNIT_HP_ADD = 1003,//[血量加成:9]
    MAGIC_ADD = 1004,//[士气加成:10]
}

export enum SeOprType {

}

export interface ifSdwAPI {
    Channel: string,//	渠道id（不是必传）
    appId: string,//	游戏id
    accountId: string,//	玩家id
    amount: string,//	支付金额(分)
    cpOrderId: string,//	游戏自己的订单号id，支付请求时的游戏订单号
    memo: string,//	支付之前透传的参数
    orderId: string,//	支付成功平台返回的订单id
    sign: string,//	加密串， 加密方法：MD5(accountId = { 0}& amount={ 1}& appId={ 2}& cpOrderId={ 3}& orderId={ 4}{5})
    // 加密说明：
    // { 0 }:accountId
    // { 1 }:amount
    // { 2 }:appId
    // { 3 }:cpOrderId
    // { 4 }:orderId
    // { 5 }:分配的游戏key
}

export var toy_totcharge_100 = [1854833100,1914775057,1852693008,1863883747,
    1852860068,1878254767,1846383135,1947158163,1846097571,1919698835,1923769061,1914320203,1916070196,
    1927867607,1948816571,1955040158,1915811540,1845463319,1867153918,1977481968,1869533837,1859288509,
    1864697371,1873087526,1868738049,1867170749,1857593137,1847473512,1859571042,1848362335,1958846917,
    1949761032,1863250947,1919902306,1868490470,1955493224,1914568460,1926069347,1854978132,1860313623,
    1866128068,2015883780,1859371653,1853237109,1857480464,1852098415,1852314350,1999549973,1951257272,
    1845601060,1846860950,1852393774,1876373550,1858292161,1847244130,1866352871,1949869305,1923224255,
    1863685681,1873493211,1860952718,1873300537,1858558733,1871313371,1959968756,1856337108,1917383478,
    1852994016,1857404996,1864035486,1849935098,1842276694,1875576482,1852773543,1875713428,1952812983,
    1856557202,1946228572,1863446411,1955118632,1951103450,1846481652,1861333049,1867176402,1933509911,
    1851032490,1878300755,1847236059,1845575654,1873347048,2014028497,1849720167,1867223027,2020845815,
    1859885754,1920277424,1853527148,1847749503,1875785767,1866089302,1857595219,1930343921,1847333419,
    1845110334,1854290979,1846324467,1923540797];
export interface ifRecharge1 {
    appId?: string,
    amount?: number,
    wxopenid?: string,// 微信的openid
    subject?: string,// 
    channel?: number,
    //----------------------//
    accountId?: number,
    cpOrderId?: string,//订单号来自服务器自身

    //----------------------//
    call_back_url?: string,   // 充值回调的界面，有些入口触发，有些不触发 real:https://www.shandw.com/mobile/details.html?gid=[Appid]&channel=[channel] local:https://www.shandw.com/mobile/details.html?gid=[Appid]&channel=[channel]&sdw_test=true
    merchant_url?: string,//支付过程中中断后跳转地址
    timestamp?: number,
    sign?: string,

    //----------------------//
    memo?: string,//透传的数据，这里是可以存储自己的数据，用来后面恢复状态
};

export var GetRobotDefine = {
    colorScore: [100, 120, 145, 175],
    colorDScore: [10, 12, 15, 18],
    count: 8
}

export enum EnumRaceType {
    Normal, //普通战斗
    Pvp726, //排行榜战斗
    MatchPvp,   //单匹战斗
    video,
    olPvp,//实时pvp   任务结算的时候用作约战
    peakPvp, //争霸战斗 任务结算的时候使用
    shangjinPvp, //赏金赛战斗
    pvepk, //诸侯伐董，
}

export enum TaskAction {
    FightComplete,      //战斗结束
    FightBossKill,      //战斗破城
    HeroUp,             //武将升级
    LevelUp,            //升级
    UseMoney,           //使用钻石
    Recharge,           //检查累计充值
    Battle,             //战斗相关
    OpenBox,            //开宝箱
    LookVideo,          //观看录像
    UseGold,            //使用金币
    GetPoint,           //获得积分
    SayHello,           //发表情
    Login,              //登录游戏
    Elo,                //夺王elo值变更
    OpenCard,           //开出英雄卡
    GiveKey,            //赠送好友钥匙
    AddItem,            //获取道具
    FirstPay,           //首充
    FightJoin,          //战斗参与
    AddScore,           //添加积分
    FinishTask,         //完成任务,
    DelItem,            //删除道具
    UseItem,            //使用道具
    MonthVip,           //月卡用户
    Foucs,              //关注某某
    ShareVideo,         //分享视频
    ShopBuy,            //商城购买道具
    AdAward,            //广告领取奖励
    ShareText,          //分享领取奖励
    Ditutongguan,       //地图通关
    FromScene,         //进入场景（如：微信浮窗）
    WxMessage,          //微信客服消息
    PveStar,            //pve星数
    PveFight,           //pve战斗
    PveWin,           //pve通关
    PveSweep,           //pve扫荡
    EquipStar,      //装备升星
    EquipExp,      //装备升星经验
    EquipEnhance,       //装备强化
    EquipEnchant,       //装备附魔
    EquipAdd,       //获得装备
    OnceRecharge,  //单笔充值
    HuiGuiRecharge, //回归充值
    GuildContribute, //同盟捐献
    ShareLink, //分享链接
    PvePkRank, //诸侯伐董排名
    GuildHelp, //同盟捐卡
}

export enum BattleAction {
    UseCard,            //使用卡牌
    AttackBoss,         //攻击boss
    UseSkin,            //使用皮肤
}

export enum NameCheckCode {
    Ok,
    HasUsed,
    CountLimit,
}

export class SeFriendInfo {
    uid: number = 0;
    name: string = "";
    icon: string = "";
    formation: Array<SeLogicFormation> = [];
    level: number = 0;
    pvp_level: number = 0;
    pvp_score: number = 0;
    pvp_star: number = 0;
}

export class PlayerInfo {
    charid: number = 0;
    name: string = "";
    icon: string = "";
    avatar: any = {};
    level: number = 0;
    score: number = 0;
    cardNum: number = 0;
    topPvpLevel: number = 0;
    topPvpRank: number = 0;
    pvpScore: number = 0;
    pvp1v1Info: PlayerPvpInfo = null;
    pvp2v2Info: PlayerPvpInfo = null;
    pvpPeakInfo: PlayerPvpInfo = null;
    formation: Array<SeLogicFormation> = null;
    pvp_score: number = 0;
    seasonid: string = 'S000';
    bossFormation: string = "";
    battleCampBoss: string = '';
    curMedals: Array<string> = [];
    lord: string = 'Z008';      
    personSign: string = '';       //主公
    fengwang_count: number = 0;
    duowang_count: number = 0;
    high_duowang_count: number = 0;
    lord_equip: Array<SeEquip> = [];
    is_vip: boolean = false;
    vip_level: number = 0;
    battleBanner: string = "";
}

export class PlayerPvpInfo {
    level: number = 0;
    cardId: string = "";
    brokenNum: number = 0;
    winCount: number = 0;
    maxWin: number = 0;
}


export enum PlayerProperty {
    GM_SHOW_ID = 1 << 0,
    GM_TITLE = 1 << 1,
    GM_OB = 1 << 2,
    GM_COMPETIOR = 1 << 3,
    GM_RECHARGE_TEST = 1 << 4,
}

export var NumType = {
    N_1v1: '1v1',
    N_pve_pk: 'pve_pk',     //pve对战
    // N_2v2_team: '2v2',  // 组队参加2v2的比赛
    // N_2v2_pk: '2v2_pk',
    N_cancell: 'cancell',

    // N_1v1_room: '1v1_rm',    // 1v1 开房间战斗

    N_2v2_join_room: 'join_room',  // 2v2 组队
    N_2v2_ready_room: 'ready_room',
    N_2v2_leave_room: 'leave_room',

    N_1v2_join_room: '1v2_join_room',  // 1v2 斗地主模式组队
    N_1v2_leave_room: '1v2_leave_room',
    N_1v2_ready_room: '1v2_ready_room',
    // 约战准备的房间界面数据
    N_ct_room: 'd_create_room',
    N_jn_room: 'd_join_room',
    N_lv_room: 'd_leave_room',
    N_rd_room: 'd_ready_room',
}

interface ifOnlineMember {
    kID: number,
    sid?: string,
    loaded?: boolean,
    state: string,
}

interface ifFriendinfo {
    kID: number,
    kname: string,
    ksid: string,
    ipvplevel: number,
    ipvpscore: number,
    kicon: string,
    avatar: any,
    ilevel: number,
}

export interface ifFriendInfo extends ifFriendinfo, ifOnlineMember {
}


export interface if_plt_friends {
    uid?: number,
    openid: string,//	好友QQ号码对应的openid。
    nickname: string,//	昵称。
    figureurl: string//	头像URL。详见：前端页面规范#6. 关于用户头像的获取和尺寸说明。
    is_yellow_vip: number,//	是否为黄钻用户（0：不是； 1：是）。
    is_yellow_year_vip: number,//	是否为年费黄钻用户（0：不是； 1：是）。
    yellow_vip_level: number,//	黄钻等级（如果是黄钻用户才返回此字段）。
    is_yellow_high_vip: number,//	是否为豪华版黄钻用户（0：不是； 1：是）。（当pf=qzone、pengyou或qplus时返回）
    gender: string,//	用户性别。
    city: string,//	用户所在的城市。
    province: string,//	用户所在的省。
    country: string,//	用户所在的国家。
}

export interface if_get_vip_level {
    ret: number,//	返回码
    msg: number,//	如果错误，返回错误信息。
    score: number,//	当前VIP成长值
    level: number,//	当前VIP等级
    score_begin: number,//	当前等级所需VIP成长值
    score_next: number,//	下一等级升级所需VIP成长值
    score_persent: number,//	升级百分比
    is_vip: number,//	是否点亮VIP图标
    pay_fee_min: number,//	当前等级每月点亮VIP图标所需消费
    pay_fee_mon: number,//	当月消费
}


export interface ifExtInfo {
    uid: number;
    openid: string;
    openkey: string;

    info: {
        vipinfo?: if_get_vip_level;
        friends?: if_plt_friends[];
    }
}

export interface SeGuildPlayer {
    id: number;
    /**名称 */
    name: string;
    /**icon */
    icon: string;
    avatar: any;
    /**当前等级 */
    level: number;
    is_vip: boolean;
    vip_level: number;
    /*荣耀积分*/
    glory_score: number;
    pvp_score: number;
    pvp_level: number;
    peak_score: number;
}

export enum SeEnumGuildItemReason {
    cancel_exchange = 'cancel_exchange',
    normal = 'normal',
}