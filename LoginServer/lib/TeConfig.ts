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
    private _dynamiValue: Object;

    private _filePath: string = '';
    private _dynamicPath: string = '';
    constructor() {
        this._filePath = path.join(__dirname, '../config.json');
        this._dynamicPath = path.join(__dirname, '../dynamic.json');
        fs.watchFile(this._filePath, this._watchFile.bind(this));
        fs.watchFile(this._dynamicPath, this._watchFile.bind(this));
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
            if (!bInit) {
                // ???????????????????????????????????????????????????????????????
                this._list_events(f_conf);
            }
            this._configValue = f_conf;
        }
        catch (e) {
        }

        try {
            var jt2 = fs.readFileSync(this._dynamicPath);
            var f_conf2 = JSON.parse(jt2.toString());
            if (!bInit) {
                // ???????????????????????????????????????????????????????????????
                this._list_events(f_conf2);
            }
            this._dynamiValue = f_conf2;
        }
        catch (e) {
        }
    }

    private _watchFile(curr: fs.Stats, prev: fs.Stats) {
        if (prev.ctime.getTime() == 0 && curr.ctime.getTime() != 0) {
            //console.log('???????????????!');
            this._loadFile();
        } else if (curr.ctime.getTime() == 0) {
            // console.log('???????????????!');
            // ????????????????????????????????????????????????????????????

        } else if (curr.mtime.getTime() != prev.mtime.getTime()) {
            // console.log('???????????????');
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


    private _get_temp<T>(key: string, obj: any): T | any {
        var ret: any = this._get(obj, key);
        if (ret == null) ret = this._get(this._defaultValue, key);
        if (ret == null) ret = 0;
        return ret;
    }

    public get<T>(key: string): T {
        this._use_key_log(key);
        // ???????????????
        // ???????????????
        // ??????????????????
        var ret: any = this._get(this._dynamiValue, key);
        if (ret == null) ret = this._get(this._configValue, key);
        if (ret == null) ret = this._get(this._defaultValue, key);
        if (ret == null) ret = 0;
        return ret;
    }

    /**
     * ??????json???????????????????????????????????????????????????js????????????json??????????????????json?????????????????????
     */
    public createTemplateJson() {
        // ?????????defalut???????????????json???????????????
        var jsonFile = JSON.stringify(this._defaultValue, null, 4);
        fs.writeFileSync(path.join(__dirname, '../config.templete'), jsonFile);
    }

    private _collect_mode = false;
    private _key_list_: string[] = [];
    private _use_key_log(key: string) {
        // ????????????????????????????????????key ?????????????????????
        if (!this._collect_mode) return;
        if (this._key_list_.indexOf(key) < 0) this._key_list_.push(key);
    }

    private _print_list() {
        // ??????????????????json
        if (!this._collect_mode) return;
        // ????????????????????????
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