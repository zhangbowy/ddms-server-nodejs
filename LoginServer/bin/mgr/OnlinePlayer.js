"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onlineMgrInst = exports.OnlinePlayer = exports.StaDefine = void 0;
const TeTool_1 = require("../lib/TeTool");
const LoginCheck_1 = require("./LoginCheck");
const NetMgr_1 = require("../NetMgr/NetMgr");
const GMMgr_1 = require("./GMMgr");
const ExtInfoLoader_1 = require("../apilibs/ExtInfoLoader");
const fs_1 = require("fs");
const serverMgr_1 = require("../NetMgr/serverMgr");
const LogMgr_1 = require("../lib/LogMgr");
var log = LogMgr_1.LogMgr.log('OnlinePlayer');
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
exports.StaDefine = {
    dailyinfo: 'sta_dailyinfo',
};
// 这里需要维护所有玩家的在线状态，cloudserver 需要对Ls负责，玩家在线离线都需要上报通知,这里负责维护玩家的状态的唯一性
class OnlinePlayer {
    constructor() {
        // super();
    }
    /**
     * cls 和 ls 网络断开的时候把 ls 上面的玩家状态暂时保留一段时间
     */
    openTimeOut() {
        //this.checkTimeOut = Date.now();
        exports.onlineMgrInst.addTimeOut(this.id, this.plt, this.clsid);
    }
    /**
     * cls 和 ls 网络断开的时候把 ls 上面的玩家状态暂时保留一段时间
     */
    closeTimeOut() {
        //     this.checkTimeOut = 0;
        exports.onlineMgrInst.delTimeOut(this.id, this.plt);
    }
}
exports.OnlinePlayer = OnlinePlayer;
var TimeOutTime = 30 * 1000;
class SeDailyHourInfo {
    constructor() {
        this.max = 0;
        this.maxt = 0;
        this.min = 0;
        this.mint = 0;
    }
}
class OnlinePlayerMgr {
    constructor() {
        this._lastHourTime = Date.now();
        this._hourInfo = new SeDailyHourInfo();
        this._lastminTime = Date.now();
        this._onlineplayerlist = new TeTool_1.HashMap();
        this._timeOutList = [];
        setInterval(this.update.bind(this), 2000);
    }
    addTimeOut(id, plt, serverid) {
        let find = false;
        for (let i = 0; i < this._timeOutList.length; i++) {
            let r = this._timeOutList[i];
            if (r && r.id == id && r.plt == plt) {
                r.checkTimeOut = Date.now();
                r.serverid = serverid;
                find = true;
                break;
            }
        }
        if (!find) {
            this._timeOutList.push({ id: id, checkTimeOut: Date.now(), plt: plt, serverid: serverid });
        }
    }
    delTimeOut(id, plt) {
        if (!id) {
            return;
        }
        for (let i = 0; i < this._timeOutList.length; i++) {
            let rkPlayer = this._timeOutList[i];
            if (rkPlayer && rkPlayer.id == id && rkPlayer.plt == plt) {
                this._timeOutList.splice(i, 1);
                i--;
            }
        }
    }
    get onlinePlayersNum() {
        var keys = this._onlineplayerlist.keys;
        var tot_num = 0;
        for (var i = 0; i < keys.length; i++) {
            var rList = this._onlineplayerlist.get(keys[i]);
            tot_num += rList.length;
        }
        return tot_num;
    }
    gmGetOnlinePlayer() {
        var players = [];
        var keys = this._onlineplayerlist.keys;
        for (var zi = 0; zi < keys.length; zi++) {
            var rList = this._onlineplayerlist.get(keys[zi]);
            for (var i = 0; i < rList.length; i++) {
                var rkPlayer = rList[i];
                if (rkPlayer) {
                    players.push({ account: rkPlayer.account, id: rkPlayer.id, loginInfo: rkPlayer.loginInfo, logintime: rkPlayer.logintime, plt: rkPlayer.plt });
                }
            }
        }
        return players;
    }
    gm_get_online_player(i_page, plt) {
        //  这里一页显示 10 个
        var page_size = 10;
        var r_list = this._onlineplayerlist.get(plt);
        var tot_page = Math.ceil(r_list.length / page_size);
        if (i_page >= tot_page && tot_page) {
            i_page = tot_page - 1;
        }
        var start_idx = i_page * page_size;
        var end_idx = Math.min((i_page + 1) * page_size, r_list.length);
        var infos = r_list.slice(start_idx, end_idx);
        return { infos: infos, page: i_page, tot_page: tot_page, i_tot_num: r_list.length };
    }
    kickPlayer(idOrAccount, plt) {
        var serverid;
        var id;
        var rkPlayer = this.getOnlinePlayer(idOrAccount, plt);
        if (rkPlayer) {
            id = rkPlayer.id;
            serverid = rkPlayer.clsid;
            log('kick', id);
        }
        if (serverid && id) {
            NetMgr_1.netMgrInst.sendKickAccount(serverid, [id]);
        }
    }
    kickAllPlayer(plt) {
        var servers = serverMgr_1.serverMonitInst.get_server_by_type_all('cls', plt);
        for (let i = 0; i < servers.length; i++) {
            if (servers[i]) {
                NetMgr_1.netMgrInst.sendKickAll(servers[i].id, plt);
            }
        }
    }
    update() {
        var nowTime = Date.now();
        var i = 0;
        for (i = 0; i < this._timeOutList.length; i++) {
            var rkPlayer = this._timeOutList[i];
            if (!rkPlayer) {
                continue;
            }
            // 检测一下玩家的在线状态之类的信息
            if (rkPlayer.checkTimeOut + TimeOutTime <= nowTime) {
                this.delOnlinePlayer(rkPlayer.id, rkPlayer.plt);
                this._timeOutList.splice(i, 1);
                i--;
            }
        }
        var onlineNum = this.onlinePlayersNum;
        if (nowTime - this._lastminTime > 60 * 1000) {
            this._lastminTime = nowTime;
            fs_1.writeFileSync('./playernum.log', onlineNum, { flag: "w+" });
            let onlineNum_oppo = this._onlineplayerlist.get('oppo').length;
            let onlineNum_vivo = this._onlineplayerlist.get('vivo').length;
            fs_1.writeFileSync('./playernum_oppo.log', onlineNum_oppo, { flag: "w+" });
            fs_1.writeFileSync('./playernum_vivo.log', onlineNum_vivo, { flag: "w+" });
        }
        if (this._hourInfo.max < onlineNum) {
            this._hourInfo.max = onlineNum;
            this._hourInfo.maxt = nowTime;
        }
        if (onlineNum != 0 && (this._hourInfo.min == 0 || this._hourInfo.min > onlineNum)) {
            this._hourInfo.min = onlineNum;
            this._hourInfo.mint = nowTime;
        }
        if (TeTool_1.TeDate.Isdiffhour(this._lastHourTime, nowTime)) {
            // 记录一下在线人数 1小时一条信息 记录的是一小时内的最高在线数量,最低在线数量
            this._lastHourTime = nowTime;
            var rkReSorted = GMMgr_1.redistInst.getSortedSet(exports.StaDefine.dailyinfo, 0);
            var recordScore = parseInt(TeTool_1.TeDate.Date_Format(new Date(nowTime), 'yyyyMMddhh'));
            //this._hourInfo.maxt = nowTime;
            rkReSorted.add(recordScore, JSON.stringify(this._hourInfo));
            this._hourInfo = new SeDailyHourInfo();
        }
    }
    getOnlinePlayerCSId(charid, plt) {
        var rkOnlinePlayer = this.getOnlinePlayer(charid, plt);
        if (rkOnlinePlayer && rkOnlinePlayer.plt == plt) {
            return rkOnlinePlayer.clsid;
        }
        // 如果找不到就随机一个
        var linkid = serverMgr_1.serverMonitInst.get_server_link_by_type('cls', plt);
        let s = serverMgr_1.serverMonitInst.get_server_l(linkid);
        if (s)
            return s.id;
        return null;
    }
    onLogin(_sys_, account, passwd, linkid, clientid, info) {
        var queryparam = {
            account: account,
            uid: 0,
            type: '',
            clientid: clientid,
            sdwInfo: info,
            linkid: linkid,
            _sys_: _sys_
        };
        LoginCheck_1.SeLoginCheck.onAccount(queryparam, ((ret, _queryparam) => {
            exports.onlineMgrInst.onLoginEnd(_queryparam, ret);
            if (_queryparam.sdwInfo && _queryparam.sdwInfo.openid && _queryparam.sdwInfo.openkey) {
                ExtInfoLoader_1.QzoneManagerInst.loadInfos(_sys_, _queryparam.uid, _queryparam.sdwInfo.openid, _queryparam.sdwInfo.openkey);
            }
            else
                NetMgr_1.netMgrInst.sendExtInfo(_sys_.serverid, _queryparam.uid, {});
        }).bind(this));
    }
    onLoginSD(_sys_, linkid, clientid, info) {
        if (!info || !info.uid)
            return;
        var queryparam = {
            account: info.uid.toString(),
            uid: parseInt(info.uid),
            clientid: clientid,
            sdwInfo: info,
            linkid: linkid,
            _sys_: _sys_
        };
        LoginCheck_1.SeLoginCheck.onLoginSD(queryparam, ((ret, _queryparam) => {
            this.onLoginEnd(_queryparam, ret);
            if (_queryparam.type == 'success') {
                if (_queryparam.sdwInfo && _queryparam._sys_.plt == 'qzone' && _queryparam.sdwInfo.openid && _queryparam.sdwInfo.openkey) {
                    ExtInfoLoader_1.QzoneManagerInst.loadInfos(_sys_, _queryparam.uid, _queryparam.sdwInfo.openid, _queryparam.sdwInfo.openkey);
                }
                else {
                    NetMgr_1.netMgrInst.sendExtInfo(_sys_.serverid, _queryparam.uid, {});
                }
            }
        }).bind(this));
    }
    onLoginEnd(queryparam, lock_info) {
        var account = queryparam.account;
        var id = queryparam.uid;
        var type = queryparam.type;
        var linkid = queryparam.linkid;
        var clientid = queryparam.clientid;
        var sdwInfo = queryparam.sdwInfo;
        if (type != 'success') {
            NetMgr_1.netMgrInst.sendLoginFailed(linkid, account, type, clientid, lock_info.un_lock_time || 0);
        }
        else {
            if (this.isOnline(id, queryparam._sys_.plt)) {
                //this.netMgrInst.sendLoginFailed(linkid,account,'isonline',clientid);
                // this.onLoginEnd(account,0,'isonline',linkid,clientid);
                // 这里修改策略，如果在线的话就踢掉老的
                this.kickPlayer(id, queryparam._sys_.plt);
            }
            // console.log(account + id + linkid + clientid);
            this.addOnlinePlayer(account, id, linkid, clientid, sdwInfo, Date.now(), queryparam._sys_.plt);
            NetMgr_1.netMgrInst.sendLoginSucess(linkid, account, id, clientid, sdwInfo);
        }
    }
    onLeave(_sys_, uid, role, serverid) {
        // 这里如果玩家离线的话，要匹配一下玩家账号和登陆的cls，
        var rkOnlinePlayer = this.getOnlinePlayer(uid, _sys_.plt);
        if (!rkOnlinePlayer) {
            return;
        }
        if (rkOnlinePlayer.clsid == serverid) {
            this.delOnlinePlayer(uid, _sys_.plt);
            if (role) {
                // 离线的时候有上报的话再记录一下玩家信息
                LoginCheck_1.SeLoginCheck.cache_account_info(uid.toString(), _sys_.plt, role);
            }
        }
    }
    checkOnlineRet(_sys_, account, id, bOnline, serverid) {
        var rkOnlinePlayer = this.getOnlinePlayer(id, _sys_.plt);
        if (!rkOnlinePlayer || rkOnlinePlayer.clsid != serverid) {
            return;
        }
        if (!bOnline) {
            this.delOnlinePlayer(id, _sys_.plt);
        }
        else {
            rkOnlinePlayer.closeTimeOut();
        }
    }
    isOnline(uid, plt) {
        if (this.getOnlinePlayer(uid, plt)) {
            return true;
        }
        return false;
    }
    onSeverDisconnect(serverid, plt) {
        if (plt == undefined)
            return;
        var r_list = this._onlineplayerlist.get(plt);
        for (var i = 0; i < r_list.length; i++) {
            var rkOnlinePlayer = r_list[i];
            if (rkOnlinePlayer && rkOnlinePlayer.clsid == serverid) {
                rkOnlinePlayer.openTimeOut();
                r_list.splice(i, 1);
                i--;
            }
        }
    }
    onlineAccounts(_sys_, accounts, serverid) {
        let kickIDs = [];
        for (let i = 0; i < accounts.length; i++) {
            let rkPlayer = accounts[i];
            let rkOnlinPlayer = this.getOnlinePlayer(rkPlayer.ac, _sys_.plt);
            if (!rkOnlinPlayer) {
                this.addOnlinePlayer(rkPlayer.ac, rkPlayer.id, serverid, rkPlayer.linkid, rkPlayer.loginInfo, rkPlayer.logintime, _sys_.plt);
            }
            else if (rkOnlinPlayer.clsid != serverid) {
                kickIDs.push(rkPlayer.id);
            }
            else {
                rkOnlinPlayer.closeTimeOut();
            }
            if (accounts.length == 1 && rkPlayer.role) {
                // 如果上报的结果只有一个人的话就算他是登陆的时候上报的，此时要记录一下他的角色信息
                LoginCheck_1.SeLoginCheck.cache_account_info(rkPlayer.id.toString(), _sys_.plt, rkPlayer.role);
            }
        }
        if (kickIDs.length > 0) {
            NetMgr_1.netMgrInst.sendKickAccount(serverid, kickIDs);
        }
    }
    getOnlinePlayer(account, plt) {
        var rList = this._onlineplayerlist.get(plt);
        if (typeof account == 'string') {
            for (var i = 0; i < rList.length; i++) {
                var rkPlayer = rList[i];
                if (rkPlayer && rkPlayer.account == account) {
                    return rkPlayer;
                }
            }
            return null;
        }
        else {
            for (var i = 0; i < rList.length; i++) {
                var rkPlayer = rList[i];
                if (rkPlayer && rkPlayer.id == account) {
                    return rkPlayer;
                }
            }
            return null;
        }
    }
    getOnlinePlayerByOpenid(openid, plt) {
        var rList = this._onlineplayerlist.get(plt);
        for (var i = 0; i < rList.length; i++) {
            var rkPlayer = rList[i];
            if (rkPlayer && rkPlayer.loginInfo.openid == openid) {
                return rkPlayer;
            }
        }
        return null;
    }
    delOnlinePlayer(account, plt) {
        var rList = this._onlineplayerlist.get(plt);
        if (typeof account == 'number') {
            for (var i = 0; i < rList.length; i++) {
                var rkPlayer = rList[i];
                if (rkPlayer && rkPlayer.id == account) {
                    rList.splice(i, 1);
                    GMMgr_1.gmMgrInst.onPlayerChange(false, { account: account, id: rkPlayer.id });
                    serverMgr_1.serverMonitInst.del_online_num(rkPlayer.clsid);
                    break;
                }
            }
        }
        else {
            for (var i = 0; i < rList.length; i++) {
                var rkPlayer = rList[i];
                if (rkPlayer && rkPlayer.account == account) {
                    rList.splice(i, 1);
                    GMMgr_1.gmMgrInst.onPlayerChange(false, { account: account, id: rkPlayer.id });
                    serverMgr_1.serverMonitInst.del_online_num(rkPlayer.clsid);
                    break;
                }
            }
        }
    }
    addOnlinePlayer(account, id, cloudserverid, cloudserverlinkid, rkLoginInfo, logintime = Date.now(), plt) {
        rkLoginInfo = rkLoginInfo || {};
        if (this.getOnlinePlayer(account, plt)) {
            return;
        }
        var newPlayer = new OnlinePlayer();
        newPlayer.account = account;
        newPlayer.id = id;
        newPlayer.clsid = cloudserverid;
        newPlayer.clslinkid = cloudserverlinkid;
        newPlayer.loginInfo = func_copy(rkLoginInfo);
        newPlayer.logintime = logintime;
        newPlayer.plt = plt;
        // 清除掉两个长的没用的
        delete newPlayer.loginInfo.device_os;
        delete newPlayer.loginInfo.sign;
        this._onlineplayerlist.add(newPlayer.plt, newPlayer);
        GMMgr_1.gmMgrInst.onPlayerChange(true, { account: account, id: id, loginInfo: rkLoginInfo, logintime: logintime, plt: plt });
        serverMgr_1.serverMonitInst.add_online_num(cloudserverid);
    }
    get_cls_by_openid_and_plt(openid, plt) {
        var rkOnlinePlayer = this.getOnlinePlayerByOpenid(openid, plt);
        if (rkOnlinePlayer && rkOnlinePlayer.plt == plt) {
            return rkOnlinePlayer.clsid;
        }
        return null;
    }
}
exports.onlineMgrInst = new OnlinePlayerMgr();
//# sourceMappingURL=OnlinePlayer.js.map