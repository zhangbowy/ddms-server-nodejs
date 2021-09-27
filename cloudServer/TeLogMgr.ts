import * as fs from 'fs';
import * as path from "path";
import { SePlayer } from './PlayerMgr/SePlayer';
import { iApp } from './app';
import { TeDate, HashMap } from './TeTool';
import { configInst } from './lib/TeConfig';
import { ThreeLogMgr } from './ThreeLogDef';
import { SeEquip, SeItem } from './PlayerMgr/SePlayerDef';
import { SeRaceBeginInfo } from './SeDefine';

declare var global: iApp;

var gappid = 1145326931;

export interface TeLog {
    logtype: string;
    charid: number;
    createtime?: number;
}

export interface TeLog2 {
    logtype: string;
    logfile: string;
    src: string;
    org: any;
}

export interface TeItemLog extends TeLog {
    type: string;    // add del use
    itemid: string;
    itemnum: number;
}

export interface TeHeroLog extends TeLog {
    type: string;
    heroid: string;
    param1: number | string;
    param2: number | string;
}

export interface TeMiscLog extends TeLog {
    type: string;
    param1: number;
    param2: number;
}

export var PayTypeLog = {
    zuanshi: 'zuanshi',
    jinbi: 'gold',
}

export class TeLogMgr {
    // private m_kNet: TeNet;
    private close = true;

    private _three_: ThreeLogMgr = new ThreeLogMgr();
    constructor() {
        this.close = (configInst.get('logMgr.open_path') == "true") ? false : true;
        if (!this.close) {
            setInterval(this._saveCache.bind(this), 2000);
        }
    }

    // private _net_ready = false;
    connectLogServer(url: string) {
        if (!url) {
            return;
        }
        // this.m_kNet = new TeNet();
        // this.m_kNet.connect(url);
        // this.m_kNet.on('connected', () => {
        //     this._net_ready = true;
        // })

        // this.m_kNet.on('disconnect', () => {
        //     this._net_ready = false;
        // })
    }


    public mkdirsSync(dirpath, mode?) {
        mode = mode || 511;
        if (!fs.existsSync(dirpath)) {
            var pathtmp;
            if (dirpath[0] == '/') pathtmp = '/';
            var dirs = dirpath.split(path.sep);
            for (var i = 0; i < dirs.length; i++) {
                var dirname = <string>dirs[i];
                if (dirname.length == 0) continue;
                if (pathtmp) {
                    pathtmp = path.join(pathtmp, dirname);
                }
                else {
                    pathtmp = dirname;
                }
                if (!fs.existsSync(pathtmp)) {
                    fs.mkdirSync(pathtmp, mode)
                }
            }
        }
        return true;
    }

    public itemLog(rkPlayer: SePlayer, itemid: string, num: number, bfnum: number, type: string, sub_reason?: string) {
        this._three_.itemLog(rkPlayer, itemid, num, bfnum, type, sub_reason);
        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "item_id",//	string	是	物品id
            "before_cnt",//	bigint	　	操作前数量
            "after_cnt",//	bigint	　	操作后数量
            "change_cnt",//	bigint	　	物品变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
            "reason_type",//	string	　	操作原因(例如: 1:扭蛋,2:扫荡等)
            "moneytype1",//	string		货币类型
            "change_amt1",//	bigint		操作引起的货币变化数量
            "moneytype2",//	string		第二种货币类型
            "change_amt2",//	bigint		操作引起的第二种货币变化数量
            "dh_param1",//	string		预留固定字段1
            "dh_param2",//	string		预留固定字段2
            "sub_reason"
        ];

        var outParam = {
            'item_id': itemid,
            'before_cnt': bfnum,
            'after_cnt': num,
            'change_cnt': num - bfnum,
            'reason_type': type,
            'moneytype1': '',
            'change_amt1': 0,
            'moneytype2': '',
            'change_amt2': 0,
            "sub_reason": sub_reason
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_item', outParam));

    }

