import { TeMap } from "../lib/TeTool";

interface ifUint {
    /**
     * 玩家id
     */
    uid: number;

    /**
     * 链接id
     */
    nid: string;

    /**
     * 比赛id
     */
    rid: string;

    blive: boolean;
}

class PlayerMgr {
    constructor() {

    }

    maps: TeMap<ifUint> = new TeMap<ifUint>();

    /**
     * 绑定单位信息
     * @param uid 
     * @param nid 
     * @param rid 
     */
    bindPlayer(uid: number, nid: string, rid: string, live: boolean) {
        // this.maps.push({
        //     uid: uid,
        //     nid: nid,
        //     rid: rid,
        //     blive: live
        // });

        // 清理掉老的缓存绑定
        // 清理老的会导致推完要等3分钟bug，故注释
        // let ks = this.maps.keys;
        // for (let k in ks) {
        //     let r_k = this.maps.get(ks[k]);
        //     if (r_k && r_k.uid == uid) {
        //         r_k.uid = 0;
        //     }
        // }

        this.maps.set(nid, {
            uid: uid,
            nid: nid,
            rid: rid,
            blive: live
        });
    }

    find_Nid(nid: string, live: boolean = false) {
        var r = this.maps.get(nid);
        if (!r) return null;
        if (r.blive && !live) return null;
        return r;
    }

    //由于清理旧缓存的代码被注释，所以可能查到的是旧的,引用是要注意
    find_Uid(uid: number) {
        return this.find('uid', uid);
    }

    find(key: string, v: number | string) {
        let keys = this.maps.keys;
        for (var i = 0; i < keys.length; i++) {
            var rInfo = this.maps.get(keys[i]);
            if (rInfo && rInfo[key] == v) {
                return rInfo;
            }
        }
        return null;
    }

    clearPlayer(uid: number) {
        let nids = [];
        let keys = this.maps.keys;
        for (var i = 0; i < keys.length; i++) {
            var rInfo = this.maps.get(keys[i]);
            if (rInfo && rInfo.uid == uid) {
                nids.push(keys[i]);
            }
        }

        for (let i = 0; i < nids.length; i++) {
            this.maps.del(nids[i]);
        }

        return;
    }
}

export var playerMgrInst = new PlayerMgr();