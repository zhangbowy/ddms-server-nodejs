import { SeRaceOpp, SeRacePvp } from '../SeDefine';
import { HashMap, arrayRandom } from '../lib/TeTool';
import { createHash } from 'crypto';
import { RaceSyncJudge } from './RaceSyncJudge';
import { RaceMgr } from './RaceMgr';
import { netInst } from '../NetMgr/SeNetMgr';
import { g_match_nid } from '../NetMgr/matchProc';
import { netMonitorInst } from '../NetMgr/monitor';
import { configInst } from '../lib/TeConfig';
import { tmpdir } from 'os';
import { resMgrInst } from '../ResMgr/SeResMgr';

var race_secret_key = 'i am a good boy what are you ?';

enum LiveMode {
    match = 0,  // 正常匹配
    race = 1,   // 约战模式
    room = 2,   // show 房间模式
    peak = 3,   // 巅峰赛模式
    lianxi = 4, // 练习赛
    doublemode = 5, // 双倍模式
    shangjin = 6, //赏金赛模式
    pve = 7,     //pve模式
    pve_pk = 8,  //pve带主公的对战
    pvp_1v2 = 9
}

export interface ifRaceRecord {
    kHeroId: string,
    iPlayer: number,
    iLevel: number,
    posX: number,
    posY: number,
    groupID: string,
    offX: number,
    offY: number
}

export interface ifResult {
    winids: number[],
    hps: number[],  // 剩余血量
    iframe: number,
    hpchange: number,
    totaldamage: number,
    rid: string
}


class SeRaceUnit {
    uid: number;
    nid: string;
    ready: boolean = false;
    fail: number = 0;
    side: number = -1;
    sid: string;
}


export interface ifRecordFile {
    rid: string,
    seed: number,
    akRaceInfo: SeRaceOpp[],
    akRaceUnit: SeRaceUnit[],
    akRecord: object,
    akResults: ifResult[],
    akRaceHps: any,
    syncuids: number[],
    finish_frame: number,
    hps: any[],
    joinrecord: any[],
    quitrecord: any[],
    f_time: number,
    racever: string,
}

export enum GameRaceState {
    //地主选举
    select1,
    select2,
    select3,
    select_skill, //选技能
    wait,
    racing,
    wait_start,
    finish,
    cancell,
}

export class RaceUnit {
    private _side_count = 2;
    private _per_side_count;

    private m_RaceSyncJudge: RaceSyncJudge = new RaceSyncJudge(this);

    kID: string;
    /**
     * 当前帧号
     */
    iFrame: number = 0;
    iNextFrame: number = 0;
    /**
     * 最近一次同步的帧号
     */
    iPreFrame: number = 0;

    /**
     * 下一个片段可以执行的帧数
     */
    iFrameRate: number = 10;

    /**
     * 初始随机数种子
     */
    seed: number = 0;

    cttime: number = Date.now();
    racever: string = '';

    /**
     * 严格模式
     * 严格模式下 结算需要在线的人都发比赛结束才算结束
     */
    stritc: boolean = false;

    /**
     * 初始玩家信息
     */
    akRaceUnit: Array<SeRaceUnit> = [];

    /**
     * 发送过ready的人数统计，掉线后玩家也算的
     */
    aiReadyUids: number[] = [];

    akLiveUnit: Array<SeRaceUnit> = [];

    /**
     * 战斗初始信息
     */
    akRaceInfo: Array<SeRacePvp> = [];
    akResults: Array<ifResult> = [];

    /**
     * 玩家操作记录
     */
    akRecord: HashMap<ifRaceRecord> = new HashMap<ifRaceRecord>();
    akNetCache: HashMap<ifRaceRecord> = new HashMap<ifRaceRecord>();
    livekey: string;
    rmode: LiveMode;
    
    //斗地主相关
    times: number = 0;
    user_times: any = {};
    host_id: number = 0;
    host_skills: Array<number> = [];
    __state_: GameRaceState = GameRaceState.wait;

    private _state_time_ = 0;
    /**
     * 逻辑帧间隔
     */
    iFrameInterval = 33;

    private _parent: RaceMgr;
    constructor(_mgr_: RaceMgr, rmode: number) {
        if(rmode == LiveMode.pvp_1v2){
            this.state = GameRaceState.select1;
        }
        this._parent = _mgr_;
        this.iFrameRate = configInst.get('iFrameRate') || this.iFrameRate;
    }

