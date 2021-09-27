import { TeMap, HashMap, arrayRandom, arrayHas, arrayDel } from '../lib/TeTool';
import { netInst } from '../NetMgr/SeNetMgr';
import * as Mysql from 'mysql';
import { func_copy, if_sys_, CharState } from '../SeDefine';
import { friend_mysqlInst } from './FriendInit';

interface ifFriend {
    iuid: number;
    ifuid: number;
}

enum QFType {
    /**
     * 游戏好友
     */
    QFT_game,
    /**
     * 平台好友（第三方的)
     */
    QFT_plt,
}

interface ifQueryCatch {
    uid: number,
    _sys_: if_sys_,
    cb: (iuin: number, friends: ifFriendInfo[], querylists: ifFriendInfo[], focusflist: ifFriendInfo[]) => void,
    friend_infos: ifFriendinfo[];
    type: QFType
}

interface ifOnlineMember {
    kID: number,
    sid?: string,
    state: string,
}

interface ifFriendinfo {
    kID: number,
    kname: string,
    ipvplevel: number,
    ipvpscore: number,
    kicon: string,
    avatar: any,
    ilevel: number,
    ksid: string;
    loaded?: boolean,
}

export interface ifFriendInfo extends ifFriendinfo, ifOnlineMember {
}


class friendMgr {

    friendkey(plt: string, uid: number) {
        return plt + '_' + uid;
    }

    /**
     * 好友的简单信息
     */
    _friendInfo: TeMap<ifFriendinfo> = new TeMap<ifFriendinfo>();
    /**
     * 自己平台的好友关系
     */
    _friends: HashMap<number> = new HashMap<number>();
    /**
     * 第三方平台的好友关系
     */
    _plt_friends: HashMap<number> = new HashMap<number>();

    /**
     * 别人申请添加我位好友
     */
    _apply_friends: HashMap<number> = new HashMap<number>();

    /**
     * 我发起申请添加的好友
     */
    _focus_friends: HashMap<number> = new HashMap<number>();

    /**
     * 存储玩家的状态和大区等动态信息
     */
    _online_friends: TeMap<ifOnlineMember> = new TeMap<ifOnlineMember>();

    constructor() {
        // 限制容器的大小，防止超出,清理存在时间比较长的没有使用到的玩家信息
        //this._friendInfo.auto_size = 100000;
        //this._friends.auto_size = 100000;
    }

    private need_clear = false;
    update() {
        // 每天凌晨4点的时候清理一下数据列表
        let dt_time = new Date();

        if (dt_time.getHours() == 4) {
            if (dt_time.getMinutes() == 0) {
                this.need_clear = true;
            }
            if (dt_time.getMinutes() == 1 && this.need_clear == true) {
                this._friendInfo.clear();
                this._friends.clear();
                this._plt_friends.clear();
                this._apply_friends.clear();
                this._focus_friends.clear();

                this.need_clear = false;
            }
        }

    }

    onDelCache(plt: string, uid: number) {
        // 一个人离开的时候清理一下好友
        let fkey = this.friendkey(plt, uid);
        this._friendInfo.del(fkey);
        this._friends.del(fkey);
        this._plt_friends.del(fkey);
        this._apply_friends.del(fkey);
        this._focus_friends.del(fkey);
    }

    private _convertKey(info: ifFriendInfo) {
        var out = [];
        // for (var key in info) {
        //     out.push({
        //         type: key,
        //         value: info[key]
        //     })
        // }

        out.push({
            type: 'kID',
            value: info.kID
        })

        return out;
    }

    set_plt_friends(_sys_: if_sys_, uid: number, friends: number[]) {
        if (friends && friends.length > 0) this._plt_friends.set(uid, friends);
    }

