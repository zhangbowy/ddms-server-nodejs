import { ProcMgr } from './TeProc';
import { gm_query_process } from '../logmgr/QueryProcess';
import { NetEvent, netInst } from './SeNetMgr';
import { configInst } from '../lib/TeConfig';

export var Log_Proc = new ProcMgr(__filename, netInst, 'ls');

Log_Proc.regist_proc(NetEvent.connected, function (nid: string) {
    var data = {
        cmd: 'regist',
        passwd: 'chenkai',
        type: 'ls',
        id: configInst.get('serverid'),
    };

    netInst.sendData(data, nid);
}, __filename);

// Log_Proc.regist_proc('addlog', log_mysqlInst.log_process.bind(log_mysqlInst), 'server');
Log_Proc.regist_proc('log_query', gm_query_process, __filename);
// Log_Proc.regist_proc('update', dailyReportInst.update.bind(dailyReportInst), 'local');