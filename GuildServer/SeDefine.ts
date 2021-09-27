export enum SeCharLoadFlag {
    baseinfo = 1 << 0,
    mailinfo = 1 << 2,
    raceInfo = 1 << 3,
    acInfo = 1 << 4,
    taskInfo = 1 << 5,
    buildInfo = 1 << 6,
    warInfo = 1 << 7,
    complete = baseinfo | raceInfo | acInfo | taskInfo | buildInfo | warInfo
}

export enum LiveMode {
    match = 0,  // 正常匹配
    race = 1,   // 约战模式
    room = 2,   // show 房间模式
    peak = 3,   // 巅峰赛模式
    lianxi = 4, // 练习赛
    doublemode = 5, // 双倍模式
    shangjin = 6, //赏金赛模式
    pve = 7,     //pve模式
    pve_pk = 8,  //pve带主公的对战
    pvp_1v2 = 9
}


export var SeDBInfoHead = {
    baseInfo: 'baseinfo_',
    mailInfo: 'mailsinfo_',
    pvpInfo: 'pvp_',
    rechargeInfo: "recharge_",
    exinfo: "exinfo_",
    taskinfo: "taskinfo_",
    friendInfo: "friendinfo_"
};

export var CharState = {
    offline: 'offline',
    loading: 'loading',
    nochar: 'nochar',
    lock: 'lock',
    leave: 'leave',
    loadcomplete: 'loadcomplete',
    matching: 'matching',
    inrace: 'inrace'
};



