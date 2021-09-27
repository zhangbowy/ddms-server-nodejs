import { Match_Proc } from "../../NetMgr/matchProc";
import { ifRecordFile } from "../../Protocol";
import { LiveMode, if_sys_ } from "../../SeDefine";
import { netInst } from "../../NetMgr/SeNetMgr";
import { MatchRacePlt } from "../matchRace";
import { RecordMgr } from "../../mgr/RecordMgr";

Match_Proc.regist_proc('liveraces', function (nid: string, data: { _sys_: if_sys_, uid: number, mode: LiveMode }) {

    netInst.sendData({
        cmd: "liveraces",
        uid: data.uid,
        infos: MatchRacePlt(data._sys_.plt).get_live_race(data.mode || 0)
    }, nid);
}, __filename)

Match_Proc.regist_proc('record_save', function (nid: string, data: { name: string, info: ifRecordFile, mode: string, rmode: LiveMode }) {
    // 清理掉无用的记录信息
    try {
        if (data.info && data.info.akRaceHps) {
            let hps = {};
            for (let key in data.info.akRaceHps) {
                let useinfo = data.info.akRaceHps[key] as any[];
                hps[key] = [];
                // for (let i = 0; i < useinfo.length; i++) {
                //     let tinfo = useinfo[i];
                //     if (tinfo && tinfo.hps) {
                //         hps[key].push({ hps: tinfo.hps });
                //     }
                // }

                // 只有第一个和最后一个是有效的
                if (useinfo.length > 1) {
                    let first = useinfo.shift();
                    if (first && first.iframe && first.hps) {
                        hps[key].push({
                            hps: first.hps,
                            iframe: first.iframe
                        })
                    }
                    let last = useinfo.pop();
                    if (last && last.iframe && last.hps) {
                        hps[key].push({
                            hps: last.hps,
                            iframe: last.iframe
                        })
                    }
                }
                else if (useinfo.length > 0) {
                    let first = useinfo.shift();
                    if (first && first.iframe && first.hps) {
                        hps[key].push({
                            hps: first.hps,
                            iframe: first.iframe
                        })
                    }
                }

            }
            data.info.akRaceHps = hps;
        }
    }
    catch (e) {

    }

    let find = false;
    for (let i = 0; i < data.info.akRaceInfo.length; i++) {
        let r = MatchRacePlt(data.info.akRaceInfo[i]._plt_)
        if (r && r.is_race_mode(data.info.rid, data.rmode)) {
            find = true;
            break;
        }
    }

    if (find) RecordMgr.inst.add_record(data.name, data.info, data.mode, data.rmode);
}, __filename)


Match_Proc.regist_proc('queryvideo', function (nid: string, data: { _sys_: if_sys_, uid: number, level: number, rmode: string }) {
    var v = RecordMgr.inst.get_records(data._sys_, data.level, data.rmode);
    netInst.sendData({
        cmd: "queryvideo",
        uid: data.uid,
        infos: v,
        level: data.level
    }, nid);
}, __filename);

Match_Proc.regist_proc('queryvideod', function (nid: string, data: { _sys_: if_sys_, uid: number, vids: string[] }) {
    var v = RecordMgr.inst.get_detail_records(data._sys_, data.vids);
    netInst.sendData({
        cmd: "queryvideod",
        uid: data.uid,
        infos: v
    }, nid);
}, __filename);

