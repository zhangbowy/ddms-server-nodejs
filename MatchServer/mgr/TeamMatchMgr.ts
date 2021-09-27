import { SeRacePvp, SeLogicFormation, SeRaceOpp, LiveMode, if_sys_, if_pvp_match_info, RoomType } from '../SeDefine';
import { netInst } from '../NetMgr/SeNetMgr';
import { matchInst, changeElo } from './Pvpv726';
import { serverMgrInst, DefineSType } from '../serverMgr';
import { TeMap, orderListFind, HashMap, TeMath, arrayRandom, arrayRandomT, isRandom } from '../lib/TeTool';
import { resMgrInst,SeResUnitEx } from '../ResMgr/SeResMgr';
import { createHash, Hash } from 'crypto';
import { configInst } from '../lib/TeConfig';
import { RoomMatchInst } from './RoomMatch';
import { liveInst } from './LiveMgr';
import { TeamRoomInst_2v2, PvPRoomMgrInst, TeamRoomInst_1v2 } from './TeamRoomMgr';
import { pltMgrInst } from './PltMgr';
import { robotNameInst } from '../ResMgr/RobotName';
import { SeEnumequipattreType, SeResLordAIinfo, SeEnumUnitiSoldierType } from '../Res/interface';
// 玩家2v2的时候可以组队参与

// 匹配有两个组成部分，一是找队手队友，二是和队友组成一个队伍

// 第一步组队的时候有两种方式，一个是匹配机制匹配一个队友 二是外部组队完成后添加进来的

interface MeTeamMate {
    /**
     * 玩家的id
     */
    uid: number,
    /**
     * 玩家对应的逻辑服务器id
     */
    // sid: string,

    /**
     * 双匹配的分数
     */
    pvp_score?: number,

    /**
     * formation
     */
    raceinfo: SeRaceOpp,
    bindinfo?: Array<MeTeamMate>,

    enter_time?: number,
    _sys_: if_sys_,
    bTeam: boolean,
}


class olmatch {
    private _math_count = 4;
    private match_type = '2v2';
    private pvp_score_range = 100;
    private pvp_level_range = 10;

    private init_hero_success = false;
    private fix_heros : Array<Array<SeResUnitEx>>  = []; //固定卡池
    private random_heros = [];  //除固定外随机卡池
    private tmp_heros = [];    //临时卡池，数据和fix_heros相同，方便排除处理
    private orange_heros = []; //除固定外金卡卡池，用于保底抽取
    onlineMatcher: HashMap<MeTeamMate> = new HashMap<MeTeamMate>();

    constructor(math_count, match_type) {
        if(match_type) this.match_type = match_type;
        if(math_count) this._math_count = math_count;
        this.pvp_score_range = configInst.get('pvp_score_range') || this.pvp_score_range;
        configInst.regist_listen_config('pvp_score_range', this, () => {
            this.pvp_score_range = configInst.get('pvp_score_range') || this.pvp_score_range;
        })
    }

    public score_k = 0;

    public online_teammatch(nid: string, _sys_: if_sys_, teaminfos: { sid: string, uid: number, rp: SeRaceOpp }[], type) {
        if (teaminfos.length < 2) {
            var pscore = 1000;
            var mp: MeTeamMate = {
                uid: teaminfos[0].uid,
                pvp_score: 1000,
                raceinfo: teaminfos[0].rp,
                enter_time: Date.now(),
                _sys_: _sys_,
                bTeam: false
            }

            // 匹配玩家按照实力分区
            this.enter_match(mp);
            // this.randlist(type, mp._sys_, mp.uid, mp.raceinfo.pvp_level);
        }
        else {
            var pscore = 1000;
            var mp: MeTeamMate = {
                uid: teaminfos[0].uid,
                pvp_score: 1000,
                raceinfo: teaminfos[0].rp,
                bindinfo: [],
                enter_time: Date.now(),
                _sys_: _sys_,
                bTeam: true
            }
            for(let i = 1; i < teaminfos.length; i++){
                mp.bindinfo.push({
                    uid: teaminfos[i].uid,
                    raceinfo: teaminfos[i].rp,
                    _sys_: {
                        serverid: teaminfos[i].sid,
                        plt: _sys_.plt,
                    },
                    bTeam: true
                });
            }
            // 匹配玩家按照实力分区
            this.enter_match(mp);

            // var ra = { pvp_level: mp.bindinfo.raceinfo.pvp_level, icon: mp.bindinfo.raceinfo.Icon, name: mp.bindinfo.raceinfo.Name };
            // var rb = { pvp_level: mp.raceinfo.pvp_level, icon: mp.raceinfo.Icon, name: mp.raceinfo.Name };
            // this.randlist(type, mp.bindinfo._sys_, mp.bindinfo.uid, mp.bindinfo.raceinfo.pvp_level, rb);
            // this.randlist(type, mp._sys_, mp.uid, mp.raceinfo.pvp_level, ra);
        }

    }

