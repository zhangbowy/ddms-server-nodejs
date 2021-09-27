import { netInst, NetEvent } from './SeNetMgr';
import { serverMgrInst, DefineSType } from '../serverMgr';
import { matchInst } from '../mgr/Pvpv726';
import { ifRecordFile } from '../Protocol';
import { match2v2Inst, match1v2Inst } from '../mgr/TeamMatchMgr';
import { matchPeakInst } from '../mgr/PeakMatch';
import { matchShangjinInst } from '../mgr/ShangjinMatch';
import { RoomMatchInst } from '../mgr/RoomMatch';
import { liveInst } from '../mgr/LiveMgr';
import { LiveMode, SeRacePvp, if_sys_ } from '../SeDefine';
import { ProcMgr } from './TeProc';
import { join } from 'path';
import { PvPRoomMgrInst } from '../mgr/TeamRoomMgr';
import { WuXianHuoLiMatch } from '../mgr/PvpWuXianHuoLi';
import { MatchPoolMgr } from '../mgr2/matchPool';
import { update_match_unit } from '../mgr2/matchUnit';
import { AutoLoaderModule } from '../lib/TeAutoLoadModule';
import { configInst } from '../lib/TeConfig';
import { RecordMgr } from '../mgr/RecordMgr';

//------------------------------------------------//

export var Match_Proc = new ProcMgr(__filename, netInst, 'server');

//-------------------------------------------------//
let _useold_ = !configInst.get("usenewmatch");

Match_Proc.regist_proc(NetEvent.connected, function (nid: string) {
    netInst.addCheckLink(nid);
}, __filename);

Match_Proc.regist_proc(NetEvent.disconnect,
    function (nid: string) {
        var rs = serverMgrInst.find_server(nid);
        if (rs) {
            liveInst.del_race_by_url(rs.url);
            if (rs.type == DefineSType.logic) {
                PvPRoomMgrInst.clear_room_by_cls(rs._sys_);
            }
        }

        serverMgrInst.del_server(nid);
        // netInst.addCheckLink(nid);
    }, __filename);


Match_Proc.regist_proc('regist', function (nid: string, data: { type: string, id: string, url: string, _sys_?: if_sys_ }) {
    if ([DefineSType.logic, DefineSType.race].indexOf(data.type) != -1) {
        serverMgrInst.add_server(data.type, nid, data.id, data.url, data._sys_);
        netInst.delCheckLink(nid);
        netInst.sendData({ cmd: 'registret', type: true }, nid);
    }
    else {
        netInst.sendData({ cmd: 'registret', type: false }, nid);
    }

    if (data.type == 'cloudserver') {
        RecordMgr.inst.regist_plt(data._sys_.plt);
    }
}, __filename);



