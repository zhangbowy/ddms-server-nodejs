import { ListMap, TeMap } from "../lib/TeTool";

export interface ifRoomNotice {
    uid: number,
    pvp_level: number,
    icon: string,
    avatar: any,
    name: string,
    ready: boolean
}

interface ifRoomPlayer {
    uid: number,
    /**是否准备好了 */
    ready: boolean,
    mode: string,
    /**房间号 */
    _hash_?: string,
    /**房间位置 */
    _pos_?: number
}

let pools: { [plt: string]: matchRoomMgr } = {};
export function MatchRoomPlt(plt: string) {
    if (!pools.hasOwnProperty(plt)) {
        pools[plt] = new matchRoomMgr(plt);
    }

    return pools[plt];
}

class matchRoomMgr {
    private plt: string;
    m_pool: ListMap<ifRoomPlayer> = new ListMap();

    m_lockRoom: TeMap<string> = new TeMap();

    constructor(plt: string) {
        this.plt = plt;
    }

    is_lock_room(roomid: string) {
        if (this.m_lockRoom.get(roomid)) {
            return true;
        }

        return false;
    }

    get_room(roomid: string) {
        let infos: ifRoomPlayer[] = [];
        let uinfos = this.m_pool.getL(roomid);
        let uids: number[] = [];
        for (let i = 0; i < uinfos.length; i++) {
            let r = this.m_pool.getT(uinfos[i]);
            r && infos.push(r);
            uids.push(parseInt(uinfos[i]));
        }
        return { users: infos, islock: this.m_lockRoom.get(roomid) ? true : false, uids: uids }
    }

    /**
     * 查找玩家
     * @param uid
     */
    get_user(uid: string | number) {
        return this.m_pool.getT(uid);
    }

    join_room(roomid: string, uid: number, mode: string) {
        return this.m_pool.add(roomid, uid, { uid: uid, mode: mode, ready: false });
    }

    leave_room(uid: number) {
        this.m_pool.del(uid);
    }

    lock_unlock(roomid: string, owner: number, lock: boolean) {
        if (!lock) {
            if (this.m_lockRoom.get(roomid)) {
                this.m_lockRoom.del(roomid);
                return true;
            }
        }
        else {
            this.m_lockRoom.set(roomid, owner.toString());
            return true;
        }
        return false;
    }
}