import * as http from 'http';
import * as URL from 'url';

import * as qs from 'querystring';
import { EventEmitter } from 'events';
import { configInst } from './lib/TeConfig';

var data = {
    a: 123,
    time: new Date().getTime()
};//这是需要提交的数据 


export class http_post extends EventEmitter {
    constructor(url: string, data: any) {
        super();
        var contents = qs.stringify(data);
        // var contents = data;


        var p_url = URL.parse(url);

        var options = {
            hostname: p_url.hostname,
            port: p_url.port,
            path: p_url.path +'?'+contents,
            method: 'GET',
            // headers: {
            //     'Content-Type': 'application/x-www-form-urlendcoded',
            //     'Content-Length': contents.length
            // }
        };

        var req = http.request(options, this._onRequest.bind(this));

        // req.write(contents);
        req.end();
    }

    private _onRequest(res) {
        res.setEncoding('utf8');
        res.on('data', this._onData.bind(this));
    }

    private _onData(data) {
        this.emit('data', data);
    }
}

export function error_post(data) {
    // var r = new http_post('http://115.236.52.67:17055/sdump', { id: configInst.get('serverid'), info: data });
}
