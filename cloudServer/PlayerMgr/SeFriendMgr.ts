import { SePlayer } from "./SePlayer";
import { iApp } from "../app";
import { ifFriendInfo, SeMailType, TaskAction, if_plt_friends } from "../SeDefine";
import { SePvpInfo } from './SePlayerDef';
import { TeDate } from '../TeTool';
import { configInst } from "../lib/TeConfig";
declare var global: iApp;
export class SeFriendMgr {
    private _parent: SePlayer;

    private _friends: ifFriendInfo[] = [];
    private _applys: ifFriendInfo[] = [];

    private _plt_friends: ifFriendInfo[] = [];

    private _temp_key: string;

    constructor(_parent: SePlayer) {
        this._parent = _parent;
        this._temp_key = 'tempcheckkey';
    }

    private get dailyInfo() {
        return this._parent.dailyInfo;
    }

    find_friend(uid: number) {
        for (var i = 0; i < this._friends.length; i++) {
            var r = this._friends[i];
            if (r && r.kID == uid) {
                return r;
            }
        }

        for (var i = 0; i < this._plt_friends.length; i++) {
            var r = this._plt_friends[i];
            if (r && r.kID == uid) {
                return r;
            }
        }

        return null;
    }

    find_apply(uid: number) {
        for (var i = 0; i < this._applys.length; i++) {
            var r = this._applys[i];
            if (r && r.kID == uid) {
                return r;
            }
        }

        return null;
    }

    del_uid(uid: number) {
        for (var i = 0; i < this._friends.length; i++) {
            var r = this._friends[i];
            if (r && r.kID == uid) {
                this._friends.splice(i, 1);
                break;
            }
        }

        for (var i = 0; i < this._applys.length; i++) {
            var r = this._applys[i];
            if (r && r.kID == uid) {
                this._applys.splice(i, 1);
                break;
            }
        }
    }

    //--------------------------------------//

    /**
     * 加载玩家信息
     */
    loadInfo() {
        global.matchMgr.fd_loadInfo(this._parent.id, this.plt_friend_uids);
    }

    /**
    * 获取提交给好友服务器的自身信息
    */
    get f_state() {
        let data = {
            uid: this._parent.id,
            kID: this._parent.id,
            state: this._parent.state,
            ipvpscore: this._parent.pvp_score,
            ipvplevel: this._parent.pvp_level,
            kname: this._parent.name,
            kicon: this._parent.icon,
            ilevel: this._parent.level,
            ksid: this._parent.pvpMgr.seasonid,
            avatar: this._parent.avatar,
        } as ifFriendInfo;
        data.avatar['is_vip'] = this._parent.baseInfo.is_vip;
        data.avatar['vip_level'] = this._parent.baseInfo.vip_level;
        return data;
        [].find()

    }

    upload_when_create() {
        global.matchMgr.fd_PlayerState({
            uid: this._parent.id,
            kID: this._parent.id,
            state: this._parent.state,
            ipvpscore: 1400,
            ipvplevel: 1,
            kname: this._parent.name,
            kicon: this._parent.icon,
            ilevel: 1,
            ksid: global.playerMgr.curr_season_id,
            avatar: {
                vip: 0,
                iconid: '',
                is_vip: this._parent.baseInfo.is_vip,
                vip_level: this._parent.baseInfo.vip_level,
            },
            create:true,

        } as ifFriendInfo)
    }

    upload_state() {
        global.matchMgr.fd_PlayerState(this.f_state)
        // 抄送一份给自己 如果还在线的话
        this.send_to_player('friend_state', { f: { kID: this._parent.id, state: this._parent.state } });
    }

    //-------------------处理数据----------------------//

    /**
     * 初始化好友信息
     * @param f
     */
    init_friend_infos(f: { f, a }) {
        this._friends = f.f;
        this._applys = f.a;
        this.send_to_player('init', { infos: f });
    }

    /**
     * 好友操作服务器返回状态
     * @param f
     */
    friend_opr_ret(f: { type: string, succ: boolean, r_data: any }) {
        if (f.type == 'route_friend') {
            if (f.r_data && !f.succ) {
                if (f.r_data.type == 'send_friend_key') {
                    // 如果赠送失败，那么就说明对方不在线，离线直接送掉
                    let friendgift = global.resMgr.getConfig('friendgift').split(',');
                    let item = { kItemID: friendgift[0], iPileCount: parseInt(friendgift[1]) || 1 };
                    if (item.kItemID) {
                        global.playerMgr.onGiveMail(this._parent.plt, f.r_data['fuid'], SeMailType.FriendKey, f.r_data['fname'] + '赠送了你一把钥匙', [item], 0, f.r_data['uid'], TeDate.ToDate24(Date.now()));
                    }
                    return;
                }
            }

            this.send_to_player('route_friend_opt_ret', { infos: f });
        }
        else if (f.type == 'clear_make_player_apply') {
            this.send_to_player('clear_make_player_apply', { succ: f.succ });
        }
    }

    wx_friend_opr_ret(wxFriendInfos: any[]) {
        this.send_to_player('initWx', { infos: wxFriendInfos });
    }

