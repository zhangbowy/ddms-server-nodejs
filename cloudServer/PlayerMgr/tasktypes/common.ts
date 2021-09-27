import { SeResTaskEx } from "../../ResMgr/SeResMgr";
import { SeTaskItem } from "../SePlayerDef";
import { TaskModule } from "../SeTaskMgr";
import { ReHash } from "../../lib/TeRedis";
import { SePlayer } from "../SePlayer";
//------------------------------实现了一个通用的过程，定制的可以自己实现-----------------------------------//

function refresh_one(taskres: SeResTaskEx, taskinfo: SeTaskItem | undefined) {
    let curr = Date.now();
    if (!taskinfo) {
        // 还没开始的不需要处理
        if (taskres.kStartTime && curr < Date.parse(taskres.kStartTime)) {
            return { type: 'none', task: null }
        }

        // 已经结束的不需要处理
        if (taskres.kEndTime && curr > Date.parse(taskres.kEndTime)) {
            return { type: 'none', task: null }
        }
        return { type: 'add', task: TaskModule.create_task(taskres) }
    }
    else if (taskres.kCheckId != taskinfo.checkId) {
        if (taskinfo.value < taskres.iValue) {
            // 之前没完成的刷新
            return { type: 'refresh', task: TaskModule.create_task(taskres) }
        }
        else {
            // 之前已经完成了的
            return { type: 'newrefresh', task: TaskModule.create_task(taskres) }
        }

    }
    else if (taskres.kEndTime && Date.parse(taskres.kEndTime) < curr) {
        // 说明任务时间已经过了，过期任务就删除掉
        return { type: 'del', task: taskinfo }
    }
    return { type: 'none', task: taskinfo }
}


function refresh(player: SePlayer, db: ReHash<any>, taskres: { [taskid: string]: SeResTaskEx }, taskinfo: { [taskid: string]: SeTaskItem }, ...args: any[]): { type: 'add' | 'refresh' | 'del', task: SeTaskItem }[] {
    let out = [];
    for (let taskid in taskres) {
        let ret = refresh_one(taskres[taskid], taskinfo ? taskinfo[taskid] : null);
        if (ret.type == 'none') continue;
        out.push(ret);
    }

    return out;
}

TaskModule.regist_pool('common', refresh)