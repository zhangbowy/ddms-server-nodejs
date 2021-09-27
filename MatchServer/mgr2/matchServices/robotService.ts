import { if_sys_, SeLogicFormation, SeRaceOpp } from "../../SeDefine";
import { SeEnumUnitiColour, SeEnumUniteAITag } from "../../Res/interface";
import { resMgrInst, SeResUnitEx } from "../../ResMgr/SeResMgr";
import { HashMap, arrayRandom } from "../../lib/TeTool";
import { GetRobotDefine } from "../../mgr/Pvpv726";
import { robotNameInst } from "../../ResMgr/RobotName";

export class robotService {
    /**
   * 获取一个机器人进行战斗
   * @param _sys_ 
   * @param formation 
   * @param score 
   * @param unlock_level 
   * @param pvp_level 
   * @param wincount 
   */
    static getPveRobot2(_sys_: if_sys_, formation: Array<SeLogicFormation>, score: number, unlock_level: number, pvp_level: number, wincount = 0, fresh: boolean = false) {
        if (!_sys_) {
            _sys_ = {
                plt: 'sdw',
                serverid: '',
            }
        }

        var totalLevel = Math.floor(pvp_level * 8) + wincount * 2;
        if (!fresh) totalLevel = totalLevel - 4 + Math.floor(Math.random() * 8);
        var castleLevel = Math.max(Math.round(totalLevel / 8), 1);

        // 检查一下等级是否合格

        // 取出总的卡池子
        var unlockLevel = Math.max(unlock_level, 1);
        var allHeroPool = [];
        for (var i = 0; i < SeEnumUnitiColour.Cheng; i++) {
            allHeroPool = allHeroPool.concat(resMgrInst(_sys_.plt).getUnitIDByColor(i + 1, unlockLevel, true))
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

        var bossID = arrayRandom<string>(resMgrInst(_sys_.plt).getUnlockBossFormation(pvp_level));

        var out: SeRaceOpp = {
            Id: 0,
            Name: "",
            Formation: results,
            areaid: '',
            Boss: bossID ? [{ kHeroID: bossID, iLevel: 1 }] : null,
            battleEquip: {},
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

    static getPveRobot3(_sys_: if_sys_, formation: Array<SeLogicFormation>, score: number, unlock_level: number, castleLevel: number) {
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
            allHeroPool = allHeroPool.concat(resMgrInst(_sys_.plt).getUnitIDByColor(i + 1, unlockLevel, true))
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

        var bossID = arrayRandom<string>(resMgrInst(_sys_.plt).getUnlockBossFormation(pvp_level));

        var out: SeRaceOpp = {
            Id: 0,
            Name: "",
            Formation: results,
            areaid: '',
            Boss: bossID ? [{ kHeroID: bossID, iLevel: 1 }] : null,
            battleEquip: {},
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

    private static _random_pvp_level(_sys_: if_sys_, pvp_level: number) {
        var pkRes = resMgrInst(_sys_.plt).getBattleRankByLevel(pvp_level);
        if (!pkRes) return 1;

        var r10 = Math.floor(Math.random() * 10);

        if (r10 <= 2) {
            pvp_level = pvp_level - 1;
        }

        if (pvp_level == 0) {
            pvp_level = 1;
        }


        return pvp_level;
    }

}