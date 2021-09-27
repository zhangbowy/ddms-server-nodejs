"use strict";
/**
 * 数据同步服务器
 */
Object.defineProperty(exports, "__esModule", { value: true });
console.log(new Date());
console.error(new Date());
const fs = require("fs");
const TeMysql_1 = require("./lib/TeMysql");
const TeRedis_1 = require("./lib/TeRedis");
const TeConfig_1 = require("./lib/TeConfig");
const TeLog_1 = require("./lib/TeLog");
const SeNetMgr_1 = require("./NetMgr/SeNetMgr");
const syncMgr_1 = require("./MainMgr/syncMgr");
const syncProc_1 = require("./NetMgr/syncProc");
if (!checkConf('./syncconf/'))
    process.exit();
process.on('uncaughtException', function (err) {
    TeLog_1.TeLog.error('Caught exception: ' + err.message + '\n' + (err.stack || ''));
});
TeLog_1.TeLog.init(TeConfig_1.configInst.get('logMgr.path'), TeConfig_1.configInst.get('logMgr.level')); //LogLevel.INFO
//实例化需要的syncMgr
var dirs = './syncconf/';
var mgrs = fs.readdirSync(dirs);
for (var i = 0; i < mgrs.length; i++) {
    let jt = fs.readFileSync(dirs + mgrs[i]);
    let mgr = JSON.parse(jt.toString());
    let plt = mgrs[i].split('.')[0];
    let mysqlInst = new TeMysql_1.TeMysql();
    mysqlInst.connect(mgr['mysql']);
    mysqlInst.on('ready', function (plt) {
        TeLog_1.TeLog.info('[' + plt + '] mysql:ready');
    }.bind(undefined, plt));
    let redistInst = new TeRedis_1.TeRedis();
    //mysql连接成功之后开始连接redis
    var nodes = mgr['DBManager']['nodes'];
    if (!nodes) {
        nodes = [{ port: mgr['DBManager']['port'], host: mgr['DBManager']['ip'] }];
    }
    redistInst.init(nodes, mgr['DBManager']['select'], mgr['DBManager']['flag']);
    redistInst.on('ready', function (plt) {
        TeLog_1.TeLog.info('[' + plt + '] redis:ready');
    }.bind(undefined, plt));
    setTimeout(function (mgr, plt, mysqlInst, redistInst) {
        syncMgr_1.SyncMgr.instance(plt).init(TeConfig_1.configInst.get('syncMgr.activeTime'), TeConfig_1.configInst.get('syncMgr.activeDelay'), TeConfig_1.configInst.get('syncMgr.syncTime'), TeConfig_1.configInst.get('syncMgr.liveTime'), mgr['taskNum'], mysqlInst, redistInst, mgr['redisUids'], mgr['redisSyncs']);
    }.bind(undefined, mgr, plt, mysqlInst, redistInst), 10000);
}
syncProc_1.Sync_Proc.FINISH();
syncProc_1.Sync_Proc.BEGIN();
SeNetMgr_1.netInst.listen("server", TeConfig_1.configInst.get('port'), TeConfig_1.configInst.get('flags'));
//启动前的check函数
function checkConf(dirs) {
    //用来校验数据同步的配置, 配置出错, 后果不堪设想
    let mgrs = fs.readdirSync(dirs);
    let mgrinsts = {};
    for (var i = 0; i < mgrs.length; i++) {
        let jt = fs.readFileSync(dirs + mgrs[i]);
        let mgr = JSON.parse(jt.toString());
        let plt = mgrs[i].split('.')[0];
        mgrinsts[plt] = mgr;
        if (!mgr['redisUids']) {
            TeLog_1.TeLog.fatal(plt + " : " + " redis config ['redisUids'] no config");
            return;
        }
        let isexist = false;
        for (let _index in mgr['redisSyncs']) {
            if (mgr['redisSyncs'][_index]['isexist']) {
                isexist = true;
                break;
            }
        }
        if (!isexist) {
            TeLog_1.TeLog.fatal(plt + " : " + " redis config ['redisSyncs.isexist'] no config");
            return;
        }
    }
    for (let plt in mgrinsts) {
        if (plt == 'sdw' || plt == 'qzone')
            continue;
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
                            TeLog_1.TeLog.fatal(plt + " : " + _plt + " redis config [" + pair["rkey"] + "] error");
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
                TeLog_1.TeLog.fatal(plt + " : " + _plt + " mysql config error");
                return false;
            }
        }
    }
    return true;
}
//# sourceMappingURL=app.js.map