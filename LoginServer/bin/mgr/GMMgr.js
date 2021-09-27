"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gmMgrInst = exports.redistInst = void 0;
// 这个是GM使用的管理窗口
const TeNet_1 = require("../lib/TeNet");
const TeRedis_1 = require("../lib/TeRedis");
const OnlinePlayer_1 = require("./OnlinePlayer");
const TeTool_1 = require("../lib/TeTool");
const LoginCheck_1 = require("./LoginCheck");
const NetMgr_1 = require("../NetMgr/NetMgr");
const InviteCodeMgr_1 = require("./InviteCodeMgr");
const serverMgr_1 = require("../NetMgr/serverMgr");
const path = require("path");
const fs_1 = require("fs");
const ResModule_1 = require("../lib/ResModule");
const GameControl_1 = require("./GameControl");
const GameVerMgr_1 = require("./GameVerMgr");
const TeConfig_1 = require("../lib/TeConfig");
const NameDataMgr_1 = require("../lib/NameDataMgr");
var GmProperty;
(function (GmProperty) {
    GmProperty[GmProperty["dailyView"] = 1] = "dailyView";
    GmProperty[GmProperty["playerInfo"] = 2] = "playerInfo";
    GmProperty[GmProperty["kick"] = 4] = "kick";
    GmProperty[GmProperty["giveItem"] = 8] = "giveItem";
    // 初级账号假设到 255 为止 (1<<8 = 256)
    GmProperty[GmProperty["setplayerinfo"] = 256] = "setplayerinfo";
    GmProperty[GmProperty["active"] = 512] = "active";
    GmProperty[GmProperty["servermonit"] = 1024] = "servermonit";
    GmProperty[GmProperty["servermodify"] = 2048] = "servermodify";
    GmProperty[GmProperty["leader"] = 268435456] = "leader";
})(GmProperty || (GmProperty = {}));
class SeDBGmInfo {
}
class SeGmPlayer {
    constructor(parent, linkid) {
        this.account = ''; // 账号名字
        this.passwd = '';
        this.showOnline = false;
        this.parent = parent;
        this.linkid = linkid;
        this.ready = false;
        this.timeouttime = Date.now() + 3 * 60 * 1000;
    }
    hasProperty(p) {
        if ((this.property & p) == p) {
            return true;
        }
        return false;
    }
}
exports.redistInst = new TeRedis_1.TeRedis();
class SeGMMgr extends TeNet_1.TeNet {
    constructor() {
        super();
        // private _netMgr:TeNet = new TeNet();
        this._allGMList = [];
        this.ready = false;
        this.cmd2FuncInfo = {};
        this._tonwitemres = new ResModule_1.SeResModule("TownItem.json");
    }
    init(port, flag) {
        if (!this.ready) {
            this.listen(port, flag);
            this.on('connected', this._onAccept.bind(this));
            this.on('data', this._onReciveData.bind(this));
            this.on('disconnect', this._disconnect.bind(this));
            this.registCmdFunc('login', this, this.onLogin, 0);
            this.registCmdFunc('gmmails', this, this.onGmMails, GmProperty.kick);
            this.registCmdFunc('givemails', this, this.onGiveMails, GmProperty.giveItem);
            this.registCmdFunc('showonline', this, this.onShowOnline, GmProperty.dailyView);
            this.registCmdFunc('kickplayer', this, this.onKickPlayer, GmProperty.kick);
            this.registCmdFunc('kickallplayer', this, this.onKickAllPlayer, GmProperty.kick);
            this.registCmdFunc('creategm', this, this.onCreateGm, GmProperty.leader);
            this.registCmdFunc('allgm', this, this.onAllGM, GmProperty.leader);
            this.registCmdFunc('olsta', this, this._onDailyOnlines, GmProperty.dailyView);
            this.registCmdFunc('playerinfo', this, this.onQueryPlayerInfo, GmProperty.playerInfo);
            this.registCmdFunc('setplayerinfo', this, this.onSetPlayerInfo, GmProperty.setplayerinfo);
            this.registCmdFunc('settoyinfo', this, this.onSetToyInfo, GmProperty.setplayerinfo);
            // this.registCmdFunc('syncfile', this, this.onFileSync, GmProperty.active);
            this.registCmdFunc('lockunlock', this, this.onLockUnlock, GmProperty.kick);
            this.registCmdFunc('announcement', this, this.onAnnouncement, GmProperty.active);
            this.registCmdFunc('chargelist', this, this._rechargelist_, GmProperty.active);
            this.registCmdFunc('playerproperty', this, this._playerproperty, GmProperty.playerInfo);
            this.registCmdFunc('log_query', this, this._log_query, GmProperty.dailyView);
            this.registCmdFunc('cls_state', this, this._cls_state, GmProperty.dailyView);
            this.registCmdFunc('create_invite', this, this._create_invite, GmProperty.active);
            this.registCmdFunc('query_invite', this, this._query_invite, GmProperty.active);
            this.registCmdFunc('query_online_list', this, this._query_online_list, GmProperty.dailyView);
            this.registCmdFunc('query_toy_list', this, this._query_toy_list, GmProperty.playerInfo);
            this.registCmdFunc('query_guild_list', this, this._query_guild_list, GmProperty.playerInfo);
            this.registCmdFunc('recharge_query', this, this.recharge_query, GmProperty.playerInfo);
            this.registCmdFunc('recharge_reset', this, this.recharge_reset, GmProperty.playerInfo | GmProperty.giveItem);
            this.registCmdFunc('querygmsystemmails', this, this.onQueryGmSystemMails, GmProperty.setplayerinfo);
            this.registCmdFunc('updategmsystemmails', this, this.onUpdateGmSystemMails, GmProperty.setplayerinfo);
            this.registCmdFunc('modfily_server_config', this, this._modfily_server_config_, GmProperty.servermodify);
            this.registCmdFunc('query_server_info', this, this._query_server_info_, GmProperty.servermonit);
            // 榜单服务器相关的 api
            this.registCmdFunc("war_zone_infos", this, this._warZoneInfos, GmProperty.dailyView);
            this.registCmdFunc("chart_delete_uid", this, this._char_delete_uid, GmProperty.dailyView);
            this.registCmdFunc("chart_clear", this, this._chart_clear, GmProperty.giveItem);
            this.registCmdFunc('char_info', this, this.query_rank_infos, GmProperty.giveItem);
            this.registCmdFunc("server_loadconfig", this, this._server_loadconfig, GmProperty.servermodify);
            this.registCmdFunc("server_saveconfig", this, this._server_saveconfig, GmProperty.servermodify);
            this.registCmdFunc("load_global_config", this, this.load_global_config, GmProperty.servermodify);
            this.registCmdFunc("save_global_config", this, this.save_global_config, GmProperty.servermodify);
            this.registCmdFunc('set_gm_is_open', this, this.setGmIsOpen, GmProperty.dailyView);
            this.registCmdFunc('sync_data', this, this.syncData, GmProperty.servermodify);
            this.registCmdFunc('load_data', this, this.loadData, GmProperty.servermodify);
            this.ready = true;
            setInterval(this._updateGMs.bind(this), 5000);
            this.onInitGmSystemMails();
            this.init_global_config();
        }
    }
    get gmplayers() {
        return this._allGMList.length;
    }
    _rechargelist_(rkGMPlayer, data) {
        var rgDB = exports.redistInst.getHash('recharge');
        rgDB.load(((linkID, err, db) => {
            this.sendData({ cmd: "chargelist", data: db.value }, linkID);
        }).bind(this, rkGMPlayer.linkid));
    }
    _updateGMs() {
        var nowTime = Date.now();
        for (var key in this._allGMList) {
            var rkGMPlayer = this._allGMList[key];
            if (rkGMPlayer && !rkGMPlayer.ready && rkGMPlayer.timeouttime < nowTime) {
                this.netDisconnect(rkGMPlayer.linkid);
            }
        }
    }
    /**
     *
     * @param cmd 注册的命令
     * @param caller 回调响应的对象
     * @param func 回调函数 如果有返回值那么会自动产生回执信息，否则不产生
     * @param property 权限
     */
    registCmdFunc(cmd, caller, func, property = GmProperty.leader) {
        this.cmd2FuncInfo[cmd] = {
            func: func.bind(caller),
            property: property
        };
    }
    getRegistCmdInfo(cmd) {
        return this.cmd2FuncInfo[cmd];
    }
    _onReciveData(linkid, data) {
        var rkGMPlayer = this.getGMPlayerByLink(linkid);
        if (!rkGMPlayer) {
            this.netDisconnect(linkid);
        }
        if (!rkGMPlayer.ready && data.cmd != 'login') {
            return;
        }
        var info = this.getRegistCmdInfo(data.cmd);
        if (info && rkGMPlayer.hasProperty(info.property)) {
            var bsucc = info.func(rkGMPlayer, data);
            if (bsucc != undefined)
                this.oprret(linkid, data.cmd, bsucc);
        }
    }
    onCreateGmRet(rkGMPlayer, success, account) {
        var ret = {
            cmd: 'creategmret',
            succ: success,
            account: account,
        };
        this.sendData(ret, rkGMPlayer.linkid);
    }
    onAllGM(rkGMPlayer, data) {
        var db = exports.redistInst.getHash('_gm_account_');
        db.load(((err, db) => {
            var infos = db.value;
            this.sendData({ cmd: 'allgm', info: infos }, rkGMPlayer.linkid);
        }).bind(this));
    }
    onCreateGm(rkGMPlayer, data) {
        if (!rkGMPlayer.hasProperty(GmProperty.leader)) {
            this.onCreateGmRet(rkGMPlayer, false);
            return;
        }
        if (!data.account || data.account.length < 4) {
            this.onCreateGmRet(rkGMPlayer, false);
            return;
        }
        if (!data.passwd || data.passwd.length < 6) {
            this.onCreateGmRet(rkGMPlayer, false);
            return;
        }
        data.property = data.property || 0;
        data.property &= (rkGMPlayer.property & ~GmProperty.leader);
        var gmAcc = {
            account: data.account,
            passwd: data.passwd,
            property: data.property,
        };
        var rkHashMember = exports.redistInst.getHashMember('_gm_account_', data.account);
        rkHashMember.save(gmAcc);
        this.onCreateGmRet(rkGMPlayer, true, data.account);
        return;
    }
    onPlayerChange(login, player) {
        for (var key in this._allGMList) {
            var rkGMPlayer = this._allGMList[key];
            if (rkGMPlayer && rkGMPlayer.showOnline) {
                this.sendOnlinePlayerRet(rkGMPlayer.linkid, login, [player]);
            }
        }
    }
    onKickPlayer(rkGMPlayer, data) {
        OnlinePlayer_1.onlineMgrInst.kickPlayer(data.id, data.plt);
    }
    onKickAllPlayer(rkGMPlayer, data) {
        OnlinePlayer_1.onlineMgrInst.kickAllPlayer(data.plt);
    }
    onShowOnline(rkGMPlayer, data) {
        rkGMPlayer.showOnline = data.showOnline;
        if (data.showOnline) {
            // 这里吧所有在线玩家发送一次
            this.sendOnlinePlayerRet(rkGMPlayer.linkid, true, OnlinePlayer_1.onlineMgrInst.gmGetOnlinePlayer());
        }
    }
    _query_online_list(rkGMPlayer, data) {
        var r_player_info = OnlinePlayer_1.onlineMgrInst.gm_get_online_player(data.ipage, data.plt);
        this.sendQueryPlayerListRet(rkGMPlayer.linkid, r_player_info.page, r_player_info.tot_page, r_player_info.infos, r_player_info.i_tot_num);
    }
    _query_toy_list(rkGMPlayer, data) {
        // 榜单服会是有多个的，所以这里抓取所有榜单服的信息
        let servers = serverMgr_1.serverMonitInst.get_server_by_type_all('cts');
        for (let i = 0; i < servers.length; i++) {
            // 因为不知道这个榜单具体工作几个平台，所以这里都通知一下
            NetMgr_1.netMgrInst.sendData({
                cmd: 'toy_info',
                gmid: rkGMPlayer.account,
            }, servers[i].linkid);
        }
    }
    _query_guild_list(rkGMPlayer, data) {
        let servers = serverMgr_1.serverMonitInst.get_server_by_type_all('gus');
        for (let i = 0; i < servers.length; i++) {
            // 因为不知道这个榜单具体工作几个平台，所以这里都通知一下
            NetMgr_1.netMgrInst.sendData({
                cmd: 'guild_info',
                guild_id: data.guild_id,
                gmid: rkGMPlayer.account,
            }, servers[i].linkid);
        }
    }
    onLogin(rkGMPlayer, data) {
        if (!data.account || !data.passwd) {
            this.sendLoginRet({
                linkid: rkGMPlayer.linkid, account: rkGMPlayer.account, type: 'psderr', property: rkGMPlayer.property, tables: {
                    TownItem: this._tonwitemres.resData
                }, plts: GameVerMgr_1.GameVerMgr.inst.allplts()
            });
            return;
        }
        rkGMPlayer.account = data.account;
        rkGMPlayer.passwd = data.passwd;
        if (rkGMPlayer.account == '陈凯0113' && rkGMPlayer.passwd == 'cWscisnPsd125483sdaw') {
            // 临时代码，表示最高的gm,省得改代码了
            rkGMPlayer.ready = true;
            rkGMPlayer.property = (1 << 30) - 1;
            var errType = 'success';
            this.sendLoginRet({
                linkid: rkGMPlayer.linkid, account: rkGMPlayer.account, type: errType, property: rkGMPlayer.property, tables: {
                    TownItem: this._tonwitemres.resData
                }, plts: GameVerMgr_1.GameVerMgr.inst.allplts()
            });
        }
        else {
            // GM登陆需要去检查一下对应的账号信息
            var rkHashMem = exports.redistInst.getHashMember('_gm_account_', rkGMPlayer.account);
            rkHashMem.load(this.onLoginDBRet.bind(this, rkGMPlayer, rkHashMem));
        }
    }
    addGmMails(gmid, mails) {
        var rgm = this.getGMPlayer(gmid);
        if (rgm) {
            this.sendData({
                cmd: 'gmmails',
                type: 'add',
                mails: mails
            }, rgm.linkid);
        }
        var sInfos = [];
        for (var i = 0; i < mails.length; i++) {
            sInfos.push({
                k: mails[i].mailid,
                v: mails[i]
            });
        }
        var rkHash = exports.redistInst.getHash('_gm_mail_' + gmid);
        rkHash.msave(sInfos);
    }
    onGmMails(rkGMPlayer, data) {
        if (data.type == 'load') {
            var rkHash = exports.redistInst.getHash('_gm_mail_' + rkGMPlayer.account);
            rkHash.load((succ, _rkHash) => {
                this.sendData({
                    cmd: 'gmmails',
                    type: 'load',
                    mails: _rkHash.value
                }, rkGMPlayer.linkid);
            });
        }
        else if (data.type == 'del') {
            exports.redistInst.del_hash_key('_gm_mail_' + rkGMPlayer.account, data.info);
            this.sendData({
                cmd: 'gmmails',
                type: 'del',
                mails: data.info
            }, rkGMPlayer.linkid);
        }
    }
    onLoginDBRet(_gmPlayer, _kHash, success) {
        var errType = 'nogm';
        if (success) {
            var dbGM = _kHash.value;
            if (dbGM && dbGM.account == _gmPlayer.account && dbGM.passwd == _gmPlayer.passwd) {
                _gmPlayer.property = dbGM.property;
                _gmPlayer.ready = true;
                errType = 'success';
            }
            else {
                errType = 'psderr';
            }
        }
        this.sendLoginRet({
            linkid: _gmPlayer.linkid, account: _gmPlayer.account, type: errType, property: _gmPlayer.property, tables: {
                TownItem: this._tonwitemres.resData
            }, plts: GameVerMgr_1.GameVerMgr.inst.allplts()
        });
    }
    onGiveMails(rkGMPlayer, data) {
        if (!(data.mails instanceof Array)) {
            return;
        }
        // 这里暂定只能使用玩家数字id来发送道具，玩家数据是按照数字id规律存储的
        var postSource = {};
        for (var key in data.mails) {
            var rkMail = data.mails[key];
            var charid = rkMail.mailid;
            var serverLink = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(parseInt(charid), rkMail['plt'] || data.plt || 'sdw');
            if (!postSource.hasOwnProperty(serverLink)) {
                postSource[serverLink] = [];
            }
            postSource[serverLink].push(rkMail);
        }
        for (var key in postSource) {
            NetMgr_1.netMgrInst.sendGiveMail(key, postSource[key], rkGMPlayer.account);
        }
    }
    _onDailyOnlines(rkGMPlayer, data) {
        var rkBeginTime = data.begintime || 0, rkEndTime = data.endtime || 0;
        var kSorted = exports.redistInst.getSortedSet(OnlinePlayer_1.StaDefine.dailyinfo, 0, false);
        var rkBeginStr = '-inf';
        var kEndStr = '+inf';
        if (rkEndTime != 0) {
            kEndStr = '' + parseInt(TeTool_1.TeDate.Date_Format(new Date(rkEndTime), 'yyyyMMddhh'));
        }
        if (rkBeginTime != 0) {
            rkBeginStr = '' + parseInt(TeTool_1.TeDate.Date_Format(new Date(rkBeginTime), 'yyyyMMddhh'));
        }
        //   rkSorted.loadByScore(rkBeginStr, kEndStr,this._onStaLoad.bind(this,rkSorted,rkGMPlayer,rkBeginTime,rkEndTime));
        kSorted.loadByScore(rkBeginStr, kEndStr, ((rkSorted, bsucc) => {
            //  kSorted.load(((rkSorted,bsucc) => {
            var bkdata = {
                cmd: 'olsta',
                begintime: rkBeginTime,
                endtime: rkEndTime,
                infos: (bsucc ? rkSorted.value : []),
            };
            this.sendData(bkdata, rkGMPlayer.linkid);
        }).bind(this, kSorted));
        // this._log_query(rkGMPlayer, { type: '111', channel: '111', plt: '1111' });
    }
    _onStaLoad(rkSorted, rkGMPlayer, rkBeginTime, rkEndTime, bsucc) {
        var bkdata = {
            cmd: 'olsta',
            begintime: rkBeginTime,
            endtime: rkEndTime,
            infos: (bsucc ? rkSorted.value : []),
        };
        this.sendData(bkdata, rkGMPlayer.linkid);
    }
    onGiveMailsRet(_sys_, gmaccount, results) {
        var rkGMPlayer = this.getGMPlayer(gmaccount);
        if (!rkGMPlayer) {
            return;
        }
        this.sendGiveMailsRet(rkGMPlayer.linkid, results);
    }
    _playerproperty(rkGMPlayer, data) {
        var serverLink = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(data.uid, data.plt);
        if (serverLink) {
            NetMgr_1.netMgrInst.sendPlayerProperty(serverLink, rkGMPlayer.account, data.uid, data.e);
            return true;
        }
        return false;
    }
    _log_query(rkGMPlayer, data) {
        // 这个需要发送给日志服务器
        var serverLink = serverMgr_1.serverMonitInst.get_server_link_by_type('ls', 'none');
        if (serverLink) {
            data['cmd'] = 'log_query';
            data['gmid'] = rkGMPlayer.account;
            NetMgr_1.netMgrInst.sendData(data, serverLink);
            return true;
        }
        return false;
    }
    _modfily_server_config_(rkGMPlayer, data) {
        var bsucc = serverMgr_1.serverMonitInst.modify_server(data.sid, data.optinfo);
        this.sendData({
            cmd: 'modfily_server_config',
            sid: data.sid,
            bsucc: bsucc
        }, rkGMPlayer.linkid);
    }
    _query_server_info_(rkGMPlayer, data) {
        // 这里返回所有的服务器的配置 信息和服务器状态
        var info = serverMgr_1.serverMonitInst.get_server_info(data.plt);
        this.sendData({
            cmd: 'query_server_info',
            serverinfos: info
        }, rkGMPlayer.linkid);
    }
    _cls_state(rkGMPlayer, data) {
        // 这个需要发送给日志服务器
        this.sendData({
            cmd: 'cls_state',
            info: serverMgr_1.serverMonitInst.get_num_by_type('cls', data.plt),
            type: data.type,
        });
    }
    _create_invite(rkGMPlayer, data) {
        // 这个需要发送给日志服务器
        InviteCodeMgr_1.InviteCodeMgrInst.create_code(data.plt, data.inviteId, data.num, data.seed, data.ft_seed, data.onlynum, data.addcount, rkGMPlayer.account);
        return false;
    }
    _query_invite(rkGMPlayer, data) {
        // 这个需要发送给日志服务器
        InviteCodeMgr_1.InviteCodeMgrInst.query_invite(data.plt, rkGMPlayer.account);
        return false;
    }
    _warZoneInfos(rkGMPlayer, data) {
        // 这个需要发送给日志服务器
        var serverLink = serverMgr_1.serverMonitInst.get_server_link_by_type_all('cts', 'none');
        if (serverLink) {
            data['cmd'] = 'war_zone_infos';
            data['gmid'] = rkGMPlayer.account;
            for (let i = 0; i < serverLink.length; i++) {
                NetMgr_1.netMgrInst.sendData(data, serverLink[i]);
            }
            return true;
        }
        return false;
    }
    _char_delete_uid(rkGMPlayer, data) {
        // 这个需要发送给日志服务器
        var serverLink = serverMgr_1.serverMonitInst.get_server_link_by_type_all('cts', 'none');
        if (serverLink) {
            data['cmd'] = 'chart_delete_uid';
            data['gmid'] = rkGMPlayer.account;
            for (let i = 0; i < serverLink.length; i++) {
                NetMgr_1.netMgrInst.sendData(data, serverLink[i]);
            }
            return true;
        }
        return false;
    }
    _chart_clear(rkGMPlayer, data) {
        // 这个需要发送给日志服务器
        var serverLink = serverMgr_1.serverMonitInst.get_server_link_by_type_all('cts', 'none');
        if (serverLink) {
            data['cmd'] = 'chart_clear';
            data['gmid'] = rkGMPlayer.account;
            for (let i = 0; i < serverLink.length; i++) {
                NetMgr_1.netMgrInst.sendData(data, serverLink[i]);
            }
            return true;
        }
        return false;
    }
    _load_file(file) {
        let info = '{}';
        try {
            info = fs_1.readFileSync(path.join(process.cwd(), file)).toString();
        }
        catch (e) {
        }
        return info;
    }
    _save_file(file, info) {
        try {
            // 这里需要备份一下老的数据
            fs_1.writeFileSync(path.join(process.cwd(), file + '_back'), this._load_file(file), { flag: 'w+' });
            // 然后写入新的数据
            fs_1.writeFileSync(path.join(process.cwd(), file), info, { flag: 'w+' });
            return true;
        }
        catch (e) {
            return false;
        }
    }
    /**加载动态配置的config */
    _server_loadconfig(rkGMPlayer, data) {
        // 目前只支持 login 的
        switch (data.type) {
            case 'login': {
                // 如果是登陆服那么
                this.sendData({ cmd: 'server_loadconfig', info: this._load_file(data.file), serverid: data.serverid, file: data.file, plt: data.plt }, rkGMPlayer.linkid);
                break;
            }
        }
    }
    /**加载动态配置的config */
    _server_saveconfig(rkGMPlayer, data) {
        switch (data.type) {
            case 'login': {
                // 如果是登陆服那么
                this.sendData({ cmd: 'server_saveconfig', info: this._save_file(data.file, data.info), serverid: data.serverid, file: data.file, plt: data.plt }, rkGMPlayer.linkid);
                break;
            }
        }
    }
    init_global_config() {
        exports.redistInst.getHash("gmconfig").load((succ, db) => {
            this._GMConfigDB = db;
            this._gm_gloconfig_notice_to_cls();
            // gm配置生效
            GameControl_1.GameControl.inst.loadcfgs();
        });
    }
    /**加载动态配置的config */
    load_global_config(rkGMPlayer, data) {
        this.sendData({ cmd: 'load_global_config', info: this._GMConfigDB.value }, rkGMPlayer.linkid);
    }
    getGlobalConfig(plt) {
        let out = {};
        if (this._GMConfigDB) {
            let all_cfg = this._GMConfigDB.get("all_plt");
            if (all_cfg)
                out = TeTool_1.func_copy_in(out, all_cfg);
            let plt_cfg = this._GMConfigDB.get(plt);
            if (plt_cfg)
                out = TeTool_1.func_copy_in(out, plt_cfg);
        }
        return out;
    }
    /**保存动态配置的config */
    save_global_config(rkGMPlayer, data) {
        if (data && data.configs) {
            let cfgs = this._GMConfigDB.value;
            for (let i = 0; i < data.configs.length; i++) {
                let r_o = data.configs[i];
                if (!r_o)
                    continue;
                let r_cfg = cfgs[r_o.plt] || {};
                if (r_o.delete) {
                    delete r_cfg[r_o.key];
                }
                else {
                    r_cfg[r_o.key] = r_o.value;
                }
                cfgs[r_o.plt] = r_cfg;
            }
            let mlist = [];
            for (let key in cfgs) {
                mlist.push({
                    k: key,
                    v: cfgs[key]
                });
            }
            this._GMConfigDB.msave(mlist);
        }
        this.sendData({ cmd: 'save_global_config', info: this._GMConfigDB.value }, rkGMPlayer.linkid);
        this._gm_gloconfig_notice_to_cls();
    }
    switch_global_config(plt, key, value, bdelete) {
        let r_cfg = this._GMConfigDB.get(plt) || {};
        let change = false;
        if (bdelete && r_cfg.hasOwnProperty(key)) {
            change = true;
            delete r_cfg[key];
        }
        else if (r_cfg[key] != value) {
            change = true;
            r_cfg[key] = value;
        }
        if (change) {
            this._GMConfigDB.save(plt, r_cfg);
            this._gm_gloconfig_notice_to_cls();
        }
    }
    get_global_config(plt, key) {
        let r_cfg = this._GMConfigDB.get(plt) || {};
        return r_cfg[key] || null;
    }
    _gm_gloconfig_notice_to_cls() {
        let servers = serverMgr_1.serverMonitInst.get_server_by_type_all('cls');
        for (let i = 0; i < servers.length; i++) {
            let r_server = servers[i];
            if (r_server.ready) {
                // 需要单独通知一下
                NetMgr_1.netMgrInst.sendData({
                    cmd: "gmconfigs",
                    configs: this.getGlobalConfig(r_server.plt)
                }, r_server.linkid);
            }
        }
    }
    /**---------------------------------------------------------------- */
    /**
     * 查询玩家信息
     */
    onQueryPlayerInfo(rkGMPlayer, data) {
        var clsID = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(data.uid, data.plt);
        NetMgr_1.netMgrInst.sendQueryPlayerInfo(clsID, data.uid, data.type, rkGMPlayer.linkid);
    }
    onQueryPlayerInfoRet(_sys_, data) {
        var info = data.info;
        var type = data.type;
        var gmlink = data.gmlink;
        var uid = data.uid;
        this.sendData({ cmd: 'playerinfo', type: type, info: info, uid: uid }, gmlink);
    }
    onSetPlayerInfo(rkGMPlayer, data) {
        var clsID = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(data.uid, data.plt);
        clsID && NetMgr_1.netMgrInst.sendSetPlayerInfo(clsID, data.uid, data.type, rkGMPlayer.account, data.info);
    }
    onSetToyInfo(rkGMPlayer, data) {
        let servers = serverMgr_1.serverMonitInst.get_server_by_type_all('cts');
        for (let i = 0; i < servers.length; i++) {
            // 因为不知道这个榜单具体工作几个平台，所以这里都通知一下
            NetMgr_1.netMgrInst.sendData(data, servers[i].linkid);
        }
    }
    setGmIsOpen(rkGMPlayer, data) {
        //通知类型的cloud
        var clss = serverMgr_1.serverMonitInst.get_server_link_by_type_all('cls', data.xplt);
        for (let i = 0; i < clss.length; i++) {
            NetMgr_1.netMgrInst.sendData({ cmd: 'setGmIsOpen', isOpen: data.isOpen }, clss[i]);
        }
    }
    syncData(rkGMPlayer, data) {
        var clss = serverMgr_1.serverMonitInst.get_server_link_by_type_all('cls', data.plt);
        for (let i = 0; i < clss.length; i++) {
            NetMgr_1.netMgrInst.sendData({ cmd: 'sync_data' }, clss[i]);
        }
    }
    loadData(rkGMPlayer, data) {
        var clss = serverMgr_1.serverMonitInst.get_server_link_by_type_all('cls', data.plt);
        for (let i = 0; i < clss.length; i++) {
            NetMgr_1.netMgrInst.sendData({ cmd: 'load_data' }, clss[i]);
        }
    }
    // private onFileSync(rkGMPlayer: SeGmPlayer, data) {
    //     var name: string = data.name, info: string = data.info;
    //     var bsucc = global.fileSyncMgr.addSyncFile(name, info);
    //     this.sendData({
    //         cmd: 'syncfile',
    //         succ: bsucc
    //     }, rkGMPlayer.linkid);
    // }
    onLockUnlock(rkGMPlayer, data) {
        var uid = data.uid, lockType = data.locktype;
        if (lockType != 0)
            OnlinePlayer_1.onlineMgrInst.kickPlayer(uid, data.plt);
        LoginCheck_1.SeLoginCheck.gmLockUnlock(uid, lockType, ((linkID, _uid) => {
            this.sendData({
                cmd: 'lockunlock',
                bsucc: true,
                uid: _uid
            }, linkID);
        }).bind(this, rkGMPlayer.linkid));
    }
    onAnnouncement(rkGMPlayer, data) {
        if (!data || !data.notice || data.notice == '')
            return;
        if (data.all) {
            NetMgr_1.netMgrInst.sendAll({
                cmd: 'announcement',
                notice: data.notice
            });
        }
        else if (data.plt) {
            let server_links = serverMgr_1.serverMonitInst.get_server_links('cls', data.plt);
            for (let i = 0; i < server_links.length; i++) {
                NetMgr_1.netMgrInst.sendServerData(server_links[i], {
                    cmd: 'announcement',
                    notice: data.notice
                });
            }
        }
    }
    get_gm_systemmail(plt) {
        // 一共两部分，全平台和单平台的
        let curr = Date.now();
        let cfgs = [];
        if (this._GMSystemMailsDB) {
            let all_dbs = this._GMSystemMailsDB.get('all_plt');
            if (all_dbs) {
                let change = false;
                for (let i = 0; i < all_dbs.length; i++) {
                    let r = all_dbs[i];
                    if (curr > Date.parse(r.kStartTime) + r.iDuration * 60 * 60 * 1000) {
                        // 表示过期了的可以删除了
                        all_dbs.splice(i, 1);
                        i--;
                        change = true;
                        continue;
                    }
                    cfgs.push(r);
                }
                if (change) {
                    this._GMSystemMailsDB.save('all_plt', all_dbs);
                }
            }
            let plt_dbs = this._GMSystemMailsDB.get(plt);
            if (plt_dbs) {
                let change = false;
                for (let i = 0; i < plt_dbs.length; i++) {
                    let r = plt_dbs[i];
                    if (curr > Date.parse(r.kStartTime) + r.iDuration * 60 * 60 * 1000) {
                        // 表示过期了的可以删除了
                        plt_dbs.splice(i, 1);
                        i--;
                        change = true;
                        continue;
                    }
                    cfgs.push(r);
                }
                if (change) {
                    this._GMSystemMailsDB.save(plt, plt_dbs);
                }
            }
        }
        return cfgs;
    }
    onInitGmSystemMails() {
        exports.redistInst.getHash('all_gm_system_mails').load((succ, db) => {
            this._GMSystemMailsDB = db;
            // 加载好了之后要看一下已经注册过了的逻辑服
            this._gm_systemmail_notice_to_cls();
        });
    }
    _gm_systemmail_notice_to_cls() {
        let servers = serverMgr_1.serverMonitInst.get_server_by_type_all('cls');
        for (let i = 0; i < servers.length; i++) {
            let r_server = servers[i];
            if (r_server) {
                console.log('notice to server systemmail', r_server.plt, r_server.id);
                // 需要单独通知一下
                NetMgr_1.netMgrInst.sendData({
                    cmd: "gmsystemmail",
                    configs: this.get_gm_systemmail(r_server.plt)
                }, r_server.linkid);
            }
        }
    }
    onQueryGmSystemMails(rkGMPlayer, data) {
        return this.sendData({
            cmd: 'querygmsystemmails',
            configs: this._GMSystemMailsDB.value
        }, rkGMPlayer.linkid);
    }
    onUpdateGmSystemMails(rkGMPlayer, data) {
        let check_keys = ['kID', 'kTitle', 'kDesc', 'kStartTime', 'iDuration', 'akItems'];
        // 一次同步直接修改掉玩家的配置信息        
        this._GMSystemMailsDB.clearAll();
        for (let plt in data.config) {
            let cfgs = data.config[plt];
            if (!cfgs)
                continue;
            let real_cfgs = [];
            for (let i = 0; i < cfgs.length; i++) {
                let r_cfg = cfgs[i];
                if (!r_cfg)
                    continue;
                // 检查一下字段是否合法
                for (let j = 0; j < check_keys.length; j++) {
                    if (!r_cfg.hasOwnProperty(check_keys[j])) {
                        continue;
                    }
                }
                real_cfgs.push(r_cfg);
            }
            this._GMSystemMailsDB.save(plt, real_cfgs);
        }
        // 这里通知给所有的逻辑服
        this._gm_systemmail_notice_to_cls();
        this.sendData({
            cmd: 'updategmsystemmails',
            config: this._GMSystemMailsDB.value
        }, rkGMPlayer.linkid);
    }
    /**-------------------------------------------------------------------------------------------**/
    // 榜单信息
    query_rank_infos(rkGMPlayer, data) {
        // 榜单服会是有多个的，所以这里抓取所有榜单服的信息
        let servers = serverMgr_1.serverMonitInst.get_server_by_type_all('cts');
        for (let i = 0; i < servers.length; i++) {
            // 因为不知道这个榜单具体工作几个平台，所以这里都通知一下
            NetMgr_1.netMgrInst.sendData({
                cmd: 'chart_info',
                gmid: rkGMPlayer.account,
                plts: data.plts,
                charttype: data.charttype,
                len: data.len
            }, servers[i].linkid);
        }
    }
    /**-------------------------------------------------------------------------------------------**/
    onSetPlayerInfoRet(_sys_, data) {
        var info = data.info;
        var type = data.type;
        var gmlink = data.gmlink;
        var uid = data.uid;
        var bsucc = data.bsucc;
        var r = this.getGMPlayer(gmlink);
        if (r)
            this.sendData({ cmd: 'setplayerinfo', type: type, info: info, uid: uid, bsucc }, r.linkid);
        if (TeConfig_1.configInst.get("change_name")) {
            NameDataMgr_1.NameDataMgr._receive_ret(uid, bsucc);
        }
    }
    onGmQueryRet(gmid, data) {
        var r = this.getGMPlayer(gmid);
        delete data['_sys_'];
        r && this.sendData(data, r.linkid);
    }
    _onAccept(linkid) {
        if (this.getGMPlayerByLink(linkid)) {
            this.delGMPlayer(linkid);
        }
        this.addGMPlayer(this, linkid);
    }
    _disconnect(linkid, type) {
        this.delGMPlayer(linkid);
    }
    netDisconnect(linkid) {
        this.disconnect(linkid);
    }
    getGMPlayer(account) {
        for (var key in this._allGMList) {
            var rkGMPlayer = this._allGMList[key];
            if (rkGMPlayer && rkGMPlayer.account == account) {
                return rkGMPlayer;
            }
        }
        return null;
    }
    getGMPlayerByLink(linkid) {
        for (var key in this._allGMList) {
            var rkGMPlayer = this._allGMList[key];
            if (rkGMPlayer && rkGMPlayer.linkid == linkid) {
                return rkGMPlayer;
            }
        }
        return null;
    }
    addGMPlayer(account, linkid) {
        if (this.getGMPlayer(account)) {
            return false;
        }
        if (this.getGMPlayerByLink(linkid)) {
            return false;
        }
        this._allGMList.push(new SeGmPlayer(this, linkid));
    }
    delGMPlayer(linkid) {
        for (var key in this._allGMList) {
            var rkGMPlayer = this._allGMList[key];
            if (rkGMPlayer && rkGMPlayer.linkid == linkid) {
                this._allGMList.splice(parseInt(key), 1);
                break;
            }
        }
    }
    sendLoginRet({ linkid, account, type, property, tables, plts }) {
        var cmd = {
            cmd: 'loginret',
            account: account,
            type: type,
            property: property,
            tables: tables,
            plts: plts
        };
        this.sendData(cmd, linkid);
    }
    sendGiveMailsRet(linkid, results) {
        var cmd = {
            cmd: 'givemailsret',
            results: results,
        };
        this.sendData(cmd, linkid);
    }
    sendCreateInviteRet(gmid, ...result) {
        var r = this.getGMPlayer(gmid);
        if (!r)
            return;
        var cmd = {
            cmd: 'createInviteRet',
            results: result,
        };
        this.sendData(cmd, r.linkid);
    }
    sendQueryInviteRet(gmid, ...result) {
        var r = this.getGMPlayer(gmid);
        if (!r)
            return;
        var cmd = {
            cmd: 'queryInviteRet',
            results: result,
        };
        this.sendData(cmd, r.linkid);
    }
    sendOnlinePlayerRet(linkid, login, players) {
        var cmd = {
            cmd: 'onlines',
            login: login,
            players: players,
        };
        this.sendData(cmd, linkid);
    }
    sendQueryPlayerListRet(linkid, ipage, itotpage, players, itotnum) {
        var cmd = {
            cmd: 'query_online_list',
            ipage: ipage,
            players: players,
            itotpage: itotpage,
            itotnum: itotnum
        };
        this.sendData(cmd, linkid);
    }
    oprret(linkid, type, bsucc) {
        var cmd = {
            cmd: 'optret',
            type: type,
            succ: bsucc
        };
        this.sendData(cmd, linkid);
    }
    sendChartInfoRet(gmid, infos) {
        var r = this.getGMPlayer(gmid);
        if (!r)
            return;
        var cmd = {
            cmd: 'chart_info_ret',
            infos: infos,
        };
        this.sendData(cmd, r.linkid);
    }
    sendToyInfoRet(gmid, infos) {
        var r = this.getGMPlayer(gmid);
        if (!r)
            return;
        var cmd = {
            cmd: 'toy_info_ret',
            infos: infos,
        };
        this.sendData(cmd, r.linkid);
    }
    sendGuildInfoRet(gmid, infos) {
        var r = this.getGMPlayer(gmid);
        if (!r)
            return;
        var cmd = {
            cmd: 'guild_info_ret',
            infos: infos,
        };
        this.sendData(cmd, r.linkid);
    }
    sendChartClearRet(gmid, infos) {
        var r = this.getGMPlayer(gmid);
        if (!r)
            return;
        var cmd = {
            cmd: 'chart_clear_ret',
            infos: infos,
        };
        this.sendData(cmd, r.linkid);
    }
    deal_cheat(uid, data) {
        // 删除榜单
        var serverLink = serverMgr_1.serverMonitInst.get_server_link_by_type_all('cts', 'none');
        if (serverLink) {
            data['cmd'] = 'chart_delete_uid';
            data['gmid'] = null;
            for (let i = 0; i < serverLink.length; i++) {
                NetMgr_1.netMgrInst.sendData(data, serverLink[i]);
            }
        }
        //封号
        var lockType = 2; //永久封
        if (lockType != 0)
            OnlinePlayer_1.onlineMgrInst.kickPlayer(uid, data.plt);
        LoginCheck_1.SeLoginCheck.gmLockUnlock(uid, lockType, null);
    }
    toallgm(data) {
        delete data['_sys_'];
        this.sendAll(data);
    }
    ;
    recharge_reset(rkGMPlayer, order) {
        if (!order)
            return;
        // redistInst.getHashMember('recharge', order).load((succ, db) => {
        //     rechargeMgrInst.requestPayList
        //     if(db.value &&  db.value )
        //     this.sendData({
        //         cmd: 'recharge_query',
        //         order: order,
        //         data: db.value
        //     }, rkGMPlayer.linkid);
        // });
    }
    recharge_query(rkGMPlayer, order) {
        if (!order)
            return;
        exports.redistInst.getHashMember('recharge', order).load((succ, db) => {
            this.sendData({
                cmd: 'recharge_query',
                order: order,
                data: db.value
            }, rkGMPlayer.linkid);
        });
    }
}
exports.gmMgrInst = new SeGMMgr();
//# sourceMappingURL=GMMgr.js.map