import { SeResTaskEx } from "../../ResMgr/SeResMgr";

import { SeTaskItem } from "../SePlayerDef";
import { ReHash } from "../../lib/TeRedis";
import { TaskModule } from "../SeTaskMgr";
import { SePlayer } from "../SePlayer";
import { SeEnumTaskiModule, SeEnumTaskiTab } from "../../Res/interface";
import { iApp } from "../../app";
declare var global: iApp;
function refresh(player: SePlayer, db: ReHash<any>, taskres: { [taskid: string]: SeResTaskEx }, taskinfo: { [taskid: string]: SeTaskItem }, ...args: any[]) {
    let out_map: { [taskid: string]: { type: 'add' | 'refresh' | 'newrefresh' | 'del', task: SeTaskItem } } = {};
    let outlist = [];
    if (args[0] == null || args[0] == undefined) return outlist;
    //删除旧的回归任务
    for (let key in taskinfo) {
        out_map[taskinfo[key].kId] = { type: "del", task: taskinfo[key] };
    }
    //获取充值金额对应任务
    let tmp = 0;
    let task;
    for(var key in taskres){
        if(taskres[key].iTab == SeEnumTaskiTab.LaoWanJiaDengLuJiangLi){
            if(taskres[key].iValue >= tmp && args[0] >= taskres[key].iValue){
                tmp = taskres[key].iValue;
                task = taskres[key];
            }
        }
        else{
            out_map = push_task(out_map, taskres[key]);
        }
    }
    if(task)  out_map = push_task(out_map, task);
  
    // 最后把map转换成list
    for (let key in out_map) {
        outlist.push(out_map[key]);
    }

    return outlist;
}

function push_task(out_map: any, res: SeResTaskEx) {
    if (out_map.hasOwnProperty(res.kTaskID)) {
        let oldInfo = out_map[res.kTaskID];
        if (oldInfo.task.value < res.iValue) {
            out_map[res.kTaskID] = { type: 'refresh', task: TaskModule.create_task(res) }
        }
        else {
            out_map[res.kTaskID] = { type: 'newrefresh', task: TaskModule.create_task(res) }
        }
    }
    else {
        out_map[res.kTaskID] = { type: 'add', task: TaskModule.create_task(res) }
    }

    return out_map;
}

TaskModule.regist_pool(SeEnumTaskiModule.HuiGuiShuaXin, refresh);