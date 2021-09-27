/* 负责处理其它服务器接口过来的数据操作*/
import { TeNet } from "../lib/TeNet";
import { SeCharMailInfo, ifRecharge1, SeMailType } from '../SeDefine';
import { iApp } from "../app";
import { TeDate } from "../TeTool";
import { configInst } from '../lib/TeConfig';
import { SeResSystemMail } from "../Res/interface";
var debug = require('debug')('LSMgr');

declare var global: iApp;
class SeLSInfo {
    public id: string = '';
    public linkid: string;
    public ready: boolean = false;
    public ips: Array<string> = [];

    public constructor(linkid: string) {
        this.linkid = linkid;
    }
}

class SeLSMgr extends TeNet {
    public allServers: any = {};
    private _TimeOut;
    private _url: string;
    constructor(url) {
        super();
        this._url;
        this.connect(url);
        this.on('data', this._onReciveData.bind(this));
        this.on('connected', this._onConnected.bind(this));
        this.on('disconnect', this._onDisconnect.bind(this));
        this.on('error', function (err) {
            global.logMgr.log(err);
        });
    }

    private _onDisconnect(linkid, data) {
        if (this.allServers.hasOwnProperty(linkid)) {
            // 现在还不知道断开后重新连接上的sockeid会不会变化，先按照变化的处理
            delete this.allServers[linkid];
        }
        else {
            debug('disconnect');
        }

        // 链接断开了的话就要暂时停止玩家的一些操作，防止玩家其他地方登陆后造成
        global.ready = false;
        console.log(`${TeDate.Date_Format(new Date(), "yyyy-MM-dd hh:mm:ss")}:ls disconect`);
        this._TimeOut = setTimeout(this.connect, 5000);
    }

    private _reconnect() {
        this.connect(this._url);
        this._TimeOut = setTimeout(this._reconnect, 5000);
    }

    private _onConnected(linkid) {
        debug('connect to LS sucess' + linkid);
        var newServer = new SeLSInfo(linkid);
        this.allServers[linkid] = newServer;
        this.onSendRegist();
        if (this._TimeOut) {
            clearTimeout(this._TimeOut);
            this._TimeOut = null;
        }
    }

    private _gmsystemmailres: any;
    getgmsystemmailres() {
        return this._gmsystemmailres;
    }

