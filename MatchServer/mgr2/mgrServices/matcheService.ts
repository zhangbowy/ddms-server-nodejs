import { if_sys_, if_pvp_match_info } from "../../SeDefine";
import { MatchUnitPlt, IfMatchUnit } from "../matchUnit";
import { MatchRacePlt } from "../matchRace";
import { netInst } from "../../NetMgr/SeNetMgr";
import { MatchPoolMgr } from "../matchPool";

export class matchService {
    static protected_time = 5;

    static resetUnitState(uid: number, _sys_: if_sys_) {
        let uInfo = MatchUnitPlt(_sys_.plt).get_unit(uid);
        if (uInfo) uInfo._sys_ = _sys_;
    }

    static enterUnit(uid: number, _sys_: if_sys_, base: { formation: if_pvp_match_info, name: string, level: number, icon: string, avatar: any, medals: Array<string>, match_score: number, pvp_level: number }, extinfo: { win_count: number, lose_count: number, lone_oppname: Array<string>}) {
        let uInfo: IfMatchUnit = {
            uid: uid,
            mode: '',
            match_score: base.match_score,
            match_level: base.formation.castle_level,
            // 设置以下玩家的进入匹配时间
            enter_time: Date.now(),
            matched_time: 0,
            _sys_: _sys_,
            baseinfo: {
                formation: base.formation.h_f,
                boss_f: base.formation.b_f,
                battleEquip: base.formation.battleEquip,
                castle_level: base.level,
                synccheck: base.formation.synccheck,
                areaid:base.formation.areaid,
                pvp_level: base.pvp_level,
                name: base.name,
                icon: base.icon,
                avatar: base.avatar,
                medals: base.medals,
            },
            extinfo: {},
            // 默认大家都没有队伍的,出现队伍这种
            roomid: '',
        }

        // 把额外的信息复制以下
        for (let key in extinfo) {
            if (key == 'win_count') uInfo.extinfo.win_loop = extinfo[key];
            else if (key == 'lose_count') uInfo.extinfo.fai_loop = extinfo[key];
            else uInfo.extinfo[key] = extinfo[key];
        }

        MatchUnitPlt(_sys_.plt).add_unit(uid, uInfo);
        return uInfo;
    }

    static enterMatch(nid: string, mode: string, _sys_: if_sys_, uid: number, base: { formation: if_pvp_match_info, name: string, level: number, icon: string, avatar: any, medals: Array<string>, match_score: number, pvp_level: number }, extinfo: { win_count: number, lose_count: number, lone_oppname: Array<string>}) {
        this.resetUnitState(uid, _sys_);
        let uInfo = MatchUnitPlt(_sys_.plt).get_unit(uid, mode);
        if (uInfo) {
            // 匹配结果的保护时间 保护时间内无法发起第二次
            if (uInfo.matched_time && (uInfo.matched_time + this.protected_time < Date.now())) {
                return false;
            }
        }

        // 如果在比赛中了就返回比赛信息给他
        if (MatchRacePlt(_sys_.plt).is_in_racing(uid, nid)) {
            return false;
        }

        uInfo = this.enterUnit(uid, _sys_, base, extinfo);

        uInfo.mode = mode;
        // 然后把玩家丢入相应的池子中去匹配
        MatchPoolMgr.enter_pool(mode, uInfo.match_score, uInfo.uid, _sys_.plt);
        // 通知玩家加入成功
        netInst.sendData({ cmd: 'randlist', mode: mode, uid: uid, list: [] }, nid);
        return true;
    }

    static cancell_match(_sys_: if_sys_, uid: number) {
        // 取消匹配就是把玩家从池子中删除掉就好了，具体每个匹配规则中去实现玩家找不到后的池子处理
        MatchUnitPlt(_sys_.plt).del_unit(uid);
    }
}