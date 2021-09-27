"use strict";
/**
 * 同步处理模块(需要mysqlInst和redistInst连接成功)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineMgr = void 0;
const serverMgr_1 = require("./serverMgr");
const SeNetMgr_1 = require("../NetMgr/SeNetMgr");
const TeLog_1 = require("../lib/TeLog");
const fs_1 = require("fs");
const path_1 = require("path");
//所有当前在线玩家管理
class OnlineMgr {
    constructor(plt) {
        this._online_uids = {}; //liveTime时间内登陆过的uids
        this._server_total = 0; //cloud 服务器数量
        this._sync_time = 0; //玩家数据同步周期
        this._live_time = 0; //玩家数据生命周期
        this._cb = null; //临时保存的回调函数
        this._redisUids = '';
        this._plt = plt;
    }
    init(syncTime, liveTime, redistInst, redisUids) {
        this._sync_time = syncTime;
        this._live_time = liveTime;
        this._redisUids = this._plt + '_' + redisUids;
        redistInst.redisClient.lrange(redisUids, 0, -1, function (error, result) {
            if (error) {
                //万一这里报错, 抛出一条日志, 结束本次同步
                TeLog_1.TeLog.error(error.stack);
                return;
            }
            let _online_uids = {};
            if (fs_1.existsSync(path_1.join(process.cwd(), 'datas', this._redisUids + '.dat'))) {
                try {
                    _online_uids = JSON.parse(fs_1.readFileSync(path_1.join(process.cwd(), 'datas', this._redisUids + '.dat')).toString());
                }
                catch (e) {
                    console.error(e);
                }
            }
            if (result && result[0]) {
                //去重 赋时间戳
                var now = Date.now();
                for (var i = 0; i < result.length; i++) {
                    let uid = result[i];
                    if (_online_uids.hasOwnProperty(uid)) {
                        this._online_uids[uid] = _online_uids[uid];
                    }
                    else {
                        this._online_uids[uid] = now;
                    }
                }
            }
        }.bind(this));
    }
    flush(uid) {
        this._online_uids[uid] = Date.now();
        this.save_local();
    }
    save_local() {
        if (!this._save_handle_) {
            this._save_handle_ = setTimeout(this._save_local_uids.bind(this), 30 * 1000);
        }
    }
    _save_local_uids() {
        try {
            if (!fs_1.existsSync(path_1.join(process.cwd(), 'datas'))) {
                fs_1.mkdirSync(path_1.join(process.cwd(), 'datas'));
            }
            fs_1.writeFile(path_1.join(process.cwd(), 'datas', this._redisUids + '.dat'), JSON.stringify(this._online_uids), { encoding: 'utf8', flag: 'w+' }, function (err) {
                if (err)
                    console.error(err);
            });
        }
        catch (e) {
        }
        this._save_handle_ = null;
    }
    checkSync(uid) {
        //不存在, 说明玩家没登陆过, 直接返回true
        if (!this._online_uids[uid]) {
            return true;
        }
        return ((Date.now() - this._online_uids[uid]) >= this._sync_time);
    }
    checkLive(uid) {
        //不存在, 说明玩家没登陆过, 直接返回false
        if (!this._online_uids[uid]) {
            return false;
        }
        return ((Date.now() - this._online_uids[uid]) < this._live_time);
    }
    clear(uid) {
        //这里必须手动删除, 不然会造成内存泄漏
        delete this._online_uids[uid];
        this.save_local();
    }
    getSyncUids(plt, cb) {
        this._cb = cb;
        //找出所有的cloud服务器
        let type = "cloudserver";
        var _servers = serverMgr_1.serverMgrInst.find_servers_by_type(type, plt);
        this._server_total = _servers.length;
        //这里注意一下, 假如逻辑服没有连过来就不执行同步, 防止逻辑服是活的, 只是逻辑服和同步服之间的网络断了
        if (_servers.length < serverMgr_1.serverMgrInst.count_no_recy_server(type, plt)) {
            console.error("getSyncUids fail, plt: " + plt);
            return;
        }
        for (var i = 0; i < _servers.length; i++) {
            SeNetMgr_1.netInst.sendData({ cmd: 'get_online_uids' }, _servers[i].nid);
        }
    }
    _getOnlineUidsRet(uids) {
        var now = Date.now();
        //将在线玩家重新导入_online_uids, 刷新时间
        //注意本服务的处理 uid 都当成string处理
        for (var i = 0; i < uids.length; i++) {
            this._online_uids[uids[i].toString()] = now;
        }
        //所有服务器准备完毕
        if ((--this._server_total) > 0) {
            return;
        }
        //取出符合同步时间的uid
        var outs = [];
        for (var uid in this._online_uids) {
            if (now - this._online_uids[uid] >= this._sync_time) {
                outs.push(uid);
            }
        }
        if (this._cb)
            this._cb(outs);
    }
}
exports.OnlineMgr = OnlineMgr;
//取出所有的key
// redistInst.redisClient.llen(redisUids, (error, length)=> {
//     if (error) {
//         //万一这里报错, 抛出一条日志, 结束本次同步
//         TeLog.error(error.stack);
//         return;
//     }
//     this._sync_total = length;
//     var i: number = 0;
//     while (i < length) {
//         //一次取1000条
//         redistInst.redisClient.lrange(redisUids, i, i + 999, this.__loadDate.bind(this));
//         i = i + 1000;
//     }
// });
//# sourceMappingURL=onlineMgr.js.map