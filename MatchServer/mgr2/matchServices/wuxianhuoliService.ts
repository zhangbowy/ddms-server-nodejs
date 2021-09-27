import { IfMatchServiceBase, MatchType } from "../matchDefine";
import { LiveMode } from "../../SeDefine";
import { MatchUnitPlt } from "../matchUnit";
import { raceService } from "../raceServices/raceService";
import { MatchPoolMgr } from "../matchPool";

class wuxianhuoliService extends IfMatchServiceBase {
    static mode = MatchType.match_wuxianhuoli;
    static match(plt: string, floor: string, get_uids: (floor: string) => number[], reset_uids: (floor: string, uids: number[]) => void) {
        let list = get_uids(floor);

        let use_full: number[] = []
        for (let i = 0; i < list.length; i++) {
            let player = MatchUnitPlt(plt).get_unit(list[i], this.mode);
            if (!player || player.matched_time) continue;
            use_full.push(list[i]);
        }

        list['shuffle']();

        for (let i = 0; i * 2 < list.length; i = i + 2) {
            raceService.create_race(plt, [list[i * 2], list[i * 2 + 1]], this.mode, LiveMode.doublemode);
        }

        reset_uids(floor,use_full);
    }
}

MatchPoolMgr.regist_pool(wuxianhuoliService.mode, wuxianhuoliService);