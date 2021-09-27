import { if_sys_, if_pvp_match_info, SeGuild, SeGuildPlayer, SeEnumGuildTitle, SeEnumGuildItemReason, SeSimpleGuildPlayer, CharState, SeEnumAuthoryty, SeGuildTask, SeEnumGuildChatType, SeEnumContributeType } from "../../SeDefine";
import { netInst } from "../../NetMgr/SeNetMgr";
import { redistInst, ReHash, ReSortedSet, ReList, ReHashMember } from '../../lib/TeRedis'

import { serverMgrInst } from "../../serverMgr";
import { resMgrInst } from "../../ResMgr/SeResMgr";
import { onlineService } from "./onlineService";
import { SeResTask, SeEnumTaskiModule, SeEnumTaskiTab } from "../../Res/interface";
import { TeDate } from "../../lib/TeTool";
import { _three_mgr } from "../../ThreeLogDef";

export class guildService {
    static _three_ = null;
    static plt_init = {};
    static season_id: string = 'S000';
    static guilds: ReList; //guilds.value: Array<SeGuild>
    static guilds_chart: Array<{id: number, plt: string, name: string, medal: number, icon: string}> = [];
    static ready = false;
    static exchange_currency = ['','W116','W117','W118','W119'];
    static init(){
        this.guilds = redistInst.getList('guilds');
        this.guilds.load((err: any) => 
        { 
            if (!err) console.error("this.guilds.load fail"); 
            else {
                this.ready = true; 
                console.log("guilds ready");
                //把每个人的在线状态清除
                for(let guild of this.guilds.value){
                    for(let member of guild.members){
                        member.state = CharState.offline;
                    }
                    //插入排序
                    this.addGuildChart(guild);
                }
            }
        });
        setInterval(this._update_1S.bind(this), 1000);
        setInterval(this._update_10S.bind(this), 10 * 1000);
        setInterval(this._update_1M.bind(this), 60*1000);
        this._three_ = _three_mgr;
    }
    
    static addGuildChart(guild: SeGuild){
        let chart_length = 200;
        //先看看要不要删除
        for(let i = 0; i < this.guilds_chart.length; i++){
            if(this.guilds_chart[i].id == guild.id){
                this.guilds_chart.splice(i, 1);
            }
        }
        let index = this.guilds_chart.length;
        for(let i = 0; i < this.guilds_chart.length; i++){
            if(this.guilds_chart[i].medal < guild.medal || (this.guilds_chart[i].medal == guild.medal && this.guilds_chart[i].id > guild.id) ){
                index = i;
                break;
            }
        }
        if(index >= this.guilds_chart.length){
            if(this.guilds_chart.length >= chart_length) return;
            else this.guilds_chart.push({id: guild.id, plt: guild.plt, name: guild.name, medal: guild.medal, icon: guild.icon});
        }
        else{
            this.guilds_chart.splice(index, 0, {id: guild.id, plt: guild.plt, name: guild.name, medal: guild.medal, icon: guild.icon});
        }
        while(this.guilds_chart.length > chart_length){
            this.guilds_chart.splice(this.guilds_chart.length - 1, 1);
        }
    }
    static resetUnitState(uid: number, _sys_: if_sys_) {
        // console.log('gogogo11');
    }

    //创建同盟，id从10000开始记
    static createGuild(_sys_: if_sys_, uid: number, name: string, icon: string, announecement: string, need_approve: number, need_level: number, user_info: SeGuildPlayer){
        let guild = new SeGuild(10000 + this.guilds.value.length, uid, name, icon, _sys_.plt, announecement, this.season_id, need_approve, need_level);
        user_info.title = SeEnumGuildTitle.general;
        guild.members.push(user_info);
        guild.members_length++;
        this.guilds.push_back(guild);
        this.sendUpdateGuild(_sys_, uid, guild);
        this.addGuildChart(guild);
        let data = {
            cmd: 'guild_opr_ret',
            type: 'join_ret',
            uid: uid,
            guild_id: guild.id,
            guild_name: guild.name,
            success: true
        }
        netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
        this._three_ && this._three_.guildLogs(user_info, guild, 'create')
    }
    
    //创建同盟和同盟改名同名
    static checkGuildName(_sys_: if_sys_, uid: number, name: string, type: 'create_name' | 'change_name', send_data: any){
        let guilds: Array<{ index: number, value: SeGuild }> = this.guilds.findAll('plt', _sys_.plt);
        let success = true;
        for(let i =0; i < guilds.length; i++){
            if(guilds[i].value.name == name){
                success = false;
                break;
            }
        }
        let data = {
            cmd: 'guild_opr_ret',
            type: type + '_ret',
            success: success,
            uid: uid,
            send_data: send_data,
        }
        netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
    }

