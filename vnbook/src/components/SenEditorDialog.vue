<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '60%' }">
    <div class="editor">
      <h3>{{ isNew ? '添加例句' : '编辑例句' }}</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <van-field
            v-model="edit.sen.en"
            label="英文例句"
            placeholder="请输入英文例句"
            :rules="[{ required: true, message: '请输入英文例句' }]"
            type="textarea"
            rows="3"
          />
          <van-field
            v-model="edit.sen.zh"
            label="中文翻译（可选）"
            placeholder="请输入中文翻译"
            type="textarea"
            rows="3"
          />
          <van-field
            v-model="edit.smemo"
            label="备注（可选）"
            placeholder="请输入备注"
            type="textarea"
            rows="1"
          />
        </van-cell-group>

        <div class="actions">
          <van-button round type="primary" native-type="submit">保存</van-button>
          <van-button round class="ml" @click="onCancel">取消</van-button>
        </div>
      </van-form>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import type { Sentence } from '@/types'
import { useDialogDraft } from '@/composables/useDialogDraft'

const props = defineProps<{
  modelValue: boolean
  sentence?: Sentence | null
  eid: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', sen: Sentence): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)
watch(show, (v) => emit('update:modelValue', v))

const isNew = computed(() => !props.sentence || props.sentence._new === 1)

const edit = ref<Sentence>({} as Sentence)

const initForm = () => {
  if (isRestoring.value) return
  edit.value = {
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
  watchSource: edit,
  getState: () => ({
    edit: edit.value,
    eid: props.eid,
  }),
  restoreState: async (state: any) => {
    await nextTick()
    edit.value = state.edit
  },
})

defineExpose({ clearDraft })

const onSubmit = () => {
  emit('save', edit.value)
  show.value = false
  clearDraft()
}

const onCancel = () => {
  show.value = false
  clearDraft()
}
</script>

<style scoped>
.editor {
  padding: 16px;
}
.actions {
  padding: 12px 0;
  display: flex;
  gap: 12px;
}
.ml {
  margin-left: 8px;
}
</style>
