import { TeMap } from "../../lib/TeTool";
import { if_sys_, CharState } from "../../SeDefine";
import { guildService } from "./guildService";
import { netInst } from "../../NetMgr/SeNetMgr";
import { serverMgrInst, DefineSType } from '../../serverMgr';

//管理同盟在线人员
interface ifOnlineMember {
    kID: number,
    sid?: string,
    state: string,
}

export interface onlineInfo{
    uid: number,
    sid?: string,
    state: string,
    guild_id: number,
    glory_score: number,
    pvp_level: number,
    pvp_score: number,
    peak_score: number,
    is_vip: boolean,
    vip_level: number,
    charname: string,
    level: number,
    avatar: any,
    icon: string,
}

export class onlineService {
    static plt_id(plt: string, uid: number) {
        return plt + '_' + uid;
    }
    /**
     * 存储玩家的状态和大区等动态信息
     */
    static _online_friends: TeMap<ifOnlineMember> = new TeMap<ifOnlineMember>();

     /**
     * 更新玩家状态
     * @param uid 
     * @param sid 
     * @param state 
     */
    static update_state(_sys_: if_sys_, sid: string, info: onlineInfo) {
        var player: ifOnlineMember;
        if (this._online_friends.has(this.plt_id(_sys_.plt, info.uid))) {
            player = this._online_friends.get(this.plt_id(_sys_.plt, info.uid));
            player.sid = sid;
            if (player.state == info.state) {
                return;
            }
            player.state = info.state;
        }
        else {
            player = {
                kID: info.uid,
                state: info.state,
                sid: sid
            }
        }

        if (info.state == CharState.offline) {
            // 玩家离线的时候需要特殊处理，删除掉玩家的在线信息
            this._online_friends.del(this.plt_id(_sys_.plt, info.uid));
        }
        else {
            this._online_friends.set(this.plt_id(_sys_.plt, info.uid), player);
        }
        //修改同盟里的在线状态
        guildService.setPlayerState(info.guild_id, info.uid, info.state, info.glory_score, info.pvp_level, info.pvp_score, info.peak_score, info.is_vip, info.vip_level, info.charname, info.level, info.avatar, info.icon);
        return true;
    }

    /**
    * 发送信息给玩家
    * offline 若离线是否随机找一个发送
    */
    static send_to_uid(plt: string, uid: number, info, offline: boolean = false) {
        var f = this._online_friends.get(this.plt_id(plt, uid));
        if (!f) {
            if(!offline) return false;
            else {
                 // 如果找不到就随机一个
                var linkids = serverMgrInst.get_all_server_by_type_and_plt(DefineSType.logic, plt);
                if (linkids.length > 0) {
                    netInst.sendData(info, linkids[0].nid);
                    return true;
                }
                else{
                    console.error('no plt: ' + plt + uid + ' data :' + JSON.stringify(info));
                }
            }
        }
        else{
            netInst.sendData(info, f.sid);
        }
        return true;
    }

    static is_online(plt: string, uid: number){
        var f = this._online_friends.get(this.plt_id(plt, uid));
        if (!f) return false;
        else return true;
    }
}
