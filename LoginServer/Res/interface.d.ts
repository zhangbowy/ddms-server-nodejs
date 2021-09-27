interface SeResAdaptive{ 
      kId?:string;
      kBrand?:string;
      kModel?:string;
}


interface SeResBattleLevel{ 
      iLevel?:number;
      iAttack?:number;
      iMaxHp?:number;
      iNeedScore?:number;
      iAttack2?:number;
      iMaxHp2?:number;
}


interface SeResBuffstate{ 
      kID?:string;
      iCheckList?:number;
      iState?:number;
}


interface SeResCompetitionReward{ 
      kID?:string;
      iMin?:number;
      iMax?:number;
      iAccurateRank?:number;
      akDailyRewards?:Array<string>;
      akSeasonRewards?:Array<string>;
      akSeasonCrossRewards?:Array<string>;
      akRobotNames?:Array<string>;
      akRobotAvatars?:Array<string>;
      kRewordClass?:string;
}


interface SeResequipEnchantPro{ 
      kId?:string;
      iPro?:number;
      iMaxStar?:number;
}


interface SeResequipsuperpowerLang{ 
      kId?:string;
      eType?:number;
      iRank?:number;
      kDesc?:string;
      kDesc2?:string;
}


interface SeResGameTips{ 
      iID?:number;
      iType?:number;
      kContent?:string;
}


interface SeResGuild{ 
      kid?:string;
      iLevel?:number;
      iMedalNeed?:number;
      iBuildNeed?:number;
      iDailyNeed?:number;
      iCoinMax?:number;
      iMedalMax?:number;
      iPlayerMax?:number;
      iBossMaxLevel?:number;
      iShopMax?:number;
}


interface SeResHeroBoxType{ 
      kID?:string;
      kName?:string;
      eType?:number;
      iOpenTime?:number;
      kSkin?:string;
      kAni?:string;
      kboxitem?:string;
      eAniType?:number;
      iColour?:number;
      iOpenAd?:number;
}


interface SeResInviteCode{ 
      kID?:string;
      kGroupID?:string;
      eType?:number;
      iUseNum?:number;
      kNotice?:string;
      akAward?:Array<string>;
      kFinishTime?:string;
      eReFresh?:number;
      kPltApi?:string;
      kExtNotice?:string;
      kAlias?:string;
}


interface SeResLanguage_EN{ 
      kId?:string;
      kContent?:string;
}


interface SeResLevel{ 
      iLevelID?:number;
      iGamePurpose?:number;
      akBOSSID?:Array<string>;
      iLevelTime?:number;
      iDifficulty?:number;
      iRank?:number;
      aiAITime?:Array<number>;
      akUnitID?:Array<string>;
      iBOSSRank?:number;
      kBOSSName?:string;
      kBOSSClass?:string;
      kIcon?:string;
      kBOSSIcon?:string;
      kBOSSframe?:string;
      kBattleField?:string;
      kLordUnitID?:string;
      kBOSSCity?:string;
      akLevelID?:Array<string>;
}


interface SeResLimitedGiftRate{ 
      kID?:string;
      eType?:number;
      iValueMin?:number;
      iValueMax?:number;
      akGiftName?:Array<string>;
      aiGiftWeight?:Array<number>;
      aiLimitedtime?:Array<number>;
      aiCoolDown?:Array<number>;
}


interface SeResMapinfo{ 
      kID?:string;
      kName?:string;
      akCampains?:Array<string>;
      akBossID?:Array<string>;
      akSoldierID?:Array<string>;
      iLevel?:number;
      iGold?:number;
      金矿数量?:string;
      宝箱数量?:string;
}


interface SeResNotice{ 
      kid?:string;
      kTitle?:string;
      kDate?:string;
      kContent?:string;
}


interface SeResRaceOpp{ 
      kId?:string;
      kName?:string;
      akFormation?:Array<string>;
      iJudgeValue?:number;
      iLevel?:number;
      kIcon?:string;
      iKingHp?:number;
      akself?:Array<string>;
      iEnergy?:number;
      iEnergySpeed?:number;
      iDoubleEnergy?:number;
      iOrder?:number;
      iMaxUse?:number;
      iNoPhase?:number;
      iKingEnergy?:number;
      kKingId?:string;
}


interface SeResseason{ 
      kID?:string;
      kPreviousID?:string;
      kNextID?:string;
      kName?:string;
      kIcon?:string;
      kEndTime?:string;
      kEloFunc?:string;
      kLevelFunc?:string;
      akAwardItem?:Array<string>;
      iFwTopLevel?:number;
      akLevelSpeed?:Array<string>;
}


interface SeResSign{ 
      kID?:string;
      iDay?:number;
      kItemID?:string;
      iNum?:number;
      kName?:string;
      kSkin?:string;
      kItemID1?:string;
      iNum1?:number;
      kSkin1?:string;
      kItemID2?:string;
      iNum2?:number;
      kSkin2?:string;
}


interface SeResSoulPowerLevel{ 
      iLevel?:number;
      iAttack?:number;
      iLife?:number;
      iRequest?:number;
}


interface SeResSuperPower{ 
      kId?:string;
      iType?:number;
      kName?:string;
      eSkilltype?:number;
      iSkillTypeName?:number;
      bVisibal?:string;
      kDescription?:string;
      kValueLv1Desc?:string;
      kIcon?:string;
      aiValue?:Array<number>;
      aiUpValue?:Array<number>;
      akUpValueDesc?:Array<string>;
      aiValueLv2?:Array<number>;
      akValueLv2Desc?:Array<string>;
      aiValueLv3?:Array<number>;
      akValueLv3Desc?:Array<string>;
      aiValueLv4?:Array<number>;
      akValueLv4Desc?:Array<string>;
      aiValueLv5?:Array<number>;
      akValueLv5Desc?:Array<string>;
      aiValueLv6?:Array<number>;
      akValueLv6Desc?:Array<string>;
      aiValueLv7?:Array<number>;
      akValueLv7Desc?:Array<string>;
      iTargetCamp?:number;
      akValue?:Array<string>;
      iAttack?:number;
      iSupportAttack?:number;
      iSupportFight?:number;
      iSupportSelf?:number;
      iDefFight?:number;
      iDefPrepare?:number;
}


interface SeResTownBuffer{ 
      kID?:string;
      eType?:number;
      iProperty?:number;
      iPriority?:number;
      akGifts?:Array<string>;
      kValue?:string;
      iLastHour?:number;
      kName?:string;
      iSum?:number;
      iShow?:number;
      kBadgeID?:string;
      kIcon?:string;
}


interface SeResUnitAwake{ 
      iCount?:number;
      iGreenA?:number;
      iGreenB?:number;
      iGreenC?:number;
      iBlueA?:number;
      iBlueB?:number;
      iBlueC?:number;
      iPurpleA?:number;
      iPurpleB?:number;
      iPurpleC?:number;
      iOrangeA?:number;
      iOrangeB?:number;
      iOrangeC?:number;
}


interface SeResVIP{ 
      kid?:string;
      iRank?:number;
      kVipBgPic?:string;
      iPrice?:number;
      iExpirationDate?:number;
      iVisable?:number;
      iDescription?:number;
      iPowerRecovery?:number;
      eNameColor?:number;
      iOpenQuicken?:number;
      iLevelCoinAdd?:number;
      iMedalAdd?:number;
      iLevelPurchase?:number;
      iShopDiscount?:number;
      akExtendDes?:Array<string>;
      akRewardOnce?:Array<string>;
      akRewardWeek?:Array<string>;
      akRewardSeason?:Array<string>;
      akOnceMail?:Array<string>;
      akWeekMail?:Array<string>;
      akSeasonMail?:Array<string>;
      kchance?:string;
}


interface SeResActivity{ 
      kID?:string;
      eType?:number;
      kName?:string;
      kNameSkin?:string;
      kStartTime?:string;
      kEndTime?:string;
      kShowEndTime?:string;
      akExChanges?:Array<string>;
      iProperty?:number;
      kPriceId?:string;
      iPriority?:number;
      akIcons?:Array<string>;
      kAdSkin?:string;
      kDesc?:string;
      akValueA?:Array<string>;
}


interface SeResBadge{ 
      kID?:string;
      iGroup?:number;
      kGroupName?:string;
      iIndex?:number;
      kname?:string;
      kicon?:string;
      kBadgeName?:string;
      kbg?:string;
      kDes?:string;
      iHasSE?:number;
}


interface SeResBattleTag{ 
      kId?:string;
      eType?:number;
      kName?:string;
      kDesc?:string;
      iValueMin?:number;
      iValueMax?:number;
      kIcon?:string;
}


interface SeReschance{ 
      kID?:string;
      kGiftID?:string;
      kItemID?:string;
      kItemType?:number;
      iItemNumber?:number;
      iProbability?:number;
      iOpenGrade?:number;
}


interface SeResequipattr{ 
      kId?:string;
      kName?:string;
      kIcon?:string;
      kDes?:string;
      eType?:number;
      iweapon?:number;
      akGetWay?:Array<string>;
      iColor?:number;
      akSuperpower?:Array<string>;
      akSuperpowerStar?:Array<string>;
      akstarExp?:Array<string>;
      iUnitAtk?:number;
      iUnitHp?:number;
      iMagicAtk?:number;
      iCastleAtk?:number;
      iCastleHp?:number;
      iUnitAtkLevelGrow?:number;
      iUnitHpLevelGrow?:number;
      iMagicAtkLevelGrow?:number;
      iCastleAtkLevelGrow?:number;
      iCastleHpLevelGrow?:number;
      iUnitAtkStarGrow?:number;
      iUnitHpStarGrow?:number;
      iMagicAtkStarGrow?:number;
      iCastleAtkStarGrow?:number;
      iCastleHpStarGrow?:number;
      iAttackRange?:number;
      iSoldierType?:number;
      kMissle?:string;
      iMissleRoad?:number;
      iMissleSpeed?:number;
}


interface SeResequipSkin{ 
      kId?:string;
      itype?:number;
      kequipId?:string;
      kheroId?:string;
      kskinAdd?:string;
      iequipColour?:number;
      iequipStar?:number;
      kconctol?:string;
      akoffXY?:Array<string>;
}


interface SeResFestivalSign{ 
      kID?:string;
      etype?:number;
      iDay?:number;
      kItemID?:string;
      iNum?:number;
      kName?:string;
      kSkin?:string;
      kDesc?:string;
}


interface SeResglobalnotice{ 
      kID?:string;
      kText?:string;
      kStartTime?:string;
      kEndTime?:string;
      index?:number;
      kUi?:string;
      frame?:string;
}


interface SeResGuildIcon{ 
      kid?:string;
      kIcon?:string;
      kdes?:string;
      iUnlockLevel?:number;
}


interface SeResHeroRank{ 
      iHeroLv?:number;
      iHeroLvNeed?:number;
      iGreedExp?:number;
      iBlueExp?:number;
      iPurpleExp?:number;
      iOrangExp?:number;
      iGreedGold?:number;
      iBlueGold?:number;
      iPurpleGold?:number;
      iOrangGold?:number;
}


interface SeResKingEnergy{ 
      kId?:string;
      kUnitID?:string;
      akFormationChange?:Array<string>;
      iEnergyPer?:number;
      iEnergyStar?:number;
      kEnergyExtra1?:string;
      kEnergyExtra2?:string;
      iPveEnergyStar?:number;
      iPveEnergyPer?:number;
}


interface SeResLanguage_PT{ 
      kId?:string;
      kContent?:string;
}


