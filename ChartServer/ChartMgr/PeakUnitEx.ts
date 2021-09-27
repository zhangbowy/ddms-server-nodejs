/**
 * 巅峰赛榜单
 */

import { SCORE_INIT_VALUE, SeChartUnit } from "../SeDefine"
import { TeDate } from "../lib/TeTool"
import { SeResModule, resMgrInst } from "../mgr/SeResMgr"
import { SeResseason, SeResCompetitionReward } from "../Res/interface"
import { SeUnit } from './BaseUnit'
import { redistInst, ReHash, ReSortedSet } from '../lib/TeRedis'

export class PeakUnitEx extends SeUnit {

    protected _season_res_: SeResModule<SeResseason>;
    protected _chartDB_ext: ReHash;

    private _chart_reward_sort: Array<number> = []; //榜单奖励跟积分的关系
    private _chart_reward_res: Object = {};     //榜单奖励资源
    private _chart_reward_season: Object = {};  //榜单奖励原因
    private _chart_cross_reward_season: Object = {};
    private _chart_reward_grade: Object = {};   //榜单奖励档次

    private _seasonid = '';
    private need_delete = true;

    private _history_day_chart: Array<{ chart_db: ReSortedSet }> = [];
    private _history_season_chart: { chart_db: ReSortedSet };

    constructor(plt: string, chartType: number, name: string, seasonid: string, length: number, desc: boolean = true) {
        super(plt, chartType, name + seasonid, length, desc);
        
        this.name = name;
        this._seasonid = seasonid;


        this._season_res_ = resMgrInst.get_target<SeResseason>('season.json', this._plt);

        this._reward_cache();

        //load 历史数据
        //每日
        let date = new Date().getDate();
        for (let d = 0; d < this.HISTORY_MAX_COUNT; d++) {
            this._history_day_chart[d] = {
                chart_db: redistInst.getSortedSet(this._getName() + new Date(new Date().setDate(date - 1 - d)).getDate(), this.length, true)
            }

            this._history_day_chart[d].chart_db.load((err: any) => { if (!err) console.error("this._history_day_chart.chart_db.load fail") });
        }

        //赛季
        let pkRes = this._season_res_.getRes(seasonid);
        if (pkRes && pkRes.kPreviousID) {
            this._history_season_chart = {
                chart_db: redistInst.getSortedSet(this._getName() + pkRes.kPreviousID, this.length, true)
            };
            this._history_season_chart.chart_db.load((err: any) => { if (!err) console.error("this._history_season_chart.chart_db.load fail") });
        }
    }

    protected _update_() {
        super._update_();
        this.checkSeason();
        if(this.need_delete){
            // this.zlzy_del_sdw();
            this.need_delete = false;
        }
        
        this.save_chart();

        // this.infos();
    }

    private zlzy_del_sdw() {
        if(this._chartDB.key.indexOf('zlzy')!=0){
            return;
        }     
        for(var key in this._chartDB.value){
            if(this._chartDB.value[key].value.igroup.indexOf('sdw') == 0){
                console.log(this._chartDB.value[key].value.name);
                this._chartDB.del(this._chartDB.value[key].value.id,'sdw');
            }
        }
    }
    private _reward_cache() {
        //cache
        let res = resMgrInst.get_target<SeResCompetitionReward>("CompetitionReward.json", this._plt).resData;

        for (let id in res) {
            let _chart = res[id]
            let _rank = _chart.iMin;
            //排名奖励映射
            this._chart_reward_res[_rank] = _chart.akDailyRewards;
            this._chart_reward_season[_rank] = _chart.akSeasonRewards;
            this._chart_cross_reward_season[_rank] = _chart.akSeasonCrossRewards;
            this._chart_reward_grade[_rank] = _chart.kRewordClass;
            this._chart_reward_sort.push(_rank);
        }
    }

    find_uid_rank(uid: number, plt:string, value?: any) {
        //查找是不是在榜单之外
        if (!value || value <= SCORE_INIT_VALUE) {
            return this._chartDB.maxRank + 1;
        }

        return super.find_uid_rank(uid, plt, value);
    }

    add(score: number, value: SeChartUnit) {
        //先检验下是否达到上榜的积分要求
        if (score <= SCORE_INIT_VALUE) {
            super.del(value.id, value.igroup.split('_')[0]);
            return;
        }

        super.add(score, value);
    }


    /**
     * 当前赛季id
     */
    get seasonid() {
        // return this._chartDB_ext.get('seasonid') || 'S000';
        return this._seasonid;
    }

    set seasonid(v: string) {
        // this._chartDB_ext.save('seasonid', v);
        this._seasonid = v;
    }

