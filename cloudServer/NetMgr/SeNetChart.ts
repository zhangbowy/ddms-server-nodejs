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

export class SeNetChart extends TeNet {
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
        global.logMgr.log('connect to CS sucess' + linkid);
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
            return;
        }

        var serverData = this.allServers[linkid];
        // if (data.cmd !== 'registret' && !serverData.ready) {
        //     // 没有注册成功的时候，服务器只处理注册信息
        //     return;
        // }

        // global.logMgr.log(data);

        switch (data.cmd) {
            case 'needregist': this.onSendRegist(); break;
            case 'levelchart':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (!rkPlayer) {
                    break;
                }
                rkPlayer.onGetCharRet(data.chartype, data.startindex, data.sumlength, data.rankinfo, data.rank);
                break;
            case 'historylevelchart':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (!rkPlayer) {
                    break;
                }
                rkPlayer.onGetHistoryCharRet(data.chartype, data.startindex, data.sumlength, data.rankinfo, data.rank);
                break;
            case 'hischart':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (!rkPlayer) {
                    break;
                }
                rkPlayer.onGetHisCharRet(data.chartype, data.sid, data.rankinfo, data.rank);
                break;
            case 'registret': this._processRegistRet(serverData, data); break;
            case 'queryrank':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (!rkPlayer) {
                    break;
                }
                rkPlayer.onGetRankRet(data.infos);
                break;
            case 'queryinfo':
                //作弊模式下
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (!rkPlayer) {
                    break;
                }
                rkPlayer.pvpMgr.on_match_pve_pk(true, 0, data.info, false);
                break;
            case 'gengroupid':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (!rkPlayer) {
                    break;
                }
                rkPlayer.loadGroupId(data.groupid);
                break;
            case 'giveDayReward_ret':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (!rkPlayer) {
                    // global.playerMgr.onGiveMail(configInst.get('plt'), data.charid, SeMailType.Peak_DailyReward, JSON.stringify(data.reward));
                    break;
                }
                rkPlayer.pvpMgr.giveDayReward(data.reward, data.pass_time);
                break;
            case 'givePvePkDayCrossReward_ret':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (!rkPlayer) {
                    // global.playerMgr.onGiveMail(configInst.get('plt'), data.charid, SeMailType.Peak_DailyReward, JSON.stringify(data.reward));
                    break;
                }
                rkPlayer.pvpMgr.givePvePkDayReward(data.reward, data.pass_time);
                break;
            case 'giveSeasonReward_ret':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (!rkPlayer) {
                    global.playerMgr.onGiveMail(configInst.get('plt'), data.charid, SeMailType.Peak_SeasonReward, JSON.stringify(data.reward));
                    break;
                }
                rkPlayer.pvpMgr.giveSeasonReward(data.reward);
                break;
            case 'giveSeasonCrossReward_ret':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (!rkPlayer) {
                    global.playerMgr.onGiveMail(configInst.get('plt'), data.charid, SeMailType.Peak_SeasonReward, JSON.stringify(data.reward));
                    break;
                }
                rkPlayer.pvpMgr.giveSeasonCrossReward(data.reward);
                break;
            case 'giveLevelSpeedSeasonReward_ret':
                    var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                    if (!rkPlayer) {
                        global.playerMgr.onGiveMail(configInst.get('plt'), data.charid, SeMailType.LevelSpeed_SeasonReward, JSON.stringify(data));
                        break;
                    }
                rkPlayer.pvpMgr.giveLevelSpeedSeasonReward(data.reward, data.chartype);
                break;
            case 'givePvePkSeasonCrossReward_ret':
                    var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                    if (!rkPlayer) {
                        global.playerMgr.onGiveMail(configInst.get('plt'), data.charid, SeMailType.PvePk_SeasonReward, JSON.stringify(data));
                        break;
                    }
                rkPlayer.pvpMgr.givePvePkSeasonCrossReward(data.reward);
                break;
            case 'toy_info':
                global.playerMgr.toy_info = data.toy_info;
                break;
            case 'pvePkRefresh_ret':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (rkPlayer) {
                    rkPlayer.pvpMgr.pve_pk_refresh_ret(data.result);
                }
                break;
            case 'checkLastOne_ret':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (!rkPlayer) {
                    data.ver = '1';
                    global.playerMgr.onGiveMail(configInst.get('plt'), data.uid, SeMailType.CallBackMsg, JSON.stringify(data));
                    break;
                }
                rkPlayer.pvpMgr.changePvePkRank(data);
                break;
            case 'checkFight_ret':
                var rkPlayer = global.playerMgr.getPlayer(data.charid, false);
                if (rkPlayer) {
                    global.netMgr.sendData(data, rkPlayer.linkid);
                }
                break;
            default:
                break;
        }
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

    public sendCSData(data) {
        data['_sys_'] = {
            plt: configInst.get('plt'),
            serverid: configInst.get('serverid')
        }
        this.sendData(data);
    }

    public onSendRegist() {
        var send = {
            'cmd': 'regist',
            'passwd': 'chenkai',
            'type': 'cloudserver',
            'id': configInst.get('serverid'),
            plt: configInst.get('plt'),
        };

        global.logMgr.log(JSON.stringify(send));
        this.sendCSData(send);
    };

    //-----------各种查询接口--------------//

    public queryranks(sid: string, uid: number, type: number | number[]) {
        if (!(type instanceof Array)) {
            type = [type];
        }

        var send = {
            cmd: 'queryrank',
            data: [sid, uid, type]
        };
        this.sendCSData(send);
    }

    public queryinfo(sid: string, uid: number, rank, type: number) {
        var send = {
            cmd: 'queryinfo',
            data: [sid, uid, rank, type]
        };
        this.sendCSData(send);
    }

    public addPlayerLevelChart(sid: string, ...arg: any[]);
    public addPlayerLevelChart(...arg: any[]) {
        //每个数据都要增加当前时间，用于数据库排序，redis zset当score相同时根据key的字符排序，所以时间戳必须为第一个属性
        var tmp = {curr: Date.now()};
        for(var key in arg[2]){
            tmp[key] = arg[2][key];
        }
        arg[2] = tmp;
        var send = {
            cmd: 'addlevelchart',
            data: arg
        };

        this.sendCSData(send);
    }

    public getPlayerLevelChart(sid: string, charType: any, iCurrentPage: number, length: number, charid: number, subType?: string, value?: any);
    public getPlayerLevelChart(...args) {
        var send = {
            cmd: 'getlevelchart',
            data: args
        };

        this.sendCSData(send);
    }

    public getPlayerHistoryLevelChart(sid: string, charType: any, iCurrentPage: number, length: number, charid: number, subType?: string, value?: any);
    public getPlayerHistoryLevelChart(...args) {
        var send = {
            cmd: 'gethistorylevelchart',
            data: args
        };

        this.sendCSData(send);
    }

    public apply_group_id(sid: string, chartype: number, charid: number, newOrOld: 'new' | 'old');
    public apply_group_id(...args: (string | number)[]) {
        var send = {
            cmd: 'getgroupid',
            data: args
        };

        this.sendCSData(send);
    }

    public onGiveDayReward(sid: string, ...args: any[])
    public onGiveDayReward(...args: any[]) {
        var send = {
            cmd: 'giveDayReward',
            data: args,
        };

        this.sendCSData(send);
    };

    public onGiveDayCrossReward(sid: string, ...args: any[])
    public onGiveDayCrossReward(...args: any[]) {
        var send = {
            cmd: 'giveDayCrossReward',
            data: args,
        };

        this.sendCSData(send);
    };
    
    public onGiveSeasonReward(sid: string, ...args: any[])
    public onGiveSeasonReward(...args: any[]) {
        var send = {
            cmd: 'giveSeasonReward',
            data: args
        };

        this.sendCSData(send);
    };

    public onGiveSeasonCrossReward(sid: string, ...args: any[])
    public onGiveSeasonCrossReward(...args: any[]) {
        var send = {
            cmd: 'giveSeasonCrossReward',
            data: args
        };

        this.sendCSData(send);
    };
}
