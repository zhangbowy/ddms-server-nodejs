// 拷贝函数 是否包括函数拷贝
import * as IORedis from "ioredis";
import { EventEmitter } from "events";
import { readFile } from "fs";
import { createHash } from "crypto";
import { RedisKeyType } from "../mgr/SyncMgr";

export class RedisSyncType {
    /**
     * k-v string
     * set,value
     */
    static set = "set";

    /**
     * k-v hash
     * hdel,subkey
     */
    static hdel = "hdel";

    /**
    * k-v hash
    * hset,subkey,value
    */
    static hset = "hset";
    /**
  * k-v hash
  * hset,subkey,value,s1,v1,s2,v2...
  */
    static hmset = "hmset";

    /**
     * k-v List
     * splice,index,count
     */
    static splice = "splice";

    /**
     * k-v List
     * pop
     */
    static pop = "pop";
    /**
     * k-v List
     * push,value
     */
    static push = "push";

    /**
     * k-v List
     * lset,index,value
     */
    static lset = "lset";

    /**
     * k-v List
     * ltrim,start,stop
     */
    static ltrim = 'ltrim';
}

var debug = require('debug')('TeRedis');
function func_copy(obj, bFunc = false, dValue?: Object) {
    dValue = dValue || {};
    var out = {};
    if (obj instanceof Array) {
        out = [];
    }

    if (typeof obj == 'object') {
        for (var key in obj) {
            var v = obj[key] || dValue[key];
            if (key == 'clone') {
                continue;
            }
            if (typeof v == 'function' && !bFunc) {
                continue;
            }
            if (v == null) {
                out[key] = null;
            }
            else if (typeof v == 'object') {
                out[key] = func_copy(v, false, dValue[key]);
            }
            else {
                out[key] = v;
            }
        }
    }
    else {
        out = obj || dValue;
    }
    return out;
}

//简单点, 只以源obj的key为基准值
function equal_obj(srcObj: Object, dstObj: Object) {
    for (let key in srcObj) {
        if (!dstObj.hasOwnProperty(key) || dstObj[key] != srcObj[key]) {
            return false;
        }
    }
    return true;
}

export interface ReCallbackT<R> {
    (err: string, res: R): void;
}

/*
 重新写一个redis类用来支持js和redis的交互
 redis 支持几个模式 string,list,sorted set,set,hash
 这里写对应的几个类，用来操作对应的数据
 */

// 这是一个redis的管理模块，负责生成对应的redis对象
export class TeRedis extends EventEmitter {
    private _redisClient: IORedis.Redis;
    private _dbnum: number = 0;
    public ready = false;

    private _switchIndex = 0;
    private dbLinkCfgPool: { list: IORedis.ClusterNode[], dbnum: number, flags: any } = { list: [], dbnum: 0, flags: {} };

    private _redisTimeDiff: number;
    get redisTime() {
        return (Date.now() + this._redisTimeDiff);
    }

    private _redisScripts: Array<ReScript> = [];

    constructor() {
        super();
    }

    init(ports: IORedis.ClusterNode[], dbnum, flags) {
        flags = flags || {}
        if (flags && flags.auth_pass) {
            flags.password = flags.auth_pass;
        }
        flags.db = dbnum;

        this.dbLinkCfgPool.list = ports;
        this.dbLinkCfgPool.dbnum = dbnum;
        this.dbLinkCfgPool.flags = flags;

        this.connect(this.dbLinkCfgPool.list, this.dbLinkCfgPool.dbnum, this.dbLinkCfgPool.flags);

        this.on('ready', () => { });
        this.on('error', (err) => { debug('TeRedis' + err); });
    }

    private onready(err) {
        if (err) {
            this.emit('error', err);
            //debug(err);
        }
        else if (this._dbnum) {
            this._redisClient.select(this._dbnum, (function (err, res) {
                if (!err) {
                    this.ready = true;
                    this._redisClient.send_command('time', [], ((err, data) => {
                        if (err) {
                            this.emit('error', err);
                        }
                        else {
                            this._redisTimeDiff = Date.now() - (data[0] || 0) * 1000;
                            this.emit('ready', err);
                        }
                    }).bind(this));
                }
                else {
                    this.emit('error', err);
                }
            }).bind(this));
        }
        else {
            this.ready = true;
            this.emit('ready', err);
        }
    }
    public connect(list: IORedis.ClusterNode[], dbnum, flags) {
        flags = flags || { connect_timeout: 10000 };
        if (flags && flags.auth_pass) {
            flags.password = flags.auth_pass;
        }
        this._dbnum = dbnum || this._dbnum;
        flags.db = dbnum;
        if (list.length > 1) {
            this._redisClient = new IORedis.Cluster(list, { redisOptions: flags });
        }
        else {
            var one = list[0] as IORedis.NodeConfiguration;
            this._redisClient = new IORedis(one.port, one.host, flags);
        }
        // this._redisClient.connect(this.onready.bind(this));

        this._redisClient.on('ready', this.onready.bind(this));
        this._redisClient.on('reconnecting', function (err, reply) {
            debug('reconnecting' + err + '|' + reply);
        });

        this._redisClient.on('disconnect', (function () {
            this._switchIndex++;
            this.connect(this.dbLinkCfgPool.list, this.dbLinkCfgPool.dbnum, this.dbLinkCfgPool.flags);
            debug('disconnect');
        }).bind(this));

        this._redisClient.on('error', (function (err) {
            // this.emit('error',err);
            debug(err);
        }).bind(this));
    }

