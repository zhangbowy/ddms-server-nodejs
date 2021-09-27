import { EventEmitter } from 'events';
import * as Mysql from 'mysql';
import { TeMap } from './TeTool';
import { netInst } from '../NetMgr/SeNetMgr';

var outside = true;

function Handle(caller: object, func: any, ...args): any {
    return (func).bind(caller, ...args);
}

export interface TeMysqlTable {
    table: string,
    bindClass: Function, // 绑定字段要求是一个类 类成员只能有一个构造函数，不能有其他的函数了
}

interface if_sql_cost {
    start: number,
    sql: string,
    cost: number,
}

export class TeMysql extends EventEmitter {
    protected _mysqlCon: Mysql.Pool;
    protected _ready: boolean = false;
    protected _tableMgr: MeTableMgr;

    protected _db_cost: if_sql_cost[] = [];

    private _update_cost_id: NodeJS.Timer = null;

    get conn() {
        return this._mysqlCon;
    }

    get ready() {
        return this._ready;
    }



    /**
     * 
     * @param tables mysql中表格的名字
     */
    constructor() {
        super();

        this._update_cost_id = setInterval(this._update_cost_.bind(this), 10000) as any;
    }

    destory() {
        clearInterval(this._update_cost_id);
        this._update_cost_id = null;

        this._mysqlCon.end();
    }


    private _update_cost_() {
        // 统计了开销，但是开销原则上不要存储太久，需要一个及时清理的机制
        if (this._db_cost.length == 0) return;

        // 这里判断一下耗时，如果可以接受的话就不上报了

        for (let i = 0; i < this._db_cost.length; i++) {
            let r = this._db_cost[i];
            if (r.cost > 200) {
                console.log('cost too much time', r.sql, r.cost, r.start);
            }
        }

        this._db_cost = [];
    }

    /**
     * 
     * @param table // 表名字
     * @param bindClass // 绑定字段要求是一个类 类成员只能有一个构造函数，不能有其他的函数了 
     */
    public registTable(table: string, bindClass: Function) {
        this._tables.push({
            table: table,
            bindClass: bindClass
        });
    }

    public registFunc(name: string, ver: string, func_args: string, func_proc: string) {
        var createSql = 'CREATE PROCEDURE `' + name + '`' + func_args + ' COMMENT "' + ver + '"\n' + func_proc;
        this._tables_func.set(name, { sql: createSql, comm: ver, dbcomm: '' });
    }

    private _database_name: string;

    public connect(fconfig: Mysql.ConnectionOptions = {}) {
        this._ready = false;
        var config: Mysql.ConnectionOptions = {
            user: 'root',
            password: '123456',
            database: '',
            charset: 'UTF8_GENERAL_CI',
            host: '115.236.52.67',
            port: 13306,
            localAddress: '127.0.0.1',
            connectTimeout: 10 * 1000,
            debug: false,
            trace: true,    // 语句错误的时候 异常
            //  socketPath?: string;
            timezone: 'local',

            stringifyObjects: false,
            insecureAuth: false,
            // queryFormat: (query: string, values: any) =>void,
            supportBigNumbers: true,
            bigNumberStrings: true,
            dateStrings: false,
            multipleStatements: false,

            //  flags?: Array<string>;
            // ssl?: string | SslOptions;
        }

        for (var key in fconfig) {
            config[key] = fconfig[key];
        }

        var _database_config: Mysql.PoolOptions = config;
        _database_config.connectTimeout = 2 * 60 * 1000;
        _database_config.connectionLimit = 10;   // 最多10个连接线程
        _database_config.acquireTimeout = 10 * 60 * 1000;
        this._mysqlCon = Mysql.createPool(_database_config);
        this._onConnect();

        this._tableMgr = new MeTableMgr(this);
        this._database_name = _database_config.database;
    }

