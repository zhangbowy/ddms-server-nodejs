import * as TableRes from "../Res/interface";
var respath = './Res/';
import * as fs from 'fs';
import * as path from 'path';
import { SeLogicFormation } from "../SeDefine";
import { SePlayer } from "../PlayerMgr/SePlayer";
import { SeItemType, func_copy } from "../SeDefine";
import { SeItem } from '../PlayerMgr/SePlayerDef';
import { createHash, randomBytes } from 'crypto';
import { HashMap, TeMap, LangID } from '../TeTool';
import { iApp } from '../app';
import { configInst } from '../lib/TeConfig';
import { SeEnumUnitiColour, SeResHeroBoxEgg } from "../Res/interface";
declare var global: iApp;
export var GetRobotDefine = {
    colorScore: [100, 120, 145, 175],
    colorDScore: [20, 24, 29, 35],
    count: 8
}

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
            this._plt_file_config = JSON.parse(fs.readFileSync(path.join(respath,'GameServer.json')).toString());
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
    public resData: { [tkey: string]: T } = {};
    public length: number = 0;
    private _loaded: Function;
    public md5: string = '';
    private _keyName: string = "";

    get main_key() {
        return this._keyName;
    }

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

        let plt = configInst.get('plt');
        var pltName = PltFileList.get_plt_file(jsonname, plt);
        if (fs.existsSync(path.join(respath, pltName))) {
            // 如果存在对应版本的表格，那么就使用那个表格
            jsonname = pltName;
        }

        // 处理的时候分为文件夹和文件两个模式
        if (is_filetype(jsonname, '.json')) {
            // 文件模式下面，正常加载数据
            var fileName = path.join(respath, jsonname);
            this._loadFile(fileName);
            fs.watchFile(fileName, this._onFileChange.bind(this, fileName));
        }
        else {
            console.error('monit dir is not support!');
        }

        if (this._loaded) {
            setTimeout(this._loaded, 1);
        }
    }

    private _loadFile(jsonname) {
        this.resData = {};
        var fileInfo = fs.readFileSync(jsonname).toString();

        this.md5 = createHash('md5').update(fileInfo).digest('hex');

        try {
            var allData = JSON.parse(fileInfo);
            //转换多语言
            SeLangMgr.inst.converJsonData(jsonname, allData);
        }
        catch (e) {
            console.log('res error:' + jsonname);
        }
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

/**
 * 将资源模块扩展成动态的
 */
class SeResModuleEx<T> extends SeResModule<T> {
    private flushTime: number = 0;
    //ftime：下一次刷新时间, ids:刷新掉的条目
    private updateRes: () => { ftime: number, ids: Array<number> };
    constructor(jsonname: string, caller: Object, update: () => { ftime: number, ids: Array<number> }, loaded?: Function, keyName: string = "") {
        super(jsonname, caller, loaded, keyName);
        this.updateRes = update.bind(caller);
    }
    update(): Array<number> {
        if (Date.now() < this.flushTime) {
            return [];
        }
        let ret = this.updateRes();
        this.flushTime = ret.ftime;
        return ret.ids;
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

export interface SeResTaskEx extends TableRes.SeResTask {
    content: any;
}

export interface ifResHeroBoxPool {
    name: string,
    iweight: number,
    imin: number,
    imax: number,
    imaxuse: number,
    icon: number
}

export interface SeResHeroBox extends TableRes.SeResHeroBoxZZY {
    akCardPools: ifResHeroBoxPool[];
}

export interface ifSeasonAward {
    elo?: number,
    pvplevel?: number,
    items: { id: string, num: number }[],
    icon?: string,
    bkicon?: string,
    mallid?: string,
}

export interface SeResSeasonEx extends TableRes.SeResseason {
    akParseAwards: ifSeasonAward[],
}

//语言管理类(因为需要在资源管理类前初始化,单独拉出来的类)
class SeLangMgr {
    private static _inst: SeLangMgr;
    static get inst() {
        if (!this._inst) this._inst = new SeLangMgr();
        return this._inst;
    }

    //需要转的表和字段
    private LanguageConverList = [
        {file: "TownItem.json", fields:["kName", "kDescribe"]},
        {file: "HeroSkin.json", fields:["kName"]},
        {file: "HeroBoxZZY.json", fields:["kName"]},
        {file: "Unit.json", fields:["kName"]},
        {file: "recharge.json", fields:["kName","kMailMsg"]},
        {file: "Task.json", fields:["kName", "kDescription"]},
        {file: "noticetext.json", fields:["kText"]},
        {file: "HeroBoxType.json", fields:["kName"]},

        // {file: "TownItem_hago.json", fields:["kName", "kDescribe"]},
        // {file: "HeroSkin_hago.json", fields:["kName"]},
        // {file: "HeroBoxZZY_hago.json", fields:["kName"]},
        // {file: "Unit_hago.json", fields:["kName"]},
        // {file: "recharge_hago.json", fields:["kName","kMailMsg"]},
        // {file: "Task_hago.json", fields:["kName", "kDescription"]},
        // {file: "noticetext_hago.json", fields:["kText"]},
        // {file: "HeroBoxType_hago.json", fields:["kName"]},
    ];

    private converPltJson(list: {file:string, fields:string[]}[]){
        let list_temp = [];
        var plt = configInst.get('plt');
        for(let i = 0; i < list.length; i++){
            let newFile = list[i].file.substring(0, list[i].file.length - 5) + '_' + plt + '.json'
            list_temp.push({file: newFile, fields:list[i].fields});
        }
        return list.concat(list_temp);
    }
    //检查文件是否需要转换
    public converJsonData(jsonname: string, allData) {
        var langList = this.converPltJson(SeLangMgr.inst.LanguageConverList);
        for (var i = 0; i < langList.length; i++) {
            var fileName = path.join(respath, langList[i].file);
            if (jsonname == fileName) {
                this.convertLang(allData, ...langList[i].fields);
            }
        }
    }

    //转换语言,data中的key(id)替换为对应语言
    private convertLang(data, ...arg) {
        for (var key in data) {
            var sub = data[key];
            for (var i = 0; i < arg.length; i++) {
                var field = arg[i];
                if (sub[field]) {
                    sub[field] = LangID(sub[field]);//this.getLanguage(sub[field]);
                }
            }
        }
        return data;     
    }
};

class SeResMgr {

    private static _inst: SeResMgr;
    static get inst() {
        if (!this._inst) this._inst = new SeResMgr();
        return this._inst;
    }

    public configMap: TeMap<string> = new TeMap<string>();
    private ConfigMapRes: SeResModule<TableRes.SeResConfigMaps>;
    public UpgradeRes: SeResModule<TableRes.SeResupgrade>;
    
    public TownItemRes: SeResModule<TableRes.SeResTownItem>;
    public UnitRes: SeResModule<SeResUnitEx>;
    public HeroSkinRes: SeResModule<TableRes.SeResHeroSkin>;
    // public color2MxLvl: Array<number> = [];
    public BattleLevelRes: SeResModule<TableRes.SeResBattleLevel>;
    public BattleRankRes: SeResModule<TableRes.SeResBattleRank>;
    public HeroRankRes: SeResModule<TableRes.SeResHeroRank>;
    public LevelUpCounts: Array<number>;    // 英雄等级对应的卡牌数量
    public MaxHeroLvl: number;
    public Color2HeroLvl: number[];
    public MaxLvl: number;

    public RaceOppRes: SeResModule<TableRes.SeResRaceOpp>;
    public RaceTalkRes: SeResModule<TableRes.SeResRaceTalk>;

    public MapInfoRes: SeResModule<TableRes.SeResMapinfo>;
    public openBoxRes: SeResModule<TableRes.SeReschance>;

    public unlockRes: SeResModule<TableRes.SeResUnlock>;

    public SumCamp2UnlockLevel: Array<ifCamp2UnlockUnit> = [];
    public SumArmyCamp2UnlockLevel: Array<ifCamp2UnlockUnit> = [];  // 地方单位解锁用的

    public HeroBoxZZYRes: SeResModule<SeResHeroBox>;
    public HeroBoxEggRes: SeResModule<SeResHeroBoxEgg>;

    public SuperPowerRes: SeResModule<TableRes.SeResSuperPower>;

    public RechargeRes: SeResModule<TableRes.SeResrecharge>;

    public ShopItemRes: HashMap<TableRes.SeResSuperMarket> = new HashMap<TableRes.SeResSuperMarket>();
    public SuperMarketRes: SeResModule<TableRes.SeResSuperMarket>;
    public ShopMallRes: SeResModuleEx<TableRes.SeResShopMall>;

    public signRes: SeResModule<TableRes.SeResSign>;
    public globalNoticeRes: SeResModule<TableRes.SeResglobalnotice>;
    public noticeTextRes: SeResModule<TableRes.SeResnoticetext>;
    private taskRes: SeResModule<SeResTaskEx>;
    public equipattrRes: SeResModule<TableRes.SeResequipattr>;
    public equipenhanceRes: SeResModule<TableRes.SeResequipenhance>;
    public equipEnchantRes: SeResModule<TableRes.SeResequipEnchant>;
    public equipEnchantProRes: SeResModule<TableRes.SeResequipEnchantPro>;
    public equipsuperpowerRes: SeResModule<TableRes.SeResequipsuperpower>;
    public thanksRes: SeResModule<TableRes.SeResthanks>;

    public guideRes: SeResModule<TableRes.SeResGuide>;

    public TownBufferRes: SeResModule<TableRes.SeResTownBuffer>;

    public sevenDaysRes: SeResModule<TableRes.SeRessevendays>;

    public systemMailRes: SeResModule<TableRes.SeResSystemMail>;

    public lootPoolRes: SeResModule<TableRes.SeResLootPool>;
    public lootPoolGroupRes: Array<Array<string>>;

    public heroBoxTypeRes: SeResModule<TableRes.SeResHeroBoxType>;

    public activityRes: SeResModule<TableRes.SeResActivity>;
    public exchangeRes: SeResModule<TableRes.SeResExchange>;
    public seasonRes: SeResModule<SeResSeasonEx>;
    public competitionReward: SeResModule<TableRes.SeResCompetitionReward>;
    public chartTable: SeResModule<TableRes.SeResChartTable>;

    public LimitedGiftRateRes: SeResModule<TableRes.SeResLimitedGiftRate>;
    public LimitedGiftTypeRes: SeResModule<TableRes.SeResLimitedGiftType>;

    public LevelInfoRes: SeResModule<TableRes.SeResLevelInfo>;
    public GameServerRes: SeResModule<TableRes.SeResGameServer>;
    public pveInfoRes: SeResModule<TableRes.SeRespveInfo>;

    public MonthSignRes: SeResModule<TableRes.SeResMonthSign>;
    public BadgeRes: SeResModule<TableRes.SeResBadge>;

    public FestivalSignRes: SeResModule<TableRes.SeResFestivalSign>;

    public LanguageRes: SeResModule<TableRes.SeResLanguage_CN>; //语言表
    public VIPRes: SeResModule<TableRes.SeResVIP>;
    private _ready: boolean = false;
    public BattleRankGroupRes: Array<Array<TableRes.SeResBattleRank>>;
    public constructor() {

        this.ConfigMapRes = new SeResModule<TableRes.SeResConfigMaps>('ConfigMaps.json', this, () => {
            this.configMap.clear();
            for (var key in this.ConfigMapRes.resData) {
                var rInfo = <TableRes.SeResConfigMaps>this.ConfigMapRes.resData[key];
                if (!rInfo || !rInfo.kKey) continue;
                this.configMap.set(rInfo.kKey, rInfo.kValue);
            }
        });

        this.TownItemRes = new SeResModule('TownItem.json', this, this.initTownItemRes);
        this.UnitRes = new SeResModule('Unit.json', this, this._unitInit);
        this.HeroSkinRes = new SeResModule('HeroSkin.json');
        this.BattleLevelRes = new SeResModule('BattleLevel.json');
        this.BattleRankRes = new SeResModule('BattleRank.json', () => {
            this.BattleRankGroupRes = [];
            this.MaxLvl = 0;
            for (var key in this.BattleRankRes.resData) {
                var rInfo = this.BattleRankRes.resData[key];
                rInfo && (this.MaxLvl = Math.max(rInfo.iBattleRank, this.MaxLvl))
                if(!this.BattleRankGroupRes[rInfo.iBattleRank]) this.BattleRankGroupRes[rInfo.iBattleRank] = [];
                this.BattleRankGroupRes[rInfo.iBattleRank].push(rInfo);
            }
        });
        this.HeroRankRes = new SeResModule('HeroRank.json', this, this._heroRankInit);
        this.MapInfoRes = new SeResModule('Mapinfo.json');
        this.RaceOppRes = new SeResModule('RaceOpp.json');
        this.RaceTalkRes = new SeResModule('RaceTalk.json');
        this.SuperMarketRes = new SeResModule('SuperMarket.json', this, this._shopItemInit);
        this.ShopMallRes = new SeResModuleEx('ShopMall.json', this, this._shopMallUpdate, this._shopMallUpdate);

        this.HeroBoxZZYRes = new SeResModule<SeResHeroBox>('HeroBoxZZY.json', this, this._heroBoxInit);
        this.HeroBoxEggRes = new SeResModule('HeroBoxEgg.json');

        this.SuperPowerRes = new SeResModule("SuperPower.json");
        this.openBoxRes = new SeResModule("chance.json", this, this._init_chance);
        this.RechargeRes = new SeResModule('recharge.json');
        this.signRes = new SeResModule("Sign.json");
        this.globalNoticeRes = new SeResModule("globalnotice.json");
        this.noticeTextRes = new SeResModule("noticetext.json");
        this.taskRes = new SeResModule<SeResTaskEx>("Task.json", this, this._taskItemInit);

        this.equipattrRes = new SeResModule("equipattr.json");
        this.equipenhanceRes = new SeResModule("equipenhance.json");
        this.equipsuperpowerRes = new SeResModule("equipsuperpower.json");
        this.equipEnchantRes = new SeResModule("equipEnchant.json");
        this.equipEnchantProRes = new SeResModule("equipEnchantPro.json");
        this.TownBufferRes = new SeResModule<TableRes.SeResTownBuffer>("TownBuffer.json");

        this.unlockRes = new SeResModule("Unlock.json");

        this.thanksRes = new SeResModule("thanks.json");
        this.guideRes = new SeResModule("Guide.json");
        this.VIPRes = new SeResModule("VIP.json");
        this.sevenDaysRes = new SeResModule<TableRes.SeRessevendays>("sevendays.json", this, () => {
            this.sevenDaysType.clear();
            for (var key in this.sevenDaysRes.resData) {
                var rres = this.sevenDaysRes.resData[key] as TableRes.SeRessevendays;
                if (rres.iServer) continue;
                this.sevenDaysType.add(rres.kTaskType, rres);
            }
            var keys = this.sevenDaysType.keys;
            for (var i = 0; i < keys.length; i++) {
                var days = this.sevenDaysType.get(keys[i]);
                days.sort(function (a, b) {
                    if (a.iIndex > b.iIndex) {
                        return 1;
                    }
                    else return -1;
                });
                this.sevenDaysType.set(keys[i], days);
            }
        });
        this.systemMailRes = new SeResModule<TableRes.SeRessevendays>("SystemMail.json", this, () => {
            var hash = this.systemMailRes.getAllRes();
            var now = Date.now();
            for (var key in hash) {
                var pkSysMail: TableRes.SeResSystemMail = hash[key];
                var startTime = Date.parse(pkSysMail.kStartTime);
                var endTime = startTime + pkSysMail.iDuration * 3600 * 1000;
                if (now > endTime) {
                    delete this.systemMailRes.resData[key];
                }
            }
            try {
                global.playerMgr && global.playerMgr.checkSystemMail();
            }
            catch (e) {

            }
        });

        this.lootPoolRes = new SeResModule<TableRes.SeResLootPool>("LootPool.json", this, () => {
            this.lootPoolGroupRes = [];
            var hash = this.lootPoolRes.getAllRes();
            for (var key in hash) {
                var pkLootPoolRes: TableRes.SeResLootPool = hash[key];
                if (!this.lootPoolGroupRes[pkLootPoolRes.iPool]) this.lootPoolGroupRes[pkLootPoolRes.iPool] = [];
                this.lootPoolGroupRes[pkLootPoolRes.iPool].push(pkLootPoolRes.kID);
            }
        });

        this.heroBoxTypeRes = new SeResModule<TableRes.SeResHeroBoxType>("HeroBoxType.json", this, null, "eType");

        this.exchangeRes = new SeResModule<TableRes.SeResExchange>("Exchange.json");

        this.BadgeRes = new SeResModule<TableRes.SeResBadge>("Badge.json");
        this.activityRes = new SeResModule<TableRes.SeResActivity>("Activity.json");
        this.seasonRes = new SeResModule<SeResSeasonEx>('season.json', this, () => {
            for (var key in this.seasonRes.resData) {
                var r: SeResSeasonEx = this.seasonRes.resData[key];
                r.akParseAwards = this._parse_season_awards(r.akAwardItem);
            }
        });
        this.chartTable = new SeResModule<TableRes.SeResChartTable>("ChartTable.json", this, this.init_charttable.bind(this));
        this.LimitedGiftRateRes = new SeResModule<TableRes.SeResLimitedGiftRate>("LimitedGiftRate.json");
        this.LimitedGiftTypeRes = new SeResModule<TableRes.SeResLimitedGiftType>("LimitedGiftType.json");

        this.UpgradeRes = new SeResModule('upgrade.json', this, this.init_upgrade_res);
        this.GameServerRes = new SeResModule('GameServer.json');
        this.LevelInfoRes = new SeResModule('LevelInfo.json', this, this.init_levelinfo);
        this.pveInfoRes = new SeResModule('pveInfo.json', this);
        this.MonthSignRes = new SeResModule("MonthSign.json", this, this.init_MonthSign);

        this.FestivalSignRes = new SeResModule("FestivalSign.json", this, this.init_FestivalSign);
        /////////////////////////////////////////////
        this._ready = true;
        // ac表格有子事件需要解析的，这里提前处理掉

        this._heroRankInit();
    }

    public saveFiles(fileInfos: Array<{ name: string, md5: string, info: string }>) {
        for (var i = 0; i < fileInfos.length; i++) {
            var rkInfo = fileInfos[i];
            var md5 = createHash('md5');
            if (md5.update(rkInfo.info).digest('hex') != rkInfo.md5) continue;

            fs.writeFileSync(path.join(respath, rkInfo.name + '.json'), rkInfo.info);
        }
    }

    /**
     * 限定几个文件是需要同步的
     */
    getFilesMd5(): Array<{ name: string, info: string, md5: string }> {
        var out = [];
        out.push({
            name: 'SuperMarket',
            md5: this.SuperMarketRes.md5
        });

        out.push({
            name: 'recharge',
            md5: this.RechargeRes.md5
        });

        return out;
    }

    private _heroRankInit() {
        if (!this._ready) {
            return;
        }

        this.Color2HeroLvl = [];


        var color = ['write', 'Greed', 'Blue', 'Purple', 'Orang'];
        this.LevelUpCounts = [0];
        this.MaxHeroLvl = 0;
        for (var key in this.HeroRankRes.resData) {
            var rkT = <TableRes.SeResHeroRank>this.HeroRankRes.resData[key];
            if (rkT.iHeroLv > this.MaxHeroLvl) {
                this.MaxHeroLvl = rkT.iHeroLv;
            }

            for (var i = 0; i < color.length; i++) {
                if (!rkT[`i${color[i]}Gold`] || rkT[`i${color[i]}Gold`] < 0) continue;
                this.Color2HeroLvl[i] = Math.max(this.Color2HeroLvl[i] || 0, rkT.iHeroLv);
            }

            this.LevelUpCounts[rkT.iHeroLv] = rkT.iHeroLvNeed;

            // this.color2MxLvl[rkUnit.iColour] = Math.max(this.color2MxLvl[rkUnit.iColour] || 0,)
        }
        // 最大等级等于rank表配置的等级+1
        this.MaxHeroLvl += 1;

        for (var i = 1; i < this.LevelUpCounts.length; i++) {
            var count = this.LevelUpCounts[i - 1] || 0;
            this.LevelUpCounts[i] = (this.LevelUpCounts[i] || 0) + count;
        }


        this._unitInit();
    }


    private _type_2_shop_mall_: HashMap<TableRes.SeResShopMall> = new HashMap<TableRes.SeResShopMall>();

    /**
     * 更新shopMall
     */
    private _shopMallUpdate(): { ftime: number, ids: Array<number> } {
        this._type_2_shop_mall_.clear();
        var now = Date.now();
        var flushTime = 0;
        var Kids = [];
        var allRes = this.ShopMallRes.getAllRes();
        //为轮换宝箱附上初值
        var randOut: Array<TableRes.SeResShopMall> = [];
        var randTime: Array<number> = []; //保存过期商品的超时时间, 为了解决倒计时的连续性
        var randLength = 3;
        for (let kid in allRes) {
            let pkShopMallRes: TableRes.SeResShopMall = allRes[kid];
            this._type_2_shop_mall_.add(pkShopMallRes.eType, pkShopMallRes);

            if (pkShopMallRes.eType == TableRes.SeEnumShopMalleType.LunHuanLiBao) {
                if (!pkShopMallRes.kStartTime || pkShopMallRes.kStartTime == "") {
                    //没有kStartTime的情况
                    randOut.push(pkShopMallRes);
                }
                else {
                    let _timeOut = ((new Date(pkShopMallRes.kStartTime)).getTime() + pkShopMallRes.iLasttime * 3600000);
                    if (_timeOut <= now) {
                        //kStartTime已经过期的情况
                        pkShopMallRes.kStartTime = "";
                        // randOut.push(pkShopMallRes); //下一次不能出现
                        randTime.push(now - _timeOut);
                    }
                    else {
                        //kStartTime没有过期的情况
                        randLength = randLength - 1;
                        if (flushTime == 0 || flushTime > _timeOut) { flushTime = _timeOut; }
                    }
                }
            }
        }
        for (let i = 0; i < randLength; i++) {
            let _index = Math.floor(Math.random() * randOut.length);
            let _pkShopMallRes = randOut.splice(_index, 1);
            if (_pkShopMallRes.length == 0) break;
            let _time = (randTime[i] || 0) % (_pkShopMallRes[0].iLasttime * 3600000);
            _pkShopMallRes[0].kStartTime = (new Date(now - _time)).toLocaleString();

            let _timeOut = ((new Date(_pkShopMallRes[0].kStartTime)).getTime() + _pkShopMallRes[0].iLasttime * 3600000);
            if (flushTime == 0 || flushTime > _timeOut) { flushTime = _timeOut; }
            Kids.push(_pkShopMallRes[0].kID);
        }
        return { ftime: flushTime, ids: Kids };
    }

    private _shopItemInit() {
        var allRes = this.SuperMarketRes.getAllRes();
        this.ShopItemRes.clear();
        for (var key in allRes) {
            var pkRes = <TableRes.SeResSuperMarket>allRes[key];
            for (var i = 0; i < pkRes.akItemID.length; i++) {
                this.ShopItemRes.add(pkRes.akItemID[i].split(',')[0], pkRes);
            }
        }

        if (!global.playerMgr || !global.playerMgr.allPlayers) return;
        for (var link in global.playerMgr.allPlayers) {
            var player: SePlayer = global.playerMgr.allPlayers[link];
            player.updateShopConfig();
        }
    }

    private _task_map: { [iModule: number]: { [taskid: string]: SeResTaskEx } } = {};
    // 任务道具记录
    private _task_item: Array<string> = [];
    private _taskItemInit() {
        this._task_item = [];
        var allRes = this.taskRes.getAllRes();
        for (var key in allRes) {
            var pkRes = <SeResTaskEx>allRes[key];
            var content = {};
            for (var i = 0; pkRes.aContent && i < pkRes.aContent.length; i++) {
                var arr = pkRes.aContent[i].split(":");
                if (arr.length >= 2) {
                    content[arr[0]] = arr[1];
                }
            }
            pkRes.content = content;

            if (pkRes.iType == TableRes.SeEnumTaskiType.HuoQuDaoJu || pkRes.iType == TableRes.SeEnumTaskiType.ShanChuDaoJu) {
                if (pkRes.content.itemid && this._task_item.indexOf(pkRes.content.itemid) < 0) {
                    this._task_item.push(pkRes.content.itemid);
                }
            }

            if (!this._task_map[pkRes.iModule]) this._task_map[pkRes.iModule] = {};

            this._task_map[pkRes.iModule][pkRes.kTaskID] = pkRes;
        }
    }

    public isTaskItem(typeId: string) {
        if (this._task_item.indexOf(typeId) >= 0) return true;
        return false;
    }

    public getTaskRes(taskID: string) {
        return this.taskRes.getRes(taskID);
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

    public getTaskAllRes(iModule?: string | number): { [taskid: string]: SeResTaskEx } {
        if (iModule == undefined) {
            return this.taskRes.getAllRes();
        }

        return this._task_map[iModule];
    }

    public getEquipRes(kname: string) {
        return this.equipattrRes.getRes(kname);
    }

    public getEquipenhanceRes(eBuildType: number,eType: number, ilevel: number) {
        for(var key in this.equipenhanceRes.resData){
            if(this.equipenhanceRes.resData[key].eBuildType == eBuildType && this.equipenhanceRes.resData[key].eType == eType && this.equipenhanceRes.resData[key].ilevel == ilevel){
                return this.equipenhanceRes.resData[key];
            }
        }
        return null;
    }

    public getEquipEnchantRes(iColor: number,istar: number) {
        for(var key in this.equipEnchantRes.resData){
            if(this.equipEnchantRes.resData[key].iColor == iColor && this.equipEnchantRes.resData[key].iStar == istar ){
                return this.equipEnchantRes.resData[key];
            }
        }
        return null;
    }

    public getVIPResOrderByLevel(){
        let result = [];
        for(var key in this.VIPRes.resData){
            result.push(this.VIPRes.resData[key]);
        }
        result.sort(function(a,b) {if(a.iRank < b.iRank) return -1; else return 1});
        return result;

    }
    public getShopMallIdByProductId(productId: string) {
        for(var key in this.ShopMallRes.resData){
            if(this.ShopMallRes.resData[key].kBaiduProductId == productId){
                return this.ShopMallRes.resData[key].kID;
            }
        }
        return null;
    }

    public getVIPResByVIPLevel(VIPLevel: number){
        for(var key in this.VIPRes.resData){
            if(this.VIPRes.resData[key].iRank == VIPLevel){
                return this.VIPRes.resData[key];
            }
        }
        return null
    }

    getTaskMaps() {
        return this._task_map;
    }

    public cardSumCostToLevel(level: number) {
        if (level == Infinity) {
            return this.LevelUpCounts[this.LevelUpCounts.length - 1];
        }
        if (this.LevelUpCounts.length <= level) return this.LevelUpCounts[this.LevelUpCounts.length - 1];;
        return this.LevelUpCounts[level];
    }

    private _unitInit() {
        if (!this._ready) {
            return;
        }

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

            if (rkUnit.iSoldierType != TableRes.SeEnumUnitiSoldierType.Ta) {
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

                    maxColorLevel = Math.max(maxColorLevel, rkUnit.iColour);
                }
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
                this.SumCamp2UnlockLevel.push({ lv: i, ids: [] });
                continue;
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
                this.SumArmyCamp2UnlockLevel.push({ lv: i, ids: [] });
                continue;
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
        var vBase = (GetRobotDefine.colorScore[kUnit.iColour - 1] || GetRobotDefine.colorScore[GetRobotDefine.colorScore.length - 1]);
        var vExt = (GetRobotDefine.colorDScore[kUnit.iColour - 1] || GetRobotDefine.colorDScore[GetRobotDefine.colorDScore.length - 1]);
        return vBase + vExt * level;
    }

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

        var color = ['iGreedGold', 'iGreedGold', 'iBlueGold', 'iPurpleGold', 'iOrangGold'];
        var exp = ['iGreedExp', 'iGreedExp', 'iBlueExp', 'iPurpleExp', 'iOrangExp'];
        var hero = this.HeroRankRes.getRes(nowlevel);
        if (!hero) {
            return null;
        }

        return { gold: hero[color[unitRes.iColour % color.length]] || 0, card: hero.iHeroLvNeed, exp: hero[exp[unitRes.iColour % exp.length]] || 0 };
    }

    /**
     * 从当前等级计算到最高等级需要的所有卡牌数量
     * @param cardID 卡牌ID
     * @param nowlevel 当前等级
     */
    public cardMxCards(cardID: string, nowlevel: number) {
        var unitRes = this.UnitRes.getRes(cardID);
        if (!unitRes) {
            return 0;
        }

        var cards = 0;
        var color = ['iGreedGold', 'iGreedGold', 'iBlueGold', 'iPurpleGold', 'iOrangGold'];
        for (var i = nowlevel; i <= this.MaxHeroLvl; i++) {
            var hero = this.HeroRankRes.getRes(i);
            if (!hero || hero[color[unitRes.iColour % color.length]] <= 0) {
                //满级了还能存放一定数量卡牌
                let extra = global.resMgr.getConfig('Unitcard_extra');
                if(extra && global.resMgr.getConfig('JianghunNoexchange') == 'true'){
                    let extra_count = parseInt(extra.split(',')[unitRes.iColour -1]);
                    cards = cards + extra_count;
                }
                break;
            }
            cards = cards + (hero.iHeroLvNeed || 0);
        }

        return cards;
    }

    /**
     * 武将卡牌最大的等级
     * @param cardID
     */
    public cardMxLvl(cardID: string) {
        var unitRes = this.UnitRes.getRes(cardID);
        if (!unitRes) {
            return null;
        }

        var color = ['iGreedGold', 'iGreedGold', 'iBlueGold', 'iPurpleGold', 'iOrangGold'];

        for (var i = 1; i < this.MaxHeroLvl; i++) {
            var hero = this.HeroRankRes.getRes(i);
            if (!hero || hero[color[unitRes.iColour % color.length]] <= 0) {
                return i;
            }
        }

        return this.MaxHeroLvl;
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

        iHeroScore = Math.max(Math.floor(iHeroScore), 800);
        iShowHeroScore = Math.max(Math.floor(iShowHeroScore), 800);

        return { iReal: iHeroScore || 0, iShow: iShowHeroScore || 0 };
    }

    public getBattleAwardByLevel(level: number): Array<string> {
        var rkRes: TableRes.SeResBattleRank = this.getBattleRankByLevel(level);
        if (rkRes && rkRes.akAwards && rkRes.akAwards.length != 0 && rkRes.akAwards[0]) {
            return rkRes.akAwards;
        }

        return [];
    }

    /** 
    战阶和积分的转换 返回-1表示没有找到对应的积分了
     */
    public getBattleScoreByLevel(level: number): number {
        var rkRes: TableRes.SeResBattleRank = this.getBattleRankByLevel(level);
        if (rkRes) {
            return rkRes.iStarNum;
        }

        return -1;
    }

    public hasLevelBoss(level: number) {
        var pkNextRes = this.getBattleRankByLevel(level);
        if (!pkNextRes || !pkNextRes.kBossRace) {
            return false;
        }

        var pkRace = this.RaceOppRes.getRes(pkNextRes.kBossRace);
        if (!pkRace) {
            return false;
        }

        return true;
    }


    private eType2TownItemIDs: HashMap<string> = new HashMap<string>();
    private initTownItemRes() {
        this.eType2TownItemIDs.clear();
        let allRes = this.TownItemRes.resData;
        for (let key in allRes) {
            let r_res: TableRes.SeResTownItem = allRes[key];
            this.eType2TownItemIDs.add(r_res.eTypeA, r_res.kId);
        }

        this._cacahe_item_type = {};
    }


    private _cacahe_item_type: any = {}
    public getItemTypeBySubType(subtype: SeItemType | TableRes.SeEnumTownItemeTypeA, param: number | string = null): Array<string> {
        let cache_name = subtype.toString();
        if (param) cache_name += '|' + param.toString();

        if (!this._cacahe_item_type.hasOwnProperty(cache_name)) {
            var outVec = [];
            let kIDs = this.eType2TownItemIDs.get(subtype);
            for (let i = 0; i < kIDs.length; i++) {
                let r_id = kIDs[i];
                var rkTownItem: TableRes.SeResTownItem = this.TownItemRes.getRes(r_id);
                if (!rkTownItem) {
                    continue;
                }

                if (rkTownItem.eTypeA != subtype) {
                    continue;
                }

                if (param && param != rkTownItem.kValueA) {
                    continue;
                }
                outVec.push(rkTownItem.kId);
            }
            this._cacahe_item_type[cache_name] = outVec;
        }

        return this._cacahe_item_type[cache_name];
    }

    /**
     * 对应等级可以解锁的颜色卡牌组
     * @param iLevel 
     */
    public getCampLevelHeroInfo(iLevel): ifCamp2UnlockUnit {
        var ret = {
            lv: 0,
            ids: [],     // 每个颜色对应的解锁的卡牌id};
        }
        for (var i = 0; i < this.SumCamp2UnlockLevel.length; i++) {
            var rcu = this.SumCamp2UnlockLevel[i];
            if (rcu.lv > iLevel) {
                break;
            }
            ret = rcu;
        }

        return func_copy<ifCamp2UnlockUnit>(ret);
    }

    public getResHeroBoxZZY(level: number, boxeType: TableRes.SeEnumHeroBoxZZYeType): SeResHeroBox {
        var out;
        for (var key in this.HeroBoxZZYRes.resData) {
            var rkRes = <SeResHeroBox>this.HeroBoxZZYRes.resData[key];
            if (rkRes.eType != boxeType) {
                continue;
            }

            if (rkRes.iLevel > level) {
                break;
            }

            out = rkRes;
        }

        return out;
    }

    public getResHeroBoxType(boxeType: TableRes.SeEnumHeroBoxTypeeType): TableRes.SeResHeroBoxType {
        if (this.heroBoxTypeRes.main_key == 'eType') {
            return this.heroBoxTypeRes.getRes(boxeType);
        }

        var out;
        for (var key in this.heroBoxTypeRes.resData) {
            var rkRes = <TableRes.SeResHeroBoxType>this.heroBoxTypeRes.resData[key];
            if (rkRes.eType == boxeType) {
                out = rkRes;
                break;
            }
        }
        return out;
    }


    private _chaneArray: HashMap<TableRes.SeReschance> = new HashMap<TableRes.SeReschance>();
    private _init_chance() {
        this._chaneArray._data = {};
        for (var key in this.openBoxRes.resData) {
            var r: TableRes.SeReschance = this.openBoxRes.resData[key];
            if (!r) continue;
            this._chaneArray.add(r.kGiftID, r);
        }
    }

    public getChanceList(kGiftID: string, level: number, whithout_hand: boolean = false) {
        var tot_out = [];
        var out: { id: string, type: number, weight: number, num: number, whithout_hand: boolean }[] = [];
        switch (kGiftID) {
            case "OrangeInit": //根据unit中OpenGrade解锁的全橙卡
                tot_out = this.getCampLevelHeroInfo(level).ids[SeEnumUnitiColour.Cheng];
                break;
            case "PurpleInit": //根据unit中OpenGrade解锁的全紫卡
                tot_out = this.getCampLevelHeroInfo(level).ids[SeEnumUnitiColour.Zi];
                break;
            case "BlueInit": //根据unit中OpenGrade解锁的全蓝卡
                tot_out = this.getCampLevelHeroInfo(level).ids[SeEnumUnitiColour.Lan];
                break;
            case "GreenInit": //根据unit中OpenGrade解锁的全绿卡
                tot_out = this.getCampLevelHeroInfo(level).ids[SeEnumUnitiColour.Lv];
                break;
            case "OrangeAll": //默认全解锁的全橙卡
                tot_out = this.getCampLevelHeroInfo(99).ids[SeEnumUnitiColour.Cheng];
                break;
            case "PurpleAll": //默认全解锁的全紫卡
                tot_out = this.getCampLevelHeroInfo(99).ids[SeEnumUnitiColour.Zi];
                break;
            case "BlueAll": //默认全解锁的全蓝卡
                tot_out = this.getCampLevelHeroInfo(99).ids[SeEnumUnitiColour.Lan];
                break;
            case "GreenAll": //默认全解锁的全绿卡
                tot_out = this.getCampLevelHeroInfo(99).ids[SeEnumUnitiColour.Lv];
                break;
            default: {
                if (!this._chaneArray.has(kGiftID)) return;
                var rPools = this._chaneArray.get(kGiftID);

                for (var i = 0; i < rPools.length; i++) {
                    var r = rPools[i];
                    if (!r || r.iOpenGrade > level) continue;
                    out.push({
                        id: r.kItemID,
                        type: r.kItemType,
                        weight: r.iProbability,
                        num: r.iItemNumber,
                        whithout_hand: whithout_hand
                    })
                }

                return out;
            }
        }

        tot_out = tot_out || [];

        for (var i = 0; i < tot_out.length; i++) {
            out.push({
                id: tot_out[i],
                type: TableRes.SeEnumchancekItemType.DanWei,
                weight: 1,
                num: 1,
                whithout_hand: whithout_hand
            })
        }
        return out;
    }

    public getRechageResByAmount(iAmount: number) {
        var iRmb = iAmount / 100;
        if (configInst.get('plt') == 'hago'){
            iRmb = Number(iRmb.toFixed(2));
        }
        for (var key in this.RechargeRes.resData) {
            var rkInfo = <TableRes.SeResrecharge>this.RechargeRes.resData[key];
            if (rkInfo && rkInfo.iRMB == iRmb) {
                return rkInfo;
            }
        }

        return null;
    }

    public getSuperMarketSales(kItemID): Array<TableRes.SeResSuperMarket> {
        return this.ShopItemRes.get(kItemID);
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

        return unit && unit.ids[icolor];
    }


    public getSignItem(day: number): TableRes.SeResSign {
        for (var key in this.signRes.resData) {
            var rkRes = <TableRes.SeResSign>this.signRes.resData[key];

            if (rkRes.iDay == day) {
                return rkRes;
            }
        }
        return null;
    }

    public getNoticeText(eType: TableRes.SeEnumnoticetexteType): Array<TableRes.SeResnoticetext> {
        var out = [];
        for (var key in this.noticeTextRes.resData) {
            var rkRes = <TableRes.SeResnoticetext>this.noticeTextRes.resData[key];
            if (rkRes && rkRes.eType == eType) {
                out.push(rkRes);
            }
        }

        return out;
    }


    public getGuideAward(guideId: number): Array<SeItem> {
        var maxRes: TableRes.SeResGuide;
        for (var key in this.guideRes.resData) {
            var rkRes = <TableRes.SeResGuide>this.guideRes.resData[key];
            if (rkRes.iGuide == guideId && (!maxRes || rkRes.iStep > maxRes.iStep)) {
                maxRes = rkRes;
            }
        }
        if (maxRes && maxRes.aReward && maxRes.aReward.length > 0) {
            var rewards: Array<SeItem> = [];
            for (var i = 0; i < maxRes.aReward.length; i++) {
                var arr = maxRes.aReward[i].split(",");
                rewards.push({ kItemID: arr[0], iPileCount: parseInt(arr[1]) });
            }
            return rewards;
        }
        return null;
    }

    private sevenDaysType: HashMap<TableRes.SeRessevendays> = new HashMap<TableRes.SeRessevendays>();
    public get7DaysByType(eType: TableRes.SeEnumsevendayskTaskType) {
        return this.sevenDaysType.get(eType);
    }

    public getChartTableByType(eType){
        let res = this.chartTable.getAllRes();
        for(var key in res){
            if(res[key].eType == eType) return res[key];
        }
    }

    public getHeroMxLevel(kid: string) {
        var pkUnit = this.UnitRes.getRes(kid);
        if (!pkUnit) return 0;
        return (this.Color2HeroLvl[pkUnit.iColour] || 0);
    }

    public getHeroPerLevel(kid: string) {
        var pkUnit = this.UnitRes.getRes(kid);
        if (!pkUnit) return 0;
        let ext_level = parseInt(this.getConfig("friend_level").split(',')[pkUnit.iColour - 1]);
        if (!ext_level || isNaN(ext_level)) ext_level = 1;

        return Math.max(1, ext_level);
    }

    public getPerLevel() {
        let ext_level = parseInt(this.getConfig("friend_level").split(',')[0]);
        if (!ext_level || isNaN(ext_level)) ext_level = 1;

        return ext_level;
    }

    private _heroBoxInit() {
        for (var key in this.HeroBoxZZYRes.resData) {
            var r: SeResHeroBox = this.HeroBoxZZYRes.resData[key];
            if (!r) continue;
            r.akCardPools = [];

            for (var i = 0; i < r.akPoolName.length; i++) {
                r.akCardPools.push({
                    name: (r.akPoolName && r.akPoolName[i]) || '',
                    iweight: (r.aiPoolWeight && r.aiPoolWeight[i]) || 1,
                    imin: (r.aiPoolMin && r.aiPoolMin[i]) || 0,
                    imax: (r.aiPoolMax && r.aiPoolMax[i]) || 0,
                    imaxuse: (r.aiMaxPool && r.aiMaxPool[i]) || 0,
                    icon: (r.akIcon && r.akIcon[i]) || 0
                })
            }
        }
    }

    private _parse_season_awards(list: Array<string>) {
        var outs: ifSeasonAward[] = [];
        for (var i = 0; i < list.length; i++) {
            var iOneLists = list[i].split(',');
            var info: ifSeasonAward = { items: [] };

            for (var j = 0; j < iOneLists.length; j++) {
                var jOneLists = iOneLists[j].split(':');
                if (jOneLists.length < 2) continue;
                switch (jOneLists[0]) {
                    case 'elo': info.elo = parseInt(jOneLists[1]); break;
                    case 'pvplevel': info.pvplevel = parseInt(jOneLists[1]); break;
                    case 'item': info.items.push({ id: jOneLists[1], num: parseInt(jOneLists[2] || '1') }); break;
                    case 'icon': info.icon = jOneLists[1]; break;
                    case 'bkicon': info.bkicon = jOneLists[1]; break;
                    case 'mallid': info.mallid = jOneLists[1]; break;
                }
            }

            outs.push(info);
        }

        return outs;
    }

    private _key2vers: HashMap<string> = new HashMap<string>();
    private init_upgrade_res() {
        for (var key in this.UpgradeRes.resData) {
            var r = this.UpgradeRes.resData[key] as TableRes.SeResupgrade;
            if (!this._key2vers.has(r.kKey, r.kValue)) {
                this._key2vers.add(r.kKey, r.kValue);
            }
        }

        this._key2vers.sort(function (a: string, b: string) {
            return a > b ? 1 : -1;
        });
    }

    getUpdateKeyVer(key) {
        return this._key2vers.get(key);
    }

    getUpgradeInfo(skey: string, ver: string, type: number, targetID: string = '') {
        for (var key in this.UpgradeRes.resData) {
            var r = this.UpgradeRes.resData[key] as TableRes.SeResupgrade;
            if (r.kKey == skey && r.kValue == ver && r.targetID == targetID && r.targetType == type) {
                return r;
            }
        }

        return null;
    }

    /**获取动态配置内容，gm可以修改的配置 */
    public getConfig(key: string): string | null | undefined {
        if (global.lsMgr) {
            let cfg = global.lsMgr.getconfigs();
            if (cfg && cfg.hasOwnProperty(key)) {
                return cfg[key];
            }
        }
        return this.configMap.get(key);
    }

    public hasConfig(key: string) {
        return this.configMap.has(key);
    }

    public getUnlockInfo(eFunc: TableRes.SeEnumUnlockeFunc) {
        for (let key in this.unlockRes.resData) {
            let r_info = this.unlockRes.resData[key] as TableRes.SeResUnlock;
            if (r_info.eFunc == eFunc) {
                return r_info;
            }
        }

        return null;
    }

    public getShopMailByType(eType: TableRes.SeEnumShopMalleType) {
        return this._type_2_shop_mall_.get(eType) || [];
    }

    public getActivityByType(eType: TableRes.SeEnumActivityeType) {
        for(var key in this.activityRes.resData){
            if(this.activityRes.resData[key].eType == eType){
                return this.activityRes.resData[key];
            }
        }
        return null;
    }

    private levelinfo_group: { [group: string]: TableRes.SeResLevelInfo[] } = {};
    private init_levelinfo() {
        this.levelinfo_group = {};
        for (let key in this.LevelInfoRes.resData) {
            let levelinfo = this.LevelInfoRes.resData[key];
            if (levelinfo) {
                if (!this.levelinfo_group[levelinfo.kGroup]) this.levelinfo_group[levelinfo.kGroup] = [];

                this.levelinfo_group[levelinfo.kGroup][levelinfo.iLevel] = levelinfo;
            }
        }
    }

    public getPltName(plt: string){
        for(let key in this.GameServerRes.resData){
            let server = this.GameServerRes.resData[key];
            if(server){
                if(server.kPlt == plt){
                    return server.kDisplayName;
                }
            }
        }
        return "";
    }
    private item2chart: { [itemid: string]: string } = {};
    private init_charttable() {
        this.item2chart = {};
        for (let key in this.chartTable.resData) {
            let rchart = this.chartTable.resData[key];
            if (rchart.kJudgeItemID) {
                this.item2chart[rchart.kJudgeItemID] = rchart.kID;
            }
        }
    }

    getItem2CharType(itemId: string) {
        if (this.item2chart.hasOwnProperty(itemId)) return this.item2chart[itemId];

        return null;
    }

    private type2MonthSign: { [type: number]: { [iday: number]: TableRes.SeResMonthSign } } = {}
    private init_MonthSign() {
        this.type2MonthSign = {};
        for (let key in this.MonthSignRes.resData) {
            let rinfo = this.MonthSignRes.resData[key];
            if (!this.type2MonthSign.hasOwnProperty(rinfo.etype)) {
                this.type2MonthSign[rinfo.etype] = {};
            }

            this.type2MonthSign[rinfo.etype][rinfo.iDay] = rinfo;
        }
    }

    getMonthSignRes(type: TableRes.SeEnumMonthSignetype, iDay: number) {
        if (!this.type2MonthSign.hasOwnProperty(type)) return null;

        if (!this.type2MonthSign[type].hasOwnProperty(iDay)) return null;

        return this.type2MonthSign[type][iDay];
    }

    private type2FestivalSign: { [type: number]: { [iday: number]: TableRes.SeResFestivalSign } } = {}
    private init_FestivalSign() {
        this.type2FestivalSign = {};
        for (let key in this.FestivalSignRes.resData) {
            let rinfo = this.FestivalSignRes.resData[key];
            if (!this.type2FestivalSign.hasOwnProperty(rinfo.etype)) {
                this.type2FestivalSign[rinfo.etype] = {};
            }

            this.type2FestivalSign[rinfo.etype][rinfo.iDay] = rinfo;
        }
    }

    getFestivalSignRes(type: TableRes.SeEnumFestivalSignetype, iDay: number) {
        if (!this.type2FestivalSign.hasOwnProperty(type)) return null;

        if (!this.type2FestivalSign[type].hasOwnProperty(iDay)) return null;

        return this.type2FestivalSign[type][iDay];
    }

}


export { SeResMgr };