"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeNetMatch = void 0;
// 这里是当匹配模块独立的时候使用的匹配数据接口
/* 负责处理其它服务器接口过来的数据操作*/
const TeNet_1 = require("../lib/TeNet");
const TeConfig_1 = require("../lib/TeConfig");
const interface_1 = require("../Res/interface");
class SeMSInfo {
    constructor(linkid) {
        this.id = '';
        this.linkid = '';
        this.ready = 0;
        this.id = '';
        this.linkid = linkid;
        this.ready = 0;
    }
}
class SeNetMatch extends TeNet_1.TeNet {
    constructor(url, readyFunc, isCross = false, ...args) {
        super();
        this.allServers = {};
        this.connect(url);
        this._readyFunc = readyFunc;
        this.isCross = isCross;
        this.on('data', this._onReciveData.bind(this));
        this.on('connected', this._onConnected.bind(this));
        this.on('disconnect', this._onDisconnect.bind(this));
        this.zlib_open = true;
    }
    _onDisconnect(linkid, data) {
        if (this.allServers.hasOwnProperty(linkid)) {
            // 现在还不知道断开后重新连接上的sockeid会不会变化，先按照变化的处理
            delete this.allServers[linkid];
        }
        else {
            global.logMgr.log('disconnect');
        }
    }
    _onConnected(linkid) {
        global.logMgr.log('connect to MS sucess' + linkid);
        if (this.allServers.hasOwnProperty(linkid)) {
            // 如果已经存在
            global.logMgr.log('connceted error same socketid');
        }
        else {
            var newServer = new SeMSInfo(linkid);
            this.allServers[linkid] = newServer;
            this.onSendRegist();
        }
    }
    _onReciveData(linkid, data) {
        if (!this.allServers.hasOwnProperty(linkid)) {
            this.disconnect(linkid);
            return;
        }
        var serverData = this.allServers[linkid];
        // if (data.cmd !== 'registret' && !serverData.ready) {
        //     // 没有注册成功的时候，服务器只处理注册信息
        //     return;
        // }
        //   global.logMgr.log(data);
        switch (data.cmd) {
            case 'needregist':
                this.onSendRegist();
                break;
            case 'registret':
                this._processRegistRet(serverData, data);
                break;
            case "pvps":
                global.playerMgr.onMatchPvp(data.uid, data.raceinfo, data.mode, data.rmode);
                break;
            case 'pvpv726':
                global.playerMgr.onMatchPvpv726Ret(data.uid, data.raceinfo, data.mode, data.rmode, data.randomList);
                break;
            case 'pve_2v2':
                global.playerMgr.onMatchPve2v2Ret(data.uid, data.raceinfo, data.randomList);
                break;
            case 'pve_1v2':
                global.playerMgr.onMatchPve1v2Ret(data.uid, data.raceinfo, data.mode, data.rmode, data.randomList, data.formation);
                break;
            case "randlist":
                global.playerMgr.randlist(data.uid, data.list, data.mode, data.bind);
                break;
            case "cancell":
                global.playerMgr.cancell_match_ret(data.uid, data.mode);
                break;
            case "room_opr":
                global.playerMgr.room_opr(data.uid, data.type, data.joinkey, data.info, data.room_type);
                break;
            case "chartUnit":
                global.netMgr.sendChartUnit(data.uid, data.data);
                break;
            case "joinonline":
                global.playerMgr.onMatchOlPvp(data.rid, data.uid, data.checkKey, data.rurl, data.oscore, data.mode);
                break;
            case "queryvideo":
                global.playerMgr.onMatchVideo(data.rid, data.uid, data.infos, data.level, data.rmode);
                break;
            case "queryvideod":
                global.playerMgr.onMatchVideod(data.rid, data.uid, data.infos);
                break;
            case "getkillrecord_ret":
                global.playerMgr.onkillrecord(data.rid, data.uid, data.infos);
                break;
            case "pvp_result":
                global.playerMgr.onPvpResult(data, this.isCross);
                break;
            case "liveraces":
                global.playerMgr.onRaceLives(data);
                break;
            //好友相关的操作交流
            case 'init_friend':
                global.playerMgr.init_friends(data.uid, data.infos);
                break;
            case 'find_player':
                global.playerMgr.find_friend_ret(data.uid, data.info);
                break;
            case 'friend_opr_ret':
                global.playerMgr.friend_opr_ret(data.uid, data.info);
                break;
            case 'route_friend':
                global.playerMgr.friend_route(data.uid, data);
                break;
            case 'init_plt_friend':
                global.playerMgr.init_plt_friends(data.uid, data.infos);
                break;
            //微信好友相关的操作交流
            case 'init_wx':
                global.playerMgr.wx_friend_opr_ret(data.uid, data.info);
                break;
            //荣耀战区击杀通知
            case 'kill_announcement':
                let content = {};
                content['chararea'] = global.resMgr.getPltName(data.killer_plt);
                content['charname'] = data.killer_name;
                content['chararea2'] = global.resMgr.getPltName(data.died_plt);
                content['charname2'] = data.died_name;
                if (data.all_plt) {
                    global.playerMgr.sendAnnouncement(interface_1.SeEnumnoticetexteType.RongYaoJiBaiQuanFuTongZhi, content, '', data.killer_id);
                }
                else {
                    global.playerMgr.sendAnnouncement(interface_1.SeEnumnoticetexteType.RongYaoJiBaiDanFuTongZhi, content, '', data.killer_id);
                }
        }
    }
    ;
    sendMSData(data) {
        // 这里强制发送自己的大区id和对应平台
        data['_sys_'] = {
            plt: TeConfig_1.configInst.get('plt'),
            serverid: TeConfig_1.configInst.get('serverid')
        };
        this.sendData(data);
    }
    ;
    // 这里是主动 connect过去的但是主要流程还是和listen的一样吧
    _processRegistRet(serverData, data) {
        if (data.type == true) {
            serverData.ready = true;
            serverData.id = data.id;
            //global.prepare.setProcess(__filename,true);
            if (this._readyFunc) {
                this._readyFunc();
            }
            this.fd_total_state(global.playerMgr.onlinePlayerState());
        }
        else {
            global.logMgr.log('Regist to MS Failed SameID');
        }
    }
    ;
    onlineMatch(...args) {
        var mode = args[0];
        args.splice(0, 1);
        if (!args[1] || args[1].length == 0)
            return;
        var cmd = '';
        switch (mode) {
            case '1v1':
                cmd = 'onlinematch';
                break;
            // case '1v1': cmd = 'onlinewuxianhuoli'; break;
            case '2v2':
                cmd = 'onlinematch2v2';
                break;
            case 'peakmatch':
                cmd = 'onlinematchPeak';
                break;
            case 'shangjinmatch':
                cmd = 'onlinematchShangjin';
                break;
            case 'wuxianhuoli':
                cmd = 'onlinewuxianhuoli';
                break;
            case '1v1_robot':
                cmd = 'onlinematch_robot';
                break;
            default: return;
        }
        var send = {
            cmd: cmd,
            data: args
        };
        this.sendMSData(send);
    }
    getRandomList(...args) {
        if (!args[1] || args[1].length == 0)
            return;
        var send = {
            cmd: "getrandomList",
            data: args
        };
        this.sendMSData(send);
    }
    cancellOnline(...args) {
        var cmd = '';
        switch (args[2]) {
            case '1v1':
                cmd = 'cancellonline';
                break;
            case 'peakmatch':
                cmd = 'cancellonlinePeak';
                break;
            case 'wuxianhuoli':
                cmd = 'cancellonlinewuxianhuoli';
                break;
            case 'shangjinmatch':
                cmd = 'cancellonlineShangjin';
                break;
            default:
                cmd = 'cancellonline2v2';
                break; //case '2v2': 
        }
        var send = {
            cmd: cmd,
            data: args
        };
        this.sendMSData(send);
    }
    //----------------------------------------------------------//
    onSendRegist() {
        var data = {
            'cmd': 'regist',
            'passwd': 'chenkai',
            'type': 'cloudserver',
            'id': TeConfig_1.configInst.get('serverid'),
            'plt': TeConfig_1.configInst.get('logMgr.path'),
        };
        if (TeConfig_1.configInst.get("cheatmode") && TeConfig_1.configInst.get('plts')) {
            data['plts'] = TeConfig_1.configInst.get('plts');
        }
        this.sendMSData(data);
    }
    ;
    matchPvp(...args) {
        var cmds = {
            cmd: 'findPvp',
            data: args
        };
        this.sendMSData(cmds);
    }
    //----------好友信息相关的----------------//
    /**
     * 玩家更新自己的好友显示部分信息
     * @param uid
     * @param finfo
     */
    fd_loadInfo(uid, friends) {
        var info = {
            cmd: 'load_friend',
            uid: uid,
            plt_friends: friends
        };
        this.sendMSData(info);
    }
    fd_load_plt_friends(uid, f) {
        var info = {
            cmd: 'load_plt_friend',
            uid: uid,
            plt_friends: f
        };
        this.sendMSData(info);
    }
    fd_route_friend(uid, fuid, data = {}) {
        data['cmd'] = 'route_friend';
        data['uid'] = uid;
        data['fuid'] = fuid;
        this.sendMSData(data);
    }
    fd_route_wx_friend(uid, data = {}) {
        data['cmd'] = 'route_wx_friend';
        data['uid'] = uid;
        this.sendMSData(data);
    }
    /**
     * 更新玩家自己的状态， 在线 离线 比赛中等
     * @param uid
     * @param state
     */
    fd_PlayerState(info) {
        info['cmd'] = 'fd_up_state';
        this.sendMSData(info);
    }
    fd_total_state(infos) {
        var info = {
            cmd: 'fd_total_state',
            infos: infos
        };
        this.sendMSData(info);
    }
    /**
     * 添加好友，其实是关注对方
     * @param uid
     * @param ids
     */
    fd_make_friend(uid, fuid) {
        var info = {
            cmd: 'make_friend',
            uid: uid,
            fuid: fuid
        };
        this.sendMSData(info);
    }
    /**
    * 强制添加好友
    * @param uid
    * @param ids
    */
    fd_force_friend(uid, fuid) {
        var info = {
            cmd: 'force_friend',
            uid: uid,
            fuid: fuid
        };
        this.sendMSData(info);
    }
    fd_delete_friend(uid, fuid) {
        var info = {
            cmd: 'delete_friend',
            uid: uid,
            fuid: fuid
        };
        this.sendMSData(info);
    }
    fd_find_friend(uid, fuid) {
        var info = {
            cmd: 'find_player',
            uid: uid,
            fuid: fuid
        };
        this.sendMSData(info);
    }
    clear_make_player_apply(uid) {
        var info = {
            cmd: 'clear_make_player_apply',
            uid: uid
        };
        this.sendMSData(info);
    }
    //-------------------------------------------//
    /**
     * 查看录像
     */
    queryVideo(uid, level, rmode) {
        var info = {
            cmd: 'queryvideo',
            uid: uid,
            level: level,
            rmode: rmode,
        };
        this.sendMSData(info);
    }
    /**
     * 查看详细录像
     */
    queryDetailVideos(uid, vids) {
        var info = {
            cmd: 'queryvideod',
            uid: uid,
            vids: vids,
        };
        this.sendMSData(info);
    }
}
exports.SeNetMatch = SeNetMatch;
//# sourceMappingURL=SeNetMatch.js.map