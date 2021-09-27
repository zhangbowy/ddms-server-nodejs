import { ifRecordFile, ifResult, ifRecordShort } from '../Protocol';
import { DIR, HashMap, TeMap } from '../lib/TeTool';
import * as fs from 'fs';
import { resMgrInst } from '../ResMgr/SeResMgr';
import { redistInst, ReString } from '../lib/TeRedis';
import { func_copy, if_sys_, LiveMode } from '../SeDefine';
import { netInst } from '../NetMgr/SeNetMgr';
import { configInst } from '../lib/TeConfig';
import { join } from 'path';
import { SeEnumUnitiColour, SeEnumBattleRankeRankType } from '../Res/interface';

/**
 * 录像管理类，这里处理两件事情，一是存储所有玩家的战斗录像，存储到mysql数据库中，二是管理推送给玩家的战斗录像，存储在redis中
 */
class SeRecordUnit {

    private CACHE_TIME = 5 * 60 * 1000;   //预留5分钟再死亡

    private hashRecords: HashMap<ifRecordFile> = new HashMap<ifRecordFile>();

    private _db_key_0 = 'records_S001';
    private _db_key_1 = 'last10';

    public ready = false;

    private _record_file_ = 'record';

    plt: string;

    constructor(plt: string, name: string) {

        this._record_file_ = join((configInst.get('recordpath') || './'), name + 'record');
        DIR.mkdirsSync(this._record_file_);

        this.plt = plt;
        this._db_key_0 = name + 'records_S001';
        this._db_key_1 = name + 'last10';

        //加载资源表
        resMgrInst(this.plt);
    }

    init() {
        var r = redistInst.getString(this._db_key_0);
        r.load((succ, db: ReString) => {
            if (succ) {
                var d = JSON.parse(db.value);
                if (typeof d == "object") {
                    this.hashRecords._data = d;
                } else {
                    this.hashRecords._data = {};
                }

                this._init_record_fast_mat();
            }

            this.ready = true;
        });

        var p = redistInst.getString(this._db_key_1);
        p.load((succ, db: ReString) => {
            if (!succ) return;
            try {
                this._last10M = parseInt(db.value) || Date.now();
            }
            catch (e) {
            }
        })
    }

    private _lastTime: number = Date.now();
    private _last10M: number = Date.now();
    private _last24H: number = new Date().setHours(6 + 24, 0, 0, 0);

    private _record_fast_mat: TeMap<ifRecordFile> = new TeMap<ifRecordFile>();

    private _init_record_fast_mat() {
        this._record_fast_mat.clear();

        //1v1
        for (let i = 1; i <= resMgrInst(this.plt).MaxLvl; i++) {
            let l = this.hashRecords.get(this._get_type_key(2, i, null));
            if (!l) continue;

            for (let i = 0; i < l.length; i++) {
                let r_info = l[i];
                r_info && this._record_fast_mat.set(r_info.rid, r_info);
            }
        }
        //2v2
        let l2 = this.hashRecords.get(this._get_type_key(4, 0, null));
        if (l2) {
            for (let i = 0; i < l2.length; i++) {
                let r_info = l2[i];
                r_info && this._record_fast_mat.set(r_info.rid, r_info);
            }
        }
        //peak
        let l3 = this.hashRecords.get(this._get_type_key(0, 0, LiveMode.peak));
        if (l3) {
            for (let i = 0; i < l3.length; i++) {
                let r_info = l3[i];
                r_info && this._record_fast_mat.set(r_info.rid, r_info);
            }
        }
    }

    updateRecord() {
        if (Date.now() - this._lastTime > 1000 * 60) {
            // 定期保存一下录像，防止异常
            let r = redistInst.getString(this._db_key_0);
            r.set(JSON.stringify(this.hashRecords._data));
            this._lastTime = Date.now();
        }
        if (Date.now() - this._last10M > 5 * 60 * 1000) {
            //清理死亡的r_info
            let now = Date.now();
            let rids = this._record_fast_mat.keys;
            for (let i = 0; i < rids.length; i++) {
                let r_info = this._record_fast_mat.get(rids[i]);
                if (r_info.dieTime && now >= r_info.dieTime) {
                    this._record_fast_mat.del(rids[i]);
                }
            }

            this._last10M = Date.now();
            let r = redistInst.getString(this._db_key_1);
            r.set(this._last10M.toString());
        }
        if (Date.now() >= this._last24H) {
            //清空
            this.hashRecords.clear();

            let now = Date.now();
            let rids = this._record_fast_mat.keys;
            for (let i = 0; i < rids.length; i++) {
                let r_info = this._record_fast_mat.get(rids[i]);
                r_info.dieTime = now + this.CACHE_TIME;
            }

            this._last24H = now + 86400000;
        }
    }

