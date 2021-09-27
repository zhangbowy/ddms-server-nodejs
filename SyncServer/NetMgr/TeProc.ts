import { netInst } from "./SeNetMgr";


class ProcUnit {
    event: string;
    func: Function;
    stype: string;
    constructor(event: string, func: Function, stype: string) {
        this.event = event;
        this.func = func;
        this.stype = stype;

    }

    init() {
        netInst.on(this.stype, this.event, this.func);
    }

    destory() {
        netInst.removeListener(this.stype, this.event, this.func);
    }
}

export class ProcMgr {
    private _bind_file: string = '';
    constructor(bindfile?: string) {
        this._bind_file = bindfile;
    }

    private _on_model_change_() {
        module;
    }

    s_bind_listens: Array<ProcUnit> = [];
    regist_proc(event: string, func: (nid: string, data?: any) => void, s_type: string = 'server') {
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