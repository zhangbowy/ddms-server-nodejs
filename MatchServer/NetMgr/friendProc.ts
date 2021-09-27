import { netInst } from "./SeNetMgr";
import { friendInst, ifFriendInfo } from "../mgr/FriendMgr";
import { ProcMgr } from "./TeProc";

export var Friend_Proc = new ProcMgr(__filename, netInst, 'server');


//好友相关的操作放到这里来
Friend_Proc.regist_proc('route_wx_friend', function (nid: string, data) {
    netInst.sendData({
        cmd: 'init_wx',
        uid: data.uid,
        info: {
            wxFriendInfos: friendInst.friend_wx_route(data['_sys_'], data)
        }
    }, nid);
}, __filename);

Friend_Proc.regist_proc('route_friend', function (nid: string, data) {
    // console.error(JSON.stringify(data));
    netInst.sendData({
        cmd: 'friend_opr_ret',
        uid: data.uid,
        info: {
            type: 'route_friend',
            succ: friendInst.friend_route(data['_sys_'], data),
            r_data: data
        }
    }, nid);
}, __filename);

Friend_Proc.regist_proc('force_friend', function (nid: string, data) {
    friendInst.force_friend(data['_sys_'], data.uid, data.fuid);
}, __filename);

Friend_Proc.regist_proc('make_friend', function (nid: string, data: { uid: number, fuid: number }) {
    var bsucc = friendInst.make_friend(data['_sys_'], data.uid, data.fuid);
    netInst.sendData({
        cmd: 'friend_opr_ret',
        uid: data.uid,
        info: {
            type: 'make_friend',
            succ: bsucc,
        }
    }, nid);


    friendInst.send_to_uid(data['_sys_']['plt'], data.uid, {
        cmd: 'friend_opr_ret',
        uid: data.uid,
        info: {
            type: 'make_friend',
            succ: bsucc
        }
    });
}, __filename);

Friend_Proc.regist_proc('delete_friend', function (nid: string, data: { uid: number, fuid: number }) {
    netInst.sendData({
        cmd: 'friend_opr_ret',
        uid: data.uid,
        info: {
            type: 'delete_friend',
            succ: friendInst.del_friend(data['_sys_'], data.uid, data.fuid)
        }
    }, nid);
}, __filename);

Friend_Proc.regist_proc('find_player', function (nid: string, data: { uid: number, fuid: number }) {
    friendInst.find_player(data['_sys_'], data.fuid, (_uid: number, f: ifFriendInfo[]) => {
        netInst.sendData({
            cmd: 'find_player',
            uid: data.uid,
            info: f
        }, nid);
    });
}, __filename);

Friend_Proc.regist_proc('fd_up_state', function (nid: string, data: ifFriendInfo) {
    netInst.sendData({
        cmd: 'friend_opr_ret',
        uid: data.kID,
        info: {
            type: 'fd_up_state',
            succ: friendInst.update_state(data['_sys_'], nid, data)
        }
    }, nid);
}, __filename);

Friend_Proc.regist_proc('fd_total_state', function (nid: string, data: { infos: { state: ifFriendInfo, friends: number[] }[] }) {
    for (var i = 0; i < data.infos.length; i++) {
        if (!data.infos[i] || !data.infos[i].state) {
            continue;
        }

        friendInst.set_plt_friends(data['_sys_'], data.infos[i].state.kID, data.infos[i].friends)
        friendInst.update_state(data['_sys_'], nid, data.infos[i].state);
    }
}, __filename)

Friend_Proc.regist_proc('load_friend', function (nid: string, data: { uid: number, plt_friends: number[] }) {
    data.plt_friends = data.plt_friends || [];
    friendInst.get_friends(data['_sys_'], data.uid, (_uid, f, a, b) => {
        netInst.sendData({
            cmd: 'init_friend',
            uid: _uid,
            infos: { f: f, a: a, b: b }
        }, nid);
    });

    if (data.plt_friends.length > 0) {
        friendInst.get_plt_friends(data['_sys_'], data.uid, data.plt_friends, (_uid, f) => {
            netInst.sendData({
                cmd: 'init_plt_friend',
                uid: _uid,
                infos: { f: f }
            }, nid);
        });
    }
}, __filename);

Friend_Proc.regist_proc('load_plt_friend', function (nid: string, data: { uid: number, plt_friends: number[] }) {
    friendInst.get_plt_friends(data['_sys_'], data.uid, data.plt_friends, (_uid, f) => {
        netInst.sendData({
            cmd: 'init_plt_friend',
            uid: _uid,
            infos: { f: f }
        }, nid);
    });
}, __filename);

Friend_Proc.regist_proc('clear_make_player_apply', function (nid: string, data: { uid: number }) {
    netInst.sendData({
        cmd: 'friend_opr_ret',
        uid: data.uid,
        info: {
            type: 'clear_make_player_apply',
            succ: friendInst.clear_make_player_apply(data['_sys_'], data.uid)
        }
    }, nid);
}, __filename);

Friend_Proc.regist_proc('local.update', function () {
    friendInst.update();
}, __filename)