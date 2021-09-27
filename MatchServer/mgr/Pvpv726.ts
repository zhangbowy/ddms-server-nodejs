Array.prototype['shuffle'] = function () {
    for (var j, x, i = this.length; i; j = parseInt((Math.random() * i).toString()), x = this[--i], this[i] = this[j], this[j] = x);
    return this;
};

import { SeLogicFormation, SeRaceOpp, SeRacePvp, LiveMode, if_sys_, if_pvp_match_info, if_base_player } from '../SeDefine';
import { HashMap, arrayRandom, arrayRandomT, TeMap } from '../lib/TeTool';
import { resMgrInst, SeResUnitEx } from '../ResMgr/SeResMgr';
import { robotNameInst } from '../ResMgr/RobotName';
import { SeEnumUnitiColour, SeEnumUniteAITag, SeResLordAIinfo, SeEnumequipattreType } from "../Res/interface";
import { netInst } from '../NetMgr/SeNetMgr';
import { serverMgrInst, DefineSType } from '../serverMgr';
import { createHash } from 'crypto';
import { configInst } from '../lib/TeConfig';
import { liveInst } from './LiveMgr';
import { pltMgrInst } from './PltMgr';
import { TeamRoomInst_2v2, PvPRoomMgrInst, TeamRoomInst_1v2 } from './TeamRoomMgr';

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
        var matchScore = changeElo(player.pvp_score);
        var floor = Math.floor(matchScore / olmatch.pvp_level_range);
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
            let floor = Math.floor(player.pvp_score / olmatch.pvp_level_range);
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

class olmatch {
    private _math_count = 2;
    static pvp_score_range = 1500;
    static pvp_level_range = 10;

    constructor() {

    }

    /**
     * 获取混动的动画
     * @param pvp_level 
     * @param selfid 
     */
    public get_rand_list_(_sys_: if_sys_, pvp_level: number, selfid: number) {
        return [];
    }

    get_totol_limit_level(pvp_level: number) {
        var ailevel = [1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 6, 7, 7, 8, 8, 9];
        var index = Math.max(Math.min(pvp_level - 1, ailevel.length - 1), 0);
        return ailevel[index] * 8;
    }

