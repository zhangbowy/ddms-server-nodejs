import { Hash, createHash } from 'crypto';
import { configInst } from '../lib/TeConfig';
import { writeFileSync } from 'fs';
import { ReHashMember, ReHash } from "../lib/TeRedis";
import { if_login_param } from './OnlinePlayer';
import { redistInst } from './GMMgr';
import { GameVerMgr } from './GameVerMgr';
import { http_quest } from '../lib/TeHttpQuest';
import { AppUnit } from './AppMgr';
export interface loginInfo {
    channel: string,
    appid: string,
    uid: string,
    time: string,
    sign: string,
    openid: string,

    pub_ver: string,
    openkey: string,
    device_os: string,

    guestid?: string,
    mobileinfo?: string,
    account?: string,
    logintype?: string,
    token?: string,
    native?: boolean,
}

export interface ifLoginCheckRet {
    type: string,
    uid: number,
    token: string,
    un_lock_time?: number,
}

export enum LockType {
    NULL = 0,
    TimeLock = 1,   // 限时封锁，短时间内无法登陆，会自动解锁的 默认的是3天
    NormalLock = 2, // 普通封锁，不解锁一直无法登陆
}

export interface ifLockInfo {
    lockType: LockType;
    lockTime: number;
}

interface ifFunction_lock {
    cb: Function,
    out: ifLoginCheckRet,
    queryparam: if_login_param
}


export class SeLoginCheck {

    static singcheck1(info?: loginInfo) {
        var md5sum: Hash = createHash('md5');
        let appkey = AppUnit.get_appkey(info.appid);
        let check_str = "channel=" + info.channel + "&appid=" + info.appid + "&time=" + info.time + "&openid=" + info.openid + "&uid=" + info.uid + appkey
        var md5sign = md5sum.update(check_str);
        return md5sign.digest('hex');
    }

    static singcheck2(info?: loginInfo) {
        var md5sum: Hash = createHash('md5');
        let appkey = AppUnit.get_appkey(info.appid);
        let check_str = "channel=" + info.channel + "&appid=" + info.appid + "&time=" + info.time + "&uid=" + info.uid + appkey;
        var md5sign = md5sum.update(check_str);
        return md5sign.digest('hex');
    }

    static app_check(info?: loginInfo) {
        //MD5("guestid+mobileinfo+account+accountid+appid+logintype+token+Appkey)
        var md5sum: Hash = createHash('md5');
        let check_str = "" + info.guestid + info.mobileinfo + info.account + info.uid + info.appid + info.logintype + info.token + configInst.get('dh_appkey');
        var md5sign = md5sum.update(check_str);
        return md5sign.digest('hex');
    }

    private static app_offline_check(accountid: string, timestamp: string, token: string) {
        //MD5("guestid+mobileinfo+account+accountid+appid+logintype+token+Appkey)
        var md5sign = createHash('md5').update("" + accountid + timestamp + token + configInst.get('dh_appkey'));
        return md5sign.digest('hex');
    }

