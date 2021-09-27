import { TeMysql, MeHash } from '../lib/TeMysql';
import { EventEmitter } from 'events';
import { SeBaseCharInfo, SePvpInfo, RechargeInfo, SeDailyInfo, SeTaskItem, SeShopInfo } from './SePlayerDef';
import { SeCharMailInfo, SeDBInfoHead, SeCharLoadFlag } from "../SeDefine";
import { ReHash, ReList, redistInst } from '../lib/TeRedis';
import { Hash } from 'crypto';
import { Map } from '../TeTool';
import { configInst } from '../lib/TeConfig';

export { ReHash, ReList } from '../lib/TeRedis';
import { iApp } from "../app";
declare var global: iApp;

class dbUnit {
    dbID: number = 0;
    uid: number = 0;
    type: string = '';
    plt: string = 'sdw';
    data = {};
}

function createBindInfo(name: string, t?: any) {
    var obj = (t && new t()) || {};
    var cmdstr_h = 'var ' + name + ' = (function () {\nfunction ' + name + '() {';
    var cmdstr_c = '';
    var cmdstr_e = '}\nreturn ' + name + ';}());\nexports=' + name + ';';

    for (var key in obj) {

        var value = {};
        if (obj[key] instanceof Array) {
            value = JSON.stringify(obj[key]);
        }
        else if (typeof obj[key] == 'string') {
            value = "'" + obj[key] + "'" || "''";
        }
        else if (typeof obj[key] == 'number') {
            value = obj[key] || 0;
        }
        else {
            value = JSON.stringify(obj[key]);
        }

        cmdstr_c += "this." + key + "=" + value + ";\n";
    }

    var s = cmdstr_h + cmdstr_c + cmdstr_e;
    var o = eval(s);
    return o;
}

var NameBindType = {}

NameBindType[SeDBInfoHead.baseInfo] = "ReHash";
NameBindType[SeDBInfoHead.pvpInfo] = "ReHash";
NameBindType[SeDBInfoHead.taskinfo] = "ReHash";
NameBindType[SeDBInfoHead.shopinfo] = "ReHash";

NameBindType[SeDBInfoHead.rechargeInfo] = "ReHashList";
NameBindType[SeDBInfoHead.mailInfo] = "ReList";


class DBBindUnit<T> extends EventEmitter {
    private _mysql: MeHash<T>;
    private _redis: ReHash<T> | ReList<T>;
    private _name: string;

    get redis() {
        return this._redis;
    }

    private _checkKeys: Array<string> = [];
    private _loaded: boolean = false;
    private _mgr: LoaderMgr;

    constructor(mgr: LoaderMgr, uid: string | number, table: string, name: string, hashType: "ReHash" | "ReList" | "ReHashList", plt: string) {
        super();
        this._mgr = mgr;
        uid = uid.toString();
        this._name = name;
        var plt_str = plt;// configInst.get('plt');
        if (plt_str == 'sdw' || plt_str == 'qzone') {
            plt_str = '';
        }
        else {
            plt_str += '_';
        }
        if (this._mgr.ready) {
            this._mysql = this._mgr.getMeHash<T>(plt_str + table, [{ type: "uid", value: uid }, { type: "type", value: name }, { type: 'plt', value: configInst.get<string>('plt') }]);
            this._mysql.bArray = (hashType == "ReList" || hashType == "ReHashList");
        }

        switch (hashType) {
            case "ReHashList":
            case "ReHash": this._redis = DBInst.getHash(plt_str + name + uid); break;
            case "ReList": this._redis = DBInst.getList(plt_str + name + uid); break;
        }
    }

    get db() {
        return this._redis;
    }

    load(checkKey: string) {
        this._checkKeys.push(checkKey);

        this._redis.isExist(this.check_redis.bind(this));
    }

    check_redis(bExist: boolean) {
        if (bExist) {
            this._redis.load(this._loadRedis.bind(this));
        }
        else if (this._mysql) {
            this._mysql.load(this._loadMysql.bind(this));
        }
        else {
            this._finish_(true);
        }
    }

    private _loadMysql(bsucc: boolean) {
        if (this._mysql) {
            if (bsucc) {
                mysql2Redis(this._mysql, this._redis);
                this._finish_(bsucc);
            }
            else {
                throw ('err')
            }
        }
    }

    syncToMysql() {
        if (this._mysql) {
            redis2Mysql(this._redis, this._mysql);
        }
    }

    private _loadRedis(bsucc: boolean) {
        this._finish_(bsucc);
    }

    private _finish_(bsucc: boolean) {
        var checkKey = this._checkKeys.pop() || '';
        this.emit("complete", bsucc, this._name, checkKey);
    }
}

/**
 * 把MySQL的数据拷贝给redis
 * @param msq 
 * @param red 
 */
function mysql2Redis<T>(msq: MeHash<T>, red: ReHash<T> | ReList<T>) {
    var dataMap = new Map(msq.get('data'));
    if (red instanceof ReHash) {
        var values: Array<{ k: string, v: any }> = [];
        var keys = dataMap.keys;
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            values.push({
                k: key,
                v: dataMap.get(key)
            })
        }
        if (values.length > 0) red.msave(values);
        // }
    }
    else {
        var l_values: Array<any> = [];
        // dataMap = new Map(dataMap.get(0));
        var keys = dataMap.keys;
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            l_values.push(dataMap.get(key))
        }
        if (l_values.length > 0) red.push_back(...l_values);
    }
}

