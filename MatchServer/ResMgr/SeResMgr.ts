import * as TableRes from "../Res/interface";
var respath = './Res/';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { func_copy, SeLogicFormation } from "../SeDefine";
import { HashMap, TeMap } from '../lib/TeTool';
import { configInst } from "../lib/TeConfig";

// 判断文件是否指定的类型
function is_filetype(filename, types) {
    types = types.split(',');
    var pattern = '\.(';
    for (var i = 0; i < types.length; i++) {
        if (0 != i) {
            pattern += '|';
        }
        pattern += types[i].trim();
    }
    pattern += ')$';
    return new RegExp(pattern, 'i').test(filename);
}

// 删除文件的指定后缀
function del_filetype(filename, types) {
    types = types.split(',');
    var pattern = '\.(';
    for (var i = 0; i < types.length; i++) {
        if (0 != i) {
            pattern += '|';
        }
        pattern += types[i].trim();
    }
    pattern += ')$';

    return filename.replace(new RegExp(pattern, 'i'), '');
}

function _getJsonObjLength(jsonObj) {
    var Length = 0;
    for (var item in jsonObj) {
        Length++;
    }
    return Length;
}


class PltFileList {
    private _file_list: string[] = [];
    private _plt_file_config: { [kid: string]: TableRes.SeResGameServer };

    static _inst: PltFileList;

    static get_plt_file(filename: string, plt?: string) {
        if (!this._inst) {
            this._inst = new PltFileList();
        }

        return this._inst.get_plt_file(filename, plt);
    }
    constructor() {
        this.readFileList();
        this.readGameServerInfo();
    }

    private readFileList() {
        try {
            var read_data = fs.readFileSync(path.join(respath, '_flielist_.json'));
            var js_data = JSON.parse(read_data.toString());
            this._file_list = js_data['_files_'] || [];
        }
        catch (e) {

        }
    }

    private readGameServerInfo() {
        try {
            this._plt_file_config = JSON.parse(fs.readFileSync(path.join(respath), 'GameServer.json').toString());
        }
        catch (e) {

        }
    }

    private findConfigPlts(plt: string, appid?: string) {
        let outlist: string[] = [];
        if (this._plt_file_config) {
            // 如果配置文件存在的话就加载配置文件中的
            for (let key in this._plt_file_config) {
                let rinfo = this._plt_file_config[key];
                if (appid && rinfo.kappid != appid) continue;
                if (rinfo.kPlt != plt) continue;

                if (rinfo.kFirstTable) outlist.push('_' + rinfo.kFirstTable);
                if (rinfo.kDefaultTable) outlist.push('_' + rinfo.kDefaultTable);
                break;
            }
        }
        else {
            // 如果配置文件加载失败的话 ，默认加载plt的和通用的
            outlist.push("_" + plt);
        }

        return outlist;
    }

    get_plt_file(filename: string, plt?: string) {
        if (!plt) {
            plt = configInst.get('plt');
        }
        let loadList = this.findConfigPlts(plt || '');
        let index1 = filename.indexOf('.');
        let head = filename.slice(0, index1);
        let ext = filename.slice(index1, filename.length);
        for (let i = 0; i < loadList.length; i++) {
            let checkame = head + loadList[i] + ext;
            if (this._file_list.indexOf(checkame) >= 0) {
                return checkame;
            }
        }

        return filename;
    }
}


class SeResModule<T>{
    public resData: any = {};
    public length: number = 0;
    private _loaded: Function;
    public md5: string = '';
    private _keyName: string = "";