    private _onReciveData(linkid, data) {
        if (!this.allServers.hasOwnProperty(linkid)) {
            this.disconnect(linkid);
        }

        var serverData = this.allServers[linkid];
        // if (data.cmd !== 'registret' && !serverData.ready) {
        //     // 没有注册成功的时候，服务器只处理注册信息
        //     return;
        // }

        // debug(data);

        switch (data.cmd) {
            case 'needregist': this.onSendRegist(); break;
            case 'registret': this._processRegistRet(serverData, data); break;
            case 'loginsuccess': this._processLoginSuccess(serverData, data); break;
            case 'extinfo': this._processExtinfo(serverData, data); break;
            case 'loginfailed': this._processLoginFailed(serverData, data); break;
            case 'createret': this._processCreateAccountRet(serverData, data); break;
            case 'checkac':
                var bOnline = false;
                if (global.playerMgr.getCharInfo(data.id, false)) {
                    bOnline = true;
                }

                this.sendCheckAccountRet(data.account, data.id, bOnline);
                break;
            case 'kick':
                for (var key in data.accountids) {
                    global.playerMgr.kickPlayer(data.accountids[key]);
                }
                break;
            case 'kickAll':
                global.playerMgr.kickAllPlayer();
                break;
            case 'givemails':
                var retIds = [];
                for (var key in data.mails) {
                    var rkMail: SeCharMailInfo = data.mails[key];
                    if (!rkMail) {
                        continue;
                    }

                    global.playerMgr.onGiveMail(data.plt, parseInt(rkMail.mailid.toString()), (rkMail.mailtype == 0 ? SeMailType.GM : rkMail.mailtype), rkMail.message, rkMail.items, 0, rkMail.title, rkMail.endTime);

                    retIds.push(rkMail.cttime);
                    if (data.gmaccount) global.logMgr.gmOprLog(data.gmaccount, parseInt(rkMail.mailid), 'givemailv2', JSON.stringify(rkMail.items));
                }

                if (data.gmaccount) this.sendGiveMailRet(data.gmaccount, retIds);
                break;
            case 'wxmessage': {
                global.playerMgr.getWxMessage(data.openid, data.content);
                break;
            }
            case 'playerproperty':
                global.playerMgr.onPlayerProperty(data.gmid, data.uid, data.e);
                break;
            case 'check_forbid_name':
                let rPlayer = global.playerMgr.getPlayer(data.charid, true);
                if (rPlayer) {
                    if (data.type == 'fcheck') {
                        rPlayer.froce_rename(data.name);
                    }
                    else if (data.type == 'changeName') {
                        rPlayer._changeName(data.name);
                    }
                }

                break;
            case 'recharge': {
                // 充值返回数据
                global.playerMgr.onRechargeOpr(data.type, data.info, data.plt);
                break;
            }
            case 'playerinfo': {
                // 这里发起一个数据库查询
                global.playerMgr.queryPlayerInfo(data.uid, data.type, data.gmlink, data.plt);
                break;
            }
            case 'setplayerinfo': {
                global.playerMgr.setPlayerInfo(data.uid, data.gmaccount, data.type, data.info);
                break;
            }
            case 'filesync': {
                global.resMgr.saveFiles([data]);
                break;
            }
            case 'announcement': {
                global.netMgr.sendAnnouncement(data.notice);
                break;
            }
            case 'inviteret': {
                global.playerMgr.onInviteRet(data.uid, data.type, data.awards, data.code, data.msg, data.extnotice, data.plt);
                break;
            }
            case 'inviteret_ex': {
                global.playerMgr.onInviteRet_Ex(data.uid, data.type, data.awards, data.code, data.msg, data.extnotice, data.awardIndex, data.plt);
                break;
            }
            case 'queryInviteCode': {
                global.playerMgr.onQueryInviteRet(data.uid, data.infos);
                break;
            }
            case 'setGmIsOpen': {
                // global.countMgrInst.set_gm_is_open(data.isOpen);
                break;
            }
            case 'urlrequestback': {
                global.playerMgr.urlrequestback(data.uid, data.param, data.data);
                break;
            }
            case "gmsystemmail": {
                if (data && data.configs) this._save_systemmail(data.configs);
                break;
            }
            case "gmconfigs": {
                if (data && data.configs) this._save_globalconfig(data.configs);
                break;
            }
            case "sync_data": {
                global.syncMgr.sendCSData({'cmd': 'sync_data'});
                global.chartMgr.sendCSData({'cmd': 'sync_data'});
                if(configInst.get('globalCsMgr.url')){
                    global.globalChartMgr.sendCSData({'cmd': 'sync_data'});
                }
                break;
            }
            case "load_data": {
                global.chartMgr.sendCSData({'cmd': 'load_data'});
                if(configInst.get('globalCsMgr.url')){
                    global.globalChartMgr.sendCSData({'cmd': 'load_data'});
                }
                break;
            }
            case 'transferData':
                switch(data.type){
                    case 'pve_pk_rank':
                        var rkPlayer = global.playerMgr.getPlayer(data.uid, false);
                        if (!rkPlayer) {
                            data.ver = '1';
                            global.playerMgr.onGiveMail(configInst.get('plt'), data.uid, SeMailType.CallBackMsg, JSON.stringify(data));
                            break;
                        }
                        rkPlayer.pvpMgr.changePvePkRank(data);
                        break;
                    case 'force_pve_pk_rank':
                        // var rkPlayer = global.playerMgr.getPlayer(data.uid, false);
                        // if (!rkPlayer) {
                        //     data.ver = '1';
                        //     global.playerMgr.onGiveMail(configInst.get('plt'), data.uid, SeMailType.CallBackMsg, JSON.stringify(data));
                        //     break;
                        // }
                        // rkPlayer.pvpMgr.simpleChangePveRank(data);
                        break;
                }
                break;
        }
    };


