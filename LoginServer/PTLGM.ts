declare namespace PTL_GM2LS {
    export interface Login {
        cmd: string;// login
        account: string;
        passwd: string;
    }

    export interface GmMails {
        cmd: string;// gmmails
        type: string; // load del
        info:any;
    }

    export interface GiveMails {
        cmd: string;// givemails
        mails: Array<any>;
        plt?: string;
    }

    export interface ShowOnline {
        cmd: string;// showonline
        showOnline: boolean;
        plt?: string;
    }

    export interface QueryPlayerList {
        cmd: string;// showonline
        ipage: number
        plt?: string;
    }

    export interface KickPlayer {
        cmd: string;// kickplayer
        id: number;
        plt?: string;
    }

    export interface CreateGm {
        cmd: string;// creategm
        account: string;
        passwd: string;
        property: number;
    }

    export interface OnlineStaInfo {
        cmd: string;// olsta
        begintime: number;// 毫秒的
        endtime: number;// 毫秒的
    }
}

declare namespace Ptl_LS2GM {
    export interface LoginRet {
        cmd: string; // loginret
        account: string;
        type: string;
        property: number;
        tables:any;
        plts:string[];
    }

    export interface GiveMailsRet {
        cmd: string;// givemailsret
        results: Array<string>;
    }

    export interface changePlayer {
        cmd: string; // onlines
        login: boolean;
        players: Array<{ account: string, id: number, loginInfo: any, logintime: number, plt: string }>;
    }

    export interface ServerMonit {
        cmd: string; // query_server_info
        serverinfos: Array<{ sid: string, config: any, plt: string, onlinenum: number, url?: string }>;
    }

    export interface QueryOnlinePlayerList {
        cmd: string; // onlines
        ipage: number;
        itotpage: number;
        players: Array<{ account: string, id: number }>;
        itotnum: number;
    }

    export interface CreateGMRet {
        cmd: string; // creategmret
        succ: boolean;
        account: string;
    }

    export interface OnlineStaInfo {
        cmd: string;// olsta
        begintime: number;// 毫秒的
        endtime: number;// 毫秒的
        infos: Array<any>;
    }

    export interface OptRet {
        cmd: string;// optret
        type: string;
        succ: boolean;
    }

    export interface CreateInviteRet {
        cmd: string;// givemailsret
        results: Array<string>;
    }
}