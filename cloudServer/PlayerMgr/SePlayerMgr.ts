/*
 这个负责管理玩家的基本逻辑
 */
import * as TableRes from "../Res/interface";
import { SePlayer } from './SePlayer';
import { CharState, SeCharLoadFlag, SeRaceBeginInfo, SeDBInfoHead, SeNationType, SeNationTypeNames, SeTownBuffType, IFLoginInfo, ifRecharge1, ifSdwAPI, PlayerProperty, ifFriendInfo, ifExtInfo } from '../SeDefine';
import { SeCharMailInfo } from "../SeDefine";
import { ReList, ReHash, ReHashMember, redistInst } from '../lib/TeRedis';
import { SeItemType } from "../SeDefine";
import { TaskAction, SeMailType, SeRaceOpp, SePvpOpp, PlayerInfo, PlayerPvpInfo, SeLogicFormation } from "../SeDefine";
import { iApp } from "../app";
import { SeHeroCard, SeBaseCharInfo, RechargeInfo, PvpLogInfo, SeItem } from './SePlayerDef';
import { mysqlLoaderInst, DBLoader } from './TePlayerLoader';
import { SeEnumsevendayskTaskType } from '../Res/interface';
import { formationName, XiaoDuSign, TeDate} from "../TeTool";
import { configInst } from "../lib/TeConfig";
import { TaskModule } from "./SeTaskMgr";
import { SeCallBackMgr } from "./SeCallBackMgr";
import { createHash } from 'crypto';
import { http_quest } from "../lib/TeHttpQuest";
import { HashMap, TeMap, LangID } from '../TeTool';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFile } from 'fs';
var http = require('https');

declare var global: iApp;

function makeKey(charid) {
    return 'base' + charid;
}

export class SeToy{
    id: number;
    progress: number;
    totcharge: number; 
    player_count: number; 
    is_complete: boolean;
    complete_rank: number;
    complete_time: number;
}

// 这里存放公共数据
class SePlayerMgr {
    public allPlayers: any = {};
    public toy_info: Array<SeToy> = [];
    public subscribePlayers: any = {};
    private _onlinePlayers: number = 0;
    public _genmailid: number = 0;
    public mailGenID: number = 0;
    // public nameDb: ReHash;
    private subscribe_db: ReHash<any>;
    private lucky_box_record: ReList<any>;
    private on_off_2v2: boolean = false;
    public announcementMgr = new AnnouncementFactory();
    //诸侯伐董榜单长度
    public pve_pk_length: number = 0;
    curr_season_id: string = 'S000';

    get wx_subscribe_db(){
        if(!this.subscribe_db){
            this.subscribe_db = redistInst.getHash('wx_subscribe');
            this.subscribe_db.load(() => {
                this.subscribePlayers = this.wx_subscribe_db.get('subscribePlayers') || {};
            });
        }
        
        return this.subscribe_db;
    }

    get luckyBoxRecord(){
        if(!this.lucky_box_record){
            this.lucky_box_record = redistInst.getList(configInst.get('plt') + '_lucky_box_record');
            this.lucky_box_record.load(() => {});
        }
        
        return this.lucky_box_record;
    }

    constructor() {
        // 这里增加一个检查 判断系统的赛季
        TaskModule.load_module();
    }

    private _ready_ = false;
    init_ready() {
        if (this._ready_) return;

        this.dbReady();
        this.check_season();

        setInterval(this._update_.bind(this), 1000);
        setInterval(this._del_offline_.bind(this), 5*60*1000);
        if(configInst.get('plt').indexOf('wx') != -1){
            this.subscribePlayers = this.wx_subscribe_db.get('subscribePlayers') || {};
            setInterval(this.check_wx_subcribe.bind(this), 3 * 60 * 1000);
        }
        
        this.lucky_box_record = redistInst.getList(configInst.get('plt') + '_lucky_box_record');
        this.lucky_box_record.load(() => {});
        this._ready_ = true;
        if(configInst.get('plt').indexOf('hago') != -1 || configInst.get('plt').indexOf('qq') != -1){
            if(existsSync(join(process.cwd(), 'subscribePlayers.dat'))){
                this.subscribePlayers = JSON.parse(readFileSync(join(process.cwd(), 'subscribePlayers.dat')).toString());
            }
            else{
                this.subscribePlayers = {};
            }
            setInterval(this.check_wx_subcribe.bind(this, configInst.get('plt')), 3 * 60 * 1000);
        }
       
    }

    private save_subscribe_players() {
        writeFile(join(process.cwd(), 'subscribePlayers.dat'), JSON.stringify(this.subscribePlayers), { encoding: 'utf8', flag: 'w+' }, function (err) {
            if (err) console.error(err);
        });
    }
    
    private _update_() {
        this.check_season();
    }

    private _del_offline_() {
        for(var key in this.allPlayers){
            let rkplayer = this.allPlayers[key];
            if(!rkplayer){
                continue;
            }
            if(!global.netMgr.allServers.hasOwnProperty(rkplayer.linkid) || global.netMgr.allServers[rkplayer.linkid].charid != rkplayer.id){
                console.error(rkplayer.id + ' offline!!');
                this.leaveProcess(rkplayer.id, rkplayer.linkid, 'offline');
            }
        }
    }
    wx_templateIds = ['YDUUc9PAKZsnKo0Di3oYrJO2Orpc7KOOrSrbmIX-Ftk','3XUBcDi5WLcodcDawtaYlmy5OhVJ92B1NKVaY0wj9B8','3XUBcDi5WLcodcDawtaYluefrPzNnqZmnrJAL4V9Bn4'];
    qq_templateIds = ['2v2qq不订阅','989678c76b717850ffa8ba37ebba9925','d9cdd5ea25cf93f48758eaa9f51f0e46'];
    private check_wx_subcribe(plt = 'wx') {
        if(plt == 'wx'){
            this.subscribePlayers = this.wx_subscribe_db.get('subscribePlayers') || {};
        }
        var start_2v2_time1 = global.resMgr.getConfig('twovtwoTime').split('|')[0].split(',')[0];
        var end_2v2_time1 = global.resMgr.getConfig('twovtwoTime').split('|')[0].split(',')[2];
        var start_2v2_time2 = global.resMgr.getConfig('twovtwoTime').split('|')[1].split(',')[0];
        var end_2v2_time2 = global.resMgr.getConfig('twovtwoTime').split('|')[1].split(',')[2];
        var now_hours = new Date().getHours();
        //到时了开启
        if(!this.on_off_2v2 
            && ((now_hours >= Number(start_2v2_time1) && now_hours < Number(end_2v2_time1)) 
                || (now_hours >= Number(start_2v2_time2) && now_hours < Number(end_2v2_time2)))){
                    this.check_2v2_time(plt);
                    this.on_off_2v2 = true;
        }
        else if(this.on_off_2v2 && 
            ((now_hours < Number(start_2v2_time1)) 
            || (now_hours >= Number(end_2v2_time1) && now_hours < Number(start_2v2_time2)) 
            || now_hours > Number(end_2v2_time2)) ){
                this.on_off_2v2 = false;
        }
        
        this.check_mianfeilingjiang(plt);
        this.check_mianfeizhuangbei(plt);
        if(plt == 'wx'){
            this.wx_subscribe_db.save('subscribePlayers', this.subscribePlayers);
        }
        else if(plt == 'hago' || plt == 'qq'){
            this.save_subscribe_players();
        }
    }

    check_2v2_time(plt) {
        var curr = Date.now();
        for(var key in this.subscribePlayers){
            let player = this.subscribePlayers[key][0];
            if(player && player.curr == 1 && curr >= player.noticeTime){
                //消息内容
                switch(plt){
                    case 'wx': {
                        let templateData = {
                            "thing1": {
                                "value": "2v2"
                            },
                            "thing5": {
                                "value": "2v2开启啦，快来拿宝箱吧！"
                            }
                        };
                        this.getWxTokenAndSendSubscribe(key, plt, this.wx_templateIds[0],templateData, this.sendWxOrQQSubscribemessage);
                        break;
                    }
                    case 'hago':{
                        this.sendHagoSubscribe(player.country, key, 'event_B');
                        break;
                    }
                }
                player.curr = 0;
            }
        }
        
    }

    check_mianfeilingjiang(plt) {
        var curr = Date.now();
        for(var key in this.subscribePlayers){
            let player = this.subscribePlayers[key][1];
            if(player && player.curr == 1 && curr >= player.noticeTime){
                //消息内容
                switch(plt){
                    case 'wx': {
                        let templateData = {
                            "thing1": {
                                "value": "免费抽卡"
                            },
                            "thing4": {
                                "value": "今日的免费抽奖更新啦，快来抽奖吧~"
                            }
                        };
                        this.getWxTokenAndSendSubscribe(key, plt, this.wx_templateIds[1],templateData, this.sendWxOrQQSubscribemessage);
                        break;
                    }
                    case 'hago':{
                        this.sendHagoSubscribe(player.country, key, 'event_A');
                        break;
                    }
                    case 'qq':{
                        let templateData = {
                            "keyword1": {
                                "value": "免费抽卡"
                            },
                            "keyword2": {
                                "value": "今日的免费抽奖更新啦，快来抽奖吧~"
                            }
                        };
                        this.getWxTokenAndSendSubscribe(key, plt, this.qq_templateIds[1], templateData, this.sendWxOrQQSubscribemessage);
                        break;
                    }
                }
                player.curr = 0;
                //找到那个人，如果加载完成，通知0
            }
        }
    }

