enum SeCharLoadFlag {
    baseinfo = 1 << 0,
    mailinfo = 1 << 1,
    pvpInfo = 1 << 2,
    recharge = 1 << 3,
    exinfo = 1 << 4,
    taskinfo = 1 << 5,
    complete = baseinfo | mailinfo | pvpInfo | recharge | exinfo | taskinfo
}
export interface IFLoginInfo {
    channel: string,
    appid: string,
    uid: string,
    time: string,
    sign: string,
    shareuid: string,
    sdw_from: string
}

enum SeCityChangingFlag {
    weinationinfo = 1 << 0,
    shunationinfo = 1 << 1,
    wunationinfo = 1 << 2,
    complete = weinationinfo | shunationinfo | wunationinfo
}

var SeDBInfoHead = {
    baseInfo: 'baseinfo_',
    mailInfo: 'mailsinfo_',
    pvpInfo: 'pvp_',
    rechargeInfo: "recharge_",
    exinfo: "exinfo_",
    taskinfo: "taskinfo_",
};

var CharState = {
    loading: 'loading',
    nochar: 'nochar',
    lock: 'lock',
    leave: 'leave',
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
    kHeroID: string = '0000';
    iLevel: number = 1;
}

class RaceUnit {
    uid: number;
    nid: string;
    raceInfo: SeRaceOpp;
}

interface SeRaceOpp {
    Id: number;
    Name: string;
    Formation: Array<SeLogicFormation>;
    pvp_score: number;
    pvp_level:number;
    castle_level: number;
    Icon: string;
    _plt_: string;
}

export interface SeRacePvp extends SeRaceOpp {
    rurl: string;
    checkKey: string;
    sid: string;
    bTeam:boolean;
    ver: number;
    skills: Array<number>;
    beans_1v2: number;
    index?: number;
    back_1v2_formation?: Array<SeLogicFormation>;//赤壁之战备选卡牌
    back_count?: number; //赤壁之战切换备选卡牌次数
}



class SeRaceBeginInfo {
    raceid: any;
    myName: string;
    myFormation: Array<SeLogicFormation>;
    myJudgeValue: number;
    myLevel: number;
    myIcon: string;

    oppId: number;
    oppName: string;
    oppFormation: Array<SeLogicFormation>;
    oppJudgeValue: number;
    oppLevel: number;
    oppIcon: string;
}

enum SeMailType {
    SYSTEM,
    WAR,
}

class SeCharMailInfo {
    constructor(mailid: string = '', mailType: SeMailType = SeMailType.SYSTEM, message: string = '', itemid: string = '0000', itemnum: number = 0) {
        this.message = message;
        this.itemid = itemid;
        this.itemnum = itemnum;
        this.mailid = mailid;
        this.mailtype = mailType;
    }
    public mailid: string = '';     // 邮件的认证id
    public uid: number = 0;
    public message: string = '';    // 邮件的消息信息
    public itemid: string = '0000'; // 邮件的道具id 可能是没有的
    public itemnum: number = 0;     // 邮件的道具数量
    public mailtype: SeMailType = SeMailType.SYSTEM;
    public cttime: number = Date.now();
}

class SeCityChartUnit {
    public id: number = 0;
    public name: string = '';
    public score: number = 0;
    public level: number = 0;
    public nation: string = '';
}

class SeChartUnit {
    public id: number = 0;
    public name: string = '';
    public score: number = 0;
    public icon: string = '';
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

enum SeChartType {
    SCT_SCORE,
    SCT_FIGHTSCORE,
    SCT_LSCT_SCOREEVEL,
    SCT_CHAPTER_LEVEL,
    SCT_PVP_LEVEL,
}


export enum SeTownItemProperty {
    NULL = 0,
    EVENT_DOUBLE = 1 << 0,
    QUICK_USE = 1 << 1,
    NOSTACK = 1 << 2,   //不叠加
    NOFAILD = 1 << 3,   // 战斗失败豁免
}

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

export { SeMailType, CharState, SeCharLoadFlag, SeRaceOpp, SeLogicFormation, SeRaceBeginInfo, func_copy, SeCharMailInfo, SeChartUnit, SeOpenBoxItem, SeDBInfoHead, SeChartType, SeNationType, SeNationTypeNames, SeFightScheme, SeCityChangingFlag, SeCityChartUnit, SeAdventureType };

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
    olPvp,//实时pvp
}

export enum TaskAction {
    FightComplete,       //战斗结束
    HeroUp,             //武将升级
    LevelUp,             //升级
    UseMoney             //使用钻石
}

export enum NameCheckCode {
    Ok,
    HasUsed
}
