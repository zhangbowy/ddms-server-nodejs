var http = require('http');
var qs = require('querystring');
var URL = require('url');

var data = {
    playerid: 85001,
    time: new Date().getTime()
};//这是需要提交的数据

class SeWebResponse{
    private _orgResponse:any;
    public queryKey:number = 0;
    private _recivedata:string ='';
    private _callback:any = null;
    private _clearfun:any = null;
    public static _s_used_key:number = 1;

    public constructor(res,callback,clearfun){
        this.queryKey = SeWebResponse._s_used_key++;
        this._orgResponse = res;
        this._callback = callback;
        this._clearfun = clearfun;
        this._orgResponse.setEncoding('utf8');
        this._orgResponse.on('data',this.onReciveData.bind(this));
        this._orgResponse.on('end',this.onDataEnd.bind(this));
        this._orgResponse.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
    }

    public onReciveData(data) {
        this._recivedata += data;
    }

    public onDataEnd(){
        if(this._callback){
            this._callback(this._recivedata);
        }
        if(this._clearfun){
            this._clearfun(this);
        }
    }
}

class SeHttpGet{
    private _tempQuestion:any = {};

    public delTemp(cres:SeWebResponse){
        delete this._tempQuestion[cres.queryKey];
    }

    public addTemp(cres:SeWebResponse){
        this._tempQuestion[cres.queryKey] = cres;
    }

    public Get(url,data,callback){
        // 暂时关闭这个功能
        if(callback){
            callback('[]');
            return;
        }

        var p = URL.parse(url);
        var content = data;//qs.stringify(data);
        var options = {
            hostname: p.hostname,
            port: p.port,
            path: p.path +'?' + content,
            method: 'GET'
        };

        var req = http.request(options, (function (res) {
            var resWait = new SeWebResponse(res,callback,null);
            // this.addTemp(new SeWebResponse(res,callback,this.delTemp.bind(this)));
        }).bind(this));
        req.on('error', function(e) {
            //console.log('problem with request: ' + e.stack);
            if(callback) {
                callback('[]');
            }
        });
        req.end();
    }
}

export {SeHttpGet};