    check_mianfeizhuangbei(plt) {
        var curr = Date.now();
        for(var key in this.subscribePlayers){
            let player = this.subscribePlayers[key][2];
            if(player && player.curr == 1 && curr >= player.noticeTime){
                //消息内容
                switch(plt){
                    case 'wx': {
                        let templateData = {
                            "thing1": {
                                "value": "免费抽装备"
                            },
                            "thing4": {
                                "value": "今日免费抽装备更新啦，快乐领装备~"
                            }
                        };
                        this.getWxTokenAndSendSubscribe(key, plt, this.wx_templateIds[2], templateData, this.sendWxOrQQSubscribemessage);
                        break;
                    }
                    case 'qq':{
                        let templateData = {
                            "keyword1": {
                                "value": "免费抽装备"
                            },
                            "keyword2": {
                                "value": "今日免费抽装备更新啦，快乐领装备~"
                            }
                        };
                        this.getWxTokenAndSendSubscribe(key, plt, this.qq_templateIds[2], templateData, this.sendWxOrQQSubscribemessage);
                        break;
                    }
                }
                player.curr = 0;
                //找到那个人，如果加载完成，通知0
            }
        }
    }

    public addSubscribePlayers(openid: string, info: any, plt: string = 'wx', country?: string){
        //wx wx2渠道数据保存在redis，hago保存在本地文件中
        if(plt.indexOf('wx') !=-1){
            this.subscribePlayers = this.wx_subscribe_db.get('subscribePlayers');
            if(!this.subscribePlayers){
                return;
            }
            this.subscribePlayers[openid] = info;
            this.wx_subscribe_db.save('subscribePlayers', this.subscribePlayers);
        }
        else if(plt.indexOf('hago') !=-1){
            this.subscribePlayers[openid] = info;
        }
        else if(plt.indexOf('qq') !=-1){
            this.subscribePlayers[openid] = info;
        }
    }

    public getWxTokenAndSendSubscribe(openid: string, plt: string, templateId: string, templateData: {}, cb_sendSubscribemessage:Function = this.sendWxOrQQSubscribemessage){
        let appid = '1145326931';
        let wxappid = '';
        let hostname = '';
        let path = '';
        if(plt == 'qq'){
            wxappid = '1109263355';
            hostname = 'api.q.qq.com';
            path = '/api/json/subscribe/SendSubscriptionMessage?access_token=';
        }
        else if(plt == 'wx'){
            wxappid = 'wxdba811af3ac0f3b5';
            hostname = 'api.weixin.qq.com';
            path = '/cgi-bin/message/subscribe/send?access_token=';
        }
        let sec = (new Date()).getTime();
        let key = 'fbc92a323bce41a698018a247a1f11';
        let sign:string = createHash('md5').update(appid).update(String(sec)).update(key).digest('hex');
        var url = 'https://wxpush.shandw.com/getaccesstoken/' + wxappid + '?appid=' + appid + '&sec=' + sec + '&sign=' + sign;
        var accessToken = null;
        http.get(url, (function (req,res) {
            req.on('data',function(data){
                accessToken = JSON.parse(data)['AccessToken'];
                //发送订阅消息
                cb_sendSubscribemessage(hostname, path, accessToken, openid, templateId, templateData);
            }); 
            req.on('end',function(){
                
            });
        }));
    }

