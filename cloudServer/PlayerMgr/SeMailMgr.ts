import { SePlayer } from "./SePlayer";
import { SeCharMailInfo, SeMailType } from "../SeDefine";
import { iApp } from "../app";
import { type } from "os";
declare var global: iApp;
export class SeMailMgr {
    constructor(p: SePlayer) {

    }

    get mails() {
        return [];
    }

    public check_mails() {
        let PVP_MAILS = [];
        let ThreeUrlMails = [];
        let AUTO_MAILS = [];
        let SeasonRewards = [];
        let LevelSpeedSeasonRewards = [];
        let PvePkSeasonRewards = [];
        let GuildItem = [];
        return [PVP_MAILS, AUTO_MAILS, ThreeUrlMails, SeasonRewards, LevelSpeedSeasonRewards, GuildItem, PvePkSeasonRewards];
    }

    public addMail(kMails: SeCharMailInfo | SeCharMailInfo[]): boolean {
        return false;
    }

    public useMail(mailid: string) {
        return false;
    }

    public delMail(mailid: string) {
        return false;
    }

    public useMails(mailIDs: Array<string>) {
        return false;
    }

    public delMails(mailIDs: Array<string>) {
        return false;
    }

    public checkAndDelMail(){
        return;
    }
    public _use_mail_item(rkMail: SeCharMailInfo) {
        return ;
    }
}


// export class SeMailMgrV1 extends SeMailMgr {
//     private parent: SePlayer;
//     constructor(p: SePlayer) {
//         super(p)
//         this.parent = p;
//     }

//     get mails() {
//         return this.mailInfoDB.value;
//     }

//     get mailInfoDB() {
//         return this.parent.offline_mailInfoDB;
//     }

//     check_mails() {
//         var PVP_MAILS = [];
//         var ThreeUrlMails = [];
//         var AUTO_MAILS = [];
//         var mailHash = this.mailInfoDB.value;
//         for (var key in mailHash) {
//             let pkMail: SeCharMailInfo = mailHash[key];
//             if (this._formateMail(pkMail)) {
//                 this.mailInfoDB.set(parseInt(key), pkMail);
//             }
//             if (pkMail.mailtype == SeMailType.PvpResult) {
//                 try {
//                     let sdata = JSON.parse(pkMail.message as string);
//                     PVP_MAILS.push(sdata);
//                 }
//                 catch (e) {
//                 }

//                 this.mailInfoDB.Del(pkMail);
//             }
//             else if (pkMail.mailtype == SeMailType.ThreeUrlBack) {
//                 try {
//                     let sdata = JSON.parse(pkMail.message as string);
//                     ThreeUrlMails.push(sdata);
//                 }
//                 catch (e) {
//                 }

//                 this.mailInfoDB.Del(pkMail);
//             }
//             else if (pkMail.mailtype == SeMailType.AutoUse || pkMail.mailtype == SeMailType.ShareBack) {
//                 AUTO_MAILS.push(pkMail);
//                 this.mailInfoDB.Del(pkMail);
//             }
//             else if (pkMail.endTime != 0 && pkMail.endTime < Date.now()) {
//                 this.mailInfoDB.Del(pkMail);
//             }
//         }

//         return [PVP_MAILS, AUTO_MAILS, ThreeUrlMails];
//     }

//     public useMail(mailid: string) {
//         let find = false;
//         var allMail = this.mailInfoDB.value;
//         for (var key in allMail) {
//             var rkMail: SeCharMailInfo = allMail[key];
//             if (rkMail && rkMail.mailid == mailid) {
//                 find = true;
//                 this._use_mail_itme(rkMail);

//                 if (rkMail.mailtype == SeMailType.FriendKey) {
//                     // 好友邮件 一天使用有上限的
//                     // 超出了就不能领取
//                     this.delMail(rkMail.mailid);
//                 }
//                 else {
//                     rkMail.mailstate = 1;
//                     this.mailInfoDB.set(parseInt(key), rkMail);
//                 }
//                 break;
//             }
//         }

//         return find;
//     }

//     private _use_mail_itme(rkMail: SeCharMailInfo) {
//         if (rkMail.endTime == 0 || Date.now() <= rkMail.endTime) {
//             if (rkMail.mailtype == SeMailType.FriendKey) {
//                 // 好友邮件 一天使用有上限的
//                 if (this.parent.dailyInfo.daily_friend_recive < this.parent.friendMgr.max_recive_key) {
//                     this.parent.dailyInfo.daily_friend_recive++;
//                     this.parent.updateDailyInfo();
//                 }
//                 else {
//                     return;
//                 }
//             }

//             if (rkMail.items && rkMail.items.length > 0 && rkMail.mailstate != 1) {
//                 this.parent.addItems(rkMail.items, "maildel");
//             }
//         }
//     }

