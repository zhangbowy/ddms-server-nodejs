Array.prototype['shuffle'] = function () {
    for (var j, x, i = this.length; i; j = parseInt((Math.random() * i).toString()), x = this[--i], this[i] = this[j], this[j] = x);
    return this;
};

import {SeRacePvp, LiveMode, if_sys_, if_pvp_match_info, if_base_player } from '../SeDefine';
import { HashMap, TeMap } from '../lib/TeTool';
import { resMgrInst } from '../ResMgr/SeResMgr';
import { netInst } from '../NetMgr/SeNetMgr';
import { serverMgrInst, DefineSType } from '../serverMgr';
import { createHash } from 'crypto';
import { liveInst } from './LiveMgr';
import { pltMgrInst } from './PltMgr';
import { TeamRoomInst_2v2, PvPRoomMgrInst, TeamRoomInst_1v2 } from './TeamRoomMgr';
import { matchInst } from './Pvpv726';
import { configInst } from '../lib/TeConfig';

export var GetRobotDefine = {
    colorScore: [100, 120, 145, 175],
    colorDScore: [20, 24, 29, 35],
    count: 8
}

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

export function changeElo(elo: number) {
    var base = 3000;
    if (elo <= base) return elo;

    var sc = func_elo_scale(elo);

    return Math.floor((elo - base) * sc + base);
}

class PvpInfo {
    private static _inst: PvpInfo;
    static get inst() {
        if (!this._inst) this._inst = new PvpInfo();
        return this._inst;
    }

    private player: TeMap<SeMatchPlayer> = new TeMap<SeMatchPlayer>();
    private onlineMatcher: HashMap<number> = new HashMap<number>();

    get floors() {
        return this.onlineMatcher.keys;
    }

    get_players(floor: number) {
        let players: SeMatchPlayer[] = [];
        let uids = this.onlineMatcher.get(floor);
        for (let i = 0; i < uids.length; i++) {
            let r = this.player.get(uids[i]);
            if (r) {
                players.push(r);
            }
        }

        return players;
    }

    /**批量添加玩家 */
    add_players(players: SeMatchPlayer[]) {
        for (let i = 0; i < players.length; i++) {
            this.add_player(players[i]);
        }
    }

    /**添加玩家 */
    add_player(player: SeMatchPlayer) {
        var floor = 0;
        if (this.player.has(player.uid)) {
            // 存在过，那么需要从原来的池子里找找玩家看
            this.del_player(player.uid);
        }
        else {
            this.onlineMatcher.add(floor, player.uid);
        }
        this.player.set(player.uid.toString(), player);
    }

    /**
     * 删除一个玩家
     * @param uid 
     */
    del_player(uid: number) {
        let player = this.player.get(uid);
        if (player) {
            let floor = 0;
            let list = this.onlineMatcher.get(floor);
            if (list.length > 0) {
                let idx = list.indexOf(uid);
                if (idx >= 0) {
                    list.splice(idx, 1);
                }
            }
            if (list.length == 0) {
                this.onlineMatcher.del(floor);
            }
            else {
                this.onlineMatcher.set(floor, list);
            }

            this.player.del(uid);
        }
    }

    /**删除某一个区间玩家 */
    del_floor(floor: number, exp: number[] = []) {
        let floor_uids = this.onlineMatcher.get(floor);
        for (let i = 0; i < floor_uids.length; i++) {
            let uid = floor_uids[i];
            if (exp.indexOf(uid) >= 0) continue;
            this.player.del(uid);

            floor_uids.splice(i, 1);
            i--;
        }
        if (floor_uids.length == 0) {
            this.onlineMatcher.del(floor);
        }
        else {
            this.onlineMatcher.set(floor, floor_uids);
        }
    }
}
/**
 * 这里负责所有的数据
 */

interface SeMatchPlayer extends if_base_player {
    pvp_score: number;
    real_level: number;
    win_loop: number;
    fai_loop: number;
    lone_oppname: Array<string>;
}

export class WuXianHuoLiMatch {

    private static _inst: WuXianHuoLiMatch;

