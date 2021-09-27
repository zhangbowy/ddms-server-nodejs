var SeDBInfoHead = {
    baseInfo: 'baseinfo_',
    raceInfo: 'raceinfo_',
    mailInfo: 'mailsinfo_',
    acInfo: 'acinfo_',
    taskInfo: 'taskinfo_',
    buildInfo: 'buildinfo_',
    cityInfo: 'cityinfo',
    nationInfo: 'nationinfo_',
    warInfo: 'warinfo_',
};


// 拷贝函数 是否包括函数拷贝
function func_copy<T>(obj: T, bFunc = false): T {
    var out: any = <T>{};
    var bArray = false;
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

class SeLordSkill {
    public id: string = '0000';
    public level: number = 1;
}

enum SeMailType {
    SYSTEM,
    WAR,
    Charge,
    PvpResult,       // 结算用的特殊邮件
    FriendKey,       // 特殊的钥匙邮件
    SYSTEM_NO_DEL,   // systemmail 表上的邮件
    GM,
    Chart,
}

class SeCharMailInfo {
    constructor(mailid: string = '', mailType: SeMailType, message: string = '', itemid: string = '0000', itemnum: number = 0) {
        this.message = message;
        this.itemid = itemid;
        this.itemnum = itemnum;
        this.mailid = mailid;
        this.mailtype = mailType;
    }
    //public  accountid:number = 0;   // 邮件的玩家id
    public message: string = '';    // 邮件的消息信息
    public itemid: string = '0000'; // 邮件的道具id 可能是没有的
    public itemnum: number = 0;     // 邮件的道具数量
    public mailid: string = '';     // 邮件的认证id
    public mailtype: SeMailType = SeMailType.SYSTEM;
    public cttime: number = Date.now();
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
    public static SCT_PVE_STAR = 14;
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

var SeNationType = {
    SNT_WEI: 'WEI',
    SNT_SHU: 'SHU',
    SNT_WU: 'WU',
};

enum SeFightScheme {
    SFS_WEI_SHU_WU,
    SFS_WEI_WU_SHU,
}

var SeNationTypeNames = ['WEI', 'SHU', 'WU'];

export { SeMailType, func_copy, SeCharMailInfo, SeChartUnit, SeLordSkill, SeDBInfoHead, SeChartType, SeNationType, SeNationTypeNames, SeFightScheme, SCORE_INIT_VALUE, PVE_PK_INIT_VALUE };

function compareList<T>(a: T, key: string, vlaue: any) {
    if (!a || !a.hasOwnProperty(key)) return false;
    if (a[key] > vlaue) return true;
    return false;
}


/**
 * 开始二分法查找
 * @param list 查找用的列表
 * @param key 查找的单位元素
 * @param value 比较用的数值
 */
export function orderListFind<T>(list: Array<T>, key: string, value: any, desc: boolean = false) {
    if (list.length == 0) return 0;
    var small = -1, big = list.length;
    while (true) {
        if (small >= big) {
            return compareList<T>(list[big], key, value) ? small : small + 1;
        }
        else if (small + 1 == big) {
            return small
        }
        else {
            var center = Math.round((small + big) / 2);
            if (desc) {
                compareList<T>(list[center], key, value) ? small = center : big = center;
            }
            else {
                compareList<T>(list[center], key, value) ? big = center : small = center;
            }
        }
    }
}
export interface if_sys_ {
    plt: string,
    serverid: string,
}