/**
 * 玩家连接的服务器，会同时部署多个处理玩家的数据
 */
import Global = NodeJS.Global;
import { configInst } from './lib/TeConfig';
import { resMgrInst } from './ResMgr/SeResMgr';
import { PLAYER_BEGIN } from './NetMgr/netProc';
import { netInst } from './NetMgr/SeNetMgr';
import { MATCH_BEGIN } from './NetMgr/matchProc';
import * as fs from 'fs';
import { error_post } from './httppost';

process.on('uncaughtException', function (err) {
    error_post('Caught exception: ' + err.message + '\n' + (err.stack || ''));
});

export interface DBConfig {
    ip: string;
    port: number;
    passwd: string;
}

resMgrInst.init();

configInst.registDefault({
    plt:'sdw'
})


if (configInst.has("procxy")) {
    netInst.listen('player', configInst.get('port'), configInst.get('flags'), configInst.get("procxy"));
}
else {
    netInst.listen('player', configInst.get('port'), configInst.get('flags'), true);
}

netInst.connect('match', configInst.get('matchMgr.url'));
// netMatchInst.init(configInst.get('matchMgr.url'), function () { console.log('ms ready'); });

MATCH_BEGIN();
PLAYER_BEGIN();