//     public delMail(mailid: string) {
//         var allMail = this.mailInfoDB.value;
//         for (var key in allMail) {
//             var rkMail: SeCharMailInfo = allMail[key];
//             if (rkMail && rkMail.mailid == mailid) {
//                 this.mailInfoDB.Del(rkMail);

//                 global.netMgr.sendMailsDel(this.parent.linkid, mailid);
//                 // this.mailinfos.splice(parseInt(key), 1);
//                 return true;
//             }
//         }

//         return false;
//     }

//     private _formateMail(rkMail: SeCharMailInfo) {
//         if (!rkMail) return false;
//         if ((rkMail.message as any) instanceof Array) {
//             rkMail.message = (rkMail.message as any).join('<br/>');
//             return true;
//         }
//         return false;
//     }

//     public addMail(kMails: SeCharMailInfo | SeCharMailInfo[]): boolean {
//         if (!(kMails instanceof Array)) {
//             kMails = [kMails]
//         }
//         for (let km = 0; km < kMails.length; km++) {
//             let kMail = kMails[km];
//             this._formateMail(kMail);
//             if (kMail.mailtype == SeMailType.AutoUse) {
//                 // 这里道具立即使用掉
//                 this._use_mail_itme(kMail);
//             }
//             else if (kMail.mailtype == SeMailType.ShareBack) {
//                 // 分享链接点击进入后 发聩给发起人的奖励信息 
//                 this.parent.m_pkItemMgr.add_daily_share_links_(kMail);
//             }
//             else {
//                 // 先判断一下邮件id是否重复
//                 var bFind: boolean = false;
//                 var allMail = this.mailInfoDB.value;
//                 for (var key in allMail) {
//                     var rkMail: SeCharMailInfo = allMail[key];
//                     if (rkMail && rkMail.mailid == kMail.mailid) {
//                         bFind = true;
//                         break;
//                     }
//                 }

//                 if (bFind) {
//                     break;
//                 }

//                 this.mailInfoDB.push_back(kMail);
//                 if (this.parent.loadComplete) {
//                     // 如果玩家是加载完成了的，那么需要通知一下玩家新增邮件了
//                     global.netMgr.sendMailsAdd(this.parent.linkid, [kMail]);
//                 }
//             }
//         }
//         return true;
//     }
// }

export class SeMailMgrV2 extends SeMailMgr {
    private parent: SePlayer;
    constructor(p: SePlayer) {
        super(p);
        this.parent = p;
    }

    get mails() {
        let infos = [];
        for (let key in this.parent.baseInfo.mails) {
            infos.push(this.parent.baseInfo.mails[key]);
        }

        return infos;
    }

    get mailInfoDB() {
        return this.parent.offline_mailInfoDB;
    }

    check_mails() {
        this.move_mail_offline_to_online();


        // 初始化邮件信息
        let PVP_MAILS = [];
        let ThreeUrlMails = [];
        let AUTO_MAILS = [];
        let SeasonRewards = [];
        let CallBackMsgs = [];
        let LevelSpeedSeasonRewards = []; 
        let PvePkSeasonRewards = []; 
        let GuildItem = [];
        let bchange = false;
        for (let key in this.parent.baseInfo.mails) {
            let pkMail: SeCharMailInfo = this.parent.baseInfo.mails[key];
            if (this._formateMail(pkMail)) {
                bchange = true;
            }

            let bdel = false;

            if (pkMail.mailtype == SeMailType.PvpResult) {
                try {
                    let sdata = JSON.parse(pkMail.message as string);
                    PVP_MAILS.push(sdata);
                }
                catch (e) {
                }

                bdel = true;
            }
            else if (pkMail.mailtype == SeMailType.ThreeUrlBack) {
                try {
                    let sdata = JSON.parse(pkMail.message as string);
                    ThreeUrlMails.push(sdata);
                }
                catch (e) {
                }

                bdel = true;
            }
            else if (pkMail.mailtype == SeMailType.AutoUse || pkMail.mailtype == SeMailType.ShareBack) {
                AUTO_MAILS.push(pkMail);
                bdel = true;
            }
            else if (pkMail.mailtype == SeMailType.Peak_SeasonReward) {
                try {
                    let sdata = JSON.parse(pkMail.message as string);
                    SeasonRewards.push(sdata);
                }
                catch (e) {
                }
                bdel = true;
            }
            else if (pkMail.mailtype == SeMailType.PvePk_SeasonReward) {
                try {
                    let sdata = JSON.parse(pkMail.message as string);
                    PvePkSeasonRewards.push(sdata);
                }
                catch (e) {
                }
                bdel = true;
            }
            else if (pkMail.mailtype == SeMailType.LevelSpeed_SeasonReward) {
                try {
                    let sdata = JSON.parse(pkMail.message as string);
                    LevelSpeedSeasonRewards.push(sdata);
                }
                catch (e) {
                }
                bdel = true;
            }
            else if (pkMail.mailtype == SeMailType.Guild_Opr) {
                try {
                    let sdata = JSON.parse(pkMail.message as string);
                    GuildItem.push(sdata);
                }
                catch (e) {
                }
                bdel = true;
            }
            else if (pkMail.mailtype == SeMailType.CallBackMsg) {
                try {
                    let sdata = JSON.parse(pkMail.message as string);
                    CallBackMsgs.push(sdata);
                }
                catch (e) {
                }
                bdel = true;
            }
            else if (pkMail.endTime != 0 && pkMail.endTime < Date.now()) {
                bdel = true;
            }

            if (bdel) {
                delete this.parent.baseInfo.mails[key];
                bchange = true;
            }
        }
        if (bchange) {
            this.parent.saveBaseInfo("mails");
        }

        return [PVP_MAILS, AUTO_MAILS, ThreeUrlMails, SeasonRewards, LevelSpeedSeasonRewards, GuildItem, PvePkSeasonRewards, CallBackMsgs];
    }

