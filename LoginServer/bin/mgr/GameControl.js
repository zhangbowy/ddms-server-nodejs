"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameControl = void 0;
const TeTool_1 = require("../lib/TeTool");
const GMMgr_1 = require("./GMMgr");
const fs_1 = require("fs");
const path_1 = require("path");
class GameControl {
    constructor() {
        this._control_datas = new TeTool_1.HashMap();
        let f_path = path_1.join(process.cwd(), "gamecontrol.json");
        let reload = false;
        if (fs_1.existsSync(f_path)) {
            try {
                let files = JSON.parse(fs_1.readFileSync(f_path).toString());
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
    static get inst() {
        if (!this._inst) {
            this._inst = new GameControl();
        }
        return this._inst;
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
    regist(plt, id, type, mxvalue, configkey, configvalue, autoset) {
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
    add_config_value(plt, type, value) {
        if (!this._control_db)
            return false;
        let cfgs = this._get_config(plt, type);
        if (!cfgs)
            return false;
        let cur_value = this._get_db_value(plt, type);
        if (cur_value == null || cur_value == undefined || isNaN(cur_value))
            cur_value = 0;
        if (typeof value != 'number')
            return false;
        if (value == null || value == undefined || isNaN(value))
            value = 0;
        cur_value = cur_value + value;
        this._set_db_value(plt, type, cur_value);
        for (let i = 0; i < cfgs.length; i++) {
            let cfg = cfgs[i];
            if (!cfg)
                continue;
            if (cfg.autoset && cur_value >= cfg.mxvalue) {
                // 需要触发开关了
                if (GMMgr_1.gmMgrInst.get_global_config(cfg.plt, cfg.configkey) != cfg.configvalue) {
                    GMMgr_1.gmMgrInst.switch_global_config(cfg.plt, cfg.configkey, cfg.configvalue, false);
                }
            }
        }
        return true;
    }
    get_curr_show(plt, type) {
        if (!this._control_db)
            return '';
        let db_value = this._get_db_value(plt, type);
        let cfgs = this._get_config(plt, type);
        let out = [];
        for (let i = 0; i < cfgs.length; i++) {
            let r = cfgs[i];
            if (!r)
                continue;
            out.push({
                '配置值': r.configkey,
                "目前配置": GMMgr_1.gmMgrInst.get_global_config(r.plt, r.configkey),
                "当前数值": db_value,
                "最大值": r.mxvalue
            });
        }
        return JSON.stringify(out);
    }
    _get_db_value(plt, type) {
        if (!this._control_db)
            return 0;
        return this._control_db.get(plt + '|' + type) || 0;
    }
    _set_db_value(plt, type, value) {
        if (!this._control_db)
            return false;
        this._control_db.save(plt + '|' + type, value);
        return true;
    }
    _get_config(plt, type) {
        let maps = this._control_datas.get(plt);
        let out = [];
        for (let i = 0; i < maps.length; i++) {
            let r = maps[i];
            if (r.plt == plt && r.type == type) {
                out.push(r);
            }
        }
        return out;
    }
    loadcfgs() {
        GMMgr_1.redistInst.getHash("GameControlConfig").load((succ, db) => {
            this._control_db = db;
            // 加载完成后检查一下配置
            let cfg_values = this._control_db.value;
            for (let key in cfg_values) {
                if (!key)
                    continue;
                let infos = key.split('|');
                if (infos.length != 2)
                    continue;
                this.add_config_value(infos[0], infos[1], 0);
            }
        });
    }
}
exports.GameControl = GameControl;
//# sourceMappingURL=GameControl.js.map