    static s_record_sort(a: ifRecordFile, b: ifRecordFile) {
        return b.score - a.score;
    }

    private _level_catche_: TeMap<{ time: number, value: any }> = new TeMap<{ time: number, value: any }>();

    private record_size = 10;
    private same_name = Math.floor(this.record_size / 2);

    get_records(level: number, rmode: string) {
        let r_catch = this._level_catche_.get(level + rmode);
        if (r_catch && r_catch.time + 30 * 1000 > Date.now()) {
            return r_catch.value;
        }

        let logTimeList = [];
        let logIdx = 0;
        logTimeList[logIdx++] = Date.now();

        let outs: ifRecordShort[] = [];

        if (rmode == '1v1') {
            //1v1
            let nameMap: HashMap<string> = new HashMap<string>();
            for (let i = level; i <= resMgrInst(this.plt).MaxLvl; i++) {
                // 从玩家的等级开始 +1 选取20个
                let l = this.hashRecords.get(this._get_type_key(2, i, null));
                // console.log(this.hashRecords.get(this._get_type_key(2, i)));
                if (l && l.length > 0) {
                    for (let j = 0; j < l.length && outs.length < this.record_size; j++) {
                        let r = l[j];
                        if (r && r.akRaceInfo) {
                            let ida = r.akRaceInfo[0].Id;
                            if (nameMap.get(ida).length >= this.same_name) continue;
                            nameMap.add(ida, r.rid);
                            let idb = r.akRaceInfo[1].Id;
                            if (nameMap.get(idb).length >= this.same_name) continue;
                            nameMap.add(idb, r.rid);
                        }
                        let names = [];
                        for (let z = 0; z < r.akRaceInfo.length; z++) {
                            names.push({ name: r.akRaceInfo[z].Name, uid: r.akRaceInfo[z].Id });
                        }

                        outs.push({
                            rid: r.rid,
                            infos: names,
                            rmode: '1v1',
                        });
                    }
                    if (outs.length >= this.record_size) break;
                }
            }
        }
        else if (rmode == '2v2') {
            //2v2
            let rcs = this.hashRecords.get(this._get_type_key(4, level, null));
            for (let i = 0; i < rcs.length; i++) {
                let r = rcs[i];
                let names = [];
                for (var z = 0; z < r.akRaceInfo.length; z++) {
                    names.push({ name: r.akRaceInfo[z].Name, uid: r.akRaceInfo[z].Id });
                }

                outs.push({
                    rid: r.rid,
                    infos: names,
                    rmode: '2v2',
                });
            }
        }
        else {
            //peak
            let peak_rcs = this.hashRecords.get(this._get_type_key(0, level, LiveMode.peak));
            for (let i = 0; i < peak_rcs.length; i++) {
                let r = peak_rcs[i];
                let names = [];
                for (var z = 0; z < r.akRaceInfo.length; z++) {
                    names.push({ name: r.akRaceInfo[z].Name, uid: r.akRaceInfo[z].Id });
                }
                outs.push({
                    rid: r.rid,
                    infos: names,
                    rmode: 'peak',
                });
            }
        }

        logTimeList[logIdx++] = Date.now();
        this._level_catche_.set(level + rmode, { time: Date.now(), value: func_copy(outs) });
        if (logTimeList[logTimeList.length - 1] - logTimeList[0] > 2) {
            netInst.report_to_gm('get_records', { costime: logTimeList });
        }
        return outs;
    }

    get_detail_records(vids: string[]) {
        var outs: ifRecordFile[] = [];
        for (let i = 0; i < vids.length; i++) {
            let r_record = this._record_fast_mat.get(vids[i]);
            if (r_record) {
                outs.push(r_record);
            }
        }

        return outs;
    }