    private sendHagoSubscribe(country: string, openid: string, eventId: string){
        let host = '';
        if(configInst.get('cheatmode')){
            host += 'access-api-test-'+ country +'.ihago.net';
        }else{
            host += 'access-api-'+ country +'.ihago.net';
        }
        var post_data={
            "seq_id": Date.now(),
            "game_id": 'BattleCrush',
            "app_key": '30950e65eaec4ea4b9add5884a1b5b1a',
            "event_id":eventId,
            "uids":[],
            "openids":[openid],
        }

        var content=JSON.stringify(post_data);
        var options = {
            hostname: host,
            port: '443',
            path: '/gamePublic/publicMsg',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Content-Length': utf8StringLength(content)
                'Content-Length': Buffer.from(content).byteLength
              }
        };
        var req = http.request(options, (function (res) {
            res.on('data', function(chunk){
                console.log(JSON.parse(chunk));
             });
           
        }).bind(this));
        // req.write(content);
        req.write(content);
        req.end();
    }

    sendWxOrQQSubscribemessage(hostname: string, path: string, accessToken: string, openid: string, templateId: string, templateData: {}){
        var post_data={
            "touser": openid,
            "template_id": templateId,
            "data": templateData
        }
        
        var content=JSON.stringify(post_data);
        var options = {
            hostname: hostname,
            port: '443',
            path: path + accessToken,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 'Content-Length': utf8StringLength(content)
                'Content-Length': Buffer.from(content).byteLength
              }
        };
        var req = http.request(options, (function (res) {
            res.on('data', function(chunk){
                console.log(JSON.parse(chunk));
             });
           
        }).bind(this));
        // req.write(content);
        req.write(content);
        req.end();
    }

    addLuckyBoxRecord(value){
        this.lucky_box_record.load(() => {
            while(this.luckyBoxRecord.value.length >= 30){
                this.luckyBoxRecord.Del(this.luckyBoxRecord.value[0]);
            }
            this.luckyBoxRecord.push_back(value);
        });
        //推送给这个进程下的所有人
        var info = {
            cmd: 'add_lucky_box_record',
            value: value,
        };
        global.netMgr.sendAll(info);
    }
    
    getLuckyBoxRecord(linkid){
        this.lucky_box_record.load(() => { global.netMgr.sendData({ cmd: 'lucky_box_record', value: this.luckyBoxRecord.value}, linkid);});
    }
    check_season() {
        var curr = Date.now();
        var pkRes = global.resMgr.seasonRes.getRes(this.curr_season_id);
        if (pkRes && pkRes.kEndTime) {
            if (curr > (new Date(pkRes.kEndTime)).getTime() && pkRes.kNextID) {
                this.curr_season_id = pkRes.kNextID;

                this.check_season();
            }
        }
    }

    get onlinePlayers() {
        return this._onlinePlayers;
    }

    public getCharInfo(charid, needComplete = true): SePlayer {
        var key = makeKey(charid);
        if (this.allPlayers.hasOwnProperty(key)) {
            var player = this.allPlayers[key];
            if (needComplete && !player.loadComplete) {
                return undefined;
            }

            return player;
        }
        return null;
    };

    public getPlayer(charid, needComplete = true): SePlayer {
        // needComplete = needComplete || true;
        return this.getCharInfo(charid, needComplete);
    }

    public getPlayerByOpenId(openid: string): SePlayer {
        for(let key in this.allPlayers){
            let player = this.allPlayers[key];
            if(player && player.state != CharState.offline && player.state != CharState.lock && player.loginInfo.openid == openid)
            return player;
        }
        return null;
    }

    public addCharInfo(charid, charInfo) {
        this.allPlayers[makeKey(charid)] = charInfo;
        this._onlinePlayers++;
    };

    public delCharInfo(chaid) {
        if (this.allPlayers.hasOwnProperty(makeKey(chaid))) {
            delete this.allPlayers[makeKey(chaid)];
            this._onlinePlayers--;
        }
    };

    public kickPlayer(id: number) {
        var rkPlayer: SePlayer = this.getPlayer(id, false);
        if (!rkPlayer) {
            return;
        }
        global.netMgr.sendData({ cmd: 'kicked' }, rkPlayer.linkid);
        // console.log(rkPlayer.name);
        global.netMgr.disconnect(rkPlayer.linkid, true, id);
    }

    public kickAllPlayer() {
        for(var key in this.allPlayers){
            let rkPlayer = this.allPlayers[key];
            if (rkPlayer) {
                global.netMgr.sendData({ cmd: 'kicked' }, rkPlayer.linkid);
                global.netMgr.disconnect(rkPlayer.linkid, true, rkPlayer.id);
            }
        }
    }

    public getWxMessage(openid: string, content: string) {
        var rkPlayer: SePlayer = this.getPlayerByOpenId(openid);
        if (!rkPlayer) {
            return;
        }
        //处理业务逻辑，完成任务
        if(content != '1')  return;
        let result = rkPlayer.m_taskMgr.doAction(TaskAction.WxMessage,content);
        //发送消息给用户
        if(result){
            this.sendWxmessage(rkPlayer.id,rkPlayer.loginInfo.openid);
        }
        
    }

    private sendWxmessage(uid: number, openid: string){
        let appid = '1145326931';
        let time = (new Date()).getTime();
        let key = 'fbc92a323bce41a698018a247a1f11';
        let sign:string = createHash('md5').update(appid).update(String(uid)).update(openid).update(String(time)).update(key).digest('hex');
        var post_data={
            "touser": openid,
            "msgtype": "text",
            "text": {
                "content": "请返回游戏，进入【邮件】领取今日奖励"
            }
        }
        var content=JSON.stringify(post_data);
        var options = {
            hostname: 'wxpush.shandw.com',
            port: '443',
            path: '/wxsendcst/wxdba811af3ac0f3b5?appid=' + appid + '&uid=' + uid + '&openid=' + openid + '&time=' + time + '&sign=' + sign,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
              }
        };
        var req = http.request(options, (function (res) {
        }).bind(this));
        req.write(content);
        req.end();
    }

    //玩家的登录流程
    public loginProcess(charid, linkid, type, account, loginInfo: IFLoginInfo) {
        // 首先先检查玩家是否已经登录
        global.netMgr.addCharID2LinkID(charid, linkid);
        var rkPlayer = this.getCharInfo(charid, false);
        if (!rkPlayer) {
            let plt = 'sdw';
            if (loginInfo && loginInfo.plt) {
                plt = loginInfo.plt;
            }
            rkPlayer = new SePlayer(charid, account, plt);
            this.addCharInfo(charid, rkPlayer);
            global.netMgr.addCharID2LinkID(charid, linkid);
        }
        else {
            rkPlayer.loadflag = 0;
            rkPlayer.loadReload();
        }

        // 这里需要通知服务器，我上线了，同时发布一个信息过去
        rkPlayer.state = CharState.loading;
        rkPlayer.linkid = linkid;
        rkPlayer.loginInfo = loginInfo;
    };

    /**
     * 这里加载玩家的第三方信息 这里的前提是玩家已经存在 SePlayer的时候，否则数据丢弃
     * @param uid 
     * @param exinfo 
     */
    public loadExtinfo(uid: number, exinfo: ifExtInfo) {
        var rkPlayer = this.getCharInfo(uid, false);
        if (rkPlayer) {
            rkPlayer.loadExtInfo(exinfo);
        }
    }

    public leaveProcess(charid, linkid, type) {
        var rkPlayer: SePlayer = this.getCharInfo(charid, false);
        if (!rkPlayer || rkPlayer.linkid != linkid) {
            return;
        }

        // 玩家离开的话就直接删除玩家数据，最后保存一次
        if (rkPlayer.loadComplete) {
            global.lsMgr.sendPlayerLeave(rkPlayer.account, rkPlayer.id, { lvl: rkPlayer.level, icon: rkPlayer.icon, name: rkPlayer.name });
            global.logMgr.leave(rkPlayer, type);
            if(!rkPlayer.needdelete){
                rkPlayer.leaveGame();
            }
        }
        else {
            global.lsMgr.sendPlayerLeave(rkPlayer.account, rkPlayer.id);
        }
        this.delCharInfo(charid);
    };

    public getOnlinePlayers() {
        var outs = [];
        for (var key in this.allPlayers) {
            var rkPlayer = <SePlayer>this.allPlayers[key];
            if (!rkPlayer) {
                continue;
            }

            if (rkPlayer.loadComplete) {
                outs.push({ ac: rkPlayer.account, id: rkPlayer.id, linkid: rkPlayer.linkid, loginInfo: rkPlayer.loginInfo, logintime: rkPlayer.baseInfo.loginTime, role: { lvl: rkPlayer.level, icon: rkPlayer.icon, name: rkPlayer.name } });
            }
            else {
                outs.push({ ac: rkPlayer.account, id: rkPlayer.id, linkid: rkPlayer.linkid, loginInfo: rkPlayer.loginInfo, logintime: rkPlayer.baseInfo.loginTime });
            }
        }
        return outs
    }

    public onlinePlayerState() {
        var outs: { state: ifFriendInfo, friends: number[] }[] = [];
        var plt_friends: number[] = [];
        for (var key in this.allPlayers) {
            var rkPlayer = <SePlayer>this.allPlayers[key];
            if (!rkPlayer || !rkPlayer.loadComplete) {
                continue;
            }

            outs.push({ state: rkPlayer.friendMgr.f_state, friends: rkPlayer.friendMgr.plt_friend_uids });
        }
        return outs
    }

    public createCharBegin(charid: number, charname: string, icon: string, scene: string, appId: string) {
        // 需要线检查玩家的名字是否和合法和重复，然后创建玩家角色
        var charInfo = this.getCharInfo(charid, false);
        if (!charInfo || charInfo.state != CharState.nochar) {
            return;
        }

        charInfo.name = charname;

        mysqlLoaderInst.renamename(null, charname, charid);

        charInfo.icon = icon;
        charInfo.baseInfo.level = 1;
        charInfo.state = CharState.loading;
        charInfo.baseInfo.version = global.resMgr.getConfig('userver');

        let shareUid = 0;
        if (charInfo.loginInfo && charInfo.loginInfo.shareuid && charInfo.loginInfo.shareuid.toString().length > 0) {
            shareUid = parseInt(charInfo.loginInfo.shareuid.toString());
            if (!shareUid || isNaN(shareUid)) shareUid = 0;
        }

        charInfo.baseInfo.share_uid = shareUid;
        charInfo.baseInfo.channel = charInfo.loginInfo ? (charInfo.loginInfo.channel || "") : '';
        charInfo.onCreateChar(shareUid);

        charInfo.saveBaseInfo();

        charInfo.pvpDb.save('seasonid', global.playerMgr.curr_season_id);

        charInfo.loadReload();

        mysqlLoaderInst.insertuid(charid, charInfo.plt);


        global.logMgr.createChar(charInfo);
        global.logMgr.register(charInfo, shareUid.toString(), scene, appId);
        global.netMgr.sendCreateChar(charInfo.linkid, charid, 'success');
    };

    public setPlayerInGame(playerID) {
        var rkPlayer = this.getPlayer(playerID, true);
        if (rkPlayer) {
            rkPlayer.setState(CharState.inrace);
        }
    }

    //转发同盟相关命令
    public sendGuildCMD(uid: number, data) {
        var rkPlayer = this.getPlayer(uid);
        if (rkPlayer) {
            global.netMgr.sendData(data, rkPlayer.linkid);
        }
    }
    
    // 强制如果玩家在线的话立即收到邮件
    public onGiveMail_Online(plt: string, accountid: number, mailType: SeMailType, message: string, items?: Array<SeItem>, delay?: number, title?: string, endTime?: number) {
        delay = delay || 0;

        // 检查一下道具，如果存在不能数量是0的
        if (items) {
            for (let i = 0; i < items.length; i++) {
                let r = items[i];
                if (!r || r.iPileCount == 0) {
                    items.splice(i, 1);
                    i--;
                }
            }
        }

        // 这里邮件需要添加一个邮件id，目的是防止出现相同的邮件信息
        var mailInfo: SeCharMailInfo = new SeCharMailInfo(global.getmailid(), mailType, message, items, title, endTime);
        mailInfo.uid = accountid;
        mailInfo.cttime += delay * 1000;
        var rkPlayer: SePlayer = this.getPlayer(accountid);

        // 玩家在线或者网络断开的时候直接走普通邮件
        if ((rkPlayer && rkPlayer.hasCharLoadFlag(SeCharLoadFlag.mailinfo)) || !global.lsMgr.isNetReady) {
            // 玩家已经加载邮件信息了，但是没有加载完成，那么可以把数据加载到邮件数据上
            this.onGiveMail(plt, accountid, mailType, message, items, delay, title, endTime);
        }
        else {
            // 玩家不在线的时候 数据发送给登陆服务器 进行二次分配
            mailInfo.mailid = accountid.toString();
            global.lsMgr.sendLSData({ cmd: "onlineGiveMail", uid: accountid, mailinfo: mailInfo });
        }
        return true;
    }


    /**给玩家发送邮件
     * accountid 玩家的数据id
     * mailType 邮件的类型 0：普通 1：战斗邮件
     * mesmessage 邮件消息内容
     * itemType 邮件可能携带的道具
     * num 道具数量
     * delay 为了实现延迟发送的功能，延后邮件的生成时间 单位秒
     */
    public onGiveMail(plt: string, accountid: number, mailType: SeMailType, message: string, items?: Array<SeItem>, delay?: number, title?: string, endTime?: number) {
        delay = delay || 0;

        // 检查一下道具，如果存在不能数量是0的
        if (items) {
            for (let i = 0; i < items.length; i++) {
                let r = items[i];
                if (!r || r.iPileCount == 0) {
                    items.splice(i, 1);
                    i--;
                }
            }
        }

        // 这里邮件需要添加一个邮件id，目的是防止出现相同的邮件信息
        var mailInfo: SeCharMailInfo = new SeCharMailInfo(global.getmailid(), mailType, message, items, title, endTime);
        mailInfo.uid = accountid;
        mailInfo.cttime += delay * 1000;
        var rkPlayer: SePlayer = this.getPlayer(accountid);
        if (rkPlayer && rkPlayer.hasCharLoadFlag(SeCharLoadFlag.mailinfo)) {
            // 玩家已经加载邮件信息了，但是没有加载完成，那么可以把数据加载到邮件数据上
            if (!rkPlayer.addMail(mailInfo)) {
                // 邮件重复或者其它情况添加失败的时候提示一下
                console.warn((new Date) + 'addmail failed:' + JSON.stringify(mailInfo));
            }
        }
        else {
            // 玩家不在线的时候
            if (global.syncMgr.isNetReady()) {
                global.syncMgr.offlineSave(accountid, JSON.stringify(mailInfo));
            }
            else {
                var rkReMailList = mysqlLoaderInst.getLoaderUnit(accountid, SeDBInfoHead.mailInfo) as ReList<any>;
                rkReMailList.push_back(mailInfo);
            }
        }
        return true;
    }

    /**
     * 训练模式
     * @param charid 
     * @param data 
     */
    public onMatchPvp(charid: number, data: SePvpOpp, mode: string, rmode: string) {
        var rkPlayer = this.getPlayer(charid);
        if (rkPlayer) {
            rkPlayer.pvpMgr.on_match_pvp(data, mode, rmode);
        }
    }

    /**
     * 1v1的人机
     * @param charid 
     * @param data 
     * @param randomList 
     */
    public onMatchPvpv726Ret(charid: number, data: SePvpOpp, mode, rmode, randomList: Array<any>) {
        var rkPlayer = this.getPlayer(charid);
        if (rkPlayer) {
            rkPlayer.pvpMgr.on_match_pvp_v726_ms(data, randomList, mode, rmode);
        }
    }

    /**
     * 2v2的人机
     * @param charid 
     * @param data 
     * @param randomList 
     */
    public onMatchPve2v2Ret(charid: number, data: SePvpOpp[], randomList: Array<any>) {
        var rkPlayer = this.getPlayer(charid);
        if (rkPlayer) {
            rkPlayer.pvpMgr.on_match_pve_2v2_ms(data, randomList);
        }
    }

    /**
     * 1v2的人机
     * @param charid 
     * @param data 
     * @param randomList 
     */
    public onMatchPve1v2Ret(charid: number, data: SePvpOpp[], mode, rmode,  randomList: Array<any>, formation) {
        var rkPlayer = this.getPlayer(charid);
        if (rkPlayer) {
            rkPlayer.pvpMgr.on_match_pve_1v2_ms(data, randomList, mode, rmode, formation);
        }
    }

    public randlist(uid: number, list, mode, bind) {
        var rkPlayer = this.getPlayer(uid);
        if (rkPlayer) {
            global.netMgr.sendData({ cmd: 'randlist', list: list, mode: mode, bind: bind }, rkPlayer.linkid);
        }
    }

    public cancell_match_ret(uid: number, mode) {
        var rkPlayer = this.getPlayer(uid);
        if (rkPlayer) {
            rkPlayer.setState(CharState.loadcomplete);
            global.netMgr.sendData({ cmd: 'cancell', mode: mode }, rkPlayer.linkid);
        }
    }

    public room_opr(uid: number, type: string, joinkey: string, info: any, room_type: number) {
        var rkPlayer = this.getPlayer(uid);
        rkPlayer && rkPlayer.recive_room_info(type, joinkey, info, room_type);
    }

    /**
     * 1v1 2v2 的对战
     * @param rid 
     * @param uid 
     * @param checkKey 
     * @param rurl 
     * @param oscore 
     * @param mode 
     */
    public onMatchOlPvp(rid: string, uid: number, checkKey: string, rurl: string, oscore, mode: string) {
        var rkPlayer = this.getPlayer(uid);
        if (rkPlayer) {
            rkPlayer.pvpMgr.on_match_pvp_ol_back(rid, checkKey, rurl, oscore, mode);
        }
        // else{
        //     console.error(uid + ' not found');
        // }
    }

    public onMatchVideo(rid: string, uid: number, infos: any, level: any, rmode: string) {
        var rkPlayer = this.getPlayer(uid);
        if (rkPlayer) {
            global.netMgr.sendData({
                cmd: 'queryvideo',
                infos: infos,
                level: level,
                rmode: rmode,
            }, rkPlayer.linkid);
        }
    }
    public onMatchVideod(rid: string, uid: number, infos: any) {
        var rkPlayer = this.getPlayer(uid);
        if (rkPlayer) {
            global.netMgr.sendData({
                cmd: 'queryvideod',
                infos: infos,
            }, rkPlayer.linkid);
        }
    }

    public onkillrecord(rid: string, uid: number, infos: any) {
        var rkPlayer = this.getPlayer(uid);
        if (rkPlayer) {
            global.netMgr.sendData({
                cmd: 'getkillrecord_ret',
                infos: infos,
            }, rkPlayer.linkid);
        }
    }

    public onPvpResult(data: { uid: number, sid: string, rid: string, bwin: boolean, time: number, isBossDie: boolean, mode: string, pvp_score: number, rmode: number, bTeam: boolean, oppname: string, opplevel: number, state: string, isUnSync: boolean, plt: string, host_id: number, host_skills: Array<number>, times: number, index: number, formation_1v2: Array<SeLogicFormation>;}, isCross: boolean) {
        // 检查一下这个玩家是否加载完成
        var rkPlayer = this.getPlayer(data.uid);
        if (rkPlayer) {
            rkPlayer.pvpMgr.onMatchPvpOlFight_MS_BACK(data.bwin, data.time, data.isBossDie, data.mode, data.pvp_score, data.rmode, data.rid, data.bTeam, data.oppname || '', data.state, data.isUnSync, isCross, data.opplevel, data.host_id, data.host_skills, data.times, data.index, data.formation_1v2);
        }
        else {
            // 玩家加载没完成或者不在线
            // 离线结算或者推送到一个池子里面
            // 这里制作一个结算邮件，登陆的时候处理掉
            data['isCross'] = isCross;
            data['finishTime'] = Date.now();
            this.onGiveMail(data.plt, data.uid, SeMailType.PvpResult, JSON.stringify(data));
        }

    }

    public onRaceLives(data: { uid: number, infos: any[] }) {
        var rkPlayer = this.getPlayer(data.uid);
        if (rkPlayer) {
            global.netMgr.sendData({
                cmd: 'liveraces',
                infos: data.infos
            }, rkPlayer.linkid)
        }
    }

    /**
     * 收到封魔数据 来自登陆服务器
     * @param type 
     * @param info 
     */
    public onRechargeOpr(type: string, info: ifRecharge1 | ifSdwAPI, plt: string) {
        switch (type) {
            case 'addmoney': {
                info = <ifSdwAPI>info;
                this.onAddMoneyOrder(parseInt(info.accountId), parseInt(info.amount), info.cpOrderId, plt);
                break;
            }
            case 'check': {
                info = <ifRecharge1>info;
                var rkPlayer = this.getPlayer(info.accountId);
                if (rkPlayer) {
                    global.netMgr.sendRechargeRet(rkPlayer.linkid, type, info);
                }
                break;
            }
        }
    }

    /**
     * 玩家充值增加的流程
     * @param uid 
     * @param addNum 
     * @param orderID 
     */
    public onAddMoneyOrder(uid: number, addNum: number, orderID: string, plt: string) {

        if (typeof uid != 'number') return false;
        if (typeof addNum != 'number') return false;
    
        
        var pkRes = global.resMgr.getRechageResByAmount(addNum);
        
        if (!pkRes) return;
        
        global.logMgr.rechargeStateLog({ id: uid } as SePlayer, pkRes.kID, addNum, Date.now(), orderID, 'order recharged');

        var chargeInfo = new RechargeInfo();
        chargeInfo.amount = addNum;
        chargeInfo.finish = false;
        chargeInfo.orderid = orderID;
        chargeInfo.uid = uid;

        var bindex = orderID.indexOf('BID') + 3;
        var uindex = orderID.indexOf('UID');
        if (uindex > bindex) chargeInfo.mailid = orderID.substring(bindex, uindex);

        var rkPlayer: SePlayer = this.getPlayer(uid);
        if (rkPlayer && rkPlayer.hasCharLoadFlag(SeCharLoadFlag.complete)) {
            // 检查一下单号的状态，是否已经充值过了的
            var rkOrderInfo = <RechargeInfo>rkPlayer.rechargeDB.get(orderID);
            if (!rkOrderInfo) {
                // 玩家已经加载邮件信息了，但是没有加载完成，那么可以把数据加载到邮件数据上
                chargeInfo.finish = true;
                chargeInfo.time = Date.now();
                chargeInfo.sid = rkPlayer.pvpMgr.seasonid;
                rkPlayer.rechargeDB.save(orderID, chargeInfo);
                rkPlayer.addRecharge(chargeInfo);

                // 这里通知一下玩家充值成功
                if (rkPlayer.bInitComplete) global.netMgr.sendCharMiscUpdate(rkPlayer.linkid, 'rechargestate', chargeInfo);
            }
        }
        else {
            // 如果玩家没有加载完毕，或者没有加载都当做玩家不在线处理
            var rkReMailList = mysqlLoaderInst.getLoaderUnit(uid, SeDBInfoHead.rechargeInfo) as ReHash<any>;
            rkReMailList.save(orderID, chargeInfo)
            if (rkPlayer) {
                rkPlayer.loadReload();
            }
        }
        
        
        global.lsMgr.sendRecharge('finish', orderID);
        return true;
    }

    public xiaoDuRecharge(uid: number, baiduOrderReferenceIds: Array<{name : string, value : string}>) {
        for(let i = 0; i < baiduOrderReferenceIds.length; i++){
            //获取发货详情
            this.xiaoDuGetDetail(baiduOrderReferenceIds[i].value, uid);
        }
    }
    //小度充值获取发货详情
    private xiaoDuGetDetail(baiduOrderReferenceId: string, uid:number){
        let timestamp = parseInt(((new Date()).getTime() / 1000).toFixed(0)) - 3 * 60;
        let sign = XiaoDuSign({baiduOrderReferenceId : baiduOrderReferenceId, timestamp: timestamp})
        var url = 'https://dueros.baidu.com/dbp/outsideOrder/getShippingInfo?baiduOrderReferenceId=' + baiduOrderReferenceId + '&timestamp=' + timestamp + '&sign=' + sign;
        
        http_quest('get', url, '', this.onAddMoneyOrderXiaoDu.bind(this, uid));
    }

    //小度充值增加的流程
    public onAddMoneyOrderXiaoDu(uid: number, data) {
        if(JSON.parse(data)['status'] != 200){
            console.log('get xiaodu fail ' + JSON.parse(data));
            return;
        }
        
        let order_info = JSON.parse(data)['data'];
        if(Number(order_info.isPaid) != 1 || Number(order_info.status) != 0){
            return;
        }

        var addNum = Number(order_info.sellerAmount);
        var baiduOrderReferenceId = order_info.baiduOrderReferenceId;
        var productId = order_info.productId;

        if (typeof uid != 'number') return false;
        if (typeof addNum != 'number') return false;


        var chargeInfo = new RechargeInfo();
        chargeInfo.amount = addNum;
        chargeInfo.finish = false;
        chargeInfo.orderid = baiduOrderReferenceId;
        chargeInfo.uid = uid;
        chargeInfo.mailid = global.resMgr.getShopMallIdByProductId(productId);

        global.logMgr.rechargeStateLog({ id: uid } as SePlayer, chargeInfo.mailid, addNum, Date.now(), baiduOrderReferenceId, 'order recharged xiaodu');

        var rkPlayer: SePlayer = this.getPlayer(uid);
        if (rkPlayer) {
          // 检查一下单号的状态，是否已经充值过了的
          var rkOrderInfo = <RechargeInfo>rkPlayer.rechargeDB.get(baiduOrderReferenceId);
          if (!rkOrderInfo) {
              // 玩家已经加载邮件信息了，但是没有加载完成，那么可以把数据加载到邮件数据上
              chargeInfo.finish = true;
              chargeInfo.time = Date.now();
              chargeInfo.sid = rkPlayer.pvpMgr.seasonid;
              rkPlayer.rechargeDB.save(baiduOrderReferenceId, chargeInfo);
              rkPlayer.addRecharge(chargeInfo);

              // 这里通知一下玩家充值成功
              if (rkPlayer.bInitComplete) global.netMgr.sendCharMiscUpdate(rkPlayer.linkid, 'rechargestate', chargeInfo);
          }

        }
        else {
            // 如果玩家没有加载完毕，或者没有加载都当做玩家不在线处理
            var rkReMailList = mysqlLoaderInst.getLoaderUnit(uid, SeDBInfoHead.rechargeInfo) as ReHash<any>;
            rkReMailList.save(baiduOrderReferenceId, chargeInfo)
            if (rkPlayer) {
                rkPlayer.loadReload();
            }
        }
        //通知发货成功
        let timestamp = parseInt(((new Date()).getTime() / 1000).toFixed(0)) - 3 * 60;
        let sign = XiaoDuSign({baiduOrderReferenceId : baiduOrderReferenceId, timestamp: timestamp})
        var url = 'https://dueros.baidu.com/dbp/outsideOrder/orderCompleted?baiduOrderReferenceId=' + baiduOrderReferenceId + '&timestamp=' + timestamp + '&sign=' + sign;

        http_quest('post', url, '', this.success.bind(this));
        return true;
    }

    private success(data){
        if(JSON.parse(data)['status'] != 200){
            console.error('complete xiaodu fail ' + data);
        }
    }
    public getPlayerInfo(linkId: string, getUid: number, plt: string) {
        var rkPlayer: SePlayer = this.getPlayer(getUid);
        var playerInfo = new PlayerInfo();
        if (rkPlayer) {
            playerInfo.name = rkPlayer.name;
            playerInfo.charid = rkPlayer.id;
            playerInfo.icon = rkPlayer.icon;
            playerInfo.level = rkPlayer.level;
            playerInfo.score = rkPlayer.score;
            playerInfo.cardNum = rkPlayer.heroCards.length;
            playerInfo.formation = rkPlayer.matchFormation;
            playerInfo.topPvpLevel = rkPlayer.top_pvp_level;
            playerInfo.topPvpRank = rkPlayer.top_pvp_rank;
            playerInfo.pvp1v1Info = this._getPlayerPvpInfo(rkPlayer.pvpDb.value["log_1v1"], rkPlayer.pvpDb.value["top_win_count"]);
            playerInfo.pvp1v1Info.level = rkPlayer.pvp_level;
            playerInfo.pvp2v2Info = this._getPlayerPvpInfo(rkPlayer.pvpDb.value["log_2v2"], rkPlayer.pvpDb.value["top_win_2v2_count"]);
            playerInfo.pvpPeakInfo = this._getPlayerPvpInfo(rkPlayer.pvpDb.value["log_peak"]);
            playerInfo.pvpPeakInfo.level = rkPlayer.peak_score || 1500;
            playerInfo.pvp_score = rkPlayer.pvp_score;
            playerInfo.seasonid = rkPlayer.pvpMgr.seasonid;
            playerInfo.avatar = rkPlayer.avatar;
            playerInfo.bossFormation = rkPlayer.bossFormation;
            playerInfo.curMedals = rkPlayer.curMedals;
            playerInfo.lord = rkPlayer.lord || '';
            var wear_equips = [];
            if(playerInfo.lord && rkPlayer.lords && rkPlayer.lords[playerInfo.lord].wear_equips){
                for(let j = 0; j < rkPlayer.lords[playerInfo.lord].wear_equips.length; j++){
                    let equip_id = rkPlayer.lords[playerInfo.lord].wear_equips[j];
                    wear_equips.push(rkPlayer.m_equipMgr.getHaveEquip(equip_id));
                }
            }
            if(!playerInfo.lord) playerInfo.lord = 'Z008';
            playerInfo.lord_equip = wear_equips;
            playerInfo.personSign = rkPlayer.baseInfo.personSign;
            playerInfo.fengwang_count = rkPlayer.pvpMgr.fengwang_count || 0;
            playerInfo.duowang_count = rkPlayer.pvpMgr.duowang_count || 0;
            playerInfo.high_duowang_count = rkPlayer.pvpMgr.high_duowang_count || 0;
            playerInfo.is_vip = rkPlayer.baseInfo.is_vip;
            playerInfo.vip_level = rkPlayer.baseInfo.vip_level;
            playerInfo.battleBanner = rkPlayer.baseInfo.battleBanner;
            global.netMgr.getPlayerInfo(linkId, playerInfo);
        } else {
            var dbLoader = mysqlLoaderInst.getLoader(getUid);
            dbLoader.load();
            dbLoader.once('complete', ((bsucc) => {
                if (!bsucc) return;
                var pvpDb = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.pvpInfo);
                var baseDb = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);

                //bossFormation 值更改补丁
                if (baseDb.value["bossFormation"] && typeof baseDb.value["bossFormation"] != "string") {
                    baseDb.save("bossFormation", "Z000");
                    baseDb.value["bossFormation"] = "Z000";
                }

                playerInfo.name = baseDb.value["charname"];
                playerInfo.level = baseDb.value["level"];
                playerInfo.score = baseDb.value["score"];
                playerInfo.icon = baseDb.value["icon"];
                playerInfo.bossFormation = baseDb.value["bossFormation"] || "Z000";
                playerInfo.curMedals = baseDb.value["curMedals"];

                function isMonthVip(bufferdatas) {
                    if (!bufferdatas) return false;
                    var bfid = 'B001';
                    var curr = Date.now();
                    var rBuff = bufferdatas[bfid];;
                    if (!rBuff) return false;

                    if (rBuff.ftime < curr) {
                        return false;
                    }

                    return true;
                }

                playerInfo.avatar = {
                    iconid: baseDb.value['iconid'],
                    vip: isMonthVip(baseDb.value['bufferdatas']) ? 1 : 0

                };
                playerInfo.charid = getUid;
                var heros: Array<SeHeroCard> = baseDb.value["heros"];
                if (!heros) return;
                playerInfo.cardNum = heros.length;

                var formation = baseDb.value["formation"];
                var defaultPlan = baseDb.value["defaultPlan"] || 0;
                var fm: Array<SeLogicFormation> = [];
                var df = formation[defaultPlan];
                for (var i = 0; i < df.length; i++) {
                    var kID = df[i];
                    var cardInfo;
                    for (var j = 0; j < heros.length; j++) {
                        var herocard = heros[j];
                        if (herocard && herocard.kHeroID == df[i]) {
                            cardInfo = herocard;
                            break;
                        }
                    }
                    fm.push({ kHeroID: kID, iLevel: (cardInfo && cardInfo.iLevel) || 0 });
                }

                playerInfo.topPvpRank = pvpDb.value["top_pvp_rank"];
                playerInfo.formation = fm;
                playerInfo.topPvpLevel = pvpDb.value["top_pvp_level"];
                playerInfo.pvp1v1Info = this._getPlayerPvpInfo(pvpDb.value["log_1v1"], pvpDb.value["top_win_count"]);
                playerInfo.pvp1v1Info.level = pvpDb.value["pvp_level"];
                playerInfo.pvp2v2Info = this._getPlayerPvpInfo(pvpDb.value["log_2v2"], pvpDb.value["top_win_2v2_count"]);
                playerInfo.pvpPeakInfo = this._getPlayerPvpInfo(pvpDb.value["log_peak"]);
                playerInfo.pvpPeakInfo.level = pvpDb.value["peak_score"] || 1500;
                playerInfo.pvp_score = pvpDb.get("pvp_score");
                playerInfo.seasonid = pvpDb.get('seasonid') || 'S000';
                playerInfo.personSign = baseDb.value['personSign'];
                playerInfo.fengwang_count = pvpDb.get('fengwang_count') || 0;
                playerInfo.duowang_count = pvpDb.get('duowang_count') || 0;
                playerInfo.high_duowang_count = pvpDb.get('high_duowang_count') || 0;
                playerInfo.lord = baseDb.value['lord'] || '';
                var wear_equips = [];
                if(playerInfo.lord && baseDb.value['equipInfo'] && baseDb.value['lords'] && baseDb.value['lords'][playerInfo.lord].wear_equips){
                    var have_equips = baseDb.value['equipInfo'].haveEquips;
                    for(let j = 0; j < baseDb.value['lords'][playerInfo.lord].wear_equips.length; j++){
                        let equip_id = baseDb.value['lords'][playerInfo.lord].wear_equips[j];
                        for (var i = 0; i < have_equips.length; i++) {
                            var equip = have_equips[i];
                            if (equip && equip.eId == equip_id) {
                                wear_equips.push(equip);
                            }
                        }
                       
                    }
                }
                if(!playerInfo.lord) playerInfo.lord = 'Z008';
                playerInfo.lord_equip = wear_equips;
                playerInfo.is_vip = baseDb.value["is_vip"];
                playerInfo.vip_level = baseDb.value["vip_level"];
                playerInfo.battleBanner = baseDb.value["battleBanner"];
                global.netMgr.getPlayerInfo(linkId, playerInfo);
            }).bind(this));
        }
    }

    private _getPlayerPvpInfo(log: PvpLogInfo, maxWin: number = 0): PlayerPvpInfo {
        var info = new PlayerPvpInfo();
        if (log != null) {
            info.brokenNum = log.killBoss || 0;
            info.winCount = log.winCount || 0;
            var maxCount: number = 0;
            var maxCard: string = "";
            for (var cardId in log.useCard) {
                if (maxCount < log.useCard[cardId]) {
                    maxCard = cardId;
                    maxCount = log.useCard[cardId];
                }
            }
            info.cardId = maxCard;
        }
        info.maxWin = maxWin;
        return info;
    }

    urlrequestback(uid: number, param: any, data: any) {
        var rkPlayer = global.playerMgr.getPlayer(uid);
        if (rkPlayer) {
            rkPlayer.urlrequestback(param, data);
        }
        else {
            this.onGiveMail(configInst.get('plt'), uid, SeMailType.ThreeUrlBack, JSON.stringify({ param: param, data: data }));
        }
    }

    queryPlayerInfo(uid: number, type: string, gmlink: string, plt: string) {
        var rkPlayer = global.playerMgr.getPlayer(uid);
        if (rkPlayer) {
            var info = rkPlayer.getDBValue(type);
            if (type == "mailInfo") {
                info = [info];
                for (let key in rkPlayer.baseInfo.mails) {
                    info.push(rkPlayer.baseInfo.mails[key]);
                }
            }
            global.lsMgr.sendPlayerInfo(type, gmlink, uid, info);
        }
        else {
            var loader: ReHash<any> | ReList<any>;
            switch (type) {
                case 'mailInfo':
                    // loader = mysqlLoaderInst.getLoaderUnit(uid, SeDBInfoHead[type]);
                    // loader.load(((_uid: number, _type: string, _gmlink: string, bsuss: boolean, _db: ReList<any>) => {
                    //     global.lsMgr.sendPlayerInfo(_type, _gmlink, _uid, bsuss ? _db.value : {});
                    // }).bind(this, uid, type, gmlink));

                    // load需要涉及到同步服的查询使用, 目前不支持DBBindUnit, 只支持DBLoader
                    var dbLoader = mysqlLoaderInst.getLoader(uid);
                    dbLoader.load();
                    dbLoader.once('complete', ((_uid: number, _type: string, _gmlink: string, bsuss: boolean) => {
                        if (!bsuss) return;
                        var _db_offline = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.mailInfo);
                        var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);

                        let mails = [];
                        if (_db_online && _db_online.get("mails")) {
                            let online_mails = _db_online.get("mails");
                            for (let key in online_mails) {
                                mails.push(online_mails[key]);
                            }
                        }

                        if (_db_offline) {
                            mails.push(_db_offline.value);
                        }

                        global.lsMgr.sendPlayerInfo(_type, _gmlink, _uid, mails);
                    }).bind(this, uid, type, gmlink));

                    break;
                default:
                    if (!SeDBInfoHead.hasOwnProperty(type)) break;
                    // load需要涉及到同步服的查询使用, 目前不支持DBBindUnit, 只支持DBLoader
                    var dbLoader = mysqlLoaderInst.getLoader(uid);
                    dbLoader.load();
                    dbLoader.once('complete', ((_uid: number, _type: string, _gmlink: string, bsuss: boolean) => {
                        if (!bsuss) return;
                        var _db = dbLoader.getDB<ReHash<any>>(SeDBInfoHead[type]);
                        global.lsMgr.sendPlayerInfo(_type, _gmlink, _uid, bsuss ? _db.value : {});
                    }).bind(this, uid, type, gmlink));
                    break;
            }
        }
    }

    public onPlayerProperty(gmid: string, uid: number, e: PlayerProperty) {
        var rkPlayer: SePlayer = this.getPlayer(uid);
        if (rkPlayer && rkPlayer.hasCharLoadFlag(SeCharLoadFlag.baseinfo)) {
            // 玩家已经加载邮件信息了，但是没有加载完成，那么可以把数据加载到邮件数据上
            rkPlayer.setProperty(e);
            global.logMgr.gmOprLog(gmid, uid, 'property', rkPlayer.property, e);
        }
        else {
            // 确保玩家没有登陆，那么就只能加载玩家数据后再修改
            var dbLoader = mysqlLoaderInst.getLoader(uid);
            dbLoader.load();
            dbLoader.once('complete', (bsuss: boolean) => {
                if (!bsuss) return;
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                if (_db_online) {
                    _db_online.save("property", e);
                }

                global.logMgr.gmOprLog(gmid, uid, 'property', rkPlayer.property, e);
            });
        }
    }

    setPlayerInfo(uid: number, gmid: string, setkey: string, setvalue: string | number) {
        global.logMgr.gmOprLog(gmid, uid, 'seplayerinfo', setkey, setvalue);
        var rkPlayer = global.playerMgr.getPlayer(uid);
        if (rkPlayer) {
            // 如果玩家在线，那么处理数据
            let results = this._on_change_userInfo(uid, rkPlayer.m_kDBLoader, setkey, setvalue);

            // 操作刷新玩家数据
            for (let i = 0; i < results.length; i++) {
                rkPlayer.freshkey(results[i]);
            }

            global.lsMgr.sendSetPlayerInfo(setkey, gmid, uid, true);
            return;
        }
        else {
            var dbLoader = mysqlLoaderInst.getLoader(uid);
            dbLoader.load();
            dbLoader.once('complete', (bsuss: boolean) => {
                if (!bsuss) {
                    console.error('change error' + uid);
                    return;
                }
                this._on_change_userInfo(uid, dbLoader, setkey, setvalue);
                global.lsMgr.sendSetPlayerInfo(setkey, gmid, uid, true);
                return;
            });
        }
    }

    private _on_change_userInfo(uid: number, dbLoader: DBLoader, setkey: string, setvalue: string | number) {
        let results: string[] = []
        switch (setkey) {
            case 'name': {
                // 改名 这里强制改名
                let dbBaseinfo = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                mysqlLoaderInst.renamename(dbBaseinfo.get("charname"), setvalue as string, uid);
                dbBaseinfo.save("charname", setvalue);
                //改名完可免费改名一次
                dbBaseinfo.save("isRename", false);
                results.push('baseInfo.charname');
                results.push('baseInfo.isRename');
                break;
            }
            case 'personSign': {
                // 改签名
                let _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                if (_db_online) {
                    _db_online.save("personSign", setvalue);
                }
                results.push('baseInfo.personSign');
                break;
            }
            case 'guide': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                if (_db_online) {
                    _db_online.save("guide", Number(setvalue));
                }
                results.push('baseInfo.guide');
                break;
            }
            case 'gold': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                if (_db_online) {
                    _db_online.save("gold", setvalue);
                }
                results.push('baseInfo.gold');
                break;
            }
            case 'shangjinState': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                if (_db_online) {
                    _db_online.save("shangjinState", setvalue);
                }
                results.push('baseInfo.shangjinState');
                break;
            }
            case 'money': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                if (_db_online) {
                    _db_online.save("money", setvalue);
                }
                results.push('baseInfo.money');
                break;
            }
            case 'heros': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                var strs =  (''+ setvalue).split(' ');
                if(strs.length != 3) break;

                let heros = _db_online.value['heros'];
                for(let i = 0; i < heros.length; i++){
                    if(heros[i].kHeroID == strs[0]){
                        heros[i][strs[1]] = Number(strs[2]);
                    }
                }
                if (_db_online) {
                    _db_online.save('heros', heros);
                }
                results.push('baseInfo.heros');
                break;
            }
            case 'items': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                var strs =  (''+ setvalue).split(' ');
                if(strs.length != 3) break;

                let items = _db_online.value['items'];
                for(let i = 0; i < items.length; i++){
                    if(items[i].kItemID == strs[0]){
                        items[i][strs[1]] = Number(strs[2]);
                    }
                }

                if (_db_online) {
                    _db_online.save('items', items);
                }
                results.push('baseInfo.items');
                break;
            }
            case 'level_speed': {
                var strs =  (''+ setvalue).split(' ');
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.pvpInfo);
                var level_speed = _db_online.value['level_speed'];
                level_speed[Number(strs[0])] = Number(strs[1]);
                if (_db_online) {
                    _db_online.save("level_speed", level_speed);
                }
                results.push('pvpInfo.level_speed');
                break;
            }
            case 'medals': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);

                var medals = this.getPlayer(uid).baseInfo.medals;
                for(var key in medals){
                    if(key == setvalue){
                        delete medals[key];
                    }
                }
                var curMedals = _db_online.value['curMedals'];
                for(let i = 0; i < curMedals.length; i++){
                    if(curMedals[i] == setvalue){
                        curMedals.splice(i,1);
                    }
                }
                if (_db_online) {
                    _db_online.save('medals', medals);
                    _db_online.save('curMedals', curMedals);
                }
                results.push('baseInfo.medals');
                break;
            }
            case 'pvp_score': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.pvpInfo);

                if (_db_online) {
                    _db_online.save("pvp_score", Number(setvalue));
                }
                results.push('pvpInfo.pvp_score');
                break;
            }
            case 'guild_apply_info': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                var guild_info = _db_online.value['guild_info'];
                if(guild_info){
                    guild_info.apply_info = [];
                    let arr = setvalue.toString().split(",");
                    for(let i = 0; i < arr.length; i++){
                        if(Number(arr[i]) > 10000){
                            guild_info.apply_info.push({id: Number(arr[i])});
                        }
                    }
                }
                if (_db_online) {
                    _db_online.save('guild_info', guild_info);
                }
                results.push('baseInfo.guild_info');
                break;
            }
            case 'pve_pk_rank': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.pvpInfo);

                if (_db_online) {
                    _db_online.save("pve_pk_rank", Number(setvalue));
                }
                results.push('pvpInfo.pve_pk_rank');
                break;
            }
            case 'peak_score': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.pvpInfo);

                if (_db_online) {
                    _db_online.save("peak_score", Number(setvalue));
                }
                results.push('pvpInfo.peak_score');
                break;
            }
            case 'pvp_level': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.pvpInfo);

                if (_db_online) {
                    _db_online.save("pvp_level", Number(setvalue));
                }
                results.push('pvpInfo.pvp_level');
                break;
            }
            case 'del_mail': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                if (_db_online) {
                    let online_mails = _db_online.value['mails'];
                    for(var key in online_mails){
                        if(key == setvalue){
                            delete online_mails[key];
                        }
                    }
                    _db_online.save('mails', online_mails);
                } 
                var _db_offline = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.mailInfo);
                if (_db_offline) {
                    let offline_mails = _db_offline.value;
                    for(let i = 0; i < offline_mails.length; i++){
                        if(offline_mails[i]['mailid'] == setvalue){
                            let plt = configInst.get('plt');
                            var key = 'mailsinfo_';
                            if (plt != 'sdw' && plt != 'qzone') {
                                key = plt + '_' + key;
                            }
                            _db_offline.redisClient.lrem(key + uid, 1, JSON.stringify(offline_mails[i]));
                        }
                    }
                } 
                results.push('baseInfo.mails');
                break;
            }
            case 'property': {
                var _db_online = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                if (_db_online) {
                    _db_online.save("property", setvalue);
                }
                results.push('baseInfo.property');
                break;
            }
            case 'all': {
                var W003_res = false;
                var W206_res = false;
                var W207_res = false;
                var W100_res = false;
                var BD01_res = false;
                var W004_res = false;
                var strs =  (''+ setvalue).split(' ');
                if(strs.length != 12) {
                    console.error('strs.length error' + uid);
                    break;
                }
                var base_db = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.baseInfo);
                if(base_db){
                    var need_save = [];
                    if(Number(strs[0]) != -1){
                        need_save.push({k: "gold", v: Number(strs[0])})
                    }
                    if(Number(strs[1]) != -1){
                        need_save.push({k: "money", v: Number(strs[1])})
                    }
                    let items: Array<SeItem> = base_db.get('items');
                    for(let i = 0; i < items.length; i++){
                        if(items[i].kItemID == 'W003' && Number(strs[2]) != -1){
                            items[i]['iPileCount'] = Number(strs[2]);
                            W003_res = true;
                        }
                        if(items[i].kItemID == 'W206' && Number(strs[3]) != -1){
                            items[i]['iPileCount'] = Number(strs[3]);
                            W206_res = true;
                        }
                        if(items[i].kItemID == 'W207' && Number(strs[4]) != -1){
                            items[i]['iPileCount'] = Number(strs[4]);
                            W207_res = true;
                        }
                        if(items[i].kItemID == 'BD01' && Number(strs[9]) != -1){
                            items[i]['iPileCount'] = Number(strs[9]);
                            BD01_res = true;
                        }
                        if(items[i].kItemID == 'W100' && Number(strs[10]) != -1){
                            items[i]['iPileCount'] = Number(strs[10]);
                            W100_res = true;
                        }
                        if(items[i].kItemID == 'W004' && Number(strs[11]) != -1){
                            items[i]['iPileCount'] = Number(strs[11]);
                            W004_res = true;
                        }
                    }
                    if(!W003_res && Number(strs[2]) != -1){
                        items.push({kItemID: 'W003', iPileCount: Number(strs[2])});
                    }
                    if(!W206_res && Number(strs[3]) != -1){
                        items.push({kItemID: 'W206', iPileCount: Number(strs[3])});
                    }
                    if(!W207_res && Number(strs[4]) != -1){
                        items.push({kItemID: 'W207', iPileCount: Number(strs[4])});
                    }
                    if(!BD01_res && Number(strs[9]) != -1){
                        items.push({kItemID: 'BD01', iPileCount: Number(strs[9])});
                    }
                    if(!W100_res && Number(strs[10]) != -1){
                        items.push({kItemID: 'W100', iPileCount: Number(strs[10])});
                    }
                    if(!W004_res && Number(strs[11]) != -1){
                        items.push({kItemID: 'W004', iPileCount: Number(strs[11])});
                    }
                    need_save.push({k: "items", v: items});

                    //U101-1-1&U102-4-5
                    if(Number(strs[8]) != -1){
                        var change_heros = strs[8].split('&');
                        let heros: Array<any> = base_db.get('heros');
                        for(let j = 0; j < change_heros.length; j++){
                            let hero_info = change_heros[j].split('-');
                            let hero_change = false;
                            for(let i = 0; i < heros.length; i++){
                                if(heros[i].kHeroID == hero_info[0]){
                                    heros[i].iLevel = Number(hero_info[1]);
                                    heros[i].iCount = Number(hero_info[2]);
                                    hero_change = true;
                                }
                            }
                            if(!hero_change){
                                heros.push({kHeroID: hero_info[0], iLevel: hero_info[1], iCount: Number(hero_info[2])});
                            }
                        }
                        need_save.push({k: "heros", v: heros});
                    }
                    base_db.msave(need_save);
                }
                else{
                    console.error('base_db null' + uid);
                }
                var pvp_db = dbLoader.getDB<ReHash<any>>(SeDBInfoHead.pvpInfo);
                if(pvp_db){
                    var pvp_save = [];
                    if(Number(strs[5]) != -1){
                        pvp_save.push({k: "peak_score", v: Number(strs[5])});
                    }
                    if(Number(strs[6]) != -1){
                        pvp_save.push({k: "pvp_level", v: Number(strs[6])});
                    }
                    if(Number(strs[7]) != -1){
                        pvp_save.push({k: "pvp_score", v: Number(strs[7])});
                    }
                    pvp_db.msave(pvp_save);
                }
                else{
                    console.error('pvp_db null' + uid);
                }
                // results.push('baseInfo.heros');
                // results.push('baseInfo.items');
                // results.push('baseInfo.gold');
                // results.push('baseInfo.money');
                // results.push('pvpInfo.pvp_level');
                // results.push('pvpInfo.peak_score');
                // results.push('pvpInfo.pvp_score');
            }
            
        }

        return results;
    }

    onInviteRet(uid: number, type: number, awards: SeItem[], code: string, msg: string, extnotice: string, plt: string) {
        if (awards.length > 0) this.onGiveMail(plt, uid, SeMailType.SYSTEM, msg, awards);

        var rPlayer = this.getPlayer(uid);
        if (rPlayer) {
            // if (awards.length > 0) rPlayer.addItems(awards, 'invitecode');
            global.netMgr.sendData({
                cmd: 'inviteret',
                type: type,
                awards: awards,
                code: code,
                msg: msg,
                extnotice: extnotice
            }, rPlayer.linkid);
            // 这里增加一个兑换成功的日志
            if (type == 0 && awards.length > 0) global.logMgr.invitecodeLog(uid, code, rPlayer);
        }
        else {
            // 这里增加一个兑换成功的日志
            if (type == 0 && awards.length > 0) global.logMgr.invitecodeLog(uid, code, null);
        }
    }

    onInviteRet_Ex(uid: number, type: number, awards: SeItem[], code: string, msg: string, extnotice: string, awardIndex: number, plt: string) {
        if (awards.length > 0) this.onGiveMail(plt, uid, SeMailType.SYSTEM, msg, awards);

        var rPlayer = this.getPlayer(uid);
        if (rPlayer) {
            // if (awards.length > 0) rPlayer.addItems(awards, 'invitecode');
            global.netMgr.sendData({
                cmd: 'inviteret_ex',
                type: type,
                awards: awards,
                code: code,
                msg: msg,
                extnotice: extnotice,
                awardIndex: awardIndex,
            }, rPlayer.linkid);
            // 这里增加一个兑换成功的日志
            if (type == 0 && awards.length > 0) global.logMgr.invitecodeLog(uid, code, rPlayer);
        }
        else {
            // 这里增加一个兑换成功的日志
            if (type == 0 && awards.length > 0) global.logMgr.invitecodeLog(uid, code, null);
        }
    }

    onQueryInviteRet(uid: number, infos: any) {
        var rPlayer = this.getPlayer(uid);
        if (rPlayer) {
            global.netMgr.sendData({
                cmd: 'queryInviteCode',
                infos: infos
            }, rPlayer.linkid);
        }
    }

    public dbReady() {
        // this.nameDb = redistInst.getHash("nameLib");
        // this.nameDb.load((() => {
        //     console.log("namelib ok");
        // }).bind(this));
    }

    public checkSystemMail() {
        for (var key in this.allPlayers) {
            var rkPlayer: SePlayer = this.allPlayers[key];
            if (!rkPlayer || !rkPlayer.loadComplete) continue;
            rkPlayer.checkSystemMail();
        }
    }

    public noticeGmConfigs() {
        for (var key in this.allPlayers) {
            var rkPlayer = this.allPlayers[key] as SePlayer;
            if (!rkPlayer || !rkPlayer.loadComplete) continue;
            global.netMgr.sendData({
                cmd: "globalconfig",
                configs: global.lsMgr.getconfigs()
            }, rkPlayer.linkid);
        }
    }

    public sendAnnouncement(type: TableRes.SeEnumnoticetexteType, content: any, selfLink: string, uid: number) {
        this.announcementMgr.send(type, content, selfLink, uid);
    }

    public sendAnnouncement2(type: TableRes.SeEnumnoticetexteType, content: any, selfLink: string, uid: number) {
        this.announcementMgr.send2(type, content, selfLink, uid);
    }

    init_friends(uid: number, f: { f: any[], a: any[] }) {
        var rkP = this.getPlayer(uid);
        if (rkP) {
            rkP.friendMgr.init_friend_infos(f);
        }
    }

    init_plt_friends(uid: number, f: { f: any[], a: any[] }) {
        var rkP = this.getPlayer(uid);
        if (rkP) {
            rkP.friendMgr.init_plt_friend_infos(f);
        }
    }

    find_friend_ret(uid: number, f: any) {
        var rkP = this.getPlayer(uid);
        if (rkP) {
            rkP.friendMgr.find_friend_ret(f);
        }
    }

    friend_opr_ret(uid: number, f: any) {
        var rkP = this.getPlayer(uid);
        if (rkP) {
            rkP.friendMgr.friend_opr_ret(f);
        }
    }
    
    wx_friend_opr_ret(uid: number, wxFriendInfos: any[]) {
        var rkP = this.getPlayer(uid);
        if (rkP) {
            rkP.friendMgr.wx_friend_opr_ret(wxFriendInfos);
        }
    }

    friend_route(uid: number, f: any) {
        var rkP = this.getPlayer(uid);
        if (rkP) {
            rkP.friendMgr.friend_route_ret(f);
        }
    }

}

