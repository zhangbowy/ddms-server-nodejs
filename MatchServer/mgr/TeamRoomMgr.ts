import { SeRaceOpp, if_sys_, SeLogicFormation, LiveMode, if_pvp_match_info, RoomType } from '../SeDefine';
import { HashMap, TeMap } from '../lib/TeTool';
import { serverMgrInst } from '../serverMgr';
import { netInst } from '../NetMgr/SeNetMgr';
import { match2v2Inst, match1v2Inst } from './TeamMatchMgr';
import { matchInst } from './Pvpv726';
import { resMgrInst } from '../ResMgr/SeResMgr';
/**
 * 管理玩家2v2房间的系统
 */

var CharState = {
    offline: 'offline',
    loading: 'loading',
    nochar: 'nochar',
    lock: 'lock',
    loadcomplete: 'loadcomplete',
    matching: 'matching',
    inrace: 'inrace'
};


interface ifRoomPlayer {
    uid: number, // 玩家id
    race: SeRaceOpp, // 比赛信息
    _sys_: if_sys_,  // 大区信息

    ready: boolean,  // 是否准备好了
}

interface ifRoomNotice {
    uid: number,
    pvp_level: number,
    icon: string,
    avatar: any,
    name: string,
    ready: boolean,
    index?: number,
    is_vip: boolean,
    vip_level: number, 
    guild_info: object,
}


class ListMap<T>{

    _hash_ = '_hash_';
    _pos_ = '_pos_';

    unit_size = 0;
    keep_pos = false;
    m_list: HashMap<string> = new HashMap<string>();
    m_map: TeMap<T> = new TeMap<T>();

    private _find_pos(room_key: string) {
        // 如果是固定位置的，那么就是每个玩家身上存一个位置
        if (!this.keep_pos) return 0;

        let r_room = this.m_list.get(room_key);
        let pos = [];
        for (let i = 0; i < r_room.length; i++) {
            let r_p = this.m_map.get(r_room[i]);
            if (r_p && typeof r_p[this._pos_] == 'number') {
                pos[r_p[this._pos_]] = true;
            }
        }

        for (let i = 0; i < pos.length; i++) {
            if (!pos[i]) return i;
        }

        return pos.length;
    }

    /**
     * 添加数据
     * @param key 归类的值 
     * @param info_key 每个数据的识别值
     * @param info 具体内容
     */
    add(key: string, info_key: string | number, info: T) {
        if (info_key == null || info_key == undefined) return false;
        if (key == null || key == undefined) return false;

        info_key = info_key.toString();

        var r_m = this.m_map.get(info_key);
        if (r_m) {
            if (r_m[this._hash_] != info_key) return false;
            else return true;
        }

        var pool = this.m_list.get(key);
        if (this.unit_size && pool.length >= this.unit_size) return false;

        for (var i = 0; i < pool.length; i++) {
            if (pool[i] == info_key) return false;
        }

        this.m_list.add(key, info_key);
        info[this._hash_] = key;
        info[this._pos_] = this._find_pos(key);
        this.m_map.set(info_key, info);
        return true;
    }

    /**
     * 获取具体对象信息
     * @param info_key 
     * @return 包含一个 { _hash_: string }
     */
    getT(info_key: string | number): T {
        if (info_key == null || info_key == undefined) return null;
        info_key = info_key.toString();
        return this.m_map.get(info_key);
    }

    /**
     * 获取信息列表
     * @param key 
     */
    getL(key: string) {
        if (key == null || key == undefined) return [];
        if (this.keep_pos) {
            // 如果位置是需要固定的，那么
            let room = this.m_list.get(key);
            let out = [];
            for (let i = 0; i < room.length; i++) {
                let z = this.m_map.get(room[i]);
                if (z) out[z[this._pos_]] = room[i];
            }

            return out;
        }
        else {
            return this.m_list.get(key);
        }
    }

