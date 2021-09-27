Array.prototype['shuffle'] = function () {
    for (var j, x, i = this.length; i; j = parseInt((Math.random() * i).toString()), x = this[--i], this[i] = this[j], this[j] = x);
    return this;
};

/**
 * 玩家连接的服务器，会同时部署多个处理玩家的数据
 */
import { configInst } from './lib/TeConfig';

import { netInst } from './NetMgr/SeNetMgr';
import { Match_Proc } from './NetMgr/matchProc';
import { redistInst } from './lib/TeRedis';
import { error_post } from './httppost';
import * as fs from 'fs';
import { Log_Proc } from './NetMgr/logProc';
import { guildService } from './mgr2/mgrServices/guildService';
console.log(new Date());
console.error(new Date());

process.on('uncaughtException', function (err) {
    error_post('Caught exception: ' + err.message + '\n' + (err.stack || ''));
    fs.writeFileSync('./runtime.log', err + '\n', { flag: 'a+' });
});

configInst.registDefault({
    plt: 'none',
    lsMgr: { url: "http://127.0.0.1:17001" },
    mxrace: 300
})

var nodes = configInst.get('dbconf.nodes');
if (!nodes) {
    nodes = [{ port: configInst.get('dbconf.port'), host: configInst.get('dbconf.ip') }]
}
redistInst.init(nodes, configInst.get('dbconf.select'), configInst.get('dbconf.flag'));

var ready = false;

redistInst.on('ready', () => {
    if (ready) return;
    ready = true;
    netInst.listen('server', configInst.get('listenport'), configInst.get('listenflags'));
    guildService.init();
    // Match_Proc.FINISH();
    Match_Proc.BEGIN();
    // Log_Proc.FINISH();
    Log_Proc.BEGIN();
    
    netInst.connect('ls', configInst.get('lsMgr.url'));
});

// log_mysqlInst.init();