
import { TeDate, TeMap } from '../lib/TeTool';
import { RowDataPacket, QueryError } from 'mysql';
import { readFileSync, writeFileSync } from 'fs';
import { log_mysqlInst } from './logProcess';
import { netInst } from '../NetMgr/SeNetMgr';
import { liveInst } from '../mgr/LiveMgr';
export function gm_query_process(nid: string, data: { gmid: string, channel: string, type: string, date: number } | any) {
    switch (data.type) {
        case 'dailys_ta': {
            var info = dailyReportInst.getReport(data.date);
            console.log(info);
            break;
        }
        case 'do_dailys_ta': {
            var q: if_query = {
                date: data.date,
                channel: data.channel,
                cb: function (q) {
                    if (q.optlist.length == q.q_count) {
                        // console.log(q.info);
                        netInst.sendData({
                            cmd: 'log_query_ret',
                            gmid: q.other.gmid,
                            type: q.other.type,
                            channel: q.other.channel,
                            info: q.info
                        }, q.other.nid);
                    }
                },
                optlist: [],
                q_count: 0,
                other: {
                    nid: nid,
                    gmid: data.gmid,
                    type: data.type,
                    channel: data.channel
                }
            }
            dailyReportInst.doReport(q);
            break;
        }
        case 'itemlog': {
            // query_item_log(nid, data.gmid, data.uid, data.itemid, data.date);
            break;
        }
        case 'monit_race': {
            netInst.sendData({
                cmd: 'monit_race',
                gmid: data.gmid,
                type: data.type,
                channel: data.channel,
                info: liveInst.race_count_monit,
            }, nid);
            break;
        }
    }
}

class QueryUnit {
    qstr: string;
    qid: number;
    bind_data: if_query;
    cb: (q: QueryUnit, error: QueryError, result: Array<RowDataPacket>) => void
}

var QUList: QueryUnit[] = [];

var genid: number = 0;
function mysql_query(query_str: string, q_param: if_query, cb: (q: QueryUnit, error: QueryError, result: Array<RowDataPacket>) => void) {
    var unit: QueryUnit = {
        qstr: query_str,
        cb: cb,
        bind_data: q_param,
        qid: genid++,
    };

    QUList.push(unit)
    log_mysqlInst.query(unit.qstr, mysql_cb.bind(this, unit.qid));
}

function mysql_cb(qid: number, error: QueryError, result: Array<RowDataPacket>) {
    for (var i = 0; i < QUList.length; i++) {
        var r = QUList[i];
        if (r && r.qid == qid) {
            r.cb && r.cb(r, error, result);
            QUList.slice(i, 1);
            break;
        }
    }
}

function do_query_opt(opt: string, log: if_query) {
    log.info = dailyReportInst.getReport(log.date);
    log.optlist.push(opt);
    if (log.cb) {
        log.cb(log);
    }
}

function create_char(date: number, log: if_query) {
    var nt = new Date(date);
    nt.setHours(0, 0, 0);
    var dt = new Date(date);
    dt.setHours(23, 59, 59);
    log.q_count++;

    var qstr = `select count(1) from \`tab_create\` where record_time>=\"${TeDate.DateToStr(nt)}\" and record_time<=\"${TeDate.DateToStr(dt)}\"`;
    if (log.channel) {
        qstr += ` and channel='${log.channel}'`
    }
    qstr += ';';
    mysql_query(qstr, log, function (q: QueryUnit, err, result: RowDataPacket[]) {
        var _log: if_query = q.bind_data;
        if (!err && result && result[0]) {
            var res = result[0];
            var people = res['count(1)'];
            dailyReportInst.saveReport(q.bind_data.date, {
                RU: parseInt(people)
            });
        }

        do_query_opt('create_char', _log);
    })
}

