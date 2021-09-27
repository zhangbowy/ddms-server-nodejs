"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TeConfig_1 = require("./lib/TeConfig");
const cluster_1 = require("cluster");
if (cluster_1.isMaster) {
    if (TeConfig_1.configInst.get("fork.open")) {
        let num = TeConfig_1.configInst.get("fork.num") || 1;
        console.log(num);
        for (let i = 1; i <= num; i++) {
            let str = i.toString();
            cluster_1.fork({
                file: 'config' + str + '.json',
                dfile: 'dynamic' + str + '.json'
            });
        }
    }
}
if (cluster_1.isWorker) {
    TeConfig_1.configInst.set_path(process.env.file, process.env.dfile);
    require('./app');
}
//# sourceMappingURL=fork.js.map