/**
 * 把redis的数据拷贝给MySQL 简单的存储，不支持离线变更
 * @param red 
 * @param msq 
 */
function redis2Mysql<T>(red: ReHash<T> | ReList<T>, msq: MeHash<T>) {
    msq.save('data', red.value);
}

export class DBLoader extends EventEmitter {
    uid: string;

    /**
     * 待加载列表
     */
    private _loadList = [];
    /**
     * 存放所有数据的db对象
     */
    private _DBList: Object = {};

    /**
     * 判断加载是否成功
     */
    private _bSucc: boolean = true;

    /**
     * 加载调用的验证key
     */
    private _checkKey: string;

    private _mgr: LoaderMgr;

    constructor(uid: string | number, mgr: LoaderMgr, plt: string) {
        super();
        uid = uid.toString();
        this.uid = uid;
        this._mgr = mgr;

        this._loadList = [];
        this.addDB<SeBaseCharInfo>('userinfo', SeDBInfoHead.baseInfo, "ReHash", plt);
        this.addDB<SePvpInfo>('userinfo', SeDBInfoHead.pvpInfo, "ReHash", plt);
        this.addDB<SeTaskItem>('userinfo', SeDBInfoHead.taskinfo, "ReHash", plt);
        this.addDB<SeShopInfo>('userinfo', SeDBInfoHead.shopinfo, "ReHash", plt);

        this.addDB<RechargeInfo>('userinfo', SeDBInfoHead.rechargeInfo, "ReHashList", plt);
        this.addDB<SeCharMailInfo>('userinfo', SeDBInfoHead.mailInfo, "ReList", plt);
    }

    addDB<T>(table: string, type: string, hashOrList: "ReHash" | "ReList" | "ReHashList", plt: string): DBBindUnit<T> {
        hashOrList = NameBindType[type] || hashOrList;
        var obj = new DBBindUnit<T>(this._mgr, this.uid, table, type, hashOrList, plt);
        obj.on("complete", this.onLoadFinish.bind(this));
        this._DBList[type] = obj;
        return obj;
    }

    /**
     * 这里放入一个从同步服同步redis数据的逻辑, 回复之后在执行开始加载的逻辑
     */
    load() {
        //数据服务syncserver准备
        global.syncMgr.once('loadfinish' + this.uid, (function (status: boolean) {
            if (!status) {
                //注意, 一旦数据准备失败, 直接返回, 会造成玩家登录不了
                //未注册玩家不会进来
                return;
            }

            /**
             * 开始加载
             */
            this._checkKey = Date.now().toString();
            this._bSucc = true;
            this._loadList = [];
            for (var key in this._DBList) {
                var rkDB = <DBBindUnit<any>>this._DBList[key];
                if (rkDB) {
                    this._loadList.push(key);
                    rkDB.load(this._checkKey);
                }
            }
        }).bind(this));

        global.syncMgr.load(parseInt(this.uid));
    }

    onLoadFinish(bsucc: boolean, flag: string, checkKey: string) {
        if (this._checkKey != checkKey) return;
        var index = this._loadList.indexOf(flag);
        if (index < 0) return;

        this._loadList.splice(index, 1);
        if (!bsucc) this._bSucc = false;
        if (this._loadList.length == 0) {
            this._finish(this._bSucc);
        }
    }

    private _finish(bSucc: boolean) {
        this.emit('complete', bSucc);
    }

    public saveInfo() {
        for (var key in this._DBList) {
            var rkDB = this._DBList[key];
            rkDB && rkDB.syncToMysql();
        }
    }

    getDB<T>(type: string) {
        if (this._DBList.hasOwnProperty(type)) {
            return <T>this._DBList[type].db;
        }
        return null;
    }

    // // 操作数据库删除邮件
    // delMail(mailid: string) {

    // }
}

class LoaderMgr extends TeMysql {
    constructor() {
        super();

        this.registTable('userinfo', createBindInfo('dbUnit', dbUnit));
    }

    //内置同步服数据同步, 支持离线
    getLoader(uid: number | string) {
        let plt = configInst.get('plt');
        return new DBLoader(uid, this, plt);
    }

    //只读取本地数据, 不支持离线
    getLoaderUnit<T>(uid: number | string, type) {
        let plt = configInst.get('plt');
        var hashOrList = NameBindType[type] || hashOrList;
        var r = new DBBindUnit(this, uid, "userinfo", type, hashOrList, plt);
        return r.redis;
    }

    checkname(name: string, cb_loaded: Function) {
        DBInst.getHashMember('nameLib', name).load(this.on_check_back.bind(this, name, cb_loaded));
    }

    on_check_back(...args) {
        const [name, cb, err, s] = args;
        cb && cb(name, err, !s.empty);
    }

    renamename(old: string, newname: string, uid: number) {
        old && DBInst.getHashMember("nameLib", old).del();
        newname && DBInst.getHashMember("nameLib", newname).save(uid);
    }

    insertuid(uid: any, plt: string) {
        plt = configInst.get('plt');
        // 把玩家id写入特定写入数据库
        var plt_str = plt;// configInst.get('plt');
        if (plt_str == 'sdw' || plt_str == 'qzone') {
            plt_str = '';
        }
        else {
            plt_str += '_';
        }

        // 按照平台写入数据
        var r = redistInst.getList(plt_str + 'palyer_id_lib');
        r.push_back(uid);
    }
}

export var mysqlLoaderInst = new LoaderMgr();
export var DBInst = redistInst;