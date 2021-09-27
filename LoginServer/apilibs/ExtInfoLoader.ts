import { QZoneApi } from "./qzone";
import { TeMap, if_sys_ } from '../lib/TeTool';
import { redistInst } from '../mgr/GMMgr';
import { netMgrInst } from '../NetMgr/NetMgr';
import { onlineMgrInst } from "../mgr/OnlinePlayer";
import { ApiBase } from "./apibase";
import { serverMonitInst } from "../NetMgr/serverMgr";

enum LoadFlag {
    LF_vip = 1 << 0,
    LF_friends = 1 << 1,
    LF_friends_uid = 1 << 2,
    LF_FRIENDED = LF_friends | LF_friends_uid,
    LF_COMPLETE = LF_vip | LF_friends | LF_friends_uid
}

interface if_friends {
    uid?: number,
    openid: string,//	好友QQ号码对应的openid。
    nickname: string,//	昵称。
    figureurl: string//	头像URL。详见：前端页面规范#6. 关于用户头像的获取和尺寸说明。
    is_yellow_vip: number,//	是否为黄钻用户（0：不是； 1：是）。
    is_yellow_year_vip: number,//	是否为年费黄钻用户（0：不是； 1：是）。
    yellow_vip_level: number,//	黄钻等级（如果是黄钻用户才返回此字段）。
    is_yellow_high_vip: number,//	是否为豪华版黄钻用户（0：不是； 1：是）。（当pf=qzone、pengyou或qplus时返回）
    gender: string,//	用户性别。
    city: string,//	用户所在的城市。
    province: string,//	用户所在的省。
    country: string,//	用户所在的国家。
}

class QBaseInfo {
    uid: number;

    openid: string;
    openkey: string;
    loadflag: number;
    checked: boolean;

    friend_openids?: string[];

    info: {
        vipinfo?: if_get_vip_level;
        friends?: if_friends[];
    }

}

interface if_get_vip_level {
    ret: number,//	返回码
    msg: number,//	如果错误，返回错误信息。
    score: number,//	当前VIP成长值
    level: number,//	当前VIP等级
    score_begin: number,//	当前等级所需VIP成长值
    score_next: number,//	下一等级升级所需VIP成长值
    score_persent: number,//	升级百分比
    is_vip: number,//	是否点亮VIP图标
    pay_fee_min: number,//	当前等级每月点亮VIP图标所需消费
    pay_fee_mon: number,//	当月消费
}

class QzoneManager {
    private _apiInstMap: TeMap<ApiBase> = new TeMap<ApiBase>();
    private _uid_catch_: TeMap<QBaseInfo> = new TeMap<QBaseInfo>();

    private debug = false;

    get_api_inst(plt: string) {
        return this._apiInstMap.get(plt);
    }

    callfunc(plt: string, funcstr: string, ...args) {
        var r = this._apiInstMap.get(plt);
        if (r && typeof r[funcstr] == 'function') {
            r[funcstr](...args);
            return true;
        }

        return false;
    }

    constructor() {
        var rr = new QZoneApi();
        this._apiInstMap.set('qzone', rr);

        var keys = this._apiInstMap.keys;
        for (var i = 0; i < keys.length; i++) {
            var rk = this._apiInstMap.get(keys[i]);
            if (rk) rk.system_recall = this.system_recall.bind(this, keys[i]);
        }
    }

    loadInfos(_sys_: if_sys_, uid: number, openid: string, token: string) {
        if (this.debug) {
            // writeFileSync("apiuse.log", `${uid},${openid},${token},\n`, { flag: "a+" });
            netMgrInst.sendExtInfo(_sys_.serverid, uid, {});
        }
        else {
            var r = redistInst.getHashMember('qzoneidmap', openid);
            r.save(uid);

            //  CP_Inst.save_openid_uid(openid, uid);

            this._uid_catch_.set(uid, {
                openid: openid,
                openkey: token,
                uid: uid,
                loadflag: 0,
                checked: false,
                friend_openids: [],
                info: { friends: [] }
            });
            this.callfunc(_sys_.plt, 'get_vip_level', uid, openid, token);

            this.callfunc(_sys_.plt, 'get_app_friends', uid, openid, token);
        }

        // 抄送给观察者
        let link = serverMonitInst.get_server_link_by_type('cp_ls', 'none');
        if (link) {
            netMgrInst.sendData({
                cmd: 'qzone_load',
                uid: uid,
                openid: openid,
                token: token
            }, link);
        }
    }

    private _load_openid_2_uid_(plt: string, uid: number, openids: string[]) {
        var qids = [];
        for (var i = 0; i < openids.length; i++) {
            qids.push(JSON.stringify(openids[i]));
        }

        redistInst.HMGet('qzoneidmap', qids, (e, r) => {
            // console.log(r);
            var out = {};
            for (var i = 0; i < openids.length; i++) {
                out[openids[i]] = parseInt(r[i]) || 0;
            }
            this.system_recall(plt, 'openid_2_uid', uid, 0, '', out);
        })
    }

