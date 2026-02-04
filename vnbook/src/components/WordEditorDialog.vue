<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '70%' }">
    <div class="editor">
      <h3>{{ isNew ? '添加单词' : '编辑单词' }}</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
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
          />
          <template v-if="step === 'detail'">
            <van-field v-model="formData.phon" label="音标" placeholder="请输入音标" />
            <van-field
              v-model="formData.definition"
              label="基本释义"
              type="textarea"
              rows="3"
              readonly
              class="readonly-field"
              placeholder="暂无释义"
            />
          </template>
        </van-cell-group>

        <div class="actions">
          <van-button round type="primary" native-type="submit">
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
import type { Word } from '@/types'
import { toast } from '@/utils/toast'
import { useDialogDraft } from '@/composables/useDialogDraft'
import { showDialog } from 'vant'

const props = defineProps<{
  modelValue: boolean
  bid: number
  word?: Word | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'update:word', w: Word): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)

const isNew = computed(() => !props.word || props.word._new === 1)
const step = ref<'input' | 'detail'>('input')

const formData = ref({
  word: '',
  phon: '',
  definition: '',
})

// --- 状态持久化逻辑 (使用 Composable) ---
const { isRestoring, clearDraft } = useDialogDraft({
  storageKey: 'vnb_word_editor_state',
  show,
  watchSource: [formData, step], // 监听表单数据和步骤变化
  getState: () => ({
    step: step.value,
    formData: formData.value,
    editingWord: props.word,
    bid: props.bid,
  }),
  restoreState: async (state: {
    step: 'input' | 'detail'
    formData: typeof formData.value
    editingWord?: typeof props.word
    bid?: number
  }) => {
    if (state.editingWord) emit('update:word', state.editingWord)
    // show.value 已由 useDialogDraft 恢复

    await nextTick()
    step.value = state.step
    formData.value = state.formData
  },
})

// 模拟字典查询
const queryDictionary = async (text: string) => {
  // TODO: 实现真实的字典查询逻辑
  // 这里仅做模拟：如果单词是 "test"，返回模拟数据，否则返回空
  if (text.toLowerCase() === 'test') {
    formData.value.phon = 'test'
    formData.value.definition = 'n. 试验；测验；考验\nvt. 测验；考查'
  } else {
    formData.value.phon = ''
    formData.value.definition = ''
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
    // 尝试从 explanations 中提取释义用于展示（仅展示用）
    formData.value.definition =
      props.word.explanations?.map((e) => `${e.pos} ${e.exp_ch || e.exp?.zh || ''}`).join('\n') ||
      ''
  } else {
    // 新增模式
    step.value = 'input'
    formData.value = { word: '', phon: '', definition: '' }
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

const onSubmit = async () => {
  // 阶段一：添加（查询）
  if (isNew.value && step.value === 'input') {
    const wordText = formData.value.word.trim()
    formData.value.word = wordText

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
      formData.value.definition =
        existingWord.explanations?.map((e) => `${e.pos} ${e.exp.zh || ''}`).join('\n') || ''
    } else {
      await queryDictionary(wordText)
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

  const saved = await wordsStore.saveWord(w, props.bid)

  // 处理单词已存在的情况 (_new === 2)
  if (saved && saved._new === 2) {
    try {
      await showDialog({
        title: '单词已存在',
        message: `单词"${saved.word}"已存在于其他单词本中，要加入此单词本吗？`,
      })
      // 用户确认后，再次调用 saveWord（此时传入的对象 _new 为 2，后端会执行关联操作）
      const retrySaved = await wordsStore.saveWord(saved, props.bid)
      if (retrySaved) {
        show.value = false
        clearDraft()
      }
    } catch {
      // 用户取消，不做操作
    }
    return
  }

  if (saved) {
    show.value = false
    clearDraft() // 保存成功后清除草稿
  }
}

const onCancel = () => {
  show.value = false
  clearDraft() // 取消时清除草稿
}
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
</style>
