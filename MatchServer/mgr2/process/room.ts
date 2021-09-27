import { Match_Proc } from "../../NetMgr/matchProc";
import { if_sys_, NumType, LiveMode } from "../../SeDefine";
import { roomsService } from "../mgrServices/roomService";
import { pvpRoomsService } from "../mgrServices/pvpRoomService";
import { matchService } from "../mgrServices/matcheService";
import { serverMgrInst } from "../../serverMgr";
import { MatchRacePlt } from "../matchRace";
import { netInst } from "../../NetMgr/SeNetMgr";
import { MatchPoolMgr } from "../matchPool";
import { MatchUnitPlt } from "../matchUnit";

Match_Proc.regist_proc('roomopr', function (nid: string, data: { _sys_: if_sys_, uid: number, p: any, type: string, key: string, ready: boolean }) {
    let _sys_ = data._sys_;
    matchService.resetUnitState(data.uid, _sys_);
    switch (data.type) {
        // 1v1 直接开战 这个目前是好友约战
        case NumType.N_1v1: {
            matchService.enterUnit(data.uid, data._sys_, { formation: data.p.formation, name: data.p.name, level: data.p.level, icon: data.p.icon, avatar: data.p.avatar, medals: data.p.medals, match_score: data.p.pvp_score, pvp_level: data.p.pvp_level }, { win_count: 0, lose_count: 0, lone_oppname: []})
            // this.enter1v1_pk(_sys_, nid, data.p, data.key);
            let unit = MatchUnitPlt(_sys_.plt).get_unit(data.uid);
            unit.mode = '1v1pk';
            MatchPoolMgr.enter_pool('1v1pk', data.key, data.uid, _sys_.plt);
            break;
        }
        // pve 直接开战 这个目前是好友约战
        case NumType.N_pve_pk: {
            matchService.enterUnit(data.uid, data._sys_, { formation: data.p.formation, name: data.p.name, level: data.p.level, icon: data.p.icon, avatar: data.p.avatar, medals: data.p.medals, match_score: data.p.pvp_score, pvp_level: data.p.pvp_level }, { win_count: 0, lose_count: 0, lone_oppname: []})
            // this.enter1v1_pk(_sys_, nid, data.p, data.key);
            let unit = MatchUnitPlt(_sys_.plt).get_unit(data.uid);
            unit.mode = '1v1pk';
            MatchPoolMgr.enter_pool('1v1pk', data.key, data.uid, _sys_.plt);
            break;
        }

        // 取消组队
        case NumType.N_cancell: {
            this.cancell(_sys_, nid, data.uid);
            break;
        }

        case NumType.N_2v2_join_room: {
            matchService.enterUnit(data.uid, data._sys_, { formation: data.p.formation, name: data.p.name, level: data.p.level, icon: data.p.icon, avatar: data.p.avatar, medals: data.p.medals, match_score: data.p.pvp_score, pvp_level: data.p.pvp_level }, { win_count: 0, lose_count: 0, lone_oppname: []})
            // 加入房间的时候是否要重置以下玩家的状态
            roomsService.join_room(_sys_.plt, data.p.uid, data.key);
            break;
        }
        case NumType.N_2v2_ready_room: {
            roomsService.ready_room(_sys_.plt, data.p.uid, data.ready);
            break;
        }
        case NumType.N_2v2_leave_room: {
            roomsService.leave_room(_sys_.plt, data.p.uid);
            break;
        }
        case NumType.N_ct_room: {
            matchService.enterUnit(data.uid, data._sys_, { formation: data.p.formation, name: data.p.name, level: data.p.level, icon: data.p.icon, avatar: data.p.avatar, medals: data.p.medals, match_score: data.p.pvp_score, pvp_level: data.p.pvp_level }, { win_count: 0, lose_count: 0, lone_oppname: []})
            pvpRoomsService.create_room(_sys_.plt, data.p.uid, data.key);
            break;
        }
        case NumType.N_jn_room: {
            matchService.enterUnit(data.uid, data._sys_, { formation: data.p.formation, name: data.p.name, level: data.p.level, icon: data.p.icon, avatar: data.p.avatar, medals: data.p.medals, match_score: data.p.pvp_score, pvp_level: data.p.pvp_level }, { win_count: 0, lose_count: 0, lone_oppname: []})
            pvpRoomsService.join_room(_sys_.plt, data.p.uid, data.key);
            break;
        }
        case NumType.N_kk_room: {
            pvpRoomsService.kick_room(_sys_.plt, data.p.uid, data.p.kuid, data.key);
            break;
        }
        case NumType.N_lv_room: {
            pvpRoomsService.leave_room(_sys_.plt, data.p.uid);
            break;
        }
        case NumType.N_rd_room: {
            pvpRoomsService.ready_room(_sys_.plt, data.p.uid, data.ready);
            break;
        }

        case NumType.N_force_leave: {
            roomsService.leave_room(_sys_.plt, data.uid);
            pvpRoomsService.leave_room(_sys_.plt, data.p.uid);
            break;
        }
    }
},__filename);

Match_Proc.regist_proc('killroom', function (nid: string, data: { _sys_: if_sys_, rurl: string, rid: string, livekey: string }) {
    // RoomMatchInst.proc_info(data._sys_, nid, data);
    var race_server = serverMgrInst.find_race_by_rurl(data.rurl);
    var race = MatchRacePlt(data._sys_.plt).get_race_info(data.rid);
    if (race && race.rmode == LiveMode.room && race_server) {
        netInst.sendData({
            cmd: 'killroom',
            rid: data.rid,
            livekey: data.livekey
        }, race_server.nid);
    }
},__filename);