    public useMail(mailid: string) {
        let find = false;
        if (this.parent.baseInfo.mails.hasOwnProperty(mailid)) {
            var rkMail: SeCharMailInfo = this.parent.baseInfo.mails[mailid];
            if (rkMail) {
                find = true;
                this._use_mail_item(rkMail);

                if (rkMail.mailtype == SeMailType.FriendKey) {
                    // 好友邮件 一天使用有上限的
                    // 超出了就不能领取
                    this.delMail(rkMail.mailid);
                }
                else {
                    rkMail.mailstate = 1;
                    global.logMgr.maillog(this.parent, rkMail.mailid, 'use', JSON.stringify({ items: rkMail.items }));
                    this.parent.saveBaseInfo('mails');
                }
            }
        }

        return find;
    }

    public useMails(mailIDs: Array<string>) {
        if(mailIDs.length > 50) return false;
        for(var mailID of mailIDs){
            this.useMail(mailID);
        }
        global.netMgr.sendData({ cmd: 'openBoxAni'}, this.parent.linkid);
        return true;
    }


    public _use_mail_item(rkMail: SeCharMailInfo) {
        if (rkMail.endTime == 0 || Date.now() <= rkMail.endTime) {
            if (rkMail.mailtype == SeMailType.FriendKey) {
                // 好友邮件 一天使用有上限的
                if (this.parent.dailyInfo.daily_friend_recive < this.parent.friendMgr.max_recive_key) {
                    this.parent.dailyInfo.daily_friend_recive++;
                    this.parent.updateDailyInfo();
                }
                else {
                    return;
                }
            }

            if (rkMail.items && rkMail.items.length > 0 && rkMail.mailstate != 1) {
                this.parent.addItems(rkMail.items, "maildel");
                global.logMgr.maillog(this.parent, rkMail.mailid, 'item', JSON.stringify({ items: rkMail.items }));
            }
        }
    }

    public checkAndDelMail(){
        for(let mailid in this.parent.baseInfo.mails){
            let mailInfo = this.parent.baseInfo.mails[mailid] as SeCharMailInfo;
            if(mailInfo && mailInfo.title && typeof mailInfo.message == 'string' && mailInfo.message.indexOf('阵营对抗赛') != -1){
                global.logMgr.maillog(this.parent, mailInfo.mailid, 'del', JSON.stringify({ items: mailInfo.items }));
                delete this.parent.baseInfo.mails[mailid];
                global.netMgr.sendMailsDel(this.parent.linkid, mailid);
                this.parent.saveBaseInfo('mails');
            }
        }
    }
    
    public delMail(mailid: string) {
        if (this.parent.baseInfo.mails.hasOwnProperty(mailid)) {
            let mailInfo = this.parent.baseInfo.mails[mailid] as SeCharMailInfo;
            if (mailInfo && mailInfo.items && mailInfo.items.length > 0 && mailInfo.mailstate == 0) {
                // 增加一个提示，是否出现没领取就删除了的情况
                console.log(`del mail when has item<${this.parent.id}><${mailInfo.mailid}>`, JSON.stringify(mailInfo));

                if (mailInfo.mailtype == SeMailType.Charge) {
                    // 支付邮件出现这种情况就拒绝删除
                    return;
                }
            }
            global.logMgr.maillog(this.parent, mailInfo.mailid, 'del', JSON.stringify({ items: mailInfo.items }));
            delete this.parent.baseInfo.mails[mailid];
            global.netMgr.sendMailsDel(this.parent.linkid, mailid);
            this.parent.saveBaseInfo('mails');
            return true;
        }

        return false;
    }

