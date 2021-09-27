/**
 * 巅峰赛匹配
 */

import { SeRacePvp, LiveMode, if_sys_, SeLogicFormation, if_pvp_match_info, if_base_player } from '../SeDefine';
import { resMgrInst } from '../ResMgr/SeResMgr';
import { netInst } from '../NetMgr/SeNetMgr';
import { serverMgrInst, DefineSType } from '../serverMgr';
import { createHash } from 'crypto';
import { configInst } from '../lib/TeConfig';
import { pltMgrInst } from './PltMgr';
import { liveInst } from './LiveMgr';
import { matchInst } from './Pvpv726';


/**
 * 这里负责所有的数据
 */

interface SeShangjinPlayer extends if_base_player {
    shangjin_score: number;
}

class Shangjinmatch {
    //{plt: {段索引 : Array<SeShangjinPlayer>}}
    onlineMatcher: Object = {};

    //匹配人数
    private _math_count = 2;
    //更新匹配区间的时间(单位:秒)
    private match_update_time = 5;
    //匹配单元粒度
    private shangjin_score_range = 50;
    //匹配每刷新一次的增量(单位为倍率)
    private shangjin_range_rate = 1;
    //匹配范围阈值(单位为倍率)
    private shangjin_range_limit = 4;
    //匹配优先顺序 1 正序 大的优先, -1 反序 小的优先
    private shangjin_match_order = 1;

    constructor() {
        this.init();
    }

    public init() {
    }

    private _get_player_plt(_sys_: if_sys_) {
        let idx = pltMgrInst.match_plt(_sys_);
        if(configInst.get('openGlobal')) idx = 0;
        if (!this.onlineMatcher[idx]) {
            this.onlineMatcher[idx] = {};
        }
        return this.onlineMatcher[idx];
    }
    private _player_range_id(score: number) {
        return Math.floor(score / this.shangjin_score_range);
    }
    private _push_player(player: SeShangjinPlayer) {
        let Matcher = this._get_player_plt(player._sys_);
        let index = this._player_range_id(player.shangjin_score);
        if (!Matcher[index]) {
            Matcher[index] = [];
        }
        Matcher[index].push(player);
    }
    private _add_player(player: SeShangjinPlayer) {
        let Matcher = this._get_player_plt(player._sys_);
        let index = this._player_range_id(player.shangjin_score);
        if (!Matcher[index]) {
            Matcher[index] = [];
        }
        //不能简单的push, 需要按玩家的进入匹配时间进行排序插入
        let i = 0;
        for (; i < Matcher[index].length; i++) {
            if (player.enter_time <= Matcher[index][i].enter_time) {
                break;
            }
        }
        Matcher[index].splice(i, 0, player);
    }
    private _del_player(uid: number, shangjin_score: number, _sys_: if_sys_) {
        let enter_time = 0;
        let Matcher = this._get_player_plt(_sys_);
        // 特殊版本全遍历一遍
        if (!configInst.get('shangjinmgr.closealldel')) {
            // 二次确认开关
            for (let key2 in Matcher) {
                let matchers = Matcher[key2];
                if (!matchers) continue;
                for (let i = 0; i < matchers.length; i++) {
                    if (matchers[i].uid == uid) {
                        enter_time = matchers[i].enter_time;
                        matchers.splice(i, 1);
                    }
                }
            }
        }
        else {
            let index = this._player_range_id(shangjin_score);
            let matchers = Matcher[index];
            if (matchers) {
                for (let i = 0; i < matchers.length; i++) {
                    if (matchers[i].uid == uid) {
                        enter_time = matchers[i].enter_time;
                        matchers.splice(i, 1);
                    }
                }
            }
        }

        return enter_time;
    }