    private _last_join = {};

    public online_match(...args);
    public online_match(nid: string, _sys_: if_sys_, uid: number, formation: if_pvp_match_info, name: string, level: number, icon: string, avatar: any, medals: Array<string>, pvp_score: number, pvp_level: number, ext_score: number, mode: string, winStreakCount: number) {
        if (this._last_join[uid.toString()] && (this._last_join[uid.toString()] + 2000 > Date.now())) {
            console.log("2v2 repeat join " + uid + "Time:" + Date.now());
            return;
        }

        if (liveInst.is_in_racing(uid, nid)) {
            return;
        }

        this._last_join[uid.toString()] = Date.now();

        this._online_cancell(_sys_, nid, uid, pvp_score);
        // pvp_score = 1000;
        var sInfo = serverMgrInst.find_server(nid);
        var racep: SeRaceOpp = {
            Id: uid,
            Name: name,
            areaid:formation.areaid,
            Formation: formation.h_f,
            Boss: formation.b_f,
            battleEquip: formation.battleEquip,
            pvp_score: pvp_score,
            pvp_level: pvp_level,
            castle_level: level,
            winStreakCount: winStreakCount,
            Icon: icon,
            synccheck:formation.synccheck,
            avatar: avatar,
            medals: medals,
            _plt_: _sys_.plt,
            lordUnit: formation.lordUnit,
            pve: formation.pve,
            is_vip: formation.is_vip,
            vip_level: formation.vip_level,
            heros_skin: formation.heros_skin,
            guild_info: formation.guild_info,
        }

        var rserver = serverMgrInst.find_server(nid);
        if (!rserver) {
            console.log("2v2 server no find " + uid + "Time:" + Date.now());
            return;
        }
        var mp: MeTeamMate = {
            uid: uid,
            pvp_score: 1000,
            raceinfo: racep,
            enter_time: Date.now(),
            _sys_: _sys_,
            bTeam: false,
        }

        // 匹配玩家按照实力分区
        this.enter_match(mp);
        this.randlist(this.match_type, mp._sys_, mp.uid, mp.raceinfo.pvp_level);
    }

    public enter_match(mp: MeTeamMate) {
        // console.log('enter' + mp.uid);
        var floor = 0;
        if(this.match_type == RoomType.N_1v2 && mp.raceinfo.index != null){
            if(mp.raceinfo.index == 0){
                this._match_offline_(mp._sys_, mp._sys_.serverid, mp.uid, mp.raceinfo);
                return;
            }
            floor = mp.raceinfo.index;
        }
        else{
            floor = Math.floor(mp.pvp_score / this.pvp_level_range);
        }
        this.onlineMatcher.add(floor, mp);
    }