var S_Color_Str = {
    baise: '#ffffff',
    lvse: '#42ff00',
    lanse: '#3ac0ff',
    zise: '#f73de8',
    huangse: '#ff8f2b',
    jinse: '#fff33b'
}

var S_Color_List = [S_Color_Str.baise, S_Color_Str.lvse, S_Color_Str.lanse, S_Color_Str.zise, S_Color_Str.huangse, S_Color_Str.jinse];

class AnnouncementFactory {
    private _keyHash: any;

    // 设定一个规则，10s内只能推送5条数据给玩家,玩家自己的除外
    private count: number = 0;
    private time: number = 0;

    private get limit() {
        let count = parseInt(global.resMgr.getConfig("noticecount"));
        if (!count || isNaN(count)) {
            count = 5;
        }

        return count;
    }

    private get check_all_notice() {
        let curr = Date.now();
        if (this.time + 10000 < curr) {
            this.count = 0;
            this.time = curr;
        }
        this.count++;
        if (this.count > this.limit) return false;
        return true;
    }

    constructor() {
        this._keyHash = {};
        this._keyHash["charname"] = this._charname;
        this._keyHash["oppname"] = this._charname;
        this._keyHash["pvplevel"] = this._pvpLevel;
        this._keyHash["playerlevel"] = this._playerlevel;
        this._keyHash["boxname"] = this._boxName;
        this._keyHash['eggname'] = this._eggName;
        this._keyHash["cardname"] = this._cardId;
        this._keyHash["cardnumber"] = this._cardnumber;
        this._keyHash["win_count"] = this._win_count;
        this._keyHash["cardlevel"] = this._cardlevel;
        this._keyHash["itemname"] = this._itemname;
        this._keyHash["itemnumber"] = this._itemnumber;
        this._keyHash["chartitle"] = this._chartitle;
        this._keyHash["equipname"] = this._equipname;
        this._keyHash["equipStar"] = this._equipStar;
        this._keyHash["equipLv"] = this._equipLv;
        this._keyHash["chararea"] = this._chararea;
        this._keyHash["chararea2"] = this._chararea2;
        this._keyHash["charname2"] = this._charname2;
    }

