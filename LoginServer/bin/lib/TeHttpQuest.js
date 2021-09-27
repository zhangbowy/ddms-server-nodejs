"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.http_test = exports.http_quest = void 0;
const HTTPS = require("https");
const HTTP = require("http");
const URL = require("url");
const querystring = require("querystring");
const TeTool_1 = require("./TeTool");
class DataType {
}
DataType.json = 'json';
DataType.text = 'text';
var timeout_num = 10 * 1000;
var taskGenId = 0;
function makeTaskId() {
    ++taskGenId;
    return taskGenId;
}
var taskCatche = new TeTool_1.TeMap();
function http_quest(type, url, data, cb, retry = 0, dtype = DataType.text) {
    var taskId = makeTaskId();
    taskCatche.set(taskId, {
        url: url,
        retry: retry,
        data: data,
        type: type,
        cb: cb,
        dtype: dtype
    });
    make_quest(taskId);
    return taskId;
}
exports.http_quest = http_quest;
function onResponse(taskid, res) {
    let task = taskCatche.get(taskid);
    if (task) {
        if (res) {
            let size = Math.min(parseInt(res.headers["content-length"] || '1024'), 128 * 1024);
            task.respon_data = Buffer.alloc(size);
            task.respon_len = 0;
            res.on("data", onData.bind(this, taskid));
            res.on("end", onEnd.bind(this, taskid));
            res.on("error", onEnd.bind(this, taskid));
        }
        else if (!task.respon_data) {
            // 表示开始接收数据了，就不需要超时标志了
            if (task.retry > 0) {
                --task.retry;
            }
            else {
                onEnd(taskid);
            }
        }
    }
}
function onData(taskid, data) {
    let info = taskCatche.get(taskid);
    if (!info)
        return;
    if (info.respon_len + data.length > info.respon_data.length) {
        // 数据不够放了，一般不存在,
        let nbuff = Buffer.alloc(info.respon_len + data.length + 2 * 1024); // 额外多2K的数据容量
        info.respon_data.copy(nbuff, 0, 0, info.respon_len);
        info.respon_data = nbuff;
    }
    info.respon_len += data.copy(info.respon_data, info.respon_len, 0, data.length);
}
function onEnd(taskid) {
    let info = taskCatche.get(taskid);
    if (!info)
        return;
    let out = '';
    if (info.respon_data && info.respon_len) {
        out = info.respon_data.slice(0, info.respon_len).toString();
    }
    info.cb(out);
    taskCatche.del(taskid);
}
function make_quest(taskId) {
    let task = taskCatche.get(taskId);
    if (task.type == 'get') {
        http_get(task.url, onResponse.bind(this, taskId));
    }
    else if (task.type == 'post') {
        http_post(task.url, task.data, onResponse.bind(this, taskId), task.dtype);
    }
    else {
        process.nextTick(bind_call(onResponse, taskId));
    }
}
function bind_call(fn, ...args) {
    return (function (_fn, ...args_) {
        _fn && _fn(...args_);
    }).bind(this, fn, ...args);
}
function http_get(url, cb) {
    try {
        let r = (url.indexOf('https://') == 0) ? HTTPS.get(url, cb) : HTTP.get(url, cb);
        r.on("error", (function (_cb, e) {
            console.log(e);
            _cb(null);
        }).bind(this, cb));
        r.setTimeout(timeout_num, bind_call(cb, null));
    }
    catch (e) {
        process.nextTick(bind_call(cb, null));
    }
}
function http_post(url, data, cb, type = 'text') {
    try {
        let contents = "";
        let Query = URL.parse(url);
        Query['method'] = 'POST';
        if (type == 'json') {
            if (typeof data == 'string') {
                contents = data;
            }
            else {
                contents = JSON.stringify(data);
            }
            Query['headers'] = {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(contents)
            };
        }
        else {
            contents = querystring.stringify(data);
            Query['headers'] = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': contents.length
            };
        }
        let r = (url.indexOf('https://') == 0) ? HTTPS.request(Query, cb) : HTTP.request(Query, cb);
        r.on("error", (function (_cb, e) {
            console.log(e);
            _cb(null);
        }).bind(this, cb));
        r.write(contents, 'utf8');
        r.end();
        r.setTimeout(timeout_num, bind_call(cb, null));
    }
    catch (e) {
        process.nextTick(bind_call(cb, null));
    }
}
function http_test() {
    http_quest("get", "https://www.baidu.com", "", (data) => {
        console.log(data);
    });
}
exports.http_test = http_test;
//# sourceMappingURL=TeHttpQuest.js.map