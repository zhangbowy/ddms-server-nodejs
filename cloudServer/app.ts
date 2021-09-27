/**
 * 玩家连接的服务器，会同时部署多个处理玩家的数据
 */

console.log(new Date());
console.error(new Date());

import { configInst } from './lib/TeConfig';
configInst.registDefault({ plt: 'sdw'});

import { mysqlLoaderInst } from './PlayerMgr/TePlayerLoader';
import { SeNetMgr } from './NetMgr/SeNetMgr';
import { redistInst } from './lib/TeRedis';
import { SePlayerMgr } from './PlayerMgr/SePlayerMgr';
import { SeResMgr } from './ResMgr/SeResMgr';
import { SeNetMatch } from './MatchMgr/SeNetMatch';
import { SeLSMgr } from './NetMgr/LSMgr';
import { SeNetChart } from './NetMgr/SeNetChart';
import { SeNetSync } from './NetMgr/SeNetSync';
import Global = NodeJS.Global;
import { TeLogMgr } from "./TeLogMgr";
import { Logger } from './lib/TeLog';
import { SeNetGuild } from './NetMgr/SeNetGuild';

export interface DBConfig {
    ip: string;
    port: number;
    passwd: string;
}

// 这个是负责处理单局开始这类的事情的
export interface iApp extends Global {
    ready: any;
    plt: string;
    logMgr: TeLogMgr;
    resMgr: SeResMgr;
    chartMgr: SeNetChart;
    syncMgr: SeNetSync;
    playerMgr: SePlayerMgr;
    matchMgr: SeNetMatch;
    globalMgrAll: SeNetMatch;
    globalChartMgr: SeNetChart;
    guildMgr: SeNetGuild;
    lsMgr: SeLSMgr;
    netMgr: SeNetMgr;
    getmailid: Function;
    iconProxy: string;
    version: string;
    // countMgrInst: SeCountMgr;
}
declare var global: iApp;

var genmailid = 1;



global.plt = configInst.get('plt');
global.getmailid = function () {
    genmailid++;
    return Math.floor(Date.now() / 1000) + 'g' + genmailid;
};

global.logMgr = new TeLogMgr();
global.logMgr.connectLogServer(configInst.get("logMgr.url"));

process.on('uncaughtException', function (err) {
    global.logMgr.log('Caught exception: ' + err.message + '\n' + (err.stack || ''));
});

global.resMgr = SeResMgr.inst;
global.playerMgr = new SePlayerMgr();

global.matchMgr = new SeNetMatch(configInst.get('matchMgr.url'), function () { global.logMgr.log('ms ready'); }, false);
global.guildMgr = new SeNetGuild(configInst.get('guildMgr.url'), function () { global.logMgr.log('guild ready'); }, false);

global.globalMgrAll = new SeNetMatch(configInst.get('globalMgr.url-all'), function () { global.logMgr.log('gs-all ready'); }, true);

if (configInst.get("usemysql")) {
    mysqlLoaderInst.connect(configInst.get('mysql'));
    mysqlLoaderInst.on('ready', () => {
        global.logMgr.log('mysql:ready');
    });
}
else {
    global.logMgr.log('mysql: no use');
}

var nodes = configInst.get('DBManager.nodes') as any[];
if (!nodes) {
    nodes = [{ port: configInst.get('DBManager.port'), host: configInst.get('DBManager.ip') }]
}

// global.countMgrInst = countMgrInst;

redistInst.init(nodes, configInst.get('DBManager.select'), configInst.get('DBManager.flag'));
redistInst.on('ready', () => {
    global.playerMgr.init_ready();
    global.logMgr.log('redis:ready');

    // global.countMgrInst.init();
});

redistInst.on('dbmonit', (type: string, info: string, rate: number) => {
    if (global.lsMgr) {
        // 暂时不停止服务器，但是会通知gm, 后续版本考录停止登陆服务 减少损失
        global.lsMgr.sendAll({
            cmd: 'up_db_info',
            type: type,
            info: info,
            rate: rate
        })
    }
})

global.chartMgr = new SeNetChart(configInst.get('csMgr.url'), () => { console.log('chart success'); });

global.globalChartMgr = new SeNetChart(configInst.get('globalCsMgr.url'), () => { console.log('global chart success'); });

global.syncMgr = new SeNetSync(configInst.get('ssMgr.url'), () => { console.log('sync success'); });

global.lsMgr = new SeLSMgr(configInst.get('lsMgr.url'));
console.log(configInst.get('lsMgr.url'));
global.lsMgr.on('ready', function (ready, msg, url: string) {
    global.ready = true;
    console.log('ls ready');
    if (url) {
        global.iconProxy = url + '/icon?url=';
    }
    else {
        global.iconProxy = configInst.get('lsMgr.url') + '/icon?url=';
    }
    global.logMgr.log(msg);
    if (!global.netMgr) {
        global.netMgr = new SeNetMgr(configInst.get('port'), configInst.get('flags'));
        global.netMgr.zlib_open = true;
    }
});


Logger.init(configInst.get("Log.path"), configInst.get("Log.level"));