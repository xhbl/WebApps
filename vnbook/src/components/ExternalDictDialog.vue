<template>
  <van-popup
    :show="show"
    round
    position="bottom"
    :style="{ height: '80%' }"
    closeable
    @update:show="onUpdateShow"
  >
    <div class="dict-popup-content safe-area-bottom">
      <h3>{{ name }}</h3>
      <div class="dict-iframe-container">
        <iframe
          v-if="show"
          :src="url"
          frameborder="0"
          class="dict-iframe"
          :style="{ margin: margin }"
        ></iframe>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { usePopupHistory } from '@/composables/usePopupHistory'

const props = defineProps<{
  modelValue: boolean
  name: string
  url: string
  margin?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const startHistoryLen = ref(0)

usePopupHistory(show)

watch(
  show,
  (val) => {
    if (val) {
      // 记录初始历史长度，稍作延迟以确保 usePopupHistory 已推入状态
      setTimeout(() => {
        startHistoryLen.value = window.history.length
      }, 50)
    }
  },
  { immediate: true },
)

// 拦截 van-popup 的 update:show 事件
// 当用户点击遮罩层或关闭按钮时触发，此时我们有机会清理 iframe 产生的额外历史记录
const onUpdateShow = (val: boolean) => {
  if (!val && show.value) {
    const currentLen = window.history.length
    if (startHistoryLen.value > 0) {
      const diff = currentLen - startHistoryLen.value
      // 如果 iframe 导致历史记录增加（diff > 0），我们需要手动回退这些额外记录
      // usePopupHistory 会负责回退它自己推入的那一条（即最后一步）
      if (diff > 0) {
        // 使用 go 回退 diff 步，但这会触发 popstate
        // 我们的目标是：回到弹窗刚打开的状态，然后让 usePopupHistory 关闭弹窗
        // 但 history.go 是异步的。
        // 为了稳妥，我们可以直接回退，并且相信 usePopupHistory 会在下一个 tick 或 popstate 中处理剩余的
        window.history.go(-diff)
      }
    }
  }
  show.value = val
}
</script>

<style scoped>
.dict-popup-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 0 0 0;
}
.dict-popup-content h3 {
  text-align: center;
  margin: 0 0 16px;
  flex-shrink: 0;
}
.dict-iframe-container {
  flex: 1;
  width: 100%;
  overflow: hidden; /* Crop content based on negative margins */
  display: flex;
}
.dict-iframe {
  flex: 1;
  width: 100%;
  border: none;
  background: #fff;
}
</style>
