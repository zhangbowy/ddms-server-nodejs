import { HashMap, TeMap } from './TeTool';
import { readFileSync } from 'fs';
// 这个是处理大区和和平台之间的关系的

// 需要有一个特殊的配置关系,对应闪电玩的chanel 和 大区的id 和 名字简称

interface ifChannelConf {
    channels: string[];      // 闪电玩的chanel
    idlist: string[];    // 对应的逻辑服id
    name: string;        // 名称或者说是备注
}

// 这个信息一般存在登陆服上面，然后每个服务器定期获取一下 暂时这么说

class ChannelMgr {

    /**
     * channel 对应的配置 逻辑服
     */
    private channelHashMap: TeMap<ifChannelConf> = new TeMap<ifChannelConf>();

    /**
     * 逻辑服对应的 channel
     */
    private ID2Channel: TeMap<ifChannelConf> = new TeMap<ifChannelConf>();

    //默认的一个，只要没有找到的都推送这个
    private default = {
        channels: [],
        idlist: ['W001'],
        name: 'sdw'
    }

    constructor() {

    }

    private _get_configs() {

    }

    private _parse_config() {
        // 这里建立正反向的关系,方便查询
        try {
            var t1: TeMap<ifChannelConf> = new TeMap<ifChannelConf>();
            var t2: TeMap<ifChannelConf> = new TeMap<ifChannelConf>();
            var conf = readFileSync('chanels.json');
            var p_r = JSON.parse(conf.toString()).lists as ifChannelConf[];
            for (var i = 0; i < p_r.length; i++) {
                var r_one = p_r[i];
                if (!r_one) {
                    continue;
                }

                if (!r_one.channels || r_one.channels.length == 0) {
                    continue;
                }

                if (!r_one.idlist || r_one.idlist.length == 0) {
                    continue;
                }

                for (var j = 0; j < r_one.channels.length; j++) {
                    t1.set(r_one.channels[j], r_one);
                }

                for (var j = 0; j < r_one.idlist.length; j++) {
                    t2.set(r_one.channels[j], r_one);
                }
            }

            this.channelHashMap = t1;
            this.ID2Channel = t2;
        }
        catch (e) {

        }
    }

    find_channel(channel: string) {
        var r = this.channelHashMap.has(channel);
        if (!r) {
            return this.default;
        }

        return r;
    }

    find_ID(id: string) {
        var r = this.ID2Channel.has(id);
        if (!r) {
            return this.default;
        }

        return r;
    }
}

export var channelMgrInst = new ChannelMgr();