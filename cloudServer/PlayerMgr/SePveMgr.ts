import { SePlayer } from "./SePlayer";
import { SeResMgr } from "../ResMgr/SeResMgr";
import { SeItem } from "./SePlayerDef";
import { iApp } from "../app";
import { SeResLootPool, SeEnumChartTableeType, SeEnumLevelInfoiRankType, SeEnumLevelInfoiProperty } from "../Res/interface";

declare var global: iApp;

export class SePveMgr {
    private parent: SePlayer;
    constructor(p: SePlayer) {
        this.parent = p;
    }


    private get baseInfo() {
        return this.parent.pvpMgr.getInfo();
    }

    private savebaseinfo(v: string) {
        return this.parent.pvpMgr.saveInfo(v);
    }


    private _can_fight(levelId: string, times: number) {
        let pkLevelInfoRes = SeResMgr.inst.LevelInfoRes.getRes(levelId);
        if (!pkLevelInfoRes) {
            return false;
        }
        let fightlevel = this.baseInfo.pve_chapters[pkLevelInfoRes.kGroup] || 0;
        if (fightlevel + 1 < pkLevelInfoRes.iLevel) {
            return false;
        }

        if (this.parent.itemCount(pkLevelInfoRes.kPriceID) < (pkLevelInfoRes.iPriceAmount * times || times)) {
            return false
        }

        return true;
    }

    startfight(levelId: string, times: number) {
        if (times == undefined || times == 0) times = 1;
        // 玩家开始某个地图的战斗
        if (!this._can_fight(levelId, times)) {
            // 不满足的时候通知玩家条件不满足
            this.notice_to_player_start(false, levelId, times);
        }
        else {
            // 记录下玩家的开启时间
            this.baseInfo.pve_start_time = Date.now();
            this.savebaseinfo('pve_start_time');
            this.notice_to_player_start(true, levelId, times);
        }

    }

    private notice_to_player_start(succ: boolean, levelId: string, times: number) {
        global.netMgr.sendData({
            cmd: 'pvestart',
            succ: succ,
            levelId: levelId,
            times: times
        }, this.parent.linkid);
    }

