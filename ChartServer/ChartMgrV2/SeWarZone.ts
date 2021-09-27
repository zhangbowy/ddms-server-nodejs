import { SeResModule, resMgrInst } from '../mgr/SeResMgr';
import { SeResseason, SeResArea } from "../Res/interface";
import { ReHash, redistInst } from "../lib/TeRedis";
import { SeUnitOne } from './BaseUnit';
import { SeChartType, SeChartUnit } from '../SeDefine';
import { Map } from '../lib/TeTool';

// 这个是控制赛季的模块
export class Captain {
    private _plt: string = '';
    private _captain_db_: ReHash;

    private _soldiers_: Map<Soldier> = new Map<Soldier>();

    private _season_res_: SeResModule<SeResseason>;
    private _arean_res_: SeResModule<SeResArea>;

    private _ready_ = false;

    get plt() {
        return this._plt;
    }

    constructor(plt: string) {
        this._plt = plt;

        this._arean_res_ = resMgrInst.get_target('Area.json', this._plt);
        this._season_res_ = resMgrInst.get_target<SeResseason>('season.json', this._plt);
        this._captain_db_ = redistInst.getHash('captain_' + this._plt);
        this._captain_db_.load(() => {
            this._ready_ = true;

            let all_ids = this.getSoldierIDs('tot');
            // 需要依照 战队id 来构造战队数组
            for (let i = 0; i < all_ids.length; i++) {
                let rid = all_ids[i]; //.split('_').pop()
                if (this._captain_db_.get('solider_use_' + rid)) {
                    // 如果这个战区分配过，那么就初始化一下
                    let gp = new Soldier(this._plt, rid);
                    this._soldiers_.set(gp.groupid, gp);
                }
            }
        });

        setInterval(this.update.bind(this), 1000);
    }

    public addChart(chartInfo: SeChartUnit) {
        // 这里判断一下战区id是否合法，不合法就丢弃
        if (!chartInfo) return;
        if (this.seasonid && chartInfo.seasonid && this.seasonid != chartInfo.seasonid) {
            return;
        }

        var r_group = this._soldiers_.get(chartInfo.igroup);
        if (r_group) {
            r_group.add(chartInfo.score, chartInfo);
        }
        else if (chartInfo.igroup.length >= 4) {
            r_group = new Soldier(this.plt, chartInfo.igroup);
            r_group.add(chartInfo.score, chartInfo);
            this._soldiers_.set(r_group.groupid, r_group);
        }
    }

    public getChart(iGroupId: string, sid: string) {
        if (sid != this.seasonid) return null;
        return this._soldiers_.get(iGroupId); //.split('_').pop()
    }

    /**删除特定玩家 */
    public del(uid: number, plt:string) {
        let keys = this._soldiers_.keys;
        for (var i = 0; i < keys.length; i++) {
            var r = this._soldiers_.get(keys[i]);
            if (r) {
                r.del(uid, plt);
            }
        }
    }

    /**
     * 赛季信息
     */
    get chart_infos() {
        //获取赛季的信息
        var infos: object[] = [];
        let keys = this._soldiers_.keys;
        for (var i = 0; i < keys.length; i++) {
            var r = this._soldiers_.get(keys[i]);
            if (r) infos.push({ gId: i, pCount: r.count });
        }
        return infos;
    }

    /**
    * 当前赛季id
    */
    get seasonid() {
        return this._captain_db_.get('seasonid') || 'S000';
    }

    set seasonid(v) {
        this._captain_db_.save('seasonid', v);
    }

    update() {
        if (!this._ready_) return;
        this.checkSeason();
    }

    saijiback() {
        if (!this._ready_) return;

        // 找到上一个赛季
        for (var key in this._season_res_.resData) {
            var rs = this._season_res_.resData[key] as SeResseason;
            if (rs.kNextID == this.seasonid) {
                this.seasonid = rs.kID;
                break;
            }
        }

        this.checkSeason();
    }

    checkSeason() {
        var curr = Date.now();
        var pkRes = this._season_res_.getRes(this.seasonid);
        if (pkRes && pkRes.kEndTime) {
            if (curr > (new Date(pkRes.kEndTime)).getTime() && pkRes.kNextID) {
                // 表示当前已经超过那个赛季了，开始了新的征程
                this.seasonid = pkRes.kNextID;
                // 新赛季的话就要重置 战区信息
                // 清除掉所有战区数据
                let all_ids = this.getSoldierIDs('tot');
                for (let i = 0; i < all_ids.length; i++) {
                    let r = all_ids[i];
                    this._captain_db_.del('solider_use_' + r);
                }

                let keys = this._soldiers_.keys;
                for (let i = 0; i < keys.length; i++) {
                    let r = this._soldiers_.get(keys[i]);
                    if (r) r.removeSelf();
                }

                this.checkSeason();
            }
        }
    }

    getSoldierIDs(newOrOld: 'new' | 'old' | 'tot') {
        let iNew = newOrOld == 'new' ? 1 : 0;
        let IDS = [];
        let keys = this._arean_res_.keys();
        for (let i = 0; i < keys.length; i++) {
            let r = this._arean_res_.getRes(keys[i]);
            if (r.iCount <= 0) continue;
            if (newOrOld == 'tot') {
                IDS.push(r.kID);
            }
            else if (r.iType == iNew) {
                IDS.push(r.kID);
            }
        }

        IDS.sort((a, b) => {
            let res_a = this._arean_res_.getRes(a);
            let res_b = this._arean_res_.getRes(b);
            if (res_a.iPosion == res_b.iPosion) return res_a.iPosion > res_a.iPosion ? 1 : -1;
            else return res_a.kID > res_b.kID ? 1 : -1;
        })

        return IDS;
    }

    /**
     * 获取一个战区小兵id
     * 不判断是否存在过的,只负责提供id
     * 
     * 提供玩家生成自身战区id的机制 一般位引导走完和赛季重置开始
     */
    get_gen_SoldierId(newOrOld: 'new' | 'old') {
        var iFight = 0;

        let soldier_ids = this.getSoldierIDs(newOrOld);
        let outID = soldier_ids[soldier_ids.length - 1];
        for (let i = 0; i < soldier_ids.length; i++) {
            let s_id = soldier_ids[i];
            let count = this._captain_db_.get('solider_use_' + s_id);
            let r_res = this._arean_res_.getRes(s_id);
            if (count < r_res.iCount) {
                // 找到了满足要求的大区了
                outID = r_res.kID;
                this._captain_db_.save('solider_use_' + s_id, count + 1);
                break;
            }
        }

        if (!this._soldiers_.has(outID)) {
            let gp = new Soldier(this._plt, outID);
            this._soldiers_.set(gp.groupid, gp);
        }

        return outID;
    }
}

/**
 * 每一定人数组成的一个战区榜单
 */
export class Soldier extends SeUnitOne {
    groupid: string;

    constructor(plt: string, groupid: string) {
        let rgid = groupid.split('_').pop();
        super(plt, SeChartType.SCT_GROUP_PVP_SCORE, plt + '_group_pvp_score_' + rgid, 200, true)
        this.groupid = groupid;
    }

    /**
     * 获取战区人数
     */
    get count() {
        return this._chartDB.value.length;
    }

    /**
     * 赛季重置了，清掉所有数据
     */
    removeSelf() {
        this._chartDB.clearAll();
        this._onLoad();
    }
}