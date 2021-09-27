declare module Client2Server {
    interface ICS_PveFightStart {
        cmd: 'pvestart',
        levelId: string,
        times:number,
    }

    interface ICS_PveFightFinish {
        cmd: 'pvefinish',
        levelId: string,
        times: number,
        hps: number[],
        time: number,
    }
}
declare module Server2Client {
    interface ISC_PveFightStart {
        cmd: 'pvestart',
        succ: boolean,
        levelId: string,
        times:number,
    }

    interface ISC_PveFightFinish {
        cmd: 'pveaward',
        succ: boolean,
        levelId: string,
        awards: {
            kItemID: string;
            iPileCount: number;
        }[]
    }
}