    /**
     * 跟新玩家状态
     * @param uid 
     * @param sid 
     * @param state 
     */
    update_state(_sys_: if_sys_, sid: string, info: ifFriendInfo) {
        var player: ifOnlineMember;
        if (this._online_friends.has(this.friendkey(_sys_.plt, info.kID))) {
            player = this._online_friends.get(this.friendkey(_sys_.plt, info.kID));
            player.sid = sid;
            if (player.state == info.state) {
                return;
            }
            player.state = info.state;
        }
        else {
            player = {
                kID: info.kID,
                state: info.state,
                sid: sid
            }
        }

        if (info.state == CharState.offline) {
            // 玩家离线的时候需要特殊处理，删除掉玩家的在线信息
            this._online_friends.del(this.friendkey(_sys_.plt, info.kID));
        }
        else {
            this._online_friends.set(this.friendkey(_sys_.plt, info.kID), player);
        }

        // 本地缓存了的话，那就顺便操作一下数据库，否则就抛弃这次操作吧
        if (this._friendInfo.has(this.friendkey(_sys_.plt, info.kID))) {
            var r_f = this._friendInfo.get(this.friendkey(_sys_.plt, info.kID));
            if (r_f.loaded) {
                var db_info = friend_mysqlInst.getMeHash('tab_friend_info', this._convertKey(info));
                var fields = friend_mysqlInst.getTableInfo('tab_friend_info');
                for (var i = 0; i < fields.length; i++) {
                    var key = fields[i];
                    if (key == 'kplt') continue;
                    if (info.state == CharState.offline) {
                        if (info[key] instanceof Object || r_f[key] instanceof Object) { if (JSON.stringify(info[key]) == JSON.stringify(r_f[key])) continue; }
                        // 玩家离线的时候操作一下 mysql数据库的 玩家信息 
                        if (info[key] != r_f[key] && r_f[key]) {
                            db_info.save(key, info[key]);
                        }
                    }

                    r_f[key] = info[key];
                }

                // 判断 
                if (this._friends.has(this.friendkey(_sys_.plt, info.kID))) {
                    this._notice_state(_sys_.plt, info.kID);
                }
                else {
                    this._load_player(_sys_, info);
                }
            }
        }
        else {
            // 缓存中没有，那么先从数据库加载玩家信息
            this._load_player(_sys_, info);
        }

        return true;
    }

    private _on_load_player(_sys_: if_sys_, uid: number) {
        if (this._friends.has(this.friendkey(_sys_.plt, uid))) {
            // 加载一下好友部分的信息
            this._notice_state(_sys_.plt, uid);
        }
        else {
            // 加载自己的好友列表
            friend_mysqlInst.query(`select iuid,ifuid from tab_friends where (ifuid=${uid} and kplt='${_sys_.plt}') union select iuid,ifuid from tab_friends where (iuid=${uid} and kplt='${_sys_.plt}');`, ((_sys_t, _uid, err, result) => {
                if (!err) {
                    // 解析一下好友信息
                    this._parse_friends(_sys_t.plt, uid, result);
                    this._notice_state(_sys_t.plt, _uid);
                }
                else {
                    console.log(err);
                }
            }).bind(this, _sys_, uid));
        }
    }

    private _notice_state(plt: string, uid: number) {
        var show_info = this.getFriendInfo(plt, uid);
        if (!show_info) return;
        // 同步给自己的好友们
        var f_s = this._friends.get(this.friendkey(plt, uid));
        for (var i = 0; i < f_s.length; i++) {
            this.route_to_uid(plt, f_s[i], { type: 'friend_state', f: show_info });
        }

        var p_f_s = this._plt_friends.get(this.friendkey(plt, uid));
        for (var i = 0; i < p_f_s.length; i++) {
            this.route_to_uid(plt, p_f_s[i], { type: 'friend_state', f: show_info });
        }
    }

