import { netInst, NetEvent } from './SeNetMgr';
import { ProcMgr } from './TeProc';
import { join } from 'path';
import { chartInst } from '../mgr/chartMgr';
import { configInst } from '../lib/TeConfig';
import { syncInst } from '../mgr/SyncMgr';
import { toy_mgr } from './chartProc';

export var Log_Proc = new ProcMgr(join(__dirname, __filename));

Log_Proc.regist_proc(NetEvent.connected, function (nid: string) {
    var data = {
        cmd: 'regist',
        passwd: 'chenkai',
        type: 'cts',
    };

    netInst.sendData(data, nid);
}, 'ls');


Log_Proc.regist_proc("war_zone_infos", function (nid: string, data: { gmid: string, plt: string } | any) {
    var infos = chartInst.getWarZoneInfos(data.plt);
    // console.log(infos);
    var para = {
        cmd: 'war_zone_infos_ret',
        gmid: data.gmid,
        infos: infos
    }
    netInst.sendData(para, nid);
}, 'ls');

Log_Proc.regist_proc("chart_delete_uid", function (nid: string, data: { gmid: string, plt: string, uid: number } | any) {
    let push = [];
    try {
        chartInst.delete_all_chart_by_uid(data.plt, data.uid);
    }
    catch (e) {
        push.push(data.uid)
    }
    // console.log(infos);
    var para = {
        cmd: 'chart_delete_uid_ret',
        gmid: data.gmid,
        infos: push
    }
    netInst.sendData(para, nid);
}, 'ls');

/**
 * 获取榜单前多少名的信息
 */
Log_Proc.regist_proc("chart_info", function (nid: string, data: { gmid: string, plts: string[], charttype: number[], len: number } | any) {
    let charinfos = chartInst.QueryRanks(data.plts, data.charttype, data.len, data.sid);
    netInst.sendData({
        cmd: 'chart_info_ret',
        gmid: data.gmid,
        infos: charinfos
    }, nid);
}, 'ls');

/**
* 获取阵营信息
*/
Log_Proc.regist_proc("toy_info", function (nid: string, data: { gmid: string, plts: string[], charttype: number[], len: number } | any) {
    if(!toy_mgr.ready) return;
   netInst.sendData({
       cmd: 'toy_info_ret',
       gmid: data.gmid,
       infos: toy_mgr.toy_info
   }, nid);
}, 'ls');

/**
* 修改阵营信息
*/
Log_Proc.regist_proc("settoyinfo", function (nid: string, data: { gmid: string, index: number, type: string, info: Object, plt: string }) {
    if(!toy_mgr.ready) return;
    switch(data.type){
        case "progress": 
            toy_mgr.toy_info[data.index]['progress'] = Number(data.info);
            break;
        case "add_progress": 
            toy_mgr.toy_info[data.index]['add_progress'] = Number(data.info);
            break;
        default:
            break;
    }
   
}, 'ls');
/**
 * 获取榜单前多少名的信息
 */
Log_Proc.regist_proc("chart_clear", function (nid: string, data: { gmid: string, plts: string[], charttype: number[] } | any) {
    let charinfos = chartInst.onClearRanks(data.plts, data.charttype);
    netInst.sendData({
        cmd: 'chart_clear_ret',
        gmid: data.gmid,
        infos: charinfos
    }, nid);
}, 'ls');

