import * as fs from 'fs';
import * as path from "path";
import { configInst } from "./lib/TeConfig";
import { SeSimpleGuildPlayer, SeGuild, SeEnumGuildTitle, SeGuildPlayer } from './SeDefine';
import { TeDate, HashMap } from './lib/TeTool';
// 第三方日志系统的定义


// enum TL_EventType {
//     track = 'track',
//     user_set = 'user_set',
//     user_setOnce = 'user_setOnce',
//     user_add = 'user_add',
//     user_del = 'user_del'
// }
export class ThreeLogMgr {

    constructor() {
        setInterval(this._saveCache.bind(this), 2000);
    }

    public three_log_event(uid: number, event_name: string, obj: Object) {
        var s = {
            "#account_id": uid.toString(),
            // "#distinct_id": "F53A58ED-E5DA-4F18-B082-7E1228746E88",
            "#type": 'track',
            // "#ip": "192.168.171.111",
            // "#time": "2017-12-18 14:37:28.527",
            "#time": /*"2017-12-18 14:37:28.527"*/ TeDate.DateToStr(Date.now()),
            "#event_name": event_name,
            "properties": obj
        }

        this._catch.add(event_name, s);

        // var ali_log
    }

    public guildLogs(user_info: SeSimpleGuildPlayer | SeGuildPlayer, guild_info: SeGuild, type: string, guild_task_id?: string, guild_task_value?: number, guild_hero_id?: string, guild_hero_count?: number, guild_provide_hero_id?: string) {
        try {
            var outList = [
                "type",
                "guild_task_id",
                "guild_task_value",
                "guild_hero_id",
                "guild_provide_hero_id",
                "guild_hero_count",
            ];

            var outParam = {
                type: type,
                guild_task_id: guild_task_id,
                guild_task_value: guild_task_value,
                guild_hero_id: guild_hero_id,
                guild_provide_hero_id: guild_provide_hero_id,
                guild_hero_count: guild_hero_count
            }

            var ot = this.createlog(user_info, guild_info, outList, outParam);
            this.three_log_event(user_info.id, 'guild', ot);
        }
        catch (e) {
            console.error("catch :" + e);
        }
    }

    //-------------------------------------------------------------------------------//

    private createlog(user_info: SeSimpleGuildPlayer | SeGuildPlayer, guild_info: SeGuild, arrayList: Array<string>, outParam?: Object): Object {
        // 有几个是必须要有的添加一下
        var needslist = ['plt', 'iuin', 'zid', 'channel', 'guild_id', 'char_name', "guild_name", "guild_medal", "guild_capital", "guild_level", "guild_general_name"];
        for (var i = 0; i < needslist.length; i++) {
            if (arrayList.indexOf(needslist[i]) < 0) {
                arrayList.push(needslist[i]);
            }
        }

        // 生成日志的通用接口
        var outLog = {
            // logtype: type,
            // logfile: type + '_' + TeDate.DateToLogStr(Date.now()) + `_${gappid}.log`,
        }

        for (var i = 0; i < arrayList.length; i++) {
            var sKey = arrayList[i];
            switch (sKey) {
                case 'zid': outLog[sKey] = configInst.get('serverid') || 0; break;
                default:
                    if (outParam && outParam.hasOwnProperty(sKey)) {
                        outLog[sKey] = outParam[sKey];
                    }
                    else {
                        outLog[sKey] = '';
                    }
                    break;
            }
        }
        if (guild_info){
            for (var i = 0; i < arrayList.length; i++) {
                var sKey = arrayList[i];
                try {
                    let guild_general_name = "";
                    for(let j = 0; j < guild_info.members.length; j++){
                        if(guild_info.members[j].title == SeEnumGuildTitle.general) guild_general_name = guild_info.members[j].name;
                    }
                    switch (sKey) {
                        case 'plt': outLog[sKey] = guild_info.plt; break;
                        case 'guild_id': outLog[sKey] = guild_info.id; break;
                        case 'guild_name': outLog[sKey] = guild_info.name; break;
                        case 'guild_medal': outLog[sKey] = guild_info.medal; break;
                        case 'guild_capital': outLog[sKey] = guild_info.capital; break;
                        case 'guild_level': outLog[sKey] = guild_info.level; break;
                        case 'guild_general_name': outLog[sKey] = guild_general_name; break;
                        default: break;
                    }
                }
                catch (e) {
                    outLog[sKey] = '';
                }
            }
        }
        if (user_info) {
            for (var key in arrayList) {
                var sKey = arrayList[key];
                try {
                    switch (sKey) {
                        case 'iuin': outLog[sKey] = user_info.id || 0; break;
                        case 'char_id': outLog[sKey] = user_info.id; break;
                        case "char_name": outLog[sKey] = user_info.name; break;
                        default: break;
                    }
                }
                catch (e) {
                    outLog[sKey] = '';
                }
            }
        }

        return outLog;
    }

    // 这里导出日志
    private _catch: HashMap<any> = new HashMap();

    public mkdirsSync(dirpath: string, mode?: number) {
        mode = mode || 511;
        if (!fs.existsSync(dirpath)) {
            var pathtmp;
            if (dirpath[0] == '/') pathtmp = '/';
            var dirs = dirpath.split(path.sep);
            for (var i = 0; i < dirs.length; i++) {
                var dirname = <string>dirs[i];
                if (dirname.length == 0) continue;
                if (pathtmp) {
                    pathtmp = path.join(pathtmp, dirname);
                }
                else {
                    pathtmp = dirname;
                }
                if (!fs.existsSync(pathtmp)) {
                    fs.mkdirSync(pathtmp, mode)
                }
            }
        }
        return true;
    }

    get path() {
        return configInst.get('logMgr.threepath');
    }

    private _saveCache() {
        if (!this.path) {
            this._catch.clear();
            return;
        }
        this.mkdirsSync(this.path);

        let keys = this._catch.keys;
        for (let j = 0; j < keys.length; j++) {
            // let logName = configInst.get('serverid') + '.' + keys[j] + '.' + TeDate.DateToLogStr(new Date()) + '.tga.log'
            let logName = configInst.get('serverid') + TeDate.DateToLogStr(new Date()) + '.tga.log'

            let fileName = path.join(this.path, logName);
            let write_buff = '';
            let cache = this._catch.get(keys[j]);
            for (let i = 0; i < cache.length; i++) {
                write_buff += JSON.stringify(cache[i], function (k, v) {
                    if (typeof v == 'string') {
                        v = v.replace(/"/g, '\\"');
                    }
                    return v;
                }) + '\n';
                if (i != 0 && i % 20 == 0) {
                    fs.writeFile(fileName, write_buff, { flag: 'a+' }, () => { })
                    write_buff = '';
                }
            }
            if (write_buff.length != 0) {
                fs.writeFile(fileName, write_buff, { flag: 'a+' }, () => { })
                write_buff = '';
            }
        }

        this._catch.clear();
    }
}

export var _three_mgr = new ThreeLogMgr();