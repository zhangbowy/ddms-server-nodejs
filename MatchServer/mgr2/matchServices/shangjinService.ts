import { LiveMode } from "../../SeDefine";
import { configInst } from "../../lib/TeConfig";
import { resMgrInst } from "../../ResMgr/SeResMgr";
import { MatchUnitPlt } from "../matchUnit";
import { IfMatchServiceBase, MatchType } from "../matchDefine";
import { raceService } from "../raceServices/raceService";
import { MatchPoolMgr } from "../matchPool";


class shangjinService extends IfMatchServiceBase {

    //匹配人数
    static _math_count = 2;
    //更新匹配区间的时间(单位:秒)
    static match_update_time = 10;
    //匹配单元粒度
    static shangjin_score_range = 50;
    //匹配每刷新一次的增量(单位为倍率)
    static shangjin_range_rate = 1;
    //匹配范围阈值(单位为倍率)
    static shangjin_range_limit = 3;
    //匹配优先顺序 1 正序 大的优先, -1 反序 小的优先
    static shangjin_match_order = 1;

    static enter(score: number) {
        return Math.floor(score / this.shangjin_score_range).toString();
    }


    static isInOpenTime() {
        if (configInst.get('cheatmode')) {
            return true;
        }

        let curr = Date.now();
        // 遍历所有分数段
        let plt = 'sdw';
        let startTime_res = resMgrInst(plt).getConfig("competitionStartTime");
        let endTime_res = resMgrInst(plt).getConfig("competitionEndTime");
        if (!startTime_res || !endTime_res) {
            return true;
        }

        let startTimes = startTime_res.split(':');
        let endTimes = endTime_res.split(':');
        if (curr > new Date().setHours(parseInt(startTimes[0]), parseInt(startTimes[1])) &&
            curr < new Date().setHours(parseInt(endTimes[0]), parseInt(endTimes[1]))) {
            return true;
        }

        return false;
    }

    static mode = MatchType.match_shangjin;

    static match(plt: string, floor: string, get_uids: (floor: string) => number[], reset_pool: (floor: string, uids: number[]) => void) {
        // 先看看本身是否满足了人数了，如果够了就直接开启来吧
        // 往高级的地方扩展查询
        let base_floor = parseInt(floor);

        let match_pool: { uid: number, score: number, level: number, time: number }[] = [];
        for (let i = -this.shangjin_range_limit; i <= this.shangjin_range_limit; i++) {
            // 找到所有满足进入当前floor上的单位
            let players = get_uids((base_floor + i).toString());
            let usefull_uids = [];
            for (let j = 0; j < players.length; j++) {
                // 看看大家是否满足了进入池子的要求
                let uid = players[j];
                let player = MatchUnitPlt(plt).get_unit(uid, this.mode);
                if (!player || player.matched_time) continue;
                usefull_uids.push(uid);

                let range = Math.min((Math.floor((Date.now() - player.enter_time) / (this.match_update_time * 1000)) * this.shangjin_range_rate), this.shangjin_range_limit);
                let player_base = parseInt(this.enter(player.match_score));
                if (player_base + range > base_floor || player_base - range < base_floor) continue;

                match_pool.push({ uid: player.uid, score: player.match_score, level: player.match_level, time: player.enter_time });
            }

            reset_pool('' + (base_floor + i), usefull_uids);
        }

        match_pool.sort(function (a, b) {
            if (a.score > b.score) return 1;
            if (a.score < b.score) return -1;

            if (a.level > b.level) return 1;
            if (a.level < b.level) return -1;

            if (a.time > b.time) return 1;
            if (a.time < b.time) return -1;

            return a.uid > b.uid ? 1 : -1;
        })

        for (let i = 0; i * 2 < match_pool.length - 1; i++) {

            raceService.create_race(plt, [match_pool[i * 2].uid, match_pool[i * 2 + 1].uid], this.mode, LiveMode.shangjin);
        }
    }
}

MatchPoolMgr.regist_pool(shangjinService.mode, shangjinService);