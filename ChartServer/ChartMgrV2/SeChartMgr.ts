import { SeUnit } from "./BaseUnit";
import { PeakUnitEx } from "./PeakUnitEx";
import { Map } from "../lib/TeTool";
import { netInst } from "../NetMgr/SeNetMgr";
import { SeChartUnit, SeChartType, if_sys_ } from "../SeDefine";
import { Captain, Soldier } from "./SeWarZone";
import { configInst } from "../lib/TeConfig";
import { UnitMgr } from "./SeUnitMgr";


interface ifChartPlt {
    plt: string;
    dbname: string;
}

export class SeChartMgr {
    public allChartUnit: Map<SeUnit | PeakUnitEx> = new Map<SeUnit>();
    public warZone: Map<Captain> = new Map<Captain>();

    public plt_charts: Map<ifChartPlt> = new Map<ifChartPlt>();
    registPlt(plt: string) {
        UnitMgr.registPlt(plt);
        let dbname: string = UnitMgr.formate(plt);
        if (plt == 'sdw') dbname = 'sdw_qzone';
        if (plt == 'qzone') dbname = 'sdw_qzone';

        if (this.plt_charts.has(plt)) return;

        this.plt_charts.set(plt, {
            plt: plt,
            dbname: dbname
        })

        this._create_unit(plt, dbname);
    }

    private _bstart: boolean = false;

    private _create_unit(plt: string, dbname: string) {
        if (!this._bstart) return;
        let pre_db = this.allChartUnit.get(dbname + SeChartType.SCT_PVP_SCORE);
        if (!pre_db) {
            this.allChartUnit.set(dbname + SeChartType.SCT_PVP_SCORE, new SeUnit(plt, SeChartType.SCT_PVP_SCORE, dbname + 'pvp_score', 200));
            this.allChartUnit.set(dbname + SeChartType.SCT_1V1_WIN, new SeUnit(plt, SeChartType.SCT_1V1_WIN, dbname + '1v1_win', 200));
            this.allChartUnit.set(dbname + SeChartType.SCT_2V2_WIN, new SeUnit(plt, SeChartType.SCT_2V2_WIN, dbname + '2v2_win', 200, true));
            this.allChartUnit.set(dbname + SeChartType.SCT_PEAK_SCORE, new PeakUnitEx(plt, SeChartType.SCT_PEAK_SCORE, dbname + 'peak_score', 3000));
        }

        this.warZone.set(this.chartplt(plt, SeChartType.SCT_GROUP_PVP_SCORE, true), new Captain(plt));
    }


    private chartplt(plt: string, type: number, warZone: boolean = false) {
        var r = this.plt_charts.get(plt);
        if (!r) return type;
        if (warZone) {
            let splt = plt;
            if (plt == 'sdw') splt = '';
            return splt + type;
        }
        else {
            return r.dbname + type;
        }
    }

    private get_chart(_sys_: if_sys_, type: number) {
        return this.allChartUnit.get(this.chartplt(_sys_.plt, type));
    }


    private getGenGroupId(_sys_: if_sys_, type: number, newOrold: 'new' | 'old') {
        var r_lib = this.warZone.get(this.chartplt(_sys_.plt, type, true));
        if (r_lib) return r_lib.get_gen_SoldierId(newOrold);
        return 'zq001';
    }

    private getPlayerChart(_sys_: if_sys_, sid: string, type: number, startIndex: number = 0, length: number = 20, subParam: string, uid: number = 0, value?: any): { a: Array<{ score: number, value: SeChartUnit }>, s: number, r: number } {
        var rkChapter: SeUnit | Soldier = null;
        if (type == SeChartType.SCT_GROUP_PVP_SCORE) {
            var r_lib = this.warZone.get(this.chartplt(_sys_.plt, type, true));
            if (r_lib) rkChapter = r_lib.getChart(subParam, sid);
        }
        else {
            rkChapter = this.allChartUnit.get(this.chartplt(_sys_.plt, type));;
        }
        var rank = 0;
        if (!rkChapter) return { a: [], s: 0, r: rank + 1 };
        if (uid) {
            rank = rkChapter.find_uid_rank(uid, sid, _sys_.plt);
        }
        var aaa = rkChapter.get_value_range(startIndex, startIndex + length, sid);

        if (configInst.get('debug') == true) {
            while (aaa.length < 50) aaa.push({
                score: (50 - aaa.length) * (type + 1),
                value: {
                    id: aaa.length,
                    name: type + '测试数据' + aaa.length,
                    score: (50 - aaa.length) * (type + 1),
                    icon: 'AV001',
                    igroup: '',
                    seasonid: 'S001',
                }
            })
        }

        return { a: aaa.slice(startIndex, startIndex + length), s: rkChapter.get_chart_length(sid), r: rank };
    }