    get redisClient(): IORedis.Redis {
        return this._redisClient;
    }

    public getHash(key: string, bindClass?: Function): ReHash {
        var newQuery = new ReHash(this, key, bindClass);
        return newQuery;
    }

    public getString(key: string): ReString {
        var newQuery = new ReString(this, key);
        return newQuery;
    }

    public getList(key: string): ReList {
        var newQuery = new ReList(this, key);
        return newQuery;
    }

    public getHashMember(key: string, subKey: string): ReHashMember {
        subKey = JSON.stringify(subKey);
        var newQuery = new ReHashMember(this, key, subKey);
        return newQuery;
    }

    public getSet(key: string): ReSet {
        var newQuery = new ReSet(this, key);
        return newQuery;
    }

    public getSortedSet(key: string, maxNum: number, desc: boolean = true): ReSortedSet {
        var newQuery = new ReSortedSet(this, key, maxNum, desc);
        return newQuery;
    }

    public eval(file: string, args: Array<any>, callback?: ReCallbackT<any>) {
        var rkScrpt = this._getScript(file);
        rkScrpt.eval(args, callback);
    }

    private _getScript(file: string): ReScript {
        for (var key in this._redisScripts) {
            var obj = this._redisScripts[key];
            if (obj.filename == file) {
                return obj;
            }
        }

        var newScrpt: ReScript = new ReScript(this, file);
        this._redisScripts.push(newScrpt);
        return newScrpt;
    }

    private _pub_ret(err, reply) {
        if (err) {
            debug(err);
        }
    }

    public publish(chanel: string, data: string) {
        this._redisClient.publish(chanel, data, this._pub_ret.bind(this));
    }
}

// 这个是支持lua脚本操作的基本类
export class ReScript {
    constructor(redisClient: TeRedis, file: string) {
        this._redisClient = redisClient.redisClient;
        this.filename = file;
        this._cache = [];
        readFile(this.filename, 'utf8', this._onLoadText.bind(this));
    }

    public eval(args: Array<any>, cb) {
        if (this.err) {
            cb(this.err);
        }
        else {
            if (this.sha1) {
                var oprArgs = [this.sha1].concat(args);
                this._redisClient.evalsha(oprArgs, cb);
            }
            else {
                this._cache.push({ ag: args, cb: cb });
            }
        }
    }

    private _onLoadText(err: NodeJS.ErrnoException, data: string) {
        if (err) {
            // 如果错误了
            this._finish('file err');
            return;
        }
        this._luaText = data;
        this._redisClient.script("EXISTS", this._makeSha1(), this._onRedisExists.bind(this));
    }

    private _finish(err?: string) {
        this.err = err;
        if (this.err) {
            for (var key in this._cache) {
                var obj = this._cache[key];
                obj.cb(this.err);
            }
        }
        else {
            for (var key in this._cache) {
                var obj = this._cache[key];
                this.eval(obj.ag, obj.cb);
            }
        }

        this._cache = [];
        this._sha1 = null;
        this._luaText = null;
    }

    private _makeSha1(): string {
        if (!this._sha1) {
            var sha1 = createHash('sha1');
            sha1.update(this._luaText);
            this._sha1 = sha1.digest('hex');
        }

        return this._sha1;
    }

    private _onRedisExists(err, rep) {
        if (err) {
            this._finish('exists err');
        }
        else {
            if (rep && rep[0]) {
                this.sha1 = this._makeSha1();
                this._finish();
            }
            else {
                // 不存在需要插入一次
                this._redisClient.script("LOAD", this._luaText, this._onRedisLoad.bind(this));
            }
        }
    }

    private _onRedisLoad(err, rep) {
        if (err) {
            this._finish('load faild');
        }
        else {
            this.sha1 = rep;
            this._finish();
        }
    }

    public filename: string;

    protected err: string;
    protected sha1: string;

    private _redisClient: IORedis.Redis;

    ///---------------一下是加载过程中的临时数据---------------------///
    private _luaText: string;// 临时的文本
    private _sha1: string;   // 临时的sha1
    private _cache: Array<{ ag: Array<any>, cb: Function }>;     //值在redis服务器确认初始化的过程中产生的需求
}

// 这里是基础的redis连接类，包含需要的redis接口,操作的时候需要绑定的redis实例
export class ReBase {
    public bNoSave: boolean = false;
    protected _bindClass: any;

    // 传入redis链接的db对象
    constructor(redisClient: TeRedis, key: string, _bindClass?: Function) {
        this._redisClient = redisClient.redisClient;
        this.key = key;
        this._bindClass = _bindClass;
    }

    get redisClient(): IORedis.Redis {
        return this._redisClient;
    }

    set timeOut(time: number) {
        if (this._redisClient) {
            this._redisClient.expire(this.key, time, () => { });
        }
    }

    protected send_command(cmd, arg, callback): boolean {
        if (!this._redisClient) {
            return false;
        }

        if (!this.bNoSave) {
            this.redisClient.send_command(cmd, arg, callback);
        }

        return true;
    }

