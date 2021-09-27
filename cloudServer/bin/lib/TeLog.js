"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
const fs = require("fs");
const path = require("path");
const TeTool_1 = require("../TeTool");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["FATAL"] = 0] = "FATAL";
    LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["INFO"] = 3] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 4] = "DEBUG";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
class Logger {
    static get path() {
        return this._path;
    }
    static init(_path, level = LogLevel.INFO) {
        _path && (this._path = _path);
        this._level = level;
        let mode = 511;
        if (_path && !fs.existsSync(_path)) {
            var pathtmp;
            if (_path[0] == '/')
                pathtmp = '/';
            var dirs = _path.split(path.sep);
            for (var i = 0; i < dirs.length; i++) {
                var dirname = dirs[i];
                if (dirname.length == 0)
                    continue;
                if (pathtmp) {
                    pathtmp = path.join(pathtmp, dirname);
                }
                else {
                    pathtmp = dirname;
                }
                if (!fs.existsSync(pathtmp)) {
                    fs.mkdirSync(pathtmp, mode);
                }
            }
        }
    }
    static _getprefix(lstr) {
        return TeTool_1.TeDate.DateToLogStr(new Date()) + '-' + lstr + ' :  ';
    }
    static _tomessage(message, ...optionalParams) {
        let msgs = message.split("{}");
        let msg = "";
        let i = 0;
        for (i = 0; i < msgs.length; i++) {
            if (!optionalParams[i]) {
                break;
            }
            let _msg = optionalParams[i];
            if (_msg instanceof Object) {
                _msg = JSON.stringify(_msg);
            }
            msg += msgs[i] + _msg;
        }
        for (; i < msgs.length; i++) {
            msg += msgs[i];
        }
        return msg;
    }
    static log(level, message, ...optionalParams) {
        if (level > this._level)
            return;
        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('LOG') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.log(this._getprefix('LOG') + this._tomessage(message, ...optionalParams));
        }
    }
    static debug(message, ...optionalParams) {
        if (LogLevel.DEBUG > this._level)
            return;
        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('DEBUG') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.debug(this._getprefix('DEBUG') + this._tomessage(message, ...optionalParams));
        }
    }
    static info(message, ...optionalParams) {
        if (LogLevel.INFO > this._level)
            return;
        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('INFO') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.info(this._getprefix('INFO') + this._tomessage(message, ...optionalParams));
        }
    }
    static warn(message, ...optionalParams) {
        if (LogLevel.WARN > this._level)
            return;
        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('WARN') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.warn(this._getprefix('WARN') + this._tomessage(message, ...optionalParams));
        }
    }
    static error(message, ...optionalParams) {
        if (LogLevel.ERROR > this._level)
            return;
        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('ERROR') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.error(this._getprefix('ERROR') + this._tomessage(message, ...optionalParams));
        }
    }
    static fatal(message, ...optionalParams) {
        if (LogLevel.FATAL > this._level)
            return;
        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('FATAL') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.error(this._getprefix('FATAL') + this._tomessage(message, ...optionalParams));
        }
    }
}
exports.Logger = Logger;
Logger._path = null;
Logger._level = LogLevel.INFO;
//# sourceMappingURL=TeLog.js.map