<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '60%' }">
    <div class="editor">
      <h3>添加单词</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <van-field
            v-model="name"
            label="单词"
            placeholder="请输入单词"
            :rules="[{ required: true, message: '请输入单词' }]"
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
import { ref, watch } from 'vue'
import type { Word } from '@/types'

const props = defineProps<{ modelValue: boolean; bid: number }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', w: Word): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)
watch(show, (v) => emit('update:modelValue', v))

const name = ref('')

const normalizeWord = (s: string) => {
  if (!s) return s
  const isAllUpper = /^[A-Z]+$/.test(s)
  return isAllUpper ? s : s.toLowerCase()
}

const onSubmit = () => {
  const w: Word = {
    id: 0,
    word: normalizeWord(name.value.trim()),
    phon: '',
    time_c: '',
    explanations: [],
    _new: 1,
  }
  emit('save', w)
  show.value = false
}

const onCancel = () => (show.value = false)
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
