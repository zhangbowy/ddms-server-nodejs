import { Map } from "../lib/TeTool";
import { ReHash, redistInst } from "../lib/TeRedis";
import { SeChartUnit } from "../SeDefine";

// 这里是通用管理所有的榜单玩家信息,每个榜单上就不用再存一份玩家数据了

class ifUnitInfo {
    /** 玩家id*/
    public id: number = 0;
    /** 名字 */
    public name: string = '';
    public icon: string = '';
    public igroup: string = '';
    public seasonid: string = '';
}

export class UnitMgr {
    private static allPltMgrs: Map<PlayerMgr> = new Map();

    static formate(plt: string) {
        let dbname: string = plt;
        if (plt == 'sdw') dbname = 'sdw_qzone';
        if (plt == 'qzone') dbname = 'sdw_qzone';
        return dbname;
    }

    static registPlt(plt: string) {
        let dbname = this.formate(plt);
        if (!this.allPltMgrs.has(dbname)) {
            this.allPltMgrs.set(dbname, new PlayerMgr(plt));
        }
    }

    private static get(plt: string) {
        let dbname = this.formate(plt);
        if (!this.allPltMgrs.has(dbname)) {
            return undefined;
        }

        return this.allPltMgrs.get(dbname);
    }

    static loadInfo(plt: string, uid: number | string) {
        let dbname = this.formate(plt);
        let r = this.get(dbname);
        if (!r || !r.ready) return null;
        return r.get(uid);
    }

    static saveInfo(plt: string, info: SeChartUnit) {
        let dbname = this.formate(plt);
        let r = this.get(dbname);
        if (r! || !r.ready) return;
        r.save(info.id, info);
    }
}

class PlayerMgr {

    unitsDB: ReHash;

    private plt: string;
    ready: boolean = false;

    constructor(plt: string) {
        this.plt = plt;
    }

    load() {
        this.unitsDB = redistInst.getHash(this.plt + "_chartUnit");
        this.unitsDB.load(this.onload.bind(this));
    }

    private onload() {
        this.ready = true;
    }

    save(uid: number | string, info: ifUnitInfo) {
        this.unitsDB.save(uid.toString(), info)
    }

    get(uid: number | string): ifUnitInfo {
        return this.unitsDB.get(uid.toString());
    }
}