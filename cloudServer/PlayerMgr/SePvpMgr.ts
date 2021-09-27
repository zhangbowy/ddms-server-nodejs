import { SePlayer } from "./SePlayer";
import { iApp } from '../app';
import { SeResHeroBoxType, SeEnumBattleRankeProperty, SeEnumsevendayskTaskType, SeEnumnoticetexteType, SeEnumHeroBoxZZYeType, SeResLootPool, SeEnumTownItemeTypeA, SeEnumTownBuffereType, SeEnumHeroBoxTypeeType, SeEnumUnlockeFunc, SeEnumChartTableeType } from "../Res/interface";
import { SeLogicFormation, SePvpOpp, SeChartUnit, SeChartType, SeRaceOpp, EnumRaceType, TaskAction, CharState, SeMailType, func_copy, SCORE_INIT_VALUE, PVE_PK_INIT_VALUE, SeCharMailInfo } from '../SeDefine';
import { SeHeroCard, SeItem, SePvpInfo, SePvpBox, IExtResult, ifSeasonInfo, PvpLogInfo, RechargeInfo, DEFINE, DeAddDelItemReason, ShangJinState } from './SePlayerDef';
import { createHash } from 'crypto';
import { TeDate, arrayRandom, arrayRandomT, TeMath, Map, LangID, TeRandom, isRandom } from '../TeTool';
import { configInst } from '../lib/TeConfig';
import { SeResSeasonEx } from "../ResMgr/SeResMgr";
import { ReHash } from "../lib/TeRedis";
var http = require('https');
declare var global: iApp;

var race_secret_key = 'i am a good boy what are you ?';

const MAX_REFRESH: number = 2;
const MAX_COUNT: number = 20;
const Box_Max: number = 4;
const BOX_KEY_PRICE: number = 1;   //1沙漏=10钻石
export class SePvpMgr {
    private _parent: SePlayer;

    private _baseInfo: SePvpInfo;

    /**
     * 提供给人机比赛的时候使用的
     */
    private _oppInfo: { type: string, mode: string, pvp_score: number, Name: string, extra: any }; //extra 附加的连接信息, 客户端可能会没收到joinRace

    private _raceType: EnumRaceType;
    constructor(parent: SePlayer) {
        this._parent = parent;
    }

    getInfo() {
        return this._baseInfo;
    }

    get seasoninfo() {
        return this._baseInfo.seasoninfo;
    }

    get seasonid() {
        return this._baseInfo.seasonid;
    }

    get fengwang_count() {
        return this._baseInfo.fengwang_count;
    }

    set fengwang_count(value) {
        this._baseInfo.fengwang_count = value;
        this.saveInfo('fengwang_count');
    }

    get duowang_count() {
        return this._baseInfo.duowang_count;
    }

    get high_duowang_count() {
        return this._baseInfo.high_duowang_count;
    }

    set seasonid(v) {
        this._baseInfo.seasonid = v;
        this.saveInfo('seasonid');
    }

    get peak_score() {
        return this._baseInfo.peak_score;
    }

    get level_speed() {
        return this._baseInfo.level_speed;
    }

    get shangjin_score() {
        return this._baseInfo.shangjin_score;
    }

    set raceInfo(v: null | { type: string, mode: string, pvp_score: number, Name: string, extra: any }) {
        this._oppInfo = v;
    }

    get raceInfo() {
        return this._oppInfo;
    }

