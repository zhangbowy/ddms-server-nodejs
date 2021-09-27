import * as fs from 'fs';
import * as path from 'path';
import { HashMap, Handle } from './TeTool';

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
    private _filePath: string = '';
    constructor() {
        this._filePath = path.join(__dirname, '../config.json');
        fs.watchFile(this._filePath, this._watchFile.bind(this));
        this._loadFile(true);
    }


    private _events: HashMap<Function> = new HashMap<Function>();
    public regist_listen_config(confikey: string, caller: any, f_handle: (key: string) => void, ...args) {
        this._events.add(confikey, Handle(caller, f_handle, ...args));
    }

    private _list_events(obj: any) {
        var call_list = [];
        var keys = this._events.keys;
        for (var i = 0; i < keys.length; i++) {
            if (this.get(keys[i]) != this._get_temp(keys[i], obj)) {
                call_list.push(keys[i]);
            }
        }

        this._configValue = obj;

        for (var i = 0; i < call_list.length; i++) {
            var cf_key = call_list[i];
            var fun_list = this._events.get(cf_key);
            for (var j = 0; j < fun_list.length; j++) {
                var f = fun_list[j];
                f && f(cf_key);
            }
        }
    }

    private _loadFile(bInit: boolean = false) {
        try {
            var jt = fs.readFileSync(this._filePath);
            var f_conf = JSON.parse(jt.toString());
            if (bInit) {
                this._configValue = f_conf;
            }
            else {
                // 需要检查一下是否有变动过配置文件或者配置项
                this._list_events(f_conf);
            }
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

    private _getObject(obj: Object, key: string) {

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
        var ret: any = this._get(this._configValue, key);
        if (ret == null) ret = this._get(this._defaultValue, key);
        if (ret == null) ret = 0;
        return ret;
    }

    private _get_temp<T>(key: string, obj: any): T | any {
        var ret: any = this._get(obj, key);
        if (ret == null) ret = this._get(this._defaultValue, key);
        if (ret == null) ret = 0;
        return ret;
    }

    /**
     * 制作json配置用的模板文件，或者说把配置用的js文件转成json文件，主要是json是不能有注释的
     */
    public createTemplateJson() {
        // 这里把defalut的生成一个json的就可以了
        var jsonFile = JSON.stringify(this._defaultValue, null, 4);
        fs.writeFileSync(path.join(__dirname, '../config.templete'), jsonFile);
    }
}

export var configInst = new TeConfigMgr();