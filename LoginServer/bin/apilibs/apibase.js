"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiBase = void 0;
/**
 * 对外的api基础，这里要求了基本的api功能实现，具体的每一个流程实现可以由子类实现
 * 相当于一个虚基类
 */
class ApiBase {
    /**
     * VIP特权信息
     */
    get_vip_level(uid, ...args) { }
    ;
    /**
     * 验证
     * 积分兑换礼包
     */
    gift_exchange(uid, ...args) { }
    ;
    /**
     * 对战类游戏上报游戏结果
     */
    report_battle_result(uid, ...args) { }
    ;
    /**
     * 用户游戏成就上报
     */
    report_user_achievement(uid, ...args) { }
    ;
    /**
     * 获取已安装了应用的好友列表
     */
    get_app_friends(uid, ...args) { }
    ;
    /**
     * 批量获取多个用户的基本信息，包括昵称、头像等
     */
    get_multi_info(uid, ...args) { }
    ;
    /**
     * 游戏内调用消息接口向好友发送消息
     */
    send_gamebar_msg(uid, ...args) { }
    ;
    system_recall(api_name, ...info) { }
    system_test_call() {
        // callList
        var objList = new ApiBase();
        for (var key in objList) {
            var f = this[key];
            if (key.indexOf('system') >= 0 || key == 'constructor')
                continue;
            if (typeof f != 'function')
                continue;
            var cf = f.bind(this, 0, '6317A2A410FF9897F3AF26DE7CF40258', 'C8277226EB95A36549D91A6CEA982DA6');
            cf();
        }
    }
}
exports.ApiBase = ApiBase;
//# sourceMappingURL=apibase.js.map