    //---------------以下都是对外开放的接口-------------------//
    start() {
        if (this._bstart) return;
        this._bstart = true;

        var plt_keys = this.plt_charts.keys;
        for (var i = 0; i < plt_keys.length; i++) {
            var r = this.plt_charts.get(plt_keys[i]);
            if (!r) continue;
            this._create_unit(r.plt, r.dbname);
        }

        // 这里加载历史榜单信息

        // redistInst.getHash('prechart').load(this._db_loadInfo.bind(this));
    }

    getWarZoneInfos(plt: string) {
        var zone = this.warZone.get(this.chartplt(plt, SeChartType.SCT_GROUP_PVP_SCORE, true))
        if (zone) return zone.chart_infos;
    }

    delete_all_chart_by_uid(plt: string, uid: number) {
        for (let key in SeChartType) {
            let type = SeChartType[key];
            if (type == SeChartType.SCT_GROUP_PVP_SCORE) {
                let r = this.warZone.get(this.chartplt(plt, SeChartType.SCT_GROUP_PVP_SCORE, true));
                if (r) {
                    r.del(uid, plt);
                }
            }
            else {
                let r = this.allChartUnit.get(this.chartplt(plt, SeChartType[key]));
                if (r) {
                    r.del(uid, plt);
                }
            }
        }
    }

    /**手动清理掉榜单信息 */
    public onClearRanks(plts: string[], rankTypes: number[]) {
        let out: { [plt: string]: { rank: number, name: string, uid: number, score: number }[][] } = {};
        for (let i = 0; i < plts.length; i++) {
            for (let j = 0; j < rankTypes.length; j++) {
                let plt = plts[i];
                let type = rankTypes[j];

                if (!out[plt]) out[plt] = [];

                let r = this.get_chart({ serverid: '', plt: plt }, type);
                if (!r) continue;

                r.delallrank();

                out[plt][type] = [];
            }
        }

        return out;
    }
    //-------------一下的请求都需要携带赛季id-----------------//

    public addPlayerChart(...args: any[]);
    public addPlayerChart(nid: string, _sys_: if_sys_, sid: string, type: number, chartInfo: SeChartUnit, subParam: string) {
        UnitMgr.saveInfo(_sys_.plt, chartInfo);
        if (chartInfo == undefined) {
            return;
        }

        if (type == SeChartType.SCT_GROUP_PVP_SCORE) {
            var r_lib = this.warZone.get(this.chartplt(_sys_.plt, type, true));
            if (r_lib) r_lib.addChart(chartInfo);
        }
        else {
            let rkChapter = this.allChartUnit.get(this.chartplt(_sys_.plt, type));
            rkChapter && rkChapter.add(chartInfo.score, chartInfo);
        }

    }

    public onGetScoreChart(...args: any[]);
    public onGetScoreChart(nid: string, _sys_: if_sys_, sid: string, chartype: number, startindex: number, length: number, charid: number, subType: string, value?: any) {
        var rankInfo = this.getPlayerChart(_sys_, sid, chartype, startindex, length, subType, charid, value);

        var para = {
            cmd: 'levelchart',
            rankinfo: rankInfo.a,
            chartype: chartype,
            startindex: startindex || 0,
            sumlength: rankInfo.s,
            charid: charid,
            rank: rankInfo.r
        };
        netInst.sendData(para, nid);
    }

