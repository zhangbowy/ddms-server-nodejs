"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeNetMgr = void 0;
const SeDefine_1 = require("../SeDefine");
const TeConfig_1 = require("../lib/TeConfig");
const TeRedis_1 = require("../lib/TeRedis");
// import * as jsonpb from "jsonpb";
// import { deflateRawSync } from "zlib";
let TeNet;
var useWS = false;
let plt = TeConfig_1.configInst.get('plt');
// if (plt.indexOf('sdw') == 0 || plt.indexOf('zlzy') == 0) {
//     // 其他版本使用socket.io
//     TeNet = require('../lib/TeNet').TeNet as TeScoketIO.TeNet;
// }
// else {
useWS = true;
// 微信版本使用websocket
TeNet = require('../lib/TeWSNet').TeNet;
class SeLinkInfo {
    constructor(linkid) {
        this.ready = 0;
        this.type = 'unknow';
        this.charid = 0;
        this.linkid = linkid;
    }
}
class SeNetMgr extends TeNet {
    constructor(port, flag) {
        super();
        this.openssl = true;
        this.allServers = {};
        if (TeConfig_1.configInst.has("procxy")) {
            this.openssl = TeConfig_1.configInst.get("procxy");
        }
        if (useWS) {
            this.openssl = false;
        }
        if (this.openssl) {
            this.listen(port + 80, flag, port + 443, null, port);
        }
        else {
            this.listen(port, flag);
        }
        this.on('connected', this._onConnected.bind(this));
        this.on('disconnect', this._onDisconnect.bind(this));
        this.on('data', this._onReciveData.bind(this));
        // jsonpb.pb_regist_roles("game2client",
        //     "initinfo",
        //     [
        //         "baseinfo.sysmailCeche",
        //         "baseinfo.bufferdatas",
        //         "baseinfo.bufferunitems",
        //         "baseinfo.chancePools",
        //         "baseinfo.mails",
        //         "baseinfo.bosss"
        //     ],
        //     ["baseinfo.formation"]
        // )
        // jsonpb.pb_regist_roles("game2client",
        //     "initTask",
        //     [
        //         "list"
        //     ],
        //     []
        // )
    }
    /**
     *
     * @param linkid 链接id
     * @param leave 是否离开
     */
    disconnect(linkid, leave = false, id = 0) {
        super.disconnect(linkid);
        var serverData = this.allServers[linkid];
        if (leave) {
            //如果玩家断线了还是要退出
            if (serverData) {
                global.playerMgr.leaveProcess(serverData.charid, linkid, 'leave');
            }
            else if (id) {
                global.playerMgr.leaveProcess(id, linkid, 'leave');
            }
            // global.lsMgr.sendPlayerLeave(serverData.account, serverData.charid);
        }
        return true;
    }
    ;
    _onConnected(linkid) {
        if (this.allServers.hasOwnProperty(linkid)) {
            // 如果已经存在
            global.logMgr.log('connceted error same socketid');
        }
        else {
            this.allServers[linkid] = new SeLinkInfo(linkid);
        }
    }
    ;
    _onDisconnect(linkid, charid) {
        var serverid;
        if (this.allServers.hasOwnProperty(linkid)) {
            // 现在还不知道断开后重新连接上的sockeid会不会变化，先按照变化的处理
            var serverInfo = this.allServers[linkid];
            charid = serverInfo.charid;
            if (charid) {
                //  global.playerMgr.leaveProcess(charid, linkid, 'charleave');
                global.playerMgr.leaveProcess(charid, linkid, 'charleave1');
            }
            delete this.allServers[linkid];
        }
    }
    ;
    _onReciveData(linkid, data, charid, ready) {
        if (!this.allServers.hasOwnProperty(linkid)) {
            this.disconnect(linkid);
            return;
        }
        var serverData = this.allServers[linkid];
        charid = serverData.charid;
        ready = serverData.ready;
        if (!data.cmd) {
            return;
        }
        if (!global.ready) {
            this.sendCommonNotice(linkid, 'error', 'error', '网络故障，努力抢修中');
            return;
        }
        if (!ready) {
            switch (data.cmd) {
                case 'login':
                    // if (!configInst.get('cheatmode')) return;
                    if (TeRedis_1.redistInst.is_login_forbid) {
                        this.sendLoginFailed(linkid, charid, "游戏太火爆了，服务器紧急扩容中，请稍等片刻", 0);
                    }
                    else {
                        if (!data.account || !data.passwd) {
                            return;
                        }
                        serverData.account = data.account;
                        global.lsMgr.sendLogin(linkid, data.account, data.passwd, data.info);
                    }
                    break;
                case 'loginSD':
                    if (TeRedis_1.redistInst.is_login_forbid) {
                        this.sendLoginFailed(linkid, charid, "游戏太火爆了，服务器紧急扩容中，请稍等片刻", 0);
                    }
                    else {
                        serverData.account = data.info.uid;
                        serverData.loginfo = data.info;
                        global.lsMgr.sendLoginSD(linkid, data.info);
                    }
                    break;
                case 'createaccount':
                    if (!TeConfig_1.configInst.get('cheatmode'))
                        return;
                    if (!data.account || !data.passwd) {
                        return;
                    }
                    global.lsMgr.sendCreateAccount(linkid, data.account, data.passwd);
                    break;
                default:
                    this.sendNeedLogin(linkid);
                    break;
            }
            return;
        }
        else {
            if (data.cmd == 'createchar') {
                if (!data.name) {
                    return;
                }
                global.playerMgr.createCharBegin(charid, data.name, data.icon, data.scene, data.appId);
            }
            else {
                var rkPlayer = global.playerMgr.getPlayer(charid, true);
                if (!rkPlayer || rkPlayer.linkid != linkid) {
                    let uplayer = global.playerMgr.getPlayer(charid, false);
                    if (uplayer) {
                        // 发现是在加载中的玩家的话，就不处理这个消息
                        // console.log('noload recv too early[' + charid + '] cmd[' + data.cmd + ']');
                        return;
                    }
                    if (rkPlayer && rkPlayer.linkid != linkid) {
                        // 发现是玩家的链接变了的话也不处理这个命令好了
                        // console.log('linkerror recv too early[' + charid + '] cmd[' + data.cmd + ']');
                        if (global.resMgr.getConfig('kickplayer_linkerror') == "true") {
                            this.disconnect(linkid);
                        }
                        return;
                    }
                    // console.log('noload recv too early[' + charid + '] cmd[' + data.cmd + ']');
                    if (global.resMgr.getConfig('kickplayer_noload') == "true") {
                        this.disconnect(linkid);
                    }
                    return;
                }
                switch (data.cmd) {
                    case 'cheatmsg':
                        if (!TeConfig_1.configInst.get('cheatmode')) {
                            break;
                        }
                        if (data.params) {
                            rkPlayer.cheatMsg(data.params);
                        }
                        break;
                    case 'upicon': {
                        // 上传新的icon
                        if (data.icon) {
                            // 这里对于上报上来的图标进行一次操作
                            rkPlayer.icon = data.icon;
                        }
                        break;
                    }
                    case 'charleave':
                        global.playerMgr.leaveProcess(charid, linkid, 'charleave2');
                        serverData.ready = 0;
                        serverData.charid = 0;
                        break;
                    case 'setformation': {
                        rkPlayer.onChangeFormation(data.plan, data.formation);
                        break;
                    }
                    case 'setpvepkformation': {
                        rkPlayer.onChangePVEPKFormation(data.plan, data.formation);
                        break;
                    }
                    case 'setformationname': {
                        rkPlayer.onChangeFormationName(data.plan, data.name);
                        break;
                    }
                    case 'setShangjinFormation': {
                        rkPlayer.onChangeShangJinFormation(data.formation);
                        break;
                    }
                    case 'setShangjinLord': {
                        rkPlayer.onChangeShangJinLord(data.lordId);
                        break;
                    }
                    case 'setBoss':
                        if (data.bossId) {
                            rkPlayer.m_pkHeroCardMgr.bossFormation = data.bossId;
                        }
                        break;
                    case 'checkBoss': {
                        rkPlayer.m_pkHeroCardMgr.checkBoss();
                        break;
                    }
                    case 'setCurskin': {
                        rkPlayer.m_pkHeroCardMgr.setCurskin(data.kid, data.heroid);
                        break;
                    }
                    case 'checkskin': {
                        // 目前没有体验的需求, 先注掉
                        // rkPlayer.m_pkHeroCardMgr.checkskin();
                        break;
                    }
                    case 'queryitem': {
                        rkPlayer.queryItemSales(data.itemID);
                        break;
                    }
                    case 'useitem': {
                        this.sendUseItemRet(linkid, rkPlayer.useItem(data.typeid, data.num, data.param1, data.param2));
                        break;
                    }
                    case 'usemail': {
                        rkPlayer.useMail(data.mailid);
                        break;
                    }
                    case 'delmail': {
                        rkPlayer.delMail(data.mailid);
                        break;
                    }
                    case 'chartinfo': {
                        rkPlayer.getChart(data.type || 0, data.startindex, data.length);
                        break;
                    }
                    case 'getkillrecord': {
                        rkPlayer.getkillrecord();
                        break;
                    }
                    case 'historychartinfo': {
                        rkPlayer.getHistoryChart(data.type || 0, data.startindex, data.length);
                        break;
                    }
                    case "hischartinfo": {
                        rkPlayer.getHisChart(data.type || 0, data.sid);
                        break;
                    }
                    case 'guide': {
                        rkPlayer.guideNext(data);
                        break;
                    }
                    case 'upcard': {
                        rkPlayer.upgradeCard(data.id);
                        break;
                    }
                    case "f_plan": {
                        rkPlayer.setDefaultPlan(data.plan);
                        break;
                    }
                    case "levelUp": {
                        // rkPlayer.onUpgrageLevel();
                        break;
                    }
                    case "openPvpBox": {
                        rkPlayer.openPvpBox(data.index);
                        break;
                    }
                    case "accOpenBox": {
                        rkPlayer.accOpenBox(data.index);
                        break;
                    }
                    case "completePvpBox": {
                        rkPlayer.completePvpBox(data.index);
                        break;
                    }
                    case 'recharge': {
                        rkPlayer.rechargeOpr(data.type, data.info, data.mailid);
                        break;
                    }
                    case "shareOK": {
                        rkPlayer.onShareOk(data.type);
                        break;
                    }
                    case "onbindPhoneNumOk": {
                        rkPlayer.onbindPhoneNumOk(data.phoneNum);
                        break;
                    }
                    case 'adWatchOK': {
                        rkPlayer.onAdWatchOk(data.itemId);
                        break;
                    }
                    case 'adWatchArrayOK': {
                        rkPlayer.onAdWatchArrayOk(data.index, data.itemId);
                        break;
                    }
                    case 'enterSmallGame': {
                        rkPlayer.enterSmallGame(data.appid);
                        break;
                    }
                    case 'completeSmallProgram': {
                        rkPlayer.completeSmallProgram();
                        break;
                    }
                    case 'addSmallProgram': {
                        rkPlayer.addSmallProgram();
                        break;
                    }
                    case 'completeFollowPublic': {
                        rkPlayer.completeFollowPublic();
                        break;
                    }
                    case 'addFollowPublic': {
                        rkPlayer.addFollowPublic();
                        break;
                    }
                    case 'fromFollowPublic': {
                        rkPlayer.fromFollowPublic();
                        break;
                    }
                    case 'fromScene': {
                        rkPlayer.fromScene(data.scene);
                        break;
                    }
                    case "buttonlog": {
                        global.logMgr.buttonClickLog(rkPlayer, data.btname, data.page, ...data.args);
                        break;
                    }
                    case "sign": {
                        rkPlayer.signReward(data.isWatchAD);
                        break;
                    }
                    case "monthsign": {
                        this.onMonthSignRet(linkid, data.cmd, data.iDay, rkPlayer.monthSign(data.iDay, data.retry, data.isad));
                        break;
                    }
                    case "daysign": {
                        this.onDaySignRet(linkid, data.cmd, data.iDay, rkPlayer.daySign(data.iDay, data.retry, data.isad));
                        break;
                    }
                    case "totmonthsign": {
                        this.onMonthSignRet(linkid, data.cmd, data.iDay, rkPlayer.monthTotSign(data.iDay));
                        break;
                    }
                    case "delTryHeroCard": {
                        rkPlayer.delTryHeroCard(data.heroIDs);
                        break;
                    }
                    case "getTurnOverCards": {
                        global.netMgr.sendData({ cmd: 'turnOverCards', flipLottery: rkPlayer.flipLottery[data.mallId] }, linkid);
                        break;
                    }
                    case "openTurnOverCards": {
                        rkPlayer.openLottery(data.mallId, data.location);
                        break;
                    }
                    case "refreshTurnOverCards": {
                        global.netMgr.sendData({ cmd: 'turnOverCards', flipLottery: rkPlayer.refreshFlipLottery(data.mallId) }, linkid);
                        break;
                    }
                    //----------------------战斗相关
                    case "startPvpFight": {
                        rkPlayer.pvpMgr.start_fight(data.isGuide);
                        break;
                    }
                    case "onlinematch": {
                        rkPlayer.pvpMgr.on_enter_match(data.mode, data.gamekey, data.isCross);
                        break;
                    }
                    case "getrandomList": {
                        global.matchMgr.getRandomList(rkPlayer.id, rkPlayer.pvp_level);
                        break;
                    }
                    // case "onlineteammatch": {
                    //     rkPlayer.pvpMgr.on_enter_team_match(data.sid, data.uid, data.rp);
                    //     break;
                    // }
                    case "cancellonline": {
                        rkPlayer.cancell_match();
                        break;
                    }
                    case "completePvpFight": {
                        rkPlayer.pvpMgr.completeFight(data.isWin, data.time, data.isBossDie);
                        break;
                    }
                    case "finisholpvp": {
                        // rkPlayer.pvpMgr.onMatchPvpOlFight(data.winid, data.time, data.stmp, data.isBossDie);
                        break;
                    }
                    case "finishpvpv726": {
                        rkPlayer.pvpMgr.on_match_pve_fight(data.bWin, data.time, data.isBossDie, 'pve', data.isCross);
                        break;
                    }
                    case "cancellpvpv726": {
                        rkPlayer.pvpMgr.on_match_cancell_pve_fight();
                        break;
                    }
                    //------------------------------//
                    case "getTaskAward": {
                        rkPlayer.getTaskAward(data.id, data.extinfo);
                        break;
                    }
                    case "checkName": {
                        rkPlayer.changeName(data.name);
                        break;
                    }
                    case "battleAction": {
                        rkPlayer.battleAction(data.action, ...data.arg);
                        break;
                    }
                    case "dailyFresh": {
                        rkPlayer.dailyFresh();
                        break;
                    }
                    case "buyShopMall": {
                        rkPlayer.buyShopMall(data.mallId, data.marketId, data.count || 1);
                        return;
                    }
                    case "getShopInfo": {
                        rkPlayer.getShopInfo();
                        return;
                    }
                    case "getPlayerInfo": {
                        global.playerMgr.getPlayerInfo(linkid, data.id, data.plt);
                        return;
                    }
                    case 'seasonview': {
                        rkPlayer.seasonview(data.seasionid);
                        return;
                    }
                    case "queryvideo": {
                        if (TeConfig_1.configInst.get('globalMgr.url-all')) {
                            global.globalMgrAll.queryVideo(charid, data.level, data.rmode);
                        }
                        global.matchMgr.queryVideo(charid, data.level, data.rmode);
                        return;
                    }
                    case "queryvideod": {
                        if (TeConfig_1.configInst.get('globalMgr.url-all')) {
                            global.globalMgrAll.queryDetailVideos(charid, data.vids);
                        }
                        global.matchMgr.queryDetailVideos(charid, data.vids);
                        return;
                    }
                    case "checkSystemMail": {
                        rkPlayer.checkSystemMail();
                        break;
                    }
                    case "openFullBox": {
                        rkPlayer.openTempleteBox();
                        break;
                    }
                    case "clientTaskAction": {
                        rkPlayer.clientTaskAction(data.action, data.arg);
                        break;
                    }
                    case "takeDeskAward": {
                        rkPlayer.takeDeskAward();
                        return;
                    }
                    case "monthvip": {
                        rkPlayer.checkMonthVip();
                        break;
                    }
                    case "liveraces": {
                        rkPlayer.getliveraces(data.mode);
                        break;
                    }
                    case "roommatch": {
                        rkPlayer.getroommatch(data.type, data.value, data.ready, data.kuid, data.index);
                        break;
                    }
                    case "exchange": {
                        rkPlayer.exchange(data.activityId, data.exchangeId, data.extInfo, data.count || 1);
                        break;
                    }
                    case "friend_opr": {
                        rkPlayer.friendMgr.friend_opr(data.type, data);
                        break;
                    }
                    case "matchOver": {
                        rkPlayer.onMatchOver();
                        break;
                    }
                    case "refreshDailyShop": {
                        rkPlayer.refreshDailyShop(data.type);
                        break;
                    }
                    case 'box_view': {
                        // 查看卡牌
                        rkPlayer.box_view(data.boxid);
                        break;
                    }
                    case 'invitecode': {
                        // 直接发送给登陆服务器检查
                        global.lsMgr.sendInviteCode(rkPlayer.id, data.code, rkPlayer.openid, rkPlayer.openkey);
                        break;
                    }
                    case 'gamebar_msg': {
                        // 直接给好友推送信息
                        rkPlayer.send_gamebar_msg(data.frd, data.msgtype, data.content, data.qua);
                        break;
                    }
                    case 'killroom': {
                        if (!rkPlayer.hasProperty(SeDefine_1.PlayerProperty.GM_OB)) {
                            return;
                        }
                        global.matchMgr.sendData({ cmd: 'killroom', rid: data.rid, rurl: data.rurl, livekey: data.livekey });
                        break;
                    }
                    case 'queryInviteCode': {
                        // 查询邀请码使用情况的
                        global.lsMgr.sendLSData({ cmd: 'queryInviteCode', ids: data.ids, uid: rkPlayer.id });
                        break;
                    }
                    case 'gmmails': {
                        // 这里要检查当前是有授权邮件的
                        if (rkPlayer.delMail(data.mailid)) {
                            global.lsMgr.sendLSData({ cmd: 'gmmails', gmid: data.gmid, mails: data.mails });
                        }
                        break;
                    }
                    case 'get_share_award': {
                        rkPlayer.get_share_award(data.uid);
                        break;
                    }
                    case 'update_shop': {
                        rkPlayer.updateDynamicRes();
                        break;
                    }
                    case 'set_client_cache': {
                        rkPlayer.set_client_cache(data.key, data.value);
                        break;
                    }
                    case 'upgradeBox': {
                        rkPlayer.pvpMgr.upgradeBox(data.boxid);
                        break;
                    }
                    case 'giveDayReward': {
                        rkPlayer.pvpMgr.checkPeakDayReward();
                        break;
                    }
                    case 'givePvePkDayReward': {
                        rkPlayer.pvpMgr.checkPvePkDayReward();
                        break;
                    }
                    case 'getMonthvipBuff': {
                        rkPlayer.m_buffMgr.get_monthvip_buff();
                        break;
                    }
                    case 'getMonthvipBuff_v2': {
                        rkPlayer.m_buffMgr.get_monthvip_buff_v2(data.bfid);
                        break;
                    }
                    case 'setcurMedal': {
                        rkPlayer.setcurMedal(data.id, data.oid);
                        break;
                    }
                    case 'equipBattleInfo': {
                        rkPlayer.equip_battle(data.type, data.infos);
                        break;
                    }
                    case 'randompool': {
                        rkPlayer.m_pkShopMgr.get_random_pool(data.boxid);
                        break;
                    }
                    case 'switchauth': {
                        rkPlayer.switchauth(data.auth);
                        break;
                    }
                    case 'upauthinfo': {
                        rkPlayer.loginInfo.wxinfo = data.res;
                        break;
                    }
                    case 'pvestart': {
                        rkPlayer.pveMgr.startfight(data.levelId, data.times);
                        break;
                    }
                    case 'pveNewstart': {
                        rkPlayer.pveNewMgr.startfight(data.levelId);
                        break;
                    }
                    case 'pvefinish': {
                        rkPlayer.pveMgr.finishfight(data.levelId, data.times, data.hps, data.time, data.damage);
                        break;
                    }
                    case 'pveNewfinish': {
                        rkPlayer.pveNewMgr.finishfight(data.levelId, data.hps, data.time, false);
                        break;
                    }
                    case 'pveNewSweep': {
                        rkPlayer.pveNewMgr.finishfight(data.levelId, [], 0, true);
                        break;
                    }
                    case "buyPveNewTimes": {
                        rkPlayer.pveNewMgr.addFreeTimes(data.levelId);
                        break;
                    }
                    case "getaward": {
                        rkPlayer.m_callbackMgr.onGetAward();
                        break;
                    }
                    case "enterShangJinSai": {
                        rkPlayer.enterShangJinSai(data.type);
                        break;
                    }
                    case "addShangJinPrivilege": {
                        rkPlayer.addShangJinPrivilege();
                        break;
                    }
                    case "getShangJinPrivilege": {
                        rkPlayer.getShangJinPrivilege(data.type);
                        break;
                    }
                    case "chooseShangJinHero": {
                        rkPlayer.chooseShangJinHero(data.type);
                        break;
                    }
                    case "openShangJinLord": {
                        rkPlayer.openShangJinLord(data.lordId);
                        break;
                    }
                    case "addDrawTimes": {
                        rkPlayer.addDrawTimes(data.type, data.count);
                        break;
                    }
                    case "equip_opr": {
                        rkPlayer.m_equipMgr.equip_opr(data);
                        break;
                    }
                    case "addWxSubscribe": {
                        rkPlayer.addWxSubscribe(data.data);
                        break;
                    }
                    case "cancelShangJinSai": {
                        rkPlayer.cancelShangJinSai();
                        break;
                    }
                    case "xiaodu_recharge": {
                        try {
                            global.playerMgr.xiaoDuRecharge(rkPlayer.id, data.data.intent.slots);
                        }
                        catch (e) {
                            console.error('xiaodu_recharge exception' + e);
                        }
                        break;
                    }
                    case "setLord": {
                        rkPlayer.lord = data.id;
                        break;
                    }
                    case "getOnlinetimeDaily": {
                        global.matchMgr.sendData({ cmd: 'onlinetimeDaily', time: rkPlayer.getOnlinetimeDaily() });
                        break;
                    }
                    case "buyPower": {
                        rkPlayer.pveNewMgr.buyPower(data.type);
                        break;
                    }
                    case "changePersonSign": {
                        rkPlayer.changePersonSign(data.personSign);
                        break;
                    }
                    case "ZYZLBindId": {
                        TeRedis_1.redistInst.getHashMember('zlzy_id', '' + rkPlayer.id).del();
                        TeRedis_1.redistInst.getHashMember('zlzy_id', '' + rkPlayer.id).save({ plt: data.plt, id: data.id });
                        global.netMgr.sendData({ cmd: 'zlzy_plt_id', plt: data.plt, id: data.id }, linkid);
                        break;
                    }
                    case "ZYZLGetId": {
                        TeRedis_1.redistInst.getHashMember('zlzy_id', '' + rkPlayer.id).load(((linkid, error, result) => {
                            if (result.value) {
                                global.netMgr.sendData({ cmd: 'zlzy_plt_id', plt: result.value.plt, id: result.value.id }, linkid);
                            }
                            else {
                                global.netMgr.sendData({ cmd: 'zlzy_plt_id', plt: '', id: '' }, linkid);
                            }
                        }).bind(this, linkid));
                        break;
                    }
                    case "getLuckyBoxRecord": {
                        global.playerMgr.getLuckyBoxRecord(linkid);
                        break;
                    }
                    case "getToyCamp": {
                        rkPlayer.random_toy_camp();
                    }
                    case "refreshTask": {
                        rkPlayer.m_taskMgr.refreshTask(data.taskId);
                        break;
                    }
                    case "refreshtlmb": {
                        rkPlayer.refreshtlmb();
                        break;
                    }
                    case "back_1v2_cost": {
                        rkPlayer.back_1v2_cost(data.index);
                        break;
                    }
                    case "finish1v2": {
                        rkPlayer.pvpMgr.on_match_pve_fight(data.bWin, data.time, data.isBossDie, 'pve', data.isCross, data.times);
                        break;
                    }
                    case "guild_opr": {
                        rkPlayer.m_guildMgr.guild_opr(data);
                        break;
                    }
                    case "contribute": {
                        rkPlayer.contribute(data.count);
                        break;
                    }
                    case "getToyInfo": {
                        global.netMgr.sendData({ cmd: "toy_info", toy_info: global.playerMgr.toy_info }, rkPlayer.linkid);
                        break;
                    }
                    case "selectHeros": {
                        //神秘商店选择英雄
                        rkPlayer.selectHeros(data.heroIds);
                        break;
                    }
                    case "selectHerosCompose": {
                        //神秘商店选择英雄
                        rkPlayer.selectHerosCompose(data.heroId, data.items, data.amount);
                        break;
                    }
                    case "randomDiscount": {
                        //神秘商店随机折扣
                        rkPlayer.random_discount();
                        break;
                    }
                    case "finishPvepk": {
                        rkPlayer.pvpMgr.on_match_pve_pk(data.isWin, data.time, data.opp_info, data.fight_low);
                        break;
                    }
                    case "useMailsBatch": {
                        rkPlayer.mailMgr.useMails(data.mailIDs);
                        break;
                    }
                    case "delMailsBatch": {
                        rkPlayer.mailMgr.delMails(data.mailIDs);
                        break;
                    }
                    case "pve_pk_refresh": {
                        //获取对手
                        rkPlayer.pvpMgr.pve_pk_refresh(data.indexs, data.no_check, data.use_money);
                        break;
                    }
                    case "pve_pk_buy": {
                        rkPlayer.pve_pk_buy(data.type);
                        break;
                    }
                    case "checkFight": {
                        //判断能否开战
                        rkPlayer.pvpMgr.checkFight(data.opp_id, data.opp_igroup, data.index);
                        break;
                    }
                    case "pve_pk_watch": {
                        //侦查
                        rkPlayer.pvpMgr.pve_pk_watch(data.index);
                        break;
                    }
                    case "select_guild_task": {
                        //获取同盟任务
                        rkPlayer.m_taskMgr.selectGuildTask(data.taskId);
                        break;
                    }
                    case "getGuildTaskInfo": {
                        //获取盟军任务进度
                        rkPlayer.m_guildMgr.getGuildTaskInfo(data.taskIds);
                        break;
                    }
                    case "refuse_invite": {
                        //拒绝同盟邀请
                        rkPlayer.m_guildMgr.refuseGuildInvite(data.guild_id);
                        break;
                    }
                    case "beginPvePk": {
                        rkPlayer.dailyInfo.pve_pk_fight_count--;
                        rkPlayer.updateDailyInfo();
                        rkPlayer.pvpMgr.pve_pk_fight_time = Date.now();
                        break;
                    }
                    //年兽秘宝相关
                    case "selectLuckyItem": {
                        rkPlayer.selectLuckyItem(data.itemId, data.count);
                        break;
                    }
                    case "nextLevel": {
                        rkPlayer.goToNextLevel();
                        break;
                    }
                    case "treasureExchangeSimple": {
                        rkPlayer.treasureExchangeSimple(data.index);
                        break;
                    }
                    case "treasureExchangeBatch": {
                        rkPlayer.treasureExchangeBatch();
                        break;
                    }
                    default:
                        break;
                }
            }
        }
    }
    ;
    sendData(data, linkid = null) {
        if (!data || !linkid) {
            return false;
        }
        // let jsondata = JSON.stringify(data);
        // let zlibjson = deflateRawSync(Buffer.from(jsondata));
        // jsonpb.pb_parse_jsons("game2client", data.cmd, data);
        // jsonpb.pb_create_proto("game2client");
        // let pbdata = jsonpb.pb_encode("game2client", data.cmd, data);
        // let zlibdata = deflateRawSync(pbdata.value)
        // console.log(`cmd:${data.cmd} length:${jsondata.length}/${zlibjson.length}/${pbdata.pb}/${pbdata.value.length}/${zlibdata.length} zlibrate:${(zlibdata.length / zlibjson.length).toFixed(3)}`);
        // console.log(linkid + '-master:-' + data.cmd);
        return super.sendData(data, linkid);
    }
    sendLoginSucess(clientID, account, id, sid) {
        var loginSuccess = {
            cmd: 'loginsuccess',
            account: account,
            id: id,
            sid: sid
        };
        this.sendData(loginSuccess, clientID);
    }
    ;
    sendLoginFailed(clientID, account, error, un_lock_time) {
        var loginFailed = {
            cmd: 'loginfailed',
            account: account,
            error: error,
            ul_time: un_lock_time
        };
        this.sendData(loginFailed, clientID);
    }
    ;
    sendCreateAccountRet(clinetid, account, error, playerid) {
        var Login = {
            cmd: 'createret',
            account: account,
            error: error,
            id: playerid
        };
        this.sendData(Login, clinetid);
    }
    ;
    sendCharInfoInit(serverID, type, charBaseInfo, rechargeOrder, chapter, extinfo, sdwpay, configs = {}) {
        var LoginGame = {
            cmd: 'initinfo',
            type: type,
            baseinfo: charBaseInfo,
            recharge: rechargeOrder,
            chapterInfos: chapter,
            extinfo: extinfo,
            sdwpay: sdwpay,
            configs: configs
        };
        return this.sendData(LoginGame, serverID);
    }
    ;
    sendPvpInfoInit(pvpInfo, linkId) {
        var cmdInfo = {
            cmd: "pvpInit",
            data: pvpInfo,
        };
        return this.sendData(cmdInfo, linkId);
    }
    sendInitMisc(serverID, type, params) {
        var LoginGame = {
            cmd: 'initmisc',
            type: type,
            params: params,
        };
        return this.sendData(LoginGame, serverID);
    }
    ;
    sendUseFoodRet(serverID, type, bSuccess) {
        var oprRet = {
            cmd: 'usefoodret',
            type: type,
            success: bSuccess
        };
        return this.sendData(oprRet, serverID);
    }
    sendQueryItemRet(serverID, kItemID, infos) {
        var oprRet = {
            cmd: 'queryitem',
            kItemID: kItemID,
            infos: infos
        };
        return this.sendData(oprRet, serverID);
    }
    sendBuyItemRet(serverID, bSuccess, typeid, num) {
        var oprRet = {
            cmd: 'buyitemret',
            success: bSuccess,
            typeid: typeid,
            num: num
        };
        return this.sendData(oprRet, serverID);
    }
    sendUseItemRet(serverID, bSuccess) {
        var oprRet = {
            cmd: 'useitemret',
            success: bSuccess
        };
        return this.sendData(oprRet, serverID);
    }
    sendChooseSoldierRet(serverID, bSuccess, heroId, soldierId) {
        var oprRet = {
            cmd: 'choosesoldierret',
            success: bSuccess,
            heroid: heroId,
            soldierid: soldierId
        };
        return this.sendData(oprRet, serverID);
    }
    sendUnlockPosRet(serverID, bSuccess, heroId, flag) {
        var oprRet = {
            cmd: 'unlockposret',
            success: bSuccess,
            heroid: heroId,
            flag: flag
        };
        return this.sendData(oprRet, serverID);
    }
    /**
     * 通知TS连接比赛服务器，发起单局逻辑
     * @param linkId  通知的TSid
     * @raceInfo 比赛信息
     */
    sendPlayerPvPv726RaceBegin(linkId, raceInfo, award, list, mode, rmode) {
        var reacebegin = {
            'cmd': 'racebeginv726',
            'raceinfo': raceInfo,
            'award': award,
            "randomList": list,
            "mode": mode,
            "rmode": rmode
        };
        return this.sendData(reacebegin, linkId);
    }
    ;
    sendPlayer1v2RaceBegin(linkId, raceInfo, award, list, mode, rmode, formation) {
        var reacebegin = {
            'cmd': 'racebegin1v2',
            'raceinfo': raceInfo,
            'award': award,
            "randomList": list,
            "mode": mode,
            "rmode": rmode,
            "formation": formation
        };
        return this.sendData(reacebegin, linkId);
    }
    ;
    sendTestOprRet(serverID, charid, type, charBaseInfo) {
        var LoginGame = {
            cmd: 'testopr',
            charid: charid,
            type: type,
            baseinfo: charBaseInfo
        };
        return this.sendData(LoginGame, serverID);
    }
    ;
    sendCreateChar(serverID, charid, error) {
        var LoginGame = {
            cmd: 'createchar',
            charid: charid,
            error: error
        };
        return this.sendData(LoginGame, serverID);
    }
    ;
    /**
     *
     * @param sendid 玩家链接
     * @param intype 类型(属性名字)
     * @param inparam
     * @param param2
     * @param reason
     * @param autoUpdate 是否自动覆盖玩家属性
     */
    sendCharMiscUpdate(sendid, intype, inparam, param2, reason, autoUpdate = false) {
        var charitem = {
            cmd: "miscupdate",
            type: intype,
            param: inparam,
            param2: param2,
            reason: reason,
            $a: autoUpdate
        };
        return this.sendData(charitem, sendid);
    }
    ;
    // public sendCharsMiscUpdate(sendid, intype, inparam: Array<string>, param2?, reason?) {
    //     var charitem = {
    //         cmd: "miscupdates",
    //         type: intype,
    //         param: inparam,
    //         param2: param2,
    //         reason: reason
    //     };
    //     return this.sendData(charitem, sendid);
    // };
    updateChapter(sendid, chapterinfo, bShowUnlock) {
        var charitem = {
            cmd: "updatechapter",
            chapterinfo: chapterinfo,
            bShowUnlock: bShowUnlock
        };
        return this.sendData(charitem, sendid);
    }
    sendCharItemUpdate(sendid, intype, inparam, reason, subReason) {
        var charitem = {
            cmd: "itemupdate",
            type: intype,
            param: inparam,
            reason: reason,
            subReason: subReason
        };
        return this.sendData(charitem, sendid);
    }
    ;
    sendCharFormationOpr(linkid, type, plan, formation, state) {
        var up_formation = {
            cmd: 'up_formation',
            success: type,
            plan: plan,
            formation: formation,
            state: state
        };
        return this.sendData(up_formation, linkid);
    }
    ;
    sendFormationName(linkid, type, plan, formationName) {
        var up_formation_name = {
            cmd: 'up_formation_name',
            success: type,
            plan: plan,
            formationName: formationName
        };
        return this.sendData(up_formation_name, linkid);
    }
    ;
    sendCharShangJinFormationOpr(linkid, type, shangjinFormation, state) {
        var up_shangjinFormation = {
            cmd: 'up_shangjinFormation',
            success: type,
            formation: shangjinFormation,
            state: state
        };
        return this.sendData(up_shangjinFormation, linkid);
    }
    ;
    sendCharPVEPKFormationOpr(linkid, type, plan, PVEPKFormation, state) {
        var up_PVEPKFormation = {
            cmd: 'up_PVEPKFormation',
            success: type,
            plan: plan,
            formation: PVEPKFormation,
            state: state
        };
        return this.sendData(up_PVEPKFormation, linkid);
    }
    ;
    sendCharBossFormation(linkid, type, plan, bossId) {
        var up_formation = {
            cmd: 'up_bossFormation',
            success: type,
            plan: plan,
            bossId: bossId,
        };
        return this.sendData(up_formation, linkid);
    }
    sendMailsAdd(linkid, mails) {
        var mailInfo = {
            cmd: 'mailsadd',
            mails: mails
        };
        return this.sendData(mailInfo, linkid);
    }
    sendMailsInit(linkid, mails) {
        var mailInfo = {
            cmd: 'mailsinit',
            mails: mails
        };
        return this.sendData(mailInfo, linkid);
    }
    sendMailsDel(linkid, mailid) {
        var mailInfo = {
            cmd: 'mailsdel',
            mailid: mailid
        };
        return this.sendData(mailInfo, linkid);
    }
    sendMailsDelBatch(linkid, mailids) {
        var mailInfo = {
            cmd: 'mailsdelbatch',
            mailids: mailids
        };
        return this.sendData(mailInfo, linkid);
    }
    sendChartInfoRet(linkid, type, charData, startIndex, sumlength, rank) {
        var info = {
            cmd: 'chartinforet',
            type: type,
            charts: charData,
            startindex: startIndex,
            sumlength: sumlength,
            rank: rank
        };
        return this.sendData(info, linkid);
    }
    sendHistoryChartInfoRet(linkid, type, charData, startIndex, sumlength, rank) {
        var info = {
            cmd: 'historychartinforet',
            type: type,
            charts: charData,
            startindex: startIndex,
            sumlength: sumlength,
            rank: rank
        };
        return this.sendData(info, linkid);
    }
    sendChartHisInfoRet(linkid, type, charData, rank, sid) {
        var info = {
            cmd: 'hischartinforet',
            type: type,
            charts: charData,
            rank: rank,
            sid: sid
        };
        return this.sendData(info, linkid);
    }
    sendCommonNotice(linkid, type, title, notice, show = false) {
        var info = {
            cmd: 'notice',
            typd: type,
            title: title,
            notice: notice,
            show: show
        };
        return this.sendData(info, linkid);
    }
    sendGlobalNotice(linkid, msgs) {
        var info = {
            cmd: 'glotice',
            msgs: msgs
        };
        return this.sendData(info, linkid);
    }
    sendAnnouncement(notice, bg, linkid, src) {
        var info = {
            cmd: 'announcement',
            notice: notice,
            bg: bg || "",
            src: src
        };
        if (!linkid) {
            return this.sendAll(info);
        }
        else {
            return this.sendData(info, linkid);
        }
    }
    sendAnnouncement2(notice, linkid, src) {
        var info = {
            cmd: 'announcement2',
            notice: notice,
            src: src
        };
        if (!linkid) {
            return this.sendAll(info);
        }
        else {
            return this.sendData(info, linkid);
        }
    }
    addCharID2LinkID(charid, linkId) {
        if (this.allServers.hasOwnProperty(linkId)) {
            // 这里修改一下，剔除过期的玩家链接
            for (let k in this.allServers) {
                let r_k = this.allServers[k];
                if (r_k.charid == charid) {
                    r_k.charid = 0;
                    r_k.ready = 0;
                }
            }
            var serverData = this.allServers[linkId];
            serverData.charid = charid;
            serverData.ready = 1;
        }
    }
    onLogin(charid, linkid, type, account, loginInfo) {
        global.playerMgr.loginProcess(charid, linkid, type, account, loginInfo);
    }
    sendNeedLogin(linkid) {
        var info = {
            cmd: 'needlogin',
        };
        return this.sendData(info, linkid);
    }
    /**
     * linkid:玩家的链接id
     * type:建筑的操作类型
     * bSuccess:操作是否成功
     * rkBuildInfo:操作成功的时候的建筑信息
     */
    // public sendBuildUpdate(linkid: string, type: PT_BuildOprType, bSuccess: boolean, rkBuildInfo: SeBuildInfo) {
    //     var info: PT_SC_UpdateBuildInfo = {
    //         cmd: 'up_build',
    //         type: type,
    //         success: bSuccess,
    //         buildinfo: rkBuildInfo
    //     }
    //     return this.sendData(info, linkid);
    // }
    sendBuildInit(linkid, rkBuilds) {
        var data = {
            cmd: 'init_build',
            buildinfos: rkBuilds
        };
        return this.sendData(data, linkid);
    }
    sendQueryInfoRet(linkid, subtype, succ, data) {
        var info = {
            cmd: 'qeuryinforet',
            succ: succ,
            subtype: subtype,
            data: data
        };
        return this.sendData(info, linkid);
    }
    sendAcTownEvent(linkid, teid, random) {
        var info = {
            cmd: 'acte',
            teid: teid,
            random: random,
        };
        return this.sendData(info, linkid);
    }
    sendCampainInit(linkid, data) {
        var info = {
            cmd: 'initCompain',
            data: data
        };
        return this.sendData(info, linkid);
    }
    sendCampainUpdate(linkid, round, actionList, energy = -1, selectCard = "", rewardList) {
        var info = {
            cmd: 'campainGridUpdate',
            round: round,
            actionList: actionList,
            selectCard: selectCard,
            rewardList: rewardList
        };
        if (energy >= 0) {
            info['energy'] = energy;
        }
        return this.sendData(info, linkid);
    }
    sendMaxLevelShow(linkid, maxLevel) {
        var info = {
            cmd: 'campainMaxShow',
            maxLevel: maxLevel,
        };
        return this.sendData(info, linkid);
    }
    sendCampainBoxUpdate(linkid, count, fresh) {
        var info = {
            cmd: 'campainboxupdate',
            count: count,
            fresh: fresh
        };
        return this.sendData(info, linkid);
    }
    sendNpcRob(linkid, roberGrid, beRobGrid) {
        var info = {
            cmd: 'campainNpcRob',
            rober: roberGrid,
            beRober: beRobGrid
        };
        return this.sendData(info, linkid);
    }
    sendBlackMark(linkid, sales) {
        var info = {
            cmd: 'blackmark',
            sales: sales,
        };
        return this.sendData(info, linkid);
    }
    sendBlackMarkBuy(linkid, bsucc, sale) {
        var info = {
            cmd: 'blackmarkbuy',
            sale: sale,
            bsucc: bsucc,
        };
        return this.sendData(info, linkid);
    }
    pvpGetBox(linkid, box, index) {
        var info = {
            cmd: 'pvpGetBox',
            box: box,
            index: index
        };
        return this.sendData(info, linkid);
    }
    pvpBoxUpdate(linkid, boxList, openIndex, templeteBox) {
        var info = {
            cmd: 'pvpBoxUpdate',
            boxList: boxList,
            openingIndex: openIndex,
            templeteBox: templeteBox
        };
        return this.sendData(info, linkid);
    }
    /**
     * 结算信息
     * @param linkid
     * @param star
     * @param items
     * @param gameinfo 外部进来的验证信息
     */
    pvpReward(linkid, star, items = [], gameinfo) {
        var f_info = {
            star: star,
            items: items,
            gameinfo: gameinfo,
        };
        var info = {
            cmd: 'pvpReward',
            info: f_info
        };
        return this.sendData(info, linkid);
    }
    sendRechargeRet(linkid, type, info) {
        var data = {
            cmd: 'recharge',
            type: type,
            info: info
        };
        return this.sendData(data, linkid);
    }
    syncCurrChapter(linkid, chapter, isWin) {
        var data = {
            cmd: 'updateCurrChapter',
            chapter: chapter,
            isWin: isWin
        };
        return this.sendData(data, linkid);
    }
    pvpMatchBack(linkid, opp, mode, rmode) {
        var data = {
            cmd: 'pvpMatchBack',
            data: opp,
            mode: mode,
            rmode: rmode
        };
        return this.sendData(data, linkid);
    }
    onSignBack(linkid, signList) {
        var data = {
            cmd: 'onSignBack',
            list: signList,
        };
        return this.sendData(data, linkid);
    }
    onMonthSignRet(linkid, type, iDay, succ) {
        var data = {
            cmd: 'onMonthSignRet',
            type: type,
            iDay: iDay,
            succ: succ
        };
        return this.sendData(data, linkid);
    }
    onDaySignRet(linkid, type, iDay, succ) {
        var data = {
            cmd: 'onDaySignRet',
            type: type,
            iDay: iDay,
            succ: succ
        };
        return this.sendData(data, linkid);
    }
    syncTaskacc(linkid, module, group, value) {
        var data = {
            cmd: 'syncTaskacc',
            module: module,
            group: group,
            value: value
        };
        return this.sendData(data, linkid);
    }
    syncTask(linkid, updateList, delList) {
        var data = {
            cmd: 'syncTask',
            updateList: updateList,
            delList: delList
        };
        return this.sendData(data, linkid);
    }
    sendEquip(linkid, type, equipInfo, notice) {
        var data = {
            cmd: 'syncEquip',
            type: type,
            equipInfo: equipInfo,
            notice: notice,
        };
        return this.sendData(data, linkid);
    }
    initTask(linkid, list, acc) {
        var data = {
            cmd: 'initTask',
            list: list,
            accumulation: acc
        };
        return this.sendData(data, linkid);
    }
    sendChartUnit(linkid, unit) {
        var data = {
            cmd: 'chartUnit',
            data: unit,
        };
        return this.sendData(data, linkid);
    }
    sendCheckName(linkid, code, name) {
        var data = {
            cmd: 'onCheckName',
            code: code,
            name: name
        };
        return this.sendData(data, linkid);
    }
    sendCheckPersonSign(linkid, code, personSign) {
        var data = {
            cmd: 'onCheckPersonSign',
            code: code,
            personSign: personSign
        };
        return this.sendData(data, linkid);
    }
    sendGuildError(linkid, err_code, err_reason) {
        var data = {
            cmd: 'guild_opr_error',
            err_code: err_code,
            err_reason: err_reason
        };
        return this.sendData(data, linkid);
    }
    initShop(linkid, d) {
        var data = {
            cmd: 'initShop',
            info: d,
        };
        return this.sendData(data, linkid);
    }
    updateShop(linkid, d) {
        var data = {
            cmd: 'updateShop_ret',
            info: d,
        };
        return this.sendData(data, linkid);
    }
    getPlayerInfo(linkid, d) {
        var data = {
            cmd: 'playerInfo',
            info: d,
        };
        return this.sendData(data, linkid);
    }
    sendSystemMail(linkid, list) {
        var data = {
            cmd: 'sysmail',
            list: list,
        };
        return this.sendData(data, linkid);
    }
}
exports.SeNetMgr = SeNetMgr;
//# sourceMappingURL=SeNetMgr.js.map