    private _load_player(_sys_: if_sys_, info: ifFriendInfo, cb?: () => void) {
        // 先设置一个假的上去
        if (!this._friendInfo.has(this.friendkey(_sys_.plt, info.kID))) {
            var t_info: ifFriendinfo = {
                kID: info.kID,
                kname: '',
                ipvplevel: 0,
                ipvpscore: 0,
                ilevel: 0,
                kicon: '',
                ksid: 'S000',
                avatar: {},
                loaded: false,
            }

            for (var key in t_info) {
                if (info.hasOwnProperty(key)) {
                    t_info[key] = info[key];
                }
            }

            this._friendInfo.set(this.friendkey(_sys_.plt, info.kID), t_info);

            var list = friend_mysqlInst.getTableInfo('tab_friend_info');
            friend_mysqlInst.query(`select ${list.join(',')} from tab_friend_info where kID=('${info.kID}') and kplt='${_sys_.plt}';`, ((_sys_t: if_sys_, _info, err, res) => {
                if (!err) {
                    var r = this._friendInfo.get(this.friendkey(_sys_t.plt, _info.kID));
                    if (!res[0]) {
                        _info['kplt'] = _sys_t.plt;
                        friend_mysqlInst.instrtData('tab_friend_info', _info);
                    }
                    r.loaded = true;
                }
                else {
                    console.log(err);
                }
            }).bind(this, _sys_, info));

        }

        if (info['create']) {
            // 新号直接设置成空的算了，理论上不存在好友的
            this._parse_friends(_sys_.plt, info.kID, []);
        }
        else{
            this._on_load_player(_sys_, info.kID);
        }
    }

    /**
     * 查询好友信息
     * @param uids 
     */
    query_friend_state(plt: string, uids: number[]) {
        var outs: ifFriendInfo[] = [];
        for (var i = 0; i < uids.length; i++) {
            var uid = uids[i];
            var r_s = this._online_friends.get(this.friendkey(plt, uid));
            var r_f = this._friendInfo.get(this.friendkey(plt, uid));

            outs.push({
                kID: uid,
                state: r_s ? r_s.state : 'offline',
                ipvpscore: r_f ? r_f.ipvpscore : 0,
                ipvplevel: r_f ? r_f.ipvplevel : 1,
                kname: r_f ? r_f.kname : '',
                kicon: r_f ? r_f.kicon : '',
                ilevel: r_f ? r_f.ilevel : 1,
                ksid: r_f ? r_f.ksid : 'S000',
                avatar: r_f ? r_f.avatar : {},
            })
        }

        return outs;
    }

    /**
     * 获取游戏自身的好友信息
     * @param uid 
     * @param cb 
     */
    get_friends(_sys_: if_sys_, uid: number, cb: (uid: number, friends: ifFriendinfo[], a: ifFriendinfo[], at: ifFriendinfo[]) => void) {
        var cObj: ifQueryCatch = {
            uid: uid,
            _sys_: _sys_,
            cb: cb,
            friend_infos: [],
            type: QFType.QFT_game
        }

        // 这里需要先看看本地有没有记录,
        if (this._friends.has(this.friendkey(_sys_.plt, cObj.uid))) {
            var rfs = this._friends.get(this.friendkey(_sys_.plt, cObj.uid));
            var ras = this._apply_friends.get(this.friendkey(_sys_.plt, cObj.uid));
            var fas = this._focus_friends.get(this.friendkey(_sys_.plt, cObj.uid));
            this._get_friend_infos(cObj, rfs.concat(ras, fas));
        }
        else {
            this._load_friends(cObj)
        }
    }

    /**
     * 加载第三方平台提供的好友信息
     * @param uid 
     * @param cb 
     */
    get_plt_friends(_sys_: if_sys_, uid: number, friends: number[], cb: (uid: number, friends: ifFriendinfo[]) => void) {
        var cObj: ifQueryCatch = {
            uid: uid,
            _sys_: _sys_,
            cb: cb,
            friend_infos: [],
            type: QFType.QFT_plt
        }

        this._plt_friends.set(this.friendkey(_sys_.plt, uid), friends);

        this._get_friend_infos(cObj, friends);
    }

