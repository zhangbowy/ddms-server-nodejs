// 这个是GM使用的管理窗口
import { TeNet } from "../lib/TeNet";
import { TeRedis, ReHash, ReHashMember } from '../lib/TeRedis';
import { StaDefine, onlineMgrInst } from './OnlinePlayer';
import { TeDate, if_sys_, func_copy_in } from '../lib/TeTool';
import { SeLoginCheck } from './LoginCheck';
import { netMgrInst } from '../NetMgr/NetMgr';
import { InviteCodeMgrInst } from './InviteCodeMgr';
import { serverMonitInst } from '../NetMgr/serverMgr';
import * as path from 'path';
import { readFileSync, writeFileSync } from "fs";
import { SeResSystemMail } from "../Res/interface";
import { SeResModule } from "../lib/ResModule";
import { GameControl } from "./GameControl";
import { GameVerMgr } from "./GameVerMgr";
import { configInst } from '../lib/TeConfig';
import { NameDataMgr } from '../lib/NameDataMgr';

enum GmProperty {
    dailyView = 1 << 0,
    playerInfo = 1 << 1,
    kick = 1 << 2,
    giveItem = 1 << 3,
    // 初级账号假设到 255 为止 (1<<8 = 256)
    setplayerinfo = 1 << 8,
    active = 1 << 9,
    servermonit = 1 << 10,
    servermodify = 1 << 11,
    leader = 1 << 28,
}

class SeDBGmInfo {
    account: string;
    passwd: string;
    property: number;
}

interface SeCharMailInfo {
    mailid: string;     // 邮件的认证id
    uid: number;
    message: string;    // 邮件的消息信息
    title: string;         //标题
    endTime: number;            //过期时间，0的话表示永久
    items: Array<{ kItemID: string, iPileCount: number }>;
    mailtype: number;
    cttime: number;
}

class SeGmPlayer {
    constructor(parent: any, linkid: string) {
        this.parent = parent;
        this.linkid = linkid;
        this.ready = false;
        this.timeouttime = Date.now() + 3 * 60 * 1000;
    }

    public hasProperty(p: GmProperty) {
        if ((this.property & p) == p) {
            return true;
        }

        return false;
    }
    account: string = '';     // 账号名字
    passwd: string = '';

    property: number;       // 账号特权
    linkid: string;      // 链接id

    ready: boolean;
    parent: any;

    timeouttime: number;
    showOnline: boolean = false;
}

export var redistInst = new TeRedis();

class SeGMMgr extends TeNet {
    // private _netMgr:TeNet = new TeNet();
    private _allGMList: Array<SeGmPlayer> = [];
    public ready: boolean = false;

    private _tonwitemres: SeResModule<any>;

    constructor() {
        super();
        this._tonwitemres = new SeResModule("TownItem.json");
    }

