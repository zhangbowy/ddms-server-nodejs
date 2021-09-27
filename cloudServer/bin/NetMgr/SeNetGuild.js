"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeNetGuild = void 0;
// 这里是当匹配模块独立的时候使用的匹配数据接口
/* 负责处理其它服务器接口过来的数据操作*/
const TeNet_1 = require("../lib/TeNet");
const SeDefine_1 = require("../SeDefine");
const TeConfig_1 = require("../lib/TeConfig");
class SeGuildInfo {
    constructor(linkid) {
        this.id = '';
        this.linkid = '';
        this.ready = 0;
        this.id = '';
        this.linkid = linkid;
        this.ready = 0;
    }
}
class SeNetGuild extends TeNet_1.TeNet {
    constructor(url, readyFunc, isCross = false, ...args) {
        super();
        this.allServers = {};
        this.connect(url);
        this._readyFunc = readyFunc;
        this.isCross = isCross;
        this.on('data', this._onReciveData.bind(this));
        this.on('connected', this._onConnected.bind(this));
        this.on('disconnect', this._onDisconnect.bind(this));
        this.zlib_open = true;
    }
    _onDisconnect(linkid, data) {
        if (this.allServers.hasOwnProperty(linkid)) {
            // 现在还不知道断开后重新连接上的sockeid会不会变化，先按照变化的处理
            delete this.allServers[linkid];
        }
        else {
            global.logMgr.log('disconnect');
        }
    }
    _onConnected(linkid) {
        global.logMgr.log('connect to MS sucess' + linkid);
        if (this.allServers.hasOwnProperty(linkid)) {
            // 如果已经存在
            global.logMgr.log('connceted error same socketid');
        }
        else {
            var newServer = new SeGuildInfo(linkid);
            this.allServers[linkid] = newServer;
            this.onSendRegist();
        }
    }
    _onReciveData(linkid, data) {
        if (!this.allServers.hasOwnProperty(linkid)) {
            this.disconnect(linkid);
            return;
        }
        var serverData = this.allServers[linkid];
        // if (data.cmd !== 'registret' && !serverData.ready) {
        //     // 没有注册成功的时候，服务器只处理注册信息
        //     return;
        // }
        //   global.logMgr.log(data);
        switch (data.cmd) {
            case 'needregist':
                this.onSendRegist();
                break;
            case 'registret':
                this._processRegistRet(serverData, data);
                break;
            case 'guild_opr_error':
            case 'update_guild':
            case 'update_guilds':
            case 'update_guild_param':
            case 'update_guild_chat':
            case 'update_guild_chart':
            case 'update_guild_task':
            case 'update_guild_params':
                global.playerMgr.sendGuildCMD(data.uid, data);
                break;
            case 'guild_opr_ret':
                var rkPlayer = global.playerMgr.getPlayer(data.uid, false);
                if (!rkPlayer) {
                    global.playerMgr.onGiveMail(TeConfig_1.configInst.get('plt'), data.uid, SeDefine_1.SeMailType.Guild_Opr, JSON.stringify(data));
                    break;
                }
                rkPlayer.m_guildMgr.deal_guild_opr(data);
                break;
        }
    }
    ;
    sendGuildData(data) {
        // 这里强制发送自己的大区id和对应平台
        data['_sys_'] = {
            plt: TeConfig_1.configInst.get('plt'),
            serverid: TeConfig_1.configInst.get('serverid')
        };
        this.sendData(data);
    }
    ;
    // 这里是主动 connect过去的但是主要流程还是和listen的一样吧
    _processRegistRet(serverData, data) {
        if (data.type == true) {
            serverData.ready = true;
            serverData.id = data.id;
            //global.prepare.setProcess(__filename,true);
            if (this._readyFunc) {
                this._readyFunc();
            }
        }
        else {
            global.logMgr.log('Regist to MS Failed SameID');
        }
    }
    ;
    /**
     * 更新玩家自己的状态， 在线 离线 比赛中等
     * @param uid
     * @param state
     */
    up_state(info) {
        info['cmd'] = 'up_state';
        this.sendGuildData(info);
    }
    onSendRegist() {
        var data = {
            'cmd': 'regist',
            'passwd': 'chenkai',
            'type': 'cloudserver',
            'id': TeConfig_1.configInst.get('serverid'),
            'plt': TeConfig_1.configInst.get('logMgr.path'),
        };
        if (TeConfig_1.configInst.get("cheatmode") && TeConfig_1.configInst.get('plts')) {
            data['plts'] = TeConfig_1.configInst.get('plts');
        }
        this.sendGuildData(data);
    }
    ;
}
exports.SeNetGuild = SeNetGuild;
//# sourceMappingURL=SeNetGuild.js.map