function day_active(date: number, log: if_query) {
    var nt = new Date(date);
    nt.setHours(0, 0, 0);
    var dt = new Date(date);
    dt.setHours(23, 59, 59);
    log.q_count++;
    var qstr = `select count(distinct iuin) from \`tab_login\` where record_time>=\"${TeDate.DateToStr(nt)}\" and record_time<=\"${TeDate.DateToStr(dt)}\"`;
    if (log.channel) {
        qstr += ` and channel='${log.channel}'`
    }
    qstr += ';';
    mysql_query(qstr, log, function (q: QueryUnit, err, result: RowDataPacket[]) {
        var _log: if_query = q.bind_data;
        if (!err && result && result[0]) {
            var res = result[0];
            var people = res['count(distinct iuin)'];
            dailyReportInst.saveReport(_log.date, {
                AU: parseInt(people),
                UV: parseInt(people)
            });
        }
        do_query_opt('day_active', _log);
    })
}

function recharge_all(date: number, log: if_query) {
    var nt = new Date(date);
    nt.setHours(0, 0, 0);
    var dt = new Date(date);
    dt.setHours(23, 59, 59);
    log.q_count++;
    var qstr = `select sum(recharge_amt), count(distinct iuin) from \`tab_recharge\` where record_time>=\"${TeDate.DateToStr(nt)}\" and record_time<=\"${TeDate.DateToStr(dt)}\"`;
    if (log.channel) {
        qstr += ` and channel='${log.channel}'`
    }
    qstr += ';';
    mysql_query(qstr, log, function (q: QueryUnit, err, result: RowDataPacket[]) {
        var _log: if_query = q.bind_data;
        if (_log) {
            if (!err && result && result[0]) {
                var res = result[0];
                var sum = res['sum(recharge_amt)'];
                var people = res['count(distinct iuin)'];
                dailyReportInst.saveReport(_log.date, {
                    amt: parseInt(sum),
                    PU: parseInt(people),
                });
            }
        }
        do_query_opt('recharge_all', _log);
    })
}

/**
 * 计算留存信息
 * @param from_date 登陆日期 
 * @param to_date 创角日期
 */
function liucunshuju(from_date: number, to_date: number, log: if_query) {
    var from_nt = new Date(from_date);
    from_nt.setHours(0, 0, 0);
    var from_dt = new Date(from_date);
    from_dt.setHours(23, 59, 59);

    var to_nt = new Date(to_date);
    to_nt.setHours(0, 0, 0);
    var to_dt = new Date(to_date);
    to_dt.setHours(23, 59, 59);

    log.q_count++;


    var tp: if_query = {
        date: log.date,
        optlist: [],
        q_count: 0,
        other: {
            log: log,
            other: { from_date: from_date, to_date: to_date }
        }
    }

    var qstr = `select count(distinct iuin) from \`tab_login\` where record_time>="${TeDate.DateToStr(from_nt)}" and record_time<="${TeDate.DateToStr(from_dt)}" and iuin in ( select distinct iuin from \`tab_create\` where record_time>="${TeDate.DateToStr(to_nt)}" and record_time<="${TeDate.DateToStr(to_dt)}")`;
    if (log.channel) {
        qstr += ` and channel='${log.channel}'`
    }
    qstr += ';';
    mysql_query(qstr, tp, function (q: QueryUnit, err, result: RowDataPacket[]) {
        var to_date = q.bind_data.other.other.to_date;
        var from_date = q.bind_data.other.other.from_date;
        var _log: if_query = q.bind_data.other.log;

        if (!err && result && result[0]) {
            var res = result[0];
            var people = res['count(distinct iuin)'];
            var dayDiff = TeDate.daydiff(to_date, from_date);
            var info: if_daily = {};
            switch (dayDiff) {
                case 1: info.d_1_last = parseInt(people); break;
                case 3: info.d_3_last = parseInt(people); break;
                case 7: info.d_7_last = parseInt(people); break;
            }
            dailyReportInst.saveReport(_log.date, info);
        }
        do_query_opt('liucunshuju', _log);
    })
}

interface if_daily {
    /**
     * 创角数量
     */
    RU?: number,