    // add score soldier skilla skillb
    public heroLog(rkPlayer: SePlayer, type: string, heroid: string, nownum?: number | string, bfnum?: number | string) {
        this._three_.heroLog(rkPlayer, type, heroid, nownum, bfnum);
        nownum = nownum || 0;
        bfnum = bfnum || 0;

        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "type",//string	是	玩家行为记字符串(repair_home:修理家园 reputation：信誉值改变等)
            "before_cnt",//	bigint	　	操作前数量(例如信誉值前后变化)
            "after_cnt",//bigint	　	操作后数量
            "change_cnt",//bigint	　	变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
            "race_id",//string		关联pvp或者pve的某一比赛，比如这次行为是在某一次比赛中产生的。
            "dh_param1",//string		预留固定字段1
            "dh_param2",//string		预留固定字段2
            "subtype",
            "type_value1",
            "type_value2",
        ];

        var outParam = {
            'type': 'hero',
            'before_cnt': bfnum,
            'after_cnt': nownum,
            'change_cnt': parseInt('' + nownum) - parseInt('' + bfnum),
            "type_value1": heroid,
            "type_value2": '',
            "subtype": type,
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }

    public activityExchange(rkPlayer: SePlayer, activityId: string, exchangeId: string, type: "hero" | "item", targetId: string) {
        this._three_.activityExchange(rkPlayer, activityId, exchangeId, type, targetId);
        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "type",//string	是	玩家行为记字符串(repair_home:修理家园 reputation：信誉值改变等)
            "before_cnt",//	bigint	　	操作前数量(例如信誉值前后变化)
            "after_cnt",//bigint	　	操作后数量
            "change_cnt",//bigint	　	变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
            "race_id",//string		关联pvp或者pve的某一比赛，比如这次行为是在某一次比赛中产生的。
            "dh_param1",//string		预留固定字段1
            "dh_param2",//string		预留固定字段2
            "subtype",
            "type_value1",
            "type_value2",
            "type_value3",
            "type_value4",
            "type_value5",
            "type_value6",
            "type_value7",
        ];

        var outParam = {
            'type': "exchange",
            "type_value1": activityId,
            "type_value2": exchangeId,
            "type_value3": type,
            "type_value4": targetId
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }

    public moneylog(rkPlayer: SePlayer, type: string, nownum?: number, bfnum?: number, ...subParam);
    public moneylog(rkPlayer: SePlayer, type: string, nownum?: number, bfnum?: number, value1?: string, value2?: string) {
        this._tableMoney('zuanshi', rkPlayer, type, nownum, bfnum, value1, value2);
    }

    public goldLog(rkPlayer: SePlayer, type: string, nownum?: number, bfnum?: number) {
        this._tableMoney('gold', rkPlayer, type, nownum, bfnum);
    }
    private _tableMoney(logType: string, rkPlayer: SePlayer, type: string, nownum?: number, bfnum?: number, value1?: string, value2?: string) {
        this._three_._tableMoney(logType, rkPlayer, type, nownum, bfnum, value1, value2);
        nownum = nownum || 0;
        bfnum = bfnum || 0;

        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "moneytype",//string	是	moneytype	string	是	货币类型1：金币 2：钻石 3：荣誉 4：勋章5：熔炼值 6：工会贡献值 7：红包 9：体力
            "before_cnt",//	bigint	　	操作前数量(例如信誉值前后变化)
            "after_cnt",//bigint	　	操作后数量
            "change_cnt",//bigint	　	变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
            "reason_type",//string		关联pvp或者pve的某一比赛，比如这次行为是在某一次比赛中产生的。
            "dh_param1",//string		预留固定字段1
            "dh_param2",//string		预留固定字段2
            "type_value1",
            "type_value2",
        ];

        var outParam = {
            'moneytype': logType,
            'reason_type': type,
            'before_cnt': bfnum,
            'after_cnt': nownum,
            'change_cnt': nownum - bfnum,
            "type_value1": value1,
            "type_value2": value2,
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_money', outParam));
    }

    public scoreLog(rkPlayer: SePlayer, type: string, nownum?: number, bfnum?: number) {
        this._three_.scoreLog(rkPlayer, type, nownum, bfnum);
        nownum = nownum || 0;
        bfnum = bfnum || 0;

        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "type",//string	是	玩家行为记字符串(repair_home:修理家园 reputation：信誉值改变等)
            "before_cnt",//	bigint	　	操作前数量(例如信誉值前后变化)
            "after_cnt",//bigint	　	操作后数量
            "change_cnt",//bigint	　	变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
            "race_id",//string		关联pvp或者pve的某一比赛，比如这次行为是在某一次比赛中产生的。
            "dh_param1",//string		预留固定字段1
            "dh_param2",//string		预留固定字段2
            "subtype",
        ];

