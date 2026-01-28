// 基础数据模型类型定义

export interface Book {
  Id: number
  title: string
  nums: number
  time_c: string
  hide: number
  _new?: number // 1=新增, 0=已存在
}

export interface Word {
  Id: number
  name: string
  phon?: string
  bid: number
  time_c: string
  hide: number
  _new?: number
  explanations?: Explanation[]
}

export interface Explanation {
  Id: number
  wid: number
  lid: number
  exp_ch: string
  exp?: string
  abbr: string
  hide: number
  _new?: number
  sentences?: Sentence[]
}

export interface Sentence {
  Id: number
  eid: number
  sen: string
  sen_ch?: string
  hide: number
  _new?: number
}

export interface User {
  Id: number
  name: string
  pass?: string
  dispname: string
  time_c: string
  _new?: number
}

export interface LexicalCat {
  Id: number
  name: string
  abbr: string
  name_ch: string
}

// Menu action type for Vant ActionSheet
export interface MenuAction {
  name: string
  key: string
  color?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: 'true' | 'false'
  message?: string
  book?: Book[]
  word?: Word[]
  user?: User[]
  lexicalcat?: LexicalCat[]
  data?: T
}

// Nonce 响应类型
export interface NonceResponse {
  success: 'true' | 'false'
  nonce?: string
  message?: string
}

// 登录相关类型
export interface LoginInfo {
  sid: string
  uname: string
  dname: string
}

export interface LoginRequest {
  uname: string
  pass: string
  remember: boolean
}

export interface LoginResponse {
  success: 'true' | 'false'
  message?: string
  login?: LoginInfo
}

// 排序模式
export type SortMode = 'date' | 'alpha'

// 分组数据
export interface GroupedWords {
  key: string
  label: string
  words: Word[]
}
