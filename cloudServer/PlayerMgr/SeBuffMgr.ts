import { SePlayer } from "./SePlayer";
import { iApp } from "../app";
import { ifBufferInfo, DeAddDelItemReason } from './SePlayerDef';
import { SeEnumTownBuffereType, SeEnumBuffereType, SeEnumnoticetexteType, SeEnumBufferiState, SeEnumTownBufferiProperty } from "../Res/interface";
import { TeDate } from '../TeTool';
import { SeMailType } from "../SeDefine";
declare var global: iApp;

class SeBufferBase {
    /**
     * 资源id
     */
    resid: string;
    /**
     * 数据id
     */
    dbid: string;
}

export class SeBufferMgr {
    private m_pkParent: SePlayer;
    constructor(parent) {
        this.m_pkParent = parent;
    }

    get bufferundays() {
        return this.m_pkParent.baseInfo.bufferundays;
    }

    set bufferundays(days: number) {
        this.m_pkParent.baseInfo.bufferundays = days;
        this.m_pkParent.saveBaseInfo("bufferundays");
    }

    get bufferunitems(): Object {
        return this.m_pkParent.baseInfo.bufferunitems;
    }

    setbufferunitems(tid: string, count: number) {
        if (!count || count == 0) {
            delete this.m_pkParent.baseInfo.bufferunitems[tid];
        }
        else {
            this.m_pkParent.baseInfo.bufferunitems[tid] = (this.m_pkParent.baseInfo.bufferunitems[tid] || 0) + count;
        }

        this.m_pkParent.saveBaseInfo("bufferunitems");
    }

    get bufferdatas(): Object {
        return this.m_pkParent.baseInfo.bufferdatas;
    }

    get_buff_info(kid: string): ifBufferInfo {
        return this.bufferdatas[kid];
    }

    set_buff_info(kid: string, v: ifBufferInfo) {
        if (v == undefined) {
            delete this.bufferdatas[kid];
        }
        else {
            this.bufferdatas[kid] = v;
        }
    }

    save_buffers() {
        this.m_pkParent.saveBaseInfo('bufferdatas');
    }

    del_buffer(bfID: string) {
        if (!this.bufferdatas.hasOwnProperty(bfID)) return;
        this.set_buff_info(bfID, undefined);
        this.save_buffers();
        this.send_to_player();
        this.m_pkParent.getShopInfo();
    }

    get_buffer_value(type: number): number {
        var v = 0;
        var iPriority = 0;
        for (var key in this.bufferdatas) {
            var rb = this.bufferdatas[key] as ifBufferInfo;
            if (!rb) continue;

            var buffRes = global.resMgr.TownBufferRes.getRes(rb.id);
            if (!buffRes || buffRes.eType != type) continue;

            if (iPriority == 0 || iPriority > buffRes.iPriority) {
                iPriority = buffRes.iPriority;
                v = parseInt(buffRes.kValue) || 0;
            }
            else if (iPriority == buffRes.iPriority) {
                v += (parseInt(buffRes.kValue) || 0);
            }
        }

        return v;
    }

