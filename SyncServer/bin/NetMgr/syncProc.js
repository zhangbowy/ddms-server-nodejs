"use strict";
/**
 * redis和mysql同步模块
 * author zhw
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sync_Proc = void 0;
const syncMgr_1 = require("../MainMgr/syncMgr");
const serverMgr_1 = require("../MainMgr/serverMgr");
const SeNetMgr_1 = require("./SeNetMgr");
const TeProc_1 = require("./TeProc");
const path_1 = require("path");
const TeLog_1 = require("../lib/TeLog");
//------------------------------------------------//
exports.Sync_Proc = new TeProc_1.ProcMgr(path_1.join(__dirname, __filename));
//-------------------------------------------------//
exports.Sync_Proc.regist_proc(SeNetMgr_1.NetEvent.connected, function (nid) {
    SeNetMgr_1.netInst.addCheckLink(nid);
});
exports.Sync_Proc.regist_proc(SeNetMgr_1.NetEvent.disconnect, function (nid) {
    var rs = serverMgr_1.serverMgrInst.find_server(nid);
    serverMgr_1.serverMgrInst.del_server(nid);
    // netInst.addCheckLink(nid);
});
exports.Sync_Proc.regist_proc('regist', function (nid, data) {
    if (serverMgr_1.Servers.indexOf(data.type) != -1) {
        serverMgr_1.serverMgrInst.add_server(data.type, nid, data.id, data.url, data.plt);
        SeNetMgr_1.netInst.delCheckLink(nid);
        SeNetMgr_1.netInst.sendData({ cmd: 'registret', type: true }, nid);
    }
    else {
        SeNetMgr_1.netInst.sendData({ cmd: 'registret', type: false }, nid);
    }
    TeLog_1.TeLog.info('[' + data.plt + '] ' + data.type + "[" + data.id + "]:ready");
});
exports.Sync_Proc.regist_proc('load_infos', function (nid, data) {
    syncMgr_1.SyncMgr.instance(data._sys_.plt).load(data.uid.toString(), function (nid, error, uid) {
        SeNetMgr_1.netInst.sendData({ cmd: 'load_infos_ret', uid: parseInt(uid), status: error }, nid);
    }.bind(undefined, nid));
});
exports.Sync_Proc.regist_proc('offline_save', function (nid, data) {
    syncMgr_1.SyncMgr.instance(data._sys_.plt).offlineSave(data.uid.toString(), data.key, data.datas);
});
exports.Sync_Proc.regist_proc('get_online_uids_ret', function (nid, data) {
    syncMgr_1.SyncMgr.instance(data._sys_.plt).onlineMgr._getOnlineUidsRet(data.uids);
});
//每次进程的生存周期只允许落盘一次，下一次紧急落盘需要重启sync
exports.Sync_Proc.regist_proc('sync_data', function (nid, data) {
    if (syncMgr_1.SyncMgr.sync_all_count == 0) {
        syncMgr_1.SyncMgr.sync_data();
        syncMgr_1.SyncMgr.sync_all_count = 1;
    }
});
//# sourceMappingURL=syncProc.js.map