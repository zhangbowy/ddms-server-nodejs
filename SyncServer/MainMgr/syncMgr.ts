/**
 * 同步处理模块(需要mysqlInst和redistInst连接成功)
 */

import { TeMysql } from '../lib/TeMysql';
import { TeRedis } from '../lib/TeRedis';

import { OnlineMgr } from '../MainMgr/onlineMgr';

import { objToArray } from '../lib/TeTool';
import { TeLog } from '../lib/TeLog';
import * as zlib from 'zlib';
import { configInst } from '../lib/TeConfig';

class StructInfo {
    // private _tname: string;
    private _data: Object = {};
    private _exist_keys: Array<string> = [];

    constructor(redisSyncs: Array<{rkey: string, stype: string}>) {
        // var queryStr = 'select * from `'+ tname + '`';
        // mysqlInst.query(queryStr, this._load.bind(this));
        // 解决不了分布式下的 keys *uid 问题, 先写死
        this._load(null, redisSyncs)
    }

    //redis上的结构信息加载, 从mysql中取出
    private _load(error, result) {
        if (error) {
            //万一这里报错, 就不加载了, _data当一个空对象往下执行
            TeLog.error(error.stack);
            return;
        }
        
        if (result && result[0])
        {
            for (var i = 0; i < result.length; i++) {
                var res = result[i];
                if (res.hasOwnProperty('rkey') && res.hasOwnProperty('rtype')) {
                    this._data[res['rkey']] = res['rtype'];
                }
                if (res.hasOwnProperty('rkey') && res['isexist']) {
                    this._exist_keys.push(res['rkey'])
                }
            }
        }
    }

    //返回需要同步的所有结构信息
    get data() {
        return this._data;
    }

    get count() {
        var count = 0;
        for (var key in this._data) {
            count++;
        }
        return count;
    }

    get exist_keys() {
        return this._exist_keys;
    }

    get(rkey: string) {
        return this._data[rkey];
    }


    // set(rkey: string, rtype: string) {
    //     if (this._data[rkey] && this._data[rkey] == rtype) {
    //         return;
    //     }

    //     this._data[rkey] = rtype;
    //     // var sql = "replace into " + this._tname + "(rkey, rtype) values('" + rkey + "','" + rtype + "');";
    //     // mysqlInst.query(sql, function(error, result) {
    //     //     if (error) {
    //     //         TeLog.error(error.stack);
    //     //         //保证数据一致性
    //     //         this._data[rkey] = null;
    //     //     }
    //     // }.bind(this));  
    // }
}

//redis查询命令映射
class CmdInfo {
    static query: Object = {
        'string': function(rkey: string): Array<any> {
            return ['get', [rkey]];
        },
        'hash': function(rkey: string): Array<any> {
            return ['hgetall', [rkey]];
        },
        'list': function(rkey: string): Array<any> {
            return ['lrange', [rkey, 0, -1]];
        },
        'set': function(rkey: string): Array<any> {
            return ['smembers', [rkey]];
        },
        'zset': function(rkey: string): Array<any> {
            return ['zrange', [rkey, 0, -1, 'withscores']];
        }
    };

    static insert: Object = {
        'string': function(rkey: string, value: string): Array<any> {
            return ['set', [rkey, value]];
        },
        'hash': function(rkey: string, values: Object): Array<any> {
            var _values = objToArray(values);
            _values.unshift(rkey)
            return ['hmset', _values];
        },
        'list': function(rkey: string, values: string[]): Array<any> {
            values.unshift(rkey)
            return ['rpush', values];
        },
        'set': function(rkey: string, values: string[]): Array<any> {
            values.unshift(rkey)
            return ['sadd', values];
        },
        'zset': function(rkey: string, values: string[]): Array<any> {
            values.unshift(rkey)
            return ['zadd', values];
        }
    };
}


export class SyncMgr {
    private static _syncMgrs: Object = {};
    public static sync_all_count: number = 0;
    static instance(plt: string) : SyncMgr{
        //单线程下的单例
        if (!this._syncMgrs[plt]) {
            this._syncMgrs[plt] = new SyncMgr(plt);
        }
        return this._syncMgrs[plt];
    }

    //全渠道紧急落盘
    public static sync_data(){
        for(var key in this._syncMgrs){
            this._syncMgrs[key]._sync();
        }
    }
    private _plt = ''; //平台

    private _mysql_inst: TeMysql;      //TeMysql实例
    private _redis_inst: TeRedis;      //TeRedis实例

    private _struct_info: StructInfo;  //目前用到的所有游戏业务redis结构表名

    private _online_uids: OnlineMgr;  //liveTime时间内登陆过的uids管理

    private _task_start_num = 0;  //开始的任务并发数
    private _task_end_num = 0;    //结束的任务并发数(动态)

