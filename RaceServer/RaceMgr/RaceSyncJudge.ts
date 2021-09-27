import { HashMap, TeMap } from "../lib/TeTool";
import { RaceUnit, GameRaceState } from "./RaceUnit";
/**
 *  这个模块检查血量变化等不同步信息，
 *  同时检查血量造成的胜负等信息 
 */

export class RaceSyncJudge {
    private _parent_: RaceUnit;

    private _max_hps_frame_ = 0;
    //每个玩家当前最大帧数
    private _max_frame = {};
    private _unsync_list_: number[] = [];

    private _framHps: number[] = [];

    private _b_hps_unsync_: boolean = false;

    //最新上报的血量
    private _last_recv_hps_ = { frame: 0, hps: [] };
    /**收到所有人的信息了才算 */
    private _zero_hps = new TeMap<{ iframe: number, hps: number[] }>();

    constructor(parent: RaceUnit) {
        this._parent_ = parent;

        this._max_hps_frame_ = 0;
        this._unsync_list_ = [];
    }


    private _race_hps: HashMap<{ hps: number[], iframe: number }> = new HashMap<{ hps: number[], iframe: number }>();
    private _race_frames_hps: HashMap<{ hps: number[], uid: number }> = new HashMap<{ hps: number[], uid: number }>();
    get race_hps() {
        return this._race_hps._data;
    }
    /**
     * 健康血量变化，出现0的时候也进入结算流程
     * @param infos 
     */
    addhps(uid: number, infos: { hps: number[], iframe: number }, force: boolean) {
        // console.log(infos);
        // 这里只收集血量，在下一次逻辑帧的时候判断血量是否满足胜利
        if (force) {
            // 强制获胜的时候 只改写获胜判断用的血量
            let hps_zero = false;
            for (let i = 0; i < infos.hps.length; i++) {
                if (infos.hps[i] <= 0) hps_zero = true;
            }

            if (hps_zero) {
                this._zero_hps.set(uid, infos);
            }

            if (!this._parent_.stritc) {
                this._last_recv_hps_.frame = infos.iframe;
                this._last_recv_hps_.hps = infos.hps;
            }
        }
        else {
            if (infos.hps && infos.iframe) {
                this._race_hps.add(uid, infos);
                this._framHps[infos.iframe] = (this._framHps[infos.iframe] || 0) + 1;

                // 这个表示有一个人发了就算了的
                this._max_hps_frame_ = Math.max(this._max_hps_frame_, infos.iframe);
                this._max_frame[uid] = Math.max(this._max_frame[uid] || 0, infos.iframe);
                if (this._last_recv_hps_.frame < infos.iframe) {
                    this._last_recv_hps_.frame = infos.iframe;
                    this._last_recv_hps_.hps = infos.hps;
                }

                let hps_zero = false;
                for (let i = 0; i < infos.hps.length; i++) {
                    if (infos.hps[i] <= 0) hps_zero = true;
                }

                if (hps_zero) {
                    this._zero_hps.set(uid, infos);
                }

                // 这里表示收到了多个人的信息了，可以使用实际结算策略了
                this._race_frames_hps.add(infos.iframe, { uid: uid, hps: infos.hps });
                // 判断一下这一帧是否有两组数据了
                this.judge_hps(infos.iframe);
            }
        }

    }

    judge_hps(iframe: number) {
        let count = this._framHps[iframe];
        if (!count || count == undefined || count == 1 || count < this._parent_.akRaceUnit.length) return;

        if (this._b_hps_unsync_) return;

        let judge_pool: HashMap<number> = new HashMap<number>();
        let hps_filter: TeMap<{ hps: number[], uid: number }> = new TeMap();
        let list = this._race_frames_hps.get(iframe);
        for (let j = 0; j < list.length; j++) {
            let r_hps = list[j];
            hps_filter.set(r_hps.uid, { uid: r_hps.uid, hps: r_hps.hps });
        }

        for (let j = 0; j < hps_filter.keys.length; j++) {
            let r = hps_filter.get(hps_filter.keys[j]);
            judge_pool.add(JSON.stringify(r.hps), r.uid);
        }

        if (judge_pool.keys.length > 1) {
            this._b_hps_unsync_ = true;
            // 发现错误玩家提示一下 偷偷的告诉他一下
            if (this._parent_.stritc) {
                // 严格模式下出现无效局逻辑
                this._parent_._send_all_({ cmd: 'racecmd', type: 'hpunsync' });
                this._parent_.state = GameRaceState.cancell;
            }
            else {
                this._parent_._send_all_({ cmd: 'racecmd', type: 'hpunsync' });
            }

        }
    }

    is_unsync_player(uid: number | string) {
        if (this._unsync_list_.indexOf(parseInt(uid.toString())) >= 0) {
            return true;
        }

        return false;
    }

    get unsyncuids() {
        return this._unsync_list_;
    }

    get is_hp_unsync() {
        return this._b_hps_unsync_;
    }

