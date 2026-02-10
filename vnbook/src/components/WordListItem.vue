<template>
  <van-cell is-link @click="$emit('click', word)">
    <template #icon>
      <!-- Audio Mode -->
      <div v-if="mode === 'audio'" class="icon-wrapper" @click.stop="playAudio">
        <van-icon name="volume-o" class="list-leading-icon" />
      </div>

      <!-- Edit Mode -->
      <div v-if="mode === 'edit'" class="icon-wrapper" @click.stop>
        <van-popover
          :show="showPopover"
          :actions="actions"
          :placement="popoverPlacement"
          @update:show="$emit('update:showPopover', $event)"
          @select="onSelect"
          @open="$emit('open-popover')"
        >
          <template #reference>
            <van-icon name="edit" class="list-leading-icon" />
          </template>
        </van-popover>
      </div>

      <!-- Select Mode -->
      <div v-if="mode === 'select'" class="icon-wrapper" @click.stop>
        <van-checkbox :name="word.id" />
      </div>
    </template>

    <template #title>
      <span class="word-text">
        <template v-for="(seg, i) in wordSegments" :key="i">
          <span :class="{ highlight: seg.isMatch }">{{ seg.text }}</span>
        </template>
      </span>
      <span v-if="word.phon" class="word-phon">/{{ word.phon }}/</span>
    </template>

    <template #label>
      <div v-if="isReviewMode" class="review-stats">
        <span class="stat-item unknown">不认识 {{ word.n_unknown || 0 }}次</span>
        <span class="stat-item known">认识 {{ word.n_known || 0 }}次</span>
        <span class="stat-item streak">连续 {{ word.n_streak || 0 }}次</span>
      </div>
      <div v-else>
        {{ definition }}
      </div>
    </template>
  </van-cell>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Word } from '@/types'
import type { PopoverPlacement } from 'vant'

const props = defineProps<{
  word: Word
  mode: 'none' | 'edit' | 'audio' | 'select'
  showPopover: boolean
  popoverPlacement: PopoverPlacement
  highlight?: string
  deleteText?: string
  allowMove?: boolean
  moveText?: string
  moveIcon?: string
  isReviewMode?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', word: Word): void
  (e: 'update:showPopover', val: boolean): void
  (e: 'open-popover'): void
  (e: 'action', action: { key: string }, word: Word): void
}>()

const actions = computed(() => {
  if (props.isReviewMode) {
    return [
      { text: '编辑', icon: 'edit', key: 'edit' },
      {
        text: '取消复习',
        icon: 'minus-circle',
        key: 'remove-review',
        color: 'var(--van-warning-color)',
      },
    ]
  }
  const list: { text: string; icon: string; key: string; className?: string }[] = [
    { text: '编辑', icon: 'edit', key: 'edit' },
    { text: '加入复习', icon: 'bookmark-o', key: 'review' },
  ]
  if (props.allowMove) {
    list.push({
      text: props.moveText || '移动到...',
      icon: props.moveIcon || 'exchange',
      key: 'move',
    })
  }
  if (props.deleteText) {
    list.push({
      text: props.deleteText,
      icon: props.deleteText === '移除' ? 'failure' : 'delete-o',
      key: 'delete',
      className: props.deleteText === '移除' ? 'popover-action-remove' : 'popover-action-delete',
    })
  }
  return list
})

const definition = computed(() => {
  // 1. 优先显示单词本内的中文释义
  if (props.word.explanations && props.word.explanations.length > 0) {
    const parts = props.word.explanations.map((e) => e.exp.zh).filter(Boolean)
    if (parts.length > 0) return parts.join('; ')
  }
  // 2. 其次显示基本词典的中文释义
  if (props.word.baseInfo?.definitions?.length) {
    const parts = props.word.baseInfo.definitions
      .map((d) => {
        const meanings = d.meanings?.zh?.join('; ') || ''
        return meanings ? `${d.pos} ${meanings}`.trim() : null
      })
      .filter(Boolean)
    if (parts.length > 0) return (parts as string[]).join('; ')
  }
  return ''
})

const wordSegments = computed(() => {
  if (!props.highlight) return [{ text: props.word.word, isMatch: false }]

  const text = props.word.word
  const keyword = props.highlight
  const regex = new RegExp(`(${keyword})`, 'gi')
  const parts = text.split(regex)

  return parts
    .filter((part) => part)
    .map((part) => ({
      text: part,
      isMatch: part.toLowerCase() === keyword.toLowerCase(),
    }))
})

const playAudio = () => {
  if ('speechSynthesis' in window) {
    const msg = new SpeechSynthesisUtterance(props.word.word)
    msg.lang = 'en-US'
    const voices = window.speechSynthesis.getVoices()
    const usVoice = voices.find((voice) => voice.lang === 'en-US')
    if (usVoice) {
      msg.voice = usVoice
    }
    window.speechSynthesis.speak(msg)
  }
}

const onSelect = (action: { key: string }) => {
  emit('action', action, props.word)
}
</script>

<style scoped>
.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 40px;
  height: 44px;
  margin-left: -16px;
  padding-left: 10px;
  margin-right: 0;
  cursor: pointer;
}

.list-leading-icon {
  font-size: 22px;
  color: var(--van-nav-bar-icon-color);
  display: flex;
  align-items: center;
  height: 100%;
  font-weight: 700; /* 恢复图标加粗效果 */
}

/* 复选框大小微调为 20px，与加粗后的 22px 图标视觉更平衡 */
.icon-wrapper :deep(.van-checkbox__icon) {
  font-size: 20px;
}

.word-text {
  font-weight: bold;
}

.word-phon {
  margin-left: 1em;
  font-size: var(--van-font-size-md);
  color: var(--van-gray-6);
}

.highlight {
  color: var(--van-primary-color);
}

.review-stats {
  display: flex;
  gap: 10px;
  font-size: 12px;
}

.stat-item.unknown {
  color: var(--van-danger-color);
}

.stat-item.known {
  color: var(--van-success-color);
}

.stat-item.streak {
  color: var(--van-primary-color);
}
</style>

<style>
/* 全局样式以覆盖 Popover Action 的默认样式 */
.popover-action-remove {
  color: var(--van-warning-color);
}
.popover-action-delete {
  color: var(--van-danger-color);
}
</style>
