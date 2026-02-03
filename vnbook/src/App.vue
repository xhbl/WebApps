<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="app-root">
    <router-view v-slot="{ Component }">
      <transition :name="(route.meta?.transition as string) || 'slide'" mode="out-in">
        <keep-alive :include="['BooksList', 'WordsList', 'UsersManage']">
          <component :is="Component" />
        </keep-alive>
      </transition>
    </router-view>
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