    protected onError(err) {
        if (err) {
            debug(err);
        }
    }

    protected onError_log(log, err) {
        if (err) {
            debug(err);
            if(log){
                console.error(log);
                console.error('error &&&' + err);
            }
        }
    }

    /**
     * 数据更新时触发的更新消息，这个不支持 ReSet ReSortedSet
     * @param args 
     */
    saveCb(type: RedisSyncType, ...args) { };

    load(cb: Function) { }

    /**
     * 判断是否存在
     */
    isExist(cb: (exist: boolean) => void) {
        this.redisClient.exists(this.key, (function (_cb, err: Error, reply) {
            if (_cb) {
                _cb(reply == 1);
            }
        }).bind(this, cb));
        // this.redisClient.send_command('exists ' + this.key, );
    }

    // 清除所有数据
    clearAll() {
        // this.redisClient.del(this.key, this.onError);
        if (this.redisClient) this.redisClient.del(this.key);
        if (this._isArray) {
            this._value = [];
        }
        else {
            this._value = {};
        }
    }


    private _redisClient: IORedis.Redis;
    public key: string;
    public _value: any;
    protected _isArray: boolean = false;
}

// 基础的key-string 类型
export class ReString extends ReBase {
    /*!
     构造的时候需要传入绑定的key值
     */
    constructor(redisClient: TeRedis, key) {
        super(redisClient, key);
        this._value = 0;
        RedisKeyType.addKey('string', key);
    }

    /**
    * callback: function(bsuccess:boolean,self)
    */
    public load(callback) {
        this.send_command('get', [this.key], this.onload.bind(this, callback));
    }

    private onload(callback, err, reply) {
        this._value = 0;
        if (!err && reply) {
            this._value = func_copy(reply);
        }

        if (callback) {
            callback(!err, this);
        }
    }

    public set(value) {
        value = JSON.stringify(value);
        if (this._value == value) {
            return;
        }
        this._value = value;
        this.send_command('set', [this.key, this._value], this.onError);
        this.saveCb(RedisSyncType.set, value);
    }

    get value() {
        return JSON.parse(this._value);
    }
}

// 列表应该使用的比较少
export class ReList extends ReBase {
    constructor(redisClient: TeRedis, key) {
        super(redisClient, key);
        this._value = [];
        this._isArray = true;
        RedisKeyType.addKey('list', key);
    }

    /**
    * @param callback: function(bsuccess:boolean,self)
    */
    public load(callback) {
        this.send_command('LRANGE', [this.key, 0, -1], this.onload.bind(this, callback));
    }

    private onload(callback, err, reply) {
        this._value = [];
        if (!err && reply) {
            this._value = func_copy(reply);
        }

        if (callback) {
            callback(!err, this);
        }
    }

    public push_back(...values) {
        var dbV = [this.key];
        for (var key in values) {
            var vv = JSON.stringify(values[key]);
            dbV.push(vv);
            this._value.push(vv);
        }

        this.send_command('RPUSH', dbV, this.onError);

        this.saveCb(RedisSyncType.push, dbV.slice(1, dbV.length));
    }

    // public clearAll() {
    //     this.send_command('ltrim', [this.key, 1, 0], this.onError);
    //     this._value = [];
    //     this.saveCb(RedisSyncType.ltrim, 1, 0);
    // }

    find(key: string, findValue: any) {
        var values = this.value;
        for (var i = 0; i < values.length; i++) {
            if (values[i][key] == findValue) {
                return { index: i, value: values[i] };
            }
        }

        return null;
    }

    public pop_front() {
        this.send_command('LPOP', [this.key], this.onError);
        this.saveCb(RedisSyncType.pop);

        return JSON.parse(this._value.shift());
    }

    public set(index: number, value) {
        if (index >= (<Array<any>>this._value).length) {
            return false;
        }
        value = JSON.stringify(value);
        if (this._value[index] == value) {
            return true;
        }

        this._value[index] = value;
        this.send_command('LSET', [this.key, index, value], this.onError);
        this.saveCb(RedisSyncType.lset, index, value);
        return true;
    }

    public Del(value) {
        value = JSON.stringify(value);
        for (var key in this._value) {
            if (this._value[key] == value) {
                this._value.splice(key, 1);
                this.saveCb(RedisSyncType.splice, key, 1);
                this.send_command('LREM', [this.key, 1, value], this.onError);
                break;
            }
        }
    }

    get value() {
        var out = [];
        for (var key in this._value) {
            out[key] = JSON.parse(this._value[key]);
        }

        return out;
    }
}

export class ReHashMember extends ReBase {
    private subKey: string;
    constructor(redisClient: TeRedis, key: string, subKey: string) {
        super(redisClient, key);
        this.subKey = subKey;
        this._value = null;
        RedisKeyType.addKey('hash', key);
    }

    public load(callback: (succ: boolean, self: ReHashMember) => void) {
        this.send_command('hget', [this.key, this.subKey], this.onload.bind(this, callback));
    }

    private onload(callback, err, reply) {
        this._value = null;
        if (!err && reply) {
            this._value = func_copy(reply);
        }

        if (callback) {
            callback(!err, this);
        }
    }

