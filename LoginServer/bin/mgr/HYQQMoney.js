"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HYQQMoneyInst = void 0;
const crypto_1 = require("crypto");
const TeHttpQuest_1 = require("../lib/TeHttpQuest");
// 第三方充值Q币
class HYQQMoney {
    constructor() {
    }
    _http_post(url, param, cb) {
        TeHttpQuest_1.http_quest("post", url, param, this._onQueryBack.bind(this, cb));
    }
    _onQueryBack(cb, res) {
        if (!cb || !res)
            return;
        res.on('data', function (d) { this.__data__ = (this.__data__ || '') + d.toString(); });
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
    recharge(orderid, qqid, num) {
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
        };
        var apilist = [];
        for (var key in param) {
            if (key == 'sign')
                continue;
            if (key == 'username') {
                apilist.push(key + "=" + param[key].toString().toLowerCase());
            }
            else {
                apilist.push(key + "=" + param[key]);
            }
        }
        var check_str = apilist.join('&');
        param.sign = crypto_1.createHash('md5').update(check_str).digest('hex');
        this._http_post("https://api.ihuyi.com/f/recharge", param, this._recharge_back_);
    }
    _recharge_back_(e, info) {
        console.log(info);
    }
}
exports.HYQQMoneyInst = new HYQQMoney();
// HYQQMoneyInst.recharge("sadadadadada", "659545609", 10);
//# sourceMappingURL=HYQQMoney.js.map