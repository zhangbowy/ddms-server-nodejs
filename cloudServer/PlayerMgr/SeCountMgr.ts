/**
 * 一些恶心的全局变量放在这里
 * 模块已经废弃了
 */

import { SePlayer } from "./SePlayer";
import { iApp } from "../app";
import { redistInst } from '../lib/TeRedis'
import { configInst } from '../lib/TeConfig';
declare var global: iApp;



export class SeCountMgr {

    //clear标记
    private is_clear: boolean = false;

    //巅峰赛使用的名将统计
    private num_season_key: string = configInst.get('plt') + "_general_season";
    private num_key: string = configInst.get('plt') + "_general_num";
    private time_key: string = configInst.get('plt') + "_general_num_time";
    private GENERAL_LIMIT = 200;
    private GENERAL_LEVEL = 10;
    private general_num;
    private general_num_time;

    //gm使用的开关。 后面会去掉
    private gm_is_open = false;
    constructor() {
    }

    init() {
        let peakkey = global.resMgr.getConfig("peakIsOpen");
        if(peakkey) this.gm_is_open = peakkey == "true";

        let limit = global.resMgr.getConfig("competitionNeedPlayer");
        if(limit) this.GENERAL_LIMIT = parseInt(limit);
        let level = global.resMgr.getConfig("competitionNeedLevel");
        if(level) this.GENERAL_LEVEL = parseInt(level);

        redistInst.redisClient.scard(this.num_key, function(err, res) {
            if(err) { 
                console.log("general_num is error on redis."); 
                return;
            }
            this.general_num = res;

            redistInst.redisClient.get(this.time_key, function(err, res) {
                if(err) { 
                    console.log("general_num_time is error on redis."); 
                    return;
                }
                this.general_num_time = res;
            }.bind(this));

        }.bind(this));
    }

    general_num_add(uid: number, level: number) {
        if (level < 10) {
            return;
        }

        if(this.general_num >= this.GENERAL_LIMIT) {
            return;
        }

        redistInst.redisClient.sadd(this.num_key, uid, function(err) {
            if(err) { 
                console.log("add general_num is error on redis."); 
                return;
            }
        
            redistInst.redisClient.scard(this.num_key, function(err, res) {
                if(err) { 
                    console.log("general_num is error on redis."); 
                    return;
                }

                this.general_num = res;
                if(this.general_num >= this.GENERAL_LIMIT) {
                    redistInst.redisClient.get(this.time_key, function(err, res) {
                        if(err) { 
                            console.log("general_num_time is error on redis."); 
                            return;
                        }
                        //this.general_num_time如果有值, 代表本赛季已经满足巅峰赛的200人条件了
                        this.general_num_time = res;
                        if(this.general_num_time) {
                            return;
                        }

                        this.general_num_time = new Date().setHours(24,0,0);
                        redistInst.redisClient.set(this.time_key, this.general_num_time);  
                    }.bind(this));
                }
            }.bind(this));
        }.bind(this));
    }

    general_num_clear(seasonid: string) {
        redistInst.redisClient.get(this.num_season_key, function(seasonid, err, res) {
            if(err) { 
                console.log("num_season_key is error on redis."); 
                return;
            }
            if(res == seasonid) {
                if (!this.is_clear) {
                    redistInst.redisClient.scard(this.num_key, function(err, res) {
                        if(err) { 
                            console.log("general_num is error on redis."); 
                            return;
                        }
                        this.general_num = res;
            
                        redistInst.redisClient.get(this.time_key, function(err, res) {
                            if(err) { 
                                console.log("general_num_time is error on redis."); 
                                return;
                            }
                            this.general_num_time = res;
                        }.bind(this));
            
                    }.bind(this));
                    this.is_clear = true;
                }
                return;
            }
            
            this.general_num = 0;
            this.general_num_time = null;

            redistInst.redisClient.set(this.num_season_key, seasonid);  
            redistInst.redisClient.del(this.num_key);
            redistInst.redisClient.del(this.time_key);
        }.bind(this, seasonid));
    }

    public sendgeneralNum(linkid: any) {
        let info = {
            cmd: "peakInit",
            generalNum: this.general_num,
            isOpen: false,
            gmIsOpen: this.gm_is_open 
        };
        
        if(this.general_num_time && Date.now() > this.general_num_time && this.general_num >= this.GENERAL_LIMIT) {
            info.isOpen = true;
        }
        
        global.netMgr.sendData(info, linkid);
    }

    set_gm_is_open(isOpen: boolean) {
        this.gm_is_open = isOpen;
    }   
}

export var countMgrInst = new SeCountMgr();