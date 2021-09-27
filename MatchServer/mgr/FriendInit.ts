import { TeMysql } from '../lib/TeMysql';
import { configInst } from '../lib/TeConfig';

var tables: Object = {
    'tab_friends': [
        "iuid",         // 玩家id
        0,
        "ifuid",        // 好友id
        0,
        "ct_time",      // 成为好友的时间
        "''",
        "kplt",
        "''",
    ],
    'tab_friend_info': [
        "kID",         // 玩家id
        "''",
        "kname",        // 好友id
        "''",
        "ipvplevel",       // 好友段位
        0,
        "ipvpscore",       // 好友战斗机分
        1500,
        "kicon",
        '{}',
        "ilevel",
        0,
        "kplt",
        "''",
        "ksid",
        "''",
        "avatar",
        "{}"
    ],
}

class FriendInitClass extends TeMysql {
    private createTableClass(list: Array<string>): Function {
        var cmdstr_h = 'var BaseInfo = (function () {\n\
            function BaseInfo() {';
        var cmdstr_c = 'this.kID = 0;';
        var cmdstr_e = '}\n\
            return BaseInfo;}());\n\
            exports=BaseInfo;';
        for (var i = 0; i < list.length / 2; i++) {
            var key = list[i * 2];
            var typev = list[i * 2 + 1];
            var vv: string | number =  list[i * 2 + 1];
            if (key.charAt(0) == 'i') {
                vv = 0;
            }
            cmdstr_c += "this." + key + "=" + vv + ";\n";
        }

        var s = cmdstr_h + cmdstr_c + cmdstr_e;
        var o = eval(s);
        return o;
    }

    init() {
        for (var key in tables) {
            this.registTable(key, this.createTableClass(tables[key]));
        }

        /**
         * 存储过程 添加好友
        */
        this.registFunc('focus_friend', '1.0', "(in uid_a bigint,in uid_b bigint,in plt VARCHAR(32))", "BEGIN\n\
        DECLARE v_tnum int; \n\
        set v_tnum = 0; \n\
        select count(1) into v_tnum from tab_friends where iuid = uid_a and ifuid = uid_b and kplt=plt; \n\
        if (v_tnum = 0) then\n\
        insert into tab_friends(iuid, ifuid, ct_time,kplt)values(uid_a, uid_b, UNIX_TIMESTAMP(NOW()) * 1000,plt); \n\
        end if; \n\
        select v_tnum; \n\
        END\n")

        this.connect(configInst.get('friend_mysql'));
        this.on('ready', function () {
            console.log('mysql open');
        })
    }
}
export var friend_mysqlInst = new FriendInitClass();