    private _onConnect() {
        this._mysqlCon.getConnection(Handle(this, (err: Mysql.QueryError) => {
            if (err) {
                if (err.code == 'ER_BAD_DB_ERROR') {
                    this._mysqlCon.config['connectionConfig']['database'] = '';
                }
                else {
                    sqlError(err, 'conn mysql error');
                }
                setTimeout(this._onConnect.bind(this), 1000);
            }
            else {
                if (this._database_name && this._mysqlCon.config['connectionConfig']['database'] == '') {
                    // 表示 databse 还没有设置
                    this._mysqlCon.query('create database if not exists ' + this._database_name, (err, ret) => {
                        if (err) sqlError(err, 'create database');
                        this._mysqlCon.config['connectionConfig']['database'] = this._database_name;
                        this._onConnect();
                    })
                }
                else {
                    this._registTable();
                }
            }
        }));
    }

    private _tables: Array<TeMysqlTable> = [];
    private _tables_func: TeMap<{ sql: string, comm: string, dbcomm: string }> = new TeMap<{ sql: string, comm: string, dbcomm: string }>();
    private _table2Class: any = {};

    private _tableCount = 0;
    private _registTable() {
        if (this._tables.length == 0) {
            this._load_func_();
        }
        else {
            for (var i = 0; i < this._tables.length; i++) {
                var cTable = this._tables[i];
                this._table2Class[cTable.table] = cTable.bindClass;
                this._tableMgr.loadTable(cTable.table, cTable.bindClass, Handle(this, (bSucc) => {
                    this._tableCount++;
                    if (this._tableCount == this._tables.length) {
                        this._load_func_();
                    }
                }));
            }
        }
    }

    private _load_func_() {
        this.query('show procedure status', (err, res) => {
            if (err) sqlError(err, '_load_func_');
            res = res || [];
            for (var i = 0; i < res.length; i++) {
                var db = res[i]['Db'] || '';
                if (db != this._database_name) continue;
                var name = res[i]['Name'] || '';
                var comm = res[i]['Comment'] || '';
                if (!name) continue;
                var rr = this._tables_func.get(name);
                if (!rr) continue;
                rr.dbcomm = comm;
            }

            this._check_func();
        })
    }

    private _func_count = 0;
    private _check_func() {
        for (var i = 0; i < this._tables_func.keys.length; i++) {
            var func_name = this._tables_func.keys[i];
            var rr = this._tables_func.get(func_name);
            if (rr.comm == rr.dbcomm || outside) {
                this._func_count++;
                this._check_ready_();
                continue;
            }
            this.query("DROP PROCEDURE IF EXISTS `" + func_name + "`", ((_func_name, err, res) => {
                this.query(rr.sql, this._create_finish.bind(this, _func_name));
            }).bind(this, func_name));
        }

        this._check_ready_();
    }

    private _create_finish(func_name, err, res) {
        if (err) sqlError(err, '_check_func');
        this._func_count++;
        this._check_ready_();
        var rr = this._tables_func.get(func_name);
        if (rr) {
            rr.dbcomm = rr.comm;
        }
    }

    private _check_ready_() {
        if (this._func_count == this._tables_func.keys.length && !this._ready) {
            this._ready = true;
            this.emit('ready');
        }
    }
    /**
     * 
     * @param table 表格名称
     * @param key 主键的值
     * @param bindClass 数据结构对应的类 
     */
    public getMeHash<T>(table: string, key: Array<{ type: string, value: string }>) {
        if (!this._ready) {
            return null;
        }

        return new MeHash<T>(this, table, key, this._table2Class[table]);
    }

    public getTableInfo(table: string) {
        return this._tableMgr.getTableInfo(table) || [];
    }

    public getTableFieldTypes(table: string) {
        return this._tableMgr.getTableFieldTypes(table);
    }