    public send(type: TableRes.SeEnumnoticetexteType, content: any, selfLink: string, uid: number) {
        var arr = global.resMgr.getNoticeText(type);
        if (!arr || arr.length == 0) return;
        var rkRes = arr[0];
        var msg = this.replace(rkRes.kText, content);
        if (!msg) return;
        global.netMgr.sendAnnouncement(msg, rkRes.kBg, this.check_all_notice ? '' : selfLink, uid);
    }

    public send2(type: TableRes.SeEnumnoticetexteType, content: any, selfLink: string, uid: number) {
        var arr = global.resMgr.getNoticeText(type);
        if (!arr || arr.length == 0) return;
        var rkRes = arr[0];
        var msg = this.replace(rkRes.kText, content);
        if (!msg) return;
        global.netMgr.sendAnnouncement2(msg, this.check_all_notice ? '' : selfLink, uid);
    }

    //ydq 19/11/01 改为客户端做替换
    private replace(msg: string, content: any): any {
        if (!content) return null;
        var msgs = [];
        for (var key in this._keyHash) {
            var method: Function = this._keyHash[key];
            if (content[key] == undefined) continue;
            var obj = method.call(this, msg, key, content);
            msgs.push(obj);
        }
        return {msg:msg, contents:msgs};
    }

    private _charname(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        return {key: res, val: `<font face="SimHei" color='${S_Color_Str.lvse}'>【` + content[key] + "】</font>"};
    }