    get state() {
        return this.__state_;
    }

    set state(v) {
        if (this.__state_ == v) return;

        this.__state_ = v;
        this._state_time_ = 0;
    }


    get mode() {
        var mode = '';
        switch (this.akRaceInfo.length) {
            case 2: {
                if (this.rmode == LiveMode.peak) {
                    mode = 'peakmatch'; break;
                }
                else if (this.rmode == LiveMode.doublemode) {
                    mode = "wuxianhuoli"; break;
                }
                else if (this.rmode == LiveMode.shangjin) {
                    mode = "shangjinmatch"; break;
                }
                else {
                    mode = '1v1'; break;
                }
            }
            case 4: mode = '2v2'; break;
            case 3: mode = '1v2'; break;
        }

        return mode;
    }

    private _time_ = null;
    private get _nid_() {
        return this.akRaceUnit[0].nid;
    }

    is_race_sync_uids(uid: number, uids: number[]) {
        if (!this.m_RaceSyncJudge.is_race_sync_uids(uid, uids)) {
            return false;
        }

        return true;
    }

    add_racord(uid: number, b: ifRaceRecord) {
        b.iPlayer = uid;
        var key = 't' + (this.iFrame + this.iFrameRate);
        this.akRecord.add(key, b);
        this.akNetCache.add(key, b);
    }

    setReady(uid: number) {
        var readyuids = [];
        let nid;
        for (var i = 0; i < this.akRaceUnit.length; i++) {
            var rU = this.akRaceUnit[i];
            if (rU.uid == uid) {
                if (rU.ready) return;
                rU.ready = true;
                nid = rU.nid;

                // 统计一下ready过的人
                if (this.aiReadyUids.indexOf(rU.uid) == -1) this.aiReadyUids.push(rU.uid);
            }

            if (rU.ready) {
                readyuids.push(rU.uid);
            }
        }

        this._send_all_({
            cmd: 'racecmd',
            type: 'ready',
            uids: readyuids,
        });

        // 玩家后来才准备好的
        if (this.is_racing && nid) {
            this._send_({
                cmd: 'racecmd',
                type: 'start',
            }, nid);
        }
    }

    getUid(checkKey: string) {
        var uid = 0;
        for (var i = 0; i < this.akRaceInfo.length; i++) {
            var rInfo = this.akRaceInfo[i];
            if (!rInfo) continue;
            if (rInfo.checkKey == checkKey) {
                uid = rInfo.Id;
                break;
            }
        }
        return uid;
    }

    initRace(players: Array<SeRacePvp>, side = 2) {
        if(this.rmode == LiveMode.pvp_1v2){
            //给每个人发放技能编号
            let skills = [0,1,2,3];
            this.host_skills.push(arrayRandom(skills, true));
            this.host_skills.push(arrayRandom(skills, true));
        }
        this.akRaceUnit = [];
        this.akRaceInfo = this.akRaceInfo.concat(players);
        if(this.rmode == LiveMode.pvp_1v2){
            this.akRaceInfo.sort(function () {
                return Math.random() - 0.5;
             });
        }
        
        this._side_count = side;
        this._per_side_count = Math.floor(players.length / this._side_count);

        // 设置一个超时，超过规定时间还没有开始表示异常了
        this._time_ = setInterval(this._update_.bind(this), 5);

        this.seed = Math.floor(Math.random() * 10000);
    }

    send_to_uid(data: any, uid: number) {
        let r_unit = this.find_race_unit(uid);
        if (r_unit) {
            this._send_(data, r_unit.nid);
        }
    }

    private _findSide(uid: number) {
        var pos = -1;
        for (var i = 0; i < this.akRaceInfo.length; i++) {
            var r = this.akRaceInfo[i];
            if (r.Id == uid) {
                pos = i;
                break;
            }
        }

        return Math.floor(pos / this._per_side_count);
    }

    private _can_join_(uid: number) {
        if (this.state > GameRaceState.racing) {
            return false;
        }

        for (var i = 0; i < this.akRaceUnit.length; i++) {
            if (this.akRaceUnit[i].uid == uid) return false;
        }

        return true;
    }

