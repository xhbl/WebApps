<template>
  <van-popup
    v-model:show="show"
    round
    position="bottom"
    :style="{ height: mode === 'phon' ? '40%' : '70%' }"
  >
    <div class="editor">
      <h3>{{ title }}</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <div class="input-wrapper" ref="inputWrapperRef">
            <van-field
              v-model="formData.word"
              label="单词"
              placeholder="请输入单词"
              :rules="[
                { required: true, message: '请输入单词' },
                { pattern: /^[\x20-\x7E]+$/, message: '请输入英文' },
              ]"
              :readonly="step === 'detail'"
              :class="{ 'readonly-field': step === 'detail' }"
              autocomplete="off"
              @update:model-value="onWordInput"
              @focus="onWordFocus"
              @blur="onWordBlur"
            />
            <div v-if="showSuggestions && suggestions.length > 0" class="suggestion-list">
              <div
                v-for="item in suggestions"
                :key="item.word"
                class="suggestion-item"
                @mousedown.prevent="selectSuggestion(item)"
              >
                <span class="suggestion-word">{{ item.word }}</span>
                <span class="suggestion-def" v-if="item.def">{{ item.def }}</span>
              </div>
            </div>
          </div>
          <template v-if="step === 'detail'">
            <van-field v-model="formData.phon" label="音标" placeholder="请输入音标">
              <template #label>
                <div class="label-with-icon">
                  <span>音标</span>
                  <van-icon
                    v-if="dictData.found && dictData.phon"
                    name="replay"
                    class="replay-icon"
                    :class="{ disabled: isPhonMatch }"
                    @click.stop="onResetPhon"
                  />
                </div>
              </template>
            </van-field>
            <van-field
              v-if="mode === 'full'"
              :model-value="definitionPreview"
              label="释义"
              readonly
              class="readonly-field"
            >
              <template #label>
                <div class="label-with-icon">
                  <span>释义</span>
                  <van-icon name="info-o" class="info-icon" @click.stop="onShowInfo" />
                </div>
              </template>
            </van-field>
          </template>
        </van-cell-group>

        <div
          v-if="mode === 'full' && step === 'detail' && dictData.found && dictData.definition"
          class="dict-section"
        >
          <div class="dict-title">基本词典</div>
          <div class="dict-content" ref="dictContentRef">
            <div v-for="(line, index) in dictDataLines" :key="index" class="dict-line">
              {{ line }}
            </div>
          </div>
        </div>

        <div class="options-section" v-if="step === 'detail' && mode !== 'phon'">
          <van-checkbox v-model="addToReview" shape="round" icon-size="18px"
            >加入复习本</van-checkbox
          >
        </div>

        <div class="actions">
          <van-button round type="primary" native-type="submit" :loading="loading">
            {{ isNew && step === 'input' ? '添加' : '保存' }}
          </van-button>
          <van-button round @click="onCancel">取消</van-button>
        </div>
      </van-form>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useWordsStore } from '@/stores/words'
import { suggestWords } from '@/api/words'
import type { Word, BaseDictDefinition } from '@/types'
import { toast, useSubmitLoading } from '@/utils/toast'
import { useDialogDraft } from '@/composables/useDialogDraft'
import { showGlobalDialog } from '@/composables/useGlobalDialog'
import { usePopupHistory } from '@/composables/usePopupHistory'

const props = defineProps<{
  modelValue: boolean
  bid: number
  word?: Word | null
  mode?: 'full' | 'phon'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'update:word', w: Word): void
  (e: 'update:mode', m: 'full' | 'phon'): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)
usePopupHistory(show)

const isNew = computed(() => !props.word || props.word._new === 1)
const mode = computed(() => props.mode || 'full')
const title = computed(() => {
  if (mode.value === 'phon') return '编辑音标'
  return isNew.value ? '添加单词' : '编辑单词'
})

const step = ref<'input' | 'detail'>('input')

const formData = ref({
  word: '',
  phon: '',
  definition: '',
})

const dictData = ref({
  phon: '',
  definition: '',
  found: false,
})
const addToReview = ref(false)
const dictContentRef = ref<HTMLElement | null>(null)
const inputWrapperRef = ref<HTMLElement | null>(null)

