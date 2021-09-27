"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverMgrInst = exports.Servers = void 0;
const TeTool_1 = require("../lib/TeTool");
const SeNetMgr_1 = require("../NetMgr/SeNetMgr");
const TeConfig_1 = require("../lib/TeConfig");
exports.Servers = ['cloudserver', 'raceserver'];
class SeLinkInfo {
    constructor(nid) {
        this.ready = false;
        this.type = 'unknow';
        this.sid = null;
        this.url = '';
        this.plt = '';
        this.nid = nid;
    }
}
class ServerMgr {
    constructor() {
        //只加不减的服务器数据统计变量
        this._no_recy_server_ = {};
        this._all_server_ = new TeTool_1.HashMap();
        this._sid_type_ = {};
    }
    _find_(type, key, v) {
        return this._all_server_.find(type, key, v);
    }
    get_server(sid) {
        var type = this._sid_type_[sid];
        var s = this._find_(type, 'sid', sid);
        if (s && s.length > 0)
            return s[0];
        return null;
    }
    find_server(nid) {
        var keys = this._all_server_.keys;
        for (var key in keys) {
            var o = this._all_server_.find(keys[key], 'nid', nid);
            if (o && o.length > 0)
                return o[0];
        }
        return null;
    }
    find_race_by_rurl(rurl) {
        var keys = this._all_server_.keys;
        for (var key in keys) {
            var o = this._all_server_.find(keys[key], 'url', rurl);
            if (o && o.length > 0)
                return o[0];
        }
        return null;
    }
    find_servers_by_type(type, plt) {
        var servers = this._all_server_.find(type, 'type', type);
        var outs = [];
        for (var i = 0; i < servers.length; i++) {
            if (servers[i].plt == plt) {
                outs.push(servers[i]);
            }
        }
        return outs;
    }
    add_server(type, nid, sid, url, plt) {
        //统计
        if (!this._no_recy_server_[plt + type])
            this._no_recy_server_[plt + type] = {};
        this._no_recy_server_[plt + type][sid] = 1;
        if (url) {
            // url = url.replace('119.90.49.203', 'ddms-server.shandw.com');
            // url = url.replace('192.168.218.73', 'localhost');
        }
        this._sid_type_[sid] = type;
        var s = new SeLinkInfo(nid);
        s.sid = sid;
        s.url = url;
        s.type = type;
        s.plt = plt;
        this._all_server_.add(type, s);
    }
    del_server(nid) {
        var s = this.find_server(nid);
        if (s)
            this._all_server_.find2Del(s.type, 'nid', nid);
    }
    batchByType(type, info) {
        var all_server = this._all_server_.get(type);
        for (var i = 0; i < all_server.length; i++) {
            var rs = all_server[i];
            if (rs)
                SeNetMgr_1.netInst.sendData(info, rs.nid);
        }
    }
    count_no_recy_server(type, plt) {
        if (TeConfig_1.configInst.get('debug')) {
            return 0;
        }
        let servers = this._no_recy_server_[plt + type];
        if (!servers) {
            return 0;
        }
        console.log(servers);
        return Object.keys(servers).length;
    }
}
exports.serverMgrInst = new ServerMgr();
//# sourceMappingURL=serverMgr.js.map