    /**
     * 获取一个机器人进行战斗
     * @param _sys_ 
     * @param formation 
     * @param score 
     * @param unlock_level 
     * @param pvp_level 
     * @param wincount 
     */
    public getPveRobot2(_sys_: if_sys_, formation: Array<SeLogicFormation>, score: number, unlock_level: number, pvp_level: number, wincount = 0, player_castle_level, player_wear_equips: Array<any>, fresh: boolean = false) {
        if (!_sys_) {
            _sys_ = {
                plt: 'sdw',
                serverid: '',
            }
        }

        var totalLevel = Math.floor(pvp_level * 8) + wincount * 2;
        if (!fresh) totalLevel = totalLevel - 4 + Math.floor(Math.random() * 8);
        var castleLevel = Math.max(Math.round(totalLevel / 8), 1);
        //主城最大不超过15级
        castleLevel = Math.min(castleLevel, 15);
        //英雄段位以下主城等级修正，和配置比取小
        if(unlock_level <= 12) {
            let br_res = resMgrInst(_sys_.plt).getBattleRankByLevel(unlock_level);
            castleLevel = Math.min(castleLevel, player_castle_level + br_res.iMatchLevel);
        }
        
        // 检查一下等级是否合格

        // 取出总的卡池子
        var unlockLevel = Math.max(unlock_level, 1);
        var allHeroPool = [];
        for (var i = 0; i < SeEnumUnitiColour.Cheng; i++) {
            allHeroPool = allHeroPool.concat(resMgrInst(_sys_.plt).getUnitIDByColor(i + 1, unlockLevel, false))
        }

        var m_lib: HashMap<{ id: string, cost: number }> = new HashMap<{ id: string, cost: number }>();

        var out_heros: string[] = [];

        // 所有英雄都收集好了，再按照ai类型归类一下
        for (var i = 0; i < allHeroPool.length; i++) {
            var res_unit = resMgrInst(_sys_.plt).UnitRes.getRes(allHeroPool[i]);
            if (!res_unit || !res_unit.eAITag) continue;

            m_lib.add(res_unit.eAITag, { id: res_unit.kID, cost: res_unit.iPreCD });
        }

        var t_cost = 0;
        // 每个种类至少出一个
        var sel_lib_0 = [SeEnumUniteAITag.FaShu, SeEnumUniteAITag.GongCheng, SeEnumUniteAITag.QunTi, SeEnumUniteAITag.TanKe, SeEnumUniteAITag.QunGong];
        for (var i = 0; i < sel_lib_0.length; i++) {
            var key = sel_lib_0[i];
            var r_infos = m_lib.get(sel_lib_0[i]);
            var r_o = arrayRandom(r_infos, true);
            if (!r_o) continue;
            t_cost += r_o.cost;
            out_heros.push(r_o.id);
        }

        var wait_heros: { id: string, cost: number }[] = [];
        // 取两个普通的 进行6选三
        var sel_lib_1 = [SeEnumUniteAITag.PuTong, SeEnumUniteAITag.PuTong, SeEnumUniteAITag.PuTong, SeEnumUniteAITag.GongCheng, SeEnumUniteAITag.QunTi, SeEnumUniteAITag.TanKe, SeEnumUniteAITag.QunGong];
        for (var i = 0; i < sel_lib_1.length; i++) {
            var key = sel_lib_1[i];
            var r_infos = m_lib.get(sel_lib_1[i]);
            if (r_infos.length > 0) {
                wait_heros.push(arrayRandom(r_infos, true));
            }
        }
        wait_heros['shuffle']();

        // 找出费数符合的一个序列 结果是 [30,36]

        for (var i = 0; i < wait_heros.length - 2; i++) {
            if (!wait_heros[i + 0] || !wait_heros[i + 1] || !wait_heros[i + 2]) break;
            var n_cost = wait_heros[i + 0].cost + wait_heros[i + 1].cost + wait_heros[i + 2].cost;
            if ((n_cost + t_cost >= 28 && n_cost + t_cost <= 35) || i == wait_heros.length - 3) {
                out_heros.push(wait_heros[i + 0].id);
                out_heros.push(wait_heros[i + 1].id);
                out_heros.push(wait_heros[i + 2].id);
                t_cost += n_cost;
                break;
            }
        }

        // 得到总的玩家等级数量了,然后计算平均等级 和额外差值
        var baseLevel = Math.floor(totalLevel / GetRobotDefine.count);
        var extLevel = totalLevel - baseLevel * GetRobotDefine.count;

        var results: Array<SeLogicFormation> = [];

        for (var i = 0; i < out_heros.length; i++) {
            var idx = allHeroPool.indexOf(out_heros[i]);
            if (idx >= 0) {
                allHeroPool.splice(idx, 1);
            }
        }


        for (var i = 0; results.length < GetRobotDefine.count; i++) {
            var rkHeroID = out_heros[i];
            if (!rkHeroID) {
                rkHeroID = arrayRandom(allHeroPool, true)
            }

            var pkRes: SeResUnitEx = resMgrInst(_sys_.plt).UnitRes.getRes(rkHeroID);
            if (!pkRes) continue;
            var level = baseLevel - (pkRes.iColour - 1) * 2;
            if (level + extLevel <= 0) {
                // 高级英雄分值不达标，需要重新选择一个
                level = 1;
            }
            else if (level <= 0) {
                // 等级不足就用额外等级补足
                extLevel += (level + 1);
                level = 1;
            }
            else if (extLevel > 0) {
                level++;
                extLevel--;
            }
            else if (extLevel < 0 && level > 1) {
                level--;
                extLevel++;
            }
            //领军段位卡牌等级普遍+1
            if(unlock_level >= 7){
                level++;
            }
            var mxLevel = resMgrInst(_sys_.plt).MaxHeroLvl - (pkRes.iColour - 1) * 2;
            level = Math.min(level, mxLevel);

            resMgrInst(_sys_.plt).maxCardLevel(pkRes.iColour);

            results.push({ kHeroID: rkHeroID, iLevel: level });
        }

        if (!results || results.length == 0) {
            results = formation;
        }

        var pvp_level = this._random_pvp_level(_sys_, unlock_level);

        //AI不随机
        // var bossID = arrayRandom<string>(resMgrInst(_sys_.plt).getUnlockBossFormation(pvp_level));
        var bossID = 'Z000';
        //随机ai主公装备
        
        var out: SeRaceOpp = {
            Id: 0,
            Name: "",
            Formation: results,
            Boss: bossID ? [{ kHeroID: bossID, iLevel: 1 }, { kHeroID: 'Z008', iLevel: castleLevel }] : null,
            battleEquip: {},
            areaid: '',
            pvp_score: score,
            pvp_level: pvp_level,
            castle_level: castleLevel,
            winStreakCount: 0,
            Icon: "",
            synccheck: false,
            avatar: {},
            medals: [],
            fresh: fresh,
            _plt_: _sys_.plt,
            lordUnit: this.getAILord(_sys_.plt, castleLevel, player_castle_level, player_wear_equips),
            is_vip: false,
            vip_level: 0,
            guild_info: {},
        }

        var nameInfo = robotNameInst.getName();
        out.Name = nameInfo.name;
        out.avatar = nameInfo.isVip ? { vip: 1, iconid: "AV001" } : {};
        out.medals = nameInfo.medals;

        return out;
    }