    /**
     * 删除某个数据
     * @param info_key 
     */
    del(info_key: string | number) {
        if (info_key == null || info_key == undefined) return false;
        info_key = info_key.toString();
        var r_m = this.m_map.get(info_key);
        if (!r_m) {
            return false;
        }

        let is_owner = r_m[this._pos_] == 0;
        var key = r_m[this._hash_];
        this.m_map.del(info_key);
        var r_list = this.m_list.get(key);
        var rdx = r_list.indexOf(info_key);
        if (rdx >= 0) r_list.splice(rdx, 1);
        if (r_list.length == 0) this.m_list.del(key);
        else if (this.keep_pos) {
            // 如果第一个人不见了，那么就需要找一个人来做房主
            let minOne;
            for (let i = 0; i < r_list.length; i++) {
                let r_one = this.m_map.get(r_list[i]);
                if (!r_one) continue;
                if (!minOne) {
                    minOne = r_one;
                }
                else if (minOne[this._pos_] > r_one[this._pos_]) {
                    minOne = r_one;
                }
            }

            if (minOne) {
                minOne[this._pos_] = 0;

                // 特殊业务需求，交换房主的话需要取消到房主的准备状态
                minOne['ready'] = false;
            }
        }

        return true;
    }

    /**
     * 查询满足条件的信息
     * 这里只有一层识别，而且目前支持相同匹配
     * @param findObj 
     */
    find(findObj: any) {

        let match_list: T[] = [];
        let map_keys = this.m_map.keys;
        for (let i = 0; i < map_keys.length; i++) {
            let r_info = this.m_map.get(map_keys[i]);
            if (!r_info) continue;

            if (this._obj_judge(r_info, findObj)) {
                match_list.push(r_info);
            }
        }

        return match_list;
    }

    private _obj_judge(a, b) {
        // 这里只有一层识别，而且目前支持相同匹配
        if (typeof a != 'object' || typeof b != 'object') return false;
        for (let key in b) {
            if (a[key] != b[key]) return false;
        }

        return true;
    }
}

class TeamRoomMgr {

    m_pool: ListMap<ifRoomPlayer> = new ListMap<ifRoomPlayer>();

    m_lockRoom: TeMap<string> = new TeMap<string>();

    room_type: string = '';
    index_1v2: number = -1; 
    constructor(room_size, room_type) {
        this.m_pool.unit_size = room_size || 2;
        this.room_type = room_type || RoomType.N_2v2;
    }

    join_room(_sys_: if_sys_, nid: string, p: { uid: number, formation: if_pvp_match_info, name: string, level: number, icon: string, avatar: any, medals: Array<string>, pvp_score: number, pvp_level: number, winStreakCount: number, beans_1v2: number, index: number }, joinkey: string, index?: number) {
        if (!joinkey) return;
        //已经在房间里的需要退出了再进入
        if (this.m_pool.getT(p.uid)) {
            return;
        }
        if (this.m_lockRoom.get(joinkey)) return this.send_room_state(nid, 'roomlock', p.uid, {}, CharState.loadcomplete);

        var sInfo_a = serverMgrInst.find_server(nid);
        var rp: SeRaceOpp = {
            Id: p.uid,
            Name: p.name,
            Formation: p.formation.h_f,
            areaid:p.formation.areaid,
            Boss: p.formation.b_f,
            battleEquip:p.formation.battleEquip,
            pvp_score: p.pvp_score,
            pvp_level: p.pvp_level,
            castle_level: p.level,
            synccheck:p.formation.synccheck,
            Icon: p.icon,
            avatar: p.avatar,
            medals: p.medals,
            winStreakCount: p.winStreakCount,
            _plt_: _sys_.plt,
            lordUnit: p.formation.lordUnit,
            is_vip: p.formation.is_vip,
            vip_level: p.formation.vip_level,
            heros_skin: p.formation.heros_skin,
            beans_1v2: p.beans_1v2,
            index: p.index,
            guild_info: p.formation.guild_info,
        }

        if (this.m_pool.add(joinkey, p.uid, { uid: p.uid, race: rp, _sys_: _sys_, ready: false})) {
            this.send_room_state(nid, 'join', p.uid, {}, joinkey);
            this.notice_room_info(joinkey, 'join');
        }
        else {
            var r_p = this.m_pool.getT(p.uid);
            if (r_p) {
                this.send_room_state(nid, 'roomstate', p.uid, { infos: this.get_room_info(r_p[this.m_pool._hash_]), subtype: 'reset' }, r_p[this.m_pool._hash_]);
            }
            else {
                this.send_room_state(nid, 'roomfull', p.uid, {}, joinkey);
            }
        }
    }

