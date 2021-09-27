"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.objToArray = exports.emojiFilter = exports.TeMath = exports.arrayRandom = exports.DIR = exports.MapList = exports.Map = exports.HashMap = exports.orderListRemove = exports.orderListInsert = exports.orderListFind = exports.TeDate = void 0;
const fs = require("fs");
const path = require("path");
function func_copy(obj, bFunc = false) {
    var out = {};
    if (obj instanceof Array) {
        out = [];
    }
    if (typeof obj == 'object') {
        for (var key in obj) {
            if (key == 'clone' || key == 'global') {
                continue;
            }
            if (typeof obj[key] == 'function' && !bFunc) {
                continue;
            }
            if (obj[key] == null) {
                out[key] = null;
            }
            else if (typeof obj[key] == 'object') {
                out[key] = func_copy(obj[key], false);
            }
            else {
                out[key] = obj[key];
            }
        }
    }
    else {
        out = obj;
    }
    return out;
}
class TeDate extends Date {
    static Date_Format(date, fmt) {
        // 对Date的扩展，将 Date 转化为指定格式的String   
        // 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，   
        // 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)   
        // 例子：   
        // (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423   
        // (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18 
        var o = {
            "M+": date.getMonth() + 1,
            "d+": date.getDate(),
            "h+": date.getHours(),
            "m+": date.getMinutes(),
            "s+": date.getSeconds(),
            "q+": Math.floor((date.getMonth() + 3) / 3),
            "S": date.getMilliseconds() //毫秒   
        };
        if (/(y+)/.test(fmt))
            fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt))
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    }
    static DateToStr(date) {
        if (typeof date == 'number') {
            date = new Date(date);
        }
        return TeDate.Date_Format(date, "yyyy-MM-dd hh:mm:ss");
    }
    static DateToLogStr(date) {
        if (typeof date == 'number') {
            date = new Date(date);
        }
        return TeDate.Date_Format(date, "yyyy_MM_dd_hh");
    }
    static IsYesterday(leftTime, rightTime = Date.now()) {
        // 判断时间是否是昨天的
        var oneday = 1000 * 60 * 60 * 24;
        if (rightTime - leftTime > oneday) {
            return false;
        }
        return true;
    }
    static Isdiffday(leftTime, rightTime = Date.now()) {
        // 判断时间是否是今天的
        var nowDate = new Date(rightTime);
        var checkDate = new Date(leftTime);
        if (checkDate.getFullYear() != nowDate.getFullYear() ||
            checkDate.getMonth() != nowDate.getMonth() ||
            checkDate.getDate() != nowDate.getDate()) {
            return true;
        }
        return false;
    }
    static Isdiffweek(leftTime, rightTime = Date.now()) {
        // 判断时间是否是今天的
        var rightDate = new Date(rightTime);
        var leftDate = new Date(leftTime);
        // 周判断的时候是有跨越的，所以先计算一下插值
        var diffTime = 0;
        var weekDay = 0;
        var diffDay = 0;
        if (leftTime > rightTime) {
            diffTime = leftTime - rightTime;
            if (leftDate.getDay() < rightDate.getDay()) {
                return true;
            }
        }
        else {
            diffTime = rightTime - leftTime;
            if (rightDate.getDay() < leftDate.getDay()) {
                return true;
            }
        }
        if (diffTime / (1000 * 60 * 60 * 24) >= 7) {
            return true;
        }
        return false;
    }
    static Isdiffmonth(leftTime, rightTime = Date.now()) {
        // 判断时间是否是今天的
        var nowDate = new Date(rightTime);
        var checkDate = new Date(leftTime);
        if (checkDate.getFullYear() != nowDate.getFullYear() ||
            checkDate.getMonth() != nowDate.getMonth()) {
            return true;
        }
        return false;
    }
    static Isdiffhour(leftTime, rightTime = Date.now()) {
        // 判断时间是否是今天的
        var nowDate = new Date(rightTime);
        var checkDate = new Date(leftTime);
        if (checkDate.getHours() != nowDate.getHours()) {
            return true;
        }
        return false;
    }
    static IsdiffMinute(leftTime, rightTime = Date.now()) {
        // 判断时间是否是今天的
        var nowDate = new Date(rightTime);
        var checkDate = new Date(leftTime);
        if (checkDate.getMinutes() != nowDate.getMinutes()) {
            return true;
        }
        return false;
    }
}
exports.TeDate = TeDate;
function compareList(a, key, value) {
    if (!a || !a.hasOwnProperty(key))
        return -1;
    if (a[key] > value)
        return 1;
    if (a[key] == value)
        return 0;
    return -1;
}
/**
 * 开始二分法查找
 * @param list 查找用的列表
 * @param key 查找的单位元素
 * @param value 比较用的数值
 */
