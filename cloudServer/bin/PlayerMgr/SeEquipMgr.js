"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeEquipMgr = void 0;
const SePlayerDef_1 = require("./SePlayerDef");
const interface_1 = require("../Res/interface");
const TeTool_1 = require("../TeTool");
const SeDefine_1 = require("../SeDefine");
class SeEquipMgr {
    constructor(p) {
        this.equipenhanceColor = ['', 'akgreen', 'akblue', 'akpurple', 'akorange'];
        this.enchantProperty = ['iUnitAtk', 'iUnitHp', 'iMagicAtk', 'iCastleAtk', 'iCastleHp'];
        this.parent = p;
    }
    equip_opr(data, notice = true) {
        var equip;
        //删除旧的装备数据格式
        if (!Array.isArray(this.equipInfo.haveEquips)) {
            this.equipInfo.haveEquips = [];
        }
        switch (data.type) {
            case 'add': {
                // 添加装备到装备库
                equip = new SePlayerDef_1.SeEquip(global.resMgr.getEquipRes(data.kId), this.parent.id, this.equipInfo.allEquips);
                this.equipInfo.allEquips++;
                this.equipInfo.haveEquips.push(equip);
                this.parent.taskAction(SeDefine_1.TaskAction.EquipAdd, 1, equip.eType, equip.iColor);
                this.parent.saveBaseInfo("equipInfo");
                global.logMgr.equipLog(this.parent, 'add', equip.eId, equip.kId, [], equip.eLevel, equip.eLevel, equip.enchant);
                break;
            }
            case 'lock': {
                var equipIds = data.eId.split(",");
                for (let k = 0; k < equipIds.length; k++) {
                    equip = this.getHaveEquip(equipIds[k]);
                    if (equip.isLocked) {
                        continue;
                    }
                    equip.isLocked = true;
                    this.parent.saveBaseInfo("equipInfo");
                }
                break;
            }
            case 'unlock': {
                var equipIds = data.eId.split(",");
                for (let k = 0; k < equipIds.length; k++) {
                    equip = this.getHaveEquip(equipIds[k]);
                    if (!equip.isLocked) {
                        continue;
                    }
                    equip.isLocked = false;
                    this.parent.saveBaseInfo("equipInfo");
                }
                break;
            }
            case 'wear': {
                // 穿戴装备
                equip = this.getHaveEquip(data.eId);
                if (!equip)
                    return;
                if (equip.isWeared) {
                    //找出哪个主公穿着并脱下
                    for (var lordId in this.parent.baseInfo.lords) {
                        if (this.parent.baseInfo.lords[lordId] && this.parent.baseInfo.lords[lordId].wear_equips) {
                            for (let i = 0; i < this.parent.baseInfo.lords[lordId].wear_equips.length; i++) {
                                if (this.parent.baseInfo.lords[lordId].wear_equips[i] == data.eId) {
                                    this.equip_opr({ type: 'unwear', eId: data.eId, lordId: lordId });
                                    break;
                                }
                            }
                        }
                    }
                }
                let lord = this.parent.baseInfo.lords[data.lordId];
                if (lord) {
                    if (!lord.wear_equips) {
                        this.parent.baseInfo.lords[data.lordId] = { timeout: 10180180211923, wear_equips: [] };
                        lord = this.parent.baseInfo.lords[data.lordId];
                    }
                    for (var i = 0; i < lord.wear_equips.length; i++) {
                        var weared_equip = this.getHaveEquip(lord.wear_equips[i]);
                        if (weared_equip && weared_equip.eType == equip.eType) {
                            weared_equip.isWeared = false;
                            global.netMgr.sendEquip(this.parent.linkid, 'unwear', weared_equip.eId, notice);
                            lord.wear_equips.splice(i, 1);
                        }
                    }
                    equip.isWeared = true;
                    lord.wear_equips.push(equip.eId);
                    global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'lords', this.parent.baseInfo.lords);
                    this.parent.saveBaseInfo("equipInfo");
                    this.parent.saveBaseInfo("lords");
                    break;
                }
                break;
            }
            case 'unwear': {
                // 卸下装备
                equip = this.getHaveEquip(data.eId);
                if (!equip || !equip.isWeared) {
                    break;
                }
                let lord = this.parent.baseInfo.lords[data.lordId];
                if (lord) {
                    for (var i = 0; i < lord.wear_equips.length; i++) {
                        if (lord.wear_equips[i] == data.eId) {
                            global.netMgr.sendEquip(this.parent.linkid, 'unwear', lord.wear_equips[i], notice);
                            lord.wear_equips.splice(i, 1);
                        }
                    }
                    equip.isWeared = false;
                    global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'lords', this.parent.baseInfo.lords);
                    this.parent.saveBaseInfo("equipInfo");
                    this.parent.saveBaseInfo("lords");
                    break;
                }
                break;
            }
            case 'enhance': {
                // 强化
                equip = this.getHaveEquip(data.eId);
                if (!equip)
                    return;
                let level_limit = parseInt(global.resMgr.getConfig('EquipLimit')[equip.iColor - 1].split(',')[0]) || 100;
                if (equip.eLevel >= level_limit)
                    return;
                let equipenhance = global.resMgr.getEquipenhanceRes(interface_1.SeEnumequipenhanceeBuildType.QiangHua, equip.eType, equip.eLevel + 1);
                let items = equipenhance[this.equipenhanceColor[equip.iColor]];
                //使用道具
                for (let i = 0; i < items.length; i++) {
                    let item = items[i];
                    //金币和其他item方式不一样
                    if (global.resMgr.TownItemRes.getRes(item.split(',')[0]).eTypeA == interface_1.SeEnumTownItemeTypeA.JinYuanBao) {
                        if (!this.parent.useGold(Number(item.split(',')[1]))) {
                            break;
                        }
                    }
                    else {
                        if (!this.parent.delItem(item.split(',')[0], Number(item.split(',')[1]))) {
                            break;
                        }
                    }
                    if (i == items.length - 1) {
                        equip.eLevel += 1;
                        //20级之后每10级需要通知
                        if (equip.iColor >= interface_1.SeEnumequipattriColor.Cheng && equip.eLevel % 10 == 0 && equip.eLevel >= 20) {
                            this.parent.sendAnnouncement(interface_1.SeEnumnoticetexteType.ChengZhuangQiangHua, { equipname: equip.kId, equipLv: equip.eLevel, charname: this.parent.name }, this.parent);
                        }
                        this.parent.saveBaseInfo("equipInfo");
                    }
                }
                this.parent.taskAction(SeDefine_1.TaskAction.EquipEnhance, 1, equip.eType, equip.eLevel, equip.iColor);
                global.logMgr.equipLog(this.parent, 'enhance', equip.eId, equip.kId, [], equip.eLevel, equip.eLevel - 1, equip.enchant);
                break;
            }
            case 'addstar': {
                equip = this.getHaveEquip(data.eId);
                if (!equip)
                    return;
                let star_limit = parseInt(global.resMgr.getConfig('EquipLimit')[equip.iColor - 1].split(',')[1]) || 10;
                if (equip.eStar >= star_limit)
                    return;
                let bfExp = equip.eEXP;
                var equip_res = global.resMgr.equipattrRes.getRes(equip.kId);
                let equipenhance = global.resMgr.getEquipenhanceRes(interface_1.SeEnumequipenhanceeBuildType.ShengXing, equip.eType, equip.eStar + 1);
                let items = equipenhance[this.equipenhanceColor[equip.iColor]];
                //升星
                let use_equip_ids = data.useEquip;
                let exp_add_all = 0;
                for (let i = 0; i < use_equip_ids.length; i++) {
                    var use_equip = this.getHaveEquip(use_equip_ids[i]);
                    //没有升星所需装备
                    if (!use_equip || use_equip.eType != equip.eType || use_equip.kId != equip.kId || use_equip.isLocked) {
                        continue;
                    }
                    //获取装备对应的经验值
                    exp_add_all += use_equip.eEXP + parseInt(equip_res.akstarExp[use_equip.eStar].split(',')[0]);
                }
                //使用道具并删除装备
                if (this.useItems(items, exp_add_all)) {
                    let level_max = this.delEquipsAndGetMaxLevel(use_equip_ids, equip.eLevel);
                    equip.eLevel = level_max;
                    equip.eEXP += exp_add_all;
                }
                //判断是否能够升星
                let isAddStar = false;
                while (equip.eStar < equip_res.akstarExp.length - 1 && equip.eEXP >= parseInt(equip_res.akstarExp[equip.eStar].split(',')[1])) {
                    if (equip.eStar >= star_limit)
                        break;
                    equip.eEXP = equip.eEXP - parseInt(equip_res.akstarExp[equip.eStar].split(',')[1]);
                    equip.eStar++;
                    isAddStar = true;
                    this.parent.taskAction(SeDefine_1.TaskAction.EquipStar, 1, equip.eType, equip.eStar, equip.iColor);
                    global.logMgr.equipLog(this.parent, 'addstar', equip.eId, equip.kId, [], equip.eStar, equip.eStar - 1, equip.enchant);
                }
                //4星之后需要通知
                if (isAddStar && equip.iColor >= interface_1.SeEnumequipattriColor.Cheng && equip.eStar >= 4) {
                    this.parent.sendAnnouncement(interface_1.SeEnumnoticetexteType.ChengZhuangShengXing, { equipname: equip.kId, equipStar: equip.eStar, charname: this.parent.name }, this.parent);
                }
                this.parent.taskAction(SeDefine_1.TaskAction.EquipExp, 1, equip.eType, exp_add_all);
                global.logMgr.equipLog(this.parent, 'addexp', equip.eId, equip.kId, [], equip.eEXP, bfExp, equip.enchant);
                this.parent.saveBaseInfo("equipInfo");
                break;
            }
            case 'decompose': {
                //分解
                //固定返还
                var equipIds = data.eId.split(",");
                //减少和客户端交互次数,item统一添加
                var item_all = [];
                var equipKIds = [];
                for (let k = 0; k < equipIds.length; k++) {
                    let equip = this.getHaveEquip(equipIds[k]);
                    if (!equip || equip.isLocked) {
                        continue;
                    }
                    equipKIds.push(equip.kId);
                    //升星费用返还
                    var equip_res = global.resMgr.equipattrRes.getRes(equip.kId);
                    //获取装备对应的经验值
                    let exp = parseInt(equip_res.akstarExp[equip.eStar].split(',')[0]);
                    let exp_all = exp + equip.eEXP;
                    let equipenhance_star = global.resMgr.getEquipenhanceRes(interface_1.SeEnumequipenhanceeBuildType.ShengXing, equip.eType, equip.eStar);
                    let items_star = equipenhance_star[this.equipenhanceColor[equip.iColor] + 'decompose'];
                    for (let i = 0; i < items_star.length; i++) {
                        if (items_star[i].split(',')[0] == 'W002') {
                            TeTool_1.remove_duplicate({ kItemID: items_star[i].split(',')[0], iPileCount: Number(items_star[i].split(',')[1]) * (exp_all > 0 ? exp_all - 1 : exp_all) }, item_all);
                        }
                        else {
                            TeTool_1.remove_duplicate({ kItemID: items_star[i].split(',')[0], iPileCount: Number(items_star[i].split(',')[1]) * exp_all }, item_all);
                        }
                    }
                    //强化费用也返还
                    let equipenhance_level = global.resMgr.getEquipenhanceRes(interface_1.SeEnumequipenhanceeBuildType.QiangHua, equip.eType, equip.eLevel);
                    let items_level = equipenhance_level[this.equipenhanceColor[equip.iColor] + 'decompose'];
                    for (let i = 0; i < items_level.length; i++) {
                        TeTool_1.remove_duplicate({ kItemID: items_level[i].split(',')[0], iPileCount: Number(items_level[i].split(',')[1]) }, item_all);
                    }
                    //删除装备
                    for (var i = 0; i < this.equipInfo.haveEquips.length; i++) {
                        let equip = this.equipInfo.haveEquips[i];
                        if (equip && equip.eId == equipIds[k]) {
                            this.equipInfo.haveEquips.splice(i, 1);
                        }
                    }
                }
                //统一添加
                if (!this.parent.addItems(item_all, 'equip_decompose')) {
                    break;
                }
                equip = equipIds;
                this.parent.saveBaseInfo("equipInfo");
                global.logMgr.equipLog(this.parent, 'decompose', data.eId, equipKIds.join(','), item_all, 0, 0, equip.enchant);
                break;
            }
            case 'enchant': {
                equip = this.getHaveEquip(data.eId);
                if (!equip)
                    return;
                let useItems = [];
                let enchantRes = global.resMgr.getEquipEnchantRes(equip.iColor, equip.eStar);
                //锁魔
                if (data.lockIndex) {
                    let lock_indexs = data.lockIndex.split(',');
                    let curr = lock_indexs.length;
                    if (curr > 0) {
                        //扣东西
                        let lock_items = global.resMgr.getConfig("Enchant_lock");
                        for (let k = 0; k < lock_items.length; k++) {
                            if (lock_items[k].split(',')[0] == curr.toString()) {
                                if (!this.parent.delItem('W110', Number(lock_items[k].split(',')[1]))) {
                                    break;
                                }
                                TeTool_1.remove_duplicate({ kItemID: 'W110', iPileCount: Number(lock_items[k].split(',')[1]) }, useItems);
                            }
                        }
                    }
                }
                //消耗金币
                let gold_count = Number(global.resMgr.getConfig("Enchant_cost")[0].split(',')[equip.iColor - 1]);
                if (!this.parent.useGold(gold_count)) {
                    break;
                }
                TeTool_1.remove_duplicate({ kItemID: 'W002', iPileCount: gold_count }, useItems);
                //消耗附魔石
                let enchant_count = Number(global.resMgr.getConfig("Enchant_cost")[1].split(',')[equip.iColor - 1]);
                if (!this.parent.delItem('W109', enchant_count)) {
                    break;
                }
                TeTool_1.remove_duplicate({ kItemID: 'W109', iPileCount: enchant_count }, useItems);
                //创建池子
                let random_pool = [];
                for (let key in global.resMgr.equipEnchantProRes.resData) {
                    random_pool.push(global.resMgr.equipEnchantProRes.resData[key]);
                }
                //赋值到最近附魔属性
                //如果所有属性都是0，附魔值必不小于0
                let all_zero = this.check_all_zero(equip);
                for (let i = 0; i < this.enchantProperty.length; i++) {
                    let key = this.enchantProperty[i];
                    if (data.lockIndex.indexOf(i.toString()) != -1) {
                        equip.last_enchant[key] = equip.enchant[key];
                        continue;
                    }
                    let lucky = TeTool_1.arrayRandomT(random_pool, "iPro");
                    let value = Number((equip.enchant[key] + (lucky.iMaxStar / 10000) * enchantRes[key]).toFixed(1));
                    if (value > enchantRes[key]) {
                        value = enchantRes[key];
                    }
                    else if (value < 0) {
                        if (all_zero) {
                            value = -1 * value;
                        }
                        else {
                            value = 0;
                        }
                    }
                    equip.last_enchant[key] = value;
                }
                this.parent.taskAction(SeDefine_1.TaskAction.EquipEnchant, 1, equip.eType, equip.iColor);
                global.logMgr.equipLog(this.parent, 'enchant', equip.eId, equip.kId, useItems, 0, 0, equip.last_enchant);
                this.parent.saveBaseInfo("equipInfo");
                break;
            }
            case 'enchantConfirm': {
                equip = this.getHaveEquip(data.eId);
                if (!equip)
                    return;
                for (let i = 0; i < this.enchantProperty.length; i++) {
                    let key = this.enchantProperty[i];
                    //成功后使用附魔值
                    if (data.confirm) {
                        equip.enchant[key] = equip.last_enchant[key];
                    }
                    //重置附魔值
                    equip.last_enchant[this.enchantProperty[i]] = equip.enchant[key];
                }
                this.parent.saveBaseInfo("equipInfo");
                break;
            }
            case 'chongzhu': {
                //冷却时间是否到了
                if (this.parent.baseInfo.next_chongzhu_time < Date.now()) {
                    let old_equip = this.getHaveEquip(data.eId);
                    if (!old_equip || old_equip.iColor != interface_1.SeEnumequipattriColor.Cheng || old_equip.isLocked || old_equip.isWeared)
                        return;
                    var equip_res = global.resMgr.equipattrRes.getRes(old_equip.kId);
                    //获取装备对应的经验值,扣除相应钻石
                    let exp_add_all = old_equip.eEXP + parseInt(equip_res.akstarExp[old_equip.eStar].split(',')[0]);
                    if (!this.parent.decMoney(exp_add_all * parseInt(global.resMgr.getConfig('chongzhuValue')), '')) {
                        return;
                    }
                    //删除原装备
                    for (var i = 0; i < this.equipInfo.haveEquips.length; i++) {
                        let have_equip = this.equipInfo.haveEquips[i];
                        if (have_equip && have_equip.eId == data.eId) {
                            this.equipInfo.haveEquips.splice(i, 1);
                            global.netMgr.sendEquip(this.parent.linkid, 'decompose', data.eId, notice);
                        }
                    }
                    //添加新装备
                    equip = new SePlayerDef_1.SeEquip(global.resMgr.getEquipRes(data.kId), this.parent.id, this.equipInfo.allEquips);
                    equip.iColor = old_equip.iColor;
                    equip.eLevel = old_equip.eLevel;
                    equip.eEXP = old_equip.eEXP;
                    equip.enchant = old_equip.enchant;
                    equip.eStar = old_equip.eStar;
                    this.equipInfo.allEquips++;
                    this.equipInfo.haveEquips.push(equip);
                    this.parent.taskAction(SeDefine_1.TaskAction.EquipAdd, 1, equip.eType, equip.iColor);
                    this.parent.saveBaseInfo("equipInfo");
                    //通知添加新装备
                    global.netMgr.sendEquip(this.parent.linkid, 'add', equip, notice);
                    global.logMgr.equipLog(this.parent, 'add', equip.eId, equip.kId, [], equip.eLevel, equip.eLevel, equip.enchant);
                    this.parent.baseInfo.next_chongzhu_time = Date.now() + parseInt(global.resMgr.getConfig('chongzhuTime')) * 1000;
                    global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'next_chongzhu_time', this.parent.baseInfo.next_chongzhu_time);
                    this.parent.saveBaseInfo("next_chongzhu_time");
                }
                break;
            }
            default: {
                break;
            }
        }
        global.netMgr.sendEquip(this.parent.linkid, data.type, equip, notice);
    }
    check_all_zero(equip) {
        for (let i = 0; i < this.enchantProperty.length; i++) {
            let key = this.enchantProperty[i];
            if (equip.enchant[key] != 0) {
                return false;
            }
        }
        return true;
    }
    cheat_add_equip(kId, eLevel, eStar) {
        let equip = new SePlayerDef_1.SeEquip(global.resMgr.getEquipRes(kId), this.parent.id, this.equipInfo.allEquips);
        equip.eLevel = parseInt(eLevel);
        equip.eStar = parseInt(eStar);
        this.equipInfo.allEquips++;
        this.equipInfo.haveEquips.push(equip);
        this.parent.saveBaseInfo("equipInfo");
        global.netMgr.sendEquip(this.parent.linkid, 'add', equip, true);
    }
    cheat_set_equip_All(eLevel, eStar) {
        for (var key in this.equipInfo.haveEquips) {
            this.equipInfo.haveEquips[key].eLevel = parseInt(eLevel);
            this.equipInfo.haveEquips[key].eStar = parseInt(eStar);
        }
        this.parent.saveBaseInfo("equipInfo");
    }
    /**
     * 获取装备
     */
    getHaveEquip(equipID) {
        for (var i = 0; i < this.equipInfo.haveEquips.length; i++) {
            var equip = this.equipInfo.haveEquips[i];
            if (equip && equip.eId == equipID) {
                return equip;
            }
        }
        return null;
    }
    /**
    * 获取装备
    */
    get equipInfo() {
        return this.parent.baseInfo.equipInfo;
    }
    //获取装备固定和百分比加成总额
    getEquipAddByType(equips) {
        var equipAdd = [0, 0, 0, 0];
        var wearEquips = [];
        if (equips && equips.length > 0) {
            wearEquips = equips;
        }
        else {
            var wearEquipsId = this.parent.baseInfo.lords[this.parent.baseInfo.lord].wear_equips;
            for (let i = 0; i < wearEquipsId.length; i++) {
                let equip = this.getHaveEquip(wearEquipsId[i]);
                wearEquips.push(equip);
            }
        }
        if (wearEquips.length > 0) {
            for (let i = 0; i < wearEquips.length; i++) {
                let equip = wearEquips[i];
                let equipRes = global.resMgr.equipattrRes.getRes(equip.kId);
                //每件装备都看下有没解锁星级对应的技能
                equipAdd[0] += equipRes.iUnitAtk + equipRes.iUnitAtkLevelGrow * (equip.eLevel - 1) + equipRes.iUnitAtkStarGrow * equip.eStar;
                equipAdd[2] += equipRes.iUnitHp + equipRes.iUnitHpLevelGrow * (equip.eLevel - 1) + equipRes.iUnitHpStarGrow * equip.eStar;
                equip.enchant && (equipAdd[1] += equip.enchant.iUnitAtk);
                equip.enchant && (equipAdd[3] += equip.enchant.iUnitHp);
                for (let j = 0; j < equipRes.akSuperpowerStar.length; j++) {
                    if (equip.eStar >= parseInt(equipRes.akSuperpowerStar[j])) {
                        let superpowerres = global.resMgr.equipsuperpowerRes.getRes(equipRes.akSuperpower[j]);
                        if (superpowerres.eType == interface_1.SeEnumequipsuperpowereType.DanWeiGongJiTiShengBaiFenBi) {
                            equipAdd[0] += superpowerres.iValue * 100;
                        }
                        else if (superpowerres.eType == interface_1.SeEnumequipsuperpowereType.DanWeiGongJiTiShengGuDingZhi) {
                            equipAdd[1] += superpowerres.iValue;
                        }
                        else if (superpowerres.eType == interface_1.SeEnumequipsuperpowereType.DanWeiXueLiangTiShengBaiFenBi) {
                            equipAdd[2] += superpowerres.iValue * 100;
                        }
                        else if (superpowerres.eType == interface_1.SeEnumequipsuperpowereType.DanWeiXueLiangTiShengGuDingZhi) {
                            equipAdd[3] += superpowerres.iValue;
                        }
                    }
                }
            }
        }
        return equipAdd;
    }
    //获取装备加成总额
    getEquipAdd() {
        var equipAdd = 0;
        var wearEquips = this.parent.baseInfo.lords[this.parent.baseInfo.lord].wear_equips;
        if (wearEquips) {
            for (let i = 0; i < wearEquips.length; i++) {
                let equip = this.getHaveEquip(wearEquips[i]);
                let equipRes = global.resMgr.equipattrRes.getRes(equip.kId);
                equipAdd += equipRes.iUnitAtk + equipRes.iUnitAtkLevelGrow * (equip.eLevel - 1) + equipRes.iUnitAtkStarGrow * equip.eStar;
                equipAdd += equipRes.iUnitHp + equipRes.iUnitHpLevelGrow * (equip.eLevel - 1) + equipRes.iUnitHpStarGrow * equip.eStar;
                equipAdd += equipRes.iMagicAtk + equipRes.iMagicAtkLevelGrow * (equip.eLevel - 1) + equipRes.iMagicAtkStarGrow * equip.eStar;
                equipAdd += equipRes.iCastleAtk + equipRes.iCastleAtkLevelGrow * (equip.eLevel - 1) + equipRes.iCastleAtkStarGrow * equip.eStar;
                equipAdd += equipRes.iCastleHp + equipRes.iCastleHpLevelGrow * (equip.eLevel - 1) + equipRes.iCastleHpStarGrow * equip.eStar;
            }
        }
        return equipAdd;
    }
    //获取当前主公穿戴装备
    getLordEquip() {
        var equips = [];
        var wearEquips = this.parent.baseInfo.lords[this.parent.baseInfo.lord].wear_equips;
        if (wearEquips) {
            for (let i = 0; i < wearEquips.length; i++) {
                let equip = this.getHaveEquip(wearEquips[i]);
                equips.push(equip);
            }
        }
        return equips;
    }
    useItems(items, count) {
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            if (global.resMgr.TownItemRes.getRes(item.split(',')[0]).eTypeA == interface_1.SeEnumTownItemeTypeA.JinYuanBao) {
                if (!this.parent.useGold(Number(item.split(',')[1]) * count)) {
                    break;
                }
            }
            else {
                if (!this.parent.delItem(item.split(',')[0], Number(item.split(',')[1]) * count)) {
                    break;
                }
            }
            if (i == items.length - 1) {
                return true;
            }
        }
        return false;
    }
    delEquipsAndGetMaxLevel(use_equip_ids, now_level) {
        //删除升星所需消耗装备
        for (let i = 0; i < use_equip_ids.length; i++) {
            for (var k = 0; k < this.equipInfo.haveEquips.length; k++) {
                let have_equip = this.equipInfo.haveEquips[k];
                if (have_equip && have_equip.eId == use_equip_ids[i]) {
                    this.equipInfo.haveEquips.splice(k, 1);
                    now_level = Math.max(now_level, have_equip.eLevel);
                    break;
                }
            }
        }
        global.netMgr.sendEquip(this.parent.linkid, 'useEquip', use_equip_ids, true);
        return now_level;
    }
}
exports.SeEquipMgr = SeEquipMgr;
//# sourceMappingURL=SeEquipMgr.js.map