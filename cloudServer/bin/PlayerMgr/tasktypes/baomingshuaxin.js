"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SeTaskMgr_1 = require("../SeTaskMgr");
const interface_1 = require("../../Res/interface");
function refresh(player, db, taskres, taskinfo, ...args) {
    let outlist = [];
    let curr = Date.now();
    for (let key in taskres) {
        let task_res = taskres[key];
        //确定报名种类
        if (task_res.iTab != args[0]) {
            continue;
        }
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
        //全部删除
        if (task_info) {
            outlist.push({ type: "newrefresh", task: SeTaskMgr_1.TaskModule.create_task(task_res) });
        }
        else {
            outlist.push({ type: "add", task: SeTaskMgr_1.TaskModule.create_task(task_res) });
        }
    }
    return outlist;
}
SeTaskMgr_1.TaskModule.regist_pool(interface_1.SeEnumTaskiModule.BaoMingShuaXin, refresh);
//# sourceMappingURL=baomingshuaxin.js.map