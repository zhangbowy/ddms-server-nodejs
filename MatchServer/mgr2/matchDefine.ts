import { SeRacePvp, LiveMode } from "../SeDefine";

export var MatchType = {
    match_1v1: '1v1',
    match_2v2: '2v2',
    match_peak: 'peakmatch',
    match_shangjin: 'shangjinmatch',
    match_wuxianhuoli: 'wuxianhuoli'
}

export class IfMatchServiceBase {
    static plt(plt: string) {
        // 闪电玩玩吧的都安排到一起去
        if (plt == 'sdw' || plt == 'qzone') {
            return 'sdw';
        }

        return plt;
    }

    static enter(score: number) {
        return '1';
    }

    /**
     * 负责匹配和清理过期玩家和数据
     */
    static match: (plt: string, floor: string, get_uids: (floor: string) => number[], reset_uids: (floor: string, uids: number[]) => void) => void;
}

export interface IfMatchServicefunc {
    plt: (plt: string) => string;
    enter: (score: number | string) => string;
    match: (plt: string, floor: string, get_uids: (floor: string) => number[], reset_uids: (floor: string, uids: number[]) => void) => void;
}


export interface ifLiveRace {
    rid: string,
    rurl: string,
    infos: SeRacePvp[],
    liveKey: string,
    cttime: number,
    mode: string,
    rmode: LiveMode,
    racever: string,
}

export interface IfJoinInfo {
    rid: string,
    joininfo: {
        checkKey: string,
        rurl: string,
        rid: string,
        uid: number,
        oscore: number,
        mode: string,
        rmode: number
    },
    time: number
}