    /**
     * 根据1v1 还是 2v2 获取key
     * @param info 
     */
    private _get_type_key(length: number, level: number, rmode: LiveMode) {
        if (rmode == LiveMode.peak) {
            return 'peak_';
        }
        else if (length == 2) {
            return '1v1_' + level;
        }
        else {
            return '2v2';
        }
    }

    private _is_length_full(key: string, infos: Array<ifRecordFile>) {
        if (infos.length == 0) {
            return false;
        }

        if (key == '2v2') {
            return infos.length > this.record_size;
        }

        let level = infos[0].level || 1;
        let full_length = 0;
        switch (resMgrInst(this.plt).getBattleRankByLevel(level).eRankType) {
            case SeEnumBattleRankeRankType.MinBing:
            case SeEnumBattleRankeRankType.JingBing:
                full_length = 5;
                break;
            case SeEnumBattleRankeRankType.LingJun:
            case SeEnumBattleRankeRankType.MingJiang:
                full_length = 10;
                break;
            case SeEnumBattleRankeRankType.YingXiong:
            case SeEnumBattleRankeRankType.DuoWang:
                full_length = 20;
                break;
            default:
                break;
        }
        return infos.length > full_length;
    }

    private _read_config_number(keys: string, def: number) {
        let v = parseFloat(resMgrInst(this.plt).getConfig(keys));
        if (!v || isNaN(v)) {
            return def;
        }

        return v;
    }

    private color_rate: number[] = [
        1,
        this._read_config_number('record_card_lv', 1),
        this._read_config_number('record_card_lan', 1),
        this._read_config_number('record_card_zi', 1),
        this._read_config_number('record_card_cheng', 1),
    ];


    private _compute_score_2(info: ifRecordFile, mode: string, rmode: LiveMode) {
        let score = 0;
        if (!info.akRaceInfo) return score;
        if (!info.akResults || info.akResults.length == 0) return score;

        // 找出获胜者
        let winers = info.akResults[0].winids;

        // 计算胜负分数
        let fight_score = 0;
        if (info.akRaceHps) {
            let winHps = [];
            // 找到血量信息最长的账号，然后看血量信息
            for (let key in info.akRaceHps) {
                if (info.akRaceHps[key].length > winHps.length) {
                    winHps = info.akRaceHps[key];
                }
            }

            if (winHps.length >= 2) {
                let startHps = winHps[0].hps;
                let finishHps = winHps[winHps.length - 1].hps;

                let winside = 0;
                if (finishHps[1] > finishHps[0]) winside = 1;

                let win_diff_score = (1 - (finishHps[winside] - finishHps[1 - winside]) / startHps[winside]) * Math.pow((1 - finishHps[winside] / startHps[winside]), 2) * this._read_config_number("record_win_rate1", 20);
                let win_score = (1 - finishHps[winside] / startHps[winside]) * this._read_config_number("record_win_rate2", 10);

                if (!win_diff_score || isNaN(win_diff_score)) {
                    win_diff_score = 0;
                }

                if (!win_score || isNaN(win_score)) {
                    win_score = 0;
                }

                fight_score = win_diff_score + win_score;
            }
        }

        let card_tot_socre = this._read_config_number("record_card_tot_score", 240);

        let lose_level = 0;
        let win_peak_socre = 0, lose_peak_score = 0;
        // 计算卡牌品质
        let card_score = 0;
        let win_card_score = 0, win_card_tot = 0, lose_card_score = 0, lose_card_tot = 0;
        for (let i = 0; i < info.akRaceInfo.length; i++) {
            let r_player = info.akRaceInfo[i];

            let socre = 0;
            for (let j = 0; j < r_player.Formation.length; j++) {
                let unit = r_player.Formation[j];
                let res = resMgrInst(this.plt).UnitRes.getRes(unit.kHeroID);
                let level = unit.iLevel + (res.iColour - 1) * 2;
                let extRate = this.color_rate[res.iColour];
                socre = socre + level * extRate;
            }

            // 胜利者姿态
            if (winers.indexOf(r_player.Id) >= 0) {
                win_card_score += socre;
                win_card_tot += card_tot_socre;

                win_peak_socre = r_player.pvp_score;
            }
            else {
                lose_card_score += socre;
                lose_card_tot += card_tot_socre;

                lose_level = r_player.pvp_level;
                lose_peak_score = r_player.pvp_score;
            }
        }

        let win_rate = this._read_config_number("record_card_win_rate", 0.6);
        let lose_rate = this._read_config_number("record_card_lose_rate", 0.4);
        card_score = (lose_card_score / lose_card_tot * lose_rate + win_card_score / win_card_tot * win_rate) * this._read_config_number("record_card_tot", 10);


        let race_type_score = 0;
        let race_type_tot = this._read_config_number("record_level_score", 10);
        if (rmode != null && rmode != undefined) {
            if (rmode == LiveMode.match) {
                race_type_score = (lose_level / 16) * race_type_tot;
            }
            else if (rmode == LiveMode.peak) {
                race_type_score = (Math.floor((win_peak_socre - 1500) / 50) * 0.2 * win_rate + Math.floor((lose_peak_score - 1500) / 50) * 0.2 * lose_rate) * race_type_tot;
            }
        }

        return fight_score + card_score + race_type_score;

    }