    private _join_logs = [];
    private _quit_logs = [];

    /**
     * 加入玩家 发送战斗初始化信息
     * @param bplayer 是否是场上玩家，否则是观众 
     * @param uid 玩家id
     * @param nid 玩家连接
     * @param sid 玩家逻辑服
     * @param quick_join 是否快速重连 快速重连的时候不发初始化战斗消息
     */
    private _join_unit_(bplayer: boolean, uid: number, nid: string, sid: string, quick_join: boolean = false) {
        if (bplayer) {
            var ru1 = new SeRaceUnit();
            ru1.uid = uid;
            ru1.nid = nid;
            ru1.ready = false;
            ru1.fail = 0;
            ru1.side = this._findSide(uid);
            ru1.sid = sid;
            this.akRaceUnit.push(ru1);
        }
        else {
            var ru1 = new SeRaceUnit();
            ru1.uid = uid;
            ru1.nid = nid;
            ru1.ready = false;
            ru1.fail = 0;
            ru1.side = 0;
            ru1.sid = sid;
            this.akLiveUnit.push(ru1);
        }

        this._join_logs.push({
            uid: uid,
            time: Date.now(),
            frame: this.iFrame
        });

        if (!quick_join) {
            this._send_({
                cmd: 'racecmd',
                type: 'init',
                iframe: this.iFrame - 1,
                iframeract: this.iFrameRate,
                side: this._side_count,
                info: this.akRaceInfo,
                seed: this.seed,
                record: this.akRecord._data,
                rmode: this.rmode,
                state_time: this._state_time_,
                user_times: this.user_times,
                host_id: this.host_id,
                host_skills: this.host_skills,
            }, nid);
        }
    }

    private _join_uids_() {
        var uids = [];
        for (var i = 0; i < this.akRaceUnit.length; i++) {
            uids.push(this.akRaceUnit[i].uid);
        }

        this._send_all_({
            cmd: 'racecmd',
            type: 'join',
            uids: uids
        });
    }

    private _join_in_racing(nid) {
        if (this.is_racing) {
            this._send_({
                cmd: 'racecmd',
                type: 'start'
            }, nid);
        }

    }

    joinRace(uid: number, sid: string, nid: string) {
        if (!this._can_join_(uid)) return false;

        this._join_unit_(true, uid, nid, sid);

        this._join_uids_();

        this._join_in_racing(nid);
        return true;
    }

    on_rejoin_race(uid: number, sid: string, nid: string) {
        if (!this._can_join_(uid)) return false;

        // 重连进来的时候有一次洗白自己的机会
        this.m_RaceSyncJudge.clear_unsync_uid(uid);

        // 通知所有人重连加入了游戏
        this._send_all_({
            cmd: 'racecmd',
            type: 'rejoin',
            uid: uid
        });

        this._join_unit_(true, uid, nid, sid);

        this._join_uids_();

        this._join_in_racing(nid);

        return true;
    }

    /**
     * 快速重连，玩家还在游戏场景，但是网络已经断开了，这里需要处理一下
     * @param uid 
     * @param sid 
     * @param nid 
     * @param curFrame
     * @param sign
     */
    on_quick_rejoin_race(uid: number, sid: string, nid: string, curFrame: number, sign?: string) {
        // 加个容错，防止那个时候玩家对象还在里面
        for (var i = 0; i < this.akRaceUnit.length; i++) {
            if (this.akRaceUnit[i].uid == uid) {
                this.akRaceUnit.splice(i, 1);
                break;
            }
        }

        if (!this._can_join_(uid)) return false;

        // 重连进来的时候有一次洗白自己的机会
        this.m_RaceSyncJudge.clear_unsync_uid(uid);

        // 通知所有人重连加入了游戏
        this._send_all_({
            cmd: 'racecmd',
            type: 'rejoin',
            uid: uid
        });

        this._join_unit_(true, uid, nid, sid, true);

        this._join_uids_();

        // 如果在战斗中了，这里就处理一下玩家命令数据，发送一个命令给玩家快速重连
        if (this.is_racing) {
            // 提取一下玩家当前帧到同步当前帧之间的数据

            let sendPool = {};
            let fd_keys = this.akRecord.keys;
            for (let key in fd_keys) {
                let r_k = fd_keys[key];
                if (r_k > 't' + curFrame && r_k <= 't' + this.iPreFrame) {
                    sendPool[r_k] = this.akRecord._data[r_k];
                }
            }

            this._send_({
                cmd: 'racecmd',
                type: 'quickstart',
                o: sendPool,
                f: this.iPreFrame
            }, nid);
        }

        return true;
    }

