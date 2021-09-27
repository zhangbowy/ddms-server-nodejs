import { SeChartUnit } from "../SeDefine";
import { redistInst, ReSortedSet, ReHash } from "../lib/TeRedis";
import { SeResChartTableEx, resMgrInst, Tab_Chart_Res, SeResModule } from "../mgr/SeResMgr";
import { Map, TeDate } from "../lib/TeTool";
import { SeResseason } from "../Res/interface";
import { UnitMgr } from "./SeUnitMgr";

interface ifSortUnit { score: number, value: { id: string | number, igroup: string } }

/**
 * 只加载一份数据，和赛季无关
 */
export class SeUnitOne {
    protected _chart_res_table_: Tab_Chart_Res;
    protected _chartDB: ReSortedSet;
    protected _plt: string;

    public name: string;
    public ready: boolean;

    public chartType: number = -1;

    protected _catch: ifSortUnit[] = [];

    /**
     * 
     * @param name 数据库的名字
     * @param length 榜单的长度
     */
    constructor(plt: string, chartType: number, name: string, length: number = 100, desc: boolean = true) {
        this._plt = plt;
        this.name = name;
        this.chartType = chartType;
        this._chart_res_table_ = resMgrInst.get_target('ChartTable.json', this._plt) as Tab_Chart_Res;
        this._chartDB = redistInst.getSortedSet(this._getName(), length, desc);
        this._chartDB.load(this._onLoad.bind(this, plt));

        setInterval(this._update_.bind(this), 1000);
    }

    protected _update_() {

    }

    get plt() {
        return this._plt;
    }

    protected _getName() {
        return this.name;
    }

    protected _onLoad() {
        if (this._catch.length > 0) {
            for (var i = 0; i < this._catch.length; i++) {
                var rku = this._catch[i];
                this._chartDB.add(rku.score, rku.value);
            }
            this._catch = [];
        }
        this.ready = true;
        var chart = this._chartDB._value;

        // 这里对结果去重一下
        let repeat: Map<ifSortUnit> = new Map();
        for (let i = 0; i < chart.length; i++) {
            let r_unit = chart[i];
            if (!r_unit) continue;
            if (r_unit.value && r_unit.value.id && repeat.has(r_unit.value.id)) {
                // 发现重复了的就提示一下
                // 删掉一个排名靠后的没事
                this._chartDB.del(r_unit.value.id, r_unit.value.igroup.split('_')[0]);
                // 这个地方处理的并不好, 因为chartDB在load的时候总是cache排名靠后的积分, 所以这里直接set高的积分，后续可以考虑改掉
                let __unit = repeat.get(r_unit.value.id);
                this._chartDB.cacheScore(this._chartDB.getIdPltByUnit(__unit.value), __unit.score);
                continue;
            }

            repeat.set(r_unit.value.id, r_unit);
        }

        this._init_load_ready();
    }

    // 触发 load reload 等操作后会进来的
    protected _init_load_ready() { }

    protected can_add(value: any) {
        if(value.score == 0) return false;
        let curr = Date.now();
        let charRes = this._chart_res_table_.findChartByType(this.chartType);
        if (charRes) {
            if (charRes.kStartDate && curr < Date.parse(charRes.kStartDate)) {
                return false;
            }

            if (charRes.kEndDate && curr > Date.parse(charRes.kEndDate)) {
                return false;
            }
        }
        return true;
    }

    public add(score: number, value: SeChartUnit) {
        if (!this.can_add(value)) return;
        if (!this.ready) {
            this._catch.push({ score: score, value: { id: value.id, igroup: value.igroup } });
            return;
        }
        this._chartDB.add(score, value);
    }

    public del(uid: number, plt: string) {
        if (!this.ready) {
            for (let i = 0; i < this._catch.length; i++) {
                let r = this._catch[i];
                if (r && r.value && r.value.id == uid) {
                    this._catch.splice(uid);
                    break;
                }
            }
        }
        else {
            this._chartDB.del(uid, plt);
        }
    }


    public get_range(begin: number, end: number): ifSortUnit[] {
        return this._chartDB.getRange(begin, end);
    }


    get length() {
        return this._chartDB.maxRank;
    }

    /**
     * 找到玩家的排名位置
     */
    find_uid_rank(uid: number, sid: string | number, plt: string) {
        return this._chartDB.getrank(uid, plt) + 1;
    }

