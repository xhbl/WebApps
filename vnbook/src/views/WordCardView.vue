<template>
  <div class="word-card-view">
    <van-nav-bar class="nav-bar-fixed" :title="title">
      <template #left>
        <van-button class="icon-btn" round size="small" icon="arrow-left" @click="goBack" />
      </template>
      <template #right>
        <van-button class="icon-btn" round size="small" icon="ellipsis" @click="openMenu" />
      </template>
    </van-nav-bar>

    <div class="swipe-wrap">
      <van-button
        v-if="isDesktop"
        class="nav-btn nav-prev"
        icon="arrow-left"
        round
        type="primary"
        plain
        @click="swipePrev"
      />
      <van-swipe
        ref="swipeRef"
        :initial-swipe="initialIndex"
        :show-indicators="true"
        @change="onChange"
      >
        <van-swipe-item v-for="w in wordsStore.words" :key="w.Id">
          <div class="card">
            <h1 class="name">{{ w.name }}</h1>
            <h2 class="phon" v-if="w.phon">[{{ w.phon }}]</h2>

            <div class="exps" v-if="w.explanations && w.explanations.length">
              <div class="exp" v-for="e in w.explanations" :key="e.Id">
                <h3 class="abbr">{{ e.abbr }}</h3>
                <div class="exp-text">
                  {{ e.exp_ch }}<span v-if="e.exp"> ({{ e.exp }})</span>
                </div>
                <div class="sens" v-if="e.sentences && e.sentences.length">
                  <div class="sen" v-for="s in e.sentences" :key="s.Id">
                    <div class="sen-en">{{ s.sen }}</div>
                    <div class="sen-ch" v-if="s.sen_ch">{{ s.sen_ch }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </van-swipe-item>
      </van-swipe>
      <van-button
        v-if="isDesktop"
        class="nav-btn nav-next"
        icon="arrow"
        round
        type="primary"
        plain
        @click="swipeNext"
      />
    </div>

    <van-action-sheet
      v-model:show="showMenu"
      :actions="menuActions"
      cancel-text="取消"
      @select="handleMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWordsStore } from '@/stores/words'
import type { MenuAction } from '@/types'

const route = useRoute()
const router = useRouter()
const wordsStore = useWordsStore()
const swipeRef = ref()
const showMenu = ref(false)
const menuActions = [
  { name: '删除', key: 'delete' },
  { name: '编辑', key: 'edit' },
]

const wid = Number(route.params.wid)
const bid = Number(route.params.bid)

// 页面加载时确保数据已加载
onMounted(async () => {
  // 如果 words 为空，重新加载
  if (!wordsStore.words.length && bid) {
    await wordsStore.loadWords(bid)
  }
})

// 检测是否为桌面设备（非触摸屏或支持悬停）
const isDesktop = computed(() => {
  // 检测是否支持精细指针（鼠标）和悬停
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches
  const canHover = window.matchMedia('(hover: hover)').matches
  return hasFinePointer || canHover
})

const initialIndex = computed(() => {
  const idx = wordsStore.words.findIndex((w) => w.Id === wid)
  return idx >= 0 ? idx : 0
})

const title = computed(() => {
  return `第${initialIndex.value + 1}个 / 共${wordsStore.words.length}个`
})

const onChange = (index: number) => {
  const w = wordsStore.words[index]
  if (w) {
    wordsStore.setCurrentWord(w)
    // 更新 URL 参数，以便刷新时保持在当前单词
    router.replace({
      params: { ...route.params, wid: String(w.Id) },
    })
  }
}

const openMenu = () => (showMenu.value = true)
const onSelectAction = (action: MenuAction) => {
  // 功能暂不实现，占位
  if (action.key === 'delete') {
    // TODO: 删除当前单词
  } else if (action.key === 'edit') {
    // TODO: 编辑当前单词
  }
}
const handleMenuSelect = (action: MenuAction) => onSelectAction(action)

const goBack = () => router.back()
const swipePrev = () => swipeRef.value?.prev()
const swipeNext = () => swipeRef.value?.next()
</script>

<style scoped>
.word-card-view {
  min-height: 100vh;
  padding-top: 54px; /* 预留导航高度，避免内容被覆盖 */
  box-sizing: border-box;
}
.nav-bar-fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2000;
  background: #fff;
}
.nav-bar-fixed :deep(.van-nav-bar__title) {
  font-size: 20px;
}
.icon-btn :deep(.van-icon) {
  font-size: 18px;
  font-weight: 700;
}
.swipe-wrap {
  padding: 8px;
  position: relative;
}
.swipe-wrap :deep(.van-swipe__indicators) {
  bottom: 8px;
}
.card {
  padding: 16px;
}
.name {
  font-size: 32px;
  margin: 0;
}
.phon {
  font-size: 20px;
  color: #666;
  margin: 8px 0 16px;
}
.exp {
  margin: 12px 0;
}
.abbr {
  font-size: 14px;
  color: #1989fa;
  margin: 0 0 6px;
}
.exp-text {
  font-size: 16px;
}
.sen {
  margin: 8px 0;
}
.sen-en {
  font-size: 15px;
}
.sen-ch {
  font-size: 14px;
  color: #666;
}
.nav-btn {
  position: absolute;
  top: auto;
  bottom: -8px;
  transform: scale(0.75);
  z-index: 10;
  display: inline-flex;
  padding: 0 10px;
  backdrop-filter: blur(6px);
}
.nav-prev {
  left: 6px;
}
.nav-next {
  right: 6px;
}
</style>