    /**
     * 加入观战
     * @param uid 
     * @param liveKey 
     * @param sid 
     * @param nid 
     */
    liveRace(uid: number, sid: string, nid: string) {
        if (this.state > GameRaceState.racing) return false;

        for (var i = 0; i < this.akLiveUnit.length; i++) {
            if (this.akLiveUnit[i].uid == uid) return false;
        }

        this._join_unit_(false, uid, nid, sid);

        this._join_in_racing(nid);
        return true;
    }

    /**
     * 收集血量变化
     * @param infos 
     */
    race_hps(uid: number, infos: { hps: number[], iframe: number }) {
        if (!configInst.get("localmode")) {
            for (let key in infos) {
                if (key != "hps" && key != "iframe") {
                    delete infos[key];
                }
            }
        }
        this.m_RaceSyncJudge.addhps(uid, infos, false);
    }

    get is_racing(): boolean {
        return this.state == GameRaceState.racing;
    }

    talk(data) {
        data['cmd'] = 'racecmd';
        data['type'] = 'talk';
        this._send_all_(data);
    }

    cardmove(data) {
        data['cmd'] = 'racecmd';
        data['type'] = 'cardmove';
        this._send_all_(data);
    }

    private base_count = [0,15,150];
    private refresh_count = [0,5,5];
    uptimes(uid,data) {
        //如果欢乐豆不够，无视这次请求
        let index = this.get_info(uid).index;
        if(this.get_info(uid).beans_1v2 < this.base_count[index] * 3) return; 
        this.user_times[uid] = data.times;
    }

    back_1v2(uid) {
        //如果欢乐豆不够，无视这次请求
        let info = this.get_info(uid);
        if(info && info.back_1v2_formation && info.Formation){
            //如果已经叫了地主，欢乐豆不足以刷新，无视这次请求
            if(this.user_times[uid] && info.beans_1v2 - this.base_count[info.index] * this.user_times[uid] < this.refresh_count[info.index]) {
                console.error("bean back_1v2");
                return;
            }
            let temp = info.back_1v2_formation;
            info.back_1v2_formation = info.Formation;
            //刷新欢乐豆数量
            info.beans_1v2 = info.beans_1v2 - this.refresh_count[info.index];
            info.Formation = temp;
            info.back_count = info.back_count? info.back_count++ : 1;
            this._send_all_({ cmd: 'racecmd', type: 'formation', uid: uid, formation: info.Formation });
        }
    }

    select_skills(uid,data) {
        // if(uid != this.host_id) return;
        // this.host_skills = data.skills;
    }

    _send_all_(data: any) {
        for (var i = 0; i < this.akRaceUnit.length; i++) {
            netInst.sendData(data, this.akRaceUnit[i].nid);
        }

        for (var i = 0; i < this.akLiveUnit.length; i++) {
            netInst.sendData(data, this.akLiveUnit[i].nid);
        }
    }

    private _send_(data: any, nid: string) {
        netInst.sendData(data, nid);
    }

    private _t_t_: number = 0;
    private _pre_t_t_: number = 0;

    _update_() {
        var nt = Date.now();
        if (this._pre_t_t_ == 0) {
            this._pre_t_t_ = nt;
            return;
        }

        this._t_t_ += nt - this._pre_t_t_;
        this._pre_t_t_ = nt;

        if (this._t_t_ < this.iFrameInterval) return;

        this._state_time_ += this._t_t_;
        this._t_t_ = 0;

        switch (this.state) {
            case GameRaceState.select1:
                this._update_select_times1();
                break;
            case GameRaceState.select2:
                this._update_select_times2();
                break;
            case GameRaceState.select3:
                this._update_select_times3();
                break;
            case GameRaceState.select_skill:
                this._update_select_skill();
                break;
            case GameRaceState.wait:
                this._update_wait_();
                break;
            case GameRaceState.wait_start:
                this._update_wait_start();
                break;
            case GameRaceState.racing:
                this._update_race_();
                break;
            case GameRaceState.finish:
                this._update_finish_();
                break;
            case GameRaceState.cancell:
                this._update_cancell_();
                break;
        }
    }