    /**
     * 登陆人数
     */
    UV?: number,

    /**
     * 活跃人数
     */
    AU?: number,

    /**
     * 付费人数
     */
    PU?: number,

    /**
     * 总付费数量
     */
    amt?: number,

    /**
     * 次日留存人数
     */
    d_1_last?: number,

    /**
      * 3日留存人数
      */
    d_3_last?: number,

    /**
      * 7日留存人数
      */
    d_7_last?: number,

    //----以下几个需要自己处理----//

    /**
     * 付费人均付费
     * 总付费数量/付费人均付费
     */
    arppu?: number,

    /**
     * 活跃人均付费
     * 总付费数量/活跃人数
     */
    arpu?: number,

    /**
     * 付费人数/活跃人数
     */
    pay_rate?: number,
}


interface if_query {
    cb?: (q: if_query) => void;
    info?: if_daily;
    date?: number;
    channel?: string;
    other?: any;
    optlist: string[];
    q_count: number;
}

/**
 * 记录每日数据，当日不可察，出费特权密钥
 * 每日数据记录一份，或者查询的时候生成一份，然后想办法保存一下好了
 */
class DailyReport {
    infos: TeMap<if_daily> = new TeMap<if_daily>();
    constructor() {

        try {
            var r = readFileSync('dailyreport.json');
            var info = JSON.parse((r || '{}').toString());
            this.infos._data = info;
        }
        catch (e) {

        }

    }

    saveReport(date: number, info: if_daily) {

        var s_info = this.getReport(date);
        if (!s_info) s_info = {}

        for (var key in info) {
            s_info[key] = info[key];
        }

        var key = TeDate.Date_Format(new Date(date), "yyyy-MM-dd");
        this.infos.set(key, s_info);

        writeFileSync('dailyreport.json', JSON.stringify(this.infos._data));
    }

    getReport(date: number): if_daily {
        var key = TeDate.Date_Format(new Date(date), "yyyy-MM-dd");
        if (this.infos.has(key)) {
            return this.infos.get(key);
        }
        return null;
    }

    doReport(log: if_query) {
        var base = log.date;
        var list: number[] = [1, 3, 7]
        create_char(base, log);
        day_active(base, log);
        recharge_all(base, log);

        for (var i = 0; i < list.length; i++) {
            var dd = list[i];
            var t = base + dd * 24 * 60 * 60 * 1000;
            liucunshuju(t, base, log);
        }
    }

    private _lastUpdate = Date.now();
    /**
     * 每日更新一次，启动的时候检查一次
     */
    update() {
        // 检查一下留存数据等信息
        var curr = TeDate.ToDate0(Date.now());
        if (!TeDate.Isdiffday(this._lastUpdate, curr)) return;
        var query: if_query = {
            date: curr - 24 * 60 * 60 * 1000,
            optlist: [],
            q_count: 0
        }

        this.doReport(query);

        this._lastUpdate = curr;
    }
}

export var dailyReportInst = new DailyReport();


function query_item_log(nid: string, gmid: string, uid: number, itemid: string, date: number) {
    var query: if_query = {
        other: { nid: nid, gmid: gmid, uid: uid, itemid: itemid },
        optlist: [],
        q_count: 0
    }

    var nt = new Date(date);
    nt.setHours(0, 0, 0);
    var dt = new Date(date);
    dt.setHours(23, 59, 59);
    mysql_query(`select * from \`tab_item\` where iuin="${uid}" and item_id="${itemid}" and record_time>="${TeDate.DateToStr(nt)}" and record_time<="${TeDate.DateToStr(dt)}";`, query, function (q, err, result) {
        if (!err && result) {
            netInst.sendData({
                cmd: 'log_query_ret',
                type: 'itemlog',
                gmid: q.bind_data.other.gmid,
                info: {
                    uid: q.bind_data.other.uid,
                    itemid: q.bind_data.other.itemid,
                    logs: result,
                }
            }, q.bind_data.other.nid);
        }
    });
}