"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcMgr = void 0;
const SeNetMgr_1 = require("./SeNetMgr");
class ProcUnit {
    constructor(event, func, stype) {
        this.event = event;
        this.func = func;
        this.stype = stype;
    }
    init() {
        SeNetMgr_1.netInst.on(this.stype, this.event, this.func);
    }
    destory() {
        SeNetMgr_1.netInst.removeListener(this.stype, this.event, this.func);
    }
}
class ProcMgr {
    constructor(bindfile) {
        this._bind_file = '';
        this.s_bind_listens = [];
        this._bind_file = bindfile;
    }
    _on_model_change_() {
        module;
    }
    regist_proc(event, func, s_type = 'server') {
        this.s_bind_listens.push(new ProcUnit(event, func, s_type));
    }
    /**
     * 模块模块装载
     */
    BEGIN() {
        for (var i = 0; i < this.s_bind_listens.length; i++) {
            var r = this.s_bind_listens[i];
            r.init();
        }
    }
    /**
     * 模块卸载
     */
    FINISH() {
        for (var i = 0; i < this.s_bind_listens.length; i++) {
            var r = this.s_bind_listens[i];
            r.destory();
        }
    }
}
exports.ProcMgr = ProcMgr;
//# sourceMappingURL=TeProc.js.map