import { IfMatchServiceBase, MatchType } from "../matchDefine";
import { MatchUnitPlt } from "../matchUnit";
import { LiveMode } from "../../SeDefine";
import { raceService } from "../raceServices/raceService";
import { MatchRoomPlt } from "../matchRoom";
import { MatchPoolMgr } from "../matchPool";
/**
 * 2v2 存在好友组队的问题，这里处理的时候就比较麻烦了
 */
class pvp2v2Service extends IfMatchServiceBase {
    static mode = MatchType.match_2v2;
    static match(plt: string, floor: string, get_uids: (floor: string) => number[], reset_uids: (floor: string, uids: number[]) => void) {
        let list = get_uids(floor);
        list['shuffle']();

        let use_full_uids = [];
        let use_team = {};
        let match_list: number[] = [];
        let wait_team: number[] = [];
        for (let i = 0; i < list.length; i++) {
            // 这里处理的时候就要考录到组队的情况了
            let uid = list[i];
            let player = MatchUnitPlt(plt).get_unit(uid, this.mode);
            if (!player || player.matched_time) continue;

            use_full_uids.push(uid);

            if (player.roomid) {
                // 如果队伍用过了就pass
                if (use_team[player.roomid]) {
                    continue;
                }

                use_team[player.roomid] = 1;
                let teams = MatchRoomPlt(plt).get_room(player.roomid).uids;
                if (teams.length == 1) {
                    match_list.push(...teams);
                }
                else if (teams.length == 2) {
                    // 如果有队伍，那么就把玩家添加到队伍中去
                    if (match_list.length == 0 || match_list.length == 2) {
                        // 如果当时比赛正好把玩家投放到一组战斗中,那么直接投入进去
                        match_list.push(...teams);
                    }
                    else {
                        if (wait_team.length > 0) {
                            // 已经有一个队伍在等待了，那么来一起战斗
                            raceService.create_race(plt, [].concat(...wait_team, ...teams), this.mode, LiveMode.match);
                            wait_team.splice(0, wait_team.length);
                        }
                        else {
                            // 否则设置为等待队伍，等着下一把
                            wait_team.push(...teams);
                        }
                    }
                }
            }
            else {
                // 没有组队的直接丢入创建战斗池子
                match_list.push(uid);
            }

            if (match_list.length == 4) {
                raceService.create_race(plt, match_list, this.mode, LiveMode.match);
                match_list.splice(0, match_list.length);

                if (wait_team.length > 0) {
                    // 如果有等待队伍，那么就添加到池子中
                    match_list.push(...wait_team);
                    wait_team.splice(0, wait_team.length);
                }
            }
        }

        reset_uids(floor, use_full_uids);
    }
}

MatchPoolMgr.regist_pool(pvp2v2Service.mode, pvp2v2Service);