    private _save_systemmail(configs: SeResSystemMail[]) {
        let newcfg = {};
        try {
            var now = Date.now();
            for (let i = 0; i < configs.length; i++) {
                var pkSysMail = configs[i];
                if (!pkSysMail) continue;
                var startTime = Date.parse(pkSysMail.kStartTime);
                var endTime = startTime + pkSysMail.iDuration * 3600 * 1000;
                if (now < endTime) {
                    newcfg[pkSysMail.kID] = pkSysMail;
                }
            }
            this._gmsystemmailres = newcfg;
            if (global.playerMgr && configs.length > 0) global.playerMgr.checkSystemMail();

            console.log(new Date(), "_save_systemmail", "success", Object.keys(this._gmsystemmailres).length);
        }
        catch (e) {
            console.log(new Date(), '_save_systemmail', e);
        }
    }

    private _gmconfigs: object = {};

    public getconfigs() {
        return this._gmconfigs || {};
    }

    private _save_globalconfig(configs: any) {
        try {
            if (JSON.stringify(configs) != JSON.stringify(this._gmconfigs)) {
                this._gmconfigs = configs;
                global.playerMgr.noticeGmConfigs();
            }
        }
        catch (e) {

        }
    }

    public sendLSData(data) {
        data['_sys_'] = {
            plt: configInst.get('plt'),
            serverid: configInst.get('serverid')
        }
        this.sendData(data);
    };

    public sendPlayerLeave(account: string, uid: number, role?) {
        var leave = {
            cmd: 'pleave',
            account: account,
            uid: uid,
            role: role
        };
        this.sendLSData(leave);
    }

    public sendPlayerReady(account: string, uid: number, linkid, loginInfo, loginTime, role: { lvl: number, icon: string, name: string }) {
        var leave = {
            cmd: 'accounts',
            accounts: [{ ac: account, id: uid, linkid: linkid, loginInfo: loginInfo, logintime: loginTime, role: role }],
        };
        this.sendLSData(leave);
    }

    public sendCheckAccountRet(account: string, id: number, online: boolean) {
        var ret = {
            cmd: 'checkacret',
            account: account,
            id: id,
            online: online,
        };
        this.sendLSData(ret);
    }

    public sendInviteCode(uid: number, code: string, openid: string, openkey: string) {
        var info = {
            cmd: 'invitecode',
            uid: uid,
            code: code,
            openid: openid,
            openkey: openkey
        }

        this.sendLSData(info);
    }

    // 这里是主动 connect过去的但是主要流程还是和listen的一样吧
    private _processRegistRet(serverData: SeLSInfo, data) {
        if (data.type != 'ok') {
            var msg = 'Regist to LS Failed ' + data.type;
            debug(msg);
            //this.emit('ready', false, msg);
            setTimeout(this.onSendRegist.bind(this), 5);
            console.log(msg);
            return;
        }

        global.resMgr.saveFiles(data.files || []);

        serverData.ready = true;
        serverData.id = data.id;


        if (data && data.gmsystemmails) {
            this._save_systemmail(data.gmsystemmails);
        }
        if (data && data.gmconfig) {
            this._save_globalconfig(data.gmconfig);
        }

        this.emit('ready', true, `${TeDate.Date_Format(new Date(), "yyyy-MM-dd hh:mm:ss")}: Regist to LS ok`, data.url);

        // 登陆成功后把当前在线的玩家id上报一下
        var outs = global.playerMgr.getOnlinePlayers();
        if (outs.length > 0) {
            this.sendPlayerAccounts(outs);
        }
    };

    private _processLoginSuccess(serverData, data) {
        // 这里处理成登陆成功
        global.netMgr.sendLoginSucess(data.clientid, data.account, data.id, configInst.get('serverid'));
        global.playerMgr.loginProcess(data.id, data.clientid, data.type, data.account, data.loginInfo);
    };

    private _processExtinfo(serverData, data) {
        global.playerMgr.loadExtinfo(data.uid, data.exinfo);
    }

