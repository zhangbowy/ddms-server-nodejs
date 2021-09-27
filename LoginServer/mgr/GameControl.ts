import { HashMap } from "../lib/TeTool";
import { ReHash } from "../lib/TeRedis";
import { redistInst, gmMgrInst } from "./GMMgr";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface if_control_unit {
    id: string,
    plt: string,
    type: string,
    mxvalue: number,
    configkey: string,
    configvalue: string,
    autoset: boolean
}

export class GameControl {
    private static _inst: GameControl;
    static get inst() {
        if (!this._inst) {
            this._inst = new GameControl();
        }
        return this._inst;
    }

    private _control_datas: HashMap<if_control_unit> = new HashMap();
    private _control_db: ReHash;

    constructor() {
        let f_path = join(process.cwd(), "gamecontrol.json");
        let reload = false;
        if (existsSync(f_path)) {
            try {
                let files = JSON.parse(readFileSync(f_path).toString());
                for (let i = 0; i < files.length; i++) {
                    let r = files[i];
                    if (r.plt && r.id && r.type && r.mxvalue && r.configkey && r.configvalue) {
                        this.regist(r.plt, r.id, r.type, r.mxvalue, r.configkey, r.configvalue, r.autoset || false);
                    }
                }
                reload = true;
            }
            catch (e) {
                console.error(e);
            }

        }
        if (!reload) {
            this.regist("wx", 'S001', "reduseitem3", 29900, "reduseitem3", "false", true);
            this.regist("wx", 'S002', "reduseitem3", 25000, "cash_allowed", "false", true);
        }
        // this.regist("sdw", "reduseitem3", 1, "reduseitem3", "false", true);
    }

    /**
     * 注册一个事件开关控制器
     * 当type上报次数值到达mxvalue后
     * 在config上面配置configkey:configvalue
     * @param plt   平台
     * @param type  上报类型
     * @param mxvalue 控制数值
     * @param configkey 设置key
     * @param configvalue 设置值
     */
    regist(plt: string, id: string, type: string, mxvalue: number, configkey: string, configvalue: string, autoset: boolean) {
        let maps = this._control_datas.get(plt) || [];
        for (let i = 0; i < maps.length; i++) {
            let r = maps[i];
            if (r.type == type && r.plt == plt && r.id == id) {
                // 存在过了就不需要处理了
                return;
            }
        }
        this._control_datas.add(plt, {
            id: id,
            plt: plt,
            type: type,
            mxvalue: mxvalue,
            configkey: configkey,
            configvalue: configvalue,
            autoset: autoset
        });
    }

    add_config_value(plt: string, type: string, value: number) {
        if (!this._control_db) return false;
        let cfgs = this._get_config(plt, type);
        if (!cfgs) return false;

        let cur_value = this._get_db_value(plt, type);
        if (cur_value == null || cur_value == undefined || isNaN(cur_value)) cur_value = 0;
        if(typeof value != 'number') return false;
        if (value == null || value == undefined || isNaN(value)) value = 0;

        cur_value = cur_value + value;
        this._set_db_value(plt, type, cur_value);

        for (let i = 0; i < cfgs.length; i++) {
            let cfg = cfgs[i];
            if (!cfg) continue;

            if (cfg.autoset && cur_value >= cfg.mxvalue) {
                // 需要触发开关了
                if (gmMgrInst.get_global_config(cfg.plt, cfg.configkey) != cfg.configvalue) {
                    gmMgrInst.switch_global_config(cfg.plt, cfg.configkey, cfg.configvalue, false);
                }
            }
        }

        return true;
    }

    get_curr_show(plt: string, type: string) {
        if (!this._control_db) return '';
        let db_value = this._get_db_value(plt, type);
        let cfgs = this._get_config(plt, type);

        let out = [];
        for (let i = 0; i < cfgs.length; i++) {
            let r = cfgs[i];
            if (!r) continue;
            out.push({
                '配置值': r.configkey,
                "目前配置": gmMgrInst.get_global_config(r.plt, r.configkey),
                "当前数值": db_value,
                "最大值": r.mxvalue
            })
        }
        return JSON.stringify(out);
    }

    private _get_db_value(plt: string, type: string) {
        if (!this._control_db) return 0;
        return this._control_db.get(plt + '|' + type) || 0;
    }

    private _set_db_value(plt: string, type: string, value: number) {
        if (!this._control_db) return false;
        this._control_db.save(plt + '|' + type, value);
        return true;
    }

    private _get_config(plt: string, type: string) {
        let maps = this._control_datas.get(plt);

        let out: if_control_unit[] = [];
        for (let i = 0; i < maps.length; i++) {
            let r = maps[i];
            if (r.plt == plt && r.type == type) {
                out.push(r);
            }
        }

        return out;
    }


    loadcfgs() {
        redistInst.getHash("GameControlConfig").load((succ: boolean, db: ReHash) => {
            this._control_db = db;
            // 加载完成后检查一下配置
            let cfg_values = this._control_db.value;
            for (let key in cfg_values) {
                if (!key) continue;
                let infos = key.split('|');
                if (infos.length != 2) continue;
                this.add_config_value(infos[0], infos[1], 0)
            }
        });
    }
}