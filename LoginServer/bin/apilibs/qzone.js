"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QZoneApi = void 0;
const crypto_1 = require("crypto");
const apibase_1 = require("./apibase");
const InviteCodeMgr_1 = require("../mgr/InviteCodeMgr");
const HTTPS = require("https");
const URL = require("url");
const querystring = require("querystring");
function http_get(url, cb) {
    try {
        let q = HTTPS.get(url, cb);
        q.setTimeout(10 * 1000, function () {
            // 增加一个超时机制
            cb(null);
        });
    }
    catch (e) {
        cb(null);
    }
}
function http_post(url, data, cb) {
    try {
        var contents = querystring.stringify(data);
        var ul = URL.parse(url);
        ul['method'] = 'POST';
        ul['headers'] = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': contents.length
        };
        var r = HTTPS.request(ul, cb);
        r.write(contents);
        r.end();
        r.setTimeout(10 * 1000, function () {
            // 增加一个超时机制
            cb(null);
        });
    }
    catch (e) {
        cb(null);
    }
}
class QZoneApi extends apibase_1.ApiBase {
    constructor() {
        super(...arguments);
        this._appkey = 'eFQKTSbYquMFgbJL';
        this._url = 'https://api.urlshare.cn';
        this._appid = '1106368231';
    }
    _makeQuery(qzon_api_name, info, cb, Methon = 'GET') {
        info['appid'] = this._appid;
        if (Methon == 'GET') {
            var url = this._url + qzon_api_name + '?sig=' + this.urlencode(this._makeSign(qzon_api_name, Methon, info));
            for (var key in info) {
                url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(info[key]);
            }
            http_get(url, this._onQueryBack.bind(this, cb));
        }
        else {
            var url = this._url + qzon_api_name + '?';
            info['sig'] = this._makeSign(qzon_api_name, Methon, info);
            var params = [];
            for (var key in info) {
                params.push(key + '=' + info[key]);
            }
            // http_post(this._url + qzon_api_name, JSON.stringify(params), this._onQueryBack.bind(this, cb));
            http_post(this._url + qzon_api_name, info, this._onQueryBack.bind(this, cb));
        }
    }
    _onQueryBack(cb, res) {
        if (!cb || !res)
            return;
        res.on('data', function (d) { this.__data__ = (this.__data__ || '') + d.toString(); });
        res.on('end', function (d) {
            if (cb) {
                try {
                    cb(null, JSON.parse(this.__data__));
                }
                catch (e) {
                    cb(e, null);
                }
            }
        });
    }
    _makeSign(qzon_api_name, method, params) {
        var queryArray = [];
        for (var key in params) {
            if (key != 'sig') {
                queryArray.push(key + '=' + params[key]);
            }
        }
        queryArray.sort(function (val1, val2) {
            if (val1 > val2) {
                return 1;
            }
            if (val1 < val2) {
                return -1;
            }
            return 0;
        });
        var busidataArr = [method, this.urlencode(qzon_api_name), this.urlencode(queryArray.join('&'))];
        var busiDataStr = busidataArr.join('&');
        var sig = crypto_1.createHmac('sha1', this._appkey + '&').update(busiDataStr).digest().toString('base64');
        return sig;
    }
    urlencode(str) {
        var res = encodeURIComponent(str);
        //0~9 a~z A~Z -_.
        res = res.replace(/[^0-9a-zA-Z\-_\.%]/g, function ($0) {
            //不用考虑一位数了
            return '%' + $0.charCodeAt(0).toString(16).toUpperCase();
        });
        return res;
    }
    ;
    /**
     * VIP特权信息
     */
    get_vip_level(uid, openid, openkey) {
        this._makeQuery('/v3/user/get_vip_level', {
            openid: openid,
            openkey: openkey,
            pf: 'wanba_ts',
            format: 'json',
            userip: ''
        }, (e, d) => {
            if (e) {
                this.system_recall('get_vip_level', uid, -1, e.toString(), d);
            }
            else {
                this.system_recall('get_vip_level', uid, d.ret, d.msg, d);
            }
        });
    }
    ;
    /**
     * 验证
     * 积分兑换礼包
     */
    gift_exchange(uid, openid, openkey, gift_id = '1234', ...args) {
        this._makeQuery('/v3/user/gift_exchange', {
            openid: openid,
            openkey: openkey,
            pf: 'wanba_ts',
            gift_id: gift_id,
            format: 'json',
            userip: ''
        }, (e, d) => {
            if (e) {
                this.system_recall('gift_exchange', uid, InviteCodeMgr_1.InviteCode.IC_PLT_BUSY, e.toString(), ...args);
            }
            else {
                var ret = d.ret || 0;
                switch (d.ret) {
                    case 1002:
                        ret = InviteCodeMgr_1.InviteCode.IC_PLT_BUSY;
                        break;
                    case 2000:
                        ret = InviteCodeMgr_1.InviteCode.IC_PLT_BUSY;
                        break;
                    case 2001:
                        ret = InviteCodeMgr_1.InviteCode.IC_PLT_BUSY;
                        break;
                    case 2002:
                        ret = InviteCodeMgr_1.InviteCode.IC_CODE_ERROR;
                        break;
                    case 2003:
                        ret = InviteCodeMgr_1.InviteCode.IC_CODE_LIMIT;
                        break;
                    case 2004:
                        ret = InviteCodeMgr_1.InviteCode.IC_SUCC;
                        break;
                    case 2005:
                        ret = InviteCodeMgr_1.InviteCode.IC_PLT_SCORE_LIMIT;
                        break;
                    case 2006:
                        ret = InviteCodeMgr_1.InviteCode.IC_PLT_LEVEL_LIMIT;
                        break;
                    case 2007:
                        ret = InviteCodeMgr_1.InviteCode.IC_PLT_LEVEL_NOT_MATCH;
                        break;
                    case 2008:
                        ret = InviteCodeMgr_1.InviteCode.IC_PLT_TIME_LIMIT;
                        break;
                    case 2009:
                        ret = InviteCodeMgr_1.InviteCode.IC_PLT_COUNT_LIMIT;
                        break;
                }
                this.system_recall('gift_exchange', uid, ret, d.msg, ...args);
            }
        });
    }
    ;
    /**
     * 对战类游戏上报游戏结果
     */
    // report_battle_result() { };
    /**
     * 用户游戏成就上报
     */
    // report_user_achievement() { };
    /**
     * 获取已安装了应用的好友列表
     */
    get_app_friends(uid, openid, openkey) {
        this._makeQuery('/v3/relation/get_app_friends', {
            openid: openid,
            openkey: openkey,
            pf: 'wanba_ts',
            format: 'json',
            userip: ''
        }, (e, d) => {
            if (e) {
                this.system_recall('get_app_friends', uid, -1, e.toString(), []);
            }
            else {
                this.system_recall('get_app_friends', uid, d.ret, d.msg, d.items);
            }
        });
    }
    ;
    /**
     * 批量获取多个用户的基本信息，包括昵称、头像等
     */
    get_multi_info(uid, openid, openkey, fopenids = []) {
        this._makeQuery('/v3/user/get_multi_info', {
            openid: openid,
            openkey: openkey,
            pf: 'wanba_ts',
            format: 'json',
            userip: '',
            fopenids: fopenids.join('_')
        }, (e, d) => {
            if (e) {
                this.system_recall('get_multi_info', uid, -1, e.toString(), []);
            }
            else {
                this.system_recall('get_multi_info', uid, d.ret, d.msg, d.items);
            }
        }, 'POST');
    }
    ;
    /**
     * 游戏内调用消息接口向好友发送消息
     */
    send_gamebar_msg(uid, openid, openkey, frd, msgtype, content, qua = 'V1_AND_QZ_4.9.3_148_RDM_T') {
        this._makeQuery('/v3/user/send_gamebar_msg', {
            openid: openid,
            openkey: openkey,
            pf: 'wanba_ts',
            format: 'json',
            userip: '',
            frd: frd,
            msgtype: msgtype,
            content: content,
            qua: qua
        }, (e, d) => {
            if (e) {
                this.system_recall('send_gamebar_msg', uid, -1, e.toString());
            }
            else {
                this.system_recall('send_gamebar_msg', uid, d.ret, d.msg);
            }
        }, 'GET');
    }
    ;
}
exports.QZoneApi = QZoneApi;
//# sourceMappingURL=qzone.js.map