/*
 网络处理模块，负责响应来自TS的消息 管理所有的Cls状态
 */
import { TeNet } from "../lib/TeNet";
import { onlineMgrInst } from '../mgr/OnlinePlayer';
import { rechargeMgrInst } from '../mgr/RechargeMgr';
import { configInst } from '../lib/TeConfig';
import { if_sys_ } from '../lib/TeTool';
import { gmMgrInst } from "../mgr/GMMgr";
import { InviteCodeMgrInst } from '../mgr/InviteCodeMgr';
import { QzoneManagerInst } from "../apilibs/ExtInfoLoader";
import { serverMonitInst, ServerInfo } from './serverMgr';
import { loginInfo } from "../mgr/LoginCheck";
import { WebApp } from "../WebApp";
import { http_quest } from "../lib/TeHttpQuest";
import { createHash } from "crypto";
import { GameControl } from "../mgr/GameControl";
import { AppUnit } from "../mgr/AppMgr";

class NetMgr extends TeNet {
    //private _netMgr:TeNet = new TeNet();


    constructor() {
        super();
        // this.listen(port, flag);
        this.on('connected', this.onConnected.bind(this));
        this.on('disconnect', this.onDisconnect.bind(this));
        this.on('data', this.onReciveData.bind(this));
    }

    private onConnected(linkid: string) {
        if (serverMonitInst.has_linkID(linkid)) {
            // 如果已经存在
            console.log('connceted error same socketid');
        }
        else {
            serverMonitInst.add_server(linkid);
            // 这里添加一个超时检查
        }
    }

    private onDisconnect(linkid: string) {
        if (serverMonitInst.has_linkID(linkid)) {
            // 现在还不知道断开后重新连接上的sockeid会不会变化，先按照变化的处理
            var serverData = serverMonitInst.get_server_l(linkid);

            // 先把所有在线的玩家状态设置成离线
            onlineMgrInst.onSeverDisconnect(serverData.id, serverData.plt);

            serverMonitInst.del_server_l(linkid);
        }
    }