    leave_room(_sys_: if_sys_, nid: string, p: { uid: number }) {
        var joinkey = '';
        var rp = this.m_pool.getT(p.uid);
        if (rp) {
            joinkey = rp[this.m_pool._hash_];
        }

        if(this.m_pool.del(p.uid)){
            this.send_room_state(nid, 'leave', p.uid, {});
            this.notice_room_info(joinkey, 'leave');
        }
        this.m_lockRoom.del(joinkey);
    }

    ready_room(_sys_: if_sys_, nid: string, p: { uid: number }, ready: boolean) {
        var r_u = this.m_pool.getT(p.uid);
        if (r_u) {
            r_u.ready = ready;
            this.notice_room_info(r_u[this.m_pool._hash_], 'ready');
            this.check_room(r_u[this.m_pool._hash_]);
        }
    }

    private check_room(room_key: string) {
        var r_room = this.m_pool.getL(room_key);
        // if (r_room.length < 2) return false;

        var r_l = [];
        for (var j = 0; j < r_room.length; j++) {
            var r_p = this.m_pool.getT(r_room[j]);
            //2v2需要全部准备，1v2不需要
            if (!r_p || (this.room_type == RoomType.N_2v2 && !r_p.ready)) return false;
            //1v2需要判断欢乐豆是否超过
            let base_count = Number(resMgrInst('sdw').getConfig('ChibiDifen').split(',')[r_p.race.index]);
            let refresh_count = Number(resMgrInst('sdw').getConfig('ChibiReset').split(',')[r_p.race.index]);
            if (!r_p || r_p.race.beans_1v2 < base_count * 3 + refresh_count) return false;
            r_l.push(r_p);
        }

        // 准备开始了，把大家设置回false
        for (var j = 0; j < r_room.length; j++) {
            var r_p = this.m_pool.getT(r_room[j]);
            if (!r_p) continue;

            r_p.ready = false;
            var sn = serverMgrInst.get_server(r_p._sys_.serverid);
            if (!sn) continue;
            if(this.room_type == RoomType.N_1v2){
                this.send_room_state(sn.nid, '1v2_startmatch', r_p.uid);
            }
            else{
                this.send_room_state(sn.nid, 'startmatch', r_p.uid);
            }
            
        }

        let teaminfos = [];
        for(let i = 0; i < r_room.length; i++){
            teaminfos.push({ sid: r_l[i]._sys_.serverid, uid: r_l[i].uid, rp: r_l[i].race })
        }
        switch(this.room_type){
            case RoomType.N_1v2:
                match1v2Inst.online_teammatch('', r_l[0]._sys_, teaminfos, this.room_type);
                break;
            case RoomType.N_2v2:
                match2v2Inst.online_teammatch('', r_l[0]._sys_, teaminfos, this.room_type);
                break;
        }

        // 锁掉这个房间 知道比赛结束才打开
        this.m_lockRoom.set(room_key, r_l[0].uid);
    }

    /**
     * 玩家比赛结果，解锁房间，然后重新设置房间状态
     * @param uid 
     */
    race_finish(uid: number) {
        var rp = this.m_pool.getT(uid);
        if (!rp) return;
        var joinkey = rp[this.m_pool._hash_];
        if (this.m_lockRoom.get(joinkey)) {
            this.m_lockRoom.del(joinkey);
            this.notice_room_info(joinkey, 'reset');
        }
    }

    get_room_info(roomkey) {
        var room = this.m_pool.getL(roomkey);

        var room_state: ifRoomNotice[] = [];
        for (var i = 0; i < room.length; i++) {
            var r_uid = room[i];
            var r_u = this.m_pool.getT(r_uid);
            if (!r_u) continue;
            room_state.push({
                uid: r_u.uid,
                pvp_level: r_u.race.pvp_level,
                icon: r_u.race.Icon,
                avatar: r_u.race.avatar,
                name: r_u.race.Name,
                ready: r_u.ready,
                index: r_u.race.index,
                is_vip: r_u.race.is_vip,
                vip_level: r_u.race.vip_level,
                guild_info: r_u.race.guild_info,
            });
        }

        return room_state;
    }