    public save(value): boolean {
        value = JSON.stringify(value);

        if (this._value == value) {
            return true;
        }
        this._value = value;
        this.send_command('hset', [this.key, this.subKey, value], this.onError);
        this.saveCb(RedisSyncType.hset, this.subKey, value);
        return true;
    }

    get value() {
        try {
            return JSON.parse(this._value);
        }
        catch (e) {
            return null;
        }
    }

    public del() {
        this.send_command('hdel', [this.key, this.subKey], this.onError);
        this.saveCb(RedisSyncType.hdel, this.subKey);
    }
}

export class SortedSetUnit {
    public score: number = 0;
    public value: { id: string | number , igroup: string};
}

export class ReSortedSet extends ReBase {
    private _maxNum: number = 0;
    private _bDesc: boolean = true;
    private _idPltScore: Object = {};  //{[id_plt: string]: number}

    constructor(redisClient: TeRedis, key, maxNum: number = 0, bDesc: boolean = true) {
        super(redisClient, key);
        this._value = [];
        this._bDesc = bDesc;
        this._maxNum = maxNum;
        this._isArray = true;
        RedisKeyType.addKey('zset', key);
    }

    get maxRank() {
        return this._maxNum;
    }

    get curRank() {
        return this._value.length;
    }

    /**
    * callback: function(bsuccess:boolean,self)
    */
    public load(callback) {
        if (this._bDesc) {
            // if (this._maxNum > 0) {
            //     this.send_command('zrevrange', [this.key, 0, this._maxNum - 1, 'withscores'], this.onload.bind(this, callback));
            // }
            // else {
            this.send_command('zrevrange', [this.key, 0, -1, 'withscores'], this.onload.bind(this, callback));
            // }
        }
        else {
            // if (this._maxNum > 0) {
            //     this.send_command('zrange', [this.key, 0, this._maxNum - 1, 'withscores'], this.onload.bind(this, callback));
            // }
            // else {
            this.send_command('zrange', [this.key, 0, -1, 'withscores'], this.onload.bind(this, callback));
            // }
        }
    }

    private onload(callback, err, reply) {
        this._value = [];
        if (!err && reply) {
            var Unit: SortedSetUnit = null;
            for (var key in reply) {
                if (!Unit) {
                    Unit = new SortedSetUnit();
                    Unit.value = JSON.parse(reply[key]);
                }
                else {
                    if (Unit.value.hasOwnProperty('id') && Unit.value.hasOwnProperty('igroup') && (Unit.value.igroup !='' || Unit.value.id <= 3000)) {
                        let score = parseFloat(reply[key]);
                        Unit.score = score;
                        let idPlt = this.getIdPltByUnit(Unit.value);
                        if (this._idPltScore.hasOwnProperty(idPlt)) {
                            // 表示前面已经出现过了，那么就删除掉这一个
                            this.send_command('zrem', [this.key, JSON.stringify(Unit.value)], this.onError);
                        }
                        else {
                            this._idPltScore[idPlt] = score;
                            this._value.push(Unit);
                        }
                    }
                    else {
                        //对于没有id的无效单位, 直接删除
                        this.send_command('zrem', [this.key, JSON.stringify(Unit.value)], this.onError);
                    }
                    Unit = null;
                }
            }
        }

        if (callback) {
            callback(!err, this);
        }

        //容器超出时做个容错
        while (this._value.length > this._maxNum) {
            let _unit = this._value.pop();
            this.send_command('zrem', [this.key, JSON.stringify(_unit.value)], this.onError);
            delete this._idPltScore[this.getIdPltByUnit(_unit.value)];
        }
    }

    public getIdPltByUnit(value: { id: string | number , igroup: string}){
        return value.id + '_' + value.igroup.split('_')[0];
    }

    public cacheScore(idPlt: string | number, score: number) {
        this._idPltScore[idPlt] = score;
    }

    public getrank(id: string | number, plt: string) {
        var score = this._idPltScore[id + '_' + plt];
        if (!score) {
            // console.log("test1." + id);
            return this.maxRank;
        }
        return this.get_rank_by_score(score, id, plt);
    }

    private get_rank_by_score(score: number, id: string | number, plt?: string) {
        // 先粗略的找到比自己分值小1的位置，然后再精确的找玩家
        var index = orderListFind_v2(this._value, 'score', score, this._bDesc);
        var rank = index < 0 ? 0 : index;
        if (this._bDesc) {
            for (; rank < this._value.length; rank++) {
                var rkUnit: SortedSetUnit = this._value[rank];
                if (rkUnit.score < score) {
                    // console.log(this._value.length + " " + index + " test2." + id);
                    rank = this.maxRank;
                    break;
                }
                if (rkUnit.value.id == id && (!plt || rkUnit.value.igroup.split('_')[0] == plt)) {
                    break;
                }
            }
        }
        else {
            for (; rank < this._value.length; rank++) {
                var rkUnit: SortedSetUnit = this._value[rank];
                if (rkUnit.score > score) {
                    // console.log(this._value.length + " " + index + " test3." + id);
                    rank = this.maxRank;
                    break;
                }
                if (rkUnit.value.id == id && (!plt || rkUnit.value.igroup.split('_')[0] == plt)) {
                    break;
                }
            }
        }
        return rank;
    }