    /**
     * 房间建立，等待玩家进入比赛，这里设置一个时间防止有人进入失败
     * 1 玩家都进入了
     * 2 时间超过了10s 强制进入了
     */
    private _update_wait_() {
        if (this.rmode == LiveMode.room) {
            // 如果是room模式 增加一个等待比赛开启的过程 这里需要延长时间
            if (this._state_time_ >= 180 * 1000) {
                this.state = GameRaceState.cancell;
                return;
            }
        }
        else {
            // 普通模式30s 加载失败的话直接走结算流程
            if (this._state_time_ >= 30 * 1000) {
                this.state = GameRaceState.wait_start;
                return;
            }
        }

        var b_all_ready = true;
        for (var i = 0; i < this.akRaceUnit.length; i++) {
            var rU = this.akRaceUnit[i];
            if (!rU.ready) {
                b_all_ready = false;
                break;
            }
        }

        if (b_all_ready && this.aiReadyUids.length == this.akRaceInfo.length) {
            this.state = GameRaceState.wait_start;
        }
    }

    _update_wait_start() {
        if (this._state_time_ < 1000 * 5) {
            return;
        }

        // 有问题的玩家不准备开始
        for (var i = 0; i < this.akRaceUnit.length; i++) {
            var rU = this.akRaceUnit[i];
            if (rU.ready) {
                // this._send_({ cmd: 'racecmd', type: 'cancell', rid: this.kID }, rU.nid);
                this._send_({ cmd: 'racecmd', type: 'start' }, rU.nid);
            }
        }
        // this._send_all_({ cmd: 'racecmd', type: 'start' });
        this.state = GameRaceState.racing;
        
    }

    //第一个人叫分
    _update_select_times1() {
        let uid = this.akRaceInfo[0].Id
        let times = this.user_times[uid];
        if(times != undefined && times != null){
            this._send_all_({ cmd: 'racecmd', type: 'up_times', times: times, index: 0});
            //叫了3分就强制地主
            if(times >= 3){
                this.times = times;
                this.host_id = uid;
                this._send_all_({ cmd: 'racecmd', type: 'host_id', host_id: this.host_id });
                this.state = GameRaceState.wait;
            }
            else{
                this.state = GameRaceState.select2;
            }
        }
        else if(this._state_time_ > 1000 * 23){
            this.user_times[uid] = 0;
            this._send_all_({ cmd: 'racecmd', type: 'up_times', times: 0, index: 0});
            this.state = GameRaceState.select2;
        }
    }

    //第二个人叫分
    _update_select_times2() {
        let uid = this.akRaceInfo[1].Id
        let times = this.user_times[uid];
        if(times != undefined && times != null){
            this._send_all_({ cmd: 'racecmd', type: 'up_times', times: times, index: 1});
            //叫了3分就强制地主
            if(times >= 3){
                this.times = times;
                this.host_id = uid;
                this._send_all_({ cmd: 'racecmd', type: 'host_id', host_id: this.host_id });
                this.state = GameRaceState.wait;
            }
            else{
                this.state = GameRaceState.select3;
            }
        }
        else if(this._state_time_ > 1000 * 20){
            this.user_times[uid] = 0;
            this._send_all_({ cmd: 'racecmd', type: 'up_times', times: 0, index: 1});
            this.state = GameRaceState.select3;
        }
    }

    //第三个人叫分
    _update_select_times3() {
        let uid = this.akRaceInfo[2].Id;
        let times = this.user_times[uid];
        if(times != undefined && times != null){
            this._send_all_({ cmd: 'racecmd', type: 'up_times', times: times, index: 2});
            //叫了3分就强制地主
            if(times >= 3){
                this.times = times;
                this.host_id = uid;
                this._send_all_({ cmd: 'racecmd', type: 'host_id', host_id: this.host_id });
                this.state = GameRaceState.wait;
            }
            else{
                this.get_host_id();
                this._send_all_({ cmd: 'racecmd', type: 'host_id', host_id: this.host_id });
                this.state = GameRaceState.wait;
            }
        }
        if(this._state_time_ > 1000 * 20){
            this.user_times[uid] = 0;
            this._send_all_({ cmd: 'racecmd', type: 'up_times', times: 0, index: 2});
            this.get_host_id();
            this._send_all_({ cmd: 'racecmd', type: 'host_id', host_id: this.host_id });
            this.state = GameRaceState.wait;
        }
    }