    /**
     * 好友路由传输信息
     */
    friend_route(_sys_: if_sys_, fomate_data: { uid: number, fuid: number }) {
        if (fomate_data['type'] == 'ask_apply') {
            //发起申请的需要处理一下
            if (!this.apply_friend(_sys_, fomate_data.uid, fomate_data.fuid)) {
                return false;
            }
        }

        var f = this._online_friends.get(this.friendkey(_sys_.plt, fomate_data.fuid));
        if (!f || f.state == 'offline') return false;
        fomate_data['from_data'] = this.getFriendInfo(_sys_.plt, fomate_data.uid);
        fomate_data.fuid = fomate_data.uid;
        fomate_data.uid = f.kID;
        netInst.sendData(fomate_data, f.sid);
        return true;
    }

    friend_wx_route(_sys_: if_sys_, fomate_data: { uid: number, wxuids: String[] }){
        let friendInfos = [];
        if (fomate_data['type'] == 'get_wx_friend_info') {
          //把每个id都绑定为游戏内微信好友
          for(let i = 0; i < fomate_data.wxuids.length;i++){
            this.force_plt_friend(_sys_,fomate_data.uid,Number(fomate_data.wxuids[i]));
             //获取每个id对应的用户信息
             let friendInfo = this.getFriendInfo(_sys_.plt,Number(fomate_data.wxuids[i]));
             if(friendInfo){
                friendInfos.push(friendInfo);
             }
          }
            return friendInfos;
         
        }
        return false;
    }

    apply_friend(_sys_: if_sys_, uid: number, fuid: number) {
        fuid = parseInt(fuid.toString());
        uid = parseInt(uid.toString());
        // var r_info = this._friendInfo.get(uid);
        var f_list = this._friends.get(this.friendkey(_sys_.plt, uid));
        if (arrayHas(f_list, fuid) || f_list.length >= this.max_friend_count) return false;

        var ap_list = this._apply_friends.get(this.friendkey(_sys_.plt, fuid));
        if (arrayHas(ap_list, uid)) return false;

        var fo_list = this._focus_friends.get(this.friendkey(_sys_.plt, uid));
        if (arrayHas(fo_list, fuid)) return false;

        //解决比赛后加好友有两条的bug,如果双方都点了，直接互加好友
        var fo_list2 = this._focus_friends.get(this.friendkey(_sys_.plt, fuid));
        if (arrayHas(fo_list2, uid)) {
            this.make_friend(_sys_, uid, fuid);
            return false;
        }

        // 往对方的请求列表里面添加一下自己的id
        this._apply_friends.add(this.friendkey(_sys_.plt, fuid), uid);
        this._focus_friends.add(this.friendkey(_sys_.plt, uid), fuid);
        // 记录一条数据到数据库
        friend_mysqlInst.call_func('focus_friend', [uid, fuid, `'${_sys_.plt}'`]);
        return true;
    }

    force_plt_friend(_sys_: if_sys_, uid: number, fuid: number) {
        // 这个接口强制两个人成为好友
        if (this._friends.has(this.friendkey(_sys_.plt, uid))) {
            this._plt_friends.add(this.friendkey(_sys_.plt, uid), fuid);
        }

        if (this._friends.has(this.friendkey(_sys_.plt, fuid))) {
            this._plt_friends.add(this.friendkey(_sys_.plt, fuid), uid);
        }

        return true;
    }
    force_friend(_sys_: if_sys_, uid: number, fuid: number) {
        // 这个接口强制两个人成为好友
        if (this._friends.has(this.friendkey(_sys_.plt, uid))) {
            this._friends.add(this.friendkey(_sys_.plt, uid), fuid);
        }

        if (this._friends.has(this.friendkey(_sys_.plt, fuid))) {
            this._friends.add(this.friendkey(_sys_.plt, fuid), uid);
        }

        friend_mysqlInst.call_func('focus_friend', [fuid, uid, `'${_sys_.plt}'`]);
        friend_mysqlInst.call_func('focus_friend', [uid, fuid, `'${_sys_.plt}'`]);

        return true;
    }

