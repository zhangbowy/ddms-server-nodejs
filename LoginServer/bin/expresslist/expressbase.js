"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressBase = void 0;
class ExpressBase {
    constructor(app, type) {
        this.genid = 0;
        this._app = app;
        this.type = type;
    }
    get_query_id() {
        this.genid = (this.genid + 1) % 10000;
        let qid = 'web_' + this.type + '_' + Date.now() + this.genid;
        return qid;
    }
    onQueryResponse(qid, data) {
        return false;
    }
}
exports.ExpressBase = ExpressBase;
//# sourceMappingURL=expressbase.js.map