    private _last_check = 0;
    private checkRepeat() {
        // 1分钟执行一次检查
        if (Date.now() - this._last_check < 60 * 1000) {
            return;
        }

        this._last_check = Date.now();
        this._idPltScore = {};
        // 检查一下是否有重复数据 通过id和plt联合查询
        for (let i = 0; i < this._value.length; i++) {
            let r_info = this._value[i] as SortedSetUnit;
            let idPlt = this.getIdPltByUnit(r_info.value);
            if (r_info && r_info.value) {
                if (this._idPltScore.hasOwnProperty(idPlt)) {
                    // 出现过了的就删除掉
                    this.send_command('zrem', [this.key, JSON.stringify(r_info.value)], this.onError);
                    this._value.splice(i, 1);
                    i--;
                }
                else {
                    this._idPltScore[idPlt] = r_info.score;
                }
            }
        }
    }

    private log = '';
    public add(score: number, value: { id: string | number, igroup: string, curr?: number}, out_remove?: boolean, refresh_value?: boolean) {
        if (this._bDesc && value.curr){
            //倒序的话就拿2050年减掉当前时间，不然相同分数时顺序是反的
            value.curr = 2524579200000 - value.curr;
        }
        //诸侯伐董的人机可能需要从榜单删除，哪怕榜单没满
        if(out_remove && score > this._maxNum) {
            this.del(Number(value.id), value.igroup.split('_')[0]);
            return false;
        }
        // 首先和这里规定的最小一名的比较  
        if (this._maxNum > 0) {
            var rkLeastUnit: SortedSetUnit = this._value[this._maxNum - 1];
            if (this._bDesc) {
                // 从大到小排序
                if (rkLeastUnit && rkLeastUnit.score > score) {
                    // 需要插入的比当前最小的都要小就不需要插入了
                    return false;
                }
            }
            else {
                // 从小到大排序
                if (rkLeastUnit && rkLeastUnit.score < score) {
                    // 需要插入的比当前最小的都要大就不需要插入了
                    return false;
                }
            }
        }

        var id = value.id;
        var plt = value.igroup.split('_')[0];
        var value_str = JSON.stringify(value)
        var oldRank: number;
        var oldUnit: SortedSetUnit = null;
        if (this._idPltScore[this.getIdPltByUnit(value)]) {
            oldRank = this.get_rank_by_score(this._idPltScore[this.getIdPltByUnit(value)], id, plt);
            oldUnit = this._value[oldRank];
        }

        //1.检查value详情,2.redis操作
        if (oldUnit) {
            if ((oldUnit.score != score) || (refresh_value && !equal_obj(oldUnit.value, value))) {
                try{
                    var multi: IORedis.Pipeline = this.redisClient.multi();
                    multi.zrem(this.key, JSON.stringify(oldUnit.value));
                    multi.zadd(this.key, score.toString(), value_str);
                    this.log = this.key + '_' + JSON.stringify(oldUnit.value) + '_' + score.toString() + '_' + value_str;
                    multi.exec(this.onError_log.bind(this, this.log));
                    oldUnit.value = value;
                }
                catch(e) {
                    console.error('try catch')
                    console.error(e);
                }
            }
        }
        else {
            this.send_command('zadd', [this.key, score, value_str], this.onError);
        }

        //本地排序,检查新老积分
        if (oldUnit && oldUnit.score == score) {
            return true;
        }

        this._idPltScore[this.getIdPltByUnit(value)] = score;
        //如果存在老单元的话, oldRank和newRank位置互换
        if (oldUnit) {
            this._value.splice(oldRank, 1);
        }

        // 先粗略的找到比自己分值小1的位置，然后再精确的找可以插入的位置
        // var index = orderListFind(this._value, 'score', score + (this._bDesc ? 1 : -1), this._bDesc);
        var index = orderListFind_v2(this._value, 'score', score, this._bDesc);
        var newRank = index < 0 ? 0 : index;
        var newUnit: SortedSetUnit = null;
        if (this._bDesc) {
            for (; newRank < this._value.length; newRank++) {
                newUnit = this._value[newRank];
                if (newUnit.score < score) {
                    break;
                }
            }
        }
        else {
            for (; newRank < this._value.length; newRank++) {
                newUnit = this._value[newRank];
                if (!newUnit) {
                    continue;
                }
                if (newUnit.score > score) {
                    break;
                }
            }
        }

        this._value.splice(newRank, 0, { score: score, value: value });

        //容器超出, 删掉最后一个
        if (this._value.length > this._maxNum) {
            let unit = this._value.pop();
            this.send_command('zrem', [this.key, JSON.stringify(unit.value)], this.onError);
            delete this._idPltScore[this.getIdPltByUnit(unit.value)];
        }

        // 检查一下重复问题
        this.checkRepeat();

        return true;
    }

    public del(id: number, plt: string) {
        var score = this._idPltScore[id + '_' + plt];
        if (!score) {
            return;
        }

        var rank = this.get_rank_by_score(score, id, plt);
        var unit = this._value[rank];
        this.send_command('zrem', [this.key, JSON.stringify(unit.value)], this.onError);
        this._value.splice(rank, 1);

        delete this._idPltScore[id + '_' + plt];

        return true;
    }