    public instrtData<T>(table: string, infos: T) {
        if (!this.ready) return;
        var _fields = this.getTableInfo(table);
        if (!_fields || _fields.length == 0) return;
        var keys = '';
        var values = '';
        var bList = (infos instanceof Array);
        for (var i = 0; i < _fields.length; i++) {
            var key = _fields[i];
            var v;
            if (bList) {
                v = infos[i];
            }
            else {
                v = infos[key];
            }
            if (v == 'undefined' || v == undefined || v == null || v == 'null') continue;
            if (keys.length != 0) { keys += ','; values += ','; }
            keys += '`' + key + '`';
            values += changeValue(v);

        }

        if (values.length == 0) return;

        var sql = 'REPLACE into ' + table + '(' + keys + ') values(' + values + ');';
        this._mysqlCon.query(sql, Handle(this, (error: Mysql.QueryError) => {
            error && sqlError(error, sql);
        }));
    }

    public call_func(name: string, arrs: any[]) {
        var sql = `call ${name}(${arrs.join(',')})`;
        this.query(sql, (err, res) => {
            err && sqlError(err, sql);
        })
    }

    public query(sql: string, cb: (error: Mysql.QueryError, result: Array<Mysql.RowDataPacket>) => void) {
        let st = Date.now();
        if (sql.indexOf("delete") == 0) console.log(sql);
        this._mysqlCon.query(Mysql.format(sql), this._qeury_back.bind(this, cb, st, sql));
    }

    private _qeury_back(cb: (error: Mysql.QueryError, result: Array<Mysql.RowDataPacket>) => void, startTime: number, sql: string, error, result) {
        let ed = Date.now();
        // 统计一下开销
        this._db_cost.push({ sql: sql, cost: ed - startTime, start: startTime });
        if (cb) cb(error, result);
    }
}

class MeTableInfo {
    tableName: string;
    _tableDesc: Array<RowPacket>;  // 表单的结构信息
    _fields: Array<string>;
    _filed2Type: Object = {};
    bindClass: any;

    bInit: Boolean = false; // 表单的结构初始化
    loadedCbs: Array<Function> = [];

    leftKeys: Array<{ name: string, type: string }> = [];

    constructor(table: string, bindClass: any) {
        this.tableName = table;
        this.bindClass = bindClass;
    }

    get tableDesc() {
        return this._tableDesc;
    }

    public callLoaded(bsucc: boolean, err_code?: string) {
        for (var i = 0; i < this.loadedCbs.length; i++) {
            this.loadedCbs[i](bsucc, err_code);
        }

        this.loadedCbs = [];
    }

    public setTableDesc(t: Array<RowPacket>) {
        this._tableDesc = t;

        this._fields = [];
        for (var i = 0; i < this._tableDesc.length; i++) {
            this._fields.push(this._tableDesc[i].name);
        }

        // 这里需要比较一下 结构是否有变化，如果 bindClass中有新的字段，那么需要插入字段
        var m = new this.bindClass('1');
        var bFirst = true;
        for (var key in m) {
            if (this._fields.indexOf(key) < 0) {
                this.leftKeys.push({ name: key, type: this._jsType2SqlType(key, m[key], bFirst) });
                // this._fields.push(key);
            }
            bFirst = false;
            this._filed2Type[key] = this._jsType(m[key]);
        }

        var outS = '';
        if (this.leftKeys.length > 0) {
            // 找出新增的字段
            outS = this.createModfiy();
        }

        // if (this._fields.length == 0) {
        this._fields = Object.keys(m);
        // }

        return outS;
    }

    private _jsType(value) {
        var v = typeof value;
        var out = '';
        switch (v) {
            case 'string':
                out = 'string';
                break;
            case 'number':
                out = 'number';
                break;
            case 'object':
                out = 'text';
                // out = 'json';
                break;
            case 'boolean':
                out = 'boolean';
                break;
            default:
        }

        return out;
    }