    notice_room_info(roomkey: string, subtype: string = '') {
        var room = this.m_pool.getL(roomkey);

        var room_state: ifRoomNotice[] = this.get_room_info(roomkey);

        for (var i = 0; i < room.length; i++) {
            var r_uid = room[i];
            var r_u = this.m_pool.getT(r_uid);
            if (!r_u) continue;
            var ss = serverMgrInst.get_server(r_u._sys_.serverid);
            if (!ss) continue;

            this.send_room_state(ss.nid, 'roomstate', r_u.uid, {
                infos: room_state,
                subtype: subtype
            }, '');
        }
    }

    private send_room_state(nid: string, type: string, uid: number, info: any = {}, joinkey: string = '') {
        var send_data = {
            cmd: "room_opr",
            type: type,
            uid: uid,
            joinkey: joinkey,
            info: info,
            room_type: this.room_type
        }

        netInst.sendData(send_data, nid);
    }
}

export var TeamRoomInst_2v2 = new TeamRoomMgr(2, RoomType.N_2v2);
export var TeamRoomInst_1v2 = new TeamRoomMgr(3, RoomType.N_1v2);

class PvPRoomMgr {

    m_pool: ListMap<ifRoomPlayer> = new ListMap<ifRoomPlayer>();

    m_lockRoom: TeMap<string> = new TeMap<string>();

    constructor() {
        this.m_pool.unit_size = 4;
        this.m_pool.keep_pos = true;
    }

    /**
     * 创建房间
     * @param _sys_ 
     * @param nid 
     * @param p 
     * @param joinkey 
     */
    create_room(_sys_: if_sys_, nid: string, p: { uid: number, formation: if_pvp_match_info, name: string, level: number, icon: string, avatar: any, medals: Array<string>, pvp_score: number, pvp_level: number, winStreakCount: number }, joinkey: string) {
        if (this.m_lockRoom.get(joinkey)) return this.send_room_state(nid, 'd_roomlock', p.uid, {}, CharState.loadcomplete);

        var sInfo_a = serverMgrInst.find_server(nid);
        var rp: SeRaceOpp = {
            Id: p.uid,
            Name: p.name,
            Formation: p.formation.h_f,
            areaid:p.formation.areaid,
            Boss: p.formation.b_f,
            battleEquip:p.formation.battleEquip,
            pvp_score: p.pvp_score,
            pvp_level: p.pvp_level,
            castle_level: p.level,
            Icon: p.icon,
            synccheck:p.formation.synccheck,
            avatar: p.avatar,
            medals: p.medals,
            winStreakCount: p.winStreakCount,
            _plt_: _sys_.plt,
            lordUnit: p.formation.lordUnit,
            is_vip: p.formation.is_vip,
            vip_level: p.formation.vip_level,
            guild_info: p.formation.guild_info,
        }

        if (this.get_room_info(joinkey).length != 0) {
            // 表示房间已经存在了，就不要创建了
            this.send_room_state(nid, 'd_is_created', p.uid, {}, joinkey);
        }
        else if (this.m_pool.add(joinkey, p.uid, { uid: p.uid, race: rp, _sys_: _sys_, ready: false })) {
            this.send_room_state(nid, 'd_join', p.uid, {}, joinkey);
            this.notice_room_info(joinkey, 'join');
        }
        else {
            var r_p = this.m_pool.getT(p.uid);
            if (r_p) {
                this.send_room_state(nid, 'd_roomstate', p.uid, { infos: this.get_room_info(r_p[this.m_pool._hash_]), subtype: 'reset' }, joinkey);
            }
            else {
                this.send_room_state(nid, 'd_roomfull', p.uid, {}, joinkey);
            }
        }
    }

