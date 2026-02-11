// 基础数据模型类型定义

export interface Book {
  id: number
  title: string
  nums: number
  time_c: string
  hide: number
  ptop?: number
  sorder?: number
  _new?: number // 1=新增, 0=已存在
  deleteWords?: boolean // 删除时可选，是否同时删除本内单词
}

export interface Word {
  id: number
  word: string
  phon?: string
  time_c: string
  explanations?: Explanation[]
  book_count?: number
  _new?: number
  baseInfo?: BaseDictInfo
  // Review stats
  n_known?: number
  n_unknown?: number
  n_streak?: number
  time_r?: string
}

export interface Explanation {
  id: number
  word_id: number
  pos: string
  exp: {
    en: string
    zh: string
  }
  time_c: string
  sentences?: Sentence[]
  _new?: number
  // 扩展字段
  lid?: number
  exp_ch?: string
  abbr?: string
  hide?: number
  sorder?: number
}

export interface Sentence {
  id: number
  exp_id: number
  sen: {
    en: string
    zh: string
  }
  time_c: string
  _new?: number
  // 扩展字段
  sen_ch?: string
  hide?: number
  sorder?: number
  smemo?: string
}

export interface BaseDictDefinition {
  pos: string
  ipa_idx: number
  meanings: {
    zh?: string[]
    en?: string[]
  }
}

export interface BaseDictInfo {
  ipas: string[]
  definitions: BaseDictDefinition[]
}

export interface User {
  id: number
  name: string
  pass?: string
  dispname: string
  time_c: string
  _new?: number
}

export interface Pos {
  id: number
  name: string
  abbr: string
  name_ch: string
}

// Menu action type for Vant ActionSheet
export interface MenuAction {
  name: string
  key: string
  color?: string
  icon?: string
  disabled?: boolean
  loading?: boolean
  className?: string
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  book?: Book[]
  word?: Word[]
  user?: User[]
  pos?: Pos[]
  explanation?: Explanation[]
  sentence?: Sentence[]
  login?: LoginInfo
  data?: T
  reviewCount?: number
  inReview?: boolean
}

// Nonce 响应类型
export interface NonceResponse {
  success: boolean
  nonce?: string
  message?: string
}

// 登录相关类型
export interface LoginInfo {
  sid: string
  uid: number
  uname: string
  dname: string
  cfg?: Record<string, unknown>
}

export interface LoginRequest {
  uname: string
  pass: string
  remember: boolean
}

export interface LoginResponse {
  success: boolean
  message?: string
  login?: LoginInfo
}

// 排序模式
export type SortMode = 'date' | 'alpha' | 'streak'

// 分组数据
export interface GroupedWords {
  key: string
  label: string
  words: Word[]
}