    constructor(jsonname: string, caller?: Object, loaded?: Function, keyName: string = "") {
        if (caller) {
            if (typeof caller == 'function') {
                this._loaded = caller;
            }
            else if (loaded) {
                this._loaded = loaded.bind(caller);
            }
        }
        this._keyName = keyName;

        // 处理的时候分为文件夹和文件两个模式
        if (is_filetype(jsonname, '.json')) {
            // 文件模式下面，正常加载数据
            var fileName = path.join(respath, jsonname);
            this._loadFile(fileName);
            fs.watchFile(fileName, this._onFileChange.bind(this, fileName));
        }
        else {
            // 文件夹模式下面，加载的数据放到统一的一个目录下面，获取数据接口使用一个
            var pathdir = respath + jsonname;
            var Files = fs.readdirSync(pathdir);
            for (var num = 0; num < Files.length; num++) {
                var file = pathdir + Files[num];
                var stat = fs.lstatSync(file);
                if (is_filetype(file, '.json')) {
                    var fileInfo = fs.readFileSync(file).toString();
                    var allData = JSON.parse(fileInfo);
                    var name = 'k' + del_filetype(Files[num], 'json');
                    if (!this.resData) {
                        this.resData = {};
                    }

                    this.resData[name] = [];
                    for (var key in allData) {
                        if (allData.hasOwnProperty(key) && key != 'Template') {
                            this.resData[name][key] = allData[key];
                        }
                    }
                }
            }

            this.length = _getJsonObjLength(this.resData);
        }

        if (this._loaded) {
            setTimeout(this._loaded, 1);
        }
    }

    private _loadFile(jsonname) {
        this.resData = {};
        var fileInfo = fs.readFileSync(jsonname).toString();

        this.md5 = createHash('md5').update(fileInfo).digest('hex');

        var allData = JSON.parse(fileInfo);
        for (var key in allData) {
            if (allData.hasOwnProperty(key) && key != 'Template') {
                if (this._keyName != "" && allData[key][this._keyName]) {
                    var diyKey = allData[key][this._keyName];
                    this.resData['k' + diyKey] = allData[key];
                } else {
                    this.resData['k' + key] = allData[key];
                }
            }
        }

        this.length = _getJsonObjLength(this.resData);
    }

    private _onFileChange(jsonname: string, curr: fs.Stats, prev: fs.Stats) {
        if (prev.ctime.getTime() == 0) {
            //console.log('文件被创建!');
            this._loadFile(jsonname);
        } else if (curr.ctime.getTime() == 0) {
            // console.log('文件被删除!')
            this.resData = {};
            this.length = 0;
        } else if (curr.mtime.getTime() != prev.mtime.getTime()) {
            // console.log('文件有修改');
            this._loadFile(jsonname);
            if (this._loaded) {
                setTimeout(this._loaded, 1);
            }
        }
    }

    public getAllRes() {
        return this.resData;
    };

    public getRes(id): T {
        id = 'k' + id;
        if (this.resData.hasOwnProperty(id)) {
            return this.resData[id];
        }
        return null;
    };

    //根据条件过滤获得列表
    public getResBy(filter: Function) : Array<T> {
        let result = [];
        for (let key in this.resData) {
            if (filter(this.resData[key]))
                result.push(this.resData[key]);
        }
        return result;
    }

    public getRandom() {
        var randIndex = Math.floor(Math.random() * this.length);
        for (var key in this.resData) {
            randIndex--;
            if (randIndex <= 0) {
                return this.resData[key];
            }
        }

        return null;
    }

    public has(id): boolean {
        id = 'k' + id;
        if (this.resData.hasOwnProperty(id)) {
            return true;
        }
        return false;
    }
}

export interface SeResUnitEx extends TableRes.SeResUnit {
    aiBattleScore?: Array<number>;
    aiShowBattleScore?: Array<number>;
}


export interface ifCamp2UnlockUnit {
    lv: number;
    ids: Array<Array<string>>;     // 每个颜色对应的解锁的卡牌id
}

class SeResMgr {
    private _ready: boolean = false;

    private _plt_: string = '';

    public configMap: TeMap<string> = new TeMap<string>();
    public ConfigMapRes: SeResModule<TableRes.SeResConfigMaps>;

    public UnitRes: SeResModule<SeResUnitEx>;

