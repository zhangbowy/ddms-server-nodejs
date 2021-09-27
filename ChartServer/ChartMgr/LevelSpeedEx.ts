/**
 * 巅峰赛榜单
 */

import { SCORE_INIT_VALUE, SeChartUnit } from "../SeDefine"
import { TeDate } from "../lib/TeTool"
import { SeResModule, resMgrInst } from "../mgr/SeResMgr"
import { SeResseason, SeResCompetitionReward, SeEnumScoreCompetitoneCompetitionType, SeResScoreCompetiton } from "../Res/interface"
import { SeUnit } from './BaseUnit'
import { redistInst, ReHash, ReSortedSet } from '../lib/TeRedis'

export class LevelSpeedEx extends SeUnit {

    protected _season_res_: SeResModule<SeResseason>;
    protected _chartDB_ext: ReHash;

    private _chart_type: SeEnumScoreCompetitoneCompetitionType;
    private _chart_reward_sort: Array<number> = []; //榜单奖励跟积分的关系
    private _chart_reward_res: Object = {};     //榜单奖励资源
    private _chart_reward_season: Object = {};  //榜单奖励原因
    private _chart_cross_reward_season: Object = {};
    private _chart_reward_grade: Object = {};   //榜单奖励档次

    private _seasonid = '';
    private _desc = false;
    private _history_season_chart: { chart_db: ReSortedSet };

    constructor(plt: string, chartType: number, name: string, seasonid: string, length: number, type: SeEnumScoreCompetitoneCompetitionType, desc: boolean = false) {
        super(plt, chartType, name + seasonid, length, desc);
        this._desc = desc;
        this._chart_type = type;
        this.name = name;
        this._seasonid = seasonid;


        this._season_res_ = resMgrInst.get_target<SeResseason>('season.json', this._plt);

        this._reward_cache();

        //load 历史数据
        //赛季
        let pkRes = this._season_res_.getRes(seasonid);
        if (pkRes && pkRes.kPreviousID) {
            this._history_season_chart = {
                chart_db: redistInst.getSortedSet(this._getName() + pkRes.kPreviousID, this.length, desc)
            };
            this._history_season_chart.chart_db.load((err: any) => { if (!err) console.error("this._history_season_chart.chart_db.load fail") });
        }
    }

    protected _update_() {
        super._update_();
        this.checkSeason();

        // this.infos();
    }

    
    private _reward_cache() {
        //cache
        let res = resMgrInst.get_target<SeResScoreCompetiton>("ScoreCompetiton.json", this._plt).resData;

        for (let id in res) {
            if(res[id].eCompetitionType != this._chart_type){
                continue;
            }
            let _chart = res[id]
            let _rank = _chart.iMin;
            //排名奖励映射
            this._chart_reward_season[_rank] = _chart.akRankRewards;
            this._chart_reward_grade[_rank] = _chart.kRewordClass;
            this._chart_reward_sort.push(_rank);
        }
    }

    find_uid_rank(uid: number, plt:string, value?: any) {
        //查找是不是在榜单之外
        return super.find_uid_rank(uid, plt, value);
    }

    find_history_uid_rank(uid: number, plt:string, value?: any) {
        //查找是不是在榜单之外
        if(this._history_season_chart && this._history_season_chart.chart_db){
            return this._history_season_chart.chart_db.getrank(uid, plt) + 1;
        }
        else{
            return 201;
        }
    }

    add(score: number, value: SeChartUnit) {
        super.add(score, value);
    }

    get history_value(): Array<{ score: number, value: SeChartUnit }> {
        return this._history_season_chart.chart_db._value;
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

                this._chartDB = redistInst.getSortedSet(this._getName() + this.seasonid, this.length, this._desc);

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
                this._chartDB = redistInst.getSortedSet(this._getName() + this.seasonid, this.length, this._desc);
            }
            this._catch = [];

            this.checkSeason();
        }
    }

    /**
     * 每日奖励的问题, 没有办法只能做个镜像下来, 用redis过期来缓冲
     */
    private HISTORY_MAX_COUNT = 3 //缓存数量


    //查询历史排行
    private _find_history_rank(uid, score, chart_db: ReSortedSet, plt: string) {
        // if(!score || score <= SCORE_INIT_VALUE) {
        //     return chart_db.curRank + 1;
        // }

        return chart_db.getrank(uid, plt) + 1;
    }

    //获取
    private get_chart_reward_grade(rank: number) {
        if(rank > this.length){
            return null;
        }
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
    //发送赛季奖励
    //rtime 由逻辑服自己管理
    giveSeasonReward(uid: number, score: number, plt: string, isCross:boolean = false) {
        if (!score) {
            return {};
        }

        let _rewards: { rank: number, items: Array<string>, grade: string };

        //赛季领取不需要判断资格
        let _rank = this._find_history_rank(uid, score, this._history_season_chart.chart_db, plt);
        if (_rank == 0) {
            return {};
        }

        let _reward_rank = this.get_chart_reward_grade(_rank);
        if(!_reward_rank) return {};
        let _items = this._chart_reward_season[_reward_rank];
         
        let _grade = this._chart_reward_grade[_reward_rank];
        _rewards = { rank: _rank, items: _items, grade: _grade };

        return _rewards;
    }


}