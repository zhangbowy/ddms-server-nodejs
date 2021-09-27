import { SeRacePvp, LiveMode } from "../SeDefine";
import { TeMap, HashMap } from '../lib/TeTool';
import { serverMgrInst, DefineSType } from "../serverMgr";
import { netInst } from "../NetMgr/SeNetMgr";
import { RoomMatchInst } from './RoomMatch';
import { TeamRoomInst_2v2, PvPRoomMgrInst, TeamRoomInst_1v2 } from "./TeamRoomMgr";
import { configInst } from "../lib/TeConfig";
import { existsSync, mkdirSync, readFileSync, writeFile } from 'fs';
import { join } from 'path';

interface ifLiveRace {
    rid: string,
    rurl: string,
    infos: SeRacePvp[],
    liveKey: string,
    cttime: number,
    mode: LiveMode,
    racever: string,
}

interface ifRaceInfo {
    rid: string,
    pvpInfo: SeRacePvp[],
    uids: number[],
    finish: boolean,
    mode: LiveMode,
    racever: string,
}

class LiveMgr {

    /**
     * 比赛结算信息
     */
    private _all_race_ids: TeMap<ifRaceInfo> = new TeMap<ifRaceInfo>();

    /**
     * 清理比赛结算信息的池子
     */
    private _clear_hash: HashMap<string> = new HashMap<string>();

    /**
     * 玩家id和比赛的绑定信息 记录在战斗中的玩家
     */
    private _uid_to_race: TeMap<{
        rid: string, joininfo: {
            checkKey: string,
            rurl: string,
            rid: string,
            uid: number,
            oscore: number,
            mode: string,
            rmode: number
        }, time: number
    }> = new TeMap<{ rid: string, joininfo: any, time: number }>();

    /**
     * 所有在线的race的比赛初始信息
     */
    private _allliverace: TeMap<ifLiveRace> = new TeMap<ifLiveRace>();
    //荣耀战区击杀记录
    public kill_record: Array<{killer_id: number, killer_name: string, killer_plt: string, died_id: number, died_name: string, died_plt: string}>;
    constructor() {
        if(configInst.get('openGlobal')){
            if(existsSync(join(process.cwd(), 'kill_record.dat'))){
                this.kill_record = JSON.parse(readFileSync(join(process.cwd(), 'kill_record.dat')).toString());
            }
            else{
                this.kill_record = [];
            }
        }
    }

    is_race_mode(rid: string, mode: LiveMode): boolean {

        if (this._allliverace.has(rid)) {
            var r = this._allliverace.get(rid);
            return r && r.mode == mode;
        }

        var r_a = this.get_race_info(rid);
        if (r_a) {
            return r_a.mode == mode;
        }

        return false;
    }

    public race_count_monit: TeMap<number> = new TeMap<number>();

    get_race_count(rurl: string) {
        return this.race_count_monit[rurl] || 0
    }

    add_race_count(rurl: string) {
        this.race_count_monit[rurl] = this.get_race_count(rurl) + 1;
    }

    del_race_count(rurl: string) {
        this.race_count_monit[rurl] = this.get_race_count(rurl) - 1;
        if (this.race_count_monit[rurl] < 0) this.race_count_monit[rurl] = 0;
    }

    clear_race_count(rurl: string) {
        this.race_count_monit[rurl] = 0;
    }

    is_in_racing(uid: number, nid: string) {
        // live race 里面看看是否在比赛了
        let r = this._uid_to_race.get(uid);
        if (r && (r.time + 90 * 1000 > Date.now())) {
            // 如果玩家两把之间时间差 30s 就不给他匹配，要求他等待
            console.log('repleate online_match at ' + Date.now() + ' uid:' + uid + ' last' + r.time);

            // 在比赛中，那么把老的比赛信息发给他，让他重新进入
            let old_race = r.joininfo;
            netInst.sendData({
                cmd: 'joinonline',
                checkKey: old_race.checkKey,
                rurl: old_race.rurl,
                rid: old_race.rid,
                uid: old_race.uid,
                oscore: old_race.oscore,
                mode: old_race.mode,
                rmode: old_race.rmode
            }, nid);
            return true;
        }

        return false;
    }

