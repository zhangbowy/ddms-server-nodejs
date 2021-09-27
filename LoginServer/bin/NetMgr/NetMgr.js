"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.netMgrInst = exports.NetMgr = void 0;
/*
 网络处理模块，负责响应来自TS的消息 管理所有的Cls状态
 */
const TeNet_1 = require("../lib/TeNet");
const OnlinePlayer_1 = require("../mgr/OnlinePlayer");
const RechargeMgr_1 = require("../mgr/RechargeMgr");
const TeConfig_1 = require("../lib/TeConfig");
const GMMgr_1 = require("../mgr/GMMgr");
const InviteCodeMgr_1 = require("../mgr/InviteCodeMgr");
const ExtInfoLoader_1 = require("../apilibs/ExtInfoLoader");
const serverMgr_1 = require("./serverMgr");
const WebApp_1 = require("../WebApp");
const TeHttpQuest_1 = require("../lib/TeHttpQuest");
const crypto_1 = require("crypto");
const GameControl_1 = require("../mgr/GameControl");
const AppMgr_1 = require("../mgr/AppMgr");
class NetMgr extends TeNet_1.TeNet {
    //private _netMgr:TeNet = new TeNet();
    constructor() {
        super();
        // this.listen(port, flag);
        this.on('connected', this.onConnected.bind(this));
        this.on('disconnect', this.onDisconnect.bind(this));
        this.on('data', this.onReciveData.bind(this));
    }
    onConnected(linkid) {
        if (serverMgr_1.serverMonitInst.has_linkID(linkid)) {
            // 如果已经存在
            console.log('connceted error same socketid');
        }
        else {
            serverMgr_1.serverMonitInst.add_server(linkid);
            // 这里添加一个超时检查
        }
    }
    onDisconnect(linkid) {
        if (serverMgr_1.serverMonitInst.has_linkID(linkid)) {
            // 现在还不知道断开后重新连接上的sockeid会不会变化，先按照变化的处理
            var serverData = serverMgr_1.serverMonitInst.get_server_l(linkid);
            // 先把所有在线的玩家状态设置成离线
            OnlinePlayer_1.onlineMgrInst.onSeverDisconnect(serverData.id, serverData.plt);
            serverMgr_1.serverMonitInst.del_server_l(linkid);
        }
    }
    onReciveData(linkid, data) {
        if (!serverMgr_1.serverMonitInst.has_linkID(linkid)) {
            this.disconnect(linkid);
        }
        var serverData = serverMgr_1.serverMonitInst.get_server_l(linkid);
        if (data.cmd !== 'regist' && !serverData.ready) {
            // 没有注册成功的时候，服务器只处理注册信息
            this.sendData({ cmd: 'needregist' }, linkid);
            return;
        }
        switch (data.cmd) {
            case 'regist':
                this._processRegist(data._sys_, serverData, data);
                break;
            //----------------------------逻辑服务器的接口------------------------//
            case 'login':
                this._processLogin(data._sys_, serverData, data);
                break;
            case 'pleave':
                OnlinePlayer_1.onlineMgrInst.onLeave(data._sys_, data.uid, data.role, serverData.id);
                break;
            case 'checkacret':
                OnlinePlayer_1.onlineMgrInst.checkOnlineRet(data._sys_, data.account, data.id, data.online, serverData.id);
                break;
            case 'accounts':
                OnlinePlayer_1.onlineMgrInst.onlineAccounts(data._sys_, data.accounts, serverData.id);
                break;
            case 'givemailret':
                GMMgr_1.gmMgrInst.onGiveMailsRet(data._sys_, data.gmaccount, data.results);
                break;
            case 'loginSD':
                OnlinePlayer_1.onlineMgrInst.onLoginSD(data._sys_, serverData.id, data.clientid, data.info);
                break;
            case 'recharge':
                RechargeMgr_1.rechargeMgrInst.rechargeOpr(data._sys_, serverData.id, data.type, data.info);
                break;
            case 'playerinfo':
                if (!WebApp_1.WebApp.inst.onQueryResponse(data.gmlink, data)) {
                    GMMgr_1.gmMgrInst.onQueryPlayerInfoRet(data._sys_, data);
                }
                break;
            case 'setplayerinfo':
                GMMgr_1.gmMgrInst.onSetPlayerInfoRet(data._sys_, data);
                break;
            case 'invitecode':
                InviteCodeMgr_1.InviteCodeMgrInst.checkInvite(data._sys_, data.code, data.uid, data.openid, data.openkey);
                break;
            case 'queryInviteCode':
                InviteCodeMgr_1.InviteCodeMgrInst.queryInviteCode(data._sys_, data.ids, data.uid);
                break;
            case 'gamebar_msg':
                ExtInfoLoader_1.QzoneManagerInst.send_gamebar_msg(data._sys_, data.uid, data.openid, data.accesstoken, data.frd, data.msgtype, data.content, data.qua);
                break;
            case 'urlrequest':
                this._processUrlRequest(data._sys_, data.methon, data.url, data.data, data.uid, data.param, data.datatype, data.appid);
                break;
            case 'check_forbid_name':
                this._process_wx_forbid_name_check(data._sys_, data.charid, data.name, data.oldname, data.type, data.appid);
                break;
            case 'GameControl':
                GameControl_1.GameControl.inst.add_config_value(data._sys_.plt, data.type, data.value);
                break;
            case 'onlineGiveMail':
                // 这个是确认需要发送到玩家手中的
                this.onlineGiveMail(data._sys_, data);
                break;
            //-----------------------日志服务器的接口------------------------//
            case 'log_query_ret':
                GMMgr_1.gmMgrInst.onGmQueryRet(data.gmid, data);
                break;
            case 'up_match_info':
                GMMgr_1.gmMgrInst.toallgm(data);
                break;
            case 'up_db_info':
                GMMgr_1.gmMgrInst.toallgm(data);
                break;
            case 'cls_mgr':
                break;
            case 'gmmails':
                GMMgr_1.gmMgrInst.addGmMails(data.gmid, data.mails);
                break;
            //---------------------chart-------------------------------//
            case 'war_zone_infos_ret':
                GMMgr_1.gmMgrInst.onGmQueryRet(data.gmid, data);
                break;
            case 'chart_delete_uid_ret':
                GMMgr_1.gmMgrInst.onGmQueryRet(data.gmid, data);
                break;
            case 'chart_info_ret':
                GMMgr_1.gmMgrInst.sendChartInfoRet(data.gmid, data.infos);
                break;
            case 'toy_info_ret':
                GMMgr_1.gmMgrInst.sendToyInfoRet(data.gmid, data.infos);
                break;
            case 'guild_info_ret':
                GMMgr_1.gmMgrInst.sendGuildInfoRet(data.gmid, data.infos);
                break;
            case 'chart_clear_ret':
                GMMgr_1.gmMgrInst.sendChartClearRet(data.gmid, data.infos);
                break;
            case 'deal_cheat':
                GMMgr_1.gmMgrInst.deal_cheat(data.uid, data);
                break;
            case 'transferData':
                //操作跨服的玩家的数据，可以统一从这里走
                this.transferData(data._sys_, data);
                break;
        }
    }
    _process_wx_forbid_name_check(_sys_, charid, name, oldname, type, appid) {
        if (TeConfig_1.configInst.get("access_token_update")) {
            this.sendServerData(_sys_.serverid, {
                cmd: 'check_forbid_name',
                charid: charid,
                name: name,
                type: type
            });
            return;
        }
        TeHttpQuest_1.http_quest("post", "https://api.weixin.qq.com/wxa/msg_sec_check?access_token=" + AppMgr_1.AppUnit.get_wx_access_token(appid), { content: name }, (function (t_sys_, t_charid, t_name, t_oldname, t_type, data) {
            if (data) {
                try {
                    let pdata = JSON.parse(data);
                    if (pdata && pdata.errcode == 87014) {
                        this.sendServerData(t_sys_.serverid, {
                            cmd: 'check_forbid_name',
                            charid: t_charid,
                            name: t_oldname,
                            type: t_type
                        });
                        return;
                    }
                    else if (pdata && pdata.errcode == 0) {
                        this.sendServerData(t_sys_.serverid, {
                            cmd: 'check_forbid_name',
                            charid: t_charid,
                            name: t_name,
                            type: t_type
                        });
                        return;
                    }
                }
                catch (e) {
                }
            }
            // api timeout or other error
            console.log("api timeout or other error", data);
            this.sendServerData(t_sys_.serverid, {
                cmd: 'check_forbid_name',
                charid: t_charid,
                name: t_oldname,
                type: t_type
            });
        }).bind(this, _sys_, charid, name, oldname, type), 1, 'json');
    }
    _processUrlRequest(_sys_, methon, url, data, uid, param, datatype, appid) {
        // 需要对数据进行打包
        data = data || {};
        let checklist = [];
        for (let key in data) {
            let v = data[key];
            if (typeof v == 'string' || typeof v == 'number') {
                checklist.push(key + "=" + v);
            }
            else {
                checklist.push(key + '=' + JSON.stringify(v));
            }
        }
        checklist.sort(function (a, b) {
            return a > b ? 1 : -1;
        });
        let checkstr = checklist.join('&') + AppMgr_1.AppUnit.get_appkey(appid);
        data.sign = crypto_1.createHash('md5').update(checkstr).digest('hex').toLowerCase();
        if (!datatype)
            datatype = 'text';
        TeHttpQuest_1.http_quest(methon, url, data, this._onProcessBack.bind(this, _sys_, uid, data, param), 0, datatype);
    }
    _onProcessBack(_sys_, uid, qdata, param, data) {
        if (uid) {
            try {
                data = JSON.parse(data);
            }
            catch (e) {
            }
            let cls_id = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(uid, _sys_.plt);
            if (cls_id) {
                this.sendServerData(cls_id, {
                    cmd: 'urlrequestback',
                    uid: uid,
                    param: param,
                    data: data
                });
            }
        }
    }
    _processRegist(_sys_, serverData, data) {
        // 先检查一下是否有相同ID的服务器已经注册
        var server = serverMgr_1.serverMonitInst.get_server(data.id);
        if (server) {
            var sock = this.getSocket(server.linkid);
            if (!sock.disconnected) {
                this.sendData({ 'cmd': 'registret', 'type': 'same id regist' }, serverData.linkid);
                return true;
            }
            else {
                serverMgr_1.serverMonitInst.del_server_l(server.linkid);
            }
        }
        if (data.passwd != 'chenkai') {
            this.sendData({ 'cmd': 'registret', 'type': 'psd error' }, serverData.linkid);
            return;
        }
        var _sys_ = data._sys_;
        serverData.id = _sys_.serverid;
        serverData.type = data.type;
        serverData.ready = true;
        serverData.plt = _sys_.plt;
        if (data.url) {
            serverData.url = data.url;
        }
        else {
            serverData.url = '';
        }
        this.sendData({
            cmd: 'registret',
            type: 'ok',
            id: TeConfig_1.configInst.get('id'),
            url: TeConfig_1.configInst.get('proxyurl'),
            files: [],
            gmsystemmails: (data.type == 'cls') ? GMMgr_1.gmMgrInst.get_gm_systemmail(_sys_.plt) : [],
            gmconfig: (data.type == 'cls') ? GMMgr_1.gmMgrInst.getGlobalConfig(_sys_.plt) : {}
        }, serverData.linkid);
        serverMgr_1.serverMonitInst.regist_server(serverData.linkid, serverData.id);
        if (data.type == 'cls') {
            InviteCodeMgr_1.InviteCodeMgrInst.registPlt(_sys_.plt);
        }
    }
    _processLogin(_sys_, serverData, data) {
        OnlinePlayer_1.onlineMgrInst.onLogin(_sys_, data.account, data.passwd, serverData.id, data.clientid, data.info);
    }
    onlineGiveMail(_sys_, data) {
        let cls_id = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(data.uid, _sys_.plt);
        if (!cls_id)
            cls_id = _sys_.serverid;
        this.sendGiveMail(cls_id, [data.mailinfo], '');
    }
    transferData(_sys_, data) {
        let cls_id = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(data.uid, data.plt ? data.plt : _sys_.plt);
        if (!cls_id)
            console.error('no cls: ' + JSON.stringify(data));
        this.sendServerData(cls_id, data);
    }
    sendServerData(serverID, data) {
        var linkid = serverID;
        if (serverMgr_1.serverMonitInst.has_serverID(serverID)) {
            linkid = serverMgr_1.serverMonitInst.get_server(serverID).linkid;
        }
        return this.sendData(data, linkid);
    }
    sendQueryPlayerInfo(serverid, uid, type, gmlink) {
        var queryInfo = {
            cmd: 'playerinfo',
            uid: uid,
            type: type,
            gmlink: gmlink
        };
        this.sendServerData(serverid, queryInfo);
    }
    sendSetPlayerInfo(serverid, uid, type, gmlink, info) {
        var queryInfo = {
            cmd: 'setplayerinfo',
            uid: uid,
            type: type,
            gmlink: gmlink,
            info: info,
        };
        this.sendServerData(serverid, queryInfo);
    }
    sendKickAccount(serverid, accountIds = []) {
        var kick = {
            cmd: 'kick',
            accountids: accountIds,
        };
        this.sendServerData(serverid, kick);
    }
    sendKickAll(serverid, plt) {
        var kick = {
            cmd: 'kickAll',
            plt: plt,
        };
        this.sendServerData(serverid, kick);
    }
    sendCheckAccount(serverID, account, id) {
        var loginSuccess = {
            cmd: 'checkac',
            account: account,
            id: id,
        };
        this.sendServerData(serverID, loginSuccess);
    }
    sendLoginSucess(serverID, account, id, clientsockid, sdwInfo) {
        var loginSuccess = {
            cmd: 'loginsuccess',
            account: account,
            id: id,
            clientid: clientsockid,
            loginInfo: sdwInfo
        };
        this.sendServerData(serverID, loginSuccess);
    }
    sendLoginFailed(serverID, account, error, clientid, un_lock_time) {
        var loginFailed = {
            cmd: 'loginfailed',
            account: account,
            error: error,
            ul_time: un_lock_time,
            clientid: clientid
        };
        this.sendServerData(serverID, loginFailed);
    }
    sendCreateAccountRet(serverid, account, error, playerid, clinetid) {
        var createRet = {
            cmd: 'createret',
            account: account,
            error: error,
            id: playerid,
            clientid: clinetid
        };
        this.sendServerData(serverid, createRet);
    }
    sendGiveMail(serverid, mails, gmaccount) {
        var mailinfo = {
            cmd: 'givemails',
            mails: mails,
            gmaccount: gmaccount,
        };
        this.sendServerData(serverid, mailinfo);
    }
    sendPlayerProperty(serverid, gmid, uid, e) {
        var mailinfo = {
            cmd: 'playerproperty',
            gmid: gmid,
            uid: uid,
            e: e,
        };
        this.sendServerData(serverid, mailinfo);
    }
    sendRechargeRet(serverid, type, info) {
        var mailinfo = {
            cmd: 'recharge',
            type: type,
            info: info,
        };
        return this.sendServerData(serverid, mailinfo);
    }
    sendInviteRet(sid, type, awards, code, uid, msg = '', extNotice = '') {
        var info = {
            cmd: 'inviteret',
            type: type,
            awards: awards,
            code: code,
            uid: uid,
            msg: msg,
            extnotice: extNotice
        };
        this.sendServerData(sid, info);
    }
    sendInviteExRet(sid, type, awards, codeid, uid, msg = '', extNotice = '', awardIndex = 0) {
        var info = {
            cmd: 'inviteret_ex',
            type: type,
            awards: awards,
            code: codeid,
            uid: uid,
            msg: msg,
            extnotice: extNotice,
            awardIndex: awardIndex
        };
        this.sendServerData(sid, info);
    }
    sendQueryInviteRet(sid, uid, infos) {
        var info = {
            cmd: 'queryInviteCode',
            uid: uid,
            infos: infos
        };
        this.sendServerData(sid, info);
    }
    sendExtInfo(sid, uid, exinfo) {
        var info = {
            cmd: 'extinfo',
            uid: uid,
            exinfo: exinfo
        };
        this.sendServerData(sid, info);
    }
}
exports.NetMgr = NetMgr;
exports.netMgrInst = new NetMgr();
//# sourceMappingURL=NetMgr.js.map