    private _sync_uids: Array<string> = []; //需要同步的uids(动态)
    private _sync_datas: Object = {};       //需要同步的uid详细数据(动态)

    private _online_tname: string;   //同步的mysql表名 
    private _offline_tname: string;  //未处理的离线数据保存在这个表名

    private _uids_redis_key: string; //保存需要同步的uids集合的list名(redis)

    constructor(plt: string) {
        this._plt = plt;
    }

    get onlineMgr() {
        return this._online_uids;
    }

    init(activeTime: number, activeDelay: number, syncTime: number, liveTime: number, taskNum: number,
        mysqlInst: TeMysql, redisInst: TeRedis, redisUids: string, redisSyncs: Array<{rkey: string, stype: string}>){

        this._mysql_inst = mysqlInst;
        this._redis_inst = redisInst;
        
        this._struct_info = new StructInfo(redisSyncs);
        this._online_uids = new OnlineMgr(this._plt);

        this._task_start_num = taskNum;

        this._online_tname = "redis_online_value";
        this._offline_tname = "redis_offline_value";

        this._uids_redis_key = redisUids;

        //计算激活定时器的时间点
        var _timeout = 0;
        //如果用新的落地策略则下一小时执行
        if(configInst.get('syncMgr.newPolicy')){
            var _stamp = new Date().setHours(new Date().getHours() + 1, 0, 0);
            _timeout = _stamp - Date.now();
        }
        else if (activeTime >= 0) {
            var _stamp = new Date().setHours(activeTime, 0, 0);
            if (_stamp < Date.now()) {
                _stamp = new Date().setHours(activeTime + 24, 0, 0);
            }

            _timeout = _stamp - Date.now();
        }

        
        //为了让测试服只能手动落盘
        if(activeTime != -4){
            setTimeout(()=> {
                if (new Date().getHours() != activeTime) {
                    TeLog.fatal('the currentTime is not ' + activeTime + '!');
                }
    
                //同步定时器
                setInterval(this._sync.bind(this), activeDelay); //一天
                //立马同步一次
                this._sync();
            }, _timeout);
        }
        

        this._online_uids.init(syncTime, liveTime, redisInst, redisUids);
    }

    private _sync() {
        //同步主逻辑
        TeLog.info("[" + this._plt + "] syncData start.");
            
        //开始加载
        this._online_uids.getSyncUids(this._plt, function(syncUids: Array<string>) {
            //赋值
            this._sync_uids = syncUids;
            
            //清空_task_end_num
            this._task_end_num = 0;
            //清空_sync_datas
            this._sync_datas = {};

            //开_task_start_num条任务
            for (var i = 0; i < this._task_start_num; i++) {
                this.__loadDates();
            }
        }.bind(this));
        
    }

    //加载所有的玩家数据列表
    //清空对象的状态逻辑全在这个函数里
    private __loadDates() {
        var uid = this._sync_uids.pop();
        while(uid) {
            //这里需要再校验下,防止处理的这段时间玩家正好登录
            if (this._online_uids.checkSync(uid)) {
                break;
            }
            //逐一处理玩家数据
            uid = this._sync_uids.pop();
        }

        if(uid) {
            this.__loadDate(uid);
        }
        else {
            this._task_end_num++;
            if (this._task_start_num == this._task_end_num) {
                TeLog.info("[" + this._plt + "] syncData end");
            }
        }
    }

    //加载单个玩家的数据信息
    private __loadDate(uid) {
        //初始化玩家原始状态
        this._sync_datas[uid] = {
            tlen: this._struct_info.count,
            clen: 0
        }

        for (var rkey in this._struct_info.data) {
            var rtype: string = this._struct_info.get(rkey);
            if (rtype) {
                this.__cacheData(rkey, uid, null, rtype, function(msg?: string) {
                    if(msg) {
                        TeLog.error(msg);
                    }
                    if(!this._sync_datas[uid]) {
                        return;
                    }
                    this._sync_datas[uid] = null;
                    //执行下一个玩家的数据保存
                    this.__loadDates();
                }.bind(this));
            }
        }
    }

