import { IfMatchServicefunc } from "./matchDefine";


/**
 * 管理各种匹配池子
 */
export class MatchPoolMgr {
    static matchPool: { [matchtype: string]: PoolUnit } = {};
    static match_proc_pool: {
        [type: string]: IfMatchServicefunc
    } = {}

    static regist_pool(type: string, process: IfMatchServicefunc) {
        this.match_proc_pool[type] = process

        if (!this.matchPool.hasOwnProperty(type)) {
            this.matchPool[type] = new PoolUnit(type);
        }
    }

    static enter_pool(type: string, score: number | string, uid: number, plt: string) {
        if (!this.matchPool.hasOwnProperty(type)) return false;
        return this.matchPool[type].enter_pool(score, uid, plt);
    }

    static update() {
        for (let key in this.matchPool) {
            let r = this.matchPool[key];
            r.update_pool();
        }
    }
}

/**
 * 匹配池子
 * 按照分段来存放
 */
class PoolUnit {
    pools: { [plt: string]: { [floor: string]: number[] } } = {}
    mode: string;
    plt: string;
    constructor(mode: string) {
        this.mode = mode;
    }

    /**加入池子 */
    enter_pool(score: number | string, uid: number, plt: string) {
        let floor = MatchPoolMgr.match_proc_pool[this.mode].enter(score);
        if (!this.pools.hasOwnProperty(plt)) this.pools[plt] = {};
        let pool = this.pools[plt][floor] || [];
        if (pool.indexOf(uid) == -1) {
            pool.push(uid);
            this.pools[plt][floor] = pool;
        }

        return true;
    }

    private get_floor(plt: string, floor: string) {
        if (!this.pools.hasOwnProperty(plt)) {
            return []
        }

        return this.pools[plt][floor] || [];
    }

    update_pool() {
        for (let plt in this.pools) {
            let pltPools = this.pools[plt];
            for (let floor in pltPools) {
                let infos = pltPools[floor];
                if (!infos || infos.length == 0) {
                    delete pltPools[floor];
                    continue;
                }
                let r = MatchPoolMgr.match_proc_pool[this.mode];
                if (r) {
                    r.match(plt, floor, this.get_floor.bind(this, plt), this.reset_pool.bind(this, plt));
                }
                else {
                    console.log(`no match function <${this.mode}>`);
                }
            }
        }
    }

    private reset_pool(plt: string, floor: string, uids: number[]) {
        if (!this.pools.hasOwnProperty(plt)) {
            this.pools[plt] = {};
        }

        if (uids.length == 0) {
            delete this.pools[plt][floor]
        }
        else {
            this.pools[plt][floor] = uids;
        }
    }
}