"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogMgr = void 0;
const fs_1 = require("fs");
const TeTool_1 = require("./TeTool");
const TeConfig_1 = require("./TeConfig");
console.error(new Date());
console.log(new Date());
var nomal_log = console.log;
var nomal_error = console.error;
class LogMgr {
    static log_file(_moudle, ...info) {
        if (!TeConfig_1.configInst.get('debuglog'))
            return;
        var outInfo;
        if (info instanceof Array) {
            outInfo = info.join(',');
        }
        else {
            outInfo = info;
        }
        fs_1.writeFileSync(_moudle + '.log', 'Date:' + TeTool_1.TeDate.DateToStr(Date.now()) + ',' + outInfo + '\n', { flag: "a+" });
    }
    static log(mod) {
        return function (...args) {
            let lstr = [new Date].concat(args);
            nomal_log(mod, ...lstr);
            LogMgr.lastOutCache.set(mod, lstr.toString());
        };
    }
    static error(mod) {
        return function (...args) {
            let lstr = [new Date].concat(args);
            nomal_error(mod, ...lstr);
            LogMgr.lastErrorCache.set(mod, lstr.toString());
        };
    }
}
exports.LogMgr = LogMgr;
LogMgr.lastErrorCache = new TeTool_1.TeMap();
LogMgr.lastOutCache = new TeTool_1.TeMap();
console.log = LogMgr.log('Normal');
console.error = LogMgr.error('Normal');
;
//# sourceMappingURL=LogMgr.js.map