    //通过分值获取地主id
    private get_host_id(){
        let max_times = 0;
        let max_uid;
        for(let key in this.user_times){
            if(this.user_times[key] > max_times){
                max_times = this.user_times[key];
                max_uid = Number(key);
            }
        }
        if(max_times > 0){
            this.times = max_times;
            this.host_id = max_uid;
        }
        else{
            this.times = 1;
            this.host_id = this.akRaceInfo[0].Id;
        }
    }

    //通过玩家id获取对战信息
    private get_info(id){
        for(let i = 0; i < this.akRaceInfo.length; i++){
            if(this.akRaceInfo[i].Id == id){
                return this.akRaceInfo[i];
            }
        }
        
    }

    //地主选择技能
    _update_select_skill() {
        // if(this.host_skills.length > 0){
        //     this._send_all_({ cmd: 'racecmd', type: 'host_skills', host_skills: this.host_skills });
        //     this.state = GameRaceState.wait;
        // }
        // else if(this._state_time_ > 1000 * 15){
        //     this.host_skills.push(this.get_info(this.host_id).skills[0]);
        //     this._send_all_({ cmd: 'racecmd', type: 'host_skills', host_skills: this.host_skills });
        //     this.state = GameRaceState.wait;
        // }
        
    }

    _update_race_() {
        if (this.iFrame > (1000 / this.iFrameInterval) * 3 * 60 + 5) {
            this.state = GameRaceState.finish;
            return;
        }

        // 判断一次不同步和血量胜负情况
        if (this.m_RaceSyncJudge.update()) {
            this.state = GameRaceState.finish;
            return;
        }

        if (this.iFrame >= this.iNextFrame) {
            // 变更一下帧好
            this._send_all_({
                c: 'r',
                f: this.iFrame,
                o: this.akNetCache._data == {} ? undefined : this.akNetCache._data,
                // kID: this.kID
            });

            this.iPreFrame = this.iFrame;

            this.iNextFrame = this.iFrame + this.iFrameRate;
            this.akNetCache.clear();
        }
        this.iFrame++;


        this._force_push_hero();
    }

    private _force_push_hero() {
        if (!configInst.get("force_push_hero")) return;
        this.add_racord(this.akRaceUnit[0].uid, {
            kHeroId: 'U001',
            iPlayer: 0,
            iLevel: 1,
            posX: 100,
            posY: 100,
            groupID: "",
            offX: undefined,
            offY: undefined
        })
    }

    recive_finsh(uid, result: ifResult) {
        if (!result.rid) {
            // 如果没有上报比赛id的话这个结果
            return;
        }

        // 收到结算信息,这里给强制发送了结算包的人准备的
        if (this.m_RaceSyncJudge.is_unsync_player(uid)) {
            // 是不同步的人上报的就不算，等到大家的结果才算
            // return;
        }

        this.akResults.push(result);
        let idx = this._findSide(uid);
        let up_win = result.winids.indexOf(uid) >= 0;
        if (idx > 0) {
            this.m_RaceSyncJudge.addhps(uid, { hps: (!up_win) ? [1, 0] : [0, 1], iframe: result.iframe }, true);
        }
        else {
            this.m_RaceSyncJudge.addhps(uid, { hps: up_win ? [1, 0] : [0, 1], iframe: result.iframe }, true);
        }

        // 收到结算消息后，进入结算流程
        if (!this.stritc) {
            this.state = GameRaceState.finish;
        }
    }

    find_race_unit(uid: number) {
        for (var i = 0; i < this.akRaceUnit.length; i++) {
            var r = this.akRaceUnit[i];
            if (r && r.uid == uid) return r;
        }

        return null;
    }

    private _get_side_score(side: number) {
        var allScore = 0;
        var half = Math.floor(this.akRaceInfo.length / 2);
        var startI = half * side;
        for (var i = 0; i < half; i++) {
            allScore += this.akRaceInfo[startI + i].pvp_score;
        }

        return Math.floor(allScore / half);
    }