    private _chararea(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        return {key: res, val: `<font face="SimHei" color='${S_Color_Str.zise}'>【` + content[key] + "】</font>"};
    }

    private _chararea2(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        return {key: res, val: `<font face="SimHei" color='${S_Color_Str.zise}'>【` + content[key] + "】</font>"};
    }

    private _charname2(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        return {key: res, val: `<font face="SimHei" color='${S_Color_Str.lvse}'>【` + content[key] + "】</font>"};
    }

    private _chartitle(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        if(!content[key])
            return {key:res, val:''};
        else
            return {key:res, val: `<font face="SimHei" color='${S_Color_Str.huangse}'>【` + content[key] + "】</font>"};
    }

    private _itemname(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        var pkitemRes = global.resMgr.TownItemRes.getRes(content[key]);
        if (!pkitemRes) 
            return {key:res, val:''};
        else
            return {key:res, val: `<font face="SimHei" color='` + S_Color_List[pkitemRes.iColor] + `'>【` + pkitemRes.kName + "】</font>"};
    }

    private _itemnumber(msg: string, key: string, content: any): {key, val}  {
        var res = new RegExp("\<" + key + "\>", "g")
        return {key:res, val: `<font face="SimHei" color='${S_Color_Str.lvse}'>` + content[key] + "</font>"};
    }

