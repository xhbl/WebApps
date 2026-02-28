import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as dictApi from '@/api/basedicts'
import type { BaseDict, BaseDictStats } from '@/api/basedicts'
import { GEN_DICT_KEY } from '@/api/basedicts'
import { toast } from '@/utils/toast'

export const useBaseDictsStore = defineStore('baseDicts', () => {
  const dicts = ref<BaseDict[]>([])
  const stats = ref<Record<string, BaseDictStats>>({})

  const sortDicts = () => {
    dicts.value.sort((a, b) => {
      if (a.key === GEN_DICT_KEY) return -1
      if (b.key === GEN_DICT_KEY) return 1
      if (a.sorder !== b.sorder) return a.sorder - b.sorder
      return a.key.localeCompare(b.key)
    })
  }

  const loadDicts = async () => {
    try {
      const res = await dictApi.getBaseDicts()
      if (res.data.success && res.data.dicts) {
        dicts.value = res.data.dicts
        sortDicts()
        // 异步加载统计信息，不阻塞 UI
        loadAllStats()
        return true
      }
      return false
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const loadAllStats = async () => {
    for (const dict of dicts.value) {
      try {
        const res = await dictApi.getBaseDictStats(dict.key)
        if (res.data.success && res.data.stats) {
          stats.value[dict.key] = res.data.stats
        }
      } catch (e) {
        console.error(e)
      }
    }
  }

  const saveDict = async (
    dict: dictApi.CreateDictParams | dictApi.UpdateDictParams,
    isNew: boolean,
  ) => {
    try {
      let res
      if (isNew) {
        res = await dictApi.createBaseDict(dict as dictApi.CreateDictParams)
      } else {
        res = await dictApi.updateBaseDict(dict as dictApi.UpdateDictParams)
      }

      if (res.data.success) {
        if (isNew && res.data.dict) {
          // 先初始化 stats，确保 UI 立即显示（即使是 0）
          stats.value[res.data.dict.key] = { wordCount: 0, defCount: 0 }
          dicts.value.push(res.data.dict)
          // 获取真实统计数据，因為可能存在残留表数据
          try {
            const statsRes = await dictApi.getBaseDictStats(res.data.dict.key)
            if (statsRes.data.success && statsRes.data.stats) {
              stats.value[res.data.dict.key] = statsRes.data.stats
            }
          } catch {
            // ignore, keep 0
          }
        } else {
          // 更新操作，API 可能不返回完整的 dict 对象，手动更新本地状态
          const index = dicts.value.findIndex((d) => d.key === dict.key)
          if (index !== -1) {
            const target = dicts.value[index]
            if (target) {
              Object.assign(target, dict)
            }
          }
        }
        sortDicts()
        toast.showSuccess(isNew ? '创建成功' : '更新成功')
        return true
      } else {
        toast.showFail(res.data.message || '操作失败')
        return false
      }
    } catch (e) {
      console.error(e)
      const message = (e instanceof Error ? e.message : '') || '操作失败'
      toast.showFail(message)
      return false
    }
  }

  const deleteDict = async (key: string, deleteTables: boolean) => {
    try {
      const res = await dictApi.deleteBaseDict(key, deleteTables)
      if (res.data.success) {
        const index = dicts.value.findIndex((d) => d.key === key)
        if (index !== -1) dicts.value.splice(index, 1)
        delete stats.value[key]
        toast.showSuccess('删除成功')
        return true
      }
      toast.showFail(res.data.message || '删除失败')
      return false
    } catch (e) {
      console.error(e)
      const message = (e instanceof Error ? e.message : '') || '删除失败'
      toast.showFail(message)
      return false
    }
  }

  return {
    dicts,
    stats,
    loadDicts,
    saveDict,
    deleteDict,
  }
})