        var outParam = {
            'type': 'score',
            'subtype': type,
            'before_cnt': bfnum,
            'after_cnt': nownum,
            'change_cnt': nownum - bfnum,
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }

    /**
     * 签到奖励日志
     * @param rkPlayer 
     * @param type 
     * @param nownum 
     * @param bfnum 
     */
    public signLog(rkPlayer: SePlayer, type: string, nownum?: number, bfnum?: number) {
        this._three_.signLog(rkPlayer, type, nownum, bfnum);
        nownum = nownum || 0;
        bfnum = bfnum || 0;

        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "type",//string	是	玩家行为记字符串(repair_home:修理家园 reputation：信誉值改变等)
            "before_cnt",//	bigint	　	操作前数量(例如信誉值前后变化)
            "after_cnt",//bigint	　	操作后数量
            "change_cnt",//bigint	　	变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
            "race_id",//string		关联pvp或者pve的某一比赛，比如这次行为是在某一次比赛中产生的。
            "dh_param1",//string		预留固定字段1
            "dh_param2",//string		预留固定字段2
            "subtype",
        ];

        var outParam = {
            'type': 'sign',
            'subtype': type,
            'before_cnt': bfnum,
            'after_cnt': nownum,
            'change_cnt': nownum - bfnum,
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }

    public pvpBoxLog(rkPlayer: SePlayer, type: 'add' | 'start' | 'upgrade' | 'finish' | 'box_hero' | 'dectime', id: number, boxType: number, level: number, cardList?: Array<{ kid: string, num: number }>,value?:number) {
        this._three_.pvpBoxLog(rkPlayer, type, id, boxType, level, cardList,value);
        cardList = cardList || [];
        var cards = [];
        for (var i = 0; i < cardList.length; i++) {
            var r = cardList[i];
            if (r) cards.push(r.kid);
        }

        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "type",//string	是	玩家行为记字符串(repair_home:修理家园 reputation：信誉值改变等)
            "before_cnt",//	bigint	　	操作前数量(例如信誉值前后变化)
            "after_cnt",//bigint	　	操作后数量
            "change_cnt",//bigint	　	变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
            "race_id",//string		关联pvp或者pve的某一比赛，比如这次行为是在某一次比赛中产生的。
            "dh_param1",//string		预留固定字段1
            "dh_param2",//string		预留固定字段2
            "subtype",
            "type_value1",
            "type_value2",
            "type_value3",
            "type_value4",
            "type_value5",
            "type_value6",
            "type_value7",

        ];

        var outParam = {
            'type': 'pvpbox',
            'subtype': type,
            'before_cnt': id,   // 当前宝箱id
            'after_cnt': boxType,  // 宝箱剩余的时间
            'change_cnt': level, // 宝箱的星星数量
            "type_value1": cards[0] || '',
            "type_value2": cards[1] || '',
            "type_value3": cards[2] || '',
            "type_value4": cards[3] || '',
            "type_value5": cards[4] || '',
            "type_value6": cards[5] || '',
            "type_value7": cards[6] || '',
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }

