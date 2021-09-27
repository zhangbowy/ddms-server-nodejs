import * as fs from 'fs';
import * as path from 'path';

function func_copy(obj, bFunc = false, dValue?: Object) {
    dValue = dValue || {};
    var out = {};
    if (obj instanceof Array) {
        out = [];
    }

    if (typeof obj == 'object') {
        for (var key in obj) {
            var v = obj[key] || dValue[key];
            if (key == 'clone') {
                continue;
            }
            if (typeof v == 'function' && !bFunc) {
                continue;
            }
            if (v == null) {
                out[key] = null;
            }
            else if (typeof v == 'object') {
                out[key] = func_copy(v, false, dValue[key]);
            }
            else {
                out[key] = v;
            }
        }
    }
    else {
        out = obj || dValue;
    }
    return out;
}

class TeConfigMgr {
    private _configValue: Object;
    private _defaultValue: Object;
    private _dynamiValue: Object;

    private _filePath: string = '';
    private _dynamicPath: string = '';
    constructor(file: string = 'config.json', dfile = 'dynamic.json') {
        this._filePath = path.join(__dirname, '../', file);
        this._dynamicPath = path.join(__dirname, '../', dfile);
        this._init_load();
    }

    set_path(file: string = 'config.json', dfile = 'dynamic.json') {
        let tfile = path.join(__dirname, '../', file);
        let tdfile = path.join(__dirname, '../', dfile);
        if (tfile == this._filePath && tdfile == this._dynamicPath) return;

        fs.unwatchFile(this._filePath);
        fs.unwatchFile(this._dynamicPath);

        this._filePath = path.join(__dirname, '../', file);
        this._dynamicPath = path.join(__dirname, '../', dfile);
        this._init_load();
    }

    private _init_load() {
        this._configValue = null;
        this._dynamiValue = null;
        fs.watchFile(this._filePath, this._watchFile.bind(this));
        fs.watchFile(this._dynamicPath, this._watchFile.bind(this));
        this._loadFile();
    }

    private _loadFile() {
        try {
            var jt = fs.readFileSync(this._filePath);
            this._configValue = JSON.parse(jt.toString());
        }
        catch (e) {
        }

        try {
            var jt2 = fs.readFileSync(this._dynamicPath);
            this._dynamiValue = JSON.parse(jt2.toString());
        }
        catch (e) {
        }
    }

    private _watchFile(curr: fs.Stats, prev: fs.Stats) {
        if (prev.ctime.getTime() == 0 && curr.ctime.getTime() != 0) {
            //console.log('文件被创建!');
            this._loadFile();
        } else if (curr.ctime.getTime() == 0) {
            // console.log('文件被删除!');
            // 文件删除了，但是配置先不要响应删除操作了

        } else if (curr.mtime.getTime() != prev.mtime.getTime()) {
            // console.log('文件有修改');
            this._loadFile();
        }
    }


    public registDefault(def: any) {
        this._defaultValue = func_copy(def);
    }

    private _get(srcObj: Object, key: string) {
        var arr = key.split('.');
        var tObj = srcObj;
        for (var i = 0; i < arr.length; i++) {
            if (!tObj) return null;
            tObj = tObj[arr[i]];
        }

        return tObj;
    }

    public get<T>(key: string): T | any {
        this._use_key_log(key);
        // 先找动态的
        // 再找配置的
        // 最后找默认的
        var ret: any = this._get(this._dynamiValue, key);
        if (ret == null) ret = this._get(this._configValue, key);
        if (ret == null) ret = this._get(this._defaultValue, key);
        if (ret == null) ret = 0;
        return ret;
    }

    private _has(srcObj: Object, key: string) {
        var arr = key.split('.');
        var tObj = srcObj;
        for (var i = 0; i < arr.length; i++) {
            if (!tObj || !tObj.hasOwnProperty(arr[i])) return false;
            tObj = tObj[arr[i]];
        }

        return true;
    }

    public has<T>(key: string): T | any {
        this._use_key_log(key);
        // 先找动态的
        // 再找配置的
        // 最后找默认的
        var ret: any = this._has(this._dynamiValue, key);
        if (ret == false) ret = this._has(this._configValue, key);
        if (ret == false) ret = this._has(this._defaultValue, key);
        if (ret == false) ret = false;
        return ret;
    }

    // /**
    //  * 制作json配置用的模板文件，或者说把配置用的js文件转成json文件，主要是json是不能有注释的
    //  */
    // public createTemplateJson() {
    //     // 这里把defalut的生成一个json的就可以了
    //     var jsonFile = JSON.stringify(this._defaultValue, null, 4);
    //     fs.writeFileSync(path.join(__dirname, '../config.templete'), jsonFile);
    // }

    private _collect_mode = false;
    private _key_list_: string[] = [];
    private _use_key_log(key: string) {
        // 这里收集一下所有使用过的key 制作成一个表格
        if (!this._collect_mode) return;
        if (this._key_list_.indexOf(key) < 0) this._key_list_.push(key);
    }

    private _print_list() {
        // 把结果导出成json
        if (!this._collect_mode) return;
        // 有问题先注释掉了
        // var obj = {};
        // for (var i = 0; i < this._key_list_.length; i++) {
        //     var key = this._key_list_[i];
        //     var arr = key.split('.');
        //     var tobj = obj;
        //     for (var i = 0; i < arr.length; i++) {
        //         var sub_key = arr[i];
        //         if (!tobj[sub_key]) {
        //             tobj[sub_key] = {};
        //         }
        //         tobj = tobj[sub_key];
        //     }
        // }

        // var jsonFile = JSON.stringify(obj, null, 4);
        // fs.writeFileSync(path.join(__dirname, '../config2.templete'), jsonFile);
    }
}

export var configInst = new TeConfigMgr();