    private static app_login(_queryparam: if_login_param, _cb: Function) {
        let info: loginInfo = _queryparam.sdwInfo;
        // info.appid = "1684303219";
        http_quest("post", "http://hsdk.login.17m3.com/Wbsrv/Check_Login_DH.aspx", {
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

    private static _app_check_back(queryparam: if_login_param, cb, data) {
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
    public static onLoginSD(queryparam: if_login_param, cb?: (ret: ifLoginCheckRet, queryparam: if_login_param) => void) {
        var ret;
        var info = queryparam.sdwInfo;

        let logintype = AppUnit.get_sdk_type(info.appid);

        // 这里需要对数据进行操作验证一下
        let fobid = GameVerMgr.inst.check_login_limit(queryparam.uid, queryparam.sdwInfo ? queryparam.sdwInfo.pub_ver : 0, queryparam._sys_.plt);
        if (fobid) {
            ret = fobid;
        }
        else if (logintype == 'sdwsdk') {
            if (SeLoginCheck.singcheck1(info) != info.sign && SeLoginCheck.singcheck2(info) != info.sign && !configInst.get('cheatmode')) {
                ret = 'signerr';
            }
            else {
                ret = 'success';
            }
        }
        else if (logintype == 'dhsdk') {
            return this.app_login(queryparam, cb)
        }

        return this._on_sign_check_end(ret, queryparam, cb);
    }

    private static _on_sign_check_end(ret: string, queryparam: if_login_param, cb: Function) {
        let info: loginInfo = queryparam.sdwInfo;
        var out = { type: ret, uid: parseInt(info.uid), token: info.sign };
        if (cb) {
            var ccb = {
                cb: cb,
                out: out,
                queryparam: queryparam
            }
            this._forbiddenCheck(out.uid, (bLock: boolean, _ccb: ifFunction_lock, un_time: number) => {
                if (bLock) {
                    _ccb.out.type = 'lock';
                    _ccb.out.un_lock_time = un_time;
                }
                _ccb.queryparam.type = _ccb.out.type;
                _ccb.cb(_ccb.out, _ccb.queryparam);
            }, ccb);
        }
    }

    private static _nameCatche: Object = {};

    static ConvertId(account: string) {
        var md5sum: Hash = createHash('md5');
        var md5sign: Hash = md5sum.update(account);
        var md5str: string = md5sign.digest('hex');
        var idstr = '';
        for (var i = 8; i < 24; i++) {
            var a = md5str.charCodeAt(i)
            var b = a - '0'.charCodeAt(0);
            if (b > 9) {
                b = a - 'a'.charCodeAt(0) + 1;
            }
            idstr += b.toString();
        }
        return idstr;
    }

    public static onAccount(queryparam: if_login_param, cb?: (ret: ifLoginCheckRet, queryparam: if_login_param) => void) {
        if (!configInst.get('local')) {
            return;
        }
        var account: string = queryparam.account;
        var linkid: string = queryparam.linkid;
        var clientid: string = queryparam.clientid;

        var idstr = SeLoginCheck.ConvertId(account);

        if (!this._nameCatche.hasOwnProperty(idstr)) {
            this._nameCatche[idstr] = [account];
        }
        else if (this._nameCatche[idstr].indexOf(account) < 0) {
            this._nameCatche[idstr].push(account);

            writeFileSync('accounts', JSON.stringify(this._nameCatche, null, 4));
        }
        let fobid = GameVerMgr.inst.check_login_limit(parseInt(idstr), queryparam.sdwInfo ? queryparam.sdwInfo.pub_ver : 0, queryparam._sys_.plt);

        var out: ifLoginCheckRet = { type: fobid || 'success', uid: parseInt(idstr), token: idstr };
        // queryparam.uid = out.uid;

        if (cb) {
            queryparam.uid = out.uid;
            var ccb = {
                cb: cb,
                out: out,
                queryparam: queryparam
            }

            this._forbiddenCheck(out.uid, (bLock: boolean, _ccb: ifFunction_lock, un_time: number) => {
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
    private static _forbiddenCheck(uid: number, cb: (bLock: Boolean, bidnInfo: Object, ...args) => void, extInfo: object) {
        var db = redistInst.getHashMember('accountinfo', uid.toString());
        db.load(this._forbiddenCheckRet.bind(this, cb, extInfo));
    }

    private static _forbiddenCheckRet(cb: (bLock: Boolean, extInfo: any, ...args) => void, extInfo, err: string, db: ReHashMember) {
        var uid = parseInt(db.subKey);
        var info = <ifLockInfo>db.value;
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

        if (cb) cb(bLock, extInfo, unlockTime);
    }

    public static gmLockUnlock(uid: number, lockType: LockType, cb: Function) {
        var db = redistInst.getHashMember('accountinfo', uid.toString());
        db.load(this._gmLockUnlockEnd.bind(this, lockType, cb));
    }

    private static _gmLockUnlockEnd(lockType: LockType, cb: Function, err: string, db: ReHashMember) {
        var uid = parseInt(db.subKey);
        var info = <ifLockInfo>db.value;
        if (!info) {
            info = <ifLockInfo>{
                lockType: lockType,
                lockTime: 0
            };
        }

        info.lockType = lockType;
        switch (info.lockType) {
            case LockType.TimeLock: info.lockTime = Date.now() + 3 * 24 * 60 * 60 * 1000; break;
            case LockType.NormalLock:
            case LockType.NULL: info.lockTime = 0; break;
        }

        db.save(info);

        cb && cb(uid);
    }


    /** 为了增加一个选服的时候玩家是否登陆过的统计，所以要增加一套类似账号系统的功能，这里记录玩家登陆过的大区和角色信息，记录玩家登陆的时间*/

    /**
     * 获取玩家信息
     */
    static get_account_info(account: string, cb: (roles: { [plt: string]: { role: { lvl: number, name: string }, time: number } }) => void) {
        this._load_account_info(account, function (db, value) {
            cb(value || {});
        })
    }

    /**
     * 保存玩家信息
     * @param account 
     * @param plt 
     * @param role 
     */
    static cache_account_info(account: string, plt: string, role: { lvl: number, icon: string, name: string }) {
        this._load_account_info(account, function (db, value) {
            db.save(plt, { role: role, time: Date.now() });
            // 防止垃圾数据堆积，这里设置一个40天的有效期，这样可以有效的减少垃圾数据
            db.timeOut = 40 * 24 * 60 * 60;
        })
    }

    private static _load_account_info(account: string, cb: (db: ReHash, value: any) => void) {
        let gamerole = redistInst.getHash("ddms_account_" + account);
        gamerole.load(function (succ, db) {
            if (succ && db.value) {
                cb(db, db.value);
            }
            else {
                cb(db, null);
            }
        })
    }
}