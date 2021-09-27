"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SeTaskMgr_1 = require("../SeTaskMgr");
const interface_1 = require("../../Res/interface");
function refresh(player, db, taskres, taskinfo, ...args) {
    let out_map = {};
    let outlist = [];
    if (args[0] == null || args[0] == undefined)
        return outlist;
    //删除旧的回归任务
    for (let key in taskinfo) {
        out_map[taskinfo[key].kId] = { type: "del", task: taskinfo[key] };
    }
    //获取充值金额对应任务
    let tmp = 0;
    let task;
    for (var key in taskres) {
        if (taskres[key].iTab == interface_1.SeEnumTaskiTab.LaoWanJiaDengLuJiangLi) {
            if (taskres[key].iValue >= tmp && args[0] >= taskres[key].iValue) {
                tmp = taskres[key].iValue;
                task = taskres[key];
            }
        }
        else {
            out_map = push_task(out_map, taskres[key]);
        }
    }
    if (task)
        out_map = push_task(out_map, task);
    // 最后把map转换成list
    for (let key in out_map) {
        outlist.push(out_map[key]);
    }
    return outlist;
}
function push_task(out_map, res) {
    if (out_map.hasOwnProperty(res.kTaskID)) {
        let oldInfo = out_map[res.kTaskID];
        if (oldInfo.task.value < res.iValue) {
            out_map[res.kTaskID] = { type: 'refresh', task: SeTaskMgr_1.TaskModule.create_task(res) };
        }
        else {
            out_map[res.kTaskID] = { type: 'newrefresh', task: SeTaskMgr_1.TaskModule.create_task(res) };
        }
    }
    else {
        out_map[res.kTaskID] = { type: 'add', task: SeTaskMgr_1.TaskModule.create_task(res) };
    }
    return out_map;
}
SeTaskMgr_1.TaskModule.regist_pool(interface_1.SeEnumTaskiModule.HuiGuiShuaXin, refresh);
//# sourceMappingURL=huiguishuaxin.js.map