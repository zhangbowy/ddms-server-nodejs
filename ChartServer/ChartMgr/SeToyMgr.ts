import { SeUnit } from "./BaseUnit";
import { PeakUnitEx } from "./PeakUnitEx";
import { SeResModule, resMgrInst, Tab_Chart_Res } from "../mgr/SeResMgr";
import { SeResseason, SeResChartTable, SeEnumScoreCompetitoneCompetitionType } from "../Res/interface";
import { Map } from "../lib/TeTool";
import { netInst } from "../NetMgr/SeNetMgr";
import { SeChartUnit, SeChartType, if_sys_ } from "../SeDefine";
import { redistInst, ReHash, ReSortedSet, ReList } from "../lib/TeRedis";
import { Captain } from "./SeWarZone";
import { configInst } from "../lib/TeConfig";
import { LevelSpeedEx } from "./LevelSpeedEx";
import { serverMgrInst, DefineSType } from "../mgr/serverMgr";
import { existsSync, mkdirSync, readFileSync, writeFile } from 'fs';
import { join } from 'path';
var openGlobal = configInst.get('openGlobal');

export class SeToy{
    constructor(id: number){
        this.id = id;
        this.progress = 0;
        this.totcharge = 0;
        this.player_count = 0;
        this.is_complete = false;
        this.complete_rank = -1;
        this.complete_time = 0;
        this.check_progress = 0;
        this.add_progress_count = 0;
        this.add_progress = 0;
    }
    id: number;
    progress: number;    //进度
    totcharge: number;      //总充值数
    player_count: number;   //阵营玩家数
    is_complete: boolean;   //是否达满进度
    complete_rank: number;  //达满进度排名
    complete_time: number;  //达满进度时间
    check_progress: number; //判断加进度的天数
    last_add_progress: number;//上次加进度时间
    add_progress_count// 剩余加进度次数
    add_progress// 每次加的进度数
}

export class SeToyMgr {
    public toy_info: Array<SeToy>;
    public ready = false;
    public _toyDB: ReList;
    private max_progress = 2000000;

    public start() {
        if(!openGlobal) return;
        this._toyDB = redistInst.getList('toy_info');
        this._toyDB.load(this._onLoad.bind(this));
    }

    protected _onLoad() {
        this.toy_info = this._toyDB.value;
        if(this.toy_info.length == 0){
            this._toyDB.push_back(new SeToy(0));
            this._toyDB.push_back(new SeToy(1));
            this._toyDB.push_back(new SeToy(2));
            this.toy_info = this._toyDB.value;
        }
        this.notice_toy_info();
        setInterval(this._update_.bind(this), 1000);
        this.ready = true;
    }

    public join_camp(uid: number, id: number, totcharge: number){
        this.toy_info[id].totcharge += totcharge;
        this.toy_info[id].player_count++;
        this.save();
    } 

    public contribute(uid: number, id: number, count: number){
        this.toy_info[id].progress += count;
        this.save();
    } 

    public notice_toy_info(){
        if(!this.ready) return;
        let data = {cmd: 'toy_info', 
                    toy_info: this.toy_info};
        let clouds = serverMgrInst.get_all_server_by_type_and_plt(DefineSType.logic);
        for(let i = 0; i < clouds.length; i++){
            netInst.sendData(data, clouds[i].nid);
        }
    }

    
    public save(index?: number){
        if(index){
            this._toyDB.set(index, this.toy_info[index]);
        }
        else{
            for(let i = 0; i < this.toy_info.length; i++){
                this._toyDB.set(i, this.toy_info[i]);
            }
        }
        
        this.notice_toy_info();
    }

    protected _update_() {
        this.check_complete();
        this.check_progress();
        this.check_add_progress();
        this.save();
    }

    protected check_complete(){
        for(let i = 0; i < this.toy_info.length; i++){
            let toy = this.toy_info[i];
            if(toy.progress >= this.max_progress && !toy.is_complete){
                toy.complete_time = Date.now();
                let rank = 0;
                for(let toy of this.toy_info){
                    if(toy.is_complete){
                        rank++;
                    }
                }
                toy.complete_rank = rank; 
                toy.is_complete = true;
            }
        }
    }

    private activity_start_time = 1601352000; // 2020-09-29 12:00:00
    private day_progress = [0, 9, 22, 35, 48, 61, 74, 87, 100];
    //判断进度是否达到要求，未达到手动增加
    protected check_progress(){
        let now = Math.floor(Date.now() / 1000);
        //相隔天数
        let day = Math.floor((now - this.activity_start_time) / (24 * 60 * 60));
        if(day > 0 && day < this.day_progress.length){
            for(let i = 0; i < this.toy_info.length; i++){
                let toy = this.toy_info[i];
                //这天已经检测过了
                if(toy.check_progress >= day) continue;
                toy.check_progress = day;
                //相差进度
                let progress = this.max_progress * this.day_progress[day] / 100 - toy.progress;
                if(progress > 0){
                    toy.add_progress_count = 36;
                    toy.add_progress = Math.floor(progress / 36);
                    toy.last_add_progress = now;
                }
            }
        }
    }

    //手动增加进度
    protected check_add_progress(){
        let now = Math.floor(Date.now() / 1000);
        for(let i = 0; i < this.toy_info.length; i++){
            let toy = this.toy_info[i];
            if(toy.add_progress_count > 0 && (now - toy.last_add_progress) >= 5 * 60){
                toy.progress += toy.add_progress;
                toy.add_progress_count--;
                toy.last_add_progress = now;
            }
        }
    }
}