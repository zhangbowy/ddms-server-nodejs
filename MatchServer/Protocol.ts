import { SeRacePvp } from "./SeDefine";

export interface ifResult {
    winids: number[],
    hps: number[],
    iframe: number,
    hpchange: number,
    totaldamage: number
}


export interface ifRecordFile {
    rid: string,
    seed: number,
    akRaceInfo: SeRacePvp[],
    akRecord: Object,
    akResults: ifResult[],
    akRaceHps: Object,
    finish_frame: number,
    f_time: number,
    level?: number,
    racever:string,
    score: number,
    dieTime: number
}

export interface ifRecordShort {
    rid: string,
    rmode: string,
    infos: {
        name: string,
        uid: number
    }[]
}