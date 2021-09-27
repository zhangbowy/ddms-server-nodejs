import { SeChartUnit, SeChartType } from "../SeDefine";
import { redistInst, ReSortedSet } from "../lib/TeRedis";
import { SeResChartTableEx, Tab_Chart_Res, resMgrInst } from "../mgr/SeResMgr";
import { Map, TeDate } from "../lib/TeTool";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

enum ChartFuncType {
    fresh = 1,
    load = 2,
    weeklyfresh = 3,
}

export class SeUnit {
    static name2func: Object = {};
    static registChartName2Func(name: string, opr: ChartFuncType, fn: Function) {
        SeUnit.name2func[name + '_' + opr] = fn;
    }

    static getFunc(name: string, opr: ChartFuncType) {
        var key = name + '_' + opr;
        if (SeUnit.name2func.hasOwnProperty(key)) {
            return SeUnit.name2func[key];
        }

        return null;
    }

    protected _chart_res_table_: Tab_Chart_Res;

    protected _chartDB: ReSortedSet;
    protected _plt: string;

    public name: string;
    public ready: boolean;
    public ext_ready: boolean;
    public bWeekly: boolean;
    public chartType: number = -1;

    protected _catch = [];

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
        this.bWeekly = false;
        this._chartDB = redistInst.getSortedSet(this._getName(), length, desc);
        this._chartDB.load(this._onLoad.bind(this, plt));

        if (this.bWeekly) {
            this._chartDB.timeOut = 7 * 24 * 60 * 60;   // 设置一个7天的有效期
            setInterval(this.checkWeekly.bind(this), 1000);
        }