    private onReciveData(linkid: string, data) {
        if (!serverMonitInst.has_linkID(linkid)) {
            this.disconnect(linkid);
        }

        var serverData = serverMonitInst.get_server_l(linkid);
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
                onlineMgrInst.onLeave(data._sys_, data.uid, data.role, serverData.id);
                break;
            case 'checkacret':
                onlineMgrInst.checkOnlineRet(data._sys_, data.account, data.id, data.online, serverData.id);
                break;
            case 'accounts':
                onlineMgrInst.onlineAccounts(data._sys_, data.accounts, serverData.id);
                break;
            case 'givemailret':
                gmMgrInst.onGiveMailsRet(data._sys_, data.gmaccount, data.results);
                break;
            case 'loginSD':
                onlineMgrInst.onLoginSD(data._sys_, serverData.id, data.clientid, data.info);
                break;
            case 'recharge':
                rechargeMgrInst.rechargeOpr(data._sys_, serverData.id, data.type, data.info);
                break;
            case 'playerinfo':
                if (!WebApp.inst.onQueryResponse(data.gmlink, data)) {
                    gmMgrInst.onQueryPlayerInfoRet(data._sys_, data);
                }
                break;
            case 'setplayerinfo':
                gmMgrInst.onSetPlayerInfoRet(data._sys_, data);
                break;
            case 'invitecode':
                InviteCodeMgrInst.checkInvite(data._sys_, data.code, data.uid, data.openid, data.openkey);
                break;
            case 'queryInviteCode':
                InviteCodeMgrInst.queryInviteCode(data._sys_, data.ids, data.uid);
                break;
            case 'gamebar_msg':
                QzoneManagerInst.send_gamebar_msg(data._sys_, data.uid, data.openid, data.accesstoken, data.frd, data.msgtype, data.content, data.qua);
                break;
            case 'urlrequest':
                this._processUrlRequest(data._sys_, data.methon, data.url, data.data, data.uid, data.param, data.datatype, data.appid);
                break;
            case 'check_forbid_name':
                this._process_wx_forbid_name_check(data._sys_, data.charid, data.name, data.oldname, data.type, data.appid);
                break;
            case 'GameControl':
                GameControl.inst.add_config_value(data._sys_.plt, data.type, data.value);
                break;

            case 'onlineGiveMail':
                // 这个是确认需要发送到玩家手中的
                this.onlineGiveMail(data._sys_, data);
                break;
            //-----------------------日志服务器的接口------------------------//
            case 'log_query_ret':
                gmMgrInst.onGmQueryRet(data.gmid, data);
                break;
            case 'up_match_info':
                gmMgrInst.toallgm(data);
                break;
            case 'up_db_info':
                gmMgrInst.toallgm(data);
                break;
            case 'cls_mgr':
                break;
            case 'gmmails':
                gmMgrInst.addGmMails(data.gmid, data.mails);
                break;

            //---------------------chart-------------------------------//
            case 'war_zone_infos_ret':
                gmMgrInst.onGmQueryRet(data.gmid, data);
                break;
            case 'chart_delete_uid_ret':
                gmMgrInst.onGmQueryRet(data.gmid, data);
                break;
            case 'chart_info_ret':
                gmMgrInst.sendChartInfoRet(data.gmid, data.infos);
                break;
            case 'toy_info_ret':
                gmMgrInst.sendToyInfoRet(data.gmid, data.infos);
                break;
            case 'guild_info_ret':
                gmMgrInst.sendGuildInfoRet(data.gmid, data.infos);
                break;
            case 'chart_clear_ret':
                gmMgrInst.sendChartClearRet(data.gmid, data.infos);
                break;
            case 'deal_cheat':
                gmMgrInst.deal_cheat(data.uid, data);
                break;
            case 'transferData':
                //操作跨服的玩家的数据，可以统一从这里走
                this.transferData(data._sys_, data);
                break;

        }
    }

    private _process_wx_forbid_name_check(_sys_: if_sys_, charid: number, name: string, oldname: string, type: string, appid: string) {
        if (configInst.get("access_token_update")) {
            this.sendServerData(_sys_.serverid, {
                cmd: 'check_forbid_name',
                charid: charid,
                name: name,
                type: type
            })
            return;
        }
        http_quest("post", "https://api.weixin.qq.com/wxa/msg_sec_check?access_token=" + AppUnit.get_wx_access_token(appid), { content: name },
            (function (t_sys_: if_sys_, t_charid, t_name, t_oldname, t_type, data) {
                if (data) {
                    try {
                        let pdata = JSON.parse(data);
                        if (pdata && pdata.errcode == 87014) {
                            this.sendServerData(t_sys_.serverid, {
                                cmd: 'check_forbid_name',
                                charid: t_charid,
                                name: t_oldname,
                                type: t_type
                            })
                            return;
                        }
                        else if (pdata && pdata.errcode == 0) {
                            this.sendServerData(t_sys_.serverid, {
                                cmd: 'check_forbid_name',
                                charid: t_charid,
                                name: t_name,
                                type: t_type
                            })
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
                })
            }).bind(this, _sys_, charid, name, oldname, type), 1, 'json')
    }

    private _processUrlRequest(_sys_: if_sys_, methon: 'get' | 'post', url: string, data: any, uid: number, param: any, datatype: string, appid: string) {
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
        })

        let checkstr = checklist.join('&') + AppUnit.get_appkey(appid);
        data.sign = createHash('md5').update(checkstr).digest('hex').toLowerCase();
        if (!datatype) datatype = 'text';

        http_quest(methon, url, data, this._onProcessBack.bind(this, _sys_, uid, data, param), 0, datatype);
    }

    private _onProcessBack(_sys_: if_sys_, uid: number, qdata: any, param: any, data: any) {
        if (uid) {
            try {
                data = JSON.parse(data);
            }
            catch (e) {

            }
            let cls_id = onlineMgrInst.getOnlinePlayerCSId(uid, _sys_.plt);
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

    private _processRegist(_sys_: if_sys_, serverData: ServerInfo, data: { id: string; passwd: string; _sys_: if_sys_; type: string; url: string; }) {
        // 先检查一下是否有相同ID的服务器已经注册
        var server = serverMonitInst.get_server(data.id);
        if (server) {
            var sock = this.getSocket(server.linkid);
            if (!sock.disconnected) {
                this.sendData({ 'cmd': 'registret', 'type': 'same id regist' }, serverData.linkid);
                return true;
            }
            else {
                serverMonitInst.del_server_l(server.linkid);
            }
        }

        if (data.passwd != 'chenkai') {
            this.sendData({ 'cmd': 'registret', 'type': 'psd error' }, serverData.linkid);
            return;
        }

        var _sys_ = data._sys_ as if_sys_

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
            id: configInst.get('id'),
            url: configInst.get('proxyurl'),
            files: [],
            gmsystemmails: (data.type == 'cls') ? gmMgrInst.get_gm_systemmail(_sys_.plt) : [],
            gmconfig: (data.type == 'cls') ? gmMgrInst.getGlobalConfig(_sys_.plt) : {}
        }, serverData.linkid);

        serverMonitInst.regist_server(serverData.linkid, serverData.id);
        if (data.type == 'cls') {
            InviteCodeMgrInst.registPlt(_sys_.plt)
        }
    }

    private _processLogin(_sys_: if_sys_, serverData: ServerInfo, data: { account: string; passwd: string; clientid: string; info: any; }) {
        onlineMgrInst.onLogin(_sys_, data.account, data.passwd, serverData.id, data.clientid, data.info);
    }

    private onlineGiveMail(_sys_: if_sys_, data: { uid: number, mailinfo: any}) {
        let cls_id = onlineMgrInst.getOnlinePlayerCSId(data.uid, _sys_.plt);
        if (!cls_id) cls_id = _sys_.serverid;

        this.sendGiveMail(cls_id, [data.mailinfo], '');
    }

    private transferData(_sys_: if_sys_, data: { uid: number, plt: string}) {
        let cls_id = onlineMgrInst.getOnlinePlayerCSId(data.uid, data.plt? data.plt : _sys_.plt);
        if (!cls_id) console.error('no cls: ' + JSON.stringify(data));

        this.sendServerData(cls_id, data);
    }

    public sendServerData(serverID: string, data) {
        var linkid = serverID;
        if (serverMonitInst.has_serverID(serverID)) {
            linkid = serverMonitInst.get_server(serverID).linkid;
        }

        return this.sendData(data, linkid);
    }

    public sendQueryPlayerInfo(serverid: string, uid: number, type: string, gmlink: string) {
        var queryInfo = {
            cmd: 'playerinfo',
            uid: uid,
            type: type,
            gmlink: gmlink
        }

        this.sendServerData(serverid, queryInfo);
    }

    public sendSetPlayerInfo(serverid: string, uid: number, type: string, gmlink: string, info: Object) {
        var queryInfo = {
            cmd: 'setplayerinfo',
            uid: uid,
            type: type,
            gmlink: gmlink,
            info: info,
        }

        this.sendServerData(serverid, queryInfo);
    }

    public sendKickAccount(serverid, accountIds: Array<number> = []) {
        var kick = {
            cmd: 'kick',
            accountids: accountIds,
        };
        this.sendServerData(serverid, kick);
    }

    public sendKickAll(serverid, plt: string) {
        var kick = {
            cmd: 'kickAll',
            plt: plt,
        };
        this.sendServerData(serverid, kick);
    }
    public sendCheckAccount(serverID, account, id) {
        var loginSuccess = {
            cmd: 'checkac',
            account: account,
            id: id,
        };

        this.sendServerData(serverID, loginSuccess);
    }

    public sendLoginSucess(serverID: string, account: string, id: number, clientsockid: string, sdwInfo?: loginInfo) {
        var loginSuccess = {
            cmd: 'loginsuccess',
            account: account,
            id: id,
            clientid: clientsockid,
            loginInfo: sdwInfo
        };

        this.sendServerData(serverID, loginSuccess);
    }

    public sendLoginFailed(serverID: string, account: string, error: string, clientid: string, un_lock_time: number) {
        var loginFailed = {
            cmd: 'loginfailed',
            account: account,
            error: error,
            ul_time: un_lock_time,
            clientid: clientid
        };

        this.sendServerData(serverID, loginFailed);
    }

    public sendCreateAccountRet(serverid: string, account: any, error: any, playerid: any, clinetid: any) {
        var createRet = {
            cmd: 'createret',
            account: account,
            error: error,
            id: playerid,
            clientid: clinetid
        };

        this.sendServerData(serverid, createRet);
    }

    public sendGiveMail(serverid: string, mails: any, gmaccount: string) {
        var mailinfo = {
            cmd: 'givemails',
            mails: mails,
            gmaccount: gmaccount,
        };

        this.sendServerData(serverid, mailinfo);
    }

    
    public sendPlayerProperty(serverid: string, gmid: string, uid: number, e: number) {
        var mailinfo = {
            cmd: 'playerproperty',
            gmid: gmid,
            uid: uid,
            e: e,
        };

        this.sendServerData(serverid, mailinfo);
    }

    public sendRechargeRet(serverid, type, info) {
        var mailinfo = {
            cmd: 'recharge',
            type: type,
            info: info,
        };

        return this.sendServerData(serverid, mailinfo);
    }

    public sendInviteRet(sid, type, awards, code, uid, msg = '', extNotice = '') {
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

    public sendInviteExRet(sid, type, awards, codeid, uid, msg = '', extNotice = '', awardIndex = 0) {
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

    public sendQueryInviteRet(sid, uid, infos) {
        var info = {
            cmd: 'queryInviteCode',
            uid: uid,
            infos: infos
        };

        this.sendServerData(sid, info);
    }

    public sendExtInfo(sid, uid, exinfo) {
        var info = {
            cmd: 'extinfo',
            uid: uid,
            exinfo: exinfo
        }

        this.sendServerData(sid, info);
    }
}
export { NetMgr };
export var netMgrInst = new NetMgr();