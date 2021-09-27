import { SePlayer } from "../SePlayer";

import { ReHash } from "../../lib/TeRedis";

import { SeResTaskEx } from "../../ResMgr/SeResMgr";

import { SeTaskItem } from "../SePlayerDef";
import { TeDate } from "../../TeTool";
import { TaskModule } from "../SeTaskMgr";
import { SeEnumTaskiModule } from "../../Res/interface";

function refresh(player: SePlayer, db: ReHash<any>, taskres: { [taskid: string]: SeResTaskEx }, taskinfo: { [taskid: string]: SeTaskItem }, ...args: any[]) {
    let outlist = [];
    let curr = Date.now();
    for (let key in taskres) {
        let task_res = taskres[key];
        let task_info = taskinfo[key];

        // 任务没开始不处理
        if (taskres.kStartTime && curr < Date.parse(task_res.kStartTime)) {
            if (task_info) outlist.push({ type: "del", task: task_info });
            continue;
        }

        // 已经结束的不需要处理
        if (taskres.kEndTime && curr > Date.parse(task_res.kEndTime)) {
            if (task_info) outlist.push({ type: "del", task: task_info });
            continue;
        }

        if (!task_info || TeDate.isdiffday(task_info.time, curr)) {
            // 任务不存在就添加，任务过时间了就刷新
            if (task_info) {
                if (task_info.value < task_res.iValue) {
                    outlist.push({ type: "refresh", task: TaskModule.create_task(task_res) })
                }
                else {
                    outlist.push({ type: "newrefresh", task: TaskModule.create_task(task_res) })
                }
            }
            else {
                outlist.push({ type: "add", task: TaskModule.create_task(task_res) })
            }
        }
    }

    return outlist;
}

TaskModule.regist_pool(SeEnumTaskiModule.MeiRiShuaXin, refresh);
