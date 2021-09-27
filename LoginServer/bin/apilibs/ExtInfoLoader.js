"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QzoneManagerInst = void 0;
const qzone_1 = require("./qzone");
const TeTool_1 = require("../lib/TeTool");
const GMMgr_1 = require("../mgr/GMMgr");
const NetMgr_1 = require("../NetMgr/NetMgr");
const OnlinePlayer_1 = require("../mgr/OnlinePlayer");
const serverMgr_1 = require("../NetMgr/serverMgr");
var LoadFlag;
(function (LoadFlag) {
    LoadFlag[LoadFlag["LF_vip"] = 1] = "LF_vip";
    LoadFlag[LoadFlag["LF_friends"] = 2] = "LF_friends";
    LoadFlag[LoadFlag["LF_friends_uid"] = 4] = "LF_friends_uid";
    LoadFlag[LoadFlag["LF_FRIENDED"] = 6] = "LF_FRIENDED";
    LoadFlag[LoadFlag["LF_COMPLETE"] = 7] = "LF_COMPLETE";
})(LoadFlag || (LoadFlag = {}));
class QBaseInfo {
}
class QzoneManager {
    constructor() {
        this._apiInstMap = new TeTool_1.TeMap();
        this._uid_catch_ = new TeTool_1.TeMap();
        this.debug = false;
        this._forceid_ = { '4C31B8D4B2D4D618AD8C7F8F6D35D471': 4118528813237795 };
        var rr = new qzone_1.QZoneApi();
        this._apiInstMap.set('qzone', rr);
        var keys = this._apiInstMap.keys;
        for (var i = 0; i < keys.length; i++) {
            var rk = this._apiInstMap.get(keys[i]);
            if (rk)
                rk.system_recall = this.system_recall.bind(this, keys[i]);
        }
    }
    get_api_inst(plt) {
        return this._apiInstMap.get(plt);
    }
    callfunc(plt, funcstr, ...args) {
        var r = this._apiInstMap.get(plt);
        if (r && typeof r[funcstr] == 'function') {
            r[funcstr](...args);
            return true;
        }
        return false;
    }
    loadInfos(_sys_, uid, openid, token) {
        if (this.debug) {
            // writeFileSync("apiuse.log", `${uid},${openid},${token},\n`, { flag: "a+" });
            NetMgr_1.netMgrInst.sendExtInfo(_sys_.serverid, uid, {});
        }
        else {
            var r = GMMgr_1.redistInst.getHashMember('qzoneidmap', openid);
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
        let link = serverMgr_1.serverMonitInst.get_server_link_by_type('cp_ls', 'none');
        if (link) {
            NetMgr_1.netMgrInst.sendData({
                cmd: 'qzone_load',
                uid: uid,
                openid: openid,
                token: token
            }, link);
        }
    }
    _load_openid_2_uid_(plt, uid, openids) {
        var qids = [];
        for (var i = 0; i < openids.length; i++) {
            qids.push(JSON.stringify(openids[i]));
        }
        GMMgr_1.redistInst.HMGet('qzoneidmap', qids, (e, r) => {
            // console.log(r);
            var out = {};
            for (var i = 0; i < openids.length; i++) {
                out[openids[i]] = parseInt(r[i]) || 0;
            }
            this.system_recall(plt, 'openid_2_uid', uid, 0, '', out);
        });
    }
    check_gift_code(plt, checkapi, uid, openid, openkey, code, ...args) {
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
        let link = serverMgr_1.serverMonitInst.get_server_link_by_type('cp_ls', 'none');
        if (link) {
            NetMgr_1.netMgrInst.sendData({
                cmd: 'qzone_gift',
                args: [plt, checkapi, uid, openid, openkey, code, ...args]
            }, link);
        }
    }
    system_recall(plt, apiname, uid, retcode, msg, ...args) {
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
                    var friends = args[0];
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
                    var friend_details = args[0];
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
    _check_complete_(uid) {
        var rInfo = this._uid_catch_.get(uid);
        var sid = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(uid, 'qzone');
        if (!rInfo || rInfo.checked) {
        }
        else if (rInfo.loadflag == LoadFlag.LF_COMPLETE) {
            rInfo.checked = true;
            // 加载完成了发给对应的大区玩家
            NetMgr_1.netMgrInst.sendExtInfo(sid, rInfo.uid, rInfo);
            this._uid_catch_.del(uid);
        }
    }
    send_gamebar_msg(_sys_, uid, openid, openkey, frd, msgtype, content, qua = 'V1_AND_QZ_4.9.3_148_RDM_T') {
        this.callfunc(_sys_.plt, 'send_gamebar_msg', uid, openid, openkey, frd, msgtype, content, qua);
    }
    test() {
        // this.loadInfos(0, '6317A2A410FF9897F3AF26DE7CF40258', 'C8277226EB95A36549D91A6CEA982DA6');
        // this.apiInst.system_test_call();
    }
}
exports.QzoneManagerInst = new QzoneManager();
//# sourceMappingURL=ExtInfoLoader.js.map