    public getPveRobot3(_sys_: if_sys_, formation: Array<SeLogicFormation>, score: number, unlock_level: number, castleLevel: number, player_wear_equips: Array<any>) {
        if (!_sys_) {
            _sys_ = {
                plt: 'sdw',
                serverid: '',
            }
        }

        var totalLevel = 0;
        for (let i = 0; i < formation.length; i++) {
            let r = formation[i];
            if (!r) continue;
            let res_hero = resMgrInst(_sys_.plt).UnitRes.getRes(r.kHeroID);

            totalLevel = totalLevel + r.iLevel + (res_hero ? (res_hero.iColour - 1) * 2 : 0)
        }

        // 检查一下等级是否合格

        // 取出总的卡池子
        var unlockLevel = Math.max(unlock_level, 1);
        var allHeroPool = [];
        for (var i = 0; i < SeEnumUnitiColour.Cheng; i++) {
            allHeroPool = allHeroPool.concat(resMgrInst(_sys_.plt).getUnitIDByColor(i + 1, unlockLevel, false))
        }

        var m_lib: HashMap<{ id: string, cost: number }> = new HashMap<{ id: string, cost: number }>();

        var out_heros: string[] = [];

        // 所有英雄都收集好了，再按照ai类型归类一下
        for (var i = 0; i < allHeroPool.length; i++) {
            var res_unit = resMgrInst(_sys_.plt).UnitRes.getRes(allHeroPool[i]);
            if (!res_unit || !res_unit.eAITag) continue;

            m_lib.add(res_unit.eAITag, { id: res_unit.kID, cost: res_unit.iPreCD });
        }

        var t_cost = 0;
        // 每个种类至少出一个
        var sel_lib_0 = [SeEnumUniteAITag.FaShu, SeEnumUniteAITag.GongCheng, SeEnumUniteAITag.QunTi, SeEnumUniteAITag.TanKe, SeEnumUniteAITag.QunGong];
        for (var i = 0; i < sel_lib_0.length; i++) {
            var key = sel_lib_0[i];
            var r_infos = m_lib.get(sel_lib_0[i]);
            var r_o = arrayRandom(r_infos, true);
            if (!r_o) continue;
            t_cost += r_o.cost;
            out_heros.push(r_o.id);
        }

        var wait_heros: { id: string, cost: number }[] = [];
        // 取两个普通的 进行6选三
        var sel_lib_1 = [SeEnumUniteAITag.PuTong, SeEnumUniteAITag.PuTong, SeEnumUniteAITag.PuTong, SeEnumUniteAITag.GongCheng, SeEnumUniteAITag.QunTi, SeEnumUniteAITag.TanKe, SeEnumUniteAITag.QunGong];
        for (var i = 0; i < sel_lib_1.length; i++) {
            var key = sel_lib_1[i];
            var r_infos = m_lib.get(sel_lib_1[i]);
            if (r_infos.length > 0) {
                wait_heros.push(arrayRandom(r_infos, true));
            }
        }
        wait_heros['shuffle']();

        // 找出费数符合的一个序列 结果是 [30,36]

        for (var i = 0; i < wait_heros.length - 2; i++) {
            if (!wait_heros[i + 0] || !wait_heros[i + 1] || !wait_heros[i + 2]) break;
            var n_cost = wait_heros[i + 0].cost + wait_heros[i + 1].cost + wait_heros[i + 2].cost;
            if ((n_cost + t_cost >= 28 && n_cost + t_cost <= 35) || i == wait_heros.length - 3) {
                out_heros.push(wait_heros[i + 0].id);
                out_heros.push(wait_heros[i + 1].id);
                out_heros.push(wait_heros[i + 2].id);
                t_cost += n_cost;
                break;
            }
        }

        // 得到总的玩家等级数量了,然后计算平均等级 和额外差值
        var baseLevel = Math.floor(totalLevel / GetRobotDefine.count);
        var extLevel = totalLevel - baseLevel * GetRobotDefine.count;

        var results: Array<SeLogicFormation> = [];

        for (var i = 0; i < out_heros.length; i++) {
            var idx = allHeroPool.indexOf(out_heros[i]);
            if (idx >= 0) {
                allHeroPool.splice(idx, 1);
            }
        }


        for (var i = 0; results.length < GetRobotDefine.count; i++) {
            var rkHeroID = out_heros[i];
            if (!rkHeroID) {
                rkHeroID = arrayRandom(allHeroPool, true)
            }

            var pkRes: SeResUnitEx = resMgrInst(_sys_.plt).UnitRes.getRes(rkHeroID);
            if (!pkRes) continue;
            var level = baseLevel - (pkRes.iColour - 1) * 2;
            if (level + extLevel <= 0) {
                // 高级英雄分值不达标，需要重新选择一个
                level = 1;
            }
            else if (level <= 0) {
                // 等级不足就用额外等级补足
                extLevel += (level + 1);
                level = 1;
            }
            else if (extLevel > 0) {
                level++;
                extLevel--;
            }
            else if (extLevel < 0 && level > 1) {
                level--;
                extLevel++;
            }

            var mxLevel = resMgrInst(_sys_.plt).MaxHeroLvl - (pkRes.iColour - 1) * 2;
            level = Math.min(level, mxLevel);

            resMgrInst(_sys_.plt).maxCardLevel(pkRes.iColour);

            results.push({ kHeroID: rkHeroID, iLevel: level });
        }

        if (!results || results.length == 0) {
            results = formation;
        }

        var pvp_level = this._random_pvp_level(_sys_, unlock_level);

        //var bossID = arrayRandom<string>(resMgrInst(_sys_.plt).getUnlockBossFormation(pvp_level));
        var bossID = 'Z000';
        var out: SeRaceOpp = {
            Id: 0,
            Name: "",
            Formation: results,
            Boss: bossID ? [{ kHeroID: bossID, iLevel: 1 }, { kHeroID: 'Z008', iLevel: castleLevel }] : null,
            battleEquip: {},
            areaid: '',
            pvp_score: score,
            pvp_level: pvp_level,
            castle_level: castleLevel,
            winStreakCount: 0,
            Icon: "",
            synccheck: false,
            avatar: {},
            medals: [],
            fresh: false,
            _plt_: _sys_.plt,
            lordUnit: this.getAILord(_sys_.plt, castleLevel, castleLevel, player_wear_equips),
            is_vip: false,
            vip_level: 0,
            guild_info: {},
        }

        var nameInfo = robotNameInst.getName();
        out.Name = nameInfo.name;
        out.avatar = nameInfo.isVip ? { vip: 1, iconid: "AV001" } : {};
        out.medals = nameInfo.medals;

        return out;
    }

