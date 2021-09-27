import { HashMap } from "../../lib/TeTool";
import { MatchUnitPlt } from "../matchUnit";
import { serverMgrInst } from "../../serverMgr";
import { resMgrInst } from "../../ResMgr/SeResMgr";
import { if_sys_, SeLogicFormation, SeRaceOpp, LiveMode } from "../../SeDefine";
import { robotService } from "./robotService";
import { netInst } from "../../NetMgr/SeNetMgr";
import { IfMatchServiceBase, MatchType } from "../matchDefine";
import { raceService } from "../raceServices/raceService";
import { MatchPoolMgr } from "../matchPool";

function func_elo_scale(elo: number) {
    var base = 500;
    var a = 1;
    var b = 500;

    var out = base;
    if (elo > 0) {
        out = (base * a + b) / (elo * a + b);
    }
    return out;
}

function changeElo(elo: number) {
    var base = 3000;
    if (elo <= base) return elo;

    var sc = func_elo_scale(elo);

    return Math.floor((elo - base) * sc + base);
}

class pvpService extends IfMatchServiceBase {
    static pvp_score_range = 200;
    static pvp_level_range = 10;
    static mode = MatchType.match_1v1;

    static plt(plt: string) {
        // 闪电玩玩吧的都安排到一起去
        if (plt == 'sdw' || plt == 'qzone') {
            return 'sdw';
        }

        return plt;
    }

    static enter(score: number) {
        return Math.floor(changeElo(score) / this.pvp_level_range).toString();
    }

    /**
     * 匹配一个分段的玩家
     * @param range 
     */
    static match(plt: string, floor: string, get_uids: (floor: string) => number[], reset_pool: (floor: string, uids: number[]) => void) {
        let range = parseInt(floor);
        let match_list: HashMap<{ castle_level: number, pvp_score: number, uid: number }> = new HashMap();

        // 找到可以进入当前层池子的账号
        let floor_range = Math.floor(this.pvp_score_range / this.pvp_level_range);
        for (let i = -floor_range * 2; i < floor_range * 2; i++) {
            let players = get_uids((i + range).toString());
            let use_ful_players: number[] = [];
            for (let j = 0; j < players.length; j++) {
                let uid = players[j];
                let r_match = MatchUnitPlt(plt).get_unit(uid, this.mode);
                // 首先要剔除掉上轮匹配上的玩家 如果玩家已经匹配上了也删除掉
                // 如果玩家的逻辑服和匹配服断开了也清理掉
                if (!r_match || r_match.matched_time || !serverMgrInst.get_server(r_match._sys_.serverid)) {
                    continue;
                }

                use_ful_players.push(uid);

                let pkBattleRank = resMgrInst(r_match._sys_.plt).getBattleRankByLevel(r_match.match_level);
                let time1 = pkBattleRank ? pkBattleRank.iMatch1 : 5;
                let time2 = pkBattleRank ? pkBattleRank.iMatch2 : 15;
                let count = Math.floor((Date.now() - r_match.enter_time) / 1000);
                let group_idx = 0;
                if (pkBattleRank && pkBattleRank.iMatchgroup) {
                    group_idx = pkBattleRank.iMatchgroup;
                }

                let looseprotect = parseInt(resMgrInst(r_match._sys_.plt).getConfig("looseprotect"));
                if (looseprotect && !isNaN(looseprotect) && r_match.extinfo.fai_loop >= looseprotect) {
                    // 触发连败人机条件，强制人机
                    this._match_offline_(r_match._sys_, r_match._sys_.serverid, r_match.uid, r_match.baseinfo.formation, r_match.baseinfo.battleEquip, r_match.match_score, r_match.extinfo.win_loop, r_match.extinfo.fai_loop, r_match.match_level);
                    continue;
                }
                else if (count < time1) {
                    // 判断是否满足区域
                    if (i >= -floor_range && i < floor_range) {
                        // 优先时间段内，优先找自己分区的
                        let areaRes = resMgrInst(r_match._sys_.plt).AreaRes.getRes(r_match.baseinfo.areaid);
                        if (areaRes) {
                            group_idx = areaRes.iType * 10 + group_idx;
                        }

                        match_list.add(group_idx, { uid: uid, castle_level: r_match.match_level, pvp_score: r_match.match_score });
                        continue;
                    }
                }
                else if (count < time2) {
                    // 判断是否满足区域
                    match_list.add(group_idx, { uid: uid, castle_level: r_match.match_level, pvp_score: r_match.match_score });
                    continue;
                }
                else {
                    // 发现有人超时了就立即给他一个解脱，马上匹配一个数据给他
                    this._match_offline_(r_match._sys_, r_match._sys_.serverid, r_match.uid, r_match.baseinfo.formation, r_match.baseinfo.battleEquip, r_match.match_score, r_match.extinfo.win_loop, r_match.extinfo.fai_loop, r_match.match_level);
                    continue;
                }
            }

            reset_pool((i + range).toString(), use_ful_players);
        }

        let mt_keys = match_list.keys;
        for (let i = 0; i < mt_keys.length; i++) {
            let r_list = match_list.get(mt_keys[i]);
            this._create_plt_race(plt, r_list);
        }
    }



