import { IfMatchServiceBase } from "../matchDefine";
import { MatchUnitPlt } from "../matchUnit";
import { serverMgrInst } from "../../serverMgr";
import { raceService } from "../raceServices/raceService";
import { LiveMode } from "../../SeDefine";
import { MatchPoolMgr } from "../matchPool";

/**
 * 这个是约战的逻辑
 */
class roomService extends IfMatchServiceBase {
    static mode = '1v1pk';
    static enter(score: number | string) {
        return score.toString();
    }
    /**
     * 负责匹配和清理过期玩家和数据
     */
    static match(plt: string, floor: string, get_uids: (floor: string) => number[], reset_uids: (floor: string, uids: number[]) => void) {
        // 这里每个玩家的池子都是单独的
        let uids = [];
        let curr = Date.now();
        let useful_ids: number[] = [];
        let list = get_uids(floor);
        let matched = false;
        for (let i = 0; i < list.length; i++) {
            let uid = list[i];
            let r_match = MatchUnitPlt(plt).get_unit(uid, this.mode);
            if (!r_match || r_match.matched_time || !serverMgrInst.get_server(r_match._sys_.serverid)) {
                continue;
            }

            useful_ids.push(uid);
            // r_match.mode = '1v1';
            uids.push(r_match.uid);

            if (uids.length == 2) {
                matched = true;
                // 把自己的状态改成1v1,然后开始战斗吧
                for (let j = 0; j < uids.length; j++) {
                    let r_match_1 = MatchUnitPlt(plt).get_unit(uids[j], this.mode);
                    if (r_match_1) r_match_1.mode = '1v1';
                }
                raceService.create_race(plt, uids, '1v1', LiveMode.race);
                uids.splice(0, uids.length);
            }
        }

        if (matched) {
            // 如果有多的，就把多的从池子里面删除掉
            // 直接干掉池子
            for (let i = 0; i < uids.length; i++) {
                let r_match = MatchUnitPlt(plt).get_unit(list[i]);
                // 没匹配上的也给他淘汰掉 防止堆积
                r_match.matched_time = curr;
            }

        }
        reset_uids(floor, useful_ids);
    }
}

MatchPoolMgr.regist_pool(roomService.mode, roomService);