    get_value_range(start: number, end: number, ...args: string[]) {
        var rList = this.get_range(start, end);
        var out: { score: number, value: SeChartUnit }[] = [];
        for (var i = 0; i < rList.length; i++) {
            let r = rList[i];
            let info = UnitMgr.loadInfo(this.plt, r.value.id)
            if (!info) {
                // 没有玩家信息，那么就暂时认为不在榜单上
                continue;
            }
            out.push({
                score: r.score,
                value: {
                    id: parseInt(r.value.id.toString()),
                    seasonid: info.seasonid,
                    name: info.name,
                    score: r.score,
                    icon: info.icon,
                    igroup: info.igroup
                }
            });
        }
        return out;
    }

    get_chart_length(sid: string) {
        return this._chartDB.value.length;
    }
}

/**
 * 每个赛季的数据都加载的
 */
export class SeUnit {
    protected _chartDBs: { [seasonid: string]: { db: ReSortedSet, ready: boolean } } = {}

    protected _chart_res_table_: Tab_Chart_Res;
    protected _season_res_: SeResModule<SeResseason>;

    protected _plt: string;

    public name: string;
    public ready: boolean;

    protected _extDB: ReHash;
    public ext_ready: boolean;

    public chartType: number = -1;

    protected _catch: { score: number, value: { id: string | number, igroup: string }, seasonid: string }[] = [];


    private loadinfo = { length: 100, desc: true }
    /**
     * 
     * @param name 数据库的名字
     * @param length 榜单的长度
     */
    constructor(plt: string, chartType: number, name: string, length: number = 100, desc: boolean = true) {
        this._plt = plt;
        this.name = name;
        this.chartType = chartType;

        this._chart_res_table_ = resMgrInst.get_target('ChartTable.json', this._plt) as Tab_Chart_Res;
        this._season_res_ = resMgrInst.get_target<SeResseason>('season.json', this._plt);

        this.loadinfo.length = length;
        this.loadinfo.desc = desc;

        // 实际db需要按照赛季来，这里预先加载当前赛季
        this._extDB = redistInst.getHash(this._getName() + 'ext');
        this._extDB.load(this._loadExtBB.bind(this));

        setInterval(this._update_.bind(this), 1000);
    }
    
    delallrank() {
        let newlist = [];
        for (var i = 0; i < this._catch.length; i++) {
            var rku = this._catch[i];
            if (rku.seasonid == this.current_seaseon_id) {
                continue;
            }
            newlist.push(rku);
        }
        this._catch = newlist;

        let db = this._chartDBs[this.current_seaseon_id];
        if (db) db.db.clearAll();
    }

    private get_current_season() {
        let current_season_id = '';
        let chartRes = this._chart_res_table_.findChartByType(this.chartType);
        if (chartRes && chartRes.iInSeason) {
            current_season_id = this._extDB.get('seasonid') || 'S000';
            let curr_time = Date.now();
            let loop_count = 0;
            while (loop_count < this._season_res_.length) {
                loop_count++;
                let seasonRes = this._season_res_.getRes(current_season_id);
                if (!seasonRes || !seasonRes.kNextID) break;
                if (curr_time > Date.parse(seasonRes.kEndTime)) {
                    current_season_id = seasonRes.kNextID;
                    continue;
                }
                break;
            }
        }
        return current_season_id;
    }

    private _loadExtBB(succ: boolean) {
        if (!succ) console.log("ext db load error");
        else {
            this.ext_ready = true;

            let db_season_id = this._extDB.get('seasonid') || this.get_current_season();
            let list: string[] = this._extDB.get('season_list') || [];
            if (list.indexOf(db_season_id) == -1) {
                list.push(db_season_id);
                this._extDB.save('season_list', list);
            }
            for (let i = 0; i < list.length; i++) {
                // 加载一下所有的赛季数据
                let key = list[i];
                let db = redistInst.getSortedSet(this._getName() + key, this.loadinfo.length, this.loadinfo.desc);
                this._chartDBs[key] = { db: db, ready: false };
                db.load(this._loaddb.bind(this, key));
            }
        }
    }

    private _loaddb(key: string, succ: boolean) {
        this._chartDBs[key].ready = succ;

        let ready = true;
        for (let key in this._chartDBs) {
            let r = this._chartDBs[key];
            if (!r.ready) {
                ready = false;
                break;
            }
        }

        if (!this.ready && ready) {
            this._onLoad();
        }
    }

    protected _update_() {
        // 检查赛季是否是新的了
        let sid = this.get_current_season();
        let list: string[] = this._extDB.get('season_list');
        if (list.indexOf(sid) == -1) {
            // 添加新赛季了
            list.push(sid);
            this._extDB.save('season_list', list);

            this.checkSeason();
            this._catch = [];
        }
    }

