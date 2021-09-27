import { SeLogicFormation, SeRaceOpp, if_sys_, LiveMode, if_pvp_match_info, NumType } from '../SeDefine';
import { HashMap, TeMap, arrayRandom } from '../lib/TeTool';
import { serverMgrInst } from "../serverMgr";
import { matchInst } from './Pvpv726';
import { match2v2Inst } from './TeamMatchMgr';
import { liveInst } from './LiveMgr';
import { netInst } from '../NetMgr/SeNetMgr';
import { TeamRoomInst_2v2, PvPRoomMgrInst, TeamRoomInst_1v2 } from './TeamRoomMgr';

interface ifNMUnit {
    uid: number;
    race: SeRaceOpp;
    sid: string;
    joinkey: string;
    _sys_: if_sys_;
}

/**
 * 这里负责处理输入数字后造成匹配的功能
 */
class RoomMatch {

    private m_catche: TeMap<HashMap<ifNMUnit>> = new TeMap<HashMap<ifNMUnit>>();


    constructor() {

    }

    proc_info(_sys_: if_sys_, nid: string, data: { uid: number, p: any, type: string, key: string, ready: boolean }) {
        switch (data.type) {
            case NumType.N_1v1: this.enter1v1_pk(_sys_, nid, data.p, data.key); break;
            case NumType.N_pve_pk: this.enter_pve_pk(_sys_, nid, data.p, data.key); break;
            // case NumType.N_2v2_team: this.enter2v2_team(_sys_, nid, data.p, data.key); break;
            // case NumType.N_2v2_pk: this.enter2v2_teampk(_sys_, nid, data.p, data.key); break;
            case NumType.N_cancell: this.cancell(_sys_, nid, data.uid); break;
            // case NumType.N_1v1_room: this.enter1v1_room(_sys_, nid, data.p, data.key); break;

            case NumType.N_2v2_join_room: TeamRoomInst_2v2.join_room(_sys_, nid, data.p, data.key); break;
            case NumType.N_2v2_ready_room: TeamRoomInst_2v2.ready_room(_sys_, nid, data.p, data.ready); break;
            case NumType.N_2v2_leave_room: TeamRoomInst_2v2.leave_room(_sys_, nid, data.p); break;
            
            case NumType.N_1v2_join_room: TeamRoomInst_1v2.join_room(_sys_, nid, data.p, data.key); break;
            case NumType.N_1v2_leave_room: TeamRoomInst_1v2.leave_room(_sys_, nid, data.p); break;
            case NumType.N_1v2_ready_room: TeamRoomInst_1v2.ready_room(_sys_, nid, data.p, data.ready); break;

            case NumType.N_ct_room: PvPRoomMgrInst.create_room(_sys_, nid, data.p, data.key); break;
            case NumType.N_jn_room: PvPRoomMgrInst.join_room(_sys_, nid, data.p, data.key); break;
            case NumType.N_kk_room: PvPRoomMgrInst.kick_room(_sys_, nid, data.p, data.key); break;
            case NumType.N_lv_room: PvPRoomMgrInst.leave_room(_sys_, nid, data.p); break;
            case NumType.N_rd_room: PvPRoomMgrInst.ready_room(_sys_, nid, data.p, data.ready); break;

            case NumType.N_force_leave: {
                TeamRoomInst_2v2.leave_room(_sys_, nid, data.p);
                TeamRoomInst_1v2.leave_room(_sys_, nid, data.p);
                PvPRoomMgrInst.leave_room(_sys_, nid, data.p);
                break;
            }
        }
    }

    private addRoomCatch(type: string, info: ifNMUnit) {
        var r_hashmap = this.m_catche.get(type);
        if (!r_hashmap) r_hashmap = new HashMap<ifNMUnit>();
        r_hashmap.add(type, info);

        this.m_catche.set(type, r_hashmap);
    }