    /**
    * 发送信息给玩家
    */
    protected route_to_uid(plt: string, uid: number, info = {}) {
        info['cmd'] = 'route_friend';
        info['uid'] = uid;
        return this.send_to_uid(plt, uid, info);
    }

    /**
     * 发送信息给玩家
     */
    send_to_uid(plt: string, uid: number, info) {
        var f = this._online_friends.get(this.friendkey(plt, uid));
        if (!f) return false;
        netInst.sendData(info, f.sid);
        return true;
    }

    /**
     * 加载玩家的好友信息
     * @param query 
     * @param friends 
     */
    private _get_friend_infos(query: ifQueryCatch, friends: number[]) {
        var uids = [];
        for (var i = 0; i < friends.length; i++) {
            var r = this._friendInfo.get(this.friendkey(query._sys_.plt, friends[i]));
            if (r) {
                query.friend_infos.push(r);
            }
            else {
                uids.push(friends[i]);
            }
        }
        if (uids.length == 0) {
            this._add_friends(query, []);
        }
        else {
            this._load_friend_infos(query, uids);
        }
    }

    private _add_friends(query: ifQueryCatch, friends: ifFriendinfo[]) {
        for (var i = 0; i < friends.length; i++) {
            var r = friends[i];
            if (!r) continue;
            r.loaded = true;
            this._friendInfo.set(this.friendkey(query._sys_.plt, r.kID), r);
            query.friend_infos.push(r);
        }

        // 这里把申请的和确认的区分一下

        var apList = (query.type == QFType.QFT_game) ? this._apply_friends.get(this.friendkey(query._sys_.plt, query.uid)) : [];
        var flist: ifFriendInfo[] = [];
        var apflist: ifFriendInfo[] = [];
        var focusList = (query.type == QFType.QFT_game) ? this._focus_friends.get(this.friendkey(query._sys_.plt, query.uid)) : [];
        var focusflist: ifFriendInfo[] = [];

        for (var i = 0; i < query.friend_infos.length; i++) {
            var r_info: ifFriendInfo = func_copy(query.friend_infos[i] as any);
            var ol = this._online_friends.get(this.friendkey(query._sys_.plt, r_info.kID));
            if (ol) {
                r_info.state = ol.state;
            }
            else {
                r_info.state = 'offline';
            }

            if (apList.indexOf(r_info.kID) >= 0) {
                apflist.push(r_info);
            }
            else if (focusList.indexOf(r_info.kID) >= 0) {
                focusflist.push(r_info);
            }
            else {
                flist.push(r_info);
            }
        }

        query.cb && query.cb(query.uid, flist, apflist, focusflist);
    }

    private _load_friends(query: ifQueryCatch) {
        friend_mysqlInst.query(`select iuid,ifuid from tab_friends where (ifuid=${query.uid} and kplt='${query._sys_.plt}') union select iuid,ifuid from tab_friends where (iuid=${query.uid} and kplt='${query._sys_.plt}');`, this._load_friends_back.bind(this, query));
    }

    private _parse_friends(plt: string, uid: number, reuslt: any[]) {
        var apply_friends = [];
        var apply_to_friends = [];
        var sure_friends: number[] = [];
        var o_apply: number[] = [];

        for (var i = 0; i < reuslt.length; i++) {
            var iu = parseInt(reuslt[i]['iuid']);
            var ifu = parseInt(reuslt[i]['ifuid']);

            // 这里需要区分一下是好友请求
            //还是好友
            var s_id = 0;
            if (uid != iu) {
                // 这里是别人关注我的
                s_id = iu;
            }
            else {
                // 这里是我关注别人的
                s_id = ifu;
            }

            if (o_apply.indexOf(s_id) >= 0) {
                sure_friends.push(s_id);
                arrayDel(apply_friends, s_id);
                arrayDel(apply_to_friends, s_id);
            }
            else {
                // 别人申请添加我为好友的
                if (uid != iu) apply_friends.push(s_id);
                else apply_to_friends.push(s_id);
                o_apply.push(s_id);
            }
        }

        this._friends.set(this.friendkey(plt, uid), sure_friends);
        this._apply_friends.set(this.friendkey(plt, uid), apply_friends);
        this._focus_friends.set(this.friendkey(plt, uid), apply_to_friends);

        return sure_friends.concat(apply_friends);
    }

