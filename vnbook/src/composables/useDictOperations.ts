import { ref } from 'vue'
import { useBaseDictsStore } from '@/stores/basedicts'
import { showGlobalDialog, showPromptDialog } from '@/composables/useGlobalDialog'
import { updateBaseDict, GEN_DICT_KEY } from '@/api/basedicts'
import type { BaseDict } from '@/api/basedicts'
import { verifyAdminPassword } from '@/api/auth'
import { toast } from '@/utils/toast'

export function useDictOperations() {
  const store = useBaseDictsStore()
  const showEditor = ref(false)
  const editorDict = ref<BaseDict | null>(null)

  const openNewDict = () => {
    editorDict.value = null
    showEditor.value = true
  }

  const openEditDict = (dict: BaseDict) => {
    editorDict.value = { ...dict }
    showEditor.value = true
  }

  const verifyWithPassword = async (options: {
    title: string
    message: string
    confirmButtonText: string
    confirmButtonColor: string
  }): Promise<string | null> => {
    try {
      const password = await showPromptDialog({
        title: options.title,
        message: options.message,
        inputPlaceholder: '请输入管理员密码',
        inputType: 'password',
        confirmButtonText: options.confirmButtonText,
        confirmButtonColor: options.confirmButtonColor,
        showCancelButton: true,
        allowHtml: true,
      })

      toast.showLoading('验证中...')
      const valid = await verifyAdminPassword(password)
      toast.hideLoading()

      if (!valid) {
        toast.showFail('密码错误')
        return null
      }
      return password
    } catch {
      toast.hideLoading()
      return null
    }
  }

  const handleDeleteDict = async (dict: BaseDict) => {
    try {
      const result = await showGlobalDialog({
        title: '删除词典',
        message: `确定要删除“${dict.name}”词典吗？`,
        showCancelButton: true,
        confirmButtonText: '下一步',
        confirmButtonColor: 'var(--van-danger-color)',
        showCheckbox: true,
        checkboxLabel: '同时删除数据库表（慎选）',
      })

      const deleteTables = typeof result === 'object' ? result.checked : false

      const validPassword = await verifyWithPassword({
        title: '管理员验证',
        message: `准备删除词典“${dict.name}”${deleteTables ? ' (包含数据库表)' : '(保留数据库表)'}。<br><br><span style="color:var(--van-danger-color)"><b>此操作无法撤销，请输入管理员密码确认。</b></span>`,
        confirmButtonText: '确认删除',
        confirmButtonColor: 'var(--van-danger-color)',
      })

      if (!validPassword) return false

      const success = await store.deleteDict(dict.key, deleteTables)
      if (success) {
        // 如果正在编辑该词典，关闭编辑器
        if (editorDict.value?.key === dict.key) {
          showEditor.value = false
        }
      }
      return success
    } catch {
      return false
    }
  }

  const handleActiveChange = async (dict: BaseDict, active: boolean) => {
    try {
      await updateBaseDict({ key: dict.key, active: active ? 1 : 0 })
      // 直接更新 store 中的对象（因为 dict 是引用）
      dict.active = active ? 1 : 0
    } catch (e) {
      console.error(e)
      // 失败时重新加载以恢复状态
      await store.loadDicts()
    }
  }

  const handleMoveDict = async (dict: BaseDict, direction: number) => {
    const index = store.dicts.findIndex((d) => d.key === dict.key)
    if (index === -1) return

    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= store.dicts.length) return

    // 目标位置如果是 gen (index 0)，则不允许移动
    if (newIndex === 0) return

    // 1. 在数组中交换位置 (乐观更新)
    const dicts = store.dicts
    const temp = dicts[index]
    const target = dicts[newIndex]

    if (temp && target) {
      dicts[index] = target
      dicts[newIndex] = temp
    }

    // 2. 重新计算所有受影响的 sorder
    const updates: Promise<any>[] = []
    dicts.forEach((d, i) => {
      const expectedSorder = d.key === GEN_DICT_KEY ? 0 : i
      if (d.sorder !== expectedSorder) {
        d.sorder = expectedSorder
        updates.push(updateBaseDict({ key: d.key, sorder: expectedSorder }))
      }
    })

    try {
      await Promise.all(updates)
    } catch (e) {
      console.error(e)
      await store.loadDicts()
    }
  }

  return {
    showEditor,
    editorDict,
    openNewDict,
    openEditDict,
    handleDeleteDict,
    handleActiveChange,
    handleMoveDict,
  }
}