    private enter1v1_pk(_sys_: if_sys_, nid: string, p: { uid: number, formation: if_pvp_match_info, pve_pk_formation: {}, name: string, level: number, icon: string, avatar: any, medals: Array<string>, pvp_score: number, pvp_level: number, winStreakCount: number, pve: {}}, joinkey: string) {
        this.cancell(_sys_, nid, p.uid);
        var sInfo_a = serverMgrInst.find_server(nid);
        var rp: SeRaceOpp = {
            Id: p.uid,
            Name: p.name,
            areaid:p.formation.areaid,
            Formation: p.formation.h_f,
            pve_pk_formation: p.pve_pk_formation,
            Boss: p.formation.b_f,
            battleEquip: p.formation.battleEquip,
            pvp_score: p.pvp_score,
            pvp_level: p.pvp_level,
            castle_level: p.level,
            synccheck:p.formation.synccheck,
            Icon: p.icon,
            avatar: p.avatar,
            medals: p.medals,
            winStreakCount: p.winStreakCount,
            _plt_: _sys_.plt,
            pve: p.pve,
            lordUnit: p.formation.lordUnit,
            is_vip: p.formation.is_vip,
            vip_level: p.formation.vip_level,
            guild_info: p.formation.guild_info,
        }

        this.addRoomCatch(NumType.N_1v1, { uid: p.uid, race: rp, sid: sInfo_a.sid, joinkey: joinkey, _sys_: _sys_ });
        matchInst.get_randomList(nid, _sys_, p.uid, p.level, NumType.N_1v1);
    }

    private enter_pve_pk(_sys_: if_sys_, nid: string, p: { uid: number, formation: if_pvp_match_info, pve_pk_formation: {}, name: string, level: number, icon: string, avatar: any, medals: Array<string>, pvp_score: number, pvp_level: number, winStreakCount: number, pve: any}, joinkey: string) {
        this.cancell(_sys_, nid, p.uid);
        var sInfo_a = serverMgrInst.find_server(nid);
        var rp: SeRaceOpp = {
            Id: p.uid,
            Name: p.name,
            areaid:p.formation.areaid,
            Formation: p.formation.h_f,
            pve_pk_formation: p.pve_pk_formation,
            Boss: p.formation.b_f,
            battleEquip: p.formation.battleEquip,
            pvp_score: p.pvp_score,
            pvp_level: p.pvp_level,
            castle_level: p.level,
            synccheck:p.formation.synccheck,
            Icon: p.icon,
            avatar: p.avatar,
            medals: p.medals,
            winStreakCount: p.winStreakCount,
            pve: p.pve,
            lordUnit: p.formation.lordUnit,
            _plt_: _sys_.plt,
            is_vip: p.formation.is_vip,
            vip_level: p.formation.vip_level,
            guild_info: p.formation.guild_info,
        }

        this.addRoomCatch(NumType.N_pve_pk, { uid: p.uid, race: rp, sid: sInfo_a.sid, joinkey: joinkey, _sys_: _sys_ });
        matchInst.get_randomList(nid, _sys_, p.uid, p.level, NumType.N_pve_pk);
    }    

    private enter1v1_room(_sys_: if_sys_, nid: string, p: { uid: number, formation: if_pvp_match_info, name: string, level: number, icon: string, pvp_score: number, pvp_level: number, avatar: any, medals: Array<string>, winStreakCount: number }, joinkey: string) {
        this.cancell(_sys_, nid, p.uid);

        // // 检查一下想要进入的房间是否上锁了
        // if (this._is_room_key_lock_(joinkey)) {
        //     this._cancell_ret(NumType.N_1v1_room, p.uid, _sys_.serverid);
        // }
        // else {
        //     var sInfo_a = serverMgrInst.find_server(nid);
        //     var rp: SeRaceOpp = {
        //         Id: p.uid,
        //         Name: p.name,
        //         Formation: p.formation.h_f,
        //         Boss: p.formation.b_f,
        //         battleEquip: p.formation.battleEquip,
        //         pvp_score: p.pvp_score,
        //         pvp_level: p.pvp_level,
        //         castle_level: p.level,
        //         Icon: p.icon,
        //         synccheck:p.formation.synccheck,
        //         avatar: p.avatar,
        //         medals: p.medals,
        //         winStreakCount: p.winStreakCount,
        //         _plt_: _sys_.plt
        //     }

        //     this.addRoomCatch(NumType.N_1v1_room, { uid: p.uid, race: rp, sid: sInfo_a.sid, joinkey: joinkey, _sys_: _sys_ });
        //     matchInst.get_randomList(nid, _sys_, p.uid, p.level, NumType.N_1v1_room);
        // }
    }

