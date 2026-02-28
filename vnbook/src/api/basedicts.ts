import request from './request'

export const GEN_DICT_KEY = 'gen'

export interface BaseDict {
  key: string
  tag: string
  name: string
  sorder: number
  active: number
  desc?: string
}

export interface BaseDictStats {
  wordCount: number
  defCount: number
}

export interface BaseDictDetail extends BaseDict {
  stats?: BaseDictStats
}

export interface CreateDictParams {
  key: string
  tag: string
  name: string
  sorder?: number
  active?: number
  desc?: string
}

export interface UpdateDictParams extends Partial<CreateDictParams> {
  key: string
}

export interface DictsResponse {
  success: boolean
  dicts: BaseDict[]
  message?: string
}

export interface DictResponse {
  success: boolean
  dict?: BaseDict
  message?: string
}

export interface StatsResponse {
  success: boolean
  stats?: BaseDictStats
  message?: string
}

export interface SyncResponse {
  success: boolean
  synced?: string[]
  message?: string
}

export interface CheckResponse {
  success: boolean
  created?: string[]
  message?: string
}

export interface DeleteResponse {
  success: boolean
  message?: string
}

export const getBaseDicts = () => {
  return request.get<DictsResponse>('/basedicts.php', {
    params: { action: 'list' },
  })
}

export const getBaseDict = (key: string) => {
  return request.get<DictResponse>('/basedicts.php', {
    params: { action: 'get', key },
  })
}

export const getBaseDictStats = (key: string) => {
  return request.get<StatsResponse>('/basedicts.php', {
    params: { action: 'stats', key },
  })
}

export const createBaseDict = (params: CreateDictParams) => {
  return request.post<DictResponse>('/basedicts.php', params, {
    params: { action: 'create' },
  })
}

export const updateBaseDict = (params: UpdateDictParams) => {
  return request.post<DictResponse>('/basedicts.php', params, {
    params: { action: 'update' },
  })
}

export const deleteBaseDict = (key: string, deleteTables: boolean = false) => {
  return request.post<DeleteResponse>(
    '/basedicts.php',
    { key, deleteTables },
    {
      params: { action: 'delete' },
    },
  )
}

export const syncBaseDicts = () => {
  return request.post<SyncResponse>('/basedicts.php', null, {
    params: { action: 'sync' },
  })
}

export const checkBaseDicts = () => {
  return request.post<CheckResponse>('/basedicts.php', null, {
    params: { action: 'check' },
  })
}
