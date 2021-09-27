import { Match_Proc } from "../../NetMgr/matchProc";
import { if_sys_, SeEnumGuildChatType } from "../../SeDefine";
import { guildService } from "../mgrServices/guildService";
import { serverMgrInst } from "../../serverMgr";
import { netInst } from "../../NetMgr/SeNetMgr";
import { onlineService } from "../mgrServices/onlineService";

Match_Proc.regist_proc('guild_opr', function (nid: string, data: any) {
    let _sys_ = data._sys_;
    if(!guildService.ready){
        console.error("guildService no ready");
        return;
    }
    if(!guildService.plt_init[data._sys_.plt]){
        netInst.sendData({
            cmd: 'needregist',
        }, serverMgrInst.get_server(_sys_.serverid).nid);
        console.error(Date.now() + "plt regist no ready" + data._sys_.plt);
    }
    switch (data.type) {
        // 1v1 直接开战 这个目前是好友约战
        case "creat": {
            guildService.createGuild(data._sys_, data.uid, data.name, data.icon, data.announcement, data.need_approve, data.need_level, data.user_info);
            break;
        }
        case "update": {
            guildService.updateGuild(data._sys_, data.uid, data.id, data.param, data.value);
            break;
        }
        case "list": {
            guildService.getGuildList(data._sys_, data.uid);
            break;
        }
        case "chart": {
            guildService.getGuildChart(data._sys_, data.uid);
            break;
        }
        case "chat": {
            guildService.guildChat(data._sys_, data.uid, data.id, data.chat_text, SeEnumGuildChatType.nomal, [], [data.user_info.id], data.user_info);
            break;
        }
        case "ask_help": {
            guildService.ask_help(data._sys_, data.uid, data.id, data.heroId, data.count, data.user_info);
            break;
        }
        case "help": {
            guildService.help(data._sys_, data.uid, data.id, data.ask_uid, data.heroId, data.count, data.user_info);
            break;
        }
        case "ask_exchange": {
            guildService.ask_exchange(data._sys_, data.uid, data.id, data.use_card, data.heroId, data.count, data.user_info);
            break;
        }
        case "exchange": {
            guildService.exchange(data._sys_, data.uid, data.id, data.ask_uid, data.use_card, data.get_card, data.time, data.user_info);
            break;
        }
        case "cancel_exchange": {
            guildService.cancel_exchange(data._sys_, data.uid, data.id, data.ask_uid, data.time, data.user_info);
            break;
        }
        case "detail": {
            guildService.getGuildDetail(data._sys_, data.uid, data.id);
            break;
        }
        case "apply": {
            guildService.applyGuild(data._sys_, data.uid, data.id, data.apply_text, data.user_info);
            break; 
        }
        case "deal_apply": {
            guildService.deal_apply(data._sys_, data.uid, data.id, data.apply_id, data.approve);
            break;
        }
        case "del_apply_info": {
            guildService.del_apply_info(data._sys_, data.uid, data.ids);
            break;
        }
        case "quite": {
            guildService.quite(data._sys_, data.uid, data.id, '', null);
            break;
        }
        case "kick": {
            guildService.kick(data._sys_, data.uid, data.id, data.opr_uid);
            break;
        }
        case "appoint": {
            guildService.appoint(data._sys_, data.uid, data.id, data.opr_uid, data.title, data.user_info);
            break;
        }
        case "add_glory_score": {
            guildService.addGloryScore(data._sys_, data.id, data.score);
            break;
        }
        case "apply_general": {
            guildService.applyGeneral(data._sys_, data.uid, data.id);
            break;
        }
        case "cancel_quite": {
            guildService.cancel_quite(data._sys_, data.uid, data.id);
            break;
        }
        case "complete_task": {
            guildService.complete_task(data._sys_, data.uid, data.id, data.taskId, data.user_info);
            break;
        }
        case "add_task_value": {
            guildService.add_task_value(data._sys_, data.id, data.taskId, data.value, data.user_info);
            break;
        }
        case "get_task_id": {
            guildService.get_task_id(data._sys_, data.uid, data.id);
            break;
        }
        case "get_task_info": {
            guildService.get_task_info(data._sys_, data.uid, data.id, data.taskIds);
            break;
        }
        case "contribute": {
            guildService.contribute(data._sys_, data.uid, data.id, data.count, data.user_info);
            break;
        }
        case "up_level": {
            guildService.up_level(data._sys_, data.uid, data.id);
            break;
        }
        case "invite": {
            guildService.invite(data._sys_, data.opr_uid, data.id, data.user_info);
            break;
        }
        case "checkGuildName": {
            guildService.checkGuildName(data._sys_, data.uid, data.name, data.subtype, data.send_data);
            break;
        }
        default: {
            guildService.resetUnitState(data.uid, data._sys_);
        }
    }
},__filename);

Match_Proc.regist_proc('up_state', function (nid: string, data: any) {
    let _sys_ : if_sys_ = data._sys_;
    onlineService.update_state(_sys_, nid, data);
},__filename);