    private enter2v2_team(_sys_: if_sys_, nid: string, p: { uid: number, formation: if_pvp_match_info, name: string, level: number, icon: string, pvp_score: number, pvp_level: number, avatar: any, medals: Array<string>, winStreakCount: number }, joinkey: string) {
        this.cancell(_sys_, nid, p.uid);
        // var sInfo_a = serverMgrInst.find_server(nid);
        // var rp: SeRaceOpp = {
        //     Id: p.uid,
        //     Name: p.name,
        //     Formation: p.formation.h_f,
        //     Boss: p.formation.b_f,
        //     battleEquip: p.formation.battleEquip,
        //     pvp_score: p.pvp_score,
        //     pvp_level: p.pvp_level,
        //     castle_level: p.level,
        //     synccheck:p.formation.synccheck,
        //     Icon: p.icon,
        //     avatar: p.avatar,
        //     medals: p.medals,
        //     winStreakCount: p.winStreakCount,
        //     _plt_: _sys_.plt
        // }


        // // 玩家加入2v2的队伍 这里需要控制队伍规模

        // this.addRoomCatch(NumType.N_2v2_team, { uid: p.uid, race: rp, sid: sInfo_a.sid, joinkey: joinkey, _sys_: _sys_ });
        // match2v2Inst.randlist(NumType.N_2v2_team, _sys_, p.uid, p.level);
    }

    private enter2v2_teampk(_sys_: if_sys_, nid: string, p: { uid: number, formation: if_pvp_match_info, name: string, level: number, icon: string, pvp_score: number, pvp_level: number, avatar: any, medals: Array<string>, winStreakCount: number }, joinkey: string) {
        this.cancell(_sys_, nid, p.uid);
        // var sInfo_a = serverMgrInst.find_server(nid);
        // var rp: SeRaceOpp = {
        //     Id: p.uid,
        //     Name: p.name,
        //     Formation: p.formation.h_f,
        //     Boss: p.formation.b_f,
        //     battleEquip: p.formation.battleEquip,
        //     pvp_score: p.pvp_score,
        //     pvp_level: p.pvp_level,
        //     castle_level: p.level,
        //     synccheck:p.formation.synccheck,
        //     Icon: p.icon,
        //     avatar: p.avatar,
        //     medals: p.medals,
        //     winStreakCount: p.winStreakCount,
        //     _plt_: _sys_.plt
        // }

        // this.addRoomCatch(NumType.N_2v2_pk, { uid: p.uid, race: rp, sid: sInfo_a.sid, joinkey: joinkey, _sys_: _sys_ });
        // match2v2Inst.randlist('2v2', _sys_, p.uid, p.level);
    }

    public cancell(_sys_: if_sys_, nid: string, uid: number, force: boolean = false) {
        force && TeamRoomInst_2v2.leave_room(_sys_, nid, { uid: uid });
        force && TeamRoomInst_1v2.leave_room(_sys_, nid, { uid: uid });
        // var keys = this.m_catche.keys;
        // for (var i = 0; i < keys.length; i++) {
        //     this.m_catche.find2Del(keys[i], 'uid', uid);
        // }

        var keys = this.m_catche.keys;
        for (var i = 0; i < keys.length; i++) {
            var r_list = this.m_catche.get(keys[i]);
            var keys2 = r_list.keys;
            for (var j = 0; j < keys2.length; j++) {
                r_list.find2Del(keys2[j], 'uid', uid);
            }
        }

        TeamRoomInst_2v2.race_finish(uid);
        TeamRoomInst_1v2.race_finish(uid);
        PvPRoomMgrInst.race_finish(uid);
    }

    public updateLocgic() {
        // 一次刷新3个容器，组织比赛
        var keys = this.m_catche.keys;
        for (var i = 0; i < keys.length; i++) {
            var s_catch = this.m_catche.get(keys[i]);
            // var s_catch: HashMap<ifNMUnit> = new HashMap<ifNMUnit>();
            var lefts = [];


            switch (keys[i]) {
                case NumType.N_1v1: 
                    lefts = this.opr1v1_pk(s_catch); 
                    break;
                case NumType.N_pve_pk: 
                    lefts = this.oprpve_pk(s_catch);
                    break;
                // case NumType.N_2v2_team: lefts = this.opr2v2_team(s_catch); break;
                // case NumType.N_2v2_pk: lefts = this.opr2v2_teampk(s_catch); break;
                // case NumType.N_1v1_room: lefts = this.opr1v1_room(s_catch); break;
            }

            var left_catch: HashMap<ifNMUnit> = new HashMap<ifNMUnit>();
            for (var j = 0; j < lefts.length; j++) {
                left_catch.add(lefts[j].joinkey, lefts[j]);
            }

            if (left_catch.keys.length == 0) {
                this.m_catche.set(keys[i], undefined);
            }
            else {
                this.m_catche.set(keys[i], left_catch);
            }
        }
    }

    /**
     * 1v1 单挑
     * @param list 
     */
    private opr1v1_pk(list: HashMap<ifNMUnit>) {
        var left = [];
        for (var i = 0; i < list.keys.length; i++) {
            var r_l = list.get(list.keys[i]);
            while (r_l.length >= 2) {
                var wt = r_l.slice(0, 2);
                if (!matchInst.create_race(wt)) {
                    left = left.concat(wt);
                }
                r_l.splice(0, 2)
            }

            left = left.concat(r_l);
        }

        return left;
    }