    private _load_friends_back(query: ifQueryCatch, err, reuslt) {
        if (!err && reuslt instanceof Array) {
            var friends = this._parse_friends(query._sys_.plt, query.uid, reuslt);
            // 加载了好友id，再加载一下好友的名字
            this._get_friend_infos(query, friends);
        }
        else {
            if (err) console.log(err);
            this._add_friends(query, []);
        }
    }

    private _load_friend_infos(query: ifQueryCatch, friends: Array<number>) {
        var list = friend_mysqlInst.getTableInfo('tab_friend_info');
        friend_mysqlInst.query(`select ${list.join(',')} from tab_friend_info where kID in('${friends.join("','")}') and kplt='${query._sys_.plt}';`, this._load_friend_infos_back.bind(this, query));
    }

    private _load_friend_infos_back(query: ifQueryCatch, err, reuslt: ifFriendinfo[]) {
        if (!err && reuslt instanceof Array) {
            var friends: ifFriendinfo[] = [];
            for (var i = 0; i < reuslt.length; i++) {
                if (reuslt[i]) {
                    reuslt[i].kID = parseInt(reuslt[i].kID.toString());
                    if (reuslt[i].avatar) {
                        try {
                            reuslt[i].avatar = JSON.parse(reuslt[i].avatar);
                        }
                        catch (e) {

                        }
                    }
                    friends.push(reuslt[i]);
                }
            }

            this._add_friends(query, friends)
        }
        else {
            if (err) console.log(err);
            this._add_friends(query, [])
        }
    }

    max_friend_count = 500;

    /**
     * 成为好友
     * @param uid_a 
     * @param uid_b 
     */
    make_friend(_sys_: if_sys_, uid_a: number, uid_b: number) {
        var ids = [uid_a, uid_b];
        // 两个人成为好友，前提是已经互相同意过了 而且好友数量有上限，暂定是30个吧
        // 看看缓存里面有没有两个人
        if (this._friends.has(this.friendkey(_sys_.plt, uid_a))) {
            var f_a = this._friends.get(this.friendkey(_sys_.plt, uid_a));
            if (f_a.indexOf(uid_b) < 0 && f_a.length < this.max_friend_count) this._friends.add(this.friendkey(_sys_.plt, uid_a), uid_b);
            else return false;
        }

        if (this._friends.has(this.friendkey(_sys_.plt, uid_b))) {
            var f_b = this._friends.get(this.friendkey(_sys_.plt, uid_b));
            if (f_b.indexOf(uid_a) < 0 && f_b.length < this.max_friend_count) this._friends.add(this.friendkey(_sys_.plt, uid_b), uid_a);
            else return false;
        }

        // 看看对方有没有发起申请
        var ap_list = this._apply_friends.get(this.friendkey(_sys_.plt, uid_a));
        if (!arrayHas(ap_list, uid_b)) return false;
        arrayDel(ap_list, uid_b);
        

        // 记录一条数据到数据库
        friend_mysqlInst.call_func('focus_friend', [uid_a, uid_b, `'${_sys_.plt}'`]);


        var apt_list = this._focus_friends.get(this.friendkey(_sys_.plt, uid_b));
        arrayDel(apt_list, uid_a);
        //解决比赛后发起添加会有2个好友的bug
        var list1 = this._focus_friends.get(this.friendkey(_sys_.plt, uid_a));
        arrayDel(list1, uid_b);
        var list2 = this._apply_friends.get(this.friendkey(_sys_.plt, uid_b));
        arrayDel(list2, uid_a);

        this.route_to_uid(_sys_.plt, uid_a, {
            type: 'make_friend',
            fuid: uid_b,
            finfo: this.getFriendInfo(_sys_.plt, uid_b)
        })

        this.route_to_uid(_sys_.plt, uid_b, {
            type: 'make_friend',
            fuid: uid_a,
            finfo: this.getFriendInfo(_sys_.plt, uid_a)
        })
        return true;
    }

