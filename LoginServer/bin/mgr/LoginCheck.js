"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeLoginCheck = exports.LockType = void 0;
const crypto_1 = require("crypto");
const TeConfig_1 = require("../lib/TeConfig");
const fs_1 = require("fs");
const GMMgr_1 = require("./GMMgr");
const GameVerMgr_1 = require("./GameVerMgr");
const TeHttpQuest_1 = require("../lib/TeHttpQuest");
const AppMgr_1 = require("./AppMgr");
var LockType;
(function (LockType) {
    LockType[LockType["NULL"] = 0] = "NULL";
    LockType[LockType["TimeLock"] = 1] = "TimeLock";
    LockType[LockType["NormalLock"] = 2] = "NormalLock";
})(LockType = exports.LockType || (exports.LockType = {}));
class SeLoginCheck {
    static singcheck1(info) {
        var md5sum = crypto_1.createHash('md5');
        let appkey = AppMgr_1.AppUnit.get_appkey(info.appid);
        let check_str = "channel=" + info.channel + "&appid=" + info.appid + "&time=" + info.time + "&openid=" + info.openid + "&uid=" + info.uid + appkey;
        var md5sign = md5sum.update(check_str);
        return md5sign.digest('hex');
    }
    static singcheck2(info) {
        var md5sum = crypto_1.createHash('md5');
        let appkey = AppMgr_1.AppUnit.get_appkey(info.appid);
        let check_str = "channel=" + info.channel + "&appid=" + info.appid + "&time=" + info.time + "&uid=" + info.uid + appkey;
        var md5sign = md5sum.update(check_str);
        return md5sign.digest('hex');
    }
    static app_check(info) {
        //MD5("guestid+mobileinfo+account+accountid+appid+logintype+token+Appkey)
        var md5sum = crypto_1.createHash('md5');
        let check_str = "" + info.guestid + info.mobileinfo + info.account + info.uid + info.appid + info.logintype + info.token + TeConfig_1.configInst.get('dh_appkey');
        var md5sign = md5sum.update(check_str);
        return md5sign.digest('hex');
    }
    static app_offline_check(accountid, timestamp, token) {
        //MD5("guestid+mobileinfo+account+accountid+appid+logintype+token+Appkey)
        var md5sign = crypto_1.createHash('md5').update("" + accountid + timestamp + token + TeConfig_1.configInst.get('dh_appkey'));
        return md5sign.digest('hex');
    }
    static app_login(_queryparam, _cb) {
        let info = _queryparam.sdwInfo;
        // info.appid = "1684303219";
        TeHttpQuest_1.http_quest("post", "http://hsdk.login.17m3.com/Wbsrv/Check_Login_DH.aspx", {
            guestid: info.guestid.toString(),
            mobileinfo: info.mobileinfo.toString(),
            account: info.account.toString(),
            accountid: info.uid.toString(),
            appid: info.appid.toString(),
            logintype: info.logintype.toString(),
            token: info.token.toString(),
            sign: SeLoginCheck.app_check(info)
        }, this._app_check_back.bind(this, _queryparam, _cb), 2);
    }
    static _app_check_back(queryparam, cb, data) {
        if (!data) {
            return this._on_sign_check_end('signerr', queryparam, cb);
        }
        try {
            let p_info = JSON.parse(data);
            if (p_info.result == 1 && this.app_offline_check(p_info.data.accountid, p_info.data.timestamp, p_info.data.token) == p_info.data.sign) {
                queryparam.uid = p_info.data.accountid;
                return this._on_sign_check_end("success", queryparam, cb);
            }
            else if (this.app_offline_check(queryparam.sdwInfo.uid, queryparam.sdwInfo.time, queryparam.sdwInfo.token) == queryparam.sdwInfo.sign) {
                queryparam.uid = p_info.data.accountid;
                return this._on_sign_check_end("success", queryparam, cb);
            }
            else {
                return this._on_sign_check_end('signerr', queryparam, cb);
            }
        }
        catch (e) {
            return this._on_sign_check_end('signerr', queryparam, cb);
        }
    }
    /**
     * 闪电玩登陆验证
     * @param info
     * @param cb
     * @return 'success' 或者'signerr'
     */
    static onLoginSD(queryparam, cb) {
        var ret;
        var info = queryparam.sdwInfo;
        let logintype = AppMgr_1.AppUnit.get_sdk_type(info.appid);
        // 这里需要对数据进行操作验证一下
        let fobid = GameVerMgr_1.GameVerMgr.inst.check_login_limit(queryparam.uid, queryparam.sdwInfo ? queryparam.sdwInfo.pub_ver : 0, queryparam._sys_.plt);
        if (fobid) {
            ret = fobid;
        }
        else if (logintype == 'sdwsdk') {
            if (SeLoginCheck.singcheck1(info) != info.sign && SeLoginCheck.singcheck2(info) != info.sign && !TeConfig_1.configInst.get('cheatmode')) {
                ret = 'signerr';
            }
            else {
                ret = 'success';
            }
        }
        else if (logintype == 'dhsdk') {
            return this.app_login(queryparam, cb);
        }
        return this._on_sign_check_end(ret, queryparam, cb);
    }
    static _on_sign_check_end(ret, queryparam, cb) {
        let info = queryparam.sdwInfo;
        var out = { type: ret, uid: parseInt(info.uid), token: info.sign };
        if (cb) {
            var ccb = {
                cb: cb,
                out: out,
                queryparam: queryparam
            };
            this._forbiddenCheck(out.uid, (bLock, _ccb, un_time) => {
                if (bLock) {
                    _ccb.out.type = 'lock';
                    _ccb.out.un_lock_time = un_time;
                }
                _ccb.queryparam.type = _ccb.out.type;
                _ccb.cb(_ccb.out, _ccb.queryparam);
            }, ccb);
        }
    }
    static ConvertId(account) {
        var md5sum = crypto_1.createHash('md5');
        var md5sign = md5sum.update(account);
        var md5str = md5sign.digest('hex');
        var idstr = '';
        for (var i = 8; i < 24; i++) {
            var a = md5str.charCodeAt(i);
            var b = a - '0'.charCodeAt(0);
            if (b > 9) {
                b = a - 'a'.charCodeAt(0) + 1;
            }
            idstr += b.toString();
        }
        return idstr;
    }
    static onAccount(queryparam, cb) {
        if (!TeConfig_1.configInst.get('local')) {
            return;
        }
        var account = queryparam.account;
        var linkid = queryparam.linkid;
        var clientid = queryparam.clientid;
        var idstr = SeLoginCheck.ConvertId(account);
        if (!this._nameCatche.hasOwnProperty(idstr)) {
            this._nameCatche[idstr] = [account];
        }
        else if (this._nameCatche[idstr].indexOf(account) < 0) {
            this._nameCatche[idstr].push(account);
            fs_1.writeFileSync('accounts', JSON.stringify(this._nameCatche, null, 4));
        }
        let fobid = GameVerMgr_1.GameVerMgr.inst.check_login_limit(parseInt(idstr), queryparam.sdwInfo ? queryparam.sdwInfo.pub_ver : 0, queryparam._sys_.plt);
        var out = { type: fobid || 'success', uid: parseInt(idstr), token: idstr };
        // queryparam.uid = out.uid;
        if (cb) {
            queryparam.uid = out.uid;
            var ccb = {
                cb: cb,
                out: out,
                queryparam: queryparam
            };
            this._forbiddenCheck(out.uid, (bLock, _ccb, un_time) => {
                if (bLock) {
                    _ccb.out.type = 'lock';
                    _ccb.out.un_lock_time = un_time;
                }
                _ccb.queryparam.type = _ccb.out.type;
                _ccb.cb(_ccb.out, _ccb.queryparam);
            }, ccb);
        }
        return out;
    }
    /**
     * 检查是否合法
     */
    static _forbiddenCheck(uid, cb, extInfo) {
        var db = GMMgr_1.redistInst.getHashMember('accountinfo', uid.toString());
        db.load(this._forbiddenCheckRet.bind(this, cb, extInfo));
    }
    static _forbiddenCheckRet(cb, extInfo, err, db) {
        var uid = parseInt(db.subKey);
        var info = db.value;
        var unlockTime = 0;
        var bLock = false;
        if (info) {
            if (info.lockType == LockType.TimeLock) {
                if (info.lockTime > Date.now()) {
                    unlockTime = info.lockTime;
                    bLock = true;
                }
            }
            else if (info.lockType == LockType.NormalLock) {
                unlockTime = 0;
                bLock = true;
            }
        }
        if (cb)
            cb(bLock, extInfo, unlockTime);
    }
    static gmLockUnlock(uid, lockType, cb) {
        var db = GMMgr_1.redistInst.getHashMember('accountinfo', uid.toString());
        db.load(this._gmLockUnlockEnd.bind(this, lockType, cb));
    }
    static _gmLockUnlockEnd(lockType, cb, err, db) {
        var uid = parseInt(db.subKey);
        var info = db.value;
        if (!info) {
            info = {
                lockType: lockType,
                lockTime: 0
            };
        }
        info.lockType = lockType;
        switch (info.lockType) {
            case LockType.TimeLock:
                info.lockTime = Date.now() + 3 * 24 * 60 * 60 * 1000;
                break;
            case LockType.NormalLock:
            case LockType.NULL:
                info.lockTime = 0;
                break;
        }
        db.save(info);
        cb && cb(uid);
    }
    /** 为了增加一个选服的时候玩家是否登陆过的统计，所以要增加一套类似账号系统的功能，这里记录玩家登陆过的大区和角色信息，记录玩家登陆的时间*/
    /**
     * 获取玩家信息
     */
    static get_account_info(account, cb) {
        this._load_account_info(account, function (db, value) {
            cb(value || {});
        });
    }
    /**
     * 保存玩家信息
     * @param account
     * @param plt
     * @param role
     */
    static cache_account_info(account, plt, role) {
        this._load_account_info(account, function (db, value) {
            db.save(plt, { role: role, time: Date.now() });
            // 防止垃圾数据堆积，这里设置一个40天的有效期，这样可以有效的减少垃圾数据
            db.timeOut = 40 * 24 * 60 * 60;
        });
    }
    static _load_account_info(account, cb) {
        let gamerole = GMMgr_1.redistInst.getHash("ddms_account_" + account);
        gamerole.load(function (succ, db) {
            if (succ && db.value) {
                cb(db, db.value);
            }
            else {
                cb(db, null);
            }
        });
    }
}
exports.SeLoginCheck = SeLoginCheck;
SeLoginCheck._nameCatche = {};
//# sourceMappingURL=LoginCheck.js.map