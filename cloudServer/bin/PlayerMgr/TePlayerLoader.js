"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBInst = exports.mysqlLoaderInst = exports.DBLoader = exports.ReList = exports.ReHash = void 0;
const TeMysql_1 = require("../lib/TeMysql");
const events_1 = require("events");
const SeDefine_1 = require("../SeDefine");
const TeRedis_1 = require("../lib/TeRedis");
const TeTool_1 = require("../TeTool");
const TeConfig_1 = require("../lib/TeConfig");
var TeRedis_2 = require("../lib/TeRedis");
Object.defineProperty(exports, "ReHash", { enumerable: true, get: function () { return TeRedis_2.ReHash; } });
Object.defineProperty(exports, "ReList", { enumerable: true, get: function () { return TeRedis_2.ReList; } });
class dbUnit {
    constructor() {
        this.dbID = 0;
        this.uid = 0;
        this.type = '';
        this.plt = 'sdw';
        this.data = {};
    }
}
function createBindInfo(name, t) {
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
var NameBindType = {};
NameBindType[SeDefine_1.SeDBInfoHead.baseInfo] = "ReHash";
NameBindType[SeDefine_1.SeDBInfoHead.pvpInfo] = "ReHash";
NameBindType[SeDefine_1.SeDBInfoHead.taskinfo] = "ReHash";
NameBindType[SeDefine_1.SeDBInfoHead.shopinfo] = "ReHash";
NameBindType[SeDefine_1.SeDBInfoHead.rechargeInfo] = "ReHashList";
NameBindType[SeDefine_1.SeDBInfoHead.mailInfo] = "ReList";
class DBBindUnit extends events_1.EventEmitter {
    constructor(mgr, uid, table, name, hashType, plt) {
        super();
        this._checkKeys = [];
        this._loaded = false;
        this._mgr = mgr;
        uid = uid.toString();
        this._name = name;
        var plt_str = plt; // configInst.get('plt');
        if (plt_str == 'sdw' || plt_str == 'qzone') {
            plt_str = '';
        }
        else {
            plt_str += '_';
        }
        if (this._mgr.ready) {
            this._mysql = this._mgr.getMeHash(plt_str + table, [{ type: "uid", value: uid }, { type: "type", value: name }, { type: 'plt', value: TeConfig_1.configInst.get('plt') }]);
            this._mysql.bArray = (hashType == "ReList" || hashType == "ReHashList");
        }
        switch (hashType) {
            case "ReHashList":
            case "ReHash":
                this._redis = exports.DBInst.getHash(plt_str + name + uid);
                break;
            case "ReList":
                this._redis = exports.DBInst.getList(plt_str + name + uid);
                break;
        }
    }
    get redis() {
        return this._redis;
    }
    get db() {
        return this._redis;
    }
    load(checkKey) {
        this._checkKeys.push(checkKey);
        this._redis.isExist(this.check_redis.bind(this));
    }
    check_redis(bExist) {
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
    _loadMysql(bsucc) {
        if (this._mysql) {
            if (bsucc) {
                mysql2Redis(this._mysql, this._redis);
                this._finish_(bsucc);
            }
            else {
                throw ('err');
            }
        }
    }
    syncToMysql() {
        if (this._mysql) {
            redis2Mysql(this._redis, this._mysql);
        }
    }
    _loadRedis(bsucc) {
        this._finish_(bsucc);
    }
    _finish_(bsucc) {
        var checkKey = this._checkKeys.pop() || '';
        this.emit("complete", bsucc, this._name, checkKey);
    }
}
/**
 * 把MySQL的数据拷贝给redis
 * @param msq
 * @param red
 */
function mysql2Redis(msq, red) {
    var dataMap = new TeTool_1.Map(msq.get('data'));
    if (red instanceof TeRedis_1.ReHash) {
        var values = [];
        var keys = dataMap.keys;
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            values.push({
                k: key,
                v: dataMap.get(key)
            });
        }
        if (values.length > 0)
            red.msave(values);
        // }
    }
    else {
        var l_values = [];
        // dataMap = new Map(dataMap.get(0));
        var keys = dataMap.keys;
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            l_values.push(dataMap.get(key));
        }
        if (l_values.length > 0)
            red.push_back(...l_values);
    }
}
/**
 * 把redis的数据拷贝给MySQL 简单的存储，不支持离线变更
 * @param red
 * @param msq
 */
