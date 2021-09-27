import { SePlayer } from "../SePlayer";

import { ReHash } from "../../lib/TeRedis";

import { SeResTaskEx } from "../../ResMgr/SeResMgr";

import { SeTaskItem } from "../SePlayerDef";
import { TaskModule } from "../SeTaskMgr";
import { SeEnumTaskiModule } from "../../Res/interface";

function refresh(player: SePlayer, db: ReHash<any>, taskres: { [taskid: string]: SeResTaskEx }, taskinfo: { [taskid: string]: SeTaskItem }, ...args: any[]) {
    let outlist = [];
    if (player.dailyInfo.meiribaoxia > 0) {
        let isHave = false;
        let out_map: { [taskid: string]: { type: 'add' | 'refresh' | 'newrefresh' | 'del', task: SeTaskItem } } = {};
        // 领取奖励了的才算完成，否则就继续着
        for (let key in taskinfo) {
            let taskitem = taskinfo[key];
            if (taskitem.isGet) {
                out_map[taskitem.kId] = { type: 'del', task: taskitem };
            }
            else {
                isHave = true;
            }
        }

        if (!isHave) {
            let tot_rate = 0;
            for (let key in taskres) {
                let task_res = taskres[key];
                tot_rate += task_res.iRate || 0;
            }

            let random = Math.floor(Math.random() * tot_rate);
            for (let key in taskres) {
                let task_res = taskres[key];
                if (task_res.iRate >= random) {
                    if (out_map.hasOwnProperty(task_res.kTaskID)) {
                        let oldInfo = out_map[task_res.kTaskID];
                        if (oldInfo.task.value < task_res.iValue) {
                            out_map[task_res.kTaskID] = { type: 'refresh', task: TaskModule.create_task(task_res) }
                        }
                        else {
                            out_map[task_res.kTaskID] = { type: 'newrefresh', task: TaskModule.create_task(task_res) }
                        }
                    }
                    else {
                        out_map[task_res.kTaskID] = { type: 'add', task: TaskModule.create_task(task_res) }
                    }
                    // out_map[task_res.kTaskID] = { type: out_map[task_res.kTaskID] ? "refresh" : "add", task: TaskModule.create_task(task_res) };
                    player.dailyInfo.meiribaoxia--;
                    player.updateDailyInfo();
                    break;
                }
                else {
                    random -= task_res.iRate;
                }
            }
        }

        // 最后把map转换成list

        for (let key in out_map) {
            outlist.push(out_map[key]);
        }
    }

    return outlist;
}

TaskModule.regist_pool(SeEnumTaskiModule.MeiRiBaoXia, refresh);