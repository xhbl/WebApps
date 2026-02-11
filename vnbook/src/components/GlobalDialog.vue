<template>
  <van-dialog
    v-model:show="show"
    :title="store.options.title"
    :message="store.options.showCheckbox ? undefined : store.options.message"
    :show-cancel-button="store.options.showCancelButton"
    :show-confirm-button="store.options.showConfirmButton !== false"
    :confirm-button-text="store.options.confirmButtonText || '确认'"
    :confirm-button-color="store.options.confirmButtonColor"
    :cancel-button-text="store.options.cancelButtonText || '取消'"
    :allow-html="store.options.allowHtml"
    :close-on-click-overlay="store.options.closeOnClickOverlay"
    :width="store.options.width"
    :message-align="store.options.messageAlign"
    :close-on-popstate="false"
    @confirm="store.confirm"
    @cancel="store.cancel"
  >
    <template #default v-if="store.options.showCheckbox">
      <div class="global-dialog-content">
        <div
          v-if="store.options.message"
          class="global-dialog-message"
          :class="{ 'has-title': !!store.options.title }"
          :style="{ textAlign: store.options.messageAlign || 'center' }"
        >
          <div v-if="store.options.allowHtml" v-html="store.options.message"></div>
          <div v-else>{{ store.options.message }}</div>
        </div>
        <div class="global-dialog-checkbox">
          <van-checkbox v-model="store.checked" icon-size="18px">{{
            store.options.checkboxLabel
          }}</van-checkbox>
        </div>
      </div>
    </template>
  </van-dialog>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDialogStore } from '@/stores/dialog'
import { usePopupHistory } from '@/composables/usePopupHistory'

const store = useDialogStore()
const { show } = storeToRefs(store)

// 核心：绑定历史记录管理
usePopupHistory(show)

// 监听 show 变化，处理非按钮点击关闭的情况（如返回键）
watch(show, (val) => {
  if (!val) {
    store.close()
  }
})
</script>

<style scoped>
.global-dialog-content {
  padding: 8px 24px 24px;
}

.global-dialog-message {
  font-size: var(--van-dialog-message-font-size);
  line-height: var(--van-dialog-message-line-height);
  color: var(--van-dialog-message-color);
  word-break: normal;
  overflow-wrap: break-word;
  margin-bottom: 16px;
  padding-top: 24px; /* 无标题时的默认 padding */
}

.global-dialog-message.has-title {
  padding-top: 8px; /* 有标题时的 padding */
}

.global-dialog-checkbox {
  display: flex;
  justify-content: center;
}

.global-dialog-checkbox :deep(.van-checkbox__label) {
  font-size: 14px;
  color: var(--van-text-color-2);
  text-align: left;
}
</style>
