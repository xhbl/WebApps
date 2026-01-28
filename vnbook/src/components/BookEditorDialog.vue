<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '50%' }">
    <div class="editor">
      <h3>{{ isNew ? '新建单词本' : '编辑单词本' }}</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <van-field
            v-model="edit.title"
            label="名称"
            placeholder="请输入名称"
            :rules="[{ required: true, message: '请输入名称' }]"
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
import { ref, watch, computed } from 'vue'
import type { Book } from '@/types'

const props = defineProps<{
  modelValue: boolean
  book?: Book | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', book: Book): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)
watch(show, (v) => emit('update:modelValue', v))

const isNew = computed(() => !props.book || props.book._new === 1)
const edit = ref<Book>({
  Id: props.book?.Id || 0,
  title: props.book?.title || '',
  nums: props.book?.nums || 0,
  time_c: props.book?.time_c || '',
  hide: props.book?.hide || 0,
  _new: props.book?._new ?? 1,
})

const onSubmit = () => {
  emit('save', edit.value)
  show.value = false
}

const onCancel = () => {
  show.value = false
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
