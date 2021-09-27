import { if_sys_, SeChartUnit } from "../SeDefine";
import { configInst } from "../lib/TeConfig";

export interface ifChartMgr {
    start: () => void,
    registPlt: (plt: string) => void,
    addPlayerChart: (nid: string, _sys_: if_sys_, ...args: any[]) => void,
    onGetGenGroupId: (nid: string, _sys_: if_sys_, ...args: any[]) => void,
    onGetScoreChart: (nid: string, _sys_: if_sys_, ...args: any[]) => void
    onGetHistoryScoreChart: (nid: string, _sys_: if_sys_, ...args: any[]) => void
    onQueryRanks: (nid: string, _sys_: if_sys_, ...args: any[]) => { [plt: string]: { rank: number, name: string, uid: number, score: number }[][] }
    onQueryInfo: (nid: string, _sys_: if_sys_, ...args: any[]) => void,
    QueryRanks: (plts: string[], types: number[], len: number, sid: string) => void
    cheatMsg: (nid: string, _sys_: if_sys_, ...args: any[]) => void
    onGiveDayReward: (nid: string, _sys_: if_sys_, ...args: any[]) => void
    onGiveDayCrossReward: (nid: string, _sys_: if_sys_, ...args: any[]) => void
    onGiveSeasonReward: (nid: string, _sys_: if_sys_, ...args: any[]) => void,
    onGiveSeasonCrossReward: (nid: string, _sys_: if_sys_, ...args: any[]) => void,
    delete_all_chart_by_uid: (plt: string, uid: number) => void,
    getWarZoneInfos: (plt: string) => void,
    onClearRanks: (plts: string[], types: number[]) => void
    changePvePKFormation: (nid: string, _sys_: if_sys_, seasonid: string, id: number, formation: object, pve_pk_extra_info: object) => void
    pvePkRefresh: (nid: string, _sys_: if_sys_, charid: number, indexs: Array<number>, rank: number, except: Array<{id: number, igroup: string}>) => void
    checkLastOne: (nid: string, _sys_: if_sys_, charid: number, type: number, info: {}, season_id: string, opp_name: string) => void
    checkFight: (nid: string, _sys_: if_sys_, charid: number, igroup: string, opp_id: number, opp_igroup: string, index: number) => void
}

export var chartInst: ifChartMgr = configInst.get("usev2chart") ? new (require("../ChartMgrV2/SeChartMgr").SeChartMgr) : new (require("../ChartMgr/SeChartMgr").SeChartMgr);