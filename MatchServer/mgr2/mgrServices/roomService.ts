import { netInst } from "../../NetMgr/SeNetMgr";
import { MatchUnitPlt } from "../matchUnit";
import { serverMgrInst } from "../../serverMgr";
import { CharState } from "../../SeDefine";
import { MatchRoomPlt, ifRoomNotice } from "../matchRoom";
import { MatchPoolMgr } from "../matchPool";
import { MatchType } from "../matchDefine";

export class roomsService {
    static roommode = 'room'

    /**
     * 加入房间
     * @param plt 
     * @param uid 
     * @param joinkey 
     */
    static join_room(plt: string, uid: number, joinkey: string) {
        let userA = MatchUnitPlt(plt).get_unit(uid);
        if (!userA) {
            return;
        }

        userA.mode = this.roommode;

        let roominfo = MatchRoomPlt(plt).get_room(joinkey);
        if (roominfo.islock) {
            return this.send_room_state(plt, 'roomlock', uid, {}, CharState.loadcomplete);
        }

        if (MatchRoomPlt(plt).join_room(joinkey, uid, this.roommode)) {
            // 设置一下玩家的队伍信息
            userA.roomid = joinkey;
            this.send_room_state(plt, 'join', uid, {}, joinkey);
            this.notice_room_info(plt, joinkey, 'join');
        }
        else {
            var r_p = MatchRoomPlt(plt).get_user(uid);
            if (r_p) {
                userA.roomid = r_p._hash_;
                this.send_room_state(plt, 'roomstate', uid, { infos: this.get_room_info(plt, r_p._hash_), subtype: 'join' }, r_p._hash_);
            }
            else {
                this.send_room_state(plt, 'roomfull', uid, {}, joinkey);
            }
        }
    }


    private static get_nid(plt: string, uid: number) {
        let user = MatchUnitPlt(plt).get_unit(uid);
        if (!user) return '';
        let server = serverMgrInst.get_server(user._sys_.serverid);
        if (!server) return '';
        return server.nid;
    }

    /**
     * 发送给玩家房间信息
     * @param plt 
     * @param type 
     * @param uid 
     * @param info 
     * @param joinkey 
     */
    private static send_room_state(plt: string, type: string, uid: number, info: any = {}, joinkey: string = '') {
        var send_data = {
            cmd: "room_opr",
            type: type,
            uid: uid,
            joinkey: joinkey,
            info: info
        }

        netInst.sendData(send_data, this.get_nid(plt, uid));
    }

    /**
     * 通知房间状态
     * @param plt 
     * @param roomkey 
     * @param subtype 
     */
    private static notice_room_info(plt: string, roomkey: string, subtype: string = '') {
        var room = MatchRoomPlt(plt).get_room(roomkey);

        var room_state: ifRoomNotice[] = this.get_room_info(plt, roomkey);

        for (var i = 0; i < room.users.length; i++) {
            let uid = room.users[i].uid;

            this.send_room_state(plt, 'roomstate', uid, {
                infos: room_state,
                subtype: subtype
            }, '');
        }
    }

    /**
     * 离开房间
     * @param plt 
     * @param uid 
     */
    static leave_room(plt: string, uid: number) {
        let unit = MatchUnitPlt(plt).get_unit(uid);
        let user = MatchRoomPlt(plt).get_user(uid);
        if (!user) return;
        var joinkey = user._hash_;
        MatchRoomPlt(plt).leave_room(uid);
        MatchRoomPlt(plt).lock_unlock(joinkey, uid, false);

        this.send_room_state(plt, 'leave', uid, {});
        this.notice_room_info(plt, joinkey, 'leave');
        if (unit) {
            // 去掉玩家的组队状态
            unit.roomid = '';
        }

    }

    /**取消匹配 */
    static cancell_room(plt: string, uid: number) {
        let user = MatchRoomPlt(plt).get_user(uid);
        if (!user) return;
        var joinkey = user._hash_;
        // MatchRoomPlt(plt).leave_room(uid);
        let roominfo = MatchRoomPlt(plt).get_room(joinkey);
        for (let i = 0; i < roominfo.uids.length; i++) {
            let roomuid = roominfo.uids[i];

            // 取消玩家的准备状态
            roominfo.users[i].ready = false;
            // 把玩家设置回房间
            let unit = MatchUnitPlt(plt).get_unit(roomuid);
            if (unit) {
                let server = serverMgrInst.get_server(unit._sys_.serverid)
                server && netInst.sendData({ cmd: 'cancell', mode: unit.mode, uid: roomuid }, server.nid);
                unit.mode = this.roommode;
            }
        }

        MatchRoomPlt(plt).lock_unlock(joinkey, uid, false);
        this.notice_room_info(plt, joinkey, 'reset');
    }

    /**
     * 房间准备
     * @param plt 
     * @param uid 
     * @param ready 
     */
    static ready_room(plt: string, uid: number, ready: boolean) {
        var r_u = MatchRoomPlt(plt).get_user(uid);
        if (r_u) {
            r_u.ready = ready;
            this.notice_room_info(plt, r_u._hash_, 'ready');
            this.check_room(plt, r_u._hash_);
        }
    }

    private static check_room(plt: string, room_key: string) {
        let r_room = MatchRoomPlt(plt).get_room(room_key);
        // 如果房间所住了就不需要检查开始了
        if (r_room.islock) return;
        // if (r_room.length < 2) return false;

        let r_l = [];
        for (let j = 0; j < r_room.users.length; j++) {
            let r_p = r_room.users[j];
            if (!r_p || !r_p.ready) return false;
            r_l.push(r_p);
        }

        // 准备开始了，把大家设置回false
        for (let j = 0; j < r_room.users.length; j++) {
            let r_p = r_room.users[j];
            if (!r_p) continue;
            let r_u = MatchUnitPlt(plt).get_unit(r_p.uid, this.roommode);
            if (!r_u) continue;

            r_p.ready = false;

            this.send_room_state(plt, 'startmatch', r_p.uid);

            // 切换当前状态到2v2状态,等2v2结束后切换回来
            r_u.mode = MatchType.match_2v2;
            // 把玩家丢入池子中去
            MatchPoolMgr.enter_pool(MatchType.match_2v2, r_u.match_score, r_u.uid, r_u._sys_.plt);
        }

        // 锁掉这个房间 直到比赛结束才打开
        MatchRoomPlt(plt).lock_unlock(room_key, r_room.users[0].uid, true);
    }

    /**
     * 玩家比赛结果，解锁房间，然后重新设置房间状态
     * @param uid 
     */
    static race_finish(plt: string, uid: number) {
        var rp = MatchRoomPlt(plt).get_user(uid);
        if (!rp) return;

        if (MatchRoomPlt(plt).lock_unlock(rp._hash_, uid, false))
            this.notice_room_info(plt, rp._hash_, 'reset');
    }

    private static get_room_info(plt: string, roomkey: string) {
        var room = MatchRoomPlt(plt).get_room(roomkey).users;
        var room_state: ifRoomNotice[] = [];
        for (var i = 0; i < room.length; i++) {
            var r_info = room[i];
            var r_u = MatchUnitPlt(plt).get_unit(r_info.uid);
            if (!r_u) continue;
            room_state.push({
                uid: r_u.uid,
                pvp_level: r_u.baseinfo.pvp_level,
                icon: r_u.baseinfo.icon,
                avatar: r_u.baseinfo.avatar,
                name: r_u.baseinfo.name,
                ready: r_info.ready
            });
        }

        return room_state;
    }
}