    private _last_join = {};
    public online_match(...args);
    public online_match(nid: string, _sys_: if_sys_, uid: number, formation: if_pvp_match_info, name: string, level: number, icon: string, avatar: any, medals: Array<string>, shangjin_score: number, pvp_level: number, win_count: number) {
        if (this._last_join[uid.toString()] && (this._last_join[uid.toString()] + 2000 > Date.now())) {
            return;
        }

        if (liveInst.is_in_racing(uid, nid)) {
            return;
        }

        this._last_join[uid.toString()] = Date.now();

        this._del_player(uid, shangjin_score, _sys_);

        var sInfo = serverMgrInst.find_server(nid);
        var mp: SeShangjinPlayer = {
            uid: uid,
            areaid:formation.areaid,
            formation: formation.h_f,
            boss_f: formation.b_f,
            shangjin_score: shangjin_score,
            pvp_level: pvp_level,
            battleEquip: formation.battleEquip,
            name: name,
            castle_level: level,
            icon: icon,
            avatar: avatar,
            medals: medals,
            win_loop: win_count,
            enter_time: Date.now(),
            synccheck: formation.synccheck,
            _sys_: _sys_,
            extra: {lord: formation.lordUnit, pve: formation.pve},
            is_vip: formation.is_vip,
            vip_level: formation.vip_level,
            guild_info: formation.guild_info,
        }

        this._push_player(mp);
    }

    public online_cancell(...args);
    public online_cancell(_sys_: if_sys_, sid: string, uid: number, score: number, mode: string, force: boolean) {
        //为了保守起见(可以选择全部范围)
        //目前没有全部范围
        this._del_player(uid, score, _sys_);

        //其他容器也忽略掉了
        // match2v2Inst._online_cancell(_sys_, sid, uid, score);
        // RoomMatchInst.cancell(_sys_, sid, uid, force);
    }


    public isInOpenTime() {
        if (configInst.get('cheatmode')) {
            return true;
        }
        let plt = 'sdw';
        let SJSOpenTime =  resMgrInst(plt).getConfig("SJSOpenTime");
        if (!SJSOpenTime) {
            return true;
        }
        //今天周几
        let day = new Date().getDay();
        
        let curr = Date.now();
        let starttimes1 = SJSOpenTime.split('|')[day].split(';')[0].split(',')[0];
        let endtimes1 = SJSOpenTime.split('|')[day].split(';')[0].split(',')[1];
        // let starttimes2 = SJSOpenTime.split('|')[day].split(';')[1].split(',')[0];
        // let endtimes2 = SJSOpenTime.split('|')[day].split(';')[1].split(',')[1];
        if (curr > (new Date()).setHours(parseInt(starttimes1.split(':')[0]), parseInt(starttimes1.split(':')[1]), 0) &&
            curr < (new Date()).setHours(parseInt(endtimes1.split(':')[0]), parseInt(endtimes1.split(':')[1]), 0)) {
            return true;
        }

        // if (curr > (new Date()).setHours(parseInt(starttimes2.split(':')[0]), parseInt(starttimes2.split(':')[1]), 0) &&
        //     curr < (new Date()).setHours(parseInt(endtimes2.split(':')[0]), parseInt(endtimes2.split(':')[1]), 0)) {
        //     return true;
        // }
        return false;
    }

    /**
     * 更新在线匹配
     */
    public update() {
        if (this.isInOpenTime()) {
            //赏金赛池内人数有要求
            let count = 0;
            for (let plt in this.onlineMatcher) {
                let Matcher = this.onlineMatcher[plt];
                for (let index in Matcher) {
                    count += Matcher[index].length;
                }
            }
            if(!configInst.get('cheatmode') && count < Number(resMgrInst('sdw').getConfig('sjs_min_player_match'))){
                return;
            }
            // 保护代码, 用来解决池子里出现重复的uid
            let _check_uids: Object = {};
            // 遍历所有分数段
            for (let plt in this.onlineMatcher) {
                let Matcher = this.onlineMatcher[plt];
                for (let index in Matcher) {
                    this._real_match_(Matcher, parseInt(index), _check_uids);
                }
            }
        }
        else {
            // 如果不在时间内，那么清除掉整个池子，池子内都是无效的
            this.onlineMatcher = {};
        }
    }

