<template>
  <div class="system-manage-view">
    <van-nav-bar title="系统管理" :fixed="false" :placeholder="false" />
    <div class="content">
      <van-empty description="系统管理功能开发中..." />
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'SystemManage',
}
</script>

<script setup lang="ts">
// 空页面，后续可以添加系统管理功能
</script>

<style scoped>
.system-manage-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--van-background);
}

.content {
  flex: 1;
  overflow-y: auto;
}

/* 顶部导航栏样式 */
:deep(.van-nav-bar) {
  padding-top: calc(var(--vnb-pad-top) + env(safe-area-inset-top));
  box-sizing: content-box;
  background-color: var(--vnb-nav-background);
}
/* 调整标题字号 */
:deep(.van-nav-bar__title) {
  font-size: var(--van-font-size-xl);
}
</style>