    public BattleRankRes: SeResModule<TableRes.SeResBattleRank>;
    public BattleRankGroupRes: Array<Array<TableRes.SeResBattleRank>>;
    public AreaRes: SeResModule<TableRes.SeResArea>;
    public LordAIinfoRes: SeResModule<TableRes.SeResLordAIinfo>;
    public HeroRankRes: SeResModule<TableRes.SeResHeroRank>;
    public EquipattrRes: SeResModule<TableRes.SeResequipattr>;
    public LevelUpCounts: Array<number>;    // 英雄等级对应的卡牌数量
    public AILordInfo = {};   //玩家主城等级对应的ai主公
    public MaxHeroLvl: number;
    public MaxLvl: number = 0;


    public SumCamp2UnlockLevel: Array<ifCamp2UnlockUnit> = [];
    public SumArmyCamp2UnlockLevel: Array<ifCamp2UnlockUnit> = [];  // 地方单位解锁用的

    public constructor(plt: string) {
        this._plt_ = plt || configInst.get('plt');

        this.UnitRes = new SeResModule(PltFileList.get_plt_file('Unit.json', this._plt_), this, () => {
            this._unitInit();
        });

        // this.RobotMapRes = new SeResModule('Robotmap/');
        this.BattleRankRes = new SeResModule(PltFileList.get_plt_file('BattleRank.json', this._plt_), this, () => {
            this.BattleRankGroupRes = [];
            for (var key in this.BattleRankRes.resData) {
                var rInfo = this.BattleRankRes.resData[key];
                rInfo && (this.MaxLvl = Math.max(rInfo.iBattleRank, this.MaxLvl));
                if(!this.BattleRankGroupRes[rInfo.iBattleRank]) this.BattleRankGroupRes[rInfo.iBattleRank] = [];
                this.BattleRankGroupRes[rInfo.iBattleRank].push(rInfo);
            }
        });
        this.HeroRankRes = new SeResModule(PltFileList.get_plt_file('HeroRank.json', this._plt_), this, () => {
            this._heroRankInit();
        });
        this.EquipattrRes = new SeResModule(PltFileList.get_plt_file('equipattr.json', this._plt_), this);
        this.ConfigMapRes = new SeResModule<TableRes.SeResConfigMaps>(PltFileList.get_plt_file('ConfigMaps.json', this._plt_), this, () => {
            this.configMap.clear();
            for (var key in this.ConfigMapRes.resData) {
                var rInfo = <TableRes.SeResConfigMaps>this.ConfigMapRes.resData[key];
                if (!rInfo || !rInfo.kKey) continue;
                this.configMap.set(rInfo.kKey, rInfo.kValue);
            }
        });

        this.AreaRes = new SeResModule(PltFileList.get_plt_file('Area.json', this._plt_));
        this.LordAIinfoRes = new SeResModule(PltFileList.get_plt_file('LordAIinfo.json', this._plt_), this, () => {
            this._LordAIinfoInit();
        });
        this._ready = true;
        // ac表格有子事件需要解析的，这里提前处理掉

        this._heroRankInit();
    }

    public init() {
        this._ready = true;
    }

    public saveFiles(fileInfos: Array<{ name: string, md5: string, info: string }>) {
        for (var i = 0; i < fileInfos.length; i++) {
            var rkInfo = fileInfos[i];
            if (createHash('md5').update(rkInfo.info).digest('hex') != rkInfo.md5) continue;

            fs.writeFileSync(path.join(respath, rkInfo.name + '.json'), rkInfo.info);
        }
    }

    /**
     * 限定几个文件是需要同步的
     */
    getFilesMd5(): Array<{ name: string, info: string, md5: string }> {
        var out = [];
        return out;
    }
    private _heroRankInit() {
        if (!this._ready) {
            return;
        }
        this.LevelUpCounts = [0];
        this.MaxHeroLvl = 0;
        for (var key in this.HeroRankRes.resData) {
            var rkT = <TableRes.SeResHeroRank>this.HeroRankRes.resData[key];
            rkT.iBlueExp
            if (rkT.iHeroLv > this.MaxHeroLvl) {
                this.MaxHeroLvl = rkT.iHeroLv;
            }

            this.LevelUpCounts[rkT.iHeroLv] = rkT.iHeroLvNeed;
        }
        // 最大等级等于rank表配置的等级+1
        this.MaxHeroLvl += 1;

        for (var i = 1; i < this.LevelUpCounts.length; i++) {
            var count = this.LevelUpCounts[i - 1] || 0;
            this.LevelUpCounts[i] = (this.LevelUpCounts[i] || 0) + count;
        }


        this._unitInit();
    }