function global_cancell(...args);
function global_cancell(sid: string, _sys_: if_sys_, uid: number, score: number, mode: string, force: boolean) {
    if (_useold_) {
        matchInst._online_cancell(_sys_, sid, uid, score);
        WuXianHuoLiMatch.inst._online_cancell(_sys_, sid, uid, score);
        match2v2Inst._online_cancell(_sys_, sid, uid, score);
        match1v2Inst._online_cancell(_sys_, sid, uid, score);
        matchPeakInst.online_cancell(_sys_, sid, uid, score);
        matchShangjinInst.online_cancell(_sys_, sid, uid, score);
        RoomMatchInst.cancell(_sys_, sid, uid, force);
    }
}
if (_useold_) {
    Match_Proc.regist_proc('onlinematch_robot', function (nid: string, data: { data: Array<any> }) {
        matchInst.online_match_robot(nid, data['_sys_'], ...data.data);
    }, __filename);

    Match_Proc.regist_proc('onlinematch', function (nid: string, data: { data: Array<any> }) {
        matchInst.online_match(nid, data['_sys_'], ...data.data);
    }, __filename);

    Match_Proc.regist_proc('onlinewuxianhuoli', function (nid: string, data: { data: Array<any> }) {
        WuXianHuoLiMatch.inst.online_match(nid, data['_sys_'], ...data.data);
    }, __filename);

    Match_Proc.regist_proc('onlinematchPeak', function (nid: string, data: { data: Array<any> }) {
        matchPeakInst.online_match(nid, data['_sys_'], ...data.data);
    }, __filename);

    Match_Proc.regist_proc('onlinematchShangjin', function (nid: string, data: { data: Array<any> }) {
        matchShangjinInst.online_match(nid, data['_sys_'], ...data.data);
    }, __filename);

    Match_Proc.regist_proc('onlinematch2v2', function (nid: string, data: { data: Array<any> }) {
        match2v2Inst.online_match(nid, data['_sys_'], ...data.data);
    }, __filename);


    Match_Proc.regist_proc('getrandomList', function (nid: string, data: { data: Array<any> }) {
        matchInst.get_randomList(nid, data['_sys_'], ...data.data);
    }, __filename);

    Match_Proc.regist_proc('cancellonline', function (nid: string, data: { data: Array<any> }) {
        global_cancell(nid, data['_sys_'], ...data.data);
    }, __filename);
    Match_Proc.regist_proc('cancellonlinewuxianhuoli', function (nid: string, data: { data: Array<any> }) {
        global_cancell(nid, data['_sys_'], ...data.data);
    }, __filename);

    Match_Proc.regist_proc('cancellonline2v2', function (nid: string, data: { data: Array<any> }) {
        global_cancell(nid, data['_sys_'], ...data.data);
    }, __filename);

    Match_Proc.regist_proc('cancellonlinePeak', function (nid: string, data: { data: Array<any> }) {
        global_cancell(nid, data['_sys_'], ...data.data);
    }, __filename);

    Match_Proc.regist_proc('cancellonlineShangjin', function (nid: string, data: { data: Array<any> }) {
        global_cancell(nid, data['_sys_'], ...data.data);
    }, __filename);
    
    Match_Proc.regist_proc('findPvp', function (nid: string, data: { data: Array<any> }) {
        matchInst.findPvp(nid, data['_sys_'], ...data.data);
    }, __filename);

    //-----------------raceserver----------------------------//
    Match_Proc.regist_proc('race_result', function (nid: string, data: { infos: any[], rid: string, rmode: number }) {

        liveInst.race_finish(data);

        liveInst.del_live_race(data.rid);
    }, __filename);

    Match_Proc.regist_proc('race_infos', function (nid: string, data: { infos: { rid: string, raceinfos: SeRacePvp[], livekey: string, rmode: number, cttime: number, racever: string }[] }) {
        for (var i = 0; i < data.infos.length; i++) {
            var r = data.infos[i];
            if (!r || !r.raceinfos || r.raceinfos.length == 0) continue;
            liveInst.add_live_race(r.rid, r.raceinfos, r.raceinfos[0].rurl, r.livekey, r.rmode, r.cttime, r.racever);
        }
    }, __filename)
    //--------------------end--------------------------------//

    Match_Proc.regist_proc('liveraces', function (nid: string, data: { uid: number, mode: LiveMode }) {

        netInst.sendData({
            cmd: "liveraces",
            uid: data.uid,
            infos: liveInst.get_live_race(data.mode || 0)
        }, nid);
    }, __filename)

    Match_Proc.regist_proc('record_save', function (nid: string, data: { name: string, info: ifRecordFile, mode: string, rmode: LiveMode }) {
        // 清理掉无用的记录信息
        try {
            if (data.info && data.info.akRaceHps) {
                let hps = {};
                for (let key in data.info.akRaceHps) {
                    let useinfo = data.info.akRaceHps[key] as any[];
                    hps[key] = [];
                    // for (let i = 0; i < useinfo.length; i++) {
                    //     let tinfo = useinfo[i];
                    //     if (tinfo && tinfo.hps) {
                    //         hps[key].push({ hps: tinfo.hps });
                    //     }
                    // }

                    // 只有第一个和最后一个是有效的
                    if (useinfo.length > 1) {
                        let first = useinfo.shift();
                        if (first && first.iframe && first.hps) {
                            hps[key].push({
                                hps: first.hps,
                                iframe: first.iframe
                            })
                        }
                        let last = useinfo.pop();
                        if (last && last.iframe && last.hps) {
                            hps[key].push({
                                hps: last.hps,
                                iframe: last.iframe
                            })
                        }
                    }
                    else if (useinfo.length > 0) {
                        let first = useinfo.shift();
                        if (first && first.iframe && first.hps) {
                            hps[key].push({
                                hps: first.hps,
                                iframe: first.iframe
                            })
                        }
                    }

                }
                data.info.akRaceHps = hps;
            }
        }
        catch (e) {

        }

        if (!liveInst.is_race_mode(data.info.rid, LiveMode.match) && !liveInst.is_race_mode(data.info.rid, LiveMode.peak)) return;
        RecordMgr.inst.add_record(data.name, data.info, data.mode, data.rmode);
    }, __filename)


    Match_Proc.regist_proc('queryvideo', function (nid: string, data: { _sys_: if_sys_, uid: number, level: number, rmode: string }) {
        var v = RecordMgr.inst.get_records(data._sys_, data.level, data.rmode);
        netInst.sendData({
            cmd: "queryvideo",
            uid: data.uid,
            infos: v,
            level: data.level,
            rmode: data.rmode
        }, nid);
    }, __filename);

    Match_Proc.regist_proc('queryvideod', function (nid: string, data: { _sys_: if_sys_, uid: number, vids: string[] }) {
        var v = RecordMgr.inst.get_detail_records(data._sys_, data.vids);
        netInst.sendData({
            cmd: "queryvideod",
            uid: data.uid,
            infos: v
        }, nid);
    }, __filename);

    Match_Proc.regist_proc('getkillrecord', function (nid: string, data: { _sys_: if_sys_, uid: number, level: number, rmode: string }) {
        netInst.sendData({
            cmd: "getkillrecord_ret",
            uid: data.uid,
            infos: liveInst.kill_record,
        }, nid);
    }, __filename);

    Match_Proc.regist_proc('roomopr', function (nid: string, data) {
        RoomMatchInst.proc_info(data._sys_, nid, data);
    }, __filename);

    Match_Proc.regist_proc('killroom', function (nid: string, data) {
        // RoomMatchInst.proc_info(data._sys_, nid, data);
        var race_server = serverMgrInst.find_race_by_rurl(data.rurl);
        var race = liveInst.get_race_info(data.rid);
        if (race && race.mode == LiveMode.room && race_server) {
            netInst.sendData({
                cmd: 'killroom',
                rid: data.rid,
                livekey: data.livekey
            }, race_server.nid);
        }
    }, __filename);

    Match_Proc.regist_proc('local.update', matchInst.update.bind(matchInst), __filename);
    Match_Proc.regist_proc('local.update', WuXianHuoLiMatch.inst.update.bind(WuXianHuoLiMatch.inst), __filename);
    Match_Proc.regist_proc('local.update', match2v2Inst.update.bind(match2v2Inst), __filename);
    Match_Proc.regist_proc('local.update', match1v2Inst.update.bind(match1v2Inst), __filename);
    Match_Proc.regist_proc('local.update', matchPeakInst.update.bind(matchPeakInst), __filename);
    Match_Proc.regist_proc('local.update', matchShangjinInst.update.bind(matchShangjinInst), __filename);
    Match_Proc.regist_proc('local.update', RoomMatchInst.updateLocgic.bind(RoomMatchInst), __filename);
}
else {
    // 驱动匹配用的池子
    Match_Proc.regist_proc('local.update', MatchPoolMgr.update.bind(MatchPoolMgr), __filename);

    // 淘汰匹配玩家的池子
    Match_Proc.regist_proc('local.update', update_match_unit, __filename);

    AutoLoaderModule.watch(join(__dirname, '../mgr2', 'raceServices')).on("add", function (file) {
        Match_Proc.BEGIN(file);
    }).on("del", function (file) {
        Match_Proc.FINISH(file);
    }).load();

    AutoLoaderModule.watch(join(__dirname, '../mgr2', 'mgrServices')).on("add", function (file) {
        Match_Proc.BEGIN(file);
    }).on("del", function (file) {
        Match_Proc.FINISH(file);
    }).load();

    AutoLoaderModule.watch(join(__dirname, '../mgr2', 'matchServices')).on("add", function (file) {
        Match_Proc.BEGIN(file);
    }).on("del", function (file) {
        Match_Proc.FINISH(file);
    }).load();

    AutoLoaderModule.watch(join(__dirname, '../mgr2', 'process')).on("add", function (file) {
        Match_Proc.BEGIN(file);
    }).on("del", function (file) {
        Match_Proc.FINISH(file);
    }).load();
}
Match_Proc.regist_proc('local.update', RecordMgr.inst.updateRecord.bind(RecordMgr.inst), __filename);

