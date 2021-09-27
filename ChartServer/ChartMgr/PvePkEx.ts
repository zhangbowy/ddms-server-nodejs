/**
 * 巅峰赛榜单
 */

import { SCORE_INIT_VALUE, SeChartUnit, PVE_PK_INIT_VALUE } from "../SeDefine"
import { TeDate, arrayRandom } from "../lib/TeTool"
import { SeResModule, resMgrInst } from "../mgr/SeResMgr"
import { SeResseason, SeResCompetitionReward, SeEnumScoreCompetitoneCompetitionType, SeResScoreCompetiton, SeResUnit, SeResConfigMaps, SeEnumUnitiSoldierType, SeEnumUnitiColour, SeResJJCReward } from "../Res/interface"
import { SeUnit } from './BaseUnit'
import { redistInst, ReHash, ReSortedSet } from '../lib/TeRedis'
import { robotNameInst } from "../mgr/RobotName"
import { netInst } from "../NetMgr/SeNetMgr"

export class PvePkEx extends SeUnit {

    protected _season_res_: SeResModule<SeResseason>;
    protected _chartDB_ext: ReHash;

    private _chart_type: SeEnumScoreCompetitoneCompetitionType;
    private _chart_reward_sort: Array<number> = []; //榜单奖励跟积分的关系
    private _chart_cross_reward_res: Object = {};     //榜单奖励资源
    private _chart_cross_reward_season: Object = {};
    private _chart_reward_grade: Object = {};   //榜单奖励档次
    //普通卡池
    private original_pool = []; 
    //金卡池子
    private gold_pool = []; 
    //位置
    private location = []; 
    private _seasonid = '';
    private _desc = false;
    private max_num = 10000;
    private _history_season_chart: { chart_db: ReSortedSet };
    private _history_day_chart: Array<{ chart_db: ReSortedSet }> = [];
    
    constructor(plt: string, chartType: number, name: string, seasonid: string, length: number, type: SeEnumScoreCompetitoneCompetitionType, desc: boolean = false) {
        super(plt, chartType, name + seasonid, length, desc);
        this._desc = desc;
        this._chart_type = type;
        this.name = name;
        this._seasonid = seasonid;
        this.max_num = length;
        
        this._season_res_ = resMgrInst.get_target<SeResseason>('season.json', this._plt);

        this._reward_cache();

        //load 历史数据
        //每日
        let date = new Date().getDate();
        for (let d = 0; d < this.HISTORY_MAX_COUNT; d++) {
            this._history_day_chart[d] = {
                chart_db: redistInst.getSortedSet(this._getName() + new Date(new Date().setDate(date - 1 - d)).getDate(), this.length, false)
            }
       
            this._history_day_chart[d].chart_db.load((err: any) => { if (!err) console.error("this._history_day_chart.chart_db.load fail") });
        }
        //赛季
        let pkRes = this._season_res_.getRes(seasonid);
        if (pkRes && pkRes.kPreviousID) {
            this._history_season_chart = {
                chart_db: redistInst.getSortedSet(this._getName() + pkRes.kPreviousID, this.length, desc)
            };
            this._history_season_chart.chart_db.load((err: any) => { if (!err) console.error("this._history_season_chart.chart_db.load fail") });
        }

        //初始化卡牌池子
        if(this._plt == 'global'){
            let all_hero = resMgrInst.get_target<SeResUnit>("Unit.json", this._plt).getAllRes();
            let forbidden_hero = resMgrInst.get_target<SeResConfigMaps>("ConfigMaps.json", this._plt).getRes('JJC_forbidden').kValue;
            for(var key in all_hero){
                let hero_res = all_hero[key];
                if(forbidden_hero.indexOf(hero_res.kID) != -1) continue;
                if(hero_res.iSoldierType == SeEnumUnitiSoldierType.FaShu 
                    || hero_res.iSoldierType == SeEnumUnitiSoldierType.ZhaoHuan 
                    || hero_res.iSoldierType == SeEnumUnitiSoldierType.JianZhu 
                    || hero_res.iSoldierType == SeEnumUnitiSoldierType.Ta
                    || hero_res.iSoldierType == SeEnumUnitiSoldierType.ZhangAiWu
                    || hero_res.iSoldierType == SeEnumUnitiSoldierType.PVETa) continue;
                if(hero_res.iOpenGrade >= 100 || hero_res.iOpenGrade < 0) continue;
                if(hero_res.iColour == SeEnumUnitiColour.Cheng) this.gold_pool.push(hero_res.kID);
                else this.original_pool.push(hero_res.kID);
            }
            this.location = resMgrInst.get_target<SeResConfigMaps>("ConfigMaps.json", this._plt).getRes('JJC_xy').kValue.split('|');
        }
    }

