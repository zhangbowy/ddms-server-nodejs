import { if_sys_ } from '../SeDefine';
import { HashMap, TeMap } from '../lib/TeTool';

function find_same(a: number[], b: number[]) {
    var outs = [];
    for (var i = 0; i < a.length; i++) {
        var r_a = a[i];
        if (b.indexOf(r_a) >= 0) {
            outs.push(r_a)
        }
    }

    return outs;
}

// 管理一个公共的平台处理
export class SePltMgr {
    private _match_cfg: TeMap<{
        g1: number,// 匹配用的分组
        g2: number,// 2v2 分组
    }> = new TeMap();
    constructor() {
        // 注册特殊的 1v1 2v2 匹配规则，主要是提供给 混服匹配的时候使用
        this.regist_plt('sdw', 0, 0);
        this.regist_plt('qzone', 0, 0);
    }

    private _used_plt = [];

    regist_plt(plt: string, g1: number, g2: number) {
        if (this._used_plt.indexOf(plt) >= 0) return;
        this._used_plt.push(plt);
        this._match_cfg.set(plt, { g1: g1, g2: g2 });

    }

    match_plt(a: if_sys_, use2v2: boolean = false) {
        if (!a) return 0;

        if (!this._match_cfg.has(a.plt)) {
            // 出现的就注册一个新的进去
            //  如果没有配置,那么认为几个平台是独立的，不能互相匹配的
            this.regist_plt(a.plt, this._used_plt.length, this._used_plt.length)
        }

        let r = this._match_cfg.get(a.plt);
        if (r) {
            return use2v2 ? r.g2 : r.g1;
        }
        return 0;
    }
}

export var pltMgrInst = new SePltMgr();