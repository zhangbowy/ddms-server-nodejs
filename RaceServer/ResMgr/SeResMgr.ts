// import * as TableRes from "../Res/interface";
var respath = './Res/';
import * as fs from 'fs';
import * as path from 'path';
import { createHash, Hash } from 'crypto';
import { HashMap } from '../lib/TeTool';

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



class SeResModule<T>{
    public resData: any = {};
    public length: number = 0;
    private _loaded: Function;
    public md5: string = '';

    constructor(jsonname: string, caller?: Object, loaded?: Function) {
        if (caller) {
            if (typeof caller == 'function') {
                this._loaded = caller;
            }
            else if (loaded) {
                this._loaded = loaded.bind(caller);
            }
        }


        // 处理的时候分为文件夹和文件两个模式
        if (is_filetype(jsonname, '.json')) {
            // 文件模式下面，正常加载数据
            var fileName = path.join(respath, jsonname);
            this._loadFile(fileName);
            fs.watchFile(fileName, this._onFileChange.bind(this, fileName));
        }
        else {
            // 文件夹模式下面，加载的数据放到统一的一个目录下面，获取数据接口使用一个
            var pathdir = respath + jsonname;
            var Files = fs.readdirSync(pathdir);
            for (var num = 0; num < Files.length; num++) {
                var file = pathdir + Files[num];
                var stat = fs.lstatSync(file);
                if (is_filetype(file, '.json')) {
                    var fileInfo = fs.readFileSync(file).toString();
                    var allData = JSON.parse(fileInfo);
                    var name = 'k' + del_filetype(Files[num], 'json');
                    if (!this.resData) {
                        this.resData = {};
                    }

                    this.resData[name] = [];
                    for (var key in allData) {
                        if (allData.hasOwnProperty(key) && key != 'Template') {
                            this.resData[name][key] = allData[key];
                        }
                    }
                }
            }

            this.length = this._getJsonObjLength(this.resData);
        }

        if (this._loaded) {
            setTimeout(this._loaded, 1);
        }
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
        } else if (curr.ctime.getTime() == 0) {
            // console.log('文件被删除!')
            this.resData = {};
            this.length = 0;
        } else if (curr.mtime.getTime() != prev.mtime.getTime()) {
            // console.log('文件有修改');
            this._loadFile(jsonname);
            if (this._loaded) {
                setTimeout(this._loaded, 1);
            }
        }
    }

    public getAllRes() {
        return this.resData;
    };

    public getRes(id): T {
        id = 'k' + id;
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
}

class SeResMgr {
    private _ready: boolean = false;

    public constructor() {

    }

    public init() {
        this._ready = true;
    }

    public saveFiles(fileInfos: Array<{ name: string, md5: string, info: string }>) {
        for (var i = 0; i < fileInfos.length; i++) {
            var rkInfo = fileInfos[i];
            var md5 = createHash('md5');
            if (md5.update(rkInfo.info).digest('hex') != rkInfo.md5) continue;

            fs.writeFileSync(path.join(respath, rkInfo.name + '.json'), rkInfo.info);
        }
    }

    /**
     * 限定几个文件是需要同步的
     */
    getFilesMd5(): Array<{ name: string, info: string, md5: string }> {
        var out = [];
        // out.push({
        //     name: 'SuperMarket',
        //     md5: this.SuperMarketRes.md5
        // });

        // out.push({
        //     name: 'recharge',
        //     md5: this.RechargeRes.md5
        // });

        return out;
    }
}


export var resMgrInst = new SeResMgr();