    //缓存单个玩家的单条数据(一个玩家对应多条业务数据)
    private __cacheData(rkey: string, uid: string, error, rtype: string, cb: (msg?: string) => void) {
        //校验
        if (!this._sync_datas[uid]) { return; }
        
        if (error) {
            //万一这里报错, 抛出一条日志, 清除缓存, 结束本次这个玩家数据同步
            cb(error.stack);
            return;
        }

        var cmdfnt = CmdInfo.query[rtype];
        if (!cmdfnt) {
            //万一这里报错, 抛出一条日志, 清除缓存, 结束本次这个玩家数据同步
            cb("CmdInfo.query no data, rtype: " + rtype);
            return;
        }

        var args = cmdfnt(rkey + '_' + uid);
        this._redis_inst.redisClient.send_command(args[0], args[1], function(cb: (msg?: string) => void, error, result) {
            //校验, 回调里面再做一次校验, 防止这个玩家的另外一条业务数据干扰
            if (!this._sync_datas[uid]) { return; }
            
            if (error) {
                cb(error.stack);
                return;
            }

            if (result && Object.keys(result).length > 0) { this._sync_datas[uid][rkey] = result; }
            this._sync_datas[uid]['clen'] = this._sync_datas[uid]['clen'] + 1;

            if (this._sync_datas[uid]['clen'] == this._sync_datas[uid]['tlen']) {
                //可以开始执行同步了
                delete this._sync_datas[uid]['clen'];  // = null;
                delete this._sync_datas[uid]['tlen'];  // = null;
                this.__syncData(uid, cb);
            }
        }.bind(this, cb));
    }

    //同步单个玩家的数据信息
    private __syncData(uid: string, cb: (msg?: string) => void) {
        //关键key校验
        for (var _index in this._struct_info.exist_keys) {
            if(!this._sync_datas[uid][this._struct_info.exist_keys[_index]]) {
                //一旦是异常数据, 同步服就忽略他的同步, 直到业务服重新将他的数据注册到同步服
                // this._redis_inst.redisClient.lrem(this._uids_redis_key, 0, uid);
                this._online_uids.clear(uid);
                cb("[" + this._plt + "] syncData: exist_keys[" + this._struct_info.exist_keys[_index] +"] data is null!!!!...., uid: " + uid);
                return;
            }
        }

        //将object转换成json字符串
        var datas = JSON.stringify(this._sync_datas[uid]);
        // //过滤emoji字符
        // datas = emojiFilter(datas);

        var buffer = zlib.deflateSync(Buffer.from(datas))
        var sql = "replace into " + this._online_tname + "(uid, datas) values(?, ?);";
        this._mysql_inst.queryEx(sql, [uid, buffer], function(uid:string, cb: (msg?: string) => void, error, result) {
            if (error) {
                //一旦插入mysql失败, 本次会放弃这个玩家的数据同步, 等待下次
                cb(error.stack);
                return;
            }

            TeLog.info("[" + this._plt + "] syncData done, uid : " + uid);

            if (this._online_uids.checkLive(uid)) {
                cb();
                return;
            }

            //删除
            this._online_uids.clear(uid);
            //0表示移除所有相同的元素
            this._redis_inst.redisClient.lrem(this._uids_redis_key, 0, uid, function(cb: (msg?: string) => void, error, _result) {
                if (error) {
                    //一旦删除uids的集合失败, 放弃清空redis的操作, 等待下次
                    cb(error.stack);
                    return;
                }
                for (var rkey in this._sync_datas[uid]) {
                    this._redis_inst.redisClient.del(rkey + '_' + uid);
                }

                TeLog.info("[" + this._plt + "] syncData clear, uid : " + uid);
                cb();

            }.bind(this, cb));
        }.bind(this, uid, cb));
    }


    //离线操作数据保存, 一定是list
    //将数据保存在key 或者 this._offline_tname中
    //key必须要上层传入, 这里不做任何业务相关的
    offlineSave(uid: string, key: string, datas: string) {
        this._check_key(uid, 0, function(isexist: boolean) {
            //存在
            if (isexist) {
                this._redis_inst.redisClient.rpush(key + '_' + uid, datas);
            }
            else {
                var buffer = zlib.deflateSync(Buffer.from(datas))
                var sql = "insert into " + this._offline_tname + "(uid, rkey, datas) values(?, ?, ?);";
                this._mysql_inst.queryEx(sql, [uid, key, buffer], function(error, result) {
                    if (error) {
                        TeLog.error(error.stack)
                    }
                });
            }
        }.bind(this));
    }

    //加载数据(将数据恢复到redis)
	//逐个加载, 关键key放在最后一个加载
    private _load_sync_user(uid: string, datas: Array<{rkey: string, rdata: any}>, index: number, cb: (...args: any[]) => void) {
        if(!datas[index]) {
            //完成
            //记录到_online_uids中
            this._online_uids.flush(uid);
            cb(true, uid);
            return;
        }

        var rtype = this._struct_info.get(datas[index].rkey)
        var cmdfnt = CmdInfo.insert[rtype];
        if (!cmdfnt) {
            //万一这里报错, 抛出一条日志, 清除缓存, 结束本次这个玩家数据同步
            TeLog.error(datas[index].rkey + ' is unknown!!!!');
            cb(false, uid);
            return;
        }

        var args = cmdfnt(datas[index].rkey + '_' + uid, datas[index].rdata);
        this._redis_inst.redisClient.send_command(args[0], args[1],
            function(datas: Array<{rkey: string, rdata: any}>, index: number, cb: (...args: any[]) => void, uid: string, error, result) { 
            if (error) {
                TeLog.error(error.stack);
                cb(false, uid);
                return;
            }
            //下一个
            index++;
            this._load_sync_user(uid, datas, index, cb);
        }.bind(this, datas, index, cb, uid));
    }

