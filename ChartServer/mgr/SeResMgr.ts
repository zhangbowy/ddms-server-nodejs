var respath = './Res/';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { Map } from "../lib/TeTool";
import { SeResChartTable } from '../Res/interface';
import { configInst } from "../lib/TeConfig";

var openGlobal = configInst.get('openGlobal');
// 判断文件是否指定的类型
function is_filetype(filename, types) {
    types = types.split(',');
    var pattern = '\.(';
    for (var i = 0; i < types.length; i++) {
        if (0 != i) {
            pattern += '|';
        }
        pattern += types[i].trim();
    }
    pattern += ')$';
    return new RegExp(pattern, 'i').test(filename);
}

// 删除文件的指定后缀
function del_filetype(filename, types) {
    types = types.split(',');
    var pattern = '\.(';
    for (var i = 0; i < types.length; i++) {
        if (0 != i) {
            pattern += '|';
        }
        pattern += types[i].trim();
    }
    pattern += ')$';

    return filename.replace(new RegExp(pattern, 'i'), '');
}


class PltFileList {
    private _file_list: string[] = []

    constructor() {
        try {
            var read_data = fs.readFileSync(path.join(respath, '_flielist_.json'));
            var js_data = JSON.parse(read_data.toString());
            this._file_list = js_data['_files_'] || [];
        }
        catch (e) {

        }
    }

    get_plt_file(filename: string, plt: string) {
        var index1 = filename.indexOf('.');
        var pltName = filename.slice(0, index1) + '_' + plt + '.json';
        if (this._file_list.length > 0 && this._file_list.indexOf(pltName) >= 0) {
            return pltName;
        }

        return filename;
    }
}

var pltFileListInst = new PltFileList();

export class SeResModule<T>{
    public resData: { [key: string]: T } = {};
    public length: number = 0;
    private _loaded: Function;
    public md5: string = '';

    constructor(jsonname: string, plt: string = 'sdw', caller?: Object, loaded?: Function, ...args) {
        if (caller) {
            if (typeof caller == 'function') {
                this._loaded = caller;
            }
            else if (loaded) {
                this._loaded = loaded.bind(caller, ...args);
            }
        }

        var pltName = pltFileListInst.get_plt_file(jsonname, plt);
        if (fs.existsSync(path.join(respath, pltName))) {
            // 如果存在对应版本的表格，那么就使用那个表格
            jsonname = pltName;
        }

        // 处理的时候分为文件夹和文件两个模式
        if (is_filetype(jsonname, '.json')) {
            // 文件模式下面，正常加载数据
            var fileName = path.join(respath, jsonname);
            this._loadFile(fileName);
            fs.watchFile(fileName, this._onFileChange.bind(this, fileName));
        }
        else {
            console.error("dir is not support!");
        }
        // else {
        //     // 文件夹模式下面，加载的数据放到统一的一个目录下面，获取数据接口使用一个
        //     var pathdir = respath + jsonname;
        //     var Files = fs.readdirSync(pathdir);
        //     for (var num = 0; num < Files.length; num++) {
        //         var file = pathdir + Files[num];
        //         var stat = fs.lstatSync(file);
        //         if (is_filetype(file, '.json')) {
        //             var fileInfo = fs.readFileSync(file).toString();
        //             var allData = JSON.parse(fileInfo);
        //             var name = 'k' + del_filetype(Files[num], 'json');
        //             if (!this.resData) {
        //                 this.resData = {};
        //             }

        //             this.resData[name] = [];
        //             for (var key in allData) {
        //                 if (allData.hasOwnProperty(key) && key != 'Template') {
        //                     this.resData[name][key] = allData[key];
        //                 }
        //             }
        //         }
        //     }

        //     this.length = this._getJsonObjLength(this.resData);
        // }

        this._call_loaded();
    }

    private _getJsonObjLength(jsonObj) {
        var Length = 0;
        for (var item in jsonObj) {
            Length++;
        }
        return Length;
    }

    private _loadFile(jsonname) {
        this.resData = {};
        var fileInfo = fs.readFileSync(jsonname).toString();

        this.md5 = createHash('md5').update(fileInfo).digest('hex');

        var allData = JSON.parse(fileInfo);
        for (var key in allData) {
            if (allData.hasOwnProperty(key) && key != 'Template') {
                this.resData['k' + key] = allData[key];
            }
        }

        this.length = this._getJsonObjLength(this.resData);
    }

