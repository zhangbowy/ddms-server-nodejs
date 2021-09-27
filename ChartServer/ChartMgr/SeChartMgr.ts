import { SeUnit } from "./BaseUnit";
import { PeakUnitEx } from "./PeakUnitEx";
import { SeResModule, resMgrInst, Tab_Chart_Res } from "../mgr/SeResMgr";
import { SeResseason, SeResChartTable, SeEnumScoreCompetitoneCompetitionType, SeEnumChartTableeType, SeResConfigMaps } from "../Res/interface";
import { Map, arrayRandom } from "../lib/TeTool";
import { netInst } from "../NetMgr/SeNetMgr";
import { SeChartUnit, SeChartType, if_sys_ } from "../SeDefine";
import { redistInst, ReHash } from "../lib/TeRedis";
import { Captain } from "./SeWarZone";
import { configInst } from "../lib/TeConfig";
import { LevelSpeedEx } from "./LevelSpeedEx";
import { PvePkEx } from "./PvePkEx";

export var openGlobal = configInst.get('openGlobal');
export class SeUnitEx extends SeUnit {
    protected _season_res_: SeResModule<SeResseason>;
    protected parent: SeChartMgr;

    protected _chartDB_ext: ReHash;

    /**
     * 赛季对象初始化
     * @param parent 
     * @param plt 
     * @param chartType 
     * @param name 
     * @param length 
     * @param desc 
     */
    constructor(parent: SeChartMgr, plt: string, chartType: number, name: string, length: number, desc: boolean = true, seasonidcb?: Function) {
        super(plt, chartType, name, length, desc);
        this.parent = parent;
        this._season_res_ = resMgrInst.get_target<SeResseason>('season.json', this._plt);
        this._chartDB_ext = redistInst.getHash(this._getName() + 'ext');
        this._chartDB_ext.load(((seasonidcb: Function) => {
            //这里加个钩子
            if (seasonidcb) seasonidcb(this.seasonid);
            this._onExtLoad(true);
        }).bind(this, seasonidcb));
    }

    protected _init_load_ready() {
        if (!this.ready || !this.ext_ready) return;
        this.checkSeason();
    }

    protected _update_() {
        super._update_();
        this.checkSeason();
        this.infos();
    }

    // 检查是否可以添加进如榜单
    protected can_add(value: SeChartUnit) {
        if (!super.can_add(value)) return false;
        var pkChartRes = this._chart_res_table_.findChartByType(this.chartType);
        if (pkChartRes && pkChartRes.iInSeason) {
            // 检查赛季id是否符合要求
            if (value && value.seasonid && this.seasonid && this.seasonid != value.seasonid) {
                return false;
            }
        }

        return true;
    }

    /**
     * 当前赛季id
     */
    get seasonid() {
        return this._chartDB_ext.get('seasonid') || 'S000';
    }

    set seasonid(v) {
        this._chartDB_ext.save('seasonid', v);
    }

    /**
     * 作弊指令，回到上个赛季重新结算
     */
    saijiback() {
        if (!this.ready || !this.ext_ready) return;

        var pkChartRes = this._chart_res_table_.findChartByType(this.chartType);
        if (!pkChartRes || !pkChartRes.iInSeason) {
            return;
        }

        // 找到上一个赛季
        for (var key in this._season_res_.resData) {
            var rs = this._season_res_.resData[key] as SeResseason;
            if (rs.kNextID == this.seasonid) {
                this.seasonid = rs.kID;
                break;
            }
        }

        this.checkSeason();
    }

    checkSeason() {
        if (!this.ready || !this.ext_ready) return;
        // 检查一下当前的赛季是否是正确的
        var pkChartRes = this._chart_res_table_.findChartByType(this.chartType);
        if (!pkChartRes || !pkChartRes.iInSeason) {
            return;
        }
        var curr = Date.now();
        var pkRes = this._season_res_.getRes(this.seasonid);
        if (pkRes && pkRes.kEndTime) {
            if (curr > (new Date(pkRes.kEndTime)).getTime() && pkRes.kNextID) {
                // 表示当前已经超过那个赛季了，开始了新的征程
                this.seasonid = pkRes.kNextID;

                this._chartDB.clearAll();
                this._catch = [];

                this.checkSeason();
            }
        }
        else if(!pkRes){
            this.seasonid = "S001";
            this._chartDB.clearAll();
            this._catch = [];
        }
        //如果提前到下赛季了需要回退
        var before_res = this._season_res_.getRes(pkRes.kPreviousID);
        if(before_res && curr < (new Date(before_res.kEndTime)).getTime()){
            this.seasonid = pkRes.kPreviousID;
            this._chartDB.clearAll();
            this._catch = [];

            this.checkSeason();
        }
    }
}

interface ifChartPlt {
    plt: string;
    dbname: string;
}

export class SeChartMgr {
    public allChartUnit: Map<SeUnitEx | PeakUnitEx | LevelSpeedEx | PvePkEx> = new Map<SeUnitEx>();
    public warZone: Map<Captain> = new Map<Captain>();
    public plt_charts: Map<ifChartPlt> = new Map<ifChartPlt>();

    registPlt(plt: string) {
        let dbname: string = plt;
        if (plt == 'sdw') dbname = 'sdw_qzone';
        if (plt == 'qzone') dbname = 'sdw_qzone';

        if (this.plt_charts.has(plt)) {
            return;
        }
        
        this.plt_charts.set(plt, {
            plt: plt,
            dbname: dbname
        })
        
        this._create_unit(plt, dbname);

         //跨服榜单
         if(openGlobal){
            let r = this.globalPltByPlt(plt);
            if(r){
                this.plt_charts.set(r.plt, r)
                this._create_unit(r.plt, r.dbname);
            }
         }
    }

