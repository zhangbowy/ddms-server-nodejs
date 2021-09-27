import { HashMap, TeMap, if_sys_, TeRandom, TeDate } from '../lib/TeTool';
import { ReHash, ReHashMember } from '../lib/TeRedis';
import { redistInst, gmMgrInst } from './GMMgr';

import { netMgrInst } from '../NetMgr/NetMgr';
import { QzoneManagerInst } from '../apilibs/ExtInfoLoader';
import { HYQQMoneyInst } from './HYQQMoney';
import { SeResModule } from '../lib/ResModule';
import { onlineMgrInst } from './OnlinePlayer';

enum SeEnumInviteCodeeReFresh {
    Wu = 0,
    MeiZhou = 1,
    MeiYue = 2,
    MeiRi = 3,
}

interface SeResInviteCode {
    kID?: string;
    kGroupID?: string;
    eType?: number;
    iUseNum?: number;
    kNotice?: string;
    akAward?: Array<string>;
    kFinishTime?: string;
    eReFresh?: number;
    kPltApi?: string;    // 第三方校验api
    akExtNotice: string;
}

interface ifCodeDbInfo {
    uid?: number;
    code?: string;
    group?: string;
    cttime: number;
}

enum SeEnumInviteCodeeType {
    YiCiYouXiao = 1,
    DuoCiYouXiao = 2,
    BuPanDingZuDeYiCiYouXiao = 3,
}

export enum InviteCode {
    IC_SUCC = 0,
    IC_CODE_ERROR = 1, // 错误的码
    IC_CODE_TIMEOUT = 2, // 码过期了
    IC_CODE_EMPTY = 3, // 码次数用光了
    IC_CODE_LIMIT = 4, // 兑换达到上限

    IC_CODE_USED = 5, // 码被用过了
    IC_UID_USED = 6, // 玩家领取过同类型的了

    IC_PLT_BUSY = 100,
    IC_PLT_SCORE_LIMIT = 101,
    IC_PLT_LEVEL_LIMIT = 102,
    IC_PLT_TIME_LIMIT = 103,
    IC_PLT_COUNT_LIMIT = 104,
    IC_PLT_LEVEL_NOT_MATCH = 105,
}

interface ifInviteUnit {
    realnum: number,    // 实际使用了的次数
    usecount: number,   // 使用次数
    ctcount: number,    // 生成数量
    st_seed: number,    // 起始种子
    ft_seed: number,     // 结束种子
    onlynum: number,
    date: number,
    addcount: number,    // 每次领取后显示增加的数量
}

export class CTList<T> {
    private _data: T[] = [];
    private _count: number = 0;
    push(v: T) {
        if (this._data.indexOf(v) >= 0) {
            return;
        }

        this._data.push(v);
        this._count++;
    }

    get length() {
        return this._count;
    }

    at(index: number) {
        return this._data[index];
    }

    get data() {
        return this._data;
    }
}

export class InviteCodePlt {
    // 邀请码需要从文件中加载

    // private _hash_lock: HashMap<number> = new HashMap<number>();

    private _random_pool: number[] = [];
    private _random_num: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    private _code_length = 10;

    private _Hash_DB: ReHash;
    private _ready_ = false;

    plt: string = 'sdw';

    private __invite_db_head = 'invite_';

    get _invite_db_head() {
        if (['sdw', 'qzone', 'wx', 'oppo', 'huawei', 'xiaomi', 'tt', '4399', 'swan'].indexOf(this.plt) >= 0) {
            return this.__invite_db_head;
        }
        else {
            return this.__invite_db_head + '_' + this.plt + '_';
        }
    }

    private inviteRes: SeResModule<SeResInviteCode>;

    constructor() {
        // this.plt = plt;
        for (var i = ('A'.charCodeAt(0)); i <= ('Z'.charCodeAt(0)); i++) {
            this._random_pool.push(i);
        }

        for (var i = ('0'.charCodeAt(0)); i <= ('9'.charCodeAt(0)); i++) {
            this._random_pool.push(i);
        }

    }

    get ready() {
        return this._ready_;
    }

