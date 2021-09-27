import { netInst } from './NetMgr/SeNetMgr';
import { Chart_Proc, toy_mgr } from './NetMgr/chartProc';
import { logInst } from './mgr/TeLogMgr';
import { TeMysql } from './lib/TeMysql';
import { redistInst } from './lib/TeRedis';
import { configInst } from './lib/TeConfig';
import { chartInst } from './mgr/chartMgr';
import { Log_Proc } from './NetMgr/logProc';
import { syncInst } from './mgr/SyncMgr';
configInst;
logInst.init_path('./logs/');


var nodes = configInst.get('DBManager.nodes') as any[];
if (!nodes) {
    nodes = [{ port: configInst.get('DBManager.port'), host: configInst.get('DBManager.ip') }]
}

redistInst.init(nodes, configInst.get('DBManager.select'), configInst.get('DBManager.flag'));

redistInst.on('ready', function () {
    logInst.log('db:ready');

    netInst.listen("server", configInst.get('port'), configInst.get('flags'));
    netInst.connect('ls', configInst.get('lsMgr.url'));
    
    Chart_Proc.FINISH();
    Chart_Proc.BEGIN();
    Log_Proc.FINISH();
    Log_Proc.BEGIN();
    chartInst.start();
    toy_mgr.start();
});

if(configInst.get('mysql')){
    let mysqlInst = new TeMysql();
    mysqlInst.connect(configInst.get('mysql'));
    mysqlInst.on('ready', function(plt: string) {
        logInst.log('mysql:ready');
    });
    syncInst.init(mysqlInst, redistInst);
}