    /**
     * 1v2新手场人机
     * @param uid 
     * @param score 
     * @param winCount 
     */
    private _match_offline_(_sys_: if_sys_, sid: string, uid, raceinfo) {
        //赤壁之战卡池随机
        var formation = this.random_1v2_formation();
        let new_formation = [];
        for(let i = 0; i <=2; i++){
            let tmp = [];
            for(let k = 0; k < formation[i].length; k++){
                tmp.push({ kHeroID: formation[i][k].kID, iLevel: resMgrInst('sdw').getHeroPerLevel(formation[i][k].kID), kSkin: null });
            }
            new_formation.push(tmp);
        }
        var raceOpps: Array<SeRaceOpp> = [];

        let raceOppA: SeRacePvp = {
            Id: uid,
            Name: raceinfo.Name,
            areaid:raceinfo.areaid,
            Formation: new_formation[0],
            Boss: raceinfo.Boss,
            pvp_score: raceinfo.pvp_score,
            pvp_level: raceinfo.pvp_level,
            castle_level: raceinfo.castle_level,
            battleEquip: raceinfo.battleEquip,
            winStreakCount: raceinfo.winStreakCount,
            Icon: raceinfo.Icon,
            avatar: raceinfo.avatar,
            medals: raceinfo.medals,
            synccheck: raceinfo.synccheck,
            rurl: '',
            checkKey: this._gen_check_key(),
            sid: _sys_.serverid,
            _plt_: _sys_.plt,
            optime: Date.now(),
            bTeam: false,
            lordUnit: raceinfo.lordUnit,
            is_vip: raceinfo.is_vip,
            vip_level: raceinfo.vip_level,
            beans_1v2: raceinfo.beans_1v2,
            back_1v2_formation: [],
            index: raceinfo.index,
            guild_info: raceinfo.guild_info,
        }
        raceOpps.push(raceOppA);
        raceOpps.push(this.getPveRobot_1v2(_sys_, new_formation[1], raceinfo.castle_level, raceinfo.pvp_level, raceinfo.pvp_score, raceinfo.lordUnit.wear_equips));
        raceOpps.push(this.getPveRobot_1v2(_sys_, new_formation[2], raceinfo.castle_level, raceinfo.pvp_level, raceinfo.pvp_score, raceinfo.lordUnit.wear_equips));
        var sn = serverMgrInst.get_server(sid);
        if (!sn) {
            sn = serverMgrInst.get_server(_sys_.serverid);
        }
        if (!sn) return;

        var startGame = {
            cmd: 'pve_1v2',
            uid: uid,
            mode: '1v2',
            rmode: LiveMode.pvp_1v2,
            raceinfo: raceOpps,
            formation: new_formation[0],
        };

        netInst.sendData(startGame, sn.nid);
        return;
    }

    public randlist(mode: string, _sys: if_sys_, uid: number, level: number, bindinfo?: [{ pvp_level: number, icon: string, name: string }]) {
        var s = serverMgrInst.get_server(_sys.serverid);
        s && netInst.sendData({ cmd: 'randlist', mode: mode, uid: uid, list: matchInst.get_rand_list_(_sys, level, uid), bind: bindinfo }, s.nid);
    }

    public cancell_ret(mode: string, sid: string, uid: number) {
        var s = serverMgrInst.get_server(sid);
        s && netInst.sendData({ cmd: 'cancell', mode: mode, uid: uid }, s.nid);
    }

    public _online_cancell(_sys_: if_sys_, nid: string, uid: number, score: number) {
        // 判断一下自己是不是组队的，组队的那么就清理掉
        var keys = this.onlineMatcher.keys;
        for (var i = 0; i < keys.length; i++) {
            var rk = keys[i];
            var player = this.onlineMatcher.find(rk, 'uid', uid)[0];
            if (!player) {
                player = this.onlineMatcher.find(rk, 'bindinfo.uid', uid)[0];
            }

            if (player) {
                // 如果取消的玩家有绑定另外一个人的话，要连同绑定的玩家取消掉
                if (player.bindinfo) {
                    for(let i = 0; i < player.bindinfo.length; i++){
                        this.cancell_ret(this.match_type, player.bindinfo[i]._sys_.serverid, player.bindinfo[i].uid);
                    }
                }

                this.cancell_ret(this.match_type, player._sys_.serverid, player.uid);
                this.onlineMatcher.find2Del(rk, 'uid', player.uid);
            }
        }

        TeamRoomInst_2v2.race_finish(uid);
        TeamRoomInst_1v2.race_finish(uid);
        PvPRoomMgrInst.race_finish(uid);
    }

    /**
     * 找到队长
     */
    public find_team_owner(uid: number) {
        // 判断一下自己是不是组队的，组队的那么就清理掉
        var keys = this.onlineMatcher.keys;
        for (var i = 0; i < keys.length; i++) {
            var rk = keys[i];
            var player = this.onlineMatcher.find(rk, 'uid', uid)[0];
            if (!player) {
                player = this.onlineMatcher.find(rk, 'bindinfo.uid', uid)[0];
            }

            if (player) {
                // 如果取消的玩家有绑定另外一个人的话，要连同绑定的玩家取消掉
                if (player.bindinfo) {
                    for(let i = 0; i < player.bindinfo.length; i++){
                        this.randlist('cancell', player.bindinfo[i]._sys_, player.bindinfo[i].uid, 0);
                    }
                }

                this.randlist('cancell', player._sys_, player.uid, 0);
            }

            this.onlineMatcher.find2Del(rk, 'uid', player.uid);
        }
    }

