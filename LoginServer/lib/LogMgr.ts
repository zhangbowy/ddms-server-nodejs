import { writeFileSync } from "fs";
import { TeDate, TeMap } from './TeTool';
import { configInst } from "./TeConfig";

console.error(new Date());
console.log(new Date());

var nomal_log = console.log;
var nomal_error = console.error;


export class LogMgr {

    static lastErrorCache: TeMap<string> = new TeMap<string>();
    static lastOutCache: TeMap<string> = new TeMap<string>();

    static log_file(_moudle: string, ...info: string[]) {
        if (!configInst.get('debuglog')) return;
        var outInfo;
        if (info instanceof Array) {
            outInfo = info.join(',');
        }
        else {
            outInfo = info;
        }

        writeFileSync(_moudle + '.log', 'Date:' + TeDate.DateToStr(Date.now()) + ',' + outInfo + '\n', { flag: "a+" });
    }

    static log(mod: string): (...a) => void {
        return function (...args) {
            let lstr = [new Date].concat(args);
            nomal_log(mod, ...lstr);
            LogMgr.lastOutCache.set(mod, lstr.toString());
        }
    }

    static error(mod: string): (...a) => void {
        return function (...args) {
            let lstr = [new Date].concat(args);
            nomal_error(mod, ...lstr);
            LogMgr.lastErrorCache.set(mod, lstr.toString());
        }
    }
}

console.log = LogMgr.log('Normal');
console.error = LogMgr.error('Normal');;

