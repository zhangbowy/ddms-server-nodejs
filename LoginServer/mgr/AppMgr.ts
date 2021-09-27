import { createHash } from "crypto";
import { http_quest } from "../lib/TeHttpQuest";
import { configInst } from "../lib/TeConfig";

interface ifAppOption {
    // 登陆方式 默认闪电玩sdk 
    logintype?: 'sdwsdk' | 'dhsdk',

    /**是否有类似微信的 access_token 需要获取的 */
    wx_token?: boolean,
    // 额外使用的参数
    args?: any
    [key: string]: any
}

export class AppUnit {
    private static apps: { [appid: string]: AppUnit } = {};

    /**
     * 注册登陆方式
     * @param appid 游戏id
     * @param appkey 游戏密钥
     * @param opt 
     */
    static regist(appid: string, appkey: string, opt?: ifAppOption) {
        if (!this.apps.hasOwnProperty(appid)) {
            this.apps[appid] = new AppUnit(appid, appkey, opt);
        }
    }

    static get_appkey(appid: string) {
        if (this.apps.hasOwnProperty(appid)) {
            return this.apps[appid].appkey;
        }

        return '';
    }

    static get_wx_access_token(appid: string) {
        if (this.apps.hasOwnProperty(appid)) {
            return this.apps[appid].wx_access_token;
        }

        return '';
    }

    static get_sdk_type(appid: string) {
        if (this.apps.hasOwnProperty(appid)) {
            return this.apps[appid].option.logintype || 'sdwsdk';
        }

        return 'sdwsdk';
    }

    static get_args(appid: string) {
        if (this.apps.hasOwnProperty(appid)) {
            return this.apps[appid].option.args;
        }

        return null;
    }

    static init() {
        this.update();
        setInterval(this.update.bind(this), 10000);
    }

    private static update() {
        for (let key in this.apps) {
            let r = this.apps[key];
            r.update();
        }
    }

    private appid: string = '';
    private appkey: string = '';
    private option: ifAppOption = {};


    private wx_access_token: string = '';
    private wx_access_token_timeout: number = 0;

    private constructor(appid: string, appkey: string, opt: ifAppOption) {
        this.appid = appid;
        this.appkey = appkey;
        opt = opt || {};
        this.option = Object.assign(this.option, opt)
    }

    private update() {
        if (this.option.wx_token) this.wx_access_token_update();
    }

    private wx_access_token_update() {
        if (configInst.get("access_token_update")) {
            return;
        }

        if (this.wx_access_token_timeout >= Date.now()) return;
        // 假设有两分钟的预判，提前去获取
        /**
        appid	游戏应用id	String
        sec	请求时间戳（单位毫秒）	Long
        sign	签名： MD5（appid + sec+ KEY）
        Key：游戏的key	String
         */
        let sec = Date.now();
        let sign = createHash('md5').update('' + this.appid + sec + this.appkey).digest('hex');
        http_quest('get', `https://wxpush.shandw.com/getaccesstoken/wxdc1767838b33cbdb?appid=${this.appid}&sec=${sec}&Key=${this.appkey}&sign=${sign}`, null, (data) => {
            if (data) {
                try {
                    let pdata = JSON.parse(data);
                    if (pdata && pdata.result == 1) {
                        this.wx_access_token = pdata.AccessToken;
                        this.wx_access_token_timeout = pdata.stime + pdata.AccessTokenExpireIn;
                    }
                }
                catch (e) {

                }
            }
        }, 1);
        // 请求了就添加3s中，减少重复发起请求
        this.wx_access_token_timeout = Date.now() + 3000;
    }
}
// 通用渠道
AppUnit.regist("1145326931", "fbc92a323bce41a698018a247a1f11", { wx_token: true });

// qq小游戏
AppUnit.regist("1938467015", "9b815c93244a454eb2c4c3d027c191");

// 微信马甲
AppUnit.regist("2089515215", "94de4f813c8e4dae83f2c6932565a8", { wx_token: true });

// hago
AppUnit.regist("2089252559", "ed97b50ec2654bc69665ad11c53b5a");

//逐鹿中原
AppUnit.regist("2005299919", "e014e6565d75437ab4a8dcf83a86ef");
// gowan
AppUnit.regist("2022208975", "dbbe118461944a1f8a930516538235");

AppUnit.regist("1684303219", "", {
    logintype: 'dhsdk',
    args: {
        'jrtt1': ['今日头条', 'all', '1'],
        'ios_app': ['苹果区', 'appstore', '2']
    }
})