import { SeItem } from './PlayerMgr/SePlayerDef';
export interface PT_Base {
    cmd: string,
}

export enum PT_BuildOprType {
    query,
    build
}

export interface PT_CS_BuildOpr extends PT_Base {
    cmd: 'buildopr',
    type: PT_BuildOprType,
    builid: string,
    param?: any,
}

export interface PT_SC_InitBuildInfo extends PT_Base {
    cmd: 'init_build',
    buildinfos: Array<any>,     // success==true 的时候的建筑信息
}

export interface PT_SC_UpdateBuildInfo extends PT_Base {
    cmd: 'up_build',
    type: PT_BuildOprType,        // 建筑操作类型
    success: boolean,    // 是否成功
    buildinfo: any,     // success==true 的时候的建筑信息
}

export enum PT_HeroTavernType {
    query,      // 查询
    fresh,      // 刷新
    take,       // 获取某一个
}

export interface PT_CS_HeroTavernOpr extends PT_Base {
    cmd: 'hero_tavern',
    type: PT_HeroTavernType,
    index: number,
}

export interface PT_SC_HeroTavernInfo extends PT_Base {
    cmd: 'hero_tavern',
    type: PT_HeroTavernType,
    success: boolean,
    results: Array<any>,
}

export interface PT_SC_AcTownEvent extends PT_Base {
    cmd: 'acte',
    teid: string,
    random:number,
}

export interface PT_CS_AcTownEvent extends PT_Base {
    cmd: 'acte',
    type: string,    // start finish
    acOrteid: string,
    bfight?:boolean,
    gmov?: boolean,
    akSels?: Array<number>,
    akItems?: Array<SeItem>,
    targetNext?:string,
}