    /**
     *  结算流程
     *  结算分两种，一种正常比赛的，一种取消比赛的
     */
    _update_finish_() {
        // 延迟2s 触发结算内容
        if (this._state_time_ <= 2000) {
            return;
        }

        // 找到获胜者的id
        let winside = this.m_RaceSyncJudge.judgewinside();
        var iWIDs = [];
        if(this.rmode == LiveMode.pvp_1v2){
            switch(winside){
                case 0: 
                    this.akRaceInfo[0] && this.akRaceInfo[0].Id != this.host_id && iWIDs.push(this.akRaceInfo[0].Id);
                    this.akRaceInfo[1] && this.akRaceInfo[1].Id != this.host_id && iWIDs.push(this.akRaceInfo[1].Id);
                    this.akRaceInfo[2] && this.akRaceInfo[2].Id != this.host_id && iWIDs.push(this.akRaceInfo[2].Id);
                    break;
                case 1: 
                    iWIDs.push(this.host_id);
                    break;
            }
            
        }
        else{
            for (var i = 0; i < this._per_side_count; i++) {
                var ruser = this.akRaceInfo[i + this._per_side_count * winside];
                ruser && iWIDs.push(ruser.Id);
            }
        }

        // 获取一下结束的血量变化情况
        var hps: number[] = [0, 0];
        if (this.akResults && this.akResults.length > 0) {
            hps = this.akResults[0].hps;
        } else {
            var jj = this.m_RaceSyncJudge.lastHps();
            hps = jj.hps;
            this.akResults = [{
                winids: iWIDs,
                hps: hps,  // 剩余血量
                iframe: this.iFrame,
                hpchange: jj.hpchange,
                totaldamage: jj.totaldamage,
                rid: this.kID,
            }];
        }

        var tTime = this.iFrame * this.iFrameInterval;
        // 结算信息发送给用户
        var finishInfo = {
            cmd: 'racecmd',
            type: 'finish',
            winids: iWIDs,
            time: tTime,
            stmp: createHash('md5').update(iWIDs.join(',') + '_' + tTime + '_' + this.kID + '_' + race_secret_key).digest('hex'),
            hps: hps,
        }

        this._send_all_(finishInfo);

        // 记录战斗录像
        this._save_record_(hps);

        // 走匹配服务器转逻辑服务器的流程进行单局结算 做成开关式的也可以
        // 需要构建多条数据，确定每个人的胜负情况，每个人只收到自己的部分结算就可以了
        var racesResult: { uid: number, sid: string, plt: string, rid: string, bwin: boolean, time: number, isBossDie: boolean, mode: string, pvp_score: number, pvp_level: number, castle_level: number, state: string, isUnSync: boolean }[] = [];
        for (var i = 0; i < this.akRaceInfo.length; i++) {
            var r_unit = this.akRaceInfo[i];
            if (!r_unit) continue;
            var r_info = this.find_race_unit(r_unit.Id);
            var oppSide = (i * 2 < this.akRaceInfo.length) ? 1 : 0;
            var res_info = {
                uid: r_unit.Id,
                sid: r_info ? r_info.sid : r_unit.sid,
                plt: r_unit._plt_,
                rid: this.kID,
                bwin: (iWIDs.indexOf(r_unit.Id) >= 0) ? true : false,
                time: tTime,
                isBossDie: hps[oppSide] <= 0,
                mode: this.mode,
                pvp_score: this._get_side_score(oppSide),
                pvp_level: this.akRaceInfo[i].pvp_level,
                castle_level: this.akRaceInfo[i].castle_level,
                bTeam: r_unit.bTeam,
                name: r_unit.Name,
                isUnSync: this.m_RaceSyncJudge.is_hp_unsync,
                state: "finish",
                host_id: this.host_id,
                host_skills: this.host_skills,
                formation_1v2: this.akRaceInfo[i].Formation,
                times: this.times,
                index: this.akRaceInfo[i].index,
            }

            racesResult.push(res_info);
        }

        // 推送结算信息
        netInst.sendData({
            cmd: 'race_result',
            infos: racesResult,
            rid: this.kID,
            rmode: this.rmode
        }, g_match_nid);

        // 删除比赛
        if (!this._parent.finish(this.kID)) {
            this.clear();
        }
    }

