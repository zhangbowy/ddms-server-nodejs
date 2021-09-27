"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configInst = void 0;
const fs = require("fs");
const path = require("path");
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
    constructor(file = 'config.json', dfile = 'dynamic.json') {
        this._filePath = '';
        this._dynamicPath = '';
        this._key_map = {};
        this._filePath = path.join(__dirname, '../', file);
        this._dynamicPath = path.join(__dirname, '../', dfile);
        this._init_load();
    }
    set_path(file = 'config.json', dfile = 'dynamic.json') {
        let tfile = path.join(__dirname, '../', file);
        let tdfile = path.join(__dirname, '../', dfile);
        if (tfile == this._filePath && tdfile == this._dynamicPath)
            return;
        fs.unwatchFile(this._filePath);
        fs.unwatchFile(this._dynamicPath);
        this._filePath = path.join(__dirname, '../', file);
        this._dynamicPath = path.join(__dirname, '../', dfile);
        this._init_load();
    }
    _init_load() {
        this._configValue = null;
        this._dynamiValue = null;
        fs.watchFile(this._filePath, this._watchFile.bind(this));
        fs.watchFile(this._dynamicPath, this._watchFile.bind(this));
        this._loadFile();
    }
    _loadFile() {
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
    _split(key) {
        if (!this._key_map.hasOwnProperty(key)) {
            this._key_map[key] = key.split('.');
        }
        return this._key_map[key];
    }
    _get(srcObj, key) {
        var arr = this._split(key);
        var tObj = srcObj;
        for (var i = 0; i < arr.length; i++) {
            if (!tObj)
                return null;
            tObj = tObj[arr[i]];
        }
        return tObj;
    }
    get(key) {
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
    _has(srcObj, key) {
        var arr = this._split(key);
        var tObj = srcObj;
        for (var i = 0; i < arr.length; i++) {
            if (!tObj || !tObj.hasOwnProperty(arr[i]))
                return false;
            tObj = tObj[arr[i]];
        }
        return true;
    }
    has(key) {
        // 先找动态的
        // 再找配置的
        // 最后找默认的
        var ret = this._has(this._dynamiValue, key);
        if (ret == false)
            ret = this._has(this._configValue, key);
        if (ret == false)
            ret = this._has(this._defaultValue, key);
        if (ret == false)
            ret = false;
        return ret;
    }
}
exports.configInst = new TeConfigMgr();
//# sourceMappingURL=TeConfig.js.map