"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configInst = void 0;
const fs = require("fs");
const path = require("path");
const TeTool_1 = require("./TeTool");
function func_copy(obj, bFunc = false, dValue) {
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
    constructor() {
        this._filePath = '';
        this._dynamicPath = '';
        this._events = new TeTool_1.HashMap();
        this._collect_mode = false;
        this._key_list_ = [];
        this._filePath = path.join(__dirname, '../config.json');
        this._dynamicPath = path.join(__dirname, '../dynamic.json');
        fs.watchFile(this._filePath, this._watchFile.bind(this));
        fs.watchFile(this._dynamicPath, this._watchFile.bind(this));
        this._loadFile(true);
    }
    regist_listen_config(confikey, caller, f_handle, ...args) {
        this._events.add(confikey, TeTool_1.Handle(caller, f_handle, ...args));
    }
    _list_events(obj) {
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
    _loadFile(bInit = false) {
        try {
            var jt = fs.readFileSync(this._filePath);
            var f_conf = JSON.parse(jt.toString());
            if (!bInit) {
                // 需要检查一下是否有变动过配置文件或者配置项
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
                // 需要检查一下是否有变动过配置文件或者配置项
                this._list_events(f_conf2);
            }
            this._dynamiValue = f_conf2;
        }
        catch (e) {
        }
    }
    _watchFile(curr, prev) {
        if (prev.ctime.getTime() == 0 && curr.ctime.getTime() != 0) {
            //console.log('文件被创建!');
            this._loadFile();
        }
        else if (curr.ctime.getTime() == 0) {
            // console.log('文件被删除!');
            // 文件删除了，但是配置先不要响应删除操作了
        }
        else if (curr.mtime.getTime() != prev.mtime.getTime()) {
            // console.log('文件有修改');
            this._loadFile();
        }
    }
    registDefault(def) {
        this._defaultValue = func_copy(def);
    }
    _get(srcObj, key) {
        var arr = key.split('.');
        var tObj = srcObj;
        for (var i = 0; i < arr.length; i++) {
            if (!tObj)
                return null;
            tObj = tObj[arr[i]];
        }
        return tObj;
    }
    _get_temp(key, obj) {
        var ret = this._get(obj, key);
        if (ret == null)
            ret = this._get(this._defaultValue, key);
        if (ret == null)
            ret = 0;
        return ret;
    }
    get(key) {
        this._use_key_log(key);
        // 先找动态的
        // 再找配置的
        // 最后找默认的
        var ret = this._get(this._dynamiValue, key);
        if (ret == null)
            ret = this._get(this._configValue, key);
        if (ret == null)
            ret = this._get(this._defaultValue, key);
        if (ret == null)
            ret = 0;
        return ret;
    }
    /**
     * 制作json配置用的模板文件，或者说把配置用的js文件转成json文件，主要是json是不能有注释的
     */
    createTemplateJson() {
        // 这里把defalut的生成一个json的就可以了
        var jsonFile = JSON.stringify(this._defaultValue, null, 4);
        fs.writeFileSync(path.join(__dirname, '../config.templete'), jsonFile);
    }
    _use_key_log(key) {
        // 这里收集一下所有使用过的key 制作成一个表格
        if (!this._collect_mode)
            return;
        if (this._key_list_.indexOf(key) < 0)
            this._key_list_.push(key);
    }
    _print_list() {
        // 把结果导出成json
        if (!this._collect_mode)
            return;
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
exports.configInst = new TeConfigMgr();
//# sourceMappingURL=TeConfig.js.map