    init(plt: string, cb?: () => void) {
        this.plt = plt;
        this.inviteRes = new SeResModule<SeResInviteCode>('InviteCode.json', this.plt);
        this._Hash_DB = redistInst.getHash('invitecode' + this.plt);
        this._Hash_DB.load(() => {
            this._ready_ = true;
            var Infos = this._Hash_DB.value;
            for (var key in Infos) {
                var inviteId = key;
                var info: ifInviteUnit = Infos[key];

                var infoRes = this.inviteRes.getRes(inviteId);
                if (!infoRes) continue;
                if (infoRes.kFinishTime && Date.now() > (new Date(infoRes.kFinishTime)).getTime()) continue;

                var ft_seed = this._create_code(inviteId, info.ctcount, info.st_seed, info.onlynum);
                if (ft_seed != info.ft_seed) console.log(inviteId + 'create seed error');
            }

            cb && cb();
        })
    }

    private _is_right_code_(code: string) {
        var c1 = code.charAt(code.length - 1);
        if (c1 != this._gen_check_key(code)) return false;
        return true;
    }

    private _get_invite_code(code: string) {
        var allRes = this.inviteRes.getAllRes();
        for(var key in allRes){
            if(allRes[key].kAlias == code){
                return '' + allRes[key].kID;
            }
        }

        if (code.length < 5) {
            return code;
        }

        if (!this._is_right_code_(code)) return '';

        var c1 = code.charAt(code.length - 1);
        var codeList = this._invite_code_pos();
        var out = '';
        for (var i = 0; i < codeList.length; i++) {
            out += code[codeList[i]];
        }

        return out;
    }

