"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeHttpGet = void 0;
var http = require('http');
var qs = require('querystring');
var URL = require('url');
var data = {
    playerid: 85001,
    time: new Date().getTime()
}; //这是需要提交的数据
class SeWebResponse {
    constructor(res, callback, clearfun) {
        this.queryKey = 0;
        this._recivedata = '';
        this._callback = null;
        this._clearfun = null;
        this.queryKey = SeWebResponse._s_used_key++;
        this._orgResponse = res;
        this._callback = callback;
        this._clearfun = clearfun;
        this._orgResponse.setEncoding('utf8');
        this._orgResponse.on('data', this.onReciveData.bind(this));
        this._orgResponse.on('end', this.onDataEnd.bind(this));
        this._orgResponse.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
    }
    onReciveData(data) {
        this._recivedata += data;
    }
    onDataEnd() {
        if (this._callback) {
            this._callback(this._recivedata);
        }
        if (this._clearfun) {
            this._clearfun(this);
        }
    }
}
SeWebResponse._s_used_key = 1;
class SeHttpGet {
    constructor() {
        this._tempQuestion = {};
    }
    delTemp(cres) {
        delete this._tempQuestion[cres.queryKey];
    }
    addTemp(cres) {
        this._tempQuestion[cres.queryKey] = cres;
    }
    Get(url, data, callback) {
        // 暂时关闭这个功能
        if (callback) {
            callback('[]');
            return;
        }
        var p = URL.parse(url);
        var content = data; //qs.stringify(data);
        var options = {
            hostname: p.hostname,
            port: p.port,
            path: p.path + '?' + content,
            method: 'GET'
        };
        var req = http.request(options, (function (res) {
            var resWait = new SeWebResponse(res, callback, null);
            // this.addTemp(new SeWebResponse(res,callback,this.delTemp.bind(this)));
        }).bind(this));
        req.on('error', function (e) {
            //console.log('problem with request: ' + e.stack);
            if (callback) {
                callback('[]');
            }
        });
        req.end();
    }
}
exports.SeHttpGet = SeHttpGet;
//# sourceMappingURL=httpGet.js.map