    /**
     * 找到一个符合要求的玩家
     * @param uid 
     * @param score 
     * @param winCount 
     */
    private static _match_offline_(_sys_: if_sys_, sid: string, uid: number, f: Array<SeLogicFormation>, battleEquip: any, score: number, win_count: number, fai_loop: number, pvp_level: number, rmode = 0) {
        var kRange = this.pvp_score_range
        win_count = Math.min(win_count, 5);

        var rob_level = Math.floor(Math.log((score - 1400) * 0.4) / Math.log(1.6)) - 6;
        var player_per_level = this._total_level_(_sys_, f) / 8;

        var extK = 0.8;
        rob_level = Math.round(rob_level * extK + player_per_level * (1 - extK));

        var raceOpp: SeRaceOpp = robotService.getPveRobot2(_sys_, f, Math.floor(score + kRange * (1 - Math.random() * 2)), pvp_level, rob_level, win_count);

        var sn = serverMgrInst.get_server(sid);
        if (!sn) {
            sn = serverMgrInst.get_server(_sys_.serverid);
        }
        if (!sn) return;

        let unit = MatchUnitPlt(_sys_.plt).get_unit(uid);
        unit.matched_time = Date.now();
        var startGame = {
            cmd: 'pvpv726',
            uid: uid,
            mode: '1v1',
            rmode: rmode,
            raceinfo: raceOpp
        };

        netInst.sendData(startGame, sn.nid);
        return;
    }

    private static _total_level_(_sys_: if_sys_, fA: Array<SeLogicFormation>) {
        var totalLevel = 0;
        for (var i = 0; i < fA.length; i++) {
            var rkInfo = fA[i];
            if (!rkInfo) continue;
            var pkRes = resMgrInst(_sys_.plt).UnitRes.getRes(rkInfo.kHeroID);
            var level = rkInfo.iLevel;
            if (pkRes) {
                // 高级卡牌相当于普通卡牌的高级版
                level += (pkRes.iColour - 1) * 2;
            }

            totalLevel += level;
        }

        return totalLevel;
    }



    private static _robot_find(_sys_1: if_sys_, formation1: { h_f: SeLogicFormation[]; battleEquip: any; }, nid1: string, uid1: any, win_count1: number) {
        //连赢一把以上, 开启普通AI
        var raceOpp = robotService.getPveRobot2(_sys_1, formation1.h_f, 1500, 1, 1, 0, win_count1 < 1);
        var startGame = {
            cmd: 'pvpv726',
            uid: uid1,
            mode: '1v1',
            rmode: 0,
            raceinfo: raceOpp,
        };

        netInst.sendData(startGame, nid1);
    }

    /**
    * 依据平台筛选大区，进行特殊操作
    * @param list 
    */
    private static _create_plt_race(plt: string, list: { castle_level: number, pvp_score: number, uid: number }[]) {
        // 然后打乱一下排序
        // list['shuffle']();
        list.sort(function (a, b) {
            if (a.castle_level > b.castle_level) return 1;
            if (a.castle_level < b.castle_level) return -1;

            if (a.pvp_score > b.pvp_score) return 1;
            if (a.pvp_score < b.pvp_score) return -1;

            return a.uid > b.uid ? 1 : -1;
        })

        this._create_race(plt, list, 2);
    }

    /**
     * 产生对战的对手 返回失败的玩家
     * @param plist 
     */
    private static _create_race(plt: string, plist: { castle_level: number, pvp_score: number, uid: number }[], matchcount: number) {
        let vs_uids: number[] = [];
        for (let i = 0; i < plist.length; i++) {
            let uid = plist[i].uid;
            let user = MatchUnitPlt(plt).get_unit(uid, this.mode);
            if (!user || user.matched_time) continue;
            if (!user) continue;

            // 不能同时出现在同一个组中
            if (vs_uids.indexOf(user.uid) >= 0) continue;
            vs_uids.push(uid);

            if (vs_uids.length != matchcount) continue;

            // 检查以下玩家的真实主城等级和段位是否符合匹配条件
            let userA = MatchUnitPlt(plt).get_unit(vs_uids[0], this.mode);
            let userB = MatchUnitPlt(plt).get_unit(vs_uids[1], this.mode);
            if (!userA || !userB) continue;
            vs_uids = [];

            let iLevel = 16;
            let iRankLevel = 3;
            let pkResA = resMgrInst(userA._sys_.plt).getBattleRankByLevel(userA.baseinfo.pvp_level);
            if (pkResA) {
                iLevel = Math.min(iLevel, pkResA.iMatchLevel);
                iRankLevel = Math.min(iRankLevel, pkResA.iMatchRank)
            }

            let pkResB = resMgrInst(userB._sys_.plt).getBattleRankByLevel(userB.baseinfo.pvp_level);
            if (pkResB) {
                iLevel = Math.min(iLevel, pkResB.iMatchLevel);
                iRankLevel = Math.min(iRankLevel, pkResB.iMatchRank)
            }

            // 这里是 1v1的 判断一下两个的等级不能超过2级
            if (Math.abs(userA.match_level - userB.match_level) > iLevel) continue;

            // 这里是 1v1的 判断一下两个的段位等级不能超过3级
            if (Math.abs(userA.baseinfo.pvp_level - userB.baseinfo.pvp_level) > iRankLevel) return;

            //修改成不能连续匹配相同的玩家
            for(let j = 0; j < userA.extinfo.lone_oppname.length; j++){
                if(userA.extinfo.lone_oppname[j] == userB.baseinfo.name) return null;
            }
            for(let j = 0; j < userB.extinfo.lone_oppname.length; j++){
                if(userB.extinfo[1].lone_oppname[j] == userA.baseinfo.name) return null;
            }
            raceService.create_race(plt, [userA.uid, userB.uid], '1v1', LiveMode.match);
        }
    }
}

MatchPoolMgr.regist_pool(pvpService.mode, pvpService);