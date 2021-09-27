import { TeMap } from "../lib/TeTool";
import { netInst } from "./SeNetMgr";
import { func_copy } from "../SeDefine";
import { raceMgrInst } from "../RaceMgr/RaceMgr";

class MonitorUnit {
    constructor(n, na) {
        this.nid = n;
        this.name = na;
    }
    nid: string;
    name: string;
}

class MonitorMgr {
    monitors: TeMap<MonitorUnit> = new TeMap<MonitorUnit>()

    addMonitor(nid: string, name: string) {
        this.monitors.set(nid, new MonitorUnit(nid, name));
    }

    clearMonitor(nid) {
        this.monitors.del(nid);
    }

    noticeToMonitors(cmd: string, info: any) {
        let keys = this.monitors.keys;
        for (let i = 0; i < keys.length; i++) {
            netInst.sendData({
                cmd: cmd,
                info: func_copy(info)
            }, keys[i]);
        }
    }

    process_data(nid, data: { type: string, info: any }) {
        switch (data.type) {
            case 'regiest':
                let succ = false;
                if (!data.info || data.info.pwd != 'race_monitor') {
                    succ = false;
                }
                else {
                    succ = true;
                    this.addMonitor(nid, data.info.name);
                    netInst.delCheckLink(nid);
                }

                netInst.sendData({
                    cmd: 'regiestret',
                    info: succ
                }, nid);
                break;
            case 'racecount': {
                netInst.sendData({
                    cmd: 'racecount',
                    info: raceMgrInst.race_count
                }, nid);
                break;
            }
            case 'memory': {
                netInst.sendData({
                    cmd: 'memory',
                    info: process.memoryUsage()
                }, nid);
                break;
            }
        }
    }
}

export var netMonitorInst = new MonitorMgr(); 