    private getAILord(plt: string, ailevel: number, player_castle_level: number, wear_equips: Array<any>){
        var aiLordPool = resMgrInst(plt).getAIlordInfo(player_castle_level);
        if(!aiLordPool){
            aiLordPool = resMgrInst('sdw').getAIlordInfo(player_castle_level);
        }
        var lucky_lord: SeResLordAIinfo = arrayRandomT(aiLordPool,'pro');
        var weaponId = arrayRandom(lucky_lord.kweaponID.split(','));
        var weaponStar = 0;
        var weaponLevel = 1;
        var weaponColor = resMgrInst(plt).EquipattrRes.getRes(weaponId).iColor;
        var clothesId = arrayRandom(lucky_lord.kclothesID.split(','));
        var clothesStar = 0;
        var clothesLevel = 1;
        var clothesColor = resMgrInst(plt).EquipattrRes.getRes(clothesId).iColor;
        var treasureId = arrayRandom(lucky_lord.ktreasureID.split(','));
        var treasureStar = 0;
        var treasureLevel = 1;
        var treasureColor = resMgrInst(plt).EquipattrRes.getRes(treasureId).iColor;
        for(let i = 0; i < wear_equips.length; i++){
            if(!wear_equips[i]){
                continue;
            }
            else if(wear_equips[i].eType == SeEnumequipattreType.WuQi){
                let weaponStarMax = (wear_equips[i].eStar + 3) <= 10? (wear_equips[i].eStar + 3) : 10;
                let weaponStarMin = (wear_equips[i].eStar - 3) >= 0? (wear_equips[i].eStar - 3) : 0;
                let weaponLevelMax = (wear_equips[i].eLevel + 10) <= 100? (wear_equips[i].eLevel + 10) : 100;
                let weaponLevelMin = (wear_equips[i].eLevel - 10) >= 1? (wear_equips[i].eLevel - 10) : 1;
                weaponStar =  Math.floor(Math.random() * (weaponStarMax - weaponStarMin + 1) + weaponStarMin);
                weaponLevel =  Math.floor(Math.random() * (weaponLevelMax - weaponLevelMin + 1) + weaponLevelMin);
            }
            else if(wear_equips[i].eType == SeEnumequipattreType.KuiJia){
                let clothesStarMax = (wear_equips[i].eStar + 3) <= 10? (wear_equips[i].eStar + 3) : 10;
                let clothesStarMin = (wear_equips[i].eStar - 3) >= 0? (wear_equips[i].eStar - 3) : 0;
                let clothesLevelMax = (wear_equips[i].eLevel + 10) <= 100? (wear_equips[i].eLevel + 10) : 100;
                let clothesLevelMin = (wear_equips[i].eLevel - 10) >= 1? (wear_equips[i].eLevel - 10) : 1;
                clothesStar =  Math.floor(Math.random() * (clothesStarMax - clothesStarMin + 1) + clothesStarMin);
                clothesLevel =  Math.floor(Math.random() * (clothesLevelMax - clothesLevelMin + 1) + clothesLevelMin);
            }
            else if(wear_equips[i].eType == SeEnumequipattreType.BaoWu){
                let treasureStarMax = (wear_equips[i].eStar + 3) <= 10? (wear_equips[i].eStar + 3) : 10;
                let treasureStarMin = (wear_equips[i].eStar - 3) >= 0? (wear_equips[i].eStar - 3) : 0;
                let treasureLevelMax = (wear_equips[i].eLevel + 10) <= 100? (wear_equips[i].eLevel + 10) : 100;
                let treasureLevelMin = (wear_equips[i].eLevel - 10) >= 1? (wear_equips[i].eLevel - 10) : 1;
                treasureStar =  Math.floor(Math.random() * (treasureStarMax - treasureStarMin + 1) + treasureStarMin);
                treasureLevel =  Math.floor(Math.random() * (treasureLevelMax - treasureLevelMin + 1) + treasureLevelMin);
            }
        }
        var ai_wear_equips = [];
        ai_wear_equips.push({eLevel: weaponLevel, eStar: weaponStar, kId: weaponId, eType: SeEnumequipattreType.WuQi, iColor: weaponColor});
        ai_wear_equips.push({eLevel: clothesLevel, eStar: clothesStar, kId: clothesId, eType: SeEnumequipattreType.KuiJia, iColor: clothesColor});
        ai_wear_equips.push({eLevel: treasureLevel, eStar: treasureStar, kId: treasureId, eType: SeEnumequipattreType.BaoWu, iColor: treasureColor});
        return { kHeroID: lucky_lord.kLordID, iLevel: ailevel, wear_equips: ai_wear_equips};
    }
    private _random_pvp_level(_sys_: if_sys_, pvp_level: number) {
        var pkRes = resMgrInst(_sys_.plt).getBattleRankByLevel(pvp_level);
        if (!pkRes) return 1;
        // if (pkRes.eProperty & SeEnumBattleRankeProperty.ZuiZhongCeng) {
        //     pvp_level--;
        // }

        var r10 = Math.floor(Math.random() * 10);

        if (r10 <= 2) {
            pvp_level = pvp_level - 1;
        }

        if (pvp_level == 0) {
            pvp_level = 1;
        }


        return pvp_level;
    }

