/* 负责玩家的登录模块，这个服务器不和玩家直接连接，和TS链接处理玩家登录信息，
   目前是小功能所以现在 AS部分的结构也放在这个服务器上，认为是接入自己的账号系统，
   以后可以扩展使用别人的账号系统
*/
import { netMgrInst } from "./NetMgr/NetMgr";
import { onlineMgrInst } from "./mgr/OnlinePlayer";
import { gmMgrInst, redistInst } from './mgr/GMMgr';
import { configInst } from './lib/TeConfig';
import { InviteCodeMgrInst } from './mgr/InviteCodeMgr';
import { QzoneManagerInst } from "./apilibs/ExtInfoLoader";
import { LogMgr } from "./lib/LogMgr";
import { WebApp } from './WebApp';
import { MainLS } from "./NetMgr/MainLS";
import { AppUnit } from "./mgr/AppMgr";
import { NameDataMgr } from "./lib/NameDataMgr";

let error = LogMgr.error('app.ts');

configInst.registDefault({
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

AppUnit.init();
onlineMgrInst;

var nodes = configInst.get('gmMgr.database.nodes') as any[];
if (!nodes) {
    nodes = [{ port: configInst.get('gmMgr.database.port'), host: configInst.get('gmMgr.database.ip') }]
}

redistInst.init(nodes, configInst.get('gmMgr.database.select'), configInst.get('gmMgr.database.flag'));
redistInst.on('ready', (() => {
    netMgrInst.listen(configInst.get<number>('netMgr.port'), configInst.get<any>('netMgr.flag'));
    gmMgrInst.init(configInst.get<number>('gmMgr.port'), {});

    InviteCodeMgrInst;
    QzoneManagerInst.test();
}));

if (configInst.get("masterls") && configInst.get("masterls.url")) {
    MainLS.inst.connect(configInst.get("masterls.url"));
}

WebApp.inst.init(configInst.get<number>('webAppMgr.port') + 80, configInst.get<number>('webAppMgr.port') + 443, configInst.get<number>('webAppMgr.port'));
//强制改名额外增加的流程
if(configInst.get("change_name")){
    NameDataMgr.init();
}