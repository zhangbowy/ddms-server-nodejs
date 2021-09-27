"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NameDataMgr = void 0;
const path = require("path");
const fs = require("fs");
const OnlinePlayer_1 = require("../mgr/OnlinePlayer");
const NetMgr_1 = require("../NetMgr/NetMgr");
class NameDataMgr {
    static init() {
        NameDataMgr._loadFile();
        setInterval(NameDataMgr.update, 10000);
    }
    static update() {
        var send_count = 0;
        for (let i = 0; i < NameDataMgr._data.length; i++) {
            var player = NameDataMgr._data[0].split(',');
            var player_id = parseInt(player[0]);
            var plt = player[1];
            player.splice(0, 2);
            var data = player.join(' ');
            try {
                var clsID = OnlinePlayer_1.onlineMgrInst.getOnlinePlayerCSId(player_id, plt);
            }
            catch (e) {
            }
            if (clsID) {
                NetMgr_1.netMgrInst.sendSetPlayerInfo(clsID, player_id, 'all', 'chenkai', data);
                send_count++;
                NameDataMgr._data.splice(i, 1);
                i--;
                NameDataMgr.send_id.push(player_id);
            }
            if (send_count >= 10) {
                break;
            }
        }
        fs.writeFileSync(NameDataMgr._filePath, NameDataMgr._data.join('\r\n'));
        fs.writeFileSync(NameDataMgr._send, NameDataMgr.send_id.join('\r\n'));
        fs.writeFileSync(NameDataMgr._receive, NameDataMgr.receive_result.join('\r\n'));
    }
    static _loadFile() {
        try {
            var jt = fs.readFileSync(NameDataMgr._filePath);
            NameDataMgr._data = jt.toString().split('\r\n');
        }
        catch (e) {
        }
    }
    static _receive_ret(uid, bsucc) {
        NameDataMgr.receive_result.push(uid + ',' + bsucc);
    }
}
exports.NameDataMgr = NameDataMgr;
NameDataMgr._filePath = path.join(__dirname, '../changeName.csv');
NameDataMgr._send = path.join(__dirname, '../send.data');
NameDataMgr._receive = path.join(__dirname, '../receive.data');
NameDataMgr._data = [];
NameDataMgr.send_id = [];
NameDataMgr.receive_result = [];
//# sourceMappingURL=NameDataMgr.js.map