    private _LordAIinfoInit() {
        if (!this._ready) {
            return;
        }
        for (var key in this.LordAIinfoRes.resData) {
            let castel_Level = this.LordAIinfoRes.resData[key].icastleLv;
            if(!this.AILordInfo[castel_Level]){
                this.AILordInfo[castel_Level] = [];
            }
            this.AILordInfo[castel_Level].push(this.LordAIinfoRes.resData[key]);
        }
    }

    private _unitUnlock2IDs: Array<Array<string>> = [];

    private _unitInit() {
        if (!this._ready) {
            return;
        }
        this._unitUnlock2IDs = [];
        var maxColorLevel = 0;

        var t1: Array<ifCamp2UnlockUnit> = [], t2: Array<ifCamp2UnlockUnit> = [];
        var tempKey: Object = {}, tempKey2: Object = {};

        for (var key in this.UnitRes.resData) {
            var rkUnit = <SeResUnitEx>this.UnitRes.resData[key];
            rkUnit.aiBattleScore = [];
            rkUnit.aiShowBattleScore = [];
            for (var i = 0; i < this.MaxHeroLvl; i++) {
                var iScore = SeResMgr.cardBattleScoreConst(rkUnit, i);
                rkUnit.aiBattleScore.push(iScore);
                rkUnit.aiShowBattleScore.push(iScore);
            }

            if (rkUnit.iSoldierType == TableRes.SeEnumUnitiSoldierType.Ta) {
                if (rkUnit.iOpenGrade > -1) {
                    if (!this._unitUnlock2IDs[rkUnit.iOpenGrade]) {
                        this._unitUnlock2IDs[rkUnit.iOpenGrade] = [];
                    }

                    this._unitUnlock2IDs[rkUnit.iOpenGrade].push(rkUnit.kID);
                }
            }
            else {
                if (rkUnit.iOpenGrade > -1) {
                    var ig = 'i' + (rkUnit.iOpenGrade || 0);
                    if (!tempKey.hasOwnProperty(ig)) {
                        tempKey[ig] = t1.length;
                        t1.push({ lv: rkUnit.iOpenGrade || 0, ids: [] });
                    }
                    var rcu = t1[tempKey[ig]];
                    var arr = rcu.ids[rkUnit.iColour] || []
                    arr.push(rkUnit.kID);
                    rcu.ids[rkUnit.iColour] = arr;
                }

                if (rkUnit.iOpen > -1) {
                    var ig = 'i' + (rkUnit.iOpen || 0);
                    if (!tempKey2.hasOwnProperty(ig)) {
                        tempKey2[ig] = t2.length;
                        t2.push({ lv: rkUnit.iOpen || 0, ids: [] });
                    }
                    var rcu = t2[tempKey2[ig]];
                    var arr = rcu.ids[rkUnit.iColour] || []
                    arr.push(rkUnit.kID);
                    rcu.ids[rkUnit.iColour] = arr;
                }

                maxColorLevel = Math.max(maxColorLevel, rkUnit.iColour);
            }
        }

        t1.sort((a: ifCamp2UnlockUnit, b: ifCamp2UnlockUnit) => {
            if (a.lv == b.lv) return 0;
            return a.lv > b.lv ? 1 : -1;
        });

        this.SumCamp2UnlockLevel = [];
        for (var i = 0; i < t1.length; i++) {
            var levelT = t1[i];
            if (!levelT) {
                levelT = { lv: i, ids: [] };
            }

            var outPush = {
                lv: levelT.lv || 0,
                ids: []
            }

            var preList = this.SumCamp2UnlockLevel[i - 1] || {
                lv: 0,
                ids: []
            }
            for (var j = 0; j <= maxColorLevel; j++) {
                outPush.ids[j] = (preList.ids[j] || []).concat(levelT.ids[j] || []);
            }

            this.SumCamp2UnlockLevel.push(outPush);
        }

        t2.sort((a: ifCamp2UnlockUnit, b: ifCamp2UnlockUnit) => {
            if (a.lv == b.lv) return 0;
            return a.lv > b.lv ? 1 : -1;
        });
        this.SumArmyCamp2UnlockLevel = [];
        for (var i = 0; i < t2.length; i++) {
            var levelT = t2[i];
            if (!levelT) {
                levelT = { lv: i, ids: [] };
            }

            var outPush = {
                lv: levelT.lv || 0,
                ids: []
            }

            var preList = this.SumArmyCamp2UnlockLevel[i - 1] || {
                lv: 0,
                ids: []
            }
            for (var j = 0; j <= maxColorLevel; j++) {
                outPush.ids[j] = (preList.ids[j] || []).concat(levelT.ids[j] || []);
            }

            this.SumArmyCamp2UnlockLevel.push(outPush);
        }

    }


