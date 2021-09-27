import { createHash } from "crypto";
import { Hash } from "crypto";
import { TeDate, orderListFind, if_sys_, HashMap } from '../lib/TeTool';
import { SeLoginCheck, ifLoginCheckRet, loginInfo } from './LoginCheck';
import { netMgrInst } from "../NetMgr/NetMgr";
import { gmMgrInst, redistInst } from './GMMgr';
import { QzoneManagerInst } from "../apilibs/ExtInfoLoader";
import { writeFileSync } from "fs";
import { serverMonitInst } from '../NetMgr/serverMgr';
import { LogMgr } from "../lib/LogMgr";


var log = LogMgr.log('OnlinePlayer');

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

export var StaDefine = {
    dailyinfo: 'sta_dailyinfo',
}

// 这里需要维护所有玩家的在线状态，cloudserver 需要对Ls负责，玩家在线离线都需要上报通知,这里负责维护玩家的状态的唯一性
export class OnlinePlayer { //extends EventEmitter
    public clsid: string;
    public clslinkid: string;
    public account: string;
    public id: number;
    //   public checkTimeOut: number = 0;
    public loginInfo: loginInfo;
    public logintime: number;
    public plt: string;

    constructor() {
        // super();
    }

    /**
     * cls 和 ls 网络断开的时候把 ls 上面的玩家状态暂时保留一段时间
     */
    public openTimeOut() {
        //this.checkTimeOut = Date.now();
        onlineMgrInst.addTimeOut(this.id, this.plt, this.clsid);
    }

    /**
     * cls 和 ls 网络断开的时候把 ls 上面的玩家状态暂时保留一段时间
     */
    public closeTimeOut() {
        //     this.checkTimeOut = 0;
        onlineMgrInst.delTimeOut(this.id, this.plt);
    }
}

var TimeOutTime = 30 * 1000;

class SeDailyHourInfo {
    max: number = 0;
    maxt: number = 0;
    min: number = 0;
    mint: number = 0;
}

export interface if_login_param {
    account: string,
    uid: number,
    linkid: string,
    clientid: string,
    type?: string,
    sdwInfo?: loginInfo,
    _sys_: if_sys_
}

class OnlinePlayerMgr {
    private _lastHourTime: number = Date.now();
    private _hourInfo: SeDailyHourInfo = new SeDailyHourInfo();
    private _lastminTime: number = Date.now();

    private _onlineplayerlist: HashMap<OnlinePlayer> = new HashMap<OnlinePlayer>();

