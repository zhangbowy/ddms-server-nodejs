// 这里是当匹配模块独立的时候使用的匹配数据接口
/* 负责处理其它服务器接口过来的数据操作*/
import { TeNet } from "../lib/TeNet";
import { iApp } from "../app";
import { SeLogicFormation, ifFriendInfo, SeMailType } from '../SeDefine';
import { configInst } from '../lib/TeConfig';
import { remove_duplicate } from "../TeTool";
import { SeEnumnoticetexteType } from "../Res/interface";
declare var global: iApp;

class SeGuildInfo {
    public id: string = '';
    public linkid: string = '';
    public ready: number = 0;

    public constructor(linkid) {
        this.id = '';
        this.linkid = linkid;
        this.ready = 0;
    }
}

class SeNetGuild extends TeNet {
    public allServers: any = {};
    // private listenServer:any = new TeNet();
    private _readyFunc: any;
    private isCross: boolean;
    constructor(url, readyFunc, isCross: boolean = false, ...args) {
        super();
        this.connect(url);
        this._readyFunc = readyFunc;
        this.isCross = isCross;
        this.on('data', this._onReciveData.bind(this));
        this.on('connected', this._onConnected.bind(this));
        this.on('disconnect', this._onDisconnect.bind(this));

        this.zlib_open = true;
    }

    private _onDisconnect(linkid, data) {
        if (this.allServers.hasOwnProperty(linkid)) {
            // 现在还不知道断开后重新连接上的sockeid会不会变化，先按照变化的处理
            delete this.allServers[linkid];
        }
        else {
            global.logMgr.log('disconnect');
        }
    }

    private _onConnected(linkid) {
        global.logMgr.log('connect to MS sucess' + linkid);
        if (this.allServers.hasOwnProperty(linkid)) {
            // 如果已经存在
            global.logMgr.log('connceted error same socketid');
        }
        else {
            var newServer: SeGuildInfo = new SeGuildInfo(linkid);
            this.allServers[linkid] = newServer;
            this.onSendRegist();
        }
    }

    private _onReciveData(linkid, data) {
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
            case 'needregist': this.onSendRegist(); break;
            case 'registret': this._processRegistRet(serverData, data); break;
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
                    global.playerMgr.onGiveMail(configInst.get('plt'), data.uid, SeMailType.Guild_Opr, JSON.stringify(data));
                    break;
                }
                rkPlayer.m_guildMgr.deal_guild_opr(data);
                break;
        }
    };

    public sendGuildData(data) {
        // 这里强制发送自己的大区id和对应平台
        data['_sys_'] = {
            plt: configInst.get('plt'),
            serverid: configInst.get('serverid')
        }
        this.sendData(data);
    };

    // 这里是主动 connect过去的但是主要流程还是和listen的一样吧
    private _processRegistRet(serverData, data) {
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
    };

    /**
     * 更新玩家自己的状态， 在线 离线 比赛中等
     * @param uid 
     * @param state 
     */
    up_state(info) {
        info['cmd'] = 'up_state';
        this.sendGuildData(info);
    }

    public onSendRegist() {
        var data = {
            'cmd': 'regist',
            'passwd': 'chenkai',
            'type': 'cloudserver',
            'id': configInst.get('serverid'),
            'plt': configInst.get('logMgr.path'),
        };

        if (configInst.get("cheatmode") && configInst.get('plts')) {
            data['plts'] = configInst.get('plts');
        }

        this.sendGuildData(data);
    };
}

export { SeNetGuild };