    public update() {
        var keys = this.onlineMatcher.keys;
        if(this._math_count == 3 && !this.init_hero_success){
            this.init_hero_1v2();
        }
        // 匹配都是从最低的池子开始匹配，随机判断是否向上匹配
        for (var i = 0; i < keys.length; i++) {
            this._real_match_(parseInt(keys[i]));
        }
    }

    private _real_match_(range: number) {
        // 找到这个分值内的所有玩家
        let match_list: Array<MeTeamMate> = [];

        let floor_range = Math.floor(this.pvp_score_range / this.pvp_level_range);
        //房间匹配暂时没有分差波动，所以设为0
        floor_range = 0;
        for (let i = -floor_range * 2; i <= floor_range * 2; i++) {
            let players = this.onlineMatcher.get(i + range);

            let unmatch_list = [];
            for (let j = 0; j < players.length; j++) {
                let r_match = players[j];
                let count = Math.floor((Date.now() - r_match.enter_time) / 1000);
                match_list.push(r_match);
            }

            if (unmatch_list.length > 0) {
                this.onlineMatcher.set(i + range, unmatch_list);
            }
            else {
                this.onlineMatcher.del(i + range);
            }
        }


        // 然后打乱一下排序
        match_list['shuffle']();

        match_list = this._create_race(match_list);

        for (let i = 0; i < match_list.length; i++) {
            let mp = match_list[i];
            var floor = 0;
            if(this.match_type == RoomType.N_1v2 && mp.raceinfo.index != null){
                if(mp.raceinfo.index == 0){
                    return;
                }
                floor = mp.raceinfo.index;
            }
            else{
                floor = Math.floor(mp.pvp_score / this.pvp_level_range);
            }
            this.onlineMatcher.add(floor, mp);
        }
    }

    private _gen_check_key() {
        let key = 'ck' + Math.floor(Math.random() * 2000) + Date.now();
        return key;
    }

    private _shift(in_: MeTeamMate[], out_: MeTeamMate[]) {
        if (in_.length == 0) return;
        out_.push(in_.shift());

        this._pop(in_, out_);
    }

    private _pop(in_: MeTeamMate[], out_: MeTeamMate[]) {
        if (in_.length == 0) return;
        out_.push(in_.pop());

        this._shift(in_, out_)
    }

    private _alist(infos: MeTeamMate[]) {
        let out = [];
        let tp = infos.sort((a: MeTeamMate, b: MeTeamMate) => {
            if (a.raceinfo.pvp_score > b.raceinfo.pvp_score) return 1;
            else if (a.raceinfo.pvp_score < b.raceinfo.pvp_score) {
                return -1;
            }

            return a.uid > b.uid ? 1 : -1
        });

        this._shift(tp, out);
        return out;
    }

    //初始化赤壁之战随机池
    private init_hero_1v2(){
        let res = resMgrInst('sdw').getConfig('ChibiUnitID');
        //禁牌
        let fobidden = resMgrInst('sdw').getConfig('ChibiFobidden');
        if(res && !this.init_hero_success){
            let hero_type = res.split('|');
            //每个流派有固定的卡牌
            for(let i = 0; i < hero_type.length; i++){
                //此类型无固定卡牌，全部随机
                if(!hero_type[i]){
                    this.fix_heros[i] = null;
                    continue;
                }
                this.fix_heros[i] = [];
                let heros = hero_type[i].split(',');
                for(let k = 0; k < heros.length; k++){
                    let unit = resMgrInst('sdw').UnitRes.getRes(heros[k]);
                    this.fix_heros[i].push(unit);
                    this.tmp_heros.push(unit);
                }
            }
            let all_hero = resMgrInst('sdw').UnitRes.getResBy((unit=>unit.iLord == 0 && unit.iOpenGrade > 0 && unit.iSoldierType != 4));
            for(let i = 0; i < all_hero.length; i++){
                if(fobidden.indexOf(all_hero[i].kID) >= 0){
                    //禁牌不加入随机池
                   continue;
                }
                if(this.tmp_heros.indexOf(all_hero[i]) < 0){
                    this.random_heros.push(all_hero[i]);
                    if(all_hero[i].iColour == 4){
                        this.orange_heros.push(all_hero[i]);
                    }
                }
            }
            this.init_hero_success = true;
        }
    }

