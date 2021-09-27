"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteCodeMgrInst = exports.InviteCodePlt = exports.CTList = exports.InviteCode = void 0;
const TeTool_1 = require("../lib/TeTool");
const GMMgr_1 = require("./GMMgr");
const NetMgr_1 = require("../NetMgr/NetMgr");
const ExtInfoLoader_1 = require("../apilibs/ExtInfoLoader");
const ResModule_1 = require("../lib/ResModule");
const OnlinePlayer_1 = require("./OnlinePlayer");
var SeEnumInviteCodeeReFresh;
(function (SeEnumInviteCodeeReFresh) {
    SeEnumInviteCodeeReFresh[SeEnumInviteCodeeReFresh["Wu"] = 0] = "Wu";
    SeEnumInviteCodeeReFresh[SeEnumInviteCodeeReFresh["MeiZhou"] = 1] = "MeiZhou";
    SeEnumInviteCodeeReFresh[SeEnumInviteCodeeReFresh["MeiYue"] = 2] = "MeiYue";
    SeEnumInviteCodeeReFresh[SeEnumInviteCodeeReFresh["MeiRi"] = 3] = "MeiRi";
})(SeEnumInviteCodeeReFresh || (SeEnumInviteCodeeReFresh = {}));
var SeEnumInviteCodeeType;
(function (SeEnumInviteCodeeType) {
    SeEnumInviteCodeeType[SeEnumInviteCodeeType["YiCiYouXiao"] = 1] = "YiCiYouXiao";
    SeEnumInviteCodeeType[SeEnumInviteCodeeType["DuoCiYouXiao"] = 2] = "DuoCiYouXiao";
    SeEnumInviteCodeeType[SeEnumInviteCodeeType["BuPanDingZuDeYiCiYouXiao"] = 3] = "BuPanDingZuDeYiCiYouXiao";
})(SeEnumInviteCodeeType || (SeEnumInviteCodeeType = {}));
var InviteCode;
(function (InviteCode) {
    InviteCode[InviteCode["IC_SUCC"] = 0] = "IC_SUCC";
    InviteCode[InviteCode["IC_CODE_ERROR"] = 1] = "IC_CODE_ERROR";
    InviteCode[InviteCode["IC_CODE_TIMEOUT"] = 2] = "IC_CODE_TIMEOUT";
    InviteCode[InviteCode["IC_CODE_EMPTY"] = 3] = "IC_CODE_EMPTY";
    InviteCode[InviteCode["IC_CODE_LIMIT"] = 4] = "IC_CODE_LIMIT";
    InviteCode[InviteCode["IC_CODE_USED"] = 5] = "IC_CODE_USED";
    InviteCode[InviteCode["IC_UID_USED"] = 6] = "IC_UID_USED";
    InviteCode[InviteCode["IC_PLT_BUSY"] = 100] = "IC_PLT_BUSY";
    InviteCode[InviteCode["IC_PLT_SCORE_LIMIT"] = 101] = "IC_PLT_SCORE_LIMIT";
    InviteCode[InviteCode["IC_PLT_LEVEL_LIMIT"] = 102] = "IC_PLT_LEVEL_LIMIT";
    InviteCode[InviteCode["IC_PLT_TIME_LIMIT"] = 103] = "IC_PLT_TIME_LIMIT";
    InviteCode[InviteCode["IC_PLT_COUNT_LIMIT"] = 104] = "IC_PLT_COUNT_LIMIT";
    InviteCode[InviteCode["IC_PLT_LEVEL_NOT_MATCH"] = 105] = "IC_PLT_LEVEL_NOT_MATCH";
})(InviteCode = exports.InviteCode || (exports.InviteCode = {}));
class CTList {
    constructor() {
        this._data = [];
        this._count = 0;
    }
    push(v) {
        if (this._data.indexOf(v) >= 0) {
            return;
        }
        this._data.push(v);
        this._count++;
    }
    get length() {
        return this._count;
    }
    at(index) {
        return this._data[index];
    }
    get data() {
        return this._data;
    }
}
exports.CTList = CTList;
class InviteCodePlt {
    constructor() {
        // 邀请码需要从文件中加载
        // private _hash_lock: HashMap<number> = new HashMap<number>();
        this._random_pool = [];
        this._random_num = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        this._code_length = 10;
        this._ready_ = false;
        this.plt = 'sdw';
        this.__invite_db_head = 'invite_';
        this._random_ = new TeTool_1.TeRandom();
        this._codeList_ = new TeTool_1.HashMap();
        this._web_code_backs = new TeTool_1.HashMap();
        // this.plt = plt;
        for (var i = ('A'.charCodeAt(0)); i <= ('Z'.charCodeAt(0)); i++) {
            this._random_pool.push(i);
        }
        for (var i = ('0'.charCodeAt(0)); i <= ('9'.charCodeAt(0)); i++) {
            this._random_pool.push(i);
        }
    }
    get _invite_db_head() {
        if (['sdw', 'qzone', 'wx', 'oppo', 'huawei', 'xiaomi', 'tt', '4399', 'swan'].indexOf(this.plt) >= 0) {
            return this.__invite_db_head;
        }
        else {
            return this.__invite_db_head + '_' + this.plt + '_';
        }
    }
    get ready() {
        return this._ready_;
    }
    init(plt, cb) {
        this.plt = plt;
        this.inviteRes = new ResModule_1.SeResModule('InviteCode.json', this.plt);
        this._Hash_DB = GMMgr_1.redistInst.getHash('invitecode' + this.plt);
        this._Hash_DB.load(() => {
            this._ready_ = true;
            var Infos = this._Hash_DB.value;
            for (var key in Infos) {
                var inviteId = key;
                var info = Infos[key];
                var infoRes = this.inviteRes.getRes(inviteId);
                if (!infoRes)
                    continue;
                if (infoRes.kFinishTime && Date.now() > (new Date(infoRes.kFinishTime)).getTime())
                    continue;
                var ft_seed = this._create_code(inviteId, info.ctcount, info.st_seed, info.onlynum);
                if (ft_seed != info.ft_seed)
                    console.log(inviteId + 'create seed error');
            }
            cb && cb();
        });
    }
    _is_right_code_(code) {
        var c1 = code.charAt(code.length - 1);
        if (c1 != this._gen_check_key(code))
            return false;
        return true;
    }
    _get_invite_code(code) {
        var allRes = this.inviteRes.getAllRes();
        for (var key in allRes) {
            if (allRes[key].kAlias == code) {
                return '' + allRes[key].kID;
            }
        }
        if (code.length < 5) {
            return code;
        }
        if (!this._is_right_code_(code))
            return '';
        var c1 = code.charAt(code.length - 1);
        var codeList = this._invite_code_pos();
        var out = '';
        for (var i = 0; i < codeList.length; i++) {
            out += code[codeList[i]];
        }
        return out;
    }
    _set_invite_code(invite_code, opt, onlynum) {
        var codeList = this._invite_code_pos();
        var out = [];
        for (var i = 0; i < codeList.length; i++) {
            out[codeList[i]] = invite_code.charAt(i);
        }
        var outstr = '';
        for (var i = 0; i < this._code_length - 1; i++) {
            if (!out[i] && opt) {
                out[i] = opt.shift();
            }
            outstr += out[i];
        }
        outstr += this._gen_check_key(outstr);
        return outstr;
    }
    _invite_code_pos() {
        var code_rect = [0, 1, 2, 3];
        return code_rect;
    }
    // 稳定顺序，但是增加验证位的方式
    _gen_check_key(code) {
        var onlynum = true;
        // 检查一下是否是纯数字的模式
        for (var i = 0; i < code.length; i++) {
            var c = code.charAt(i);
            if (c > '9' || c < '0') {
                onlynum = false;
                break;
            }
        }
        var totoCode = 0;
        for (var i = 0; i < this._code_length - 1; i++) {
            totoCode += code.charCodeAt(i);
        }
        if (onlynum) {
            return this._random_num[totoCode % this._random_num.length];
        }
        var checkCode = totoCode % this._random_pool.length;
        return String.fromCharCode(this._random_pool[checkCode]);
    }
    _random_code(onlynum) {
        if (onlynum) {
            return this._random_num[this._random_.randInt(0, this._random_num.length)];
        }
        var c = this._random_pool[this._random_.randInt(0, this._random_pool.length)];
        return String.fromCharCode(c);
    }
    _create_code(inviteId, num, seed, onlynum) {
        this._random_.reset(seed);
        this._codeList_.del(inviteId);
        var outMap = new CTList();
        for (var i = 0; outMap.length < num; i++) {
            // 先生成随机用的码 去掉5位的保留符号 所以有 5位
            var useCode = [];
            for (var j = 0; j < 5; j++) {
                useCode.push(this._random_code(onlynum));
            }
            var code = this._set_invite_code(inviteId, useCode, onlynum);
            outMap.push(code);
            this._codeList_.add(inviteId, code);
        }
        return this._random_.seed;
    }
    _is_in_code_list(inviteId, code) {
        var codes = this._codeList_.get(inviteId);
        if (!codes || codes.length == 0)
            return;
        if (codes.indexOf(code) >= 0) {
            return true;
        }
        return false;
    }
    query_Invite(gmid) {
        var out = {};
        var Infos = this._Hash_DB.value;
        for (var key in Infos) {
            var inviteId = key;
            var info = Infos[key];
            var infoRes = this.inviteRes.getRes(inviteId);
            if (!infoRes)
                continue;
            if (infoRes.kFinishTime && Date.now() > (new Date(infoRes.kFinishTime)).getTime())
                continue;
            out[key] = info;
        }
        GMMgr_1.gmMgrInst.sendQueryInviteRet(gmid, out, this.plt);
    }
    create_code(inviteId, num, seed, ft_seed, onlynum, addcount, gmid) {
        // 这里需要记录新的邀请码的信息
        var r = this.inviteRes.getRes(inviteId);
        if (!r)
            return GMMgr_1.gmMgrInst.sendCreateInviteRet(gmid, inviteId, null, this.plt);
        /**
         * 每个批次的账号原则上只能生成一次 或者说 起始种子需要固定
         */
        var rInfo = this._Hash_DB.get(inviteId);
        if (rInfo && rInfo.st_seed != seed) {
            return GMMgr_1.gmMgrInst.sendCreateInviteRet(gmid, inviteId, null, this.plt);
        }
        var _ft_seed = this._create_code(inviteId, num, seed, onlynum);
        // 记录一下生成过程的初始种子和结束种子
        if (!rInfo) {
            rInfo = {
                realnum: 0,
                addcount: 1,
                usecount: 0,
                ctcount: 0,
                st_seed: 0,
                ft_seed: 0,
                onlynum: 0,
                date: 0
            };
        }
        rInfo.ctcount = num;
        rInfo.st_seed = seed;
        rInfo.ft_seed = _ft_seed;
        rInfo.onlynum = onlynum;
        rInfo.addcount = addcount;
        rInfo.date = Date.now();
        this._Hash_DB.save(inviteId, rInfo);
        if (_ft_seed != ft_seed)
            console.log(inviteId + 'create seed error');
        return GMMgr_1.gmMgrInst.sendCreateInviteRet(gmid, inviteId, rInfo, this.plt);
    }
    /**
     * 通过礼包ID直接获取奖励 游戏本身不允许，除非有第三方机构验证
     * @param inviteID
     * @param uid
     * @param sid
     * @param openid
     * @param openkey
     */
    checkInviteID(inviteID, uid, sid, openid, openkey) {
        var inviteRes = this.inviteRes.getRes(inviteID);
        if (!inviteRes) {
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, inviteID, sid);
            return false;
        }
        if (inviteRes.kFinishTime && Date.now() > (new Date(inviteRes.kFinishTime)).getTime()) {
            this.anser_checkInvite(InviteCode.IC_CODE_TIMEOUT, uid, inviteID, sid);
            return false;
        }
        if (!inviteRes.kPltApi) {
            // 如果有验证机制的，那么可以通过这个方式获取，否则不行
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, inviteID, sid);
            return false;
        }
        // 第三方机构检查
        ExtInfoLoader_1.QzoneManagerInst.check_gift_code(this.plt, inviteRes.kPltApi, uid, openid, openkey, inviteID, this._check_code_.bind(this, inviteRes.eType, inviteID, uid, sid));
        return true;
    }
    checkInvite(code, uid, sid, openid, openkey) {
        //如果输入的是别名，直接找配置
        var allRes = this.inviteRes.getAllRes();
        var useAlias = false;
        for (var key in allRes) {
            if (allRes[key].kAlias == code) {
                useAlias = true;
                break;
            }
        }
        if (code.length < 5 && !useAlias) {
            return this.checkInviteID(code, uid, sid, openid, openkey);
        }
        if (!useAlias && !this._is_right_code_(code)) {
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, code, sid);
            return false;
        }
        var inviteID = this._get_invite_code(code);
        var rInfo = this._Hash_DB.get(inviteID);
        var infoRes = this.inviteRes.getRes(inviteID);
        if (!infoRes || !rInfo) {
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, code, sid);
            return false;
        }
        if (infoRes.kFinishTime && Date.now() > (new Date(infoRes.kFinishTime)).getTime()) {
            this.anser_checkInvite(InviteCode.IC_CODE_TIMEOUT, uid, code, sid);
            return false;
        }
        // 判断一下对应的兑换是否还可以领取
        if (infoRes.iUseNum > 0 && (infoRes.iUseNum <= rInfo.usecount)) {
            this.anser_checkInvite(InviteCode.IC_CODE_EMPTY, uid, code, sid);
            return false;
        }
        // 首先需要检查一下这个兑换码是不是我们生成的合法的码
        if (!useAlias && !this._is_in_code_list(inviteID, code)) {
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, code, sid);
            return false;
        }
        // this._Hash_DB.save(inviteID, rInfo);
        // 检测玩家是否领取过了 这个系列的码 { date: Date.now(), inviteid: code }
        // 这里插入一个中间需求，检查第三方api
        if (infoRes.kPltApi && infoRes.kPltApi.length > 0) {
            ExtInfoLoader_1.QzoneManagerInst.check_gift_code(this.plt, infoRes.kPltApi, uid, openid, openkey, code, this._check_code_.bind(this, infoRes.eType, code, uid, sid));
        }
        else {
            // 判断这个邀请码是否领取过了
            this._check_code_(infoRes.eType, code, uid, sid, 0);
        }
        return true;
    }
    webbackcache(code, uid, back_fn) {
        this._web_code_backs.add(uid, { code: code, back_fn: back_fn });
    }
    webbackcall(code, uid, type) {
        let infos = this._web_code_backs.get(uid);
        if (infos.length == 0)
            return;
        for (let i = 0; i < infos.length; i++) {
            let r = infos[i];
            if (r.code != code)
                continue;
            try {
                r.back_fn && r.back_fn({ result: type, uid: uid, code: code });
            }
            catch (e) {
            }
            infos.splice(i, 1);
            i--;
        }
        if (infos.length == 0) {
            this._web_code_backs.del(uid);
        }
        else {
            this._web_code_backs.set(uid, infos);
        }
    }
    checkInvite_web(code, uid, cb) {
        this.webbackcache(code, uid, cb);
        let sid = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(uid, this.plt);
        if (code.length < 5) {
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, code, sid);
            return false;
        }
        if (!this._is_right_code_(code)) {
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, code, sid);
            return false;
        }
        var inviteID = this._get_invite_code(code);
        var rInfo = this._Hash_DB.get(inviteID);
        var infoRes = this.inviteRes.getRes(inviteID);
        if (!infoRes || !rInfo) {
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, code, sid);
            return false;
        }
        if (infoRes.kFinishTime && Date.now() > (new Date(infoRes.kFinishTime)).getTime()) {
            this.anser_checkInvite(InviteCode.IC_CODE_TIMEOUT, uid, code, sid);
            return false;
        }
        // 判断一下对应的兑换是否还可以领取
        if (infoRes.iUseNum > 0 && (infoRes.iUseNum <= rInfo.usecount)) {
            this.anser_checkInvite(InviteCode.IC_CODE_EMPTY, uid, code, sid);
            return false;
        }
        // 首先需要检查一下这个兑换码是不是我们生成的合法的码
        if (!this._is_in_code_list(inviteID, code)) {
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, code, sid);
            return false;
        }
        // this._Hash_DB.save(inviteID, rInfo);
        // 检测玩家是否领取过了 这个系列的码 { date: Date.now(), inviteid: code }
        // 判断这个邀请码是否领取过了
        this._check_code_(infoRes.eType, code, uid, sid, 0);
        return true;
    }
    _check_code_(eType, code, uid, sid, succ) {
        if (succ != 0) {
            this.anser_checkInvite(succ, uid, code, sid);
        }
        else {
            if (eType == SeEnumInviteCodeeType.YiCiYouXiao) {
                // 要请码分为多种
                // 第一种 每个码只能使用一次
                this._check_code_use(code, uid, sid, true);
            }
            else if (eType == SeEnumInviteCodeeType.DuoCiYouXiao) {
                // 第二种 每个码每人人只能使用一次 , 同一个码可以多人使用
                this._check_group_uid(code, uid, sid, true);
            }
            else if (eType == SeEnumInviteCodeeType.BuPanDingZuDeYiCiYouXiao) {
                // 第三种 不判定组
                this._check_code_use(code, uid, sid, false);
            }
        }
    }
    /**
     * 返回是否符合刷新流程
     * @param info
     * @param code
     */
    _check_fresh_(info, code) {
        if (typeof info != 'object' || !info)
            return true;
        var inviteId = this._get_invite_code(code);
        var pkRes = this.inviteRes.getRes(inviteId);
        if (!pkRes || !pkRes.eReFresh) {
            return false;
        }
        if (pkRes.eReFresh == SeEnumInviteCodeeReFresh.MeiYue) {
            if (!TeTool_1.TeDate.Isdiffweek(info.cttime, Date.now())) {
                return false;
            }
        }
        else if (pkRes.eReFresh == SeEnumInviteCodeeReFresh.MeiZhou) {
            if (!TeTool_1.TeDate.Isdiffmonth(info.cttime, Date.now())) {
                return false;
            }
        }
        else if (pkRes.eReFresh == SeEnumInviteCodeeReFresh.MeiRi) {
            if (!TeTool_1.TeDate.Isdiffday(info.cttime, Date.now())) {
                return false;
            }
        }
        else if (pkRes.eReFresh == SeEnumInviteCodeeReFresh.Wu) {
            return false;
        }
        return true;
    }
    /**
     * 检查兑换码是否被使用过了
     * @param code
     * @param uid
     */
    _check_code_use(code, uid, sid, checkgroup = true) {
        var inviteID = this._get_invite_code(code);
        var db = GMMgr_1.redistInst.getHashMember(this._invite_db_head + inviteID, code);
        db.load(this._check_code_use_back.bind(this, code, checkgroup, uid, sid));
    }
    _check_code_use_back(code, checkgroup, uid, sid, succ, db) {
        if (succ && !this._check_fresh_(db ? db.value : null, code)) {
            // 表示这个码被人使用过了
            this.anser_checkInvite(InviteCode.IC_CODE_USED, uid, code, sid);
            return false;
        }
        this._check_group_uid(code, uid, sid, checkgroup);
    }
    /**
     * 检查兑换码对应的分组是否领取过了
     * @param code
     * @param uid
     */
    _check_group_uid(code, uid, sid, checkgroup = true) {
        var inviteID = this._get_invite_code(code);
        var infoRes = this.inviteRes.getRes(inviteID);
        var db = GMMgr_1.redistInst.getHashMember(this._invite_db_head + infoRes.kGroupID, uid.toString());
        db.load(this._check_group_uid_back.bind(this, code, checkgroup, uid, sid));
    }
    _check_group_uid_back(code, checkgroup, uid, sid, succ, db) {
        if (checkgroup && succ && !this._check_fresh_(db.value, code)) {
            // 这个玩家领取过相同分组的
            this.anser_checkInvite(InviteCode.IC_UID_USED, uid, code, sid);
            return false;
        }
        this._give_gift(code, uid, sid);
    }
    _give_gift(code, uid, sid) {
        var inviteID = this._get_invite_code(code);
        var infoRes = this.inviteRes.getRes(inviteID);
        var rInfo = this._Hash_DB.get(inviteID);
        if (!infoRes || !rInfo) {
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, code, sid);
            return false;
        }
        if (infoRes.iUseNum > 0 && infoRes.iUseNum <= rInfo.usecount) {
            this.anser_checkInvite(InviteCode.IC_CODE_EMPTY, uid, code, sid);
            return false;
        }
        rInfo.usecount += (rInfo.addcount || 1);
        rInfo.realnum++;
        this._Hash_DB.save(inviteID, rInfo);
        var info = {
            uid: uid,
            code: code,
            group: infoRes.kGroupID,
            cttime: Date.now()
        };
        GMMgr_1.redistInst.getHashMember(this._invite_db_head + inviteID, code).save(info);
        GMMgr_1.redistInst.getHashMember(this._invite_db_head + infoRes.kGroupID, uid.toString()).save(info);
        this.anser_checkInvite(InviteCode.IC_SUCC, uid, code, sid);
    }
    anser_checkInvite(type, uid, code, sid) {
        var awards = [];
        var mailmsg = '', extNotice = '';
        if (type == InviteCode.IC_SUCC) {
            var inviteID = this._get_invite_code(code);
            var infoRes = this.inviteRes.getRes(inviteID);
            for (var i = 0; i < infoRes.akAward.length; i++) {
                var awds = infoRes.akAward[i].split(',');
                awards.push({ kItemID: awds[0] || '', iPileCount: parseInt(awds[1] || '1') });
            }
            mailmsg = infoRes.kNotice || ('兑换码【' + code + '】的奖励发放');
            extNotice = infoRes.akExtNotice ? (infoRes.akExtNotice[0] || '') : '';
        }
        this.webbackcall(code, uid, type);
        NetMgr_1.netMgrInst.sendInviteRet(sid, type, awards, code, uid, mailmsg, extNotice);
    }
    queryInviteCode(ids, uid, sid) {
        // 玩家查询id
        var outMap = {};
        for (var i = 0; i < ids.length; i++) {
            var inviteID = ids[i];
            var infoRes = this.inviteRes.getRes(inviteID);
            var rInfo = this._Hash_DB.get(inviteID);
            if (!infoRes || !rInfo) {
                outMap[inviteID] = {
                    kid: inviteID,
                    usenum: 0,
                    totnum: 0,
                };
            }
            else {
                outMap[inviteID] = {
                    kid: inviteID,
                    usenum: rInfo.usecount,
                    totnum: rInfo.ctcount,
                };
            }
        }
        NetMgr_1.netMgrInst.sendQueryInviteRet(sid, uid, outMap);
    }
}
exports.InviteCodePlt = InviteCodePlt;
class InviteCodeMgr {
    constructor() {
        this.plt_map = new TeTool_1.TeMap();
    }
    /**
     * 注册平台上去，改掉之前的手动定义平台的方式
     * @param plt
     */
    registPlt(plt) {
        if (this.plt_map.has(plt))
            return;
        let code = new InviteCodePlt();
        this.plt_map.set(plt, code);
        code.init(plt);
    }
    // 通过礼包码兑换码兑换道具
    checkInvite(_sys_, code, uid, openid, openkey) {
        var r = this.plt_map.get(_sys_.plt);
        if (r && r.ready)
            r.checkInvite(code, uid, _sys_.serverid, openid, openkey);
    }
    // 网页版礼包码兑换道具
    checkInvite_web(plt, inviteid, uid, cb) {
        var r = this.plt_map.get(plt);
        if (r && r.ready)
            r.checkInvite_web(inviteid, uid, cb);
        else
            cb({ type: 1, code: inviteid, uid: uid, msg: 'no plt[' + plt + '] find' });
    }
    queryInviteCode(_sys_, ids, uid) {
        var r = this.plt_map.get(_sys_.plt);
        if (r && r.ready)
            r.queryInviteCode(ids, uid, _sys_.serverid);
    }
    create_code(plt, inviteId, num, seed, ft_seed, onlynum, addcount, gmid = '') {
        var r = this.plt_map.get(plt);
        if (r && r.ready)
            r.create_code(inviteId, num, seed, ft_seed, onlynum, addcount, gmid);
        return;
    }
    query_invite(plt, gmid) {
        var r = this.plt_map.get(plt);
        if (r && r.ready)
            r.query_Invite(gmid);
        return;
    }
}
exports.InviteCodeMgrInst = new InviteCodeMgr();
//# sourceMappingURL=InviteCodeMgr.js.map