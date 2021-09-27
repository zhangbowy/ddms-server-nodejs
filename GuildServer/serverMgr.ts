import { HashMap } from './lib/TeTool';
import { netInst } from './NetMgr/SeNetMgr';
import { configInst } from './lib/TeConfig';
import { if_sys_ } from './SeDefine';

export var DefineSType = {
    logic: 'cloudserver',
    race: 'raceserver'
}

class SeLinkInfo {
    public constructor(nid) {
        this.nid = nid;
    }
    public ready: boolean = false;
    public type: string = 'unknow';
    public sid: string = null;
    public nid: string;
    public url: string = '';
    public _sys_: if_sys_;
}


class ServerMgr {
    _all_server_: HashMap<SeLinkInfo> = new HashMap<SeLinkInfo>();
    _sid_type_ = {};

    private _find_(type: string, key: string, v: string) {
        return this._all_server_.find(type, key, v);
    }

    get_server(sid: string) {
        var type = this._sid_type_[sid];
        var s = this._find_(type, 'sid', sid);
        if (s && s.length > 0) return s[0];
        return null;
    }

    get_all_server_by_type_and_plt(type: string, plt: string = '') {
        var v_s = this._all_server_.get(type);
        var selpools = [];
        for (var i = 0; i < v_s.length; i++) {
            var r = v_s[i];
            let splt = r._sys_.plt;
            if (plt && splt != plt) {
                continue;
            }

            selpools.push(r);
        }
        return selpools;
    }

    find_server(nid: string) {
        var keys = this._all_server_.keys;
        for (var key in keys) {
            var o = this._all_server_.find(keys[key], 'nid', nid);
            if (o && o.length > 0) return o[0];
        }

        return null;
    }

    find_race_by_rurl(rurl: string) {
        var keys = this._all_server_.keys;
        for (var key in keys) {
            var o = this._all_server_.find(keys[key], 'url', rurl);
            if (o && o.length > 0) return o[0];
        }

        return null;
    }

    add_server(type: string, nid: string, sid: string, url: string, _sys_: if_sys_) {
        this._sid_type_[sid] = type;

        var s = new SeLinkInfo(nid);
        s.sid = sid;
        s.url = url;
        s.type = type;
        s._sys_ = _sys_;
        this._all_server_.add(type, s);
    }

    del_server(nid: string) {
        var s = this.find_server(nid);
        if (s) this._all_server_.find2Del(s.type, 'nid', nid);
    }
    batchByType(type: string, info: any) {
        var all_server = this._all_server_.get(type);
        for (var i = 0; i < all_server.length; i++) {
            var rs = all_server[i];
            if (rs) netInst.sendData(info, rs.nid);
        }
    }
}

export var serverMgrInst = new ServerMgr();