// --- 单词建议逻辑 ---
interface SuggestionItem {
  word: string
  def: string
}

const suggestions = ref<SuggestionItem[]>([])
const showSuggestions = ref(false)
const suggestionCache = new Map<string, SuggestionItem[]>()
let debounceTimer: number | null = null

watch(showSuggestions, (val) => {
  if (val) {
    nextTick(() => {
      inputWrapperRef.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }
})

const onWordInput = (val: string) => {
  if (step.value !== 'input') return

  const keyword = val.trim()
  if (!keyword) {
    if (debounceTimer) clearTimeout(debounceTimer)
    suggestions.value = []
    showSuggestions.value = false
    return
  }

  // 节流/防抖查询
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(async () => {
    if (suggestionCache.has(keyword)) {
      suggestions.value = suggestionCache.get(keyword)!
      showSuggestions.value = true
      return
    }

    try {
      const res = await suggestWords(keyword)
      // 再次检查输入框是否有值，防止请求返回时用户已清空输入框
      if (!formData.value.word.trim()) return
      if (res.data.success && res.data.data) {
        suggestions.value = res.data.data
        suggestionCache.set(keyword, res.data.data)
        showSuggestions.value = true
      }
    } catch (e) {
      console.error(e)
    }
  }, 300) // 300ms 防抖
}

const onWordFocus = () => {
  if (step.value === 'input' && formData.value.word && suggestions.value.length > 0) {
    showSuggestions.value = true
  }
}

const onWordBlur = () => {
  // 延迟隐藏，以便点击事件能触发
  setTimeout(() => {
    showSuggestions.value = false
  }, 200)
}

const selectSuggestion = (item: SuggestionItem) => {
  formData.value.word = item.word
  suggestions.value = []
  showSuggestions.value = false
  // 选中后立即查询详情
  queryDictionary(item.word)
}

// --- 状态持久化逻辑 (使用 Composable) ---
const { isRestoring, clearDraft } = useDialogDraft({
  storageKey: 'vnb_word_editor_state',
  show,
  watchSource: [formData, step, dictData], // 监听表单数据和步骤变化
  getState: () => ({
    step: step.value,
    formData: formData.value,
    dictData: dictData.value,
    editingWord: props.word,
    bid: props.bid,
    mode: props.mode,
    addToReview: addToReview.value,
  }),
  restoreState: async (state: {
    step: 'input' | 'detail'
    formData: typeof formData.value
    dictData?: typeof dictData.value
    editingWord?: typeof props.word
    bid?: number
    mode?: 'full' | 'phon'
    addToReview?: boolean
  }) => {
    if (state.editingWord) emit('update:word', state.editingWord)
    if (state.mode) emit('update:mode', state.mode)
    // show.value 已由 useDialogDraft 恢复

    await nextTick()
    step.value = state.step
    formData.value = state.formData
    if (state.dictData) dictData.value = state.dictData
    if (state.addToReview !== undefined) addToReview.value = state.addToReview
  },
})

const formatDefinitions = (definitions: BaseDictDefinition[]) => {
  const zhLines = definitions
    .map((d) => {
      const meanings = d.meanings?.zh?.join('; ')
      return meanings ? `${d.pos} ${meanings}` : null
    })
    .filter((line): line is string => line !== null)

  const enLines: string[] = []
  definitions.forEach((d) => {
    d.meanings?.en?.forEach((m) => {
      if (m) enLines.push(`${d.pos} ${m}`)
    })
  })

  return [...zhLines, ...enLines].join('\n')
}

// 查询基础词典
const queryDictionary = async (text: string) => {
  if (!text) return

  // 1. 尝试从 Store 中查找（如果是编辑模式，可能已经有 baseInfo）
  // 注意：props.word 在编辑模式下传入，但如果是新增模式输入单词，props.word 是空的
  // 所以这里主要依赖 API 查询
  const info = await wordsStore.lookupDict(text)

  if (info) {
    dictData.value = {
      phon: info.ipas?.join('; ') || '',
      definition: formatDefinitions(info.definitions),
      found: true,
    }
  } else {
    dictData.value = {
      phon: '',
      definition: '',
      found: false,
    }
  }
}

// 初始化表单逻辑提取
const initForm = () => {
  if (isRestoring.value) return // 如果正在恢复状态，跳过初始化

  if (props.word) {
    // 编辑模式
    step.value = 'detail'
    formData.value.word = props.word.word
    formData.value.phon = props.word.phon || ''
    // 编辑模式下也查询字典，以便提供重置功能
    // 优先使用 props.word 中的 baseInfo (如果列表接口已经返回)
    if (props.word.baseInfo) {
      const info = props.word.baseInfo
      dictData.value = {
        phon: info.ipas?.join('; ') || '',
        definition: formatDefinitions(info.definitions),
        found: true,
      }
    } else {
      queryDictionary(props.word.word)
    }
    addToReview.value = false
  } else {
    // 新增模式
    step.value = 'input'
    formData.value = { word: '', phon: '', definition: '' }
    dictData.value = { phon: '', definition: '', found: false }
    suggestions.value = []
    showSuggestions.value = false
    addToReview.value = false
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      initForm()
    }
  },
)

// 监听内容变化或弹窗打开，重置滚动条
watch(
  () => [dictData.value.definition, step.value, show.value],
  async () => {
    await nextTick()
    if (dictContentRef.value) {
      dictContentRef.value.scrollTop = 0
    }
  },
)

// 监听 props.word 变化，以便在从“添加”切换到“编辑”模式时更新表单
watch(
  () => props.word,
  () => {
    if (show.value) {
      initForm()
    }
  },
)

watch(show, (v) => emit('update:modelValue', v))

const wordsStore = useWordsStore()

const isPhonMatch = computed(() => {
  return formData.value.phon === dictData.value.phon
})

const onResetPhon = () => {
  if (isPhonMatch.value) return
  showGlobalDialog({
    title: '提示',
    message: '重置为词典音标吗？',
    showCancelButton: true,
  })
    .then(() => {
      formData.value.phon = dictData.value.phon
    })
    .catch(() => {})
}

const definitionPreview = computed(() => {
  const exps = props.word?.explanations
  if (!exps || exps.length === 0) {
    return '在单词卡片中编辑'
  }
  return exps
    .map((e) => {
      const zh = e.exp?.zh || ''
      return `${e.pos || ''} ${zh}`
    })
    .join('; ')
})

const dictDataLines = computed(() => {
  if (!dictData.value.definition) return []
  return dictData.value.definition.split('\n')
})

const onShowInfo = () => {
  showGlobalDialog({
    message:
      '请在单词卡片页中添加和编辑释义及相关例句，根据需要只添加必要的内容在单词本中，可以从词典选择，也可以自行编辑。',
    showConfirmButton: false,
    closeOnClickOverlay: true,
    width: '320px',
    messageAlign: 'left',
  })
}

const { loading, withLoading } = useSubmitLoading()

const onSubmit = () =>
  withLoading(async () => {
    // 阶段一：添加（查询）
    if (isNew.value && step.value === 'input') {
      const wordText = formData.value.word.trim()
      formData.value.word = wordText

      // 总是查询字典以获取参考数据
      await queryDictionary(wordText)

      // 检查单词是否存在
      const existingWord = await wordsStore.checkWordExistence(wordText)

      if (existingWord) {
        const inCurrentBook = wordsStore.findWordByName(wordText)
        if (inCurrentBook) {
          toast.show(`单词 '${wordText}' 已存在于当前单词本`)
          // 切换到编辑模式
          emit('update:word', inCurrentBook)
          return
        } else if ((existingWord.book_count || 0) > 0) {
          toast.show(`单词 '${wordText}' 已存在于其它单词本`)
        } else {
          toast.show(`单词 '${wordText}' 已存在 (未入本)`)
        }
        formData.value.phon = existingWord.phon || ''
      } else {
        // 新词，使用字典数据填充
        if (dictData.value.found) {
          formData.value.phon = dictData.value.phon
        }
      }
      step.value = 'detail'
      return
    }

    // 阶段二：保存
    const w: Word = {
      id: props.word?.id || 0,
      word: formData.value.word,
      phon: formData.value.phon,
      time_c: props.word?.time_c || '',
      _new: isNew.value ? 1 : 0,
      // 注意：这里暂不处理 definition 的保存，因为 Word 结构需要 Explanation 对象
      // 如果需要保存释义，需构造 Explanation 数组。目前仅保存单词和音标。
    }

    const saved = await wordsStore.saveWord(w, props.bid, addToReview.value)

    if (!saved && addToReview.value) {
      toast.showFail('保存失败')
      return
    }

    // 处理单词已存在的情况 (_new === 2)
    if (saved && saved._new === 2) {
      try {
        const message =
          (saved.book_count || 0) > 0
            ? `单词"${saved.word}"已存在于其他单词本中，要加入此单词本吗？`
            : `单词"${saved.word}"是一个未入本单词，要加入此单词本吗？`
        await showGlobalDialog({
          title: '单词已存在',
          message,
          showCancelButton: true,
        })
        // 用户确认后，再次调用 saveWord（此时传入的对象 _new 为 2，后端会执行关联操作）
        const retrySaved = await wordsStore.saveWord(saved, props.bid, addToReview.value)
        if (retrySaved) {
          if (addToReview.value) {
            const reviewSuccess = await wordsStore.addToReview(retrySaved, true)
            if (reviewSuccess) {
              toast.showSuccess('添加成功并加入复习本')
            } else {
              toast.showSuccess('添加成功，但加入复习本失败')
            }
          } else {
            // 如果没有勾选加入复习本，且 saveWord 是 silent=false (默认)，store 已显示 toast
            // 如果 saveWord 是 silent=true (这里是 addToReview.value 为 false)，则 store 显示 toast
          }
          show.value = false
        }
      } catch {
        // 用户取消，不做操作
      }
      return
    }

    if (saved) {
      if (addToReview.value) {
        const reviewSuccess = await wordsStore.addToReview(saved, true)
        const actionText = isNew.value ? '添加' : '更新'
        if (reviewSuccess) {
          toast.showSuccess(`${actionText}成功并加入复习本`)
        } else {
          toast.showSuccess(`${actionText}成功，但加入复习本失败`)
        }
      }
      show.value = false
    }
  })

const onCancel = () => {
  show.value = false
}

// 暴露 clearDraft 给父组件，以便在页面离开时主动清理
defineExpose({ clearDraft })
</script>

<style scoped>
.editor {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

h3 {
  margin: 0 0 16px 0;
  text-align: center;
}

.van-form {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.actions {
  margin-top: auto;
  padding: 20px 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.actions .van-button {
  min-width: 100px;
  max-width: 120px;
  flex: 1;
}

:deep(.van-field__label) {
  font-weight: bold;
}

:deep(.readonly-field .van-field__value) {
  color: var(--van-text-color-2) !important;
}

:deep(.readonly-field input),
:deep(.readonly-field textarea) {
  color: var(--van-text-color-2) !important;
}

.label-with-icon {
  display: flex;
  align-items: center;
}

.replay-icon {
  margin-left: 4px;
  cursor: pointer;
  color: var(--van-primary-color);
}

.replay-icon.disabled {
  color: var(--van-gray-5);
  cursor: default;
}

.info-icon {
  margin-left: 4px;
  cursor: pointer;
  color: var(--van-primary-color);
}

.dict-section {
  margin-top: 10px;
  padding: 0 16px;
}

.dict-title {
  font-size: var(--van-font-size-sm);
  font-weight: bold;
  margin-bottom: 6px;
  text-align: left;
}

.dict-content {
  padding: 8px;
  background-color: #f7f8fa;
  border-radius: 4px;
  font-size: var(--van-font-size-md);
  color: var(--van-text-color-2);
  line-height: 1.4;
  max-height: 7.2em; /* 约4行高度 + padding */
  overflow-y: auto;
}

.dict-line {
  margin-bottom: 4px;
}

.options-section {
  padding: 10px 16px 0;
  display: flex;
}

.input-wrapper {
  position: relative;
}

.suggestion-list {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background-color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.suggestion-item {
  padding: 10px 16px;
  font-size: 16px;
  color: #323233;
  border-bottom: 1px solid #f5f6f7;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.suggestion-item:active {
  background-color: #f2f3f5;
}

.suggestion-word {
  font-weight: bold;
  margin-right: 8px;
}

.suggestion-def {
  font-size: 13px;
  color: #969799;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: right;
}
</style>