    static get inst() {
        if (!this._inst) {
            this._inst = new WuXianHuoLiMatch();
        }
        return this._inst;
    }

    private _math_count = 2;
    constructor() {

    }

    private _last_join = {};

    public online_match(...args);
    public online_match(nid: string, _sys_: if_sys_, uid: number, formation: if_pvp_match_info, name: string, level: number, icon: string, avatar: any, medals: Array<string>, pvp_score: number, pvp_level: number, win_count: number, lose_count: number, lone_oppname: Array<string>) {
        if (this._last_join[uid.toString()] && (this._last_join[uid.toString()] + 2000 > Date.now())) {
            return;
        }

        if (liveInst.is_in_racing(uid, nid)) {
            return;
        }

        this._last_join[uid.toString()] = Date.now();

        netInst.sendData({ cmd: 'randlist', mode: 'wuxianhuoli', uid: uid, list: matchInst.get_rand_list_(_sys_, pvp_level, uid) }, nid);
        this._online_cancell(_sys_, nid, uid, pvp_score);

        var sInfo = serverMgrInst.find_server(nid);
        var mp: SeMatchPlayer = {
            uid: uid,
            areaid:formation.areaid,
            formation: formation.h_f,
            boss_f: formation.b_f,
            pvp_score: pvp_score,
            pvp_level: pvp_level,
            battleEquip:formation.battleEquip,
            name: name,
            real_level: formation.castle_level || level,
            castle_level: level,
            icon: icon,
            avatar: avatar,
            medals: medals,
            enter_time: Math.floor(Date.now() / 1000),
            win_loop: win_count,
            fai_loop: lose_count,
            lone_oppname: lone_oppname,
            synccheck:formation.synccheck,
            _sys_: _sys_,
            extra: {lord: formation.lordUnit, pve: formation.pve},
            is_vip: formation.is_vip,
            vip_level: formation.vip_level,
            guild_info: formation.guild_info,
        }

        // 匹配玩家按照实力分区
        PvpInfo.inst.add_player(mp);
    }

    public _online_cancell(_sys_: if_sys_, nid: string, uid: number, score: number) {
        PvpInfo.inst.del_player(uid);

 //       TeamRoomInst.leave_room(_sys_, nid, { uid: uid });
  //      PvPRoomMgrInst.leave_room(_sys_, nid, { uid: uid });
        TeamRoomInst_2v2.race_finish(uid);
        TeamRoomInst_1v2.race_finish(uid);
        PvPRoomMgrInst.race_finish(uid);
    }

    private _matched_uids: Object = {};

    /**
     * 更新在线匹配
     */
    public update() {
        this._matched_uids = {};
        var r_list: SeMatchPlayer[] = [].concat(PvpInfo.inst.get_players(0));
        PvpInfo.inst.del_floor(0);
        this._create_plt_race(r_list);
    }

    /**
     * 依据平台筛选大区，进行特殊操作
     * @param list 
     */
    private _create_plt_race(list: SeMatchPlayer[]) {
        // 然后打乱一下排序
        list['shuffle']();

        // 这里需要按照是否可以开战来分个组
        var group_lists: SeMatchPlayer[][] = [];
        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            if (!r) continue;
            var idx = pltMgrInst.match_plt(r._sys_);
            // 跨服，除sdw和qzone都匹配在一起
            if(configInst.get('openGlobal')) idx = 0;
            if (!group_lists[idx]) group_lists[idx] = [];
            group_lists[idx].push(r);
        }

