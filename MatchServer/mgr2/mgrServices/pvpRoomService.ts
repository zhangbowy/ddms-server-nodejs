import { netInst } from "../../NetMgr/SeNetMgr";
import { MatchUnitPlt } from "../matchUnit";
import { serverMgrInst } from "../../serverMgr";
import { CharState, LiveMode } from "../../SeDefine";
import { MatchRoomPlt, ifRoomNotice } from "../matchRoom";
import { MatchPoolMgr } from "../matchPool";
import { MatchType } from "../matchDefine";
import { raceService } from "../raceServices/raceService";

/**开房间直接四个人战斗的 */
export class pvpRoomsService {
    static roommode = 'pvproom';

    /**
     * 创建房间
     * @param plt 
     * @param uid 
     * @param joinkey 
     */
    static create_room(plt: string, uid: number, joinkey: string) {
        let roominfo = MatchRoomPlt(plt).get_room(joinkey);
        if (roominfo.islock) return this.send_room_state(plt, 'd_roomlock', uid, {}, CharState.loadcomplete);


        if (roominfo.users.length != 0) {
            // 表示房间已经存在了，就不要创建了
            this.send_room_state(plt, 'd_is_created', uid, {}, joinkey);
        }
        else if (MatchRoomPlt(plt).join_room(joinkey, uid, this.roommode)) {
            this.send_room_state(plt, 'd_join', uid, {}, joinkey);
            this.notice_room_info(joinkey, 'join');
        }
        else {
            let r_p = MatchRoomPlt(plt).get_user(uid);
            if (r_p) {
                this.send_room_state(plt, 'd_roomstate', uid, { infos: this.get_room_info(plt, r_p._hash_), subtype: 'reset' }, joinkey);
            }
            else {
                this.send_room_state(plt, 'd_roomfull', uid, {}, joinkey);
            }
        }
    }

    /**
     * 加入房间
     * @param plt 
     * @param uid 
     * @param joinkey 
     */
    static join_room(plt: string, uid: number, joinkey: string) {
        let roominfo = MatchRoomPlt(plt).get_room(joinkey);
        if (roominfo.users.length == 0) {
            // 表示房间已经不存在，就不要创建了
            return this.send_room_state(plt, 'd_is_uncreated', uid, {}, joinkey);
        }

        if (roominfo.islock) {
            return this.send_room_state(plt, 'roomlock', uid, {}, CharState.loadcomplete);
        }

        if (MatchRoomPlt(plt).join_room(joinkey, uid,this.roommode)) {
            let userA = MatchUnitPlt(plt).get_unit(uid, this.roommode);
            if (userA) {
                // 设置一下玩家的队伍信息
                userA.roomid = joinkey;
            }
            this.send_room_state(plt, 'd_join', uid, {}, joinkey);
            this.notice_room_info(joinkey, 'join');
        }
        else {
            let r_p = MatchRoomPlt(plt).get_user(uid);
            if (r_p) {
                this.send_room_state(plt, 'd_roomstate', uid, { infos: this.get_room_info(plt, r_p._hash_), subtype: 'reset' }, r_p._hash_);
            }
            else {
                this.send_room_state(plt, 'd_roomfull', uid, {}, joinkey);
            }
        }
    }
    /**
     * 房主踢人
     * @param _sys_ 
     * @param nid 
     * @param p 
     * @param join_key 
     */
    static kick_room(plt: string, uid: number, kuid: number, join_key: string) {
        let r_p = MatchRoomPlt(plt).get_user(uid);
        if (!r_p) {
            return;
        }

        let jk = r_p._hash_;
        var r_room = MatchRoomPlt(plt).get_room(jk);
        for (let i = 0; i < r_room.users.length; i++) {
            let r_in = r_room.users[i];
            if (!r_in) continue;
            if (i == 0 && r_in.uid != uid) break;
            else if (r_in.uid == kuid) {
                // 给踢掉的发送消息
                this.send_room_state(this.get_nid(plt, kuid), 'd_leave', r_in.uid, {}, jk);
                MatchRoomPlt(plt).leave_room(kuid);
                break;
            }
        }

        this.notice_room_info(jk, 'leave');
    }

    /**
     * 获取连接
     * @param plt 
     * @param uid 
     */
    private static get_nid(plt: string, uid: number) {
        let user = MatchUnitPlt(plt).get_unit(uid, this.roommode);
        if (!user) return null;
        let server = serverMgrInst.get_server(user._sys_.serverid);
        if (!server) return null;
        return server.nid;
    }

    /**
     * 发送房间信息
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
     * 通知房间状态信息
     * @param plt 
     * @param roomkey 
     * @param subtype 
     */
    private static notice_room_info(plt: string, roomkey: string, subtype: string = '') {
        var room = MatchRoomPlt(plt).get_room(roomkey);

        var room_state: ifRoomNotice[] = this.get_room_info(plt, roomkey);

        for (var i = 0; i < room.users.length; i++) {
            let uid = room.users[i].uid;
            this.send_room_state(this.get_nid(plt, uid), 'd_roomstate', uid, {
                infos: room_state,
                subtype: subtype
            }, '');
        }
    }

    /**
     * 
     * @param plt 
     * @param uid 
     */
    static leave_room(plt: string, uid: number) {
        let unit = MatchUnitPlt(plt).get_unit(uid);
        if (unit) {
            // 去掉玩家的组队状态
            unit.roomid = '';
        }

        let user = MatchRoomPlt(plt).get_user(uid);
        if (!user) return;
        var joinkey = user._hash_;
        MatchRoomPlt(plt).leave_room(uid);
        MatchRoomPlt(plt).lock_unlock(joinkey, uid, false);

        this.send_room_state(plt, 'd_leave', uid, {});
        this.notice_room_info(joinkey, 'leave');
    }

    /**
     * 
     * @param plt 
     * @param uid 
     * @param ready 
     */
    static ready_room(plt: string, uid: number, ready: boolean) {
        var r_u = MatchRoomPlt(plt).get_user(uid);
        if (r_u) {
            r_u.ready = ready;
            this.notice_room_info(r_u._hash_, 'ready');
            this.check_room(plt, r_u._hash_);
        }
    }

    /**
     * 
     * @param plt 
     * @param room_key 
     */
    private static check_room(plt: string, room_key: string) {
        let r_room = MatchRoomPlt(plt).get_room(room_key);

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

            this.send_room_state(this.get_nid(plt, r_p.uid), 'd_startmatch', r_p.uid);

            // 把玩家丢入池子中去
            MatchPoolMgr.enter_pool(MatchType.match_2v2, r_u.match_score, r_u.uid, r_u._sys_.plt);
        }

        // 2v2 开房间的情况
        raceService.create_race(plt, r_room.uids, '2v2', LiveMode.room);

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
            this.notice_room_info(rp._hash_, 'reset');
    }

    /**
     * 
     * @param plt 
     * @param roomkey 
     */
    private static get_room_info(plt: string, roomkey: string) {
        var room = MatchRoomPlt(plt).get_room(roomkey).users;
        var room_state: ifRoomNotice[] = [];
        for (var i = 0; i < room.length; i++) {
            var r_info = room[i];
            var r_u = MatchUnitPlt(plt).get_unit(r_info.uid, this.roommode);
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