interface SeResLevelDiag{ 
      kID?:string;
      kLevelID?:string;
      kUnitIcon?:string;
      kIconDesc?:string;
      iStyle?:number;
      iCondition?:number;
      kValue?:string;
      iDelayTime?:number;
      iLanguageID?:number;
      iIsAbleBreakin?:number;
      kInsertUnitID?:string;
      iStage?:number;
}


interface SeResLootPool{ 
      kID?:string;
      iPool?:number;
      iTeamId?:number;
      kItemId?:string;
      aiItemNum?:Array<number>;
      iWeight?:number;
      iAddtion?:number;
      kStartTime?:string;
      kEndTime?:string;
      iDayMaxNum?:number;
      iVip?:number;
}


interface SeResMonthSign{ 
      kID?:string;
      etype?:number;
      iDay?:number;
      kItemID?:string;
      iNum?:number;
      kName?:string;
}


interface SeRespveInfo{ 
      kid?:string;
      iType?:number;
      kGroup?:string;
      kName?:string;
      kDesContent?:string;
      kPriceID?:string;
      iPriceAmount?:number;
      ifreeFight?:number;
      akDisplayReward?:Array<string>;
      akReward?:Array<string>;
      akDrops?:Array<string>;
      akFirstDrops?:Array<string>;
      kbefore?:string;
      iunlockfog?:number;
      iLevel?:number;
      iUnitAtk?:number;
      iUnitHp?:number;
      iMagicAtk?:number;
      iCastleAtk?:number;
      iCastleHp?:number;
      akstar?:Array<string>;
      iMinTimeLimit?:number;
      kbgm?:string;
      kequipAdd1?:string;
      kequipAdd2?:string;
      kequipAdd3?:string;
      icardLv?:number;
      iequipLv?:number;
      iequipStar?:number;
      iequipColor?:number;
      iGamePurpose?:number;
      akBuildLable?:Array<string>;
      kpassTip?:string;
      iequipIn?:number;
}


interface SeResrecharge{ 
      kID?:string;
      kName?:string;
      kPayName?:string;
      iRMB?:number;
      iReturnDiamond?:number;
      iFirstDouble?:number;
      akItem?:Array<string>;
      iProperty?:number;
      kMark?:string;
      iOriginalCost?:number;
      iShow?:number;
      kDesc?:string;
      kMailMsg?:string;
      kContent?:string;
      kUIBg?:string;
      kUiIcon?:string;
      kIOSProductId?:string;
}


interface SeResShareImage{ 
      kID?:string;
      kType?:number;
      akName?:Array<string>;
      akDescribe?:Array<string>;
}


interface SeResSoulConfig{ 
      kID?:string;
      kKey?:string;
      kValue?:string;
      kNote?:string;
}


interface SeResStrongerPath{ 
      kID?:string;
      eType?:number;
      kName?:string;
      kDes?:string;
      iStar?:number;
      ePathType?:number;
}


interface SeResTask{ 
      kTaskID?:string;
      iModule?:number;
      iTab?:number;
      iGroup?:number;
      iIndex?:number;
      kName?:string;
      kDescription?:string;
      iType?:number;
      iValue?:number;
      iDayLimit?:number;
      aContent?:Array<string>;
      kStartTime?:string;
      kEndTime?:string;
      iTimeProperty?:number;
      iLevel?:number;
      iPvpLv?:number;
      iRate?:number;
      akAwards?:Array<string>;
      iPoints?:number;
      kbadgeId?:string;
      iAccumulation?:number;
      iStatistics?:number;
      kCheckId?:string;
      iDifficult?:number;
      kGoType?:string;
      iCanChange?:number;
      iAwards2?:number;
}


interface SeResUILang{ 
      kID?:string;
      kLang?:string;
      kEnglish?:string;
      kIndonesian?:string;
      kPortuguese?:string;
      kVietnamese?:string;
}


interface SeResUnlock{ 
      kId?:string;
      eFunc?:number;
      oContent?:string;
      kDesc?:string;
      eType?:number;
      iOpengrade?:number;
      iDesLanid?:number;
}


interface SeResArea{ 
      kID?:string;
      kName?:string;
      iPosion?:number;
      iType?:number;
      iCount?:number;
}


interface SeResBattleRank{ 
      kid?:string;
      iBattleRank?:number;
      iELOScore?:number;
      kDescribe?:string;
      iStarNum?:number;
      eProperty?:number;
      iMatchRank?:number;
      iMatchLevel?:number;
      iMatchgroup?:number;
      akAwards?:Array<string>;
      akRewards?:Array<string>;
      kIcon?:string;
      kIconBG?:string;
      kSIcon?:string;
      iGold?:number;
      kBossRace?:string;
      iMatch1?:number;
      iMatch2?:number;
      iMatch3?:number;
      akSequence?:Array<string>;
      kBattleBg?:string;
      eRankType?:number;
}


interface SeResCastleCompetiton{ 
      kID?:string;
      iMin?:number;
      iMax?:number;
      akRankRewards?:Array<string>;
      kRewordClass?:string;
}


interface SeResConfigMaps{ 
      kKey?:string;
      kValue?:string;
      kNote?:string;
}


interface SeResequipenhance{ 
      kId?:string;
      eBuildType?:number;
      eType?:number;
      ilevel?:number;
      akgreen?:Array<string>;
      akblue?:Array<string>;
      akpurple?:Array<string>;
      akorange?:Array<string>;
      akgreendecompose?:Array<string>;
      akbluedecompose?:Array<string>;
      akpurpledecompose?:Array<string>;
      akorangedecompose?:Array<string>;
}


interface SeResExchange{ 
      kID?:string;
      eType?:number;
      akTargetD?:Array<string>;
      ePriceType?:number;
      kPriceItem?:string;
      iPrice?:number;
      akExchangeItems?:Array<string>;
      iConsumable?:number;
      kConditionItem?:string;
      iAmount?:number;
      eConditionType?:number;
      eGroupType?:number;
      iGroup?:number;
      iIndex?:number;
      akDesplayRewards?:Array<string>;
      kStartTime?:string;
      kEndTime?:string;
}


interface SeResGetWay{ 
      kID?:string;
      kName?:string;
      eGetType?:number;
      iHasJumpBtn?:number;
}


interface SeResGuildAuthority{ 
      iId?:number;
      kTitle?:string;
      kName?:string;
      iChName?:number;
      iChMani?:number;
      iLvUp?:number;
      iDelMember?:number;
      iMax?:number;
      iAppoint?:number;
      iCheck?:number;
      iHigh?:number;
}


interface SeResHeroBoxZZY{ 
      kID?:string;
      iLevel?:number;
      kName?:string;
      eType?:number;
      iTypeCount?:number;
      iCardCount?:number;
      iGoldMin?:number;
      iGoldMax?:number;
      akPoolName?:Array<string>;
      akEquitablePool?:Array<string>;
      aiPoolWeight?:Array<number>;
      aiPoolMin?:Array<number>;
      aiPoolMax?:Array<number>;
      aiMaxPool?:Array<number>;
      aiMinPool?:Array<number>;
      akIcon?:Array<number>;
      iValue?:number;
      akRemove?:Array<string>;
      iReturnBack?:number;
}


interface SeResJJCReward{ 
      kID?:string;
      iMin?:number;
      iMax?:number;
      iAccurateRank?:number;
      akDailyRewards?:Array<string>;
      akSeasonRewards?:Array<string>;
      akDailyCrossRewards?:Array<string>;
      akSeasonCrossRewards?:Array<string>;
      akRobotNames?:Array<string>;
      akRobotAvatars?:Array<string>;
      kRewordClass?:string;
}


interface SeResLanguage_ID{ 
      kId?:string;
      kContent?:string;
}


interface SeResLevelConst{ 
      kID?:string;
      kDesc?:string;
      kUnitID?:string;
      iUnitRank?:number;
      kUnitPosX?:string;
      kUnitPosY?:string;
}


interface SeResLimitedGiftType{ 
      kID?:string;
      iValueMin?:number;
      iValueMax?:number;
      iWeightDiamond?:number;
      iWeightRMB?:number;
}


interface SeResMonthCard{ 
      kID?:string;
      kName?:string;
      kDescribe?:string;
      iColor?:number;
      kIcon?:string;
}


interface SeResnoticetext{ 
      kID?:string;
      eType?:number;
      kText?:string;
      kBg?:string;
      akContent?:Array<string>;
}


interface SeResRaceTalk{ 
      kID?:string;
      kName?:string;
      kDescription?:string;
      iProperty?:number;
      iColor?:number;
      kItemID?:string;
      kSkin?:string;
      kIcon?:string;
      akGetType?:Array<string>;
}


interface SeRessevendays{ 
      kID?:string;
      iDays?:number;
      iServer?:number;
      iIndex?:number;
      kDayName?:string;
      kDayDes?:string;
      kPersonName?:string;
      kServerName?:string;
      kTaskType?:number;
      iTaskValue?:number;
      iPopulation?:number;
      kTag?:string;
      kReward?:string;
      iFinishTime?:number;
}


interface SeResSoul{ 
      kId?:string;
      kDescription?:string;
      kName?:string;
      kIcon?:string;
      iColor?:number;
      akGetWay?:Array<string>;
      iUnlockCost?:number;
      iUnlockCost2?:number;
      kSuperpower?:string;
      iCastleAtk?:number;
      iCastleHp?:number;
      iCastleAtkLevelGrow?:number;
      iCastleHpLevelGrow?:number;
      iIsShow?:number;
}


interface SeResSound{ 
      kID?:string;
      kUrl?:string;
      iVolume?:number;
      kDesc?:string;
}


interface SeResSystemMail{ 
      kID?:string;
      kTitle?:string;
      kDesc?:string;
      iProperty?:number;
      kStartTime?:string;
      iDuration?:number;
      akItems?:Array<string>;
}


interface SeResTownItem{ 
      kId?:string;
      CNname?:string;
      CNDESC?:string;
      kName?:string;
      kDescribe?:string;
      kTipsDescribe?:string;
      iColor?:number;
      iProperty?:number;
      eTypeA?:number;
      iDurationTime?:number;
      kValueA?:string;
      kValueB?:string;
      kValueC?:string;
      kIcon?:string;
      iMaxPileCount?:number;
      eTipsType?:number;
      kIcon_222?:string;
      kEndTime?:string;
      iIndex?:number;
      akItemIcons?:Array<string>;
      akGetWay?:Array<string>;
      iItemValue?:number;
}


interface SeResUnitLabel{ 
      kId?:string;
      kName?:string;
      kDesc?:string;
      kNameLan?:string;
}


interface SeResZhanQi{ 
      kID?:string;
      kName?:string;
      kDescription?:string;
      iProperty?:number;
      iColor?:number;
      kSkin?:string;
      kIcon?:string;
      akGetType?:Array<string>;
      iHasSE?:number;
}


interface SeResActivityPass{ 
      iLv?:number;
      iLvNeed?:number;
      kLvItem?:string;
}


interface SeResBattleField{ 
      kID?:string;
      kName?:string;
      eType?:number;
      kDescription?:string;
      iColor?:number;
      kIcon?:string;
      akPath?:Array<string>;
      akGetType?:Array<string>;
      kBridge?:string;
      iOpen?:number;
}


interface SeResBuffer{ 
      kID?:string;
      eType?:number;
      iLevel?:number;
      eSuperposition?:number;
      kMutex?:string;
      iState?:number;
      kEeffect?:string;
}