    get value() {
        return this._value;
    }



    public getRange(ibegin: number = 0, iend: number = -1) {
        if (this._value.length == 0) {
            return [];
        }

        ibegin = ((ibegin < 0) ? (this._value.length + ibegin) : ibegin);
        if (iend >= this._value.length && this._value.length > 0) {
            iend = this._value.length;
        }

        iend = ((iend < 0) ? (this._value.length + iend) : iend);

        return this._value.slice(ibegin, iend);
    }

    public copy(zset: ReSortedSet) {
        let _in = [];
        let _out = [this.key];
        for (let i in zset._value) {
            let _str = JSON.stringify(zset._value[i].value);
            _in.push(_str);
            _in.push(zset._value[i].score);

            _out.push(zset._value[i].score);
            _out.push(_str);
        }

        this.send_command("zadd", _out, this.onError);
        this.onload(undefined, false, _in);
    }

    public clearAll(){
        this._idPltScore = {};
        super.clearAll();
    }
}



function compareList<T>(a: T, key: string, vlaue: any) {
    if (!a || !a.hasOwnProperty(key)) return false;
    if (a[key] > vlaue) return true;
    return false;
}


/**
 * 开始二分法查找
 * @param list 查找用的列表
 * @param key 查找的单位元素
 * @param value 比较用的数值
 */
function orderListFind<T>(list: Array<T>, key: string, value: any, desc: boolean = false) {
    if (list.length == 0) return 0;
    var small = -1, big = list.length;
    while (true) {
        if (small >= big) {
            return compareList<T>(list[big], key, value) ? small : small + 1;
        }
        else if (small + 1 == big) {
            return small
        }
        else {
            var center = Math.round((small + big) / 2);
            if (desc) {
                compareList<T>(list[center], key, value) ? small = center : big = center;
            }
            else {
                compareList<T>(list[center], key, value) ? big = center : small = center;
            }

        }
    }
}

//原方法在正序时无法查找同分的最左值，故修改
function orderListFind_v2<T>(list: Array<T>, key: string, value: any, desc: boolean = false) {
    if (list.length == 0) return 0;
    var small = 0, big = list.length - 1;
    while (small < big) {
        var center = Math.floor((small + big) / 2);
        if(!desc){
            if(list[center][key] >= value) big =center;
            else small = center + 1;
        }
        else{
            if(list[center][key] <= value) big =center;
            else small = center + 1;
        }
    }
    if(list[big][key] == value) return big;
    return -1;
}


export class ReSet extends ReBase {
    constructor(redisClient: TeRedis, key) {
        super(redisClient, key);
        this._value = {};
        RedisKeyType.addKey('set', key);
    }

    /**
    * callback: function(bsuccess:boolean,self)
    */
    public load(callback) {
        this.send_command('smembers', [this.key], this.onload.bind(this, callback));
    }

    private onload(callback, err, reply) {
        this._value = {};
        if (!err && reply) {
            this._value = func_copy(reply);
        }

        if (callback) {
            callback(!err, this);
        }
    }

    public add(value): boolean {
        value = JSON.stringify(value);
        if (this._value.hasOwnProperty(value)) {
            // 如果存在了就不要再操作进去了
            return true;
        }

        this.send_command('sadd', [this.key, value], this.onError);
        this._value[value] = true;
        return true;
    }

    public has(value) {
        value = JSON.stringify(value);
        if (this._value.hasOwnProperty(value)) {
            // 如果存在了就不要再操作进去了
            return true;
        }
        return false;
    }

    public del(value) {
        //var value = JSON.stringify(value);
        if (!this._value.hasOwnProperty(value)) {
            // 如果存在了就不要再操作进去了
            return true;
        }

        this.send_command('srem', [this.key, value], this.onError);
        delete this._value[value];

        return true;
    }

    get value() {
        var out = {};
        for (var key in this._value) {
            out[JSON.parse[key]] = JSON.parse(this._value[key]);
        }

        return out;
    }
}

export class ifReHash {
    load?(callback);
    reload?(key, callback, ...arg);
    save?(key, value): boolean;
    del?(key): any;
    get?(key): any;
    value?;
}

export class ReHash extends ReBase implements ifReHash {
    constructor(redisClient: TeRedis, key: string, bindClass?: any) {
        super(redisClient, key, bindClass);
        RedisKeyType.addKey('hash', key);
        this._value = {};
        if (bindClass) {
            var o = new bindClass();
            var keys = Object.keys(o);
            for (var ikey in keys) {
                var v_k = keys[ikey];
                Object.defineProperty(this, v_k, {
                    get: (function (v_v, d_v) {
                        return this.get(v_v) || d_v;
                    }).bind(this, v_k, o[v_k]),
                    set: (function (v_v, v) {
                        this.save(v_v, v);
                    }).bind(this, v_k),
                    enumerable: true,
                    configurable: true
                });
                var v = JSON.stringify(o[v_k]);
                this._value[JSON.stringify(v_k)] = v;
            }
        }
    }

    /**
    * callback: function(bsuccess:boolean,self)
    */
    public load(callback) {
        this.send_command('hgetall', [this.key], this.onload.bind(this, callback));
    }

