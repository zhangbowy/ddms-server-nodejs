import { createHash } from 'crypto';
import { IncomingMessage } from 'http';
import { http_quest } from '../lib/TeHttpQuest';
// 第三方充值Q币

class HYQQMoney {
    constructor() {
    }

    private _http_post(url: string, param: any, cb: (error: any, data: any) => void) {
        http_quest("post", url, param, this._onQueryBack.bind(this, cb));
    }

    private _onQueryBack(cb: any, res: IncomingMessage) {
        if (!cb || !res) return;
        res.on('data', function (d) { this.__data__ = (this.__data__ || '') + d.toString() })

        res.on('end', function (d) {
            if (cb) {
                try {
                    cb(null, JSON.parse(this.__data__));
                }
                catch (e) {
                    cb(e, null);
                }
            }
        });
    }

    recharge(orderid: string, qqid: string, num: number) {
        var param = {
            action: "buy",
            username: "58919237",
            orderid: orderid,
            timestamp: Date.now(),
            account: qqid,
            productid: "10001",
            quantity: num,
            extend: [],
            return: '',
            callback: "http://ddms-server1.shandw.com/api/hyqqmoney",
            buyerip: '',
            sign: '',
        }

        var apilist = [];
        for (var key in param) {
            if (key == 'sign') continue;
            if (key == 'username') {
                apilist.push(key + "=" + param[key].toString().toLowerCase());
            }
            else {
                apilist.push(key + "=" + param[key]);
            }
        }

        var check_str = apilist.join('&');
        param.sign = createHash('md5').update(check_str).digest('hex');

        this._http_post("https://api.ihuyi.com/f/recharge", param, this._recharge_back_);
    }

    private _recharge_back_(e, info: { code: number, message: string, taskid: string }) {
        console.log(info);
    }
}

export var HYQQMoneyInst = new HYQQMoney();
// HYQQMoneyInst.recharge("sadadadadada", "659545609", 10);