    //获取修改同盟属性
    static updateGuild(_sys_: if_sys_, uid: number, id: number, param: Array<string>, value: Array<string>){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(param.length != value.length) return; 
        //直接修改属性
        for(let i =0; i < param.length; i++){
            //检测是否有权限
            if(param[i] == 'name' && !this.checkAuthority(guild.value, uid, SeEnumAuthoryty.iChName)) return;
            if(param[i] == 'announcement' && !this.checkAuthority(guild.value, uid, SeEnumAuthoryty.iChMani)) return;
            guild.value[param[i]] = value[i];
        }
        
        this.guilds.set(guild.index, guild.value);
        let data = {
            cmd: 'update_guild_params',
            uid: uid,
            guild_id: guild.value.id,
            param: param,
            value: value,
        }
        this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);
        for(let i =0; i < param.length; i++){
            if(param[i] == 'name'){
                let data = {
                    cmd: 'guild_opr_ret',
                    type: 'update_name',
                    name: value[i],
                }
                for(let member of guild.value.members){
                    data['uid'] = member.id;
                    onlineService.send_to_uid(guild.value.plt, member.id, data, true);
                }
                break;
            }
        }
    }

    //获取同盟列表
    static getGuildList(_sys_: if_sys_, uid: number){
        let guilds: Array<{ index: number, value: SeGuild }> = this.guilds.findAll(null, null);
        let result: Array<{ index: number, value: SeGuild }> = JSON.parse(JSON.stringify(guilds));
        //列表只返回一些普通信息
        for(let i = 0; i < result.length; i++){
            result[i].value.chat_message = [];
            result[i].value.help_record = [];
            result[i].value.exchange_record = [];
            result[i].value.apply_members = [];
            result[i].value.members = [];
            //保留盟主信息
            for(let member of guilds[i].value.members){
                if(member.title == SeEnumGuildTitle.general){
                    result[i].value.members.push(member);
                    break;
                }
            }
        }
        this.sendUpdateGuilds(_sys_, uid, result);
    }

    static getGuildChart(_sys_: if_sys_, uid: number){
        let data = {
            cmd: 'update_guild_chart',
            uid: uid,
            info: this.guilds_chart,
        }
        netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
    }

    //获取同盟
    static getGuildDetail(_sys_: if_sys_, uid: number, id: number){
        let guild = this.guilds.find('id', id);
        if(guild){
            this.sendUpdateGuild(_sys_, uid, guild.value);
        }
    }

    static checkHasPlayer(members:Array<SeGuildPlayer>, id){
        for(var key in members){
            if(members[key].id == id) return true;
        }
        return false;
    }

    //申请加入同盟
    static applyGuild(_sys_: if_sys_, uid: number, id: number, apply_text: string, user_info: SeGuildPlayer){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(guild.value.plt != _sys_.plt) return;
        if(guild.value.need_level > user_info.level){
            let data = {
                cmd: 'guild_opr_error',
                uid: uid,
                err_code: 10006,
                err_reason: 'need level'
            }
            netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
            //通知玩家
            let data2 = {
                cmd: 'guild_opr_ret',
                type: 'join_ret',
                uid: uid,
                guild_id: guild.value.id,
                guild_name: guild.value.name,
                send_mail: false,
                success: false
            }
            netInst.sendData(data2, serverMgrInst.get_server(_sys_.serverid).nid);
            return;
        }
        user_info.apply_time = Date.now();
        //申请直接同意
        if(guild.value.need_approve == 0 || (guild.value.need_approve == 2 && guild.value.need_level <= user_info.level)){
            //已经在了就返回
            if(this.checkHasPlayer(guild.value.members, user_info.id)) return;
             //判断上限
            let res = resMgrInst('sdw').getGuildByLevel(guild.value.level);
            if(guild.value.members_length >= res.iPlayerMax){
                let data = {
                    cmd: 'guild_opr_error',
                    uid: uid,
                    err_code: 10002,
                    err_reason: 'player max'
                }
                netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
                //通知玩家
                let data2 = {
                    cmd: 'guild_opr_ret',
                    type: 'join_ret',
                    uid: uid,
                    guild_id: guild.value.id,
                    guild_name: guild.value.name,
                    send_mail: false,
                    success: false
                }
                onlineService.send_to_uid(_sys_.plt, uid, data2, true);
                return;
            }
            user_info.apply_text = '';
            user_info.title = SeEnumGuildTitle.normal;
            guild.value.members.push(user_info);
            guild.value.members_length++;
            this.guilds.set(guild.index, guild.value);
            //删除其他同盟里的申请列表
            this.del_apply_info(_sys_, user_info.id, []);
            let data1 = {
                cmd: 'update_guild_params',
                uid: uid,
                guild_id: guild.value.id,
                param: ['apply_members', 'members', 'members_length'],
                value: [guild.value.apply_members, guild.value.members, guild.value.members_length],
            }
            this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data1);
            //通知玩家
            let data2 = {
                cmd: 'guild_opr_ret',
                type: 'join_ret',
                uid: uid,
                guild_id: guild.value.id,
                guild_name: guild.value.name,
                send_mail: true,
                success: true
            }
            netInst.sendData(data2, serverMgrInst.get_server(_sys_.serverid).nid);
            //通知大家
            this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.join, [user_info.name], [uid], null);
            this._three_ && this._three_.guildLogs(user_info, guild.value, 'join')
        }
        else{
            user_info.apply_text = apply_text;
            //已经在了就返回
            if(this.checkHasPlayer(guild.value.apply_members, user_info.id)) return;
            if(guild.value.apply_members.length >= 99) {
                let data = {
                    cmd: 'guild_opr_error',
                    uid: uid,
                    err_code: 10007,
                    err_reason: 'apply member max'
                }
                netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
                return;
            }
            //加入申请列表
            guild.value.apply_members.push(user_info);
            guild.value.apply_members_length++;
            this.guilds.set(guild.index, guild.value);
            this.sendUpdateGuild(_sys_, uid, guild.value);
            //通知管理员
            let data = {
                cmd: 'update_guild_params',
                uid: uid,
                guild_id: guild.value.id,
                param: ['apply_members', 'apply_members_length'],
                value: [guild.value.apply_members, guild.value.apply_members_length],
            }
            this.noticeAll(guild.value.plt, SeEnumGuildTitle.general, guild.value.id, data);
        }
    }

    //同意或拒绝申请
    static deal_apply(_sys_: if_sys_, uid: number, id: number, apply_uid: number, approve: boolean){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(!this.checkAuthority(guild.value, uid, SeEnumAuthoryty.iCheck)) return;
        //判断上限
        let res = resMgrInst('sdw').getGuildByLevel(guild.value.level);
        if(approve && guild.value.members_length >= res.iPlayerMax){
            let data = {
                cmd: 'guild_opr_error',
                uid: uid,
                err_code: 10002,
                err_reason: 'player max'
            }
            netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
            return;
        }
        let find = false;
        for(let i = 0; i < guild.value.apply_members.length; i++){
            let apply_member = guild.value.apply_members[i];
            if(apply_member.id == apply_uid){
                find = true;
                if(approve){
                    apply_member.title = SeEnumGuildTitle.normal;
                    guild.value.members.push(apply_member);
                    guild.value.members_length++;
                    //通知大家
                    this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.join, [apply_member.name], [apply_uid, uid], null);
                    //删除所有同盟里的申请列表
                    this.del_apply_info(_sys_, apply_member.id, []);
                    this._three_ && this._three_.guildLogs(apply_member, guild.value, 'join')
                }
                else{
                    guild.value.apply_members.splice(i, 1);
                    guild.value.apply_members_length--;
                }
                this.guilds.set(guild.index, guild.value);
                //通知玩家
                let data2 = {
                    cmd: 'guild_opr_ret',
                    type: 'join_ret',
                    uid: apply_uid,
                    guild_id: guild.value.id,
                    guild_name: guild.value.name,
                    send_mail: true,
                    success: approve
                }
                onlineService.send_to_uid(_sys_.plt, apply_uid, data2, true);
                this.sendUpdateGuild(_sys_, apply_uid, guild.value, true);
                let data = {
                    cmd: 'update_guild_params',
                    uid: uid,
                    guild_id: guild.value.id,
                    param: ['apply_members', 'members', 'members_length'],
                    value: [guild.value.apply_members, guild.value.members, guild.value.members_length],
                }
                this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);
                return;
            }
        }
        if(!find){
            let data = {
                cmd: 'guild_opr_error',
                uid: uid,
                err_code: 10001,
                err_reason: 'deal no player'
            }
            netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
        }
    }

    //玩家加入同盟后删除其他同盟的申请信息
    static del_apply_info(_sys_: if_sys_, uid: number, ids: Array<number>){
        if(ids.length > 0){
            for(let id of ids){
                let guild = this.guilds.find('id', id);
                this.del_apply_info_inside(guild, uid);
            }
        }
        else{
            let guilds = this.guilds.findAll('plt', _sys_.plt);
            for(let i = 0; i < guilds.length; i++){
                this.del_apply_info_inside(guilds[i], uid);
            }
        }
        
    }

    static del_apply_info_inside(guild,  uid: number){
        for(let i = 0; i < guild.value.apply_members.length; i++){
            let members = guild.value.apply_members[i];
            if(members.id == uid){
                guild.value.apply_members.splice(i, 1);
                guild.value.apply_members_length--;
                break;
            }
        }
        this.guilds.set(guild.index, guild.value);
    }
    //退出同盟
    static quite(_sys_: if_sys_, uid: number, id: number, general_name: string, general_id: number){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        for(let i = 0; i < guild.value.members.length; i++){
            let members = guild.value.members[i];
            if(members.id == uid){
                //如果是盟主，只有一个人的时候可以退出，并且有24小时反悔时间
                if(members.title == SeEnumGuildTitle.general){
                    if(guild.value.members.length != 1) return;
                    guild.value.is_close = true;
                    //修改玩家身上的退出时间
                    let data = {
                        cmd: 'guild_opr_ret',
                        type: 'quit_ret',
                        uid: uid,
                        quite_time: Date.now(),
                        quite_id: guild.value.id,
                    }
                    onlineService.send_to_uid(_sys_.plt, uid, data, true);
                }
                else{
                    //聊天界面添加退出
                    if(general_name) this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.kick, [members.name, general_name], [uid, general_id], null);
                    else this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.quit, [members.name], [uid], null);
                    this._three_ && this._three_.guildLogs(guild.value.members[i], guild.value, 'quit')
                    guild.value.members.splice(i, 1);
                    guild.value.members_length--;
                    //修改玩家身上的退出时间
                    let data = {
                        cmd: 'guild_opr_ret',
                        type: 'quit_ret',
                        uid: uid,
                        quite_time: Date.now()
                    }
                    !general_name && onlineService.send_to_uid(_sys_.plt, uid, data, true); //自己退的才发这条消息
                }
                //清除同盟里的捐卡换卡
                this.checkExchange(guild.value, true, uid);
                this.checkHelp(guild.value, true, uid);
            }
        }
        this.guilds.set(guild.index, guild.value);
        //通知大家
        let data = {
            cmd: 'update_guild_params',
            uid: uid,
            guild_id: guild.value.id,
            param: ['members'],
            value: [guild.value.members],
        }
        this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);
    }

    //退出同盟
    static cancel_quite(_sys_: if_sys_, uid: number, id: number){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        guild.value.is_close = false;
        this.guilds.set(guild.index, guild.value);
        //修改玩家身上的退出时间
        let data = {
            cmd: 'guild_opr_ret',
            type: 'join_ret',
            uid: uid,
            success: true,
            guild_id: guild.value.id,
            guild_name: guild.value.name,
        }
        netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
        
    }

    //完成同盟任务
    static complete_task(_sys_: if_sys_, uid: number, id: number, taskId: string, user_info: SeSimpleGuildPlayer){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(guild.value.task_id.indexOf(taskId) == -1) return;
        let res = resMgrInst('sdw').getGuildByLevel(guild.value.level);
        if(!res) return;
        if(!guild.value.task_info[taskId]) guild.value.task_info[taskId] = new SeGuildTask(taskId, Math.max(Math.floor(res.iPlayerMax / (3 * 1.25)), 1));
        let task_info = guild.value.task_info[taskId]
        if(!task_info.send_award){
            task_info.value++;
            if(task_info.value >= task_info.max_value){
                //同盟任务完成奖励
                let award = Number(resMgrInst('sdw').TaskRes.getRes(taskId).iAwards2);
                guild.value.medal += award;
                task_info.send_award = true;
                //通知大家
                this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.taskcomplete, [task_info.id], [], null)
            }
            this._three_ && this._three_.guildLogs(user_info, guild.value, 'complete_task', taskId, task_info.value);
            this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.taskcompleteperson, [user_info.name, task_info.id, task_info.value, task_info.max_value], [uid], null)
            this.addContributeCount(guild.value, uid, SeEnumContributeType.task, 1);
        }
        this.guilds.set(guild.index, guild.value);
         //通知管理员
         let data = {
            cmd: 'update_guild_params',
            uid: uid,
            guild_id: guild.value.id,
            param: ['task_info', 'medal'],
            value: [guild.value.task_info, guild.value.medal],
        }
        this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);
    }

    //添加同盟任务进度
    static add_task_value(_sys_: if_sys_, id: number, taskId: string, value: number, user_info: SeSimpleGuildPlayer){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(!guild || guild.value.task_id.indexOf(taskId) == -1) return;
        
        if(!guild.value.task_info[taskId].complete_info) guild.value.task_info[taskId].complete_info = [];
        let task_info = guild.value.task_info[taskId].complete_info;
        let result = false;
        for(let i = 0; i < task_info.length; i++){
            if(task_info[i].id == user_info.id){
                task_info[i] = {id: user_info.id, name: user_info.name, vip_level: user_info.vip_level, is_vip: user_info.is_vip, value: value}
                result = true;
                break;
            }
        }
        if(!result) task_info.push({id: user_info.id, name: user_info.name, vip_level: user_info.vip_level, is_vip: user_info.is_vip, value: value});
        this.guilds.set(guild.index, guild.value);
        let data = {
            cmd: 'update_guild_params',
            uid: user_info.id,
            guild_id: guild.value.id,
            param: ['task_info'],
            value: [guild.value.task_info],
        }
        this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);

    }
     //获取同盟任务id
     static get_task_id(_sys_: if_sys_, uid: number, id: number){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(guild.value.task_id.length == 0){
            let res = resMgrInst('sdw').TaskRes.getAllRes();
            let pools = {};
            for(var key in res){
                let task = res[key];
                if(task.iTab == SeEnumTaskiTab.MengJunTongMengRenWu){
                    if(!pools[task.iGroup]) pools[task.iGroup] = [];
                    pools[task.iGroup].push(task.kTaskID);
                }
            }
            for(var key in pools){
                if(!pools[key] || pools[key].length == 0) continue;
                let taskId = pools[key][Math.floor(Math.random() * pools[key].length)];
                guild.value.task_id.push(taskId);
                let res = resMgrInst('sdw').getGuildByLevel(guild.value.level);
                if(!res) return;
                if(!guild.value.task_info[taskId]) guild.value.task_info[taskId] = new SeGuildTask(taskId, Math.max(Math.floor(res.iPlayerMax / (3 * 1.25)), 1));
            }
            //新创建的任务通知
            let task_data = {
                cmd: 'update_guild_params',
                uid: uid,
                guild_id: guild.value.id,
                param: ['task_info'],
                value: [guild.value.task_info],
            }
            this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, task_data);
        }
        this.guilds.set(guild.index, guild.value);
        //修改玩家身上的退出时间
        let data = {
            cmd: 'guild_opr_ret',
            type: 'task_ret',
            uid: uid,
            task_id: guild.value.task_id,
        }
        netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
    }

     //获取同盟任务进度
     static get_task_info(_sys_: if_sys_, uid: number, id: number, taskIds: Array<string>){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        let result = {};
        for(let i = 0; i < taskIds.length; i++){
            if(guild.value.task_id.indexOf(taskIds[i]) == -1) continue;
            result[taskIds[i]] = guild.value.task_info[taskIds[i]];
        }
        //修改玩家身上的退出时间
        let data = {
            cmd: 'update_guild_task',
            uid: uid,
            guild_id: guild.value.id,
            task_info: result,
        }
        netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
    }

    //踢出同盟
    static kick(_sys_: if_sys_, uid: number, id: number, opr_uid: number){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        //检测是否有权限
        if(!this.checkAuthority(guild.value, uid, SeEnumAuthoryty.iDelMember)) return;
        for(let i = 0; i < guild.value.members.length; i++){
            let members = guild.value.members[i];
            if(members.id == uid){
                this.quite(_sys_, opr_uid, id, members.name, uid);
            }
        }
        //通知玩家
        let data = {
            cmd: 'guild_opr_ret',
            type: 'kick',
            uid: opr_uid,
            guild_id: guild.value.id,
            guild_name: guild.value.name,
            quite_time: Date.now(),
        };
        onlineService.send_to_uid(_sys_.plt, opr_uid, data, true);
        let data1 = {
            cmd: 'update_guild_params',
            uid: uid,
            guild_id: guild.value.id,
            param: ['members'],
            value: [guild.value.members],
        }
        this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data1);
    }

     //任命
     static appoint(_sys_: if_sys_, uid: number, id: number, opr_uid: number, title: number, user_info: SeSimpleGuildPlayer){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        let is_general = false;
        let res = resMgrInst('sdw').GuildAuthorityRes.getRes(title);
        var opr_name = ''; //被操作的人名
        var name = ''; //操作人名
        //检测是否到达上限
        if(res && res.iMax){
            let count = 0;
            for(let j = 0; j < guild.value.members.length; j++){
                let members = guild.value.members[j];
                if(members.title == title && title != SeEnumGuildTitle.general){
                    count++;
                    if(count >= res.iMax) return;
                }
            }
        }
        //检测是否有权限
        if(!this.checkAuthority(guild.value, uid, SeEnumAuthoryty.iAppoint)) return;
        //获取操作人名字
        for(let i = 0; i < guild.value.members.length; i++){
            let members = guild.value.members[i];
            if(members.id == opr_uid){
                opr_name = members.name;
            }
        }
        //如果任命的是盟主，则把自己变成副盟主
        for(let i = 0; i < guild.value.members.length; i++){
            let members = guild.value.members[i];
            if(members.id == uid){
                name = members.name;
                if(title == SeEnumGuildTitle.general) {
                    //看看24小时冷却有没有到
                    if(guild.value.appoint_general_time && Date.now() - guild.value.appoint_general_time < 24 * 60 * 60 * 1000) return;
                    guild.value.appoint_general_time = Date.now();
                    members.title = SeEnumGuildTitle.viceGeneral;
                    this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.general, [opr_name, name], [opr_uid, uid], null);
                }
                else{
                    this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.appoint, [opr_name, name, title], [opr_uid, uid], null);
                }
            }
        }
        //修改职位，不能放到上面去，否则可能出现，被任命成盟主，但自身未变成副盟主的情况
        for(let i = 0; i < guild.value.members.length; i++){
            let members = guild.value.members[i];
            if(members.id == opr_uid){
                members.title = title;
            }
        }
        this.guilds.set(guild.index, guild.value);
        //通知大家
        
        let data = {
            cmd: 'update_guild_params',
            uid: uid,
            guild_id: guild.value.id,
            param: ['members', 'appoint_general_time'],
            value: [guild.value.members, guild.value.appoint_general_time],
        }
        this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);
        is_general && this._three_ && this._three_.guildLogs(user_info, guild.value, 'appoint_general');
    }

    //接任盟主
    static applyGeneral(_sys_: if_sys_, uid: number, id: number){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(Date.now() - guild.value.general_last_login > 30 * 24 * 60 * 60 * 1000){
            for(let i = 0; i < guild.value.members.length; i++){
                let members = guild.value.members[i];
                if(members.title == SeEnumGuildTitle.general){
                    members.title = SeEnumGuildTitle.normal;
                }
                if(members.id == uid){
                    members.title = SeEnumGuildTitle.general;
                }
            }
            guild.value.general_last_login = Date.now();
            this.guilds.set(guild.index, guild.value);
            //通知大家
            let data = {
                cmd: 'update_guild_params',
                uid: uid,
                guild_id: guild.value.id,
                param: ['members','general_last_login'],
                value: [guild.value.members, guild.value.general_last_login],
            }
            this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);
        }
        else{
            //退还申请费用
            this.sendAddDelCard(guild.value.plt, uid, [], [], [{itemId: 'W001', count: 200}], [], SeEnumGuildItemReason.normal);
        }
    }

    //捐献资金
    static contribute(_sys_: if_sys_, uid: number, id: number, count: number, user_info: SeSimpleGuildPlayer){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(!guild){
            console.error("no guild: " + id);
            return;
        }
        guild.value.capital += count;
        guild.value.medal += count;
        this.addContributeCount(guild.value, uid, SeEnumContributeType.contribute, count);
        this.addGuildChart(guild.value);
        this.guilds.set(guild.index, guild.value);
        //聊天记录增加 [玩家名称，数量]
        this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.contribute, [user_info.name, count], [uid], null);
                
        let data = {
            cmd: 'update_guild_params',
            uid: uid,
            guild_id: guild.value.id,
            param: ['capital', 'medal'],
            value: [guild.value.capital, guild.value.medal],
        }
        this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);
    }

    //升级
    static up_level(_sys_: if_sys_, uid: number, id: number){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(!this.checkAuthority(guild.value, uid, SeEnumAuthoryty.iLvUp)) return;
        let res = resMgrInst('sdw').getGuildByLevel(guild.value.level);
        if(res){
            if(guild.value.medal >= res.iMedalNeed){
                guild.value.level++; 
            }
        }
        this.guilds.set(guild.index, guild.value);

        let data = {
            cmd: 'update_guild_params',
            uid: uid,
            guild_id: guild.value.id,
            param: ['level'],
            value: [guild.value.level],
        }
        this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);
        this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.lvlup, [guild.value.name], [uid], null);
    }

    //邀请
    static invite(_sys_: if_sys_, opr_uid: number, id: number, user_info: SeSimpleGuildPlayer){
        let invite_info = {
            guild_id: id,
            inviter_id: user_info.id,
            inviter_name: user_info.name
        }
        let data = {
            cmd: 'guild_opr_ret',
            uid: opr_uid,
            type: 'invite',
            invite_info: invite_info
        };
        onlineService.send_to_uid(_sys_.plt, opr_uid, data, true);
    }

    //捐献添加荣耀积分
    static addGloryScore(_sys_: if_sys_, id: number, score: number){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        guild.value.glory_all += score;
        this.guilds.set(guild.index, guild.value);
        let data = {
            cmd: 'update_guild_params',
            uid: 0,
            guild_id: guild.value.id,
            param: ['glory_all'],
            value: [guild.value.glory_all],
        }
        this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);
    }
    
    //同盟聊天
    static guildChat(_sys_: if_sys_, uid: number, id: number, chat_text: string, chat_type: SeEnumGuildChatType, param: Array<any>, charIdList: Array<number>, user_info: SeSimpleGuildPlayer){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(!guild){
            console.error("no guild: " + id);
            return;
        }
        let now = Date.now();
        //同步职位
        if(user_info){
            let title = SeEnumGuildTitle.normal;
            if(chat_type == SeEnumGuildChatType.nomal){
                for(let member of guild.value.members){
                    if(member.id == user_info.id) title = member.title;
                }
            }
            user_info.title = title;
        }
        //加入聊天列表
        //聊天信息index为0，其他暂时为1
        let index = 0;
        if(chat_type != SeEnumGuildChatType.nomal) index = 1;
        if(!guild.value.chat_message[index]) guild.value.chat_message[index] = [];
        guild.value.chat_message[index].push({text: chat_text, player: user_info, time: now, param: param, chat_type: chat_type, charIdList: charIdList});
        //长度限制100
        while(guild.value.chat_message[index].length > 100){
            guild.value.chat_message[index].splice(0,1);
        }
        this.guilds.set(guild.index, guild.value);

        let data = {
            cmd: 'update_guild_chat',
            uid: uid,
            user_info: user_info,
            guild_id: guild.value.id,
            chat_text: chat_text,
            time: now,
            param: param,
            chat_type: chat_type,
            charIdList: charIdList,
        }
        this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);
    }

    //请求捐卡
    static ask_help(_sys_: if_sys_, uid: number, id: number, heroId: string, count: number, user_info: SeSimpleGuildPlayer){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(!guild){
            console.error("no guild: " + id);
            return;
        }
        //加入捐卡列表
        guild.value.help_record.push({heroId: heroId, count: count, asker: user_info, helper: [], time: Date.now()});
        this.guilds.set(guild.index, guild.value);
        this.sendUpdateGuildParams(_sys_, uid, guild.value.id, ['help_record'], [guild.value.help_record], true);
        this._three_ && this._three_.guildLogs(user_info, guild.value, 'ask_help', null, null, heroId, count);
    }

    //捐卡
    static help(_sys_: if_sys_, uid: number, id: number, ask_uid: number, heroId: string, count: number, user_info: SeSimpleGuildPlayer){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(!guild){
            console.error("no guild: " + id);
            return;
        }
        //查找捐卡
        let help_record = guild.value.help_record;
        let iColour = resMgrInst('sdw').UnitRes.getRes(heroId).iColour;
        for(let i = 0; i < help_record.length; i++){
            if(help_record[i].asker.id == ask_uid && help_record[i].heroId == heroId){
                //判断是否达到数量,若捐卡数量超了，不允许捐卡
                let helper = help_record[i].helper;
                let count_all = 0;
                for(let j = 0; j < helper.length; j++){
                    count_all += helper[j].count;
                }
                //添加捐卡记录
                if(count_all + count > help_record[i].count){
                    this.sendHelpResult(_sys_, uid, false, heroId, count);
                    return;
                }
                else{
                    this.sendHelpResult(_sys_, uid, true, heroId, count);
                    this._three_ && this._three_.guildLogs(user_info, guild.value, 'help', null, null, heroId, count);
                }
                user_info.count = count;
                user_info.time = Date.now();
                helper.push(user_info);
                count_all = count_all + count;
                //聊天记录增加 [申请捐卡者名称，捐卡者名称，卡牌id，捐卡数量]
                this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.help, [help_record[i].asker.name, user_info.name, heroId, count], [help_record[i].asker.id, uid], null);
                //集齐了发给玩家
                if(count_all >= help_record[i].count){
                    this.sendHelpCard(_sys_.plt, help_record[i]);
                    //删除记录
                    help_record.splice(i,1);
                }
                //爱心值记录
                let love_count = parseInt(resMgrInst('sdw').getConfig('TM_donate_reward').split('|')[1].split(',')[iColour - 1]);
                this.addContributeCount(guild.value, uid, SeEnumContributeType.help, love_count);
            }
        }
        this.guilds.set(guild.index, guild.value);
        this.sendUpdateGuildParams(_sys_, uid, guild.value.id, ['help_record'], [guild.value.help_record], true);
    }

    //请求换卡
    static ask_exchange(_sys_: if_sys_, uid: number, id: number, use_card: Array<{heroId: string, count: number}>, heroId: string, count: number, user_info: SeSimpleGuildPlayer){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        //加入换卡列表
        guild.value.exchange_record.push({heroId: heroId, count: count, asker: user_info, use_card: use_card, time: Date.now()});
        this.guilds.set(guild.index, guild.value);
        this.sendUpdateGuildParams(_sys_, uid, guild.value.id, ['exchange_record'], [guild.value.exchange_record], true);
        this._three_ && this._three_.guildLogs(user_info, guild.value, 'ask_exchange', null, null, heroId, count, JSON.stringify(use_card));
    }
    static exchange_contribute_type = [null, SeEnumContributeType.exchange_green, SeEnumContributeType.exchange_blue, SeEnumContributeType.exchange_purple, SeEnumContributeType.exchange_orange]
    //换卡
    static exchange(_sys_: if_sys_, uid: number, id: number, ask_uid, use_card: {heroId: string, count: number}, get_card: {heroId: string, count: number}, time: number, user_info: SeSimpleGuildPlayer){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        //查找捐卡
        let exchange_record = guild.value.exchange_record;
        let exchange_result = false;
        let iColour = resMgrInst('sdw').UnitRes.getRes(use_card.heroId).iColour;
        for(let i = 0; i < exchange_record.length; i++){
            let record = exchange_record[i];
            if(record.asker.id == ask_uid && record.heroId == use_card.heroId && record.count == use_card.count && record.time == time){
                //选中换卡玩家想要的牌
                for(let j = 0; j < record.use_card.length; j++){
                    if(JSON.stringify(record.use_card[j]) == JSON.stringify(get_card)){
                        exchange_result = true;
                        record.use_card.splice(j,1);
                        //发起人记录,同时返还剩余卡牌
                        this.sendExchangeCard(_sys_.plt, record.asker.id, {heroId: use_card.heroId, count: use_card.count, use_card: get_card, exchanger: user_info, time: record.time, back_card: record.use_card});
                        //换卡人记录
                        this.sendExchangeCard(_sys_.plt, uid, {heroId: get_card.heroId, count: get_card.count, use_card: use_card, exchanger: record.asker, time: record.time, back_card: []});
                        this.addContributeCount(guild.value, uid, this.exchange_contribute_type[iColour], 1);
                        this.addContributeCount(guild.value, ask_uid, this.exchange_contribute_type[iColour], 1);
                    }
                    
                }
               //换卡成功
                if(exchange_result){
                    exchange_record.splice(i,1);
                    //聊天记录增加 [申请换卡者名称，申请换卡者消耗的卡牌id，申请换卡者消耗的卡牌数量，换卡者名称，换卡者消耗的卡牌id，换卡者消耗的卡牌数量]
                    this.guildChat(_sys_, uid, id, '', SeEnumGuildChatType.exchange, [record.asker.name, get_card.heroId, get_card.count, user_info.name, use_card.heroId, use_card.count], [record.asker.id, uid], null);
                }
            }
        }
         
        if(!exchange_result){
            //换卡人退卡及换卡币
            let itemId = this.exchange_currency[iColour];
            this.sendAddDelCard(_sys_.plt, uid, [use_card], [], [{itemId: itemId, count: 1}], [], SeEnumGuildItemReason.cancel_exchange);
        }
        this.guilds.set(guild.index, guild.value);
        
        this.sendUpdateGuildParams(_sys_, uid, guild.value.id, ['exchange_record'], [guild.value.exchange_record], true);
        exchange_result && this._three_ && this._three_.guildLogs(user_info, guild.value, 'exchange', null, null, get_card.heroId, get_card.count, JSON.stringify(use_card));
    }

     //取消换卡
     static cancel_exchange(_sys_: if_sys_, uid: number, id: number, ask_uid, time: number, user_info: SeSimpleGuildPlayer){
        let guild: { index: number, value: SeGuild } = this.guilds.find('id', id);
        if(!guild){
            console.error("no guild: " + id);
            return;
        }
        //查找捐卡
        let exchange_record = guild.value.exchange_record;
        let exchange_result = false;
        for(let i = 0; i < exchange_record.length; i++){
            let record = exchange_record[i];
            if(record.asker.id == ask_uid && record.time == time){
                //返还卡牌
                let itemId = this.exchange_currency[resMgrInst('sdw').UnitRes.getRes(record.use_card[0].heroId).iColour];
                this.sendAddDelCard(guild.value.plt, record.asker.id, record.use_card, [], [{itemId: itemId, count: 1}], [], SeEnumGuildItemReason.normal);
                //删除记录
                guild.value.exchange_record.splice(i,1);
                break;
            }
        }
        this.guilds.set(guild.index, guild.value);
        
        this.sendUpdateGuildParams(_sys_, uid, guild.value.id, ['exchange_record'], [guild.value.exchange_record], true);
    }

    //发送捐卡卡牌  uid: number, heroId: string, count: number, helper, time: number
    static sendHelpCard(plt: string, help_record : {heroId: string, count: number, asker: SeSimpleGuildPlayer, helper: Array<SeSimpleGuildPlayer>, time: number}){
        console.error('sendHelpCard: ' + JSON.stringify(help_record));
        //发送卡牌给玩家，若不在线发送离线邮件
        let data = {};
        data['cmd'] = 'guild_opr_ret';
        data['uid'] = help_record.asker.id;
        data['type'] = 'receive_help';
        data['info'] = help_record;
        onlineService.send_to_uid(plt, help_record.asker.id, data, true);
    }

    //发送换卡卡牌  
    static sendExchangeCard(plt: string, uid, exchange_record : {exchanger: SeSimpleGuildPlayer, time: number, use_card: {heroId: string, count: number}, heroId: string, count: number, back_card: Array<{heroId: string, count: number}>}){
        console.error('sendExchangeCard: ' + JSON.stringify(exchange_record));
        //发送卡牌给玩家，若不在线发送离线邮件
        let data = {};
        data['cmd'] = 'guild_opr_ret';
        data['uid'] = uid;
        data['type'] = 'receive_exchange';
        data['info'] = exchange_record;
        onlineService.send_to_uid(plt, uid, data, true);
    }

    //发送换卡返回增加删除卡牌  
    static sendAddDelCard(plt: string, uid, add_hero_card : Array<{heroId: string, count: number}>, del_hero_card : Array<{heroId: string, count: number}>, add_item : Array<{itemId: string, count: number}>, del_item : Array<{itemId: string, count: number}>, reason: SeEnumGuildItemReason){
        //发送卡牌给玩家，若不在线发送离线邮件
        let data = {};
        data['cmd'] = 'guild_opr_ret';
        data['uid'] = uid;
        data['type'] = 'card_item_opr';
        data['add_hero_card'] = add_hero_card;
        data['del_hero_card'] = del_hero_card;
        data['add_item'] = add_item;
        data['del_item'] = del_item;
        data['reason'] = reason;
        onlineService.send_to_uid(plt, uid, data, true);
    }

    //发送消息给同盟内所有该职位以上的人
    static noticeAll(plt: string, title: SeEnumGuildTitle, guild_id: number, data){
        let guild: { index: number, value: SeGuild } = guildService.guilds.find('id', guild_id);
        for(let member of guild.value.members){
            if(member.title <= title && onlineService.is_online(plt, member.id)){
                data['uid'] = member.id;
                onlineService.send_to_uid(plt, member.id, data);
            }
        }
    }

    //设置玩家在线状态，及更新名字登记
    static setPlayerState(guild_id: number, uid: number, state: string, glory_score: number, pvp_level: number, pvp_score: number, peak_score: number, is_vip: boolean, vip_level: number, charname: string, level: number, avatar: any, icon: string){
        let guild: { index: number, value: SeGuild } = guildService.guilds.find('id', guild_id);
        if(!guild) return;
        for(let member of guild.value.members){
            if(member.id == uid){
                member.state = state;
                member.glory_score = glory_score;
                member.pvp_level = pvp_level;
                member.pvp_score = pvp_score;
                member.is_vip = is_vip;
                member.peak_score = peak_score;
                member.vip_level = vip_level;
                member.level = level;
                member.avatar = avatar;
                member.name = charname;
                member.icon = icon
                //如果是盟主在线，修改盟主在线时间
                if(member.title == SeEnumGuildTitle.general && state == CharState.loadcomplete){
                    guild.value.general_last_login = Date.now();
                }
            }
            
        }
        this.guilds.set(guild.index, guild.value);
        //通知大家上线
        let data = {
            cmd: 'update_guild_params',
            uid: uid,
            guild_id: guild.value.id,
            param: ['members'],
            value: [guild.value.members],
        }
        this.noticeAll(guild.value.plt, SeEnumGuildTitle.normal, guild.value.id, data);
    }

    //发送更新同盟列表
    static sendUpdateGuilds(_sys_: if_sys_, uid: number, guilds: Array<{ index: number, value: SeGuild}>){
        netInst.sendData({
            cmd: 'update_guilds',
            uid: uid,
            guilds: guilds,
        }, serverMgrInst.get_server(_sys_.serverid).nid);
    }

    //发送更新同盟
    static sendUpdateGuild(_sys_: if_sys_, uid: number, guild: SeGuild, other_server: boolean = false){
        let data = {
            cmd: 'update_guild',
            uid: uid,
            guild: guild,
        };
        if(other_server){
            //发送给别人，不是当前消息处理人, 若不在线就不发了
            onlineService.send_to_uid(_sys_.plt, uid, data);
        }
        else{
            netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
        }
    }

    //发送更新的同盟属性
    static sendUpdateGuildParams(_sys_: if_sys_, uid: number, guild_id: number, param: Array<string>, value: Array<any>, noticeAll = false){
        let data = {
            cmd: 'update_guild_params',
            uid: uid,
            guild_id: guild_id,
            param: param,
            value: value,
        };
        if(noticeAll){
            this.noticeAll(_sys_.plt, SeEnumGuildTitle.normal, guild_id, data);
        }
        else{
            netInst.sendData(data, serverMgrInst.get_server(_sys_.serverid).nid);
        }
    }


    //返回捐卡成功的回调，玩家扣卡
    static sendHelpResult(_sys_: if_sys_, uid: number, success: boolean, heroId: string, count: number){
        let data = {
            cmd: 'guild_opr_ret',
            type: 'help_result',
            uid: uid,
            success: success,
            heroId: heroId,
            count: count,
        };
        onlineService.send_to_uid(_sys_.plt, uid, data, true);
    }

    static addContributeCount(guild: SeGuild, uid: number, type: SeEnumContributeType, count: number){
        for(let i = 0; i < guild.members.length; i++){
            if(guild.members[i].id == uid){
                let member = guild.members[i];
                //添加贡献度 及周贡献
                if(TeDate.isdiffweek(member.contribute_week_time) || !member.contribute_week){
                    member.contribute_week = 0;
                    member.contribute_week_time = Date.now();
                }
                switch(type){
                    case SeEnumContributeType.contribute:
                        if(!member.contribute_count) member.contribute_count = count;
                        else member.contribute_count += count;
                        member.contribute_week += count;
                        break;
                    case SeEnumContributeType.task:
                        if(!member.task_count) member.task_count = count;
                        else member.task_count += count;
                        member.contribute_week += count * 20;
                        break;
                    case SeEnumContributeType.help:
                        if(!member.help_count) member.help_count = count;
                        else member.help_count += count;
                        member.contribute_week += count * 0.5;
                        break;
                    case SeEnumContributeType.exchange_green:
                        if(!member.exchange_green_count) member.exchange_green_count = count;
                        else member.exchange_green_count += count;
                        member.contribute_week += count * 160;
                        break;
                    case SeEnumContributeType.exchange_blue:
                        if(!member.exchange_blue_count) member.exchange_blue_count = count;
                        else member.exchange_blue_count += count;
                        member.contribute_week += count * 160;
                        break;
                    case SeEnumContributeType.exchange_purple:
                        if(!member.exchange_purple_count) member.exchange_purple_count = count;
                        else member.exchange_purple_count += count;
                        member.contribute_week += count * 160;
                        break;
                    case SeEnumContributeType.exchange_orange:
                        if(!member.exchange_orange_count) member.exchange_orange_count = count;
                        else member.exchange_orange_count += count;
                        member.contribute_week += count * 400;
                        break;
                }
                //计算对应的贡献度 =爱心值*0.5+捐献钻石*1+完成任务*20+传奇换卡*400+其余换卡*160
                member.contribute_all = (member.help_count? member.help_count * 0.5 : 0)
                 + (member.contribute_count? member.contribute_count : 0)
                 + (member.task_count * 20? member.task_count * 20 : 0)
                 + (member.exchange_orange_count? member.exchange_orange_count * 400 : 0)
                 + (member.exchange_blue_count? member.exchange_blue_count * 160 : 0)
                 + (member.exchange_green_count? member.exchange_green_count * 160 : 0)
                 + (member.exchange_purple_count? member.exchange_purple_count * 160 : 0);
                let data = {
                    cmd: 'update_guild_params',
                    uid: uid,
                    guild_id: guild.id,
                    param: ['members'],
                    value: [guild.members],
                }
                onlineService.send_to_uid(guild.plt, uid, data, false);
            }
        }
    }

    static _update_1S() {
        if (!this.ready) return;
        this.checkSeason();
        this.checkGuildTask();
    }

    static _update_10S() {
        if (!this.ready) return;
        this.checkGuildInfo();
    }
    
    static _update_1M() {
        if (!this.ready) return;
        this.checkLonelyGeneral();
        this.checkApplyRecord();
        this.refresh_contribute();
    }

    //跨周全部刷新
    static _save_time = Date.now();
    static refresh_contribute() {
        if (!TeDate.isdiffweek(this._save_time)) {
            return;
        }
        this._save_time = Date.now();
        let guilds: Array<SeGuild> = this.guilds.value;
        for(let j = 0; j < guilds.length; j++){
            let guild = guilds[j];
            for(let i = 0; i < guild.members.length; i++){
                guild.members[i].contribute_week = 0;
                guild.members[i].contribute_week_time = Date.now();
            }
            this.guilds.set(j, guild);
        }
    }
    //每日刷新的任务
    static checkGuildTask() {
        let guilds: Array<SeGuild> = this.guilds.value;
        for(let j = 0; j < guilds.length; j++){
            let guild = guilds[j];
            //每日刷新的任务
            if(TeDate.Isdiffday(guild.refresh_time)){
                guild.task_id = [];
                guild.task_info = {};
                guild.refresh_time = Date.now();
                this.guilds.set(j, guild);
            }
        }
    }
     //发送到期的换卡卡申请,到期的捐卡申请
    static checkGuildInfo() {
        let guilds: Array<SeGuild> = this.guilds.value;
        for(let j = 0; j < guilds.length; j++){
            let guild = guilds[j];
            //该渠道逻辑服未连上时，不处理
            if(!guildService.plt_init[guild.plt]) {
                // console.error('' + JSON.stringify(guildService.plt_init) + 'xxx'+ Date.now() + guild.plt)
                continue;
            }
            //发送到期的换卡卡申请
            this.checkExchange(guild);
            //到期的捐卡申请
            this.checkHelp(guild);
            this.guilds.set(j, guild);
        }
    }

    static checkExchange(guild: SeGuild, force: boolean = false, uid?: number){
        if(!guild.exchange_record) guild.exchange_record = [];
        let refresh = false;
        // console.log('checkExchange : ' + guild.id + ' ' + guild.exchange_record.length);
        for(let i = 0; i < guild.exchange_record.length; i++){
            let exchange_record = guild.exchange_record[i];
            if(Date.now() > exchange_record.time + 12 * 60 * 60 * 1000  || (force && exchange_record.asker.id == uid)){
                let itemId = this.exchange_currency[resMgrInst('sdw').UnitRes.getRes(exchange_record.use_card[0].heroId).iColour];
                this.sendAddDelCard(guild.plt, exchange_record.asker.id, exchange_record.use_card, [], [{itemId: itemId, count: 1}], [], SeEnumGuildItemReason.cancel_exchange);
                //删除记录
                console.error('del exchange :' + JSON.stringify(exchange_record));
                guild.exchange_record.splice(i,1);
                i--;
                refresh = true;
            }
        }
        if(refresh){
            let data = {
                cmd: 'update_guild_params',
                uid: uid,
                guild_id: guild.id,
                param: ['exchange_record'],
                value: [guild.exchange_record],
            }
            this.noticeAll(guild.plt, SeEnumGuildTitle.normal, guild.id, data);
        }
    }

    static checkHelp(guild: SeGuild, force: boolean = false, uid?: number){
        let help_cd = resMgrInst('sdw').getConfig('TM_request_CD');
        if(help_cd){
            let refresh = false;
            for(let i = 0; i < guild.help_record.length; i++){
                let help_record = guild.help_record[i];
                let res = resMgrInst('sdw').UnitRes.getRes(help_record.heroId);
                if(Date.now() > help_record.time + parseInt(help_cd.split(',')[res.iColour - 1]) * 60 * 60 * 1000 || (force && help_record.asker.id == uid)){
                    let count_all = 0;
                    for(let j = 0; j < help_record.helper.length; j++){
                        count_all += help_record.helper[j].count;
                    }
                    help_record.count = count_all;
                    if(help_record.count > 0){
                        this.sendHelpCard(guild.plt, help_record);
                    }
                    //删除记录
                    guild.help_record.splice(i,1);
                    i--;
                    refresh = true;
                }
            }
            if(refresh){
                let data = {
                    cmd: 'update_guild_params',
                    uid: uid,
                    guild_id: guild.id,
                    param: ['help_record'],
                    value: [guild.help_record],
                }
                this.noticeAll(guild.plt, SeEnumGuildTitle.normal, guild.id, data);
            }
        }
    }

    static checkSeason() {
        // 检查一下当前的赛季是否是正确的
        var curr = Date.now();
        var pkRes = resMgrInst('sdw').SeasonRes.getRes(this.season_id);
        if (pkRes && pkRes.kEndTime) {
            if (curr > (new Date(pkRes.kEndTime)).getTime() && pkRes.kNextID) {
                // 表示当前已经超过那个赛季了，开始了新的征程
                this.season_id = pkRes.kNextID;
                this.checkSeason();
            }
            else{
                //表示已经是当前赛季，重置荣耀积分等
                let guilds = this.guilds.value;
                for(let i = 0; i < guilds.length; i++){
                    if(guilds[i].season_id != this.season_id){
                        guilds[i].glory_all = 0;
                        guilds[i].season_id = this.season_id;
                        //保存
                        this.guilds.set(i, guilds[i]);
                    }
                }
            }
        }
        else if(!pkRes){
            this.season_id = "S001";
        }
    }
    //检查到期的入会申请
    static checkApplyRecord() {
        let guilds: Array<SeGuild> = this.guilds.value;
        for(let j = 0; j < guilds.length; j++){
            let guild = guilds[j];
            //该渠道逻辑服未连上时，不处理
            if(!guildService.plt_init[guild.plt]) continue;
            if(!guild.apply_members) guild.apply_members = [];
            for(let i = 0; i < guild.apply_members.length; i++){
                let apply_members = guild.apply_members[i];
                if(Date.now() > apply_members.apply_time + 24 * 60 * 60 * 1000){//TODO 24小时
                    //直接拒绝
                    //通知玩家
                    let data = {
                        cmd: 'guild_opr_ret',
                        type: 'join_ret',
                        uid: apply_members.id,
                        guild_id: guild.id,
                        guild_name: guild.name,
                        send_mail: true,
                        success: false,
                        out_time: true,
                    }
                    onlineService.send_to_uid(guild.plt, data.uid, data, true);
                    guild.apply_members_length--;
                    guild.apply_members.splice(i,1);
                    i--;
                }
            }
            this.guilds.set(j, guild);
        }
    }

    static checkAuthority(guild: SeGuild, uid: number, action: SeEnumAuthoryty, title?: SeEnumGuildTitle){
        if(!title){
            for(let i = 0; i < guild.members.length; i++){
                let members = guild.members[i];
                if(members.id == uid){
                    title = members.title
                }
            }
        }
        let res = resMgrInst('sdw').GuildAuthorityRes.getRes(title);
        if(res && res[action] == 1) return true;
        return false;
    }

    //30天不上线的自动解散
    static checkLonelyGeneral(){
        let guilds: Array<SeGuild> = this.guilds.value;
        for(let j = 0; j < guilds.length; j++){
            let guild = guilds[j];
            //该渠道逻辑服未连上时，不处理
            if(!guildService.plt_init[guild.plt]) continue;
            if(guild.members.length == 1 && Date.now() - guild.general_last_login > 30 * 24 * 60 * 60 * 1000){
                guild.is_close = true;
                this.guilds.set(j, guild);
                let data = {
                    cmd: 'guild_opr_ret',
                    type: 'quit_ret',
                    uid: guild.members[0].id,
                    quite_time: Date.now(),
                }
                onlineService.send_to_uid(guild.plt, data.uid, data);
            }
        }
    }
}