    // 正确进入比赛的玩家标记一下，减少查询次数
    private _in_race_sync_uids = [];

    /**
     * 判断是否进错场的 如果他已经不同步了就认为他也进错片场了
     * @param from_uid 
     * @param uids 
     */
    is_race_sync_uids(from_uid: number, uids: number[]) {
        if (uids == null || uids == undefined) {
            return true;
        }

        if (this._unsync_list_.indexOf(from_uid) >= 0) return false;
        if (this._in_race_sync_uids.indexOf(from_uid) >= 0) return true;

        for (let i = 0; i < uids.length && i < 4; i++) {
            let c_uids = uids[i];
            let match = false;
            for (let j = 0; j < this._parent_.akRaceInfo.length; j++) {
                let c_info = this._parent_.akRaceInfo[j];
                if (c_info && c_info.Id == c_uids) {
                    match = true;
                }
            }

            if (!match) {
                this._unsync_list_.push(from_uid);

                // 发现错误玩家提示一下 偷偷的告诉他一下
                this._parent_.send_to_uid({ cmd: 'racecmd', type: 'unsync', uids: this._unsync_list_ }, from_uid);
                return false;
            }
        }

        this._in_race_sync_uids.push(from_uid);
        return true;
    }

    update() {
        // this.judge_sync_hps_result();
        return this.judge_hps_win(this._parent_.stritc);
    }

    /**
     * 判断胜负情况
     * @param bSync 是否需要两个同步的
     */
    judge_hps_win(bSync: boolean = false) {
        if (bSync) {
            if (this._parent_.akRaceUnit.length == 0) return false;

            // 有反馈有时候3等1 掉线结束的情况，这里争对不是1v1的情况增加一个降低要求的处理，
            // 只要发送结算的人数大于当前人数的 50%就算成功
            // 若一方血量为0，另一方10秒内不上报，也结束
            let hasCount = 0;
            let zero_uid = 0;
            for (let i = 0; i < this._parent_.akRaceUnit.length; i++) {
                let r = this._parent_.akRaceUnit[i];
                if (this._zero_hps.has(r.uid)) {
                    hasCount++;
                    zero_uid = r.uid;
                }
            }

            if (this._parent_.akRaceUnit.length > 2) {
                // 解决3等1或者2等1的情况
                if ((hasCount / this._parent_.akRaceUnit.length) > 0.5) {
                    return true;
                }
                else {
                    return false;
                }
            }
            else {
                if (hasCount != this._parent_.akRaceUnit.length) {
                    if(hasCount == 1 && zero_uid){
                        for(var uid in this._max_frame){
                            if(uid == ''+zero_uid) continue;
                            if(this._max_frame[zero_uid] - (this._max_frame[uid]  || 0) >= 300) return true;
                        }
                    }
                    return false;
                }
                return true;
            }
        }
        else {
            for (let i = 0; i < this._last_recv_hps_.hps.length; i++) {
                if (this._last_recv_hps_.hps[i] <= 0) return true;
            }
        }

        return false;
    }

    /**
   * 依据血量来仲裁结果，强制获胜的时候
   */
    judgewinside() {
        // 这里要找到最后的结果
        let hps = this._last_recv_hps_.hps;
        if (hps.length == 0) return 0;
        if (hps[0] >= hps[1]) {
            return 0;
        }
        return 1;
    }

    lastHps() {
        // 这里要找到最后的结果
        let r_info_mx;
        let r_info_min;
        try {
            r_info_mx = this._race_hps.get(this._race_hps.keys[0])[0];
            r_info_min = this._last_recv_hps_;
        }
        catch (e) {

        }
        var totaldamage = 0;
        var hpchange = 0;

        if (!r_info_mx || !r_info_min) {
            return { hps: [0, 0], totaldamage: 0, hpchange: hpchange };
        }
        try {
            totaldamage = r_info_min.hps[0] - r_info_mx.hps[0] + r_info_min.hps[1] - r_info_mx.hps[1];
        }
        catch (e) {

        }
        return { hps: r_info_mx.hps, totaldamage: totaldamage, hpchange: hpchange };
    }

    clear_unsync_uid(uid: number) {
        // 重连进来的时候有一次洗白自己的机会
        let idx = this._unsync_list_.indexOf(uid);
        if (idx >= 0) {
            this._unsync_list_.splice(idx, 1);
        }
    }

    //------------记录不同步的信息-------------------//
    private _cache: any = {};
    stateRecord(info) {
        var key = info.key;
        var v = info.v;
        if (!this._cache[key]) this._cache[key] = [];
        this._cache[key].push(v);
        if (this._cache[key].length > 1) {
            var str1 = JSON.stringify(this._cache[key][0]);
            var str2 = JSON.stringify(this._cache[key][1]);
            console.log(str1);
            console.log(str2);
            if (str1 != str2) {
                console.log("不一样了=-");
            }
        }
    }
}