    private _jsType2SqlType(key: string, value, primary: boolean = false) {
        var v = typeof value;
        //  console.log(v);
        var kS = '';
        for (var i = key.length - 1; i > 0; i--) {
            var c = key.charAt(i);
            if (c >= '0' && c <= '9') {
                kS = c + kS;
            }
            else {
                break;
            }
        }
        var out = '';
        switch (v) {
            case 'string':
                var len = Math.max((parseInt(kS) || 32), 32);
                out = 'VARCHAR(' + len + ')';
                break;
            case 'number':
                var len = Math.max((parseInt(kS) || 20), 20);
                out = 'bigint(' + len + ')' + (primary ? ' AUTO_INCREMENT' : '');
                break;
            case 'object':
                out = 'text';
                // out = 'json';
                break;
            case 'boolean':
                out = 'BOOLEAN';
                break;
            default:
        }

        return out;
    }

    createModfiy() {

        /**
        CREATE TABLE `test`.`New Table` (
        `1sda` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
        PRIMARY KEY (`1sda`)
        )
        ENGINE = InnoDB;
         */
        var sql = '';
        var bCreate = this._fields.length == 0;
        if (bCreate) {
            sql = 'CREATE TABLE `' + this.tableName + '` (';
        }
        else {
            sql = 'ALTER TABLE `' + this.tableName + '` ';// ' ADD COLUMN `bug` VARCHAR(45) NOT NULL AFTER `value`; '
        }

        for (var i = 0; i < this.leftKeys.length; i++) {
            var r = this.leftKeys[i];
            if (bCreate) {
                sql += '`' + r.name + '` ' + r.type + ',';
            }
            else {
                if (i) sql += ',';
                sql += ' ADD COLUMN `' + r.name + '` ' + r.type;
            }
        }

        if (bCreate) {
            sql += '  PRIMARY KEY (`' + this.leftKeys[0].name + '`))DEFAULT charset=utf8 ENGINE = InnoDB;'
        }
        else {
            sql += ';'
        }

        return sql;
    }

    get bIninting() {
        return this.loadedCbs.length != 0;
    }

    get fields() {
        return this._fields;
    }

    get Types() {
        return this._filed2Type;
    }

    get(index: number) {
        if (this._tableDesc.length > index) {
            return this._tableDesc[index].name;
        }

        return 'null';
    }

}

class RowPacket {
    private Field: string;  // 字段名字
    private Type: string;//字段类型 //'int(10) unsigned',
    private Null: string;//'NO',
    private Key: string;//键的类型 'PRI',
    private Default: any;//null,//默认值
    private Extra: string;//额外信息 'auto_increment'
    constructor(t: Mysql.RowDataPacket) {
        for (var key in t) {
            this[key] = t[key];
        }
    }

    get isPRI() {
        return this.Key == 'PRI';
    }

    get name() {
        return this.Field;
    }
}

class MeTableMgr {
    tableLib: Object = {};
    protected _mysqlCon: Mysql.Pool;

    constructor(link: TeMysql) {
        this._mysqlCon = link.conn;
    }

    loadTable(table: string, bindClass: any, loaded: Function) {
        var tableInfo: MeTableInfo;
        if (this.tableLib.hasOwnProperty(table)) {
            tableInfo = this.tableLib[table];
        }
        else {
            tableInfo = new MeTableInfo(table, bindClass);
            this.tableLib[table] = tableInfo;
        }

        if (tableInfo.bInit) {
            // 如果表格存在，那么立即回掉
            loaded();
        }
        else {
            if (!tableInfo.bIninting) {
                this._mysqlCon.query('desc `' + table + '`;', Handle(this, this._loadTableCB, table));
            }
            tableInfo.loadedCbs.push(loaded);
        }
    }

