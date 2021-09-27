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
    guild_info: {};
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

export interface if_pvp_match_info { h_f: Array<SeLogicFormation>, b_f: SeLogicFormation[], castle_level: number, battleEquip: any, synccheck: boolean, areaid: string, lordUnit: SeLogicFormation, pve:{}, is_vip: boolean, vip_level: number, heros_skin?: { [heroid: string]: {} }, guild_info: {} }

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
    guild_info: {};
}

export var NumType = {
    N_1v1: '1v1',       // 1v1 约战
    N_pve_pk: 'pve_pk',     //pve对战
    N_cancell: 'cancell',   // 取消

    N_2v2_join_room: 'join_room',  // 2v2 组队
    N_2v2_ready_room: 'ready_room',
    N_2v2_leave_room: 'leave_room',

    N_1v2_join_room: '1v2_join_room',  // 1v2 斗地主模式组队
    N_1v2_leave_room: '1v2_leave_room',
    N_1v2_ready_room: '1v2_ready_room',
    // 约战准备的房间界面数据
    N_ct_room: 'd_create_room',
    N_jn_room: 'd_join_room',
    N_kk_room: 'd_kick_room',
    N_lv_room: 'd_leave_room',
    N_rd_room: 'd_ready_room',

    N_force_leave: 'force_leave',
}

export var RoomType = {
    N_1v1: '1v1',       // 1v1 约战
    N_1v2: '1v2',   //1v2斗地主
    N_2v2: '2v2',   //2v2好友约战
}