    init(port: number, flag) {
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
            this.registCmdFunc("chart_clear",this, this._chart_clear, GmProperty.giveItem);
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

    private _rechargelist_(rkGMPlayer: SeGmPlayer, data) {
        var rgDB = redistInst.getHash('recharge');
        rgDB.load(((linkID, err, db: ReHash) => {
            this.sendData({ cmd: "chargelist", data: db.value }, linkID);
        }).bind(this, rkGMPlayer.linkid));
    }

    private _updateGMs() {
        var nowTime = Date.now();
        for (var key in this._allGMList) {
            var rkGMPlayer: SeGmPlayer = this._allGMList[key];
            if (rkGMPlayer && !rkGMPlayer.ready && rkGMPlayer.timeouttime < nowTime) {
                this.netDisconnect(rkGMPlayer.linkid);
            }
        }
    }

    private cmd2FuncInfo: Object = {};
    /**
     * 
     * @param cmd 注册的命令
     * @param caller 回调响应的对象
     * @param func 回调函数 如果有返回值那么会自动产生回执信息，否则不产生
     * @param property 权限
     */
    private registCmdFunc(cmd: string, caller: Object, func: (gm: SeGmPlayer, data: any) => boolean | void, property = GmProperty.leader) {
        this.cmd2FuncInfo[cmd] = {
            func: func.bind(caller),
            property: property
        }
    }

    private getRegistCmdInfo(cmd: string): { func: Function, property: number } {
        return this.cmd2FuncInfo[cmd];
    }

    private _onReciveData(linkid: string, data: any) {
        var rkGMPlayer: SeGmPlayer = this.getGMPlayerByLink(linkid);
        if (!rkGMPlayer) {
            this.netDisconnect(linkid);
        }

        if (!rkGMPlayer.ready && data.cmd != 'login') {
            return;
        }


        var info = this.getRegistCmdInfo(data.cmd);
        if (info && rkGMPlayer.hasProperty(info.property)) {
            var bsucc = info.func(rkGMPlayer, data);
            if (bsucc != undefined) this.oprret(linkid, data.cmd, bsucc);
        }
    }

    private onCreateGmRet(rkGMPlayer: SeGmPlayer, success: boolean, account?: string) {
        var ret: Ptl_LS2GM.CreateGMRet = {
            cmd: 'creategmret',
            succ: success,
            account: account,
        }

        this.sendData(ret, rkGMPlayer.linkid);
    }

    private onAllGM(rkGMPlayer: SeGmPlayer, data: any) {
        var db = redistInst.getHash('_gm_account_');
        db.load(((err, db: ReHash) => {
            var infos = db.value;
            this.sendData({ cmd: 'allgm', info: infos }, rkGMPlayer.linkid);
        }).bind(this));
    }

    private onCreateGm(rkGMPlayer: SeGmPlayer, data: PTL_GM2LS.CreateGm) {
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

        var gmAcc: SeDBGmInfo = {
            account: data.account,
            passwd: data.passwd,
            property: data.property,
        }

        var rkHashMember = redistInst.getHashMember('_gm_account_', data.account);
        rkHashMember.save(gmAcc);
        this.onCreateGmRet(rkGMPlayer, true, data.account);
        return;
    }

    public onPlayerChange(login: boolean, player) {
        for (var key in this._allGMList) {
            var rkGMPlayer: SeGmPlayer = this._allGMList[key];
            if (rkGMPlayer && rkGMPlayer.showOnline) {
                this.sendOnlinePlayerRet(rkGMPlayer.linkid, login, [player]);
            }
        }
    }

    private onKickPlayer(rkGMPlayer: SeGmPlayer, data: PTL_GM2LS.KickPlayer) {
        onlineMgrInst.kickPlayer(data.id, data.plt);
    }

    private onKickAllPlayer(rkGMPlayer: SeGmPlayer, data: PTL_GM2LS.KickPlayer) {
        onlineMgrInst.kickAllPlayer(data.plt);
    }

    private onShowOnline(rkGMPlayer: SeGmPlayer, data: PTL_GM2LS.ShowOnline) {
        rkGMPlayer.showOnline = data.showOnline;
        if (data.showOnline) {
            // 这里吧所有在线玩家发送一次
            this.sendOnlinePlayerRet(rkGMPlayer.linkid, true, onlineMgrInst.gmGetOnlinePlayer());
        }
    }

    private _query_online_list(rkGMPlayer: SeGmPlayer, data: PTL_GM2LS.QueryPlayerList) {
        var r_player_info = onlineMgrInst.gm_get_online_player(data.ipage, data.plt);
        this.sendQueryPlayerListRet(rkGMPlayer.linkid, r_player_info.page, r_player_info.tot_page, r_player_info.infos, r_player_info.i_tot_num);
    }

    private _query_toy_list(rkGMPlayer: SeGmPlayer, data: PTL_GM2LS.QueryPlayerList) {
         // 榜单服会是有多个的，所以这里抓取所有榜单服的信息
         let servers = serverMonitInst.get_server_by_type_all('cts');
         for (let i = 0; i < servers.length; i++) {
             // 因为不知道这个榜单具体工作几个平台，所以这里都通知一下
             netMgrInst.sendData({
                 cmd: 'toy_info',
                 gmid: rkGMPlayer.account,
             }, servers[i].linkid);
         }
    }
    
    private _query_guild_list(rkGMPlayer: SeGmPlayer, data) {
        let servers = serverMonitInst.get_server_by_type_all('gus');
        for (let i = 0; i < servers.length; i++) {
            // 因为不知道这个榜单具体工作几个平台，所以这里都通知一下
            netMgrInst.sendData({
                cmd: 'guild_info',
                guild_id: data.guild_id,
                gmid: rkGMPlayer.account,
            }, servers[i].linkid);
        }
   }

    private onLogin(rkGMPlayer: SeGmPlayer, data: PTL_GM2LS.Login) {
        if (!data.account || !data.passwd) {
            this.sendLoginRet({
                linkid: rkGMPlayer.linkid, account: rkGMPlayer.account, type: 'psderr', property: rkGMPlayer.property, tables: {
                    TownItem: this._tonwitemres.resData
                }, plts: GameVerMgr.inst.allplts()
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
                }, plts: GameVerMgr.inst.allplts()
            });
        }
        else {
            // GM登陆需要去检查一下对应的账号信息
            var rkHashMem = redistInst.getHashMember('_gm_account_', rkGMPlayer.account);
            rkHashMem.load(this.onLoginDBRet.bind(this, rkGMPlayer, rkHashMem));
        }
    }