    private random_1v2_formation(){
        var formation = [[],[],[],[],[],[]];
        if(this._math_count == 3){
            let fix_heros = this.fix_heros.slice();
            let random_heros = this.random_heros.slice();
            let orange_heros = this.orange_heros.slice();
            //总共随机6次，有3次是备用的
            for(let i = 0; i < 6; i++){
                let can_duplicate = isRandom(Number(resMgrInst('sdw').getConfig('ChibiRepeat').split(',')[0]) * 10000);
                let orange_num = 0;
                let lucky_fix = arrayRandom(fix_heros, true);
                //空的话设置空数组，方便后面处理
                if(!lucky_fix) lucky_fix = [];
                for(let j = 0; j < lucky_fix.length; j++){
                    if(lucky_fix[j].iColour == 4) orange_num++;
                    formation[i].push(lucky_fix[j]);
                }
                let duplicate_count = 1;
                for(let j = lucky_fix.length; j < 8; j++){
                    //2个金卡保底
                    if(j + 2 - orange_num >= 8 && orange_heros.length > 0){
                        let lucky_hero = arrayRandom(orange_heros, true);
                        random_heros.splice(random_heros.indexOf(lucky_hero), 1);
                        orange_num++;
                        formation[i].push(lucky_hero);
                    }
                    else{
                        //判断是否需要重复卡牌,最多重复4次，法术卡牌不重复
                        if(can_duplicate && j > lucky_fix.length){
                            let duplicate = isRandom(Number(resMgrInst('sdw').getConfig('ChibiRepeat').split(',')[1]) * 10000);
                            if(duplicate && duplicate_count < 4 && formation[i][j-1].iSoldierType != SeEnumUnitiSoldierType.FaShu){
                                formation[i].push(formation[i][j-1]);
                                duplicate_count++; //增加重复次数,最多重复4次
                                continue;
                            }
                        }
                        duplicate_count = 1; //重置重复次数
                        let lucky_hero = arrayRandom(random_heros, true);
                        if(lucky_hero.iColour == 4){
                            orange_heros.splice(orange_heros.indexOf(lucky_hero), 1);
                            orange_num++;
                        }
                        formation[i].push(lucky_hero);
                    }
                   
                }
                
            }
        }
        return formation;
    }
    private _send_race(infos: MeTeamMate[], mode: LiveMode): string {
        let plt: string = infos[0]._sys_.plt;
        let rLink = null;

        for (let i = 0; i < infos.length; i++) {
            rLink = serverMgrInst.randomServer(DefineSType.race, plt);
            if (rLink) break;
        }

        if (!rLink) {
            return null;
        }

        // 这里需要确认一下是否存在队伍 把一个队伍的人放在一边 否则需要最大最小的在一起
        let mb: MeTeamMate[] = [];
        if (infos.length < this._math_count) {
            let atids: MeTeamMate[] = [];
            // 表示这里存在队伍
            for (let i = 0; i < infos.length; i++) {
                let r = infos[i];
                if (r.bindinfo) {
                    mb.unshift(r);
                    for(let i = 0; i < r.bindinfo.length; i++){
                        mb.unshift(r.bindinfo[i]);
                    }
                }
                else {
                    mb.push(r);
                }
            }
        }
        else {
            mb = infos;//this._alist(infos);
        }
        let pes1 = 0;
        let pes2 = 0;
        if(this.match_type == RoomType.N_2v2){
            pes1 = Math.floor(Math.pow(TeMath.stdev(mb[0].raceinfo.pvp_score, mb[1].raceinfo.pvp_score), 1 + this.score_k) + Math.min(mb[0].raceinfo.pvp_score, mb[1].raceinfo.pvp_score));
            pes2 = Math.floor(Math.pow(TeMath.stdev(mb[2].raceinfo.pvp_score, mb[3].raceinfo.pvp_score), 1 + this.score_k) + Math.min(mb[2].raceinfo.pvp_score, mb[3].raceinfo.pvp_score));   
        }
        //赤壁之战卡池随机
        var formation = this.random_1v2_formation();
        formation.sort(function () {
            return Math.random() - 0.5;
         });
        //备选卡组打乱顺序
        let back_formations = formation.slice(3);
        back_formations.sort(function () {return Math.random() - 0.5;});

        let synccheck = false;
        let raceInfos: SeRacePvp[] = [];
        for (let i = 0; i < mb.length; i++) {
            let vA = mb[i];
            let new_formation = [];
            let back_1v2_formation = [];
            if(this._math_count == 3){
                //先选出正选卡牌
                for(let k = 0; k < formation[i].length; k++){
                    new_formation.push({ kHeroID: formation[i][k].kID, iLevel: resMgrInst('sdw').getHeroPerLevel(formation[i][k].kID), kSkin: vA.raceinfo.heros_skin[formation[i][k].kID]? vA.raceinfo.heros_skin[formation[i][k].kID]['cur_skin'] : null });
                }
                for(let k = 0; k < back_formations[i].length; k++){
                    back_1v2_formation.push({ kHeroID: back_formations[i][k].kID, iLevel: resMgrInst('sdw').getHeroPerLevel(back_formations[i][k].kID), kSkin: vA.raceinfo.heros_skin[back_formations[i][k].kID]? vA.raceinfo.heros_skin[back_formations[i][k].kID]['cur_skin'] : null });
                }
            }
            else {
                new_formation = vA.raceinfo.Formation;
            }
            let raceOppA: SeRacePvp = {
                Id: vA.uid,
                Name: vA.raceinfo.Name,
                areaid:vA.raceinfo.areaid,
                Formation: new_formation,
                Boss: vA.raceinfo.Boss,
                pvp_score: vA.raceinfo.pvp_score,
                pvp_level: vA.raceinfo.pvp_level,
                castle_level: vA.raceinfo.castle_level,
                battleEquip: vA.raceinfo.battleEquip,
                winStreakCount: vA.raceinfo.winStreakCount,
                Icon: vA.raceinfo.Icon,
                avatar: vA.raceinfo.avatar,
                medals: vA.raceinfo.medals,
                synccheck:vA.raceinfo.synccheck,
                rurl: rLink.url,
                checkKey: this._gen_check_key(),
                sid: vA._sys_.serverid,
                _plt_: mb[i]._sys_.plt,
                bTeam: mb[i].bTeam,
                optime: Date.now(),
                lordUnit: vA.raceinfo.lordUnit,
                is_vip: vA.raceinfo.is_vip,
                vip_level: vA.raceinfo.vip_level,
                beans_1v2: vA.raceinfo.beans_1v2,
                back_1v2_formation: back_1v2_formation,
                index: vA.raceinfo.index,
                guild_info: vA.raceinfo.guild_info,
            }
            if(vA.raceinfo.synccheck){
                synccheck = true;
            }

            raceInfos.push(raceOppA);
        }

        let rid = createHash('md5').update(JSON.stringify(raceInfos) + Date.now()).digest('hex');
        let liveKey = this._gen_check_key();

        let racever = resMgrInst(plt).getConfig('racever');

        netInst.sendData({
            cmd: 'startonline',
            raceinfos: raceInfos,
            rid: rid,
            livekey: liveKey,
            rmode: mode,
            racever: racever,
            stritc: (resMgrInst(plt).getConfig('race_stritc') == '1') ? true : synccheck,
        }, rLink.nid);

        for (let i = 0; i < raceInfos.length; i++) {
            let vA = mb[i];
            let raceOppA = raceInfos[i];

            netInst.sendData({
                cmd: 'joinonline',
                checkKey: raceOppA.checkKey,
                rurl: raceOppA.rurl,
                rid: rid,
                uid: raceOppA.Id,
                oscore: (i < 2) ? pes2 : pes1,
                mode: this.match_type,
                rmode: mode
            }, serverMgrInst.get_server(vA._sys_.serverid).nid);
            // console.error(raceOppA.checkKey + ' ' + raceOppA.Id + ' ' + vA._sys_.serverid);
        }

        liveInst.add_live_race(rid, raceInfos, rLink.url, liveKey, mode, Date.now(), racever);

        return rid;
    }