interface SeResChartTable{ 
      kID?:string;
      eType?:number;
      iCrossSever?:number;
      kName?:string;
      iInSeason?:number;
      iOpenGrade?:number;
      kDesc?:string;
      kIcon?:string;
      kTop3?:string;
      kStartDate?:string;
      kEndDate?:string;
      kJudgeItemID?:string;
      iMaxPlayer?:number;
}


interface SeResequipEnchant{ 
      kId?:string;
      iColor?:number;
      iStar?:number;
      iUnitAtk?:number;
      iUnitHp?:number;
      iMagicAtk?:number;
      iCastleAtk?:number;
      iCastleHp?:number;
}


interface SeResequipsuperpower{ 
      kId?:string;
      eType?:number;
      iValue?:number;
}


interface SeResGameServer{ 
      kid?:string;
      kPlt?:string;
      kName?:string;
      kDisplayName?:string;
      iIsNew?:number;
      iIsRecommended?:number;
      iStayTime?:number;
      kappid?:string;
      kFirstTable?:string;
      kDefaultTable?:string;
      iBugWndID?:number;
      iNoticeWndID?:number;
      iPlayerInfoID?:number;
      iLoadingLogoID?:number;
      iShow?:number;
}


interface SeResGuide{ 
      kId?:string;
      iGuide?:number;
      iStep?:number;
      kNotice?:string;
      iNoticeTextCD?:number;
      iStyle?:number;
      kStyleContent?:string;
      iWnd?:number;
      iTrigger?:number;
      iFight?:number;
      iAction?:number;
      iOnce?:number;
      akCondition?:Array<string>;
      akUiState?:Array<string>;
      iDoAction?:number;
      akActionCondition?:Array<string>;
      kPlace?:string;
      aiNoticePoint?:Array<number>;
      iPause?:number;
      iStopAi?:number;
      iMask?:number;
      RaceOpp?:string;
      myRace?:string;
      aReward?:Array<string>;
}


interface SeResHeroBoxEgg{ 
      kID?:string;
      eType?:number;
      kName?:string;
      akPoolName?:Array<string>;
      aiPoolWeight?:Array<number>;
      aiTurnLimit?:Array<number>;
}


interface SeResHeroSkin{ 
      kID?:string;
      kHeroId?:string;
      kName?:string;
      iIndex?:number;
      iVisible?:number;
      iColor?:number;
      kIcon?:string;
      kDrawing?:string;
      kModel?:string;
      akPartsPreview?:Array<string>;
      akAreaPreview?:Array<string>;
      akMarkPreview?:Array<string>;
      akGroupSkins?:Array<string>;
      aModelMisslePos?:Array<string>;
      aModelCenterPos?:Array<string>;
      iScale?:number;
      kMissleNew?:string;
      iMissleRoad?:number;
      iMissleSpeed?:number;
      kHitEffect?:string;
      kSound?:string;
      kFlyAni?:string;
      iFlyRoad?:number;
      iFlySpeed?:number;
      kFlySound?:string;
      akFlyAni?:Array<string>;
      akSkillID?:Array<string>;
      akSkillPath?:Array<string>;
      kShopId?:string;
      kMissle?:string;
      iDeveloped?:number;
}


interface SeResLanguage_CN{ 
      kId?:string;
      kContent?:string;
}


interface SeResLanguage_VI{ 
      kId?:string;
      kContent?:string;
}


interface SeResLevelInfo{ 
      kid?:string;
      iRankType?:number;
      eGroupType?:number;
      iProperty?:number;
      kGroup?:string;
      iLevel?:number;
      kName?:string;
      kDesContent?:string;
      iMapID?:number;
      kPriceID?:string;
      iPriceAmount?:number;
      akDisplayReward?:Array<string>;
      kDisplayBaseReward?:string;
      aiChooseMultiple?:Array<number>;
      kScoreUnitID?:string;
      iScoreAddition?:number;
      akBaseRaward?:Array<string>;
      akDrops?:Array<string>;
      iMinTimeLimit?:number;
      kDisplayPic?:string;
}


interface SeResLordAIinfo{ 
      kid?:string;
      icastleLv?:number;
      kLordID?:string;
      pro?:string;
      kweaponID?:string;
      kclothesID?:string;
      ktreasureID?:string;
}


interface SeResNameLib{ 
      kID?:string;
      eType?:number;
      kWords?:string;
}


interface SeRespveMapInfo{ 
      kid?:string;
      eCountry?:number;
      kCastleName?:string;
      eCastle?:number;
      kpos?:string;
      ishowId?:number;
}


interface SeResScoreCompetiton{ 
      kID?:string;
      eCompetitionType?:number;
      iMin?:number;
      iMax?:number;
      akRankRewards?:Array<string>;
      kRewordClass?:string;
}


interface SeResShopMall{ 
      kID?:string;
      eType?:number;
      iIsOpen?:number;
      iPos?:number;
      iOpenGrade?:number;
      iProperty?:number;
      eItemType?:number;
      akContent?:Array<string>;
      aiValue?:Array<number>;
      iCount?:number;
      eFreshType?:number;
      kPreID?:string;
      iOpenRank?:number;
      iOpenELO?:number;
      kStartTime?:string;
      iUseLoginTime?:number;
      iLasttime?:number;
      akUISkin?:Array<string>;
      kAdContent?:string;
      iPlatform?:number;
      kBaiduProductId?:string;
      iTab?:number;
      iVipDisount?:number;
      iVipNeedLevel?:number;
      kExtraValue?:string;
      iAllianceRank?:number;
      iOpenJJCRank?:number;
}


interface SeResSoulEnhance{ 
      ilevel?:number;
      iGreen1?:number;
      iGreen2?:number;
      iGreen3?:number;
      iGreen4?:number;
      iGreen5?:number;
      iBlue1?:number;
      iBlue2?:number;
      iBlue3?:number;
      iBlue4?:number;
      iBlue5?:number;
      iPurple1?:number;
      iPurple2?:number;
      iPurple3?:number;
      iPurple4?:number;
      iPurple5?:number;
      iOrange1?:number;
      iOrange2?:number;
      iOrange3?:number;
      iOrange4?:number;
      iOrange5?:number;
      iSuperOrange1?:number;
      iSuperOrange2?:number;
      iSuperOrange3?:number;
      iSuperOrange4?:number;
      iSuperOrange5?:number;
}


interface SeResSuperMarket{ 
      kID?:string;
      eItemType?:number;
      akItemID?:Array<string>;
      kName?:string;
      kDesc?:string;
      eType?:number;
      iPrice?:number;
      akExtraPay?:Array<string>;
      kPayItem?:string;
      eOpen?:number;
      iOpenGrade?:number;
      iRate?:number;
      iDiscount?:number;
      iSaleWeight?:number;
      kMark?:string;
      iOriginalCost?:number;
      iLabel?:number;
      kValueA?:string;
}


interface SeResthanks{ 
      kID?:string;
}


interface SeResUnit{ 
      kID?:string;
      iColour?:number;
      kName?:string;
      kDescription?:string;
      kDescribe?:string;
      iDropPreview?:number;
      iSoldierType?:number;
      iLord?:number;
      iLordEnergy?:number;
      eFaction?:number;
      iPreCD?:number;
      iOpenGrade?:number;
      aiSkillCheck?:Array<number>;
      nMinDescribe?:string;
      akSuperPower?:Array<string>;
      akSuperPowerLevel?:Array<string>;
      akAwakeSuperPower?:Array<string>;
      akGroupUnits?:Array<string>;
      iGroupLevel?:number;
      iAttack?:number;
      iMaxHP?:number;
      iAttackCD?:number;
      iAttackRange?:number;
      iMoveSpeed?:number;
      iAlertRange?:number;
      iLaunchTime?:number;
      iHit?:number;
      iOpen?:number;
      iBody?:number;
      eAITag?:number;
      akContent?:Array<string>;
      akLabel?:Array<string>;
      iGold?:number;
      akGetType?:Array<string>;
      iSpineUsed?:number;
      kSkin?:string;
      iSkinTag?:number;
      akInvisible?:Array<string>;
      iIfHand?:number;
      aiAttackLicense?:Array<number>;
      iLordShow?:number;
      iBossRange?:number;
      iSoldPrice?:number;
      kCityEffect?:string;
}


interface SeResupgrade{ 
      kID?:string;
      kKey?:string;
      kValue?:string;
      targetType?:number;
      targetID?:string;
      akSrcLevel?:Array<string>;
      iConvet?:number;
      akTargetLevel?:Array<string>;
      eMode?:number;
}


declare enum SeEnumBuffstateiCheckList{ 
      YinCang=1,
      BuXunDi=2,
      BuGongJi=3,
      BuYiDong=4,
      BuPengZhuang=5,
      BuBeiYouJunZhiXiang=6,
      BuBeiYouJunFanWei=7,
      BuBeiDiJunZhiXiang=8,
      BuBeiDiJunFanWei=9,
      MianYiWuLiShangHai=10,
      MianYiMoFaShangHai=11,
      MianYiKongZhi=12,
      BuTongJiDuiYou=13,
      BuChuFaYiZhiJiNen=14,
      BuChuFaBeiDongJiNen=15,
      BuChuFaZhuDongJiNen=16,
      ZhongZhiDaDuan=17,
      JingZhiDaDuan=18,
      MianYiDiFangFaShu=19,
}


declare enum SeEnumBuffstateiState{ 
      BingDong=1,
      TunShi=2,
      ChuanSong=4,
      HunMi=8,
      ShiKong=16,
      GongSuBianHua=32,
      YiSuBianHua=64,
      WuMian=128,
      WuDi=256,
      ChiXuDiaoXue=512,
      MianYiDiFangFaShu=1024,
      MianYiJiTui=2048,
      MoMian=4096,
      ChouHenZhi=8192,
      DengJiBianHua=16384,
      XueLiangBianHua=32768,
      GongJiBianHua=65536,
      ShouShangJiaShen=131072,
      GuiHuo=262144,
      XiaoShi=524288,
      XianYu=1048576,
      NenLiangBianHua=2097152,
      MianYiKongZhi=4194304,
      BaiYi=8388608,
      BuQu=16777216,
      YinChangShiJianBianHua=33554432,
      DingShen=67108864,
      ChaoFeng=134217728,
      SheChengBianHua=268435456,
      YingHuo=536870912,
      HuDun=1073741824,
      ZhiLiaoBianHua=-2147483648,
}


declare enum SeEnumequipsuperpowerLangeType{ 
      ZhunBeiShiJianSuoDuan=0,
      YiDongSuDuTiSheng=1,
      GongJiSuDuTiShengBaiFenBi=2,
      DanWeiGongJiTiShengGuDingZhi=3,
      DanWeiGongJiTiShengBaiFenBi=4,
      DanWeiXueLiangTiShengGuDingZhi=5,
      DanWeiXueLiangTiShengBaiFenBi=6,
      FaShuKaGongJiTiShengBaiFenBi=7,
      FaShuKaGongJiTiShengGuDingZhi=8,
      ChengQiangGongJiTiShengGuDingZhi=9,
      ChengQiangGongJiTiShengBaiFenBi=10,
      ChengQiangXueLiangTiShengGuDingZhi=11,
      ChengQiangXueLiangTiShengBaiFenBi=12,
      JiangDiDiFangDanWeiGongJiBaiFenBi=13,
      WuGuoDanWeiGongJiTiShengGuDingZhi=14,
      WuGuoDanWeiGongJiTiShengBaiFenBi=15,
      ShuGuoDanWeiGongJiTiShengGuDingZhi=16,
      ShuGuoDanWeiGongJiTiShengBaiFenBi=17,
      WeiGuoDanWeiGongJiTiShengGuDingZhi=18,
      WeiGuoDanWeiGongJiTiShengBaiFenBi=19,
      QunXiongDanWeiGongJiTiShengGuDingZhi=20,
      QunXiongDanWeiGongJiTiShengBaiFenBi=21,
      TiShengZhuGongSheCheng=22,
}


