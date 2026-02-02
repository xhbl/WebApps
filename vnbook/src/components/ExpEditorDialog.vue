<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '70%' }">
    <div class="editor">
      <h3>{{ isNew ? '添加释义' : '编辑释义' }}</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <van-field name="Picker" label="词性">
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
            v-model="edit.exp_ch"
            label="中文释义"
            placeholder="请输入中文释义"
            :rules="[{ required: true, message: '请输入中文释义' }]"
            type="textarea"
            rows="2"
          />
          <van-field
            v-model="edit.exp.en"
            label="英文释义（可选）"
            placeholder="请输入英文释义"
            type="textarea"
            rows="2"
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
import { ref, watch, computed, onMounted } from 'vue'
import { usePosStore } from '@/stores/pos'
import type { Explanation } from '@/types'

const props = defineProps<{
  modelValue: boolean
  explanation?: Explanation | null
  wid: number
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', exp: Explanation): void
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

const edit = ref<Explanation>({
  id: props.explanation?.id || 0,
  word_id: props.wid,
  pos: props.explanation?.pos || '',
  exp: props.explanation?.exp || { en: '', zh: '' },
  time_c: props.explanation?.time_c || '',
  lid: props.explanation?.lid || 0,
  exp_ch: props.explanation?.exp_ch || '',
  abbr: props.explanation?.abbr || '',
  hide: props.explanation?.hide || 0,
  _new: props.explanation?._new ?? 1,
})

onMounted(async () => {
  await lexStore.loadPosList()
  if (props.explanation?.abbr) {
    selectedCat.value = props.explanation.abbr
  }
})

const onPickerConfirm = (value: string) => {
  edit.value.abbr = value
  selectedCat.value = value
  pickerShow.value = false
}

const onSubmit = () => {
  if (!edit.value.abbr) {
    emit('save', edit.value)
    return
  }
  emit('save', edit.value)
  show.value = false
}

const onCancel = () => (show.value = false)
</script>

<style scoped>
.editor {
  padding: 16px;
}
.picker-trigger {
  padding: 10px;
  background: #f7f8fa;
  border-radius: 4px;
  cursor: pointer;
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
