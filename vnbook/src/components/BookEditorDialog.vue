<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '70%' }">
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
          <van-button round type="primary" native-type="submit" :loading="loading">保存</van-button>
          <van-button round @click="onCancel">取消</van-button>
          <van-button v-if="!isNew" round type="danger" @click="onDelete">删除</van-button>
        </div>
      </van-form>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
// ...existing code...
import { useBooksStore } from '@/stores/books'
import { useSubmitLoading } from '@/utils/toast'
import type { Book } from '@/types'

const props = defineProps<{
  modelValue: boolean
  book?: Book | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'delete', book: Book): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)

const isNew = computed(() => !props.book || props.book._new === 1)
const edit = ref<Book>({
  id: 0,
  title: '',
  nums: 0,
  time_c: '',
  hide: 0,
  _new: 1,
})

// 重置/初始化表单逻辑 (完全对齐 UserEditorDialog)
const resetForm = () => {
  edit.value = {
    id: 0,
    title: '',
    nums: 0,
    time_c: '',
    hide: 0,
    _new: 1,
  }
}

watch(show, (v) => {
  emit('update:modelValue', v)
  if (!v) {
    // 弹窗关闭时不需要额外重置，因为打开时会通过 props.book 同步
  }
})

// 核心逻辑：监听外部传入的 book 对象
watch(
  () => props.book,
  (book) => {
    if (book) {
      edit.value = {
        id: book.id,
        title: book.title,
        nums: book.nums,
        time_c: book.time_c,
        hide: book.hide,
        _new: book._new ?? 1,
      }
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

const booksStore = useBooksStore()

const { loading, withLoading } = useSubmitLoading()

const onSubmit = () =>
  withLoading(async () => {
    const b: Book = { ...edit.value }
    const saved = await booksStore.saveBook(b)
    if (saved) {
      show.value = false
    }
  })

const onCancel = () => (show.value = false)

const onDelete = () => {
  emit('delete', edit.value)
  show.value = false
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
  padding: 20px 16px; /* 适当的边距 */
  display: flex;
  gap: 12px;
  justify-content: center;
}

.actions .van-button {
  /* 这样设置可以让按钮在一定范围内自适应，但不会无限拉长 */
  min-width: 100px;
  max-width: 120px;
  flex: 1;
}

:deep(.van-field__label) {
  font-weight: bold;
}
</style>