    public onQueryRanks(...args: any[]);
    public onQueryRanks(nid: string, _sys_: if_sys_, sid: string, uid: number, rankTypes: Array<number>) {
        var rlist: { type: number, rank: number }[] = []
        for (var i = 0; i < rankTypes.length; i++) {
            var rt = rankTypes[i];
            var rc = this.get_chart(_sys_, rt);
            if (rc) {
                var index = rc.find_uid_rank(uid, sid, _sys_.plt);
                if (index > 0) {
                    rlist.push({
                        type: rt,
                        rank: index
                    })
                }
            }
        }

        var data = {
            cmd: 'queryrank',
            infos: rlist,
            charid: uid
        }
        netInst.sendData(data, nid);
    }

    /**
      * 获取一下榜单中的数据，制作成一个简单的数据
      * @param plts 
      * @param rankTypes 
      * @param len 
      */
    public QueryRanks(plts: string[], rankTypes: number[], len: number, sid: string) {
        let out: { [plt: string]: { rank: number, name: string, uid: string, score: number }[][] } = {};
        for (let i = 0; i < plts.length; i++) {
            for (let j = 0; j < rankTypes.length; j++) {
                let plt = plts[i];
                let type = rankTypes[j];

                if (!out[plt]) out[plt] = [];

                let r = this.get_chart({ serverid: '', plt: plt }, type);
                if (!r) continue;
                let chartv = r.get_value(sid);
                let rankinfo: { rank: number, name: string, uid: string, score: number }[] = [];
                let idx = 0;
                for (let key in chartv) {
                    idx++;
                    let r_info = chartv[key];
                    if (!r_info) continue;
                    if (idx > len) return;
                    let rUnit = UnitMgr.loadInfo(plt, r_info.value.id);
                    rankinfo.push({
                        rank: idx,
                        uid: r_info.value.id.toString(),
                        name: '',
                        score: r_info.score
                    })
                }
                out[plt][type] = rankinfo;
            }
        }

        return out;
    }

    public onGetGenGroupId(...args: any[]);
    public onGetGenGroupId(nid: string, _sys_: if_sys_, sid: string, chartype: number, charid: number, newOrold: 'old' | 'new') {
        var para = {
            cmd: 'gengroupid',
            charid: charid,
            groupid: this.getGenGroupId(_sys_, chartype, newOrold)
        };
        netInst.sendData(para, nid);
    }

    public cheatMsg(...data: any[]);
    public cheatMsg(nid: string, _sys_: if_sys_, sid: string, cmd: string) {
        switch (cmd) {

        }
    }

    public onGiveDayReward(...args: any[]);
    public onGiveDayReward(nid: string, _sys_: if_sys_, sid: string, chartype: number, uid: number = 0, score: number, rtime: number, pass_time: number) {
        if (chartype != SeChartType.SCT_PEAK_SCORE) {
            return;
        }

        let rkChapter = this.allChartUnit.get(this.chartplt(_sys_.plt, chartype)) as PeakUnitEx;
        let rewards: Object[];
        if (rkChapter) {
            rewards = rkChapter.giveDayReward(uid, score, rtime, _sys_.plt);
        }

        var data = {
            cmd: 'giveDayReward_ret',
            reward: rewards,
            charid: uid,
            pass_time: pass_time
        }
        netInst.sendData(data, nid);
    }

    public onGiveSeasonReward(...args: any[]);
    public onGiveSeasonReward(nid: string, _sys_: if_sys_, sid: string, chartype: number, uid: number = 0, score: number, rtime: number) {
        if (chartype != SeChartType.SCT_PEAK_SCORE) {
            return;
        }

        let rkChapter = this.allChartUnit.get(this.chartplt(_sys_.plt, chartype)) as PeakUnitEx;
        let reward: {};
        if (rkChapter) {
            reward = rkChapter.giveSeasonReward(uid, score, sid);
        }

        var data = {
            cmd: 'giveSeasonReward_ret',
            reward: reward,
            charid: uid
        }
        netInst.sendData(data, nid);
    }
}