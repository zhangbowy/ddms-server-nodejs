import { netInst, NetEvent } from './SeNetMgr';
import { configInst } from '../lib/TeConfig';
import { raceMgrInst } from '../RaceMgr/RaceMgr';

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
function addProc(event: string, func: (nid: string, data?: any) => void, stype: string = 'match') {
    S_BindListens.push(new ProcUnit(event, func, stype));
}

//-------------------------------------------------//
function onConnected(nid: string) {
    // netInst.addCheckLink(nid);

    var data = {
        'cmd': 'regist',
        'passwd': 'chenkai',
        'type': 'raceserver',
        'plt': configInst.get('plt'),
        'id': configInst.get('serverid')
    };

    // if (configInst.get('plt') == 'sdw' || configInst.get('plt') == 'qzone' || configInst.get('plt') == 'zlzy') {
    //     data['url'] = configInst.get('serverip') + ':' + configInst.get('port');
    // }
    // else {
        data['url'] = configInst.get('serverip');
    // }

    netInst.sendData(data, nid);

    // 把自己手里的单局发送给老上级
    netInst.sendData({
        'cmd': 'race_infos',
        'infos': raceMgrInst.getAllRace()
    }, nid)
}

function onDisconnected(nid: string) {

    // netInst.addCheckLink(nid);
}

function on_start_online(nid: string, data: { rid: string, raceinfos: any, livekey: string, rmode: number, racever: string, stritc: boolean }) {
    raceMgrInst.createRace(data.rid, data.raceinfos, data.livekey, data.rmode, data.racever, data.stritc);
}

function on_kill_room(nid: string, data: { rid: string, livekey: string }) {
    raceMgrInst.killRace(data.rid, data.livekey);
}

export var g_match_nid: string;

function on_regist_ret(nid: string, data: { type: boolean }) {
    if (data.type) {
        console.log('ms ready');
        // var cmd = {
        //     'cmd': 'url',
        //     'url': configInst.get('serverip') + ':' + configInst.get('port')
        // };

        // netInst.sendData(cmd, nid);
        g_match_nid = nid;
    }
}

//------------------------------------------------//
/**
 * 模块模块装载
 */
export function MATCH_BEGIN() {
    addProc(NetEvent.connected, onConnected);
    addProc(NetEvent.disconnect, onDisconnected);

    addProc('registret', on_regist_ret);
    addProc('startonline', on_start_online);
    addProc('killroom', on_kill_room);
}

/**
 * 模块卸载
 */
export function MATCH_FINISH() {
    for (var i = 0; i < S_BindListens.length; i++) {
        var r = S_BindListens[i];
        r.destory();
    }

    S_BindListens = [];
}