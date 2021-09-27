import { LiveMode, SeRacePvp } from "../../SeDefine";
import { MatchUnitPlt } from "../matchUnit";
import { serverMgrInst, DefineSType } from "../../serverMgr";
import { createHash } from "crypto";
import { resMgrInst } from "../../ResMgr/SeResMgr";
import { netInst } from "../../NetMgr/SeNetMgr";
import { MatchRacePlt } from "../matchRace";
import { IfJoinInfo } from "../matchDefine";
import { MatchRoomPlt } from "../matchRoom";


export class raceService {
    /**
    * 生成一个比赛的key
    */
    private static gen_check_key() {
        return 'game' + Math.floor(Math.random() * 2000) + Date.now();;
    }

    /**
     * 产生比赛，通知玩家和比赛服
     * @param uids 
     * @param mode 
     */
    static create_race(plt: string, uids: number[], mode: string, race_mode: LiveMode) {
        // 单边人数确定是1v1 还是 2v2
        let per_size = Math.floor(uids.length / 2);
        let uidmaps = {};
        let socre_pool = [0, 0];
        let curr = Date.now();
        // 需要保证玩家是存在的
        for (let i = 0; i < uids.length; i++) {
            let userA = MatchUnitPlt(plt).get_unit(uids[i], mode);
            if (!userA || userA.matched_time) return;
            uidmaps[uids[i]] = 1;
        }

        if (Object.keys(uidmaps).length != uids.length) {
            return;
        }

        // 先找一个战斗服出来
        let rLink = serverMgrInst.randomServer(DefineSType.race, plt);
        if (!rLink) return;

        let synccheck = false;
        /**构建玩家的战斗数据 */
        let raceInfos: SeRacePvp[] = [];
        for (let i = 0; i < uids.length; i++) {
            let userA = MatchUnitPlt(plt).get_unit(uids[i], mode);
            if (i < per_size) {
                socre_pool[0] += userA.match_score;
            }
            else {
                socre_pool[1] += userA.match_score;
            }

            raceInfos.push({
                Id: userA.uid,
                areaid:userA.baseinfo.areaid,
                Name: userA.baseinfo.name,
                Formation: userA.baseinfo.formation,
                Boss: userA.baseinfo.boss_f,
                battleEquip: userA.baseinfo.battleEquip,
                pvp_score: userA.match_score,
                pvp_level: userA.baseinfo.pvp_level,
                castle_level: userA.baseinfo.castle_level,
                winStreakCount: userA.extinfo.win_loop,
                Icon: userA.baseinfo.icon,
                avatar: userA.baseinfo.avatar,
                medals: userA.baseinfo.medals,
                rurl: rLink.url,
                synccheck: userA.baseinfo.synccheck,
                checkKey: this.gen_check_key(),
                sid: userA._sys_.serverid,
                _plt_: userA._sys_.plt,
                bTeam: MatchRoomPlt(plt).get_room(userA.roomid).users.length > 1,
                optime: curr,
                //需要传主公
                // lordUnit: userA.extra.lord,
                is_vip: false,
                vip_level: 0,
                guild_info: {},
            });

            // 把玩家设置成比配成功
            userA.matched_time = curr;
            synccheck = userA.baseinfo.synccheck || synccheck;
        }

        let rid = createHash('md5').update(JSON.stringify(raceInfos) + curr).digest('hex');
        let liveKey = this.gen_check_key();

        let racever = resMgrInst(plt).getConfig('racever');

        /**计算以下平局分 */
        for (let i = 0; i < socre_pool.length; i++) {
            socre_pool[i] = Math.floor(socre_pool[i] / per_size);
        }

        /**通知战斗服创建一把比赛 */
        netInst.sendData({
            cmd: 'startonline',
            raceinfos: raceInfos,
            rid: rid,
            livekey: liveKey,
            mode:mode,
            rmode: race_mode,
            racever: racever,
            stritc: (resMgrInst(plt).getConfig('race_stritc') == '1') ? true : synccheck,
        }, rLink.nid);

        /**通知玩家加入一个战斗 */
        for (let i = 0; i < raceInfos.length; i++) {
            let raceOppA = raceInfos[i];

            netInst.sendData({
                cmd: 'joinonline',
                checkKey: raceOppA.checkKey,
                rurl: raceOppA.rurl,
                rid: rid,
                uid: raceOppA.Id,
                oscore: socre_pool[i < per_size ? 1 : 0],
                mode: mode,
                rmode: race_mode
            }, serverMgrInst.get_server(raceOppA.sid).nid);
        }

        /**添加到战斗管理器中 */
        MatchRacePlt(plt).add_live_race(rid, raceInfos, rLink.url, liveKey, mode, race_mode, curr, racever);
        return rid;
    }

    /**
     * 重新加入战斗
     * @param nid 
     * @param uid 
     * @param r 
     */
    static rejoin_race(nid: string, uid: number, r: IfJoinInfo) {
        let old_race = r.joininfo;
        netInst.sendData({
            cmd: 'joinonline',
            checkKey: old_race.checkKey,
            rurl: old_race.rurl,
            rid: old_race.rid,
            uid: old_race.uid,
            oscore: old_race.oscore,
            mode: old_race.mode,
            rmode: old_race.rmode
        }, nid);
    }

    /**处理结算信息 */
    static race_finish(plt: string, infos: { uid: number, sid: string, bTeam: boolean, name: string }[], rid: string, rmode: number) {
        // 结算的时候
        let race = MatchRacePlt(plt).get_race_info(rid)
        if (!race) {
            console.log("<no race find>", JSON.stringify({ infos: infos, rid: rid, rmode: rmode }));
            return;
        }

        // 这里直接找到大区服务器,然后发给玩家结算
        for (var i = 0; i < infos.length; i++) {
            var r_info = infos[i];
            if (!r_info) continue;

            // 通知一下房间管理器，看看是否是需要设置玩家成战斗玩家的
            let r_unit = MatchUnitPlt(plt).get_unit(r_info.uid);
            if (r_unit && r_unit.roomid) {
                let r_room_user = MatchRoomPlt(plt).get_user(r_unit.uid);
                if (r_room_user) {
                    // 设置玩家的模式成队伍状态
                    r_unit.mode = r_room_user.mode;
                    // 重置一下匹配状态
                    r_unit.matched_time = 0;
                }
            }

            var rLink = serverMgrInst.get_server(r_info.sid) || serverMgrInst.randomServer(DefineSType.logic);
            if (!rLink) continue;

            r_info['cmd'] = 'pvp_result';
            r_info['rmode'] = rmode;
            r_info['bTeam'] = r_info.bTeam;
            r_info['oppname'] = infos[infos.length - 1 - i].name

            netInst.sendData(r_info, rLink.nid);
        }

        MatchRacePlt(plt).del_live_race(rid);
    }
}