    static cardBattleScoreConst(kUnit: SeResUnitEx, level: number): number {
        var colorScore: number = 0;
        switch (kUnit.iColour) {
            case 1: colorScore = 100 + 10 * level; break;
            case 2: colorScore = 120 + 12 * level; break;
            case 3: colorScore = 145 + 15 * level; break;
            case 4: break;
        }

        return colorScore;
    }


    private s_gold = ['iGreedGold', 'iGreedGold', 'iBlueGold', 'iPurpleGold', 'iOrangGold'];
    private s_exp = ['iGreedExp', 'iGreedExp', 'iBlueExp', 'iPurpleExp', 'iOrangExp'];
    /**
     * 从当前等级升级到下一级需要的消耗
     * @param cardID 卡牌ID
     * @param nowlevel 当前等级
     */
    public cardLvlCost(cardID: string, nowlevel: number) {
        var unitRes = this.UnitRes.getRes(cardID);
        if (!unitRes) {
            return null;
        }


        var hero = this.HeroRankRes.getRes(nowlevel);
        if (!hero) {
            return null;
        }

        return { gold: hero[this.s_gold[unitRes.iColour % this.s_gold.length]] || 0, card: hero.iHeroLvNeed, exp: hero[this.s_exp[unitRes.iColour % this.s_exp.length]] || 0 };
    }

    public maxCardLevel(iColor: number) {
        var mx = 1;
        for (var key in this.HeroRankRes.resData) {
            var res = this.HeroRankRes.resData[key];
            if (res[this.s_gold[iColor]] >= 0 && res[this.s_exp[iColor]] >= 0) {
                mx = Math.max(res.iHeroLv, mx);
            }
        }
        return mx;
    }

    getUnitIDByColor(icolor: number, ilevel: number, bPvp: boolean = false): Array<string> {
        var unit: ifCamp2UnlockUnit;
        if (bPvp) {
            if (ilevel == -1) {
                unit = this.SumCamp2UnlockLevel[this.SumCamp2UnlockLevel.length - 1];
            }
            else {
                for (var i = 0; i < this.SumCamp2UnlockLevel.length; i++) {
                    var t = this.SumCamp2UnlockLevel[i];
                    if (ilevel >= t.lv) unit = t;
                    else break;
                }
            }

        }
        else {
            if (ilevel == -1) {
                unit = this.SumArmyCamp2UnlockLevel[this.SumArmyCamp2UnlockLevel.length - 1];
            }
            else {
                for (var i = 0; i < this.SumArmyCamp2UnlockLevel.length; i++) {
                    var t = this.SumArmyCamp2UnlockLevel[i];
                    if (ilevel >= t.lv) unit = t;
                    else break;
                }
            }
        }

        return (unit && unit.ids[icolor]) || [];
    }

    public getBattleRankByLevel(level: number, score?: number) : TableRes.SeResBattleRank{
        let resAll = this.BattleRankGroupRes[level];
        if(!resAll) return null;

        if(!score) return resAll[0];
        else {
            for(let i = 0; i < resAll.length; i++){
                //若iELOScore=-1,则直接取该段位数据
                //若elo 小于iELOScore 取该段数据
                if(resAll[i].iELOScore == -1 || score < resAll[i].iELOScore){
                    return resAll[i];
                }
            }
            //若都没找到，则取最后一段数据
            return resAll[resAll.length - 1];
        }
    }

