"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const SeTaskMgr_1 = require("../SeTaskMgr");
const interface_1 = require("../../Res/interface");
function refresh(player, db, taskres, taskinfo, ...args) {
    let out_map = {};
    let random_pool_rates = {};
    let random_pool_ids = {};
    if (!args[0]) {
        let curr = Date.now();
        let preUpdateTime = db.get("preUpdateTime") || 0;
        if (curr - preUpdateTime > 24 * 3600 * 1000) {
            // 首先老的任务都是不要了的
            for (let key in taskinfo) {
                out_map[taskinfo[key].kId] = { type: "del", task: taskinfo[key] };
            }
            // 然后随机新的任务出来 任务分成好几个组
            for (let key in taskres) {
                let r = taskres[key];
                //同盟的判定是否在同盟任务列表里
                if (r.iTab == interface_1.SeEnumTaskiTab.MengJunTongMengRenWu && player.dailyInfo.guild_task_id.indexOf(r.kTaskID) == -1)
                    continue;
                // 找到可以完成的 然后适合当前段位的任务来随机
                if (player.m_taskMgr._checkTaskCanComplete(r) && (!r.iLevel || r.iLevel == player.level) && (!r.iPvpLv || r.iPvpLv <= player.pvp_level)) {
                    if (!random_pool_rates[r.iGroup])
                        random_pool_rates[r.iGroup] = 0;
                    random_pool_rates[r.iGroup] += (r.iRate || 0);
                    if (!random_pool_ids[r.iGroup])
                        random_pool_ids[r.iGroup] = [];
                    random_pool_ids[r.iGroup].push(r);
                }
            }
            let d = new Date();
            d.setHours(0, 0, 0, 0);
            db.save('preUpdateTime', d.getTime());
        }
        else {
            //针对节日的每日任务，如果刷新时没有这个group,给他加上，不用等到24小时刷新
            let task_login_check = global.resMgr.getConfig('task_login_check');
            let check_groups = task_login_check ? task_login_check.split(',') : [];
            let exist = [];
            //判断每个group是否存在
            for (let i = 0; i < check_groups.length; i++) {
                let group_id = Number(check_groups[i]);
                for (let key in db.value) {
                    if (taskres[key] && taskres[key].iGroup == group_id) {
                        exist[i] = true;
                        break;
                    }
                    exist[i] = false;
                }
                //如果不存在的就刷出来
                if (!exist[i]) {
                    for (let key in taskres) {
                        let r = taskres[key];
                        if (r.iGroup != group_id)
                            continue;
                        // 找到可以完成的 然后适合当前段位的任务来随机
                        if (player.m_taskMgr._checkTaskCanComplete(r) && (!r.iLevel || r.iLevel == player.level) && (!r.iPvpLv || r.iPvpLv <= player.pvp_level)) {
                            if (!random_pool_rates[r.iGroup])
                                random_pool_rates[r.iGroup] = 0;
                            random_pool_rates[r.iGroup] += (r.iRate || 0);
                            if (!random_pool_ids[r.iGroup])
                                random_pool_ids[r.iGroup] = [];
                            random_pool_ids[r.iGroup].push(r);
                        }
                    }
                }
            }
        }
    }
    else {
        //针对某个任务手动刷新
        let del_taskId = args[1];
        if (del_taskId) {
            // 首先老的任务都是不要了的
            out_map[del_taskId] = { type: "del", task: db.get(del_taskId) };
            // 然后随机新的任务出来 任务分成好几个组
            for (let key in taskres) {
                let r = taskres[key];
                //只刷新同组的
                if (r.iGroup != taskres[del_taskId].iGroup || r.kTaskID == del_taskId)
                    continue;
                // 找到可以完成的 然后适合当前段位的任务来随机
                if (player.m_taskMgr._checkTaskCanComplete(r) && (!r.iLevel || r.iLevel == player.level) && (!r.iPvpLv || r.iPvpLv <= player.pvp_level)) {
                    if (!random_pool_rates[r.iGroup])
                        random_pool_rates[r.iGroup] = 0;
                    random_pool_rates[r.iGroup] += (r.iRate || 0);
                    if (!random_pool_ids[r.iGroup])
                        random_pool_ids[r.iGroup] = [];
                    random_pool_ids[r.iGroup].push(r);
                }
            }
        }
        //同盟任务，直接手动添加某些任务
        else {
            let taskIds = args[2];
            if (taskIds.length > 0) {
                for (let taskId of taskIds) {
                    let r = taskres[taskId];
                    if (!random_pool_ids[r.iGroup])
                        random_pool_ids[r.iGroup] = [];
                    random_pool_ids[r.iGroup].push(r);
                }
            }
        }
    }
    for (let key in random_pool_ids) {
        let luck_num = Math.floor(random_pool_rates[key] * Math.random());
        let task_pools = random_pool_ids[key];
        let find = false;
        for (let i = 0; i < task_pools.length; i++) {
            let res = task_pools[i];
            if (res.iRate >= luck_num) {
                // 选中了
                // 看看是不是老的任务
                out_map = push_task(out_map, res);
                find = true;
                break;
            }
            luck_num -= res.iRate;
        }
        if (!find) {
            if (task_pools.length == 0) {
                console.log("<can not find match meiri task> type:" + key + ' user:' + player.id + ' level:' + player.pvp_level);
            }
            else {
                out_map = push_task(out_map, task_pools[0]);
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
SeTaskMgr_1.TaskModule.regist_pool(interface_1.SeEnumTaskiModule.MeiRi, refresh);
//# sourceMappingURL=meiri.js.map