    /**
     * 找到一个符合要求的玩家
     * @param uid 
     * @param score 
     * @param winCount 
     */
    private _match_offline_(_sys_: if_sys_, sid: string, uid: number, f: Array<SeLogicFormation>, battleEquip: any, score: number, win_count: number, fai_loop: number, pvp_level: number, castle_level, player_wear_equips: Array<any>, rmode = 0) {
        var kRange = 300;
        win_count = Math.min(win_count, 5);

        var rob_level = Math.floor(Math.log((score - 1400) * 0.4) / Math.log(1.6)) - 5;
        var player_per_level = this._total_level_(_sys_, f) / 8;

        var extK = 0.4;
        rob_level = Math.round(rob_level * extK + player_per_level * (1 - extK));

        var raceOpp: SeRaceOpp = this.getPveRobot2(_sys_, f, Math.floor(score + kRange * (1 - Math.random() * 2)), pvp_level, rob_level, win_count, castle_level, player_wear_equips);

        var sn = serverMgrInst.get_server(sid);
        if (!sn) {
            sn = serverMgrInst.get_server(_sys_.serverid);
        }
        if (!sn) return;

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

    private _total_level_(_sys_: if_sys_, fA: Array<SeLogicFormation>) {
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

    public get_randomList(...args);
    public get_randomList(nid: string, _sys_: if_sys_, uid: number, pvp_level: number, mode: string = '1v1') {
        netInst.sendData({ cmd: 'randlist', mode: mode, uid: uid, list: this.get_rand_list_(_sys_, pvp_level, uid) }, nid);
    }


    public del_randomList(nid: string, uid: number, mode: '1v1' | '2v2') {
        netInst.sendData({ cmd: 'randlist', mode: mode, uid: uid, list: [] }, nid);
    }

    public online_match_robot(...args);
    public online_match_robot(nid: string, _sys_: if_sys_, uid: number, formation: { h_f: Array<SeLogicFormation>, b_f: SeLogicFormation, castle_level: number, battleEquip: any }, name: string, level: number, icon: string, avatar: any, pvp_score: number, pvp_level: number, win_count: number) {
        netInst.sendData({ cmd: 'randlist', mode: '1v1', uid: uid, list: this.get_rand_list_(_sys_, pvp_level, uid) }, nid);
        setTimeout(this._robot_find.bind(this, _sys_, formation, nid, uid, win_count), 5000);
    }

    private _robot_find(_sys_1: if_sys_, formation1: { h_f: SeLogicFormation[], castle_level: number, battleEquip: any; }, nid1: string, uid1: any, win_count1: number) {
        //连赢一把以上, 开启普通AI
        var raceOpp = this.getPveRobot2(_sys_1, formation1.h_f, 1500, 1, 1, 0, formation1.castle_level, [], win_count1 < 1);
        var startGame = {
            cmd: 'pvpv726',
            uid: uid1,
            mode: '1v1',
            rmode: 0,
            raceinfo: raceOpp,
        };

        netInst.sendData(startGame, nid1);
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

        netInst.sendData({ cmd: 'randlist', mode: '1v1', uid: uid, list: this.get_rand_list_(_sys_, pvp_level, uid) }, nid);
        this._online_cancell(_sys_, nid, uid, pvp_score);

        var sInfo = serverMgrInst.find_server(nid);
        var mp: SeMatchPlayer = {
            uid: uid,
            formation: formation.h_f,
            boss_f: formation.b_f,
            pvp_score: pvp_score,
            pvp_level: pvp_level,
            battleEquip: formation.battleEquip,
            name: name,
            real_level: formation.castle_level || level,
            castle_level: level,
            icon: icon,
            areaid: formation.areaid,
            avatar: avatar,
            medals: medals,
            enter_time: Math.floor(Date.now() / 1000),
            win_loop: win_count,
            fai_loop: lose_count,
            lone_oppname: lone_oppname,
            synccheck: formation.synccheck,
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
        var keys = PvpInfo.inst.floors;
        // 匹配都是从最低的池子开始匹配，随机判断是否向上匹配
        for (var i = 0; i < keys.length; i++) {
            this._real_match_(parseInt(keys[i]));
        }
    }

    /**
     * 匹配一个分段的玩家
     * @param range 
     */
    private _real_match_(range: number) {
        this._matched_uids = {};
        var match_list: HashMap<SeMatchPlayer> = new HashMap<SeMatchPlayer>();

        var floor_range = Math.floor(olmatch.pvp_score_range / olmatch.pvp_level_range);

        for (var i = -floor_range * 2; i < floor_range * 2; i++) {
            var players = PvpInfo.inst.get_players(i + range);
            
            var unmatch_list: number[] = [];
            for (var j = 0; j < players.length; j++) {
                var r_match = players[j];

                // 如果出现过就删掉重复的
                if (this._matched_uids[r_match.uid.toString()]) {
                    players.splice(j, 1);
                    j--;
                    console.log('find_repleate ' + r_match.uid + ' range' + i + ' score' + r_match.pvp_score);
                    continue;
                }
                this._matched_uids[r_match.uid.toString()] = true;

                var pkBattleRank = resMgrInst(r_match._sys_.plt).getBattleRankByLevel(r_match.pvp_level);
                var time1 = pkBattleRank ? pkBattleRank.iMatch1 : 10;
                var time2 = pkBattleRank ? pkBattleRank.iMatch2 : 15;
                var time3 = pkBattleRank ? pkBattleRank.iMatch3 : 20;
                var count = Math.floor(Date.now() / 1000) - r_match.enter_time;
                let group_idx = 0;
                if (pkBattleRank && pkBattleRank.iMatchgroup) {
                    group_idx = pkBattleRank.iMatchgroup;
                }

                let looseprotect = parseInt(resMgrInst(r_match._sys_.plt).getConfig("looseprotect"));
                if (looseprotect && !isNaN(looseprotect) && r_match.fai_loop >= looseprotect) {
                    // 触发连败人机条件，强制人机
                    this._match_offline_(r_match._sys_, r_match._sys_.serverid, r_match.uid, r_match.formation, r_match.battleEquip, r_match.pvp_score, r_match.win_loop, r_match.fai_loop, r_match.pvp_level, r_match.castle_level, r_match.extra.lord.wear_equips);
                    continue;
                }
                else if (count < time1) {
                    // 判断是否满足区域
                    if (i >= -Math.floor(floor_range / 2) && i < Math.floor(floor_range / 2)) {

                        let areaRes = resMgrInst(r_match._sys_.plt).AreaRes.getRes(r_match.areaid);
                        if (areaRes) {
                            group_idx = areaRes.iType * 10 + group_idx;
                        }

                        match_list.add(group_idx, r_match);
                        continue;
                    }
                }
                else if (count < time2) {
                    // 判断是否满足区域
                    if (i >= -floor_range && i < floor_range) {
                        
                        let areaRes = resMgrInst(r_match._sys_.plt).AreaRes.getRes(r_match.areaid);
                        if (areaRes) {
                            group_idx = areaRes.iType * 10 + group_idx;
                        }

                        match_list.add(group_idx, r_match);
                        continue;
                    }
                }
                else if (count < time3) {
                    // 判断是否满足区域
                    match_list.add(group_idx, r_match);
                    continue;
                }
                else {
                    // 发现有人超时了就立即给他一个解脱，马上匹配一个数据给他
                    this._match_offline_(r_match._sys_, r_match._sys_.serverid, r_match.uid, r_match.formation, r_match.battleEquip, r_match.pvp_score, r_match.win_loop, r_match.fai_loop, r_match.pvp_level, r_match.castle_level, r_match.extra.lord.wear_equips);
                    continue;
                }

                this._matched_uids[r_match.uid.toString()] = false;
                unmatch_list.push(r_match.uid);
            }

            PvpInfo.inst.del_floor(i + range, unmatch_list);
        }

        let mt_keys = match_list.keys;
        for (let i = 0; i < mt_keys.length; i++) {
            let r_list = match_list.get(mt_keys[i]);
            this._create_plt_race(r_list);
        }
    }

    /**
     * 依据平台筛选大区，进行特殊操作
     * @param list 
     */
    private _create_plt_race(list: SeMatchPlayer[]) {
        // 然后打乱一下排序
        // list['shuffle']();
        list.sort(function (a, b) {
            if (a.castle_level > b.castle_level) return 1;
            if (a.castle_level < b.castle_level) return -1;

            if (a.pvp_score > b.pvp_score) return 1;
            if (a.pvp_score < b.pvp_score) return -1;

            return a.uid > b.uid ? 1 : -1;
        })

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
                if (this._send_race(vs_infos, LiveMode.match)) {
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
    private _send_race(infos: SeMatchPlayer[], mode: LiveMode): string {
        let plt: string = infos[0]._sys_.plt;
        let rLink = null;

        for (let i = 0; i < infos.length; i++) {
            rLink = serverMgrInst.randomServer(DefineSType.race, plt);
            if (rLink) break;
        }

        if (!rLink) return null;

        // 特殊检查id，防止同一个玩家自己匹配到自己
        let uids = [];
        for (let i = 0; i < infos.length; i++) {
            if (uids.indexOf(infos[i].uid) < 0) {
                uids.push(infos[i].uid);
            }
        }

        if (uids.length != infos.length) return null;

        if (mode == LiveMode.match) {
            // 这里是 1v1的 判断一下两个的等级不能超过2级
            let levelA = infos[0] ? infos[0].castle_level : 1;
            let levelB = infos[1] ? infos[1].castle_level : 1;

            let pkResA = resMgrInst(infos[0]._sys_.plt).getBattleRankByLevel(infos[0].pvp_level, infos[0].pvp_score);
            let pkResB = resMgrInst(infos[1]._sys_.plt).getBattleRankByLevel(infos[1].pvp_level, infos[1].pvp_score);

            let iLevel = 16;
            let iRankLevel = 3;
            if (pkResA) {
                iLevel = Math.min(iLevel, pkResA.iMatchLevel);
                iRankLevel = Math.min(iRankLevel, pkResA.iMatchRank)
            }
            if (pkResB) {
                iLevel = Math.min(iLevel, pkResB.iMatchLevel);
                iRankLevel = Math.min(iRankLevel, pkResB.iMatchRank)
            }

            if (Math.abs(levelA - levelB) > iLevel) return null;

            // 这里是 1v1的 判断一下两个的段位等级不能超过3级
            let pvp_A = infos[0] ? infos[0].pvp_level : 1;
            let pvp_B = infos[1] ? infos[1].pvp_level : 1;

            if (Math.abs(pvp_A - pvp_B) > iRankLevel) return null;

            //修改成不能连续匹配相同的玩家
            if (infos[0] && infos[1]) {
                for(let j = 0; j < infos[0].lone_oppname.length; j++){
                    if(infos[0].lone_oppname[j] == infos[1].name) return null;
                }
                for(let j = 0; j < infos[1].lone_oppname.length; j++){
                    if(infos[1].lone_oppname[j] == infos[0].name) return null;
                }
                //夺王段位以上的跨服默认不匹配同服玩家
                //if(configInst.get('openGlobal') && (infos[0].pvp_level >= 16 || infos[1].pvp_level >= 16) && infos[0]._sys_.plt == infos[1]._sys_.plt) return null;
            }
            
        }

        let synccheck = false;

        var raceInfos: SeRacePvp[] = [];
        for (var i = 0; i < infos.length; i++) {
            var vA = infos[i];

            if (vA.castle_level)

                var raceOppA: SeRacePvp = {
                    Id: vA.uid,
                    Name: vA.name,
                    Formation: vA.formation,
                    pve_pk_formation: vA.pve_pk_formation,
                    Boss: vA.boss_f,
                    battleEquip: vA.battleEquip,
                    pvp_score: vA.pvp_score,
                    pvp_level: vA.pvp_level,
                    castle_level: vA.real_level,
                    winStreakCount: vA.win_loop,
                    Icon: vA.icon,
                    areaid: vA.areaid,
                    avatar: vA.avatar,
                    medals: vA.medals,
                    rurl: rLink.url,
                    synccheck: vA.synccheck,
                    checkKey: this._gen_check_key(),
                    sid: vA._sys_.serverid,
                    _plt_: infos[i]._sys_.plt,
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
                mode: '1v1',
                rmode: mode
            }, serverMgrInst.get_server(vA._sys_.serverid).nid);
        }

        liveInst.add_live_race(rid, raceInfos, rLink.url, liveKey, mode, Date.now(), racever);

        return rid;
    }

    /**
     * 提供给好友约战的接口
     * @param infos 
     */
    public create_race(infos: { sid: string, race: SeRaceOpp, _sys_: if_sys_ }[], mode: LiveMode = LiveMode.race): string {
        var rs = [];
        for (var i = 0; i < infos.length; i++) {
            var a_race = infos[i].race;
            var mpa: SeMatchPlayer = {
                uid: a_race.Id,
                formation: a_race.Formation,
                pve_pk_formation: a_race.pve_pk_formation,
                boss_f: a_race.Boss,
                pvp_score: a_race.pvp_score,
                pvp_level: a_race.pvp_level,
                name: a_race.Name,
                areaid: a_race.areaid,
                battleEquip: a_race.battleEquip,
                castle_level: a_race.castle_level,
                real_level: a_race.castle_level,
                icon: a_race.Icon,
                avatar: a_race.avatar,
                medals: a_race.medals,
                enter_time: Math.floor(Date.now() / 1000),
                win_loop: 0,
                fai_loop: 0,
                lone_oppname: [],
                synccheck: a_race.synccheck,
                _sys_: infos[i]._sys_,
                extra: {pve:a_race.pve, lord: a_race.lordUnit},
                is_vip: a_race.is_vip,
                vip_level: a_race.vip_level,
                guild_info: a_race.guild_info,
            }
            rs.push(mpa);
        }

        return this._send_race(rs, mode);
    }

    /**
     * 提供给好友pve带主公的对战
     * @param infos 
     */
    public create_pve_pk(infos: { sid: string, race: SeRaceOpp, _sys_: if_sys_ }[], mode: LiveMode = LiveMode.pve_pk): string {
        var rs = [];
        for (var i = 0; i < infos.length; i++) {
            var a_race = infos[i].race;
            var mpa: SeMatchPlayer = {
                uid: a_race.Id,
                formation: a_race.Formation,
                pve_pk_formation: a_race.pve_pk_formation,
                boss_f: a_race.Boss,
                pvp_score: a_race.pvp_score,
                pvp_level: a_race.pvp_level,
                name: a_race.Name,
                areaid: a_race.areaid,
                battleEquip: a_race.battleEquip,
                castle_level: a_race.castle_level,
                real_level: a_race.castle_level,
                icon: a_race.Icon,
                avatar: a_race.avatar,
                medals: a_race.medals,
                extra: {pve:a_race.pve, lord: a_race.lordUnit},
                enter_time: Math.floor(Date.now() / 1000),
                win_loop: 0,
                fai_loop: 0,
                lone_oppname: [],
                synccheck: a_race.synccheck,
                _sys_: infos[i]._sys_,
                is_vip: a_race.is_vip,
                vip_level: a_race.vip_level,
                guild_info: a_race.guild_info,
            }
            rs.push(mpa);
        }

        return this._send_pve_pk(rs, mode);
    }

    /**
     * 产生比赛，pve 对战用
     * @param infos 
     * @param mode 
     */
    private _send_pve_pk(infos: SeMatchPlayer[], mode: LiveMode): string {
        let plt: string = infos[0]._sys_.plt;
        let rLink = null;

        for (let i = 0; i < infos.length; i++) {
            rLink = serverMgrInst.randomServer(DefineSType.race, plt);
            if (rLink) break;
        }

        if (!rLink) return null;

        let synccheck = false;

        var raceInfos: SeRacePvp[] = [];
        for (var i = 0; i < infos.length; i++) {
            var vA = infos[i];

            if (vA.castle_level)

                var raceOppA: SeRacePvp = {
                    Id: vA.uid,
                    Name: vA.name,
                    Formation: vA.formation,
                    pve_pk_formation: vA.pve_pk_formation,
                    Boss: vA.boss_f,
                    battleEquip: vA.battleEquip,
                    pvp_score: vA.pvp_score,
                    pvp_level: vA.pvp_level,
                    castle_level: vA.real_level,
                    winStreakCount: vA.win_loop,
                    Icon: vA.icon,
                    areaid: vA.areaid,
                    avatar: vA.avatar,
                    medals: vA.medals,
                    rurl: rLink.url,
                    synccheck: vA.synccheck,
                    checkKey: this._gen_check_key(),
                    sid: vA._sys_.serverid,
                    _plt_: infos[i]._sys_.plt,
                    bTeam: false,
                    optime: Date.now(),
                    //pve
                    pve: vA.extra.pve,
                    lordUnit: vA.extra.lord,
                    is_vip: vA.is_vip,
                    vip_level: vA.vip_level,
                    guild_info: vA.guild_info,
                }

            if (vA.synccheck) {
                synccheck = true;
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
                mode: '1v1',
                rmode: mode
            }, serverMgrInst.get_server(vA._sys_.serverid).nid);
        }

        liveInst.add_live_race(rid, raceInfos, rLink.url, liveKey, mode, Date.now(), racever);

        return rid;
    }    

    findPvp(nid: string, ...args);
    findPvp(nid: string, _sys_: if_sys_, uid: number, score: number, formation: if_pvp_match_info, unlock_level: number) {
        var raceOpp = this.getPveRobot3(_sys_, formation.h_f, score, unlock_level, formation.castle_level, formation.lordUnit.wear_equips);
        var startGame = {
            cmd: 'pvps',
            uid: uid,
            mode: "1v1",
            rmode: LiveMode.lianxi,
            raceinfo: raceOpp,
        };

        netInst.sendData(startGame, nid);
    }
}

export var matchInst = new olmatch();