// 拷贝函数 是否包括函数拷贝
export function func_copy<T>(obj: T, bFunc = false): T {
    var out: any = {};
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


export class SeLogicFormation {
    public kHeroID: string = '0000';
    public iLevel: number = 1;
    public wear_equips? = [];
}

export class SePveData {
    BossArr?: Array<{kHeroID: string,iLevel: number;}>;
    BossLevelId?: number;           //Level表的iLevelID
    LevelConstId?: Array<string>;   //对应levelConst表kID 
    GamePurpose?: number;           //Level表iGamePurpose, 记录数据在这里, 方便初始boss或者主城
}

export interface SeRaceOpp {
    Id: number;
    Name: string;
    Formation: Array<SeLogicFormation>;
    pve_pk_formation?: any;
    Boss: SeLogicFormation[];
    areaid:string;
    pvp_score: number;
    pvp_level: number;
    castle_level: number;
    battleEquip: any;
    synccheck: boolean;
    winStreakCount: number;
    Icon: string;
    avatar: any;
    medals: Array<string>
    fresh?: boolean;
    rurl?: string;
    checkKey?: string;
    pve?: SePveData,
    lordUnit?: SeLogicFormation;    //主公
    _plt_: string;
    is_vip: boolean;
    vip_level: number;
    heros_skin?: { [heroid: string]: {} };
    beans_1v2?: number; //赤壁之战欢乐豆
    back_1v2_formation?: Array<SeLogicFormation>;//赤壁之战备选卡牌
    index?: number; //1v2底分信息
}

export interface SeRacePvp extends SeRaceOpp {
    rurl: string;
    checkKey: string;
    sid: string;
    bTeam: boolean;  // 是否是好友组队进来的
    optime: number;
}

export interface if_sys_ {
    plt: string,
    serverid: string,
}

export interface if_pvp_match_info { h_f: Array<SeLogicFormation>, b_f: SeLogicFormation[], castle_level: number, battleEquip: any, synccheck: boolean, areaid: string, lordUnit: SeLogicFormation, pve:{}, is_vip: boolean, vip_level: number, heros_skin?: { [heroid: string]: {} } }

export interface if_base_player {
    /**玩家id */
    uid: number;
    /**阵容 */
    formation: SeLogicFormation[];
    boss_f: SeLogicFormation[],
    /**外部装配的东西 */
    battleEquip: any,
    /**段位 */
    pvp_level: number;

    /**战区id */
    areaid: string;
    /**名字 */
    name: string;
    /**主城等级 */
    castle_level: number;
    /**头像 */
    icon: string;
    /**头像框等外部信息 */
    avatar: any;
    /**是否开启无效局 */
    synccheck: boolean;
    /**勋章列表 */
    medals: Array<string>;

    /**匹配时间 */
    enter_time: number;
    /**连胜次数 */
    win_loop: number,
    /**连接上来的信息 */
    _sys_: if_sys_,
    /**主公和pve信息 */
    extra?: {pve:any, lord: any};
    pve_pk_formation?: {};
    is_vip: boolean;
    vip_level: number;
}

export class SeGuildTask {
    /**任务id */
    id: string;
    //任务进度
    value: number;
    //最大上限
    max_value: number;
    //是否发送奖励
    send_award: boolean;
    complete_info: Array<{id: number, name: string, vip_level: number, is_vip: boolean, value: number}>
    constructor(id: string, max_value: number){
        this.id = id;
        this.max_value = max_value;
        this.value = 0;
        this.send_award = false;
    }
}

export class SeGuild {
    /**同盟id */
    id: number;
    /**创建日期 */
    creat_time: number;
    /**名称 */
    name: string;
    /**icon */
    icon: string;
    /**当前等级 */
    level: number;
    /**当前成员 */
    members: Array<SeGuildPlayer>;
    /**当前申请成员 */
    apply_members: Array<SeGuildPlayer>;
    /** 聊天记录*/
    chat_message: Array<Array<{text: string, player: SeSimpleGuildPlayer, time: number, chat_type: SeEnumGuildChatType, param: Array<string>, charIdList: Array<number>}>>;
    /** 申请捐卡记录*/
    help_record: Array<{heroId: string, count: number, asker: SeSimpleGuildPlayer, helper: Array<SeSimpleGuildPlayer>, time: number}>;
    /** 申请换卡记录*/
    exchange_record: Array<{heroId: string, count: number, asker: SeSimpleGuildPlayer, time: number, use_card: Array<{heroId: string, count: number}>}>;
    /**荣耀积分总和 */
    glory_all: number;
    /**盟主id */
    uid: number;
    /**盟主上次登录时间 */
    general_last_login: number;
    /**渠道 */
    plt: string;
    //宣言
    announcement: string;
    //判断是否赛季结算
    season_id: string;    
    //成员数量
    members_length: number;
    //申请成员数量
    apply_members_length: number;
    //资金
    capital: number;
    //同盟勋章
    medal: number;
    //加入是否要审核
    need_approve: number; //0：需要审核，1：不用审核，2满足条件自动加入
    //加入的等级限制
    need_level: number;
    //是否关闭
    is_close: boolean;
    //每日同盟任务id
    task_id: Array<string>;
    //每日同盟任务完成情况
    task_info: {[taskId: string]: SeGuildTask};
    //每日同盟任务刷新时间
    refresh_time: number;
    //盟主转让时间，有24小时cd
    appoint_general_time: number;
    constructor(id: number, uid: number, name: string, icon: string, plt: string, announcement: string, season_id: string, need_approve: number, need_level: number){
        this.id = id;
        this.uid = uid;
        this.creat_time = Date.now();
        this.general_last_login = Date.now();
        this.name = name;
        this.icon = icon;
        this.level = 1;
        this.members = [];
        this.apply_members = [];
        this.chat_message = [];
        this.glory_all = 0;
        this.plt = plt;
        this.announcement = announcement;
        this.season_id = season_id;
        this.help_record = [];
        this.exchange_record = [];
        this.members_length = 0;
        this.apply_members_length = 0;
        this.capital = 0;
        this.medal = 0;
        this.need_approve = need_approve;
        this.need_level = need_level;
        this.is_close = false;
        this.task_id = [];
        this.task_info = {};
        this.refresh_time = Date.now();
        this.appoint_general_time = 0;
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
    /**职位 */
    title: SeEnumGuildTitle; 
    /*申请理由*/
    apply_text?: string;
    /*在线状态*/
    state: string;
    /*荣耀积分*/
    glory_score: number;
    pvp_score: number;
    pvp_level: number;
    peak_score: number;
    is_vip: boolean;
    vip_level: number;
    apply_time: number;
    help_count: number; //捐卡贡献
    task_count: number; //任务贡献
    exchange_green_count: number; //换卡贡献
    exchange_blue_count: number; //换卡贡献
    exchange_purple_count: number; //换卡贡献
    exchange_orange_count: number; //换卡贡献
    contribute_count: number; //捐献贡献
    contribute_all: number; //总贡献度
    contribute_week: number; //周贡献度
    contribute_week_time: number; //周贡献度增加时间
}

//玩家简易信息
export interface SeSimpleGuildPlayer {
    id: number;
    /**名称 */
    name: string;
    /**icon */
    avatar: any;
    icon: string;
    /**当前等级 */
    level: number;
    //捐卡数量
    count: number;
    time: number;
    is_vip: boolean;
    vip_level: number;
    title: SeEnumGuildTitle; //逻辑服不记录职位，要在同盟服自己算
}

export enum SeEnumGuildTitle {
    general = 0,  // 盟主
    viceGeneral = 1,   // 副盟主
    elite = 2, //精英
    normal = 3, // 普通
}

export enum SeEnumContributeType {
    contribute = 'contribute',
    task = 'task',
    help = 'help',
    exchange_green = 'exchange_green',
    exchange_blue =  'exchange_blue',
    exchange_purple = 'exchange_purple',
    exchange_orange = 'exchange_orange',
}

export enum SeEnumGuildItemReason {
    cancel_exchange = 'cancel_exchange',
    normal = 'normal',
}

export enum SeEnumGuildChatType {
    nomal = 0,  // 普通聊天
    join = 1,  //加入同盟
    quit = 2, //退出同盟
    kick = 3, //被踢出同盟
    appoint = 4, //同盟任命
    general = 5, //盟主变更
    boss = 6, //boss活动
    lvlup = 7, //同盟升级
    help = 8, //捐卡
    exchange = 9, //换卡
    contribute = 10, //捐赠
    taskcomplete = 11, //同盟任务完成
    taskcompleteperson = 12, //同盟任务个人完成
}

export enum SeEnumAuthoryty {
    iChName = 'iChName',  // 修改同盟名称
    iChMani = 'iChMani',   // 修改同盟宣言
    iLvUp = 'iLvUp', //升级同盟
    iDelMember = 'iDelMember', // 踢出同盟
    iAppoint = 'iAppoint', //任命
    iCheck = 'iCheck', //审核加入申请 
}