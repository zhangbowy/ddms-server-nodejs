"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* 负责玩家的登录模块，这个服务器不和玩家直接连接，和TS链接处理玩家登录信息，
   目前是小功能所以现在 AS部分的结构也放在这个服务器上，认为是接入自己的账号系统，
   以后可以扩展使用别人的账号系统
*/
const NetMgr_1 = require("./NetMgr/NetMgr");
const OnlinePlayer_1 = require("./mgr/OnlinePlayer");
const GMMgr_1 = require("./mgr/GMMgr");
const TeConfig_1 = require("./lib/TeConfig");
const InviteCodeMgr_1 = require("./mgr/InviteCodeMgr");
const ExtInfoLoader_1 = require("./apilibs/ExtInfoLoader");
const LogMgr_1 = require("./lib/LogMgr");
const WebApp_1 = require("./WebApp");
const MainLS_1 = require("./NetMgr/MainLS");
const AppMgr_1 = require("./mgr/AppMgr");
const NameDataMgr_1 = require("./lib/NameDataMgr");
let error = LogMgr_1.LogMgr.error('app.ts');
TeConfig_1.configInst.registDefault({
    dh_appkey: "2d419b6be55d44f98602c5acb76bf8",
    proxyurl: "https://ddms-server.shandw.com:17000",
    webhost: "*",
    payInfo: {
        call_back_url: `https://www.shandw.com/mobile/details.html?`,
        merchant_url: `https://www.shandw.com/mobile/details.html?`,
    },
    local: false
});
process.on('uncaughtException', function (err) {
    error('Caught exception: ' + err.message + '\n' + (err.stack || ''));
});
AppMgr_1.AppUnit.init();
OnlinePlayer_1.onlineMgrInst;
var nodes = TeConfig_1.configInst.get('gmMgr.database.nodes');
if (!nodes) {
    nodes = [{ port: TeConfig_1.configInst.get('gmMgr.database.port'), host: TeConfig_1.configInst.get('gmMgr.database.ip') }];
}
GMMgr_1.redistInst.init(nodes, TeConfig_1.configInst.get('gmMgr.database.select'), TeConfig_1.configInst.get('gmMgr.database.flag'));
GMMgr_1.redistInst.on('ready', (() => {
    NetMgr_1.netMgrInst.listen(TeConfig_1.configInst.get('netMgr.port'), TeConfig_1.configInst.get('netMgr.flag'));
    GMMgr_1.gmMgrInst.init(TeConfig_1.configInst.get('gmMgr.port'), {});
    InviteCodeMgr_1.InviteCodeMgrInst;
    ExtInfoLoader_1.QzoneManagerInst.test();
}));
if (TeConfig_1.configInst.get("masterls") && TeConfig_1.configInst.get("masterls.url")) {
    MainLS_1.MainLS.inst.connect(TeConfig_1.configInst.get("masterls.url"));
}
WebApp_1.WebApp.inst.init(TeConfig_1.configInst.get('webAppMgr.port') + 80, TeConfig_1.configInst.get('webAppMgr.port') + 443, TeConfig_1.configInst.get('webAppMgr.port'));
//强制改名额外增加的流程
if (TeConfig_1.configInst.get("change_name")) {
    NameDataMgr_1.NameDataMgr.init();
}
//# sourceMappingURL=app.js.map