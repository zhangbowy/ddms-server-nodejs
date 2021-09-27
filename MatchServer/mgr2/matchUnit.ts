import { SeLogicFormation, if_sys_ } from "../SeDefine";
import { matchService } from "./mgrServices/matcheService";
import { MatchRoomPlt } from "./matchRoom";

export interface IfMatchUnit {
    /**玩家id */
    uid: number;
    /**匹配时间 */
    enter_time: number;
    /**匹配上的时间 */
    matched_time: number;
    /**连接上来的信息 */
    _sys_: if_sys_,
    /**1v1 2v2  peek roompk friendpk*/
    mode: string,
    /**匹配用的主城等级 */
    match_level: number,
    /**匹配使用的积分 */
    match_score: number,

    /**阵容 */
    baseinfo: {
        formation: Array<SeLogicFormation>,
        boss_f: SeLogicFormation[],
        /**外部装配的东西 */
        battleEquip: any,
        /**段位 */
        pvp_level: number,
        /**名字 */
        name: string,
        areaid: string,

        /**头像 */
        icon: string,
        /**头像框等外部信息 */
        avatar: any,
        /**是否开启无效局 */
        synccheck: boolean,
        /**勋章列表 */
        medals: Array<string>,
        /**玩家实际的主城等级 */
        castle_level: number,
    },
    extinfo: {
        /**连胜次数 */
        win_loop?: number,
        /**连败次数 */
        fai_loop?: number,
        //.......
        lone_oppname?: Array<string>,
    },
    roomid: string
}

var pools: { [plt: string]: MatchUnitMgr } = {};
export function MatchUnitPlt(plt: string) {
    if (!pools.hasOwnProperty(plt)) {
        pools[plt] = new MatchUnitMgr(plt);
    }
    return pools[plt];
}

export function update_match_unit() {
    for (let key in pools) {
        let r = pools[key];
        r['_update_']();
    }
}

/**
 * 管理参与匹配的玩家信息，和玩家状态
 */
class MatchUnitMgr {
    private UnitPools: { [uid: number]: IfMatchUnit } = {};

    plt: string;
    constructor(plt) {
        this.plt = plt;
    }

    get_unit(uid: number, mode?: string) {
        let r = this.UnitPools[uid];
        if (mode) {
            if (r && r.mode == mode) return r;
        }
        else {
            return r;
        }

        return null;
    }

    add_unit(uid: number, info: IfMatchUnit) {
        this.UnitPools[uid] = info;
    }

    del_unit(uid: number, mode?: string) {
        if (mode) {
            let r = this.UnitPools[uid]
            if (r && r.mode == mode) {
                delete this.UnitPools[uid]
            }
        }
        else {
            delete this.UnitPools[uid]
        }
    }

    set_matched(uid: number) {
        let r = this.UnitPools[uid];
        if (r) {
            r.matched_time = Date.now();
        }
    }

    /**刷新玩家状态，把超过一定时间的玩家从池子中删除掉 */
    private _update_() {
        let curr = Date.now();
        for (let key in this.UnitPools) {
            let r = this.UnitPools[key];
            if (!r) {
                delete this.UnitPools[key];
            }
            else if (r.matched_time && (r.matched_time + matchService.protected_time) < curr) {
                // 如果玩家有房间id,那么需要检查一下房间是否存在
                if (r.roomid) {
                    let r_room_user = MatchRoomPlt(this.plt).get_user(r.uid);
                    // 如果玩家房间信息中的房间id和玩家匹配单元中的房间id一致，那么就保留这个数据
                    if (r_room_user && r_room_user._hash_ == r.roomid) {
                        continue;
                    }
                }
                this.del_unit(r.uid);
            }

        }
    }
}