    private _onFileChange(jsonname: string, curr: fs.Stats, prev: fs.Stats) {
        if (prev.ctime.getTime() == 0) {
            //console.log('文件被创建!');
            this._loadFile(jsonname);
            this._call_loaded();
        } else if (curr.ctime.getTime() == 0) {
            // console.log('文件被删除!')
            this.resData = {};
            this.length = 0;
            this._call_loaded();
        } else if (curr.mtime.getTime() != prev.mtime.getTime()) {
            // console.log('文件有修改');
            this._loadFile(jsonname);
            this._call_loaded();
        }
    }

    private _call_loaded() {
        this._init_data_();
        if (this._loaded) {
            setTimeout(this._loaded, 1);
        }
    }

    public getAllRes() {
        return this.resData;
    };

    public getRes(id: string): T {
        if (!this.resData.hasOwnProperty(id)) id = 'k' + id;
        if (this.resData.hasOwnProperty(id)) {
            return this.resData[id];
        }
        return null;
    };

    public getRandom() {
        var randIndex = Math.floor(Math.random() * this.length);
        for (var key in this.resData) {
            randIndex--;
            if (randIndex <= 0) {
                return this.resData[key];
            }
        }

        return null;
    }

    public keys() {
        return Object.keys(this.resData);
    }

    protected _init_data_() { };
}

export class Tab_Chart_Res extends SeResModule<SeResChartTableEx> {
    constructor(jsonname: string, plt: string = 'sdw', caller?: Object, loaded?: Function, ...args) {
        super(jsonname, plt, caller, loaded);

        // this._init_chart_table();
    }


    private _parse_chart_table_award(akAward: string[]) {
        if (!akAward || !(akAward instanceof Array)) return [];
        var out: ifChartAward[] = [];
        for (var i = 0; i < akAward.length; i++) {
            var rs = akAward[i];
            if (!rs) continue;
            var alist = rs.split(',');
            out.push({
                st_rank: parseInt(alist[0]) || 0,
                ed_rank: parseInt(alist[1]) || 0,
                itemid: alist[2] || '',
                num: parseInt(alist[3]) || 0,
            })
        }

        return out;
    }

    protected _init_data_() {
    }

    public findChartByType(type: number) {
        for (var key in this.resData) {
            var r = this.resData[key];
            if (r && r.eType == type) {
                return r;
            }
        }

        return null;
    }

}


export interface ifChartAward {
    st_rank: number,
    ed_rank: number,
    itemid: string,
    num: number
}

export interface ifChartAwardTime {
    day_of_week: number,
    hour: number,
    min: number
}

export interface SeResChartTableEx extends SeResChartTable {
    kParsedTime: ifChartAwardTime
}

class SeResMgr {
    private _ready: boolean = false;

    private _map_tables_: Map<SeResModule<any>> = new Map<SeResModule<any>>();

    // public ChartTableRes: SeResModule<SeResChartTableEx>;

    static _res_module_: Map<any> = new Map<any>();
    static regist_res_module(table: string, fun) {
        this._res_module_.set(table, fun);
    }

    static get_res_module(table: string) {
        if (this._res_module_.has(table)) {
            return this._res_module_.get(table);
        }

        return SeResModule;
    }

    public constructor() {
        this._ready = true;
        // ac表格有子事件需要解析的，这里提前处理掉
    }

    registPlt(plt: string) {
        var tables = ['ChartTable.json', 'season.json', 'Area.json', 'CompetitionReward.json', 'ScoreCompetiton.json', 'ConfigMaps.json', 'ConfigMaps.json', 'Unit.json', 'JJCReward.json'];
        var globalPlt;
        if(openGlobal){
            globalPlt = this.globalPltByPlt(plt);
        }
        for (var i = 0; i < tables.length; i++) {
            var table_name = tables[i];
            var module = SeResMgr.get_res_module(tables[i]);

            if (this._map_tables_.has(table_name + plt)) continue;
            this._map_tables_.set(table_name + plt, new module(table_name, plt));
            
            //跨服榜单
            if(globalPlt){
                if (this._map_tables_.has(table_name + globalPlt)) continue;
                this._map_tables_.set(table_name + globalPlt, new module(table_name, globalPlt));
            }
        }
    }

    get_target<T>(table: string, plt: string) {
        return this._map_tables_.get(table + plt) as SeResModule<T>;
    }

    private globalPltByPlt(plt): string{
        // if (plt == 'sdw' || plt == 'qzone') return null;
        return 'global';
        if(configInst.get("global")){
            let globals = configInst.get("global");
            for(var key in globals){
                let global = globals[key];
                if(global.split("+").indexOf(plt) != -1){
                    return key;
                }
            }
            
            if(!globals[plt]){
                return 'global2';
            }
        }
        else{
            return null;
        }
    }
}

SeResMgr.regist_res_module('ChartTable.json', Tab_Chart_Res);


export var resMgrInst = new SeResMgr();

