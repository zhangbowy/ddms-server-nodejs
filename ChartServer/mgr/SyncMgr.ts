import { logInst } from './TeLogMgr';
import { TeRedis } from '../lib/TeRedis';
import * as zlib from 'zlib';
import { TeMysql} from '../lib/TeMysql';

export class RedisKeyType{
    //用来保存redis中所有的key和type，方便mysql落盘
    //初始化的数据是用来帮助login server用到的数据落盘
    static type_keys: {} = {string: [], hash: ['accountinfo','_gm_account_','gmconfig'], list: [], set: [], zset: []};
    static addKey(type, key){
        let isAdd = false;
        for(let i = 0; i < RedisKeyType.type_keys[type].length; i++){
            if(key == RedisKeyType.type_keys[type][i]){
                isAdd = true;
                break;
            }
        }
        if(!isAdd){
            RedisKeyType.type_keys[type].push(key);
            console.log('add key: ' + key );
        }
    }
}

export class SyncMgr{
    private table_name: string = "redis_chart_value";
    private _mysql_inst: TeMysql;      //TeMysql实例
    private _redis_inst: TeRedis;      //TeRedis实例

    init(mysqlInst: TeMysql, redisInst: TeRedis,) {
        this._mysql_inst = mysqlInst;
        this._redis_inst = redisInst;
        //计算激活定时器的时间点
        var _stamp = new Date().setHours(new Date().getHours() + 1, 0, 0);
        var _timeout = _stamp - Date.now();
        // setTimeout(()=> {
        //     this._load();
        // },5000);
        setTimeout(()=> {
            //同步定时器
            setInterval(this._sync.bind(this), 60*60*1000); //每小时持久化一次
            //立马同步一次
            this._sync();
        }, _timeout);
    }

    public _sync() {
        logInst.log("syncData start.");
        for(var type in RedisKeyType.type_keys){
            var cmdfnt = CmdInfo.query[type];
            for(let i = 0; i< RedisKeyType.type_keys[type].length; i++){
                var key = RedisKeyType.type_keys[type][i];
                var args = cmdfnt(key);
                this._redis_inst.redisClient.send_command(args[0], args[1], function(key, type, error, result) {
                    if (error) {
                        logInst.log(error.stack);
                        return;
                    }
                    if (result && Object.keys(result).length > 0){
                        this._cache(key, result, type);
                    }
                }.bind(this, key, type));
            }
            
            
        }
    }

    private _cache(key, result, type) {
        var datas = JSON.stringify(result);
        var buffer = zlib.deflateSync(Buffer.from(datas));
        var sql = "replace into " + this.table_name + "(rkey, datas, rtype) values(?, ?, ?);";
        this._mysql_inst.queryEx(sql, [key, buffer, type], function(key:string, error, result) {
            if (error) {
                //插入mysql失败
                logInst.log("[" + key + "] syncData error");
                logInst.log(error.stack);
                return;
            }
            // logInst.log("[" + key + "] syncData done");
        }.bind(this, key));
    }

    public _load(){
        logInst.log("load start");
        var sql = "select rkey, datas, rtype from " + this.table_name + ";";
        this._mysql_inst.query(sql, function(error, _result) {
            if (error) {
                logInst.log("loadData error");
                logInst.log(error.stack);
                return;
            }
            for(let i = 0; i<_result.length;i++){
                let rkey = _result[i]['rkey'];
                let rtype = _result[i]['rtype'];
                let buffer =  zlib.inflateSync(_result[i]['datas']);
                var data = JSON.parse(buffer.toString());
                this._insert_redis(rkey, rtype, data);
            }
        }.bind(this));
    }

    private _insert_redis(rkey, rtype, rdata){
        var cmdfnt = CmdInfo.insert[rtype];
        var args = cmdfnt(rkey, rdata);
        this._redis_inst.redisClient.send_command(args[0], args[1],function(args, error, result){
            if (error) {
                logInst.log("insert_redis error :" + args[0]);
                logInst.log("insert_redis error :" + args[1]);
                return;
            }
            logInst.log("insert "+ args[1][0] +" done");
        }.bind(this, args));
    }
}
export var syncInst = new SyncMgr();

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
            for(let i = 0; i < values.length; i=i+2){
                let temp = values[i];
                values[i] = values[i+1];
                values[i+1] = temp;
            }
            values.unshift(rkey)
            return ['zadd', values];
        }
    };
}

export function objToArray(obj: Object) {
    var out_arr = []
    for (var key in obj) {
        out_arr.push(key);
        out_arr.push(obj[key]);
    }

    return out_arr;
}