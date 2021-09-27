"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeLog = exports.LogLevel = void 0;
const fs = require("fs");
const path = require("path");
const TeTool_1 = require("./TeTool");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["FATAL"] = 0] = "FATAL";
    LogLevel[LogLevel["ERROR"] = 1] = "ERROR";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["INFO"] = 3] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 4] = "DEBUG";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
class TeLog {
    static get path() {
        return this._path;
    }
    static init(path, level) {
        this._path = path;
        this._level = level;
    }
    static _getprefix(lstr) {
        return TeTool_1.TeDate.DateToLogStr(new Date()) + '-' + lstr + ' :  ';
    }
    static log(level, message, ...optionalParams) {
        if (level > this._level)
            return;
        console.log(this._getprefix('LOG') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('LOG') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
    }
    static debug(message, ...optionalParams) {
        if (LogLevel.DEBUG > this._level)
            return;
        console.debug(this._getprefix('DEBUG') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('DEBUG') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
    }
    static info(message, ...optionalParams) {
        if (LogLevel.INFO > this._level)
            return;
        console.info(this._getprefix('INFO') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('INFO') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
    }
    static warn(message, ...optionalParams) {
        if (LogLevel.WARN > this._level)
            return;
        console.warn(this._getprefix('WARN') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('WARN') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
    }
    static error(message, ...optionalParams) {
        if (LogLevel.ERROR > this._level)
            return;
        console.error(this._getprefix('ERROR') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('ERROR') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
    }
    static fatal(message, ...optionalParams) {
        if (LogLevel.FATAL > this._level)
            return;
        console.error(this._getprefix('FATAL') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('FATAL') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
    }
}
exports.TeLog = TeLog;
TeLog._path = './logs/';
TeLog._level = LogLevel.INFO;
//# sourceMappingURL=TeLog.js.map