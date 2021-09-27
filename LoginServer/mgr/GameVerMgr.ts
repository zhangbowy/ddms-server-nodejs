import { configInst } from "../lib/TeConfig";
import { serverMonitInst } from "../NetMgr/serverMgr";
import { SeResModule } from "../lib/ResModule";
import { SeResGameServer } from "../Res/interface";

/**
 * 游戏版本控制，这里控制是否可以登陆游戏
 */
export class GameVerMgr {
    private static _inst_: GameVerMgr;
    static get inst() {
        if (!this._inst_) this._inst_ = new GameVerMgr();
        return this._inst_;
    }

    public allplts() {
        let plts: string[] = []
        let allRes = this.gameServerRes.getAllRes();
        for (let key in allRes) {
            plts.push(allRes[key].kPlt.toString());
        }

        return plts;
    }

    private gameServerRes: SeResModule<SeResGameServer> = new SeResModule('GameServer.json');

    private _up_value_(v: string) {
        if (v == "null") return null;
        return v;
    }

    private _get_number(v: string | any) {
        try {
            let up = this._up_value_(v.toString());
            return parseFloat(up || '0');
        }
        catch (e) {
            return 0;
        }
    }

    check_pltarea_state(suid: number | string, plt?: string, appid?: string) {
        let uid: number = 0;
        if (typeof suid == 'number') {
            uid = suid;
        }
        else {
            uid = this._get_number(suid);
        }


        let out: { [plt: string]: { url: string, limit: boolean, bnew: boolean, name: string, recommended: boolean, iStayTime: number } } = {};
        let allRes = this.gameServerRes.getAllRes();
        for (let key in allRes) {
            let serverres = allRes[key] as SeResGameServer;
            if (plt && serverres.kPlt.toString().indexOf(plt) != 0) continue;
            if(appid && serverres.kappid != appid) continue;

            let r_info = { url: '', limit: true, bnew: false, name: serverres.kName, recommended: false, iStayTime: 0 };
            if (serverres.iIsNew) r_info.bnew = true;
            if (serverres.iIsRecommended) r_info.recommended = true;
            if (serverres.iStayTime) r_info.iStayTime = serverres.iStayTime;
            // 判断是否有url存在
            r_info.url = serverMonitInst.get_minimum_num_ip_by_type('cls', serverres.kPlt).url;
            if (r_info.url) {
                // 有服务器开着的时候就判断是否登陆限制
                let plt_path = 'limit_plt.' + serverres.kPlt;
                let limit_plt = configInst.get<string[]>(plt_path);
                // 在需要检查的平台里才检查
                if (limit_plt && uid && configInst.get<string>(plt_path + '.login_limit')) {
                    // 如果开启了限制登陆模式，那么只有特定的id可以进入
                    var uids = configInst.get<number[]>(plt_path + '.login_limit_ids') || [];
                    if (uids.indexOf(uid) >= 0) {
                        r_info.limit = false;
                    }
                }
                else {
                    r_info.limit = false;
                }
            }

            out[serverres.kPlt] = r_info;
        }

        return out;
    }

    check_login_limit(suid: string | number, sver: string | number, plt: string) {
        let uid: number = 0;
        let ver: number = 0;
        if (typeof suid == 'number') {
            uid = suid;
        }
        else {
            uid = this._get_number(suid);
        }

        if (typeof sver == 'number') {
            ver = sver;
        }
        else {
            ver = this._get_number(sver);
        }

        let plt_path = 'limit_plt.' + plt;
        let limit_plt = configInst.get<string[]>(plt_path);
        if (limit_plt) {
            // 在需要检查的平台里才检查
            if (uid) {
                if (configInst.get<string>(plt_path + '.login_limit')) {
                    // 如果开启了限制登陆模式，那么只有特定的id可以进入
                    var uids = configInst.get<number[]>(plt_path + '.login_limit_ids') || [];
                    if (uids.indexOf(uid) < 0) {
                        return configInst.get<string>(plt_path + '.notice') || 'server busy';
                    }
                }
            }

            if (ver) {
                // 检查玩家版本号是否合法
                if (ver < configInst.get<number>(plt_path + '.limit_ver')) {
                    return 'ver_old';
                }
            }
        }

        return '';
    }
}