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

      <div class="guide-section">
        <div class="section-title">图例说明</div>
        <div class="legend-grid">
          <div class="legend-item unknown"><van-icon name="cross" /> <span>不认识</span></div>
          <div class="legend-item known"><van-icon name="success" /> <span>认识</span></div>
          <div class="legend-item streak"><van-icon name="fire" /> <span>连续认识</span></div>
          <div class="legend-item medal"><van-icon name="medal" /> <span>已掌握</span></div>
        </div>
      </div>

      <div class="guide-section">
        <div class="section-title">复习流程</div>
        <div class="step-list">
          <div class="step-item">
            <span class="step-num">1</span>
            <span
              >点击下方中间的图标<van-icon
                name="play-circle-o"
                class="inline-icon"
              />启动复习。</span
            >
          </div>
          <div class="step-item">
            <span class="step-num">2</span>
            <span>进入单词卡片，点击遮罩显示释义。</span>
          </div>
          <div class="step-item">
            <span class="step-num">3</span>
            <span
              >根据记忆选择 <span class="text-danger">不认识</span> 或
              <span class="text-success">认识</span>。</span
            >
          </div>
          <div class="step-item">
            <span class="step-num">4</span>
            <span
              >连续认识次数达标后获得
              <van-icon name="medal" class="inline-icon medal" /> 并自动移除。</span
            >
          </div>
        </div>
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
.guide-section {
  margin-bottom: 16px;
}
.section-title {
  font-weight: bold;
  font-size: var(--van-font-size-sm);
  margin-bottom: 12px;
  color: var(--van-text-color);
  padding-left: 8px;
  border-left: 3px solid var(--van-primary-color);
  line-height: 1;
}
.legend-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 0 4px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--van-font-size-sm);
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
.legend-item.medal {
  color: var(--van-warning-color);
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.step-item {
  display: flex;
  align-items: flex-start;
  font-size: var(--van-font-size-sm);
  line-height: 1.2;
  color: var(--van-text-color-2);
}
.step-num {
  width: 18px;
  height: 18px;
  background: var(--van-gray-2);
  color: var(--van-gray-7);
  border-radius: 50%;
  text-align: center;
  line-height: 18px;
  font-size: 12px;
  margin-right: 8px;
  flex-shrink: 0;
  margin-top: 2px;
  font-weight: bold;
}
.inline-icon {
  vertical-align: -3px;
  font-size: 16px;
  color: var(--van-primary-color);
}
.inline-icon.medal {
  color: #ff976a;
}
.text-danger {
  color: var(--van-danger-color);
  font-weight: bold;
}
.text-success {
  color: var(--van-success-color);
  font-weight: bold;
}

.setting-section {
  padding-top: 16px;
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
