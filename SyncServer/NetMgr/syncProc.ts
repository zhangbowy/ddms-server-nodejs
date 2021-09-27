/**
 * redis和mysql同步模块
 * author zhw
 */

import { SyncMgr } from '../MainMgr/syncMgr';
import { serverMgrInst, Servers } from '../MainMgr/serverMgr';
import { netInst, NetEvent } from './SeNetMgr';
import { ProcMgr } from './TeProc';
import { join } from 'path';
import { TeLog } from '../lib/TeLog';

//------------------------------------------------//

export var Sync_Proc = new ProcMgr(join(__dirname, __filename));

//-------------------------------------------------//


Sync_Proc.regist_proc(NetEvent.connected, function(nid: string) {
    netInst.addCheckLink(nid);
});

Sync_Proc.regist_proc(NetEvent.disconnect, function(nid: string) {
    var rs = serverMgrInst.find_server(nid);
    serverMgrInst.del_server(nid);
    // netInst.addCheckLink(nid);
});


Sync_Proc.regist_proc('regist', function(nid: string, data: { type: string, id: string, url: string, plt: string }) {
    if (Servers.indexOf(data.type) != -1) {
        serverMgrInst.add_server(data.type, nid, data.id, data.url, data.plt);
        netInst.delCheckLink(nid);
        netInst.sendData({ cmd: 'registret', type: true }, nid);
    }
    else {
        netInst.sendData({ cmd: 'registret', type: false }, nid);
    }

    TeLog.info('[' + data.plt + '] ' + data.type + "["+ data.id +"]:ready");
});


Sync_Proc.regist_proc('load_infos', function(nid: string, data: { uid: number, _sys_: {plt: string, serverid: string} }) {
    SyncMgr.instance(data._sys_.plt).load(data.uid.toString(), function(nid: string, error: boolean, uid: string) {
        netInst.sendData( { cmd: 'load_infos_ret', uid: parseInt(uid), status: error}, nid);
    }.bind(undefined, nid));
});

Sync_Proc.regist_proc('offline_save', function(nid: string, data: { uid: number, key: string, datas: string, _sys_: {plt: string, serverid: string} }) {
    SyncMgr.instance(data._sys_.plt).offlineSave(data.uid.toString(), data.key, data.datas);
});

Sync_Proc.regist_proc('get_online_uids_ret', function(nid: string, data: { uids: Array<number>, _sys_: {plt: string, serverid: string} }) {
    SyncMgr.instance(data._sys_.plt).onlineMgr._getOnlineUidsRet(data.uids);
});

//每次进程的生存周期只允许落盘一次，下一次紧急落盘需要重启sync
Sync_Proc.regist_proc('sync_data', function(nid: string, data: { uids: Array<number>, _sys_: {plt: string, serverid: string} }) {
    if(SyncMgr.sync_all_count == 0){
        SyncMgr.sync_data();
        SyncMgr.sync_all_count = 1;
    }
});