    add_buffer(bfID: string) {
        var pkRes = global.resMgr.TownBufferRes.getRes(bfID);
        if (!pkRes) {
            return;
        }

        var curr = Date.now();
        var rInfo = this.get_buff_info(bfID);
        if (!rInfo) {
            rInfo = {
                id: bfID,
                optime: curr,
                ftime: (pkRes.eType == SeEnumTownBuffereType.YueKa || pkRes.eType == SeEnumTownBuffereType.JingShiYueKa || pkRes.eType == SeEnumTownBuffereType.ZhuangBeiYueKa) ? TeDate.ToDate0(curr) - 1 + pkRes.iLastHour * 3600 * 1000 : pkRes.iLastHour * 3600 * 1000 + curr,
                value: 0,
                nodel: pkRes.eType == SeEnumTownBuffereType.YueKa || pkRes.eType == SeEnumTownBuffereType.JingShiYueKa || pkRes.eType == SeEnumTownBuffereType.ZhuangBeiYueKa
            }
        }
        else {
            rInfo.optime = Math.max(curr, rInfo.optime);
            if (pkRes.iSum == 1) {
                if (rInfo.ftime > curr) {
                    rInfo.ftime = rInfo.ftime + pkRes.iLastHour * 3600 * 1000;
                }
                else {
                    rInfo.ftime = TeDate.ToDate0(curr) - 1 + pkRes.iLastHour * 3600 * 1000;
                }
            }
            else {
                rInfo.ftime = pkRes.iLastHour * 3600 * 1000 + Date.now();
            }
        }

        this.set_buff_info(bfID, rInfo);

        this.save_buffers();
        this.send_to_player(bfID);

        if (pkRes.eType == SeEnumTownBuffereType.YueKa) {
            if(pkRes.akGifts){
                for(let j = 0; j < pkRes.akGifts.length; j++){
                    this.m_pkParent.addItem(pkRes.akGifts[j].split(',')[0], parseInt(pkRes.akGifts[j].split(',')[1]), DeAddDelItemReason.yueka);
                }
            }
            
            this.check_monthvip_buff();
            this.m_pkParent.getShopInfo();

            this.m_pkParent.sendAnnouncement(SeEnumnoticetexteType.GouMaiYueKa, { charname: this.m_pkParent.name }, this.m_pkParent)
        }
        else if(pkRes.eType == SeEnumTownBuffereType.JingShiYueKa || pkRes.eType == SeEnumTownBuffereType.ZhuangBeiYueKa){
            if(pkRes.akGifts){
                for(let j = 0; j < pkRes.akGifts.length; j++){
                    this.m_pkParent.addItem(pkRes.akGifts[j].split(',')[0], parseInt(pkRes.akGifts[j].split(',')[1]), DeAddDelItemReason.yueka);
                }
            }
            this.check_monthvip_buff_v2(bfID);
            this.m_pkParent.getShopInfo();
        }
    }

    /**
     * 检测buff是否过期
     * @param notice 是否需要通知玩家
     */
    checkbuff(notice = true) {
        var b_shop_notice = false;
        var bChange = false;
        var buffs = this.bufferdatas;
        var curr = Date.now();
        for (var key in buffs) {
            var rbuff: ifBufferInfo = buffs[key];
            if (rbuff) {
                if (rbuff.ftime < curr && !rbuff.nodel) {
                    var pkRes = global.resMgr.TownBufferRes.getRes(rbuff.id)
                    if (pkRes && pkRes.eType == SeEnumTownBuffereType.YueKa) {
                        b_shop_notice = true;
                    }

                    this.set_buff_info(rbuff.id, undefined);
                    bChange = true;
                }
            }
        }

        if (bChange) {
            this.save_buffers();
            if (notice) this.send_to_player();
        }

        if (notice && b_shop_notice) {
            this.m_pkParent.getShopInfo();
        }
    }

    //删除赛季buff
    checkSeasonBuff(){
        var pkRes = global.resMgr.TownBufferRes.getAllRes();
        for(var bid in pkRes){
            if((pkRes[bid].iProperty & SeEnumTownBufferiProperty.SaiJiQingChu) == SeEnumTownBufferiProperty.SaiJiQingChu){
                this.del_buffer(pkRes[bid].kID);
            }
        }
    }
    /**
     * 获取月卡buff的效果
     */
    get_monthvip_buff() {
        var bfid = 'B001';
        // 触发的时候发送奖励

        var items = {};

        // var rBuff = this.get_buff_info(bfid);
        // if (!rBuff) return;
        // var curr = Date.now();
        // if (rBuff.ftime >= curr && TeDate.daydiff(rBuff.optime, curr) >= 0) {
        //     // 这天未操作过
        //     var pkRes = global.resMgr.TownBufferRes.getRes(bfid);
        //     if (!pkRes || pkRes.eType != SeEnumTownBuffereType.YueKa) {
        //         return;
        //     }

        //     // 这里给玩家发送一个邮件
        //     var diff = Math.max(Math.min(TeDate.daydiff(rBuff.optime, curr) + 1, 7), 1);
        //     for (var i = 0; i < diff; i++) {
        //         var awardItem = pkRes.kValue;
        //         var aa = awardItem.split(',');
        //         var count = parseInt(aa[1] || '1') || 1;
        //         items[aa[0]] = count;
        //     }

        //     rBuff.optime = curr + 24 * 3600 * 1000;
        //     this.set_buff_info(rBuff.id, rBuff);
        //     this.save_buffers();

        //     this.send_to_player();
        // }

        //合并
        for (let _tid in this.bufferunitems) {
            items[_tid] = this.bufferunitems[_tid] + (items[_tid] || 0);
            this.setbufferunitems(_tid, 0);
        }

        if (this.m_pkParent.bInitComplete) global.netMgr.sendCharMiscUpdate(this.m_pkParent.linkid, 'bufferunitems', this.bufferunitems);

        for (let __tid in items) {
            this.m_pkParent.addItem(__tid, items[__tid], 'yueka');
        }

        if (this.bufferundays > 0) {
            this.bufferundays = 0;
            if (this.m_pkParent.bInitComplete) global.netMgr.sendCharMiscUpdate(this.m_pkParent.linkid, 'bufferundays', this.bufferundays);
        }

    }

