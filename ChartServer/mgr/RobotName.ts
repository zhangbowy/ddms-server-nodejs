import * as path from 'path';
import * as fs from 'fs';
import { SeResNameLib, SeEnumNameLibeType } from "../Res/interface";
import { HashMap } from '../lib/TeTool';
import { configInst } from '../lib/TeConfig';
export class RobotName {

    private _res: HashMap<Array<string>> = new HashMap<Array<string>>();
    private jsonName = configInst.get('plt') =='hago'? 'NameLib_hago.json' : 'NameLib.json';
    private _path =  path.join(__dirname, '../Res/', this.jsonName);

    constructor() {
        this._loadNameConfig();
    }

    private _watchRes() {
        fs.watchFile(this._path, this._onFileChange.bind(this));
    }

    private _onFileChange(curr: fs.Stats, prev: fs.Stats) {
        if (prev.ctime.getTime() == 0) {
            //console.log('文件被创建!');
            this._loadNameConfig();
        } else if (curr.ctime.getTime() == 0) {
            // console.log('文件被删除!')

        } else if (curr.mtime.getTime() != prev.mtime.getTime()) {
            // console.log('文件有修改');
            this._loadNameConfig();
        }
    }

    private _loadNameConfig() {
        this._res.clear();
        var familyName = fs.readFileSync(this._path).toString();
        try {
            var jsonRes = JSON.parse(familyName);
            for (var key in jsonRes) {
                var rkInfo = <SeResNameLib>jsonRes[key];
                if(!rkInfo || !rkInfo.kWords) continue;
                var words = rkInfo.kWords.split('、');
                this._res.add(rkInfo.eType, words);
            }
        }
        catch (e) {

        }
    }

    private _random(list: Array<Array<string>>): string {
        if (!list || list.length == 0) {
            return '采';
        }

        var s1 = list[Math.floor(Math.random() * list.length)];
        if (!s1 || s1.length == 0) {
            return '采' + Math.random().toString();
        }
        return s1[Math.floor(Math.random() * s1.length)];
    }

    public getName() {
        var info : {name:string, isVip: boolean, medals: Array<string>} = {name:"", isVip:false, medals:[]};
        var kFirsts = this._res.get(SeEnumNameLibeType.NanMing);
        info.name = this._random(kFirsts);
        var kVips = this._res.get(SeEnumNameLibeType.YueKaWanJia);
        for (let i = 0; i < kVips.length; ++i){
            let sexList = kVips[i];
            if(sexList.indexOf(info.name) != -1){
                info.isVip = true
                break;
            }
        }
        var kMedals = this._res.get(SeEnumNameLibeType.SuiJiHuiZhang);
        info.medals = kMedals[Math.floor(kMedals.length * Math.random())];
        return info;
    }
}

export var robotNameInst = new RobotName();