    /**
     * 匹配一个分段段的玩家
     * @param Matcher 某个平台下的玩家匹配数据
     */
    private _real_match_(Matcher: Object, index: number, _check_uids: Object) {
        let matchers: Array<SeShangjinPlayer> = Matcher[index];
        //check
        if (!matchers) {
            return;
        }
        var plt = 'sdw';
        this.shangjin_score_range = parseInt(resMgrInst(plt).getConfig("sjs_min_gap")) || this.shangjin_score_range;
        this.shangjin_range_limit = parseInt(resMgrInst(plt).getConfig('sjs_max_gap')) || this.shangjin_range_limit;
        
       
        let race_list: Array<Array<SeShangjinPlayer>> = [];
        //遍历此分数段的所有玩家
        //这个地方不需要i++ 当i=0的玩家匹配不上 就会跳出循环
        while (matchers.length > 0) {
            let player = matchers[0];
            let range = Math.min((Math.floor((Date.now() - player.enter_time) / (this.match_update_time * 1000)) * this.shangjin_range_rate), this.shangjin_range_limit);
            let count = this._math_count;

            // 如果出现过就删掉重复的
            if (_check_uids[player.uid.toString()]) {
                matchers.splice(0, 1);
                console.log('find_repleate: ' + player.uid + ' range: 0 score: ' + player.shangjin_score);
                continue;
            }
            _check_uids[player.uid.toString()] = true;

            //先查询区段,是否能完成匹配
            for (let r = 0; r <= range; r++) {
                if (r == 0) {
                    count = count - matchers.length;
                }
                else {
                    let _matchers_1 = Matcher[index + this.shangjin_match_order * r];
                    if (_matchers_1) { count = count - _matchers_1.length; }
                    let _matchers_2 = Matcher[index - this.shangjin_match_order * r];
                    if (_matchers_2) { count = count - _matchers_2.length };
                }

                if (count <= 0) {
                    break;
                }
            }

            if (count > 0) {
                //这里做一个优化, 一旦发现玩家匹配不了了, 那么这个分数段后续的玩家肯定都匹配不了
                //因为这个数组是按玩家进入匹配的先后顺序排序的
                break;
            }

            //重新赋值
            let _race_list: Array<SeShangjinPlayer> = [];
            //正式匹配
            for (let r = 0; r <= range; r++) {
                if (r == 0) {
                    let _length = Math.min((this._math_count - _race_list.length), matchers.length);
                    if (_length > 0) {
                        for (let j = 0; j < _length; j++) {
                            _race_list.push(matchers[j]);
                        }
                        matchers.splice(0, _length);
                    }

                }
                else {
                    let _matchers_1 = Matcher[index + this.shangjin_match_order * r];
                    if (_matchers_1) {
                        let _length = Math.min((this._math_count - _race_list.length), _matchers_1.length);
                        if (_length > 0) {
                            for (let j = 0; j < _length; j++) {
                                _race_list.push(_matchers_1[j]);
                            }
                            _matchers_1.splice(0, _length);
                        }
                    }

                    let _matchers_2 = Matcher[index - this.shangjin_match_order * r];
                    if (_matchers_2) {
                        let _length = Math.min((this._math_count - _race_list.length), _matchers_2.length);
                        if (_length > 0) {
                            for (let j = 0; j < _length; j++) {
                                _race_list.push(_matchers_2[j]);
                            }
                            _matchers_2.splice(0, _length);
                        }
                    }
                }

                if (this._math_count - _race_list.length == 0) {
                    break;
                }
            }

            race_list.push(_race_list);
        }

        for (let i = 0; i < race_list.length; i++) {
            let rid = this._create_race(race_list[i], LiveMode.shangjin);
            if (!rid) {
                //回滚
                for (let j = 0; j < race_list[i].length; j++) {
                    this._add_player(race_list[i][j]);
                }
            }
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
     * 产生比赛，通知玩家和比赛服
     * @param infos 
     * @param mode 
     */
    private _create_race(infos: SeShangjinPlayer[], mode: LiveMode): string {
        let plt: string = infos[0]._sys_.plt;
        let rLink = null;

        for (let i = 0; i < infos.length; i++) {
            rLink = serverMgrInst.randomServer(DefineSType.race, plt);
            if (rLink) break;
        }

        if (!rLink) {
            return null;
        }

        let synccheck = false;

        let raceInfos: SeRacePvp[] = [];
        for (let i = 0; i < infos.length; i++) {
            let vA = infos[i];

            let raceOppA: SeRacePvp = {
                Id: vA.uid,
                Name: vA.name,
                Formation: vA.formation,
                Boss: vA.boss_f,
                pvp_score: vA.shangjin_score,
                pvp_level: vA.pvp_level,
                castle_level: vA.castle_level,
                battleEquip: vA.battleEquip,
                winStreakCount: vA.win_loop,
                Icon: vA.icon,
                areaid:vA.areaid,
                avatar: vA.avatar,
                medals: vA.medals,
                rurl: rLink.url,
                synccheck: vA.synccheck,
                checkKey: this._gen_check_key(),
                sid: vA._sys_.serverid,
                _plt_: vA._sys_.plt,
                bTeam: false,
                optime: Date.now(),
                lordUnit: vA.extra.lord,
                is_vip: vA.is_vip,
                vip_level: vA.vip_level,
                guild_info: vA.guild_info,
            }

            if (vA.synccheck) {
                synccheck = true;
            }

            raceInfos.push(raceOppA);

            netInst.sendData({ cmd: 'randlist', mode: 'shangjinmatch', uid: vA.uid, list: matchInst.get_rand_list_(vA._sys_, vA.pvp_level, vA.uid) }, serverMgrInst.get_server(vA._sys_.serverid).nid);
            // matchInst.add_rand_list(vA.uid, null, vA.pvp_level, vA.name, vA.icon, vA.avatar);
        }


        let rid = createHash('md5').update(JSON.stringify(raceInfos) + Date.now()).digest('hex');
        let liveKey = this._gen_check_key();

        let racever = resMgrInst(plt).getConfig('racever');

        netInst.sendData({
            cmd: 'startonline',
            raceinfos: raceInfos,
            rid: rid,
            livekey: liveKey,
            rmode: mode,
            racever: racever,
            stritc: (resMgrInst(plt).getConfig('race_stritc') == '1') ? true : synccheck,
        }, rLink.nid);

        for (let i = 0; i < raceInfos.length; i++) {
            let vA = infos[i];
            let vB = infos[raceInfos.length - 1 - i];
            let raceOppA = raceInfos[i];

            netInst.sendData({
                cmd: 'joinonline',
                checkKey: raceOppA.checkKey,
                rurl: raceOppA.rurl,
                rid: rid,
                uid: raceOppA.Id,
                oscore: vB.shangjin_score,
                mode: 'shangjinmatch',
                rmode: mode
            }, serverMgrInst.get_server(vA._sys_.serverid).nid);
            // break;
        }

        liveInst.add_live_race(rid, raceInfos, rLink.url, liveKey, mode, Date.now(), racever);

        return rid;
    }

    // /**
    //  * 提供给好友约战的接口
    //  * @param infos 
    //  */
    // public create_race(infos: { sid: string, race: SeRaceOpp, _sys_: if_sys_ }[], mode: LiveMode = LiveMode.race): string {
    //     var rs = [];
    //     for (var i = 0; i < infos.length; i++) {
    //         var a_race = infos[i].race;
    //         var mpa: SeMatchPlayer = {
    //             uid: a_race.Id,
    //             formation: a_race.Formation,
    //             boss_f: a_race.Boss,
    //             pvp_score: a_race.pvp_score,
    //             pvp_level: a_race.pvp_level,
    //             name: a_race.Name,
    //             castle_level: a_race.castle_level,
    //             icon: a_race.Icon,
    //             avatar: a_race.avatar,
    //             sid: infos[i].sid,
    //             enter_time: Math.floor(Date.now() / 1000),
    //             win_loop: 0,
    //             fai_loop: 0,
    //             _sys_: infos[i]._sys_,
    //         }
    //         rs.push(mpa);
    //     }

    //     return this._send_race(rs, mode);
    // }
}

export var matchShangjinInst = new Shangjinmatch();