function redis2Mysql(red, msq) {
    msq.save('data', red.value);
}
class DBLoader extends events_1.EventEmitter {
    constructor(uid, mgr, plt) {
        super();
        /**
         * 待加载列表
         */
        this._loadList = [];
        /**
         * 存放所有数据的db对象
         */
        this._DBList = {};
        /**
         * 判断加载是否成功
         */
        this._bSucc = true;
        uid = uid.toString();
        this.uid = uid;
        this._mgr = mgr;
        this._loadList = [];
        this.addDB('userinfo', SeDefine_1.SeDBInfoHead.baseInfo, "ReHash", plt);
        this.addDB('userinfo', SeDefine_1.SeDBInfoHead.pvpInfo, "ReHash", plt);
        this.addDB('userinfo', SeDefine_1.SeDBInfoHead.taskinfo, "ReHash", plt);
        this.addDB('userinfo', SeDefine_1.SeDBInfoHead.shopinfo, "ReHash", plt);
        this.addDB('userinfo', SeDefine_1.SeDBInfoHead.rechargeInfo, "ReHashList", plt);
        this.addDB('userinfo', SeDefine_1.SeDBInfoHead.mailInfo, "ReList", plt);
    }
    addDB(table, type, hashOrList, plt) {
        hashOrList = NameBindType[type] || hashOrList;
        var obj = new DBBindUnit(this._mgr, this.uid, table, type, hashOrList, plt);
        obj.on("complete", this.onLoadFinish.bind(this));
        this._DBList[type] = obj;
        return obj;
    }
    /**
     * 这里放入一个从同步服同步redis数据的逻辑, 回复之后在执行开始加载的逻辑
     */
    load() {
        //数据服务syncserver准备
        global.syncMgr.once('loadfinish' + this.uid, (function (status) {
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
                var rkDB = this._DBList[key];
                if (rkDB) {
                    this._loadList.push(key);
                    rkDB.load(this._checkKey);
                }
            }
        }).bind(this));
        global.syncMgr.load(parseInt(this.uid));
    }
    onLoadFinish(bsucc, flag, checkKey) {
        if (this._checkKey != checkKey)
            return;
        var index = this._loadList.indexOf(flag);
        if (index < 0)
            return;
        this._loadList.splice(index, 1);
        if (!bsucc)
            this._bSucc = false;
        if (this._loadList.length == 0) {
            this._finish(this._bSucc);
        }
    }
    _finish(bSucc) {
        this.emit('complete', bSucc);
    }
    saveInfo() {
        for (var key in this._DBList) {
            var rkDB = this._DBList[key];
            rkDB && rkDB.syncToMysql();
        }
    }
    getDB(type) {
        if (this._DBList.hasOwnProperty(type)) {
            return this._DBList[type].db;
        }
        return null;
    }
}
exports.DBLoader = DBLoader;
class LoaderMgr extends TeMysql_1.TeMysql {
    constructor() {
        super();
        this.registTable('userinfo', createBindInfo('dbUnit', dbUnit));
    }
    //内置同步服数据同步, 支持离线
    getLoader(uid) {
        let plt = TeConfig_1.configInst.get('plt');
        return new DBLoader(uid, this, plt);
    }
    //只读取本地数据, 不支持离线
    getLoaderUnit(uid, type) {
        let plt = TeConfig_1.configInst.get('plt');
        var hashOrList = NameBindType[type] || hashOrList;
        var r = new DBBindUnit(this, uid, "userinfo", type, hashOrList, plt);
        return r.redis;
    }
    checkname(name, cb_loaded) {
        exports.DBInst.getHashMember('nameLib', name).load(this.on_check_back.bind(this, name, cb_loaded));
    }
    on_check_back(...args) {
        const [name, cb, err, s] = args;
        cb && cb(name, err, !s.empty);
    }
    renamename(old, newname, uid) {
        old && exports.DBInst.getHashMember("nameLib", old).del();
        newname && exports.DBInst.getHashMember("nameLib", newname).save(uid);
    }
    insertuid(uid, plt) {
        plt = TeConfig_1.configInst.get('plt');
        // 把玩家id写入特定写入数据库
        var plt_str = plt; // configInst.get('plt');
        if (plt_str == 'sdw' || plt_str == 'qzone') {
            plt_str = '';
        }
        else {
            plt_str += '_';
        }
        // 按照平台写入数据
        var r = TeRedis_1.redistInst.getList(plt_str + 'palyer_id_lib');
        r.push_back(uid);
    }
}
exports.mysqlLoaderInst = new LoaderMgr();
exports.DBInst = TeRedis_1.redistInst;
//# sourceMappingURL=TePlayerLoader.js.map