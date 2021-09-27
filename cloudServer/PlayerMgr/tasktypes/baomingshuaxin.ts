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
        //确定报名种类
        if (task_res.iTab != args[0]){
            continue;
        }
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
        //全部删除
        if(task_info){
            outlist.push({ type: "newrefresh", task: TaskModule.create_task(task_res) });
        }
        else{
            outlist.push({ type: "add", task: TaskModule.create_task(task_res) });
        }
    }

    return outlist;
}

TaskModule.regist_pool(SeEnumTaskiModule.BaoMingShuaXin, refresh);
