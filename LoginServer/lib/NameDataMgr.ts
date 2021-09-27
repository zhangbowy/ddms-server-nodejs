import * as path from 'path';
import * as fs from 'fs';
import { gmMgrInst } from "../mgr/GMMgr";
import { StaDefine, onlineMgrInst } from '../mgr/OnlinePlayer';
import { netMgrInst } from '../NetMgr/NetMgr';
export class NameDataMgr {
    private static _filePath: string = path.join(__dirname, '../changeName.csv');
    private static _send: string = path.join(__dirname, '../send.data');
    private static _receive: string = path.join(__dirname, '../receive.data');
    private static _data:Array<String> = [];
    private static send_id = [];
    private static receive_result = [];
    static init() {
        NameDataMgr._loadFile();
        setInterval(NameDataMgr.update, 10000);
    }

    private static update() {
        var send_count = 0;
        for(let i = 0; i < NameDataMgr._data.length; i++){
            var player = NameDataMgr._data[0].split(',');
            var player_id = parseInt(player[0]);
            var plt = player[1];
            player.splice(0,2);
            var data = player.join(' ');
            try{
                var clsID = onlineMgrInst.getOnlinePlayerCSId(player_id, plt);
            }
            catch(e){

            }
            if(clsID){
                netMgrInst.sendSetPlayerInfo(clsID, player_id, 'all', 'chenkai', data);
                send_count++;
                NameDataMgr._data.splice(i,1);
                i--;
                NameDataMgr.send_id.push(player_id);
            }

            if(send_count >= 10){
                break;
            }
        }
        fs.writeFileSync(NameDataMgr._filePath,NameDataMgr._data.join('\r\n'));
        fs.writeFileSync(NameDataMgr._send,NameDataMgr.send_id.join('\r\n'));
        fs.writeFileSync(NameDataMgr._receive,NameDataMgr.receive_result.join('\r\n'));
    }

    private static _loadFile() {
        try {
            var jt = fs.readFileSync(NameDataMgr._filePath);
            NameDataMgr._data = jt.toString().split('\r\n');
        }
        catch (e) {
        }
    }
    
    public static _receive_ret(uid, bsucc){
       NameDataMgr.receive_result.push(uid + ','+ bsucc);
    }
}