    public addGmMails(gmid: string, mails: { mailid: string }[]) {
        var rgm = this.getGMPlayer(gmid);
        if (rgm) {
            this.sendData({
                cmd: 'gmmails',
                type: 'add',
                mails: mails
            }, rgm.linkid);
        }

        var sInfos: { k: string, v: any }[] = [];
        for (var i = 0; i < mails.length; i++) {
            sInfos.push({
                k: mails[i].mailid,
                v: mails[i]
            })
        }
        var rkHash = redistInst.getHash('_gm_mail_' + gmid);
        rkHash.msave(sInfos);
    }

    private onGmMails(rkGMPlayer: SeGmPlayer, data: PTL_GM2LS.GmMails) {
        if (data.type == 'load') {
            var rkHash = redistInst.getHash('_gm_mail_' + rkGMPlayer.account);
            rkHash.load((succ: boolean, _rkHash: ReHash) => {
                this.sendData({
                    cmd: 'gmmails',
                    type: 'load',
                    mails: _rkHash.value
                }, rkGMPlayer.linkid);
            });
        }
        else if (data.type == 'del') {
            redistInst.del_hash_key('_gm_mail_' + rkGMPlayer.account, data.info);
            this.sendData({
                cmd: 'gmmails',
                type: 'del',
                mails: data.info
            }, rkGMPlayer.linkid);
        }
    }