        setInterval(this._update_.bind(this), 1000);
    }

    protected _update_() {
        this.dailyKeep();
    }

    /**自我爆炸的榜单 */
    public delallrank(){
        this._catch = [];
        this._chartDB.clearAll();
    }


    private info_temp = 0;
    protected infos() {
        if (this.info_temp < 90000) {
            this.info_temp++;
            return;
        }
        this.info_temp = 0;

        console.log(this.name + " _chartDB length: " + this._chartDB._value.length || "null");

        if (this['_history_season_chart']) {
            console.log(this.name + " _history_season_chart length: " + this['_history_season_chart'].chart_db._value.length || "null");
            // console.log(this.name + " _history_season_chart_list length: " + this['_history_season_chart'].list_db._value.length || "null");
        }
        if (this['_history_day_chart']) {
            for (let i in this['_history_day_chart']) {
                console.log(this.name + " _history_day_chart length: [" + i + '] ' + this['_history_day_chart'][i].chart_db._value.length || "null");
                // console.log(this.name + " _history_day_chart_list length: [" + i + '] ' + this['_history_day_chart'][i].list_db._value.length || "null");            
            }
        }
    }

    get plt() {
        return this._plt;
    }

    /**
     * 检查是否到了发奖励的时候
     */
    protected _updateAwards() {
        if (!this.ext_ready) return;
    }

    protected _getName() {
        if (this.bWeekly) {
            var time = new Date();
            var ntime = new Date(time.getFullYear(), time.getMonth(), time.getDate()).getTime() - time.getDay() * 24 * 60 * 60 * 1000;
            return this.name + TeDate.Date_Format(new Date(ntime), "yyyy-MM-dd");
        }

        return this.name;
    }

    checkWeekly() {
        if (this._chartDB.key != this._getName()) {
            this._catch = [];
            var fn = SeUnit.getFunc(this.name, ChartFuncType.weeklyfresh);
            fn && fn();
            this.ready = false;
            this._chartDB = redistInst.getSortedSet(this._getName(), length);
            this._chartDB.load(this._onLoad.bind(this));
            if (this.bWeekly) this._chartDB.timeOut = 7 * 24 * 60 * 60;   // 设置一个7天的有效期
        }
    }

    private _last_keep_time = 0;
    private dailyKeep() {
        if (!this.ready) return;
        if (this.chartType != SeChartType.SCT_SCORE && this.chartType != SeChartType.SCT_PEAK_SCORE) return;
        // 这里做一个特殊的功能，保存一下特定的榜单信息
        if (Date.now() - this._last_keep_time > 5 * 60 * 1000) {
            // 每5分钟保存一次榜单信息

            if (!existsSync('./chartranks')) {
                mkdirSync('./chartranks');
            }

            let chart = this._chartDB.value as { value: { seasonid: string, id: number, name: string, score: number } }[];

            let loglist: string[] = [];

            for (let i = 0; i < chart.length; i++) {
                let r_chart = chart[i].value;
                loglist.push([i + 1, r_chart.id, r_chart.score, r_chart.seasonid, r_chart.name].join(','))
            }

            writeFileSync(join('./chartranks', this._getName() + this._plt + '.csv'), loglist.join('\n'), { flag: 'w+' });

            this._last_keep_time = Date.now();
        }
    }

    protected _onLoad(succ: boolean) {
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
        let repeat: Map<{ score: number, value: SeChartUnit }> = new Map<{ score: number, value: SeChartUnit }>();
        for (let i = 0; i < chart.length; i++) {
            let r_unit = chart[i];
            if (!r_unit) continue;
            if (r_unit.value && r_unit.value.id && repeat.has(r_unit.value.id) && r_unit.value.igroup == repeat.get(r_unit.value.id).value.igroup) {
                // 发现重复了的就提示一下
                // 删掉一个排名靠后的没事
                this._chartDB.del(r_unit.value.id, r_unit.value.igroup.split('_')[0]);
                // 这个地方处理的并不好, 因为chartDB在load的时候总是cache排名靠后的积分, 所以这里直接set高的积分，后续可以考虑改掉
                let __unit = repeat.get(r_unit.value.id);
                this._chartDB.cacheScore(this._chartDB.getIdPltByUnit(__unit.value), __unit.value.score);
                continue;
            }

            repeat.set(r_unit.value.id, r_unit);
        }

        // 保存一下数据在本地文件
        try {
            if (!existsSync('./charts')) {
                mkdirSync('./charts');
            }

            writeFileSync(join('./charts', this._getName() + this._plt + '.log'), JSON.stringify(chart, null, 4), { flag: 'w+' });
        }
        catch (e) {

        }

        this._init_load_ready();
    }

    same_split(info: { id: number }[], num: number) {
        var map: Object = {};
        var out = [];
        for (var i = 0; i < info.length && out.length < num; i++) {
            var r = info[i];
            if (!r || !r.id) continue;
            var id = r.id.toString();
            if (map.hasOwnProperty(id)) {
                continue;
            }

            map[id] = true;
            out.push(info[i]);
        }

        return out;
    }

    same_split2(info: { value: { id: number } }[], num: number) {
        var map: Object = {};
        var out = [];
        for (var i = 0; i < info.length && out.length < num; i++) {
            var r = info[i];
            if (!r || !r.value || !r.value.id) continue;
            var id = r.value.id.toString();
            if (map.hasOwnProperty(id)) {
                continue;
            }

            map[id] = true;
            out.push(info[i]);
        }

        return out;
    }

    // 触发 load reload 等操作后会进来的
    protected _init_load_ready() { }

    protected _onExtLoad(succ: boolean) {
        this.ext_ready = true;
        this._init_load_ready();
        // 
    }

    protected can_add(value: any) {
        if(value.score == 0) return false;
        // 这里增加一个通用的配置，如果配置了榜单的开始结束时间
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

    public add(score: number, value: SeChartUnit, out_remove?: boolean, refresh_value?: boolean) {
        if (!this.can_add(value)) return;
        if (!this.ready) {
            this._catch.push({ score: score, value: value });
            return;
        }
        this._chartDB.add(score, value, out_remove, refresh_value);
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

    get value(): Array<{ score: number, value: SeChartUnit }> {
        return this._chartDB._value;
    }

    public getRange(begin, end) {
        return this._chartDB.getRange(begin, end);
    }

    set timeOut(time: number) {
        this._chartDB.timeOut = time;
    }

    get length() {
        return this._chartDB.maxRank;
    }

    /**
     * 找到玩家的排名位置
     */
    find_uid_rank(uid: number, plt: string, value: any) {
        // 遍历查询太费效率了，有点恐怖
        // for (var i = 0; i < this._chart.length; i++) {
        //     var rinfo = this._chart[i];
        //     if (rinfo.value.id == uid) {
        //         return i + 1;
        //     }
        // }

        return this._chartDB.getrank(uid, plt) + 1;
    }

    protected _getRank(uid: number, list: Array<SeChartUnit>) {
        var rank = 0;
        for (var i = 0; i < list.length; i++) {
            var r = list[i];
            if (r.id == uid) {
                rank = i;
                break;
            }
        }

        return { r: rank, info: list };
    }

    getValueRange(start: number, end: number) {
        var rList = this.value.slice(start, end);
        var out: SeChartUnit[] = [];
        for (var i = 0; i < rList.length; i++) {
            out.push(rList[i].value);
        }

        return out;
    }


}