    private _playerlevel(msg: string, key: string, content: any): {key, val} {
        var res = "<" + key + ">";
        return {key: res, val:`<font face="SimHei" color='${S_Color_Str.lanse}'>【` + content[key] + "】</font>"};
    }

    private _cardnumber(msg: string, key: string, content: any): {key, val} {
        var res = "<" + key + ">";
        return {key:res, val: `<font face='SimHei' color='${S_Color_Str.huangse}'>` + content[key] + "</font>"};
    }

    private _cardId(msg: string, key: string, content: any): {key, val} {
        var res = "<" + key + ">";
        var pkUnitRes = global.resMgr.UnitRes.getRes(content[key]);
        if (!pkUnitRes) 
            return {key:res, val:''};

        //const aQuality = [LangID("494"), LangID("495"), LangID("496"), LangID("497")];
        return {key: res, val: "<span href='" + pkUnitRes.kID + "'>" + "<font face='SimHei' color='" + S_Color_List[pkUnitRes.iColour] + "'>【" + pkUnitRes.kName + "】</font></span>"};
    }

    private _equipname(msg: string, key: string, content: any): {key, val} {
        var res = "<" + key + ">";
        var pkitemRes = global.resMgr.TownItemRes.getRes(content[key]);
        if (!pkitemRes) 
            return {key:res, val:''};
        else
            return {key:res, val: `<font face="SimHei" color='` + S_Color_List[pkitemRes.iColor] + `'>【` + pkitemRes.kName + "】</font>"};
    }