declare enum SeEnumGameTipsiType{ 
      JingYan=0,
      MouLueTang=1,
      PaiWeiSaiPiPei=2,
      KaPaiShengJi=3,
      ZhanDouShengLi=4,
      ZhanDouShiBai=5,
      ZaiRuYouXi=6,
      ZhengBaSai=7,
}


declare enum SeEnumHeroBoxTypeeType{ 
      XunLianBaoXiang=1000,
      XunLianBaiYin=1001,
      XunLianHuangJin=1002,
      YuanMuBaoXiang=2,
      BaiYinBaoXiang=3,
      HuangJinBaoXiang=4,
      MiYinBaoXiang=5,
      JingGangBaoXiang=6,
      XuanTieBaoXiang=7,
      LingYuBaoXia=8,
      ChuanQiBaoXiang=9,
      LvKaBao=11,
      LanKaBao=12,
      ZiKaBao=13,
      ChengKaBao=14,
      SaiJiKaBao=15,
      RiChangBaoXiang=19,
      ZhengFuZheBaoXia=20,
      ChuanQiQiangJunBaoXia=21,
      ShiShiQiangJunBaoXia=22,
      QuanKaiLingYuBaoXia=23,
      SaiJiXianDingKaBao=24,
      QuanWuJiangKaBao=25,
      XinShouYinDaoKaBao=26,
      YiYuanFuDai=27,
      ZhangLiaoXianDingKaBao=28,
      MianFeiChouJiang=29,
      ZaJinDan=30,
      HongBaoLaXin=31,
      ZiJinKaBao=32,
      ZhongQiuChouJiang=33,
      ZhuangBeiKaBao=34,
      MangHe=36,
      ZhuanPanShiLianChou=37,
      RongLianLuChouKa=38,
      HuoDongLiHe=101,
}


declare enum SeEnumHeroBoxTypeeAniType{ 
      BaoXiang=0,
      KaBao=1,
      JingGang=2,
      XuanTie=3,
      KaBaoDanChou=4,
      KaBaoWuLian=5,
}


declare enum SeEnumHeroBoxTypeiColour{ 
      Bai=0,
      Lv=1,
      Lan=2,
      Zi=3,
      Cheng=4,
      Jin=5,
      AnJin=6,
}


declare enum SeEnumInviteCodeeType{ 
      YiCiYouXiao=1,
      DuoCiYouXiao=2,
      BuPanDingZuDeYiCiYouXiao=3,
}


declare enum SeEnumInviteCodeeReFresh{ 
      Wu=0,
      MeiZhou=1,
      MeiYue=2,
      MeiRi=3,
}


declare enum SeEnumLimitedGiftRateeType{ 
      RenMinBiLiBao=0,
      ZuanShiLiBao=1,
}


declare enum SeEnumSuperPoweriType{ 
      ChaoFeng=0,
      HengSao=2,
      MaBi=6,
      BingDong=11,
      HanHou=12,
      JiTui=13,
      DuoZhongGongJi=14,
      ZhuoShao=15,
      GongSu=16,
      ChongFeng=18,
      QunChao=19,
      GuDan=22,
      ZiBao=23,
      YinChang=28,
      ZhaoHuanZhen=29,
      DuoHun=30,
      JiHe=33,
      BaoZhaSheJi=34,
      FaShuQunGong=35,
      ShangHaiJiTui=36,
      KuangBao=37,
      LuoLei=38,
      ZhuoShaoFaShu=39,
      JuFeng=40,
      DouZhuanXingYi=41,
      WangYu=42,
      FenLie=45,
      TanChi=47,
      HuanXiang=48,
      ChongZhen=49,
      FanShi=50,
      SanMan=51,
      GuiHuo=52,
      LeiYun=53,
      XueGong=54,
      GongMing=55,
      FuSheng=56,
      BingJia=60,
      QiangHua=61,
      MiaoShu=62,
      DiHuo=63,
      ZhiLiao=64,
      XianYu=65,
      GouZi=66,
      ZhanShenXiaFan=67,
      PiLiDan=68,
      MangQu=69,
      BaiYiDuJiang=70,
      ZhiLiaoFaShu=71,
      JiNenQieHuan=72,
      FaQiuLei=73,
      FaQiuBing=74,
      FaQiuHuiNen=75,
      BuQu=76,
      WuHun=79,
      XuanFengZhan=81,
      ZhanSha=82,
      ZhaoHun=83,
      YingHuo=84,
      QianTui=85,
      LianHuo=86,
      ChenMou=87,
      HuiNenJiaSu=88,
      ManNen=89,
      ZhanChangKuoDa=90,
      LXDuZhan=91,
      LXQianZhan=92,
      YiDong=93,
      LXLaChe=94,
      LXGongCheng=95,
      LXXiXue=96,
      LXHuDun=97,
      LXFengKa=98,
      LXFaDai=99,
      LXZhaoHuan=100,
      LXZhongLi=101,
      LXLuanRu=102,
      LXChuChang=103,
      LXBaoLuan=104,
      LXNenLiangLiChang=105,
      TaiPingYaoShu=106,
      QueXian=107,
      JiaYin=108,
      BoMing=109,
      SuoXin=110,
      LXYanMie=111,
      ZhanXiong=112,
      YiCai=113,
      ChongShe=114,
      ShenSu=115,
      JunTun=116,
      JianCai=117,
      JianQi=118,
      XianJian=119,
      YuanChengMianYi=120,
      ShangHaiLeiJia=121,
      ShouShangGuDing=122,
      ZhaoHuanXiaoBing=123,
      DiLeiZhenFa=124,
      ChuanSongZhenFa=125,
      JieFangLaoLong=126,
      ZhaoHuanFuBing=127,
      KuoZhanFanWei=128,
      ZengJiaNuQi=129,
      ShanMaiZhuanYong=130,
      NuQiXiTong=131,
      NenLiangHuiFu=132,
      NenLiangJiaSu=133,
      DuiShou=134,
      LBZhongLi=135,
      LBZhaoHuan=136,
      SQFanJi=137,
      SQBaTi=138,
      SQBingDong=139,
      SQYuTang=140,
      CCHaoLing=141,
      CCFuHuo=142,
      CCFuZhi=143,
      CCFuSheng=144,
      CCShiCong=145,
      ZengJiaZhuGongNenLiang=146,
      ZhuGongNenLiangJianShao=147,
      NuQiShuZhi=148,
      FangJun=149,
      YiJi=150,
      ZhiHeng=151,
      MengHu=152,
      JianXiong=153,
      LeiJi=154,
      NiTian=155,
      GuiDao=156,
      BaJianShu=157,
      MingYong=158,
      JiFangQiangHua=159,
      RenDe=160,
      TaoYuan=161,
      JiangGongSu=162,
      DuiZhi=163,
      QingHong=164,
      YingWuShi=165,
      BaWangDuanTi=166,
      BaDao=167,
      FanWeiZengJiaYiSu=168,
      FanWeiZengJiaGongJi=169,
      FanWeiZengJiaGongSu=170,
      HuangTian=171,
      ZiBaoGongJi=172,
      RongHeJuHan=173,
      GunShi=174,
      FaShuPoHuai=175,
      RongHebuff=176,
      ZhenTong=177,
      YanShengShuiZei=178,
      TianJiangQiBing=179,
      JinFan=180,
      QiXi=181,
      YuSiWangPo=182,
      FaShuPaiKangXing=183,
      NenLiangSuLv=184,
      NuQiJiTui=185,
      ZhuChengJiTui=186,
      HuXiao=187,
      GuiXin=188,
      AIYingDui=189,
      ZhuGongFanMoFa=190,
      BOSSFanMoFa=191,
      ZhuChengFanMoFa=192,
      CaoChuanJieJian=193,
      ChuYeGuan=194,
      ZhuChengJiaTeLin=195,
      JueWangZhiZhong=196,
      ZhuChengHuJia=197,
      SanRenChengHu=198,
      BingFengWangZuo=199,
      JingXiang=200,
      ZiDongFangYu=201,
      DiYuShiZhe=202,
      YunShu=203,
      HuangJinChuanSongMen=204,
      JiHun=205,
      ZhuJi=206,
      JiHunXiHui=207,
      LieFeng=208,
      ShuangYi=209,
      ShiZhi=210,
      ChuanXin=211,
      FengXing=212,
      TianYi=213,
      MaCheFangZhi=214,
      MianYiKongZhi=215,
      LiuSha=216,
      FengShan=217,
      JinGu=218,
      JuShi=219,
      BOSSShengQi=220,
      BHShengQi=221,
      BHJinGu=222,
      BHShuFu=223,
      PingZhang=224,
      GongJiYu=225,
      HuanYingDaJi=226,
      JingZhunDaJi=227,
      XWPingZhang=228,
      XWTianWei=229,
      XWFuHuo=230,
      XWHuaXing=231,
      SheChengYu=232,
      FanFengZhuGe=233,
      TengShePaoDan=234,
      ShuaiCai=235,
      CaoCongSha=236,
      BingFeng=237,
      ZhanJiaFengBao=238,
      YiZhong=239,
      JieErLianSan=240,
      HuHuaShiZhe=241,
      BingFengBao=242,
      LianYi=243,
      ShengMingJiaChengWuXiao=244,
      NiuMa=245,
      MengJunLingQi=246,
      ZhenDiMianYi=247,
      DongZhuoPaoXiao=248,
      DongZhuoDuZhan=249,
      Nie=250,
      LianHuan=251,
      FaShuShangHai=252,
      DiYuYuanCheng=253,
      QiaoBian=254,
      JueJi=255,
      TongMengZengYi1=256,
      TongMengZengYi2=257,
      TongMengZengYi3=258,
      TongMengZengYi4=259,
      TongMengQiangHua1=260,
      TongMengQiangHua2=261,
      TongMengQiangHua3=262,
      TongMengQiangHua4=263,
      ZiDongHuiFu=264,
      ShouPaiQiangHua=265,
      FangYuPoHuai=266,
      ZhuiJiGongJi=267,
      RenWangZhiQu=268,
      BeiShuiYiZhan=269,
      ShengMingQiangHua=270,
      FangYuZiShi=271,
      GongChengZhuanJia=272,
      FaShuKangXing=273,
      ZhuChengShengMingQiangHua=274,
      ZhuChengGongSuQiangHua=275,
      ZhuChengHuiXue=276,
      ZhuChengGongJiQiangHua=277,
      ZhuChengHunMi=278,
      ZhuChengSheChengQiangHua=279,
      ZiBaoZhaDan=280,
      ZhuChengBingDong=281,
      GongMingHuanJing=282,
      YuanSuQinHe=283,
      HuoJianZhuanJia=284,
      ZhiChi=285,
      XianDeng=286,
      XiaoGuo=287,
      DaChuShouPai=288,
      JinJiYiShi=289,
      ZhaoHuanZhiXin=290,
      ShuiYuanSu=291,
}


declare enum SeEnumSuperPowereSkilltype{ 
      GuYou=1,
      BeiDong=2,
      ZhuDong=3,
      YiZhi=4,
}


declare enum SeEnumSuperPoweriTargetCamp{ 
      DiFang=1,
      WoFang=2,
      ZhuCheng=4,
}