    /**
     * 提供给好友约战的接口
     * @param infos 
     */
    public create_race(infos: { sid: string, race: SeRaceOpp, _sys_: if_sys_ }[], mode: LiveMode = LiveMode.race): string {
        var rs: MeTeamMate[] = [];
        for (let i = 0; i < 2; i++) {
            let ua = infos[i * 2];
            let mata: MeTeamMate = {
                uid: ua.race.Id,
                pvp_score: ua.race.pvp_score,
                raceinfo: ua.race,
                // bindinfo: MeTeamMate,

                enter_time: Date.now(),
                _sys_: ua._sys_,
                bTeam: true,
            };

            let ub = infos[i * 2 + 1];
            let matb: MeTeamMate = {
                uid: ub.race.Id,
                pvp_score: ub.race.pvp_score,
                raceinfo: ub.race,
                // bindinfo: MeTeamMate,

                enter_time: Date.now(),
                _sys_: ub._sys_,
                bTeam: true,
            }

            mata.bindinfo = [matb];
            rs.push(mata);
        }

        return this._send_race(rs, mode);
    }

    private _create_race(plist: Array<MeTeamMate>): Array<MeTeamMate> {
        var out = [];

        var group_lists: MeTeamMate[][] = [];
        for (let i = 0; i < plist.length; i++) {
            let r = plist[i];
            if (!r) continue;
            let idx = pltMgrInst.match_plt(r._sys_, true);
            if(configInst.get('openGlobal')) idx = 0;
            if (!group_lists[idx]) group_lists[idx] = [];
            group_lists[idx].push(r);
        }

        for (let j = 0; j < group_lists.length; j++) {
            if (!group_lists[j]) continue;
            let r_plist = group_lists[j];

            let vs_infos: MeTeamMate[] = [];
            let vs_uids: number[] = [];

            for (let i = 0; i < r_plist.length; i++) {
                let r_wt = r_plist[i];
                if (vs_uids.indexOf(r_wt.uid) >= 0 || !serverMgrInst.get_server(r_wt._sys_.serverid)) {
                    out.push(r_wt)
                }
                else {
                    if (r_wt.bindinfo) {
                        // 如果组队了的，就把队友拉近来
                        vs_infos.push(r_wt)
                        vs_uids.push(r_wt.uid);
                        for(let i = 0; i < r_wt.bindinfo.length; i++){
                            vs_uids.push(r_wt.bindinfo[i].uid);
                        }
                    }
                    else {
                        vs_infos.push(r_wt);
                        vs_uids.push(r_wt.uid);
                    }
                }

                if (vs_uids.length == this._math_count) {
                    let livemode = LiveMode.match;
                    if(this.match_type == RoomType.N_1v2)
                    livemode = LiveMode.pvp_1v2;
                    if (this._send_race(vs_infos, livemode)) {
                        vs_infos = [];
                    }
                    else {
                        out = out.concat(vs_infos);
                        vs_infos = [];
                    }

                    vs_uids = [];
                }
            }
            out = out.concat(vs_infos);
        }


        return out;
    }

