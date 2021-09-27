import { Match_Proc } from "../../NetMgr/matchProc";
import { raceService } from "../raceServices/raceService";
import { if_sys_, SeRacePvp } from "../../SeDefine";
import { MatchRacePlt } from "../matchRace";

Match_Proc.regist_proc('race_result', function (nid: string, data: { _sys_: if_sys_, infos: any[], rid: string, rmode: number }) {
    raceService.race_finish(data._sys_.plt, data.infos, data.rid, data.rmode);
},__filename);

Match_Proc.regist_proc('race_infos', function (nid: string, data: { _sys_: if_sys_, infos: { rid: string, raceinfos: SeRacePvp[], livekey: string, mode: string, rmode: number, cttime: number, racever: string }[] }) {
    for (var i = 0; i < data.infos.length; i++) {
        var r = data.infos[i];
        if (!r || !r.raceinfos || r.raceinfos.length == 0) continue;
        // raceService.add_live_race(r.rid, r.raceinfos, r.raceinfos[0].rurl, r.livekey, r.rmode, r.cttime, r.racever);
        MatchRacePlt(data._sys_.plt).add_live_race(r.rid, r.raceinfos, r.raceinfos[0].rurl, r.livekey, r.mode, r.rmode, r.cttime, r.racever);
    }
},__filename)