    private _bstart: boolean = false;

    private ExtChartTypes: number[] = [];

    private _create_unit(plt: string, dbname: string) {
        if (!this._bstart) {
            return;
        }
        let pre_db = this.allChartUnit.get(this.chartplt(dbname,SeChartType.SCT_PVP_SCORE));
        if (!pre_db) {
            this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_SCORE), new SeUnitEx(this, plt, SeChartType.SCT_SCORE, dbname + 'score', 200));
            this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_PVP_SCORE), new SeUnitEx(this, plt, SeChartType.SCT_PVP_SCORE, dbname + 'pvp_score', 200));
            this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_GLOBAL_PVP_SCORE), new SeUnitEx(this, plt, SeChartType.SCT_GLOBAL_PVP_SCORE, dbname + 'global_pvp_score', 200));
            this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_1V1_WIN), new SeUnitEx(this, plt, SeChartType.SCT_1V1_WIN, dbname + '1v1_win', 200));
            this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_2V2_WIN), new SeUnitEx(this, plt, SeChartType.SCT_2V2_WIN, dbname + '2v2_win', 200, true,
                ((_plt: string, _dbname: string | number, seasonid: string) => {
                    //等先拿到赛季id
                    let __db = this.allChartUnit.get(this.chartplt('' + _dbname, SeChartType.SCT_PEAK_SCORE));
                    if (!__db) {
                        this.allChartUnit.set(this.chartplt('' + _dbname, SeChartType.SCT_PEAK_SCORE), new PeakUnitEx(_plt, SeChartType.SCT_PEAK_SCORE, _dbname + 'peak_score', seasonid, 3000));
                    }
                    let __db2 = this.allChartUnit.get(this.chartplt('' + _dbname, SeChartType.SCT_GLOBAL_PEAK_SCORE));
                    if (!__db2) {
                        this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_GLOBAL_PEAK_SCORE), new PeakUnitEx(_plt, SeChartType.SCT_GLOBAL_PEAK_SCORE, dbname + 'global_peak_score', seasonid, 200)); 
                    }
                    let __db3 = this.allChartUnit.get(this.chartplt('' + _dbname, SeChartType.SCT_PUTONG_LEVEL_SPEED));
                    if (!__db3) {
                        this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_PUTONG_LEVEL_SPEED), new LevelSpeedEx(_plt, SeChartType.SCT_PUTONG_LEVEL_SPEED, dbname + 'putong_pve_time', seasonid, 200, SeEnumScoreCompetitoneCompetitionType.PuTongGuanKaJingSuSaiBang)); 
                    }
                    let __db4 = this.allChartUnit.get(this.chartplt('' + _dbname, SeChartType.SCT_KUNNAN_LEVEL_SPEED));
                    if (!__db4) {
                        this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_KUNNAN_LEVEL_SPEED), new LevelSpeedEx(_plt, SeChartType.SCT_KUNNAN_LEVEL_SPEED, dbname + 'kunnan_pve_time', seasonid, 200, SeEnumScoreCompetitoneCompetitionType.KunNanGuanKaJingSuSaiBang)); 
                    }
                    let __db5 = this.allChartUnit.get(this.chartplt('' + _dbname, SeChartType.SCT_DIYU_LEVEL_SPEED));
                    if (!__db5) {
                        this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_DIYU_LEVEL_SPEED), new LevelSpeedEx(_plt, SeChartType.SCT_DIYU_LEVEL_SPEED, dbname + 'diyu_pve_time', seasonid, 200, SeEnumScoreCompetitoneCompetitionType.DiYuGuanKaJingSuSaiBang)); 
                    }
                    let __db6 = this.allChartUnit.get(this.chartplt('' + _dbname, SeChartType.SCT_GLORY_SCORE));
                    if (!__db6) {
                        this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_GLORY_SCORE), new LevelSpeedEx(_plt, SeChartType.SCT_GLORY_SCORE, dbname + 'glory_score', seasonid, 100, SeEnumScoreCompetitoneCompetitionType.BenFuRongYaoJiFenBang, true)); 
                    }
                    let __db7 = this.allChartUnit.get(this.chartplt('' + _dbname, SeChartType.SCT_GLOBAL_GLORY_SCORE));
                    if (!__db7 && openGlobal) {
                        this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_GLOBAL_GLORY_SCORE), new LevelSpeedEx(_plt, SeChartType.SCT_GLOBAL_GLORY_SCORE, dbname + 'global_glory_score', seasonid, 200, SeEnumScoreCompetitoneCompetitionType.QuanFuRongYaoJiFenBang, true)); 
                    }
                    let __db8 = this.allChartUnit.get(this.chartplt('' + _dbname, SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED));
                    if (!__db8 && openGlobal) {
                        this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED), new LevelSpeedEx(_plt, SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED, dbname + 'global_putong_pve_time', seasonid, 200, SeEnumScoreCompetitoneCompetitionType.QuanFuPuTongGuanKaJingSuSaiBang)); 
                    }
                    let __db9 = this.allChartUnit.get(this.chartplt('' + _dbname, SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED));
                    if (!__db9 && openGlobal) {
                        this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED), new LevelSpeedEx(_plt, SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED, dbname + 'global_kunnan_pve_time', seasonid, 200, SeEnumScoreCompetitoneCompetitionType.QuanFuKunNanGuanKaJingSuSaiBang)); 
                    }
                    let __db10 = this.allChartUnit.get(this.chartplt('' + _dbname, SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED));
                    if (!__db10 && openGlobal) {
                        this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED), new LevelSpeedEx(_plt, SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED, dbname + 'global_diyu_pve_time', seasonid, 200, SeEnumScoreCompetitoneCompetitionType.QuanFuDiYuGuanKaJingSuSaiBang)); 
                    }
                    let __db11 = this.allChartUnit.get(this.chartplt('' + _dbname, SeChartType.SCT_GLOBAL_PVE_OFFLINE));
                    if (!__db11 && openGlobal) {
                        this.allChartUnit.set(this.chartplt(dbname, SeChartType.SCT_GLOBAL_PVE_OFFLINE), new PvePkEx(_plt, SeChartType.SCT_GLOBAL_PVE_OFFLINE, dbname + 'global_pve_pk', seasonid, 10000, SeEnumScoreCompetitoneCompetitionType.BenFuRongYaoJiFenBang)); 
                    }
                    // 后续还有好几中榜单，这里需要处理一下
                    let chatRes = new SeResModule<SeResChartTable>('ChartTable.json', plt);
                    for (let key in chatRes.resData) {
                        // 这里是所有的榜单信息
                        let chartes = chatRes.resData[key];
                        if (!chartes) continue;
                        if (this.ExtChartTypes.indexOf(chartes.eType) < 0) this.ExtChartTypes.push(chartes.eType);
                        // 除了特殊的榜单外的榜单
                        if (this.allChartUnit.has(this.chartplt('' + _dbname, chartes.eType)) || chartes.eType <= SeChartType.SCT_PEAK_SCORE) continue;
                        if ((chartes.iCrossSever && !openGlobal) || (!chartes.iCrossSever && openGlobal) ) continue;
                        this.allChartUnit.set(this.chartplt('' + _dbname, chartes.eType), new SeUnitEx(this, _plt, chartes.eType, _dbname + chartes.eType.toString(), chartes.iMaxPlayer || 200));
                    }

                }).bind(this, plt, dbname)
            ));
        }
        this.warZone.set(this.chartplt(plt, SeChartType.SCT_GROUP_PVP_SCORE, true), new Captain(plt));
    }

    private _db_loadInfo(bsuccess: boolean, db: ReHash) {
        if (!bsuccess) {
            return;
        }

        // this.getHisChart({ plt: 'sdw', serverid: 'S000' }, SeChartType.SCT_PVP_SCORE, 'S000', 0);
    }

    private chartplt(plt: string, type: number, warZone: boolean = false) {
        var r = this.plt_charts.get(plt);
        if (!r) return  plt + '_' + type;
        
        if (warZone) {
            let splt = plt;
            if (plt == 'sdw') splt = '';
            return splt + '_' + type;
        }
        else {
            return r.dbname + '_' + type;
        }
    }

    private globalchartplt(plt: string, type: number) {
        var r = this.plt_charts.get(this.globalPltByPlt(plt)? this.globalPltByPlt(plt).plt : null);
        if (!r) return plt + '_ ' + type;
        return r.dbname + '_' + type;
    }

    public globalPltByPlt(plt): ifChartPlt{
        //暂时全服公用一个榜单
        // if (plt == 'sdw' || plt == 'qzone') return null; 
        return {
            plt : 'global',
            dbname : 'global',
        }
        if(configInst.get("global")){
            let globals = configInst.get("global");
            for(var key in globals){
                let global = globals[key];
                if(global.split("+").indexOf(plt) != -1){
                    return {
                        plt : key,
                        dbname : key,
                    }
                }
            }
            
            if(!globals[plt]){
                return {
                    plt : 'global2',
                    dbname : 'global2',
                }
            }
        }
        else{
            return null;
        }
    }

    private get_chart(_sys_: if_sys_, type: number) {
        return this.allChartUnit.get(this.chartplt(_sys_.plt, type));
    }


    private getGenGroupId(_sys_: if_sys_, type: number, newOrold: 'new' | 'old') {
        var r_lib = this.warZone.get(this.chartplt(_sys_.plt, type, true));
        if (r_lib) return r_lib.get_gen_SoldierId(newOrold);
        return 'zq001';
    }

    private saijiback(_sys_: if_sys_) {
        var allunit = this.allChartUnit._data;
        for (let key in allunit) {
            let runit = allunit[key] as SeUnitEx;
            if (runit && runit.plt == _sys_.plt) {
                runit.saijiback && runit.saijiback();
            }
        }

        var allwarZone = this.warZone._data;
        for (let key in allwarZone) {
            let runit = allwarZone[key] as Captain;
            if (runit && runit.plt == _sys_.plt) {
                runit.saijiback && runit.saijiback();
            }
        }
    }


    private getPlayerChart(_sys_: if_sys_, type: number, startIndex: number = 0, length: number = 20, subParam: string, uid: number = 0, value?: any): { a: Array<{ score: number, value: SeChartUnit }>, s: number, r: number } {
        var rkChapter: SeUnit = null;
        if (type == SeChartType.SCT_GROUP_PVP_SCORE) {
            var r_lib = this.warZone.get(this.chartplt(_sys_.plt, type, true));
            if (r_lib) rkChapter = r_lib.getChart(subParam);
        }
        else if(type == SeChartType.SCT_GLOBAL_PVP_SCORE
            || type == SeChartType.SCT_GLOBAL_PEAK_SCORE
            || type == SeChartType.SCT_GLOBAL_GLORY_SCORE
            || type == SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED
            || type == SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED
            || type == SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED
            || type == SeChartType.SCT_GLOBAL_TOY_WEI
            || type == SeChartType.SCT_GLOBAL_TOY_SHU
            || type == SeChartType.SCT_GLOBAL_TOY_WU
            || type == SeChartType.SCT_GLOBAL_PVE_OFFLINE) {
            rkChapter = this.allChartUnit.get(this.globalchartplt(_sys_.plt, type));;
        }
        else {
            rkChapter = this.allChartUnit.get(this.chartplt(_sys_.plt, type));;
        }
        var rank = 0;
        if (!rkChapter) {
            return { a: [], s: 0, r: rank + 1 };
        }
        if (uid) {
            rank = rkChapter.find_uid_rank(uid, _sys_.plt, value);
        }
        var aaa = rkChapter.value;

        // if (configInst.get('debug') == true) {
        //     while (aaa.length < 50) aaa.push({
        //         score: (50 - aaa.length) * (type + 1),
        //         value: {
        //             id: aaa.length,
        //             name: type + '测试数据' + aaa.length,
        //             score: (50 - aaa.length) * (type + 1),
        //             icon: 'AV001',
        //             igroup: '',
        //             seasonid: 'S001',
        //         }
        //     })
        // }


        if (rkChapter.value.length <= startIndex) {
            return { a: [], s: 0, r: rank };
        }
        return { a: aaa.slice(startIndex, startIndex + length), s: aaa.length, r: rank };
    }

    private getHistoryPlayerChart(_sys_: if_sys_, type: number, startIndex: number = 0, length: number = 20, subParam: string, uid: number = 0, value?: any): { a: Array<{ score: number, value: SeChartUnit }>, s: number, r: number } {
        let chartplt = this.chartplt(_sys_.plt, type);
        if(type == SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED
        || type == SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED
        || type == SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED){
            chartplt = this.globalchartplt(_sys_.plt, type);
        }

        var rkChapter = this.allChartUnit.get(chartplt) as LevelSpeedEx;
        var rank = 0;
        if (!rkChapter) {
            return { a: [], s: 0, r: rank + 1 };
        }
        if (uid) {
            rank = rkChapter.find_history_uid_rank(uid, _sys_.plt, value);
        }
        var aaa = rkChapter.history_value;

        if (rkChapter.history_value.length <= startIndex) {
            return { a: [], s: 0, r: rank };
        }
        return { a: aaa.slice(startIndex, startIndex + length), s: aaa.length, r: rank };
    }

    //-------------------后续都是提供给外部系统的接口-----------------//

    start() {
        if (this._bstart) return;
        this._bstart = true;

        var plt_keys = this.plt_charts.keys;
        for (var i = 0; i < plt_keys.length; i++) {
            var r = this.plt_charts.get(plt_keys[i]);
            if (!r) continue;
            this._create_unit(r.plt, r.dbname);
        }

        // 这里加载历史榜单信息

        redistInst.getHash('prechart').load(this._db_loadInfo.bind(this));
    }

    public getWarZoneInfos(plt: string) {
        var zone = this.warZone.get(this.chartplt(plt, SeChartType.SCT_GROUP_PVP_SCORE, true))
        if (zone) return zone.chart_infos;
    }

    public delete_all_chart_by_uid(plt: string, uid: number) {
        for (let key in SeChartType) {
            let type = SeChartType[key];
            if (type == SeChartType.SCT_GROUP_PVP_SCORE) {
                let r = this.warZone.get(this.chartplt(plt, SeChartType.SCT_GROUP_PVP_SCORE, true));
                if (r) {
                    r.del(uid, plt);
                }
            }
            else if(type == SeChartType.SCT_GLOBAL_PVP_SCORE
                || type == SeChartType.SCT_GLOBAL_PEAK_SCORE
                || type == SeChartType.SCT_GLOBAL_GLORY_SCORE
                || type == SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED
                || type == SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED
                || type == SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED
                || type == SeChartType.SCT_GLOBAL_TOY_WEI
                || type == SeChartType.SCT_GLOBAL_TOY_SHU
                || type == SeChartType.SCT_GLOBAL_TOY_WU
                || type == SeChartType.SCT_GLOBAL_PVE_OFFLINE){
                if(this.globalPltByPlt(plt)){
                    let r = this.allChartUnit.get(this.chartplt(this.globalPltByPlt(plt).plt, type));
                    if (r) {
                        r.del(uid, plt);
                    }
                }
            }
            else {
                let r = this.allChartUnit.get(this.chartplt(plt, type));
                if (r) {
                    r.del(uid, plt);
                }
            }
        }

        for (let i = 0; i < this.ExtChartTypes.length; i++) {
            let type = this.ExtChartTypes[i];
            if (type == SeChartType.SCT_GROUP_PVP_SCORE) {
                let r = this.warZone.get(this.chartplt(plt, SeChartType.SCT_GROUP_PVP_SCORE, true));
                if (r) {
                    r.del(uid, plt);
                }
            }
            else if(type == SeChartType.SCT_GLOBAL_PVP_SCORE
                || type == SeChartType.SCT_GLOBAL_PEAK_SCORE
                || type == SeChartType.SCT_GLOBAL_GLORY_SCORE
                || type == SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED
                || type == SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED
                || type == SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED
                || type == SeChartType.SCT_GLOBAL_TOY_WEI
                || type == SeChartType.SCT_GLOBAL_TOY_SHU
                || type == SeChartType.SCT_GLOBAL_TOY_WU
                || type == SeChartType.SCT_GLOBAL_PVE_OFFLINE){
                if(this.globalPltByPlt(plt)){
                    let r = this.allChartUnit.get(this.chartplt(this.globalPltByPlt(plt).plt, type));
                    if (r) {
                        r.del(uid, plt);
                    }
                }
            }
            else {
                let r = this.allChartUnit.get(this.chartplt(plt, type));
                if (r) {
                    r.del(uid, plt);
                }
            }
        }
    }

    /**手动清理掉榜单信息 */
    public onClearRanks(plts: string[], rankTypes: number[]) {
        let out: { [plt: string]: { rank: number, name: string, uid: number, score: number }[][] } = {};
        for (let i = 0; i < plts.length; i++) {
            for (let j = 0; j < rankTypes.length; j++) {
                let plt = plts[i];
                let type = rankTypes[j];

                if (!out[plt]) out[plt] = [];

                let r = this.get_chart({ serverid: '', plt: plt }, type);
                if (!r) continue;

                r.delallrank();

                out[plt][type] = [];
            }
        }

        return out;
    }
    //-------------一下的请求都需要携带赛季id------

    public addPlayerChart(...args: any[]);
    public addPlayerChart(nid: string, _sys_: if_sys_, sid: string, type: number, chartInfo: SeChartUnit, subParam: string) {
        if (chartInfo == undefined) {
            return;
        }

        if (type == SeChartType.SCT_GROUP_PVP_SCORE) {
            var r_lib = this.warZone.get(this.chartplt(_sys_.plt, type, true));
            if (r_lib) r_lib.addChart(chartInfo);
        }
        else if(type == SeChartType.SCT_GLOBAL_PVP_SCORE
            || type == SeChartType.SCT_GLOBAL_PEAK_SCORE
            || type == SeChartType.SCT_GLOBAL_GLORY_SCORE
            || type == SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED
            || type == SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED
            || type == SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED
            || type == SeChartType.SCT_GLOBAL_TOY_WEI
            || type == SeChartType.SCT_GLOBAL_TOY_SHU
            || type == SeChartType.SCT_GLOBAL_TOY_WU
            || type == SeChartType.SCT_GLOBAL_PVE_OFFLINE){
            let rkChapter = this.allChartUnit.get(this.globalchartplt(_sys_.plt, type));
            rkChapter && rkChapter.add(chartInfo.score, chartInfo);
        }
        //由于pve星数榜bug特殊处理，不超过榜单上当前分数的不上榜
        else if(type == SeChartType.SCT_PVE_STAR){
            let rkChapter = this.allChartUnit.get(this.chartplt(_sys_.plt, type));
            let rank = rkChapter.find_uid_rank(chartInfo.id, _sys_.plt, null);
            if(rank <= rkChapter.value.length &&  Math.floor(rkChapter.value[rank -1].score) >= Math.floor(chartInfo.score)) return;
            rkChapter && rkChapter.add(chartInfo.score, chartInfo);
        }
        else {
            let rkChapter = this.allChartUnit.get(this.chartplt(_sys_.plt, type));
            rkChapter && rkChapter.add(chartInfo.score, chartInfo);
        }

    }

    public changePvePKFormation(...args: any[]);
    public changePvePKFormation(nid: string, _sys_: if_sys_, seasonid: string, uid: number, formation: object, pve_pk_extra_info: object) {
        let type = SeChartType.SCT_GLOBAL_PVE_OFFLINE;
        let rkChapter = this.allChartUnit.get(this.globalchartplt(_sys_.plt, type));
        if(rkChapter){
            let rank = rkChapter.find_uid_rank(uid, _sys_.plt, null);
            if(rank <= 3000){
                let info = JSON.parse(JSON.stringify(rkChapter.value[rank-1]));
                info.value.pve_pk_formation = formation;
                info.value.pve_pk_extra_info = pve_pk_extra_info;
                rkChapter && rkChapter.add(info.score, info.value);
            }
        }
    }

    public pvePkRefresh(...args: any[]);
    public pvePkRefresh(nid: string, _sys_: if_sys_, charid: number, indexs: Array<number>, rank: number, except: Array<{id: number, igroup: string}>) {
        let type = SeChartType.SCT_GLOBAL_PVE_OFFLINE;
        let rkChapter = this.allChartUnit.get(this.globalchartplt(_sys_.plt, type)) as PvePkEx;
        let result = {};
        if(rkChapter){
            if(!rkChapter.can_add({score: 1})) return false;
            //不要用客户端传的rank，自己取，确保正确
            rank = rkChapter.find_uid_rank(charid, _sys_.plt, null);
            var length = this.get_JJC_delta_rank(rkChapter.plt, rank);
            //池子范围，最多是自身前length名
            length = Math.min(length, rank - 1);
            //第一名取前10名进攻
            if(length == 0 && indexs.length == 3) {
                var pool = [];
                pool = rkChapter.value.slice();
                pool = pool.slice(1, 10);
                for(let index of indexs){
                    let lucky = arrayRandom(pool, true);
                    if(lucky) result[index] = lucky.value;
                    else result[index] = {};
                }
            }
            else if(length < 10 && indexs.length == 3){
                //前十的全部刷新走特殊逻辑
                var pool = [];
                pool = rkChapter.value.slice();
                //先取一个比自己靠前的
                let pool1 = pool.slice(rank - 6 > 0? rank -6 : 0, rank -1);
                let pool2 = pool.slice(rank, 10);
                let lucky1 = arrayRandom(pool1, true);
                result[0] = lucky1.value;
                //再取两个10名内
                pool2 = pool2.concat(pool1);
                let lucky2 = arrayRandom(pool2, true);
                let lucky3 = arrayRandom(pool2, true);
                result[1] = lucky2.value;
                result[2] = lucky3.value;
            }
            else if(length < 10 && indexs.length == 1){
                var pool = [];
                pool = rkChapter.value.slice();
                pool = pool.slice(rank - 6 > 0? rank -6 : 0, 10);
                for(let j = 0; j < except.length; j++){
                    for(let i = 0; i < pool.length; i++){
                        //排除已有对手的信息和自己信息
                        if((except[j].id == pool[i].value.id && except[j].igroup == pool[i].value.igroup) || pool[i].value.id == charid){
                            pool.splice(i,1);
                            i--;//如果直接break了可能检测不到自己
                        }
                    }
                }
                let lucky = pool[Math.floor(Math.random() * pool.length)];
                result[indexs[0]] = lucky? lucky.value : {};
            }
            else if(length){
                var pool = [];
                pool = rkChapter.value.slice();
                //这里不添加rank字段，不然战斗之后榜单不能删除
                // for(let i = 0; i < pool.length; i++){
                //     pool[i].value['rank'] = i + 1;
                // }
                if(rank > pool.length){
                    //在榜单外的，取最后length名
                    pool = pool.slice(rkChapter.value.length - length);
                }
                else{
                    pool = pool.slice(rank - length -1, rank -1); //这里减1是因为数组下标从0开始，排名从1开始算
                }
                
                //随机对手信息
                if(indexs.length == 1){
                    for(let j = 0; j < except.length; j++){
                        for(let i = 0; i < pool.length; i++){
                            //排除已有对手的信息
                            if(except[j].id == pool[i].value.id && except[j].igroup == pool[i].value.igroup){
                                pool.splice(i,1);
                                break;
                            }
                        }
                    }
                    let lucky = pool[Math.floor(Math.random() * pool.length)];
                    result[indexs[0]] = lucky? lucky.value : {};
                }
                else{
                    for(let index of indexs){
                        let lucky = arrayRandom(pool, true);
                        if(lucky) result[index] = lucky.value;
                        else result[index] = {};
                    }
                }
               
            }
            else{
                for(let index of indexs){
                    result[index] = {};
                }
            }
        }
        else{
            for(let index of indexs){
                result[index] = {};
            }
        }
        var para = {
            cmd: 'pvePkRefresh_ret',
            result: result,
            charid: charid,
        };
        netInst.sendData(para, nid);
    }
    public checkLastOne(...args: any[]);
    public checkLastOne(nid: string, _sys_: if_sys_,  charid: number, type: number, info: SeChartUnit, season_id: string, opp_name: string) {
        if(type != SeChartType.SCT_GLOBAL_PVE_OFFLINE) return;
        
        let rkChapter = this.allChartUnit.get(this.globalchartplt(_sys_.plt, type));
        if(rkChapter){
            let res =  resMgrInst.get_target<SeResChartTable>('ChartTable.json', rkChapter.plt).getAllRes();
            for(var key in res){
                if(res[key].eType == SeChartType.SCT_GLOBAL_PVE_OFFLINE && rkChapter.value.length >=  res[key].iMaxPlayer) return;
            }
            //排名之外的就加入到最后一名
            let rank = rkChapter.find_uid_rank(charid, _sys_.plt, null);
            let rank_change = 0;
            if(rank > rkChapter.value.length) {
                info.score = rkChapter.value.length + 1;
                rkChapter.add(rkChapter.value.length + 1, info);
                rank_change = 10001 - info.score;
            }
            
            var para = {
                cmd: 'checkLastOne_ret',
                rank: info.score,
                charid: charid,
                type: 'pve_pk_rank',
                subtype: 0,
                is_win: 0,
                season_id: season_id,
                time: Date.now(),
                opp_name: opp_name,
                rank_change: rank_change,
            };
            netInst.sendData(para, nid);
        }
    }

    private pve_pk_cd = {};
    public checkFight(...args: any[]);
    public checkFight(nid: string, _sys_: if_sys_,  charid: number, igroup: string, opp_id: number, opp_igroup: string, index: number) {
        
        let rkChapter = this.allChartUnit.get(this.globalchartplt(_sys_.plt, SeChartType.SCT_GLOBAL_PVE_OFFLINE))  as PvePkEx;
        
        if(rkChapter){
            if(!rkChapter.can_add({score: 1})) return false;
            let rank1 = rkChapter.find_uid_rank(charid, _sys_.plt, null);
            let rank2 = rkChapter.find_uid_rank(opp_id, opp_igroup? opp_igroup.split('_')[0]: '', null);

            if(this.pve_pk_cd[opp_id + opp_igroup] && (Date.now() < this.pve_pk_cd[opp_id + opp_igroup] + 3 * 60 * 1000)){
                netInst.sendData({cmd: 'checkFight_ret', charid: charid, success: false, reason: 'no cd', index: index, rank: rank2}, nid);
                return false;
            }
            else if(rank1 < 10001 && rank1 - rank2 > this.get_JJC_delta_rank(rkChapter.plt, rank1)){
                netInst.sendData({cmd: 'checkFight_ret', charid: charid, success: false, reason: 'no 100', index: index, rank: rank2}, nid);
                return false;
            }
            else if(rank1 <= rank2){
                netInst.sendData({cmd: 'checkFight_ret', charid: charid, success: true, reason: 'no rank', index: index, rank: rank2}, nid);
                return false;
            }
            this.pve_pk_cd[opp_id + opp_igroup] = Date.now();
            this.pve_pk_cd[charid + igroup] = Date.now();
            netInst.sendData({cmd: 'checkFight_ret', charid: charid, success: true, index: index, rank: rank2}, nid);
            return true;
        }
    }

    private get_JJC_delta_rank(plt: string, rank: number) :number{
        let length = 100;
        var legth_arr = resMgrInst.get_target<SeResConfigMaps>("ConfigMaps.json", plt).getRes('JJC_delta_rank').kValue.split(',');
         //获取最大排名差值
        if(rank >=  3000) {
            length = parseInt(legth_arr[0]);
        }
        else if(rank >=  1000 && rank < 3000) {
            length = parseInt(legth_arr[1]);
        }
        else if(rank >= 500 &&  rank < 1000) {
            length = parseInt(legth_arr[2]);
        }
        else if(rank >= 100 &&  rank < 500) {
            length = parseInt(legth_arr[3]);
        }
        else if(rank >= 50 &&  rank < 100) {
            length = parseInt(legth_arr[4]);
        }
        else if(rank >= 30 &&  rank < 50) {
            length = parseInt(legth_arr[5]);
        }
        else if(rank < 30 ) {
            length = parseInt(legth_arr[6]);
        }
        return length;
    }

    public onGetScoreChart(...args: any[]);
    public onGetScoreChart(nid: string, _sys_: if_sys_, sid: string, chartype: number, startindex: number, length: number, charid: number, subType: string, value?: any) {
        
        var rankInfo = this.getPlayerChart(_sys_, chartype, startindex, length, subType, charid, value);
        var para = {
            cmd: 'levelchart',
            rankinfo: rankInfo.a,
            chartype: chartype,
            startindex: startindex || 0,
            sumlength: rankInfo.s,
            charid: charid,
            rank: rankInfo.r
        };
        netInst.sendData(para, nid);
    }

    public onGetHistoryScoreChart(...args: any[]);
    public onGetHistoryScoreChart(nid: string, _sys_: if_sys_, sid: string, chartype: number, startindex: number, length: number, charid: number, subType: string, value?: any) {
        var rankInfo = this.getHistoryPlayerChart(_sys_, chartype, startindex, length, subType, charid, value);
        var para = {
            cmd: 'historylevelchart',
            rankinfo: rankInfo.a,
            chartype: chartype,
            startindex: startindex || 0,
            sumlength: rankInfo.s,
            charid: charid,
            rank: rankInfo.r
        };
        netInst.sendData(para, nid);
    }

    public onQueryRanks(...args: any[]);
    public onQueryRanks(nid: string, _sys_: if_sys_, sid: string, uid: number, rankTypes: Array<number>, value?: undefined) {
        var rlist: { type: number, rank: number }[] = []
        for (var i = 0; i < rankTypes.length; i++) {
            var rt = rankTypes[i];
            var rc = this.get_chart(_sys_, rt);
            if(rt == SeChartType.SCT_GLOBAL_PVP_SCORE
                || rt == SeChartType.SCT_GLOBAL_PEAK_SCORE
                || rt == SeChartType.SCT_GLOBAL_GLORY_SCORE
                || rt == SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED
                || rt == SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED
                || rt == SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED
                || rt == SeChartType.SCT_GLOBAL_TOY_WEI
                || rt == SeChartType.SCT_GLOBAL_TOY_SHU
                || rt == SeChartType.SCT_GLOBAL_TOY_WU
                || rt == SeChartType.SCT_GLOBAL_PVE_OFFLINE){
                if(!openGlobal) continue;
                rc = this.get_chart({ serverid: '', plt: this.globalPltByPlt(_sys_.plt).plt }, rt);
            }
            if (rc) {
                var index = rc.find_uid_rank(uid, _sys_.plt, value);
                if (index > 0) {
                    rlist.push({
                        type: rt,
                        rank: index
                    })
                }
            }
        }

        var data = {
            cmd: 'queryrank',
            infos: rlist,
            charid: uid
        }
        netInst.sendData(data, nid);
    }

    public onQueryInfo(...args: any[]);
    public onQueryInfo(nid: string, _sys_: if_sys_, sid: string, uid: number, rank: number, rankType: number, value?: undefined) {
        var rc =  this.allChartUnit.get(this.globalchartplt(_sys_.plt, rankType));
        if (rc) {
            var result = rc.getValueRange(rank-1, rank);
            if(result.length == 0) return;
            var data = {
                cmd: 'queryinfo',
                info: result[0],
                charid: uid
            }
            netInst.sendData(data, nid);
        }
    }

    /**
     * 获取一下榜单中的数据，制作成一个简单的数据
     * @param plts 
     * @param rankTypes 
     * @param len 
     */
    public QueryRanks(plts: string[], rankTypes: number[], len: number, sid: string) {
        let out: { [plt: string]: { rank: number, name: string, uid: number, score: number }[][] } = {};
        for (let i = 0; i < plts.length; i++) {
            for (let j = 0; j < rankTypes.length; j++) {
                let plt = plts[i];
                let type = rankTypes[j];

                if (!out[plt]) out[plt] = [];

                let r = this.get_chart({ serverid: '', plt: plt }, type);
                if(type == SeChartType.SCT_GLOBAL_PVP_SCORE
                    || type == SeChartType.SCT_GLOBAL_PEAK_SCORE
                    || type == SeChartType.SCT_GLOBAL_GLORY_SCORE
                    || type == SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED
                    || type == SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED
                    || type == SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED
                    || type == SeChartType.SCT_GLOBAL_TOY_WEI
                    || type == SeChartType.SCT_GLOBAL_TOY_SHU
                    || type == SeChartType.SCT_GLOBAL_TOY_WU
                    || type == SeChartType.SCT_GLOBAL_PVE_OFFLINE){
                    if(!openGlobal) continue;
                    r = this.get_chart({ serverid: '', plt: this.globalPltByPlt(plt).plt }, type);
                }else{
                    if(openGlobal) continue;
                }
                if (!r) continue;
                let chartv = r.value;
                let rankinfo: { rank: number, name: string, uid: number, score: number, plt: string }[] = [];
                let idx = 0;
                for (let key in chartv) {
                    idx++;
                    let r_info = chartv[key];
                    if (!r_info) continue;
                    if (idx > len) return;
                    rankinfo.push({
                        rank: idx,
                        uid: r_info.value.id,
                        name: r_info.value.name,
                        score: r_info.score,
                        plt: r_info.value.igroup.split('_')[0],
                    })
                }
                out[plt][type] = rankinfo;
            }
        }

        return out;
    }

    public onGetGenGroupId(...args: any[]);
    public onGetGenGroupId(nid: string, _sys_: if_sys_, sid: string, chartype: number, charid: undefined, newOrold: 'old' | 'new') {
        var para = {
            cmd: 'gengroupid',
            charid: charid,
            groupid: this.getGenGroupId(_sys_, chartype, newOrold)
        };
        netInst.sendData(para, nid);
    }

    public cheatMsg(...data: any[]);
    public cheatMsg(nid: string, _sys_: if_sys_, sid: string, cmd: string) {
        switch (cmd) {
            case 'saijiback': this.saijiback(_sys_); break;
        }
    }

    public onGiveDayReward(...args: any[]);
    public onGiveDayReward(nid: string, _sys_: if_sys_, sid: string, chartype: number, uid: number = 0, score: number, rtime: number, pass_time: number) {
        if (chartype != SeChartType.SCT_PEAK_SCORE) {
            return;
        }

        let rkChapter = this.allChartUnit.get(this.chartplt(_sys_.plt, chartype)) as PeakUnitEx;
        let rewards: Object[];
        if (rkChapter) {
            rewards = rkChapter.giveDayReward(uid, score, rtime, _sys_.plt);
        }

        var data = {
            cmd: 'giveDayReward_ret',
            reward: rewards,
            charid: uid,
            pass_time: pass_time
        }
        netInst.sendData(data, nid);
    }

    public onGiveDayCrossReward(...args: any[]);
    public onGiveDayCrossReward(nid: string, _sys_: if_sys_, sid: string, chartype: number, uid: number = 0, score: number, rtime: number, pass_time: number) {
        if (chartype == SeChartType.SCT_GLOBAL_PVE_OFFLINE) {
            let rkChapter = this.allChartUnit.get(this.chartplt(this.globalPltByPlt(_sys_.plt).plt, chartype)) as PvePkEx;
            let rewards: Object[];
            if (rkChapter) {
                rewards = rkChapter.giveDayReward(uid, score, rtime, _sys_.plt, true);
            }
    
            var data = {
                cmd: 'givePvePkDayCrossReward_ret',
                reward: rewards,
                charid: uid,
                pass_time: pass_time,
                chartype : chartype
            }
            netInst.sendData(data, nid);
        }
    }

    public onGiveSeasonReward(...args: any[]);
    public onGiveSeasonReward(nid: string, _sys_: if_sys_, sid: string, chartype: number, uid: number = 0, score: number, rtime: number) {
        if (chartype == SeChartType.SCT_PEAK_SCORE ) {
            let rkChapter = this.allChartUnit.get(this.chartplt(_sys_.plt, chartype)) as PeakUnitEx;
            let reward: {} = {};
            if (rkChapter) {
                reward = rkChapter.giveSeasonReward(uid, score, _sys_.plt);
            }
            
            var data = {
                cmd: 'giveSeasonReward_ret',
                reward: reward,
                charid: uid,
                chartype : chartype,
            }
            netInst.sendData(data, nid);
        }
        else if(chartype == SeChartType.SCT_PUTONG_LEVEL_SPEED 
            || chartype == SeChartType.SCT_KUNNAN_LEVEL_SPEED
            || chartype == SeChartType.SCT_DIYU_LEVEL_SPEED
            || chartype == SeChartType.SCT_GLORY_SCORE){
            let rkChapter = this.allChartUnit.get(this.chartplt(_sys_.plt, chartype)) as LevelSpeedEx;
            let reward: {} = {};
            if (rkChapter) {
                reward = rkChapter.giveSeasonReward(uid, score, _sys_.plt);
            }

            var data = {
                cmd: 'giveLevelSpeedSeasonReward_ret',
                reward: reward,
                charid: uid,
                chartype: chartype,
            }
            netInst.sendData(data, nid);
        }
    }

    public onGiveSeasonCrossReward(...args: any[]);
    public onGiveSeasonCrossReward(nid: string, _sys_: if_sys_, sid: string, chartype: number, uid: number = 0, score: number, rtime: number) {
        if (chartype == SeChartType.SCT_GLOBAL_PEAK_SCORE ) {
            let rkChapter = this.allChartUnit.get(this.chartplt(this.globalPltByPlt(_sys_.plt).plt, chartype)) as PeakUnitEx;
            let reward: {};
            if (rkChapter) {
                reward = rkChapter.giveSeasonReward(uid, score, _sys_.plt, true);
            }
    
            var data = {
                cmd: 'giveSeasonCrossReward_ret',
                reward: reward,
                charid: uid,
                chartype : chartype
            }
            netInst.sendData(data, nid);
        }
        else if(chartype == SeChartType.SCT_GLOBAL_GLORY_SCORE
            || chartype == SeChartType.SCT_GLOBAL_PUTONG_LEVEL_SPEED
            || chartype == SeChartType.SCT_GLOBAL_KUNNAN_LEVEL_SPEED
            || chartype == SeChartType.SCT_GLOBAL_DIYU_LEVEL_SPEED){
            let rkChapter = this.allChartUnit.get(this.globalchartplt(_sys_.plt, chartype)) as LevelSpeedEx;
            let reward: {};
            if (rkChapter) {
                reward = rkChapter.giveSeasonReward(uid, score, _sys_.plt);
            }

            var data = {
                cmd: 'giveLevelSpeedSeasonReward_ret',
                reward: reward,
                charid: uid,
                chartype: chartype,
            }
            netInst.sendData(data, nid);
        }
        else if(chartype == SeChartType.SCT_GLOBAL_PVE_OFFLINE){
            let rkChapter = this.allChartUnit.get(this.chartplt(this.globalPltByPlt(_sys_.plt).plt, chartype)) as PvePkEx;
            let reward: {};
            if (rkChapter) {
                reward = rkChapter.giveSeasonReward(uid, score, _sys_.plt, true);
            }
    
            var data = {
                cmd: 'givePvePkSeasonCrossReward_ret',
                reward: reward,
                charid: uid,
                chartype : chartype
            }
            netInst.sendData(data, nid);
        }
    }
}