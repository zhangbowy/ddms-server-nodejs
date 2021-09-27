import { SePlayer } from "../SePlayer";
import { ReHash } from "../../lib/TeRedis";
import { SeResTaskEx } from "../../ResMgr/SeResMgr";
import { SeTaskItem } from "../SePlayerDef";
import { TaskModule } from "../SeTaskMgr";
import { SeEnumTaskiModule } from "../../Res/interface";


function refresh(player: SePlayer, db: ReHash<any>, taskres: { [taskid: string]: SeResTaskEx }, taskinfo: { [taskid: string]: SeTaskItem }, ...args: any[]) {
    // 更新玩家的积分箱子
    // 首先保证任务玩家只有一个
    let isHave = false;
    let out_map: { [taskid: string]: { type: 'add' | 'refresh' | 'del', task: SeTaskItem } } = {};
    for (let key in taskinfo) {
        let taskItem = taskinfo[key];
        if (taskItem.isGet || isHave) {
            // 数量超了，那么就要抛弃掉一些，暂时就保留第一个吧
            out_map[taskItem.kId] = { type: 'del', task: taskItem };
        }
        else {
            isHave = true;
        }
    }

    if (!isHave) {
        // 随机一个出来
        let tot_rate = 0;
        for (let key in taskres) {
            let task_res = taskres[key];
            tot_rate += task_res.iRate || 0;
        }

        let random = Math.floor(Math.random() * tot_rate);
        for (let key in taskres) {
            let task_res = taskres[key];
            if (task_res.iRate >= random) {
                let taskInfo = TaskModule.create_task(task_res);
                taskInfo.value = parseInt(args[0] || 0);
                if (isNaN(taskInfo.value)) taskInfo.value = 0;
                out_map[task_res.kTaskID] = { type: out_map[task_res.kTaskID] ? "refresh" : "add", task: taskInfo };
                break;
            }
            else {
                random -= task_res.iRate;
            }
        }
    }

    // 最后把map转换成list
    let outlist = [];
    for (let key in out_map) {
        outlist.push(out_map[key]);
    }

    return outlist;
}

TaskModule.regist_pool(SeEnumTaskiModule.JiFenXiangZi, refresh);