    checkSeason() {
        //!this.ext_ready不使用
        if (!this.ready) return;
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

                if (this._history_season_chart && this._history_season_chart.chart_db) {
                    this._history_season_chart.chart_db.clearAll();
                }

                this._history_season_chart = {
                    chart_db: this._chartDB
                };

                this._catch = [];

                this._chartDB = redistInst.getSortedSet(this._getName() + this.seasonid, this.length, true);

                this.checkSeason();
            }
        }
        //如果提前到下赛季了需要回退
        var before_res = this._season_res_.getRes(pkRes.kPreviousID);
        if(curr < (new Date(before_res.kEndTime)).getTime()){
            this.seasonid = pkRes.kPreviousID;
            if (this._history_season_chart) {
                this._chartDB = this._history_season_chart.chart_db;
                this._history_season_chart = null;
            }
            else{
                this._chartDB = redistInst.getSortedSet(this._getName() + this.seasonid, this.length, true);
            }
            this._catch = [];

            this.checkSeason();
        }
    }

    /**
     * 每日奖励的问题, 没有办法只能做个镜像下来, 用redis过期来缓冲
     */
    private SAVE_TIME_POINT = 0; //保存时间点
    private HISTORY_MAX_COUNT = 3 //缓存数量
    private _save_time = new Date().setHours(this.SAVE_TIME_POINT + 24, 0, 0, 0);
    private save_chart() {
        //目前在凌晨12点的时候备份一份
        if (Date.now() < this._save_time) {
            return;
        }
        this._save_time = new Date().setHours(this.SAVE_TIME_POINT + 24, 0, 0, 0);

        //这个地方注意一下, 备份的是上一天的排行榜数据
        let date = new Date(new Date().setDate(new Date().getDate() - 1)).getDate();
        let chart_data: ReSortedSet = redistInst.getSortedSet(this._getName() + date, this.length, true);
        chart_data.copy(this._chartDB);

        //丢弃
        if (this._history_day_chart.length >= this.HISTORY_MAX_COUNT) {
            let obj: { chart_db: ReSortedSet } = this._history_day_chart.pop();
            obj.chart_db.clearAll();
        }

        this._history_day_chart.unshift({ chart_db: chart_data });
    }


    //查询历史排行
    private _find_history_rank(uid, score, chart_db: ReSortedSet, plt: string) {
        // if(!score || score <= SCORE_INIT_VALUE) {
        //     return chart_db.curRank + 1;
        // }

        return chart_db.getrank(uid, plt) + 1;
    }

    //获取
    private get_chart_reward_grade(rank: number) {
        //随便取一个资源表
        let __rank = 1;
        for (let i in this._chart_reward_sort) {
            if (rank < this._chart_reward_sort[i]) {
                break;
            }
            __rank = this._chart_reward_sort[i];
        }
        return __rank;
    }

    //发送每日奖励
    //rtime 由逻辑服自己管理
    giveDayReward(uid: number, score: number, rtime: number, plt: string) {
        if (!score || score <= SCORE_INIT_VALUE) {
            return [];
        }

        let res = resMgrInst.get_target("ConfigMaps.json", this._plt).getRes('competitionDaily');
        let daily: string = res['kValue'];
        if (!daily) {
            console.error("no giveDayReward time Daily");
            return;
        }

        let _daily = daily.split(':');

        let _now = new Date();

        let _rewards: Array<Object> = [];

        //先判断有没有历史数据可以领
        //选取可以领取的日期
        let days = Math.min(TeDate.daydiff(rtime), this.HISTORY_MAX_COUNT);
        for (let i = 0; i < days; i++) {
            let _rank = this._find_history_rank(uid, score, this._history_day_chart[i].chart_db, plt);
            if (_rank == 0) continue;

            let _reward_rank = this.get_chart_reward_grade(_rank);
            let _items = this._chart_reward_res[_reward_rank];
            let _grade = this._chart_reward_grade[_reward_rank];
            _rewards.push({ rtime: new Date().setHours(parseInt(_daily[0]) - 24 * (1 + i), parseInt(_daily[1]), 0, 0), items: _items, grade: _grade });
        }

        //再判断当天能不能领取
        if (_now.getTime() > new Date().setHours(parseInt(_daily[0]), parseInt(_daily[1]), 0, 0)) {
            let _rank = this.find_uid_rank(uid, plt, score);
            let _reward_rank = this.get_chart_reward_grade(_rank);
            let _items = this._chart_reward_res[_reward_rank];
            let _grade = this._chart_reward_grade[_reward_rank];
            _rewards.push({ rtime: _now.setHours(parseInt(_daily[0]), parseInt(_daily[1]), 0, 0), items: _items, grade: _grade });
        }

        return _rewards;
    }

    //发送赛季奖励
    //rtime 由逻辑服自己管理
    giveSeasonReward(uid: number, score: number, plt: string, isCross:boolean = false) {
        if (!score || score <= SCORE_INIT_VALUE) {
            return {};
        }

        let _rewards: { rank: number, items: Array<string>, grade: string };

        //赛季领取不需要判断资格
        let _rank = this._find_history_rank(uid, score, this._history_season_chart.chart_db, plt);
        if (_rank == 0) {
            return {};
        }

        let _reward_rank = this.get_chart_reward_grade(_rank);
        let _items;
        if(isCross){
            _items = this._chart_cross_reward_season[_reward_rank];
        }
        else{
            _items = this._chart_reward_season[_reward_rank];
        }
         
        let _grade = this._chart_reward_grade[_reward_rank];
        _rewards = { rank: _rank, items: _items, grade: _grade };

        return _rewards;
    }


}