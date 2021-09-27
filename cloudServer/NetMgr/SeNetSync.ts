// 这里是当匹配模块独立的时候使用的匹配数据接口
/* 负责处理其它服务器接口过来的数据操作*/
import { TeNet } from "../lib/TeNet";
import { iApp } from "../app";
import { configInst } from '../lib/TeConfig';
import { SeCharMailInfo, SeMailType } from "../SeDefine";
declare var global: iApp;

class SeMSInfo {
    public id: string = '';
    public linkid: string = '';
    public ready: number = 0;

    public constructor(linkid) {
        this.id = '';
        this.linkid = linkid;
        this.ready = 0;
    }
}

export class SeNetSync extends TeNet {
    public allServers: any = {};
    // private listenServer:any = new TeNet();
    private _readyFunc: any;
    constructor(url, readyFunc) {
        super();
        this.connect(url);
        this._readyFunc = readyFunc;
        this.on('data', this._onReciveData.bind(this));
        this.on('connected', this._onConnected.bind(this));
        this.on('disconnect', this._onDisconnect.bind(this));
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
        global.logMgr.log('connect to SS sucess' + linkid);
        if (this.allServers.hasOwnProperty(linkid)) {
            // 如果已经存在
            global.logMgr.log('connceted error same socketid');
        }
        else {
            var newServer: SeMSInfo = new SeMSInfo(linkid);
            this.allServers[linkid] = newServer;
            this.onSendRegist();
        }
    }

    private _onReciveData(linkid, data) {
        if (!this.allServers.hasOwnProperty(linkid)) {
            this.disconnect(linkid);
        }

        var serverData = this.allServers[linkid];
        if (data.cmd !== 'registret' && !serverData.ready) {
            // 没有注册成功的时候，服务器只处理注册信息
            return;
        }

        // global.logMgr.log(data);

        switch (data.cmd) {
            case 'registret': this._processRegistRet(serverData, data); break;
            case 'load_infos_ret':
                this.emit('loadfinish'+data.uid, data.status);
                break;
            case 'get_online_uids':
                var onlines = global.playerMgr.getOnlinePlayers();
                var outs = [];
                for (var i = 0; i < onlines.length; i++) {
                    outs.push(onlines[i].id);
                }
                this.sendCSData({ cmd: 'get_online_uids_ret', uids: outs });
                break;
            default:
                break;
        }
    };

    public onSendRegist() {
        var send = {
            'cmd': 'regist',
            'passwd': 'chenkai',
            'type': 'cloudserver',
            'id': configInst.get('serverid'),
            plt: configInst.get('plt'),
        };

        this.sendCSData(send);
    };

    public sendCSData(data) {
        data['_sys_'] = {
            plt: configInst.get('plt'),
            serverid: configInst.get('serverid')
        }
        this.sendData(data);
    }

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

    public load(uid: number) {
        //平台兼容
        if (!configInst.get('ssMgr')) {
            this.emit('loadfinish'+uid, true);
            return;
        }


        var plt = configInst.get('plt');
        var existsKey = 'baseinfo'
        if (plt != 'sdw' && plt != 'qzone') {
            existsKey = plt + '_' + existsKey;
        }

        var send = {
            cmd: 'load_infos',
            uid: uid,
            existsKey: existsKey
        };
        this.sendCSData(send);
    }

    public offlineSave(uid: number, datas: string) {
        var plt = configInst.get('plt');
        var existsKey = 'baseinfo';
        var key = 'mailsinfo';
        if (plt != 'sdw' && plt != 'qzone') {
            existsKey = plt + '_' + existsKey;
            key = plt + '_' + key;
        }

        var send = {
            cmd: 'offline_save',
            uid: uid,
            existsKey: existsKey,
            key: key,
            datas: datas
        };

        this.sendCSData(send);
    }



}
