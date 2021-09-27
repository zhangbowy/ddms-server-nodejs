"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeLogMgr = exports.PayTypeLog = void 0;
const fs = require("fs");
const path = require("path");
const SePlayer_1 = require("./PlayerMgr/SePlayer");
const TeTool_1 = require("./TeTool");
const TeConfig_1 = require("./lib/TeConfig");
const ThreeLogDef_1 = require("./ThreeLogDef");
var gappid = 1145326931;
exports.PayTypeLog = {
    zuanshi: 'zuanshi',
    jinbi: 'gold',
};
class TeLogMgr {
    constructor() {
        // private m_kNet: TeNet;
        this.close = true;
        this._three_ = new ThreeLogDef_1.ThreeLogMgr();
        // 这里导出日志
        this._catch = {};
        this.close = (TeConfig_1.configInst.get('logMgr.open_path') == "true") ? false : true;
        if (!this.close) {
            setInterval(this._saveCache.bind(this), 2000);
        }
    }
    // private _net_ready = false;
    connectLogServer(url) {
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
    itemLog(rkPlayer, itemid, num, bfnum, type, sub_reason) {
        this._three_.itemLog(rkPlayer, itemid, num, bfnum, type, sub_reason);
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "item_id",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "reason_type",
            "moneytype1",
            "change_amt1",
            "moneytype2",
            "change_amt2",
            "dh_param1",
            "dh_param2",
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
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_item', outParam));
    }
    // add score soldier skilla skillb
    heroLog(rkPlayer, type, heroid, nownum, bfnum) {
        this._three_.heroLog(rkPlayer, type, heroid, nownum, bfnum);
        nownum = nownum || 0;
        bfnum = bfnum || 0;
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "type",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "race_id",
            "dh_param1",
            "dh_param2",
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
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    activityExchange(rkPlayer, activityId, exchangeId, type, targetId) {
        this._three_.activityExchange(rkPlayer, activityId, exchangeId, type, targetId);
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "type",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "race_id",
            "dh_param1",
            "dh_param2",
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
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    moneylog(rkPlayer, type, nownum, bfnum, value1, value2) {
        this._tableMoney('zuanshi', rkPlayer, type, nownum, bfnum, value1, value2);
    }
    goldLog(rkPlayer, type, nownum, bfnum) {
        this._tableMoney('gold', rkPlayer, type, nownum, bfnum);
    }
    _tableMoney(logType, rkPlayer, type, nownum, bfnum, value1, value2) {
        this._three_._tableMoney(logType, rkPlayer, type, nownum, bfnum, value1, value2);
        nownum = nownum || 0;
        bfnum = bfnum || 0;
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "moneytype",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "reason_type",
            "dh_param1",
            "dh_param2",
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
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_money', outParam));
    }
    scoreLog(rkPlayer, type, nownum, bfnum) {
        this._three_.scoreLog(rkPlayer, type, nownum, bfnum);
        nownum = nownum || 0;
        bfnum = bfnum || 0;
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "type",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "race_id",
            "dh_param1",
            "dh_param2",
            "subtype",
        ];
        var outParam = {
            'type': 'score',
            'subtype': type,
            'before_cnt': bfnum,
            'after_cnt': nownum,
            'change_cnt': nownum - bfnum,
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    /**
     * 签到奖励日志
     * @param rkPlayer
     * @param type
     * @param nownum
     * @param bfnum
     */
    signLog(rkPlayer, type, nownum, bfnum) {
        this._three_.signLog(rkPlayer, type, nownum, bfnum);
        nownum = nownum || 0;
        bfnum = bfnum || 0;
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "type",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "race_id",
            "dh_param1",
            "dh_param2",
            "subtype",
        ];
        var outParam = {
            'type': 'sign',
            'subtype': type,
            'before_cnt': bfnum,
            'after_cnt': nownum,
            'change_cnt': nownum - bfnum,
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    pvpBoxLog(rkPlayer, type, id, boxType, level, cardList, value) {
        this._three_.pvpBoxLog(rkPlayer, type, id, boxType, level, cardList, value);
        cardList = cardList || [];
        var cards = [];
        for (var i = 0; i < cardList.length; i++) {
            var r = cardList[i];
            if (r)
                cards.push(r.kid);
        }
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "type",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "race_id",
            "dh_param1",
            "dh_param2",
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
            'before_cnt': id,
            'after_cnt': boxType,
            'change_cnt': level,
            "type_value1": cards[0] || '',
            "type_value2": cards[1] || '',
            "type_value3": cards[2] || '',
            "type_value4": cards[3] || '',
            "type_value5": cards[4] || '',
            "type_value6": cards[5] || '',
            "type_value7": cards[6] || '',
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    createlog(rkPlayer, arrayList, type, outParam) {
        if (this.close) {
            return null;
        }
        // 生成日志的通用接口
        var outLog = {
            logtype: type,
            logfile: type + '_' + TeTool_1.TeDate.DateToLogStr(Date.now()) + `_${gappid}.log`,
        };
        for (var key in arrayList) {
            var sKey = arrayList[key];
            switch (sKey) {
                case 'product_id':
                    outLog[sKey] = gappid;
                    break; //游戏id（怼怼游戏id：1146308431）
                case 'zid':
                    outLog[sKey] = TeConfig_1.configInst.get('serverid') || 0;
                    break;
                case 'record_time':
                    outLog[sKey] = TeTool_1.TeDate.DateToStr(Date.now());
                    break;
                case 'vip_level':
                    outLog[sKey] = 0;
                    break;
                case 'imei':
                    outLog[sKey] = '';
                    break;
                case 'equipType':
                    outLog[sKey] = '';
                    break;
                case 'netWorkType':
                    outLog[sKey] = '';
                    break;
                case 'dh_param1':
                    outLog[sKey] = '';
                    break;
                case 'dh_param2':
                    outLog[sKey] = '';
                    break;
                case 'version':
                    outLog[sKey] = global.version || '0.0.0.1';
                    break;
                case "highResolution":
                    outLog[sKey] = 0;
                    break; //	string		设备分辨率高
                case "lowResolution":
                    outLog[sKey] = 0;
                    break; //	string		设备分辨率宽
                case "logout_type":
                    outLog[sKey] = "0";
                    break;
                case "hero_type":
                    outLog[sKey] = "0";
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
            for (var key in arrayList) {
                var sKey = arrayList[key];
                switch (sKey) {
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
                        outLog[sKey] = rkPlayer.loginInfo ? rkPlayer.loginInfo.channel : '';
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
                    case 'device_os':
                        outLog[sKey] = rkPlayer.loginInfo ? rkPlayer.loginInfo['device_os'] : '';
                        break;
                    case 'last_login_time':
                        outLog[sKey] = TeTool_1.TeDate.DateToStr(rkPlayer.baseInfo.lastLoginTime);
                        break;
                    case 'register_time':
                        outLog[sKey] = TeTool_1.TeDate.DateToLogStr(rkPlayer.baseInfo.createtime);
                        break;
                    case 'screenSize':
                        outLog[sKey] = rkPlayer.loginInfo ? rkPlayer.loginInfo['screenSize'] : '';
                        break;
                    case 'online_time':
                        outLog[sKey] = rkPlayer.baseInfo.onlinetime || 0;
                        break;
                    case "char_name":
                        outLog[sKey] = rkPlayer.name;
                        break;
                    case "scene":
                        outLog[sKey] = rkPlayer.loginInfo["scene"] || '';
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
        }
        var str = {
            logtype: outLog.logtype,
            logfile: outLog.logfile,
            src: '',
            org: outLog
        };
        for (var key in arrayList) {
            var val = outLog[arrayList[key]];
            if (outLog == null || outLog == undefined) {
                val = '';
            }
            str.src += val + ',';
        }
        return str;
    }
    createChar(rkPlayer) {
        this._three_.createChar(rkPlayer);
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "dh_param1",
            "dh_param2",
            "hero_type",
        ];
        this.addLog(this.createlog(rkPlayer, outList, "tab_create"));
    }
    register(rkPlayer, shareuid, scene, appId) {
        this._three_.register(rkPlayer, shareuid, scene, appId);
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "version",
            "device_os",
            "equipType",
            "imei",
            "highResolution",
            "lowResolution",
            "screenSize",
            "osVersion",
            "netWorkType",
            "ip",
            "dh_param1",
            "dh_param2",
            "shareuid",
        ];
        var outParam = {
            'shareuid': shareuid
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_register', outParam));
    }
    enter(rkPlayer) {
        this._three_.enter(rkPlayer);
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "pvp_level",
            "pve_level",
            "vip_level",
            "device_os",
            "imei",
            "last_login_time",
            "register_time",
            "ip",
            "equipType",
            "osVersion",
            "screenSize",
            "netWorkType",
            "dh_param1",
            "dh_param2", //	string		预留固定字段2
        ];
        this.addLog(this.createlog(rkPlayer, outList, 'tab_login'));
    }
    leave(rkPlayer, leave_type) {
        this._three_.leave(rkPlayer);
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "pvp_level",
            "pve_level",
            "vip_level",
            "online_time",
            "logout_type",
            "dh_param1",
            "dh_param2",
            "pvp_score",
            "leave_type",
        ];
        var outParam = {
            'leave_type': leave_type,
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_logout', outParam));
    }
    pvpLog(rkPlayer, rid, type, bWin, fightTime, gold = 0, loopwin = 0, fscore = 0, totwin = 0, totfail = 0) {
        this._three_.pvpLog(rkPlayer, rid, type, bWin, fightTime, gold, loopwin, fscore, totwin, totfail);
        var outList = [
            'product_id',
            'zid',
            'iuin',
            'char_id',
            'dh_id',
            'channel',
            'record_time',
            'map_id',
            'race_id',
            'is_win',
            'pvp_level',
            'pve_level',
            'vip_level',
            'race_time',
            'dh_param1',
            'dh_param2',
            'kill',
            'be_killed',
            'coin',
            'loopwin',
            'fscore',
            'totwin',
            'totfail' // 总败场
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
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_map_pvp', outParam));
    }
    pveLog(rkPlayer, levelid, times, bWin, time) {
        this._three_.pveLog(rkPlayer, levelid, times, bWin, time);
    }
    pvepkLog(rkPlayer, fightTime, bWin, attack_rank, define_rank, pve_pk_formation, define_pve_pk_formation) {
        this._three_.pvepkLog(rkPlayer, fightTime, bWin, attack_rank, define_rank, pve_pk_formation, define_pve_pk_formation);
    }
    maillog(rkPlayer, mailid, type, mailinfo) {
        this._three_.maillog(rkPlayer, mailid, type, mailinfo);
    }
    market(rkPlayer, kID, payType, cost, itemid, buynum, discount) {
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
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_market', outParam));
    }
    buttonClickLog(rkPlayer, type, page, ...args) {
        this._three_.buttonClickLog(rkPlayer, type, page, ...args);
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "button_id",
            "page_id",
            "dh_param1",
            "dh_param2",
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
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_button', outParam));
    }
    invitecodeLog(uid, code, r) {
        this._three_.invitecodeLog(uid, code, r);
    }
    rechargeLog(rkPlayer, type = '', amount = 0, time = 0, orderid = '') {
        amount = amount / 100;
        this._three_.rechargeLog(rkPlayer, type, amount, time, orderid);
        var outList = [
            'product_id',
            'zid',
            'iuin',
            'char_id',
            'dh_id',
            'channel',
            'record_time',
            'recharge_type',
            'recharge_amt',
            'register_time',
            'dh_param1',
            'dh_param2',
            'pvp_level',
            'pve_level',
            'vip_level',
            'orderid',
        ];
        var outParam = {
            'recharge_type': type,
            'recharge_amt': amount,
            'orderid': orderid
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_recharge', outParam));
    }
    rechargeStateLog(rkPlayer, type = '', amount = 0, time = 0, orderid = '', subtype = '') {
        amount = amount / 100;
        this._three_.rechargeStateLog(rkPlayer, type, amount, time, orderid, subtype);
    }
    shareLog(rkPlayer, type, now, bf) {
        this._three_.shareLog(rkPlayer, type, now, bf);
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "type",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "race_id",
            "dh_param1",
            "dh_param2",
            "subtype",
        ];
        var outParam = {
            'type': 'share',
            'subtype': type,
            'before_cnt': bf,
            'after_cnt': now,
            'change_cnt': now - bf,
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    taskLog(rkPlayer, type, taskID) {
        this._three_.taskLog(rkPlayer, type, taskID);
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "type",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "race_id",
            "dh_param1",
            "dh_param2",
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
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    guideLog(rkPlayer, now, bf, index) {
        this._three_.guideLog(rkPlayer, now, bf, index);
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "type",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "race_id",
            "dh_param1",
            "dh_param2",
            "subtype",
        ];
        var outParam = {
            'type': 'guide',
            'subtype': 'type',
            'before_cnt': bf,
            'after_cnt': now,
            'change_cnt': now - bf,
        };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    unsync_race(rkPlayer, rid, racetype) {
        this._three_.unsync_race(rkPlayer, rid, racetype);
    }
    unsync_player(rkPlayer, count) {
        this._three_.unsync_player(rkPlayer, count);
    }
    gmOprLog(gmid, uid, type, value1, value2, value3, value4, value5, value6, reason) {
        this._three_.gmOprLog(gmid, uid, type, value1, value2, value3, value4, value5, value6, reason);
        var outList = [
            "product_id",
            "zid",
            "iuin",
            "char_id",
            "dh_id",
            "channel",
            "record_time",
            "type",
            "before_cnt",
            "after_cnt",
            "change_cnt",
            "race_id",
            "dh_param1",
            "dh_param2",
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
        };
        this.addLog(this.createlog(null, outList, 'tab_action', outParam));
    }
    fightFormationLog(rkPlayer, type, bwin, rid, usetime, castlehp, lordid, equips, pvestar, levelid, issweep, ishost, host_skills, ...formation) {
        this._three_.fightFormationLog(rkPlayer, type, bwin, rid, usetime, castlehp, lordid, equips, pvestar, levelid, issweep, ishost, host_skills, ...formation);
    }
    equipLog(rkPlayer, type, equipid, equipkid, items, num, bfnum, enchant) {
        this._three_.equipLog(rkPlayer, type, equipid, equipkid, items, num, bfnum, enchant);
    }
    pveCheatLog(rkPlayer, type, race_id, cheat_level, equip_score) {
        this._three_.pveCheatLog(rkPlayer, type, race_id, cheat_level, equip_score);
    }
    limitedGiftLog(rkPlayer, mallId) {
        this._three_.limitedGiftLog(rkPlayer, mallId);
        var outList = ['mallId'];
        var outParam = { 'type': 'limitedgift', 'mallId': mallId };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    followPublic(rkPlayer, isComplete, isAdd) {
        this._three_.followPublic(rkPlayer, isComplete, isAdd);
        var outList = ['isComplete', 'isAdd'];
        var outParam = { 'isComplete': isComplete, 'isAdd': isAdd };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    smallProgram(rkPlayer, isComplete, isAdd) {
        this._three_.smallProgram(rkPlayer, isComplete, isAdd);
        var outList = ['isComplete', 'isAdd'];
        var outParam = { 'isComplete': isComplete, 'isAdd': isAdd };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    enterProgram(rkPlayer, appId, rechargeNum) {
        this._three_.enterProgram(rkPlayer, appId, rechargeNum);
        var outList = ['appId', 'rechargeNum'];
        var outParam = { 'appId': appId, 'rechargeNum': rechargeNum };
        this.addLog(this.createlog(rkPlayer, outList, 'tab_action', outParam));
    }
    threeOrderlogs(rkPlayer, type, state, cporder, itemid, itemnum, dhorder = "") {
        this._three_.threeOrderlogs(rkPlayer, type, state, cporder, itemid, itemnum, dhorder);
    }
    callBackLogs(rkPlayer, type, num1, num2) {
        this._three_.callBackLogs(rkPlayer, type, num1, num2);
    }
    get path() {
        return TeConfig_1.configInst.get('logMgr.path') || './';
    }
    log(message, ...optionalParams) {
        console.log(message);
        if (message) {
            fs.writeFile(path.join(this.path, 'runtime.log'), JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
    }
    addLog(rkLog) {
        // mysqlInst.instrtData(rkLog.logtype, createInsertInfo(rkLog.src));
        // global.matchMgr.sendMSData({
        //     cmd: 'addlog',
        //     type: rkLog.logtype,
        //     info: rkLog.org
        // });
        if (this.close) {
            return;
        }
        var rkObj;
        if (!this._catch.hasOwnProperty(rkLog.logtype)) {
            this._catch[rkLog.logtype] = new TeTool_1.HashMap();
        }
        rkObj = this._catch[rkLog.logtype];
        rkObj.add(rkLog.logfile, rkLog.src);
    }
    _saveCache() {
        for (var key in this._catch) {
            var rHash = this._catch[key];
            if (!rHash) {
                continue;
            }
            var fpath = path.join(this.path, key);
            this.mkdirsSync(fpath);
            var keys = rHash.keys;
            for (var ij = 0; ij < keys.length; ij++) {
                var rList = rHash.get(keys[ij]);
                if (!rList || rList.length == 0)
                    continue;
                var fileName = path.join(fpath, keys[ij]);
                var cValue = '';
                for (var i = 0; i < rList.length; i++) {
                    cValue += rList[i] + '\n';
                    if (i != 0 && i % 20 == 0) {
                        fs.writeFile(fileName, cValue, { flag: 'a+' }, () => { });
                        cValue = '';
                    }
                }
                if (cValue.length > 0) {
                    fs.writeFile(fileName, cValue, { flag: 'a+' }, () => { });
                }
            }
        }
        this._catch = {};
    }
}
exports.TeLogMgr = TeLogMgr;
//# sourceMappingURL=TeLogMgr.js.map