    //加载数据
    load(uid: string, cb: (...args: any[]) => void) {
        //校验, 一旦这个玩家正在同步, 则不能加载
        if (this._sync_datas[uid]) {
            // cb(false, uid);
            return;
        }

        this._check_key(uid, 0, (function(cb: (...args: any[]) => void, uid: string, isexist: boolean) {  
            //存在
            if (isexist) {
                //刷新到_online_uids中
                this._online_uids.flush(uid);
                cb(true, uid);
                return;
            }

            //load
            TeLog.info("[" + this._plt + "] syncData load start, uid : " + uid);
            var sql = "select rkey, datas from " + this._offline_tname + " where uid='" + uid + "';";
            this._mysql_inst.query(sql, function(cb: (...args: any[]) => void, uid: string, error, _result) {
                if (error) {
                    TeLog.error(error.stack);
                    cb(false, uid);
                    return;
                }

                var __sql = "select datas from " + this._online_tname + " where uid='" + uid + "';";
                this._mysql_inst.query(__sql, function(cb: (...args: any[]) => void, uid: string, error, __result) {
                    if (error) {
                        TeLog.error(error.stack);
                        cb(false, uid);
                        return;
                    }
                    
                    //解压缩, json数据还原成对象
                    if (__result && __result[0]) {
                        var buffer = zlib.inflateSync(__result[0]['datas']);
                        var data = JSON.parse(buffer.toString());

                        //先将离线的数据合入在线的数据中
                        if (_result && _result[0]) {
                            for (var i = 0; i < _result.length; i++) {
                                if (_result[i]['rkey'] && _result[i]['datas']) {
                                    let _datas: string = zlib.inflateSync(_result[i]['datas']).toString();
                                    if (!data[_result[i]['rkey']]) data[_result[i]['rkey']] = [];
                                    data[_result[i]['rkey']].push(_datas);
                                }
                            }
                        }
                        
                        //转成一个数组, 并且将关键key(取第一个key)放在最后一个执行
                        var __datas = [];
                        var __existsKey = this._struct_info.exist_keys[0];
                        for (var rkey in data) {
                            if(rkey != __existsKey) {
                                __datas.push({rkey: rkey, rdata: data[rkey]});
                            }
                        }
                        if(data.hasOwnProperty(__existsKey)) { __datas.push({rkey: __existsKey, rdata: data[__existsKey]}); }
                        this._load_sync_user(uid, __datas, 0, cb);

                        //数据加载完后,将uid同步回_uids_redis_key
                        this._redis_inst.redisClient.lpush(this._uids_redis_key, uid, function(uid:string, error, _result) {
                            if (error) {
                                //一旦删除uids的集合失败, 放弃清空redis的操作, 等待下次
                                TeLog.error(error.stack);
                                return;
                            }
            
                            TeLog.info("[" + this._plt + "] syncData load finish, uid : " + uid);
                        }.bind(this, uid));

                        //清理_offline_tname表
                        var ____sql = "delete from " + this._offline_tname + " where uid='" + uid + "';";
                        this._mysql_inst.query(____sql, function(error, __result) {
                            if (error) {
                                TeLog.error(error.stack);
                                return;
                            }
                        });
                    }
                    else {
                        //假设没有数据返回, 也要默认为true, 走注册流程
                        //记录到_online_uids中
                        this._online_uids.flush(uid);

                        cb(true, uid);
                    }
                }.bind(this, cb, uid));
            }.bind(this, cb, uid));

        }).bind(this, cb, uid));
    }


    //递归check
    private _check_key(uid: string, index: number, cb: (isexist: boolean) => void) {
        if(!this._struct_info.exist_keys[index]) {
            //完成
            cb(true);
            return;
        }

        this._redis_inst.redisClient.exists(this._struct_info.exist_keys[index] + '_' + uid, (function(cb: (isexist: boolean) => void, uid: string, index: number, err: Error, reply) {  
            if(err) {
                TeLog.error(err.stack);
                return;
            }
            //存在
            if(reply == 1) {
                //继续校验
                index++;
                this._check_key(uid, index, cb);
            }
            //不存在
            else {
                //走加载逻辑
                cb(false);
            }
        }).bind(this, cb, uid, index));
    }

}