    private _timeOutList: Array<{ id: number, checkTimeOut: number, plt: string, serverid: string }> = [];
    public addTimeOut(id: number, plt: string, serverid: string) {
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
            this._timeOutList.push({ id: id, checkTimeOut: Date.now(), plt: plt, serverid: serverid })
        }
    }

    public delTimeOut(id: number, plt: string) {
        if (!id) { return; }
        for (let i = 0; i < this._timeOutList.length; i++) {
            let rkPlayer = this._timeOutList[i];
            if (rkPlayer && rkPlayer.id == id && rkPlayer.plt == plt) {
                this._timeOutList.splice(i, 1);
                i--;
            }
        }
    }

    constructor() {
        setInterval(this.update.bind(this), 2000);
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

    public gmGetOnlinePlayer() {
        var players = [];
        var keys = this._onlineplayerlist.keys;
        for (var zi = 0; zi < keys.length; zi++) {
            var rList = this._onlineplayerlist.get(keys[zi]);
            for (var i = 0; i < rList.length; i++) {
                var rkPlayer: OnlinePlayer = rList[i];
                if (rkPlayer) {
                    players.push({ account: rkPlayer.account, id: rkPlayer.id, loginInfo: rkPlayer.loginInfo, logintime: rkPlayer.logintime, plt: rkPlayer.plt });
                }
            }
        }

        return players;
    }

    public gm_get_online_player(i_page: number, plt: string) {
        //  这里一页显示 10 个
        var page_size = 10;

        var r_list = this._onlineplayerlist.get(plt) as any[];

        var tot_page = Math.ceil(r_list.length / page_size);
        if (i_page >= tot_page && tot_page) {
            i_page = tot_page - 1;
        }

        var start_idx = i_page * page_size;
        var end_idx = Math.min((i_page + 1) * page_size, r_list.length);

        var infos = r_list.slice(start_idx, end_idx);

        return { infos: infos, page: i_page, tot_page: tot_page, i_tot_num: r_list.length };
    }

    public kickPlayer(idOrAccount: number | string, plt: string) {
        var serverid: string;
        var id: number;

        var rkPlayer: OnlinePlayer = this.getOnlinePlayer(idOrAccount, plt);
        if (rkPlayer) {
            id = rkPlayer.id;
            serverid = rkPlayer.clsid;
            log('kick', id);
        }

        if (serverid && id) {
            netMgrInst.sendKickAccount(serverid, [id]);
        }
    }

    public kickAllPlayer(plt: string) {
        var servers = serverMonitInst.get_server_by_type_all('cls',plt);
        for(let i=0; i< servers.length; i++){
            if (servers[i]) {
                netMgrInst.sendKickAll(servers[i].id, plt);
            }
        }
    }

    public update() {
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
            writeFileSync('./playernum.log', onlineNum, { flag: "w+" });
            let onlineNum_oppo = this._onlineplayerlist.get('oppo').length;
            let onlineNum_vivo = this._onlineplayerlist.get('vivo').length;
            writeFileSync('./playernum_oppo.log', onlineNum_oppo, { flag: "w+" });
            writeFileSync('./playernum_vivo.log', onlineNum_vivo, { flag: "w+" });
        }

        if (this._hourInfo.max < onlineNum) {
            this._hourInfo.max = onlineNum;
            this._hourInfo.maxt = nowTime;
        }

        if (onlineNum != 0 && (this._hourInfo.min == 0 || this._hourInfo.min > onlineNum)) {
            this._hourInfo.min = onlineNum;
            this._hourInfo.mint = nowTime;
        }

        if (TeDate.Isdiffhour(this._lastHourTime, nowTime)) {
            // 记录一下在线人数 1小时一条信息 记录的是一小时内的最高在线数量,最低在线数量
            this._lastHourTime = nowTime;

            var rkReSorted = redistInst.getSortedSet(StaDefine.dailyinfo, 0);
            var recordScore = parseInt(TeDate.Date_Format(new Date(nowTime), 'yyyyMMddhh'));
            //this._hourInfo.maxt = nowTime;
            rkReSorted.add(recordScore, JSON.stringify(this._hourInfo));

            this._hourInfo = new SeDailyHourInfo();
        }
    }
    
    public getOnlinePlayerCSId(charid: number, plt: string) {
        var rkOnlinePlayer = this.getOnlinePlayer(charid, plt);
        if (rkOnlinePlayer && rkOnlinePlayer.plt == plt) {
            return rkOnlinePlayer.clsid;
        }

        // 如果找不到就随机一个
        var linkid = serverMonitInst.get_server_link_by_type('cls', plt);
        let s = serverMonitInst.get_server_l(linkid);
        if (s) return s.id;

        return null;
    }

    public onLogin(_sys_: if_sys_, account: string, passwd: string, linkid: string, clientid: string, info) {
        var queryparam: if_login_param = {
            account: account,
            uid: 0,
            type: '',
            clientid: clientid,
            sdwInfo: info,
            linkid: linkid,
            _sys_: _sys_
        }

        SeLoginCheck.onAccount(queryparam, ((ret: ifLoginCheckRet, _queryparam: if_login_param) => {
            onlineMgrInst.onLoginEnd(_queryparam, ret);
            if (_queryparam.sdwInfo && _queryparam.sdwInfo.openid && _queryparam.sdwInfo.openkey) {
                QzoneManagerInst.loadInfos(_sys_, _queryparam.uid, _queryparam.sdwInfo.openid, _queryparam.sdwInfo.openkey);
            }
            else netMgrInst.sendExtInfo(_sys_.serverid, _queryparam.uid, {});
        }).bind(this));
    }

    public onLoginSD(_sys_: if_sys_, linkid: string, clientid: string, info: loginInfo) {
        if (!info || !info.uid) return;
        var queryparam: if_login_param = {
            account: info.uid.toString(),
            uid: parseInt(info.uid),
            clientid: clientid,
            sdwInfo: info,
            linkid: linkid,
            _sys_: _sys_
        }
        SeLoginCheck.onLoginSD(queryparam, ((ret, _queryparam: if_login_param) => {
            this.onLoginEnd(_queryparam, ret);
            if (_queryparam.type == 'success') {
                if (_queryparam.sdwInfo && _queryparam._sys_.plt == 'qzone' && _queryparam.sdwInfo.openid && _queryparam.sdwInfo.openkey) {
                    QzoneManagerInst.loadInfos(_sys_, _queryparam.uid, _queryparam.sdwInfo.openid, _queryparam.sdwInfo.openkey);
                }
                else {
                    netMgrInst.sendExtInfo(_sys_.serverid, _queryparam.uid, {});
                }
            }

        }).bind(this));
    }

    public onLoginEnd(queryparam: if_login_param, lock_info: ifLoginCheckRet) {
        var account: string = queryparam.account;
        var id: number = queryparam.uid;
        var type: string = queryparam.type;
        var linkid: string = queryparam.linkid;
        var clientid: string = queryparam.clientid;
        var sdwInfo: loginInfo = queryparam.sdwInfo;
        if (type != 'success') {
            netMgrInst.sendLoginFailed(linkid, account, type, clientid, lock_info.un_lock_time || 0);
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
            netMgrInst.sendLoginSucess(linkid, account, id, clientid, sdwInfo);
        }
    }

    public onLeave(_sys_: if_sys_, uid: number, role: any, serverid: string) {
        // 这里如果玩家离线的话，要匹配一下玩家账号和登陆的cls，
        var rkOnlinePlayer = this.getOnlinePlayer(uid, _sys_.plt);
        if (!rkOnlinePlayer) {
            return;
        }

        if (rkOnlinePlayer.clsid == serverid) {
            this.delOnlinePlayer(uid, _sys_.plt);
            if (role) {
                // 离线的时候有上报的话再记录一下玩家信息
                SeLoginCheck.cache_account_info(uid.toString(), _sys_.plt, role);
            }
        }
    }

    public checkOnlineRet(_sys_: if_sys_, account: string, id: string, bOnline: boolean, serverid: string) {
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

    public isOnline(uid: number, plt: string) {
        if (this.getOnlinePlayer(uid, plt)) {
            return true;
        }

        return false;
    }

    public onSeverDisconnect(serverid: string, plt: string) {
        if (plt == undefined) return;
        var r_list = this._onlineplayerlist.get(plt);
        for (var i = 0; i < r_list.length; i++) {
            var rkOnlinePlayer: OnlinePlayer = r_list[i];
            if (rkOnlinePlayer && rkOnlinePlayer.clsid == serverid) {
                rkOnlinePlayer.openTimeOut();
                r_list.splice(i, 1);
                i--
            }
        }
    }

    public onlineAccounts(_sys_: if_sys_, accounts: { ac: string, id: number, linkid: string, loginInfo: loginInfo, logintime: number, role: { lvl: number,icon:string, name: string } }[], serverid) {
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
                SeLoginCheck.cache_account_info(rkPlayer.id.toString(), _sys_.plt, rkPlayer.role);
            }
        }

        if (kickIDs.length > 0) {
            netMgrInst.sendKickAccount(serverid, kickIDs);
        }


    }

    public getOnlinePlayer(account: string | number, plt: string) {
        var rList = this._onlineplayerlist.get(plt);
        if (typeof account == 'string') {
            for (var i = 0; i < rList.length; i++) {
                var rkPlayer: OnlinePlayer = rList[i];
                if (rkPlayer && rkPlayer.account == account) {
                    return rkPlayer;
                }
            }

            return null;
        }
        else {
            for (var i = 0; i < rList.length; i++) {
                var rkPlayer: OnlinePlayer = rList[i];
                if (rkPlayer && rkPlayer.id == account) {
                    return rkPlayer;
                }
            }

            return null;
        }
    }

    public getOnlinePlayerByOpenid(openid: string | number, plt: string) {
        var rList = this._onlineplayerlist.get(plt);
        for (var i = 0; i < rList.length; i++) {
            var rkPlayer: OnlinePlayer = rList[i];
            if (rkPlayer && rkPlayer.loginInfo.openid == openid) {
                return rkPlayer;
            }
        }

        return null;
    }
        
    private delOnlinePlayer(account: string | number, plt: string) {
        var rList = this._onlineplayerlist.get(plt);
        if (typeof account == 'number') {
            for (var i = 0; i < rList.length; i++) {
                var rkPlayer: OnlinePlayer = rList[i];
                if (rkPlayer && rkPlayer.id == account) {
                    rList.splice(i, 1);
                    gmMgrInst.onPlayerChange(false, { account: account, id: rkPlayer.id });
                    serverMonitInst.del_online_num(rkPlayer.clsid);
                    break;
                }
            }

        }
        else {
            for (var i = 0; i < rList.length; i++) {
                var rkPlayer: OnlinePlayer = rList[i];
                if (rkPlayer && rkPlayer.account == account) {
                    rList.splice(i, 1);
                    gmMgrInst.onPlayerChange(false, { account: account, id: rkPlayer.id });
                    serverMonitInst.del_online_num(rkPlayer.clsid);
                    break;
                }
            }
        }

    }

    private addOnlinePlayer(account: string, id: number, cloudserverid: string, cloudserverlinkid: string, rkLoginInfo: loginInfo, logintime: number = Date.now(), plt: string) {
        rkLoginInfo = rkLoginInfo || <loginInfo>{}
        if (this.getOnlinePlayer(account, plt)) {
            return;
        }
        var newPlayer: OnlinePlayer = new OnlinePlayer();
        newPlayer.account = account;
        newPlayer.id = id;
        newPlayer.clsid = cloudserverid;
        newPlayer.clslinkid = cloudserverlinkid;
        newPlayer.loginInfo = func_copy<loginInfo>(rkLoginInfo);
        newPlayer.logintime = logintime;
        newPlayer.plt = plt;
        // 清除掉两个长的没用的
        delete newPlayer.loginInfo.device_os;
        delete newPlayer.loginInfo.sign;

        this._onlineplayerlist.add(newPlayer.plt, newPlayer);
        gmMgrInst.onPlayerChange(true, { account: account, id: id, loginInfo: rkLoginInfo, logintime: logintime, plt: plt });
        serverMonitInst.add_online_num(cloudserverid);
    }

    public get_cls_by_openid_and_plt(openid: string, plt: string) {
        var rkOnlinePlayer = this.getOnlinePlayerByOpenid(openid, plt);
        if (rkOnlinePlayer && rkOnlinePlayer.plt == plt) {
            return rkOnlinePlayer.clsid;
        }
        return null;
        
    }
}

export var onlineMgrInst = new OnlinePlayerMgr();