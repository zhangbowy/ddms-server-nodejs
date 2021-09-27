"use strict";
/**
 * 一些恶心的全局变量放在这里
 * 模块已经废弃了
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.countMgrInst = exports.SeCountMgr = void 0;
const TeRedis_1 = require("../lib/TeRedis");
const TeConfig_1 = require("../lib/TeConfig");
class SeCountMgr {
    constructor() {
        //clear标记
        this.is_clear = false;
        //巅峰赛使用的名将统计
        this.num_season_key = TeConfig_1.configInst.get('plt') + "_general_season";
        this.num_key = TeConfig_1.configInst.get('plt') + "_general_num";
        this.time_key = TeConfig_1.configInst.get('plt') + "_general_num_time";
        this.GENERAL_LIMIT = 200;
        this.GENERAL_LEVEL = 10;
        //gm使用的开关。 后面会去掉
        this.gm_is_open = false;
    }
    init() {
        let peakkey = global.resMgr.getConfig("peakIsOpen");
        if (peakkey)
            this.gm_is_open = peakkey == "true";
        let limit = global.resMgr.getConfig("competitionNeedPlayer");
        if (limit)
            this.GENERAL_LIMIT = parseInt(limit);
        let level = global.resMgr.getConfig("competitionNeedLevel");
        if (level)
            this.GENERAL_LEVEL = parseInt(level);
        TeRedis_1.redistInst.redisClient.scard(this.num_key, function (err, res) {
            if (err) {
                console.log("general_num is error on redis.");
                return;
            }
            this.general_num = res;
            TeRedis_1.redistInst.redisClient.get(this.time_key, function (err, res) {
                if (err) {
                    console.log("general_num_time is error on redis.");
                    return;
                }
                this.general_num_time = res;
            }.bind(this));
        }.bind(this));
    }
    general_num_add(uid, level) {
        if (level < 10) {
            return;
        }
        if (this.general_num >= this.GENERAL_LIMIT) {
            return;
        }
        TeRedis_1.redistInst.redisClient.sadd(this.num_key, uid, function (err) {
            if (err) {
                console.log("add general_num is error on redis.");
                return;
            }
            TeRedis_1.redistInst.redisClient.scard(this.num_key, function (err, res) {
                if (err) {
                    console.log("general_num is error on redis.");
                    return;
                }
                this.general_num = res;
                if (this.general_num >= this.GENERAL_LIMIT) {
                    TeRedis_1.redistInst.redisClient.get(this.time_key, function (err, res) {
                        if (err) {
                            console.log("general_num_time is error on redis.");
                            return;
                        }
                        //this.general_num_time如果有值, 代表本赛季已经满足巅峰赛的200人条件了
                        this.general_num_time = res;
                        if (this.general_num_time) {
                            return;
                        }
                        this.general_num_time = new Date().setHours(24, 0, 0);
                        TeRedis_1.redistInst.redisClient.set(this.time_key, this.general_num_time);
                    }.bind(this));
                }
            }.bind(this));
        }.bind(this));
    }
    general_num_clear(seasonid) {
        TeRedis_1.redistInst.redisClient.get(this.num_season_key, function (seasonid, err, res) {
            if (err) {
                console.log("num_season_key is error on redis.");
                return;
            }
            if (res == seasonid) {
                if (!this.is_clear) {
                    TeRedis_1.redistInst.redisClient.scard(this.num_key, function (err, res) {
                        if (err) {
                            console.log("general_num is error on redis.");
                            return;
                        }
                        this.general_num = res;
                        TeRedis_1.redistInst.redisClient.get(this.time_key, function (err, res) {
                            if (err) {
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
            TeRedis_1.redistInst.redisClient.set(this.num_season_key, seasonid);
            TeRedis_1.redistInst.redisClient.del(this.num_key);
            TeRedis_1.redistInst.redisClient.del(this.time_key);
        }.bind(this, seasonid));
    }
    sendgeneralNum(linkid) {
        let info = {
            cmd: "peakInit",
            generalNum: this.general_num,
            isOpen: false,
            gmIsOpen: this.gm_is_open
        };
        if (this.general_num_time && Date.now() > this.general_num_time && this.general_num >= this.GENERAL_LIMIT) {
            info.isOpen = true;
        }
        global.netMgr.sendData(info, linkid);
    }
    set_gm_is_open(isOpen) {
        this.gm_is_open = isOpen;
    }
}
exports.SeCountMgr = SeCountMgr;
exports.countMgrInst = new SeCountMgr();
//# sourceMappingURL=SeCountMgr.js.map