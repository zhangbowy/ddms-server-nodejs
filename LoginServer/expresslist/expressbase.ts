import { IncomingMessage } from "http";
import { Application } from "express";

export interface BodyIncomingMessage extends IncomingMessage {
    body: any;
    query: any;
}

export class ExpressBase {
    protected _app: Application;
    public type: string;
    constructor(app: Application, type: string) {
        this._app = app;
        this.type = type;
    }

    genid: number = 0;
    get_query_id() {
        this.genid = (this.genid + 1) % 10000;
        let qid = 'web_' + this.type + '_' + Date.now() + this.genid;
        return qid;
    }

    public onQueryResponse(qid: string, data: any) {
        return false;
    }
}