    private _addFightAward(aiPool: string[]): Array<SeItem> {
        let result = [];
        for (var i = 0; i < aiPool.length; i++) {
            let poolid = parseInt(aiPool[0]);
            if (isNaN(poolid)) continue;
            var pkLootPoolIds = global.resMgr.lootPoolGroupRes[poolid];
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

            let limit: { [teamid: string]: number } = {};
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
                            // if (pkLootPoolRes.iAddtion && bRate) {
                            //     let newiNum = Math.ceil(iNum * (100 + pkLootPoolRes.iAddtion) / 100);
                            //     if (!isNaN(newiNum) && newiNum) {
                            //         iNum = newiNum;
                            //     }
                            // }

                            iNum = Math.min(iNum, pkLootPoolRes.iDayMaxNum - limit[pkLootPoolRes.iTeamId]);
                            limit[pkLootPoolRes.iTeamId] = limit[pkLootPoolRes.iTeamId] + iNum;
                            result.push({ kItemID: itemId, iPileCount: iNum })
                        }
                        break;
                    }
                    currWeight -= pkLootPoolRes.iWeight;
                }
            }

            return result;
        }

    }


    finishfight(levelId: string, times: number, hps: number[], time: number, damage: number) {
        if (this.baseInfo.pve_start_time == 0) {
            // 如果没有记录战斗开始时间的话 pass
            this.notice_to_player_finish(false, false, levelId, [], this.baseInfo.pve_maps[levelId]);
            return;
        }

        this.baseInfo.pve_start_time = 0;
        this.savebaseinfo('pve_start_time');

        // 结算的血量 时间 等信息
        if (!this._can_fight(levelId, times)) {
            // 如果不满足 就不结算 pass
            this.notice_to_player_finish(false, false, levelId, [], this.baseInfo.pve_maps[levelId]);
            return;
        }


        let pkLevelInfoRes = SeResMgr.inst.LevelInfoRes.getRes(levelId);

        // 检查倍数是否存在
        let hasTimes = false;
        for (let i = 0; i < pkLevelInfoRes.aiChooseMultiple.length; i++) {
            if (pkLevelInfoRes.aiChooseMultiple[i] == times) {
                hasTimes = true;
                break;
            }
        }

        // 倍数不存在则不能结算
        if (!hasTimes) {
            return;
        }

        let server_time = Math.floor((Date.now() - this.baseInfo.pve_start_time) / 1000);

        if (time < pkLevelInfoRes.iMinTimeLimit || server_time < pkLevelInfoRes.iMinTimeLimit) {
            // 判断一下玩家上报的时间和服务器统计的时间是否都满足配置要求
            // 不满足的话 pass
            this.notice_to_player_finish(false, false, levelId, [], this.baseInfo.pve_maps[levelId]);
            return;
        }

        // 先扣掉门票
        this.parent.delItem(pkLevelInfoRes.kPriceID, (pkLevelInfoRes.iPriceAmount * times || times));

        let awards: SeItem[] = [];

        let win = (hps.length >= 0 && hps[1] == 0) ? true : false;

        let giveAward = false;

        if (win) giveAward = true;
        if (pkLevelInfoRes.iProperty & SeEnumLevelInfoiProperty.ShiBaiZhengChangDiaoLuo) {
            giveAward = true;
        }

        if (giveAward) {
            // 发送奖励
            let awards_bases = this._addFightAward(pkLevelInfoRes.akBaseRaward);

            let exTimes = 1;
            // 判断是否有陆逊存在
            if (pkLevelInfoRes.kScoreUnitID) {
                let formation = this.parent.matchFormation;
                for (let i = 0; i < formation.length; i++) {
                    if (formation[i].kHeroID == pkLevelInfoRes.kScoreUnitID) {
                        exTimes = pkLevelInfoRes.iScoreAddition;
                        break;
                    }
                }
            }

            // 发送奖励
            for (let i = 0; i < awards_bases.length; i++) {
                let newCount = Math.floor(awards_bases[i].iPileCount * times * exTimes);
                if (!isNaN(newCount)) awards_bases[i].iPileCount = newCount;
            }

            // 额外掉落不受加成
            let awards_drops = this._addFightAward(pkLevelInfoRes.akDrops);
            // 发送奖励
            for (let i = 0; i < awards_drops.length; i++) {
                let newCount = Math.floor(awards_drops[i].iPileCount * times);
                if (!isNaN(newCount)) awards_drops[i].iPileCount = newCount;
            }

            awards = [...awards_bases, ...awards_drops];
        }

        // 如果奖励存在 那么 发给玩家道具
        if (awards.length > 0) this.parent.addItems(awards, 'pveawards');

        if (win) {
            // 记录一下通关难度
            if ((this.baseInfo.pve_chapters[pkLevelInfoRes.kGroup] || 0) < pkLevelInfoRes.iLevel) {
                this.baseInfo.pve_chapters[pkLevelInfoRes.kGroup] = pkLevelInfoRes.iLevel;
                this.savebaseinfo('pve_chapters');

                // 通知客户端更新
                global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'pve', pkLevelInfoRes.kGroup, pkLevelInfoRes.iLevel);
            }
        }

        // 记录一下地图的完成次数
        if (!this.baseInfo.pve_maps[levelId]) this.baseInfo.pve_maps[levelId] = { count: 0, win: 0, damage: 0 };
        this.baseInfo.pve_maps[levelId].count += times;
        if (win) this.baseInfo.pve_maps[levelId].win += times;

        if (!this.baseInfo.pve_maps[levelId].damage) {
            this.baseInfo.pve_maps[levelId].damage = damage;
        }
        else {
            this.baseInfo.pve_maps[levelId].damage = Math.max(damage, this.baseInfo.pve_maps[levelId].damage);
        }

        this.savebaseinfo('pve_maps');

        this.notice_to_player_finish(true, win, levelId, awards, this.baseInfo.pve_maps[levelId]);

        if (pkLevelInfoRes.iRankType & SeEnumLevelInfoiRankType.ShangHaiPaiXing) {
            global.chartMgr.addPlayerLevelChart(this.parent.pvpMgr.seasonid,
                SeEnumChartTableeType.ShangHaiPaiXing,
                {
                    seasonid: this.parent.pvpMgr.seasonid,
                    id: this.parent.id,
                    name: this.parent.name,
                    score: this.baseInfo.pve_maps[levelId].damage || 0,
                    icon: this.parent.icon,
                    avatar: this.parent.avatar,
                    igroup: this.parent.pvpMgr.groupId,
                    is_vip: this.parent.baseInfo.is_vip,
                    vip_level: this.parent.baseInfo.vip_level,
                });
        }
        let race_type = 3333;

        global.logMgr.fightFormationLog(this.parent, race_type.toString(), win, 'pve', time, hps[0], this.parent.baseInfo.lord, this.parent.m_equipMgr.getLordEquip(), -1, levelId, false, false, [], ...this.parent.getLogFormation());
        global.logMgr.pveLog(this.parent, levelId, times, win, time);
    }


    checkSeason() {
        let bChange = false;
        for (let key in this.baseInfo.pve_maps) {
            let pkLevelInfoRes = SeResMgr.inst.LevelInfoRes.getRes(key);
            if (!pkLevelInfoRes || (pkLevelInfoRes.iProperty & SeEnumLevelInfoiProperty.SaiJiZhongZhi)) {
                delete this.baseInfo.pve_maps[key];
                bChange = true;
            }

            if (pkLevelInfoRes && (pkLevelInfoRes.iProperty & SeEnumLevelInfoiProperty.SaiJiZhongZhi)) {
                delete this.baseInfo.pve_chapters[pkLevelInfoRes.kGroup];
                bChange = true;
            }
        }

        if (bChange) { this.savebaseinfo('pve_maps'); this.savebaseinfo('pve_chapters'); }
    }

    private notice_to_player_finish(succ: boolean, win: boolean, levelId: string, awards: SeItem[] = [], mapstatics: any) {
        global.netMgr.sendData({
            cmd: 'pveaward',
            succ: succ,
            win: win,
            levelId: levelId,
            awards: awards,
            mapstatics: mapstatics
        }, this.parent.linkid);
    }


    getMapCount(levelid: string) {
        if (!this.baseInfo.pve_maps.hasOwnProperty(levelid)) {
            return { win: 0, count: 0 }
        }

        return this.baseInfo.pve_maps[levelid];
    }
}