<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '70%' }">
    <div class="editor" @click="closeAll">
      <h3>{{ isNew ? '添加释义' : '编辑释义' }}</h3>
      <van-form @submit="onSubmit" class="full-height-form">
        <div class="form-scroll-area">
          <van-cell-group :border="false">
            <van-field
              v-model="posLabel"
              required
              readonly
              is-link
              placeholder="请选择词性"
              @click="showPosActionSheet = true"
              label-align="top"
            >
              <template #label>
                <div class="label-row">
                  <span>词性</span>
                  <div class="label-right">
                    <van-icon
                      v-if="formData.pos"
                      name="clear"
                      class="clear-icon"
                      @click.stop="formData.pos = ''"
                    />
                  </div>
                </div>
              </template>
            </van-field>
            <van-action-sheet
              v-model:show="showPosActionSheet"
              :actions="posActions"
              @select="onPosSelect"
              cancel-text="取消"
              close-on-click-action
              :close-on-popstate="false"
            />
            <van-field
              v-model="formData.exp.zh"
              required
              placeholder="请输入中文释义"
              :rules="[{ required: true, message: '请输入中文释义' }]"
              type="textarea"
              rows="3"
              label-align="top"
              autosize
            >
              <template #label>
                <div class="label-row">
                  <span>中文释义</span>
                  <div class="label-right">
                    <van-icon
                      v-if="formData.exp.zh"
                      name="clear"
                      class="clear-icon"
                      @click.stop="formData.exp.zh = ''"
                    />
                    <div @click.stop>
                      <van-popover
                        v-if="zhCandidates.length > 0"
                        v-model:show="popoverMap['zh']"
                        placement="top-end"
                        @open="onOpen('zh')"
                      >
                        <div class="popover-content">
                          <van-cell
                            v-for="(item, i) in zhCandidates"
                            :key="i"
                            clickable
                            @click="onSelectZh(item)"
                          >
                            <template #title>
                              <span class="pos-tag">{{ item.pos }}</span>
                              <span>{{ item.text }}</span>
                            </template>
                          </van-cell>
                        </div>
                        <template #reference>
                          <div class="ref-btn">
                            <span>字典释义</span>
                            <van-icon name="add-o" class="ref-icon" />
                          </div>
                        </template>
                      </van-popover>
                    </div>
                  </div>
                </div>
              </template>
            </van-field>
            <van-field
              v-model="formData.exp.en"
              placeholder="请输入英文释义"
              type="textarea"
              rows="3"
              label-align="top"
              autosize
            >
              <template #label>
                <div class="label-row">
                  <span>英文释义</span>
                  <div class="label-right">
                    <van-icon
                      v-if="formData.exp.en"
                      name="clear"
                      class="clear-icon"
                      @click.stop="formData.exp.en = ''"
                    />
                    <div @click.stop>
                      <van-popover
                        v-if="enCandidates.length > 0"
                        v-model:show="popoverMap['en']"
                        placement="top-end"
                        @open="onOpen('en')"
                      >
                        <div class="popover-content">
                          <van-cell
                            v-for="(item, i) in enCandidates"
                            :key="i"
                            clickable
                            @click="onSelectEn(item)"
                          >
                            <template #title>
                              <span class="pos-tag">{{ item.pos }}</span>
                              <span>{{ item.text }}</span>
                            </template>
                          </van-cell>
                        </div>
                        <template #reference>
                          <div class="ref-btn">
                            <span>字典释义</span>
                            <van-icon name="add-o" class="ref-icon" />
                          </div>
                        </template>
                      </van-popover>
                    </div>
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
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import { usePosStore } from '@/stores/pos'
import type { Explanation } from '@/types'
import { useWordsStore } from '@/stores/words'
import { useDialogDraft } from '@/composables/useDialogDraft'
import { useSubmitLoading } from '@/utils/toast'
import { usePopoverMap } from '@/composables/usePopoverMap'
import { usePopupHistory } from '@/composables/usePopupHistory'

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
usePopupHistory(show)