    protected _update_() {
        super._update_();
        this.checkSeason();
        this.checkRight();
        this.save_chart();
        // this.infos();
    }

   
    private _reward_cache() {
        //cache
        let res = resMgrInst.get_target<SeResJJCReward>("JJCReward.json", this._plt).resData;

        for (let id in res) {
            let _chart = res[id]
            let _rank = _chart.iMin;
            //排名奖励映射
            this._chart_cross_reward_res[_rank] = _chart.akDailyCrossRewards;
            this._chart_cross_reward_season[_rank] = _chart.akSeasonCrossRewards;
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
            return 10001;
        }
    }

    can_add(value){
        return super.can_add(value);
    }

    add(score: number, value: SeChartUnit) {
        super.add(score, value, true, true);
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

    checkSeason(next_season_player = []) {
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
                //把当前赛季需要保留到下赛季的人记录下来,100名以内排名+500,100-1000名排名+1000,1000名以外直接未上榜
                for(let j = 0; j < this._chartDB.value.length; j++){
                    let chart_info = this._chartDB.value[j].value as SeChartUnit;
                    if(chart_info.id > 3000){
                        if(j < 100){
                            chart_info.score += 500;
                            chart_info.seasonid = this.seasonid;
                            next_season_player[chart_info.score] = chart_info
                        }
                        else if(j >= 100 && j < 1000){
                            chart_info.score += 1000;
                            chart_info.seasonid = this.seasonid;
                            next_season_player[chart_info.score] = chart_info
                        }
                    }
                }

                if (this._history_season_chart && this._history_season_chart.chart_db) {
                    this._history_season_chart.chart_db.clearAll();
                }

                this._history_season_chart = {
                    chart_db: this._chartDB
                };

                this._catch = [];

                this._chartDB = redistInst.getSortedSet(this._getName() + this.seasonid, this.length, this._desc);
                this.checkSeason(next_season_player);
            }
        }
        //初始化ai,如果有上赛季保留下来的，直接加上
        if(this._chartDB.value.length == 0 && this._plt == 'global'){
            //前4名ai特殊
            this.add(1, {seasonid: this.seasonid, id: 1, name: '董卓', score: 1, icon: 'TX069', avatar: { vip: 1, iconid: "AV001" },igroup: '', is_vip: false, vip_level: 0, pve_pk_formation: this.randomAICard(1)});
            this.add(2, {seasonid: this.seasonid, id: 2, name: '吕布', score: 2, icon: 'TX083', avatar: { vip: 1, iconid: "AV001" },igroup: '', is_vip: false, vip_level: 0, pve_pk_formation: this.randomAICard(2)});
            this.add(3, {seasonid: this.seasonid, id: 3, name: '貂蝉', score: 3, icon: 'TX018', avatar: { vip: 1, iconid: "AV001" },igroup: '', is_vip: false, vip_level: 0, pve_pk_formation: this.randomAICard(3)});
            this.add(4, {seasonid: this.seasonid, id: 4, name: '华雄', score: 4, icon: 'TX077', avatar: { vip: 1, iconid: "AV001" },igroup: '', is_vip: false, vip_level: 0, pve_pk_formation: this.randomAICard(4)});
            //初始化3000个ai
            for(let i = 5; i <= 3000; i++){
                if(next_season_player[i]){
                    this.add(i, next_season_player[i]);
                }
                else{
                    let card = this.randomAICard(i);
                    this.add(i, {seasonid: this.seasonid, 
                        id: i, 
                        name: '羽林军' + (18912 + i - 1), 
                        score: i, 
                        icon: 'TX003', 
                        avatar: { vip: 1, iconid: "AV001" },
                        igroup: '', 
                        is_vip: false, 
                        vip_level: 0,
                        pve_pk_formation: card});
                }
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

    private check_right_time = 0;
    //每天检测一次榜单是否正确，若错误，则恢复,只恢复榜单3000个人的数据，只恢复个人前100的人的身上数据
    checkRight() {
        if((Date.now() - this.check_right_time) > 4 * 60 * 60 * 1000 && this._chartDB.value.length > 0 && netInst.findNet('type', 'ls')){
            let change_list = [];
            let change = false;
            for(let i = 0; i < 3000; i++){
                if(this._chartDB.value[i].score != i+1){
                    change = true;
                    console.error('id: ' + this._chartDB.value[i].value.id + ' plt: ' + this._chartDB.value[i].value.igroup + ' before: ' + this._chartDB.value[i].score + ' after: ' + (i+1));
                    let info = JSON.parse(JSON.stringify(this._chartDB.value[i].value));
                    info.score = i + 1;
                    change_list[i+1] = info;
                }
            }
            for(let j = 0; j < change_list.length; j++){
                if(change_list[j]){
                    this.add(j, change_list[j]); //刷新得分
                }
            }
            //如果有错误，需要把榜单上全部人的数据都刷一遍
            // if(change){
            //     for(let i = 0; i < 100; i++){
            //         if(this._chartDB.value[i].value.id > 3000){
            //             //发送消息给玩家改变数据
            //             let data = {cmd: 'transferData', type: 'force_pve_pk_rank',  rank: this._chartDB.value[i].score, uid: this._chartDB.value[i].value.id, plt: this._chartDB.value[i].value.igroup.split('_')[0]}
            //             netInst.sendData2Type(data, 'ls');
            //         }
            //     }
            // }
            this.check_right_time = Date.now();
        }
        
    }

    private randomAICard(i: number){
        let card = {};
        let base_level = 1;
        let ai_equip_level = 10;
        let ai_equip_star = 1;
        if(i >= 500 &&  i < 1000) {
            base_level = 3;
            ai_equip_level = 20;
            ai_equip_star = 3;
        }
        else if(i >= 100 &&  i < 500) {
            base_level = 5;
            ai_equip_level = 30;
            ai_equip_star = 3;
        }
        else if(i >= 50 &&  i < 100) {
            base_level = 7;
            ai_equip_level = 40;
            ai_equip_star = 3;
        }
        else if(i >= 30 &&  i < 50) {
            base_level = 8;
            ai_equip_level = 50;
            ai_equip_star = 5;
        }
        else if(i < 30 ) {
            base_level = 9;
            ai_equip_level = 70;
            ai_equip_star = 5;
        }
        switch(i){
            case 1:
                ai_equip_level = 80;
                ai_equip_star = 6;
                break;
            case 2:
                ai_equip_level = 75;
                ai_equip_star = 6;
                break;
            case 3:
                ai_equip_level = 72;
                ai_equip_star = 6;
                break;
            case 4:
                ai_equip_level = 70;
                ai_equip_star = 6;
                break;
        }
        
        //随机普卡
        let original_pool = this.original_pool.slice();
        var heroId, location, iColour;
        for(let j = 1; j < 18; j++){
            heroId = arrayRandom(original_pool, true);
            location = this.location[Math.floor(j/3)];
                        
            iColour = resMgrInst.get_target<SeResUnit>("Unit.json", this._plt).getRes(heroId).iColour;
            // 高级卡牌相当于普通卡牌的高级版
            let level = base_level + (4 - iColour) * 2;
            card[heroId] = {heroId: heroId, x: parseInt(location.split(',')[0]) + 127, y: parseInt(location.split(',')[1]) + 90, level: level, areaIdx: Math.floor(j/3)};
        }
        //随机金卡
        let gold_pool = this.gold_pool.slice();
        heroId = arrayRandom(gold_pool, true);
        card[heroId] = {heroId: heroId, x: parseInt(this.location[0].split(',')[0]) + 127, y: parseInt(this.location[0].split(',')[1]) + 90, level: base_level, areaIdx: 0};
        //确定装备
        let equips = [];
        equips.push({kId: "ZBS005", eType: 0,eLevel: ai_equip_level,eStar: ai_equip_star});
        equips.push({kId: "ZBY006", eType: 1,eLevel: ai_equip_level,eStar: ai_equip_star});
        equips.push({kId: "ZBB006", eType: 2,eLevel: ai_equip_level,eStar: ai_equip_star});
       
        card['lord']= {id: 'Z008', equips: equips, level: base_level + 6};
        return card;
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
        let chart_data: ReSortedSet = redistInst.getSortedSet(this._getName() + date, this.length, false);
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
    giveDayReward(uid: number, score: number, rtime: number, plt: string, isCross:boolean = true) {
        if (!score || score >= PVE_PK_INIT_VALUE || !isCross) {
            return [];
        }

        let res = resMgrInst.get_target("ConfigMaps.json", this._plt).getRes('JJC_reward_time');
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
            //暂定超过3000名不给奖励
            if(_rank > 3000) continue;

            let _reward_rank = this.get_chart_reward_grade(_rank);
            let _items = this._chart_cross_reward_res[_reward_rank];
            let _grade = this._chart_reward_grade[_reward_rank];
            _rewards.push({ rtime: new Date().setHours(parseInt(_daily[0]) - 24 * (1 + i), parseInt(_daily[1]), 0, 0), items: _items, grade: _grade });
        }

        //再判断当天能不能领取 
        //由于是0点结算，所以不存在当天领取的情况
        // if (_now.getTime() > new Date().setHours(parseInt(_daily[0]), parseInt(_daily[1]), 0, 0)) {
        //     let _rank = this.find_uid_rank(uid, plt, score);
        //     //暂定超过3000名不给奖励
        //     if(_rank <= 3000) {
        //         let _reward_rank = this.get_chart_reward_grade(_rank);
        //         let _items = this._chart_cross_reward_res[_reward_rank];
        //         let _grade = this._chart_reward_grade[_reward_rank];
        //         _rewards.push({ rtime: _now.setHours(parseInt(_daily[0]), parseInt(_daily[1]), 0, 0), items: _items, grade: _grade });
        //     }
        // }

        return _rewards;
    }

    //发送赛季奖励
    //rtime 由逻辑服自己管理
    giveSeasonReward(uid: number, score: number, plt: string, isCross:boolean = true) {
        if (!score || score >= PVE_PK_INIT_VALUE || !isCross) {
            return {};
        }

        let _rewards: { rank: number, items: Array<string>, grade: string };

        //赛季领取不需要判断资格
        let _rank = this._find_history_rank(uid, score, this._history_season_chart.chart_db, plt);
        if (_rank == 0 || _rank > 3000) {
            return {};
        }

        let _reward_rank = this.get_chart_reward_grade(_rank);
        let _items;
        if(isCross){
            _items = this._chart_cross_reward_season[_reward_rank];
        }
        else{
            //
        }
         
        let _grade = this._chart_reward_grade[_reward_rank];
        _rewards = { rank: _rank, items: _items, grade: _grade };

        return _rewards;
    }


}