declare enum SeEnumTownBuffereType{ 
      YueKa=1,
      XiangZiJiaSu=2,
      QiTa=3,
      QuGuangGao=4,
      BaoXiangLiXianJieSuo=5,
      JiangDuanBaoHu=6,
      ChenHao=7,
      ShangXianTongZhi=8,
      YueKaGouMaiEWaiCiShu=9,
      JingShiYueKa=10,
      ZhuangBeiYueKa=11,
      GuanKaShuangBei=12,
}


declare enum SeEnumTownBufferiProperty{ 
      SaiJiQingChu=1,
}


declare enum SeEnumVIPeNameColor{ 
      Hong=1,
      Jin=2,
}


declare enum SeEnumActivityeType{ 
      DuiHuan=0,
      ZhaoMu=1,
      ChongDuan=2,
      LeiJiChongZhi=11,
      YingXiongYuRe=4,
      YingXiongJiangLin=5,
      FengWangZhiLu=6,
      ZaJinDan=7,
      HongBaoLaXin=8,
      YueKaGuangGao=9,
      ShenMiJinNan=10,
      DuDuSongLi=12,
      GuoGuanZhanJiang=13,
      DouYinJiZan=14,
      ZhuChengPaiWeiSai=15,
      HuoDongFuBen=16,
      LianXuChongZhi=17,
      ChongZhiFanLi=18,
      ZhongQiuZhuanPan=19,
      LeiJiChongZhiTianShu=20,
      JieRiQianDao=21,
      JieRiFanPai=22,
      JinJieZaJinDan=23,
      JieRiLiBao=24,
      CaoCaoZhuanPan=25,
      XinShouErXuanYi=26,
      BingFuQianDao=27,
      YingXiongQianDao=28,
      JieRiMangHe=29,
      ZhuanPanShiLianChou=30,
      JingShiYueKa=31,
      ZhuangBeiYueKa=32,
      DuiHuanHuoDong=33,
      RongLuHuoDong=34,
      GuZiShangDian=36,
      ZuanShiXuYuan=37,
      DuanWuMangHe=38,
      DuanWuDuiHuan=39,
      ChengChangJiJin=40,
      YongChiPaiDui=41,
      HuiGuiHuoDong=42,
      HuiGuiZhuanPan=43,
      ZhangJiaoZhuanPan=44,
      ZhenYingDuiKang=45,
      ShenMiShangDian=46,
      WanShengDaoDan=47,
      DuiDuiKuangHuan=48,
      GanEnHuiKui=49,
      ZhuHouFaDong=50,
      NianShouMiBao=51,
      TongMengBOSS=52,
}


declare enum SeEnumActivityiProperty{ 
      SaiJiZhongZhi=1,
}


declare enum SeEnumBattleTageType{ 
      ZhongJieLianSheng=0,
      WoFangLianSheng=1,
      DuiZhanShiJian=2,
      ShengLiZheShengYuXueLiang=3,
}


declare enum SeEnumchancekItemType{ 
      DanWei=1,
      DaoJu=2,
      ZhenDi=3,
      BiaoQing=4,
      ZhuCheng=5,
      ZhuangBei=6,
}


declare enum SeEnumequipattreType{ 
      WuQi=0,
      KuiJia=1,
      BaoWu=2,
}


declare enum SeEnumequipattriColor{ 
      Lv=1,
      Lan=2,
      Zi=3,
      Cheng=4,
}


declare enum SeEnumequipattriSoldierType{ 
      GongBing=0,
      QiBing=1,
      BuBing=2,
      DunBing=3,
      Ta=4,
      FaShu=5,
      PVETa=6,
      ZhaoHuan=7,
      JianZhu=8,
      ZhangAiWu=9,
}


declare enum SeEnumequipattriMissleRoad{ 
      PaoWuXian=0,
      ZhiXian=1,
      GaoPaoXian=2,
      DingDianGaoPaoXian=3,
}


declare enum SeEnumequipSkinitype{ 
      WuQi=1,
      BaoWu=2,
}


declare enum SeEnumFestivalSignetype{ 
      JieRiQianDao=0,
}


declare enum SeEnumLevelDiagiStyle{ 
      BOSS=0,
      Zuo=1,
      You=2,
}


declare enum SeEnumLevelDiagiCondition{ 
      start=0,
      next=1,
      switch=2,
      unit=3,
      end=4,
}


declare enum SeEnumMonthSignetype{ 
      QianDaoJiangLi=0,
      LeiJiQianDaoJiangLi=1,
}


declare enum SeEnumpveInfoiType{ 
      PuTong=0,
      KunNan=1,
      DiYu=2,
}


declare enum SeEnumpveInfoiequipColor{ 
      Lv=1,
      Lan=2,
      Zi=3,
      Cheng=4,
      Jin=5,
}


declare enum SeEnumrechargeiProperty{ 
      BuJiRuLeiJiChongZhi=1,
      BuJiRuShouChong=2,
      LiJiShiYong=4,
      BuJiRuLeiJiChongZhiTianShu=8,
}


declare enum SeEnumShareImagekType{ 
      TongYong=0,
      ZhaoMu=1,
      FenXiangYueChi=2,
      YaoQing2v2=4,
      KaiXiang=5,
      ChouKaTongYong=6,
      MianFeiChouYiCi=7,
      ChongZhiFanLi=8,
      FengWangFenXiang=9,
      PVEShengLiFenXiang=10,
      PengYouQuanFenXiang=11,
      ZhangJiaoZhuanPan=12,
      HuoJiFenXiang=13,
}


declare enum SeEnumStrongerPatheType{ 
      ZuanShi=1,
      JinBi=2,
      YueChi=3,
      KaPai=4,
}


declare enum SeEnumStrongerPathePathType{ 
      ZuanShiChongZhi=1,
      KanShiPin=2,
      XinShouDaLi=3,
      RenWuJieMian=4,
      YueKaJieMian=5,
      NiTiWoGai=6,
      FenXiangYouLi=7,
      ShouCangYouLi=8,
      MeiRiJingXuan=9,
      MeiRiQianDao=10,
      ZhanXunShangDian=11,
      ChuanQiKaBao=12,
      CangBaoGe=13,
      HaoYouJieMian=14,
}


declare enum SeEnumTaskiModule{ 
      HuoDong=0,
      ShouChong=1,
      MeiRi=2,
      ChengJiu=3,
      JiFenXiangZi=4,
      MeiRiBaoXia=5,
      LeiJiChongZhi=6,
      YingXiongYuRe=7,
      ShiXiaoXingHuoDong=8,
      ShouCiDengLu=9,
      MeiRiShuaXin=10,
      YongBuShuaXin=11,
      WanChengShuaXin=12,
      BaoMingShuaXin=13,
      PVEXingShuJiangLi=14,
      HuiGuiShuaXin=15,
}


declare enum SeEnumTaskiTab{ 
      DuanWei=0,
      ZhanDou=1,
      BaoXiang=2,
      HaoYou=3,
      ZiYuan=4,
      ShouChongDaLi=5,
      MeiRiRenWu=6,
      ChongDuan=7,
      LeiJiChongZhi=8,
      YingXiongYuRe=9,
      FengWangZhiLu=10,
      ZhenDi=11,
      ShiDuanJiangLi=12,
      TouTiaoFenXiangShiPin=13,
      GuanZhuTouTiaoHao=14,
      DuoWangBaYe=15,
      ZhuChengTaoZhanSai=16,
      LuXunFuBen=17,
      MeiRiZhengBaSaiRenWu=18,
      LianXuChongZhi=19,
      MeiRiGuangGao=20,
      ShangChengMianFei=21,
      FengWangRiChang=22,
      FengWangShengJi=23,
      FengWangZhanDou=24,
      ChangJingZhiJiangLi=25,
      LeiJiChongZhiTianShu=26,
      ShangJinSaiShengChang=27,
      PVEXingShuJiangLi=28,
      WenDingZhongYuan=29,
      JieRiRiChang=30,
      JieRiChengJiu=31,
      DuanWuRenWu=32,
      YongChiPaiDui=33,
      ChiBiDengLu=34,
      WeiXinFenXiangPengYouQuan=35,
      LaoWanJiaHuiGuiMeiRi=36,
      LaoWanJiaHuiGuiChengJiu=37,
      LaoWanJiaDengLuJiangLi=38,
      ZhenYingDuiKangChengJiu=39,
      WanShengDaoDan=40,
      WanShengMangHe=41,
      GeRenTongMengRenWu=42,
      MengJunTongMengRenWu=43,
      GanEnHuoDong=44,
      ZhuHouFaDong=45,
      NianShouMiBao=46,
}


declare enum SeEnumTaskiType{ 
      WuJiangShengJi=2,
      DuanWeiTiSheng=3,
      WuJiangShuLiang=5,
      XiaoFeiZuanShi=6,
      PaiWeiLianSheng=7,
      LeiJiChongZhi=8,
      ZhanDouShengLi=9,
      ShiYongKaPai=10,
      ChengChiShuChu=11,
      HuoDeJiFen=12,
      KaiQiXiangZi=13,
      XiaoHaoJinBi=14,
      GuanKanLuXiang=15,
      ShiYongBiaoQing=16,
      DengLuYouXi=17,
      DuoWangJiFen=18,
      PiPeiShengLi=19,
      PiPeiPoCheng=20,
      KaiChuKaPai=24,
      ZengSongYueChi=25,
      HaoYou1v1=26,
      HaoYou2v2=27,
      HuoQuDaoJu=28,
      YueKaWanJia=29,
      ShouChong=30,
      ZhanDouCanYu=31,
      ZhengBaSaiShengLi=32,
      ZhengBaSaiFenShu=33,
      ChengJiuDian=34,
      YingXiongYuRe=35,
      RenWuTongJi=36,
      JinXingZhanDou=37,
      ShanChuDaoJu=38,
      FenXiangShiPin=39,
      GuanZhuTouTiaoHao=40,
      ZhuChengJiBie=41,
      DiTuTongGuan=42,
      ShangChengGouMai=43,
      LianXuChongZhi=44,
      MeiRiLingJiang=45,
      FenXiangYouXi=46,
      JinRuChangJingZhi=47,
      WeiXinKeFuXiaoXi=48,
      LeiJiChongZhiTianShu=49,
      NanDuXingShu=50,
      ZhuangBeiQiangHua=51,
      ZhuangBeiShengXing=52,
      ZhuangBeiFuMo=53,
      JinXingGuanKa=54,
      SaoDangGuanKa=55,
      TongGuanGuanKa=56,
      HuoDeZhuangBei=57,
      ZhuangBeiShengXingJingYan=58,
      DanBiChongZhi=59,
      JinRuChiBi=60,
      ZongChongZhiEDu=61,
      TongMengJuanXian=62,
      FenXiangLianJie=63,
      ZhuHouFaDongPaiMing=64,
      TongMengJuanKa=65,
}


declare enum SeEnumTaskiTimeProperty{ 
      DuiRiQiYouXiao=1,
      DuiShiJianYouXiao=2,
      ZiDongLingQu=4,
      JiangLiFaSongZhiYouXiang=8,
}


declare enum SeEnumTaskiStatistics{ 
      FuWuDuan=1,
      KeHuDuan=0,
}


declare enum SeEnumUnlockeFunc{ 
      ZhanShi=0,
      ZhanDou2v2=1,
      ZhenRong=2,
      PaiXingBang=3,
      ZhenFaXiTong=4,
      JingXuanGeZi=5,
      SaiJi=6,
      ZhuLuZhongYuan=7,
}


