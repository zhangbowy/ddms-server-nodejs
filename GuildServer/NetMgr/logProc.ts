import { ProcMgr } from './TeProc';
import { NetEvent, netInst } from './SeNetMgr';
import { configInst } from '../lib/TeConfig';
import { guildService } from '../mgr2/mgrServices/guildService';

export var Log_Proc = new ProcMgr(__filename, netInst, 'ls');

Log_Proc.regist_proc(NetEvent.connected, function (nid: string) {
    var data = {
        cmd: 'regist',
        passwd: 'chenkai',
        type: 'gus',
        id: configInst.get('serverid'),
    };

    netInst.sendData(data, nid);
}, __filename);

/**
* 获取同盟信息
*/
Log_Proc.regist_proc("guild_info", function (nid: string, data: { gmid: string, plts: string[], guild_id: number} | any) {
   netInst.sendData({
       cmd: 'guild_info_ret',
       gmid: data.gmid,
       infos: guildService.guilds.find('id', data.guild_id)
   }, nid);
}, 'ls');

// Log_Proc.regist_proc('addlog', log_mysqlInst.log_process.bind(log_mysqlInst), 'server');
// Log_Proc.regist_proc('log_query', gm_query_process, __filename);
// Log_Proc.regist_proc('update', dailyReportInst.update.bind(dailyReportInst), 'local');