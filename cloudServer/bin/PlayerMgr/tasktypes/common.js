"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SeTaskMgr_1 = require("../SeTaskMgr");
//------------------------------实现了一个通用的过程，定制的可以自己实现-----------------------------------//
function refresh_one(taskres, taskinfo) {
    let curr = Date.now();
    if (!taskinfo) {
        // 还没开始的不需要处理
        if (taskres.kStartTime && curr < Date.parse(taskres.kStartTime)) {
            return { type: 'none', task: null };
        }
        // 已经结束的不需要处理
        if (taskres.kEndTime && curr > Date.parse(taskres.kEndTime)) {
            return { type: 'none', task: null };
        }
        return { type: 'add', task: SeTaskMgr_1.TaskModule.create_task(taskres) };
    }
    else if (taskres.kCheckId != taskinfo.checkId) {
        if (taskinfo.value < taskres.iValue) {
            // 之前没完成的刷新
            return { type: 'refresh', task: SeTaskMgr_1.TaskModule.create_task(taskres) };
        }
        else {
            // 之前已经完成了的
            return { type: 'newrefresh', task: SeTaskMgr_1.TaskModule.create_task(taskres) };
        }
    }
    else if (taskres.kEndTime && Date.parse(taskres.kEndTime) < curr) {
        // 说明任务时间已经过了，过期任务就删除掉
        return { type: 'del', task: taskinfo };
    }
    return { type: 'none', task: taskinfo };
}
function refresh(player, db, taskres, taskinfo, ...args) {
    let out = [];
    for (let taskid in taskres) {
        let ret = refresh_one(taskres[taskid], taskinfo ? taskinfo[taskid] : null);
        if (ret.type == 'none')
            continue;
        out.push(ret);
    }
    return out;
}
SeTaskMgr_1.TaskModule.regist_pool('common', refresh);
//# sourceMappingURL=common.js.map