    add_live_race(rid: string, infos: SeRacePvp[], rurl: string, liveKey: string, mode: LiveMode, cttime = Date.now(), racever: string) {
        this.add_race_count(rurl);
        this._allliverace.set(rid, {
            rid: rid,
            rurl: rurl,
            infos: infos,
            liveKey: liveKey,
            cttime: cttime,
            mode: mode,
            racever: racever
        });

        for (let i = 0; i < infos.length; i++) {
            let r = infos[i];
            let opp = infos[infos.length - 1 - i];
            this._uid_to_race.set(r.Id, {
                rid: rid,
                joininfo: {
                    checkKey: r.checkKey,
                    rurl: r.rurl,
                    rid: rid,
                    uid: r.Id,
                    oscore: opp.pvp_score,
                    mode: infos.length == 2 ? '1v1' : '2v2',
                    rmode: mode
                }, time: (r.optime || Date.now())
            });
        }

        this.add_race(rid, infos, mode, racever);
    }

    del_live_race(rid: string) {
        var r = this._allliverace.get(rid);
        if (r) {
            /**
             * 清理一下玩家的比赛状态
             */
            for (let i = 0; i < r.infos.length; i++) {
                let r_info = r.infos[i];
                this._uid_to_race.del(r_info.Id);
            }

            this.del_race_count(r.rurl);
        }
        this._allliverace.set(rid, undefined);
    }

    del_race_by_url(rurl: string) {
        this.clear_race_count(rurl);

        var keys = this._allliverace.keys;
        for (var i = 0; i < keys.length; i++) {
            var r1 = this._allliverace.get(keys[i]);
            if (!r1) continue;
            if (rurl == r1.rurl) {
                for (let j = 0; j < r1.infos.length; j++) {
                    let r_info = r1.infos[j];
                    this._uid_to_race.del(r_info.Id);
                }
                this._allliverace.set(keys[i], undefined);
            }
        }
    }

    get_live_race(mode: LiveMode) {
        var curr = Date.now();
        var outs: ifLiveRace[] = [];
        var keys = this._allliverace.keys;
        for (var i = 0; i < keys.length; i++) {
            var r = this._allliverace.get(keys[i]);
            if (!r) {
                this._allliverace.set(keys[i], undefined);
                continue;
            }
            if (curr - r.cttime > 1000 * 60 * 3.5) {
                this._allliverace.set(keys[i], undefined);
            }

            if (r.mode != mode) {
                continue;
            }

            outs.push(r);
        }

        return outs;
    }

    init() {
        // this._all_race_ids = redistInst.getHash('temp_race_state');
        // this._all_race_ids.load(null);
        // 每小时清理一次信息
        setInterval(this._update_.bind(this), 30 * 1000);
    }

    get_race_info(rid: string): ifRaceInfo {
        return this._all_race_ids.get(rid);
    }

