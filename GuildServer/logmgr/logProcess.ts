import { TeMysql } from '../lib/TeMysql';
import { configInst } from '../lib/TeConfig';

var tables: Object = {
    'tab_login': [
        "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
        "zid",//	bigint	是	大区id
        "iuin",//	bigint	是	玩家id(全局唯一)
        "channel",//	string	是	渠道
        "record_time",//	string	是	记录时间(在结算时记录)
        "pvp_level",//	bigint		玩家pvp等级
        "pve_level",//	bigint		玩家pve等级
        "vip_level",//	bigint		玩家vip等级
        "device_os",//	string		设备操作系统 ios/ andriod
        "last_login_time",//	String		上一次登录时间
        "register_time",//	string		注册时间
        "ip",//	string		玩家ip地址
        "screenSize",//			设备屏幕尺寸
        "netWorkType",//			网络类型2G 3G 4G wifi
        "dh_param1",//	string		预留固定字段1
        "dh_param2",//	string		预留固定字段2
    ],
    'tab_create': [
        "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
        "zid",//	bigint	是	大区id
        "iuin",//	bigint	是	玩家id(全局唯一)
        "channel",//	string	是	渠道
        "record_time",//	string	是	创角时间(在结算时记录)
        "dh_param1",//	string		预留固定字段1
        "dh_param2",//	string		预留固定字段2
    ],
    'tab_logout': [
        "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
        "zid",//	bigint	是	大区id
        "iuin",//	bigint	是	玩家id(全局唯一)
        "channel",//	string	是	渠道
        "record_time",//	string	是	记录时间(在结算时记录)
        "pvp_level",//	bigint		玩家pvp等级
        "pve_level",//	bigint		玩家pve等级
        "vip_level",//	bigint		玩家vip等级
        "online_time",//	bigint		在线时长(单位：秒)
        "logout_type",//	bigint		登出类型(1：正常退出 2：异常退出）
        "dh_param1",//	string		预留固定字段1
        "dh_param2",//	string		预留固定字段2
        "pvp_score",
    ],
    'tab_item': [
        "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
        "zid",//	bigint	是	大区id
        "iuin",//	bigint	是	玩家id(全局唯一)
        "channel",//	string	是	渠道
        "record_time",//	string	是	记录时间(在结算时记录)
        "item_id",//	string	是	物品id
        "before_cnt",//	bigint	　	操作前数量
        "after_cnt",//	bigint	　	操作后数量
        "change_cnt",//	bigint	　	物品变化值，负值代表消耗，否则是得到(等于after_cnt - before_cnt)
        "reason_type",//	string	　	操作原因(例如: 1:扭蛋,2:扫荡等)
        "moneytype1",//	string		货币类型
        "change_amt1",//	bigint		操作引起的货币变化数量
        "dh_param1",//	string		预留固定字段1
        "dh_param2",//	string		预留固定字段2
        "sub_reason"
    ],
    'tab_recharge': [
        'product_id',//	bigint	是	游戏id（由平台确定）
        'zid',//	bigint	是	大区id
        'iuin',//	bigint	是	玩家id(全局唯一)
        'channel',//	string	是	渠道
        'record_time',//	string	是	记录时间(在结算时记录)
        'recharge_type',//	string		充值类型（档位）
        'recharge_amt',//	string		充值金额
        'register_time',//	string		注册时间
        'dh_param1',//	string		预留固定字段1
        'dh_param2',//	string		预留固定字段2
        'pvp_level',//	bigint		玩家pvp等级
        'pve_level',//	bigint		玩家pve等级
        'vip_level',//	bigint		玩家vip等级
        'orderid',
    ],
    'tab_register': [
        "product_id",//	bigint	是	游戏id（怼怼游戏id：1146308431）
        "zid",//	bigint	是	大区id
        "iuin",//	bigint	是	玩家id(全局唯一)
        "channel",//	string	是	渠道
        "record_time",//	string	是	注册时间
        "version",//	string		玩家注册时的游戏版本
        "device_os",//	String		设备操作系统类型android、ios，数据要清洗成不包括特别符号的
        "highResolution",//	string		设备分辨率高
        "lowResolution",//	string		设备分辨率宽
        "screenSize",//	string		设备屏幕尺寸
        "ip",//	string		玩家ip
        "dh_param1",//	string		预留固定字段1
        "dh_param2",//	string		预留固定字段2
        "shareuid",
    ]
}

class LogMysqlMgr extends TeMysql {

    log_process(nid: string, recive: { type: string, info: Object, log: string }) {
        var ot = {};
        if (!tables.hasOwnProperty(recive.type)) {
            return;
        }

        var src = '';
        var types = tables[recive.type] as string[];
        for (var i = 0; i < types.length; i++) {
            var key = types[i];
            src += (recive.info[key] || '') + ','
        }

        this.instrtData(recive.type, this.createInsertInfo(src));
    }

    createTableClass(list: Array<string>): Function {
        var cmdstr_h = 'var BaseInfo = (function () {\n\
        function BaseInfo() {';
        var cmdstr_c = 'this.kID = 0;';
        var cmdstr_e = '}\n\
        return BaseInfo;}());\n\
        exports=BaseInfo;';
        for (var i = 0; i < list.length; i++) {
            var key = list[i];
            cmdstr_c += "this." + key + "='';\n";
        }

        var s = cmdstr_h + cmdstr_c + cmdstr_e;
        var o = eval(s);
        return o;
    }

    createInsertInfo(s: string) {
        var lst = s.split(',');
        lst.splice(0, 0, 'undefined');
        return lst;
    }

    init() {
        for (var key in tables) {
            this.registTable(key, this.createTableClass(tables[key]));
        }

        this.connect(configInst.get('log_mysql'));
    }


}

export var log_mysqlInst = new LogMysqlMgr();