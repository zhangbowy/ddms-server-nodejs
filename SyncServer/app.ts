/**
 * 数据同步服务器
 */

console.log(new Date());
console.error(new Date());

import * as fs from 'fs';

import { TeMysql } from './lib/TeMysql';
import { TeRedis } from './lib/TeRedis';
import { configInst } from './lib/TeConfig';
import { TeDate } from './lib/TeTool';
import { TeLog, LogLevel } from './lib/TeLog';
import { netInst } from './NetMgr/SeNetMgr';
import { SyncMgr } from './MainMgr/syncMgr';
import { Sync_Proc } from './NetMgr/syncProc';


export interface DBConfig {
    ip: string;
    port: number;
    passwd: string;
}

if(!checkConf('./syncconf/')) process.exit();

process.on('uncaughtException', function (err) {
    TeLog.error('Caught exception: ' + err.message + '\n' + (err.stack || ''));
});


TeLog.init(configInst.get('logMgr.path'), configInst.get('logMgr.level')); //LogLevel.INFO

//实例化需要的syncMgr
var dirs = './syncconf/';
var mgrs = fs.readdirSync(dirs);

for (var i = 0; i < mgrs.length; i++) {
    let jt = fs.readFileSync(dirs + mgrs[i]);
    let mgr = JSON.parse(jt.toString());
    let plt = mgrs[i].split('.')[0];

    let mysqlInst = new TeMysql();

    mysqlInst.connect(mgr['mysql']);
    mysqlInst.on('ready', function(plt: string) {
        TeLog.info('[' + plt + '] mysql:ready');
    }.bind(undefined, plt));

    let redistInst = new TeRedis();
    //mysql连接成功之后开始连接redis
    var nodes = mgr['DBManager']['nodes'] as any[];
    if (!nodes) {
        nodes = [{ port: mgr['DBManager']['port'], host: mgr['DBManager']['ip'] }]
    }

    redistInst.init(nodes, mgr['DBManager']['select'], mgr['DBManager']['flag']);
    redistInst.on('ready', function(plt: string) {
        TeLog.info('[' + plt + '] redis:ready');
    }.bind(undefined, plt));

    setTimeout(function(mgr: Object, plt: string, mysqlInst: TeMysql, redistInst: TeRedis) {
        SyncMgr.instance(plt).init(configInst.get('syncMgr.activeTime'), configInst.get('syncMgr.activeDelay'), configInst.get('syncMgr.syncTime'), configInst.get('syncMgr.liveTime'), mgr['taskNum'],
        mysqlInst, redistInst, mgr['redisUids'], mgr['redisSyncs']);       
    }.bind(undefined, mgr, plt, mysqlInst, redistInst), 10000);
}

Sync_Proc.FINISH();
Sync_Proc.BEGIN(); 

netInst.listen("server", configInst.get('port'), configInst.get('flags'));





//启动前的check函数
function checkConf(dirs: string) {
    //用来校验数据同步的配置, 配置出错, 后果不堪设想
    
    let mgrs = fs.readdirSync(dirs);

    let mgrinsts = {}

    for (var i = 0; i < mgrs.length; i++) {
        let jt = fs.readFileSync(dirs + mgrs[i]);
        let mgr = JSON.parse(jt.toString());
        let plt = mgrs[i].split('.')[0];
        
        mgrinsts[plt] = mgr;


        if (!mgr['redisUids']) { TeLog.fatal(plt + " : " + " redis config ['redisUids'] no config"); return; }

        let isexist = false;
        for (let _index in mgr['redisSyncs']) {
            if (mgr['redisSyncs'][_index]['isexist']) {
                isexist = true;
                break;
            }
        }
        if (!isexist) {
            TeLog.fatal(plt + " : " + " redis config ['redisSyncs.isexist'] no config");
            return;
        }
    }

    for (let plt in mgrinsts) {
        if(plt == 'sdw' || plt == 'qzone') continue;
        for (let _plt in mgrinsts) {
            
            //不同平台 redis数据库相同时, key必须不同
            if (plt != _plt 
            && mgrinsts[plt]["DBManager"]["ip"] == mgrinsts[_plt]["DBManager"]["ip"]
            && mgrinsts[plt]["DBManager"]["port"] == mgrinsts[_plt]["DBManager"]["port"]
            && mgrinsts[plt]["DBManager"]["select"] == mgrinsts[_plt]["DBManager"]["select"]) {
                for (let i = 0; i < mgrinsts[plt]["redisSyncs"].length; i++) {
                    let pair = mgrinsts[plt]["redisSyncs"][i];
                    for (let _i = 0; _i < mgrinsts[_plt]["redisSyncs"].length; _i++) {
                        let _pair = mgrinsts[_plt]["redisSyncs"][_i];
                        if (pair["rkey"] == _pair["rkey"]) {
                            TeLog.fatal(plt + " : " + _plt + " redis config ["+ pair["rkey"] +"] error");
                            return false;
                        }
                    }
                }
            }

            //不同平台 mysql数据库相同时, database必须不同
            if (plt != _plt 
                && mgrinsts[plt]["mysql"]["host"] == mgrinsts[_plt]["mysql"]["host"]
                && mgrinsts[plt]["mysql"]["port"] == mgrinsts[_plt]["mysql"]["port"]
                && mgrinsts[plt]["mysql"]["database"] == mgrinsts[_plt]["mysql"]["database"]) {
                    TeLog.fatal(plt + " : " + _plt + " mysql config error");
                    return false;
                }            
        }
    }

    return true;
}
