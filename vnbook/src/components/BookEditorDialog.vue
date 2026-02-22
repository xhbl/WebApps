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
          <van-field label="设为缺省" :border="false">
            <template #input>
              <van-switch v-model="isDefaultBook" size="20" />
            </template>
          </van-field>
          <div class="switch-desc">从首页添加单词会使用缺省单词本</div>
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
import { ref, watch, computed, nextTick } from 'vue'
import { useBooksStore } from '@/stores/books'
import { useSubmitLoading } from '@/utils/toast'
import type { Book } from '@/types'
import { usePopupHistory } from '@/composables/usePopupHistory'
import { useAuthStore } from '@/stores/auth'
import { useDialogDraft } from '@/composables/useDialogDraft'

const props = defineProps<{
  modelValue: boolean
  book?: Book | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'delete', book: Book): void
  (e: 'update:book', book: Book): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)
const { close } = usePopupHistory(show)

const isNew = computed(() => !props.book || props.book._new === 1)
const authStore = useAuthStore()
const edit = ref<Book>({
  id: 0,
  title: '',
  nums: 0,
  time_c: '',
  hide: 0,
  _new: 1,
})

const isDefaultBook = ref(false)
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
  isDefaultBook.value = false
}

// --- 状态持久化逻辑 ---
const { isRestoring, clearDraft } = useDialogDraft({
  storageKey: 'vnb_book_editor_state',
  show,
  watchSource: edit,
  getState: () => ({
    edit: edit.value,
    editingBook: props.book,
    isDefaultBook: isDefaultBook.value,
  }),
  restoreState: async (state: {
    edit: Book
    editingBook?: Book | null
    isDefaultBook?: boolean
  }) => {
    // 恢复父组件的 book 状态，确保 isNew 计算正确
    if (state.editingBook) emit('update:book', state.editingBook)

    await nextTick()
    edit.value = state.edit
    if (state.isDefaultBook !== undefined) isDefaultBook.value = state.isDefaultBook
  },
})

watch(show, (v) => {
  emit('update:modelValue', v)
})

// 核心逻辑：监听外部传入的 book 对象
watch(
  () => props.book,
  (book) => {
    if (book && !isRestoring.value) {
      edit.value = {
        id: book.id,
        title: book.title,
        nums: book.nums,
        time_c: book.time_c,
        hide: book.hide,
        _new: book._new ?? 1,
      }
      isDefaultBook.value = book.id === authStore.userInfo?.defaultBookId
    } else if (!isRestoring.value) {
      resetForm()
    }
    if (isNew.value) isDefaultBook.value = false // 新建时默认不勾选
  },
  { immediate: true },
)

defineExpose({ clearDraft })

const booksStore = useBooksStore()

const { loading, withLoading } = useSubmitLoading()

const onSubmit = () =>
  withLoading(async () => {
    const b: Book = { ...edit.value }
    const saved = await booksStore.saveBook(b)
    if (saved) {
      // 处理缺省单词本逻辑
      const currentDefaultBookId = authStore.userInfo?.defaultBookId
      if (isDefaultBook.value) {
        // 如果当前勾选为缺省，则设为缺省
        await authStore.updateUserConfig({ defaultBookId: saved.id })
      } else if (currentDefaultBookId === saved.id) {
        // 如果当前未勾选，但它曾是缺省，则取消缺省
        await authStore.updateUserConfig({ defaultBookId: 0 })
      }

      // 关闭弹窗
      show.value = false
    }
  })

const onCancel = () => (show.value = false)

const onDelete = async () => {
  // 先安全关闭弹窗，再抛出事件，确保父组件接收事件时历史记录已回退完成
  await close()
  emit('delete', edit.value)
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
  min-width: 90px;
  max-width: 120px;
  flex: 1;
}

:deep(.van-field__label) {
  font-weight: bold;
}

.switch-desc {
  font-size: var(--van-font-size-sm);
  color: var(--van-text-color-3);
  padding: 0 16px 10px 16px;
  line-height: 1.4;
}
</style>