    private _loadTableCB(table, error: Mysql.QueryError, result: Array<Mysql.RowDataPacket>, fiels) {
        var tableInfo: MeTableInfo = this.tableLib[table];
        if (error && error.code != "ER_NO_SUCH_TABLE") {
            return tableInfo.callLoaded(false, error.code);
        }
        var newT: Array<RowPacket> = [];
        if (result) {
            for (var i = 0; i < result.length; i++) {
                newT.push(new RowPacket(result[i]));
            }
        }

        var cSql = tableInfo.setTableDesc(newT);
        if (cSql.length > 0 && !outside) {
            this._mysqlCon.query(cSql, Handle(this, this._tableChangeCB, table))
        }
        else {
            tableInfo.bInit = true;
            tableInfo.callLoaded(true);
        }
    }

    private _tableChangeCB(table, error: Mysql.QueryError, result: Mysql.OkPacket, fiels) {
        var tableInfo: MeTableInfo = this.tableLib[table];
        if (!error) {
            tableInfo.bInit = true;
            tableInfo.callLoaded(true);
        }
        else {
            tableInfo.callLoaded(false);
        }
    }

    public isTableOK(table: string) {
        var tableInfo: MeTableInfo;
        if (this.tableLib.hasOwnProperty(table)) {
            tableInfo = this.tableLib[table];
        }

        return tableInfo && tableInfo.bInit;
    }

    public getTableInfo(table: string) {
        var tableInfo: MeTableInfo;
        if (this.tableLib.hasOwnProperty(table)) {
            tableInfo = this.tableLib[table];
        }

        if (tableInfo && tableInfo.bInit) {

            return tableInfo.fields;
        }

        return null;
    }

    public getTableFieldTypes(table: string) {
        var tableInfo: MeTableInfo;
        if (this.tableLib.hasOwnProperty(table)) {
            tableInfo = this.tableLib[table];
        }

        if (tableInfo && tableInfo.bInit) {

            return tableInfo._filed2Type;
        }

        return {};
    }
}


class HashMap<T>{
    _data = {};

    constructor() {

    }

    get(key: string) {
        return <Array<T>>this._data[key]
    }

    add(key: string, v: T) {
        if (!this._data[key]) {
            this._data[key] = [];
        }

        this._data[key].push(v);
    }

    set(key: string, v: Array<T>) {
        this._data[key] = v;
    }

    clear() {
        this._data = {};
    }
}

class MeBase<T> {
    protected _fields: Array<string>;
    protected _fieldTypes: Object;
    protected _mysqlCon: Mysql.Pool;
    protected _keys: Array<{ type: string, value: string }>;
    protected _table: string;
    protected _value: Array<T>;
    protected _TeMysql: TeMysql;

    protected _changes: Array<Array<string>> = [[]];

    bArray = false;



    get fieldsStr() {
        var out = '';
        for (var i = 0; i < this._fields.length; i++) {
            if (i) out += ',';
            out += '`' + this._fields[i] + '`';
        }
        return out;
    }

    get keyStr() {
        var queryStr = '';
        for (var i = 0; i < this._keys.length; i++) {
            var one = this._keys[i];
            i && (queryStr += ' and ');
            if (one.type == 'kID') {
                queryStr += '`' + one.type + '`="' + one.value + '"';
            }
            else {
                queryStr += '`' + one.type + '`=' + one.value + '';
            }
        }

        return queryStr;
    }

    get keys() {
        return this._fields;
    }

    getType(key: string): 'json' | 'text' | 'string' | 'boolean' | 'number' {
        return this._fieldTypes[key];
    }

    constructor(mysqlClint: TeMysql, table: string, keys: Array<{ type: string, value: string }>) {
        this._fields = mysqlClint.getTableInfo(table) || [];
        this._fieldTypes = mysqlClint.getTableFieldTypes(table);
        this._mysqlCon = mysqlClint.conn;
        //   this._key = JSON.stringify(key);
        this._keys = keys;
        this._table = table;
        this._TeMysql = mysqlClint;
    }
}

