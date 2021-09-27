import { SePlayer } from "./SePlayer";
import { SeCharMailInfo, SeMailType } from "../SeDefine";
import { iApp } from "../app";

declare var global: iApp;

interface ifCallBackMsg {
    uid: number,
    type: string,
    ver: string
    value: number,
    time: number
}

export class SeCallBackMgr {

    static get ver() {
        let pkActivityRes = global.resMgr.activityRes.getRes("A015");
        if (!pkActivityRes) return '1';
        return pkActivityRes.kStartTime;
    }

    static makeCallBackMail(uid: number, type: string, value: number, time?) {
        return {
            uid: uid,
            type: type,
            ver: SeCallBackMgr.ver,
            value: value,
            time: time ? time : Date.now()
        }
    }

    private parent: SePlayer;
    constructor(p: SePlayer) {
        this.parent = p;
    }

    get callbackinfo() {
        return this.parent.baseInfo.callbackinfo
    }

    init() {
        // 检查活动是否需要初始化或者重置
        if (!this.callbackinfo || this.callbackinfo.ver != SeCallBackMgr.ver) {
            this.parent.baseInfo.callbackinfo = { from_uid: 0, join_uids: [], recharges: [], cangetaward: 0, totaward: 0, ver: SeCallBackMgr.ver };
            this.saveinfo();
        }
    }

    pushMsg(type: string, value: number, time?: number) {
        if (this.callbackinfo.from_uid) {
            if(global.resMgr.getConfig("usenormal_give") == "true"){
                global.playerMgr.onGiveMail(this.parent.plt, this.callbackinfo.from_uid, SeMailType.CallBackMsg, JSON.stringify(SeCallBackMgr.makeCallBackMail(this.parent.id, type, value, time)));
            }
            else{
                global.playerMgr.onGiveMail_Online(this.parent.plt, this.callbackinfo.from_uid, SeMailType.CallBackMsg, JSON.stringify(SeCallBackMgr.makeCallBackMail(this.parent.id, type, value, time)));
            }
        }
    }

    onCreateChar(uid: number) {
        this.init();
        this.callbackinfo.from_uid = uid;
        // 发送一个招募成功的通知
        if (this.callbackinfo.from_uid) {
            this.saveinfo();

            global.logMgr.callBackLogs(this.parent, "onCreateChar", this.callbackinfo.from_uid, 0);
            // 这里还要通知math 强制绑定一个好友出来
            global.matchMgr.fd_force_friend(this.parent.id, uid);
            // 这里的推送时机需要把握一下
            this.pushMsg("addunit", Date.now());
        }

    }

    saveinfo() {
        if (this.parent.loadComplete) global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'callbackinfo', this.callbackinfo, null, null, true);
        this.parent.saveBaseInfo('callbackinfo');
    }

    onReciveMsg(mails: ifCallBackMsg[] | ifCallBackMsg) {
        let bchange = false;
        let loadFriend = false;
        if (!(mails instanceof Array)) {
            mails = [mails];
        }
        // 这里两个人之间的通信都靠邮件处理
        for (let i = 0; i < mails.length; i++) {
            let msg: ifCallBackMsg = mails[i];
            if (!msg || msg.ver != this.callbackinfo.ver) {
                continue;
            }

            switch (msg.type) {
                case "addunit": {
                    // 添加一个玩家
                    if (this.callbackinfo.join_uids.indexOf(msg.uid) < 0) {
                        bchange = true;
                        this.callbackinfo.join_uids.push(msg.uid);

                        this.parent.addItem("G004", 1, 'callback');
                        global.logMgr.callBackLogs(this.parent, "msg_addunit", msg.uid, this.callbackinfo.join_uids.length);
                        loadFriend = true;
                    }
                    break;
                }
                case "addrecharge": {
                    // 有玩家充值
                    let fnum = this.callbackinfo.join_uids.length;
                    let rate = 1;
                    // if (fnum >= 5) {
                    //     rate = 1;
                    // }
                    // else if (fnum >= 2) {
                    //     rate = 0.8;
                    // }

                    let addvalue = Math.floor(msg.value * rate * 10);
                    this.callbackinfo.cangetaward += addvalue;
                    this.callbackinfo.recharges.push({ uid: msg.uid, time: msg.time, amount: msg.value, value: addvalue });
                    this.parent.addItem("G003", addvalue, 'callback');
                    bchange = true;

                    global.logMgr.callBackLogs(this.parent, "msg_addrecharge", msg.uid, addvalue);
                    break;
                }
                case "pve_pk_rank": {
                    this.parent.pvpMgr.changePvePkRank(msg);
                    bchange = true;
                    break;
                }
                case "force_pve_pk_rank": {
                    // this.parent.pvpMgr.simpleChangePveRank(msg);
                    // bchange = true;
                    break;
                }
            }
        }

        if (bchange) this.saveinfo();
        if(loadFriend) this.parent.friendMgr.loadInfo();
    }

    onAddRecharge(num: number, time: number) {
        // 不是那一期的人就直接pass掉
        if (!this.callbackinfo.from_uid) return;

        // 添加 充值的时候需要发送一个消息给他的召唤者
        let pkActivityRes = global.resMgr.activityRes.getRes("A015");
        if (!pkActivityRes) {
            return;
        }
        let kEndTime = Date.parse(pkActivityRes.kEndTime);
        let kStartTime = Date.parse(pkActivityRes.kStartTime);

        if (kEndTime && Date.now() > kEndTime) return;
        if (kStartTime && Date.now() < kStartTime) return;

        // 发送一份邮件过去 额度从分改成元
        this.pushMsg("addrecharge", Math.floor(num / 100), time);
        global.logMgr.callBackLogs(this.parent, "addrecharge", this.callbackinfo.from_uid, num);
    }

    onGetAward() {
        // 把自己的奖励处理一下
        if (this.callbackinfo.cangetaward <= 0) {
            global.netMgr.sendData({ cmd: "callbackaward", award: 0 }, this.parent.linkid);
            return;
        }
        let award = this.callbackinfo.cangetaward;
        this.callbackinfo.cangetaward = 0;
        this.callbackinfo.totaward += award;

        this.parent.addItem("W001",award,"callbackadd");
        // this.parent.decMoney(-award, "callbackadd");

        this.saveinfo();
        // 可能要通知一下玩家
        global.netMgr.sendData({ cmd: "callbackaward", award: award }, this.parent.linkid);
        global.logMgr.callBackLogs(this.parent, "onGetAward", award, this.callbackinfo.totaward);
    }
}