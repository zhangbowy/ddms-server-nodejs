import { writeFile } from "fs";
import { existsSync } from "fs";
import { sep } from "path";
import { join } from "path";
import { mkdirSync } from "fs";
import { TeDate } from "../lib/TeTool";
interface TeLog {
    logtype: string;
    type?: number;
    info?: any;
    createtime?: number;
}

export class TeLogMgr {
    private m_kPath: string;
    constructor(path?: string) {
        if (path) this.init_path(path);
    }

    public init_path(path?: string) {
        this.m_kPath = path || "./";
        this.mkdirsSync(this.m_kPath, 511);
    }

    public mkdirsSync(dirpath, mode) {
        if (!existsSync(dirpath)) {
            var pathtmp;
            var dirs = dirpath.split(sep);
            for (var i = 0; i < dirs.length; i++) {
                var dirname = dirs[i];
                if (pathtmp) {
                    pathtmp = join(pathtmp, dirname);
                }
                else {
                    pathtmp = dirname;
                }
                if (!existsSync(pathtmp)) {
                    mkdirSync(pathtmp, mode)
                }
            }
        }
        return true;
    }

    public log(message?: any, ...optionalParams: any[]): void {
        console.log(message);
        if (message) {
            writeFile(join(this.m_kPath, 'runtime.log'), JSON.stringify(message) + '\n', { flag: 'a+' }, () => {

            });
        }
    }

    public chartlog(opt: string, type: number, info) {
        writeFile(join(this.m_kPath, 'chart_' + type + '_' + TeDate.DateToLogStr(Date.now())), JSON.stringify(info) + ',', { flag: 'a+' }, () => {

        });
    }

    // 这里导出日志
    private addLog(rkLog: TeLog) {
        rkLog.createtime = Date.now();
        writeFile(join(this.m_kPath, rkLog.logtype), JSON.stringify(rkLog) + ',', { flag: 'a+' }, () => {

        });
    }
}

export var logInst = new TeLogMgr();