    private _processLoginFailed(serverData, data) {
        global.netMgr.sendLoginFailed(data.clientid, data.account, data.error, data.ul_time);
        // global.logMgr.log('loginfaild uid:' + data.account + '   error:' + data.error);
    };

    private _processCreateAccountRet(serverData, data) {
        global.netMgr.sendCreateAccountRet(data.clientid, data.account, data.error, data.id);
    };

    public onSendRegist() {
        var data = {
            cmd: 'regist',
            passwd: 'chenkai',
            type: configInst.get('type'),
            id: configInst.get('serverid'),
            files: global.resMgr.getFilesMd5(),
            plt: configInst.get('plt'),
        };

        if (configInst.get('host')) {
            data['url'] = configInst.get('host');
        }

        if (!configInst.get("no_add_port")) {
            // if (configInst.get('plt') == 'sdw' || configInst.get('plt') == 'qzone' || configInst.get('plt') == 'zlzy') {
            //     if (configInst.get('port')) {
            //         data['url'] = data['url'] + ":" + configInst.get('port')
            //     }
            // }
        }

        if (configInst.get("cheatmode") && configInst.get('plts')) {
            data['plts'] = configInst.get('plts');
        }

        this.sendLSData(data);
    };

    public sendLogin(clinetid, account, passwd, info) {
        var Login = {
            cmd: 'login',
            account: account,
            passwd: passwd,
            clientid: clinetid,
            info: info
        };

        this.sendLSData(Login);
    };

    public sendLoginSD(clinetid, info) {
        var Login = {
            cmd: 'loginSD',
            info: info,
            clientid: clinetid
        };

        this.sendLSData(Login);
    };

    public check_forbid_name(charid: number, type: string, name: string, oldname: string, appid: string) {
        var Login = {
            cmd: 'check_forbid_name',
            charid: charid,
            name: name,
            oldname: oldname,
            type: type,
            appid: appid,
        };

        this.sendLSData(Login);
    }

    public sendCreateAccount(clinetid, account, passwd) {
        var Login = {
            cmd: 'accountcreate',
            account: account,
            passwd: passwd,
            clientid: clinetid
        };

        this.sendLSData(Login);
    };

    public sendPlayerAccounts(accounts = []) {
        var accountInfos = {
            cmd: 'accounts',
            accounts: accounts,
        };
        this.sendLSData(accountInfos);
    }

    public sendGiveMailRet(gmaccount, retids) {
        var retInfo = {
            cmd: 'givemailret',
            gmaccount: gmaccount,
            results: retids,
        };

        this.sendLSData(retInfo);
    }

    public sendRecharge(type, info: ifRecharge1 | string) {
        var data = {
            cmd: 'recharge',
            type: type,
            info: info
        }

        this.sendLSData(data);
    }

    public sendPlayerInfo(type, gmlink, uid, info) {
        var data = {
            cmd: 'playerinfo',
            info: info,
            type: type,
            gmlink: gmlink,
            uid: uid,
        }

        this.sendLSData(data);
    }

    public sendSetPlayerInfo(type, gmlink, uid, bsucc) {
        var data = {
            cmd: 'setplayerinfo',
            bsucc: bsucc,
            type: type,
            gmlink: gmlink,
            uid: uid,
        }

        this.sendLSData(data);
    }

    public sendgamebar_msg(uid: number, openid: string, accesstoken: string, frd: string, msgtype: number, content: string, qua: string) {
        var data = {
            cmd: 'gamebar_msg',
            uid: uid,
            openid: openid,
            accesstoken: accesstoken,
            frd: frd,
            msgtype: msgtype,
            content: content,
            qua: qua
        }

        this.sendLSData(data);
    }

    /**
     * 使用道具推送给第三方地址
     * @param url 
     * @param uid 
     * @param itemid 
     */
    public sendUrlRequest(methon: 'get' | 'post', url: string, data: any, uid: number, param: { type: string } | any, datatype: string, appid: string) {
        var info = {
            cmd: "urlrequest",
            url: url,
            methon: methon,
            data: data,
            uid: uid,
            param: param,
            datatype: datatype,
            appid: appid
        }

        this.sendLSData(info);
    }
}

export { SeLSMgr };