// 哈希表，绑定的是数据库的不同表格，key就是主键
export class MeHash<T> extends MeBase<T> {
    constructor(mysqlClint: TeMysql, table: string, l_key: Array<{ type: string, value: string }>, bindClass: any) {
        super(mysqlClint, table, l_key);
        var usekeys = [];
        var o = new bindClass();
        for (var i = 0; i < l_key.length; i++) {
            o[l_key[i].type] = (l_key[i].value);
        }

        var keys = Object.keys(o);
        for (var ikey = 0; ikey < keys.length; ikey++) {
            var v_k = keys[ikey];
            Object.defineProperty(this.value, v_k, {
                get: (function (v_v, d_v) {
                    return this.get(v_v) || d_v;
                }).bind(this, v_k, o[v_k]),
                set: (function (v_v, v) {
                    this.save(v_v, v);
                }).bind(this, v_k),
                enumerable: true,
                configurable: true
            });
        }
        this._value = [<T>o];
    }

    get PriKey() {
        return this._fields[0];
    }

    load(loaded: (succ: boolean) => void) {
        var queryStr = 'select ' + this.fieldsStr + 'from `' + this._table + '` ' + 'where ' + this.keyStr;
        this._mysqlCon.query(queryStr, Handle(this, this._onLoad, loaded));
    }

    protected _onAutoSave(index: number = 0) {
        var bfirst = true;
        var sqlStr = 'update `' + this._table + '` set ';
        for (var i = 0; i < this._changes[index].length; i++) {
            var key = this._changes[index][i];
            if (this._fields.indexOf(key) < 0) continue;
            if (!bfirst) sqlStr += ',';
            bfirst = false;
            sqlStr += "`" + key + '`=' + changeValue(this._value[index][key]);
        }
        sqlStr += ' where ' + this.keyStr + ';';
        this._changes = [];
        this._mysqlCon.query(sqlStr, Handle(this, this._autosaveret, sqlStr));
    }

    private _autosaveret(sql, error, t: Mysql.OkPacket, f) {
        error && sqlError(error, sql);
        try {
            if (t.affectedRows == 0 && t.changedRows == 0 && !t.insertId) {
                this.insertData(Handle(this, this._autosaveret, "insert"));
            }
        }
        catch (e) {

        }
    }

    protected _onSaved(loaded: (succ: boolean) => void, error: Mysql.QueryError) {
        // console.log(error);
        loaded && loaded(error ? false : true);
    }

    private _onLoad(loaded: (succ: boolean) => void, error: Mysql.QueryError, result: Array<Mysql.RowDataPacket>) {
        if (error) {
            loaded(false);
        }
        else {
            if (!result || !result[0]) {
                if (!this.bArray) this.insertData(Handle(this, this._onSaved, loaded));
                else loaded(true);
            }
            else {
                for (var i = 0; i < result.length; i++) {
                    var res = result[i];
                    for (var key in res) {
                        try {
                            //       this._value[key] = JSON.parse(res[key].toString());
                            this._value[i][key] = res[key];
                        }
                        catch (e) {
                            this._value[i][key] = res[key];
                        }
                    }
                }

                loaded(true);
            }
        }

    }

    public insertData(cb: Function, index: number = 0) {
        var keys = '';
        var values = '';

        for (var i = 0; i < this._keys.length; i++) {
            var rOne = this._keys[i];
            this._value[index][rOne.type] = rOne.value;
        }

        for (var i = 0; i < this._fields.length; i++) {
            var key = this._fields[i];
            if (i) { keys += ','; values += ','; }
            keys += '`' + key + '`';
            values += changeValue(this._value[index][key]);
        }

        var sql = 'REPLACE into ' + this._table + '(' + keys + ') values(' + values + ');';
        //  console.log(sql);
        this._mysqlCon.query(sql, cb);
    }