    getUnitIDByLevel(ilevel: number, bPvp: boolean = false): Array<string> {
        var unit: ifCamp2UnlockUnit;
        if (bPvp) {
            if (ilevel == -1) {
                unit = this.SumCamp2UnlockLevel[this.SumCamp2UnlockLevel.length - 1];
            }
            else {
                for (var i = 0; i < this.SumCamp2UnlockLevel.length; i++) {
                    var t = this.SumCamp2UnlockLevel[i];
                    if (ilevel >= t.lv) unit = t;
                    else break;
                }
            }

        }
        else {
            if (ilevel == -1) {
                unit = this.SumArmyCamp2UnlockLevel[this.SumArmyCamp2UnlockLevel.length - 1];
            }
            else {
                for (var i = 0; i < this.SumArmyCamp2UnlockLevel.length; i++) {
                    var t = this.SumArmyCamp2UnlockLevel[i];
                    if (ilevel >= t.lv) unit = t;
                    else break;
                }
            }

        }

        var result: Array<string> = [];
        if (unit) {
            for (var color in unit.ids) {
                result = result.concat(unit.ids[color]);
            }
        }

        return result;
    }


    public getCampLevelHeroInfo(iLevel): ifCamp2UnlockUnit {
        var ret = null;
        for (var i = 0; i < this.SumCamp2UnlockLevel.length; i++) {
            var rcu = this.SumCamp2UnlockLevel[i];
            if (rcu.lv > iLevel) {
                break;
            }
            ret = rcu;
        }

        return func_copy<ifCamp2UnlockUnit>(ret);
    }

    public getAIlordInfo(castel_Level){
        return this.AILordInfo[castel_Level];
    }

    public getHeroPerLevel(kid: string) {
        var pkUnit = this.UnitRes.getRes(kid);
        if (!pkUnit) return 0;
        let ext_level = parseInt(this.getConfig("friend_level").split(',')[pkUnit.iColour - 1]);
        if (!ext_level || isNaN(ext_level)) ext_level = 1;

        return Math.max(1, ext_level);
    }
    
    public getHeroFightScore(formations: Array<SeLogicFormation>): { iReal: number, iShow: number } {
        var iHeroScore: number = 0;
        var iShowHeroScore: number = 0;
        for (var i = 0; i < formations.length; i++) {
            var rkFormation: SeLogicFormation = formations[i];
            if (!rkFormation) {
                continue;
            }
            // 英雄的分值
            var rkHeroRes = this.UnitRes.getRes(rkFormation.kHeroID);
            if (rkHeroRes) {
                var level = (rkFormation.iLevel <= rkHeroRes.aiBattleScore.length) ? rkFormation.iLevel - 1 : rkHeroRes.aiBattleScore.length - 1;
                iHeroScore += rkHeroRes.aiBattleScore[level];
                iShowHeroScore += rkHeroRes.aiShowBattleScore[level];
            }
        }

        iHeroScore = Math.floor(iHeroScore);
        iShowHeroScore = Math.floor(iShowHeroScore);

        return { iReal: iHeroScore || 0, iShow: iShowHeroScore || 0 };
    }

    public getUnlockBossFormation(level: number) {
        var ids = [];
        for (var i = 0; i < this._unitUnlock2IDs.length && i <= level; i++) {
            var r = this._unitUnlock2IDs[i];
            if (!r) continue;
            ids = ids.concat(r);
        }

        return ids;
    }

    public getConfig(key: string) {
        return this.configMap.get(key);
    }
}

// export var resMgrInst = new SeResMgr();

var pltRes = {};
export function resMgrInst(plt: string): SeResMgr {
    if (!pltRes.hasOwnProperty(plt)) {
        pltRes[plt] = new SeResMgr(plt);
        pltRes[plt].init();
    }

    return pltRes[plt];
}