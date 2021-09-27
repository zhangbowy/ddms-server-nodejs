"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameBase = void 0;
const expressbase_1 = require("./expressbase");
const crypto_1 = require("crypto");
const GameVerMgr_1 = require("../mgr/GameVerMgr");
const serverMgr_1 = require("../NetMgr/serverMgr");
const TeConfig_1 = require("../lib/TeConfig");
const LoginCheck_1 = require("../mgr/LoginCheck");
const NetMgr_1 = require("../NetMgr/NetMgr");
const OnlinePlayer_1 = require("../mgr/OnlinePlayer");
class GameBase extends expressbase_1.ExpressBase {
    constructor(app, type) {
        super(app, type);
        /*--------------- 负载分服相关的请求 --------------------*/
        this._app.all('/api/cls', this._onGetPostCls.bind(this));
        this._app.all('/api/clsinfos', this._onGetPostClsInfos.bind(this));
        /*------- 箱子升级的返回信息（目前应该没用了） ------------*/
        this._app.all('/api/wxdecode', this._onWXDecode.bind(this));
        /*---------------增加一个账号转游戏id的接口---------------*/
        this._app.all('/account/getid', this._onGetAccountId.bind(this));
        /*---------------获取微信用户发送给客服消息的接口---------------*/
        this._app.all('/wx/message', this._onGetWxMessage.bind(this));
    }
    /**
     * 玩家信息校验，获取openid
     * @param req
     * @param res
     */
    _onWXDecode(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req['query'];
        }
        else if (req.method == 'POST') {
            param = req['body'];
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        let { 'session_key': session_key, 'encryptedData': encryptedData, 'iv': iv } = param;
        session_key = decodeURIComponent(session_key);
        encryptedData = decodeURIComponent(encryptedData);
        iv = decodeURIComponent(iv);
        // this._decode_(seasson_key, encryptedData, iv)
        res.writeHead(200, 'ok');
        res.write(this._decode_(session_key, iv, encryptedData));
        res.end();
    }
    _decode_(key, iv = '', crypted = '') {
        let decoded = '';
        try {
            let c_crypted = Buffer.from(crypted, 'base64');
            key = Buffer.from(key, 'base64');
            let c_iv = Buffer.from(iv, 'base64');
            const decipher = crypto_1.createDecipheriv('aes-128-cbc', key, c_iv);
            decoded = decipher.update(c_crypted, 'base64', 'utf8');
            decoded += decipher.final('utf8');
        }
        catch (e) {
            console.log(e);
        }
        return decoded;
    }
    // 获取一个cls的ip和端口给玩家，同时玩家上报登录的sign和玩家的id
    _onGetPostCls(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req.query;
        }
        else if (req.method == 'POST') {
            param = req.body;
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        var serverType = 'cls';
        var token = '';
        var plt = param['plt'] || 'sdw';
        var fobid = GameVerMgr_1.GameVerMgr.inst.check_login_limit(param['uid'], param['ver'], plt);
        var out;
        if (fobid) {
            out = { clsid: [], token: token, msg: fobid };
        }
        else {
            var outType = serverMgr_1.serverMonitInst.get_minimum_num_ip_by_type(serverType, plt);
            if (!outType || (outType.id == "" && outType.url == "")) {
                out = { clsid: [], token: token, msg: 'server busy' };
            }
            else if (outType.url) {
                // 表示返回的是连接
                out = { ip: [outType.url], token: token, msg: '' };
            }
            else {
                // 表示返回的是大区号
                out = { clsid: [outType.id], token: token, msg: '' };
            }
        }
        if (!req.headers['host'] || req.headers['host'].indexOf(TeConfig_1.configInst.get('webAppMgr.port')) >= 0) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        res.write(JSON.stringify(out));
        res.end();
    }
    // 获取一个 每个渠道的状态，是否限制登陆或者其它信息
    _onGetPostClsInfos(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req.query;
        }
        else if (req.method == 'POST') {
            param = req.body;
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        if (!req.headers['host'] || req.headers['host'].indexOf(TeConfig_1.configInst.get('webAppMgr.port')) >= 0) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        let pltinfos = GameVerMgr_1.GameVerMgr.inst.check_pltarea_state(param['uid'], param['plt'], param['appid']);
        if (param['uid'] && param['plt'] && Object.keys(pltinfos).length > 0) {
            LoginCheck_1.SeLoginCheck.get_account_info(param['uid'], function (roles) {
                // 这里依据时间记录玩家最后登陆的大区
                for (let key in pltinfos) {
                    if (roles.hasOwnProperty(key)) {
                        pltinfos[key]['role'] = roles[key].role;
                        pltinfos[key]['time'] = roles[key].time;
                    }
                }
                res.write(JSON.stringify(pltinfos));
                res.end();
            });
        }
        else {
            res.write(JSON.stringify(pltinfos));
            res.end();
        }
    }
    //把账号名字转换成玩家id
    _onGetAccountId(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req.query;
        }
        else if (req.method == 'POST') {
            param = req.body;
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        if (!req.headers['host'] || req.headers['host'].indexOf(TeConfig_1.configInst.get('webAppMgr.port')) >= 0) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        res.write(LoginCheck_1.SeLoginCheck.ConvertId(param['account']));
        res.end();
    }
    //获取微信一区二区玩家客服消息
    _onGetWxMessage(req, res) {
        var param;
        if (req.method == 'GET') {
            param = req.query;
        }
        else if (req.method == 'POST') {
            param = req.body;
        }
        else {
            res.writeHead(404, 'method error');
            res.end();
            return;
        }
        if (!req.headers['host'] || req.headers['host'].indexOf(TeConfig_1.configInst.get('webAppMgr.port')) >= 0) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
        //获取对应的serverid
        let cls_wx = OnlinePlayer_1.onlineMgrInst.get_cls_by_openid_and_plt(param['FromUserName'], 'wx');
        let cls_wx2 = OnlinePlayer_1.onlineMgrInst.get_cls_by_openid_and_plt(param['FromUserName'], 'wx2');
        let cls_wx3 = OnlinePlayer_1.onlineMgrInst.get_cls_by_openid_and_plt(param['FromUserName'], 'wx3');
        //传递cloud_server的cmd处理任务
        if (cls_wx) {
            this.sendWxMessage(cls_wx, param['FromUserName'], param['Content']);
        }
        if (cls_wx2) {
            this.sendWxMessage(cls_wx2, param['FromUserName'], param['Content']);
        }
        if (cls_wx3) {
            this.sendWxMessage(cls_wx3, param['FromUserName'], param['Content']);
        }
        res.write("success");
        res.end();
    }
    sendWxMessage(serverid, openid, content) {
        var wxinfo = {
            cmd: 'wxmessage',
            openid: openid,
            content: content,
        };
        NetMgr_1.netMgrInst.sendServerData(serverid, wxinfo);
    }
}
exports.GameBase = GameBase;
//# sourceMappingURL=gamebase.js.map