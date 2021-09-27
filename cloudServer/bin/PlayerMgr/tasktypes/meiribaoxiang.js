"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SeTaskMgr_1 = require("../SeTaskMgr");
const interface_1 = require("../../Res/interface");
function refresh(player, db, taskres, taskinfo, ...args) {
    let outlist = [];
    if (player.dailyInfo.meiribaoxia > 0) {
        let isHave = false;
        let out_map = {};
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
                            out_map[task_res.kTaskID] = { type: 'refresh', task: SeTaskMgr_1.TaskModule.create_task(task_res) };
                        }
                        else {
                            out_map[task_res.kTaskID] = { type: 'newrefresh', task: SeTaskMgr_1.TaskModule.create_task(task_res) };
                        }
                    }
                    else {
                        out_map[task_res.kTaskID] = { type: 'add', task: SeTaskMgr_1.TaskModule.create_task(task_res) };
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
SeTaskMgr_1.TaskModule.regist_pool(interface_1.SeEnumTaskiModule.MeiRiBaoXia, refresh);
//# sourceMappingURL=meiribaoxiang.js.map