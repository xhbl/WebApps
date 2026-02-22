<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import GlobalDialog from '@/components/GlobalDialog.vue'
import { isSystemBack } from '@/router'

// 异步加载组件以优化首屏，但加载后会持久驻留
const BooksList = defineAsyncComponent(() => import('@/views/BooksListView.vue'))
const WordsList = defineAsyncComponent(() => import('@/views/WordsListView.vue'))
const WordCard = defineAsyncComponent(() => import('@/views/WordCardView.vue'))

const route = useRoute()

// 定义核心业务路由的层级深度
const routeDepth = computed(() => {
  switch (route.name) {
    case 'BooksList':
      return 1
    case 'WordsList':
      return 2
    case 'WordCard':
      return 3
    default:
      return 0
  }
})

// 判断是否处于核心堆栈路由中
const isStackRoute = computed(() => routeDepth.value > 0)

// 计算每个层级的 CSS 类
// depth: 当前路由深度
// layer: 组件所属层级
const getLayerClass = (layer: number) => {
  const depth = routeDepth.value
  if (depth === layer) return 'layer-active' // 当前层级：居中显示
  if (depth > layer) return 'layer-background' // 更深层级：当前层级作为背景（可选择轻微左移或保持不动）
  return 'layer-hidden' // 更浅层级：当前层级隐藏（移至右侧）
}

// 针对非堆栈路由（如登录、用户管理）的过渡动画
const normalTransition = computed(() => {
  return (route.meta?.transition as string) || 'fade'
})
</script>

<template>
  <div class="app-root">
    <!-- 1. 普通路由视图 (Login, UsersManage 等) -->
    <!-- 当不在核心堆栈时显示，使用传统的销毁/重建模式 -->
    <router-view v-if="!isStackRoute" v-slot="{ Component }">
      <transition :name="normalTransition" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- 2. 核心业务堆栈视图 (持久化 DOM) -->
    <!-- 始终存在于 DOM 中，通过 CSS Transform 切换，实现极致的保留位置体验 -->
    <div v-show="isStackRoute" class="stack-container">
      <!-- Level 1: 单词本列表 -->
      <div class="page-layer" :class="[getLayerClass(1), { 'no-transition': isSystemBack }]">
        <BooksList />
      </div>

      <!-- Level 2: 单词列表 -->
      <div class="page-layer" :class="[getLayerClass(2), { 'no-transition': isSystemBack }]">
        <WordsList />
      </div>

      <!-- Level 3: 单词卡片 -->
      <div class="page-layer" :class="[getLayerClass(3), { 'no-transition': isSystemBack }]">
        <WordCard />
      </div>
    </div>

    <GlobalDialog />
  </div>
</template>

<style scoped>
.app-root {
  height: 100%; /* 改为 100% 避免 vh 在移动端地址栏变化时导致的抖动 */
  background-color: var(--van-background);
  overflow: hidden; /* 防止滑动时的横向滚动条 */
}

.stack-container {
  position: relative;
  width: 100%;
  height: 100%; /* 改为 100% */
  overflow: hidden;
}

.page-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden; /* 移除自身滚动，交给子组件内部处理 */
  -webkit-overflow-scrolling: touch;
  background-color: var(--van-background);
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94); /* 仿 iOS 滑动曲线 */
  will-change: transform;
  z-index: 1;
}

.layer-active {
  transform: translate3d(0, 0, 0);
  z-index: 10;
}

.layer-hidden {
  transform: translate3d(100%, 0, 0); /* 移至右侧屏幕外 */
  z-index: 20; /* 保证滑入时在上方 */
}

.layer-background {
  transform: translate3d(-25%, 0, 0); /* 视差效果：轻微左移 */
  z-index: 1;
}

.no-transition {
  transition: none !important;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