    public reload(key, callback, ...arg) {
        key = JSON.stringify(key);
        this.send_command('hget', [this.key, key], this.onreload.bind(this, callback, key, arg));
    }

    private onreload(callback, key, arg, err, reply) {
        if (!err && reply) {
            this._value[key] = func_copy(reply);
        }

        if (callback) {
            callback(!err, this, arg);
        }
    }

    private onload(callback, err, reply) {
        this._value = {};
        var dv = this._bindClass ? (new this._bindClass()) : {};
        var o = {};
        for (var key in dv) {
            var vv = dv[key];
            if (typeof vv == 'function') {
                continue;
            }
            o[JSON.stringify(key)] = JSON.stringify(dv[key]);
        }
        if (!err && reply) {
            this._value = func_copy(reply, false, o);
        }
        else {
            this._value = o;
        }

        if (callback) {
            callback(!err, this);
        }
    }

    public msave(a: Array<{ k: string, v: any }>) {
        var list = [this.key];
        for (var i = 0; i < a.length; i++) {
            var value = JSON.stringify(a[i].v);
            var key = JSON.stringify(a[i].k);
            if (this._value.hasOwnProperty(key) && this._value[key] == value) {
                continue;
            }
            this._value[key] = value;
            list.push(key);
            list.push(value);
        }
        if (list.length <= 0) return;

        this.send_command('hmset', list, this.onError);
        list.splice(0, 1);
        this.saveCb(RedisSyncType.hmset, ...list);
        return true;
    }

    public save(key, value): boolean {
        value = JSON.stringify(value);
        key = JSON.stringify(key);
        if (this._value.hasOwnProperty(key) && this._value[key] == value) {
            return false;
        }

        this._value[key] = value;
        this.send_command('hset', [this.key, key, value], this.onError);
        this.saveCb(RedisSyncType.hset, key, value);
        return true;
    }

    public del(key: string | string[]): any {
        var delKeys = [];
        if (key instanceof Array) {
            for (var i = 0; i < key.length; i++) {
                var skey = JSON.stringify(key[i]);
                if (!this._value.hasOwnProperty(skey)) {
                    continue;
                }
                delete this._value[skey];

                delKeys.push(skey);
            }
        }
        else {
            key = JSON.stringify(key);
            if (!this._value.hasOwnProperty(key)) {
                return;
            }
            delete this._value[key];
            delKeys.push(key);
        }

        this.send_command('hdel', [this.key, ...delKeys], this.onError);
        this.saveCb(RedisSyncType.hdel, ...delKeys);
    }

    public get(key: string): any {
        key = JSON.stringify(key);
        if (this._value.hasOwnProperty(key)) {
            return JSON.parse(this._value[key]);
        }
        return null;
    }

    get value() {
        var out = {};
        for (var key in this._value) {
            try {
                out[JSON.parse(key)] = JSON.parse(this._value[key]);
            }
            catch (e) {

            }

        }
        return out;
    }
}


// var DB:TeRedis = new TeRedis(6379,'127.0.0.1',1,{"auth_pass":"swdccidfqisadhudgahfioewruqjaisdadjqoj"});
// //DB.connect(6379,'127.0.0.1',15,{"auth_pass":"swdccidfqisadhudgahfioewruqjaisdadjqoj"});
// DB.on('ready',function(){
//    debug('succc');
//    DB.eval("./CityUp.lua",[2,"85001",'"name"'],function(err,req){
//        console.log(err);
//        console.log(req);
//    });
// });



//    var baseInfo:ReHash = DB.getHash('85001');
//    baseInfo.load(function(succ){
//        baseInfo.save('name','chenkai');
//        baseInfo.save('sex','1');
//        baseInfo.save('age',26);
//        debug(baseInfo.get('name'));
//    })

//    var mailList:ReList = DB.getList('m85001');
//    mailList.load(function(succ){
//        //   mailList.push_back('name');
//        //   mailList.push_back('age');
//        //   mailList.push_back('sex');
//        var values = mailList.value;
//        mailList.Del('age');
//    });

//    var chartSort:ReSortedSet = DB.getSortedSet('score',0);
//    chartSort.load(function(succ){
//        var ss = {
//            id:85,
//            name:'chenkai1'
//        };
//        debug(chartSort.getRange(-2,3));
//        debug('------------------');
//        debug(chartSort.getRangeDesc(-2,3));
//        debug('------------------');
//    });

//    var testStr:ReString = DB.getString('tstr');
//    testStr.load(function(succ){
//        testStr.set(1);
//    })
//});


/**
 * redis 频道订阅功能使用的类，订阅中的实例无法再发送 publisch
 */
export class TeChannel extends EventEmitter {
    ready: boolean;
    private _redisClient: IORedis.Redis;

    private listenChannels: Array<string> = [];
    constructor(port, host, flags) {
        super();
        var a: IORedis.ClusterNode = {
            host: host,
            port: port,
        }
        this.connect([a], flags);
    }