    private _set_invite_code(invite_code: string, opt: string[], onlynum: number) {
        var codeList = this._invite_code_pos();
        var out: string[] = [];
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

    private _invite_code_pos() {
        var code_rect: number[] = [0, 1, 2, 3];
        return code_rect;
    }


    // 稳定顺序，但是增加验证位的方式
    private _gen_check_key(code: string) {

        var onlynum = true;
        // 检查一下是否是纯数字的模式
        for (var i = 0; i < code.length; i++) {
            var c = code.charAt(i);
            if (c > '9' || c < '0') {
                onlynum = false; break;
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


    private _random_code(onlynum: number) {
        if (onlynum) {
            return this._random_num[this._random_.randInt(0, this._random_num.length)];
        }

        var c = this._random_pool[this._random_.randInt(0, this._random_pool.length)];
        return String.fromCharCode(c);
    }

    private _random_: TeRandom = new TeRandom();
    private _codeList_: HashMap<string> = new HashMap<string>();

    private _create_code(inviteId: string, num: number, seed: number, onlynum: number) {
        this._random_.reset(seed);
        this._codeList_.del(inviteId);
        var outMap: CTList<string> = new CTList<string>();
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

    private _is_in_code_list(inviteId: string, code: string) {
        var codes = this._codeList_.get(inviteId);
        if (!codes || codes.length == 0) return;

        if (codes.indexOf(code) >= 0) {
            return true;
        }

        return false;
    }

    query_Invite(gmid: string) {
        var out = {};
        var Infos = this._Hash_DB.value;
        for (var key in Infos) {
            var inviteId = key;
            var info: ifInviteUnit = Infos[key];

            var infoRes = this.inviteRes.getRes(inviteId);
            if (!infoRes) continue;
            if (infoRes.kFinishTime && Date.now() > (new Date(infoRes.kFinishTime)).getTime()) continue;

            out[key] = info;
        }

        gmMgrInst.sendQueryInviteRet(gmid, out, this.plt);
    }

    create_code(inviteId: string, num: number, seed: number, ft_seed: number, onlynum: number, addcount: number, gmid: string) {
        // 这里需要记录新的邀请码的信息
        var r = this.inviteRes.getRes(inviteId);
        if (!r) return gmMgrInst.sendCreateInviteRet(gmid, inviteId, null, this.plt);

        /**
         * 每个批次的账号原则上只能生成一次 或者说 起始种子需要固定
         */
        var rInfo: ifInviteUnit = this._Hash_DB.get(inviteId);
        if (rInfo && rInfo.st_seed != seed) {
            return gmMgrInst.sendCreateInviteRet(gmid, inviteId, null, this.plt);
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
            }
        }

        rInfo.ctcount = num;
        rInfo.st_seed = seed;
        rInfo.ft_seed = _ft_seed;
        rInfo.onlynum = onlynum;
        rInfo.addcount = addcount;
        rInfo.date = Date.now();

        this._Hash_DB.save(inviteId, rInfo);

        if (_ft_seed != ft_seed) console.log(inviteId + 'create seed error');
        return gmMgrInst.sendCreateInviteRet(gmid, inviteId, rInfo, this.plt);
    }

    /**
     * 通过礼包ID直接获取奖励 游戏本身不允许，除非有第三方机构验证
     * @param inviteID 
     * @param uid 
     * @param sid 
     * @param openid 
     * @param openkey 
     */
    checkInviteID(inviteID: string, uid: number, sid: string, openid: string, openkey: string) {
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
        QzoneManagerInst.check_gift_code(this.plt, inviteRes.kPltApi, uid, openid, openkey, inviteID, this._check_code_.bind(this, inviteRes.eType, inviteID, uid, sid));
        return true;
    }

    checkInvite(code: string, uid: number, sid: string, openid: string, openkey: string) {
        //如果输入的是别名，直接找配置
        var allRes = this.inviteRes.getAllRes();
        var useAlias = false;
        for(var key in allRes){
            if(allRes[key].kAlias == code){
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
        var rInfo: ifInviteUnit = this._Hash_DB.get(inviteID);
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
            QzoneManagerInst.check_gift_code(this.plt, infoRes.kPltApi, uid, openid, openkey, code, this._check_code_.bind(this, infoRes.eType, code, uid, sid));
        }
        else {
            // 判断这个邀请码是否领取过了
            this._check_code_(infoRes.eType, code, uid, sid, 0);
        }

        return true;
    }


    private _web_code_backs: HashMap<{ code: string, back_fn: (s: any) => void }> = new HashMap();
    webbackcache(code: string, uid: number, back_fn: (s: any) => void) {
        this._web_code_backs.add(uid, { code: code, back_fn: back_fn });
    }

    webbackcall(code: string, uid: number, type: InviteCode) {
        let infos = this._web_code_backs.get(uid);
        if (infos.length == 0) return;
        for (let i = 0; i < infos.length; i++) {
            let r = infos[i];
            if (r.code != code) continue;
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

    checkInvite_web(code: string, uid: number, cb: (...args: any[]) => void) {
        this.webbackcache(code, uid, cb);
        let sid = onlineMgrInst.getOnlinePlayerCSId(uid, this.plt);
        if (code.length < 5) {
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, code, sid);
            return false;
        }

        if (!this._is_right_code_(code)) {
            this.anser_checkInvite(InviteCode.IC_CODE_ERROR, uid, code, sid);
            return false;
        }

        var inviteID = this._get_invite_code(code);
        var rInfo: ifInviteUnit = this._Hash_DB.get(inviteID);
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


    public _check_code_(eType: number, code: string, uid: number, sid: string, succ: number) {
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
    private _check_fresh_(info: ifCodeDbInfo, code: string) {
        if (typeof info != 'object' || !info) return true;
        var inviteId = this._get_invite_code(code);
        var pkRes = this.inviteRes.getRes(inviteId);
        if (!pkRes || !pkRes.eReFresh) {
            return false;
        }

        if (pkRes.eReFresh == SeEnumInviteCodeeReFresh.MeiYue) {
            if (!TeDate.Isdiffweek(info.cttime, Date.now())) {
                return false;
            }
        }
        else if (pkRes.eReFresh == SeEnumInviteCodeeReFresh.MeiZhou) {
            if (!TeDate.Isdiffmonth(info.cttime, Date.now())) {
                return false;
            }
        }
        else if (pkRes.eReFresh == SeEnumInviteCodeeReFresh.MeiRi) {
            if (!TeDate.Isdiffday(info.cttime, Date.now())) {
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
    private _check_code_use(code: string, uid: number, sid: string, checkgroup: boolean = true) {
        var inviteID = this._get_invite_code(code);
        var db = redistInst.getHashMember(this._invite_db_head + inviteID, code);
        db.load(this._check_code_use_back.bind(this, code, checkgroup, uid, sid));
    }

    private _check_code_use_back(code: string, checkgroup: boolean, uid: number, sid: string, succ: boolean, db: ReHashMember) {
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
    private _check_group_uid(code: string, uid: number, sid: string, checkgroup: boolean = true) {
        var inviteID = this._get_invite_code(code);
        var infoRes = this.inviteRes.getRes(inviteID);
        var db = redistInst.getHashMember(this._invite_db_head + infoRes.kGroupID, uid.toString());
        db.load(this._check_group_uid_back.bind(this, code, checkgroup, uid, sid))
    }

    private _check_group_uid_back(code: string, checkgroup: boolean, uid: number, sid: string, succ: boolean, db: ReHashMember) {
        if (checkgroup && succ && !this._check_fresh_(db.value, code)) {
            // 这个玩家领取过相同分组的
            this.anser_checkInvite(InviteCode.IC_UID_USED, uid, code, sid);
            return false;
        }

        this._give_gift(code, uid, sid);
    }

    private _give_gift(code: string, uid: number, sid: string) {
        var inviteID = this._get_invite_code(code);
        var infoRes = this.inviteRes.getRes(inviteID);
        var rInfo: ifInviteUnit = this._Hash_DB.get(inviteID);
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

        var info: ifCodeDbInfo = {
            uid: uid,
            code: code,
            group: infoRes.kGroupID,
            cttime: Date.now()
        }

        redistInst.getHashMember(this._invite_db_head + inviteID, code).save(info);
        redistInst.getHashMember(this._invite_db_head + infoRes.kGroupID, uid.toString()).save(info);

        this.anser_checkInvite(InviteCode.IC_SUCC, uid, code, sid);
    }

    anser_checkInvite(type: InviteCode, uid: number, code: string, sid: string) {
        var awards: { kItemID: string, iPileCount: number }[] = [];
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

        this.webbackcall(code, uid, type)

        netMgrInst.sendInviteRet(sid, type, awards, code, uid, mailmsg, extNotice);
    }

    queryInviteCode(ids: string[], uid: number, sid: string) {
        // 玩家查询id
        var outMap = {};
        for (var i = 0; i < ids.length; i++) {
            var inviteID = ids[i];
            var infoRes = this.inviteRes.getRes(inviteID);
            var rInfo: ifInviteUnit = this._Hash_DB.get(inviteID);
            if (!infoRes || !rInfo) {
                outMap[inviteID] = {
                    kid: inviteID,
                    usenum: 0,
                    totnum: 0,
                }
            }
            else {
                outMap[inviteID] = {
                    kid: inviteID,
                    usenum: rInfo.usecount,
                    totnum: rInfo.ctcount,
                }
            }
        }

        netMgrInst.sendQueryInviteRet(sid, uid, outMap);
    }
}

class InviteCodeMgr {
    plt_map: TeMap<InviteCodePlt> = new TeMap<InviteCodePlt>();


    constructor() {
    }

    /**
     * 注册平台上去，改掉之前的手动定义平台的方式
     * @param plt 
     */
    registPlt(plt: string) {
        if (this.plt_map.has(plt)) return;
        let code = new InviteCodePlt();
        this.plt_map.set(plt, code);
        code.init(plt);
    }

    // 通过礼包码兑换码兑换道具
    checkInvite(_sys_: if_sys_, code: string, uid: number, openid: string, openkey: string) {
        var r = this.plt_map.get(_sys_.plt);
        if (r && r.ready) r.checkInvite(code, uid, _sys_.serverid, openid, openkey);
    }

    // 网页版礼包码兑换道具
    checkInvite_web(plt: string, inviteid: string, uid: number, cb: (s: any) => void) {
        var r = this.plt_map.get(plt);
        if (r && r.ready) r.checkInvite_web(inviteid, uid, cb);
        else cb({ type: 1, code: inviteid, uid: uid, msg: 'no plt[' + plt + '] find' })
    }

    queryInviteCode(_sys_: if_sys_, ids: string[], uid: number) {
        var r = this.plt_map.get(_sys_.plt);
        if (r && r.ready) r.queryInviteCode(ids, uid, _sys_.serverid);
    }

    create_code(plt: string, inviteId: string, num: number, seed: number, ft_seed: number, onlynum: number, addcount: number, gmid: string = '') {
        var r = this.plt_map.get(plt);
        if (r && r.ready) r.create_code(inviteId, num, seed, ft_seed, onlynum, addcount, gmid);

        return;
    }

    query_invite(plt: string, gmid: string) {
        var r = this.plt_map.get(plt);
        if (r && r.ready) r.query_Invite(gmid);

        return;
    }
}

export var InviteCodeMgrInst = new InviteCodeMgr();