    private _equipStar(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        return {key:res, val: `<font face='SimHei' color='${S_Color_Str.lanse}'>` + content[key] + "</font>"};
    }

    private _equipLv(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        return {key:res, val: `<font face='SimHei' color='${S_Color_Str.lanse}'>` + content[key] + "</font>"};
    }

    private _boxName(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        var pkBoxRes = global.resMgr.HeroBoxZZYRes.getRes(content[key]);
        if (!pkBoxRes) 
            return {key:res, val:''};
        var pkBoxTypeRes = global.resMgr.getResHeroBoxType(pkBoxRes.eType);
        var color = S_Color_List[(pkBoxTypeRes && pkBoxTypeRes.iColour) || 0];
        var val = "<span href='" + pkBoxRes.kID + "'>" + "<font face='SimHei' color='" + color + "'>【" + pkBoxRes.kName + "】</font></span>";
        return {key:res, val: val};
    }

    private _eggName(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        var pkEggRes = global.resMgr.HeroBoxEggRes.getRes(content[key]);
        if (!pkEggRes) 
            return {key:res, val:''};
        var pkBoxTypeRes = global.resMgr.getResHeroBoxType(pkEggRes.eType);
        var color = S_Color_List[(pkBoxTypeRes && pkBoxTypeRes.iColour) || 0];
        return {key:res, val: "<span href='" + pkEggRes.kID + "'>" + "<font face='SimHei' color='" + color + "'>【" + pkEggRes.kName + "】</font></span>"};
    }

    private _pvpLevel(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        var pkBattleRankRes = global.resMgr.getBattleRankByLevel(content[key]);
        return {key:res, val: "<font face='SimHei' color='" + S_Color_List[Math.floor((pkBattleRankRes.iBattleRank - 1) / 3)] + "'>【" + pkBattleRankRes.kDescribe + "】</font>"};
    }

    private _win_count(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        return {key:res, val: `<font face='SimHei' color='${S_Color_Str.lanse}'>` + content[key] + "</font>"};
    }

    private _cardlevel(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        return {key:res, val: `<font face='SimHei' color='${S_Color_Str.lanse}'>` + content[key] + "</font>"};
    }

    private _default_fun(msg: string, key: string, content: any): {key, val}  {
        var res = "<" + key + ">";
        if (!content[key]) {
            return {key:res, val:''};
        }
        return {key:res, val: content[key].toString()};
    }
}
export { SePlayerMgr };