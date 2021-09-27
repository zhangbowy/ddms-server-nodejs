"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeResModule = void 0;
const fs = require("fs");
const path = require("path");
const crypto_1 = require("crypto");
const TeTool_1 = require("./TeTool");
class PltFileList {
    constructor() {
        this._file_list = [];
        this.readFileList();
        this.readGameServerInfo();
    }
    static get_plt_file(filename, plt) {
        if (!this._inst) {
            this._inst = new PltFileList();
        }
        return this._inst.get_plt_file(filename, plt);
    }
    readFileList() {
        try {
            var read_data = fs.readFileSync(path.join(respath, '_flielist_.json'));
            var js_data = JSON.parse(read_data.toString());
            this._file_list = js_data['_files_'] || [];
        }
        catch (e) {
        }
    }
    readGameServerInfo() {
        try {
            this._plt_file_config = JSON.parse(fs.readFileSync(path.join(respath), 'GameServer.json').toString());
        }
        catch (e) {
        }
    }
    findConfigPlts(plt, appid) {
        let outlist = [];
        if (this._plt_file_config) {
            // 如果配置文件存在的话就加载配置文件中的
            for (let key in this._plt_file_config) {
                let rinfo = this._plt_file_config[key];
                if (appid && rinfo.kappid != appid)
                    continue;
                if (rinfo.kPlt != plt)
                    continue;
                if (rinfo.kFirstTable)
                    outlist.push('_' + rinfo.kFirstTable);
                if (rinfo.kDefaultTable)
                    outlist.push('_' + rinfo.kDefaultTable);
                break;
            }
        }
        else {
            // 如果配置文件加载失败的话 ，默认加载plt的和通用的
            outlist.push("_" + plt);
        }
        return outlist;
    }
    /**获取配置中的渠道文件 */
    get_plt_file(filename, plt) {
        let loadList = this.findConfigPlts(plt || '');
        let index1 = filename.indexOf('.');
        let head = filename.slice(0, index1);
        let ext = filename.slice(index1, filename.length);
        for (let i = 0; i < loadList.length; i++) {
            let checkame = head + loadList[i] + ext;
            if (this._file_list.indexOf(checkame) >= 0) {
                return checkame;
            }
        }
        return filename;
    }
}
var respath = './Res';
class SeResModule {
    constructor(jsonname, plt = 'sdw', caller, loaded) {
        this.resData = {};
        this.length = 0;
        this.md5 = '';
        if (caller) {
            if (typeof caller == 'function') {
                this._loaded = caller;
            }
            else if (loaded) {
                this._loaded = loaded.bind(caller);
            }
        }
        let pltName = PltFileList.get_plt_file(jsonname, plt);
        if (fs.existsSync(path.join(respath, pltName))) {
            jsonname = pltName;
        }
        // 处理的时候分为文件夹和文件两个模式
        if (TeTool_1.is_filetype(jsonname, '.json')) {
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
                if (TeTool_1.is_filetype(file, '.json')) {
                    var fileInfo = fs.readFileSync(file).toString();
                    var allData = JSON.parse(fileInfo);
                    var name = 'k' + TeTool_1.del_filetype(Files[num], 'json');
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
    _getJsonObjLength(jsonObj) {
        var Length = 0;
        for (var item in jsonObj) {
            Length++;
        }
        return Length;
    }
    _loadFile(jsonname) {
        this.resData = {};
        this.length = 0;
        this.md5 = '';
        if (!fs.existsSync(jsonname))
            return;
        var fileInfo = fs.readFileSync(jsonname).toString();
        if (!fileInfo)
            return;
        this.md5 = crypto_1.createHash('md5').update(fileInfo).digest('hex');
        var allData = JSON.parse(fileInfo);
        for (var key in allData) {
            if (allData.hasOwnProperty(key) && key != 'Template') {
                this.resData['k' + key] = allData[key];
            }
        }
        this.length = this._getJsonObjLength(this.resData);
    }
    _onFileChange(jsonname, curr, prev) {
        if (prev.ctime.getTime() == 0) {
            //console.log('文件被创建!');
            this._loadFile(jsonname);
        }
        else if (curr.ctime.getTime() == 0) {
            // console.log('文件被删除!')
            this.resData = {};
            this.length = 0;
        }
        else if (curr.mtime.getTime() != prev.mtime.getTime()) {
            // console.log('文件有修改');
            this._loadFile(jsonname);
            if (this._loaded) {
                setTimeout(this._loaded, 1);
            }
        }
    }
    getAllRes() {
        return this.resData;
    }
    ;
    getRes(id) {
        id = 'k' + id;
        if (this.resData.hasOwnProperty(id)) {
            return this.resData[id];
        }
        return null;
    }
    ;
    getRandom() {
        var randIndex = Math.floor(Math.random() * this.length);
        for (var key in this.resData) {
            randIndex--;
            if (randIndex <= 0) {
                return this.resData[key];
            }
        }
        return null;
    }
    keys() {
        return Object.keys(this.resData);
    }
}
exports.SeResModule = SeResModule;
//# sourceMappingURL=ResModule.js.map