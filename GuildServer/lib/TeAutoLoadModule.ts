import { EventEmitter } from "events";
import { FSWatcher, watch, readdirSync, statSync, readFileSync, existsSync } from "fs";
import { join, parse } from "path";
import { createHash } from "crypto";
import { exec } from "child_process";
import { TeMap } from "./TeTool";

class DirMonitor extends EventEmitter {
    private _fsw: FSWatcher | undefined;
    private _path: string;

    private _sub_file: TeMap<string> = new TeMap();
    private _sub_dri: TeMap<DirMonitor> = new TeMap();

    constructor(path: string) {
        super();
        this._path = path;
    }

    init() {
        // 初始化所有文件文件夹
        let files = readdirSync(this._path);
        for (let i = 0; i < files.length; i++) {
            let filename = files[i];
            let r_file = join(this._path, filename);
            let stat = statSync(r_file);
            if (stat.isDirectory()) {
                let mot = new DirMonitor(r_file);
                mot.on("new", this._pip_event.bind(this, "new"));
                mot.on("change", this._pip_event.bind(this, "change"));
                mot.on("del", this._pip_event.bind(this, "del"));
                mot.init();
                this._sub_dri.set(filename, mot);
            }
            else {
                let md5 = createHash("md5").update(readFileSync(r_file)).digest("hex");
                this._sub_file.set(filename, md5);
                this.emit("new", r_file);
            }
        }
        this._fsw = watch(this._path);
        this._fsw.on("change", this._on_modify.bind(this));
        this._fsw.on("error", this._on_error.bind(this));
    }

    on(event: "new" | "change" | "del", listener: (...args: any[]) => void) {
        return super.on(event, listener);
    }
    off(event: "new" | "change" | "del", listener: (...args: any[]) => void) {
        return super.removeListener(event, listener);
    }

    private _pip_event(event: any, ...args: any[]) {
        this.emit(event, ...args);
    }

    private _on_error(error: any) {
        // console.log(error);
    }

    private _on_modify(event: string, filename: string) {
        let r_path = join(this._path, filename);
        // 首先判断一下是否存在
        if (!existsSync(r_path)) {
            if (this._sub_dri.has(filename)) {
                // 文件夹关闭了那么删除掉目录
                let dir = this._sub_dri.get(filename);
                dir && dir.destory();
                this._sub_dri.delete(filename);
            }
            else if (this._sub_file.has(filename)) {
                this.emit("del", r_path);
                this._sub_file.delete(filename);
            }
        }
        else {
            // 文件存在的,那么需要判断文件夹还是文件
            let stat = statSync(r_path);
            if (stat.isDirectory()) {
                // 如果是个文件夹事件,那么就检查一下是否有子文件夹需要监控
                if (!this._sub_dri.has(filename)) {
                    let mot = new DirMonitor(r_path);
                    mot.on("new", this._pip_event.bind(this, "new"));
                    mot.on("change", this._pip_event.bind(this, "change"));
                    mot.on("del", this._pip_event.bind(this, "del"));
                    mot.init();
                    this._sub_dri.set(filename, mot);
                }
            }
            else {
                // 判断一下文件是否需要触发相应
                let md5 = createHash("md5").update(readFileSync(r_path)).digest("hex");
                if (!this._sub_file.has(filename)) {
                    // 新增文件
                    this.emit("new", r_path);
                }
                else if (this._sub_file.get(filename) != md5) {
                    // 文件变动
                    this.emit("change", r_path);
                }

                this._sub_file.set(filename, md5);
            }
        }
    }

    destory() {
        this._sub_file.forEach((v, k, m) => {
            this.emit("del", join(this._path, k));
        })

        this._fsw && this._fsw.close();
        this.removeAllListeners("new");
        this.removeAllListeners("change");
        this.removeAllListeners("del");
        this._sub_dri.forEach((v, k, m) => {
            v.destory();
        });
    }
}

export class AutoLoaderModule extends EventEmitter {
    static cache: { [filename: string]: AutoLoaderModule } = {};
    static del_cache: { [filename: string]: NodeModule } = {};
    /**
     * 监听文件夹，加载文件夹中的所有js
     * @param dir 
     */
    static watch(dir: string): AutoLoaderModule {
        let tp = this.cache[dir];
        if (!tp) {
            tp = new AutoLoaderModule(dir);
            this.cache[dir] = tp;
        }
        return tp;
    }

    private _md: DirMonitor;
    private constructor(dir: string) {
        super();
        let md = new DirMonitor(dir)
        md.on("new", this.addModule.bind(this))
        md.on("change", (f) => {
            this.delModule(f);
            this.addModule(f);
        })
        md.on("del", this.delModule.bind(this));
        // md.init();
        this._md = md;
        AutoLoaderModule.cache[dir] = this;
    }

    /**
     * 开始加载
     */
    load(): AutoLoaderModule {
        this._md.init();
        return this;
    }

    on(event: 'add' | 'del', listener: (filename: string, complete: boolean) => void) {
        return super.on(event, listener);
    }

    off(event: 'add' | 'del', listener: (filename: string) => void) {
        return super.removeListener(event, listener);
    }

    private _ModuleCache_: TeMap<boolean> = new TeMap<boolean>();

    private addModule(filename: string) {
        // console.log(filename);
        if (this._ModuleCache_.has(filename)) {
            console.error('replete file occure', filename);
            return;
        }
        let comp = false;
        let ext = parse(filename).ext;
        try {
            if (ext == '.js') {
                let __all = require(filename);
                let __pre_all = AutoLoaderModule.del_cache[filename];
                // 看看有什么需要替换的
                if (__pre_all) {
                    for (let key in __all) {
                        __pre_all.exports[key] = __all[key];
                    }
                    delete AutoLoaderModule.del_cache[filename];
                    require.cache[filename] = __pre_all;
                }
                // if (__all && __all.init) __all.init();
            }
            else if (ext == '.ts') {
                // 这里要么黑科技一下 自动编译
                // 暂时不用，可以使用
                return;
                exec("tsc " + filename, (o) => {
                    // 编译
                    if (o) console.error(o);
                })
            }
            comp = true;
        }
        catch (e) {
            console.error('load_module[%s]_error[%s]', filename, e);
        }

        if (ext == '.js') {
            this._ModuleCache_.set(filename, comp);
            this.emit('add', filename, comp);
        }
    }

    private delModule(filename: string) {
        // 把卸载的对象缓存一下，修改添加的时候重写这个对象实现功能替换
        AutoLoaderModule.del_cache[filename] = require.cache[filename];

        this._ModuleCache_.del(filename);
        delete require.cache[filename];
        this.emit("del", filename, true);
    }
}