    public check_gift_code(plt: string, checkapi: string, uid: number, openid: string, openkey: string, code: string, ...args) {
        /*uid: number, openid: string, openkey: string, gift_id*/
        if (this.debug) {
            let cb = args[0];
            if (typeof cb == 'function') {
                cb(100);
            }
        }
        else {
            this.callfunc(plt, checkapi, uid, openid, openkey, code, ...args);
        }

        // 抄送给观察者
        let link = serverMonitInst.get_server_link_by_type('cp_ls', 'none');
        if (link) {
            netMgrInst.sendData({
                cmd: 'qzone_gift',
                args: [plt, checkapi, uid, openid, openkey, code, ...args]
            }, link);
        }
    }

    private system_recall(plt: string, apiname: string, uid: number, retcode: number, msg: string, ...args) {
        var rInfo = this._uid_catch_.get(uid);
        if (retcode != 0) {
            console.log(msg);
            switch (apiname) {
                case 'gift_exchange':
                    var finishcb = args[0];
                    if (typeof finishcb == 'function') {
                        finishcb(retcode);
                    }

                    break;

                case 'get_vip_level':
                    rInfo && (rInfo.loadflag |= LoadFlag.LF_vip);
                    break;

                case 'get_app_friends':
                    // 加载玩家的详细信息，加载玩家的游戏id
                    rInfo && (rInfo.friend_openids = []);
                // this.callfunc(plt, 'get_multi_info', rInfo.uid, rInfo.openid, rInfo.openkey, oppIds);
                case 'get_multi_info':
                    rInfo && (rInfo.info.friends = []);
                    rInfo && (rInfo.loadflag |= LoadFlag.LF_friends);
                // this._load_openid_2_uid_(plt, uid, rInfo.friend_openids);
                case 'openid_2_uid':
                    rInfo && (rInfo.loadflag |= LoadFlag.LF_friends_uid);
                    break;
            }
        }
        else {
            switch (apiname) {
                case 'get_vip_level':
                    rInfo && (rInfo.info.vipinfo = args[0]);
                    rInfo && (rInfo.loadflag |= LoadFlag.LF_vip);
                    break;

                case 'gift_exchange':
                    var finishcb = args[0];
                    if (typeof finishcb == 'function') {
                        finishcb(retcode);
                    }

                    break;

                // case 'report_battle_result':

                // case 'report_user_achievement':

                case 'get_app_friends':
                    // 加载玩家的详细信息，加载玩家的游戏id
                    var friends = args[0] as Array<{ openid: string }>;

                    var oppIds = [];
                    for (var i = 0; i < friends.length; i++) {
                        oppIds.push(friends[i].openid);
                    }
                    if (rInfo) {
                        rInfo.friend_openids = oppIds;

                        if (rInfo.friend_openids.length == 0) {
                            rInfo.loadflag |= LoadFlag.LF_friends;
                            rInfo.loadflag |= LoadFlag.LF_friends_uid;
                        }
                        else {
                            this.callfunc(plt, 'get_multi_info', rInfo.uid, rInfo.openid, rInfo.openkey, oppIds);
                        }
                    }
                    break;
                case 'get_multi_info':
                    var friend_details = args[0] as if_friends[];
                    if (rInfo) {
                        rInfo.info.friends = friend_details;
                        rInfo.loadflag |= LoadFlag.LF_friends;

                        this._load_openid_2_uid_(plt, uid, rInfo.friend_openids);
                    }
                    break;

                case 'send_gamebar_msg':
                    break;

                case 'openid_2_uid':
                    var idmap = args[0];
                    if (rInfo) {
                        for (var i = 0; i < rInfo.info.friends.length; i++) {
                            if (this._forceid_.hasOwnProperty(rInfo.info.friends[i].openid)) {
                                rInfo.info.friends[i].uid = this._forceid_[rInfo.info.friends[i].openid] || 0;
                            }
                            else {
                                rInfo.info.friends[i].uid = idmap[rInfo.info.friends[i].openid] || 0;
                            }

                        }
                        rInfo.loadflag |= LoadFlag.LF_friends_uid;
                    }
                    break;
            }
        }
        this._check_complete_(uid);
    }

    private _forceid_: Object = { '4C31B8D4B2D4D618AD8C7F8F6D35D471': 4118528813237795 };

    private _check_complete_(uid: number) {

        var rInfo = this._uid_catch_.get(uid);

        var sid = onlineMgrInst.getOnlinePlayerCSId(uid, 'qzone');

        if (!rInfo || rInfo.checked) {

        }
        else if (rInfo.loadflag == LoadFlag.LF_COMPLETE) {
            rInfo.checked = true;
            // 加载完成了发给对应的大区玩家

            netMgrInst.sendExtInfo(sid, rInfo.uid, rInfo);
            this._uid_catch_.del(uid);
        }
    }

    send_gamebar_msg(_sys_: if_sys_, uid: number, openid: string, openkey: string, frd: string, msgtype: number, content: string, qua: string = 'V1_AND_QZ_4.9.3_148_RDM_T') {
        this.callfunc(_sys_.plt, 'send_gamebar_msg', uid, openid, openkey, frd, msgtype, content, qua);
    }

    test() {
        // this.loadInfos(0, '6317A2A410FF9897F3AF26DE7CF40258', 'C8277226EB95A36549D91A6CEA982DA6');
        // this.apiInst.system_test_call();
    }
}

export var QzoneManagerInst = new QzoneManager();