    private _compute_score(info: ifRecordFile) {
        let score = 0;
        let blood_percent = 0;  //总的血量百分比
        if (!info.akRaceInfo) return score;

        for (let i = 0; i < info.akRaceInfo.length; i++) {
            let rr = info.akRaceInfo[i];
            score = score + 1000 / 256 * Math.pow(rr.pvp_level || 1, 2) * 0.45 / 2;
            for (let j = 0; j < rr.Formation.length; j++) {
                let unit = rr.Formation[j];
                let res = resMgrInst(this.plt).UnitRes.getRes(unit.kHeroID);
                switch (res.iColour) {
                    case SeEnumUnitiColour.Cheng: score = score + 15.625; break;
                    case SeEnumUnitiColour.Zi: score = score + 6.25; break;
                    case SeEnumUnitiColour.Lan: score = score + 3.125; break;
                    case SeEnumUnitiColour.Lv: score = score + 1.5625; break;
                    default: break;
                }
            }

            let hps = info.akRaceHps[rr.Id];
            if (hps && hps.length > 0 && !blood_percent) {
                blood_percent = (hps[hps.length - 1]['hps'][0]) / (hps[0]['hps'][0]);
                blood_percent += (hps[hps.length - 1]['hps'][1]) / (hps[0]['hps'][1]);
            }
        }
        //1v1
        if (info.akRaceInfo.length == 2) {
            score = score + 1000 / Math.pow(180, 5) * Math.pow(info.finish_frame / 30, 5) * 0.05;
            score = score + 1000 / Math.pow(2, 5) * Math.pow((2 - blood_percent), 5) * 0.25;
        }
        //2v2
        else {
            blood_percent = blood_percent * 2;
            score = score + 2000 / Math.pow(180, 5) * Math.pow(info.finish_frame / 30, 5) * 0.05;
            score = score + 2000 / Math.pow(4, 5) * Math.pow((4 - blood_percent), 5) * 0.25;
        }

        return score;
    }

    add_record(name: string, info: ifRecordFile, mode: string, rmode: LiveMode) {
        // 首先把录像存储到mysql数据库,如果没有开启数据库的话就存储到本地文件夹winids
        if (!info || !info.akRaceInfo || !info.akResults || info.akResults.length == 0) return;
        // 如果是没有操作命令的录像的话不添加到直播录像中
        if (Object.keys(info.akRecord).length == 0) return;

        var r_score: ifResult = info.akResults[0];
        if (!r_score) return;
        if (!r_score.winids || r_score.winids.length < 0) return;

        var tlevel = 0;
        for (var i = 0; i < info.akRaceInfo.length; i++) {
            var rr = info.akRaceInfo[i];
            if (rr) tlevel = tlevel + (rr.pvp_level || 1);
        }

        info.level = Math.floor(tlevel / info.akRaceInfo.length);
        info.score = Math.floor(this._compute_score_2(info, mode, rmode));

        let key = this._get_type_key(info.akRaceInfo.length, info.level, rmode);

        var rcs = this.hashRecords.get(key) || [];

        rcs.push(info);
        rcs = rcs.sort(SeRecordUnit.s_record_sort);
        if (this._is_length_full(key, rcs)) {
            let __info = rcs.pop();
            //目前设置为预留5分钟再死亡
            __info.dieTime = Date.now() + this.CACHE_TIME;
            if (__info.rid != info.rid) {
                this._record_fast_mat.set(info.rid, info);
            }
        }
        else {
            this._record_fast_mat.set(info.rid, info);
        }

        this.hashRecords.set(key, rcs);

        // this._local_save_(name, info);
    }