    private createlog(rkPlayer: SePlayer, arrayList: Array<string>, type: string, outParam?: Object): TeLog2 {
        if (this.close) {
            return null;
        }
        // 生成日志的通用接口
        var outLog = {
            logtype: type,
            logfile: type + '_' + TeDate.DateToLogStr(Date.now()) + `_${gappid}.log`,
        }

        for (var key in arrayList) {
            var sKey = arrayList[key];
            switch (sKey) {
                case 'product_id': outLog[sKey] = gappid; break;    //游戏id（怼怼游戏id：1146308431）
                case 'zid': outLog[sKey] = configInst.get('serverid') || 0; break;
                case 'record_time': outLog[sKey] = TeDate.DateToStr(Date.now()); break;
                case 'vip_level': outLog[sKey] = 0; break;
                case 'imei': outLog[sKey] = ''; break;
                case 'equipType': outLog[sKey] = ''; break;
                case 'netWorkType': outLog[sKey] = ''; break;
                case 'dh_param1': outLog[sKey] = ''; break;
                case 'dh_param2': outLog[sKey] = ''; break;
                case 'version': outLog[sKey] = global.version || '0.0.0.1'; break;
                case "highResolution": outLog[sKey] = 0; break;//	string		设备分辨率高
                case "lowResolution": outLog[sKey] = 0; break;//	string		设备分辨率宽
                case "logout_type": outLog[sKey] = "0"; break;
                case "hero_type": outLog[sKey] = "0"; break;
                default:
                    if (outParam && outParam.hasOwnProperty(sKey)) {
                        outLog[sKey] = outParam[sKey];
                    }
                    else {
                        outLog[sKey] = '';
                    }
                    break;
            }
        }

        if (rkPlayer instanceof SePlayer) {
            for (var key in arrayList) {
                var sKey = arrayList[key];
                switch (sKey) {
                    case 'iuin': outLog[sKey] = rkPlayer.id || 0; break;
                    case 'char_id': outLog[sKey] = rkPlayer.id; break;
                    case 'dh_id': outLog[sKey] = rkPlayer.id; break;
                    case 'channel': outLog[sKey] = rkPlayer.loginInfo ? rkPlayer.loginInfo.channel : ''; break;
                    case 'pvp_level': outLog[sKey] = rkPlayer.pvp_level; break;
                    case 'pve_level': outLog[sKey] = rkPlayer.level; break;
                    case 'pvp_score': outLog[sKey] = rkPlayer.pvp_score; break;
                    case 'device_os': outLog[sKey] = rkPlayer.loginInfo ? rkPlayer.loginInfo['device_os'] : ''; break;
                    case 'last_login_time': outLog[sKey] = TeDate.DateToStr(rkPlayer.baseInfo.lastLoginTime); break;
                    case 'register_time': outLog[sKey] = TeDate.DateToLogStr(rkPlayer.baseInfo.createtime); break;
                    case 'screenSize': outLog[sKey] = rkPlayer.loginInfo ? rkPlayer.loginInfo['screenSize'] : ''; break;
                    case 'online_time': outLog[sKey] = rkPlayer.baseInfo.onlinetime || 0; break;
                    case "char_name": outLog[sKey] = rkPlayer.name; break;
                    case "scene": outLog[sKey] = rkPlayer.loginInfo["scene"] || ''; break;
                    case "glory_score": outLog[sKey] = rkPlayer.pvpMgr.glory_score || 0; break;
                    case "glory_score_all": outLog[sKey] = rkPlayer.pvpMgr.glory_score_all || 0; break;
                    default: break;
                }
            }
        }

        var str: TeLog2 = {
            logtype: outLog.logtype,
            logfile: outLog.logfile,
            src: '',
            org: outLog
        }

        for (var key in arrayList) {
            var val = outLog[arrayList[key]];
            if (outLog == null || outLog == undefined) {
                val = '';
            }

            str.src += val + ','
        }


        return str;
    }

    public createChar(rkPlayer: SePlayer) {
        this._three_.createChar(rkPlayer);
        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	创角时间(在结算时记录)
            "dh_param1",//	string		预留固定字段1
            "dh_param2",//	string		预留固定字段2
            "hero_type",
        ];

