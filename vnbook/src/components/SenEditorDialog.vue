<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '70%' }">
    <div class="editor">
      <h3>{{ isNew ? '添加例句' : '编辑例句' }}</h3>
      <van-form @submit="onSubmit" class="full-height-form">
        <div class="form-scroll-area">
          <van-cell-group :border="false">
            <van-field
              v-model="formData.sen.en"
              required
              placeholder="请输入英文例句"
              :rules="[{ required: true, message: '请输入英文例句' }]"
              type="textarea"
              rows="3"
              label-align="top"
              autosize
            >
              <template #label>
                <div class="label-row">
                  <span>英文例句</span>
                  <div class="label-right">
                    <van-icon
                      v-if="formData.sen.en"
                      name="clear"
                      class="clear-icon"
                      @click.stop="formData.sen.en = ''"
                    />
                  </div>
                </div>
              </template>
            </van-field>
            <van-field
              v-model="formData.sen.zh"
              placeholder="请输入例句的中文译文"
              type="textarea"
              rows="3"
              label-align="top"
              autosize
            >
              <template #label>
                <div class="label-row">
                  <span>中文译文</span>
                  <div class="label-right">
                    <van-icon
                      v-if="formData.sen.zh"
                      name="clear"
                      class="clear-icon"
                      @click.stop="formData.sen.zh = ''"
                    />
                  </div>
                </div>
              </template>
            </van-field>
            <van-field
              v-model="formData.smemo"
              placeholder="如例句来源，使用场景等"
              label-align="top"
            >
              <template #label>
                <div class="label-row">
                  <span>备注</span>
                  <div class="label-right">
                    <van-icon
                      v-if="formData.smemo"
                      name="clear"
                      class="clear-icon"
                      @click.stop="formData.smemo = ''"
                    />
                  </div>
                </div>
              </template>
            </van-field>
          </van-cell-group>
        </div>

        <div class="actions">
          <van-button round type="primary" native-type="submit" :loading="loading">保存</van-button>
          <van-button round @click="onCancel">取消</van-button>
        </div>
      </van-form>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import type { Sentence } from '@/types'
import { useDialogDraft } from '@/composables/useDialogDraft'
import { useSubmitLoading } from '@/utils/toast'
import { usePopupHistory } from '@/composables/usePopupHistory'
import { useWordOperations } from '@/composables/useWordOperations'

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
usePopupHistory(show)

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

const { loading, withLoading } = useSubmitLoading()
const { handleSaveSen } = useWordOperations()

const onSubmit = () =>
  withLoading(async () => {
    const saved = await handleSaveSen(formData.value, props.eid)
    if (saved) {
      show.value = false
    }
  })

const onCancel = () => {
  show.value = false
}
</script>

<style scoped>
.editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}
h3 {
  margin: 16px 0;
  text-align: center;
  flex-shrink: 0;
}
.full-height-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
.form-scroll-area {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
  min-height: 0;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
.actions {
  margin-top: auto;
  padding: 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-shrink: 0;
}
.actions .van-button {
  min-width: 90px;
  max-width: 120px;
  flex: 1;
}
:deep(.van-field__label) {
  font-weight: bold;
  width: 100%;
}
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.label-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.clear-icon {
  color: var(--van-gray-5);
  font-size: 16px;
  cursor: pointer;
}
</style>
