import { SeRacePvp, LiveMode } from "../SeDefine";
import { TeMap } from "../lib/TeTool";
import { ifLiveRace, IfJoinInfo } from "./matchDefine";
import { raceService } from "./raceServices/raceService";


let pools: { [plt: string]: MatchRaceMgr } = {};

export function MatchRacePlt(plt) {
    if (!pools.hasOwnProperty(plt)) {
        pools[plt] = new MatchRaceMgr(plt);
    }

    return pools[plt];
}

/**
 * 管理生成战斗信息
 */
class MatchRaceMgr {
    /**战斗信息 */
    private _all_live_races: TeMap<ifLiveRace> = new TeMap<ifLiveRace>();
    /**
     * 玩家id和比赛的绑定信息
     */
    private _uid_to_race: TeMap<IfJoinInfo> = new TeMap();

    /**战斗服和局数的限制 */
    public race_count_monit: TeMap<number> = new TeMap<number>();

    plt: string;
    constructor(plt: string) {
        this.plt = plt;
    }

    get_race_info(rid:string){
        return this._all_live_races.get(rid);
    }

    /**判断某个比赛是否是指定的模式 */
    is_race_mode(rid: string, rmode: LiveMode): boolean {
        var r_a = this._all_live_races.get(rid);
        if (r_a) {
            return r_a.rmode == rmode;
        }

        return false;
    }

    /**判断玩家是否在比赛中 */
    is_in_racing(uid: number, nid: string) {
        // live race 里面看看是否在比赛了
        let r = this._uid_to_race.get(uid);
        if (r && (r.time + 90 * 1000 > Date.now())) {
            // 如果玩家两把之间时间差 30s 就不给他匹配，要求他等待
            // console.log('repleate online_match at ' + Date.now() + ' uid:' + uid + ' last' + r.time);

            // 在比赛中，那么把老的比赛信息发给他，让他重新进入
            raceService.rejoin_race(nid,uid,r);
            return true;
        }

        return false;
    }

    /**添加比赛的信息 */
    add_live_race(rid: string, infos: SeRacePvp[], rurl: string, liveKey: string, mode: string, race_mode: LiveMode, cttime = Date.now(), racever: string) {
        this.race_count_monit.set(rurl, (this.race_count_monit.get(rurl) || 0) + 1);

        this._all_live_races.set(rid, {
            rid: rid,
            rurl: rurl,
            infos: infos,
            liveKey: liveKey,
            cttime: cttime,
            mode: mode,
            rmode: race_mode,
            racever: racever
        });

        for (let i = 0; i < infos.length; i++) {
            let r = infos[i];
            let opp = infos[infos.length - 1 - i];
            this._uid_to_race.set(r.Id, {
                rid: rid,
                joininfo: {
                    checkKey: r.checkKey,
                    rurl: r.rurl,
                    rid: rid,
                    uid: r.Id,
                    oscore: opp.pvp_score,
                    mode: mode,
                    rmode: race_mode
                }, time: (r.optime || Date.now())
            });
        }
    }


    /**删除某个比赛的信息 */
    del_live_race(rid: string) {
        var r = this._all_live_races.get(rid);
        if (r) {
            /**
             * 清理一下玩家的比赛状态
             */
            for (let i = 0; i < r.infos.length; i++) {
                let r_info = r.infos[i];
                this._uid_to_race.del(r_info.Id);
            }

            this.race_count_monit.set(r.rurl, Math.max(0, (this.race_count_monit.get(r.rurl) || 0) - 1));
            this._all_live_races.del(rid);
        }
    }

    /**删除某个战斗服的战斗数据 */
    del_race_by_url(rurl: string) {
        var keys = this._all_live_races.keys;
        for (var i = 0; i < keys.length; i++) {
            var r1 = this._all_live_races.get(keys[i]);
            if (!r1) continue;
            if (rurl == r1.rurl) {
                for (let j = 0; j < r1.infos.length; j++) {
                    let r_info = r1.infos[j];
                    this._uid_to_race.del(r_info.Id);
                }
                this._all_live_races.del(keys[i]);
            }
        }
        this.race_count_monit.del(rurl);
    }

    /**获取某个类型的战斗 */
    get_live_race(rmode: LiveMode) {
        var curr = Date.now();
        var outs: ifLiveRace[] = [];
        var keys = this._all_live_races.keys;
        for (var i = 0; i < keys.length; i++) {
            var r = this._all_live_races.get(keys[i]);
            if (!r) {
                this._all_live_races.del(keys[i]);
                continue;
            }
            if (curr - r.cttime > 1000 * 60 * 3.5) {
                this._all_live_races.del(keys[i]);
            }

            if (r.rmode != rmode) {
                continue;
            }

            outs.push(r);
        }

        return outs;
    }

  
}