    getFriendInfo(plt: string, uid: number) {
        if (!this._friendInfo.has(this.friendkey(plt, uid))) {
            return null;
        }
        var o: any = func_copy(this._friendInfo.get(this.friendkey(plt, uid)));;
        var ol = this._online_friends.get(this.friendkey(plt, uid));
        if (ol) {
            o.state = ol.state;
        }
        else {
            o.state = 'offline';
        }

        delete o.loaded;

        return o as ifFriendInfo;
    }

    /**
     * 断绝关系
     * @param uid_a 
     * @param uid_b 
     */
    del_friend(_sys_: if_sys_, uid_a: number, uid_b: number) {
        // 两个人成为好友，前提是已经互相同意过了
        // 看看缓存里面有没有两个人
        var isF = true;
        if (this._friends.has(this.friendkey(_sys_.plt, uid_a))) {
            let f_a = this._friends.get(this.friendkey(_sys_.plt, uid_a));
            let idx_a = f_a.indexOf(uid_b)
            if (idx_a >= 0) {
                f_a.splice(idx_a, 1);
                this._friends.set(this.friendkey(_sys_.plt, uid_a), f_a);
            }
        }

        if (this._friends.has(this.friendkey(_sys_.plt, uid_b))) {
            let f_b = this._friends.get(this.friendkey(_sys_.plt, uid_b));
            let idx_b = f_b.indexOf(uid_a);
            if (idx_b >= 0) {
                f_b.splice(idx_b, 1);
                this._friends.set(this.friendkey(_sys_.plt, uid_b), f_b);
            }
        }

        if (this._apply_friends.has(this.friendkey(_sys_.plt, uid_a))) {
            let f_a = this._apply_friends.get(this.friendkey(_sys_.plt, uid_a));
            let idx_a = f_a.indexOf(uid_b)
            if (idx_a >= 0) {
                f_a.splice(idx_a, 1);
                this._apply_friends.set(this.friendkey(_sys_.plt, uid_a), f_a);
            }
        }

        // 确认目录清楚
        if (this._apply_friends.has(this.friendkey(_sys_.plt, uid_b))) {
            let f_b = this._apply_friends.get(this.friendkey(_sys_.plt, uid_b));
            let idx_b = f_b.indexOf(uid_a);
            if (idx_b >= 0) {
                f_b.splice(idx_b, 1);
                this._apply_friends.set(this.friendkey(_sys_.plt, uid_b), f_b);
            }
        }

        if (this._focus_friends.has(this.friendkey(_sys_.plt, uid_a))) {
            let f_a = this._focus_friends.get(this.friendkey(_sys_.plt, uid_a));
            let idx_a = f_a.indexOf(uid_b)
            if (idx_a >= 0) {
                f_a.splice(idx_a, 1);
                this._focus_friends.set(this.friendkey(_sys_.plt, uid_a), f_a);
            }
        }


        // 申请目录清楚
        if (this._focus_friends.has(this.friendkey(_sys_.plt, uid_b))) {
            let f_b = this._focus_friends.get(this.friendkey(_sys_.plt, uid_b));
            let idx_b = f_b.indexOf(uid_a);
            if (idx_b >= 0) {
                f_b.splice(idx_b, 1);
                this._focus_friends.set(this.friendkey(_sys_.plt, uid_b), f_b);
            }
        }

        if (isF) {
            // 数据库中清除掉
            friend_mysqlInst.query(`delete from \`tab_friends\` where iuid in(${uid_a},${uid_b}) and ifuid in(${uid_a},${uid_b}) and kplt='${_sys_.plt}';`, (err, res) => {
                if (err) console.log(err)
            })
        }

        this.route_to_uid(_sys_.plt, uid_a, {
            type: 'del_friend',
            fuid: uid_b
        })

        this.route_to_uid(_sys_.plt, uid_b, {
            type: 'del_friend',
            fuid: uid_a
        })

        return true;
    }