    get_monthvip_buff_v2(bfid) {
         //获取index
         var bfid_index_all = ['B013','B014'];
         var index = -1;
         for(var i = 0; i < bfid_index_all.length; i++){
             if(bfid_index_all[i] == bfid) index = i;
         }
         if(index == -1) return;

        var items = {};

        //合并
        for (let _tid in this.m_pkParent.baseInfo.bufferunitems_v2[index]) {
            items[_tid] = this.m_pkParent.baseInfo.bufferunitems_v2[index][_tid] + (items[_tid] || 0);
            this.m_pkParent.baseInfo.bufferunitems_v2[index][_tid] = 0;
        }

        if (this.m_pkParent.bInitComplete) global.netMgr.sendCharMiscUpdate(this.m_pkParent.linkid, 'bufferunitems_v2', this.m_pkParent.baseInfo.bufferunitems_v2);

        for (let __tid in items) {
            this.m_pkParent.addItem(__tid, items[__tid], 'yueka' + bfid);
        }

        if (this.m_pkParent.baseInfo.bufferundays_v2[index] > 0) {
            this.m_pkParent.baseInfo.bufferundays_v2[index] = 0;
            if (this.m_pkParent.bInitComplete) global.netMgr.sendCharMiscUpdate(this.m_pkParent.linkid, 'bufferundays_v2', this.m_pkParent.baseInfo.bufferundays_v2);
        }

    }

    /**
     * 检查月卡buff的效果
     */
    check_monthvip_buff() {
        var bfid = 'B001';
        // 这里每天检查一次，触发的时候发送奖励
        var rBuff = this.get_buff_info(bfid);
        if (!rBuff) return;

        var curr = Date.now();
        //上个月的数据也要累计下去
        if (rBuff.ftime < curr) {
            curr = rBuff.ftime;
        }

        if (TeDate.daydiff(rBuff.optime, curr) < 0) {
            // 操作过了的这天就pass
            return;
        }

        var pkRes = global.resMgr.TownBufferRes.getRes(bfid);
        if (!pkRes || pkRes.eType != SeEnumTownBuffereType.YueKa) {
            return;
        }

        // 这里给玩家发送一个邮件
        var diff = Math.max(TeDate.daydiff(rBuff.optime, curr) + 1, 1);
        diff = Math.min(diff, 1);
        for (var i = 0; i < diff; i++) {
            // var gtime = TeDate.ToDate0(curr - i * 24 * 3600 * 1000);
            var awardItem = pkRes.kValue;
            var aa = awardItem.split(',');
            var count = parseInt(aa[1] || '1') || 1;
            // global.playerMgr.onGiveMail(this.m_pkParent.plt,this.m_pkParent.id, SeMailType.SYSTEM, pkRes.kName, [{ kItemID: aa[0], iPileCount: count }], 0, '', gtime + 7 * 24 * 3600 * 1000);
            this.setbufferunitems(aa[0], count);
            this.bufferundays = this.bufferundays + 1;
        }

        rBuff.optime = curr + 24 * 3600 * 1000;
        this.set_buff_info(rBuff.id, rBuff);
        this.save_buffers();

        this.send_to_player();

        if (this.m_pkParent.bInitComplete) global.netMgr.sendCharMiscUpdate(this.m_pkParent.linkid, 'bufferunitems', this.bufferunitems);
        if (this.m_pkParent.bInitComplete) global.netMgr.sendCharMiscUpdate(this.m_pkParent.linkid, 'bufferundays', this.bufferundays);
    }

