"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TeTool_1 = require("../../TeTool");
const SeTaskMgr_1 = require("../SeTaskMgr");
const interface_1 = require("../../Res/interface");
function refresh(player, db, taskres, taskinfo, ...args) {
    let outlist = [];
    let curr = Date.now();
    for (let key in taskres) {
        let task_res = taskres[key];
        let task_info = taskinfo[key];
        // 任务没开始不处理
        if (taskres.kStartTime && curr < Date.parse(task_res.kStartTime)) {
            if (task_info)
                outlist.push({ type: "del", task: task_info });
            continue;
        }
        // 已经结束的不需要处理
        if (taskres.kEndTime && curr > Date.parse(task_res.kEndTime)) {
            if (task_info)
                outlist.push({ type: "del", task: task_info });
            continue;
        }
        if (!task_info || TeTool_1.TeDate.isdiffday(task_info.time, curr)) {
            // 任务不存在就添加，任务过时间了就刷新
            if (task_info) {
                if (task_info.value < task_res.iValue) {
                    outlist.push({ type: "refresh", task: SeTaskMgr_1.TaskModule.create_task(task_res) });
                }
                else {
                    outlist.push({ type: "newrefresh", task: SeTaskMgr_1.TaskModule.create_task(task_res) });
                }
            }
            else {
                outlist.push({ type: "add", task: SeTaskMgr_1.TaskModule.create_task(task_res) });
            }
        }
    }
    return outlist;
}
SeTaskMgr_1.TaskModule.regist_pool(interface_1.SeEnumTaskiModule.MeiRiShuaXin, refresh);
//# sourceMappingURL=meirishuaxin.js.map