declare enum SeEnumUnlockeType{ 
      ZhuChengDengJi=0,
      DangQianDuanWei=1,
      LiShiDuanWei=2,
      ZhiZunDengJi=3,
}


declare enum SeEnumBattleRankeProperty{ 
      JiangDuanBaoHu=1,
      ZuiZhongCeng=2,
}


declare enum SeEnumBattleRankeRankType{ 
      MinBing=1,
      JingBing=2,
      LingJun=4,
      MingJiang=8,
      YingXiong=16,
      DuoWang=32,
}


declare enum SeEnumequipenhanceeBuildType{ 
      QiangHua=1,
      ShengXing=2,
}


declare enum SeEnumequipenhanceeType{ 
      WuQi=0,
      KuiJia=1,
      BaoWu=2,
}


declare enum SeEnumExchangeeType{ 
      DaoJu=0,
      WuJiang=1,
      DuiHuanMa=2,
}


declare enum SeEnumExchangeePriceType{ 
      JinBi=1,
      ZuanShi=2,
      DaoJu=3,
      DuoZhongDaoJu=4,
}


declare enum SeEnumExchangeeConditionType{ 
      JinBi=1,
      ZuanShi=2,
      DaoJu=3,
      ZhuChengDengJi=4,
}


declare enum SeEnumExchangeeGroupType{ 
      PuTongFengWang=1,
      TeQuanFengWang=2,
      ZaJinDan=3,
      HongBaoLaXin=4,
      DuiHuanHuoDong=5,
      FuBenShangXing=6,
      ZhuanPanHuoDong=7,
      ShangJinSaiTeQuan=8,
      MengHuanZaJinDan=9,
      CaoCaoZhuanPan=10,
      XinShouErXuanYi=11,
      BingFuQianDao=12,
      YingXiongQianDao=13,
      JieRiDuiHuan=14,
      RongLianLuHuoDong=15,
      DuanWuDuiHuan=16,
      ChengChangJiJin=17,
      ZhangJiaoZhuanPan=18,
      NianShouMiBao=19,
}


declare enum SeEnumGetWayeGetType{ 
      ZhanDouKaBao=0,
      CangBaoGe=1,
      MeiRiJingXuan=2,
      ChuanQiKaBao=3,
      ZhanXunDuiHuan=4,
      YunYingHuoDong=5,
      DuanWeiJieSuo=6,
      ChuShi=7,
      YueKaZhuanShu=8,
      ZhuangShiShangDian=9,
      ShuDiLiBao=10,
      WeiWuHuoDong=11,
      ZhuangBeiKaBao=12,
      PaiWeiSaiJieMian=13,
      GuanKaXuanZeJieMian=14,
      ZhenRongJieMian=15,
      ShangChengCangBaoGeQieYe=16,
      ShangChengMeiRiJingXuanQieYe=17,
      BeiBaoZhuangBeiQieYe=18,
      BeiBaoCaiLiaoQieYe=19,
      YuLeMoShiJieMian=20,
      DuiDuiTVJieMian=21,
      BaYeZhiLuJieMian=22,
      TiaoZhuanGuanKa=23,
      TongMengYeMian=24,
      ZhuHouFaDongYeMian=25,
      BeiBaoZhuangBeiJieMian=26,
      TiaoZhuanZiJinJuanXianDanChuang=27,
      ZhiGouShangDian=28,
      NiuBiShangDian=29,
}


declare enum SeEnumHeroBoxZZYeType{ 
      XunLianBaoXiang=1000,
      XunLianBaiYin=1001,
      XunLianHuangJin=1002,
      YuanMuBaoXiang=2,
      BaiYinBaoXiang=3,
      HuangJinBaoXiang=4,
      MiYinBaoXiang=5,
      JingGangBaoXiang=6,
      XuanTieBaoXiang=7,
      LingYuBaoXia=8,
      ChuanQiBaoXiang=9,
      LvKaBao=11,
      LanKaBao=12,
      ZiKaBao=13,
      ChengKaBao=14,
      SaiJiKaBao=15,
      RiChangBaoXiang=19,
      ZhengFuZheBaoXia=20,
      ChuanQiQiangJunBaoXia=21,
      ShiShiQiangJunBaoXia=22,
      QuanKaiLingYuBaoXia=23,
      SaiJiXianDingKaBao=24,
      QuanWuJiangKaBao=25,
      XinShouYinDaoKaBao=26,
      YiYuanFuDai=27,
      ZhangLiaoXianDingKaBao=28,
      MianFeiChouJiang=29,
      WoLongBaoDaiWuPin=32,
      ZiJinKaBao=33,
      ZhuangBeiKaBao=34,
      TiQianKaiLiBao=35,
      MangHe=36,
      ZhuanPanShiLianChou=37,
      RongLianLuChouKa=38,
      WanShengKaBao=39,
      DuiDuiKuangHuan=40,
      XinNianKaBao=41,
      ChunJieKaBao=42,
      HuoDongLiHe=101,
      LiBao=102,
      BuZhongFuBaoXiang=103,
}


declare enum SeEnumHeroBoxZZYakIcon{ 
      Green=1,
      Blue=2,
      Purple=3,
      Orange=4,
}


declare enum SeEnumnoticetexteType{ 
      DeXiangZi=1,
      ShengJi=2,
      ShengDuan=3,
      DeZiKa=4,
      ShengDuoWang=5,
      DeChengKa=6,
      LianSheng=7,
      JuJiLianSheng=8,
      KaPaiShengJi=10,
      LanKaShengJi=11,
      ZiKaShengJi=12,
      JinKaShengJi=13,
      GouMaiYueKa=14,
      GouMaiXinShouDaLi=15,
      ZiSeFuDaiJiangPin=16,
      ChengSeFuDaiJiangPin=17,
      ChengSeBuHuiShouJiangChiJiangPin=18,
      ShangXianTongZhi=19,
      DeChengZhuang=20,
      MangHeDaJiang=21,
      ChengZhuangQiangHua=22,
      ChengZhuangShengXing=23,
      RongYaoJiBaiDanFuTongZhi=24,
      RongYaoJiBaiQuanFuTongZhi=25,
}


declare enum SeEnumRaceTalkiProperty{ 
      YueKaZhuanShu=0,
      DaoJuChiYou=1,
      ChuShi=2,
}


declare enum SeEnumRaceTalkiColor{ 
      Lv=1,
      Lan=2,
      Zi=3,
      Cheng=4,
}


declare enum SeEnumsevendayskTaskType{ 
      ChuangJiao=1,
      KaiXiang=2,
      ChongDuan=3,
      ShengJi=4,
      BiSai1v1=5,
      BiSai2v2=6,
      DaShiSai=7,
}


declare enum SeEnumSouliColor{ 
      Lv=1,
      Lan=2,
      Zi=3,
      Cheng=4,
}


declare enum SeEnumSystemMailiProperty{ 
      JinXianFuFei=1,
      JinXianiOS=2,
      JinXianAnZhuo=4,
      JinXianPC=8,
      BuPanDingZhuCe=16,
}


declare enum SeEnumTownItemiColor{ 
      Lv=1,
      Lan=2,
      Zi=3,
      Cheng=4,
      Jin=5,
}


declare enum SeEnumTownItemiProperty{ 
      KeFanBei=1,
      HuoQuJiShiYong=2,
      BuKeDieJia=4,
      ShiBaiHuoMian=8,
      BaoXiangTianJia=16,
      TongZhiBuXianShi=32,
      FuGaiTianJia=64,
      TuiSongDiSanFang=128,
      CanYuRenWu=256,
      HuoQuShiShiYongBingTongZhi=512,
      SaiJiJieSuanQianZhongZhi=1024,
      ZhongFuFanHuai=2048,
      SaiJiJieSuanHouZhongZhi=4096,
      ManZuTiaoJianTiHuanWuPin=8192,
}


declare enum SeEnumTownItemeTypeA{ 
      JinYuanBao=2,
      YueChi=3,
      DaiBi=4,
      YuFu=5,
      YingXiongKa=8,
      WanJiaJingYan=9,
      DuanWeiBaoXiang=10,
      LiBao=11,
      ZhenFaSuiPian=12,
      SaiJiKaBao=13,
      BaoXiang=28,
      ZuanShi=29,
      DengJiBaoXiang=30,
      BuffKa=31,
      JingGangBaoXiang=41,
      XuanTieBaoXiang=42,
      LingYuBaoXiang=43,
      TouXiangKuang=44,
      PiPeiJiFen=45,
      ZhuChengJingYan=46,
      DuanWeiXingXing=47,
      TiYanYingXiongKa=48,
      ZhuChengPiFu=49,
      LeiJiChongZhi=50,
      HuiZhang=51,
      YingXiongPiFu=52,
      BiaoQingDaoJu=53,
      BuHuiShouJiangChi=54,
      YuEDaoJu=55,
      HeZi=56,
      ZhenDiPiFu=57,
      TouXiang=58,
      QuanYingXiongLiBao=59,
      YinDaoZuoBiDaoJu=60,
      PaiXingBangJiFen=61,
      ShangPinJieSuo=62,
      ZhuangBei=63,
      ZhuangBeiCaiLiao=64,
      ZengJiaLianSheng=65,
      ZhuGongKa=66,
      ZengJiaFengWangYinJi=67,
      ZhanQi=68,
      QinMiDuBuff=69,
      NianShouDaJiang=70,
      ShenMiShangDianZiXuan=71,
      JinBiKuCunShangXian=100,
      BingLiangKuCunShangXian=101,
      YingXiongDengJiShangXian=102,
      KeShangZhenYingXiongShu=103,
      JiLueDengJi=104,
}


declare enum SeEnumTownItemeTipsType{ 
      LieBiaoShi=1,
      MiaoShuShi=2,
}


declare enum SeEnumZhanQiiProperty{ 
      YueKaZhuanShu=0,
      DaoJuChiYou=1,
      ChuShi=2,
}


declare enum SeEnumZhanQiiColor{ 
      Lv=1,
      Lan=2,
      Zi=3,
      Cheng=4,
}


declare enum SeEnumBattleFieldeType{ 
      ZhenDi=1,
      BeiJing=2,
}


declare enum SeEnumBattleFieldiColor{ 
      Lv=1,
      Lan=2,
      Zi=3,
      Cheng=4,
}


declare enum SeEnumBuffereType{ 
      BingDong=1,
      TunShi=2,
      ChuanSong=3,
      HunMi=4,
      ShiKong=5,
      JiaGongSu=6,
      WuDi=9,
      LiuXue=10,
      JianGongSu=11,
      BingDongMianYi=12,
      JiTuiMianYi=13,
      ChongFeng=14,
      JiaYiSu=15,
      JianYiSu=16,
      GuDan=17,
      KuangBao=18,
      BaiZhan=19,
      FuSheng=20,
      HuanXiang=21,
      GuiHuo=22,
      XiaoShi=23,
      XianYu=24,
      XianYuMianYi=25,
      MianYiKongZhi=26,
      BaiYi=27,
      BaiYi2=28,
      BuQu=29,
      DingShen=30,
      ChaoFeng=31,
      YingHuo1=32,
      YingHuo2=33,
      DuZhan=34,
      BaoLuan=35,
      SiXiang=36,
      HuDun=37,
      WuHun=38,
      JiFangQiangHua=39,
      SunQuanMianYi=40,
      ShuiZhan=41,
      NenLiangBianHua=42,
      ZhiLiaoBianHua=43,
      JueWangZhiZhong=44,
      DongFeng=45,
      LieFeng=46,
      JinGu=47,
      ShuaiCai=48,
      MianYiShangHai=49,
      LianHuan=50,
      NiuMa=51,
      XiaoGuo=52,
}