    /**
     * 加入房间
     * @param _sys_ 
     * @param nid 
     * @param p 
     * @param joinkey 
     */
    join_room(_sys_: if_sys_, nid: string, p: { uid: number, formation: if_pvp_match_info, name: string, level: number, icon: string, avatar: any, medals: Array<string>, pvp_score: number, pvp_level: number, winStreakCount: number }, joinkey: string) {
        if (this.m_lockRoom.get(joinkey)) return this.send_room_state(nid, 'd_roomlock', p.uid, {}, CharState.loadcomplete);

        var sInfo_a = serverMgrInst.find_server(nid);
        var rp: SeRaceOpp = {
            Id: p.uid,
            Name: p.name,
            Formation: p.formation.h_f,
            areaid:p.formation.areaid,
            Boss: p.formation.b_f,
            battleEquip:p.formation.battleEquip,
            pvp_score: p.pvp_score,
            pvp_level: p.pvp_level,
            castle_level: p.level,
            synccheck:p.formation.synccheck,
            Icon: p.icon,
            avatar: p.avatar,
            medals: p.medals,
            winStreakCount: p.winStreakCount,
            _plt_: _sys_.plt,
            lordUnit: p.formation.lordUnit,
            is_vip: p.formation.is_vip,
            vip_level: p.formation.vip_level,
            guild_info: p.formation.guild_info,
        }
        if (this.get_room_info(joinkey).length == 0) {
            // 表示房间已经不存在，就不要创建了
            this.send_room_state(nid, 'd_is_uncreated', p.uid, {}, joinkey);
        }
        else if (this.m_pool.add(joinkey, p.uid, { uid: p.uid, race: rp, _sys_: _sys_, ready: false })) {
            this.send_room_state(nid, 'd_join', p.uid, {}, joinkey);
            this.notice_room_info(joinkey, 'join');
        }
        else {
            var r_p = this.m_pool.getT(p.uid);
            if (r_p) {
                this.send_room_state(nid, 'd_roomstate', p.uid, { infos: this.get_room_info(r_p[this.m_pool._hash_]), subtype: 'reset' }, joinkey);
            }
            else {
                this.send_room_state(nid, 'd_roomfull', p.uid, {}, joinkey);
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
    kick_room(_sys_: if_sys_, nid: string, p: { uid: number, kuid: number }, join_key: string) {
        let r_p = this.m_pool.getT(p.uid);
        if (!r_p) {
            return;
        }
        // let r_room = this.get_room_info(r_p['_hash_']);
        let jk = r_p[this.m_pool._hash_];
        var r_room = this.m_pool.getL(jk);
        for (let i = 0; i < r_room.length; i++) {
            let r_in = this.m_pool.getT(r_room[i]);
            if (!r_in) continue;
            if (i == 0 && r_in.uid != p.uid) break;
            else if (r_in.uid == p.kuid) {
                var ss = serverMgrInst.get_server(r_in._sys_.serverid);
                if (!ss) break;
                this.send_room_state(ss.nid, 'd_leave', r_in.uid, {}, jk);
                this.m_pool.del(r_in.uid);
                break;
            }
        }

        this.notice_room_info(jk, 'leave');
    }

    /**
     * 离开房间
     * @param _sys_ 
     * @param nid 
     * @param p 
     */
    leave_room(_sys_: if_sys_, nid: string, p: { uid: number }) {
        var joinkey = '';
        var rp = this.m_pool.getT(p.uid);
        if (rp) {
            joinkey = rp[this.m_pool._hash_];
        }

        if(this.m_pool.del(p.uid)){
            this.send_room_state(nid, 'd_leave', p.uid, {}, joinkey);
            this.notice_room_info(joinkey, 'leave');
        }

        this.m_lockRoom.del(joinkey);
    }

    ready_room(_sys_: if_sys_, nid: string, p: { uid: number }, ready: boolean) {
        var r_u = this.m_pool.getT(p.uid);
        if (r_u) {
            r_u.ready = ready;
            this.notice_room_info(r_u[this.m_pool._hash_], 'ready');
            this.check_room(r_u[this.m_pool._hash_]);
        }
    }

    private check_room(room_key: string) {
        var r_room = this.m_pool.getL(room_key);
        // if (r_room.length < 2) return false;

        var r_l = [];
        for (var j = 0; j < r_room.length; j++) {
            var r_p = this.m_pool.getT(r_room[j]);
            if (!r_p || !r_p.ready) return false;
            r_l.push({ sid: r_p._sys_.serverid, uid: r_p.uid, race: r_p.race, _sys_: r_p._sys_ });
        }

        // 准备开始了，把大家设置回false
        for (var j = 0; j < r_room.length; j++) {
            var r_p = this.m_pool.getT(r_room[j]);
            if (!r_p) continue;

            r_p.ready = false;
            var sn = serverMgrInst.get_server(r_p._sys_.serverid);
            if (!sn) continue;
            this.send_room_state(sn.nid, 'd_startmatch', r_p.uid, {}, room_key);
        }

        // 这里分成2v2 和1v1 目前先实现2v2的逻辑
        // setTimeout(() => {
        let rid = null;
        // 这里表示大家都准备好了，就要开始比赛了
        if (r_room.length == 2) {
            rid = matchInst.create_race(r_l, LiveMode.room)
        }
        else if (r_room.length == 4) {
            rid = match2v2Inst.create_race(r_l, LiveMode.room);
        }
        else {
            return false;
        }

        if (!rid) {
            // 比赛没有开启成功，那么就等等
            // 比赛服务器不存在，或者玩家主城等级不达标
            // 重置掉房间状态
            this._reset_room_state(room_key);
        }
        else {
            // 锁掉这个房间 知道比赛结束才打开
            this.m_lockRoom.set(room_key, r_l[0].uid);
        }
        // }, 500);
    }

    /**
     * 玩家比赛结果，解锁房间，然后重新设置房间状态
     * @param uid 
     */
    race_finish(uid: number) {
        var rp = this.m_pool.getT(uid);
        if (!rp) return;
        var joinkey = rp[this.m_pool._hash_];

        // 比赛结束了通知大家回到房间
        this._reset_room_state(joinkey);
    }

    // 重置房间状态
    private _reset_room_state(joinkey: string) {
        if (this.m_lockRoom.get(joinkey)) {
            this.m_lockRoom.del(joinkey);
            this.notice_room_info(joinkey, 'reset');
        }
    }

    get_room_info(roomkey) {
        var room = this.m_pool.getL(roomkey);

        var room_state: ifRoomNotice[] = [];
        for (var i = 0; i < room.length; i++) {
            var r_uid = room[i];
            var r_u = this.m_pool.getT(r_uid);
            if (r_u) {

                room_state.push({
                    uid: r_u.uid,
                    pvp_level: r_u.race.pvp_level,
                    icon: r_u.race.Icon,
                    avatar: r_u.race.avatar,
                    name: r_u.race.Name,
                    ready: r_u.ready,
                    is_vip: r_u.race.is_vip,
                    vip_level: r_u.race.vip_level,
                    guild_info: r_u.race.guild_info,
                });
            }
            else {
                room_state.push(null);
            }
        }

        return room_state;
    }

    notice_room_info(roomkey: string, subtype: string = '') {
        var room = this.m_pool.getL(roomkey);

        var room_state: ifRoomNotice[] = this.get_room_info(roomkey);

        for (var i = 0; i < room.length; i++) {
            var r_uid = room[i];
            var r_u = this.m_pool.getT(r_uid);
            if (!r_u) continue;
            var ss = serverMgrInst.get_server(r_u._sys_.serverid);
            if (!ss) continue;

            this.send_room_state(ss.nid, 'd_roomstate', r_u.uid, {
                infos: room_state,
                subtype: subtype
            }, '');
        }
    }

    clear_room_by_cls(_sys_: if_sys_) {
        // 有一个服务器断开了，那么就踢掉里面的房间玩家
        let pool = this.m_pool.find({ _sys_: _sys_ });
        for (let i = 0; i < pool.length; i++) {
            this.m_pool.del(pool[i].uid);
        }
    }

    private send_room_state(nid: string, type: string, uid: number, info: any, joinkey: string) {
        var send_data = {
            cmd: "room_opr",
            type: type,
            uid: uid,
            joinkey: joinkey,
            info: info
        }

        netInst.sendData(send_data, nid);
    }
}

export var PvPRoomMgrInst = new PvPRoomMgr();