function orderListFind(list, key, value, desc = false) {
    if (list.length == 0)
        return 0;
    var small = -1, big = list.length;
    while (true) {
        var ret = 0;
        var center = Math.floor((small + big) / 2);
        if (small == big) {
            if (small == -1 || big == list.length)
                return small;
            switch (compareList(list[big], key, value)) {
                case 0: return big;
                case -1: return desc ? big - 1 : big + 1;
                case 1: return desc ? big + 1 : big;
            }
        }
        else if (small + 1 == big) {
            // 差一个的时候比较一下小的
            // switch (compareList<T>(list[big], key, value)) {
            //     case 0: return big;
            //     case -1: return desc ? small : (big == list.length ? big : big + 1);
            //     case 1: return desc ? big + 1 : small;
            // }
            // 这里比较一下，先从小的开始
            var sr = -2, br = -2;
            if (small >= 0) {
                sr = compareList(list[small], key, value);
            }
            if (big < list.length) {
                br = compareList(list[big], key, value);
            }
            if (desc) {
                if (sr != -2 && br != -2) {
                    if (sr == -1) {
                        return small - 1;
                    }
                    else if (sr == 0) {
                        return small;
                    }
                    else if (br == 0) {
                        return big;
                    }
                    else if (br == -1) {
                        // 这里 比小的大，但是比大的小
                        return small;
                    }
                    else {
                        return big;
                    }
                }
                else if (br != -2) {
                    // 这里小的是不存在的，就是说大的是第 0 位
                    if (br == -1) {
                        return small;
                    }
                    else {
                        return big;
                    }
                }
                else if (sr != -2) {
                    // 这里表示大的不存在，就是说小的是最后一个
                    if (sr == -1) {
                        return small - 1;
                    }
                    else {
                        return small;
                    }
                }
                else {
                    return -1;
                }
            }
            else {
                if (sr != -2 && br != -2) {
                    if (sr == 1) {
                        return small - 1;
                    }
                    else if (sr == 0) {
                        return small;
                    }
                    else if (br == 0) {
                        return big;
                    }
                    else if (br == 1) {
                        // 这里 比小的大，但是比大的小
                        return small;
                    }
                    else {
                        return big;
                    }
                }
                else if (br != -2) {
                    // 这里小的是不存在的，就是说大的是第 0 位
                    if (br == 1) {
                        return small;
                    }
                    else {
                        return big;
                    }
                }
                else if (sr != -2) {
                    // 这里表示大的不存在，就是说小的是最后一个
                    if (sr == 1) {
                        return small - 1;
                    }
                    else {
                        return small;
                    }
                }
                else {
                    return -1;
                }
            }
        }
        else {
            ret = compareList(list[center], key, value);
        }
        if (desc) {
            switch (ret) {
                case 0: // 中间值是相等的数值的 当成 1处理
                    big = center;
                    break;
                case 1:
                    small = center;
                    break;
                case -1:
                    big = center;
                    break;
            }
        }
        else {
            switch (ret) {
                case 0: // 中间值是相等的数值的 当成 1处理
                    big = center;
                    break;
                case 1:
                    big = center;
                    break;
                case -1:
                    small = center;
                    break;
            }
        }
    }
}
exports.orderListFind = orderListFind;
function orderListInsert(insertValue, list, key, value, desc = false) {
    // 先找一下位置
    var index = orderListFind(list, key, value, desc);
    list.splice(index + 1, 0, insertValue);
}
exports.orderListInsert = orderListInsert;
function orderListRemove(list, key, value, desc = false) {
    var index = orderListFind(list, key, value, desc);
    for (var i = index; i < list.length;) {
        var rkInfo = list[i];
        if (rkInfo[key] == value) {
            list.splice(i, 1);
        }
        else {
            break;
        }
    }
}
exports.orderListRemove = orderListRemove;
class HashMap {
    constructor() {
        this._data = {};
    }
    get(key) {
        key = key.toString();
        return this._data[key] || [];
    }
    add(key, v) {
        key = key.toString();
        if (!this._data[key]) {
            this._data[key] = [];
        }
        this._data[key].push(v);
    }
    get keys() {
        return Object.keys(this._data);
    }
    set(key, v) {
        key = key.toString();
        this._data[key] = v;
    }
    clear() {
        this._data = {};
    }
    find(key, fkey, fv) {
        if (!key)
            return [];
        var keys = fkey.split('.');
        var out = [];
        key = key.toString();
        var rkV = this.get(key);
        if (rkV.length <= 0) {
            return out;
        }
        for (var i = 0; i < rkV.length; i++) {
            var info = rkV[i];
            if (this._list_find(info, keys, fv)) {
                out.push(info);
            }
        }
        return out;
    }
    _list_find(obj, keys, fv) {
        keys = func_copy(keys);
        if (!obj || typeof obj != 'object' || keys.length == 0) {
            return false;
        }
        var rk = keys.shift();
        if (keys.length == 0) {
            return obj[rk] == fv;
        }
        return this._list_find(obj[rk], keys, fv);
    }
    _list_rest(obj, keys, restv) {
        keys = func_copy(keys);
        if (!obj || typeof obj != 'object' || keys.length == 0) {
            return false;
        }
        var rk = keys.shift();
        if (keys.length == 0) {
            return obj[rk] = restv;
        }
        return this._list_rest(obj[rk], keys, restv);
    }
    find2Reset(key, fkey, fv, dkey, restv) {
        var keys = fkey.split('.');
        var keys2 = dkey.split('.');
        key = key.toString();
        var rkV = this.get(key);
        if (rkV.length > 0) {
            for (var i = 0; i < rkV.length; i++) {
                var info = rkV[i];
                if (this._list_find(info, keys, fv)) {
                    this._list_rest(info, keys2, restv);
                    return true;
                }
            }
        }
        return false;
    }
    find2Del(key, fkey, fv) {
        var keys = fkey.split('.');
        key = key.toString();
        var rkV = this.get(key);
        if (rkV.length > 0) {
            for (var i = 0; i < rkV.length; i++) {
                var info = rkV[i];
                if (this._list_find(info, keys, fv)) {
                    rkV.splice(i, 1);
                    return true;
                }
            }
        }
        return false;
    }
    del(key) {
        key = key.toString();
        delete this._data[key];
    }
}
exports.HashMap = HashMap;
class Map {
    constructor(_data) {
        this._data = {};
        if (_data) {
            this._data = _data;
        }
    }
    has(key) {
        return this._data.hasOwnProperty(key.toString());
    }
    get(key) {
        return this._data[key];
    }
    set(key, v) {
        this._data[key] = v;
    }
    get keys() {
        return Object.keys(this._data);
    }
    del(key) {
        var obj = this._data[key];
        if (obj && typeof obj == 'object' && obj['destory'] && typeof obj['destory'] == 'function') {
            obj['destory']();
        }
        delete this._data[key];
    }
    rand() {
        var keys = this.keys;
        var tid = keys[Math.floor(Math.random() * keys.length)];
        return this.get(tid);
    }
    clear() {
        this._data = {};
    }
}
exports.Map = Map;
/**
 * list 的方式实现map
 */
