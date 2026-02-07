<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '70%' }">
    <div class="editor">
      <h3>{{ isNew ? '添加例句' : '编辑例句' }}</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <van-field
            v-model="formData.sen.en"
            label="英文例句"
            required
            placeholder="请输入英文例句"
            :rules="[{ required: true, message: '请输入英文例句' }]"
            type="textarea"
            rows="3"
            label-align="top"
            autosize
          />
          <van-field
            v-model="formData.sen.zh"
            label="中文译文"
            placeholder="请输入例句的中文译文"
            type="textarea"
            rows="3"
            label-align="top"
            autosize
          />
          <van-field
            v-model="formData.smemo"
            label="备注"
            placeholder="如例句来源，使用场景等"
            label-align="top"
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
import { ref, watch, computed, nextTick } from 'vue'
import type { Sentence } from '@/types'
import { useWordsStore } from '@/stores/words'
import { useDialogDraft } from '@/composables/useDialogDraft'

const props = defineProps<{
  modelValue: boolean
  sentence?: Sentence | null
  eid: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'update:sentence', s: Sentence): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)
watch(show, (v) => emit('update:modelValue', v))

const isNew = computed(() => !props.sentence || props.sentence._new === 1)

const formData = ref<Sentence>({
  id: 0,
  exp_id: 0,
  sen: { en: '', zh: '' },
  time_c: '',
  _new: 1,
  smemo: '',
  hide: 0,
  sorder: 0,
})

const initForm = () => {
  if (isRestoring.value) return
  formData.value = {
    id: props.sentence?.id || 0,
    exp_id: props.eid,
    sen: props.sentence?.sen ? { ...props.sentence.sen } : { en: '', zh: '' },
    smemo: props.sentence?.smemo || '',
    hide: props.sentence?.hide || 0,
    time_c: props.sentence?.time_c || '',
    _new: props.sentence?._new ?? 1,
    sorder: props.sentence?.sorder || 0,
  }
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) initForm()
  },
)
watch(
  () => props.sentence,
  () => {
    if (show.value) initForm()
  },
)

// --- 状态持久化 ---
const { isRestoring, clearDraft } = useDialogDraft({
  storageKey: 'vnb_sen_editor_state',
  show,
  watchSource: formData,
  getState: () => ({
    formData: formData.value,
    eid: props.eid,
    editingSentence: props.sentence,
  }),
  restoreState: async (state: {
    formData: Sentence
    eid: number
    editingSentence?: Sentence | null
  }) => {
    if (state.editingSentence) emit('update:sentence', state.editingSentence)

    await nextTick()
    formData.value = state.formData
  },
})

defineExpose({ clearDraft })

const wordsStore = useWordsStore()

const onSubmit = async () => {
  const saved = await wordsStore.saveSentence(formData.value, props.eid)
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
