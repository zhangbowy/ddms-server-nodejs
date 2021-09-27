"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeHeroCardMgr = void 0;
const SePlayerDef_1 = require("./SePlayerDef");
const SeDefine_1 = require("../SeDefine");
const Table = require("../Res/interface");
const VerUpgrade_1 = require("./VerUpgrade");
const TeTool_1 = require("../TeTool");
class SeHeroCardMgr {
    constructor(parent) {
        this._totalCardNum = 0;
        this._totalCardScore = 0;
        this.m_pkParent = parent;
    }
    get linkid() {
        return this.m_pkParent.linkid;
    }
    get baseInfo() {
        return this.m_pkParent.baseInfo;
    }
    get state() {
        return this.m_pkParent.state;
    }
    saveHeroCards() {
        this.m_pkParent.saveBaseInfo('heros');
    }
    /**
     * 登陆的时候检查阵容信息
     */
    checkHerosWhenLoad() {
        var change = false;
        // 检查一下玩家英雄卡之类的数据   如果玩家没有英雄卡，就初始化一些给玩家
        //UB83  UB82  UB81 UB79  UB78  UB77 UB74  UB72
        var allHeros = (global.resMgr.getConfig('player_default_cards') || "U101,U104,U118,U113,U124,S003,U112,U111,Z000,Z008").split(',');
        for (var key = 0; key < allHeros.length; key++) {
            // var kHeroID = globalMgr().resMgr.randomCard();
            var kHeroID = allHeros[key];
            if (!this.getHeroCard(kHeroID) && this.addHeroCard(kHeroID, 1, false)) {
                change = true;
            }
        }
        // 某一个版本要调整数值，这里就需要记录一下啊了,做一个功能实现一下
        if (VerUpgrade_1.UpgradeLib.heroUpgrade(this.baseInfo.heros, this.baseInfo.version, global.resMgr.getConfig('userver'))) {
            change = true;
        }
        if (change) {
            this.saveHeroCards();
        }
        // 登陆的时候计算一下玩家当前拥有的总卡数
        this._initTotalCard();
        return change;
    }
    /**
     * 登陆的时候检查阵容信息
     */
    checkFormationsWhenLoad() {
        var change = false;
        // 检查一下玩家是否需要给他初始化一个阵容
        for (var fi = 0; fi < 4; fi++) {
            if (this.getPlanFormationLen(fi) < 1) {
                var vecFormations = [];
                // vecFormations.push(null);
                var posIndex = 0;
                for (var keyi = 0; keyi < this.heroCards.length && vecFormations.length < 8; keyi++) {
                    var pkUnitRes = global.resMgr.UnitRes.getRes(this.heroCards[keyi].kHeroID);
                    if (pkUnitRes.iSoldierType != Table.SeEnumUnitiSoldierType.Ta) {
                        // 这里从第一排第三个开始
                        vecFormations.push(this.heroCards[keyi].kHeroID);
                    }
                }
                this.setPlanFormation(fi, vecFormations);
                change = true;
            }
        }
        if (this.checkBoss()) {
            change = true;
        }
        if (this.checkskin()) {
            change = true;
        }
        if (global.resMgr.getConfig("closeBattleTalks") != "true" && this.checkBattleTalks()) {
            change = true;
        }
        return change;
    }
    checkBattleTalks() {
        // 修正表情bug
        let skins = [].concat(this.baseInfo.battleTalks);
        if (skins.length == 0) {
            skins = ["T001", "T003", "T005", "T007"];
        }
        return this.m_pkParent.equip_battle("BattleTalk", skins);
    }
    //校验主城是否过期
    checkBoss() {
        if (typeof this.bossFormation == 'string' && this.baseInfo.bosss[this.bossFormation] > Date.now()) {
            return false;
        }
        //使用默认经典的
        this.bossFormation = 'Z000';
        return true;
    }
    /**
     * 获取英雄卡
     */
    getHeroCard(kHeroID) {
        for (var i = 0; i < this.heroCards.length; i++) {
            var herocard = this.heroCards[i];
            if (herocard && herocard.kHeroID == kHeroID) {
                return herocard;
            }
        }
        return null;
    }
    /**
     * 获取英雄皮肤
     */
    getHeroSkin(kHeroID) {
        let heroskin = this.m_pkParent.baseInfo.heros_skin[kHeroID];
        if (!heroskin) {
            return;
        }
        return heroskin['cur_skin'];
    }
    /**
     * 删除英雄卡
     */
    delHeroCard(kHeroID) {
        for (var i = 0; i < this.heroCards.length; i++) {
            var herocard = this.heroCards[i];
            if (herocard && herocard.kHeroID == kHeroID) {
                this.heroCards.splice(i, 1);
                return herocard;
            }
        }
        return null;
    }
    _initTotalCard() {
        for (var i = 0; i < this.heroCards.length; i++) {
            var rkCard = this.heroCards[i];
            var pkCardRes = global.resMgr.UnitRes.getRes(rkCard.kHeroID);
            if (!pkCardRes)
                continue;
            var count = global.resMgr.cardSumCostToLevel(rkCard.iLevel - 1) + rkCard.iCount + 1;
            this._totalCardNum += count;
            this._totalCardScore += count * (SePlayerDef_1.HeroBoxColorScore[pkCardRes.iColour] || 1);
        }
    }
    get totalCard() {
        return this._totalCardNum;
    }
    get totalCardScore() {
        return this._totalCardScore;
    }
    get totalHero() {
        return this.heroCards.length;
    }
    /**
     * 批量添加英雄,如果kid==gold的话支持添加金币
     * @param lists
     */
    addHeroCardBatch(lists, notice = true, boxID) {
        var addGold = 0;
        var addItems = 0;
        var ids = {};
        //加不进卡牌之后的补偿
        var changeCount = {};
        var changeGolds = {};
        var changeItems = {};
        for (var i = 0; i < lists.length; i++) {
            var kID = lists[i].kid;
            var type = lists[i].type;
            var nm = (lists[i].num || 0);
            if (kID == 'gold') {
                addGold += nm;
            }
            else if (type == Table.SeEnumchancekItemType.DanWei) {
                // 添加单位
                var rres = global.resMgr.UnitRes.getRes(kID);
                if (rres) {
                    var _changes = this.addHeroCard(kID, nm, true);
                    if (_changes) {
                        changeCount[kID] = (changeCount[kID] || 0) + _changes['cNum'];
                        changeGolds[kID] = (changeGolds[kID] || 0) + _changes['cGolds'];
                        changeItems[kID] = (changeItems[kID] || 0) + _changes['cItems'];
                        nm = nm - _changes['cNum'];
                        addGold = addGold + _changes['cGolds'];
                        addItems = addItems + _changes['cItems'];
                    }
                    ids[kID] = (ids[kID] || 0) + nm;
                }
            }
            else if (type == Table.SeEnumchancekItemType.DaoJu) {
                //骰子活动reason不同，客户端有特殊处理
                let reason = 'addherocard';
                if (boxID == 'CK17') {
                    reason = 'shaiZiShop';
                    this.baseInfo.shaizi_activity_count += nm;
                    this.m_pkParent.saveBaseInfo('shaizi_activity_count');
                    global.netMgr.sendCharMiscUpdate(this.linkid, 'shaizi_activity_count', this.baseInfo.shaizi_activity_count);
                }
                // 添加道具
                this.m_pkParent.addItem(kID, nm, reason);
            }
            else if (type == Table.SeEnumchancekItemType.ZhuangBei) {
                this.m_pkParent.m_equipMgr.equip_opr({ type: 'add', kId: kID }, notice);
                ids[kID] = (ids[kID] || 0) + 1;
            }
            else {
                // 兼容老的格式
                var rres = global.resMgr.UnitRes.getRes(kID);
                if (rres) {
                    var _changes = this.addHeroCard(kID, nm, true);
                    if (_changes) {
                        changeCount[kID] = (changeCount[kID] || 0) + _changes['cNum'];
                        changeGolds[kID] = (changeGolds[kID] || 0) + _changes['cGolds'];
                        changeItems[kID] = (changeItems[kID] || 0) + _changes['cItems'];
                        nm = nm - _changes['cNum'];
                        addGold = addGold + _changes['cGolds'];
                        addItems = addItems + _changes['cItems'];
                    }
                    ids[kID] = (ids[kID] || 0) + nm;
                }
                else {
                    this.m_pkParent.addItem(kID, nm, 'addherocard');
                }
            }
        }
        var upCards = [];
        for (var key in ids) {
            let upCard = this.getHeroCard(key);
            if (upCard) {
                upCards.push(upCard);
            }
        }
        var changeCards = [];
        for (var key in changeGolds) {
            changeCards.push({ kid: key, cNum: changeCount[key], cGolds: changeGolds[key], cItems: changeItems[key] });
        }
        this.saveHeroCards();
        if (this.m_pkParent.bInitComplete && upCards.length > 0)
            global.netMgr.sendCharMiscUpdate(this.linkid, 'upheros', upCards, null, notice ? '' : 'pvenewawards');
        var baseGold = this.m_pkParent.gold;
        this.m_pkParent.changeGold(baseGold + addGold, changeCards, notice);
        //如果不需要通知，reason填'pvenewawards'就不通知
        if (notice) {
            this.m_pkParent.addItem('BD01', addItems, 'upheros');
        }
        else {
            this.m_pkParent.addItem('BD01', addItems, 'pvenewawards');
        }
        return { ids: ids, changes: changeCards };
    }
    resetHeroLv(...arg) {
        if (!arg || arg.length == 0)
            return;
        var colorLevel = [];
        for (var i = 0; i < 9; i++) {
            colorLevel[i] = arg[i] ? arg[i] : arg[arg.length - 1];
        }
        for (var i = 0; i < this.baseInfo.heros.length; i++) {
            var rkHero = this.baseInfo.heros[i];
            var rkHeroRes = global.resMgr.UnitRes.getRes(rkHero.kHeroID);
            if (!rkHeroRes)
                continue;
            var mxLvl = global.resMgr.cardMxLvl(rkHero.kHeroID);
            var num = colorLevel[rkHeroRes.iColour - 1];
            rkHero.iLevel = Math.min(num, mxLvl);
        }
        this.saveHeroCards();
        if (this.m_pkParent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.linkid, 'upheros', this.baseInfo.heros);
    }
    /**
     * 添加英雄卡
     * @param kHeroID
     * @returns {kid, cNum, cGolds} 超过卡牌上限的补偿
     */
    addHeroCard(kHeroID, num = 1, nosave = false) {
        var rkHeroRes = global.resMgr.UnitRes.getRes(kHeroID);
        if (!rkHeroRes) {
            return;
        }
        //用来做上限校验补偿
        var changes;
        num = Math.max(num, 1);
        var beforeNum = 0;
        var rkHeroCard = this.getHeroCard(kHeroID);
        if (!rkHeroCard) {
            rkHeroCard = new SePlayerDef_1.SeHeroCard();
            rkHeroCard.kHeroID = kHeroID;
            rkHeroCard.iCount = num;
            this.heroCards.push(rkHeroCard);
            if (this.m_pkParent.loadComplete && !nosave) {
                if (this.m_pkParent.bInitComplete)
                    global.netMgr.sendCharMiscUpdate(this.linkid, 'addhero', rkHeroCard);
                this.saveHeroCards();
            }
        }
        else {
            //从体验英雄卡替换到英雄卡
            if (rkHeroCard.oExtra) {
                rkHeroCard.oExtra = null;
                rkHeroCard.iLevel = 1;
            }
            //上限校验
            //这边的卡牌数量会把历史遗留的卡牌超出数量也干掉
            var mxCards = global.resMgr.cardMxCards(kHeroID, rkHeroCard.iLevel);
            if (rkHeroRes.iColour == Table.SeEnumUnitiColour.Cheng) {
                if (rkHeroCard.iCount + num > mxCards) {
                    var __count = rkHeroCard.iCount + num - mxCards;
                    var __item = __count * rkHeroRes.iGold;
                    num = num - __count;
                    changes = { kid: kHeroID, cNum: __count, cGolds: 0, cItems: __item };
                }
            }
            else {
                if (rkHeroCard.iCount + num > mxCards) {
                    var __count = rkHeroCard.iCount + num - mxCards;
                    var __gold = __count * rkHeroRes.iGold;
                    num = num - __count;
                    changes = { kid: kHeroID, cNum: __count, cGolds: __gold, cItems: 0 };
                }
            }
            beforeNum = rkHeroCard.iCount;
            rkHeroCard.iCount += num;
            if (this.m_pkParent.loadComplete && !nosave) {
                if (this.m_pkParent.bInitComplete)
                    global.netMgr.sendCharMiscUpdate(this.linkid, 'uphero', rkHeroCard);
                this.saveHeroCards();
                //计算补偿的金币数据
                var baseGold = this.m_pkParent.gold;
                var __changeCards = [changes];
                if (changes && changes.cGolds != 0)
                    this.m_pkParent.changeGold(baseGold + changes['cGolds'], __changeCards);
                if (changes && changes.cItems != 0)
                    this.m_pkParent.addItem('BD01', changes['cItems'], 'uphero');
            }
        }
        // if (!nosave) {
        global.logMgr.heroLog(this.m_pkParent, 'add', kHeroID, rkHeroCard.iCount, beforeNum);
        // global.logMgr.heroLog(this.m_pkParent, 'level', _kHeroID, rkHeroCard.iLevel, rkHeroCard.iLevel - 1);
        // }
        this._totalCardNum += num;
        this._totalCardScore += num * (SePlayerDef_1.HeroBoxColorScore[rkHeroRes.iColour] || 1);
        return changes;
    }
    /**
     * 添加体验英雄卡
     * 目前的策略是 新卡直接替换老卡
     * @param _kHeroID 武将id
     */
    addTryHeroCard(kHeroID, level, extra, nosave = false) {
        var rkHeroRes = global.resMgr.UnitRes.getRes(kHeroID);
        if (!rkHeroRes) {
            return;
        }
        // var beforeNum = 0;
        var _type = 'uphero';
        var _changes_gold = 0;
        var rkHeroCard = this.getHeroCard(kHeroID);
        if (rkHeroCard) {
            var rankRes = global.resMgr.getConfig("rankFactor");
            var matchRes = global.resMgr.getConfig("matchFactor");
            var dateRes = global.resMgr.getConfig("dateFactor");
            if (!rkHeroCard.oExtra) {
                //存在英雄卡
                if (extra['ltype'] == 'match') {
                    _changes_gold = Math.floor(rkHeroRes.iGold * parseFloat(matchRes) * extra['lvalue']);
                }
                else if (extra['ltype'] == 'date') {
                    _changes_gold = Math.floor(rkHeroRes.iGold * parseFloat(dateRes) * ((extra['lvalue'] - Date.now()) / 86400000));
                }
                else if (extra['ltype'] == 'rank') {
                    _changes_gold = Math.floor(rkHeroRes.iGold * parseFloat(rankRes) * (extra['lvalue'] - this.m_pkParent.pvp_level));
                }
                _changes_gold = Math.max(_changes_gold, 10);
            }
            else {
                //存在限制英雄卡
                //替换掉老卡
                if (rkHeroCard.oExtra['ltype'] == 'match') {
                    _changes_gold = Math.floor(rkHeroRes.iGold * parseFloat(matchRes) * rkHeroCard.oExtra['lvalue']);
                }
                else if (rkHeroCard.oExtra['ltype'] == 'date') {
                    _changes_gold = Math.floor(rkHeroRes.iGold * parseFloat(dateRes) * ((rkHeroCard.oExtra['lvalue'] - Date.now()) / 86400000));
                }
                else if (rkHeroCard.oExtra['ltype'] == 'rank') {
                    _changes_gold = Math.floor(rkHeroRes.iGold * parseFloat(rankRes) * (rkHeroCard.oExtra['lvalue'] - this.m_pkParent.pvp_level));
                }
                _changes_gold = Math.max(_changes_gold, 10);
                rkHeroCard.oExtra = extra;
                rkHeroCard.iLevel = level;
            }
        }
        else {
            rkHeroCard = new SePlayerDef_1.SeHeroCard();
            rkHeroCard.kHeroID = kHeroID;
            rkHeroCard.iCount = 0;
            rkHeroCard.oExtra = extra;
            rkHeroCard.iLevel = level;
            this.heroCards.push(rkHeroCard);
            _type = 'addhero';
        }
        if (this.m_pkParent.loadComplete && !nosave) {
            if (this.m_pkParent.bInitComplete)
                global.netMgr.sendCharMiscUpdate(this.linkid, _type, rkHeroCard);
            this.saveHeroCards();
            if (_changes_gold > 0) {
                var baseGold = this.m_pkParent.gold;
                var __changeCards = [{ kid: kHeroID, cNum: 1, cGolds: _changes_gold }];
                this.m_pkParent.changeGold(baseGold + _changes_gold, __changeCards);
            }
        }
        // if (!nosave) {
        // global.logMgr.heroLog(this.m_pkParent, 'add', kHeroID, rkHeroCard.iCount, beforeNum);
        // global.logMgr.heroLog(this.m_pkParent, 'level', kHeroID, rkHeroCard.iLevel, rkHeroCard.iLevel - 1);
        // }
    }
    /**
     * 体验英雄卡校验
     */
    checkTryHeroCard() {
        var df = this.defaultFomation;
        for (var i = 0; i < df.length; i++) {
            var herocard = this.getHeroCard(df[i]);
            if (herocard && herocard.oExtra && herocard.oExtra['ltype'] && herocard.oExtra['lvalue']) {
                switch (herocard.oExtra['ltype']) {
                    case "rank":
                        if (herocard.oExtra['lvalue'] <= this.m_pkParent.pvp_level)
                            return false;
                        break;
                    case "date":
                        if (herocard.oExtra['lvalue'] + 60 * 1000 < Date.now())
                            return false; //这里多加1分钟的兼容, 防止客户端与服务器的时间不一致造成bug
                        break;
                    case "match":
                        if (herocard.oExtra['lvalue'] <= 0)
                            return false;
                        break;
                }
            }
        }
        return true;
    }
    checkDuplicateHeroCard() {
        var duplicate = false;
        var df = this.defaultFomation;
        for (let i = 0; i < df.length; i++) {
            let heroId = df[i];
            for (let j = i + 1; j < df.length; j++) {
                if (heroId == df[j]) {
                    //重复，阵容设置为初始值
                    duplicate = true;
                }
            }
        }
        var default_cards = (global.resMgr.getConfig('player_default_cards') || "U101,U104,U118,U113,U124,S003,U112,U111").split(',');
        if (default_cards.length > 8) {
            default_cards = default_cards.slice(0, 8);
        }
        if (duplicate) {
            for (let i = 0; i < this.formation.length; i++) {
                this.setPlanFormation(i, default_cards);
            }
        }
    }
    /**
     * 体验英雄卡状态更新
     * 目前只对局数限制的做更新, 限时和限段直接设置到临界值, 让客户端判断
     */
    updateTryHeroCard(ltype) {
        var upheros = [];
        var df = this.defaultFomation;
        for (var i = 0; i < df.length; i++) {
            var herocard = this.getHeroCard(df[i]);
            if (herocard && herocard.oExtra && herocard.oExtra['ltype'] == ltype && herocard.oExtra['lvalue']) {
                if (herocard.oExtra['lvalue'] > 0) {
                    herocard.oExtra['lvalue'] = herocard.oExtra['lvalue'] - 1;
                    upheros.push(herocard);
                }
            }
        }
        //通知
        if (upheros.length > 0) {
            if (this.m_pkParent.bInitComplete)
                global.netMgr.sendCharMiscUpdate(this.linkid, 'upheros', upheros);
        }
    }
    /**
     * 体验英雄卡删除
     * @param heroIDs 需要删除的id列表
     */
    delTryHeroCard(heroIDs) {
        var delheros = [];
        for (var i = 0; i < heroIDs.length; i++) {
            var herocard = this.getHeroCard(heroIDs[i]);
            //简单校验. 只要是体验卡就行了 张亨炜
            if (herocard && herocard.oExtra) {
                this.delHeroCard(heroIDs[i]);
                //邮件通知
                let rkHeroRes = global.resMgr.UnitRes.getRes(heroIDs[i]);
                let strRes = global.resMgr.getConfig("trialCardExpire");
                if (strRes) {
                    //ydq 已经改为多语言客户端翻译, 直接组装转义的语句
                    let message = rkHeroRes.kName + TeTool_1.LangID(strRes);
                    global.playerMgr.onGiveMail(this.m_pkParent.plt, this.m_pkParent.id, SeDefine_1.SeMailType.SYSTEM, message);
                }
                delheros.push(herocard);
            }
        }
        //通知
        if (delheros.length > 0) {
            if (this.m_pkParent.bInitComplete)
                global.netMgr.sendCharMiscUpdate(this.linkid, 'delhero', delheros);
        }
    }
    /**
     * 清除玩家身上发生满溢的英雄卡
     * 这个地方没有加uphero通知, 因为只有在玩家登录还没收到武将牌通知的时候才调用！
     * @returns 补偿金币
     */
    clearHeroCard() {
        for (var i = 0; i < this.heroCards.length; i++) {
            var golds = 0;
            var herocard = this.heroCards[i];
            if (herocard) {
                let mxCards = global.resMgr.cardMxCards(herocard.kHeroID, herocard.iLevel);
                if (herocard.iCount > mxCards) {
                    let rkHeroRes = global.resMgr.UnitRes.getRes(herocard.kHeroID);
                    if (rkHeroRes) {
                        golds = (herocard.iCount - mxCards) * rkHeroRes.iGold;
                        let beforeNum = herocard.iCount;
                        herocard.iCount = mxCards;
                        global.logMgr.heroLog(this.m_pkParent, 'update', herocard.kHeroID, herocard.iCount, beforeNum);
                        //发送补偿邮件
                        var strRes = global.resMgr.getConfig("maxLevelCard");
                        if (strRes && golds > 0) {
                            //ydq 已经改为多语言客户端翻译, 直接组装转义的语句
                            let message = rkHeroRes.kName + TeTool_1.LangID(strRes) + " " + (beforeNum - mxCards) + TeTool_1.LangID("353") /**卡牌 */ + " " + golds + TeTool_1.LangID("352") /**金币 */;
                            global.playerMgr.onGiveMail(this.m_pkParent.plt, this.m_pkParent.id, SeDefine_1.SeMailType.SYSTEM, message, [{ kItemID: "W002", iPileCount: golds }]);
                        }
                    }
                }
            }
        }
        //保存到数据库
        this.saveHeroCards();
    }
    _get_hero_color(heroID) {
        // var rkCard: SeHeroCard;
        if (typeof heroID != 'string') {
            heroID = heroID.kHeroID; // = heroID;
        }
        var pkRes = global.resMgr.UnitRes.getRes(heroID);
        if (pkRes)
            return pkRes.iColour;
        return 0;
    }
    upgradeCard(cardID) {
        var rkCard = this.getHeroCard(cardID);
        if (!rkCard)
            return false;
        var cost = global.resMgr.cardLvlCost(cardID, rkCard.iLevel);
        if (!cost) {
            return false;
        }
        if (rkCard.iLevel >= global.resMgr.MaxHeroLvl) {
            return false;
        }
        if (rkCard.iCount < cost.card && cost.card >= 0) {
            return false;
        }
        //扣除金币，不足的话退出。。。。注意这里直接扣除了。。。后面如果还有判断条件，要把这个放到最后
        if (cost.gold >= 0 && !this.m_pkParent.useGold(cost.gold)) {
            return false;
        }
        var beforeNum = rkCard.iCount;
        rkCard.iCount -= cost.card;
        rkCard.iLevel += 1;
        this.m_pkParent.score += cost.exp;
        this.saveHeroCards();
        this.m_pkParent.taskAction(SeDefine_1.TaskAction.HeroUp, rkCard.kHeroID, rkCard.iLevel);
        global.logMgr.heroLog(this.m_pkParent, 'del', rkCard.kHeroID, rkCard.iCount, beforeNum);
        global.logMgr.heroLog(this.m_pkParent, 'level', rkCard.kHeroID, rkCard.iLevel, rkCard.iLevel - 1);
        if (this.m_pkParent.loadComplete) {
            if (this.m_pkParent.bInitComplete)
                global.netMgr.sendCharMiscUpdate(this.linkid, 'uphero', rkCard);
        }
        var pkRes = global.resMgr.UnitRes.getRes(rkCard.kHeroID);
        if (!pkRes)
            return true;
        let up_level = global.resMgr.getConfig('qulity_change').split(',');
        switch (pkRes.iColour) {
            case Table.SeEnumUnitiColour.Lan:
                if (rkCard.iLevel >= 10) {
                    this.m_pkParent.sendAnnouncement(Table.SeEnumnoticetexteType.LanKaShengJi, { cardlevel: rkCard.iLevel + Number(up_level[1]), cardname: pkRes.kID }, this.m_pkParent);
                }
                break;
            case Table.SeEnumUnitiColour.Zi:
                if (rkCard.iLevel >= 8) {
                    this.m_pkParent.sendAnnouncement(Table.SeEnumnoticetexteType.ZiKaShengJi, { cardlevel: rkCard.iLevel + Number(up_level[2]), cardname: pkRes.kID }, this.m_pkParent);
                }
                break;
            case Table.SeEnumUnitiColour.Cheng:
                if (rkCard.iLevel >= 3) {
                    this.m_pkParent.sendAnnouncement(Table.SeEnumnoticetexteType.JinKaShengJi, { cardlevel: rkCard.iLevel + Number(up_level[3]), cardname: pkRes.kID }, this.m_pkParent);
                }
                break;
        }
        return true;
    }
    set defaultPlan(plan) {
        // this.m_pkParent.clearCampainSelectCard();
        if (plan < 0 || plan == this.baseInfo.defaultPlan) {
            return;
        }
        this.baseInfo.defaultPlan = plan;
        this.m_pkParent.saveBaseInfo('defaultPlan');
        if (this.m_pkParent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.linkid, 'f_plan', plan);
    }
    get defaultPlan() {
        return this.baseInfo.defaultPlan;
    }
    get defaultFomation() {
        return this.getPlanFormation(this.defaultPlan);
    }
    /**
     * 获取英雄卡
     */
    get heroCards() {
        return this.baseInfo.heros;
    }
    get shangjinHeroCards() {
        return this.baseInfo.shangjinHeroCards;
    }
    /**
     * 获取上阵阵容
     */
    get formation() {
        return this.baseInfo.formation;
    }
    /**
     * 获取pve对战上阵阵容
     */
    get pve_pk_formation() {
        return this.baseInfo.pve_pk_formation;
    }
    /**
    * 获取赏金赛上阵阵容
    */
    get shangjinFormation() {
        return this.baseInfo.shangjinFormation;
    }
    /**
     * 获得主城
     * @param id
     * @param timeout
     */
    addbosss(id, timeout, convert_zuanshi, reason) {
        //已有永久的直接返回钻石
        if (this.baseInfo.bosss[id] && this.baseInfo.bosss[id] >= new Date("2050-01-01 00:00:00").getTime()) {
            this.m_pkParent.addItem('W001', convert_zuanshi, 'addboss', id);
            return;
        }
        //已有限时的已过期或得到了永久的
        else if (this.baseInfo.bosss[id] && (this.baseInfo.bosss[id] <= Date.now() || timeout >= new Date("2050-01-01 00:00:00").getTime())) {
        }
        //已有限时的未过期，并获得了限时的则返回钻石
        else if (this.baseInfo.bosss[id] && (this.baseInfo.bosss[id] > Date.now())) {
            this.m_pkParent.addItem('W001', convert_zuanshi, 'addboss', id);
        }
        //永久的替代限时的
        // else if (this.baseInfo.bosss[id] && this.baseInfo.bosss[id] >= timeout) {
        //     this.m_pkParent.addItem('W001', convert_zuanshi, 'addboss', id);
        //     return;
        // }
        this.baseInfo.bosss[id] = timeout;
        this.m_pkParent.saveBaseInfo('bosss');
        if (this.m_pkParent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.linkid, 'bosss', this.baseInfo.bosss, null, reason);
    }
    checkskin() {
        let flush = false;
        let now = Date.now();
        for (let heroid in this.baseInfo.heros_skin) {
            let skininfo = this.baseInfo.heros_skin[heroid];
            for (let i = 0; i < skininfo['skins'].length;) {
                if (skininfo['skins'][i]['time'] >= now) {
                    i++;
                    continue;
                }
                if (skininfo['skins'][i].kid == skininfo['cur_skin']) {
                    delete skininfo['cur_skin'];
                }
                skininfo['skins'].splice(i, 1);
                flush = true;
            }
        }
        if (flush) {
            this.m_pkParent.saveBaseInfo('heros_skin');
            if (this.m_pkParent.bInitComplete)
                global.netMgr.sendCharMiscUpdate(this.linkid, 'heros_skin', this.baseInfo.heros_skin);
        }
        return flush;
    }
    /**
     * 获得英雄皮肤
     * @param id 英雄id
     * @param timeout
     */
    addskin(id, timeout, convert_gold, reason) {
        let skinRes = global.resMgr.HeroSkinRes.getRes(id);
        if (!this.baseInfo.heros_skin[skinRes.kHeroId]) {
            this.baseInfo.heros_skin[skinRes.kHeroId] = { skins: [] };
        }
        let skins = this.baseInfo.heros_skin[skinRes.kHeroId]['skins'];
        let skinitem;
        for (let i in skins) {
            if (id == skins[i].kid) {
                skinitem = skins[i];
                break;
            }
        }
        //永久的替代限时的
        if (skinitem && skinitem['time'] >= timeout) {
            this.m_pkParent.gold = this.m_pkParent.gold + convert_gold;
            return;
        }
        if (skinitem)
            skinitem.time = timeout;
        else
            skins.push({ kid: id, time: timeout });
        this.m_pkParent.saveBaseInfo('heros_skin');
        if (this.m_pkParent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.linkid, 'heros_skin_id', skinRes.kHeroId, this.baseInfo.heros_skin[skinRes.kHeroId], reason);
    }
    setCurskin(id, heroid) {
        if (!this.baseInfo.heros_skin[heroid]) {
            return;
        }
        if (id) {
            let skins = this.baseInfo.heros_skin[heroid]['skins'];
            let skinitem;
            for (let i in skins) {
                if (id == skins[i].kid) {
                    skinitem = skins[i];
                    break;
                }
            }
            if (!skinitem || skinitem['time'] < Date.now()) {
                return;
            }
            this.baseInfo.heros_skin[heroid]['cur_skin'] = id;
        }
        else {
            //id为空为默认的皮肤
            delete this.baseInfo.heros_skin[heroid]['cur_skin'];
        }
        this.m_pkParent.saveBaseInfo('heros_skin');
        if (this.m_pkParent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.linkid, 'heros_skin_id', heroid, this.baseInfo.heros_skin[heroid]);
    }
    get bossFormation() {
        return this.baseInfo.bossFormation;
    }
    set bossFormation(bossId) {
        if (this.bossFormation == bossId) {
            return;
        }
        if (!this.baseInfo.bosss[bossId] || this.baseInfo.bosss[bossId] < Date.now()) {
            return;
        }
        this.baseInfo.bossFormation = bossId;
        this.m_pkParent.saveBaseInfo("bossFormation");
        if (this.m_pkParent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.linkid, 'bossFormation', this.bossFormation);
    }
    get campboss() {
        return this.baseInfo.battlecampboss;
    }
    set campboss(campbossId) {
        if (this.campboss == campbossId) {
            return;
        }
        if (!this.getHeroCard(campbossId)) {
            return;
        }
        this.baseInfo.battlecampboss = campbossId;
        this.m_pkParent.saveBaseInfo("battlecampboss");
        if (this.m_pkParent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.linkid, 'battlecampboss', this.campboss);
    }
    get matchFormation() {
        var fm = [];
        var df = this.defaultFomation;
        for (var i = 0; i < df.length; i++) {
            var kID = df[i];
            var cardInfo = this.getHeroCard(df[i]);
            fm.push({ kHeroID: kID, iLevel: (cardInfo && cardInfo.iLevel) || 1, kSkin: this.getHeroSkin(df[i]) });
        }
        return fm;
    }
    get matchShangjinFormation() {
        var fm = [];
        var df = this.shangjinFormation;
        for (var i = 0; i < df.length; i++) {
            var kID = df[i];
            var cardInfo = this.getHeroCard(df[i]);
            fm.push({ kHeroID: kID, iLevel: global.resMgr.getHeroPerLevel(kID), kSkin: this.getHeroSkin(df[i]) });
        }
        return fm;
    }
    get matchBossFormation() {
        // var df = this.defaultBoss;
        // for (var i = 0; i < df.length; i++) {
        var kID = this.bossFormation;
        var cardInfo = this.getHeroCard(kID);
        var fm1 = { kHeroID: kID, iLevel: (cardInfo && cardInfo.iLevel) || 1 };
        var fm2 = { kHeroID: kID, iLevel: this.m_pkParent.level };
        // }
        // 这里存储 主城 和 主公
        return [fm1, fm2];
    }
    getPlanFormation(plan) {
        if (this.formation.length <= plan) {
            return [];
        }
        return this.formation[plan];
    }
    getPlanFormationLen(plan) {
        if (this.formation.length <= plan) {
            return 0;
        }
        var akForm = this.formation[plan];
        var len = 0;
        for (var key in akForm) {
            if (akForm[key]) {
                len++;
            }
        }
        return len;
    }
    /**
     * 设置阵容
     */
    setPlanFormation(plan, formation) {
        // this.m_pkParent.clearCampainSelectCard();
        plan = plan || 0;
        formation = formation || [];
        if (!this.formation[plan]) {
            this.formation[plan] = [];
        }
        //var maxFormationNum = global.resMgr.getMaxHeroNum(this.level);
        var maxFormationNum = 8;
        var heroNum = formation.length;
        // 这里按照玩家状态进行设置 玩家可以使用的阵型英雄数收到玩家战阶影响
        if (!formation || heroNum > maxFormationNum) {
            return this.formation[plan];
        }
        var canUseHeros = [];
        // 这里可以从所有英雄阵容中判断
        // canUseHeros = this.heroCards;
        for (var oneKey in this.heroCards) {
            var oneHeroCard = this.heroCards[oneKey];
            if (!oneHeroCard) {
                continue;
            }
            canUseHeros.push(oneHeroCard.kHeroID);
        }
        for (var key in formation) {
            var keyHeroID = formation[key];
            if (keyHeroID) {
                var pkUnitRes = global.resMgr.UnitRes.getRes(keyHeroID);
                if (canUseHeros.indexOf(keyHeroID) < 0 || pkUnitRes.iSoldierType == Table.SeEnumUnitiSoldierType.Ta) {
                    return this.formation[plan];
                }
            }
        }
        if (this.formation[plan].join(',') != formation.join(',')) {
            this.formation[plan] = formation;
            if (this.m_pkParent.loadComplete) {
                this.m_pkParent.saveBaseInfo('formation');
            }
        }
        return this.formation[plan];
    }
    /**
     * 设置带pve属性放置玩法阵容
     */
    setPlanPVEPKFormation(plan, formation) {
        plan = plan || 0;
        let lordId = '';
        // if(formation['lord']) lordId = formation['lord'].id;
        // if(lordId && this.baseInfo.lords[lordId].wear_equips){
        //     var wear_equips = [];
        //     for(let i = 0; i < this.baseInfo.lords[lordId].wear_equips.length; i++){
        //         wear_equips.push(this.m_pkParent.m_equipMgr.getHaveEquip(this.baseInfo.lords[lordId].wear_equips[i]));
        //     }
        //     formation['lord'] = {id: lordId, equips: wear_equips};
        // }
        this.pve_pk_formation[plan] = formation;
        if (this.m_pkParent.loadComplete) {
            this.m_pkParent.saveBaseInfo('pve_pk_formation');
        }
        //如果是防守阵容的话通知榜单服修改
        if (plan == 1) {
            let chart_res = global.resMgr.getChartTableByType(SeDefine_1.SeChartType.SCT_GLOBAL_PVE_OFFLINE);
            if (chart_res && this.m_pkParent.pvpMgr.pve_pk_rank <= chart_res.iMaxPlayer) {
                global.globalChartMgr.sendCSData({ cmd: 'changepvepkformation', seasonid: this.m_pkParent.pvpMgr.seasonid, uid: this.m_pkParent.id, formation: formation, pve_pk_extra_info: this.m_pkParent.pve_pk_extra_info });
            }
        }
        return this.pve_pk_formation[plan];
    }
    refreshPvePkFormation() {
        for (let i = 0; i < this.pve_pk_formation.length; i++) {
            if (!this.pve_pk_formation[i]) {
                this.pve_pk_formation[i] = {};
            }
        }
    }
    /**
     * 设置赏金赛阵容
     */
    setShangjinFormation(shangjinFormation) {
        shangjinFormation = shangjinFormation || [];
        //var maxFormationNum = global.resMgr.getMaxHeroNum(this.level);
        var maxFormationNum = 8;
        var heroNum = shangjinFormation.length;
        // 这里按照玩家状态进行设置 玩家可以使用的阵型英雄数收到玩家战阶影响
        if (!shangjinFormation || heroNum > maxFormationNum) {
            return this.shangjinFormation;
        }
        var canUseHeros = [];
        // 这里可以从所有英雄阵容中判断
        // canUseHeros = this.heroCards;
        for (var oneKey in this.shangjinHeroCards) {
            var oneHeroCard = this.shangjinHeroCards[oneKey];
            if (!oneHeroCard) {
                continue;
            }
            canUseHeros.push(oneHeroCard);
        }
        if (!this.m_pkParent.hasProperty(SeDefine_1.PlayerProperty.GM_COMPETIOR)) {
            for (var key in shangjinFormation) {
                var keyHeroID = shangjinFormation[key];
                if (keyHeroID) {
                    var pkUnitRes = global.resMgr.UnitRes.getRes(keyHeroID);
                    if (canUseHeros.indexOf(keyHeroID) < 0 || pkUnitRes.iSoldierType == Table.SeEnumUnitiSoldierType.Ta) {
                        return this.shangjinFormation;
                    }
                }
            }
        }
        if (this.shangjinFormation.join(',') != shangjinFormation.join(',')) {
            this.baseInfo.shangjinFormation = shangjinFormation;
            if (this.m_pkParent.loadComplete) {
                this.m_pkParent.saveBaseInfo('shangjinFormation');
            }
        }
        return this.shangjinFormation;
    }
    //检查某卡牌是否少于指定张数,若未拥有则直接给予
    check_card_num_limit(kHeroID, heroBoxZZYid) {
        let rkHeroCard = this.getHeroCard(kHeroID);
        if (!rkHeroCard) {
            return null;
            // if(heroBoxZZYid == 'HD01'){
            //     let max = Number(global.resMgr.getConfig('card_need_low').split(',')[1]);
            //     let min = Number(global.resMgr.getConfig('card_need_low').split(',')[0]);
            //     return Math.floor(Math.random() * (max - min + 1) + min);
            // } 
            // else if(heroBoxZZYid == 'HD02'){
            //     let max = Number(global.resMgr.getConfig('card_need_high').split(',')[1]);
            //     let min = Number(global.resMgr.getConfig('card_need_high').split(',')[0]);
            //     return Math.floor(Math.random() * (max - min + 1) + min);
            // }
            // if(heroBoxZZYid == 'HD05'){
            //     let max = Number(global.resMgr.getConfig('card_need_low').split(',')[1]);
            //     let min = Number(global.resMgr.getConfig('card_need_low').split(',')[0]);
            //     return Math.floor(Math.random() * (max - min + 1) + min);
            // } 
            // else if(heroBoxZZYid == 'HD06'){
            //     let max = Number(global.resMgr.getConfig('card_need_high').split(',')[1]);
            //     let min = Number(global.resMgr.getConfig('card_need_high').split(',')[0]);
            //     return Math.floor(Math.random() * (max - min + 1) + min);
            // }
        }
        let currNum = rkHeroCard.iCount;
        if (!global.resMgr.HeroRankRes.getRes(rkHeroCard.iLevel)) {
            return null;
        }
        else {
            let upNeedNum = global.resMgr.HeroRankRes.getRes(rkHeroCard.iLevel).iHeroLvNeed - currNum;
            return upNeedNum;
        }
        return null;
    }
    _total_level_(formation) {
        var fA = formation ? formation : this.matchFormation;
        var totalLevel = 0;
        for (var i = 0; i < fA.length; i++) {
            var rkInfo = fA[i];
            if (!rkInfo)
                continue;
            var pkRes = global.resMgr.UnitRes.getRes(rkInfo.kHeroID);
            var level = rkInfo.iLevel;
            if (pkRes) {
                // 高级卡牌相当于普通卡牌的高级版
                level += (pkRes.iColour - 1) * 2;
            }
            totalLevel += level;
        }
        return totalLevel;
    }
}
exports.SeHeroCardMgr = SeHeroCardMgr;
//# sourceMappingURL=SeHeroCardMgr.js.map