    private _local_save_(name: string, info: ifRecordFile) {
        this._save_to_file_(name, info);
    }

    private _save_to_file_(name: string, info: ifRecordFile) {
        fs.writeFileSync(join(this._record_file_, name), JSON.stringify(info));
    }
}

export class RecordMgr {
    private static _inst: RecordMgr;

    static get inst() {
        if (!this._inst) this._inst = new RecordMgr();
        return this._inst;
    }

    map_record: TeMap<SeRecordUnit> = new TeMap<SeRecordUnit>();
    private constructor() {


    }

    /**
     * 改成注册制的
     * @param plt 
     */
    regist_plt(plt: string) {
        if (this.map_record.has(plt)) return;
        var name = plt;
        if (plt == 'sdw') name = '';
        let record = new SeRecordUnit(plt, name);
        this.map_record.set(plt, record);
        record.init();
    }

    add_record(name: string, info: ifRecordFile, mode: string, rmode: LiveMode) {
        var plts = [];
        var names = [];
        if (info && info.akRaceInfo && info.akRaceInfo[0] && [1824707451, 1829822513].indexOf(info.akRaceInfo[0].Id) >= 0) {
            this.report_to_gm('record', info);
        }

        for (var i = 0; i < info.akRaceInfo.length; i++) {
            var rp = info.akRaceInfo[i];
            if (rp && rp._plt_ && plts.indexOf(rp._plt_) < 0) {
                plts.push(rp._plt_);
            }
            if (rp) {
                names.push(rp.Name);
            }
        }

        for (var i = 0; i < plts.length; i++) {
            var r = this._getUnit(plts[i]);
            if (r && r.ready) {
                r && r.add_record(name, info, mode, rmode);
            }
        }

        if (plts.length == 0) {
            // 增加一个容错 
            console.error(Date.now() + ',error no plt names[' + names.join(',') + ']\n');
        }
    }

    get_records(_sys_: if_sys_, level: number, rmode: string) {
        var r = this._getUnit(_sys_.plt);
        if (r && r.ready) {
            return r && r.get_records(level, rmode);
        }

        return []
    }

    get_detail_records(_sys_: if_sys_, vids: string[]) {
        var r = this._getUnit(_sys_.plt);
        if (r && r.ready) {
            return r && r.get_detail_records(vids);
        }

        return [];
    }

    private _getUnit(plt: string) {
        return this.map_record.has(plt) ? this.map_record.get(plt) : null;
    }

    updateRecord() {
        var keys = this.map_record.keys;
        for (var i = 0; i < keys.length; i++) {
            var r = this.map_record.get(keys[i]);
            if (r && r.ready) r.updateRecord();
        }
    }

    report_to_gm(type, infos: any) {
        var cmd = {
            cmd: 'up_match_info',
            type: type,
            infos: infos
        }

        netInst.sendData2Type(cmd, 'ls');
    }
}











// var a_score_ = a.akResults[0];
// var b_score_ = b.akResults[0];

// if (!a_score_ || !a_score_.hps || a_score_.hps.length < 2) return -1;
// if (!b_score_ || !b_score_.hps || b_score_.hps.length < 2) return 1;

// var a_hp = Math.max(a_score_.hps[0] || 0, a_score_.hps[1] || 0);
// var a_ch = a_score_.hpchange;
// var a_dm = a_score_.totaldamage;

// var b_hp = Math.max(b_score_.hps[0] || 0, b_score_.hps[1] || 0);
// var b_ch = b_score_.hpchange;
// var b_dm = b_score_.totaldamage;


// if (a_hp > b_hp) {
//     return 1;
// }
// else if (a_hp < b_hp) {
//     return -1;
// }
// else if (a_ch > b_ch) {
//     return 1;
// }
// else if (a_ch < b_ch) {
//     return -1;
// }
// else if (a_dm > b_dm) {
//     return 1;
// }
// else if (a_dm < b_dm) {
//     return -1;
// }
// return 0;