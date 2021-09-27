"use strict";
/**
 * 玩家连接的服务器，会同时部署多个处理玩家的数据
 */
Object.defineProperty(exports, "__esModule", { value: true });
console.log(new Date());
console.error(new Date());
const TeConfig_1 = require("./lib/TeConfig");
TeConfig_1.configInst.registDefault({ plt: 'sdw' });
const TePlayerLoader_1 = require("./PlayerMgr/TePlayerLoader");
const SeNetMgr_1 = require("./NetMgr/SeNetMgr");
const TeRedis_1 = require("./lib/TeRedis");
const SePlayerMgr_1 = require("./PlayerMgr/SePlayerMgr");
const SeResMgr_1 = require("./ResMgr/SeResMgr");
const SeNetMatch_1 = require("./MatchMgr/SeNetMatch");
const LSMgr_1 = require("./NetMgr/LSMgr");
const SeNetChart_1 = require("./NetMgr/SeNetChart");
const SeNetSync_1 = require("./NetMgr/SeNetSync");
const TeLogMgr_1 = require("./TeLogMgr");
const TeLog_1 = require("./lib/TeLog");
const SeNetGuild_1 = require("./NetMgr/SeNetGuild");
var genmailid = 1;
global.plt = TeConfig_1.configInst.get('plt');
global.getmailid = function () {
    genmailid++;
    return Math.floor(Date.now() / 1000) + 'g' + genmailid;
};
global.logMgr = new TeLogMgr_1.TeLogMgr();
global.logMgr.connectLogServer(TeConfig_1.configInst.get("logMgr.url"));
process.on('uncaughtException', function (err) {
    global.logMgr.log('Caught exception: ' + err.message + '\n' + (err.stack || ''));
});
global.resMgr = SeResMgr_1.SeResMgr.inst;
global.playerMgr = new SePlayerMgr_1.SePlayerMgr();
global.matchMgr = new SeNetMatch_1.SeNetMatch(TeConfig_1.configInst.get('matchMgr.url'), function () { global.logMgr.log('ms ready'); }, false);
global.guildMgr = new SeNetGuild_1.SeNetGuild(TeConfig_1.configInst.get('guildMgr.url'), function () { global.logMgr.log('guild ready'); }, false);
global.globalMgrAll = new SeNetMatch_1.SeNetMatch(TeConfig_1.configInst.get('globalMgr.url-all'), function () { global.logMgr.log('gs-all ready'); }, true);
if (TeConfig_1.configInst.get("usemysql")) {
    TePlayerLoader_1.mysqlLoaderInst.connect(TeConfig_1.configInst.get('mysql'));
    TePlayerLoader_1.mysqlLoaderInst.on('ready', () => {
        global.logMgr.log('mysql:ready');
    });
}
else {
    global.logMgr.log('mysql: no use');
}
var nodes = TeConfig_1.configInst.get('DBManager.nodes');
if (!nodes) {
    nodes = [{ port: TeConfig_1.configInst.get('DBManager.port'), host: TeConfig_1.configInst.get('DBManager.ip') }];
}
// global.countMgrInst = countMgrInst;
TeRedis_1.redistInst.init(nodes, TeConfig_1.configInst.get('DBManager.select'), TeConfig_1.configInst.get('DBManager.flag'));
TeRedis_1.redistInst.on('ready', () => {
    global.playerMgr.init_ready();
    global.logMgr.log('redis:ready');
    // global.countMgrInst.init();
});
TeRedis_1.redistInst.on('dbmonit', (type, info, rate) => {
    if (global.lsMgr) {
        // 暂时不停止服务器，但是会通知gm, 后续版本考录停止登陆服务 减少损失
        global.lsMgr.sendAll({
            cmd: 'up_db_info',
            type: type,
            info: info,
            rate: rate
        });
    }
});
global.chartMgr = new SeNetChart_1.SeNetChart(TeConfig_1.configInst.get('csMgr.url'), () => { console.log('chart success'); });
global.globalChartMgr = new SeNetChart_1.SeNetChart(TeConfig_1.configInst.get('globalCsMgr.url'), () => { console.log('global chart success'); });
global.syncMgr = new SeNetSync_1.SeNetSync(TeConfig_1.configInst.get('ssMgr.url'), () => { console.log('sync success'); });
global.lsMgr = new LSMgr_1.SeLSMgr(TeConfig_1.configInst.get('lsMgr.url'));
console.log(TeConfig_1.configInst.get('lsMgr.url'));
global.lsMgr.on('ready', function (ready, msg, url) {
    global.ready = true;
    console.log('ls ready');
    if (url) {
        global.iconProxy = url + '/icon?url=';
    }
    else {
        global.iconProxy = TeConfig_1.configInst.get('lsMgr.url') + '/icon?url=';
    }
    global.logMgr.log(msg);
    if (!global.netMgr) {
        global.netMgr = new SeNetMgr_1.SeNetMgr(TeConfig_1.configInst.get('port'), TeConfig_1.configInst.get('flags'));
        global.netMgr.zlib_open = true;
    }
});
TeLog_1.Logger.init(TeConfig_1.configInst.get("Log.path"), TeConfig_1.configInst.get("Log.level"));
//# sourceMappingURL=app.js.map