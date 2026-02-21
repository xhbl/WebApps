<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import GlobalDialog from '@/components/GlobalDialog.vue'

const route = useRoute()
const authStore = useAuthStore()

const transitionName = computed(() => {
  if (route.meta?.disableTransition) {
    return ''
  }
  return (route.meta?.transition as string) || 'slide'
})
</script>

<template>
  <div class="app-root">
    <router-view v-slot="{ Component }">
      <transition :name="transitionName" mode="out-in">
        <keep-alive :include="['BooksList', 'WordsList', 'UsersManage']" :key="authStore.sessionId">
          <component :is="Component" />
        </keep-alive>
      </transition>
    </router-view>
    <GlobalDialog />
  </div>
</template>

<style scoped>
.app-root {
  min-height: 100vh;
  background-color: var(--van-background);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.25s ease;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(10px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