    /**
     * 比赛取消立刻执行
     */
    private _update_cancell_() {
        this._save_record_([]);

        // 比赛取消通知所有人 比赛取消了，结果不算
        this._send_all_({
            cmd: 'racecmd',
            type: 'cancell',
            unsync: this.m_RaceSyncJudge.is_hp_unsync,
            rid: this.kID
        })

        // 走匹配服务器转逻辑服务器的流程进行单局结算 做成开关式的也可以
        // 需要构建多条数据，确定每个人的胜负情况，每个人只收到自己的部分结算就可以了
        var racesResult: { uid: number, sid: string, rid: string, bwin: boolean, time: number, isBossDie: boolean, mode: string, pvp_score: number, state: string }[] = [];
        for (var i = 0; i < this.akRaceInfo.length; i++) {
            var r_unit = this.akRaceInfo[i];
            if (!r_unit) continue;
            var r_info = this.find_race_unit(r_unit.Id);
            var oppSide = (i * 2 < this.akRaceInfo.length) ? 1 : 0;
            var res_info = {
                uid: r_unit.Id,
                sid: r_info ? r_info.sid : r_unit.sid,
                rid: this.kID,
                bwin: false,
                time: 0,
                isBossDie: false,
                mode: this.mode,
                pvp_score: this._get_side_score(oppSide),
                bTeam: r_unit.bTeam,
                name: r_unit.Name,
                isUnSync: !this.m_RaceSyncJudge.is_hp_unsync,
                state: 'cancell',
                host_id: this.host_id,
                times: this.times,
            }

            racesResult.push(res_info);
        }

        // 推送结算信息 空的 让比赛相关信息都去掉
        netInst.sendData({
            cmd: 'race_result',
            infos: racesResult,
            rid: this.kID,
            rmode: this.rmode
        }, g_match_nid);

        // 删除比赛
        if (!this._parent.finish(this.kID)) {
            this.clear();
        }
    }

    leave(uid: number) {
        // 有玩家离开还是把战斗进行到底
        for (var i = 0; i < this.akRaceUnit.length; i++) {
            var unit = this.akRaceUnit[i];
            if (unit.uid == uid) {
                this.akRaceUnit.splice(i, 1);
                this._send_all_({
                    cmd: 'racecmd',
                    type: 'leave',
                    uid: uid
                })
                return;
            }
        }

        for (var i = 0; i < this.akLiveUnit.length; i++) {
            var unit = this.akLiveUnit[i];
            if (unit.uid == uid) {
                this.akLiveUnit.splice(i, 1);
                return;
            }
        }

        this._quit_logs.push({
            uid: uid,
            time: Date.now(),
            frame: this.iFrame
        });
    }

    clear() {
        if (this._time_) {
            clearInterval(this._time_);
            this._time_ = 0;
        }

        this.akRecord.clear();
        this.akNetCache.clear();
        this.akRaceInfo = [];
        this.akRaceUnit = [];
        this.aiReadyUids = [];
    }


    stateRecord(info) {
        this.m_RaceSyncJudge.stateRecord(info);
    }

    private _save_record_(hps: any[]) {
        var obj: ifRecordFile = {
            rid: this.kID,
            seed: this.seed,
            akRaceInfo: this.akRaceInfo,
            akRecord: this.akRecord._data,
            akResults: this.akResults,
            akRaceUnit: this.akRaceUnit,
            akRaceHps: this.m_RaceSyncJudge.race_hps,
            syncuids: this.m_RaceSyncJudge.unsyncuids,
            finish_frame: this.iFrame,
            joinrecord: this._join_logs,
            quitrecord: this._quit_logs,
            hps: hps,
            f_time: Date.now(),
            racever: this.racever
        }

        if (this.m_RaceSyncJudge.is_hp_unsync) {
            // 通知观察者
            netMonitorInst.noticeToMonitors('unsync_record', obj);
        }
        else {
            netMonitorInst.noticeToMonitors('sync_record', obj);
        }
        var head: string = 'record';
        // 抄送一分数据给匹配服务器
        netInst.sendData({
            cmd: 'record_save',
            name: head + "_" + this.kID,
            info: obj,
            rmode: this.rmode,
            mode: this.mode
        }, g_match_nid);
    }
}