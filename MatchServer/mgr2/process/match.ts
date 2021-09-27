import { Match_Proc } from "../../NetMgr/matchProc";
import { if_sys_, SeLogicFormation, LiveMode } from "../../SeDefine";
import { netInst } from "../../NetMgr/SeNetMgr";
import { robotService } from "../matchServices/robotService";
import { matchService } from "../mgrServices/matcheService";
import { roomsService } from "../mgrServices/roomService";

Match_Proc.regist_proc('onlinematch_robot', function (nid: string, data: { data: Array<any>, _sys_: if_sys_ }) {
    let [uid, formation, name, level, icon, avatar, pvp_score, pvp_level, win_count] = data.data;
    netInst.sendData({ cmd: 'randlist', mode: '1v1', uid: uid, list: [] }, nid);

    setTimeout((function (_sys_1: if_sys_, formation1: { h_f: SeLogicFormation[]; battleEquip: any; }, nid1: string, uid1: any, win_count1: number) {
        let raceOpp = robotService.getPveRobot2(_sys_1, formation1.h_f, 1500, 1, 1, 0, win_count1 < 1);
        let startGame = {
            cmd: 'pvpv726',
            uid: uid1,
            mode: '1v1',
            rmode: 0,
            raceinfo: raceOpp,
        };

        netInst.sendData(startGame, nid1);
    }).bind(this, data._sys_, formation, nid, uid, win_count), 5000);
}, __filename);

Match_Proc.regist_proc('onlinematch', function (nid: string, data: { _sys_: if_sys_, data: Array<any> }) {
    let [uid, formation, name, level, icon, avatar, medals, pvp_score, pvp_level, win_count, lose_count, lone_oppname] = data.data;
    //uid: number, formation: if_pvp_match_info, name: string, level: number, icon: string, avatar: any, medals: Array<string>, pvp_score: number, pvp_level: number, win_count: number, lose_count: number, lone_oppname: string
    matchService.enterMatch(nid, '1v1', data._sys_, uid, { formation: formation, name: name, level: level, icon: icon, avatar: avatar, medals: medals, match_score: pvp_score, pvp_level: pvp_level }, { win_count: win_count, lose_count: lose_count, lone_oppname: lone_oppname});
}, __filename);

Match_Proc.regist_proc('onlinewuxianhuoli', function (nid: string, data: { _sys_: if_sys_, data: Array<any> }) {
    let [uid, formation, name, level, icon, avatar, medals, pvp_score, pvp_level, win_count, lose_count, lone_oppname] = data.data;
    matchService.enterMatch(nid, 'wuxianhuoli', data._sys_, uid, { formation: formation, name: name, level: level, icon: icon, avatar: avatar, medals: medals, match_score: pvp_score, pvp_level: pvp_level }, { win_count: win_count, lose_count: lose_count, lone_oppname: lone_oppname});

}, __filename);

Match_Proc.regist_proc('onlinematchPeak', function (nid: string, data: { _sys_: if_sys_, data: Array<any> }) {
    let [uid, formation, name, level, icon, avatar, medals, pvp_score, pvp_level, win_count, lose_count, lone_oppname] = data.data;
    matchService.enterMatch(nid, 'peakmatch', data._sys_, uid, { formation: formation, name: name, level: level, icon: icon, avatar: avatar, medals: medals, match_score: pvp_score, pvp_level: pvp_level }, { win_count: win_count, lose_count: lose_count, lone_oppname: lone_oppname});
}, __filename);

Match_Proc.regist_proc('onlinematchShangjin', function (nid: string, data: { _sys_: if_sys_, data: Array<any> }) {
    let [uid, formation, name, level, icon, avatar, medals, pvp_score, pvp_level, win_count, lose_count, lone_oppname] = data.data;
    matchService.enterMatch(nid, 'shangjinmatch', data._sys_, uid, { formation: formation, name: name, level: level, icon: icon, avatar: avatar, medals: medals, match_score: pvp_score, pvp_level: pvp_level }, { win_count: win_count, lose_count: lose_count, lone_oppname: lone_oppname});
}, __filename);

Match_Proc.regist_proc('onlinematch2v2', function (nid: string, data: { _sys_: if_sys_, data: Array<any> }) {
    let [uid, formation, name, level, icon, avatar, medals, pvp_score, pvp_level, win_count, lose_count, lone_oppname] = data.data;
    matchService.enterMatch(nid, '2v2', data._sys_, uid, { formation: formation, name: name, level: level, icon: icon, avatar: avatar, medals: medals, match_score: pvp_score, pvp_level: pvp_level }, { win_count: win_count, lose_count: lose_count, lone_oppname: lone_oppname});
}, __filename);


Match_Proc.regist_proc('getrandomList', function (nid: string, data: { _sys_: if_sys_, data: Array<any> }) {
    let [uid, level] = data.data;
    netInst.sendData({ cmd: 'randlist', mode: '1v1', uid: uid, list: [] }, nid);
}, __filename);


function global_cancell(...args);
function global_cancell(nid: string, _sys_: if_sys_, uid: number, score: number, mode: string, force: boolean) {
    mode = mode || '2v2';
    switch (mode) {
        case '2v2':
            // 把玩家踢出队伍
            roomsService.cancell_room(_sys_.plt, uid);
            break;
        default:
            // 把玩家从匹配单位的池子中剔除
            matchService.cancell_match(_sys_, uid);

            // 通知玩家取消成功
            netInst.sendData({ cmd: 'cancell', mode: mode, uid: uid }, nid);
            break;
    }
}

Match_Proc.regist_proc('cancellonline', function (nid: string, data: { data: Array<any> }) {
    global_cancell(nid, data['_sys_'], ...data.data);
}, __filename);

Match_Proc.regist_proc('cancellonlinewuxianhuoli', function (nid: string, data: { data: Array<any> }) {
    global_cancell(nid, data['_sys_'], ...data.data);
}, __filename);

Match_Proc.regist_proc('cancellonline2v2', function (nid: string, data: { data: Array<any> }) {
    // 2v2 都是有房间的，先要重置房间状态
    global_cancell(nid, data['_sys_'], ...data.data);
}, __filename);

Match_Proc.regist_proc('cancellonlinePeak', function (nid: string, data: { data: Array<any> }) {
    global_cancell(nid, data['_sys_'], ...data.data);
}, __filename);

Match_Proc.regist_proc('findPvp', function (nid: string, data: { _sys_: if_sys_, data: Array<any> }) {
    let [uid, score, formation, unlock_level] = data.data
    // 要按照玩家当前的积分来

    var raceOpp = robotService.getPveRobot3(data._sys_, formation.h_f, score, unlock_level, formation.castle_level);
    var startGame = {
        cmd: 'pvps',
        uid: uid,
        mode: "1v1",
        rmode: LiveMode.lianxi,
        raceinfo: raceOpp,
    };

    netInst.sendData(startGame, nid);
}, __filename);
