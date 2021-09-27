import * as fs from 'fs';
import * as path from "path";

import { TeDate } from '../TeTool';



export enum LogLevel {
    FATAL,
    ERROR,
    WARN,
    INFO,
    DEBUG,
}


export class Logger {
    private static _path: string = null;
    private static _level: LogLevel = LogLevel.INFO;

    static get path() {
        return this._path;
    }

    static init(_path: string, level: LogLevel = LogLevel.INFO) {
        _path && (this._path = _path);
        this._level = level;

        let mode = 511;
        if (_path && !fs.existsSync(_path)) {
            var pathtmp;
            if (_path[0] == '/') pathtmp = '/';
            var dirs = _path.split(path.sep);
            for (var i = 0; i < dirs.length; i++) {
                var dirname = <string>dirs[i];
                if (dirname.length == 0) continue;
                if (pathtmp) {
                    pathtmp = path.join(pathtmp, dirname);
                }
                else {
                    pathtmp = dirname;
                }
                if (!fs.existsSync(pathtmp)) {
                    fs.mkdirSync(pathtmp, mode)
                }
            }
        }
    }


    private static _getprefix(lstr: string) {
        return TeDate.DateToLogStr(new Date()) + '-' + lstr + ' :  ';
    }

    private static _tomessage(message: string, ...optionalParams: any[]): string {
        let msgs: Array<string> = message.split("{}");
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

    static log(level: LogLevel, message: string, ...optionalParams: any[]): void {
        if (level > this._level) return;

        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('LOG') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.log(this._getprefix('LOG') + this._tomessage(message, ...optionalParams));
        }
    }

    static debug(message: string, ...optionalParams: any[]): void {
        if (LogLevel.DEBUG > this._level) return;

        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('DEBUG') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.debug(this._getprefix('DEBUG') + this._tomessage(message, ...optionalParams));
        }
    }

    static info(message: string, ...optionalParams: any[]): void {
        if (LogLevel.INFO > this._level) return;

        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('INFO') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.info(this._getprefix('INFO') + this._tomessage(message, ...optionalParams));
        }
    }

    static warn(message: string, ...optionalParams: any[]): void {
        if (LogLevel.WARN > this._level) return;

        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('WARN') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.warn(this._getprefix('WARN') + this._tomessage(message, ...optionalParams));
        }
    }

    static error(message: string, ...optionalParams: any[]): void {
        if (LogLevel.ERROR > this._level) return;

        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('ERROR') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.error(this._getprefix('ERROR') + this._tomessage(message, ...optionalParams));
        }
    }

    static fatal(message: string, ...optionalParams: any[]): void {
        if (LogLevel.FATAL > this._level) return;

        if (this._path) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('FATAL') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
        else {
            console.error(this._getprefix('FATAL') + this._tomessage(message, ...optionalParams));
        }
    }
}