    public race_finish(data: { infos: { uid: number, sid: string, plt: string, bwin: boolean, bTeam: boolean, name: string, mode: string, pvp_level: number, castle_level: number, state: string}[], rid: string, rmode: number }) {
        RoomMatchInst.race_finish(data.rid);

        var r = this.get_race_info(data.rid);
        if (r && r.finish) {
            console.log('double ' + data.rid);
            return;
        }

        // 这里直接找到大区服务器,然后发给玩家结算
        for (var i = 0; i < data.infos.length; i++) {
            var r_info = data.infos[i];
            if (!r_info) continue;

            TeamRoomInst_2v2.race_finish(r_info.uid);
            TeamRoomInst_1v2.race_finish(r_info.uid);
            PvPRoomMgrInst.race_finish(r_info.uid);

            var rLink = serverMgrInst.get_server(r_info.sid) || serverMgrInst.randomServer(DefineSType.logic);
            if (!rLink) {
                continue;
            }

            if(r){
                if (r.uids.indexOf(r_info.uid) >= 0) continue;
                r.uids.push(r_info.uid);
            }

            r_info['cmd'] = 'pvp_result';
            r_info['rmode'] = data.rmode;
            r_info['bTeam'] = r_info.bTeam;
            r_info['oppname'] = data.infos[data.infos.length - 1 - i].name
            r_info['opplevel'] = data.infos[data.infos.length - 1 - i].castle_level
            netInst.sendData(r_info, rLink.nid);
        }

        //如果荣耀战区要通知
        if(data.rmode == LiveMode.match && data.infos[0].state != 'cancell' && configInst.get('openGlobal') && data.infos[0].mode == '1v1' && (data.infos[0].pvp_level >= 16 || data.infos[1].pvp_level >= 16)){
            if(data.infos[0].bwin){
                this.add_kill_record(data.infos[0].uid, data.infos[0].name, data.infos[0].plt, data.infos[1].uid, data.infos[1].name, data.infos[1].plt, data.infos[1].castle_level >= 15)
            }
            else if(data.infos[1].bwin){
                this.add_kill_record(data.infos[1].uid, data.infos[1].name, data.infos[1].plt, data.infos[0].uid, data.infos[0].name, data.infos[0].plt, data.infos[0].castle_level >= 15)
            }
        }
        if(r){
            r.finish = true;

            this._all_race_ids.set(r.rid, r);
    
            // 添加一个过期清理池子
            let time = new Date();
            var t = time.getHours() + '.' + Math.floor(time.getMinutes());
            this._clear_hash.add(t, r.rid);
        }
    }
    
    private save_kill_record_time = 0;
    public add_kill_record(killer_id, killer_name, killer_plt, died_id, died_name, died_plt, need_add){
        let data = {cmd: 'kill_announcement', 
                    killer_id: killer_id, 
                    killer_name: killer_name, 
                    killer_plt: killer_plt,
                    died_id: died_id, 
                    died_name: died_name, 
                    died_plt: died_plt,
                    all_plt: need_add};
        let clouds = [];
        if(need_add){
            clouds = serverMgrInst.get_all_server_by_type_and_plt(DefineSType.logic);
            this.kill_record.push({killer_id: killer_id,
                killer_name: killer_name,
                killer_plt: killer_plt,
                died_id: died_id,
                died_name: died_name,
                died_plt: died_plt});
            if(this.kill_record.length >50) this.kill_record.splice(0,1);

            if(Date.now() - this.save_kill_record_time > 5 * 60 * 1000){
                writeFile(join(process.cwd(), 'kill_record.dat'), JSON.stringify(this.kill_record), { encoding: 'utf8', flag: 'w+' }, function (err) {
                    if (err) console.error(err);
                });
                this.save_kill_record_time = Date.now();
            }
            
        }
        else{
            if(killer_plt != died_plt){
                clouds = clouds.concat(serverMgrInst.get_all_server_by_type_and_plt(DefineSType.logic, killer_plt));
                clouds = clouds.concat(serverMgrInst.get_all_server_by_type_and_plt(DefineSType.logic, died_plt));
            }
        }
        for(let i = 0; i < clouds.length; i++){
            netInst.sendData(data, clouds[i].nid);
        }
    }

    public add_race(rid: string, infos: SeRacePvp[], mode: LiveMode, racever: string) {
        if (this._all_race_ids.get(rid)) return;
        var r: ifRaceInfo = {
            rid: rid,
            pvpInfo: infos,
            uids: [],
            finish: false,
            mode: mode,
            racever: racever
        }
        this._all_race_ids.set(r.rid, r);
        let time = new Date();
        var t = time.getHours() + '.' + Math.floor(time.getMinutes());
        this._clear_hash.add(t, r.rid);
    }

    _update_() {
        // 定期清理机制 清理10 分钟前的
        let dtime = Date.now() - 5 * 60 * 1000;
        let time = new Date(dtime);
        var t = time.getHours() + '.' + Math.floor(time.getMinutes());

        var list = this._clear_hash.get(t);
        for (let i = 0; i < list.length; i++) {
            this._all_race_ids.del(list[i]);
        }

        this._clear_hash.del(t);
    }
}

export var liveInst = new LiveMgr();