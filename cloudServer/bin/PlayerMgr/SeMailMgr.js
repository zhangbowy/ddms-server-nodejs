"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeMailMgrV2 = exports.SeMailMgr = void 0;
const SeDefine_1 = require("../SeDefine");
class SeMailMgr {
    constructor(p) {
    }
    get mails() {
        return [];
    }
    check_mails() {
        let PVP_MAILS = [];
        let ThreeUrlMails = [];
        let AUTO_MAILS = [];
        let SeasonRewards = [];
        let LevelSpeedSeasonRewards = [];
        let PvePkSeasonRewards = [];
        let GuildItem = [];
        return [PVP_MAILS, AUTO_MAILS, ThreeUrlMails, SeasonRewards, LevelSpeedSeasonRewards, GuildItem, PvePkSeasonRewards];
    }
    addMail(kMails) {
        return false;
    }
    useMail(mailid) {
        return false;
    }
    delMail(mailid) {
        return false;
    }
    useMails(mailIDs) {
        return false;
    }
    delMails(mailIDs) {
        return false;
    }
    checkAndDelMail() {
        return;
    }
    _use_mail_item(rkMail) {
        return;
    }
}
exports.SeMailMgr = SeMailMgr;
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
//                     // ???????????? ????????????????????????
//                     // ????????????????????????
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
//                 // ???????????? ????????????????????????
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
//                 // ???????????????????????????
//                 this._use_mail_itme(kMail);
//             }
//             else if (kMail.mailtype == SeMailType.ShareBack) {
//                 // ??????????????????????????? ????????????????????????????????? 
//                 this.parent.m_pkItemMgr.add_daily_share_links_(kMail);
//             }
//             else {
//                 // ?????????????????????id????????????
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
//                     // ?????????????????????????????????????????????????????????????????????????????????
//                     global.netMgr.sendMailsAdd(this.parent.linkid, [kMail]);
//                 }
//             }
//         }
//         return true;
//     }
// }
class SeMailMgrV2 extends SeMailMgr {
    constructor(p) {
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
        // ?????????????????????
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
            let pkMail = this.parent.baseInfo.mails[key];
            if (this._formateMail(pkMail)) {
                bchange = true;
            }
            let bdel = false;
            if (pkMail.mailtype == SeDefine_1.SeMailType.PvpResult) {
                try {
                    let sdata = JSON.parse(pkMail.message);
                    PVP_MAILS.push(sdata);
                }
                catch (e) {
                }
                bdel = true;
            }
            else if (pkMail.mailtype == SeDefine_1.SeMailType.ThreeUrlBack) {
                try {
                    let sdata = JSON.parse(pkMail.message);
                    ThreeUrlMails.push(sdata);
                }
                catch (e) {
                }
                bdel = true;
            }
            else if (pkMail.mailtype == SeDefine_1.SeMailType.AutoUse || pkMail.mailtype == SeDefine_1.SeMailType.ShareBack) {
                AUTO_MAILS.push(pkMail);
                bdel = true;
            }
            else if (pkMail.mailtype == SeDefine_1.SeMailType.Peak_SeasonReward) {
                try {
                    let sdata = JSON.parse(pkMail.message);
                    SeasonRewards.push(sdata);
                }
                catch (e) {
                }
                bdel = true;
            }
            else if (pkMail.mailtype == SeDefine_1.SeMailType.PvePk_SeasonReward) {
                try {
                    let sdata = JSON.parse(pkMail.message);
                    PvePkSeasonRewards.push(sdata);
                }
                catch (e) {
                }
                bdel = true;
            }
            else if (pkMail.mailtype == SeDefine_1.SeMailType.LevelSpeed_SeasonReward) {
                try {
                    let sdata = JSON.parse(pkMail.message);
                    LevelSpeedSeasonRewards.push(sdata);
                }
                catch (e) {
                }
                bdel = true;
            }
            else if (pkMail.mailtype == SeDefine_1.SeMailType.Guild_Opr) {
                try {
                    let sdata = JSON.parse(pkMail.message);
                    GuildItem.push(sdata);
                }
                catch (e) {
                }
                bdel = true;
            }
            else if (pkMail.mailtype == SeDefine_1.SeMailType.CallBackMsg) {
                try {
                    let sdata = JSON.parse(pkMail.message);
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
    useMail(mailid) {
        let find = false;
        if (this.parent.baseInfo.mails.hasOwnProperty(mailid)) {
            var rkMail = this.parent.baseInfo.mails[mailid];
            if (rkMail) {
                find = true;
                this._use_mail_item(rkMail);
                if (rkMail.mailtype == SeDefine_1.SeMailType.FriendKey) {
                    // ???????????? ????????????????????????
                    // ????????????????????????
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
    useMails(mailIDs) {
        if (mailIDs.length > 50)
            return false;
        for (var mailID of mailIDs) {
            this.useMail(mailID);
        }
        global.netMgr.sendData({ cmd: 'openBoxAni' }, this.parent.linkid);
        return true;
    }
    _use_mail_item(rkMail) {
        if (rkMail.endTime == 0 || Date.now() <= rkMail.endTime) {
            if (rkMail.mailtype == SeDefine_1.SeMailType.FriendKey) {
                // ???????????? ????????????????????????
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
    checkAndDelMail() {
        for (let mailid in this.parent.baseInfo.mails) {
            let mailInfo = this.parent.baseInfo.mails[mailid];
            if (mailInfo && mailInfo.title && typeof mailInfo.message == 'string' && mailInfo.message.indexOf('???????????????') != -1) {
                global.logMgr.maillog(this.parent, mailInfo.mailid, 'del', JSON.stringify({ items: mailInfo.items }));
                delete this.parent.baseInfo.mails[mailid];
                global.netMgr.sendMailsDel(this.parent.linkid, mailid);
                this.parent.saveBaseInfo('mails');
            }
        }
    }
    delMail(mailid) {
        if (this.parent.baseInfo.mails.hasOwnProperty(mailid)) {
            let mailInfo = this.parent.baseInfo.mails[mailid];
            if (mailInfo && mailInfo.items && mailInfo.items.length > 0 && mailInfo.mailstate == 0) {
                // ???????????????????????????????????????????????????????????????
                console.log(`del mail when has item<${this.parent.id}><${mailInfo.mailid}>`, JSON.stringify(mailInfo));
                if (mailInfo.mailtype == SeDefine_1.SeMailType.Charge) {
                    // ?????????????????????????????????????????????
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
    delMails(mailIDs) {
        let result = [];
        for (var mailID of mailIDs) {
            if (this.parent.baseInfo.mails.hasOwnProperty(mailID)) {
                let mailInfo = this.parent.baseInfo.mails[mailID];
                if (mailInfo && mailInfo.items && mailInfo.items.length > 0 && mailInfo.mailstate == 0) {
                    // ???????????????????????????????????????????????????????????????
                    console.log(`del mail when has item<${this.parent.id}><${mailInfo.mailid}>`, JSON.stringify(mailInfo));
                    if (mailInfo.mailtype == SeDefine_1.SeMailType.Charge) {
                        // ?????????????????????????????????????????????
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
    _formateMail(rkMail) {
        if (!rkMail)
            return false;
        if (rkMail.message instanceof Array) {
            rkMail.message = rkMail.message.join('<br/>');
            return true;
        }
        return false;
    }
    move_mail_offline_to_online() {
        let change = false;
        if (this.parent.baseInfo.mails && (this.parent.baseInfo.mails instanceof Array)) {
            // ????????????????????? Array ??????????????????????????????
            let obj = {};
            for (let i = 0; i < this.parent.baseInfo.mails.length; i++) {
                let r = this.parent.baseInfo.mails[i];
                obj[r.mailid] = r;
            }
            this.parent.baseInfo.mails = obj;
            change = true;
        }
        let allMails = this.parent.offline_mailInfoDB.value;
        for (let i = 0; i < allMails.length; i++) {
            // ???????????????????????????????????????????????????????????????id???????????????????????????
            let r = allMails[i];
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
    addMail(kMails) {
        let notices = [];
        if (!(kMails instanceof Array)) {
            kMails = [kMails];
        }
        for (let i = 0; i < kMails.length; i++) {
            let kMail = kMails[i];
            this._formateMail(kMail);
            if (kMail.mailtype == SeDefine_1.SeMailType.AutoUse) {
                // ???????????????????????????
                this._use_mail_item(kMail);
                global.logMgr.maillog(this.parent, kMail.mailid, 'autouse', JSON.stringify({ items: kMail.items }));
            }
            else if (kMail.mailtype == SeDefine_1.SeMailType.ShareBack) {
                // ??????????????????????????? ????????????????????????????????? 
                this.parent.m_pkItemMgr.add_daily_share_links_(kMail);
            }
            else if (kMail.mailtype == SeDefine_1.SeMailType.CallBackMsg) {
                try {
                    // ??????????????????????????????
                    this.parent.m_callbackMgr.onReciveMsg(JSON.parse(kMail.message));
                }
                catch (e) {
                }
                continue;
            }
            else {
                // ?????????????????????id????????????
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
                // ?????????????????????????????????????????????????????????????????????????????????
                global.netMgr.sendMailsAdd(this.parent.linkid, notices);
            }
        }
        return true;
    }
}
exports.SeMailMgrV2 = SeMailMgrV2;
//# sourceMappingURL=SeMailMgr.js.map