    get isListener() {
        if (this.listenChannels.length > 0) {
            return true;
        }

        return false;
    }
    // on(event: 'message', listener: (sub_channel: string, msg_channel: string, data: string) => void): this;
    private connect(links: IORedis.ClusterNode[], flags) {
        flags = flags || { connect_timeout: 10000 };
        if (links.length > 1) {
            this._redisClient = new IORedis.Cluster(links, flags);
        }
        else {
            var one = links[0] as IORedis.NodeConfiguration;
            this._redisClient = new IORedis(one.port, one.host, flags);
        }
        // this._redisClient.connect(this.onready.bind(this));
        this._redisClient.on('ready', this.onready.bind(this));
        this._redisClient.on('reconnecting', function (err, reply) {
            debug('reconnecting' + err + '|' + reply);
        });

        this._redisClient.on('disconnect', (function () {
            debug('disconnect');
        }).bind(this));

        this._redisClient.on('message', this._onMessage.bind(this));
        this._redisClient.on('pmessage', this._onPMessage.bind(this));

        this._redisClient.on('error', (function (err) {
            this.emit('error', err);
            debug(err);
        }).bind(this));

        this._redisClient.on('subscribe', this._sub_.bind(this));
        this._redisClient.on('psubscribe', this._sub_.bind(this));
        this._redisClient.on('unsubscribe', this._unsub_.bind(this));
        this._redisClient.on('punsubscribe', this._unsub_.bind(this));
    }

    private _onMessage(channel: string, data: string) {
        this.emit('message', channel, channel, data);
    }

    private _onPMessage(channel: string, rchannel: string, data: string) {
        this.emit('message', channel, rchannel, data);
    }

    private onready(err) {
        if (err) {
            this.emit('error', err);
            debug(err);
        }
        else {
            this.ready = true;
            this.emit('ready', err);
        }
    }

    private _sub_(channel, count) {
        this.listenChannels.push(channel);
    }

    private _unsub_(channel, count) {
        var index = this.listenChannels.indexOf(channel);
        if (index >= 0) {
            this.listenChannels.splice(index, 1);
        }
    }

    private _sub_unsub_ret(sub, err, reply) {
        if (err) {
            debug(err);
        }
    }

    /**
     * 支持通配符 * 的订阅频道
     * @param chanel 
     */
    public subscribe(chanel: string | Array<string>) {
        if (typeof chanel == 'string') {
            if (chanel.indexOf('*') >= 0) {
                this._redisClient.psubscribe(chanel, this._sub_unsub_ret.bind(this, true));
            }
            else {
                this._redisClient.subscribe(chanel, this._sub_unsub_ret.bind(this, true));
            }

        }
        else if (chanel instanceof Array) {
            var sub = [], psub = [];
            for (var i = 0; i < chanel.length; i++) {
                var aChannel = chanel[i];
                if (!aChannel || aChannel.length == 0) continue;
                if (aChannel.indexOf('*') >= 0) {
                    psub.push(aChannel);
                }
                else {
                    sub.push(aChannel);
                }
            }

            if (sub.length > 0) {
                this._redisClient.subscribe(...chanel);
            }

            if (psub.length > 0) {
                this._redisClient.psubscribe(...chanel);
            }
        }
    }

    /**
    * 支持通配符 * 的取消订阅频道
    * @param chanel 
    */
    public unsubscribe(chanel: string | Array<string>) {
        if (typeof chanel == 'string') {
            if (chanel.indexOf('*') >= 0) {
                this._redisClient.punsubscribe(chanel);
            }
            else {
                this._redisClient.unsubscribe(chanel);
            }

        }
        else if (chanel instanceof Array) {
            var sub = [], psub = [];
            for (var i = 0; i < chanel.length; i++) {
                var aChannel = chanel[i];
                if (!aChannel || aChannel.length == 0) continue;
                if (aChannel.indexOf('*') >= 0) {
                    psub.push(aChannel);
                }
                else {
                    sub.push(aChannel);
                }
            }

            if (sub.length > 0) {
                this._redisClient.unsubscribe(...chanel);
            }

            if (psub.length > 0) {
                this._redisClient.punsubscribe(...chanel);
            }
        }
    }

    private _pub_ret(err, reply) {
        if (err) {
            debug(err);
        }
    }

    quit() {
        this._redisClient.quit((err, state) => {
            if (err) {
                debug(err);
            }
            else {
                this.listenChannels = [];
            }
        })
    }

    /**
     * 如果不在订阅状态下的话，可以推送消息
     * @param chanel 
     * @param data 
     */
    public publish(chanel: string, data: string) {
        if (this.isListener) {
            return false;
        }
        return this._redisClient.publish(chanel, data, this._pub_ret.bind(this));
    }
}

export var redistInst = new TeRedis();

// var sub = new TeChannel(6379, '127.0.0.1', { "auth_pass": "swdccidfqisadhudgahfioewruqjaisdadjqoj" });
// sub.on('ready', () => {
//     console.log('player db ready');

//     sub.subscribe(['ceshi1', 'ceshi2']);

// });

// sub.on('message', (...arg) => {
//     console.log(arg);
//     sub.unsubscribe(arg[0]);
// })

// var pub = new TeChannel(6379, '127.0.0.1', { "auth_pass": "swdccidfqisadhudgahfioewruqjaisdadjqoj" });
// pub.on('ready', () => {
//     console.log('player db ready');
//     setInterval(() => {
//         pub.publish('ceshi1', '你好:' + Date.now());
//     }, 1000);

// });