    protected checkSeason() {

    }

    get plt() {
        return this._plt;
    }

    protected _getName() {
        return this.name;
    }

    protected get current_seaseon_id() {
        return this._extDB.get('seasonid');
    }

    protected _onLoad() {
        if (this._catch.length > 0) {
            for (var i = 0; i < this._catch.length; i++) {
                var rku = this._catch[i];
                // if (rku.seasonid != this.current_seaseon_id)
                this._chartDBs[rku.seasonid].db.add(rku.score, rku.value);
            }
            this._catch = [];
        }

        this.ready = true;
        for (let key in this._chartDBs) {
            let db = this._chartDBs[key].db
            var chart = db._value;
            // 这里对结果去重一下
            let repeat: Map<ifSortUnit> = new Map();
            for (let i = 0; i < chart.length; i++) {
                let r_unit = chart[i];
                if (!r_unit) continue;
                if (r_unit.value && r_unit.value.id && repeat.has(r_unit.value.id)) {
                    // 发现重复了的就提示一下
                    // 删掉一个排名靠后的没事
                    db.del(r_unit.value.id, r_unit.value.igroup.split('_')[0]);
                    // 这个地方处理的并不好, 因为chartDB在load的时候总是cache排名靠后的积分, 所以这里直接set高的积分，后续可以考虑改掉
                    let __unit = repeat.get(r_unit.value.id);
                    db.cacheScore(db.getIdPltByUnit(__unit.value), __unit.score);
                    continue;
                }

                repeat.set(r_unit.value.id, r_unit);
            }
        }

        this._init_load_ready();
    }

    // 触发 load reload 等操作后会进来的
    protected _init_load_ready() { }

    protected can_add(value: any) {
        if(value.score == 0) return false;
        let curr = Date.now();
        let charRes = this._chart_res_table_.findChartByType(this.chartType);
        if (charRes) {
            if (charRes.kStartDate && curr < Date.parse(charRes.kStartDate)) {
                return false;
            }

            if (charRes.kEndDate && curr > Date.parse(charRes.kEndDate)) {
                return false;
            }
        }
        return true;
    }

    public add(score: number, value: SeChartUnit) {
        let addValue = { id: value.id, igroup: value.igroup };
        if (!this.can_add(value)) return;
        if (!this.ready) {
            this._catch.push({ score: score, value: addValue, seasonid: value.seasonid });
            return;
        }

        this._chartDBs[value.seasonid].db.add(score, addValue);
    }

    public del(uid: number, plt: string) {
        if (!this.ready) {
            for (let i = 0; i < this._catch.length; i++) {
                let r = this._catch[i];
                if (r && r.value && r.value.id == uid) {
                    this._catch.splice(uid);
                    break;
                }
            }
        }
        else {
            // 清除数据
            for (let key in this._chartDBs) {
                this._chartDBs[key].db.del(uid, plt);
            }
        }
    }

    get_value(sid: string): Array<ifSortUnit> {
        if (!this._chartDBs.hasOwnProperty(sid)) {
            return [];
        }
        return this._chartDBs[sid].db._value;
    }

    public get_range(begin: number, end: number, sid: string) {
        if (!this._chartDBs.hasOwnProperty(sid)) {
            return [];
        }
        return this._chartDBs[sid].db.getRange(begin, end) as { score: number, value: { id: string | number } }[];
    }

    get length() {
        return this.loadinfo.length;
    }

    /**
     * 找到玩家的排名位置
     */
    find_uid_rank(uid: number, sid: string | number, plt: string) {
        if (!this._chartDBs.hasOwnProperty(sid)) return this.length + 1;
        return this._chartDBs[sid].db.getrank(uid, plt) + 1;
    }

    get_value_range(start: number, end: number, sid: string) {
        var rList = this.get_range(start, end, sid);
        var out: { score: number, value: SeChartUnit }[] = [];
        for (var i = 0; i < rList.length; i++) {
            let r = rList[i];
            let info = UnitMgr.loadInfo(this.plt, r.value.id)
            if (!info) {
                // 没有玩家信息，那么就暂时认为不在榜单上
                continue;
            }
            out.push({
                score: r.score,
                value: {
                    id: parseInt(r.value.id.toString()),
                    seasonid: sid,
                    name: info.name,
                    score: r.score,
                    icon: info.icon,
                    igroup: info.igroup
                }
            });
        }

        return out;
    }

    get_chart_length(sid: string) {
        if (!this._chartDBs.hasOwnProperty(sid)) {
            return 0;
        }

        return this._chartDBs[sid].db.value.length;
    }
}