class MapList {
    constructor(mkey) {
        this._data = [];
        this.mkey = mkey;
    }
    _find_index(v) {
        var num = orderListFind(this._data, this.mkey, v);
        if (num < 0 || num >= this._data.length)
            return -1;
        var rInfo = this._data[num];
        if (rInfo[this.mkey] != v) {
            return -1;
        }
        return num;
    }
    get(v) {
        v = v.toString();
        var num = this._find_index(v);
        return (num == -1) ? null : this._data[num];
    }
    set(k, v) {
        k = k.toString();
        var num = this._find_index(k);
        if (num >= 0) {
            // 找到了就使用
            this._data[num] = v;
        }
        else {
            // 没找到就要新增一个
            orderListInsert(v, this._data, this.mkey, k);
        }
    }
    remove(v) {
        v = v.toString();
        orderListRemove(this._data, this.mkey, v);
    }
    get length() {
        return this._data.length;
    }
}
exports.MapList = MapList;
class DIR {
    static mkdirsSync(dirpath, mode) {
        mode = mode || 511;
        if (!fs.existsSync(dirpath)) {
            var pathtmp;
            if (dirpath[0] == '/')
                pathtmp = '/';
            var dirs = dirpath.split(path.sep);
            for (var i = 0; i < dirs.length; i++) {
                var dirname = dirs[i];
                if (dirname.length == 0)
                    continue;
                if (pathtmp) {
                    pathtmp = path.join(pathtmp, dirname);
                }
                else {
                    pathtmp = dirname;
                }
                if (!fs.existsSync(pathtmp)) {
                    fs.mkdirSync(pathtmp, mode);
                    var ret = fs.existsSync(pathtmp);
                    if (!ret) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
}
exports.DIR = DIR;
function arrayRandom(a, remove = false) {
    var rIndex = Math.floor(Math.random() * a.length);
    var v = a[rIndex];
    if (remove)
        a.splice(rIndex, 1);
    return v;
}
exports.arrayRandom = arrayRandom;
var TeMath;
(function (TeMath) {
    // 正态分布表 0 到 3.9
    var gaussian_table = [
        0.5, 0.503989356, 0.507978314, 0.511966473, 0.515953437, 0.519938806, 0.523922183, 0.52790317, 0.531881372, 0.535856393,
        0.539827837, 0.543795313, 0.547758426, 0.551716787, 0.555670005, 0.559617692, 0.563559463, 0.567494932, 0.571423716, 0.575345435,
        0.579259709, 0.583166163, 0.587064423, 0.590954115, 0.594834872, 0.598706326, 0.602568113, 0.606419873, 0.610261248, 0.614091881,
        0.617911422, 0.621719522, 0.625515835, 0.629300019, 0.633071736, 0.636830651, 0.640576433, 0.644308755, 0.648027292, 0.651731727,
        0.655421742, 0.659097026, 0.662757273, 0.666402179, 0.670031446, 0.67364478, 0.67724189, 0.680822491, 0.684386303, 0.687933051,
        0.691462461, 0.694974269, 0.698468212, 0.701944035, 0.705401484, 0.708840313, 0.712260281, 0.715661151, 0.719042691, 0.722404675,
        0.725746882, 0.729069096, 0.732371107, 0.735652708, 0.7389137, 0.742153889, 0.745373085, 0.748571105, 0.75174777, 0.754902906,
        0.758036348, 0.761147932, 0.764237502, 0.767304908, 0.770350003, 0.773372648, 0.776372708, 0.779350054, 0.782304562, 0.785236116,
        0.788144601, 0.791029912, 0.793891946, 0.796730608, 0.799545807, 0.802337457, 0.805105479, 0.807849798, 0.810570345, 0.813267057,
        0.815939875, 0.818588745, 0.82121362, 0.823814458, 0.82639122, 0.828943874, 0.831472393, 0.833976754, 0.836456941, 0.83891294,
        0.841344746, 0.843752355, 0.84613577, 0.848494997, 0.85083005, 0.853140944, 0.8554277, 0.857690346, 0.85992891, 0.862143428,
        0.864333939, 0.866500487, 0.868643119, 0.870761888, 0.872856849, 0.874928064, 0.876975597, 0.878999516, 0.880999893, 0.882976804,
        0.88493033, 0.886860554, 0.888767563, 0.890651448, 0.892512303, 0.894350226, 0.896165319, 0.897957685, 0.899727432, 0.901474671,
        0.903199515, 0.904902082, 0.906582491, 0.908240864, 0.909877328, 0.911492009, 0.913085038, 0.914656549, 0.916206678, 0.917735561,
        0.919243341, 0.920730159, 0.922196159, 0.92364149, 0.9250663, 0.92647074, 0.927854963, 0.929219123, 0.930563377, 0.931887882,
        0.933192799, 0.934478288, 0.935744512, 0.936991636, 0.938219823, 0.939429242, 0.940620059, 0.941792444, 0.942946567, 0.944082597,
        0.945200708, 0.946301072, 0.947383862, 0.948449252, 0.949497417, 0.950528532, 0.951542774, 0.952540318, 0.953521342, 0.954486023,
        0.955434537, 0.956367063, 0.957283779, 0.958184862, 0.959070491, 0.959940843, 0.960796097, 0.96163643, 0.96246202, 0.963273044,
        0.964069681, 0.964852106, 0.965620498, 0.966375031, 0.967115881, 0.967843225, 0.968557237, 0.969258091, 0.969945961, 0.97062102,
        0.97128344, 0.971933393, 0.97257105, 0.973196581, 0.973810155, 0.97441194, 0.975002105, 0.975580815, 0.976148236, 0.976704532,
        0.977249868, 0.977784406, 0.978308306, 0.97882173, 0.979324837, 0.979817785, 0.98030073, 0.980773828, 0.981237234, 0.9816911,
        0.982135579, 0.982570822, 0.982996977, 0.983414193, 0.983822617, 0.984222393, 0.984613665, 0.984996577, 0.985371269, 0.985737882,
        0.986096552, 0.986447419, 0.986790616, 0.987126279, 0.987454539, 0.987775527, 0.988089375, 0.988396208, 0.988696156, 0.988989342,
        0.98927589, 0.989555923, 0.989829561, 0.990096924, 0.99035813, 0.990613294, 0.990862532, 0.991105957, 0.991343681, 0.991575814,
        0.991802464, 0.99202374, 0.992239746, 0.992450589, 0.992656369, 0.992857189, 0.993053149, 0.993244347, 0.993430881, 0.993612845,
        0.993790335, 0.993963442, 0.994132258, 0.994296874, 0.994457377, 0.994613854, 0.994766392, 0.994915074, 0.995059984, 0.995201203,
        0.995338812, 0.995472889, 0.995603512, 0.995730757, 0.995854699, 0.995975411, 0.996092967, 0.996207438, 0.996318892, 0.996427399,
        0.996533026, 0.99663584, 0.996735904, 0.996833284, 0.996928041, 0.997020237, 0.997109932, 0.997197185, 0.997282055, 0.997364598,
        0.99744487, 0.997522925, 0.997598818, 0.9976726, 0.997744323, 0.997814039, 0.997881795, 0.997947641, 0.998011624, 0.998073791,
        0.998134187, 0.998192856, 0.998249843, 0.99830519, 0.998358939, 0.99841113, 0.998461805, 0.998511001, 0.998558758, 0.998605113,
        0.998650102, 0.998693762, 0.998736127, 0.998777231, 0.998817109, 0.998855793, 0.998893315, 0.998929706, 0.998964997, 0.998999218
    ];
    /**
     * 查询正态分布表
     * @param index
     */
    function get_gaussian_distribution_table(index) {
        var index = Math.abs(index);
        if (index >= 0 && index < 4) {
            return gaussian_table[Math.floor(index * 100) / 100];
        }
        else {
            return 0;
        }
    }
    TeMath.get_gaussian_distribution_table = get_gaussian_distribution_table;
    /**
    * 查询正态分布表
    * @param index
    */
    function get_gaussian_distribution_table_reverse(rate) {
        var use_rate = rate;
        if (rate < 0.5) {
            use_rate = 1 - rate;
        }
        var out_index = gaussian_rate_find(use_rate) / 100 * 4;
        if (rate < 0.5) {
            return -out_index;
        }
        return out_index;
    }
    TeMath.get_gaussian_distribution_table_reverse = get_gaussian_distribution_table_reverse;
    function gaussian_rate_find(v) {
        var Ia = 0, Ib = gaussian_table.length - 1;
        // 判断头
        if (gaussian_table[Ia] == v) {
            return Ia;
        }
        // 判断尾
        if (gaussian_table[Ib] <= v) {
            return Ib;
        }
        while (true) {
            if (Ia == Ib || Ia + 1 == Ib) {
                return Ia;
            }
            var Ic = Math.floor((Ia + Ib) / 2);
            var gv = gaussian_table[Ic];
            if (gv == v) {
                return Ic;
            }
            else if (gv < v) {
                Ia = Ic;
            }
            else if (gv > v) {
                Ib = Ic;
            }
        }
    }
    function stdev(...args) {
        if (args.length <= 1) {
            return 0;
        }
        var total_score = 0;
        for (var i = 0; i < args.length; i++) {
            total_score += args[i];
        }
        var per_socre = total_score / args.length;
        var total_diff_x = 0;
        for (var i = 0; i < args.length; i++) {
            total_diff_x += (args[i] - per_socre) * (args[i] - per_socre);
        }
        return Math.sqrt(total_diff_x / (args.length - 1));
    }
    TeMath.stdev = stdev;
})(TeMath = exports.TeMath || (exports.TeMath = {}));
function emojiFilter(str = '') {
    var out_str = '';
    for (var i = 0; i < str.length; i++) {
        var _c = str[i].charCodeAt(0);
        if (_c >= 0xD800 && _c <= 0xDBFF) {
            i++;
            continue;
        }
        out_str += str[i];
    }
    return out_str;
}
exports.emojiFilter = emojiFilter;
function objToArray(obj) {
    var out_arr = [];
    for (var key in obj) {
        out_arr.push(key);
        out_arr.push(obj[key]);
    }
    return out_arr;
}
exports.objToArray = objToArray;
//# sourceMappingURL=TeTool.js.map