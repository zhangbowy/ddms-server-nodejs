"use strict";
/**
 * 这是一个确保每个cls的上架表一致的机制
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSyncMgr = void 0;
const fs_1 = require("fs");
const PATH = require("path");
const crypto_1 = require("crypto");
const NetMgr_1 = require("../NetMgr/NetMgr");
class FileSyncMgr {
    constructor() {
        this.pathDir = './syncres/';
        this._fileInfos = {};
        this._mkdirsSync(this.pathDir);
        this._createFileInfo();
    }
    _mkdirsSync(dirpath, mode) {
        mode = mode || 511;
        if (!fs_1.existsSync(dirpath)) {
            var pathtmp;
            if (dirpath[0] == '/')
                pathtmp = '/';
            var dirs = dirpath.split(PATH.sep);
            for (var i = 0; i < dirs.length; i++) {
                var dirname = dirs[i];
                if (dirname.length == 0)
                    continue;
                if (pathtmp) {
                    pathtmp = PATH.join(pathtmp, dirname);
                }
                else {
                    pathtmp = dirname;
                }
                if (!fs_1.existsSync(pathtmp)) {
                    fs_1.mkdirSync(pathtmp, mode);
                }
            }
        }
        return true;
    }
    _getFileInfo(fileName) {
        if (!this._fileInfos.hasOwnProperty(fileName))
            return null;
        return this._fileInfos[fileName];
    }
    _saveFileInfo(name, info) {
        fs_1.writeFileSync(PATH.join(this.pathDir, name + '.json'), info);
    }
    _updateFileInfo(name, info) {
        var md5 = crypto_1.createHash('md5');
        md5.update(info);
        var objInfo = {
            name: name,
            md5: md5.digest('hex'),
            info: info
        };
        this._fileInfos[name] = objInfo;
        return objInfo.md5;
    }
    _createFileInfo() {
        if (!fs_1.existsSync(this.pathDir))
            return;
        var files = fs_1.readdirSync(this.pathDir);
        for (var i = 0; i < files.length; i++) {
            var realpath = PATH.join(this.pathDir, files[i]);
            var path_parse = PATH.parse(realpath);
            if (path_parse.ext != '.json')
                continue;
            var info;
            try {
                info = fs_1.readFileSync(realpath, 'utf8');
            }
            catch (e) {
                continue;
            }
            this._updateFileInfo(path_parse.name, info);
        }
    }
    /**
     * 添加需要校对的文件
     */
    addSyncFile(name, info) {
        this._saveFileInfo(name, info);
        var md5 = this._updateFileInfo(name, info);
        this._syncToAllCls(name, info, md5);
        return true;
    }
    /**
     * 通知cls变更数据 这个是广播的
     * @param name
     * @param info
     * @param md5
     */
    _syncToAllCls(name, info, md5) {
        var cmd = {
            cmd: 'filesync',
            name: name,
            info: info,
            md5: md5
        };
        NetMgr_1.netMgrInst.sendAll(cmd);
    }
    /**
     * cls注册登陆的时候验证资源是否最新
     * @param list
     */
    onClsRegist(list) {
        var diffFiles = [];
        for (var i = 0; i < list.length; i++) {
            var kName = list[i].name;
            var kMd5 = list[i].md5;
            var rkInfo = this._getFileInfo(kName);
            if (rkInfo && rkInfo.md5 != kMd5) {
                diffFiles.push({ name: kName, info: rkInfo.info, md5: rkInfo.md5 });
            }
        }
        return diffFiles;
    }
}
exports.FileSyncMgr = FileSyncMgr;
//# sourceMappingURL=fileSyncMgr.js.map