    /**
     * 获取一个机器人进行战斗
     * @param _sys_ 
     * @param formation 
     * @param score 
     * @param unlock_level 
     * @param pvp_level 
     * @param wincount 
     */
    public getPveRobot_1v2(_sys_: if_sys_, pve_formation: Array<SeLogicFormation>, castleLevel, pvp_level, pvp_score, player_wear_equips: Array<any>) {
        if (!_sys_) {
            _sys_ = {
                plt: 'sdw',
                serverid: '',
            }
        }

        var bossID = 'Z000';
        var out: SeRaceOpp = {
            Id: 0,
            Name: "",
            Formation: pve_formation,
            Boss: bossID ? [{ kHeroID: bossID, iLevel: 1 }, { kHeroID: 'Z008', iLevel: castleLevel }] : null,
            battleEquip: {},
            areaid: '',
            pvp_score: pvp_score,
            pvp_level: pvp_level,
            castle_level: castleLevel,
            winStreakCount: 0,
            Icon: "",
            synccheck: false,
            avatar: {},
            medals: [],
            _plt_: _sys_.plt,
            lordUnit: this.getAILord(_sys_.plt, castleLevel, castleLevel, player_wear_equips),
            is_vip: false,
            vip_level: 0,
            guild_info: {},
        }

        var nameInfo = robotNameInst.getName();
        out.Name = nameInfo.name;
        out.avatar = nameInfo.isVip ? { vip: 1, iconid: "AV001" } : {};
        out.medals = nameInfo.medals;

        return out;
    }

