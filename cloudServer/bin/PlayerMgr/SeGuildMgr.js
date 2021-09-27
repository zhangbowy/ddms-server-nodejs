"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeGuildMgr = void 0;
const SePlayerDef_1 = require("./SePlayerDef");
const TeTool_1 = require("../TeTool");
const interface_1 = require("../Res/interface");
const SeDefine_1 = require("../SeDefine");
const TeConfig_1 = require("../lib/TeConfig");
class SeGuildMgr {
    constructor(p) {
        this.exchange_currency = ['', 'W116', 'W117', 'W118', 'W119'];
        this.parent = p;
    }
    get baseInfo() {
        return this.parent.baseInfo;
    }
    get guild_info() {
        return this.parent.baseInfo.guild_info;
    }
    saveBaseInfo(v) {
        return this.parent.saveBaseInfo(v);
    }
    //receive_help info : {heroId: string, count: number, asker: SeSimpleGuildPlayer, helper: Array<SeSimpleGuildPlayer>, time: number}
    deal_guild_opr(data) {
        let info = data.info;
        switch (data.type) {
            case 'receive_help':
                //添加卡片
                let help_addItems = [{ kItemID: info.heroId, iPileCount: info.count }];
                global.playerMgr.onGiveMail(TeConfig_1.configInst.get('plt'), data.uid, SeDefine_1.SeMailType.SYSTEM, global.resMgr.getConfig('TM_donate_mail'), help_addItems, 0, global.resMgr.getConfig('TM_donate_title'));
                if (!this.guild_info.help_info)
                    this.guild_info.help_info = [];
                //添加捐卡记录，最多10条
                for (let i = 0; i < info.helper.length; i++) {
                    this.guild_info.help_info.push({ id: info.helper[i].id, name: info.helper[i].name, count: info.helper[i].count, heroId: info.heroId });
                }
                while (this.guild_info.help_info.length > 10) {
                    this.guild_info.help_info.splice(0, 1);
                }
                break;
            case 'receive_exchange':
                //添加卡片
                let exchange_addItems = [];
                for (let i = 0; i < info.back_card.length; i++) {
                    exchange_addItems.push({ kItemID: info.back_card[i].heroId, iPileCount: info.back_card[i].count });
                }
                exchange_addItems.push({ kItemID: info.heroId, iPileCount: info.count });
                global.playerMgr.onGiveMail(TeConfig_1.configInst.get('plt'), data.uid, SeDefine_1.SeMailType.SYSTEM, global.resMgr.getConfig('TM_exchange_mail'), exchange_addItems, 0, global.resMgr.getConfig('TM_exchange_title'));
                //添加换卡记录，最多10条
                if (!this.guild_info.exchange_info)
                    this.guild_info.exchange_info = [];
                this.guild_info.exchange_info.push({ id: info.exchanger.id, name: info.exchanger.id, count: info.count, heroId: info.heroId, use_card: info.use_card });
                while (this.guild_info.exchange_info.length > 10) {
                    this.guild_info.exchange_info.splice(0, 1);
                }
                break;
            case 'help_result':
                if (!data.success)
                    return;
                //扣除卡牌
                let rkCard = this.parent.getHeroCard(data.heroId);
                rkCard.iCount = (rkCard.iCount - data.count) < 0 ? 0 : rkCard.iCount - data.count;
                this.parent.m_pkHeroCardMgr.saveHeroCards();
                if (this.parent.bInitComplete)
                    global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'uphero', rkCard);
                let card_res = global.resMgr.UnitRes.getRes(rkCard.kHeroID);
                this.parent.taskAction(SeDefine_1.TaskAction.GuildHelp, data.count, null, card_res.iColour);
                this.baseInfo.dailyInfo.guild_help_count[card_res.iColour - 1] += data.count;
                this.parent.updateDailyInfo();
                //得爱心值和金币
                let gold_num = parseInt(global.resMgr.getConfig('TM_donate_reward').split('|')[0].split(',')[card_res.iColour - 1]);
                this.parent.addItems([{ kItemID: 'W002', iPileCount: gold_num }], 'guild_help');
                break;
            case 'join_ret':
                if (!this.guild_info.apply_info)
                    this.guild_info.apply_info = [];
                if (data.success) {
                    this.guild_info.guild_id = data.guild_id;
                    this.guild_info.guild_name = data.guild_name;
                    this.guild_info.last_id = 0;
                    this.guild_info.quite_time = 0;
                    this.guild_info.quit_or_kick = 0;
                    this.guild_info.invite_info = [];
                    //同意了过后，清除所有同盟的申请
                    let apply_ids = [];
                    for (let i = 0; i < this.guild_info.apply_info.length; i++) {
                        let apply_info = this.guild_info.apply_info[i];
                        apply_ids.push(apply_info.id);
                    }
                    let del_data = { cmd: 'guild_opr', type: 'del_apply_info', ids: apply_ids, uid: this.parent.id };
                    global.guildMgr.sendGuildData(del_data);
                    this.guild_info.apply_info = [];
                    //获取同盟任务
                    this.parent.get_task_id();
                }
                else {
                    for (let i = 0; i < this.guild_info.apply_info.length; i++) {
                        let apply_info = this.guild_info.apply_info[i];
                        if (apply_info.id == data.guild_id) {
                            this.guild_info.apply_info.splice(i, 1);
                        }
                    }
                }
                if (data.send_mail) {
                    let message = '您被拒绝加入' + data.guild_name + '同盟';
                    if (data.success)
                        message = '您已成功加入' + data.guild_name + '同盟';
                    if (data.out_time)
                        message = '您的申请暂未通过';
                    global.playerMgr.onGiveMail(TeConfig_1.configInst.get('plt'), data.uid, SeDefine_1.SeMailType.SYSTEM, message, [], 0, global.resMgr.getConfig('TM_mail_title'));
                }
                break;
            case 'card_item_opr':
                //部分情况导致的变更发邮件    
                if (data.reason == SeDefine_1.SeEnumGuildItemReason.cancel_exchange) {
                    let additems = [];
                    for (let i = 0; i < data.add_hero_card.length; i++) {
                        additems.push({ kItemID: data.add_hero_card[i].heroId, iPileCount: data.add_hero_card[i].count });
                    }
                    for (let i = 0; i < data.add_item.length; i++) {
                        additems.push({ kItemID: data.add_item[i].itemId, iPileCount: data.add_item[i].count });
                    }
                    global.playerMgr.onGiveMail(TeConfig_1.configInst.get('plt'), data.uid, SeDefine_1.SeMailType.SYSTEM, global.resMgr.getConfig('TM_exchange_fail_mail'), additems, 0, global.resMgr.getConfig('TM_exchange_title'));
                }
                else {
                    for (let heroCard of data.add_hero_card) {
                        this.parent.addHeroCard(heroCard.heroId, heroCard.count);
                    }
                    for (let addItem of data.add_item) {
                        this.parent.addItem(addItem.itemId, addItem.count);
                    }
                }
                for (let heroCard of data.del_hero_card) {
                    let rkCard = this.parent.getHeroCard(heroCard.heroId);
                    rkCard.iCount = (rkCard.iCount - heroCard.count) < 0 ? 0 : rkCard.iCount - heroCard.count;
                    this.parent.m_pkHeroCardMgr.saveHeroCards();
                    if (this.parent.bInitComplete)
                        global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'uphero', rkCard);
                }
                for (let delItem of data.del_item) {
                    this.parent.delItem(delItem.itemId, delItem.count);
                }
                break;
            case 'kick':
                if (this.guild_info.guild_id != data.guild_id)
                    return;
                this.baseInfo.guild_info = new SePlayerDef_1.SeGuildInfo();
                this.baseInfo.guild_info.quite_time = data.quite_time;
                this.baseInfo.guild_info.last_id = data.quite_id;
                this.baseInfo.guild_info.quit_or_kick = 2;
                let message = '您已从' + data.guild_name + '同盟退出';
                global.playerMgr.onGiveMail(TeConfig_1.configInst.get('plt'), data.uid, SeDefine_1.SeMailType.SYSTEM, message);
                break;
            case 'quit_ret':
                this.baseInfo.guild_info = new SePlayerDef_1.SeGuildInfo();
                this.baseInfo.guild_info.quite_time = data.quite_time;
                this.baseInfo.guild_info.last_id = data.quite_id;
                this.baseInfo.guild_info.quit_or_kick = 1;
                break;
            case 'task_ret':
                this.parent.dailyInfo.guild_task_id = data.task_id;
                this.parent.updateDailyInfo();
                this.parent.m_taskMgr.updateModuleTask(true, interface_1.SeEnumTaskiModule.MeiRi, true, '', data.task_id);
                break;
            case 'invite':
                if (!this.guild_info.invite_info)
                    this.guild_info.invite_info = [];
                if (this.guild_info.guild_id)
                    return;
                //重复邀请检查
                for (let i = 0; i < this.guild_info.invite_info.length; i++) {
                    if (this.guild_info.invite_info[i].guild_id == data.invite_info.guild_id) {
                        return;
                    }
                }
                this.guild_info.invite_info.push(data.invite_info);
                break;
            case 'change_name_ret':
                if (data.success) {
                    if (this.parent.decMoney(Number(global.resMgr.getConfig('TM_change_name')), "guildNameEdit")) {
                        global.guildMgr.sendGuildData(data.send_data);
                    }
                }
                else {
                    //返回错误，名字已存在
                    global.netMgr.sendGuildError(this.parent.linkid, 10004, 'name duplicate');
                }
                break;
            case 'create_name_ret':
                if (data.success) {
                    //花费钻石
                    let cost = parseInt(global.resMgr.getConfig('TMsetup'));
                    if (this.parent.decMoney(cost, 'create_guild')) {
                        global.guildMgr.sendGuildData(data.send_data);
                    }
                }
                else {
                    //返回错误，名字已存在
                    global.netMgr.sendGuildError(this.parent.linkid, 10004, 'name duplicate');
                }
                break;
            case 'update_name':
                this.guild_info.guild_name = data.name;
                this.saveBaseInfo('guild_info');
                break;
        }
        this.saveBaseInfo('guild_info');
        if (this.parent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'guild_info', this.guild_info);
    }
    guild_opr(data) {
        //带上自己基本信息
        data['uid'] = this.parent.id;
        // id: this.id, name: this.name, score: this.pvpMgr.pvp_top_wincount, icon: this.icon, avatar: this.avatar}
        let user_info = { id: this.parent.id, name: this.parent.name, icon: this.parent.icon,
            avatar: this.parent.avatar, level: this.parent.level, is_vip: this.baseInfo.is_vip, vip_level: this.baseInfo.vip_level,
            glory_score: this.parent.pvpMgr.glory_score, pvp_score: this.parent.pvp_score, pvp_level: this.parent.pvp_level, peak_score: this.parent.peak_score };
        data['user_info'] = user_info;
        switch (data.type) {
            case 'apply':
                //还在cd中
                if ((Date.now() - this.guild_info.quite_time) < 24 * 60 * 60 * 1000) {
                    global.netMgr.sendGuildError(this.parent.linkid, 10005, 'apply in cd');
                    return;
                    //自己退的全部不能加
                    // if(this.guild_info.quit_or_kick == 1) {
                    //     global.netMgr.sendGuildError(this.parent.linkid, 10005, 'apply in cd');
                    //     return;
                    // }
                    // //被T的只有上一个不能加
                    // else if(this.guild_info.quit_or_kick == 2){
                    //     if(data.id == this.guild_info.last_id) {
                    //         global.netMgr.sendGuildError(this.parent.linkid, 10005, 'apply in cd');
                    //         return;
                    //     }
                    // }
                }
                if (!this.guild_info.apply_info)
                    this.guild_info.apply_info = [];
                for (let info of this.guild_info.apply_info) {
                    //已经申请过了
                    if (info.id == data.id)
                        return;
                }
                this.guild_info.apply_info.push({ id: data.id });
                break;
            case 'update':
                //判断只有部分属性允许修改
                let update_List = ['icon', 'name', 'announcement', 'need_approve', 'need_level'];
                let check_list = ['', '']; // 0是名字，1是宣言
                for (let i = 0; i < data.param.length; i++) {
                    if (update_List.indexOf(data.param[i]) == -1)
                        return;
                    if (data.param[i] == 'name')
                        check_list[0] = data.value[i];
                    if (data.param[i] == 'announcement')
                        check_list[1] = data.value[i];
                }
                this.parent._process_forbid_name_check(this.parent.id, check_list[0], (function (data, name, result) {
                    if (result) {
                        this.parent._process_forbid_name_check(this.parent.id, check_list[1], (function (name, data, announcement, result) {
                            if (result) {
                                //检查是否重名
                                if (name) {
                                    let check_data = { cmd: 'guild_opr', type: 'checkGuildName', uid: this.parent.id, name: name, subtype: 'change_name', send_data: data };
                                    global.guildMgr.sendGuildData(check_data);
                                }
                                else {
                                    global.guildMgr.sendGuildData(data);
                                }
                            }
                            else {
                                //返回错误，内容不和谐
                                global.netMgr.sendGuildError(this.parent.linkid, 10003, 'text check error');
                            }
                        }).bind(this, name, data));
                    }
                    else {
                        //返回错误，内容不和谐
                        global.netMgr.sendGuildError(this.parent.linkid, 10003, 'text check error');
                    }
                }).bind(this, data));
                return;
            case 'chat':
                //聊天长度限制30字
                if (TeTool_1.getCharByte(data.chat_text) > 116)
                    return;
                // global.guildMgr.sendGuildData(data);
                //数美判定
                this.parent._process_forbid_name_check(this.parent.id, data.value, (function (data, name, result) {
                    if (result) {
                        global.guildMgr.sendGuildData(data);
                    }
                    else {
                        //返回错误，内容不和谐
                        global.netMgr.sendGuildError(this.parent.linkid, 10003, 'text check error');
                    }
                }).bind(this, data));
                return;
            case 'help':
                //扣除玩家自身卡牌，扣之前先通知同盟服，免得多个人一起扣了
                //检查自身卡牌数量
                let card = this.parent.getHeroCard(data.heroId);
                if (card.iCount < data.count) {
                    return;
                }
                //每日捐卡数量限制
                //不同品质的时间限制
                let res = global.resMgr.TownItemRes.getRes(data.heroId);
                let count_limit_day = parseInt(global.resMgr.getConfig('TM_donate_day').split(',')[res.iColor - 1]);
                if (!this.baseInfo.dailyInfo.guild_help_count)
                    this.baseInfo.dailyInfo.guild_help_count = [];
                if (!this.baseInfo.dailyInfo.guild_help_count[res.iColor - 1])
                    this.baseInfo.dailyInfo.guild_help_count[res.iColor - 1] = 0;
                if (data.count + this.baseInfo.dailyInfo.guild_help_count[res.iColor - 1] > count_limit_day)
                    return;
                let count_limit = global.resMgr.getConfig('TM_donate_one').split(',')[res.iColor - 1];
                if (data.count > count_limit)
                    return;
                break;
            case 'creat':
                //没同盟才能花钻石创建
                if (this.guild_info.guild_id) {
                    return;
                }
                if ((Date.now() - this.guild_info.quite_time) < 24 * 60 * 60 * 1000) {
                    global.netMgr.sendGuildError(this.parent.linkid, 10005, 'apply in cd');
                    return;
                }
                //先检查屏蔽字（名字和宣言），再检查重名，最后再创建
                this.parent._process_forbid_name_check(this.parent.id, data.name, (function (data, name, result) {
                    if (result) {
                        //检测宣言
                        this.parent._process_forbid_name_check(this.parent.id, data.announcement, (function (name, data, announcement, result) {
                            if (result) {
                                //检查是否重名
                                let check_data = { cmd: 'guild_opr', type: 'checkGuildName', uid: this.parent.id, name: name, subtype: 'create_name', send_data: data };
                                global.guildMgr.sendGuildData(check_data);
                            }
                            else {
                                //返回错误，名字不和谐
                                global.netMgr.sendGuildError(this.parent.linkid, 10003, 'text check error');
                            }
                        }).bind(this, name, data));
                    }
                    else {
                        //返回错误，名字不和谐
                        global.netMgr.sendGuildError(this.parent.linkid, 10003, 'text check error');
                    }
                }).bind(this, data));
                return;
            case 'ask_exchange':
                //请求换卡
                let color = -1;
                for (let use_card of data.use_card) {
                    //判断下所选卡牌的品质是否都一样
                    let res = global.resMgr.TownItemRes.getRes(use_card.heroId);
                    if (color == -1)
                        color = res.iColor;
                    else if (color != res.iColor)
                        return;
                    let rkCard = this.parent.getHeroCard(use_card.heroId);
                    if (rkCard.iCount < use_card.count) {
                        return;
                    }
                    rkCard.iCount = (rkCard.iCount - use_card.count) < 0 ? 0 : rkCard.iCount - use_card.count;
                    this.parent.m_pkHeroCardMgr.saveHeroCards();
                    if (this.parent.bInitComplete)
                        global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'uphero', rkCard);
                }
                //扣掉对应品质的换卡币
                this.parent.delItem(this.exchange_currency[color], 1, 'ask_exchange');
                break;
            case 'exchange':
                //换卡
                let use_card = data.use_card;
                let rkCard = this.parent.getHeroCard(use_card.heroId);
                if (!rkCard || rkCard.iCount < use_card.count) {
                    return;
                }
                rkCard.iCount = (rkCard.iCount - use_card.count) < 0 ? 0 : rkCard.iCount - use_card.count;
                this.parent.m_pkHeroCardMgr.saveHeroCards();
                if (this.parent.bInitComplete)
                    global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'uphero', rkCard);
                //扣掉对应品质的换卡币
                let item_res = global.resMgr.TownItemRes.getRes(use_card.heroId);
                this.parent.delItem(this.exchange_currency[item_res.iColor], 1, 'exchange');
                break;
            case 'cancel_exchange':
                //取消换卡
                break;
            case 'quite':
                if (this.guild_info.guild_id != data.id)
                    return;
                //退出同盟
                break;
            case 'kick':
                //盟主T人
                break;
            case 'contribute':
                if (this.parent.dailyInfo.guild_contribute + data.count > parseInt(global.resMgr.getConfig('TM_donate_limit')))
                    return;
                if (!this.parent.decMoney(data.count, 'contribute'))
                    return;
                this.parent.dailyInfo.guild_contribute += data.count;
                //获得个人勋章
                this.parent.addItem('W037', data.count, 'contribute');
                this.parent.updateDailyInfo();
                this.parent.taskAction(SeDefine_1.TaskAction.GuildContribute, data.count, 'W001');
                break;
            case 'apply_general':
                if (!this.parent.decMoney(200, 'apply_general'))
                    return;
                break;
            case 'cancel_quite':
                if (!this.guild_info.last_id || this.guild_info.last_id != data.id)
                    return;
                break;
            case 'up_level':
                break;
            case 'ask_help':
                //不同品质的时间限制
                let help_res = global.resMgr.TownItemRes.getRes(data.heroId);
                let add_time = parseInt(global.resMgr.getConfig('TM_request_CD').split(',')[help_res.iColor - 1]);
                if (!this.guild_info.last_ask_help_time)
                    this.guild_info.last_ask_help_time = [];
                if (Date.now() < this.guild_info.last_ask_help_time[help_res.iColor - 1] + add_time * 60 * 60 * 1000) {
                    return;
                }
                if (data.count > parseInt(global.resMgr.getConfig('TM_request_one').split(',')[help_res.iColor - 1])) {
                    return;
                }
                this.guild_info.last_ask_help_time[help_res.iColor - 1] = Date.now();
                break;
            case 'invite':
                break;
        }
        if (this.parent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'guild_info', this.guild_info);
        global.guildMgr.sendGuildData(data);
    }
    getGuildTaskInfo(taskIds) {
        if (this.baseInfo.guild_info.guild_id) {
            this.guild_opr({ cmd: 'guild_opr', type: 'get_task_info', taskIds: taskIds, id: this.baseInfo.guild_info.guild_id });
        }
    }
    refuseGuildInvite(guild_id) {
        for (let i = 0; i < this.guild_info.invite_info.length; i++) {
            if (guild_id == this.guild_info.invite_info[i].guild_id) {
                this.guild_info.invite_info.splice(i, 1);
            }
        }
        this.saveBaseInfo('guild_info');
        if (this.parent.bInitComplete)
            global.netMgr.sendCharMiscUpdate(this.parent.linkid, 'guild_info', this.guild_info);
    }
    upload_state() {
        global.guildMgr.up_state({ uid: this.parent.id,
            state: this.parent.state,
            guild_id: this.guild_info.guild_id,
            pvp_score: this.parent.pvp_score,
            pvp_level: this.parent.pvp_level,
            glory_score: this.parent.pvpMgr.glory_score,
            peak_score: this.parent.peak_score,
            is_vip: this.parent.baseInfo.is_vip,
            vip_level: this.parent.baseInfo.vip_level,
            charname: this.parent.baseInfo.charname,
            level: this.parent.baseInfo.level,
            avatar: this.parent.avatar,
            icon: this.parent.icon,
        });
        // 抄送一份给自己 如果还在线的话
        // this.send_to_player('friend_state', { f: { kID: this._parent.id, state: this._parent.state } });
    }
    addGuildTaskValue(task_id, value) {
        this.guild_opr({ cmd: 'guild_opr', type: 'add_task_value', id: this.guild_info.guild_id, taskId: task_id, value: value });
    }
}
exports.SeGuildMgr = SeGuildMgr;
//# sourceMappingURL=SeGuildMgr.js.map