    /**
     * pve 单挑
     * @param list 
     */
    private oprpve_pk(list: HashMap<ifNMUnit>) {
        var left = [];
        for (var i = 0; i < list.keys.length; i++) {
            var r_l = list.get(list.keys[i]);
            while (r_l.length >= 2) {
                var wt = r_l.slice(0, 2);
                if (!matchInst.create_pve_pk(wt)) {
                    left = left.concat(wt);
                }
                r_l.splice(0, 2)
            }

            left = left.concat(r_l);
        }

        return left;
    }    

    private _rid_bind_keys: TeMap<string> = new TeMap<string>();
    private _key_bind_rids: TeMap<string> = new TeMap<string>();

    public race_finish(rid: string) {
        if (!this._rid_bind_keys.has(rid)) {
            return;
        }

        var room_key = this._rid_bind_keys.get(rid);
        this._rid_bind_keys.del(rid);
        this._key_bind_rids.del(room_key);
    }

    private _lock_room_key_(key: string, rid: string) {
        this._rid_bind_keys.set(rid, key);
        this._key_bind_rids.set(key, rid);
    }

    private _is_room_key_lock_(key: string) {
        if (this._key_bind_rids.has(key)) {
            return true;
        }

        return false;
    }

    private _cancell_ret(mode, uid, sid) {
        var s = serverMgrInst.get_server(sid);
        s && netInst.sendData({ cmd: 'cancell', mode: mode, uid: uid }, s.nid);
    }

    /**
     * 1v1 类似开房间
     * @param list 
     */
    private opr1v1_room(list: HashMap<ifNMUnit>) {
        var left = [];
        for (var i = 0; i < list.keys.length; i++) {
            var r_l = list.get(list.keys[i]);
            // while (r_l.length >= 2) {
            if (r_l.length < 2) {
                left = left.concat(r_l);
                continue;
            }

            var owner = r_l[0];
            var luck = arrayRandom(r_l.slice(1, r_l.length));
            var wt = [owner, luck];
            var rid = matchInst.create_race(wt, LiveMode.room);
            if (!rid) {
                left = left.concat(r_l);
            }
            else {
                this._lock_room_key_(owner.joinkey, rid);

                // 其它人通知他们回家
                for (var j = 1; j < r_l.length; j++) {
                    var unluck = r_l[j];
                    if (unluck.uid == luck.uid) {
                        continue;
                    }

                    this._cancell_ret('1v1', unluck.uid, unluck.sid);
                }
            }
        }

        return left;
    }

    /**
     * 两个人组队，然后2v2
     * @param list 
     */
    private opr2v2_team(list: HashMap<ifNMUnit>) {
        var left = [];
        var teams = [];
        for (var i = 0; i < list.keys.length; i++) {
            var r_l = list.get(list.keys[i]);
            while (r_l.length >= 2) {
                // 两个两个组成队伍后扔到一起去
                // teams.push(r_l.slice(0, 2));
                var ra = { sid: r_l[0].sid, uid: r_l[0].uid, rp: r_l[0].race };
                var rb = { sid: r_l[1].sid, uid: r_l[1].uid, rp: r_l[1].race };
                match2v2Inst.online_teammatch('', r_l[0]._sys_, [ra, rb], '2v2');
                r_l.splice(0, 2)
            }

            left = left.concat(r_l);
        }

        // while (teams.length >= 2) {
        //     var wt = [].concat(teams[0], teams[1]);
        //     if (match2v2Inst.create_race(wt)) {
        //         left = left.concat(wt);
        //     }
        //     teams.splice(0, 2);
        // }

        if (teams.length == 1) {
            left = left.concat(teams[0]);
        }
        return left;
    }

    /**
     * 4个人输入一样的号码一起开始
     * @param list 
     */
    private opr2v2_teampk(list: HashMap<ifNMUnit>) {
        var left = [];
        for (var i = 0; i < list.keys.length; i++) {
            var r_l = list.get(list.keys[i]);
            while (r_l.length >= 4) {
                // 找到4个就同时开始战斗了
                var wt = r_l.slice(0, 4);
                if (!matchInst.create_race(wt)) {
                    left = left.concat(wt);
                }
                r_l.splice(0, 4);
            }

            left = left.concat(r_l);
        }

        return left;
    }

}

export var RoomMatchInst = new RoomMatch();