    /**
     * 取消所有的添加好友申请
     * @param uid 
     */
    clear_make_player_apply(_sys_: if_sys_, uid: number) {
        // 先找到这个玩家的所有等待确认好友列表
        if (!this._apply_friends.has(this.friendkey(_sys_.plt, uid))) return true;

        let uids = this._apply_friends.get(this.friendkey(_sys_.plt, uid));
        if (uids.length <= 0) return true;

        for (let i = 0; i < uids.length; i++) {
            // 从缓存的请求发起者那里删掉自己的信息
            let uid_a = uids[i];
            if (this._focus_friends.has(this.friendkey(_sys_.plt, uid_a))) {
                let f_a = this._focus_friends.get(this.friendkey(_sys_.plt, uid_a));
                let idx_a = f_a.indexOf(uid)
                if (idx_a >= 0) {
                    f_a.splice(idx_a, 1);
                    this._focus_friends.set(this.friendkey(_sys_.plt, uid_a), f_a);

                    // 通知玩家我们清除掉你的数据了
                    this.route_to_uid(_sys_.plt, uid_a, {
                        type: 'del_friend',
                        fuid: uid
                    })
                }
            }
        }
        // 删除所有添加者
        this._apply_friends.del(this.friendkey(_sys_.plt, uid));
        // 数据库中清除掉

        // 删除的时候由于长度问题,这里控制一下
        let send_list = [];
        for (let i = 0; i < uids.length; i++) {
            send_list.push(uids[i]);
            if (send_list.length >= 50) {
                friend_mysqlInst.query(`delete from \`tab_friends\` where iuid in(${send_list.join(',')}) and ifuid=${uid} and kplt='${_sys_.plt}';`, (err, res) => {
                    if (err) console.log(err)
                });
                send_list = [];
            }
        }

        if (send_list.length > 0) {
            friend_mysqlInst.query(`delete from \`tab_friends\` where iuid in(${send_list.join(',')}) and ifuid=${uid} and kplt='${_sys_.plt}';`, (err, res) => {
                if (err) console.log(err)
            });
        }

        return true;
    }

    /**
     * 查询玩家是否存在
     * @param uid 
     */
    find_player(_sys_: if_sys_, uid: number, cb: (uid: number, info: ifFriendInfo[]) => void) {
        if (this._friendInfo.has(this.friendkey(_sys_.plt, uid))) {
            // 如果缓存里面有这个玩家信息
            cb(uid, [this.getFriendInfo(_sys_.plt, uid)]);
        }
        else {
            var list = friend_mysqlInst.getTableInfo('tab_friend_info');
            friend_mysqlInst.query(`select ${list.join(',')} from \`tab_friend_info\` where kID = '${uid}' and kplt='${_sys_.plt}' limit 1;`, (err, res) => {
                if (!err && res && res[0]) {
                    // 玩家数据库中存在的
                    var outs = [];
                    for (var i = 0; i < res.length; i++) {
                        var o = func_copy<ifFriendInfo>(res[i] as any);

                        if (o.avatar) {
                            try {
                                o.avatar = JSON.parse(o.avatar);
                            }
                            catch (e) {

                            }
                        }
                        else {
                            o.avatar = {};
                        }
                        o.state = 'offline';
                        outs.push(o);
                    }

                    cb(uid, outs);
                }
                else {
                    if (err) console.log(err);
                    cb(uid, null);
                }
            })
        }
    }
}

export var friendInst = new friendMgr();
