"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameVerMgr = void 0;
const TeConfig_1 = require("../lib/TeConfig");
const serverMgr_1 = require("../NetMgr/serverMgr");
const ResModule_1 = require("../lib/ResModule");
/**
 * 游戏版本控制，这里控制是否可以登陆游戏
 */
class GameVerMgr {
    constructor() {
        this.gameServerRes = new ResModule_1.SeResModule('GameServer.json');
    }
    static get inst() {
        if (!this._inst_)
            this._inst_ = new GameVerMgr();
        return this._inst_;
    }
    allplts() {
        let plts = [];
        let allRes = this.gameServerRes.getAllRes();
        for (let key in allRes) {
            plts.push(allRes[key].kPlt.toString());
        }
        return plts;
    }
    _up_value_(v) {
        if (v == "null")
            return null;
        return v;
    }
    _get_number(v) {
        try {
            let up = this._up_value_(v.toString());
            return parseFloat(up || '0');
        }
        catch (e) {
            return 0;
        }
    }
    check_pltarea_state(suid, plt, appid) {
        let uid = 0;
        if (typeof suid == 'number') {
            uid = suid;
        }
        else {
            uid = this._get_number(suid);
        }
        let out = {};
        let allRes = this.gameServerRes.getAllRes();
        for (let key in allRes) {
            let serverres = allRes[key];
            if (plt && serverres.kPlt.toString().indexOf(plt) != 0)
                continue;
            if (appid && serverres.kappid != appid)
                continue;
            let r_info = { url: '', limit: true, bnew: false, name: serverres.kName, recommended: false, iStayTime: 0 };
            if (serverres.iIsNew)
                r_info.bnew = true;
            if (serverres.iIsRecommended)
                r_info.recommended = true;
            if (serverres.iStayTime)
                r_info.iStayTime = serverres.iStayTime;
            // 判断是否有url存在
            r_info.url = serverMgr_1.serverMonitInst.get_minimum_num_ip_by_type('cls', serverres.kPlt).url;
            if (r_info.url) {
                // 有服务器开着的时候就判断是否登陆限制
                let plt_path = 'limit_plt.' + serverres.kPlt;
                let limit_plt = TeConfig_1.configInst.get(plt_path);
                // 在需要检查的平台里才检查
                if (limit_plt && uid && TeConfig_1.configInst.get(plt_path + '.login_limit')) {
                    // 如果开启了限制登陆模式，那么只有特定的id可以进入
                    var uids = TeConfig_1.configInst.get(plt_path + '.login_limit_ids') || [];
                    if (uids.indexOf(uid) >= 0) {
                        r_info.limit = false;
                    }
                }
                else {
                    r_info.limit = false;
                }
            }
            out[serverres.kPlt] = r_info;
        }
        return out;
    }
    check_login_limit(suid, sver, plt) {
        let uid = 0;
        let ver = 0;
        if (typeof suid == 'number') {
            uid = suid;
        }
        else {
            uid = this._get_number(suid);
        }
        if (typeof sver == 'number') {
            ver = sver;
        }
        else {
            ver = this._get_number(sver);
        }
        let plt_path = 'limit_plt.' + plt;
        let limit_plt = TeConfig_1.configInst.get(plt_path);
        if (limit_plt) {
            // 在需要检查的平台里才检查
            if (uid) {
                if (TeConfig_1.configInst.get(plt_path + '.login_limit')) {
                    // 如果开启了限制登陆模式，那么只有特定的id可以进入
                    var uids = TeConfig_1.configInst.get(plt_path + '.login_limit_ids') || [];
                    if (uids.indexOf(uid) < 0) {
                        return TeConfig_1.configInst.get(plt_path + '.notice') || 'server busy';
                    }
                }
            }
            if (ver) {
                // 检查玩家版本号是否合法
                if (ver < TeConfig_1.configInst.get(plt_path + '.limit_ver')) {
                    return 'ver_old';
                }
            }
        }
        return '';
    }
}
exports.GameVerMgr = GameVerMgr;
//# sourceMappingURL=GameVerMgr.js.map