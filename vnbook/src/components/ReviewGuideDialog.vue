<template>
  <van-popup
    v-model:show="show"
    round
    position="bottom"
    :style="{ height: '70%' }"
    closeable
    @closed="onClose"
  >
    <div class="guide-dialog">
      <h3>复习指导</h3>

      <div class="guide-content">
        <p>这里显示所有已加入复习的单词。</p>
        <p>列表显示了每个单词的复习统计：</p>
        <div class="legend-item unknown"><van-icon name="cross" /> <span>不认识次数</span></div>
        <div class="legend-item known"><van-icon name="success" /> <span>认识次数</span></div>
        <div class="legend-item streak"><van-icon name="fire" /> <span>当前连续认识次数</span></div>
      </div>

      <div class="setting-section">
        <div class="setting-header">
          <span>连续认识达标次数</span>
          <span class="setting-value">{{ targetStreak }}</span>
        </div>
        <div class="setting-desc">
          当连续认识次数达到此值时，单词将被视为“已掌握”，将在下次进入复习时自动移除。
        </div>
        <div class="slider-wrapper">
          <van-slider
            v-model="targetStreak"
            :min="2"
            :max="20"
            :step="1"
            bar-height="4px"
            active-color="var(--van-primary-color)"
            @change="onSliderChange"
          >
            <template #button>
              <div class="custom-button">{{ targetStreak }}</div>
            </template>
          </van-slider>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePopupHistory } from '@/composables/usePopupHistory'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const show = ref(props.modelValue)
usePopupHistory(show)

const authStore = useAuthStore()
const targetStreak = ref(3)

watch(
  () => props.modelValue,
  (v) => {
    show.value = v
    if (v) {
      // Initialize from store
      const saved = authStore.userInfo?.cfg?.targetStreak
      targetStreak.value = typeof saved === 'number' ? saved : 3
    }
  },
)

watch(show, (v) => emit('update:modelValue', v))

const onClose = () => {
  // Save config on close if changed
  const currentSaved = authStore.userInfo?.cfg?.targetStreak
  const savedVal = typeof currentSaved === 'number' ? currentSaved : 3

  if (savedVal !== targetStreak.value) {
    authStore.updateUserConfig({ targetStreak: targetStreak.value })
  }
}

const onSliderChange = () => {
  authStore.updateUserConfig({ targetStreak: targetStreak.value })
}
</script>

<style scoped>
.guide-dialog {
  padding: 20px 24px 40px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}
h3 {
  margin: 0 0 16px 0;
  text-align: center;
  flex-shrink: 0;
}
.guide-content {
  margin-bottom: 32px;
  font-size: var(--van-font-size-md);
  line-height: 1.6;
  color: var(--van-text-color);
}
.guide-content p {
  margin: 0 0 8px 0;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  font-weight: bold;
}
.legend-item .van-icon {
  font-size: 18px;
}
.legend-item.unknown {
  color: var(--van-danger-color);
}
.legend-item.known {
  color: var(--van-success-color);
}
.legend-item.streak {
  color: var(--van-primary-color);
}
.setting-section {
  padding-top: 24px;
  border-top: 1px solid var(--van-border-color);
}
.setting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: bold;
  font-size: 16px;
}
.setting-value {
  color: var(--van-primary-color);
  font-size: 20px;
  font-family: monospace;
}
.setting-desc {
  font-size: var(--van-font-size-sm);
  color: var(--van-text-color-2);
  margin-bottom: 30px;
}
.slider-wrapper {
  padding: 0 10px;
}
.custom-button {
  width: 28px;
  color: #fff;
  font-size: 12px;
  line-height: 20px;
  text-align: center;
  background-color: var(--van-primary-color);
  border-radius: 100px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}
</style>