const lexStore = usePosStore()
const wordsStore = useWordsStore()
const showPosActionSheet = ref(false)
usePopupHistory(showPosActionSheet)
const { popoverMap, onOpen, closeAll } = usePopoverMap()

watch(show, (v) => {
  emit('update:modelValue', v)
  if (!v) {
    closeAll()
  }
})

const isNew = computed(() => !props.explanation || props.explanation._new === 1)

const posActions = computed(() => {
  return lexStore.posList.map((cat) => ({ name: `${cat.abbr} ${cat.name_ch}`, value: cat.abbr }))
})

const posLabel = computed(() => {
  const p = lexStore.posList.find((cat) => cat.abbr === formData.value.pos)
  return p ? `${p.abbr} ${p.name_ch}` : formData.value.pos
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
    abbr: props.explanation?.abbr || '',
    hide: props.explanation?.hide || 0,
    _new: props.explanation?._new ?? 1,
    sorder: props.explanation?.sorder || 0,
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
  watchSource: formData,
  getState: () => ({
    formData: formData.value,
    wid: props.wid,
    editingExplanation: props.explanation,
  }),
  restoreState: async (state: {
    formData: Explanation
    wid: number
    editingExplanation?: Explanation | null
  }) => {
    if (state.editingExplanation) emit('update:explanation', state.editingExplanation)

    await nextTick()
    formData.value = state.formData
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

const onPosSelect = (item: { name: string; value: string }) => {
  formData.value.pos = item.value
  showPosActionSheet.value = false
}

const candidateDefinitions = computed(() => {
  const word = wordsStore.words.find((w) => w.id === props.wid)
  if (!word?.baseInfo?.definitions) return []

  return word.baseInfo.definitions
    .map((d) => ({
      pos: d.pos,
      zh: d.meanings.zh || [],
      en: d.meanings.en || [],
    }))
    .filter((d) => d.zh.length > 0 || d.en.length > 0)
})

const zhCandidates = computed(() => {
  return candidateDefinitions.value.flatMap((d) => d.zh.map((text) => ({ pos: d.pos, text })))
})

const enCandidates = computed(() => {
  return candidateDefinitions.value.flatMap((d) => d.en.map((text) => ({ pos: d.pos, text })))
})

const onSelectZh = (item: { pos: string; text: string }) => {
  appendZh(item.text)
  if (!formData.value.pos || formData.value.pos === 'na.') {
    formData.value.pos = item.pos
  }
  closeAll()
}

const onSelectEn = (item: { pos: string; text: string }) => {
  appendEn(item.text)
  if (!formData.value.pos || formData.value.pos === 'na.') {
    formData.value.pos = item.pos
  }
  closeAll()
}

const appendZh = (text: string) => {
  if (!text) return
  if (formData.value.exp.zh) {
    formData.value.exp.zh += `; ${text}`
  } else {
    formData.value.exp.zh = text
  }
}

const appendEn = (text: string) => {
  if (!text) return
  if (formData.value.exp.en) {
    formData.value.exp.en += `; ${text}`
  } else {
    formData.value.exp.en = text
  }
}

const { loading, withLoading } = useSubmitLoading()

const onSubmit = () =>
  withLoading(async () => {
    const saved = await wordsStore.saveExplanation(formData.value)
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
  min-width: 100px;
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
.ref-btn {
  color: var(--van-primary-color);
  font-size: var(--van-font-size-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
}
.ref-icon {
  margin-left: 4px;
  font-size: 16px;
}
.clear-icon {
  color: var(--van-gray-5);
  font-size: 16px;
  cursor: pointer;
}
.popover-content {
  min-width: 120px;
  max-width: 260px;
  max-height: 240px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.pos-tag {
  font-weight: bold;
  margin-right: 6px;
}
</style>