    save(key: string, value: any, index: number = 0) {
        // 先检查一下字段是否存在，不存在的话返回失败
        if (this._fields.indexOf(key) < 0) {
            return false;
        }
        if (this._value[index][key] == value) return true;
        this._value[index][key] = value;
        if (!this._changes[index]) this._changes[index] = [];
        if (this._changes[index].length == 0) {
            // 有变更的话一秒后启动保存，目的是减少保存次数
            setTimeout(Handle(this, this._onAutoSave, index), 1000);
        }

        if (this._changes[index].indexOf(key) < 0) {
            this._changes[index].push(key);
        }

        return true;
    }

    get(key: string, index: number = 0) {
        if (this._fields.indexOf(key) < 0 || !this._value[index]) {
            return null;
        }
        var out;
        var v = this._value[index][key];

        switch (this.getType(key)) {
            case 'number': out = parseInt(v.toString()); break;
            case 'string': out = v.toString(); break;
            case 'text':
            case 'json':
                try {
                    if (typeof v == 'string') {
                        out = JSON.parse(v.toString());
                    }
                    else {
                        out = v;
                    }
                }
                catch (e) {
                    out = v;
                }
                break;
            case 'boolean': out = (v ? true : false); break;
            default: out = v; break;
        }



        return out;
    }

    update(v: T, index = 0) {
        for (var key in v) {
            if (v[key] != this.get(key, index)) {
                this.save(key, v[key], index);
            }
        }
    }

    /**
     * 列表模式下
     * @param n 
     */
    index(n: number) {
        if (!this.bArray) return null;
        return this._value[n];
    }

    push(v: T) {
        if (!this.bArray) return;
        this._value.push(v);
        this._changes.push([]);
        this._TeMysql.instrtData(this._table, v);
    }

    findeUpdate(v: T) {
        for (var i = 0; i < this._value.length; i++) {
            var one = this._value[i];
            if (one[this.PriKey] == v[this.PriKey]) {
                this._value[i] = v;
                this.update(v, i);
                return;
            }
        }

        this.push(v);
    }

    splice(index: number, delCount: number, insertV?: T) {
        if (!this.bArray) return;
        var v = this._value[index];
        if (delCount > 0) {
            var kIDs = [];
            for (var i = 0; i < delCount; i++) {
                var v = this.index(i + index);
                v && (v[this.PriKey] != undefined) && kIDs.push(v[this.PriKey]);
            }
            var sql = 'delete from `' + this._table + '` where `' + this.PriKey + '` in(' + kIDs.join(',') + ');';
            this._mysqlCon.query(sql, (err, result) => {
                err && sqlError(err, sql);
            })
        }

        this._value.splice(index, delCount, insertV);
        if (insertV) {
            this._changes.splice(index, delCount, []);
        }
        else {
            this._changes.splice(index, delCount);
        }

        if (insertV) {
            this._TeMysql.instrtData(this._table, v);
        }
    }

    del(kIDs: Array<string>) {
        var idsText = kIDs.join(',');
        if (idsText.length > 0) {
            var sql = 'delete from `' + this._table + '` where `' + this.PriKey + '` in(' + idsText + ');';
            this._mysqlCon.query(sql, (err, result) => {
                err && sqlError(err, sql);
            })
        }

    }

    get length() {
        return this._value.length;
    }

    value = <T>{};
}

function changeValue(aaV: any) {
    var t = typeof aaV;
    switch (t) {
        case 'number': break;
        case 'string': aaV = "'" + aaV.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'"; break;
        case 'boolean': break;
        case 'object': aaV = "'" + JSON.stringify(aaV).replace(/'/g, "\\'") + "'"; break;
    }

    return aaV;
}

function report_to_gm(type, infos) {
    var cmd = {
        cmd: 'up_match_info',
        type: type,
        infos: infos
    };
    netInst.sendData2Type(cmd, 'ls');
}

function sqlError(err, sql) {
    // if (err.code == "ER_DUP_ENTRY") {

    // }
    console.error(err, sql);
    report_to_gm('sql_error', { err: err, sql: sql });
}

// export var mysqlInst = new TeMysql();