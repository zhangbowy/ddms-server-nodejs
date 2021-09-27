"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpgradeLib = void 0;
const interface_1 = require("../Res/interface");
const TeTool_1 = require("../TeTool");
const SeDefine_1 = require("../SeDefine");
class UpgradeLib {
    /**
     * 英雄数值调整的版本
     * @param heros
     * @param targetVer
     * @param currVer
     */
    static heroUpgrade(heros, targetVer, currVer) {
        return true;
        if (targetVer == currVer)
            return false;
        for (var i = 0; i < heros.length; i++) {
            // 这里检查一下
            var rHero = heros[i];
            var newInfo = this.call_upgrade('userver', interface_1.SeEnumupgradetargetType.YingXiong, currVer, targetVer, rHero.kHeroID, { iLevel: rHero.iLevel, iCount: rHero.iCount });
            rHero.iCount = newInfo.iCount;
            rHero.iLevel = newInfo.iLevel;
        }
        return true;
    }
    static itemUpgrade(items, targetVer, currVer) {
        if (targetVer == currVer)
            return false;
        return true;
        for (let i = 0; i < items.length; i++) {
            var rHero = items[i];
            rHero.iPileCount = this.call_upgrade('userver', interface_1.SeEnumupgradetargetType.DaoJuShuLiang, currVer, targetVer, rHero.kItemID, rHero.iPileCount);
        }
        return true;
    }
    static ScoreUpgrade(iLevel, score, targetVer, currVer) {
        if (targetVer == currVer)
            return score;
        return score;
        var newInfo = this.call_upgrade('userver', interface_1.SeEnumupgradetargetType.YingXiong, currVer, targetVer, '', { iLevel: iLevel, iCount: score });
        return newInfo.iCount;
    }
    static regist_upgrade(targetType, fun) {
        this.F_Map.set(targetType, fun);
    }
    static call_upgrade(key, targetType, targetVer, srcVer, targetID, value) {
        var rvs = global.resMgr.getUpdateKeyVer(key);
        for (var i = 0; i < rvs.length; i++) {
            var rver = rvs[i];
            if (rver < srcVer)
                continue;
            if (rver >= targetVer)
                break;
            var fun = this.F_Map.get(targetType);
            if (!fun)
                continue;
            var res = global.resMgr.getUpgradeInfo(key, rver, targetType, targetID);
            if (!res)
                res = global.resMgr.getUpgradeInfo(key, rver, targetType, 'default');
            if (!res)
                continue;
            value = fun(res, value);
        }
        return value;
    }
}
exports.UpgradeLib = UpgradeLib;
UpgradeLib.F_Map = new TeTool_1.TeMap();
function LevevlCountUpgrade(res, value) {
    // 判断一下 实际的等级
    var realHero = SeDefine_1.func_copy(value);
    var iRate = 0;
    for (var i = 0; i < res.akSrcLevel.length; i++) {
        var iNeed = parseInt(res.akSrcLevel[i]);
        if (i == realHero.iLevel) {
            if (realHero.iCount >= iNeed) {
                realHero.iLevel += 1;
                realHero.iCount -= iNeed;
            }
            else {
                if (res.eMode == interface_1.SeEnumupgradeeMode.BaiFenBi) {
                    iRate = realHero.iCount / iNeed;
                }
                else if (res.eMode == interface_1.SeEnumupgradeeMode.ShengYuZhi) {
                    iRate = realHero.iCount;
                }
                break;
            }
        }
    }
    // 这里操作实际等级的转换
    var targetLevel = Math.min(Math.max(realHero.iLevel + res.iConvet, 1), global.resMgr.MaxHeroLvl);
    // 把等级撤退回来
    realHero.iLevel = Math.min(Math.max(value.iLevel + res.iConvet, 1), global.resMgr.MaxHeroLvl);
    realHero.iCount = 0;
    // 把数量撤退回来
    for (var i = realHero.iLevel; i < res.akTargetLevel.length; i++) {
        var iNeed = parseInt(res.akTargetLevel[i]);
        if (i < targetLevel) {
            realHero.iCount += iNeed;
        }
        else {
            if (res.eMode == interface_1.SeEnumupgradeeMode.BaiFenBi) {
                realHero.iCount += Math.floor(iNeed * iRate);
            }
            else if (res.eMode == interface_1.SeEnumupgradeeMode.ShengYuZhi) {
                realHero.iCount += iRate;
            }
            break;
        }
    }
    return realHero;
}
/**
 * 数量升级
 */
function ItemCountUpgrade(res, value) {
    let srcInt = parseInt(res.akSrcLevel[0]);
    let dstInt = parseInt(res.akTargetLevel[0]);
    let c_rate = dstInt / srcInt;
    let ot = Math.ceil(value * c_rate);
    return ot;
}
UpgradeLib.regist_upgrade(interface_1.SeEnumupgradetargetType.YingXiong, LevevlCountUpgrade);
UpgradeLib.regist_upgrade(interface_1.SeEnumupgradetargetType.ZhuChengDengJi, LevevlCountUpgrade);
UpgradeLib.regist_upgrade(interface_1.SeEnumupgradetargetType.DaoJuShuLiang, ItemCountUpgrade);
//# sourceMappingURL=VerUpgrade.js.map