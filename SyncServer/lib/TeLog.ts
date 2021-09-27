import * as fs from 'fs';
import * as path from "path";

import { TeDate } from './TeTool';



export enum LogLevel {
    FATAL,
    ERROR,
    WARN,
    INFO,
    DEBUG,
}


export class TeLog {
    private static _path: string = './logs/';
    private static _level: LogLevel = LogLevel.INFO;

    static get path() {
        return this._path;
    }

    static init(path: string, level: LogLevel) {
        this._path = path;
        this._level = level;
    }


    private static _getprefix(lstr: string) {
        return TeDate.DateToLogStr(new Date()) + '-' + lstr + ' :  ';
    }

    static log(level: LogLevel, message?: any, ...optionalParams: any[]): void {
        if (level > this._level) return;
        
        console.log(this._getprefix('LOG') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('LOG') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }
    }

    static debug(message?: any, ...optionalParams: any[]): void {
        if (LogLevel.DEBUG > this._level) return;
        
        console.debug(this._getprefix('DEBUG') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('DEBUG') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }        
    }

    static info(message?: any, ...optionalParams: any[]): void {
        if (LogLevel.INFO > this._level) return;
        
        console.info(this._getprefix('INFO') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('INFO') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }        
    }
    
    static warn(message?: any, ...optionalParams: any[]): void {
        if (LogLevel.WARN > this._level) return;
        
        console.warn(this._getprefix('WARN') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('WARN') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }        
    }

    static error(message?: any, ...optionalParams: any[]): void {
        if (LogLevel.ERROR > this._level) return;
        
        console.error(this._getprefix('ERROR') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('ERROR') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }        
    }

    static fatal(message?: any, ...optionalParams: any[]): void {
        if (LogLevel.FATAL > this._level) return;
        
        console.error(this._getprefix('FATAL') + message);
        if (message) {
            fs.writeFile(path.join(this._path, 'runtime.log'), this._getprefix('FATAL') + JSON.stringify(message) + '\n', { flag: 'a+' }, () => { });
        }        
    }
}