    public delMails(mailIDs: Array<string>) {
        let result = [];
        for(var mailID of mailIDs){
            if (this.parent.baseInfo.mails.hasOwnProperty(mailID)) {
                let mailInfo = this.parent.baseInfo.mails[mailID] as SeCharMailInfo;
                if (mailInfo && mailInfo.items && mailInfo.items.length > 0 && mailInfo.mailstate == 0) {
                    // 增加一个提示，是否出现没领取就删除了的情况
                    console.log(`del mail when has item<${this.parent.id}><${mailInfo.mailid}>`, JSON.stringify(mailInfo));
                    if (mailInfo.mailtype == SeMailType.Charge) {
                        // 支付邮件出现这种情况就拒绝删除
                        continue;
                    }
                }
                global.logMgr.maillog(this.parent, mailInfo.mailid, 'del', JSON.stringify({ items: mailInfo.items }));
                delete this.parent.baseInfo.mails[mailID];
                result.push(mailID);
            }
        }
        this.parent.saveBaseInfo('mails');
        global.netMgr.sendMailsDelBatch(this.parent.linkid, result);
        return true;
    }
    private _formateMail(rkMail: SeCharMailInfo) {
        if (!rkMail) return false;
        if ((rkMail.message as any) instanceof Array) {
            rkMail.message = (rkMail.message as any).join('<br/>');
            return true;
        }
        return false;
    }

    public move_mail_offline_to_online() {
        let change = false;
        if (this.parent.baseInfo.mails && (this.parent.baseInfo.mails instanceof Array)) {
            // 内部版本出现过 Array 所以需要增加一个转换
            let obj = {};
            for (let i = 0; i < this.parent.baseInfo.mails.length; i++) {
                let r: SeCharMailInfo = this.parent.baseInfo.mails[i];
                obj[r.mailid] = r;
            }

            this.parent.baseInfo.mails = obj;
            change = true;
        }

        let allMails = this.parent.offline_mailInfoDB.value;
        for (let i = 0; i < allMails.length; i++) {
            // 这里会有一些错误信息的可能，出现同一个邮件id出现多次数据的情况
            let r: SeCharMailInfo = allMails[i];
            if (!this.parent.baseInfo.mails.hasOwnProperty(r.mailid)) {
                this.parent.baseInfo.mails[r.mailid] = r;
                change = true;
            }
            else {
                console.log(`<replete mailid> uid:<${this.parent.id}>,mailid:<${r.mailid}>,mailinfo<${JSON.stringify(r)}>`);
            }
        }

        if (change) {
            this.parent.saveBaseInfo("mails");
            this.parent.offline_mailInfoDB.clearAll();
        }
    }

    public addMail(kMails: SeCharMailInfo | SeCharMailInfo[]): boolean {
        let notices: SeCharMailInfo[] = [];
        if (!(kMails instanceof Array)) {
            kMails = [kMails]
        }
        for (let i = 0; i < kMails.length; i++) {
            let kMail = kMails[i];
            this._formateMail(kMail);
            if (kMail.mailtype == SeMailType.AutoUse) {
                // 这里道具立即使用掉
                this._use_mail_item(kMail);
                global.logMgr.maillog(this.parent, kMail.mailid, 'autouse', JSON.stringify({ items: kMail.items }));
            }
            else if (kMail.mailtype == SeMailType.ShareBack) {
                // 分享链接点击进入后 发聩给发起人的奖励信息 
                this.parent.m_pkItemMgr.add_daily_share_links_(kMail);
            }
            else if (kMail.mailtype == SeMailType.CallBackMsg) {
                try {
                    // 添加的时候立即使用掉
                    this.parent.m_callbackMgr.onReciveMsg(JSON.parse(kMail.message));
                }
                catch (e) {

                }
                continue;
            }
            else {
                // 先判断一下邮件id是否重复
                if (this.parent.baseInfo.mails.hasOwnProperty(kMail.mailid)) {
                    console.log(`<mail> <repeat id>${kMail.mailid} infos:[${JSON.stringify(kMail)}]`);
                    continue;
                }
                global.logMgr.maillog(this.parent, kMail.mailid, 'add', JSON.stringify({ items: kMail.items, title: kMail.title }));
                this.parent.baseInfo.mails[kMail.mailid] = kMail;
                notices.push(kMail);
            }
        }

        if (notices.length > 0) {
            this.parent.saveBaseInfo("mails");
            if (this.parent.loadComplete) {
                // 如果玩家是加载完成了的，那么需要通知一下玩家新增邮件了
                global.netMgr.sendMailsAdd(this.parent.linkid, notices);
            }
        }

        return true;
    }
}