        for (var i = 0; i < group_lists.length; i++) {
            if (!group_lists[i]) continue;
            var r_match_list = this._create_race(group_lists[i]);
            if (r_match_list.length > 0) PvpInfo.inst.add_players(r_match_list);
        }
    }

    /**
     * 生成一个比赛的key
     */
    private _gen_check_key() {
        var key = 'ck' + Math.floor(Math.random() * 2000) + Date.now();
        return key;
    }

    /**
     * 产生对战的对手 返回失败的玩家
     * @param plist 
     */
    private _create_race(plist: Array<SeMatchPlayer>): Array<SeMatchPlayer> {
        var out = [];

        var vs_infos: SeMatchPlayer[] = [];
        var vs_uids: number[] = [];
        for (var i = 0; i < plist.length; i++) {
            var r_wt = plist[i];
            if (!r_wt) continue;
            if (vs_uids.indexOf(r_wt.uid) >= 0 || !serverMgrInst.get_server(r_wt._sys_.serverid)) {
                out.push(r_wt)
            }
            else {
                vs_infos.push(r_wt);
                vs_uids.push(r_wt.uid);
            }

            if (vs_infos.length == this._math_count) {
                if (this._send_race(vs_infos, LiveMode.doublemode)) {
                    vs_infos = [];
                }
                else {
                    out = out.concat(vs_infos)
                    vs_infos = [];
                }

                vs_uids = [];
            }
        }

        out = out.concat(vs_infos);
        return out;
    }
    /**
     * 产生比赛，通知玩家和比赛服
     * @param infos 
     * @param mode 
     */
    public _send_race(infos: SeMatchPlayer[], mode: LiveMode): string {
        let plt: string = infos[0]._sys_.plt;
        let rLink = null;

        for (let i = 0; i < infos.length; i++) {
            rLink = serverMgrInst.randomServer(DefineSType.race, plt);
            if (rLink) break;
        }

        if (!rLink) {
            return null;
        }

        // 特殊检查id，防止同一个玩家自己匹配到自己
        let uids = [];
        for (let i = 0; i < infos.length; i++) {
            if (uids.indexOf(infos[i].uid) < 0) {
                uids.push(infos[i].uid);
            }
        }

        if (uids.length != infos.length) return null;

        let synccheck = false;
        let raceInfos: SeRacePvp[] = [];
        for (let i = 0; i < infos.length; i++) {
            let vA = infos[i];

            let raceOppA: SeRacePvp = {
                Id: vA.uid,
                Name: vA.name,
                areaid:vA.areaid,
                Formation: vA.formation,
                Boss: vA.boss_f,
                battleEquip:vA.battleEquip,
                pvp_score: vA.pvp_score,
                pvp_level: vA.pvp_level,
                castle_level: vA.real_level,
                winStreakCount: vA.win_loop,
                Icon: vA.icon,
                avatar: vA.avatar,
                medals: vA.medals,
                rurl: rLink.url,
                checkKey: this._gen_check_key(),
                sid: vA._sys_.serverid,
                _plt_: infos[i]._sys_.plt,
                bTeam: false,
                synccheck:vA.synccheck,
                optime: Date.now(),
                lordUnit: vA.extra.lord,
                is_vip: vA.is_vip,
                vip_level: vA.vip_level,
                guild_info: vA.guild_info,
            }

            raceInfos.push(raceOppA);
        }


        var rid = createHash('md5').update(JSON.stringify(raceInfos) + Date.now()).digest('hex');
        var liveKey = this._gen_check_key();

        var racever = resMgrInst(plt).getConfig('racever');

        netInst.sendData({
            cmd: 'startonline',
            raceinfos: raceInfos,
            rid: rid,
            livekey: liveKey,
            rmode: mode,
            racever: racever,
            stritc: (resMgrInst(plt).getConfig('race_stritc') == '1') ? true : synccheck,
        }, rLink.nid);

        for (var i = 0; i < raceInfos.length; i++) {
            var vA = infos[i];
            var vB = infos[raceInfos.length - 1 - i];
            var raceOppA = raceInfos[i];

            netInst.sendData({
                cmd: 'joinonline',
                checkKey: raceOppA.checkKey,
                rurl: raceOppA.rurl,
                rid: rid,
                uid: raceOppA.Id,
                oscore: vB.pvp_score,
                mode: 'wuxianhuoli',
                rmode: mode
            }, serverMgrInst.get_server(vA._sys_.serverid).nid);
        }

        liveInst.add_live_race(rid, raceInfos, rLink.url, liveKey, mode, Date.now(), racever);

        return rid;
    }
}
