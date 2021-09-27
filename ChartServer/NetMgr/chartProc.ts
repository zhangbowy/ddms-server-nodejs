import { netInst, NetEvent } from './SeNetMgr';
import { serverMgrInst, DefineSType } from '../mgr/serverMgr';
import { chartInst } from '../mgr/chartMgr';
import { ProcMgr } from './TeProc';
import { join } from 'path';
import { resMgrInst } from '../mgr/SeResMgr';
import { configInst } from '../lib/TeConfig';
import { syncInst } from '../mgr/SyncMgr';
import { SeToyMgr } from '../ChartMgr/SeToyMgr';

export var Chart_Proc = new ProcMgr(join(__dirname, __filename));

export var toy_mgr = new SeToyMgr();

Chart_Proc.regist_proc(NetEvent.connected, function (nid: string) {
    netInst.addCheckLink(nid);
});

Chart_Proc.regist_proc(NetEvent.disconnect, function (nid: string) {
    // var rs = serverMgrInst.find_server(nid);
    serverMgrInst.del_server(nid);
    // netInst.addCheckLink(nid);
});

Chart_Proc.regist_proc('regist', function (nid: string, data: { type: string, plt: string, id: string, url: string }) {
    if (data.type == DefineSType.logic) {
        serverMgrInst.add_server(data.type, data.plt, nid, data.id, data.url);
        netInst.delCheckLink(nid);
        netInst.sendData({ cmd: 'registret', type: true }, nid);

        resMgrInst.registPlt(data.plt);
        chartInst.registPlt(data.plt);
        toy_mgr.notice_toy_info();
    }
    else {
        netInst.sendData({ cmd: 'registret', type: false }, nid);
    }
});


Chart_Proc.regist_proc('addlevelchart', function(nid: string, data: { data: Array<any> }) {
    chartInst.addPlayerChart(nid, data['_sys_'], ...data.data);
});

Chart_Proc.regist_proc('getlevelchart',function(nid: string, data: { data: Array<any> }) {
    chartInst.onGetScoreChart(nid, data['_sys_'], ...data.data);
});

Chart_Proc.regist_proc('gethistorylevelchart',function(nid: string, data: { data: Array<any> }) {
    chartInst.onGetHistoryScoreChart(nid, data['_sys_'], ...data.data);
});

Chart_Proc.regist_proc('queryrank',function(nid: string, data: { data: Array<any> }) {
    chartInst.onQueryRanks(nid, data['_sys_'], ...data.data);
});

Chart_Proc.regist_proc('queryinfo',function(nid: string, data: { data: Array<any> }) {
    chartInst.onQueryInfo(nid, data['_sys_'], ...data.data);
});

Chart_Proc.regist_proc('getgroupid',function(nid: string, data: { data: Array<any> }) {
    chartInst.onGetGenGroupId(nid, data['_sys_'], ...data.data);
});

Chart_Proc.regist_proc('cheat',function(nid: string, data: { data: Array<any> }) {
    chartInst.cheatMsg(nid, data['_sys_'], ...data.data);
});


Chart_Proc.regist_proc('giveDayReward',function(nid: string, data: { data: Array<any> }) {
    chartInst.onGiveDayReward(nid, data['_sys_'], ...data.data);
});

Chart_Proc.regist_proc('giveDayCrossReward',function(nid: string, data: { data: Array<any> }) {
    chartInst.onGiveDayCrossReward(nid, data['_sys_'], ...data.data);
});

Chart_Proc.regist_proc('giveSeasonReward',function(nid: string, data: { data: Array<any> }) {
    chartInst.onGiveSeasonReward(nid, data['_sys_'], ...data.data);
});


Chart_Proc.regist_proc('giveSeasonCrossReward',function(nid: string, data: { data: Array<any> }) {
    chartInst.onGiveSeasonCrossReward(nid, data['_sys_'], ...data.data);
});

Chart_Proc.regist_proc('sync_data',function(nid: string, data: { data: Array<any> }) {
    if(configInst.get('mysql')){
        if(ProcMgr.sync_all_count == 0){
            syncInst._sync();
            ProcMgr.sync_all_count = 1;
        }
    }
});

Chart_Proc.regist_proc('load_data',function(nid: string, data: { data: Array<any> }) {
    if(configInst.get('mysql')){
        if(ProcMgr.load_all_count == 0){
            syncInst._load();
            ProcMgr.load_all_count = 1;
        }
    }
});

//阵营对抗
Chart_Proc.regist_proc('join_camp', function (nid: string, data: {uid: number, id: number, totcharge: number}) {
    if(!toy_mgr.ready) return;
    toy_mgr.join_camp(data.uid, data.id, data.totcharge)
});

Chart_Proc.regist_proc('contribute', function (nid: string, data: {uid: number, id: number, count: number}) {
    if(!toy_mgr.ready) return;
    toy_mgr.contribute(data.uid, data.id, data.count)
});

//诸侯伐董
Chart_Proc.regist_proc('changepvepkformation',function(nid: string, data: { seasonid: string, uid: number, formation: object, pve_pk_extra_info: object }) {
    chartInst.changePvePKFormation(nid, data['_sys_'], data.seasonid, data.uid, data.formation, data.pve_pk_extra_info);
});

Chart_Proc.regist_proc('pve_pk_refresh',function(nid: string, data: { charid: number, indexs: number[], rank: number, except: Array<{id: number, igroup: string}> }) {
    chartInst.pvePkRefresh(nid, data['_sys_'], data.charid, data.indexs, data.rank, data.except);
});

Chart_Proc.regist_proc('check_last_one',function(nid: string, data: { charid: number, type: number, info: {}, season_id: string, opp_name: string}) {
    chartInst.checkLastOne(nid, data['_sys_'], data.charid, data.type, data.info, data.season_id, data.opp_name);
});
Chart_Proc.regist_proc('checkFight',function(nid: string, data: {  charid: number, igroup: string, opp_id: number, opp_igroup: string, index: number}) {
    chartInst.checkFight(nid, data['_sys_'], data.charid, data.igroup, data.opp_id, data.opp_igroup, data.index);
});