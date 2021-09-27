"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SePveNewMgr = void 0;
const SeResMgr_1 = require("../ResMgr/SeResMgr");
const interface_1 = require("../Res/interface");
const TeTool_1 = require("../TeTool");
const TeConfig_1 = require("../lib/TeConfig");
const SeDefine_1 = require("../SeDefine");
class SePveNewMgr {
    constructor(p) {
        this.parent = p;
    }
    get _baseInfo() {
        return this.parent.pvpMgr.getInfo();
    }
    get levelInfo() {
        return this._baseInfo.levelInfo;
    }
    savebaseinfo(v) {
        return this.parent.pvpMgr.saveInfo(v);
    }
    onLogin() {
        this.onLoginAddPower();
    }
    onLogout() {
        // clearTimeout(this.interval);
    }
    onLoginAddPower() {
        var power_time = Number(global.resMgr.getConfig('power')[1].split(',')[0]) * 60 * 1000;
        //vip时间缩短
        if (this.parent.baseInfo.is_vip && this.parent.baseInfo.vip_level > 0) {
            let vip_res = global.resMgr.getVIPResByVIPLevel(this.parent.baseInfo.vip_level);
            if (vip_res && vip_res.iPowerRecovery) {
                power_time = power_time * (100 - vip_res.iPowerRecovery) / 100;
            }
        }
        var power_count = Number(global.resMgr.getConfig('power')[1].split(',')[1]);
        //判断离线时间内有没有增加体力
        var curr = new Date().getTime();
        var timeDiff = curr - this._baseInfo.power_fresh_time;
        //剩余时间每隔1分钟
        // this.interval = setTimeout(this.onLoginAddPower.bind(this), power_time - timeDiff % power_time);
        if (timeDiff >= power_time) {
            //添加对应次数的体力
            let add_count = Math.floor(timeDiff / power_time);
            if (add_count > 0) {
                this.addPower(add_count * power_count, true);
                //记录刷新的时间
                this._baseInfo.power_fresh_time += add_count * power_time;
                this.savebaseinfo('power_fresh_time');
                global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'power_fresh_time', this._baseInfo.power_fresh_time);
            }
        }
    }
    addPower(count, isLimit) {
        var power_max = Number(global.resMgr.getConfig('power')[0]);
        if (isLimit) {
            if (this.parent.itemCount('W112') > power_max) {
                return;
            }
            else if ((this.parent.itemCount('W112') + count) >= power_max) {
                this.parent.addItem('W112', power_max - this.parent.itemCount('W112'));
            }
            else {
                this.parent.addItem('W112', count);
            }
        }
        else {
            this.parent.addItem('W112', count);
        }
    }
    buyPower(type) {
        switch (type) {
            case 'ontime':
                this.onLoginAddPower();
                break;
            case 'zuanshi':
                var power_num = Number(global.resMgr.getConfig('power')[3]);
                var moneys = global.resMgr.getConfig('power')[4].split(',');
                if (this.parent.dailyInfo.power_buyCount < moneys.length) {
                    var money = moneys[this.parent.dailyInfo.power_buyCount];
                    if (this.parent.decMoney(parseInt(money), 'buyPower')) {
                        this.addPower(power_num, false);
                        this.parent.dailyInfo.power_buyCount++;
                        this.parent.updateDailyInfo();
                    }
                }
                break;
            case 'ad':
                if (Date.now() <= this.parent.baseInfo.powerNextAdWatchTime) {
                    return;
                }
                var adLimit = Number(global.resMgr.getConfig('power')[2].split(',')[1]);
                var power_num = Number(global.resMgr.getConfig('power')[2].split(',')[0]);
                if (this.parent.dailyInfo.power_adWatchTimeCount < adLimit) {
                    this.addPower(power_num, false);
                    this.parent.dailyInfo.power_adWatchTimeCount++;
                    this.parent.updateDailyInfo();
                }
                let time_add = Number(global.resMgr.getConfig('power')[2].split(',')[2]);
                this.parent.baseInfo.powerNextAdWatchTime = Date.now() + time_add * 1000;
                this.parent.saveBaseInfo('powerNextAdWatchTime');
                global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'powerNextAdWatchTime', this.parent.baseInfo.powerNextAdWatchTime);
                break;
            default:
                break;
        }
    }
    dailyRefresh() {
        // if(this.levelInfo){
        //     this._baseInfo.levelInfo = {};
        //     this.savebaseinfo('levelInfo');
        // }
        var buyTimes = parseInt(global.resMgr.getConfig('FightCost').split(',')[1]);
        if (this.parent.baseInfo.is_vip && this.parent.baseInfo.vip_level > 0) {
            let vip_res = global.resMgr.getVIPResByVIPLevel(this.parent.baseInfo.vip_level);
            if (vip_res && vip_res.iLevelPurchase) {
                buyTimes += vip_res.iLevelPurchase;
            }
        }
        if (TeTool_1.TeDate.isdiffday(this._baseInfo.free_fight_fresh_time)) {
            var pveInfo = global.resMgr.pveInfoRes.getAllRes();
            for (var key in pveInfo) {
                var id = pveInfo[key].kid;
                if (this.levelInfo[id]) {
                    this.levelInfo[id].freeTimes = pveInfo[key].ifreeFight;
                    this.levelInfo[id].canBuyTimes = buyTimes;
                    if (this.levelInfo[id].first == undefined) {
                        this.levelInfo[id].first = 0;
                    }
                }
                else {
                    this.levelInfo[id] = { star: 0, freeTimes: pveInfo[key].ifreeFight, canBuyTimes: buyTimes, first: 0 };
                }
            }
            this._baseInfo.free_fight_fresh_time = Date.now();
            global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'levelInfos', this.levelInfo);
            this.savebaseinfo(['levelInfo', 'free_fight_fresh_time']);
        }
    }
    _can_fight(levelId, isSweep) {
        if (global.resMgr.pveInfoRes.getRes(levelId).kbefore) {
            var before = global.resMgr.pveInfoRes.getRes(levelId).kbefore.split(',');
            for (let i = 0; i < before.length; i++) {
                if (TeTool_1.countBits(this.levelInfo[before[i]].star) == 0) {
                    return false;
                }
            }
        }
        if (!this.levelInfo[levelId])
            return false;
        if (this.levelInfo[levelId].freeTimes <= 0)
            return false;
        if (this.parent.itemCount('W112') < Number(global.resMgr.pveInfoRes.getRes(levelId).kPriceID))
            return false;
        if (isSweep && TeTool_1.countBits(this.levelInfo[levelId].star) < 3)
            return false;
        return true;
    }
    startfight(levelId) {
        // 玩家开始某个地图的战斗
        // 检查是否能够开始
        if (!this._can_fight(levelId, false)) {
            // 不满足的时候通知玩家条件不满足
            this.notice_to_player_start(false, levelId);
        }
        else {
            // 记录下玩家的开启时间
            this._baseInfo.pve_new_start_time = Date.now();
            this.savebaseinfo('pve_new_start_time');
            this.notice_to_player_start(true, levelId);
            this.parent.taskAction(SeDefine_1.TaskAction.PveFight, 1, levelId);
            this.parent.setState(SeDefine_1.CharState.inrace);
        }
    }
    notice_to_player_start(succ, levelId) {
        global.netMgr.sendData({
            cmd: 'pveNewstart',
            succ: succ,
            levelId: levelId
        }, this.parent.linkid);
    }
    _addFightAward(aiPool) {
        let result = [];
        for (var i = 0; i < aiPool.length; i++) {
            let poolid = parseInt(aiPool[i].split(',')[0]);
            if (isNaN(poolid))
                continue;
            let count = Math.floor(Math.random() * (parseInt(aiPool[i].split(',')[2]) - parseInt(aiPool[i].split(',')[1]) + 1) + parseInt(aiPool[i].split(',')[1]));
            for (let k = 0; k < count; k++) {
                var pkLootPoolIds = global.resMgr.lootPoolGroupRes[poolid];
                var pkLootPools = [];
                var totalIweight = 0;
                for (var j = 0; pkLootPoolIds && j < pkLootPoolIds.length; j++) {
                    let pkLootPoolRes = global.resMgr.lootPoolRes.getRes(pkLootPoolIds[j]);
                    if (pkLootPoolRes && pkLootPoolRes.iWeight > 0) {
                        if (pkLootPoolRes.kStartTime && Date.now() < Date.parse(pkLootPoolRes.kStartTime))
                            continue;
                        if (pkLootPoolRes.kEndTime && Date.now() > Date.parse(pkLootPoolRes.kEndTime))
                            continue;
                        pkLootPools.push(pkLootPoolRes);
                        totalIweight += pkLootPoolRes.iWeight;
                    }
                }
                let limit = {};
                if (totalIweight > 0) {
                    var currWeight = Math.random() * totalIweight;
                    while (pkLootPools.length > 0) {
                        let pkLootPoolRes = pkLootPools.shift();
                        if (pkLootPoolRes.iWeight >= currWeight) {
                            if (!limit[pkLootPoolRes.iTeamId])
                                limit[pkLootPoolRes.iTeamId] = 0;
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
                                //vip金币掉落有加成
                                if (pkLootPoolRes.iVip == 1 && this.parent.baseInfo.is_vip && this.parent.baseInfo.vip_level > 0) {
                                    let vip_res = global.resMgr.getVIPResByVIPLevel(this.parent.baseInfo.vip_level);
                                    if (vip_res) {
                                        if (itemId == 'W002' && vip_res.iLevelCoinAdd) {
                                            iNum = Math.floor(iNum * (100 + vip_res.iLevelCoinAdd) / 100);
                                        }
                                    }
                                }
                                limit[pkLootPoolRes.iTeamId] = limit[pkLootPoolRes.iTeamId] + iNum;
                                result.push({ kItemID: itemId, iPileCount: iNum });
                            }
                            break;
                        }
                        currWeight -= pkLootPoolRes.iWeight;
                    }
                }
            }
        }
        return result;
    }
    test_finishfight(levelId, count) {
        if (count > 100)
            count = 100;
        var outs = [];
        for (let i = 0; i < count; i++) {
            let pkInfoRes = SeResMgr_1.SeResMgr.inst.pveInfoRes.getRes(levelId);
            let awards_bases = this._addFightAward(pkInfoRes.akReward);
            for (let i = 0; i < awards_bases.length; i++) {
                let newCount = Math.floor(awards_bases[i].iPileCount);
                if (!isNaN(newCount))
                    awards_bases[i].iPileCount = newCount;
            }
            // 额外掉落
            let awards_drops = this._addFightAward(pkInfoRes.akDrops);
            for (let i = 0; i < awards_drops.length; i++) {
                let newCount = Math.floor(awards_drops[i].iPileCount);
                if (!isNaN(newCount))
                    awards_drops[i].iPileCount = newCount;
            }
            let awards = [...awards_bases, ...awards_drops];
            if (awards.length > 0) {
                //需要先开的id
                for (let i = 0; i < awards.length; i++) {
                    let res = global.resMgr.TownItemRes.getRes(awards[i].kItemID);
                    if (res.eTypeA == interface_1.SeEnumTownItemeTypeA.DuanWeiBaoXiang) {
                        let out = this.parent.m_pkShopMgr.openBoxBatch(res.kId, awards[i].iPileCount, parseInt(res.kValueA), parseInt(res.kValueB), false, true, false);
                        for (var key in out.ids) {
                            if (out.ids[key] > 0) {
                                TeTool_1.remove_duplicate({ kItemID: key, iPileCount: out.ids[key] }, outs);
                            }
                        }
                        for (let i = 0; i < out.changes.length; i++) {
                            if (out.changes[i].cGolds > 0) {
                                TeTool_1.remove_duplicate({ kItemID: 'W002', iPileCount: out.changes[i].cGolds }, outs);
                            }
                            if (out.changes[i].cItems > 0) {
                                TeTool_1.remove_duplicate({ kItemID: 'BD01', iPileCount: out.changes[i].cItems }, outs);
                            }
                        }
                    }
                    else if (res.eTypeA == interface_1.SeEnumTownItemeTypeA.LiBao) {
                        let out = this.parent.m_pkShopMgr.openChanceBox(res.kId, res.kValueA, awards[i].iPileCount, false);
                        for (var key in out.ids) {
                            TeTool_1.remove_duplicate({ kItemID: key, iPileCount: out.ids[key] }, outs);
                        }
                    }
                    else {
                        TeTool_1.remove_duplicate(awards[i], outs);
                    }
                }
            }
        }
        let result = [];
        for (let k = 0; k < outs.length; k++) {
            let type = global.resMgr.TownItemRes.getRes(outs[k].kItemID).iColor;
            result.push({ kid: outs[k].kItemID, type: type, num: outs[k].iPileCount });
        }
        return result;
    }
    finishfight(levelId, hps, time, isSweep) {
        let cheat_level3 = false;
        ;
        let race_id = this.parent.id + levelId + Date.now();
        if (!isSweep && this._baseInfo.pve_new_start_time == 0) {
            // 如果没有记录战斗开始时间的话 pass
            if (this.levelInfo[levelId]) {
                this.notice_to_player_finish(false, false, 0, this.levelInfo[levelId].freeTimes, levelId, []);
            }
            else {
                console.log('levelId ' + levelId);
            }
            return;
        }
        //扫荡扣除扫荡券
        if (isSweep && !this.parent.delItem('W102', 1)) {
            return;
        }
        this._baseInfo.pve_new_start_time = 0;
        this.savebaseinfo('pve_new_start_time');
        if (!this._can_fight(levelId, isSweep)) {
            // 如果不满足 就不结算 pass
            this.notice_to_player_finish(false, false, 0, this.levelInfo[levelId].freeTimes, levelId, []);
            return;
        }
        let pkInfoRes = SeResMgr_1.SeResMgr.inst.pveInfoRes.getRes(levelId);
        let server_time = Math.floor((Date.now() - this._baseInfo.pve_new_start_time) / 1000);
        // 先扣掉体力
        this.parent.delItem(pkInfoRes.kPriceID, pkInfoRes.iPriceAmount, levelId + isSweep ? '_sweep' : '');
        //计算星级
        var starCondition = pkInfoRes.akstar;
        var star = 0;
        let win = false;
        if (Number(starCondition[0].split(',')[1]) == 0) {
            win = true;
            //代表防守关卡,自身血量为0是失败,其他（到时间）都为成功
            if (hps.length >= 0 && hps[0] == 0) {
                win = false;
            }
        }
        else {
            //地方主城为0是成功，到时间是失败
            if (hps.length >= 0 && hps[1] == 0) {
                win = true;
            }
        }
        if (isSweep) {
            star = 7;
            win = true;
        }
        else {
            if (win) {
                star |= 1;
            }
            //第一次输，开启屠龙秘宝
            if (!win && this.parent.baseInfo.tlmb_finish_time == 0 && global.plt != 'hago') {
                this.parent.baseInfo.tlmb_finish_time = Date.now() + parseInt(global.resMgr.getConfig('tlmb_last_time')) * 60 * 60 * 1000;
                this.parent.saveBaseInfo('tlmb_finish_time');
                global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'tlmb_finish_time', this.parent.baseInfo.tlmb_finish_time);
            }
            if (star > 0 && (Math.floor(time / 1000) <= Number(starCondition[1].split(',')[1]) || Math.floor(server_time / 1000) <= Number(starCondition[1].split(',')[1]))) {
                star |= (1 << 1);
            }
            if (star > 0 && (hps[0] / hps[2]) > Number(starCondition[2].split(',')[1])) {
                star |= (1 << 2);
            }
        }
        // star这次战斗的星数，star_add这次战斗增加的星数， star_all 这关卡的最高星数
        let star_all = this.levelInfo[levelId].star | star;
        let star_add = star_all - this.levelInfo[levelId].star;
        let awards = [];
        if (star > 0) {
            if (parseInt(pkInfoRes.kequipAdd1) > 0 && !isSweep) {
                // 判断是否有作弊可能
                let player_score = this.getFormationCheatScore();
                //关卡卡牌参数=pveinfo表icardLv字段值去configMap表去读pveCheat字段获取对应参数
                let level_param = parseFloat(global.resMgr.getConfig('pveCheat')[global.resMgr.pveInfoRes.getRes(levelId).icardLv - 1]);
                //关卡分数=(2+pveinfo表kequipAdd1字段值/100)*(1.1^ pveinfo表icardLv字段值  )*(1+ 关卡卡牌参数)
                let level_score = (2 + (parseInt(pkInfoRes.kequipAdd1) / 100)) * (Math.pow(1.1, pkInfoRes.icardLv)) * (1 + level_param);
                if ((player_score / level_score) < 0.2) {
                    this._baseInfo.pve_cheat_times[2]++;
                    global.logMgr.pveCheatLog(this.parent, levelId, race_id, 3, player_score);
                    cheat_level3 = true;
                    //删除榜单并封号
                    if (!TeConfig_1.configInst.get("cheatmode")) {
                        global.lsMgr.sendLSData({ cmd: 'deal_cheat', uid: this.parent.id, plt: global.plt });
                    }
                    return;
                }
                else if ((player_score / level_score) < 0.5) {
                    this._baseInfo.pve_cheat_times[1]++;
                    global.logMgr.pveCheatLog(this.parent, levelId, race_id, 2, player_score);
                }
                else if ((player_score / level_score) < 0.75) {
                    this._baseInfo.pve_cheat_times[0]++;
                    global.logMgr.pveCheatLog(this.parent, levelId, race_id, 1, player_score);
                }
                this.savebaseinfo('pve_cheat_times');
            }
            // 发送奖励
            if (this.levelInfo[levelId].first == 0 && !isSweep) {
                awards = this._addFightAward(pkInfoRes.akFirstDrops);
                this.levelInfo[levelId].first = 1;
                this.savebaseinfo('levelInfo');
            }
            else {
                let awards_bases = this._addFightAward(pkInfoRes.akReward);
                for (let i = 0; i < awards_bases.length; i++) {
                    let newCount = Math.floor(awards_bases[i].iPileCount);
                    if (!isNaN(newCount))
                        awards_bases[i].iPileCount = newCount;
                }
                // 额外掉落
                let awards_drops = this._addFightAward(pkInfoRes.akDrops);
                for (let i = 0; i < awards_drops.length; i++) {
                    let newCount = Math.floor(awards_drops[i].iPileCount);
                    if (!isNaN(newCount))
                        awards_drops[i].iPileCount = newCount;
                }
                awards = [...awards_bases, ...awards_drops];
            }
        }
        var outs = [];
        var needAdd = [];
        //如果有掉落双倍buff，奖励翻倍
        if (this.parent.m_buffMgr.isHadBuff('B016')) {
            for (let award of awards) {
                award.iPileCount = award.iPileCount * 2;
            }
        }
        // 如果奖励存在 那么 发给玩家道具
        // 如果是卡包 那么先开掉,重复的道具需要叠加在一起
        if (awards.length > 0) {
            //需要先开的id
            for (let i = 0; i < awards.length; i++) {
                let res = global.resMgr.TownItemRes.getRes(awards[i].kItemID);
                if (res.eTypeA == interface_1.SeEnumTownItemeTypeA.DuanWeiBaoXiang) {
                    let out = this.parent.m_pkShopMgr.openBoxBatch(res.kId, awards[i].iPileCount, parseInt(res.kValueA), parseInt(res.kValueB), false, true, false);
                    for (var key in out.ids) {
                        if (out.ids[key] > 0) {
                            TeTool_1.remove_duplicate({ kItemID: key, iPileCount: out.ids[key] }, outs);
                        }
                    }
                    for (let i = 0; i < out.changes.length; i++) {
                        if (out.changes[i].cGolds > 0) {
                            TeTool_1.remove_duplicate({ kItemID: 'W002', iPileCount: out.changes[i].cGolds }, outs);
                        }
                        if (out.changes[i].cItems > 0) {
                            TeTool_1.remove_duplicate({ kItemID: 'BD01', iPileCount: out.changes[i].cItems }, outs);
                        }
                    }
                }
                else if (res.eTypeA == interface_1.SeEnumTownItemeTypeA.LiBao) {
                    let out = this.parent.m_pkShopMgr.openChanceBox(res.kId, res.kValueA, awards[i].iPileCount, false);
                    for (var key in out.ids) {
                        TeTool_1.remove_duplicate({ kItemID: key, iPileCount: out.ids[key] }, outs);
                    }
                }
                else {
                    TeTool_1.remove_duplicate(awards[i], outs);
                    TeTool_1.remove_duplicate(awards[i], needAdd);
                }
            }
            this.parent.addItems(needAdd, 'pvenewawards');
        }
        let race_type = 4444;
        if (isSweep) {
            this.parent.taskAction(SeDefine_1.TaskAction.PveSweep, 1, levelId);
        }
        else {
            if (win) {
                this.parent.taskAction(SeDefine_1.TaskAction.PveWin, 1, levelId);
            }
            //第一次3星不竞速
            if (this.levelInfo[levelId].star == 7 && win && !cheat_level3) {
                //关卡竞速赛
                var pkRes = global.resMgr.seasonRes.getRes(this.parent.pvpMgr.seasonid);
                if (pkRes.akLevelSpeed) {
                    for (let i = 0; i < pkRes.akLevelSpeed.length; i++) {
                        let levelIdRes = pkRes.akLevelSpeed[i].split(',')[1];
                        if (levelId == levelIdRes && (this._baseInfo.level_speed_level == "" || this._baseInfo.level_speed_level == levelId)) {
                            //还未参加竞速赛，如果已经打过高等级的三星，低等级的不能上榜
                            let temp = false;
                            if (this._baseInfo.level_speed_level == "") {
                                for (let p = i + 1; p < pkRes.akLevelSpeed.length; p++) {
                                    let high_level = pkRes.akLevelSpeed[p].split(',')[1];
                                    if (this.levelInfo[high_level].star == 7) {
                                        temp = true;
                                    }
                                }
                            }
                            if (temp)
                                break;
                            let speed_time = Math.floor(time / 1000);
                            if (!this._baseInfo.level_speed[i] || speed_time < this._baseInfo.level_speed[i]) {
                                this._baseInfo.level_speed[i] = speed_time;
                                this.savebaseinfo('level_speed');
                                if (this._baseInfo.level_speed_level == "") {
                                    this._baseInfo.level_speed_level = levelId;
                                    this.savebaseinfo('level_speed_level');
                                    global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'level_speed_level', this._baseInfo.level_speed_level);
                                }
                                //通过type查是不是跨服的榜单
                                let chart_res = global.resMgr.getChartTableByType(pkRes.akLevelSpeed[i].split(',')[0]);
                                if (chart_res.iCrossSever) {
                                    global.globalChartMgr.addPlayerLevelChart(this.parent.pvpMgr.seasonid, pkRes.akLevelSpeed[i].split(',')[0], {
                                        id: this.parent.id,
                                        name: this.parent.name,
                                        score: speed_time,
                                        icon: this.parent.icon,
                                        avatar: this.parent.avatar,
                                        igroup: this.parent.pvpMgr.groupId,
                                        lordId: this.parent.baseInfo.lord,
                                        equip: this.parent.m_equipMgr.getLordEquip(),
                                        is_vip: this.parent.baseInfo.is_vip,
                                        vip_level: this.parent.baseInfo.vip_level,
                                    });
                                }
                                else {
                                    global.chartMgr.addPlayerLevelChart(this.parent.pvpMgr.seasonid, pkRes.akLevelSpeed[i].split(',')[0], {
                                        id: this.parent.id,
                                        name: this.parent.name,
                                        score: speed_time,
                                        icon: this.parent.icon,
                                        avatar: this.parent.avatar,
                                        igroup: this.parent.pvpMgr.groupId,
                                        lordId: this.parent.baseInfo.lord,
                                        equip: this.parent.m_equipMgr.getLordEquip(),
                                        is_vip: this.parent.baseInfo.is_vip,
                                        vip_level: this.parent.baseInfo.vip_level,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        // 战斗记录
        this.levelInfo[levelId].star = star_all;
        if (star > 0) {
            this.levelInfo[levelId].freeTimes = this.levelInfo[levelId].freeTimes - 1;
        }
        this.savebaseinfo('levelInfo');
        if (star_add > 0) {
            this.parent.taskAction(SeDefine_1.TaskAction.PveStar, pkInfoRes.iType, TeTool_1.countBits(star_add));
            //获取所有星数
            let star_count = this.getAllStarCount();
            //用时
            let pve_start = Date.parse(global.resMgr.getConfig('pve_star_rank_date'));
            let time1 = Math.floor((Date.now() - Math.max(pve_start, this.parent.baseInfo.createtime)) / 1000);
            let score = star_count + 1 - (time1 / (10 * 10000 * 10000));
            global.chartMgr.addPlayerLevelChart(this.parent.pvpMgr.seasonid, interface_1.SeEnumChartTableeType.pveXingShuBang, {
                id: this.parent.id,
                name: this.parent.name,
                score: score,
                icon: this.parent.icon,
                avatar: this.parent.avatar,
                igroup: this.parent.pvpMgr.groupId,
                time: time1,
                is_vip: this.parent.baseInfo.is_vip,
                vip_level: this.parent.baseInfo.vip_level,
            });
        }
        this.notice_to_player_finish(true, win, star, this.levelInfo[levelId].freeTimes, levelId, outs);
        global.logMgr.fightFormationLog(this.parent, race_type.toString(), win, race_id, time, hps[0], this.parent.baseInfo.lord, this.parent.m_equipMgr.getLordEquip(), star, levelId, isSweep, false, [], ...this.parent.getLogFormation());
        this.parent.setState(SeDefine_1.CharState.loadcomplete);
        //更新限制武将牌状态
        this.parent.updateTryHeroCard('match');
    }
    getFormationCheatScore(formation, equips) {
        let card_per_level = 1;
        if (formation && formation.length > 0) {
            card_per_level = Math.floor(this.parent.m_pkHeroCardMgr._total_level_(formation) / formation.length);
        }
        else {
            card_per_level = Math.floor(this.parent.m_pkHeroCardMgr._total_level_() / 8);
        }
        let card_param = parseFloat(global.resMgr.getConfig('pveCheat')[card_per_level - 1]);
        //玩家分数=(1.1^卡牌等级)*(1+玩家卡牌参数)*(1+装备攻击总加成/100+装备攻击固定值/314)+(1.1^卡牌等级)*(1+ 玩家卡牌参数  )*(1+装备生命总加成/100+装备生命固定值/2572)  
        let equipAdd = this.parent.m_equipMgr.getEquipAddByType(equips);
        let player_score = Math.pow(1.1, card_per_level) * (1 + card_param) * (1 + equipAdd[0] / 10000 + equipAdd[1] / 314 + 1 + equipAdd[2] / 10000 + equipAdd[3] / 2572);
        return player_score;
    }
    getAllStarCount() {
        let count = 0;
        for (var key in this.levelInfo) {
            count += TeTool_1.countBits(this.levelInfo[key].star);
        }
        return count;
    }
    notice_to_player_finish(succ, win, star, freeTimes, levelId, awards = []) {
        global.netMgr.sendData({
            cmd: 'pveNewaward',
            succ: succ,
            win: win,
            star: star,
            freeTimes: freeTimes,
            levelId: levelId,
            awards: awards,
        }, this.parent.linkid);
    }
    //添加战斗次数
    addFreeTimes(levelId) {
        if (this.levelInfo[levelId].canBuyTimes <= 0) {
            return;
        }
        //扣除报名费
        let price = parseInt(global.resMgr.getConfig('FightCost').split(',')[0]);
        if (this.parent.decMoney(price, 'addFreeTimes')) {
            var pveInfo = global.resMgr.pveInfoRes.getRes(levelId);
            this.levelInfo[levelId].freeTimes = pveInfo.ifreeFight;
            this.levelInfo[levelId].canBuyTimes--;
            this.savebaseinfo('levelInfo');
            global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'levelInfo', levelId, this.levelInfo[levelId]);
        }
    }
    //添加战斗可购买次数
    addCanBuyTimes(count) {
        for (var key in this.levelInfo) {
            this.levelInfo[key].canBuyTimes += count;
        }
        this.savebaseinfo('levelInfo');
        global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'levelInfos', this.levelInfo);
    }
}
exports.SePveNewMgr = SePveNewMgr;
//# sourceMappingURL=SePveNewMgr.js.map