declare enum SeEnumBuffereSuperposition{ 
      FuGai=0,
      WuXiao=1,
      ZuiDa=2,
}


declare enum SeEnumBufferiState{ 
      BingDong=1,
      TunShi=2,
      FangZhu=4,
      HunMi=8,
      ShiKong=16,
      GongSuBianHua=32,
      YiSuBianHua=64,
      WuMian=128,
      WuDi=256,
      ChiXuDiaoXue=512,
      MianYiDiFangFaShu=1024,
      MianYiJiTui=2048,
      MoMian=4096,
      ChouHenZhi=8192,
      DengJiBianHua=16384,
      XueLiangBianHua=32768,
      GongJiBianHua=65536,
      ShouShangJiaShen=131072,
      GuiHuo=262144,
      XiaoShi=524288,
      XianYu=1048576,
      NenLiangBianHua=2097152,
      MianYiKongZhi=4194304,
      BaiYi=8388608,
      BuQu=16777216,
      YinChangShiJianBianHua=33554432,
      DingShen=67108864,
      ChaoFeng=134217728,
      SheChengBianHua=268435456,
      YingHuo=536870912,
      HuDun=1073741824,
      ZhiLiaoBianHua=-2147483648,
}


declare enum SeEnumChartTableeType{ 
      ZhuChengJiFen=0,
      DanPiJiFen=1,
      ZhanQuBangDan=2,
      PaiWeiLianSheng=3,
      ZuDuiLianSheng=4,
      DianFengBang=5,
      ZhuChengDengJiBang=6,
      JiFenPaiXing=7,
      ShangHaiPaiXing=8,
      ChongZhiPaiXing=9,
      ZhaoMuPaiXing=10,
      JiangZhangPaiXing=11,
      KuaQuPiPeiPaiXing=12,
      QuanQuZhengBaBang=13,
      pveXingShuBang=14,
      PuTongGuanKaJingSuSaiBang=15,
      KunNanGuanKaJingSuSaiBang=16,
      DiYuGuanKaJingSuSaiBang=17,
      DanFuRongYaoJiFenBang=18,
      QuanFuRongYaoJiFenBang=19,
      QuanFuPuTongGuanKaJingSuSaiBang=20,
      QuanFuKunNanGuanKaJingSuSaiBang=21,
      QuanFuDiYuGuanKaJingSuSaiBang=22,
      ZhenYingDuiKangWei=80,
      ZhenYingDuiKangShu=81,
      ZhenYingDuiKangWu=82,
      LianJunJingJiChang=83,
      TongMengPaiXingBang=84,
}


declare enum SeEnumequipEnchantiColor{ 
      Lv=1,
      Lan=2,
      Zi=3,
      Cheng=4,
}


declare enum SeEnumequipsuperpowereType{ 
      ZhunBeiShiJianSuoDuan=0,
      YiDongSuDuTiSheng=1,
      GongJiSuDuTiShengBaiFenBi=2,
      DanWeiGongJiTiShengGuDingZhi=3,
      DanWeiGongJiTiShengBaiFenBi=4,
      DanWeiXueLiangTiShengGuDingZhi=5,
      DanWeiXueLiangTiShengBaiFenBi=6,
      FaShuKaGongJiTiShengBaiFenBi=7,
      FaShuKaGongJiTiShengGuDingZhi=8,
      ChengQiangGongJiTiShengGuDingZhi=9,
      ChengQiangGongJiTiShengBaiFenBi=10,
      ChengQiangXueLiangTiShengGuDingZhi=11,
      ChengQiangXueLiangTiShengBaiFenBi=12,
      JiangDiDiFangDanWeiGongJiBaiFenBi=13,
      WuGuoDanWeiGongJiTiShengGuDingZhi=14,
      WuGuoDanWeiGongJiTiShengBaiFenBi=15,
      ShuGuoDanWeiGongJiTiShengGuDingZhi=16,
      ShuGuoDanWeiGongJiTiShengBaiFenBi=17,
      WeiGuoDanWeiGongJiTiShengGuDingZhi=18,
      WeiGuoDanWeiGongJiTiShengBaiFenBi=19,
      QunXiongDanWeiGongJiTiShengGuDingZhi=20,
      QunXiongDanWeiGongJiTiShengBaiFenBi=21,
      TiShengZhuGongSheCheng=22,
}


declare enum SeEnumGuideiStyle{ 
      RenWu=0,
      ShouXing=1,
      PuTong=2,
      DanJu=3,
      TuPian=4,
      DongHua=5,
      BuZhen=6,
}


declare enum SeEnumGuideiWnd{ 
      ZhanDou=6,
      ZhuJieMian=1,
      BuZhen=2,
      KaPaiXiangQing=3,
      GaiMingJieMian=4,
      BaoXiangJieMian=5,
      JieSuanJieMian=7,
      BiaoQian=8,
      RenWuJieMian=9,
      ShangChengJieMian=10,
      ZhunBeiJieMian=11,
      BaoXiangAnNiu=12,
      ChouKaJieMian=13,
      ChuKaJieMian=14,
      BaYeJieMian=15,
      GouMaiJieMian=16,
      GuanKaDiTuJieMian=17,
      GuanKaJieSuanJieMian=18,
      ZhuGongXiangQingJieMian=19,
      ZhuangBeiCangKu=20,
      ZhuangBeiXiangQing=21,
}


declare enum SeEnumGuideiTrigger{ 
      TongYong=0,
      ShiFangWuJiang=1,
      KaiShiKaiQiBaoXiang=2,
      JieShuKaiQiBaoXiang=3,
      ShengJiKaPai=4,
      ShangZhenKaPai=5,
      KaiShiDanPi=6,
      KeJinKaiXiang=7,
      GaiMing=8,
      XuanZeWuJiang=9,
      ZhanDouJieShu=10,
      DaKaiXiangQing=11,
      GuanBiJieMian=12,
      JieShao=13,
      KaiQiZhanDou=14,
      YinDaoChuPai=15,
      WoDeWuJiang=16,
      ZhanDouLuoJi=17,
      KaiXiangTiShi=18,
      ChaKanXiangQing=19,
      JiaSuKaiQiBaoXiang=20,
      XiangQingTiShi=21,
      ZhuChengErDuan=22,
      ShangDianJieSuo=23,
      JieSuo2v2=24,
      ZhenRongJieSuo=25,
      PaiXingBangJieSuo=26,
      ZhenFaJieSuo=27,
      ShengLiJieSuan=28,
      LingQuDengLuJiangLi=29,
      ChouYiCi=30,
      SaiJiJieSuo=31,
      LingQuJiangLi=32,
      XuanZeYeQian=33,
      GouMaiShangPin=34,
      XuanZeChengChi=35,
      DianJiChuZhan=36,
      GuanKaJieSuo=37,
      GuanKaTuiChu=38,
      XuanZeZhuangBeiQieYe=39,
      XuanZeWuQi=40,
      DianJiDuanZao=41,
      DianJiQiangHua=42,
}


declare enum SeEnumGuideiFight{ 
      NenLiangBianHua=2,
      DanWeiChuChang=4,
      DiChengXueLiang=8,
      WoFangWuJiangChuChang=16,
      WoChengXueLiang=32,
}


declare enum SeEnumGuideiAction{ 
      DianJi=7,
      ZhiJieJieShu=0,
      ShiFangWuJiang=1,
      RenYiDianJi=2,
      ShanShuo=3,
      TiXing=4,
      QingLiYinDao=5,
      YanShi=6,
      TuoZhuai=8,
      ChangAn=9,
      XuanZe=10,
      ChuangKouDaKai=11,
      ZiDongCaoZuo=12,
      GouMaiQueRen=13,
}


declare enum SeEnumGuideiDoAction{ 
      DiFangChuPai=1,
      XianShiKeZhi=2,
      ShiQiTiShi=4,
      WanChengYinDao=8,
      KaiShiZhanDou=16,
      JiLu=32,
      YiBoChuPai=64,
      FangShouChuPai=128,
      PiPeiZhanDou=256,
      ZhuChengHuiXue=512,
      FaKa=1024,
      YongKaZhuangTai=2048,
      NenLiangZhuangTai=4096,
      LianDaiWanCheng=8192,
}


declare enum SeEnumHeroBoxEggeType{ 
      ZaJinDan=30,
      HongBaoLaXin=31,
      ZhongQiuChouJiang=33,
      CaoCaoZhuanPan=35,
      ZhangJiaoZhuanPan=42,
}


declare enum SeEnumHeroSkiniColor{ 
      Lv=1,
      Lan=2,
      Zi=3,
      Cheng=4,
}


declare enum SeEnumHeroSkiniMissleRoad{ 
      PaoWuXian=0,
      ZhiXian=1,
      GaoPaoXian=2,
      DingDianGaoPaoXian=3,
}


declare enum SeEnumHeroSkiniFlyRoad{ 
      ZhiXian=0,
      PaoWuXian=1,
      GaoPaoXian=2,
      XianGuoQiaoDeZhiXian=3,
}


declare enum SeEnumLevelInfoiRankType{ 
      ShangHaiPaiXing=1,
}


declare enum SeEnumLevelInfoeGroupType{ 
      ZhengChangFuBen=1,
      LuXunHuoDong=2,
      GongHuiBOSS=3,
}


declare enum SeEnumLevelInfoiProperty{ 
      ShiBaiZhengChangDiaoLuo=1,
      SaiJiZhongZhi=2,
}


declare enum SeEnumNameLibeType{ 
      XingBie=0,
      NanMing=1,
      NvMing=2,
      YueKaWanJia=3,
      SuiJiHuiZhang=4,
}


declare enum SeEnumpveMapInfoeCountry{ 
      Shu=1,
      Wu=2,
      Wei=3,
}


declare enum SeEnumpveMapInfoeCastle{ 
      XiaoCheng=1,
      DaCheng=2,
      ChaoJiCheng=3,
}


declare enum SeEnumScoreCompetitoneCompetitionType{ 
      ZhuChengPaiXingBang=0,
      FuBenJiFenPaiXingBang=1,
      ShangHaiPaiXingBang=2,
      JiangZhangPaiXingBang=3,
      PuTongGuanKaJingSuSaiBang=4,
      KunNanGuanKaJingSuSaiBang=5,
      DiYuGuanKaJingSuSaiBang=6,
      QuanFuRongYaoJiFenBang=7,
      BenFuRongYaoJiFenBang=8,
      QuanFuPuTongGuanKaJingSuSaiBang=9,
      QuanFuKunNanGuanKaJingSuSaiBang=10,
      QuanFuDiYuGuanKaJingSuSaiBang=11,
      ZhenYingDuiKangDiYi=80,
      ZhenYingDuiKangDiEr=81,
      ZhenYingDuiKangDiSan=82,
}


