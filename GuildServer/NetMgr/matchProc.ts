import { netInst, NetEvent } from './SeNetMgr';
import { serverMgrInst, DefineSType } from '../serverMgr';
import { ifRecordFile } from '../Protocol';
import { LiveMode, SeRacePvp, if_sys_ } from '../SeDefine';
import { ProcMgr } from './TeProc';
import { join } from 'path';

import { AutoLoaderModule } from '../lib/TeAutoLoadModule';
import { configInst } from '../lib/TeConfig';
import { guildService } from '../mgr2/mgrServices/guildService';
import { log_mysqlInst } from '../logmgr/logProcess';

//------------------------------------------------//

export var Match_Proc = new ProcMgr(__filename, netInst, 'server');

//-------------------------------------------------//
let _useold_ = !configInst.get("usenewmatch");

Match_Proc.regist_proc(NetEvent.connected, function (nid: string) {
    netInst.addCheckLink(nid);
}, __filename);

Match_Proc.regist_proc(NetEvent.disconnect,
    function (nid: string) {
        serverMgrInst.del_server(nid);
    }, __filename);


Match_Proc.regist_proc('regist', function (nid: string, data: { type: string, id: string, url: string, _sys_?: if_sys_ }) {
    if ([DefineSType.logic].indexOf(data.type) != -1) {
        serverMgrInst.add_server(data.type, nid, data.id, data.url, data._sys_);
        netInst.delCheckLink(nid);
        netInst.sendData({ cmd: 'registret', type: true }, nid);
        guildService.plt_init[data._sys_.plt] = true;
    }
    else {
        netInst.sendData({ cmd: 'registret', type: false }, nid);
    }
}, __filename);

AutoLoaderModule.watch(join(__dirname, '../mgr2', 'mgrServices')).on("add", function (file) {
        Match_Proc.BEGIN(file);
    }).on("del", function (file) {
        Match_Proc.FINISH(file);
    }).load();

AutoLoaderModule.watch(join(__dirname, '../mgr2', 'process')).on("add", function (file) {
        Match_Proc.BEGIN(file);
    }).on("del", function (file) {
        Match_Proc.FINISH(file);
    }).load();