        this.addLog(this.createlog(rkPlayer, outList, "tab_create"));
    }

    public register(rkPlayer: SePlayer, shareuid: string, scene: string, appId: string) {
        this._three_.register(rkPlayer, shareuid, scene, appId);
        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	注册时间
            "version",//	string		玩家注册时的游戏版本
            "device_os",//	String		设备操作系统类型android、ios，数据要清洗成不包括特别符号的
            "equipType",//	string		Nexus, 5，当中有特殊符号等要替换掉，如nexus, 5要处理成nexus_5或者是nexus5
            "imei",//	string		iemi或者其他设备唯一标识
            "highResolution",//	string		设备分辨率高
            "lowResolution",//	string		设备分辨率宽
            "screenSize",//	string		设备屏幕尺寸
            "osVersion",//	String		设备操作系统版本
            "netWorkType",//	string		网络类型2G 3G 4G wifi
            "ip",//	string		玩家ip
            "dh_param1",//	string		预留固定字段1
            "dh_param2",//	string		预留固定字段2
            "shareuid",
        ];
        var outParam = {
            'shareuid': shareuid
        }
        this.addLog(this.createlog(rkPlayer, outList, 'tab_register', outParam));
    }

    public enter(rkPlayer: SePlayer) {
        this._three_.enter(rkPlayer);
        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "pvp_level",//	bigint		玩家pvp等级
            "pve_level",//	bigint		玩家pve等级
            "vip_level",//	bigint		玩家vip等级
            "device_os",//	string		设备操作系统 ios/ andriod
            "imei",//	string		iemi或者其他设备唯一标识
            "last_login_time",//	String		上一次登录时间
            "register_time",//	string		注册时间
            "ip",//	string		玩家ip地址
            "equipType",//			Nexus, 5，当中有特殊符号等要替换掉，如nexus, 5要处理成nexus_5或者是nexus5
            "osVersion",//			设备操作系统版本
            "screenSize",//			设备屏幕尺寸
            "netWorkType",//			网络类型2G 3G 4G wifi
            "dh_param1",//	string		预留固定字段1
            "dh_param2",//	string		预留固定字段2
        ];
        this.addLog(this.createlog(rkPlayer, outList, 'tab_login'));
    }

    public leave(rkPlayer: SePlayer, leave_type) {
        this._three_.leave(rkPlayer);
        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "pvp_level",//	bigint		玩家pvp等级
            "pve_level",//	bigint		玩家pve等级
            "vip_level",//	bigint		玩家vip等级
            "online_time",//	bigint		在线时长(单位：秒)
            "logout_type",//	bigint		登出类型(1：正常退出 2：异常退出）
            "dh_param1",//	string		预留固定字段1
            "dh_param2",//	string		预留固定字段2
            "pvp_score",
            "leave_type",
        ];
        var outParam = {
            'leave_type': leave_type,
        }
        this.addLog(this.createlog(rkPlayer, outList, 'tab_logout', outParam));
    }

    public pvpLog(rkPlayer: SePlayer, rid: string, type: number, bWin: boolean, fightTime: number, gold: number = 0, loopwin: number = 0, fscore: number = 0, totwin: number = 0, totfail: number = 0) {
        this._three_.pvpLog(rkPlayer, rid, type, bWin, fightTime, gold, loopwin, fscore, totwin, totfail);
        var outList = [
            'product_id',//	bigint	是	游戏id（由平台确定）
            'zid',//	bigint	是	大区id
            'iuin',//	bigint	是	玩家id(全局唯一)
            'char_id',//	bigint	是	角色id
            'dh_id',//	bigint	　	电魂id
            'channel',//	string	是　	渠道
            'record_time',//	string	是	记录时间(在结算时记录)
            'map_id',//	string	是	地图ID(0:竞技场,1:主城PK，2:大乱斗) 
            'race_id',//	string	是	比赛ID(大乱斗比赛ID：开场时间+房间ID)
            'is_win',//	bigint	　	是否胜利(1 胜利，0失败)
            'pvp_level',//	bigint		玩家pvp等级
            'pve_level',//	bigint		玩家pve等级
            'vip_level',//	bigint		玩家vip等级
            'race_time',//	bigint		比赛时长(单位秒)
            'dh_param1',//	string		预留固定字段1
            'dh_param2',//	string		预留固定字段2
            'kill',//	bigint		击杀数
            'be_killed',//	bigint		被击杀数
            'coin',//	bigint		金币数,
            'loopwin',  // 连胜次数,
            'fscore',   // 阵容分
            'totwin',   // 总胜场
            'totfail'   // 总败场
        ];
        var outParam = {
            'race_id': rid,
            'map_id': type,
            'is_win': bWin ? 1 : 0,
            'race_time': fightTime / 1000,
            'kill': 0,
            'be_killed': 0,
            'coin': gold,
            'loopwin': loopwin,
            'fscore': fscore,
            'totwin': totwin,
            'totfail': totfail
        }
        this.addLog(this.createlog(rkPlayer, outList, 'tab_map_pvp', outParam));
    }

    public pveLog(rkPlayer: SePlayer, levelid: string, times: number, bWin: boolean, time: number) {
        this._three_.pveLog(rkPlayer, levelid, times, bWin, time);
    }

    public pvepkLog(rkPlayer: SePlayer, fightTime: number, bWin: boolean, attack_rank: number, define_rank: number, pve_pk_formation: any, define_pve_pk_formation: any) {
        this._three_.pvepkLog(rkPlayer, fightTime, bWin, attack_rank, define_rank, pve_pk_formation, define_pve_pk_formation);
    }

    public maillog(rkPlayer: SePlayer, mailid: string, type: string, mailinfo: string) {
        this._three_.maillog(rkPlayer, mailid, type, mailinfo);
    }

    public market(rkPlayer: SePlayer, kID: string, payType: string, cost: number, itemid: string, buynum: number, discount: number) {
        this._three_.market(rkPlayer, kID, payType, cost, itemid, buynum, discount);
        var outList = [
            'product_id',
            'zid',
            'iuin',
            'char_id',
            'dh_id',
            'channel',
            'record_time',
            'marketid',
            'marketgoodstype',
            'buynum',
            'discount',
            'Moneytype1',
            'Moneycost1',
            'Moneytype2',
            'Moneycost2',
            'dh_param1',
            'dh_param2',
        ];

        var outParam = {
            'marketid': kID,
            'marketgoodstype': itemid,
            'buynum': buynum,
            'discount': discount,
            'Moneytype1': payType,
            'Moneycost1': cost,
            'Moneytype2': '',
            'Moneycost2': '',
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_market', outParam))
    }

    public buttonClickLog(rkPlayer: SePlayer, type: string, page: string, ...args) {
        this._three_.buttonClickLog(rkPlayer, type, page, ...args);
        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "button_id",//string	是	按钮id
            "page_id",//	string	　	页面id
            "dh_param1",//string		预留固定字段1
            "dh_param2",//string		预留固定字段2
            "type_value1",
            "type_value2",
            "type_value3",
        ];

        var outParam = {
            'button_id': type,
            'page_id': page,
            'type_value1': args[0] || 0,
            'type_value2': args[1] || 0,
            'type_value3': args[2] || 0,
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_button', outParam));
    }

    public invitecodeLog(uid: number, code: string, r: SePlayer) {
        this._three_.invitecodeLog(uid, code, r);
    }

    public rechargeLog(rkPlayer: SePlayer, type: string = '', amount: number = 0, time: number = 0, orderid: string = '') {
        amount = amount / 100;
        this._three_.rechargeLog(rkPlayer, type, amount, time, orderid);
        var outList = [
            'product_id',//	bigint	是	游戏id（由平台确定）
            'zid',//	bigint	是	大区id
            'iuin',//	bigint	是	玩家id(全局唯一)
            'char_id',//	bigint	是	角色id
            'dh_id',//	bigint	　	电魂id
            'channel',//	string	是	渠道
            'record_time',//	string	是	记录时间(在结算时记录)
            'recharge_type',//	string		充值类型（档位）
            'recharge_amt',//	string		充值金额
            'register_time',//	string		注册时间
            'dh_param1',//	string		预留固定字段1
            'dh_param2',//	string		预留固定字段2
            'pvp_level',//	bigint		玩家pvp等级
            'pve_level',//	bigint		玩家pve等级
            'vip_level',//	bigint		玩家vip等级
            'orderid',
        ];

        var outParam = {
            'recharge_type': type,
            'recharge_amt': amount,
            'orderid': orderid
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_recharge', outParam));
    }

    public rechargeStateLog(rkPlayer: SePlayer, type: string = '', amount: number = 0, time: number = 0, orderid: string = '', subtype: string = '') {
        amount = amount / 100;
        this._three_.rechargeStateLog(rkPlayer, type, amount, time, orderid, subtype);
    }

    public shareLog(rkPlayer: SePlayer, type: string, now: number, bf: number) {
        this._three_.shareLog(rkPlayer, type, now, bf);
        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "type",//string	是	玩家行为记字符串(repair_home:修理家园 reputation：信誉值改变等)
            "before_cnt",//	bigint	　	操作前数量(例如信誉值前后变化)
            "after_cnt",//bigint	　	操作后数量
            "change_cnt",//bigint	　	变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
            "race_id",//string		关联pvp或者pve的某一比赛，比如这次行为是在某一次比赛中产生的。
            "dh_param1",//string		预留固定字段1
            "dh_param2",//string		预留固定字段2
            "subtype",
        ];

        var outParam = {
            'type': 'share',
            'subtype': type,
            'before_cnt': bf,
            'after_cnt': now,
            'change_cnt': now - bf,
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }

    public taskLog(rkPlayer: SePlayer, type, taskID) {
        this._three_.taskLog(rkPlayer, type, taskID);
        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "type",//string	是	玩家行为记字符串(repair_home:修理家园 reputation：信誉值改变等)
            "before_cnt",//	bigint	　	操作前数量(例如信誉值前后变化)
            "after_cnt",//bigint	　	操作后数量
            "change_cnt",//bigint	　	变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
            "race_id",//string		关联pvp或者pve的某一比赛，比如这次行为是在某一次比赛中产生的。
            "dh_param1",//string		预留固定字段1
            "dh_param2",//string		预留固定字段2
            "subtype",
            "type_value1"
        ];

        var outParam = {
            'type': 'task',
            'subtype': type,
            'before_cnt': 0,
            'after_cnt': 0,
            'change_cnt': 0,
            'type_value1': taskID
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }


    public guideLog(rkPlayer: SePlayer, now, bf, index: number) {
        this._three_.guideLog(rkPlayer, now, bf, index);
        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "type",//string	是	玩家行为记字符串(repair_home:修理家园 reputation：信誉值改变等)
            "before_cnt",//	bigint	　	操作前数量(例如信誉值前后变化)
            "after_cnt",//bigint	　	操作后数量
            "change_cnt",//bigint	　	变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
            "race_id",//string		关联pvp或者pve的某一比赛，比如这次行为是在某一次比赛中产生的。
            "dh_param1",//string		预留固定字段1
            "dh_param2",//string		预留固定字段2
            "subtype",
        ];

        var outParam = {
            'type': 'guide',
            'subtype': 'type',
            'before_cnt': bf,
            'after_cnt': now,
            'change_cnt': now - bf,
        }

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }

    public unsync_race(rkPlayer: SePlayer, rid: string, racetype: string) {
        this._three_.unsync_race(rkPlayer, rid, racetype);
    }

    public unsync_player(rkPlayer: SePlayer, count: number) {
        this._three_.unsync_player(rkPlayer, count);
    }

    public gmOprLog(gmid: string, uid: number, type: string, value1: any, value2?: any, value3?: any, value4?: any, value5?: any, value6?: any, reason?: string) {
        this._three_.gmOprLog(gmid, uid, type, value1, value2, value3, value4, value5, value6, reason);
        var outList = [
            "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
            "zid",//	bigint	是	大区id
            "iuin",//	bigint	是	玩家id(全局唯一)
            "char_id",//	bigint	是	角色id
            "dh_id",//	bigint	　	电魂id
            "channel",//	string	是	渠道
            "record_time",//	string	是	记录时间(在结算时记录)
            "type",//string	是	玩家行为记字符串(repair_home:修理家园 reputation：信誉值改变等)
            "before_cnt",//	bigint	　	操作前数量(例如信誉值前后变化)
            "after_cnt",//bigint	　	操作后数量
            "change_cnt",//bigint	　	变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
            "race_id",//string		关联pvp或者pve的某一比赛，比如这次行为是在某一次比赛中产生的。
            "dh_param1",//string		预留固定字段1
            "dh_param2",//string		预留固定字段2
            "subtype",
            "type_value1",
            "type_value2",
            "type_value3",
            "type_value4",
            "type_value5",
            "type_value6",
            "type_value7",
            "type_value8",
        ];

        var outParam = {
            'iuin': uid,
            'char_id': uid,
            'dh_id': uid,
            'channel': 0,
            'type': 'gmlog',
            'subtype': type,
            'race_id': '',
            'before_cnt': 0,
            'after_cnt': 0,
            'change_cnt': 0,
            "type_value1": gmid,
            "type_value2": value1,
            "type_value3": value2,
            "type_value4": value3,
            "type_value5": value4,
            "type_value6": value5,
            "type_value7": value6,
        }

        this.addLog(this.createlog(null, outList, 'tab_action', outParam));
    }

    public fightFormationLog(rkPlayer: SePlayer, type: string, bwin: boolean, rid: string, usetime: number, castlehp: number, lordid: string, equips: SeEquip[], pvestar: number, levelid: string, issweep: boolean, ishost: boolean, host_skills: Array<number>, ...formation) {
        this._three_.fightFormationLog(rkPlayer, type, bwin, rid, usetime, castlehp, lordid, equips, pvestar, levelid, issweep, ishost, host_skills, ...formation);
    }

    public equipLog(rkPlayer: SePlayer, type: string, equipid: string, equipkid: string, items:SeItem[], num: number, bfnum: number, enchant: {}) {
        this._three_.equipLog(rkPlayer, type, equipid, equipkid, items, num, bfnum, enchant);
    }

    public pveCheatLog(rkPlayer: SePlayer, type: string, race_id: string, cheat_level: number, equip_score: number) {
        this._three_.pveCheatLog(rkPlayer, type, race_id, cheat_level, equip_score);
    }

    public limitedGiftLog(rkPlayer: SePlayer, mallId: string) {
        this._three_.limitedGiftLog(rkPlayer, mallId);

        var outList = ['mallId'];

        var outParam = { 'type': 'limitedgift', 'mallId': mallId };

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }

    public followPublic(rkPlayer: SePlayer, isComplete: boolean, isAdd: boolean) {
        this._three_.followPublic(rkPlayer, isComplete, isAdd);

        var outList = ['isComplete', 'isAdd'];

        var outParam = { 'isComplete': isComplete, 'isAdd': isAdd };

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }

    public smallProgram(rkPlayer: SePlayer, isComplete: boolean, isAdd: boolean) {
        this._three_.smallProgram(rkPlayer, isComplete, isAdd);

        var outList = ['isComplete', 'isAdd'];

        var outParam = { 'isComplete': isComplete, 'isAdd': isAdd };

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }

    public enterProgram(rkPlayer: SePlayer, appId: string, rechargeNum: number) {
        this._three_.enterProgram(rkPlayer, appId, rechargeNum);

        var outList = ['appId', 'rechargeNum'];

        var outParam = { 'appId': appId, 'rechargeNum': rechargeNum };

        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }

    public threeOrderlogs(rkPlayer: SePlayer, type: string, state: string, cporder: string, itemid: string, itemnum: number, dhorder: string = "") {
        this._three_.threeOrderlogs(rkPlayer, type, state, cporder, itemid, itemnum, dhorder);
    }


    public callBackLogs(rkPlayer: SePlayer, type: string, num1: number, num2: number) {
        this._three_.callBackLogs(rkPlayer, type, num1, num2);
    }

    get path() {
        return configInst.get('logMgr.path') || './';
    }

    public log(message?: any, ...optionalParams: any[]): void {
        console.log(message);
        if (message) {
            fs.writeFile(path.join(this.path, 'runtime.log'), JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
    }

    // 这里导出日志
    private _catch = {};
    private addLog(rkLog: TeLog2) {
        // mysqlInst.instrtData(rkLog.logtype, createInsertInfo(rkLog.src));

        // global.matchMgr.sendMSData({
        //     cmd: 'addlog',
        //     type: rkLog.logtype,
        //     info: rkLog.org
        // });
        if (this.close) {
            return;
        }

        var rkObj: HashMap<string>;
        if (!this._catch.hasOwnProperty(rkLog.logtype)) {
            this._catch[rkLog.logtype] = new HashMap<string>();
        }
        rkObj = this._catch[rkLog.logtype]
        rkObj.add(rkLog.logfile, rkLog.src);
    }

    private _saveCache() {

        for (var key in this._catch) {
            var rHash = <HashMap<string>>this._catch[key];
            if (!rHash) {
                continue;
            }
            var fpath = path.join(this.path, key)
            this.mkdirsSync(fpath);
            var keys = rHash.keys;
            for (var ij = 0; ij < keys.length; ij++) {
                var rList = rHash.get(keys[ij]);
                if (!rList || rList.length == 0) continue;
                var fileName = path.join(fpath, keys[ij]);
                var cValue: string = '';
                for (var i = 0; i < rList.length; i++) {
                    cValue += rList[i] + '\n';
                    if (i != 0 && i % 20 == 0) {
                        fs.writeFile(fileName, cValue, { flag: 'a+' }, () => { })
                        cValue = '';
                    }
                }
                if (cValue.length > 0) {
                    fs.writeFile(fileName, cValue, { flag: 'a+' }, () => { })
                }
            }

        }
        this._catch = {};
    }
}