declare enum SeEnumShopMalleType{ 
      JinJiTeHui=0,
      MeiRiJingXuan=1,
      ShiChang=2,
      ZuanShiShangCheng=3,
      TeHuiHuoDong=4,
      YinCangShangCheng=5,
      SaiJiHuoDong=6,
      WanBaTeJia=7,
      XianShiTeHui=8,
      MeiRiXianGou=9,
      XianShiZuanShi=10,
      XianShiRenMinBi=11,
      LunHuanLiBao=12,
      XinShouLiBao=13,
      CangBaoGe=14,
      SaiJiWuJiangKaBao=15,
      YingXiongKaBao=16,
      ZhanXunDuiHuan=17,
      YiYuanFuDai=18,
      ZhangLiaoXianDingKaBao=19,
      HuoDongTeHuiLiBao=20,
      MianFeiChouJiang=21,
      FengWangZhiLuTeHui=22,
      FengWangZhiLuTongXingZheng=23,
      ZhuangShiShangDian=24,
      GuoGuanZhanJiang=25,
      YueKaShangCheng=26,
      ShanDianMaShangCheng=27,
      ZhiGouShangDian=28,
      JiangHunShangDian=29,
      DuoWangBaYe=30,
      XinShouJinJie=31,
      TiYanKaShangCheng=32,
      ZiJinKaBao=33,
      JieRiFanPai=34,
      ShangJinSaiTeQuan=35,
      ChuanQiShuiJingShangCheng=36,
      JieRiLiBao=37,
      ZhuangBeiKaBao=38,
      LiuBeiLiBao=39,
      JingShiShangDian=40,
      XinShouErXuanYi=41,
      BingFuQianDao=42,
      YingXiongQianDao=43,
      JieRiMangHe=44,
      JingShiYueKa=45,
      ZhuangBeiYueKa=46,
      ShiLianChouZhuanPan=47,
      RongLianLuHuoDong=48,
      TuLongMiBao=49,
      YuFuShangDian=50,
      GuZiHuoDong=51,
      JieRiTianMingFanPai=52,
      ChuanQiShengDian=53,
      HuoYueDuBaoXiang=54,
      ChiBiFenDuiHuan=55,
      XinXinShouJinJie=56,
      HuiGuiZhuanPan=57,
      HuiGuiLiBao=58,
      HuangJinQiZhiGouMai=59,
      HuangJinMianFeiZhanQi=60,
      ShenMiShangDianYingXiong=61,
      ShenMiShangDianPiFu=62,
      ShenMiShangDianDaiBi=63,
      ZhenYingDuiKangJinJie=64,
      ZhenYingCaiLiaoLiBao=65,
      WanShengTangGuo1=66,
      WanShengTangGuo2=67,
      WanShengTangGuo3=68,
      WanShengKaBao=69,
      DuiDuiKuangHuan=70,
      ShenMiShangDianLiBao=71,
      TongMengShangDian=72,
      GanEnHuoDong=73,
      ZhuHouFaDong=74,
      JieRiQianDao=75,
      XinNianKaBao=76,
      ZhongFuShangPinZuanShiDuiHuan=77,
      ChunJieKaBao=78,
      NiuBiShangDian=79,
      CeShiShangDian=80,
}


declare enum SeEnumShopMalliProperty{ 
      ZhuYeTuiJian=1,
      JieRiDanChuang=2,
      ShenMiShangDianZheKou=4,
}


declare enum SeEnumShopMalleItemType{ 
      Supermarket=1,
      Chance=2,
      Recharge=3,
      Unit=4,
      TownItem=5,
}


declare enum SeEnumShopMalleFreshType{ 
      BuShuaXin=0,
      MeiRi=1,
      MeiZhou=2,
      MeiYue=3,
      MeiSaiJi=4,
      SiBaXiaoShi=5,
      ErSiXiaoShi=6,
      MeiLiangRi=7,
      ShiErXiaoShi=8,
      MeiSanRi=9,
      MeiSiRi=10,
}


declare enum SeEnumShopMalliPlatform{ 
      PingGuo=1,
      FeiPingGuo=2,
}


declare enum SeEnumShopMalliTab{ 
      TuiJian=2,
      KaPai=4,
      ZhuangBei=8,
      ZhiZun=16,
      PiFu=32,
      BiaoQing=64,
      TouXiang=128,
      ZhenDi=256,
}


declare enum SeEnumSuperMarketeItemType{ 
      Hero=1,
      Item=2,
}


declare enum SeEnumSuperMarketeType{ 
      JinBi=1,
      ZuanShi=2,
      DaoJu=3,
      MeiRiCiShu=4,
      GuangGaoHuoDe=5,
}


declare enum SeEnumSuperMarketeOpen{ 
      GuanBi=0,
      KaiQi=1,
      XianShiKaiQi=2 ,
}


declare enum SeEnumUnitiColour{ 
      Lv=1,
      Lan=2,
      Zi=3,
      Cheng=4,
}


declare enum SeEnumUnitiDropPreview{ 
      MoXing=1,
      QuYu=2,
      PeiJian=4,
      BiaoJi=8,
}


declare enum SeEnumUnitiSoldierType{ 
      GongBing=0,
      QiBing=1,
      BuBing=2,
      DunBing=3,
      Ta=4,
      FaShu=5,
      PVETa=6,
      ZhaoHuan=7,
      JianZhu=8,
      ZhangAiWu=9,
}


declare enum SeEnumUniteFaction{ 
      Wei=0,
      Shu=1,
      Wu=2,
      Qun=3,
}


declare enum SeEnumUnitiHit{ 
      Xiao=0,
      Zhong=1,
      Da=2,
      ChaoDa=3,
}


declare enum SeEnumUnitiBody{ 
      Xiao=0,
      Zhong=1,
      Da=2,
}


declare enum SeEnumUniteAITag{ 
      Wu=0,
      PuTong=1,
      QunTi=2,
      GongCheng=3,
      TanKe=4,
      FaShu=5,
      QunGong=6,
}


declare enum SeEnumUnitiBossRange{ 
      YuanCheng=0,
      JinZhan=1,
}


declare enum SeEnumupgradetargetType{ 
      YingXiong=0,
      ZhuChengDengJi=1,
      DaoJuShuLiang=2,
}


declare enum SeEnumupgradeeMode{ 
      BaiFenBi=0,
      ShengYuZhi=1,
}


export {SeResAdaptive,SeResBattleLevel,SeResBuffstate,SeResCompetitionReward,SeResequipEnchantPro,SeResequipsuperpowerLang,SeResGameTips,SeResGuild,SeResHeroBoxType,SeResInviteCode,SeResLanguage_EN,SeResLevel,SeResLimitedGiftRate,SeResMapinfo,SeResNotice,SeResRaceOpp,SeResseason,SeResSign,SeResSoulPowerLevel,SeResSuperPower,SeResTownBuffer,SeResUnitAwake,SeResVIP,SeResActivity,SeResBadge,SeResBattleTag,SeReschance,SeResequipattr,SeResequipSkin,SeResFestivalSign,SeResglobalnotice,SeResGuildIcon,SeResHeroRank,SeResKingEnergy,SeResLanguage_PT,SeResLevelDiag,SeResLootPool,SeResMonthSign,SeRespveInfo,SeResrecharge,SeResShareImage,SeResSoulConfig,SeResStrongerPath,SeResTask,SeResUILang,SeResUnlock,SeResArea,SeResBattleRank,SeResCastleCompetiton,SeResConfigMaps,SeResequipenhance,SeResExchange,SeResGetWay,SeResGuildAuthority,SeResHeroBoxZZY,SeResJJCReward,SeResLanguage_ID,SeResLevelConst,SeResLimitedGiftType,SeResMonthCard,SeResnoticetext,SeResRaceTalk,SeRessevendays,SeResSoul,SeResSound,SeResSystemMail,SeResTownItem,SeResUnitLabel,SeResZhanQi,SeResActivityPass,SeResBattleField,SeResBuffer,SeResChartTable,SeResequipEnchant,SeResequipsuperpower,SeResGameServer,SeResGuide,SeResHeroBoxEgg,SeResHeroSkin,SeResLanguage_CN,SeResLanguage_VI,SeResLevelInfo,SeResLordAIinfo,SeResNameLib,SeRespveMapInfo,SeResScoreCompetiton,SeResShopMall,SeResSoulEnhance,SeResSuperMarket,SeResthanks,SeResUnit,SeResupgrade,SeEnumBuffstateiCheckList,SeEnumBuffstateiState,SeEnumequipsuperpowerLangeType,SeEnumGameTipsiType,SeEnumHeroBoxTypeeType,SeEnumHeroBoxTypeeAniType,SeEnumHeroBoxTypeiColour,SeEnumInviteCodeeType,SeEnumInviteCodeeReFresh,SeEnumLimitedGiftRateeType,SeEnumSuperPoweriType,SeEnumSuperPowereSkilltype,SeEnumSuperPoweriTargetCamp,SeEnumTownBuffereType,SeEnumTownBufferiProperty,SeEnumVIPeNameColor,SeEnumActivityeType,SeEnumActivityiProperty,SeEnumBattleTageType,SeEnumchancekItemType,SeEnumequipattreType,SeEnumequipattriColor,SeEnumequipattriSoldierType,SeEnumequipattriMissleRoad,SeEnumequipSkinitype,SeEnumFestivalSignetype,SeEnumLevelDiagiStyle,SeEnumLevelDiagiCondition,SeEnumMonthSignetype,SeEnumpveInfoiType,SeEnumpveInfoiequipColor,SeEnumrechargeiProperty,SeEnumShareImagekType,SeEnumStrongerPatheType,SeEnumStrongerPathePathType,SeEnumTaskiModule,SeEnumTaskiTab,SeEnumTaskiType,SeEnumTaskiTimeProperty,SeEnumTaskiStatistics,SeEnumUnlockeFunc,SeEnumUnlockeType,SeEnumBattleRankeProperty,SeEnumBattleRankeRankType,SeEnumequipenhanceeBuildType,SeEnumequipenhanceeType,SeEnumExchangeeType,SeEnumExchangeePriceType,SeEnumExchangeeConditionType,SeEnumExchangeeGroupType,SeEnumGetWayeGetType,SeEnumHeroBoxZZYeType,SeEnumHeroBoxZZYakIcon,SeEnumnoticetexteType,SeEnumRaceTalkiProperty,SeEnumRaceTalkiColor,SeEnumsevendayskTaskType,SeEnumSouliColor,SeEnumSystemMailiProperty,SeEnumTownItemiColor,SeEnumTownItemiProperty,SeEnumTownItemeTypeA,SeEnumTownItemeTipsType,SeEnumZhanQiiProperty,SeEnumZhanQiiColor,SeEnumBattleFieldeType,SeEnumBattleFieldiColor,SeEnumBuffereType,SeEnumBuffereSuperposition,SeEnumBufferiState,SeEnumChartTableeType,SeEnumequipEnchantiColor,SeEnumequipsuperpowereType,SeEnumGuideiStyle,SeEnumGuideiWnd,SeEnumGuideiTrigger,SeEnumGuideiFight,SeEnumGuideiAction,SeEnumGuideiDoAction,SeEnumHeroBoxEggeType,SeEnumHeroSkiniColor,SeEnumHeroSkiniMissleRoad,SeEnumHeroSkiniFlyRoad,SeEnumLevelInfoiRankType,SeEnumLevelInfoeGroupType,SeEnumLevelInfoiProperty,SeEnumNameLibeType,SeEnumpveMapInfoeCountry,SeEnumpveMapInfoeCastle,SeEnumScoreCompetitoneCompetitionType,SeEnumShopMalleType,SeEnumShopMalliProperty,SeEnumShopMalleItemType,SeEnumShopMalleFreshType,SeEnumShopMalliPlatform,SeEnumShopMalliTab,SeEnumSuperMarketeItemType,SeEnumSuperMarketeType,SeEnumSuperMarketeOpen,SeEnumUnitiColour,SeEnumUnitiDropPreview,SeEnumUnitiSoldierType,SeEnumUniteFaction,SeEnumUnitiHit,SeEnumUnitiBody,SeEnumUniteAITag,SeEnumUnitiBossRange,SeEnumupgradetargetType,SeEnumupgradeeMode};