    private onLoginDBRet(_gmPlayer: SeGmPlayer, _kHash: ReHashMember, success: boolean) {
        var errType = 'nogm';
        if (success) {
            var dbGM: SeDBGmInfo = <SeDBGmInfo>_kHash.value;
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
            }, plts: GameVerMgr.inst.allplts()
        });
    }

    private onGiveMails(rkGMPlayer: SeGmPlayer, data: PTL_GM2LS.GiveMails) {
        if (!(data.mails instanceof Array)) {
            return;
        }
        // 这里暂定只能使用玩家数字id来发送道具，玩家数据是按照数字id规律存储的
        var postSource = {};
        for (var key in data.mails) {
            var rkMail: SeCharMailInfo = data.mails[key];
            var charid = rkMail.mailid;
            var serverLink = onlineMgrInst.getOnlinePlayerCSId(parseInt(charid), rkMail['plt'] || data.plt || 'sdw');
            if (!postSource.hasOwnProperty(serverLink)) {
                postSource[serverLink] = [];
            }
            postSource[serverLink].push(rkMail);
        }

        for (var key in postSource) {
            netMgrInst.sendGiveMail(key, postSource[key], rkGMPlayer.account);
        }
    }

    private _onDailyOnlines(rkGMPlayer: SeGmPlayer, data: PTL_GM2LS.OnlineStaInfo, ) {
        var rkBeginTime: number = data.begintime || 0, rkEndTime: number = data.endtime || 0;
        var kSorted = redistInst.getSortedSet(StaDefine.dailyinfo, 0, false);
        var rkBeginStr = '-inf';
        var kEndStr = '+inf';
        if (rkEndTime != 0) {
            kEndStr = '' + parseInt(TeDate.Date_Format(new Date(rkEndTime), 'yyyyMMddhh'));
        }
        if (rkBeginTime != 0) {
            rkBeginStr = '' + parseInt(TeDate.Date_Format(new Date(rkBeginTime), 'yyyyMMddhh'));
        }

        //   rkSorted.loadByScore(rkBeginStr, kEndStr,this._onStaLoad.bind(this,rkSorted,rkGMPlayer,rkBeginTime,rkEndTime));
        kSorted.loadByScore(rkBeginStr, kEndStr, ((rkSorted, bsucc) => {
            //  kSorted.load(((rkSorted,bsucc) => {
            var bkdata: Ptl_LS2GM.OnlineStaInfo = {
                cmd: 'olsta',
                begintime: rkBeginTime,
                endtime: rkEndTime,
                infos: (bsucc ? rkSorted.value : []),
            }
            this.sendData(bkdata, rkGMPlayer.linkid);
        }).bind(this, kSorted));

        // this._log_query(rkGMPlayer, { type: '111', channel: '111', plt: '1111' });
    }

    private _onStaLoad(rkSorted, rkGMPlayer, rkBeginTime, rkEndTime, bsucc) {
        var bkdata: Ptl_LS2GM.OnlineStaInfo = {
            cmd: 'olsta',
            begintime: rkBeginTime,
            endtime: rkEndTime,
            infos: (bsucc ? rkSorted.value : []),
        }
        this.sendData(bkdata, rkGMPlayer.linkid);
    }

    public onGiveMailsRet(_sys_: if_sys_, gmaccount, results) {
        var rkGMPlayer = this.getGMPlayer(gmaccount);
        if (!rkGMPlayer) {
            return;
        }

        this.sendGiveMailsRet(rkGMPlayer.linkid, results);
    }

    private _playerproperty(rkGMPlayer: SeGmPlayer, data: { uid: number, e: number, plt: string }) {
        var serverLink = onlineMgrInst.getOnlinePlayerCSId(data.uid, data.plt);
        if (serverLink) {
            netMgrInst.sendPlayerProperty(serverLink, rkGMPlayer.account, data.uid, data.e);
            return true;
        }

        return false;
    }

    private _log_query(rkGMPlayer: SeGmPlayer, data: { type: string, channel: string, plt: string, date: number }) {
        // 这个需要发送给日志服务器
        var serverLink = serverMonitInst.get_server_link_by_type('ls', 'none');
        if (serverLink) {
            data['cmd'] = 'log_query';
            data['gmid'] = rkGMPlayer.account;

            netMgrInst.sendData(data, serverLink);
            return true;
        }

        return false;
    }

    private _modfily_server_config_(rkGMPlayer: SeGmPlayer, data: { sid: string, optinfo: any }) {
        var bsucc = serverMonitInst.modify_server(data.sid, data.optinfo);
        this.sendData({
            cmd: 'modfily_server_config',
            sid: data.sid,
            bsucc: bsucc
        }, rkGMPlayer.linkid);
    }

    private _query_server_info_(rkGMPlayer: SeGmPlayer, data: { plt: string }) {
        // 这里返回所有的服务器的配置 信息和服务器状态
        var info = serverMonitInst.get_server_info(data.plt);
        this.sendData({
            cmd: 'query_server_info',
            serverinfos: info
        } as Ptl_LS2GM.ServerMonit, rkGMPlayer.linkid);
    }

    private _cls_state(rkGMPlayer: SeGmPlayer, data: { type: string, channel: string, plt: string, date: number }) {
        // 这个需要发送给日志服务器
        this.sendData({
            cmd: 'cls_state',
            info: serverMonitInst.get_num_by_type('cls', data.plt),
            type: data.type,
        });
    }

    private _create_invite(rkGMPlayer: SeGmPlayer, data: { plt: string, seed: number, ft_seed: number, num: number, inviteId: string, onlynum: number, addcount: number }) {
        // 这个需要发送给日志服务器
        InviteCodeMgrInst.create_code(data.plt, data.inviteId, data.num, data.seed, data.ft_seed, data.onlynum, data.addcount, rkGMPlayer.account);
        return false;
    }

    private _query_invite(rkGMPlayer: SeGmPlayer, data: { plt: string }) {
        // 这个需要发送给日志服务器
        InviteCodeMgrInst.query_invite(data.plt, rkGMPlayer.account);
        return false;
    }

    private _warZoneInfos(rkGMPlayer: SeGmPlayer, data: { plt: string }) {
        // 这个需要发送给日志服务器
        var serverLink = serverMonitInst.get_server_link_by_type_all('cts', 'none');
        if (serverLink) {
            data['cmd'] = 'war_zone_infos';
            data['gmid'] = rkGMPlayer.account;

            for (let i = 0; i < serverLink.length; i++) {
                netMgrInst.sendData(data, serverLink[i]);
            }
            return true;
        }

        return false;
    }

    private _char_delete_uid(rkGMPlayer: SeGmPlayer, data: { plt: string }) {
        // 这个需要发送给日志服务器
        var serverLink = serverMonitInst.get_server_link_by_type_all('cts', 'none');
        if (serverLink) {
            data['cmd'] = 'chart_delete_uid';
            data['gmid'] = rkGMPlayer.account;
            for (let i = 0; i < serverLink.length; i++) {
                netMgrInst.sendData(data, serverLink[i]);
            }
            return true;
        }

        return false;
    }

    private _chart_clear(rkGMPlayer: SeGmPlayer, data: { plt: string }) {
        // 这个需要发送给日志服务器
        var serverLink = serverMonitInst.get_server_link_by_type_all('cts', 'none');
        if (serverLink) {
            data['cmd'] = 'chart_clear';
            data['gmid'] = rkGMPlayer.account;

            for (let i = 0; i < serverLink.length; i++) {
                netMgrInst.sendData(data, serverLink[i]);
            }
            return true;
        }

        return false;
    }


    private _load_file(file: string) {
        let info = '{}';
        try {
            info = readFileSync(path.join(process.cwd(), file)).toString();
        }
        catch (e) {

        }

        return info;
    }

    private _save_file(file: string, info: string) {
        try {
            // 这里需要备份一下老的数据
            writeFileSync(path.join(process.cwd(), file + '_back'), this._load_file(file), { flag: 'w+' });
            // 然后写入新的数据
            writeFileSync(path.join(process.cwd(), file), info, { flag: 'w+' });
            return true;
        }
        catch (e) {
            return false;
        }
    }

    /**加载动态配置的config */
    private _server_loadconfig(rkGMPlayer: SeGmPlayer, data: { type: string, file: string, serverid: string, plt: string }) {
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
    private _server_saveconfig(rkGMPlayer: SeGmPlayer, data: { type: string, file: string, serverid: string, plt: string, info: string }) {
        switch (data.type) {
            case 'login': {
                // 如果是登陆服那么
                this.sendData({ cmd: 'server_saveconfig', info: this._save_file(data.file, data.info), serverid: data.serverid, file: data.file, plt: data.plt }, rkGMPlayer.linkid);
                break;
            }
        }
    }

    /**----------------------gm 动态配置------------------------*/
    private _GMConfigDB: ReHash;
    private init_global_config() {
        redistInst.getHash("gmconfig").load((succ, db) => {
            this._GMConfigDB = db;
            this._gm_gloconfig_notice_to_cls();
            // gm配置生效
            GameControl.inst.loadcfgs();
        });
    }

    /**加载动态配置的config */
    private load_global_config(rkGMPlayer: SeGmPlayer, data: { type: string }) {
        this.sendData({ cmd: 'load_global_config', info: this._GMConfigDB.value }, rkGMPlayer.linkid);
    }

    getGlobalConfig(plt: string) {
        let out = {};
        if (this._GMConfigDB) {
            let all_cfg = this._GMConfigDB.get("all_plt");
            if (all_cfg) out = func_copy_in(out, all_cfg);
            let plt_cfg = this._GMConfigDB.get(plt);
            if (plt_cfg) out = func_copy_in(out, plt_cfg);
        }

        return out;
    }

    /**保存动态配置的config */
    private save_global_config(rkGMPlayer: SeGmPlayer, data: { type: string, configs: { plt: string, key: string, value: any, delete: boolean }[] }) {
        if (data && data.configs) {
            let cfgs = this._GMConfigDB.value;
            for (let i = 0; i < data.configs.length; i++) {
                let r_o = data.configs[i];
                if (!r_o) continue;
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
                })
            }
            this._GMConfigDB.msave(mlist);
        }
        this.sendData({ cmd: 'save_global_config', info: this._GMConfigDB.value }, rkGMPlayer.linkid);
        this._gm_gloconfig_notice_to_cls();
    }

    public switch_global_config(plt: string, key: string, value: any, bdelete: boolean) {
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

    public get_global_config(plt: string, key: string) {
        let r_cfg = this._GMConfigDB.get(plt) || {};
        return r_cfg[key] || null;
    }

    private _gm_gloconfig_notice_to_cls() {
        let servers = serverMonitInst.get_server_by_type_all('cls');
        for (let i = 0; i < servers.length; i++) {
            let r_server = servers[i];
            if (r_server.ready) {
                // 需要单独通知一下
                netMgrInst.sendData({
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
    private onQueryPlayerInfo(rkGMPlayer: SeGmPlayer, data: { uid: number, type: string, plt: string }) {
        var clsID = onlineMgrInst.getOnlinePlayerCSId(data.uid, data.plt);
        netMgrInst.sendQueryPlayerInfo(clsID, data.uid, data.type, rkGMPlayer.linkid);
    }

    public onQueryPlayerInfoRet(_sys_: if_sys_, data) {
        var info = data.info;
        var type = data.type;
        var gmlink = data.gmlink;
        var uid = data.uid;

        this.sendData({ cmd: 'playerinfo', type: type, info: info, uid: uid }, gmlink);
    }

    public onSetPlayerInfo(rkGMPlayer: SeGmPlayer, data: { uid: number, type: string, info: Object, plt: string }) {
        var clsID = onlineMgrInst.getOnlinePlayerCSId(data.uid, data.plt);
        clsID && netMgrInst.sendSetPlayerInfo(clsID, data.uid, data.type, rkGMPlayer.account, data.info);
    }

    public onSetToyInfo(rkGMPlayer: SeGmPlayer, data: { index: number, type: string, info: Object, plt: string }) {
        let servers = serverMonitInst.get_server_by_type_all('cts');
         for (let i = 0; i < servers.length; i++) {
             // 因为不知道这个榜单具体工作几个平台，所以这里都通知一下
             netMgrInst.sendData(data, servers[i].linkid);
         }
    }
    private setGmIsOpen(rkGMPlayer: SeGmPlayer, data: { xplt: string, isOpen: boolean }) {
        //通知类型的cloud
        var clss = serverMonitInst.get_server_link_by_type_all('cls', data.xplt);
        for (let i = 0; i < clss.length; i++) {
            netMgrInst.sendData({ cmd: 'setGmIsOpen', isOpen: data.isOpen }, clss[i]);
        }
    }

    private syncData(rkGMPlayer: SeGmPlayer, data: {plt: string }) {
        var clss = serverMonitInst.get_server_link_by_type_all('cls', data.plt);
        for (let i = 0; i < clss.length; i++) {
            netMgrInst.sendData({ cmd: 'sync_data'}, clss[i]);
        }
    }

    private loadData(rkGMPlayer: SeGmPlayer, data: {plt: string }) {
        var clss = serverMonitInst.get_server_link_by_type_all('cls', data.plt);
        for (let i = 0; i < clss.length; i++) {
            netMgrInst.sendData({ cmd: 'load_data'}, clss[i]);
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

    private onLockUnlock(rkGMPlayer: SeGmPlayer, data: { uid: number, locktype: number, plt: string }) {
        var uid: number = data.uid, lockType: number = data.locktype;
        if (lockType != 0) onlineMgrInst.kickPlayer(uid, data.plt);
        SeLoginCheck.gmLockUnlock(uid, lockType, ((linkID, _uid) => {
            this.sendData({
                cmd: 'lockunlock',
                bsucc: true,
                uid: _uid
            }, linkID);
        }).bind(this, rkGMPlayer.linkid));

    }

    private onAnnouncement(rkGMPlayer: SeGmPlayer, data) {
        if (!data || !data.notice || data.notice == '') return;
        if (data.all) {
            netMgrInst.sendAll({
                cmd: 'announcement',
                notice: data.notice
            });
        }
        else if (data.plt) {
            let server_links = serverMonitInst.get_server_links('cls', data.plt);
            for (let i = 0; i < server_links.length; i++) {
                netMgrInst.sendServerData(server_links[i], {
                    cmd: 'announcement',
                    notice: data.notice
                });
            }
        }
    }

    /**---------------------------------------gm系统邮件-------------------------------------------**/
    private _GMSystemMailsDB: ReHash;

    public get_gm_systemmail(plt: string) {
        // 一共两部分，全平台和单平台的
        let curr = Date.now();
        let cfgs = [];
        if (this._GMSystemMailsDB) {
            let all_dbs = this._GMSystemMailsDB.get('all_plt') as SeResSystemMail[];
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
        redistInst.getHash('all_gm_system_mails').load((succ: boolean, db) => {
            this._GMSystemMailsDB = db;
            // 加载好了之后要看一下已经注册过了的逻辑服
            this._gm_systemmail_notice_to_cls();
        })
    }

    private _gm_systemmail_notice_to_cls() {
        let servers = serverMonitInst.get_server_by_type_all('cls');
        for (let i = 0; i < servers.length; i++) {
            let r_server = servers[i];
            if (r_server) {
                console.log('notice to server systemmail', r_server.plt, r_server.id);
                // 需要单独通知一下
                netMgrInst.sendData({
                    cmd: "gmsystemmail",
                    configs: this.get_gm_systemmail(r_server.plt)
                }, r_server.linkid);
            }
        }
    }

    onQueryGmSystemMails(rkGMPlayer: SeGmPlayer, data: any) {
        return this.sendData({
            cmd: 'querygmsystemmails',
            configs: this._GMSystemMailsDB.value
        }, rkGMPlayer.linkid);
    }

    onUpdateGmSystemMails(rkGMPlayer: SeGmPlayer, data: { config: any }) {
        let check_keys = ['kID', 'kTitle', 'kDesc', 'kStartTime', 'iDuration', 'akItems'];
        // 一次同步直接修改掉玩家的配置信息        
        this._GMSystemMailsDB.clearAll();
        for (let plt in data.config) {
            let cfgs = data.config[plt];
            if (!cfgs) continue;
            let real_cfgs = [];
            for (let i = 0; i < cfgs.length; i++) {
                let r_cfg = cfgs[i];
                if (!r_cfg) continue;
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
    private query_rank_infos(rkGMPlayer: SeGmPlayer, data: { plts: string, charttype: number[], len: number }) {
        // 榜单服会是有多个的，所以这里抓取所有榜单服的信息
        let servers = serverMonitInst.get_server_by_type_all('cts');
        for (let i = 0; i < servers.length; i++) {
            // 因为不知道这个榜单具体工作几个平台，所以这里都通知一下
            netMgrInst.sendData({
                cmd: 'chart_info',
                gmid: rkGMPlayer.account,
                plts: data.plts,
                charttype: data.charttype,
                len: data.len
            }, servers[i].linkid);
        }
    }


    /**-------------------------------------------------------------------------------------------**/

    public onSetPlayerInfoRet(_sys_: if_sys_, data) {
        var info = data.info;
        var type = data.type;
        var gmlink = data.gmlink;
        var uid = data.uid;
        var bsucc = data.bsucc;

        var r = this.getGMPlayer(gmlink);
        if (r) this.sendData({ cmd: 'setplayerinfo', type: type, info: info, uid: uid, bsucc }, r.linkid);
        if(configInst.get("change_name")){
            NameDataMgr._receive_ret(uid, bsucc);
        }
    }

    public onGmQueryRet(gmid: string, data) {
        var r = this.getGMPlayer(gmid);
        delete data['_sys_'];
        r && this.sendData(data, r.linkid);
    }

    private _onAccept(linkid) {
        if (this.getGMPlayerByLink(linkid)) {
            this.delGMPlayer(linkid);
        }
        this.addGMPlayer(this, linkid);
    }

    private _disconnect(linkid, type) {
        this.delGMPlayer(linkid);
    }

    public netDisconnect(linkid) {
        this.disconnect(linkid);
    }

    private getGMPlayer(account: string) {
        for (var key in this._allGMList) {
            var rkGMPlayer = this._allGMList[key];
            if (rkGMPlayer && rkGMPlayer.account == account) {
                return rkGMPlayer;
            }
        }

        return null;
    }

    private getGMPlayerByLink(linkid: string) {
        for (var key in this._allGMList) {
            var rkGMPlayer = this._allGMList[key];
            if (rkGMPlayer && rkGMPlayer.linkid == linkid) {
                return rkGMPlayer;
            }
        }

        return null;
    }

    private addGMPlayer(account, linkid) {
        if (this.getGMPlayer(account)) {
            return false;
        }

        if (this.getGMPlayerByLink(linkid)) {
            return false;
        }

        this._allGMList.push(new SeGmPlayer(this, linkid));
    }

    private delGMPlayer(linkid) {
        for (var key in this._allGMList) {
            var rkGMPlayer = this._allGMList[key];
            if (rkGMPlayer && rkGMPlayer.linkid == linkid) {
                this._allGMList.splice(parseInt(key), 1);
                break;
            }
        }
    }

    public sendLoginRet({ linkid, account, type, property, tables, plts }: { linkid; account; type; property; tables: any; plts: string[]; }) {
        var cmd: Ptl_LS2GM.LoginRet = {
            cmd: 'loginret',
            account: account,
            type: type,
            property: property,
            tables: tables,
            plts: plts
        };

        this.sendData(cmd, linkid);
    }

    public sendGiveMailsRet(linkid, results) {
        var cmd: Ptl_LS2GM.GiveMailsRet = {
            cmd: 'givemailsret',
            results: results,
        };

        this.sendData(cmd, linkid);
    }

    public sendCreateInviteRet(gmid, ...result) {
        var r = this.getGMPlayer(gmid);
        if (!r) return;

        var cmd: Ptl_LS2GM.CreateInviteRet = {
            cmd: 'createInviteRet',
            results: result,
        };

        this.sendData(cmd, r.linkid);
    }

    public sendQueryInviteRet(gmid, ...result) {
        var r = this.getGMPlayer(gmid);
        if (!r) return;

        var cmd: Ptl_LS2GM.CreateInviteRet = {
            cmd: 'queryInviteRet',
            results: result,
        };

        this.sendData(cmd, r.linkid);
    }

    private sendOnlinePlayerRet(linkid: string, login: boolean, players: Array<any>) {
        var cmd: Ptl_LS2GM.changePlayer = {
            cmd: 'onlines',
            login: login,
            players: players,
        };

        this.sendData(cmd, linkid);
    }

    private sendQueryPlayerListRet(linkid: string, ipage: number, itotpage: number, players: Array<any>, itotnum: number) {
        var cmd: Ptl_LS2GM.QueryOnlinePlayerList = {
            cmd: 'query_online_list',
            ipage: ipage,
            players: players,
            itotpage: itotpage,
            itotnum: itotnum
        };

        this.sendData(cmd, linkid);
    }

    private oprret(linkid: string, type: string, bsucc: boolean) {
        var cmd: Ptl_LS2GM.OptRet = {
            cmd: 'optret',
            type: type,
            succ: bsucc
        };

        this.sendData(cmd, linkid);
    }

    public sendChartInfoRet(gmid, infos) {
        var r = this.getGMPlayer(gmid);
        if (!r) return;

        var cmd = {
            cmd: 'chart_info_ret',
            infos: infos,
        };

        this.sendData(cmd, r.linkid);
    }

    public sendToyInfoRet(gmid, infos) {
        var r = this.getGMPlayer(gmid);
        if (!r) return;

        var cmd = {
            cmd: 'toy_info_ret',
            infos: infos,
        };

        this.sendData(cmd, r.linkid);
    }

    public sendGuildInfoRet(gmid, infos) {
        var r = this.getGMPlayer(gmid);
        if (!r) return;

        var cmd = {
            cmd: 'guild_info_ret',
            infos: infos,
        };

        this.sendData(cmd, r.linkid);
    }

    public sendChartClearRet(gmid, infos) {
        var r = this.getGMPlayer(gmid);
        if (!r) return;

        var cmd = {
            cmd: 'chart_clear_ret',
            infos: infos,
        };

        this.sendData(cmd, r.linkid);
    }

    public deal_cheat(uid, data: { plt: string }){
        // 删除榜单
        var serverLink = serverMonitInst.get_server_link_by_type_all('cts', 'none');
        if (serverLink) {
            data['cmd'] = 'chart_delete_uid';
            data['gmid'] = null;
            for (let i = 0; i < serverLink.length; i++) {
                netMgrInst.sendData(data, serverLink[i]);
            }
        }
        //封号
        var lockType: number = 2; //永久封
        if (lockType != 0) onlineMgrInst.kickPlayer(uid, data.plt);
        SeLoginCheck.gmLockUnlock(uid, lockType, null);
    }

    public toallgm(data) {
        delete data['_sys_'];
        this.sendAll(data);
    };

    private recharge_reset(rkGMPlayer: SeGmPlayer, order: string) {
        if (!order) return;
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

    private recharge_query(rkGMPlayer: SeGmPlayer, order: string) {
        if (!order) return;
        redistInst.getHashMember('recharge', order).load((succ, db) => {
            this.sendData({
                cmd: 'recharge_query',
                order: order,
                data: db.value
            }, rkGMPlayer.linkid);
        });
    }
}

export var gmMgrInst = new SeGMMgr();