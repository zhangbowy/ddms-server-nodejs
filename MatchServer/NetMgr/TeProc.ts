// import { TePerformanceMgr } from "./TePerformance";
// import { ServerMgr } from "../netproc/serverMgr";
interface ifMgr {
    regist(event, listen);

    delete(event, listen?);
}

class ProcUnit {
    event: string;
    func: (nid: string, data?: any) => void | string;
    stype: string;
    _netMgr: ifMgr;
    filename: string;
    ready: boolean = false;

    constructor(_netMgr: any, event: string, func: (nid: string, data?: any) => void | string, stype: string, filename: string) {
        this.event = event;
        this.func = func;
        this.stype = stype;
        this._netMgr = _netMgr;
        this.filename = filename;
        this.bind_listen = this._on_proc_.bind(this);
    }

    init() {
        if (this.ready) return;
        this.ready = true;
        this._netMgr.regist(this.stype + '.' + this.event, this.bind_listen);
    }

    private bind_listen: Function;

    private _on_proc_(nid, ...args: any[]) {
        let st = Date.now();

        let ot = this.func(nid, ...args);
        // ServerMgr.inst.heart_searver(nid);
        // let cb = args[1];
        // if (cb && typeof cb == 'function') {
        //     cb(ot || '');
        // }
        // TePerformanceMgr.inst.add_proc_cost(this.stype, this.event, Date.now() - st);
    }

    destory() {
        this._netMgr.delete(this.stype + '.' + this.event, this.bind_listen);
        this.ready = false;
    }
}

export class ProcMgr<T> {
    private _bind_file: string = '';
    private _stype: string = 'server'
    private _netMgr: T;

    public g_nid: string = '';

    private _init_ = false;

    public get netMgr() {
        return this._netMgr;
    }

    /**
     * 
     * @param bindfile 绑定的文件 
     * @param netMgr 网络管理器
     * @param stype 对应的网络名字
     */
    constructor(bindfile?: string, netMgr?: T, stype?: string) {
        this._bind_file = bindfile;
        this._stype = stype || this._stype;
        this._netMgr = netMgr;
    }

    s_bind_listens: Array<ProcUnit> = [];
    regist_proc(event: string | number, func: (nid: string, data?: any, ...args) => void, filename: string) {
        let stype = this._stype;
        if (event == 'local.update') {
            // 特殊处理，处理update
            stype = 'local';
            event = 'update';
        }

        let pu = new ProcUnit(this._netMgr, event.toString(), func, stype, filename);
        this.s_bind_listens.push(pu);
        if (this._init_) {
            // 如果已经初始化过了就立即启动一下
            pu.init();
        }
    }

    remove_proc(event: string, func: (nid: string, data?: any) => void) {
        for (let i = 0; i < this.s_bind_listens.length; i++) {
            let r = this.s_bind_listens[i];
            if (r.event != event) {
                continue;
            }

            if (func && r.func != func) {
                continue;
            }

            if (this._init_) r.destory();
            this.s_bind_listens.splice(i, 1);
            i--;
        }
    }

    sendData(cmd: number, info: any, nid?: string) {
        nid = nid || this.g_nid;

        if (typeof this.netMgr['sendData'] == 'function') {
            return this.netMgr['sendData'](cmd, info, nid);
        }
        return false;
    }

    sendAll(cmd: number, info: any) {
        if (typeof this.netMgr['sendAll'] == 'function') {
            return this.netMgr['sendAll'](cmd, info, this.g_nid);
        }
        return false;
    }

    /**
     * 模块模块装载
     */
    BEGIN(filename?: string) {
        for (var i = 0; i < this.s_bind_listens.length; i++) {
            var r = this.s_bind_listens[i];
            if (filename && filename != r.filename) continue;
            r.init();
        }

        this._init_ = true;
    }

    /**
     * 模块卸载
     */
    FINISH(filename?: string) {
        for (var i = 0; i < this.s_bind_listens.length; i++) {
            var r = this.s_bind_listens[i];
            if (filename && filename != r.filename) continue;
            r.destory();

            this.s_bind_listens.splice(i, 1);
            i--;
        }
    }
}