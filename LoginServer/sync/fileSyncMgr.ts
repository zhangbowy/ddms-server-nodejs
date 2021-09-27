/**
 * 这是一个确保每个cls的上架表一致的机制
 * 
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import * as PATH from 'path';
import { createHash } from 'crypto';
import { netMgrInst } from '../NetMgr/NetMgr';

export class FileSyncMgr {
    constructor() {
        this._mkdirsSync(this.pathDir);
        this._createFileInfo();
    }
    pathDir = './syncres/';
    private _fileInfos: Object = {};

    private _mkdirsSync(dirpath, mode?) {
        mode = mode || 511;
        if (!existsSync(dirpath)) {
            var pathtmp;
            if (dirpath[0] == '/') pathtmp = '/';
            var dirs = dirpath.split(PATH.sep);
            for (var i = 0; i < dirs.length; i++) {
                var dirname = <string>dirs[i];
                if (dirname.length == 0) continue;
                if (pathtmp) {
                    pathtmp = PATH.join(pathtmp, dirname);
                }
                else {
                    pathtmp = dirname;
                }
                if (!existsSync(pathtmp)) {
                    mkdirSync(pathtmp, mode)
                }
            }
        }
        return true;
    }

    private _getFileInfo(fileName: string): { name: string, md5: string, info: string } {
        if (!this._fileInfos.hasOwnProperty(fileName)) return null;
        return this._fileInfos[fileName];
    }

    private _saveFileInfo(name: string, info: string) {
        writeFileSync(PATH.join(this.pathDir, name + '.json'), info);
    }

    private _updateFileInfo(name: string, info: string): string {
        var md5 = createHash('md5');
        md5.update(info);
        var objInfo = {
            name: name,
            md5: md5.digest('hex'),
            info: info
        }

        this._fileInfos[name] = objInfo;

        return objInfo.md5;
    }

    private _createFileInfo() {

        if (!existsSync(this.pathDir)) return;

        var files = readdirSync(this.pathDir);
        for (var i = 0; i < files.length; i++) {
            var realpath = PATH.join(this.pathDir, files[i]);
            var path_parse = PATH.parse(realpath);
            if (path_parse.ext != '.json') continue;
            var info: string;
            try {
                info = readFileSync(realpath, 'utf8');
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
    addSyncFile(name: string, info: string) {
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
    private _syncToAllCls(name: string, info: string, md5: string) {
        var cmd = {
            cmd: 'filesync',
            name: name,
            info: info,
            md5: md5
        }
        netMgrInst.sendAll(cmd);
    }

    /**
     * cls注册登陆的时候验证资源是否最新
     * @param list 
     */
    onClsRegist(list: Array<{ name: string, md5: string }>): Array<{ name: string, info: string, md5: string }> {
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