    check_monthvip_buff_v2(bfid?) {
        var bfid_all = ['B013','B014'];
        if(bfid){
            bfid_all = [bfid];
        }
        for(let k = 0; k < bfid_all.length; k++){
            // 这里每天检查一次，触发的时候发送奖励
            var rBuff = this.get_buff_info(bfid_all[k]);
            if (!rBuff) continue;
            var curr = Date.now();
            //上个月的数据也要累计下去
            if (rBuff.ftime < curr) {
                curr = rBuff.ftime;
            }
    
            if (TeDate.daydiff(rBuff.optime, curr) < 0) {
                // 操作过了的这天就pass
                continue;
            }
    
            var pkRes = global.resMgr.TownBufferRes.getRes(bfid_all[k]);
            if (!pkRes) {
                continue;
            }
            //获取index
            var bfid_index_all = ['B013','B014'];
            var index = -1;
            for(var i = 0; i < bfid_index_all.length; i++){
                if(bfid_index_all[i] == bfid_all[k]) index = i;
            }
            if(index == -1) continue;
            // 这里给玩家发送一个邮件
            var diff = Math.max(TeDate.daydiff(rBuff.optime, curr) + 1, 1);
            diff = Math.min(diff, 1);
            for (var i = 0; i < diff; i++) {
                // var gtime = TeDate.ToDate0(curr - i * 24 * 3600 * 1000);
                var awardItems = pkRes.kValue.split('|');
                for(let g = 0; g < awardItems.length; g++){
                    var aa = awardItems[g].split(',');
                    var count = parseInt(aa[1] || '1') || 1;
                    if(!this.m_pkParent.baseInfo.bufferunitems_v2[index]){
                        this.m_pkParent.baseInfo.bufferunitems_v2[index] = {}
                    }
                    
                    this.m_pkParent.baseInfo.bufferunitems_v2[index][aa[0]] = (this.m_pkParent.baseInfo.bufferunitems_v2[index][aa[0]] || 0) + count;
                    this.m_pkParent.baseInfo.bufferundays_v2[index] = (this.m_pkParent.baseInfo.bufferundays_v2[index] || 0) + 1;
                }
                this.m_pkParent.saveBaseInfo(["bufferundays_v2","bufferunitems_v2"]);
            }
    
            rBuff.optime = curr + 24 * 3600 * 1000;
            this.set_buff_info(rBuff.id, rBuff);
            this.save_buffers();
    
            this.send_to_player();
        }
        if (this.m_pkParent.bInitComplete) global.netMgr.sendCharMiscUpdate(this.m_pkParent.linkid, 'bufferunitems_v2', this.m_pkParent.baseInfo.bufferunitems_v2);
        if (this.m_pkParent.bInitComplete) global.netMgr.sendCharMiscUpdate(this.m_pkParent.linkid, 'bufferundays_v2', this.m_pkParent.baseInfo.bufferundays_v2);
    }
    /**
    * 返回是否是月卡用户
    */
    get isMonthVip() {
        var bfid = 'B001';
        var curr = Date.now();
        var rBuff = this.get_buff_info(bfid);
        if (!rBuff) return false;

        if (rBuff.ftime < curr) {
            return false;
        }

        return true;
    }

    
    public isHadBuff(bfid: string) {
        var curr = Date.now();
        var rBuff = this.get_buff_info(bfid);
        if (!rBuff) return false;
        if (rBuff.ftime < curr) {
            return false;
        }
        return true;
    }

    public getMaxChenHaoBuff(){
        var buff = null;
        for(var key in this.bufferdatas){
            var buffRes = global.resMgr.TownBufferRes.getRes(this.bufferdatas[key].id);
            if(buffRes.eType == SeEnumTownBuffereType.ChenHao){
                if(!buff || buffRes.iPriority < buff.iPriority){
                    //称号佩戴有效
                    if(this.m_pkParent.baseInfo.curMedals.indexOf(buffRes.kBadgeID) >= 0){
                        buff = buffRes;
                    }
                }
            }
        }
        if(!buff){
            return null;
        }else{
            return buff.kID;
        }
        
    }

    send_to_player(optbff?: string) {
        if (this.m_pkParent.bInitComplete) global.netMgr.sendCharMiscUpdate(this.m_pkParent.linkid, 'buffup', this.bufferdatas, optbff);
    }
}