    friend_route_ret(f: any) {
        switch (f.type) {
            case 'ask_apply': {
                // 申请添加某人好友
                if (f.from_data) {
                    this._applys.push(f.from_data);
                }

                break;
            }
            case 'del_friend': {
                if (f.fuid) this.del_uid(f.fuid);
                break;
            }
            case 'make_friend': {
                if (f.finfo) {
                    this.del_uid(f.fuid);
                    this._friends.push(f.finfo);
                }
                break;
            }
            case 'send_friend_key': {
                // 收到送钥匙的
                let friendgift = global.resMgr.getConfig('friendgift').split(',');
                let item = { kItemID: friendgift[0], iPileCount: parseInt(friendgift[1]) || 1 };
                if (item.kItemID) {
                    global.playerMgr.onGiveMail(this._parent.plt, this._parent.id, SeMailType.FriendKey, f.fname + '赠送了你一把钥匙', [item], 0, f.fuid, TeDate.ToDate24(Date.now()));
                }
                break;
            }
        }

        this.send_to_player(f.type, f);
    }

    /**
     * 查找好友返回
     * @param f
     */
    find_friend_ret(f: ifFriendInfo) {
        this.send_to_player('find_player', { infos: f });
    }

    upload_route_friend(targetid: number, type: string, info = {}) {
        info['type'] = type;
        global.matchMgr.fd_route_friend(this._parent.id, targetid, info);
    }

    upload_route_wx_friend(type: string, wxuids: string[], info = {}) {
        info['type'] = type;
        info['wxuids'] = wxuids;
        global.matchMgr.fd_route_wx_friend(this._parent.id, info);
    }

    private max_friend_count = 100;

    //----------------前端数据接收-------------------//
    /**
     * 玩家操作
     * @param type
     * @param data
     */
    friend_opr(type: string, data) {
        switch (type) {
            case 'ask_apply': {
                // 申请添加某人好友
                if (this._friends.length >= this.max_friend_count) return;
                if (this._applys.indexOf(data.uid) >= 0) return;
                if (this.find_friend(data.uid)) return;

                this.upload_route_friend(data.uid, 'ask_apply', { cttime: Date.now() });
                break;
            }
            case 'sure_apply': {
                // 同意添加好友,告诉对方这个好消息
                // this.upload_route_friend(data.uid, 'sure_apply', { cttime: Date.now() });
                global.matchMgr.fd_make_friend(this._parent.id, data.uid);
                break;
            }
            case 'del_friend': {
                if (!this.find_friend(data.uid) && !this.find_apply(data.uid)) return;
                global.matchMgr.fd_delete_friend(this._parent.id, data.uid);
                break;
            }
            case 'find_uid': {
                // if (this.find_friend(data.uid)) return;

                global.matchMgr.fd_find_friend(this._parent.id, data.uid);
                break;
            }
            case 'send_friend_key': {
                // 送人钥匙的操作
                // 检查是否赠送过
                if (this.dailyInfo.daily_friend_send.indexOf(data.uid) >= 0) {
                    return;
                }

                if (this.dailyInfo.daily_friend_send.length > this.max_send_key) {
                    return;
                }

                this._parent.taskAction(TaskAction.GiveKey);

                this.dailyInfo.daily_friend_send.push(data.uid);
                this._parent.updateDailyInfo();

                global.matchMgr.fd_route_friend(this._parent.id, data.uid, { type: 'send_friend_key', guid: this._parent.id, fname: this._parent.name });

                break;
            }
            case 'clear_make_player_apply': {
                // 清理申请列表
                global.matchMgr.clear_make_player_apply(this._parent.id);
                break;
            }
            case 'getFriendInfo': {
                // 刷新微信好友
                this.upload_route_wx_friend('get_wx_friend_info', data.wxuids, { cttime: Date.now() });
                break;
            }
            default: {
                //2v2邀请组队可以不是好友
                if (type != 'ask_game' && type != 'anser_game' && !this.find_friend(data.uid)) return;

                global.matchMgr.fd_route_friend(this._parent.id, data.uid, data);
                break;
            }
        }
    }

    _Max_send_key = 5;
    _Max_vip_send_key = 10;
    _Max_recive_key = 5;
    _Max_vip_recive_key = 10;

    get max_recive_key() {
        if (this._parent.isMonthVip) {
            return this._Max_recive_key;
        }
        else {
            return this._Max_recive_key;
        }
    }

    get max_send_key() {
        if (this._parent.isMonthVip) {
            return this._Max_send_key;
        }
        else {
            return this._Max_send_key;
        }
    }

    send_to_player(type: string, infos: {}) {
        infos['type'] = type;
        infos['cmd'] = 'update_friends';
        global.netMgr.sendData(infos, this._parent.linkid);
        // console.error(this._parent.id + ' ' + JSON.stringify(infos));
    }


    /*-----------------------平台好友--------------------------*/

    get _plt_ext_friends() {
        if (this._parent._extInfo && this._parent._extInfo.info && this._parent._extInfo.info.friends) {
            return this._parent._extInfo.info.friends;
        }

        return [];
    }

    get plt_friend_uids() {
        var _plt_ext_friends = this._plt_ext_friends;
        var out = [];
        for (var i = 0; i < _plt_ext_friends.length; i++) {
            var r = _plt_ext_friends[i];
            if (r && r.uid) out.push(r.uid);
        }

        return out;
    }

    /**
     * 加载第三方好友
     */
    load_plt_friend() {
        // 加载了第三方好友后，当前的加载状态，如果是未加载完成的，那么跳过，否则发起加载好友信息
        if (this._parent.loadComplete && this.plt_friend_uids.length > 0) {
            global.matchMgr.fd_load_plt_friends(this._parent.id, this.plt_friend_uids);
        }
    }

    /**
    * 初始化好友信息
    * @param f
    */
    init_plt_friend_infos(f: { f, a }) {
        this._plt_friends = f.f || [];
        this.send_to_player('init_plt_friend', { infos: this._plt_friends });
    }

}
