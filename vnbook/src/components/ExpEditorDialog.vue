<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '70%' }">
    <div class="editor">
      <h3>{{ isNew ? '添加释义' : '编辑释义' }}</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <van-field name="Picker" label="词性" required label-align="top">
            <template #input>
              <van-picker
                :columns="lexCatOptions"
                @confirm="onPickerConfirm"
                @cancel="pickerShow = false"
              />
              <div @click="pickerShow = true" class="picker-trigger">
                {{ selectedCat || '选择词性' }}
              </div>
            </template>
          </van-field>
          <van-field
            v-model="formData.exp_ch"
            label="中文释义"
            required
            placeholder="请输入中文释义"
            :rules="[{ required: true, message: '请输入中文释义' }]"
            type="textarea"
            rows="3"
            label-align="top"
            autosize
          />
          <van-field
            v-model="formData.exp.en"
            label="英文释义（可选）"
            placeholder="请输入英文释义"
            type="textarea"
            rows="3"
            label-align="top"
            autosize
          />
        </van-cell-group>

        <div class="actions">
          <van-button round type="primary" native-type="submit">保存</van-button>
          <van-button round @click="onCancel">取消</van-button>
        </div>
      </van-form>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import { usePosStore } from '@/stores/pos'
import type { Explanation } from '@/types'
import { useWordsStore } from '@/stores/words'
import { useDialogDraft } from '@/composables/useDialogDraft'

const props = defineProps<{
  modelValue: boolean
  explanation?: Explanation | null
  wid: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'update:explanation', ex: Explanation): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)
watch(show, (v) => emit('update:modelValue', v))

const lexStore = usePosStore()
const pickerShow = ref(false)

const isNew = computed(() => !props.explanation || props.explanation._new === 1)
const selectedCat = ref('')

const lexCatOptions = computed(() => {
  return lexStore.posList.map((cat) => ({ text: cat.name_ch, value: cat.abbr }))
})

const formData = ref<Explanation>({
  id: 0,
  word_id: 0,
  pos: '',
  exp: { en: '', zh: '' },
  time_c: '',
  _new: 1,
  lid: 0,
  exp_ch: '',
  abbr: '',
  hide: 0,
  sorder: 0,
})

// 初始化表单数据
const initForm = () => {
  if (isRestoring.value) return

  formData.value = {
    id: props.explanation?.id || 0,
    word_id: props.wid,
    pos: props.explanation?.pos || '',
    exp: props.explanation?.exp ? { ...props.explanation.exp } : { en: '', zh: '' },
    time_c: props.explanation?.time_c || '',
    lid: props.explanation?.lid || 0,
    exp_ch: props.explanation?.exp_ch || '',
    abbr: props.explanation?.abbr || '',
    hide: props.explanation?.hide || 0,
    _new: props.explanation?._new ?? 1,
    sorder: props.explanation?.sorder || 0,
  }

  if (props.explanation?.abbr) {
    selectedCat.value = props.explanation.abbr
  } else {
    selectedCat.value = ''
  }
}

// 监听 props 变化以初始化表单
watch(
  () => props.modelValue,
  (v) => {
    if (v) initForm()
  },
)
watch(
  () => props.explanation,
  () => {
    if (show.value) initForm()
  },
)

// --- 状态持久化 ---
const { isRestoring, clearDraft } = useDialogDraft({
  storageKey: 'vnb_exp_editor_state',
  show,
  watchSource: [formData, selectedCat],
  getState: () => ({
    formData: formData.value,
    selectedCat: selectedCat.value,
    wid: props.wid,
    editingExplanation: props.explanation,
  }),
  restoreState: async (state: {
    formData: Explanation
    selectedCat: string
    wid: number
    editingExplanation?: Explanation | null
  }) => {
    if (state.editingExplanation) emit('update:explanation', state.editingExplanation)

    await nextTick()
    formData.value = state.formData
    selectedCat.value = state.selectedCat
  },
})

onMounted(async () => {
  await lexStore.loadPosList()
  // 如果不是在恢复状态，且刚挂载，尝试初始化一次（应对直接刷新页面的情况）
  if (!isRestoring.value && show.value) {
    initForm()
  }
})

defineExpose({ clearDraft })

const onPickerConfirm = (value: string) => {
  formData.value.abbr = value
  selectedCat.value = value
  pickerShow.value = false
}

const wordsStore = useWordsStore()

const onSubmit = async () => {
  const saved = await wordsStore.saveExplanation(formData.value)
  if (saved) {
    show.value = false
    clearDraft()
  }
}

const onCancel = () => {
  show.value = false
  clearDraft()
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
.picker-trigger {
  padding: 10px;
  background: #f7f8fa;
  border-radius: 4px;
  cursor: pointer;
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
</style>
