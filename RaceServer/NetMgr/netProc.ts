import { netInst, NetEvent } from './SeNetMgr';
import { playerMgrInst } from './playerMgr';
import { netMonitorInst } from './monitor';
import { raceMgrInst } from '../RaceMgr/RaceMgr';
import { GameRaceState } from '../RaceMgr/RaceUnit';
import { createHash } from 'crypto';

class ProcUnit {
    event: string;
    func: Function;
    stype: string;
    constructor(event: string, func: Function, stype: string) {
        this.event = event;
        this.func = func;
        this.stype = stype;

        netInst.on(this.stype, this.event, this.func);
    }

    destory() {
        netInst.removeListener(this.stype, this.event, this.func);
    }
}

var S_BindListens: Array<ProcUnit> = [];
function addProc(event: string, func: (nid: string, data?: any) => void, stype: string = 'player') {
    S_BindListens.push(new ProcUnit(event, func, stype));
}

//-------------------------------------------------//
function onConnected(nid: string) {
    netInst.addCheckLink(nid);
}

function onDisconnected(nid: string) {
    onLeaveRace(nid, null, true);

    netMonitorInst.clearMonitor(nid);
}

function onJoinRace(nid: string, data: { checkKey: string, raceid: string, sid: string, ver: number}) {
    let succ = false;
    let msg = '';
    let rkRace = raceMgrInst.find(data.raceid);
    if (rkRace) {
        let uid = rkRace.getUid(data.checkKey);
        if (uid) {
            playerMgrInst.bindPlayer(uid, nid, rkRace.kID, false);
            if (rkRace.joinRace(uid, data.sid, nid)) {
                //记录前端版本信息
                for (let j = 0; j < rkRace.akRaceInfo.length; j++) {
                    let c_info = rkRace.akRaceInfo[j];
                    if (c_info && c_info.Id == uid) {
                        c_info.ver = data.ver;
                    }
                }
                netInst.delCheckLink(nid);
                succ = true;
            }
            else {
                if (rkRace.state > GameRaceState.racing) {
                    msg = 'race started:' + data.raceid;
                }
                else {
                    msg = 'race unit error:' + data.raceid;
                }
                playerMgrInst.clearPlayer(uid);
            }
        }
    }
    else {
        msg = 'no raceid find:' + data.raceid;
    }

    // 这里发一个消息给玩家
    netInst.sendData({
        cmd: 'joinret',
        rid: data.raceid,
        succ: succ,
        msg: msg
    }, nid);
}

function onQuickJoinRace(nid: string, data: { checkKey: string, raceid: string, sid: string, curframe: number, sign?: string }) {
    let succ = false;
    let rkRace = raceMgrInst.find(data.raceid);
    let reason: string = '';
    if (rkRace) {
        let uid = rkRace.getUid(data.checkKey);
        if (uid) {
            playerMgrInst.bindPlayer(uid, nid, rkRace.kID, false);
            if (rkRace.on_quick_rejoin_race(uid, data.sid, nid, data.curframe, data.sign)) {
                netInst.delCheckLink(nid);
                succ = true;
            }
            else {
                reason = 'is in race';
                playerMgrInst.clearPlayer(uid);
            }
        }
        else {
            reason = 'no user';
        }
    }
    else {
        reason = 'no race';
    }
    // 这里发一个消息给玩家
    netInst.sendData({
        cmd: 'joinret',
        sub: 'quickjoin',
        rid: data.raceid,
        succ: succ,
        reason: reason
    }, nid);

    if (reason) console.log(reason);
}

function onRejoinRace(nid: string, data: { checkKey: string, raceid: string, sid: string }) {
    let succ = false;
    let rkRace = raceMgrInst.find(data.raceid);
    if (rkRace) {
        let uid = rkRace.getUid(data.checkKey);
        if (uid) {
            playerMgrInst.bindPlayer(uid, nid, rkRace.kID, false);
            if (rkRace.on_rejoin_race(uid, data.sid, nid)) {
                netInst.delCheckLink(nid);
                succ = true;
            }
            else {
                playerMgrInst.clearPlayer(uid);
            }
        }
    }
    // 这里发一个消息给玩家
    netInst.sendData({
        cmd: 'joinret',
        rid: data.raceid,
        succ: succ
    }, nid);
}

function on_liverace(nid: string, data: { checkKey: string, raceid: string, sid: string, uid: number }) {
    let succ = false;
    var rkRace = raceMgrInst.find(data.raceid);
    if (!rkRace) return;

    if (rkRace.livekey == data.checkKey) {
        playerMgrInst.bindPlayer(data.uid, nid, rkRace.kID, true);
        if (rkRace.liveRace(data.uid, data.sid, nid)) {
            netInst.delCheckLink(nid);
            succ = true;
        }
        else {
            rkRace.leave(data.uid);
            playerMgrInst.clearPlayer(data.uid);
        }
    }

    // 这里发一个消息给玩家
    netInst.sendData({
        cmd: 'joinret',
        rid: data.raceid,
        succ: succ
    }, nid);
}


function onLeaveRace(nid: string, data, disconnect?) {
    var rp = playerMgrInst.find_Nid(nid, true);
    if (rp) {
        if(disconnect){
            //console.log('rp: ' + nid + '' +JSON.stringify(rp));
        }
        playerMgrInst.clearPlayer(rp.uid);
        var rr = raceMgrInst.find(rp.rid);
        if (rr) rr.leave(rp.uid)
    }
}

function onSaveRecord(nid: string, data, disconnect?) {
    let rid = createHash('md5').update(JSON.stringify(data.record.akRaceInfo) + Date.now()).digest('hex');
    data.record.rid = rid;
    data.record.syncuids = [];
    netMonitorInst.noticeToMonitors('sync_record', data.record);
}

function onRaceCmd(nid: string, data: { type: string, info: { rid: string }, uids: number[] }) {
    var rp = playerMgrInst.find_Nid(nid);
    if (!rp) return;

    if (data.info && data.info.rid && data.info.rid != rp.rid) return;

    raceMgrInst.reciveData(rp.rid, data.type, rp.uid, data.info, data.uids);
}

function on_ready(nid: string, data) {
    var rp = playerMgrInst.find_Nid(nid);
    if (!rp) return;
    var rr = raceMgrInst.find(rp.rid);
    rr && rr.setReady(rp.uid);
}

//------------------------------------------------//
/**
 * 模块模块装载
 */
export function PLAYER_BEGIN() {
    addProc(NetEvent.connected, onConnected, 'player');
    addProc(NetEvent.disconnect, onDisconnected, 'player');

    addProc('join', onJoinRace, 'player');
    addProc('rejoin', onRejoinRace, 'player');
    addProc('quickjoin', onQuickJoinRace, 'player');
    addProc('racecmd', onRaceCmd, 'player');
    addProc('leave', onLeaveRace, 'player');
    addProc('ready', on_ready, 'player');
    addProc('liverace', on_liverace, 'player');

    // 负责监控用的观察者，可能是一个gm
    addProc('monitor', netMonitorInst.process_data.bind(netMonitorInst), 'player')
    addProc('saverecord', onSaveRecord, 'player');
}

/**
 * 模块卸载
 */
export function PLAYER_FINISH() {
    for (var i = 0; i < S_BindListens.length; i++) {
        var r = S_BindListens[i];
        r.destory();
    }

    S_BindListens = [];
}