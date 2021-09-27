
import * as HTTPS from 'https';
import * as HTTP from 'http';
import * as URL from 'url';
import * as querystring from 'querystring';
import { TeMap } from '../TeTool';

class DataType {
    static json = 'json';
    static text = 'text';
}
var timeout_num = 10 * 1000;
var taskGenId = 0;
function makeTaskId() {
    ++taskGenId;
    return taskGenId;
}
var taskCatche: TeMap<{ url: string, type: string, dtype: string, data: any, retry: number, cb: (data: any) => void, respon_data?: Buffer, respon_len?: number }> = new TeMap();

export function http_quest(type: 'get' | 'post', url: string, data: any, cb: (data: any) => void, retry: number = 0, dtype: string = DataType.text) {
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

function onResponse(taskid, res: HTTP.IncomingMessage) {
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

function onData(taskid, data: Buffer) {
    let info = taskCatche.get(taskid);
    if (!info) return;
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
    if (!info) return;
    let out = '';
    if (info.respon_data && info.respon_len) {
        out = info.respon_data.slice(0, info.respon_len).toString();
    }
    info.cb(out);
    taskCatche.del(taskid);
}

function make_quest(taskId: number) {
    let task = taskCatche.get(taskId)
    if (task.type == 'get') {
        http_get(task.url, onResponse.bind(this, taskId));
    }
    else if (task.type == 'post') {
        http_post(task.url, task.data, onResponse.bind(this, taskId), task.dtype)
    }
    else {
        process.nextTick(bind_call(onResponse, taskId));
    }
}

function bind_call(fn, ...args) {
    return (function (_fn, ...args_) {
        _fn && _fn(...args_);
    }).bind(this, fn, ...args)
}

function http_get(url, cb: (res: HTTP.IncomingMessage) => void) {
    try {
        let r = (url.indexOf('https://') == 0) ? HTTPS.get(url, cb) : HTTP.get(url, cb);
        r.on("error", (function (_cb, e) {
            console.log(e);
            _cb(null);
        }).bind(this, cb))
        r.setTimeout(timeout_num, bind_call(cb, null))
    }
    catch (e) {
        process.nextTick(bind_call(cb, null));
    }
}

function http_post(url, data, cb: (res: HTTP.IncomingMessage) => void, type: string = 'text') {
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
            }
        }
        else {
            contents = querystring.stringify(data);
            Query['headers'] = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': contents.length
            }
        }


        let r = (url.indexOf('https://') == 0) ? HTTPS.request(Query as any, cb) : HTTP.request(Query as any, cb);
        r.on("error", (function (_cb, e) {
            console.log(e);
            _cb(null);
        }).bind(this, cb))
        r.write(contents,'utf8');
        r.end();
        r.setTimeout(timeout_num, bind_call(cb, null))
    }
    catch (e) {
        process.nextTick(bind_call(cb, null));
    }
}

export function http_test() {
    http_quest("get", "https://www.baidu.com", "", (data) => {
        console.log(data);
    })
}