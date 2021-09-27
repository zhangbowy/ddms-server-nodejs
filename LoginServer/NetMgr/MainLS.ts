 import { TeNet } from "../lib/TeNet";
import { rechargeMgrInst } from "../mgr/RechargeMgr";
import { configInst } from "../lib/TeConfig";

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

export class MainLS extends TeNet {
    constructor() {
        super();
    }

    private static _inst: MainLS;
    private _TimeOut;
    static get inst() {
        if (!this._inst) this._inst = new MainLS();
        return this._inst;
    }

    public allServers: any = {};

    connect(url: string) {
        super.connect(url,{},true);

        this.on('data', this._onReciveData.bind(this));
        this.on('connected', this._onConnected.bind(this));
        this.on('disconnect', this._onDisconnect.bind(this));
    }

    private _onConnected(linkid) {
        console.log('connect to MainLS sucess' + linkid);
        if (this.allServers.hasOwnProperty(linkid)) {
            // 如果已经存在
            console.log('connceted error MainLS same socketid');
        }
        else {
            var newServer: SeMSInfo = new SeMSInfo(linkid);
            this.allServers[linkid] = newServer;
            this.onSendRegist();
        }

        if (this._TimeOut) {
            clearTimeout(this._TimeOut);
            this._TimeOut = null;
        }
    }

    public onSendRegist() {
        var data = {
            'cmd': 'regist',
            'passwd': 'chenkai',
            'type': 'subls',
            'id': configInst.get('serverid'),
            'plt': 'nano',
        };

        this.sendMSData(data);
    };

    
    private _onDisconnect(linkid, data) {
        if (this.allServers.hasOwnProperty(linkid)) {
            // 现在还不知道断开后重新连接上的sockeid会不会变化，先按照变化的处理
            delete this.allServers[linkid];
        }
        else {
            console.log('MainLS disconnect');
        }
        this._TimeOut = setTimeout(this.connect, 5000);
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
            case 'registret': this._processRegistRet(serverData, data); break;
            case 'recharge': rechargeMgrInst.rechargeMainLS(data.info); break;
            case 'testinfo': console.log(data); break;
        }
    };

    // 这里是主动 connect过去的但是主要流程还是和listen的一样吧
    private _processRegistRet(serverData, data) {
        if (data.type == true) {
            serverData.ready = true;
            serverData.id = data.id;
            //global.prepare.setProcess(__filename,true);
        }
        else {
            console.log('Regist to MainLS Failed SameID');
        }
    };

    public sendMSData(data) {
        // 这里强制发送自己的大区id和对应平台
        data['_sys_'] = {
            plt: configInst.get('plt'),
            serverid: configInst.get('serverid')
        }
        this.sendData(data);
    };
}