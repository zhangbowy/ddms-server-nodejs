/**
 * 巅峰赛榜单
 */

import { SCORE_INIT_VALUE, SeChartUnit } from "../SeDefine"
import { TeDate } from "../lib/TeTool"
import { resMgrInst } from "../mgr/SeResMgr"
import { SeUnit } from './BaseUnit'
import { redistInst, ReSortedSet } from '../lib/TeRedis'
import { SeResCompetitionReward } from "../Res/interface";

export class PeakUnitEx extends SeUnit {

    private _chart_reward_sort: Array<number> = []; //榜单奖励跟积分的关系
    private _chart_reward_res: Object = {};     //榜单奖励资源
    private _chart_reward_season: Object = {};  //榜单奖励原因
    private _chart_reward_grade: Object = {};   //榜单奖励档次

    private _history_day_chart: Array<{ chart_db: ReSortedSet }> = [];

    constructor(plt: string, chartType: number, name: string, length: number, desc: boolean = true) {
        super(plt, chartType, name, length, desc);

        this.name = name;

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

    }

    protected _update_() {
        super._update_();
        this.save_chart();
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
            this._chart_reward_grade[_rank] = _chart.kRewordClass;
            this._chart_reward_sort.push(_rank);
        }
    }

    find_uid_rank(uid: number, sid: string | number, plt: string) {
        //由于V2没有用起来，所以直接注释掉
        return this.length + 1;
        //查找是不是在榜单之外
        // if (!value || value <= SCORE_INIT_VALUE) {
        //     return this.length + 1;
        // }

        // return super.find_uid_rank(uid, value, plt);
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
        chart_data.copy(this._chartDBs[this.current_seaseon_id].db);

        //丢弃
        if (this._history_day_chart.length >= this.HISTORY_MAX_COUNT) {
            let obj: { chart_db: ReSortedSet } = this._history_day_chart.pop();
            obj.chart_db.clearAll();
        }

        this._history_day_chart.unshift({ chart_db: chart_data });
    }


    //查询历史排行
    private _find_history_rank(uid: number, score: number, chart_db: ReSortedSet) {
        // if(!score || score <= SCORE_INIT_VALUE) {
        //     return chart_db.curRank + 1;
        // }

        return chart_db.getrank(uid, this.plt) + 1;
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
            let _rank = this._find_history_rank(uid, score, this._history_day_chart[i].chart_db);
            if (_rank == 0) continue;

            let _reward_rank = this.get_chart_reward_grade(_rank);
            let _items = this._chart_reward_res[_reward_rank];
            let _grade = this._chart_reward_grade[_reward_rank];
            _rewards.push({ rtime: new Date().setHours(parseInt(_daily[0]) - 24 * (1 + i), parseInt(_daily[1]), 0, 0), items: _items, grade: _grade });
        }

        //再判断当天能不能领取
        if (_now.getTime() > new Date().setHours(parseInt(_daily[0]), parseInt(_daily[1]), 0, 0)) {
            let _rank = this.find_uid_rank(uid, score, plt);
            let _reward_rank = this.get_chart_reward_grade(_rank);
            let _items = this._chart_reward_res[_reward_rank];
            let _grade = this._chart_reward_grade[_reward_rank];
            _rewards.push({ rtime: _now.setHours(parseInt(_daily[0]), parseInt(_daily[1]), 0, 0), items: _items, grade: _grade });
        }

        return _rewards;
    }

    //发送赛季奖励
    //rtime 由逻辑服自己管理
    giveSeasonReward(uid: number, score: number, sid: string) {
        if (!score || score <= SCORE_INIT_VALUE) {
            return {};
        }

        let _rewards: { rank: number, items: Array<string>, grade: string };
        // 找到这个赛季的上个赛季id
        let pkRes = this._season_res_.getRes(sid);

        if (!pkRes) return {};

        //赛季领取不需要判断资格
        let _rank = this._find_history_rank(uid, score, this._chartDBs[pkRes.kPreviousID].db);
        if (_rank == 0) {
            return {};
        }

        let _reward_rank = this.get_chart_reward_grade(_rank);
        let _items = this._chart_reward_season[_reward_rank];
        let _grade = this._chart_reward_grade[_reward_rank];
        _rewards = { rank: _rank, items: _items, grade: _grade };

        return _rewards;
    }
}