    test(score: number) {
        global.globalChartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_GLOBAL_PEAK_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level }, this.peak_score);
    }
    set peak_score(score: number) {
        //通知榜单服
        //SCORE_INIT_VALUE分数不需要通知
        if (this.peak_score <= SCORE_INIT_VALUE && score <= SCORE_INIT_VALUE) {
            global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_PEAK_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level }, this.peak_score);
        }
        this._baseInfo.peak_score = score;

        this._parent.taskAction(TaskAction.AddScore, score);

        // 操作完成后必须立即保存一次数据库
        this.saveInfo('peak_score');

        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'peak_score', this.peak_score);
    }

    set shangjin_score(score: number) {
        //通知榜单服
        //SCORE_INIT_VALUE分数不需要通知
        // if (this.shangjin_score <= SCORE_INIT_VALUE && score <= SCORE_INIT_VALUE) {
        //     global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_SHANGJIN_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId }, this.shangjin_score);
        // }
        this._baseInfo.shangjin_score = score;

        // 操作完成后必须立即保存一次数据库
        this.saveInfo('shangjin_score');

        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'shangjin_score', this.shangjin_score);
    }

    set pvp_winpeakcount(n) {
        this._baseInfo.win_peak_count = n;

        // 操作完成后必须立即保存一次数据库
        // this.saveInfo('win_peak_count');

        // if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "winPeakCount", this._baseInfo.win_peak_count);
    }

    get pvp_winpeakcount() {
        return this._baseInfo.win_peak_count;
    }

    set pvp_losepeakcount(n) {
        this._baseInfo.lose_peak_count = n;

        // 操作完成后必须立即保存一次数据库
        // this.saveInfo('lose_peak_count');
        // global.netMgr.sendCharMiscUpdate(this._parent.linkid, "losePeakCount", this._baseInfo.lose_peak_count);
    }

    get pvp_losepeakcount() {
        return this._baseInfo.lose_peak_count;
    }

    set pvp_winpeakliancount(n) {
        this._baseInfo.win_peak_lian_count = n;

        // 操作完成后必须立即保存一次数据库
        // this.saveInfo('win_peak_lian_count');

        // if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "winPeaklianCount", this._baseInfo.win_peak_count);
    }

    get pvp_winpeakliancount() {
        return this._baseInfo.win_peak_lian_count;
    }

    set pvp_winshangjinliancount(n) {
        this._baseInfo.win_shangjin_lian_count = n;
    }

    get pvp_winshangjinliancount() {
        return this._baseInfo.win_shangjin_lian_count;
    }

    set pvp_losepeakliancount(n) {
        this._baseInfo.lose_peak_lian_count = n;

        // 操作完成后必须立即保存一次数据库
        // this.saveInfo('lose_peak_count');

        // global.netMgr.sendCharMiscUpdate(this._parent.linkid, "losePeaklianCount", this._baseInfo.lose_peak_count);
    }

    get pvp_losepeakliancount() {
        return this._baseInfo.lose_peak_lian_count;
    }


    set pvp_top_winpeakliancount(n) {
        if (this._baseInfo.top_win_peak_lian_count >= n) {
            return;
        }
        this._baseInfo.top_win_peak_lian_count = n;

        // 操作完成后必须立即保存一次数据库
        this.saveInfo('top_win_peak_lian_count');

        global.netMgr.sendCharMiscUpdate(this._parent.linkid, "topWinPeaklianCount", this._baseInfo.top_win_peak_lian_count);
    }

    set pvp_top_winshangjinliancount(n) {
        if (this._baseInfo.top_win_shangjin_lian_count >= n) {
            return;
        }
        this._baseInfo.top_win_shangjin_lian_count = n;

        // 操作完成后必须立即保存一次数据库
        this.saveInfo('top_win_shangjin_lian_count');

        global.netMgr.sendCharMiscUpdate(this._parent.linkid, "topWinshangjinlianCount", this._baseInfo.top_win_shangjin_lian_count);
    }

    set pvp_top_win1v2liancount(n) {
        if (this._baseInfo.top_win_1v2_lian_count >= n) {
            return;
        }
        this._baseInfo.top_win_1v2_lian_count = n;

        // 操作完成后必须立即保存一次数据库
        this.saveInfo('top_win_1v2_lian_count');

        global.netMgr.sendCharMiscUpdate(this._parent.linkid, "topWin1v2lianCount", this._baseInfo.top_win_1v2_lian_count);
    }

    get pvp_top_winpeakliancount() {
        return this._baseInfo.top_win_peak_lian_count;
    }

    get pvp_top_winshangjinliancount() {
        return this._baseInfo.top_win_shangjin_lian_count;
    }

    get pvp_top_win1v2liancount() {
        return this._baseInfo.top_win_1v2_lian_count;
    }

    get peak_season_log() {
        return this._baseInfo.peak_season_log;
    }

    //{rank: number, win_peak_count: number, lose_peak_count: number}
    set peak_season_log(info: Object) {
        //赛季id去重保护
        let index;
        for (let i in this._baseInfo.peak_season_log) {
            if (this._baseInfo.peak_season_log[i]['seasonid'] == info['seasonid']) {
                index = i;
                break;
            }
        }
        if (index) {
            for (let key in info) {
                this._baseInfo.peak_season_log[index][key] = info[key];
            }
        }
        else {
            this._baseInfo.peak_season_log.push(info);
        }

        this.saveInfo('peak_season_log');
    }


    //获取chartCache
    get peak_day_etime() { return this._baseInfo.peak_day_etime }

    get pve_pk_day_etime() { return this._baseInfo.pve_pk_day_etime }

    //获取chartCache
    get pve_pk_rank() { return this._baseInfo.pve_pk_rank }

    set_pve_pk_rank(val: number) {
        if (val == null || val == undefined) return;
        if (!this._baseInfo) return;
        this._baseInfo.pve_pk_rank = val;
        this.saveInfo("pve_pk_rank");
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "pve_pk_rank", this._baseInfo.pve_pk_rank);
    }

    //需要的字段可以后续补充
    set peak_day_etime(etime: number) {
        this._baseInfo.peak_day_etime = etime

        // 操作完成后必须立即保存一次数据库
        this.saveInfo('peak_day_etime');

        // if (this.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'peak_day_etime', this.peak_day_etime);
    }

    //需要的字段可以后续补充
    set pve_pk_day_etime(etime: number) {
        this._baseInfo.pve_pk_day_etime = etime;
        // 操作完成后必须立即保存一次数据库
        this.saveInfo('pve_pk_day_etime');
    }

    get pvp_score() {
        return this._baseInfo.pvp_score;
    }

    get max_pve_pk_rank() {
        return this._baseInfo.max_pve_pk_rank;
    }

    set max_pve_pk_rank(n) {
        this._baseInfo.max_pve_pk_rank = Math.max(n, this._baseInfo.max_pve_pk_rank);
        this.saveInfo('max_pve_pk_rank');
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "max_pve_pk_rank", this._baseInfo.max_pve_pk_rank);
    }

    set pvp_score(n) {
        n = Math.floor(n);
        this._baseInfo.pvp_score = Math.max(n, 1500);
        this.saveInfo('pvp_score');
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "pvp_score", this._baseInfo.pvp_score);
    }

    set pvp_wincount(n) {
        this._baseInfo.win_count = n;
        // 操作完成后必须立即保存一次数据库
        // this.saveInfo('win_count');

        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "winStreakCount", this._baseInfo.win_count);
    }

    /**1v1连续胜场数 */
    get pvp_wincount() {
        return this._baseInfo.win_count;
    }

    set pvp_losecount(n) {
        this._baseInfo.lose_count = n;

        // 操作完成后必须立即保存一次数据库
        // this.saveInfo('lose_count');
        // global.netMgr.sendCharMiscUpdate(this._parent.linkid, "loseStreakCount", this._baseInfo.win_count);
    }

    /**1v1连续败场数 */
    get pvp_losecount() {
        return this._baseInfo.lose_count;
    }

    set pvp_top_wincount(n) {
        if (this._baseInfo.top_win_count >= n) {
            return;
        }

        this._baseInfo.top_win_count = n;

        // 操作完成后必须立即保存一次数据库
        this.saveInfo('top_win_count');

        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "topwinStreakCount", this._baseInfo.top_win_count);
    }

    /**1v1 最高胜场数 */
    get pvp_top_wincount() {
        return this._baseInfo.top_win_count;
    }

    set pvp_win2v2count(n) {
        this._baseInfo.win_2v2_count = n;

        // 操作完成后必须立即保存一次数据库
        // this.saveInfo('win_2v2_count');  

        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "winStreak2v2Count", this._baseInfo.win_2v2_count);
    }

    get pvp_win2v2count() {
        return this._baseInfo.win_2v2_count;
    }

    set pvp_lose2v2count(n) {
        this._baseInfo.lose_2v2_count = n;

        // 操作完成后必须立即保存一次数据库
        // this.saveInfo('lose_2v2_count');          
        // global.netMgr.sendCharMiscUpdate(this._parent.linkid, "loseStreak2v2Count", this._baseInfo.lose_2v2_count);
    }

    get pvp_lose2v2count() {
        return this._baseInfo.lose_2v2_count;
    }

    set pvp_top_win2v2count(n) {
        if (this._baseInfo.top_win_2v2_count >= n) {
            return;
        }
        this._baseInfo.top_win_2v2_count = n;

        // 操作完成后必须立即保存一次数据库
        this.saveInfo('top_win_2v2_count');

        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "topwinStreak2v2Count", this._baseInfo.top_win_2v2_count);
    }

    get pvp_top_win2v2count() {
        return this._baseInfo.top_win_2v2_count;
    }

    set pvp_loneoppname(s) {
        this._baseInfo.lone_oppname = s;
    }

    get pvp_loneoppname() {
        return this._baseInfo.lone_oppname;
    }

    set pve_pk_fight_time(time: number){
        this._baseInfo.pve_pk_fight_time = time;
        this.saveInfo('pve_pk_fight_time');
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "pve_pk_fight_time", this._baseInfo.pve_pk_fight_time);
    }

    get glory_score() {
        return this._baseInfo.glory_score;
    }

    set glory_score(s: number) {
        this._baseInfo.glory_score = s;
        if (s > 0) {
            global.chartMgr.addPlayerLevelChart(this.seasonid,
                SeEnumChartTableeType.DanFuRongYaoJiFenBang,
                {
                    id: this._parent.id,
                    name: this._parent.name,
                    score: this._baseInfo.glory_score,
                    icon: this._parent.icon,
                    avatar: this._parent.avatar,
                    igroup: this.groupId,
                    is_vip: this._parent.baseInfo.is_vip,
                    vip_level: this._parent.baseInfo.vip_level
                });
            global.globalChartMgr.addPlayerLevelChart(this.seasonid,
                SeEnumChartTableeType.QuanFuRongYaoJiFenBang,
                {
                    id: this._parent.id,
                    name: this._parent.name,
                    score: this._baseInfo.glory_score,
                    icon: this._parent.icon,
                    avatar: this._parent.avatar,
                    igroup: this.groupId,
                    is_vip: this._parent.baseInfo.is_vip,
                    vip_level: this._parent.baseInfo.vip_level
                });
        }
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "glory_score", this._baseInfo.glory_score);
        this.saveInfo("glory_score");
    }

    get glory_score_all() {
        return this._baseInfo.glory_score_all;
    }

    set glory_score_all(s) {
        this._baseInfo.glory_score_all = s;
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "glory_score_all", this._baseInfo.glory_score_all);
        this.saveInfo("glory_score_all");
    }

    get glory_kill() {
        return this._baseInfo.glory_kill;
    }

    set glory_kill(s) {
        this._baseInfo.glory_kill = s;
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "glory_kill", this._baseInfo.glory_kill);
        this.saveInfo("glory_kill");
    }

    get glory_kill_all() {
        return this._baseInfo.glory_kill_all;
    }

    set glory_kill_all(s) {
        this._baseInfo.glory_kill_all = s;
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "glory_kill_all", this._baseInfo.glory_kill_all);
        this.saveInfo("glory_kill_all");
    }

    set top_pvp_rank(val: number) {
        if (val == null || val == undefined) return;
        if (!this._baseInfo) return;
        if (!this._baseInfo.top_pvp_rank || val < this._baseInfo.top_pvp_rank) {
            this._baseInfo.top_pvp_rank = val;
            this.saveInfo("top_pvp_rank");
            if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, "top_pvp_rank", this._baseInfo.top_pvp_rank);
        }
    }

    get pvp_level() {
        return this._baseInfo.pvp_level;
    }
    /**判断一下时间点是不是还在上个赛季 */
    isdiffseason(time: number) {
        let res = global.resMgr.seasonRes.getRes(this.seasonid);
        let previous_res = global.resMgr.seasonRes.getRes(res.kPreviousID);
        return time <= new Date(previous_res.kEndTime).getTime();
    }

    cheat_pvp_level(v: number) {
        var pkBattleRank = global.resMgr.getBattleRankByLevel(v);
        if (!pkBattleRank) return;

        this._baseInfo.pvp_level = v;
        this._baseInfo.pvp_star = 0;
        this._baseInfo.top_pvp_level = v;
        this.saveInfo(['pvp_level', 'pvp_star', 'top_pvp_level']);

        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'pvp_star', this.pvp_star, this.pvp_level);
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'top_pvp_level', this.top_pvp_level, []);

        var pkBattleRank = global.resMgr.getBattleRankByLevel(this.pvp_level);
        if (pkBattleRank && pkBattleRank.eProperty & SeEnumBattleRankeProperty.ZuiZhongCeng) {
            // 打仗打好了，看看自己的段位，如果是白金了那么通知榜单服务器
            global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_PVP_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.pvp_score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
            if (configInst.get('globalCsMgr.url') && global.resMgr.getConfig("1v1_cross_server") == 'true') {
                global.globalChartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_GLOBAL_PVP_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.pvp_score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
            }
            if (this.groupId) {
                global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_GROUP_PVP_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.pvp_score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
            }
            global.chartMgr.queryranks(this.seasonid, this._parent.id, SeChartType.SCT_PVP_SCORE);
        }
    }


    get top_pvp_level() {
        return this._baseInfo.top_pvp_level;
    }


    get fight_count() {
        return this._baseInfo.fight_count;
    }

    get pvp_star() {
        return this._baseInfo.pvp_star;
    }


    private _star_act(level: number, star: number, addstar: number) {
        var out = { level: level, star: star };
        var pkBattleRank = global.resMgr.getBattleRankByLevel(level);
        if (!pkBattleRank || addstar == 0) return out;

        if (addstar > 0 && !(pkBattleRank.eProperty & SeEnumBattleRankeProperty.ZuiZhongCeng)) {
            if (addstar + star > pkBattleRank.iStarNum) {
                var pkBattleRankb = global.resMgr.getBattleRankByLevel(level);
                if (!pkBattleRankb) out.star = pkBattleRank.iStarNum;
                else out = this._star_act(level + 1, 0, addstar + star - pkBattleRank.iStarNum);
            }
            else {
                out.star = star + addstar;
            }

            return out;
        }
        else if (addstar < 0) {
            if (addstar + star < 0) {
                if ((pkBattleRank.eProperty & SeEnumBattleRankeProperty.JiangDuanBaoHu || this._parent.m_buffMgr.isHadBuff('B006') && SeEnumTownBuffereType.JiangDuanBaoHu)) {
                    out.star = 0;
                }
                else {
                    var pkBattleRankn = global.resMgr.getBattleRankByLevel(level - 1);
                    if (!pkBattleRankn) out.star = 0;
                    else {
                        out = this._star_act(level - 1, pkBattleRankn.iStarNum, addstar + star + 1);
                    }
                }
            }
            else {
                out.star = star + addstar;
            }

            return out;
        }

        return out;
    }

    set pvp_star(n: number) {
        // 每个阶段的星星数量是不同的
        // 判断一下当前段位是否有晋级赛，有的话需要卡一下的
        // 最终层没有星星了

        var oo = this._star_act(this.pvp_level, this.pvp_star, n - this.pvp_star);
        var pkNextBattleRank = global.resMgr.getBattleRankByLevel(oo.level);
        if (!pkNextBattleRank) return;
        if (oo.level > this._baseInfo.pvp_level) {
            this._parent.addLevelTehui(oo.level);
            if (oo.level == global.resMgr.MaxLvl) {
                this._parent.sendAnnouncement(SeEnumnoticetexteType.ShengDuoWang, { pvplevel: oo.level }, this._parent);
            }
            if (pkNextBattleRank.akRewards) {
                let items: SeItem[] = [];
                for (let i = 0; i < pkNextBattleRank.akRewards.length; i++) {
                    if (!pkNextBattleRank.akRewards[i]) continue
                    let r_item = pkNextBattleRank.akRewards[i].split(',');
                    items.push({
                        kItemID: r_item[0],
                        iPileCount: parseInt(r_item[1] || '1') || 1
                    })
                }
                this._parent.addItems(items, 'pvp_level');
            }
        }

        this._baseInfo.pvp_level = oo.level;
        this._baseInfo.pvp_star = oo.star;

        this.saveInfo(['pvp_star', 'pvp_level']);

        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'pvp_star', this.pvp_star, this.pvp_level);

        if (this._baseInfo.pvp_level > this._baseInfo.top_pvp_level) {
            this._baseInfo.top_pvp_level = this._baseInfo.pvp_level;
            this._parent.pvpTopLevelUp();
            this.saveInfo('top_pvp_level');

            let cht_unlock = global.resMgr.getUnlockInfo(SeEnumUnlockeFunc.PaiXingBang);
            if (!this.groupId && !this.groupState && cht_unlock && this._baseInfo.top_pvp_level >= cht_unlock.iOpengrade) {
                // 这里处理一下跳过引导的玩家的榜单问题
                this.groupState = 'new';
                global.chartMgr.apply_group_id(this.seasonid, SeChartType.SCT_GROUP_PVP_SCORE, this._parent.id, this.groupState);
            }

            var items: Array<SeItem> = [];
            if (pkNextBattleRank.akAwards && this._parent.baseInfo.share_uid) {
                // 这里判断一下，如果到了某个特定等级的时候就发些东西给大家
                for (var i = 0; i < pkNextBattleRank.akAwards.length; i++) {
                    var r = pkNextBattleRank.akAwards[i].split(',');
                    items.push({
                        kItemID: r[0],
                        iPileCount: parseInt(r[1] || '1') || 1,
                    });
                }

                // this._parent.addItems(items);
                global.playerMgr.onGiveMail(this._parent.plt, this._parent.baseInfo.share_uid, SeMailType.AutoUse, '', items);
            }

            if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'top_pvp_level', this.top_pvp_level, items);
        }
    }

    //-------------------------------------------------//

    /**
     * 1v1 2v2 中相对大的一个等级
     */
    get pvp_level_current_top() {
        return this._baseInfo.pvp_level;
    }

    //-------------------------------------------------//

    public initDbInfo(obj: Object) {
        this._baseInfo = new SePvpInfo(obj);
        var needSave = false;
        for (var i = 0; this._baseInfo.boxList && i < this._baseInfo.boxList.length; i++) {
            var pkBoxRes = this._baseInfo.boxList[i];
            if (pkBoxRes && !global.resMgr.getResHeroBoxType(pkBoxRes.type)) {
                this._baseInfo.boxList[i] = null;
                needSave = true;
            }
        }

        if (this._baseInfo.templeteBox && !global.resMgr.getResHeroBoxType(this._baseInfo.templeteBox.type)) {
            this._baseInfo.templeteBox = null;
            this.saveInfo("templeteBox");
        }

        if (needSave) {
            this.saveInfo("boxList");
        }

        // 修正一下战区 加上自己的前缀
        if (this._baseInfo.iGroupId) {
            let arean = this._baseInfo.iGroupId.toString().split('_');
            if (arean.length <= 1) {
                this._baseInfo.iGroupId = global.plt + '_' + this._baseInfo.iGroupId;
                this.saveInfo("iGroupId");
            }
            else if (arean.length >= 2) {
                if (arean[0] != global.plt) {
                    this._baseInfo.iGroupId = global.plt + '_' + arean[arean.length - 1];
                    this.saveInfo("iGroupId");
                }
            }
        }

        // 这版本检查一下赛季结算信息，去掉里面的任务信息
        if (this._baseInfo.seasoninfo) {
            let change = false;
            for (let i = 0; i < this._baseInfo.seasoninfo.length; i++) {
                let s_info = this._baseInfo.seasoninfo[i];
                if (s_info && s_info['tasks']) {
                    delete s_info['tasks'];
                    change = true;
                }
            }

            if (change) {
                this.saveInfo('seasoninfo');
            }
        }
    }


    //---------------人机快速开战----------------------//

    /**
     * 开始战斗匹配
     * @param isGuide  //废弃参数 
     */
    public start_fight(isGuide: boolean = false) {
        this.onLeave();
        global.matchMgr.matchPvp(this._parent.id, this.pvp_score, this._parent.getPvpMatchInfo(), this.top_pvp_level);
    }

    /**
     * 战斗信息生成返回
     * 
     * @param opp 
     */
    public on_match_pvp(opp: SeRaceOpp, mode, rmode) {
        opp.castle_level = this._parent.level;
        this.raceInfo = { type: "lianxi", mode: mode, pvp_score: opp.pvp_score, Name: opp.Name, extra: undefined };
        this._parent.setState(CharState.inrace);
        global.netMgr.pvpMatchBack(this._parent.linkid, opp, rmode, rmode);
    }

    /**
     * 战斗结束
     * @param isWin 
     * @param tTime 
     */
    public completeFight(isWin: boolean, tTime: number, isBossDie: boolean) {
        // tTime = Math.max(tTime, 1000);
        // this._parent.taskAction(TaskAction.FightComplete, isWin, EnumRaceType.MatchPvp);
        // global.logMgr.pvpLog(this._parent, 1, isWin, tTime, 0, 0, global.resMgr.getHeroFightScore(this._parent.matchFormation).iReal);
        // this.raceInfo = null;
        // this._winLog("1v1",isWin,isBossDie);
    }


    //--------------战斗箱子---------------------//

    public startOpenBox(index: number) {
        if (this._baseInfo.openingIndex != -1) {
            // 判断一下 解锁中的箱子是否解锁完成
            var rBox = this._baseInfo.boxList[this._baseInfo.openingIndex];
            if (!rBox || rBox.ftime < Date.now()) {
                this._baseInfo.openingIndex = -1;
            }
        }

        if (this._baseInfo.openingIndex == -1 && this._baseInfo.boxList && this._baseInfo.boxList[index]) {
            this._baseInfo.openingIndex = index;

            // var dec_time_buff = this._parent.get_buffer_value(SeEnumTownBuffereType.XiangZiJiaSu);
            this._baseInfo.boxList[index].ftime = Math.floor(Date.now() + (this._baseInfo.boxList[index].optime || 0) * 60 * 1000);
            this.saveInfo(["openingIndex", 'boxList']);
            global.netMgr.pvpBoxUpdate(this._parent.linkid, this._baseInfo.boxList, this._baseInfo.openingIndex, this._baseInfo.templeteBox);
            var rkBox = this._baseInfo.boxList[index];
            global.logMgr.pvpBoxLog(this._parent, 'start', rkBox.id, rkBox.type, rkBox.level);
        }
    }

    //加速
    public accOpenBox(index: number) {
        if (this._baseInfo.boxList && this._baseInfo.boxList[index]) {
            let boxInfo = this._baseInfo.boxList[index];
            if (boxInfo.ftime > 0 && boxInfo.ftime < Date.now()) return;
            if (boxInfo.optime <= 0) return;
            //限制
            if (this._parent.dailyInfo.adBaoXiaCount <= 0) {
                return;
            }

            this._parent.dailyInfo.adBaoXiaCount--;
            this._parent.updateDailyInfo();

            //目前只有广告
            var strRes = global.resMgr.getConfig("boxAdAcc");
            if (strRes) {
                var accTime = parseInt(strRes);
                boxInfo.optime = boxInfo.optime - Math.floor(accTime / 60 / 1000);
                if (boxInfo.ftime) {
                    boxInfo.ftime = boxInfo.ftime - accTime;
                }
                this.saveInfo(["openingIndex", 'boxList']);
                global.netMgr.pvpBoxUpdate(this._parent.linkid, this._baseInfo.boxList, this._baseInfo.openingIndex, this._baseInfo.templeteBox);
            }
        }
    }

    public upgradeBox(boxid: number) {
        let out = {
            cmd: 'upgradeBox',
            idx: -1,
            otype: 0,
            ctype: 0,
        };
        var dec_time_buff = this._parent.get_buffer_value(SeEnumTownBuffereType.XiangZiJiaSu);
        //vip减少宝箱时间
        if (this._parent.baseInfo.is_vip && this._parent.baseInfo.vip_level > 0) {
            let vip_res = global.resMgr.getVIPResByVIPLevel(this._parent.baseInfo.vip_level);
            if (vip_res && vip_res.iOpenQuicken) {
                dec_time_buff += vip_res.iOpenQuicken
            }
        }
        let box = this._baseInfo.boxList || [];
        for (let i = 0; i < box.length; i++) {
            let r_box = box[i];
            if (r_box && r_box.id == boxid) {
                // 升级次数 目前限制 1 次
                if ((!r_box.up_count || r_box.up_count < 1)
                    && (!r_box.ftime)
                    && (
                        (r_box.type >= SeEnumHeroBoxTypeeType.YuanMuBaoXiang && r_box.type < SeEnumHeroBoxTypeeType.MiYinBaoXiang)
                        || (r_box.type >= SeEnumHeroBoxTypeeType.XunLianBaoXiang && r_box.type < SeEnumHeroBoxTypeeType.XunLianHuangJin)
                    )
                ) {
                    var pkBoxTypeRes = global.resMgr.heroBoxTypeRes.getRes(r_box.type + 1);
                    if (pkBoxTypeRes) {
                        out.idx = i;
                        out.ctype = r_box.type;
                        r_box.type = pkBoxTypeRes.eType;
                        out.otype = r_box.type;

                        r_box.org_time = pkBoxTypeRes.iOpenTime;
                        r_box.optime = pkBoxTypeRes.iOpenTime * (100 - dec_time_buff) / 100;

                        r_box.up_count++;

                        global.logMgr.pvpBoxLog(this._parent, 'upgrade', r_box.id, r_box.type, r_box.level);
                        this.saveInfo('boxList');
                    }
                }
                break;
            }
        }
        global.netMgr.sendData(out, this._parent.linkid);
        if (out.idx >= 0) {
            global.netMgr.pvpBoxUpdate(this._parent.linkid, this._baseInfo.boxList, this._baseInfo.openingIndex, this._baseInfo.templeteBox);
        }
    }

    public completeOpenBox(index: number) {
        if (this._baseInfo.boxList && this._baseInfo.boxList[index]) {
            var cost = 0;
            var price = 60 * 4;
            var leftTime = 0;

            var oprbox = this._baseInfo.boxList[index];
            var time = 0;
            if (oprbox.ftime) {
                time = Math.max(oprbox.ftime - Date.now(), 0);
            }
            else {
                time = oprbox.optime * 60 * 1000;
            }
            var level = Math.max(1, oprbox.level);
            if (time > 0) {
                if (!this.useBoxKey(oprbox.level, oprbox.type, time, (oprbox.org_time || oprbox.optime) * 60 * 1000)) return;
            }
            var boxLevel = level;
            global.logMgr.pvpBoxLog(this._parent, 'finish', this._baseInfo.boxList[index].id, oprbox.type, level);

            this._parent.openBox('', boxLevel, oprbox.type);
            this._baseInfo.boxList[index] = null;
            if (index == this._baseInfo.openingIndex) {
                this._baseInfo.openingIndex = -1;
            }

            this.saveInfo(["boxList", "openingIndex"]);
            global.netMgr.pvpBoxUpdate(this._parent.linkid, this._baseInfo.boxList, this._baseInfo.openingIndex, this._baseInfo.templeteBox);
        }
    }

    /**
     * 获取直接沙漏开启宝箱的价格
     * @param level 宝箱等级
     * @param time 剩余时间
     */
    private _getOpenPrice(level: number, type: number, time: number, org_time: number): number {
        var pkHeroBoxRes = global.resMgr.getResHeroBoxZZY(level, type);
        if (!pkHeroBoxRes) return 1;

        return Math.max(Math.ceil((pkHeroBoxRes.iValue || 1) * (time / org_time) / BOX_KEY_PRICE), 1);
    }


    public openTempleteBox() {
        if (this._baseInfo.templeteBox) {
            if (this.useBoxKey(this._baseInfo.templeteBox.level, this._baseInfo.templeteBox.type, this._baseInfo.templeteBox.optime * 60 * 1000, (this._baseInfo.templeteBox.org_time || this._baseInfo.templeteBox.optime) * 60 * 1000)) {
                this._parent.openBox('', this._baseInfo.templeteBox.level, this._baseInfo.templeteBox.type);
                this._baseInfo.templeteBox = null;
                this.saveInfo("templeteBox");
                global.netMgr.pvpBoxUpdate(this._parent.linkid, this._baseInfo.boxList, this._baseInfo.openingIndex, this._baseInfo.templeteBox);
            }
        }
    }

    private useBoxKey(level: number, type: number, time: number, org_time: number): boolean {
        var cost = this._getOpenPrice(level, type, time, org_time);
        var items = this._parent.baseInfo.items;
        var itemNum = 0;
        var itemId = "";
        for (var i = 0; items && i < items.length; i++) {
            var pkItemRes = global.resMgr.TownItemRes.getRes(items[i].kItemID);
            if (!pkItemRes) continue;
            if (pkItemRes.eTypeA == SeEnumTownItemeTypeA.YueChi) {
                itemNum = items[i].iPileCount;
                itemId = items[i].kItemID;
                break;
            }
        }
        if (itemNum < cost) {
            var needMoney = (cost - itemNum) * BOX_KEY_PRICE;
            if (!this._parent.decMoney(needMoney, "buyBoxKey")) return false;
            if (itemNum > 0) this._parent.delItem(itemId, itemNum, DeAddDelItemReason.buyBoxKey);
        } else {
            this._parent.delItem(itemId, cost, DeAddDelItemReason.buyBoxKey);
        }
        return true;
    }

    /**
     * 提供一个接口给添加道具的时候，放到宝箱界面来
     * @param type 
     * @param level 
     */
    public addNewBox(type: number, level: number, num: number) {
        var dec_time_buff = this._parent.get_buffer_value(SeEnumTownBuffereType.XiangZiJiaSu);
        //vip减少宝箱时间
        if (this._parent.baseInfo.is_vip && this._parent.baseInfo.vip_level > 0) {
            let vip_res = global.resMgr.getVIPResByVIPLevel(this._parent.baseInfo.vip_level);
            if (vip_res && vip_res.iOpenQuicken) {
                dec_time_buff += vip_res.iOpenQuicken
            }
        }
        var pkBoxTypeRes = global.resMgr.heroBoxTypeRes.getRes(type);
        var isFull = true;
        for (var j = 0; j < num; j++) {
            isFull = true;
            var box = new SePvpBox();
            box.id = (this._baseInfo.genBoxID++);
            box.level = level;
            box.type = pkBoxTypeRes.eType;
            box.ftime = 0;
            box.up_count = 0;
            box.org_time = pkBoxTypeRes.iOpenTime;
            box.optime = pkBoxTypeRes.iOpenTime * (100 - dec_time_buff) / 100;
            for (var i = 0; i < Box_Max; i++) {
                if (!this._baseInfo.boxList || !this._baseInfo.boxList[i]) {

                    if (!this._baseInfo.boxList) this._baseInfo.boxList = [];
                    this._baseInfo.boxList[i] = box;
                    isFull = false;
                    this.saveInfo(["boxList", "genBoxID"]);
                    break;
                }
            }
            if (isFull) {
                return;
                // this._baseInfo.templeteBox = box;
                // this.saveInfo("templeteBox");
            }
        }
        global.netMgr.pvpBoxUpdate(this._parent.linkid, this._baseInfo.boxList, this._baseInfo.openingIndex, this._baseInfo.templeteBox);
    }


    private _addFightAward(pvpLevel: number, bRate = false): Array<SeItem> {
        var limit = this._parent.dailyInfo.fightAwardLimit || {};
        var isFull = true;
        for (var i = 0; i < Box_Max; i++) {
            if (!this._baseInfo.boxList || !this._baseInfo.boxList[i]) {
                isFull = false;
                break;
            }
        }

        var index = this._baseInfo.sequence;
        if (!isFull) {
            this._baseInfo.sequence++;
            this.saveInfo("sequence");
        }
        var result: Array<SeItem> = [];
        var pkBattleRank = global.resMgr.getBattleRankByLevel(pvpLevel);
        if (pkBattleRank && pkBattleRank.akSequence && pkBattleRank.akSequence.length > 0) {
            var kSequince: string = pkBattleRank.akSequence[index % pkBattleRank.akSequence.length].toString();
            var poolIds = kSequince.split(",");
            for (var i = 0; i < poolIds.length; i++) {
                var pkLootPoolIds = global.resMgr.lootPoolGroupRes[poolIds[i]];
                var pkLootPools: Array<SeResLootPool> = [];
                var totalIweight = 0;
                for (var j = 0; pkLootPoolIds && j < pkLootPoolIds.length; j++) {
                    let pkLootPoolRes = global.resMgr.lootPoolRes.getRes(pkLootPoolIds[j]);
                    if (pkLootPoolRes && pkLootPoolRes.iWeight > 0) {
                        if (pkLootPoolRes.kStartTime && Date.now() < Date.parse(pkLootPoolRes.kStartTime)) continue;
                        if (pkLootPoolRes.kEndTime && Date.now() > Date.parse(pkLootPoolRes.kEndTime)) continue;
                        pkLootPools.push(pkLootPoolRes);
                        totalIweight += pkLootPoolRes.iWeight;
                    }
                }

                if (totalIweight > 0) {
                    var currWeight = Math.random() * totalIweight;
                    while (pkLootPools.length > 0) {
                        let pkLootPoolRes = pkLootPools.shift();
                        if (pkLootPoolRes.iWeight >= currWeight) {
                            if (!limit[pkLootPoolRes.iTeamId]) limit[pkLootPoolRes.iTeamId] = 0;
                            if (pkLootPoolRes.kItemId && pkLootPoolRes.aiItemNum && pkLootPoolRes.aiItemNum.length > 0 && limit[pkLootPoolRes.iTeamId] < pkLootPoolRes.iDayMaxNum) {
                                var itemId = pkLootPoolRes.kItemId;
                                var iNum = pkLootPoolRes.aiItemNum[0];
                                if (pkLootPoolRes.aiItemNum.length == 2) {
                                    iNum = Math.round(Math.random() * (pkLootPoolRes.aiItemNum[1] - pkLootPoolRes.aiItemNum[0]) + pkLootPoolRes.aiItemNum[0]);
                                }
                                if (pkLootPoolRes.iAddtion && bRate) {
                                    let newiNum = Math.ceil(iNum * (100 + pkLootPoolRes.iAddtion) / 100);
                                    if (!isNaN(newiNum) && newiNum) {
                                        iNum = newiNum;
                                    }
                                }

                                iNum = Math.min(iNum, pkLootPoolRes.iDayMaxNum - limit[pkLootPoolRes.iTeamId]);
                                if (pkLootPoolRes.iVip == 1 && this._parent.baseInfo.is_vip && this._parent.baseInfo.vip_level > 0) {
                                    let vip_res = global.resMgr.getVIPResByVIPLevel(this._parent.baseInfo.vip_level);
                                    if (vip_res) {
                                        if (itemId == 'W206' && vip_res.iMedalAdd) {
                                            iNum = Math.floor(iNum * (100 + vip_res.iMedalAdd) / 100);
                                        }
                                    }
                                }
                                limit[pkLootPoolRes.iTeamId] = limit[pkLootPoolRes.iTeamId] + iNum;
                                result.push({ kItemID: itemId, iPileCount: iNum })
                            }
                            break;
                        }
                        currWeight -= pkLootPoolRes.iWeight;
                    }
                }
            }
        }

        this._parent.dailyInfo.fightAwardLimit = limit;
        this._parent.updateDailyInfo();

        if (result.length > 0) {
            this._parent.addItems(result, "battle");
        }
        return result;
    }

    public saveInfo(savekey = null) {
        if (savekey) {
            if (savekey instanceof Array) {
                var lists: Array<{ k: string, v: any }> = [];
                for (var i = 0; i < savekey.length; i++) {
                    var rkey = savekey[i];
                    if (this._baseInfo.hasOwnProperty(rkey)) {
                        lists.push({ k: rkey, v: this._baseInfo[rkey] });
                    }
                }
                this._parent.pvpDb.msave(lists);
            }
            else {
                if (this._baseInfo.hasOwnProperty(savekey)) {
                    this._parent.pvpDb.save(savekey, this._baseInfo[savekey]);
                }
            }

        }
        else {
            var lists: Array<{ k: string, v: any }> = [];
            for (var key in this._baseInfo) {
                var rkValue = this._baseInfo[key];
                if (rkValue) {
                    lists.push({ k: key, v: this._baseInfo[key] })
                }
                else {
                    this._parent.pvpDb.del(key);
                }
            }
            this._parent.pvpDb.msave(lists);
        }
    }

    get refreshTime(): number {
        var dd = new Date();
        dd.setHours(0);
        dd.setMinutes(0);
        dd.setMilliseconds(0);
        dd.setSeconds(0);
        return dd.getTime() + 24 * 3600 * 1000;
    }

    //------------PvP v726 begin------------------------//

    public match_score = 0;

    // 这里有新手相关的特殊需求需要处理
    private _is_fresh_protected() {
        if (this.pvp_level <= 3) {
            //新手引导的三把里面没有连赢两把
            if (this._baseInfo.fight_count < 3 && this.pvp_wincount < 2) return true;
            //连输两把以上
            if (this.pvp_losecount >= 2) return true;
        }


        return false;
    }

    /**
     * 开始匹配
     * @param mode 模式 1v1 2v2 peakmatch shangjinmatch
     * @param gamekey 第三方的钥匙
     */
    on_enter_match(mode: '1v1' | '2v2' | 'peakmatch' | 'wuxianhuoli' | 'shangjinmatch', gamekey?: string, isCross?: boolean) {
        if (this.raceInfo) {
            if (this.raceInfo.type == 'offline' && this.raceInfo.mode == '1v1') {
                // 强制结算掉 人机1v1
                this.mode = this.raceInfo.mode;
                this.on_match_pve_fight(false, 0, false, 'pve');
            }
        }

        this._parent.cancell_match();

        //匹配前出阵英雄校验
        if (!this._parent.checkTryHeroCard()) {
            return;
        }
        //重复出阵英雄校验
        this._parent.checkDuplicateHeroCard();

        this.mode = mode;
        this.gamekey = gamekey;

        this._parent.setState(CharState.matching);
        global.logMgr.buttonClickLog(this._parent, 'olpvpbegin', 'olpvp');
        if (mode == '1v1') {

            // 这里有新手相关的特殊需求需要处理
            if (this._is_fresh_protected()) {
                mode = '1v1_robot' as any;
            }

            // 1v1 的时候增加连胜进去
            // 增加连败和历史对手
            if (configInst.get('globalMgr.url-all') && global.resMgr.getConfig("1v1_cross_server") == 'true' && isCross) {
                global.globalMgrAll.onlineMatch(mode, this._parent.id, this._parent.getPvpMatchInfo(), this._parent.name, this._parent.real_level, this._parent.icon, this._parent.avatar, this._parent.curMedals, this.pvp_score, this.pvp_level, this._baseInfo.win_count, this._baseInfo.lose_count, this._baseInfo.lone_oppname);
            }
            else {
                global.matchMgr.onlineMatch(mode, this._parent.id, this._parent.getPvpMatchInfo(), this._parent.name, this._parent.real_level, this._parent.icon, this._parent.avatar, this._parent.curMedals, this.pvp_score, this.pvp_level, this._baseInfo.win_count, this._baseInfo.lose_count, this._baseInfo.lone_oppname);
            }
            this.match_score = this.pvp_score;
        }
        else if (mode == '2v2') {
            // 2v2 使用平衡模式
            if (configInst.get('globalMgr.url-all') && global.resMgr.getConfig("2v2_cross_server") == 'true') {
                global.globalMgrAll.onlineMatch(mode, this._parent.id, this._parent.getPvpMatchInfo(true), this._parent.name, 15, this._parent.icon, this._parent.avatar, this._parent.curMedals, this.pvp_score, this.pvp_level, this._baseInfo.win_2v2_count, 0, []);
            }
            else {
                global.matchMgr.onlineMatch(mode, this._parent.id, this._parent.getPvpMatchInfo(true), this._parent.name, 15, this._parent.icon, this._parent.avatar, this._parent.curMedals, this.pvp_score, this.pvp_level, this._baseInfo.win_2v2_count, 0, []);
            }
            this.match_score = this.pvp_score;
        }
        else if (mode == 'peakmatch') {
            // 巅峰赛
            // check
            if (!configInst.get("cheatmode")) {
                let startTime_res = global.resMgr.getConfig("competitionStartTime");
                let endTime_res = global.resMgr.getConfig("competitionEndTime");
                if (!startTime_res || !endTime_res) {
                    return;
                }
                let startTimes = startTime_res.split(':');
                let endTimes = endTime_res.split(':');
                if (Date.now() < new Date().setHours(parseInt(startTimes[0]), parseInt(startTimes[1])) ||
                    Date.now() > new Date().setHours(parseInt(endTimes[0]), parseInt(endTimes[1]))) {
                    console.error(this._parent.id + " is not can macth peak");
                    return;
                }
            }
            if (configInst.get('globalMgr.url-all') && global.resMgr.getConfig("peak_cross_server") == 'true' && isCross) {
                global.globalMgrAll.onlineMatch(mode, this._parent.id, this._parent.getPvpMatchInfo(global.resMgr.getConfig("peakGameBalanced") == 'true'), this._parent.name, global.resMgr.getConfig("peakGameBalanced") == 'true' ? 15 : this._parent.level, this._parent.icon, this._parent.avatar, this._parent.curMedals, this.peak_score, this.pvp_level, this._baseInfo.win_peak_lian_count, 0, this._baseInfo.lone_oppname);
            }
            else {
                global.matchMgr.onlineMatch(mode, this._parent.id, this._parent.getPvpMatchInfo(global.resMgr.getConfig("peakGameBalanced") == 'true'), this._parent.name, global.resMgr.getConfig("peakGameBalanced") == 'true' ? 15 : this._parent.level, this._parent.icon, this._parent.avatar, this._parent.curMedals, this.peak_score, this.pvp_level, this._baseInfo.win_peak_lian_count, 0, this._baseInfo.lone_oppname);
            }
            this.match_score = this.peak_score;
        }
        else if (mode == 'shangjinmatch') {
            //赏金赛
            if (!this.isInShangJinOpenTime()) {
                console.log(this._parent.id, "is not can match shangjinsai")
                return;
            }
            if (configInst.get('globalMgr.url-all') && global.resMgr.getConfig("sjs_cross_server") == 'true') {
                global.globalMgrAll.onlineMatch(mode, this._parent.id, this._parent.getPvpMatchInfo(true, true), this._parent.name, 15, this._parent.icon, this._parent.avatar, this._parent.curMedals, this.shangjin_score, this.pvp_level, this._baseInfo.win_shangjin_lian_count, 0, []);
            }
            else {
                global.matchMgr.onlineMatch(mode, this._parent.id, this._parent.getPvpMatchInfo(true, true), this._parent.name, 15, this._parent.icon, this._parent.avatar, this._parent.curMedals, this.shangjin_score, this.pvp_level, this._baseInfo.win_shangjin_lian_count, 0, []);
            }
            this.match_score = this.shangjin_score;
        }
        else if (mode == 'wuxianhuoli') {
            if (!configInst.get("cheatmode")) {
                let starttime = global.resMgr.getConfig("infiniteStartTime");
                let endtime = global.resMgr.getConfig("infiniteEndTime");
                let openday = global.resMgr.getConfig("infiniteOpenDay");
                if (!starttime || !endtime || !openday) {
                    return;
                }
                let curr = Date.now();
                let starttimes = starttime.split(":");
                let endtimes = endtime.split(":");
                let opendays = openday.split(",");
                if (curr < (new Date()).setHours(parseInt(starttimes[0] || "0"), parseInt(starttimes[1] || "0"), 0) ||
                    curr > (new Date()).setHours(parseInt(endtimes[0] || "0"), parseInt(endtimes[1] || "0"), 0) ||
                    opendays.indexOf((new Date()).getDay().toString()) < 0 ||
                    this._parent.level < 3) {

                    console.log(this._parent.id, "is not can match wuxianhuoli")
                    return;
                }
            }
            if (configInst.get('globalMgr.url-all') && global.resMgr.getConfig("infinite_cross_server") == 'true') {
                global.globalMgrAll.onlineMatch(mode, this._parent.id, this._parent.getPvpMatchInfo(true), this._parent.name, 15, this._parent.icon, this._parent.avatar, this._parent.curMedals, this.pvp_score, this.pvp_level, 0, 0, []);
            }
            else {
                global.matchMgr.onlineMatch(mode, this._parent.id, this._parent.getPvpMatchInfo(true), this._parent.name, 15, this._parent.icon, this._parent.avatar, this._parent.curMedals, this.pvp_score, this.pvp_level, 0, 0, []);
            }
            this.match_score = this.pvp_score;
        }

    }

    public isInShangJinOpenTime() {
        if (configInst.get('cheatmode')) {
            return true;
        }
        let SJSOpenTime = global.resMgr.getConfig("SJSOpenTime");
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
    // 匹配包括人机和非人机两种
    on_match_pvp_v726_ms(result: SePvpOpp, randomList: Array<any>, mode, rmode) {
        // 玩家匹配结果返回
        this.raceInfo = { type: "offline", mode: '1v1', pvp_score: result.pvp_score, Name: result.Name, extra: undefined };
        this.mode = '1v1';
        this._raceType = EnumRaceType.Pvp726;

        this._parent.setState(CharState.inrace);
        global.netMgr.sendPlayerPvPv726RaceBegin(this._parent.linkid, result, null, randomList, mode, rmode);
    }

    // 匹配包括2v2人机
    on_match_pve_2v2_ms(result: SePvpOpp[], randomList: Array<any>) {
        // 玩家匹配结果返回
        var pes2 = Math.floor(Math.pow(TeMath.stdev(result[2].pvp_score, result[3].pvp_score), 1 + 0) + Math.min(result[2].pvp_score, result[3].pvp_score));
        this.mode = '2v2';
        this.raceInfo = { type: "online", mode: '2v2', pvp_score: pes2, Name: "", extra: undefined };
        this._raceType = EnumRaceType.Pvp726;
        this._parent.setState(CharState.inrace);

        // // 2v2 的话额外记录一个玩家上次的比赛信息，方便他重连
        // global.netMgr.sendPlayerPvPv726RaceBegin(this._parent.linkid, result, null, randomList);
    }

    // 匹配包括1v2人机
    on_match_pve_1v2_ms(result: SePvpOpp[], randomList: Array<any>, mode, rmode, formation) {
        // 玩家匹配结果返回
        this.mode = '1v2';
        this.raceInfo = { type: "online", mode: '1v2', pvp_score: result[0].pvp_score, Name: "", extra: undefined };
        this._raceType = EnumRaceType.Pvp726;
        this._parent.setState(CharState.inrace);
        global.netMgr.sendPlayer1v2RaceBegin(this._parent.linkid, result, null, randomList, mode, rmode, formation);
    }

    add_protect_score(bWin: boolean) {
        var add = 0;
        var pkBattleRank = global.resMgr.getBattleRankByLevel(this.pvp_level);
        if (!pkBattleRank) return add;

        if (this._baseInfo.pvp_protect_score >= 100 && !bWin) {
            this._baseInfo.pvp_protect_score = 0;
            add = 1;
        }

        // var addscore = this._parent.isMonthVip ? 40 : 20;
        let addscore = 20;
        this._baseInfo.pvp_protect_score = Math.min(100, this._baseInfo.pvp_protect_score + addscore);

        this.saveInfo('pvp_protect_score');
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'pvp_protect_score', this._baseInfo.pvp_protect_score);

        return add;
    }

    /**
     * 人机下的结算流程
     * @param bWin 
     * @param tTime 
     * @param isBossDie 
     * @param rid 
     */
    on_match_pve_fight(bWin: boolean, tTime: number, isBossDie: boolean, rid: string, isCross?: boolean, times?: number) {

        if (!this.raceInfo) {   //可能是重启, 没有战斗信息, 会一个失败消息, 客户端关闭battle界面
            global.netMgr.pvpReward(this._parent.linkid, 0, [], this.make_sync_key(false, 0, rid, -1));
            return;
        }
        if (this.mode == '2v2') {
            this.on_match_pvp_fight_2v2(bWin, tTime, isBossDie, rid, false);
        }
        else if (this.mode == 'peakmatch') {
            this.on_match_pvp_fight_peak(bWin, tTime, isBossDie, this.raceInfo.pvp_score, true, rid, this.raceInfo.Name, isCross);
        }
        else if (this.mode == 'shangjinmatch') {
            this.on_match_pvp_fight_shangjin(bWin, tTime, isBossDie, this.raceInfo.pvp_score, true, rid, this.raceInfo.Name);
        }
        else if (this.mode == 'wuxianhuoli') {
            // 无限火力模式
            this.on_match_pvp_wuxianhuoli(bWin, tTime, isBossDie, rid);
        }
        else if (this.mode == '1v2') {
            // 赤壁之战
            this.on_match_1v2_fight(bWin, tTime, isBossDie, rid, this._parent.id, [], times, 0, []);
        }
        else {
            this.on_match_pvp_v726_fight(bWin, tTime, isBossDie, this.raceInfo.pvp_score, true, rid, this.raceInfo.Name, 0, true, true);
        }

        this.raceInfo = null;
    }

    on_match_cancell_pve_fight() {
        if (this.mode == '1v1') {
            if (this.getRaceID()) {
                this.setRaceID(null);
            }

            this._raceType = -1;
        }
    }

    private _is_limit_time(check_level = true) {

        let res = global.resMgr.getBattleRankByLevel(this.pvp_level);
        if (check_level && (res.eProperty & SeEnumBattleRankeProperty.ZuiZhongCeng) != SeEnumBattleRankeProperty.ZuiZhongCeng) {
            // 夺王之前没有修养期
            return false;
        }

        let time_str = global.resMgr.getConfig('xiuyangqi');
        if (!time_str) return false;

        let time_a = time_str.split('-');

        let nowTime = new Date();
        let start = Date.parse(`${nowTime.getFullYear()}/${nowTime.getMonth() + 1}/${nowTime.getDate()} ${time_a[0]}:00`);
        let end = Date.parse(`${nowTime.getFullYear()}/${nowTime.getMonth() + 1}/${nowTime.getDate()} ${time_a[1]}:00`);

        if (start < nowTime.getTime() && end > nowTime.getTime()) {
            return true;
        }

        return false;
        // if (this.pvp_level < 4) {
        //     return false;
        // }

        // var r_t = new Date(this._bgtime);
        // if (r_t.getHours() >= 2 && r_t.getHours() < 6) {
        //     return true;
        // }

        // return false;
    }

    /**
     * 闪电玩比赛验证
     */
    make_sync_key(bwin: boolean, up_score: number, rid: string, boxId: number) {
        //uid+matchId+matchResult+timestamp
        var matchResult = bwin ? 1 : 0;
        var game_stamp_info: IExtResult;
        this.gamekey = this.gamekey || '';
        var cttime = Date.now();
        game_stamp_info = {
            time: cttime,
            win: matchResult,
            rid: rid,
            stmp: createHash('md5').update(this._parent.id.toString() + this.gamekey.toString() + matchResult.toString() + cttime.toString() + 'baiwanhongbao').digest('hex'),
            f_score: this.pvp_score,
            score: up_score,
            addBoxId: boxId
        }
        return game_stamp_info;
    }

    private elo_base(org: number) {
        var base = 400, a = 1, b = 2000;
        return (base * a + b) / (org * a + b);
    }

    private elo_scale(org: number) {
        var ELO_Base = 2200;
        if (org < ELO_Base)
            return org;
        else
            return Math.round((org - ELO_Base) * this.elo_base(org) + ELO_Base);
    }

    on_match_pvp_v726_fight(bWin: boolean, tTime: number, isBossDie: boolean, pvpscore: number, pve: boolean, rid: string, oppName: string, opplevel: number, isCross: boolean, is_robot: boolean) {
        tTime = Math.max(tTime, 1000);
        this._baseInfo.fight_count++;

        while (this.pvp_loneoppname.length >= parseInt(global.resMgr.getConfig('avoidance_games'))) {
            this.pvp_loneoppname.splice(0, 1);
        }
        this.pvp_loneoppname.push(oppName);

        var race_type_log = pve ? 1010 : 1011;
        //排位隐藏分修养期
        var bLimit = this._is_limit_time();
        //荣耀积分修养期
        var gloryLimit = this._is_limit_time(false);
        var add_star = 0;
        var items = [];

        // 降星保护分先注释掉, 防止后续还要使用
        // if (!bLimit) add_star = this.add_protect_score(bWin);
        // 玩家战斗结束

        var self_score = this.elo_scale(this.pvp_score);
        var opp_score = this.elo_scale(pvpscore);

        var info = this._winLog("1v1", bWin, isBossDie);
        global.logMgr.pvpLog(this._parent, rid || '', race_type_log, bWin, tTime, 0, this._baseInfo.win_count, global.resMgr.getHeroFightScore(this._parent.matchFormation).iReal, info.winCount, info.loseCount);

        var G_MX_KEY = 32;
        let getBoxId = -1;
        var change_score = 0;
        if (bWin) {

            // 设：敌方rank=R敌、我方Rank=R我、rank常数=G;G=32
            // 每场胜利得分=G*( 1-1/{1+10^[(R我-R敌)*(-1/400)]} ) ,结果取整；
            // 每场失败扣分=G*( 1/{1+10^[(R我-R敌)*(-1/400)]} ) ,结果取整；
            if (!bLimit) {
                change_score = Math.ceil(G_MX_KEY * (1 - 1 / (1 + Math.pow(10, (self_score - opp_score) * (-1 / 400)))));
                if (pve) {
                    change_score = Math.ceil(G_MX_KEY / 2 * 3000 / (Math.max(1500, this.pvp_score) * 1.5 - 500))
                }
                change_score = Math.min(change_score, G_MX_KEY - 1);
                this.pvp_score += change_score;
            }
            if (!gloryLimit) {
                //荣耀战区增加荣耀积分
                if (isCross && !is_robot && this.pvp_level >= 16) {
                    let glory_score_add = parseInt(global.resMgr.getConfig('glory_score').split(',')[opplevel - 1]);
                    //计算加成 加成=log(min(玩家夺王分,3000)-2000)-2；保留2位小数，最大2，最小1
                    let fixed = Number(global.resMgr.getConfig('glory_fixed'));
                    let add: number = Math.log(Math.max(this.pvp_score, 3000) - 2000) / Math.log(10) - fixed;
                    add = Number(add.toFixed(2));
                    add = Math.min(add, 2);
                    add = Math.max(add, 1);
                    glory_score_add = Math.round(glory_score_add * add);
                    this.glory_score += glory_score_add;
                    this.glory_score_all += glory_score_add;
                    this.glory_kill += 1;
                    this.glory_kill_all += 1;
                    //有同盟的话，同盟添加荣耀分
                    if (this._parent.baseInfo.guild_info.guild_id) {
                        let score_data = { cmd: 'guild_opr', type: 'add_glory_score', id: this._parent.baseInfo.guild_info.guild_id, score: glory_score_add };
                        global.guildMgr.sendGuildData(score_data);
                    }
                }
            }

            this.pvp_wincount = this._baseInfo.win_count + 1;
            this.pvp_losecount = 0;

            this.pvp_top_wincount = this.pvp_wincount;

            // 连胜数字最大10连胜
            //this._baseInfo.win_count = Math.min(this._baseInfo.win_count, 10);

            if (this._baseInfo.win_count >= 10) {
                this._parent.sendAnnouncement(SeEnumnoticetexteType.LianSheng, { charname: this._parent.name, win_count: this._baseInfo.win_count }, this._parent)
            }

            if (!bLimit) add_star += 1;
            this.pvp_star += add_star;
            let pre_id = this._baseInfo.genBoxID;
            if (!this.gamekey || this.gamekey == '') items = this._addFightAward(this._baseInfo.pvp_level);
            if (pre_id != this._baseInfo.genBoxID) {
                getBoxId = pre_id;
            }
            //sdw平台需要上报胜场数
            if (configInst.get('plt') == 'sdw') {
                //this.send_win_count_sdw();
            }
            //-------------每一次获胜增加一颗星星----------------//
        }
        else {
            if (!bLimit) {
                change_score = Math.ceil(32 * (1 / (1 + Math.pow(10, (self_score - opp_score) * (-1 / 400)))));
                if (pve) {
                    change_score = Math.ceil(G_MX_KEY / 2 * 2000 / (Math.max(1500, this.pvp_score) * 1.5 - 500));
                }

                change_score = Math.min(change_score, G_MX_KEY - 1);
                this.pvp_score -= change_score;
            }

            if (this._baseInfo.win_count >= 10) {
                this._parent.sendAnnouncement(SeEnumnoticetexteType.JuJiLianSheng, { oppname: oppName, charname: this._parent.name, win_count: this._baseInfo.win_count }, this._parent)
            }
            this.pvp_wincount = 0;
            this.pvp_losecount++;
            //提示购买宝箱,23点50分之前才触发
            if (!this._parent.dailyInfo.lose_box_open && this.pvp_level >= 7 && Date.now() < new Date().setHours(23, 50, 0, 0)) {
                let hyd_box_chance = global.resMgr.getConfig("hyd_box").split(',');
                let chance = 0;
                if (this.pvp_losecount >= hyd_box_chance.length) {
                    chance = Number(hyd_box_chance[hyd_box_chance.length - 1]);
                }
                else {
                    chance = Number(hyd_box_chance[this.pvp_losecount]);
                }
                if (isRandom(chance)) {
                    this._parent.dailyInfo.lose_box_open = 1;
                    this._parent.updateDailyInfo();
                }
            }
            if (!bLimit) add_star -= 1;
            // 检查是否有保住星星的卡片

            let decCount = Math.abs(add_star);
            let battleRes = global.resMgr.getBattleRankByLevel(this.pvp_level);
            if (battleRes) {
                if (battleRes.eProperty & SeEnumBattleRankeProperty.ZuiZhongCeng) {
                    // 最终层不需要扣道具
                    decCount = 0;
                }
                else if ((battleRes.eProperty & SeEnumBattleRankeProperty.JiangDuanBaoHu) && this.pvp_star == 0) {
                    // 降低段保护的 需要保护
                    decCount = Math.min(Math.abs(this.pvp_star), decCount);
                }
                else if (this._parent.m_buffMgr.isHadBuff('B006') && SeEnumTownBuffereType.JiangDuanBaoHu && this.pvp_star == 0) {
                    // 降低段保护的 需要保护
                    decCount = Math.min(Math.abs(this.pvp_star), decCount);
                    global.netMgr.sendData({ cmd: "buff_protect" }, this._parent.linkid)
                }
            }

            if (decCount && this._parent.delItem('B004', decCount, "pvp", race_type_log.toString())) {
                add_star = 0;
            }

            if (add_star) this.pvp_star += add_star;

            //发送一个限时礼包给他
            // this._parent.check_limited_gift();
        }

        global.netMgr.pvpReward(this._parent.linkid, add_star, items, this.make_sync_key(bWin, change_score, rid, getBoxId));

        this.saveInfo(["win_count", "fight_count", "lose_count", "lone_oppname"]);

        this._parent.taskAction(TaskAction.FightComplete, bWin, EnumRaceType.Pvp726, 1, (isCross && this.pvp_level >= 16) ? 1 : 0);
        if (isBossDie) this._parent.taskAction(TaskAction.FightBossKill, bWin, EnumRaceType.Pvp726, 1);
        this._parent.taskAction(TaskAction.FightJoin, race_type_log, bWin);

        global.logMgr.fightFormationLog(this._parent, race_type_log.toString(), bWin, rid || '', tTime, -1, this._parent.baseInfo.lord, this._parent.m_equipMgr.getLordEquip(), -1, '', false, false, [], ...this._parent.getLogFormation());

        // var self_race_info: SeRaceOpp = {
        //     Id: this._parent.id,
        //     Name: this._parent.name,
        //     Formation: this._parent.matchFormation,
        //     pvp_score: this.pvp_score,
        //     pvp_level: this.pvp_level,
        //     castle_level: this._parent.level,
        //     Icon: this._parent.icon
        // }

        this._raceType = -1;

        var chartTable = global.resMgr.chartTable.getAllRes();
        for (let i in chartTable) {
            if (chartTable[i].eType == SeEnumChartTableeType.DanPiJiFen) {
                if (chartTable[i].iOpenGrade <= this.pvp_level) {
                    // 打仗打好了，看看自己的段位，如果是白金了那么通知榜单服务器
                    global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_PVP_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.pvp_score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
                    // if(configInst.get('globalCsMgr.url')){
                    //     global.globalChartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_GLOBAL_PVP_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.pvp_score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId });
                    // }
                    global.chartMgr.queryranks(this.seasonid, this._parent.id, SeChartType.SCT_PVP_SCORE);
                }
            }
            else if (chartTable[i].eType == SeEnumChartTableeType.ZhanQuBangDan) {
                if (chartTable[i].iOpenGrade <= this.pvp_level) {
                    if (this.groupId) {
                        global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_GROUP_PVP_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.pvp_score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
                    }
                }
            }
            else if (chartTable[i].eType == SeEnumChartTableeType.PaiWeiLianSheng) {
                if (chartTable[i].iOpenGrade <= this.pvp_level) {
                    if (this.pvp_top_wincount >= 2) {
                        global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_1V1_WIN, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.pvp_top_wincount, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
                    }
                }
            }
        }

        //更新限制武将牌状态
        this._parent.updateTryHeroCard('match');

        this.setRaceID(null);
    }

    send_win_count_sdw() {
        let appid = this._parent.loginInfo.appid;
        // let channel = '10000';
        let channel = this._parent.loginInfo.channel;
        let uid = String(this._parent.loginInfo.uid);
        // let uid = '1865766800';
        let sid = '1';
        let level = String(this._parent.level);
        let type = '策略';
        let vip;
        if (!this._baseInfo.log_1v1 || !this._baseInfo.log_1v1.winCount) {
            vip = '0';
        }
        else {
            vip = String(this._baseInfo.log_1v1.winCount);
        }
        let power = String(this.pvp_score);
        let appKey = 'fbc92a323bce41a698018a247a1f11';
        let sign: string = createHash('md5').update(appid).update(channel).update(uid).update(sid).update(level).update(type).update(vip).update(power).update(appKey).digest('hex');
        var url = 'https://platform.shandw.com/upugi' + '?uid=' + uid + '&appid=' + appid + '&channel=' + channel + '&sid=' + sid + '&level=' + level + '&type=' + type + '&vip=' + vip + '&power=' + power + '&sign=' + sign;

        http.get(encodeURI(url), (function (req, res) {
            req.on('data', function (data) {
                try {
                    data = JSON.parse(data);
                }
                catch (e) {

                }
                if (data.result != 1) {
                    console.error('win_count_sdw error: ' + url);
                }
            });
            req.on('end', function () {

            });
        }));
    }

    on_match_pvp_fight_2v2(bWin: boolean, tTime: number, isBossDie: boolean, rid: string, bTeam: boolean) {

        var race_type_log = 1022;
        tTime = Math.max(tTime, 1000);
        this._baseInfo.fight_count++;
        var items = [];

        var info = this._winLog("2v2", bWin, isBossDie);
        global.logMgr.pvpLog(this._parent, rid || '', race_type_log, bWin, tTime, 0, this._baseInfo.win_count, global.resMgr.getHeroFightScore(this._parent.matchFormation).iReal, info.winCount, info.loseCount);

        let addBoxId = -1;

        // 玩家战斗结束
        if (bWin) {
            let pre_id = this._baseInfo.genBoxID;
            let bExt = false;
            if (global.resMgr.getConfig("twovtwoAdditon") == "true" && bTeam) {
                bExt = true;
            }
            if (!this.gamekey || this.gamekey == '') items = this._addFightAward(this._baseInfo.pvp_level, bExt);
            if (pre_id != this._baseInfo.genBoxID) {
                addBoxId = pre_id;
            }
            this._baseInfo.win_2v2_count++;
            this.pvp_top_win2v2count = this._baseInfo.win_2v2_count;
        }
        else {
            this._baseInfo.win_2v2_count = 0;
            this._baseInfo.lose_2v2_count++;
        }
        global.netMgr.pvpReward(this._parent.linkid, 0, items, this.make_sync_key(bWin, 0, rid, addBoxId));

        this.saveInfo(["win_2v2_count", "lose_2v2_count", "fight_count"]);

        this._parent.taskAction(TaskAction.FightComplete, bWin, EnumRaceType.Pvp726, 2);
        if (isBossDie) this._parent.taskAction(TaskAction.FightBossKill, bWin, EnumRaceType.Pvp726, 2);
        this._parent.taskAction(TaskAction.FightJoin, race_type_log, bWin);

        global.logMgr.fightFormationLog(this._parent, race_type_log.toString(), bWin, rid || '', tTime, -1, this._parent.baseInfo.lord, this._parent.m_equipMgr.getLordEquip(), -1, '', false, false, [], ...this._parent.getLogFormation());

        var chartTable = global.resMgr.chartTable.getAllRes();
        for (let i in chartTable) {
            if (chartTable[i].eType == SeEnumChartTableeType.ZuDuiLianSheng) {
                if (chartTable[i].iOpenGrade <= this.pvp_level) {
                    if (this.pvp_top_win2v2count >= 2) {
                        global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_2V2_WIN, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.pvp_top_win2v2count, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
                    }
                }
            }
        }

        //更新限制武将牌状态
        this._parent.updateTryHeroCard('match');

        this._raceType = -1;

        this.setRaceID(null);
    }



    on_match_pvp_fight_peak(bWin: boolean, tTime: number, isBossDie: boolean, oppscore: number, pve: boolean, rid: string, oppName: string, isCross: boolean) {

        var race_type_log = 1111;
        tTime = Math.max(tTime, 1000);
        this._baseInfo.fight_count++;

        while (this.pvp_loneoppname.length >= parseInt(global.resMgr.getConfig('avoidance_games'))) {
            this.pvp_loneoppname.splice(0, 1);
        }
        this.pvp_loneoppname.push(oppName);
        var items = [];

        var info = this._winLog("peak", bWin, isBossDie);
        global.logMgr.pvpLog(this._parent, rid || '', race_type_log, bWin, tTime, 0, this._baseInfo.win_count, global.resMgr.getHeroFightScore(this._parent.matchFormation).iReal, info.winCount, info.loseCount);

        let addBoxId = -1;

        // 玩家战斗结束
        if (bWin) {
            let pre_id = this._baseInfo.genBoxID;
            if (!this.gamekey || this.gamekey == '') items = this._addFightAward(this._baseInfo.pvp_level);
            if (pre_id != this._baseInfo.genBoxID) {
                addBoxId = pre_id;
            }
            this._baseInfo.win_peak_count++;

            this._baseInfo.win_peak_lian_count++;
            this._baseInfo.lose_peak_lian_count = 0;
            this.pvp_top_winpeakliancount = this._baseInfo.win_peak_lian_count;

            this.peak_score = Math.floor(this.peak_score + 32 * (1 - 1 / (1 + Math.pow(10, ((oppscore - this.peak_score) / 400)))));
        }
        else {
            this._baseInfo.lose_peak_count++;

            this._baseInfo.win_peak_lian_count = 0;
            this._baseInfo.lose_peak_lian_count++;
            let _peak_score = Math.floor(this.peak_score + 32 * (0 - 1 / (1 + Math.pow(10, ((oppscore - this.peak_score) / 400)))));
            //先扣跨服保护分
            if (isCross && this._parent.dailyInfo.peak_cross_protect > 0) {
                //扣的分数
                let dec_score = this.peak_score - _peak_score;
                let peak_protect_result = this._parent.dailyInfo.peak_cross_protect - dec_score;
                if (peak_protect_result >= 0) {
                    this._parent.dailyInfo.peak_cross_protect = peak_protect_result;
                    _peak_score = this.peak_score;
                }
                else {
                    this._parent.dailyInfo.peak_cross_protect = 0;
                    _peak_score = this.peak_score + peak_protect_result;
                }
                this._parent.updateDailyInfo();
            }
            //保护分
            if (_peak_score < SCORE_INIT_VALUE) {
                _peak_score = SCORE_INIT_VALUE;
            }
            this.peak_score = _peak_score;
        }
        global.netMgr.pvpReward(this._parent.linkid, 0, items, this.make_sync_key(bWin, 0, rid, addBoxId));

        this.saveInfo(["win_peak_count", "lose_peak_count", "fight_count", "win_peak_lian_count", "lose_peak_lian_count", "lone_oppname"]);

        if (this._parent.bInitComplete) {
            global.netMgr.sendCharMiscUpdate(this._parent.linkid, "winPeakCount", this._baseInfo.win_peak_count);
            global.netMgr.sendCharMiscUpdate(this._parent.linkid, "losePeakCount", this._baseInfo.lose_peak_count);
        }

        // this._parent.taskAction(TaskAction.FightComplete, bWin, EnumRaceType.Pvp726, 3);
        if (isBossDie) this._parent.taskAction(TaskAction.FightBossKill, bWin, EnumRaceType.Pvp726, 3);
        this._parent.taskAction(TaskAction.FightComplete, bWin, EnumRaceType.peakPvp, 1);
        this._parent.taskAction(TaskAction.FightJoin, race_type_log, bWin);

        global.logMgr.fightFormationLog(this._parent, race_type_log.toString(), bWin, rid || '', tTime, -1, this._parent.baseInfo.lord, this._parent.m_equipMgr.getLordEquip(), -1, '', false, false, [], ...this._parent.getLogFormation());

        var chartTable = global.resMgr.chartTable.getAllRes();
        for (let i in chartTable) {
            if (chartTable[i].eType == SeEnumChartTableeType.DianFengBang) {
                if (chartTable[i].iOpenGrade <= this.pvp_level) {
                    // 打仗打好了，看看自己的段位，如果是白金了那么通知榜单服务器
                    global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_PEAK_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.peak_score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
                    if (configInst.get('globalCsMgr.url') && global.resMgr.getConfig("peak_cross_server") == 'true') {
                        global.globalChartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_GLOBAL_PEAK_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.peak_score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId ? this.groupId : this._parent.plt, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
                    }
                    // global.chartMgr.queryranks(this._parent.id, SeChartType.SCT_PEAK_SCORE);
                }
            }
        }

        //更新限制武将牌状态
        this._parent.updateTryHeroCard('match');

        this._raceType = -1;

        this.setRaceID(null);
    }

    //赏金赛结算
    on_match_pvp_fight_shangjin(bWin: boolean, tTime: number, isBossDie: boolean, oppscore: number, pve: boolean, rid: string, oppName: string) {


        var race_type_log = 1311;
        tTime = Math.max(tTime, 1000);
        this._baseInfo.fight_count++;
        var items = [];

        var info = this._winLog("shangjin", bWin, isBossDie);
        global.logMgr.pvpLog(this._parent, rid || '', race_type_log, bWin, tTime, 0, this._baseInfo.win_count, global.resMgr.getHeroFightScore(this._parent.matchFormation).iReal, info.winCount, info.loseCount);
        //开始前就判断一下是否结束了sjs
        if (this.checkShangJinFinish()) {
            return;
        }
        let addBoxId = -1;

        // 玩家战斗结束
        if (bWin) {
            let pre_id = this._baseInfo.genBoxID;
            if (!this.gamekey || this.gamekey == '') items = this._addFightAward(this._baseInfo.pvp_level);
            if (pre_id != this._baseInfo.genBoxID) {
                addBoxId = pre_id;
            }
            this._baseInfo.win_shangjin_count++;

            this._baseInfo.win_shangjin_lian_count++;
            this._baseInfo.lose_shangjin_lian_count = 0;
            this.pvp_top_winshangjinliancount = this._baseInfo.win_shangjin_lian_count;

            this.shangjin_score += parseInt(global.resMgr.getConfig('sjs_win_score'));
        }
        else {
            this._baseInfo.lose_shangjin_count++;

            this._baseInfo.win_shangjin_lian_count = 0;
            this._baseInfo.lose_shangjin_lian_count++;

            this.shangjin_score -= parseInt(global.resMgr.getConfig('sjs_lose_score'));
        }
        global.netMgr.pvpReward(this._parent.linkid, 0, items, this.make_sync_key(bWin, 0, rid, addBoxId));

        this.saveInfo(["win_shangjin_count", "lose_shangjin_count", "fight_count", "win_shangjin_lian_count", "lose_shangjin_lian_count"]);

        if (this._parent.bInitComplete) {
            global.netMgr.sendCharMiscUpdate(this._parent.linkid, "winShangjinCount", this._baseInfo.win_shangjin_count);
            global.netMgr.sendCharMiscUpdate(this._parent.linkid, "loseShangjinCount", this._baseInfo.lose_shangjin_count);
        }

        // this._parent.taskAction(TaskAction.FightComplete, bWin, EnumRaceType.Pvp726, 3);
        // if (isBossDie) this._parent.taskAction(TaskAction.FightBossKill, bWin, EnumRaceType.Pvp726, 3);
        this._parent.taskAction(TaskAction.FightComplete, bWin, EnumRaceType.Pvp726, 4);
        this._parent.taskAction(TaskAction.FightJoin, race_type_log, bWin);

        global.logMgr.fightFormationLog(this._parent, race_type_log.toString(), bWin, rid || '', tTime, -1, this._parent.baseInfo.lord, this._parent.m_equipMgr.getLordEquip(), -1, '', false, false, [], ...this._parent.getLogFormation());

        // var chartTable = global.resMgr.chartTable.getAllRes();
        // for (let i in chartTable) {
        //     if (chartTable[i].eType == SeEnumChartTableeType.DianFengBang) {
        //         if (chartTable[i].iOpenGrade <= this.pvp_level) {
        //             // 打仗打好了，看看自己的段位，如果是白金了那么通知榜单服务器
        //             global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_PEAK_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.peak_score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId });
        //             // global.chartMgr.queryranks(this._parent.id, SeChartType.SCT_PEAK_SCORE);
        //         }
        //     }
        // }

        //更新限制武将牌状态
        // this._parent.updateTryHeroCard('match');

        //判断是否该轮赏金赛结束
        this.checkShangJinFinish();
        this._raceType = -1;

        this.setRaceID(null);
    }

    on_match_1v2_fight(bWin: boolean, tTime: number, isBossDie: boolean, rid: string, host_id: number, host_skills: Array<number>, times: number, index: number, formation_1v2: Array<SeLogicFormation>) {
        var race_type_log = 3333;
        tTime = Math.max(tTime, 1000);
        this._baseInfo.fight_count++;
        var items = [];

        var info = this._winLog("1v2", bWin, isBossDie);
        global.logMgr.pvpLog(this._parent, rid || '', race_type_log, bWin, tTime, 0, this._baseInfo.win_count, global.resMgr.getHeroFightScore(this._parent.matchFormation).iReal, info.winCount, info.loseCount);

        let addBoxId = -1;
        //欢乐豆计算
        let base = Number(global.resMgr.getConfig('ChibiDifen').split(',')[index]);
        let beans_count = base * times * (host_id == this._parent.id ? 2 : 1);
        // 玩家战斗结束
        if (bWin) {
            this._baseInfo.win_1v2_lian_count++;
            this._baseInfo.lose_1v2_lian_count = 0;
            this.pvp_top_winshangjinliancount = this._baseInfo.win_1v2_lian_count;
            //添加欢乐豆
            this._parent.addItem('W030', beans_count, '1v2_win');
            items.push({ kItemID: 'W030', iPileCount: beans_count });
        }
        else {
            this._baseInfo.win_1v2_lian_count = 0;
            this._baseInfo.lose_1v2_lian_count++;
            //扣除欢乐豆, 若数量不足扣完
            let item_count = this._parent.itemCount('W029')
            beans_count = item_count > beans_count ? beans_count : item_count;
            this._parent.delItem('W029', beans_count, '1v2_lose');
            items.push({ kItemID: 'W029', iPileCount: -beans_count });
        }
        global.netMgr.pvpReward(this._parent.linkid, 0, items, this.make_sync_key(bWin, 0, rid, addBoxId));

        this.saveInfo(["fight_count", "win_1v2_lian_count", "lose_1v2_lian_count"]);

        //有豆子变动的才算任务，排除训练场
        beans_count && this._parent.taskAction(TaskAction.FightComplete, bWin, EnumRaceType.Pvp726, 5);
        beans_count && this._parent.taskAction(TaskAction.FightJoin, race_type_log, bWin);

        global.logMgr.fightFormationLog(this._parent, race_type_log.toString(), bWin, rid || '', tTime, -1, this._parent.baseInfo.lord, this._parent.m_equipMgr.getLordEquip(), -1, '', false, host_id == this._parent.id, host_skills, ...this._parent.revertFormation(formation_1v2));

        this._raceType = -1;

        this.setRaceID(null);
    }

    //诸侯伐董结算
    on_match_pve_pk(bWin: boolean, tTime: number, opp_info: SeChartUnit, fight_low: boolean) {
        //榜单已经超时的不结算
        let res = global.resMgr.getChartTableByType(SeChartType.SCT_GLOBAL_PVE_OFFLINE);
        let curr = Date.now();
        if(res.kStartDate && curr < Date.parse(res.kStartDate)) return;
        if(res.kEndDate && curr > Date.parse(res.kEndDate)) return;
        var rank_change = 0;
        var opp_pve_pk_formation = opp_info.pve_pk_formation;
        var race_type_log = 5555;
        tTime = Math.max(tTime, 1000);
        this._baseInfo.fight_count++;

        // var info = this._winLog("pve_pk", bWin, isBossDie);
        //  global.logMgr.pvpLog(this._parent, '', race_type_log, bWin, tTime, 0, this._baseInfo.win_count, global.resMgr.getHeroFightScore(this._parent.baseInfo.pve_pk_formation).iReal, 0, 0);
        
        global.logMgr.pvepkLog(this._parent, tTime, bWin, this._baseInfo.pve_pk_rank, opp_info.score, this._parent.baseInfo.pve_pk_formation[0], opp_info.pve_pk_formation);

        //判断作弊
        let opp_formation = [];
        let opp_equips = [];
        let formation = [];
        let equips = [];
        for (var key in opp_pve_pk_formation) {
            if (key == 'lord') opp_equips = opp_pve_pk_formation[key].equips;
            else opp_formation.push({ kHeroId: opp_pve_pk_formation[key].heroId, iLevel: opp_pve_pk_formation[key].level });
        }
        for (var key in this._parent.baseInfo.pve_pk_formation[0]) {
            if (key == 'lord') equips = this._parent.baseInfo.pve_pk_formation[0][key].equips;
            else formation.push({ kHeroId: this._parent.baseInfo.pve_pk_formation[0][key].heroId, iLevel: this._parent.baseInfo.pve_pk_formation[0][key].level });
        }
        let player_score = this._parent.pveNewMgr.getFormationCheatScore(formation, equips); //自己得分
        let opp_score = this._parent.pveNewMgr.getFormationCheatScore(opp_formation, opp_equips); //对手得分

        if ((player_score / opp_score) < Number(global.resMgr.getConfig('JJC_cheat').split(',')[0]) && !configInst.get("cheatmode")) {
            global.logMgr.pveCheatLog(this._parent, opp_score.toString(), 'pve_pk', 3, player_score);
            return;
        }
        else if ((player_score / opp_score) < Number(global.resMgr.getConfig('JJC_cheat').split(',')[1])) {
            global.logMgr.pveCheatLog(this._parent, opp_score.toString(), 'pve_pk', 2, player_score);
        }
        else if ((player_score / opp_score) < Number(global.resMgr.getConfig('JJC_cheat').split(',')[2])) {
            global.logMgr.pveCheatLog(this._parent, opp_score.toString(), 'pve_pk', 1, player_score);
        }
        // 玩家战斗结束，挑战比自己高的才算
        if(!fight_low && this.pve_pk_rank > opp_info.score){
            if (bWin) {
                if (this._baseInfo.pve_pk_rank > opp_info.score) {
                    rank_change = this._baseInfo.pve_pk_rank - opp_info.score;
                    let temp = this._baseInfo.pve_pk_rank;
                    this._baseInfo.pve_pk_rank = opp_info.score;
                    opp_info.score = temp;
                    global.globalChartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_GLOBAL_PVE_OFFLINE, opp_info);
                    global.globalChartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_GLOBAL_PVE_OFFLINE, { seasonid: this.seasonid, 
                        id: this._parent.id, 
                        name: this._parent.name, 
                        score: this._baseInfo.pve_pk_rank, 
                        pve_pk_formation: this._parent.baseInfo.pve_pk_formation[1] ? this._parent.baseInfo.pve_pk_formation[1] : [], 
                        icon: this._parent.icon, 
                        avatar: this._parent.avatar, 
                        igroup: this.groupId, 
                        is_vip: this._parent.baseInfo.is_vip, 
                        vip_level: this._parent.baseInfo.vip_level,
                        pve_pk_extra_info: this._parent.pve_pk_extra_info,
                    });
                    this.saveInfo(["pve_pk_rank"]);
                    if (this._parent.bInitComplete) {
                        global.netMgr.sendCharMiscUpdate(this._parent.linkid, "pve_pk_rank", this._baseInfo.pve_pk_rank);
                    }
                    if (opp_info.id > 3000) {
                        global.lsMgr.sendLSData({ cmd: "transferData", type: 'pve_pk_rank', subtype: 1, uid: opp_info.id, rank: opp_info.score, opp_name: this._parent.name, season_id: this.seasonid, time: Date.now(), is_win: !bWin, rank_change: -rank_change, plt: opp_info.igroup? opp_info.igroup.split('_')[0] : global.plt});
                    }
                    this._parent.taskAction(TaskAction.PvePkRank, PVE_PK_INIT_VALUE - this._baseInfo.pve_pk_rank);
                    this.max_pve_pk_rank = PVE_PK_INIT_VALUE - this._baseInfo.pve_pk_rank;
                     //记录
                    this.add_pve_pk_record(this.seasonid, Date.now(), opp_info.name, 0, bWin, this._baseInfo.pve_pk_rank, rank_change);
                }
            }
            else {
                //输了判断下榜单有无满了，没满就当做最后一名，在回调里记录
                let lengthMax = global.resMgr.getChartTableByType(SeChartType.SCT_GLOBAL_PVE_OFFLINE).iMaxPlayer;
                if (global.playerMgr.pve_pk_length < lengthMax) global.globalChartMgr.sendCSData({ cmd: 'check_last_one', charid: this._parent.id, opp_name: opp_info.name, season_id: this.seasonid, type: SeChartType.SCT_GLOBAL_PVE_OFFLINE, info: { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this._baseInfo.pve_pk_rank, pve_pk_formation: this._parent.baseInfo.pve_pk_formation[1] ? this._parent.baseInfo.pve_pk_formation[1] : [], icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level } });
            }
        }
       
        // this._parent.taskAction(TaskAction.FightComplete, bWin, EnumRaceType.pvepk);
        this._parent.taskAction(TaskAction.FightJoin, race_type_log, bWin);

        global.logMgr.fightFormationLog(this._parent, race_type_log.toString(), bWin, '', tTime, -1, this._parent.baseInfo.lord, this._parent.m_equipMgr.getLordEquip(), -1, '', false, false, [], this._parent.revertFormation(this._parent.baseInfo.pve_pk_formation));

        this._raceType = -1;

        this.setRaceID(null);
    }

    public changePvePkRank(data: any) {
        let subtype = 1;
        if(data.subtype != undefined && data.subtype != null) subtype = data.subtype
        //记录
        this.add_pve_pk_record(data.season_id, data.time, data.opp_name, subtype, data.is_win, data.rank, data.rank_change);
        //不为0的时候才改变排名
        if(data.rank_change != 0){
            this._baseInfo.pve_pk_rank = data.rank;
            this.saveInfo(["pve_pk_rank"]);
            if (this._parent.bInitComplete) {
                global.netMgr.sendCharMiscUpdate(this._parent.linkid, "pve_pk_rank", this._baseInfo.pve_pk_rank);
            }
        }
    }

    public simpleChangePveRank(data){
        if(!data.rank || data.rank == this._baseInfo.pve_pk_rank) return;
        this._baseInfo.pve_pk_rank = data.rank;
        this.saveInfo(["pve_pk_rank"]);
        if (this._parent.bInitComplete) {
            global.netMgr.sendCharMiscUpdate(this._parent.linkid, "pve_pk_rank", this._baseInfo.pve_pk_rank);
        }
    }
    private checkShangJinFinish() {
        var win_count = global.resMgr.getConfig('sjs_end_games').split(',')[1];
        var lose_count = global.resMgr.getConfig('sjs_end_games').split(',')[0];
        if (this._baseInfo.lose_shangjin_count >= Number(lose_count) || this._baseInfo.win_shangjin_count >= Number(win_count)) {
            this._parent.cancelShangJinSai(true);
            return true;
        }
        return false;
    }

    /**无限火力结算 */
    on_match_pvp_wuxianhuoli(bWin: boolean, tTime: number, isBossDie: boolean, rid: string) {
        tTime = Math.max(tTime, 1000);
        this._baseInfo.fight_count++;

        //记录历史对手
        var race_type_log = 1211;
        var items = [];

        // 玩家战斗结束

        var info = this._winLog("wuxianhuoli", bWin, isBossDie);
        global.logMgr.pvpLog(this._parent, rid || '', race_type_log, bWin, tTime, 0, 0, global.resMgr.getHeroFightScore(this._parent.matchFormation).iReal, info.winCount, info.loseCount);

        let getBoxId = -1;
        if (bWin) {
            let pre_id = this._baseInfo.genBoxID;
            if (!this.gamekey || this.gamekey == '') items = this._addFightAward(this._baseInfo.pvp_level);
            if (pre_id != this._baseInfo.genBoxID) {
                getBoxId = pre_id;
            }
            //-------------每一次获胜增加一颗星星----------------//
        }
        else {
        }

        global.netMgr.pvpReward(this._parent.linkid, 0, items, this.make_sync_key(bWin, 0, rid, getBoxId));

        this.saveInfo(["fight_count"]);

        this._parent.taskAction(TaskAction.FightComplete, bWin, EnumRaceType.Pvp726, 1);
        if (isBossDie) this._parent.taskAction(TaskAction.FightBossKill, bWin, EnumRaceType.Pvp726, 1);
        this._parent.taskAction(TaskAction.FightJoin, race_type_log, bWin);

        global.logMgr.fightFormationLog(this._parent, race_type_log.toString(), bWin, rid || '', tTime, -1, this._parent.baseInfo.lord, this._parent.m_equipMgr.getLordEquip(), -1, '', false, false, [], ...this._parent.getLogFormation());

        // var self_race_info: SeRaceOpp = {
        //     Id: this._parent.id,
        //     Name: this._parent.name,
        //     Formation: this._parent.matchFormation,
        //     pvp_score: this.pvp_score,
        //     pvp_level: this.pvp_level,
        //     castle_level: this._parent.level,
        //     Icon: this._parent.icon
        // }

        this._raceType = -1;

        var chartTable = global.resMgr.chartTable.getAllRes();
        for (let i in chartTable) {
            if (chartTable[i].eType == SeEnumChartTableeType.DanPiJiFen) {
                if (chartTable[i].iOpenGrade <= this.pvp_level) {
                    // 打仗打好了，看看自己的段位，如果是白金了那么通知榜单服务器
                    global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_PVP_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.pvp_score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
                    global.chartMgr.queryranks(this.seasonid, this._parent.id, SeChartType.SCT_PVP_SCORE);
                }
            }
            else if (chartTable[i].eType == SeEnumChartTableeType.ZhanQuBangDan) {
                if (chartTable[i].iOpenGrade <= this.pvp_level) {
                    if (this.groupId) {
                        global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_GROUP_PVP_SCORE, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.pvp_score, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
                    }
                }
            }
            else if (chartTable[i].eType == SeEnumChartTableeType.PaiWeiLianSheng) {
                if (chartTable[i].iOpenGrade <= this.pvp_level) {
                    if (this.pvp_top_wincount >= 2) {
                        global.chartMgr.addPlayerLevelChart(this.seasonid, SeChartType.SCT_1V1_WIN, { seasonid: this.seasonid, id: this._parent.id, name: this._parent.name, score: this.pvp_top_wincount, icon: this._parent.icon, avatar: this._parent.avatar, igroup: this.groupId, is_vip: this._parent.baseInfo.is_vip, vip_level: this._parent.baseInfo.vip_level });
                    }
                }
            }
        }

        //更新限制武将牌状态
        this._parent.updateTryHeroCard('match');

        this.setRaceID(null);
    }

    public pve_pk_refresh(indexs: number[], no_check: boolean = false, use_money: boolean = false) {
        if(use_money){
            //如果用钻石刷
            let count = parseInt(global.resMgr.getConfig('JJC_refresh').split('|')[1]);
            if(!this._parent.decMoney(count, 'pve_pk_refresh')) return;
            no_check = true;
        }
        //十分钟冷却
        let internal = parseInt(global.resMgr.getConfig('JJC_refresh').split('|')[0]);
        if (indexs.length == 1) no_check = true;
        if (!no_check && (this._baseInfo.pve_pk_refresh_time + internal * 60 * 1000) > Date.now()) return;
        if (indexs.length == 1) {
            let except = [];
            for (let i = 0; i < this._baseInfo.pve_pk_opp.length; i++) {
                if (i == indexs[0]) continue;
                except.push({ id: this._baseInfo.pve_pk_opp[i].id, igroup: this._baseInfo.pve_pk_opp[i].igroup })
            }
            global.globalChartMgr.sendCSData({ cmd: 'pve_pk_refresh', charid: this._parent.id, indexs: indexs, rank: this.pve_pk_rank, except: except });
        }
        else {
            global.globalChartMgr.sendCSData({ cmd: 'pve_pk_refresh', charid: this._parent.id, indexs: indexs, rank: this.pve_pk_rank, except: [] });
            //全部刷新时，更新刷新时间(除强制刷新外)
            if (!no_check) {
                this._baseInfo.pve_pk_refresh_time = Date.now();
                this.saveInfo('pve_pk_refresh_time');
                if (this._parent.bInitComplete) {
                    global.netMgr.sendCharMiscUpdate(this._parent.linkid, "pve_pk_refresh_time", this._baseInfo.pve_pk_refresh_time);
                }
            }
        }

    }

    public pve_pk_watch(index: number) {
        if (this._baseInfo.pve_pk_opp[index] && !this._baseInfo.pve_pk_opp[index]['isWatched'] && this._baseInfo.pve_pk_rank > 50) {
            this._baseInfo.pve_pk_opp[index]['isWatched'] = true;
            this.saveInfo('pve_pk_opp');
            global.netMgr.sendData({ cmd: 'pve_pk_watch_ret', index: index, success: true }, this._parent.linkid);
            return true;
        }
        else {
            global.netMgr.sendData({ cmd: 'pve_pk_watch_ret', index: index, success: false }, this._parent.linkid);
            return false;
        }
    }

    public checkFight(opp_id: number, opp_igroup: string, index: number) {
        if (this._parent.dailyInfo.pve_pk_fight_count <= 0) {
            return;
        }
        if (!this._parent.baseInfo.pve_pk_formation[0]) {
            global.netMgr.sendData({ cmd: 'checkFight_ret', success: false, index: index, reason: 'no formation' }, this._parent.linkid);
            return;
        }
        //10分钟内只能打一次
        if(!configInst.get("cheatmode") && (Date.now() - this._baseInfo.pve_pk_fight_time) < 5 * 60 * 1000){
            global.netMgr.sendData({ cmd: 'checkFight_ret', success: false, index: index, reason: 'time limit' }, this._parent.linkid);
            return;
        }
        global.globalChartMgr.sendCSData({ cmd: 'checkFight', charid: this._parent.id, igroup: this.groupId, opp_id: opp_id, opp_igroup: opp_igroup, index: index });
    }

    public pve_pk_refresh_ret(result) {
        for (var key in result) {
            if (result[key] == {}) this._baseInfo.pve_pk_opp.splice(parseInt(key), 1);
            else {
                result[key]['isWatched'] = false;
                this._baseInfo.pve_pk_opp[key] = result[key];
            }
        }
        //全部刷新时排序
        if(Object.keys(result).length > 1){
            this._baseInfo.pve_pk_opp.sort((a,b) => a.score - b.score);
        }
        this.saveInfo('pve_pk_opp');
        if (this._parent.bInitComplete) {
            global.netMgr.sendCharMiscUpdate(this._parent.linkid, "pve_pk_opp", this._baseInfo.pve_pk_opp);
        }
    }

    //------------PvP v726 end------------------------//

    private _raceID: string;

    mode: string;
    gamekey: string;
    public setRaceID(v: string, mode: string = '1v1') {
        if (v) {
            this._parent.setState(CharState.inrace);
        }
        else {
            this._parent.setState(CharState.loadcomplete);
        }
        this._raceID = v;
        this.mode = mode;
    }

    public getRaceID() {
        return this._raceID;
    }

    public get_target_score(sa: number, sb: number) {
        var k = 0;
        var s = Math.pow(TeMath.stdev(sa, sb), 1 + k) + Math.min(sa, sb);
        return Math.floor(Math.max(s, sa));
    }

    /**
     * 实时匹配信息返回
     * @param infoA 表示自己的对战信息
     * @param infoB 表示别人的对战信息
     */
    public on_match_pvp_ol_back(rid: string, checkKey: string, rurl: string, oscore: number, mode: string) {
        // 
        var pkBattleRankRes = global.resMgr.getBattleRankByLevel(this.pvp_level);
        var earnMoney = 0;
        if (pkBattleRankRes) {
            earnMoney = Math.ceil(pkBattleRankRes.iGold * (0.9 + Math.random() / 5)) || 1;
        }
        // 玩家匹配结果返回
        this.setRaceID(rid, mode);

        //保存进入race的信息, 可能客户端没收到这消息, 重连进入不了游戏
        let data = {
            cmd: "joinRace",
            rid: rid,
            checkKey: checkKey,
            rurl: rurl,
            award: {},
            mode: mode
        };

        this.raceInfo = { type: "online", mode: mode, pvp_score: oscore, Name: "", extra: data };
        this._raceType = EnumRaceType.olPvp;

        // 这里需要通知玩家链接比赛服
        global.netMgr.sendData(data, this._parent.linkid);
        this._parent.setState(CharState.inrace);
    }

    public onMatchOver() {
        this._parent.setState(CharState.loadcomplete);
    }

    /**
     * 真人匹配下的结算流程
     * @param bWin 
     * @param time 
     * @param isBossDie 
     * @param mode 
     * @param pvp_score 
     * @param rmode 
     * @param rid 
     * @param bTeam 
     * @param oppname 
     * @param state 
     * @param isUnSync 
     */
    public onMatchPvpOlFight_MS_BACK(bWin: boolean, time: number, isBossDie: boolean, mode: string, pvp_score: number, rmode: number, rid: string, bTeam: boolean, oppname: string, state: string, isUnSync: boolean, isCross: boolean, opplevel: number, host_id: number, host_skills: Array<number>, times: number, index: number, formation_1v2: Array<SeLogicFormation>) {
        if (isUnSync) {
            // 不同步的录像记录一个日志
            let raceType = 1022;
            if (mode == "peakmatch") { raceType = 1111; }
            else if (mode == "1v1") { raceType = 1011; }
            else if (mode == "wuxianhuoli") { raceType = 1211; }
            else if (mode == "shangjinmatch") { raceType = 1311; }
            else if (mode == "1v2") { raceType = 3333; }
            global.logMgr.unsync_race(this._parent, rid, raceType.toString());
        }

        this.fight_finish(true, (state != 'cancell'), time);

        if (state == 'cancell') {
            this.setRaceID(null);
            this._raceType = -1;
        }
        else if (rmode != 0 && rmode != 3 && rmode != 5 && rmode != 6 && rmode != 9) {
            // 直接结束了，不用结算东西给玩家
            global.netMgr.pvpReward(this._parent.linkid, 0, [], this.make_sync_key(bWin, 0, rid, -1));
            this.setRaceID(null);

            // if(mode != 'peakmatch') {
            this._parent.taskAction(TaskAction.FightComplete, bWin, EnumRaceType.olPvp, this.mode == '2v2' ? 2 : 1);
            // }
        }
        else {
            if (mode == '1v1') this.on_match_pvp_v726_fight(bWin, time, isBossDie, pvp_score, false, rid, oppname, opplevel, isCross, false);
            else if (mode == 'peakmatch') { this.on_match_pvp_fight_peak(bWin, time, isBossDie, pvp_score, false, rid, oppname, isCross); }
            else if (mode == 'shangjinmatch') { this.on_match_pvp_fight_shangjin(bWin, time, isBossDie, pvp_score, false, rid, oppname); }
            else if (mode == 'wuxianhuoli') { this.on_match_pvp_wuxianhuoli(bWin, time, isBossDie, rid); }
            else if (mode == '1v2') { this.on_match_1v2_fight(bWin, time, isBossDie, rid, host_id, host_skills, times, index, formation_1v2) }
            else {
                this.on_match_pvp_fight_2v2(bWin, time, isBossDie, rid, bTeam);
                if (bTeam) {
                    this._parent.taskAction(TaskAction.FightComplete, bWin, EnumRaceType.olPvp, 2);
                }
            }
        }

        this.raceInfo = null;
    }

    //------------pvp ol end--------------------------//
    onLeave(leaveGame = false) {
        if (this.getRaceID()) {
            this.setRaceID(null);
        }

        if (this.raceInfo) {
            // 有没有结算过的比赛信息，有的话存储一下,不主动结算
            this._baseInfo.raceinfo = JSON.stringify(this.raceInfo);
            this.saveInfo('raceinfo');
        }
    }

    // 登陆的时候减少开箱时间
    onLoginDecBoxTime() {
        // 检查自己是否有特权

        if (!this._parent.get_buffer_value(SeEnumTownBuffereType.BaoXiangLiXianJieSuo) && global.resMgr.getConfig('offline_open_box') == 'true') {
            return;
        }

        // 查看上次离线时间和这次登陆时间的时间差
        var timeDiff = this._parent.baseInfo.loginTime - this._parent.baseInfo.lastLogoutTime;
        if (!this._parent.baseInfo.lastLogoutTime) timeDiff = 0;
        if (!timeDiff) return;

        if (this._baseInfo.boxList) {
            // 先看看有没有正在开启中的箱子
            if (this._baseInfo.openingIndex >= 0) {
                var rBox = this._baseInfo.boxList[this._baseInfo.openingIndex];
                if (rBox && this._parent.baseInfo.loginTime > rBox.ftime) {
                    // 看看时间是否超出了正在开其中的箱子需要的时间
                    timeDiff = Math.min(this._parent.baseInfo.loginTime - rBox.ftime, timeDiff);
                }
                else {
                    // 没超出那么就多余时间设置为0
                    timeDiff = 0;
                }
            }

            var descList = [];
            // 袋子抵消时间从长的开始算起
            for (var i = 0; i < Box_Max; i++) {
                var rBox = this._baseInfo.boxList[i];
                if (!rBox || i == this._baseInfo.openingIndex || (rBox.ftime && rBox.ftime < Date.now())) continue;
                descList.push({ i: i, t: rBox.optime || 0 });
            }

            if (descList.length == 0 || timeDiff <= 0) return;

            descList.sort(function (a: { i: number, t: number }, b: { i: number, t: number }) {
                return (a.t > b.t) ? 1 : -1;
            });

            // 看看几个袋子可以抵消时间
            for (var i = 0; i < descList.length; i++) {
                var bi = descList[i].i;
                var rBox = this._baseInfo.boxList[bi];
                var opTime = rBox.optime * 60 * 1000;
                if (opTime > timeDiff) {
                    // rBox.optime = (opTime - timeDiff) / (60 * 1000);
                    if (timeDiff >= 10 * 60 * 1000) {
                        rBox.ftime = Math.floor(Date.now() + (opTime - timeDiff));
                        this._baseInfo.openingIndex = bi;

                        // 记录减少了多少时间
                        global.logMgr.pvpBoxLog(this._parent, "dectime", rBox.id, rBox.type, rBox.level, null, timeDiff);
                    }
                    timeDiff = 0;
                    break;
                }
                else {
                    rBox.ftime = this._parent.baseInfo.loginTime;
                    timeDiff -= opTime;

                    // 记录减少了多少时间
                    global.logMgr.pvpBoxLog(this._parent, "dectime", rBox.id, rBox.type, rBox.level, null, opTime);
                    if (timeDiff <= 0) break;
                }
            }

            this.saveInfo(['openingIndex', 'boxList']);
        }
    }

    onLogin() {
        if (this.pvp_score == null || this.pvp_score == undefined) {
            this.pvp_score = 1500;
        }
        if (typeof this.pvp_loneoppname == 'string') {
            this.pvp_loneoppname = [this.pvp_loneoppname];
            this.saveInfo(["lone_oppname"]);
        }
        this.checkPeakDayReward();
        this.checkPvePkDayReward();
        // 防止赛季结算的时候没有获取到战区
        // 检查一下赛季战区是否正确配置了
        if (!this.groupId && this.groupState) {
            global.chartMgr.apply_group_id(this.seasonid, SeChartType.SCT_GROUP_PVP_SCORE, this._parent.id, this.groupState);
        }

        this.checkSeason();

        this.onLoginDecBoxTime();
    }

    private _winLog(mode: "1v1" | "2v2" | "peak" | "wuxianhuoli" | "shangjin" | "1v2", isWin: boolean, isKillBoss: boolean) {
        if (mode == "1v1") {
            this._baseInfo.log_1v1.fightCount++;
            isWin && (this._baseInfo.log_1v1.winCount++) && isKillBoss && (this._baseInfo.log_1v1.killBoss++);
            !isWin && (this._baseInfo.log_1v1.loseCount++);
            this.saveInfo("log_1v1");
            if (this._parent.bInitComplete) { global.netMgr.sendCharMiscUpdate(this._parent.linkid, "log_1v1", this._baseInfo.log_1v1); }
            return this._baseInfo.log_1v1;
        }
        else if (mode == "2v2") {
            this._baseInfo.log_2v2.fightCount++;
            isWin && (this._baseInfo.log_2v2.winCount++) && isKillBoss && (this._baseInfo.log_2v2.killBoss++);
            !isWin && (this._baseInfo.log_2v2.loseCount++);
            this.saveInfo("log_2v2");
            if (this._parent.bInitComplete) { global.netMgr.sendCharMiscUpdate(this._parent.linkid, "log_2v2", this._baseInfo.log_2v2); }
            return this._baseInfo.log_2v2;
        }
        else if (mode == "wuxianhuoli") {
            if (!this._baseInfo.log_wuxianhuoli) {
                this._baseInfo.log_wuxianhuoli = new PvpLogInfo();
            }
            this._baseInfo.log_wuxianhuoli.fightCount++;
            isWin && (this._baseInfo.log_wuxianhuoli.winCount++) && isKillBoss && (this._baseInfo.log_wuxianhuoli.killBoss++);
            !isWin && (this._baseInfo.log_wuxianhuoli.loseCount++);
            this.saveInfo("log_wuxianhuoli");
            if (this._parent.bInitComplete) { global.netMgr.sendCharMiscUpdate(this._parent.linkid, "log_wuxianhuoli", this._baseInfo.log_wuxianhuoli); }
            return this._baseInfo.log_wuxianhuoli;
        }
        else if (mode == "peak") {
            this._baseInfo.log_peak.fightCount++;
            isWin && (this._baseInfo.log_peak.winCount++) && isKillBoss && (this._baseInfo.log_peak.killBoss++);
            !isWin && (this._baseInfo.log_peak.loseCount++);
            this.saveInfo("log_peak");
            if (this._parent.bInitComplete) { global.netMgr.sendCharMiscUpdate(this._parent.linkid, "log_peak", this._baseInfo.log_peak); }
            return this._baseInfo.log_peak;
        }
        else if (mode == "shangjin") {
            this._baseInfo.log_shangjin.fightCount++;
            isWin && (this._baseInfo.log_shangjin.winCount++) && isKillBoss && (this._baseInfo.log_shangjin.killBoss++);
            !isWin && (this._baseInfo.log_shangjin.loseCount++);
            this.saveInfo("log_shangjin");
            if (this._parent.bInitComplete) { global.netMgr.sendCharMiscUpdate(this._parent.linkid, "log_pelog_shangjinak", this._baseInfo.log_shangjin); }
            return this._baseInfo.log_shangjin;
        }
        else if (mode == "1v2") {
            this._baseInfo.log_1v2.fightCount++;
            isWin && (this._baseInfo.log_1v2.winCount++) && isKillBoss && (this._baseInfo.log_1v2.killBoss++);
            !isWin && (this._baseInfo.log_1v2.loseCount++);
            this.saveInfo("log_1v2");
            if (this._parent.bInitComplete) { global.netMgr.sendCharMiscUpdate(this._parent.linkid, "log_1v2", this._baseInfo.log_1v2); }
            return this._baseInfo.log_1v2;
        }
    }

    public useHero(cardId: number) {
        if (this.mode != "2v2") {
            if (isNaN(this._baseInfo.log_1v1.useCard[cardId])) {
                this._baseInfo.log_1v1.useCard[cardId] = 0;
            }
            this._baseInfo.log_1v1.useCard[cardId]++;
            this.saveInfo("log_1v1");
        } else {
            if (isNaN(this._baseInfo.log_2v2.useCard[cardId])) {
                this._baseInfo.log_2v2.useCard[cardId] = 0;
            }
            this._baseInfo.log_2v2.useCard[cardId]++;
            this.saveInfo("log_2v2");
        }
    }

    /**
     * 人机1v1掉线结算检查
     */
    public check_last_race() {
        if (this._baseInfo.raceinfo && this._baseInfo.raceinfo.length > 0) {
            this.raceInfo = JSON.parse(this._baseInfo.raceinfo);
            if (this.raceInfo) {
                // 发送玩家查询结算
                this.mode = this.raceInfo.mode;
                global.netMgr.sendData({ cmd: "offlinecheck", Name: this.raceInfo.Name, pvp_score: this.raceInfo.pvp_score, type: this.raceInfo.type, mode: this.raceInfo.mode, extra: this.raceInfo.extra }, this._parent.linkid)
            }

            this._baseInfo.raceinfo = '';
            this.saveInfo('raceinfo');
        }
    }

    //--------------赛季的功能在这里添加------------------------//
    private _get_award_list(pkSeasonRes: SeResSeasonEx) {
        if (!pkSeasonRes) return null;
        for (var i = pkSeasonRes.akParseAwards.length - 1; i >= 0; i--) {
            var r = pkSeasonRes.akParseAwards[i];
            if (r.elo && this.pvp_score < r.elo) continue;
            if (r.pvplevel && this.pvp_level < r.pvplevel) continue;

            return r;
        }

        return null;
    }

    //作弊命令，测试跨服争霸赛奖励
    cheat_test_peak() {
        if (configInst.get('globalMgr.url-all') && global.resMgr.getConfig("peak_cross_server") == 'true') {
            global.globalChartMgr.onGiveSeasonCrossReward(this.seasonid, SeChartType.SCT_GLOBAL_PEAK_SCORE, this._parent.id, this.peak_score);
        }
    }
    /**
     * 作弊测试赛季结算的，假装现在是上个赛季，然后触发赛季结算
     */
    cheat_checkSeason() {
        var allSeasinfos = global.resMgr.seasonRes.getAllRes();

        var oldSid = this._baseInfo.seasonid;

        for (var key in allSeasinfos) {
            var r = <SeResSeasonEx>allSeasinfos[key];
            if (r.kNextID == this.seasonid) {
                this._baseInfo.seasonid = r.kID;
                break;
            }
        }

        // 清理一下历史赛季信息里面的上个赛季信息

        for (var i = 0; i < this._baseInfo.seasoninfo.length; i++) {
            var rs = this._baseInfo.seasoninfo[i];
            if (rs.kid == this._baseInfo.seasonid) {
                this._baseInfo.seasoninfo.splice(i, 1);
                break;
            }
        }

        // 清理一下赛季充值信息
        var orders = this._parent.rechargeDB.value;
        for (var key in orders) {
            var rk = <RechargeInfo>orders[key];
            if (rk && (rk.sid == oldSid)) {
                rk.sid = this._baseInfo.seasonid;
                this._parent.rechargeDB.save(key, rk);
            }
        }

        this.saveInfo(['seasonid', 'seasoninfo']);
    }

    /**
   * 检查一下玩家的赛季是否正确
   */
    checkSeason(iLoop: number = 0) {
        // 赛季结算的解锁
        let luck_info = global.resMgr.getUnlockInfo(SeEnumUnlockeFunc.SaiJi)

        // 判断一下当前的赛季是否是正在进行中的赛季
        var pkRes = global.resMgr.seasonRes.getRes(this.seasonid);
        if (pkRes && pkRes.kEndTime &&
            Date.now() > (new Date(pkRes.kEndTime)).getTime() &&
            pkRes.kNextID) {
            // 如果超过这个赛季了那么 赛季结算一次
            // 能且只能结算最近的一次
            var _pkRes = global.resMgr.seasonRes.getRes(pkRes.kNextID);
            while (_pkRes && _pkRes.kEndTime && _pkRes.kNextID) {
                if (Date.now() <= (new Date(_pkRes.kEndTime)).getTime()) {
                    break;
                }
                pkRes = _pkRes;
                _pkRes = global.resMgr.seasonRes.getRes(_pkRes.kNextID);
            }
            // 清理一下玩家身上的赛季重置前清除道具
            this._parent.m_pkItemMgr.clear_season_before_item();

            if (!luck_info || this.pvp_level >= luck_info.iOpengrade) {
                //构建一个赛季的结算
                var newScore = SeasonFunc.call(pkRes.kEloFunc, this.pvp_score);
                var newLevel = SeasonFunc.call(pkRes.kLevelFunc, newScore, this.pvp_score, 2/*this.pvp_level*/);
                //最高分和最高段位的限制
                if (newScore > 2100) {
                    newScore = 2100;
                }
                if (newLevel > 13) {
                    newLevel = 13;
                }
                this.seasonid = pkRes.kNextID;

                var items: SeItem[] = [];
                var pkAwardInfo = this._get_award_list(pkRes);
                if (pkAwardInfo) {
                    pkAwardInfo.items.forEach(element => {
                        items.push({ kItemID: element.id, iPileCount: element.num });
                    });

                    if (items.length > 0) this._parent.addItems(items, 'seasonend');

                    if (pkAwardInfo.mallid) {
                        // 这里是赛季商城
                        this._parent.m_pkShopMgr.reset_shop_limit(pkAwardInfo.mallid);
                    }
                }
                //vip发送奖励邮件
                if (this._parent.baseInfo.is_vip && this._parent.baseInfo.vip_level > 0) {
                    let vip_res = global.resMgr.getVIPResByVIPLevel(this._parent.baseInfo.vip_level);
                    if (vip_res && vip_res.akRewardSeason) {
                        let items = [];
                        for (let i = 0; i < vip_res.akRewardSeason.length; i++) {
                            items.push(vip_res.akRewardSeason[i].split(',')[0], parseInt(vip_res.akRewardSeason[i].split(',')[1]));
                        }
                        if (items.length > 0) {
                            let content = LangID(vip_res.akSeasonMail[0]);
                            let title = LangID(vip_res.akSeasonMail[1]);
                            global.playerMgr.onGiveMail(this._parent.plt, this._parent.id, SeMailType.SYSTEM, content, items, 0, title);
                        }
                    }
                }


                // 结算的时候需要把成就系统也结算了
                this._parent.checkSeasonChengJiu_start(pkRes.kID);
                // buff有赛季结算特性
                this._parent.m_buffMgr.checkSeasonBuff();

                var seasonlog: ifSeasonInfo = {
                    kid: pkRes.kID,
                    pvpscore: this.pvp_score,
                    pvplevel: this.pvp_level,
                    awards: items,
                    viewed: false,
                    newlevel: newLevel,
                    newscore: newScore,
                    log1v1: this._baseInfo.log_1v1,
                    log2v2: this._baseInfo.log_2v2,
                    peakscore: this._baseInfo.peak_score,
                    fengwangCount: this._parent.itemCount('W206') >= pkRes.iFwTopLevel ? 1 : 0,
                    gloryScore: this._baseInfo.glory_score,
                    levelSpeed: this._baseInfo.level_speed,
                }

                this.seasoninfo.push(seasonlog);
                if (seasonlog.pvplevel >= 16) this._baseInfo.duowang_count += 1;
                if (seasonlog.pvpscore >= 4000) this._baseInfo.high_duowang_count += 1;
                if (seasonlog.fengwangCount == 1) this._baseInfo.fengwang_count += 1;

                this._baseInfo.pvp_level = newLevel;
                this._baseInfo.pvp_score = newScore;
                this._baseInfo.pvp_star = 1;
                this._baseInfo.log_1v1 = new PvpLogInfo();
                this._baseInfo.log_2v2 = new PvpLogInfo();
                this._baseInfo.log_peak = new PvpLogInfo();
                this.saveInfo(['pve_pk_rank', 'pvp_star', 'fengwang_count', 'duowang_count', 'high_duowang_count', 'seasoninfo', 'season_shop', 'pvp_level', 'pvp_score', 'log_1v1', 'log_2v2', 'log_peak']);
                this._parent.checkSeasonChengJiu_finish();

                // 结算的时候需要把巅峰系统也结算了
                global.chartMgr.onGiveSeasonReward(this.seasonid, SeChartType.SCT_PEAK_SCORE, this._parent.id, this.peak_score);
                if (configInst.get('globalMgr.url-all') && global.resMgr.getConfig("peak_cross_server") == 'true') {
                    global.globalChartMgr.onGiveSeasonCrossReward(this.seasonid, SeChartType.SCT_GLOBAL_PEAK_SCORE, this._parent.id, this.peak_score);
                }
                if (configInst.get('globalCsMgr.url')) {
                    global.globalChartMgr.onGiveSeasonCrossReward(this.seasonid, SeChartType.SCT_GLOBAL_GLORY_SCORE, this._parent.id, this.glory_score);
                }
                // 清理一下玩家身上的赛季重置后清除道具
                this._parent.m_pkItemMgr.clear_season_after_item();
                // 清除1v1 2v2连胜 巅峰连胜
                this._baseInfo.win_count = 0;
                this._baseInfo.lose_count = 0;
                this._baseInfo.top_win_count = 0;
                this._baseInfo.win_2v2_count = 0;
                this._baseInfo.lose_2v2_count = 0;
                this._baseInfo.top_win_2v2_count = 0;
                this._baseInfo.win_peak_lian_count = 0;
                this._baseInfo.lose_peak_lian_count = 0;
                this._baseInfo.top_win_peak_lian_count = 0;
                this.saveInfo(['win_count', 'lose_count', 'top_win_count', 'win_2v2_count', 'lose_2v2_count', 'top_win_2v2_count', 'win_peak_lian_count', 'lose_peak_lian_count', 'top_win_peak_lian_count']);
            }
            else {
                // 只结算一个赛季id
                this.seasonid = pkRes.kNextID;

            }
            // 结算的时候需要把关卡竞速也结算了
            if (this.level_speed) {
                global.chartMgr.onGiveSeasonReward(this.seasonid, SeChartType.SCT_PUTONG_LEVEL_SPEED, this._parent.id, this.level_speed[0]);
                global.chartMgr.onGiveSeasonReward(this.seasonid, SeChartType.SCT_KUNNAN_LEVEL_SPEED, this._parent.id, this.level_speed[1]);
                if (configInst.get('globalCsMgr.url')) {
                    global.globalChartMgr.onGiveSeasonCrossReward(this.seasonid, SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED, this._parent.id, this.level_speed[2]);
                }
            }
            this._baseInfo.level_speed = [];
            this._baseInfo.level_speed_level = "";
            // 结算的时候需要把诸侯伐董也结算了,并刷新新对手
            if (this._baseInfo.pve_pk_rank < PVE_PK_INIT_VALUE && configInst.get('globalMgr.url-all')) {
                global.globalChartMgr.onGiveSeasonCrossReward(this.seasonid, SeChartType.SCT_GLOBAL_PVE_OFFLINE, this._parent.id, this._baseInfo.pve_pk_rank);
            }
            this._baseInfo.pve_pk_rank = PVE_PK_INIT_VALUE;
            this._baseInfo.pve_pk_opp = [];
            this.pve_pk_refresh([0,1,2], true);
            this.saveInfo(['level_speed_level', 'level_speed', 'pve_pk_rank', 'pve_pk_opp']);
            
            this._parent.m_pkShopMgr.checkSeasonActivity();
            this._parent.pveMgr.checkSeason();

            this.setGroupId('');
            this.groupState = 'old';
            global.chartMgr.apply_group_id(this.seasonid, SeChartType.SCT_GROUP_PVP_SCORE, this._parent.id, this.groupState);

            return true;
        }
        else if (!pkRes) {
            this.seasonid = 'S035';
            if (this._parent.plt == 'hago') {
                this.seasonid = 'S001';
            }
            this.checkSeason();
        }
        else {
            return false;
        }
    }

    public setGroupId(v: string) {
        this._baseInfo.iGroupId = v;
        this.saveInfo('iGroupId');
    }

    public get groupId() {
        return this._baseInfo.iGroupId;
    }

    public get groupState() {
        return this._baseInfo.groupState;
    }

    public set groupState(v) {
        this._baseInfo.groupState = v;
        this.saveInfo('groupState');
    }

    seasonview(seasonid: string) {
        var bchange = false
        for (var i = 0; i < this.seasoninfo.length; i++) {
            var r = this.seasoninfo[i];
            if (r.kid == seasonid) {
                if (!r.viewed) {
                    r.viewed = true;

                    bchange = true;
                }
            }
        }

        if (bchange) {
            this.saveInfo(['seasoninfo']);
        }
    }

    /**
     * 校验每日赛季发放
     */
    checkPeakDayReward() {
        //巅峰赛每日奖励发送
        let daily = global.resMgr.getConfig("competitionDaily");
        if (!daily) {
            console.log("no giveDayReward time Daily");
            return;
        }
        let _daily = daily.split(':');
        if (!this.peak_day_etime) { this.peak_day_etime = 0; }
        //let last_reward_time = new Date().setHours(parseInt(_daily[0]) - 24, parseInt(_daily[1]), 0, 0);
        let reward_time = new Date().setHours(parseInt(_daily[0]), parseInt(_daily[1]), 0, 0);

        let time = 0;
        //最后一下发奖励时间和当前时间的日期差大于1并且最后一下发奖励时间小于昨天的发奖励时间
        if (TeDate.daydiff(this.peak_day_etime, Date.now()) > 0) { // && this.peak_day_etime < last_reward_time
            //注意置到当天得凌晨, 以前得处理完
            time = new Date().setHours(0, 0, 0, 0);
        }
        //当前时间大于发奖励时间并且最后一下发奖励时间小于发奖励时间
        if (Date.now() > reward_time && this.peak_day_etime < reward_time) {
            //注意置到第二天得凌晨,当天得处理完
            time = new Date().setHours(24, 0, 0, 0);
        }

        if (time > 0) {
            if (this.peak_score > SCORE_INIT_VALUE) {
                global.chartMgr.onGiveDayReward(this.seasonid, SeChartType.SCT_PEAK_SCORE, this._parent.id, this.peak_score, this.peak_day_etime, time);
            }
            else {
                //将奖励时间重置, 没有必要等到榜单服务器的返回
                this.peak_day_etime = time;
            }
        }
    }

    /**
    * 校验每日赛季发放
    */
    checkPvePkDayReward() {
        //诸侯伐董每日奖励发送
        let daily = global.resMgr.getConfig("JJC_reward_time");
        if (!daily) {
            console.log("no giveDayReward time Daily");
            return;
        }
        let _daily = daily.split(':');
        if (!this.pve_pk_day_etime) { this.pve_pk_day_etime = 0; }
        //let last_reward_time = new Date().setHours(parseInt(_daily[0]) - 24, parseInt(_daily[1]), 0, 0);
        let reward_time = new Date().setHours(parseInt(_daily[0]), parseInt(_daily[1]), 0, 0);

        let time = 0;
        //最后一下发奖励时间和当前时间的日期差大于1并且最后一下发奖励时间小于昨天的发奖励时间
        if (TeDate.daydiff(this.pve_pk_day_etime, Date.now()) > 0) { // && this.peak_day_etime < last_reward_time
            //注意置到当天得凌晨, 以前得处理完
            time = new Date().setHours(0, 0, 0, 0);
        }

        if (time > 0) {
            if (this.pve_pk_rank < PVE_PK_INIT_VALUE) {
                global.globalChartMgr.onGiveDayCrossReward(this.seasonid, SeChartType.SCT_GLOBAL_PVE_OFFLINE, this._parent.id, this.pve_pk_rank, this.pve_pk_day_etime, time);
            }
            else {
                //将奖励时间重置, 没有必要等到榜单服务器的返回
                this.pve_pk_day_etime = time;
            }
        }
    }
    /**
     * 巅峰赛季结算奖励
     */
    giveSeasonReward(reward: { rank: number, items: Array<string>, grade: string }) {
        if (reward && reward.items) {
            let items: Array<SeItem> = [];
            for (let i = 0; i < reward.items.length; i++) {
                let _items = reward.items[i].split(',');
                items.push({ kItemID: _items[0], iPileCount: parseInt(_items[1]) });
            }
            // //发送奖励邮件
            let content = global.resMgr.getConfig('competitionMail');
            let title = global.resMgr.getConfig('competitionTitle');
            if (content) {
                let strList = content.split('{#}');
                if (strList.length == 3) {
                    let _last_seasonid = (global.resMgr.seasonRes.getRes(this.seasonid).kPreviousID) || "S000";
                    let message = strList[0] + _last_seasonid + strList[1] + reward.grade + strList[2];
                    global.playerMgr.onGiveMail(this._parent.plt, this._parent.id, SeMailType.SYSTEM, message, items, 0, title);
                }
            }

            // this._parent.addItems(items, "seasonend");

        }

        //保存到历史数据
        //因为赛季只能取到最新赛季, 所以这里从资源表里拿上个赛季
        let res = global.resMgr.seasonRes.getRes(this.seasonid);
        let info = { rank: reward.rank || 0, win_peak_count: this.pvp_winpeakcount, lose_peak_count: this.pvp_losepeakcount, peak_score: this.peak_score, seasonid: res.kPreviousID };
        this.peak_season_log = info;

        //清空
        this.peak_score = SCORE_INIT_VALUE;
        this._baseInfo.win_peak_count = 0;
        this._baseInfo.lose_peak_count = 0;

        this.saveInfo(['win_peak_count', 'lose_peak_count', 'peak_score']);
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'win_peak_count', this._baseInfo.win_peak_count);
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'lose_peak_count', this._baseInfo.lose_peak_count);


        //名将统计清理
        // global.countMgrInst.general_num_clear(this.seasonid);
    }

    /**
     * 跨服巅峰赛季结算奖励
     */
    giveSeasonCrossReward(reward: { rank: number, items: Array<string>, grade: string }) {
        if (reward && reward.items && reward.items.length > 0) {
            let items: Array<SeItem> = [];
            for (let i = 0; i < reward.items.length; i++) {
                let _items = reward.items[i].split(',');
                items.push({ kItemID: _items[0], iPileCount: parseInt(_items[1]) });
            }
            // //发送奖励邮件
            let content = global.resMgr.getConfig('competitionCrossMail');
            let title = global.resMgr.getConfig('competitionCrossTitle');
            if (content) {
                let strList = content.split('{#}');
                if (strList.length == 3) {
                    let _last_seasonid = (global.resMgr.seasonRes.getRes(this.seasonid).kPreviousID) || "S000";
                    let message = strList[0] + _last_seasonid + strList[1] + reward.grade + strList[2];
                    global.playerMgr.onGiveMail(this._parent.plt, this._parent.id, SeMailType.SYSTEM, message, items, 0, title);
                }
            }
        }
        let res = global.resMgr.seasonRes.getRes(this.seasonid);
        var chartTable = global.resMgr.chartTable.getAllRes();
        let max_player = 200;
        for (let i in chartTable) {
            if (chartTable[i].eType == SeEnumChartTableeType.QuanQuZhengBaBang) {
                max_player = chartTable[i].iMaxPlayer;
            }
        }
        let info = { cross_rank: reward.rank <= max_player ? reward.rank : 0, seasonid: res.kPreviousID };
        this.peak_season_log = info;
    }

    /**
     * 跨服巅峰赛季结算奖励
     */
    givePvePkSeasonCrossReward(reward: { rank: number, items: Array<string>, grade: string }) {
        if (reward && reward.items && reward.items.length > 0) {
            let items: Array<SeItem> = [];
            for (let i = 0; i < reward.items.length; i++) {
                let _items = reward.items[i].split(',');
                items.push({ kItemID: _items[0], iPileCount: parseInt(_items[1]) });
            }
            // //发送奖励邮件
            let content = global.resMgr.getConfig('JJC_CrossMail');
            let title = global.resMgr.getConfig('JJC_CrossTitle');
            if (content) {
                let strList = content.split('{#}');
                if (strList.length == 3) {
                    let _last_seasonid = (global.resMgr.seasonRes.getRes(this.seasonid).kPreviousID) || "S000";
                    let message = strList[0] + _last_seasonid + strList[1] + reward.grade + strList[2];
                    global.playerMgr.onGiveMail(this._parent.plt, this._parent.id, SeMailType.SYSTEM, message, items, 0, title);
                }
            }
        }
        let res = global.resMgr.seasonRes.getRes(this.seasonid);
        var chartTable = global.resMgr.chartTable.getAllRes();
        // let max_player = 10000;
        // for (let i in chartTable) {
        //     if (chartTable[i].eType == SeEnumChartTableeType.LianJunJingJiChang) {
        //         max_player = chartTable[i].iMaxPlayer;
        //     }
        // }
        let info = { cross_rank: reward.rank, seasonid: res.kPreviousID };
        // this.peak_season_log = info;
    }

    /**
     * 关卡竞速赛赛季结算奖励
     */
    giveLevelSpeedSeasonReward(reward: { rank: number, items: Array<string>, grade: string }, chartype: number) {
        if (chartype == SeEnumChartTableeType.QuanFuRongYaoJiFenBang) {
            this.glory_score = 0;
            this.glory_kill = 0;
            this.saveInfo(['glory_score', 'glory_kill']);
        }
        if (reward && reward.items && reward.items.length > 0) {
            let items: Array<SeItem> = [];
            for (let i = 0; i < reward.items.length; i++) {
                let _items = reward.items[i].split(',');
                items.push({ kItemID: _items[0], iPileCount: parseInt(_items[1]) });
            }
            // //发送奖励邮件
            let title = LangID("4930");
            let message = LangID("4931");
            switch (chartype) {
                case SeEnumChartTableeType.PuTongGuanKaJingSuSaiBang:
                    message += LangID("4932");
                    break;
                case SeEnumChartTableeType.QuanFuPuTongGuanKaJingSuSaiBang:
                    message += LangID("4932");
                    break;
                case SeEnumChartTableeType.KunNanGuanKaJingSuSaiBang:
                    message += LangID("4933");
                    break;
                case SeEnumChartTableeType.QuanFuKunNanGuanKaJingSuSaiBang:
                    message += LangID("4933");
                    break;
                case SeEnumChartTableeType.DiYuGuanKaJingSuSaiBang:
                    message += LangID("4934");
                    break;
                case SeEnumChartTableeType.QuanFuDiYuGuanKaJingSuSaiBang:
                    message += LangID("4934");
                    break;
                case SeEnumChartTableeType.QuanFuRongYaoJiFenBang:
                    title = LangID("5149");
                    message += LangID("5150");
                    break;
            }
            message += LangID("4935") + reward.grade + LangID("4936");
            global.playerMgr.onGiveMail(this._parent.plt, this._parent.id, SeMailType.SYSTEM, message, items, 0, title);
        }
    }

    /**
     * 赏金赛数据刷新
     */
    public refreshShangjinCount() {
        this._baseInfo.win_shangjin_count = 0;
        this._baseInfo.lose_shangjin_count = 0;
        this._baseInfo.shangjin_score = SCORE_INIT_VALUE;

        this.saveInfo(['win_shangjin_count', 'lose_shangjin_count', 'shangjin_score']);
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'winShangjinCount', this._baseInfo.win_shangjin_count);
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'loseShangjinCount', this._baseInfo.lose_shangjin_count);
        //刷新剩余抽卡次数
        this._parent.baseInfo.drawTimes = Number(global.resMgr.getConfig('default_draw_times'));;
        this._parent.saveBaseInfo('drawTimes');
        global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'drawTimes', this._parent.baseInfo.drawTimes);
        //刷新用戶卡組
        this._parent.baseInfo.shangjinHeroCards = [];
        this._parent.saveBaseInfo('shangjinHeroCards');
        global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'shangjinHeroCards', this._parent.shangjinHeroCards);
        //刷新阵容
        this._parent.baseInfo.shangjinFormation = [];
        this._parent.saveBaseInfo('shangjinFormation');
        global.netMgr.sendCharShangJinFormationOpr(this._parent.linkid, true, this._parent.baseInfo.shangjinFormation, this._parent.state);
        //刷新主公信息
        this._parent.baseInfo.shangjin_lord = 'Z008';
        this._parent.saveBaseInfo('shangjin_lord');
        global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'shangjin_lord', this._parent.baseInfo.shangjin_lord);
        this._parent.baseInfo.shangjin_lords = ['Z008'];
        this._parent.saveBaseInfo('shangjin_lords');
        global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'shangjin_lords', this._parent.baseInfo.shangjin_lords);

        //刷新英雄奖池
        this._parent.m_pkShopMgr.shangjinHeroBoxInit();
    }
    /**
     * 巅峰每日结算奖励
     */
    giveDayReward(reward: Array<{ rtime: number, items: Array<string>, grade: string }>, pass_time: number) {
        // let time = this.peak_day_etime;
        for (let i in reward) {
            // if (time < reward[i].rtime) time = reward[i].rtime;

            let _reward = reward[i].items;
            if (_reward) {
                let items: Array<SeItem> = [];
                for (let j = 0; j < _reward.length; j++) {
                    let _items = _reward[j].split(',');
                    items.push({ kItemID: _items[0], iPileCount: parseInt(_items[1]) });
                }
                // //发送奖励邮件
                let content = global.resMgr.getConfig('competitionMail');
                let title = global.resMgr.getConfig('competitionTitle');
                if (content) {
                    let strList = content.split('{#}');
                    if (strList.length == 3) {
                        let message = strList[0] + new Date(reward[i].rtime).toLocaleString() + strList[1] + reward[i].grade + strList[2];
                        global.playerMgr.onGiveMail(this._parent.plt, this._parent.id, SeMailType.SYSTEM, message, items, 0, title);
                    }
                }
                // this.addItems(items, "seasonend");
            }
        }

        //将奖励时间重置
        this.peak_day_etime = pass_time;
    }

    /**
     * 诸侯伐董每日结算奖励
     */
    givePvePkDayReward(reward: Array<{ rtime: number, items: Array<string>, grade: string }>, pass_time: number) {
        for (let i in reward) {

            let _reward = reward[i].items;
            if (_reward) {
                let items: Array<SeItem> = [];
                for (let j = 0; j < _reward.length; j++) {
                    let _items = _reward[j].split(',');
                    items.push({ kItemID: _items[0], iPileCount: parseInt(_items[1]) });
                }
                // //发送奖励邮件
                let content = global.resMgr.getConfig('JJC_CrossMail');
                let title = global.resMgr.getConfig('JJC_CrossTitle');
                if (content) {
                    let strList = content.split('{#}');
                    let message = strList[0] + TeDate.Date_Format(new Date(reward[i].rtime), "yyyy-MM-dd") + strList[1] + reward[i].grade + strList[2];
                        if (strList.length == 3) {
                        global.playerMgr.onGiveMail(this._parent.plt, this._parent.id, SeMailType.SYSTEM, message, items, 0, title);
                    }
                }
                // this.addItems(items, "seasonend");
            }
        }

        //将奖励时间重置
        this.pve_pk_day_etime = pass_time;
    }

    get syncinfo() {
        return this._baseInfo.synccheckinfo;
    }

    // 服务器无效据检查判断逻辑
    fight_finish(isPvp: boolean, sync: boolean, time: number) {
        if (!isPvp) return;
        if (sync) {
            this.syncinfo.s_l++;

            if ((this.syncinfo.s_l >= 6 || time < 30000) && !this.syncinfo.open) {
                // 满足连续同步 n把 或者有一把获胜时间太短 就开启检车
                this.syncinfo.open = true;
                this.syncinfo.s_l = 0;
                this.syncinfo.us_l = 0;
            }
            else if (this.syncinfo.open) {
                // 可以关闭无效局检测了
                this.syncinfo.open = false;
                this.syncinfo.us_l = 0;
            }
        }
        else {
            if (!this.syncinfo.open) {
                // 出现不同步，但是之前没有开启
                this.syncinfo.open = true;
                this.syncinfo.s_l = 0;
                this.syncinfo.us_l = 0;
            }

            this.syncinfo.us_l++;

            if (this.syncinfo.us_l > 3) {
                // 连续三把不同步以上了就记录一下
                global.logMgr.unsync_player(this._parent, this.syncinfo.us_l);
            }
        }

        this.saveInfo('synccheckinfo')
    }

    fight_check() {
        return this.syncinfo.open;
    }

    add_pve_pk_record(season_id: string, time: number, opp_name: string, type: number, is_win: boolean, rank: number, rank_change: number) {
        while (this._baseInfo.pve_pk_record.length >= 20) {
            this._baseInfo.pve_pk_record.splice(0, 1);
        }
        this._baseInfo.pve_pk_record.push({ season_id: season_id, time: time, opp_name: opp_name, type: type, is_win: is_win, rank: rank, rank_change: rank_change })
        this.saveInfo('pve_pk_record');
        if (this._parent.bInitComplete) global.netMgr.sendCharMiscUpdate(this._parent.linkid, 'pve_pk_record', this._baseInfo.pve_pk_record);
    }
}

// 这里保存静态的赛季结算公式
class SeasonFunc {
    static call(fun, ...args) {
        var out = args[0];
        if (!this.func_map.has(fun)) {
            return out;
        }

        try {
            out = this.func_map.get(fun)(...args);
        }
        catch (e) {

        }

        return out;
    }

    static func_map: Map<(...args) => number> = new Map<(...args) => number>();
    static regist_fun(name: string, cb: (...args) => number) {
        this.func_map.set(name, cb);
    }
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

SeasonFunc.regist_fun('score1', function (elo) {
    var elo_scale = func_elo_scale(elo);
    var elo_base = 1800;
    return Math.max(Math.round((elo - elo_base) * elo_scale + elo_base), 1500);
});

SeasonFunc.regist_fun('level1', function (new_elo: number, old_elo, level: number) {
    var elo_base = 1500, a = 50, k = 0.75;
    return Math.max(Math.floor((new_elo - elo_base) / a * k + level * (1 - k)), 1);
});

SeasonFunc.regist_fun('award1', function (new_level: number, old_level, level: number) {
    return Math.max(Math.floor(new_level + old_level), 1) * 20;
});