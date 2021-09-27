import { SeRacePvp } from "../SeDefine";
import { RaceUnit, GameRaceState, ifRaceRecord, ifResult } from "./RaceUnit";
import { configInst } from "../lib/TeConfig";
import { netMonitorInst } from "../NetMgr/monitor";

export class RaceMgr {

    get genRoomID() {
        var str = Date.now() + Object.keys(this._races_).length;
        return str.toString();
    }

    private _races_: Object = {};


    constructor() {
    }

    find(raceID: string) {
        return this._findRace(raceID);
    }

    race_count = 0;

    createRace(rid: string, info: SeRacePvp[], livekey: string, rmode: number, racever: string, stritc: boolean) {
        var race = new RaceUnit(this, rmode);
        race.kID = rid;
        race.livekey = livekey;
        race.rmode = rmode;
        race.racever = racever;
        race.stritc = stritc;
        this._races_[race.kID] = race;
        this.race_count++;

        race.initRace(info);
    }

    killRace(rid: string, livekey: string) {
        if (!this._races_.hasOwnProperty(rid)) return;

        var race = this._races_[rid] as RaceUnit;
        if (race.livekey == livekey) {
            race.state = GameRaceState.finish;
        }
    }

    getAllRace() {
        var out: { rid: string, raceinfos: any, livekey: string, mode: string, rmode: number, cttime: number, racever: string }[] = [];

        for (var key in this._races_) {
            var r = this._races_[key] as RaceUnit;
            if (r) {
                out.push({
                    rid: r.kID,
                    raceinfos: r.akRaceInfo,
                    livekey: r.livekey,
                    mode: r.mode,
                    rmode: r.rmode,
                    cttime: r.cttime,
                    racever: r.racever
                });
            }
        }

        return out;
    }

    reciveData(raceid: string, type: string, uid: number, b: ifRaceRecord | ifResult | any, uids: number[]) {
        var race = this._findRace(raceid);
        if (race) {
            switch (type) {
                case "usecard":
                    // 但是还是让他可以玩比赛，但是他的结果作废
                    race.is_race_sync_uids(uid, uids);
                    race.add_racord(uid, <ifRaceRecord>b);
                    break;
                case "talk":
                    b['uid'] = uid;
                    race.talk(b);
                    break;
                case "leave": race.leave(uid); break;
                case 'finish':
                    race.recive_finsh(uid, <ifResult>b);
                    break;
                case 'ready': race.setReady(uid); break;
                case "state": race.stateRecord(b); break;
                case "cardmove": race.cardmove(b); break;
                case "upload_hps":
                    // if (!race.is_race_sync_uids(uid, uids))
                    // break;
                    race.race_hps(uid, b);
                    break;
                case "upunsyncinfo":
                    // 这里直接上报给监听服务器
                    netMonitorInst.noticeToMonitors('unsync_info', {
                        rid: raceid,
                        uid: uid,
                        infos: b
                    });
                    break;
                case "uptimes": 
                    race.uptimes(uid,b); 
                    break;
                case "back_1v2": 
                    race.back_1v2(uid); 
                    break;
                case "select_skills": 
                    race.select_skills(uid,b); break;
            }
        }
    }

    /**
     * 结束
     * @param raceID 
     * @param uid 
     */
    leaveRace(raceID: string, uid: number) {
        var rkRace = this._findRace(raceID);
        if (rkRace) {
            rkRace.leave(uid);
        }
    }

    /**
     * 战斗结束
     * @param raceID 
     */
    finish(raceID: string) {
        if (this._races_.hasOwnProperty(raceID)) {
            this._races_[raceID].clear();
            delete this._races_[raceID];
            this.race_count--;
            return true;
        }

        return false;
    }

    private _findRace(raceID: string): RaceUnit {
        return <RaceUnit>this._races_[raceID];
    }
}

export var raceMgrInst = new RaceMgr();