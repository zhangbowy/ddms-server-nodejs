import { SeLogicFormation } from "../SeDefine";


export class SeFriendInfo {
    uid: number = 0;
    name: string = "";
    icon: string = "";
    formation: Array<SeLogicFormation> = [];
    level: number = 0;
    pvp_level: number = 0;
    pvp_score: number = 0;
    pvp_star: number = 0;
}


export class SePvpInfo {
    public uid: number = 0;
    // public boxList: Array<SePvpBox> = null;
    public openingIndex: number = -1;
    public boxCompleteTime: number = 0;



    /**
     * 宝箱的随机分值
     */
    public score: number = 0;
    public scoreTime: number = 0;
    public genBoxID: number = 0;


    /**
     * 当前连胜场数
     */
    public win_count: number = 0;

    /**
     * 总比赛场数
     */
    public fight_count: number = 0;

    /**
     * pvp 的隐藏积分
     */
    public pvp_score: number = 1500;

    /**
     * pvp 的段位
     */
    public pvp_level: number = 1;

    /**
     * 玩家的巅峰段位
     */
    public top_pvp_level: number = 1;

    /**
     * 当前段位的星星数
     */
    public pvp_star: number = 0;

    /**
     * 保护积分
     */
    public pvp_protect_score: number = 0;

    /**
     * 每日5点生成的奖励
     */
    public daily_award_time: number = 0;

    public constructor(obj = null) {
        var jsonObj = obj;
        if (!obj) {
            return;
        }
        for (var key in jsonObj) {
            if (this.hasOwnProperty(key)) {
                this[key] = jsonObj[key];
            }
        }
    }
}