    private getAILord(plt: string, ailevel: number, player_castle_level: number, wear_equips: Array<any>){
        var aiLordPool = resMgrInst(plt).getAIlordInfo(player_castle_level);
        if(!aiLordPool){
            aiLordPool = resMgrInst('sdw').getAIlordInfo(player_castle_level);
        }
        var lucky_lord: SeResLordAIinfo = arrayRandomT(aiLordPool,'pro');
        var weaponId = arrayRandom(lucky_lord.kweaponID.split(','));
        var weaponStar = 0;
        var weaponLevel = 1;
        var weaponColor = resMgrInst(plt).EquipattrRes.getRes(weaponId).iColor;
        var clothesId = arrayRandom(lucky_lord.kclothesID.split(','));
        var clothesStar = 0;
        var clothesLevel = 1;
        var clothesColor = resMgrInst(plt).EquipattrRes.getRes(clothesId).iColor;
        var treasureId = arrayRandom(lucky_lord.ktreasureID.split(','));
        var treasureStar = 0;
        var treasureLevel = 1;
        var treasureColor = resMgrInst(plt).EquipattrRes.getRes(treasureId).iColor;
        for(let i = 0; i < wear_equips.length; i++){
            if(!wear_equips[i]){
                continue;
            }
            else if(wear_equips[i].eType == SeEnumequipattreType.WuQi){
                let weaponStarMax = (wear_equips[i].eStar + 3) <= 10? (wear_equips[i].eStar + 3) : 10;
                let weaponStarMin = (wear_equips[i].eStar - 3) >= 0? (wear_equips[i].eStar - 3) : 0;
                let weaponLevelMax = (wear_equips[i].eLevel + 10) <= 100? (wear_equips[i].eLevel + 10) : 100;
                let weaponLevelMin = (wear_equips[i].eLevel - 10) >= 1? (wear_equips[i].eLevel - 10) : 1;
                weaponStar =  Math.floor(Math.random() * (weaponStarMax - weaponStarMin + 1) + weaponStarMin);
                weaponLevel =  Math.floor(Math.random() * (weaponLevelMax - weaponLevelMin + 1) + weaponLevelMin);
            }
            else if(wear_equips[i].eType == SeEnumequipattreType.KuiJia){
                let clothesStarMax = (wear_equips[i].eStar + 3) <= 10? (wear_equips[i].eStar + 3) : 10;
                let clothesStarMin = (wear_equips[i].eStar - 3) >= 0? (wear_equips[i].eStar - 3) : 0;
                let clothesLevelMax = (wear_equips[i].eLevel + 10) <= 100? (wear_equips[i].eLevel + 10) : 100;
                let clothesLevelMin = (wear_equips[i].eLevel - 10) >= 1? (wear_equips[i].eLevel - 10) : 1;
                clothesStar =  Math.floor(Math.random() * (clothesStarMax - clothesStarMin + 1) + clothesStarMin);
                clothesLevel =  Math.floor(Math.random() * (clothesLevelMax - clothesLevelMin + 1) + clothesLevelMin);
            }
            else if(wear_equips[i].eType == SeEnumequipattreType.BaoWu){
                let treasureStarMax = (wear_equips[i].eStar + 3) <= 10? (wear_equips[i].eStar + 3) : 10;
                let treasureStarMin = (wear_equips[i].eStar - 3) >= 0? (wear_equips[i].eStar - 3) : 0;
                let treasureLevelMax = (wear_equips[i].eLevel + 10) <= 100? (wear_equips[i].eLevel + 10) : 100;
                let treasureLevelMin = (wear_equips[i].eLevel - 10) >= 1? (wear_equips[i].eLevel - 10) : 1;
                treasureStar =  Math.floor(Math.random() * (treasureStarMax - treasureStarMin + 1) + treasureStarMin);
                treasureLevel =  Math.floor(Math.random() * (treasureLevelMax - treasureLevelMin + 1) + treasureLevelMin);
            }
        }
        var ai_wear_equips = [];
        ai_wear_equips.push({eLevel: weaponLevel, eStar: weaponStar, kId: weaponId, eType: SeEnumequipattreType.WuQi, iColor: weaponColor});
        ai_wear_equips.push({eLevel: clothesLevel, eStar: clothesStar, kId: clothesId, eType: SeEnumequipattreType.KuiJia, iColor: clothesColor});
        ai_wear_equips.push({eLevel: treasureLevel, eStar: treasureStar, kId: treasureId, eType: SeEnumequipattreType.BaoWu, iColor: treasureColor});
        return { kHeroID: lucky_lord.kLordID, iLevel: ailevel, wear_equips: ai_wear_equips};
    }
}

export var match2v2Inst = new olmatch(4, RoomType.N_2v2);
export var match1v2Inst = new olmatch(3, RoomType.N_1v2);