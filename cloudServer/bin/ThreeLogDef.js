"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreeLogMgr = void 0;
const fs = require("fs");
const path = require("path");
const SePlayer_1 = require("./PlayerMgr/SePlayer");
const TeTool_1 = require("./TeTool");
const TeConfig_1 = require("./lib/TeConfig");
// 第三方日志系统的定义
// enum TL_EventType {
//     track = 'track',
//     user_set = 'user_set',
//     user_setOnce = 'user_setOnce',
//     user_add = 'user_add',
//     user_del = 'user_del'
// }
class ThreeLogMgr {
    constructor() {
        // 这里导出日志
        this._catch = new TeTool_1.HashMap();
        setInterval(this._saveCache.bind(this), 2000);
    }
    three_log_event(uid, event_name, obj) {
        var s = {
            "#account_id": uid.toString(),
            // "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
            "#type": 'track',
            // "#ip": "192.168.171.111",
            // "#time": "2017-12-18 14:37:28.527",
            "#time": /*"2017-12-18 14:37:28.527"*/ TeTool_1.TeDate.DateToStr(Date.now()),
            "#event_name": event_name,
            "properties": obj
        };
        this._catch.add(event_name, s);
        // var ali_log
    }
    three_log_static(uid, eventType, obj) {
        let plt = TeConfig_1.configInst.get('plt');
        let account_id = uid.toString();
        let useplt = '';
        if ((plt != 'wx' && plt.indexOf('wx') == 0) || (plt != 'sdw' && plt.indexOf('sdw') == 0)) {
            useplt = '_' + plt;
        }
        let newObj = {};
        for (let key in obj) {
            newObj[key + useplt] = obj[key];
        }
        var s = {
            "#account_id": account_id,
            // "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
            "#type": eventType.toString(),
            // "#ip": "192.168.171.111",
            "#time": /*"2017-12-18 14:37:28.527"*/ TeTool_1.TeDate.DateToStr(Date.now()),
            "properties": newObj
        };
        this._catch.add('_static_', s);
    }
    unsync_race(rkPlayer, rid, racetype) {
        var outList = [
            "zid",
            "channel",
            "race_id",
            "subtype",
            'level'
        ];
        var outParam = {
            'race_id': rid,
            'subtype': racetype,
            'level': 0
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'unsync', ot);
    }
    unsync_player(rkPlayer, count) {
        var outList = [
            "zid",
            "channel",
            "race_id",
            "subtype",
            "level"
        ];
        var outParam = {
            'subtype': 'player',
            'level': count
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'unsync', ot);
    }
    itemLog(rkPlayer, itemid, num, bfnum, type, sub_reason) {
        //tga数据量太大，金币的item不记录
        if (itemid == 'W002')
            return;
        var outList = [
            "zid",
            "channel",
            "item_id",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "reason_type",
            "sub_reason",
            "register_time", //	string		注册时间
        ];
        var outParam = {
            'item_id': itemid,
            'before_cnt': bfnum,
            'after_cnt': num,
            'change_cnt': num - bfnum,
            'reason_type': type,
            "sub_reason": sub_reason
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'item', ot);
    }
    heroLog(rkPlayer, type, heroid, nownum, bfnum) {
        nownum = nownum || 0;
        bfnum = bfnum || 0;
        var outList = [
            "zid",
            "channel",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "subtype",
            "heroid",
        ];
        var outParam = {
            'before_cnt': bfnum,
            'after_cnt': nownum,
            'change_cnt': parseInt('' + nownum) - parseInt('' + bfnum),
            "subtype": type,
            "heroid": heroid,
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'hero', ot);
    }
    activityExchange(rkPlayer, activityId, exchangeId, type, targetId) {
        var outList = [
            "zid",
            "channel",
            "subtype",
            "activityId",
            "exchangeId",
            "targetId",
            "register_time", //	string		注册时间
        ];
        var outParam = {
            "subtype": type,
            "activityId": activityId,
            "exchangeId": exchangeId,
            "targetId": targetId
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'exchange', ot);
    }
    /**
     *
     * @param logType zuanshi gold
     * @param rkPlayer
     * @param type
     * @param nownum
     * @param bfnum
     * @param value1
     * @param value2
     */
    _tableMoney(logType, rkPlayer, type, nownum, bfnum, value1, value2) {
        nownum = nownum || 0;
        bfnum = bfnum || 0;
        var outList = [
            "zid",
            "channel",
            "record_time",
            "moneytype",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "reason_type",
            "type_value1",
            "type_value2",
            'register_time',
        ];
        var outParam = {
            'moneytype': logType,
            'reason_type': type,
            'before_cnt': bfnum,
            'after_cnt': nownum,
            'change_cnt': nownum - bfnum,
            "type_value1": value1,
            "type_value2": value2,
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, logType, ot);
    }
    scoreLog(rkPlayer, type, nownum, bfnum) {
        nownum = nownum || 0;
        bfnum = bfnum || 0;
        var outList = [
            "zid",
            "channel",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "race_id",
            "subtype",
            'register_time',
        ];
        var outParam = {
            'subtype': type,
            'before_cnt': bfnum,
            'after_cnt': nownum,
            'change_cnt': nownum - bfnum,
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'score', ot);
    }
    signLog(rkPlayer, type, nownum, bfnum) {
        nownum = nownum || 0;
        bfnum = bfnum || 0;
        var outList = [
            "zid",
            "channel",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "subtype",
            'register_time',
        ];
        var outParam = {
            'subtype': type,
            'before_cnt': bfnum,
            'after_cnt': nownum,
            'change_cnt': nownum - bfnum,
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'sign', ot);
    }
    pvpBoxLog(rkPlayer, type, id, boxType, star, cardList, value) {
        cardList = cardList || [];
        var outList = [
            "zid",
            "channel",
            "box_id",
            "box_type",
            "level",
            "subtype",
            "num1",
            "hero1",
            "hero_level1",
            "hero2",
            "hero_level2",
            "hero3",
            "hero_level3",
            "hero4",
            "hero_level4",
            "hero5",
            "hero_level5",
            "hero6",
            "hero_level6",
            "hero7",
            "hero_level7",
            "hero8",
            "hero_level8",
            "hero9",
            "hero_level9",
            "hero10",
            "hero_level10"
        ];
        var outParam = {
            'type': 'pvpbox',
            'subtype': type,
            'box_id': id,
            'box_type': boxType,
            'level': star,
            "num1": value || 0
        };
        if (cardList) {
            for (let i = 0; i < cardList.length; i++) {
                let f = cardList[i];
                if (f) {
                    outParam['hero' + (i + 1)] = f.kid;
                    outParam['hero_level' + (i + 1)] = f.num;
                }
                else {
                    outParam['hero' + (i + 1)] = '';
                    outParam['hero_level' + (i + 1)] = 0;
                }
            }
        }
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'pvpbox', ot);
    }
    createChar(rkPlayer) {
        var outList = [
            "zid",
            "channel", //	string	是	渠道
        ];
        var outParam = {};
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'create', ot);
    }
    register(rkPlayer, shareuid, scene, appId) {
        var outList = [
            "zid",
            "channel",
            "version",
            "device_os",
            "screenSize",
            "osVersion",
            "shareuid",
            'register_time', //	string		注册时间
        ];
        var outParam = {
            'shareuid': shareuid
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'register', ot);
        this.on_register_player(rkPlayer, scene, appId);
    }
    enter(rkPlayer) {
        var outList = [
            "zid",
            "channel",
            "pvp_level",
            "pve_level",
            "vip_level",
            "device_os",
            "last_login_time",
            "register_time",
            "osVersion",
            "screenSize", //			设备屏幕尺寸
        ];
        var ot = this.createlog(rkPlayer, outList, {});
        this.three_log_event(rkPlayer.id, 'login', ot);
    }
    leave(rkPlayer) {
        var outList = [
            "zid",
            "channel",
            "pvp_level",
            "pve_level",
            "vip_level",
            "online_time",
            "online_time_once",
            "online_time_yesterday",
            "pvp_score",
        ];
        var outParam = {
            'online_time_once': 0,
            'online_time_yesterday': 0,
        };
        if (TeTool_1.TeDate.isdiffday(rkPlayer.baseInfo.loginTime)) {
            outParam['online_time_once'] = Date.now() - new Date().setHours(0, 0, 0, 0);
            outParam['online_time_yesterday'] = new Date().setHours(0, 0, 0, 0) - rkPlayer.baseInfo.loginTime;
        }
        else
            outParam['online_time_once'] = Date.now() - rkPlayer.baseInfo.loginTime;
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'logout', ot);
        this.on_base_player(rkPlayer);
    }
    pvpLog(rkPlayer, rid, type, bWin, fightTime, gold = 0, loopwin = 0, fscore = 0, totwin = 0, totfail = 0) {
        var outList = [
            'zid',
            'channel',
            'race_type',
            'race_id',
            'is_win',
            'pvp_level',
            'pve_level',
            'vip_level',
            'race_time',
            'coin',
            'loopwin',
            'fscore',
            'totwin',
            'totfail',
            'register_time',
        ];
        var outParam = {
            'race_id': rid,
            'race_type': type,
            'is_win': bWin ? 1 : 0,
            'race_time': fightTime / 1000,
            'coin': gold,
            'loopwin': loopwin,
            'fscore': fscore,
            'totwin': totwin,
            'totfail': totfail
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'pvp', ot);
    }
    //诸侯伐董数据
    // public pvepkLog(rkPlayer: SePlayer, fightTime: number, bWin: boolean, attack_rank: number, define_rank: number, equips: [], define_equips: [], lord_id: string, define_lord_id: string, attack_power: ) {
    //     
    pvepkLog(rkPlayer, fightTime, bWin, attack_rank, define_rank, pve_pk_formation, define_pve_pk_formation) {
        var outList = [
            'zid',
            'channel',
            'race_time',
            'attack_rank',
            'define_rank',
            'is_win',
            'equip1',
            'equip_level_1',
            'equip_star_1',
            'equip_enchant_1',
            'equip2',
            'equip_level_2',
            'equip_star_2',
            'equip_enchant_2',
            'equip3',
            'equip_level_3',
            'equip_star_3',
            'equip_enchant_3',
            'define_id',
            'define_equip1',
            'define_equip_level_1',
            'define_equip_star_1',
            'define_equip_enchant_1',
            'define_equip2',
            'define_equip_level_2',
            'define_equip_star_2',
            'define_equip_enchant_2',
            'define_equip3',
            'define_equip_level_3',
            'define_equip_star_3',
            'define_equip_enchant_3',
            'lord_id',
            'define_lord_id',
            'attack_power',
            'define_power',
            'ave_level',
            'define_ave_level',
            'Unit1',
            'Unit2',
            'Unit3',
            'Unit4',
            'Unit5',
            'Unit6',
            'Unit7',
            'Unit8',
            'Unit9',
            'Unit10',
            'Unit11',
            'Unit12',
            'Unit13',
            'Unit14',
            'Unit15',
            'Unit16',
            'Unit17',
            'Unit18',
            'def_Unit1',
            'def_Unit2',
            'def_Unit3',
            'def_Unit4',
            'def_Unit5',
            'def_Unit6',
            'def_Unit7',
            'def_Unit8',
            'def_Unit9',
            'def_Unit10',
            'def_Unit11',
            'def_Unit12',
            'def_Unit13',
            'def_Unit14',
            'def_Unit15',
            'def_Unit16',
            'def_Unit17',
            'def_Unit18',
        ];
        var outParam = {
            'is_win': bWin ? 1 : 0,
            'race_time': fightTime / 1000,
            'attack_rank': attack_rank,
            'define_rank': define_rank,
            'lord_id': pve_pk_formation.lord.id,
            'define_lord_id': define_pve_pk_formation.lord.id,
            'define_id': define_pve_pk_formation.id, //防守主公
        };
        let equips = pve_pk_formation.lord.equips;
        for (let i = 0; i < equips.length; i++) {
            let f = equips[i];
            if (f) {
                outParam['equip' + (i + 1)] = f.eId;
                outParam['equip_level_' + (i + 1)] = f.eLevel;
                outParam['equip_star_' + (i + 1)] = f.eStar;
                outParam['equip_enchant_' + (i + 1)] = JSON.stringify(f.enchant);
            }
            else {
                outParam['equip' + (i + 1)] = '';
                outParam['equip_level_' + (i + 1)] = 0;
                outParam['equip_star_' + (i + 1)] = 0;
                outParam['equip_enchant_' + (i + 1)] = '';
            }
        }
        let define_equips = define_pve_pk_formation.lord.equips;
        for (let i = 0; i < define_equips.length; i++) {
            let f = define_equips[i];
            if (f) {
                outParam['define_equip' + (i + 1)] = f.eId;
                outParam['define_equip_level_' + (i + 1)] = f.eLevel;
                outParam['define_equip_star_' + (i + 1)] = f.eStar;
                outParam['define_equip_enchant_' + (i + 1)] = JSON.stringify(f.enchant);
            }
            else {
                outParam['define_equip' + (i + 1)] = '';
                outParam['define_equip_level_' + (i + 1)] = 0;
                outParam['define_equip_star_' + (i + 1)] = 0;
                outParam['define_equip_enchant_' + (i + 1)] = '';
            }
        }
        let attack_power = [0, 0, 0, 0, 0, 0];
        let attack_level_all = 0;
        let unitIds = [];
        for (var key in pve_pk_formation) {
            if (key == 'lord')
                continue;
            // 英雄的分值
            var rkHeroRes = global.resMgr.UnitRes.getRes(key);
            if (rkHeroRes) {
                unitIds.push(key);
                // 高级卡牌相当于普通卡牌的高级版
                attack_level_all += pve_pk_formation[key].level;
                attack_level_all += (rkHeroRes.iColour - 1) * 2;
                attack_power[pve_pk_formation[key].areaIdx] += rkHeroRes.iPreCD;
            }
        }
        for (let i = 0; i < unitIds.length; i++) {
            outParam['Unit' + (i + 1)] = unitIds[i];
        }
        outParam['attack_power'] = attack_power.join(',');
        outParam['ave_level'] = (attack_level_all / 18).toFixed(1);
        let define_power = [0, 0, 0, 0, 0, 0];
        let define_level_all = 0;
        let def_unitIds = [];
        for (var key in define_pve_pk_formation) {
            if (key == 'lord')
                continue;
            // 英雄的分值
            var rkHeroRes = global.resMgr.UnitRes.getRes(key);
            if (rkHeroRes) {
                def_unitIds.push(key);
                // 高级卡牌相当于普通卡牌的高级版
                define_level_all += define_pve_pk_formation[key].level;
                define_level_all += (rkHeroRes.iColour - 1) * 2;
                define_power[define_pve_pk_formation[key].areaIdx] += rkHeroRes.iPreCD;
            }
        }
        for (let i = 0; i < def_unitIds.length; i++) {
            outParam['def_Unit' + (i + 1)] = def_unitIds[i];
        }
        outParam['define_power'] = define_power.join(',');
        outParam['define_ave_level'] = (define_level_all / 18).toFixed(1);
        // console.error(JSON.stringify(outParam));
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'pvepk', ot);
    }
    pveLog(rkPlayer, levelid, times, bWin, time) {
        var outList = [
            'zid',
            'channel',
            'race_type',
            'race_id',
            'is_win',
            'pvp_level',
            'pve_level',
            'vip_level',
            'race_time',
            'register_time',
        ];
        var outParam = {
            'race_id': levelid,
            'race_type': times,
            'is_win': bWin ? 1 : 0,
            'race_time': time,
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'pve', ot);
    }
    maillog(rkPlayer, mailid, type, mailinfo) {
        var outList = [
            'zid',
            'channel',
            'mailid',
            'type',
            'mailinfo'
        ];
        var outParam = {
            'mailid': mailid,
            'type': type,
            'mailinfo': mailinfo,
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'mail', ot);
    }
    market(rkPlayer, kID, payType, cost, itemid, buynum, discount) {
        var outList = [
            'zid',
            'channel',
            'marketid',
            'marketgoodstype',
            'buynum',
            'discount',
            'Moneytype1',
            'Moneycost1',
            'register_time',
        ];
        var outParam = {
            'marketid': kID,
            'marketgoodstype': itemid,
            'buynum': buynum,
            'discount': discount,
            'Moneytype1': payType,
            'Moneycost1': cost,
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'market', ot);
    }
    buttonClickLog(rkPlayer, type, page, ...args) {
        var outList = [
            "zid",
            "channel",
            "record_time",
            "button_id",
            "page_id",
            "dh_param1",
            "dh_param2",
            "ext_value1",
            "ext_value2",
            "ext_value3",
            'register_time',
        ];
        var outParam = {
            'button_id': type,
            'page_id': page,
            'ext_value1': args[0] || 0,
            'ext_value2': args[1] || 0,
            'ext_value3': args[2] || 0,
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'button', ot);
    }
    invitecodeLog(uid, code, rkPlayer) {
        var outList = [
            'zid',
            'channel',
            'invite_code',
        ];
        var outParam = {
            'invite_code': code,
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(uid, 'invitecode', ot);
    }
    rechargeStateLog(rkPlayer, type = '', amount = 0, time = 0, orderid = '', subtype = '') {
        var outList = [
            'zid',
            'channel',
            'recharge_type',
            'recharge_amt',
            'register_time',
            'pvp_level',
            'pve_level',
            'pvp_score',
            'vip_level',
            'orderid',
            'subtype'
        ];
        var outParam = {
            'recharge_type': type,
            'recharge_amt': amount,
            'subtype': subtype,
            'orderid': orderid
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'recharge_state', ot);
    }
    rechargeLog(rkPlayer, type = '', amount = 0, time = 0, orderid = '') {
        var outList = [
            'zid',
            'channel',
            'recharge_type',
            'recharge_amt',
            'register_time',
            'pvp_level',
            'pve_level',
            'pvp_score',
            'vip_level',
            'orderid',
        ];
        var outParam = {
            'recharge_type': type,
            'recharge_amt': amount,
            'orderid': orderid
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'recharge', ot);
    }
    shareLog(rkPlayer, type, now, bf) {
        var outList = [
            "zid",
            "channel",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "subtype",
            'register_time', //	string		注册时间
        ];
        var outParam = {
            'subtype': type,
            'before_cnt': bf,
            'after_cnt': now,
            'change_cnt': now - bf,
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'share', ot);
    }
    taskLog(rkPlayer, type, taskID) {
        var outList = [
            "zid",
            "channel",
            "subtype",
            "taskid",
            "register_time", //	string		注册时间
        ];
        var outParam = {
            'subtype': type,
            'taskid': taskID
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'task', ot);
    }
    guideLog(rkPlayer, now, bf, index) {
        var outList = [
            "zid",
            "channel",
            "guide_index",
            "guide_sub_index",
            "subtype",
            'register_time',
        ];
        var outParam = {
            'subtype': 'finish',
            'guide_curr': bf,
            'guide_index': now,
            'guide_sub_index': index
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'guide', ot);
    }
    gmOprLog(gmid, uid, type, value1, value2, value3, value4, value5, value6, reason) {
        var outList = [
            "zid",
            "channel",
            "type",
            "subtype",
            "gmid",
            "item1_id",
            "item1_name",
            "item2_id",
            "item2_name",
            "item3_id",
            "item3_name",
            "gm_reason"
        ];
        var outParam = {
            'subtype': type,
            "gmid": gmid,
            "item1_id": value1,
            "item1_name": value2,
            "item2_id": value3,
            "item2_name": value4,
            "item3_id": value5,
            "item3_name": value6,
            "gm_reason": reason
        };
        var ot = this.createlog(null, outList, outParam);
        this.three_log_event(uid, 'gmlopr', ot);
    }
    fightFormationLog(rkPlayer, type, bwin, rid, usetime, castlehp, lordid, equips, pvestar, levelid, is_sweep, is_host, host_skills, ...formation) {
        var outList = [
            'is_win',
            'pvp_level',
            'pve_level',
            'race_id',
            'dh_param1',
            'dh_param2',
            'subtype',
            'hero1',
            'hero_level1',
            'hero2',
            'hero_level2',
            'hero3',
            'hero_level3',
            'hero4',
            'hero_level4',
            'hero5',
            'hero_level5',
            'hero6',
            'hero_level6',
            'hero7',
            'hero_level7',
            'hero8',
            'hero_level8',
            'lord_id',
            'equip1',
            'equip_level_1',
            'equip_star_1',
            'equip2',
            'equip_level_2',
            'equip_star_2',
            'equip3',
            'equip_level_3',
            'equip_star_3',
            'use_time',
            'castle_hp',
            'pve_star',
            'register_time',
            'level_id',
            'is_sweep',
            'is_host',
            'host_skills',
        ];
        var outParam = {
            'subtype': type,
            'is_win': bwin ? 1 : 0,
            'race_id': rid,
            'use_time': usetime,
            'castle_hp': castlehp,
            "lord_id": lordid,
            'pve_star': pvestar,
            'level_id': levelid,
            'is_sweep': is_sweep,
            'is_host': is_host,
            'host_skills': JSON.stringify(host_skills),
        };
        for (let i = 0; i < formation.length; i++) {
            let f = formation[i];
            if (f) {
                outParam['hero' + (i + 1)] = f.id;
                outParam['hero_level' + (i + 1)] = f.level;
            }
            else {
                outParam['hero' + (i + 1)] = '';
                outParam['hero_level' + (i + 1)] = 0;
            }
        }
        for (let i = 0; i < equips.length; i++) {
            let f = equips[i];
            if (f) {
                outParam['equip' + (i + 1)] = f.eId;
                outParam['equip_level_' + (i + 1)] = f.eLevel;
                outParam['equip_star_' + (i + 1)] = f.eStar;
            }
            else {
                outParam['equip' + (i + 1)] = '';
                outParam['equip_level_' + (i + 1)] = 0;
                outParam['equip_star_' + (i + 1)] = 0;
            }
        }
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'fighthero', ot);
    }
    equipLog(rkPlayer, type, equipid, equipkid, items, num, bfnum, enchant) {
        var outList = [
            "pvp_level",
            "pve_level",
            "register_time",
            "equip_id",
            "equip_kid",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "item1_id",
            "item1_num",
            "item2_id",
            "item2_num",
            "item3_id",
            "item3_num",
            "item4_id",
            "item4_num",
            "subtype",
            "enchant",
        ];
        var outParam = {
            'equip_id': equipid,
            'equip_kid': equipkid,
            'subtype': type,
            'before_cnt': bfnum,
            'after_cnt': num,
            'change_cnt': num - bfnum,
            'enchant': JSON.stringify(enchant),
        };
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (item) {
                outParam['item' + (i + 1) + '_id'] = item.kItemID;
                outParam['item' + (i + 1) + '_num'] = item.iPileCount;
            }
            else {
                outParam['item' + (i + 1) + '_id'] = '';
                outParam['item' + (i + 1) + '_num'] = 0;
            }
        }
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'equip', ot);
    }
    pveCheatLog(rkPlayer, type, race_id, cheat_level, equip_score) {
        var outList = [
            "pvp_level",
            "pve_level",
            "register_time",
            "race_id",
            "cheat_level",
            "subtype",
            "equip_score",
        ];
        var outParam = {
            'race_id': race_id,
            'subtype': type,
            'cheat_level': cheat_level,
            'equip_score': equip_score,
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'pveCheat', ot);
    }
    //限时礼包统计
    limitedGiftLog(rkPlayer, mallId) {
        var outList = ['mallId'];
        var outParam = { 'mallId': mallId };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'limitedgift', ot);
    }
    //添加小程序统计
    smallProgram(rkPlayer, isComplete, isAdd) {
        var outList = ['isComplete', 'isAdd'];
        var outParam = { 'isComplete': isComplete, 'isAdd': isAdd };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'smallProgram', ot);
    }
    //关注公众号统计
    followPublic(rkPlayer, isComplete, isAdd) {
        var outList = ['isComplete', 'isAdd'];
        var outParam = { 'isComplete': isComplete, 'isAdd': isAdd };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'followPublic', ot);
    }
    //征伐任务统计
    enterProgram(rkPlayer, appId, rechargeNum) {
        var outList = ['appId', 'rechargeNum'];
        var outParam = { 'appId': appId, 'rechargeNum': rechargeNum };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'enterProgram', ot);
    }
    threeOrderlogs(rkPlayer, type, state, cporder, itemid, itemnum, dhorder) {
        var outList = [
            "type",
            "state",
            "order",
            "itemid",
            "itemnum",
            "dhorder"
        ];
        var outParam = {
            type: type,
            state: state,
            order: cporder,
            itemid: itemid,
            itemnum: itemnum,
            dhorder: dhorder
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'threeOrderlogs', ot);
    }
    callBackLogs(rkPlayer, type, num1, num2) {
        var outList = [
            "type",
            "num1",
            "num2"
        ];
        var outParam = {
            type: type,
            num1: num1,
            num2: num2
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_event(rkPlayer.id, 'threeOrderlogs', ot);
    }
    //-------------------------------------------------------------------------------//
    /**
     * 玩家注册的时候，发送一份基本数据
     */
    on_register_player(rkPlayer, scene, appId) {
        var outList = ["scene", "appId"];
        var outParam = {
            'scene': scene || '',
            "appId": appId || ''
        };
        var ot = this.createlog(rkPlayer, outList, outParam);
        this.three_log_static(rkPlayer.id, 'user_set', ot);
    }
    //-------------------------------------------------------------------------------//
    /**
     * 玩家离线的时候，发送一份基本数据
     */
    on_base_player(rkPlayer) {
        var outList = [
            "char_name",
            "last_login_time",
            "register_time",
            "gold",
            "money",
            "province",
            "city",
            "gender",
            "nickName",
            "phoneNum"
        ];
        var ot = this.createlog(rkPlayer, outList, {});
        this.three_log_static(rkPlayer.id, 'user_set', ot);
    }
    _parseFloat(v) {
        if (typeof v == 'number') {
            return v;
        }
        else {
            let ov = 0;
            try {
                parseFloat(v.toString());
            }
            catch (e) {
            }
            if (isNaN(ov)) {
                ov = 0;
            }
            return ov;
        }
    }
    //-------------------------------------------------------------------------------//
    createlog(rkPlayer, arrayList, outParam) {
        // 有几个是必须要有的添加一下
        var needslist = ['plt', 'iuin', 'zid', 'channel', 'pvp_score', 'pvp_level', 'pve_level', 'tot_charge', 'pub_ver', 'peak_score', 'device_os', 'fight_count',
            "scene", "lord_id", "equip1", "equip_level_1", "equip_star_1", "equip2", "equip_level_2", "equip_star_2", "equip3", "equip_level_3", "equip_star_3", "vip_level",
            "glory_score", "glory_score_all"];
        for (var i = 0; i < needslist.length; i++) {
            if (arrayList.indexOf(needslist[i]) < 0) {
                arrayList.push(needslist[i]);
            }
        }
        // 生成日志的通用接口
        var outLog = {
        // logtype: type,
        // logfile: type + '_' + TeDate.DateToLogStr(Date.now()) + `_${gappid}.log`,
        };
        for (var i = 0; i < arrayList.length; i++) {
            var sKey = arrayList[i];
            switch (sKey) {
                case 'zid':
                    outLog[sKey] = TeConfig_1.configInst.get('serverid') || 0;
                    break;
                case 'record_time':
                    outLog[sKey] = TeTool_1.TeDate.DateToStr(Date.now());
                    break;
                case 'version':
                    outLog[sKey] = global.version || '0.0.0.1';
                    break;
                case 'plt':
                    outLog[sKey] = TeConfig_1.configInst.get('plt');
                    break;
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
        if (rkPlayer instanceof SePlayer_1.SePlayer) {
            for (var i = 0; i < arrayList.length; i++) {
                var sKey = arrayList[i];
                try {
                    switch (sKey) {
                        case 'pub_ver':
                            outLog[sKey] = this._parseFloat(rkPlayer.loginInfo['pub_ver']);
                            break;
                        case 'iuin':
                            outLog[sKey] = rkPlayer.id || 0;
                            break;
                        case 'char_id':
                            outLog[sKey] = rkPlayer.id;
                            break;
                        case 'dh_id':
                            outLog[sKey] = rkPlayer.id;
                            break;
                        case 'channel':
                            outLog[sKey] = rkPlayer.baseInfo.channel ? rkPlayer.baseInfo.channel : (rkPlayer.loginInfo ? rkPlayer.loginInfo.channel : '');
                            break;
                        case 'pvp_level':
                            outLog[sKey] = rkPlayer.pvp_level;
                            break;
                        case 'pve_level':
                            outLog[sKey] = rkPlayer.level;
                            break;
                        case 'pvp_score':
                            outLog[sKey] = rkPlayer.pvp_score;
                            break;
                        case 'peak_score':
                            outLog[sKey] = rkPlayer.peak_score;
                            break;
                        case 'tot_charge':
                            outLog[sKey] = rkPlayer.tot_charge;
                            break;
                        case 'device_os':
                            outLog[sKey] = rkPlayer.loginInfo ? rkPlayer.loginInfo['device_os'] : '';
                            break;
                        case 'last_login_time':
                            outLog[sKey] = TeTool_1.TeDate.DateToStr(rkPlayer.baseInfo.lastLoginTime);
                            break;
                        case 'register_time':
                            outLog[sKey] = TeTool_1.TeDate.DateToyyyyMMdd(rkPlayer.baseInfo.createtime);
                            break;
                        // case 'ip': outLog[sKey] = global.netMgr.getSocketIP(rkPlayer.linkid); break;
                        // case 'osVersion': outLog[sKey] = global.netMgr.getSocketUserAgent(rkPlayer.linkid); break;
                        case 'screenSize':
                            outLog[sKey] = rkPlayer.loginInfo ? rkPlayer.loginInfo['screenSize'] : '';
                            break;
                        case 'online_time':
                            outLog[sKey] = rkPlayer.baseInfo.onlinetime || 0;
                            break;
                        case 'vip_level':
                            outLog[sKey] = rkPlayer.baseInfo.vip_level || 0;
                            break;
                        case "char_name":
                            outLog[sKey] = rkPlayer.name;
                            break;
                        case 'gold':
                            outLog[sKey] = rkPlayer.gold;
                            break;
                        case 'money':
                            outLog[sKey] = rkPlayer.money;
                            break;
                        case 'phoneNum':
                            outLog[sKey] = rkPlayer.baseInfo.phoneNum;
                            break;
                        case 'province':
                            if (rkPlayer.loginInfo.wxinfo)
                                outLog[sKey] = rkPlayer.loginInfo.wxinfo.province;
                            break;
                        case 'city':
                            if (rkPlayer.loginInfo.wxinfo)
                                outLog[sKey] = rkPlayer.loginInfo.wxinfo.city;
                            break;
                        case 'gender':
                            if (rkPlayer.loginInfo.wxinfo)
                                outLog[sKey] = rkPlayer.loginInfo.wxinfo.gender;
                            break;
                        case 'nickName':
                            if (rkPlayer.loginInfo.wxinfo)
                                outLog[sKey] = rkPlayer.loginInfo.wxinfo.nickName;
                            break;
                        case 'fight_count':
                            outLog[sKey] = rkPlayer.pvpMgr.fight_count ? rkPlayer.pvpMgr.fight_count.toString() : '0';
                            break;
                        case "scene":
                            outLog[sKey] = rkPlayer.loginInfo["scene"] || '';
                            break;
                        case "lord_id":
                            outLog[sKey] = rkPlayer.baseInfo.lord || '';
                            break;
                        case "glory_score":
                            outLog[sKey] = rkPlayer.pvpMgr.glory_score || 0;
                            break;
                        case "glory_score_all":
                            outLog[sKey] = rkPlayer.pvpMgr.glory_score_all || 0;
                            break;
                        default: break;
                    }
                }
                catch (e) {
                    outLog[sKey] = '';
                }
            }
            var equips = rkPlayer.m_equipMgr.getLordEquip();
            for (let i = 0; i < equips.length; i++) {
                let f = equips[i];
                if (f) {
                    outLog['equip' + (i + 1)] = f.eId;
                    outLog['equip_level_' + (i + 1)] = f.eLevel;
                    outLog['equip_star_' + (i + 1)] = f.eStar;
                }
                else {
                    outLog['equip' + (i + 1)] = '';
                    outLog['equip_level_' + (i + 1)] = 0;
                    outLog['equip_star_' + (i + 1)] = 0;
                }
            }
        }
        return outLog;
    }
    mkdirsSync(dirpath, mode) {
        mode = mode || 511;
        if (!fs.existsSync(dirpath)) {
            var pathtmp;
            if (dirpath[0] == '/')
                pathtmp = '/';
            var dirs = dirpath.split(path.sep);
            for (var i = 0; i < dirs.length; i++) {
                var dirname = dirs[i];
                if (dirname.length == 0)
                    continue;
                if (pathtmp) {
                    pathtmp = path.join(pathtmp, dirname);
                }
                else {
                    pathtmp = dirname;
                }
                if (!fs.existsSync(pathtmp)) {
                    fs.mkdirSync(pathtmp, mode);
                }
            }
        }
        return true;
    }
    get path() {
        return TeConfig_1.configInst.get('logMgr.threepath');
    }
    _saveCache() {
        if (!this.path) {
            this._catch.clear();
            return;
        }
        this.mkdirsSync(this.path);
        let keys = this._catch.keys;
        for (let j = 0; j < keys.length; j++) {
            // let logName = configInst.get('serverid') + '.' + keys[j] + '.' + TeDate.DateToLogStr(new Date()) + '.tga.log'
            let logName = TeConfig_1.configInst.get('serverid') + TeTool_1.TeDate.DateToLogStr(new Date()) + '.tga.log';
            let fileName = path.join(this.path, logName);
            let write_buff = '';
            let cache = this._catch.get(keys[j]);
            for (let i = 0; i < cache.length; i++) {
                write_buff += JSON.stringify(cache[i], function (k, v) {
                    if (typeof v == 'string') {
                        v = v.replace(/"/g, '\\"');
                    }
                    return v;
                }) + '\n';
                if (i != 0 && i % 20 == 0) {
                    fs.writeFile(fileName, write_buff, { flag: 'a+' }, () => { });
                    write_buff = '';
                }
            }
            if (write_buff.length != 0) {
                fs.writeFile(fileName, write_buff, { flag: 'a+' }, () => { });
                write_buff = '';
            }
        }
        this._catch.clear();
    }
}
exports.ThreeLogMgr = ThreeLogMgr;
//# sourceMappingURL=ThreeLogDef.js.map