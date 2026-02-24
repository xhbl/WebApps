<template>
  <div class="admin-layout">
    <router-view v-slot="{ Component }">
      <KeepAlive include="UsersManage,SystemManage">
        <component :is="Component" />
      </KeepAlive>
    </router-view>
    <van-tabbar v-model="activeTab" active-color="var(--van-primary-color)" inactive-color="#999" route>
      <van-tabbar-item replace to="/admin/users" name="users">
        <template #icon="{ active }">
          <van-icon :name="active ? 'friends' : 'friends-o'" size="20" />
        </template>
        用户管理
      </van-tabbar-item>
      <van-tabbar-item replace to="/admin/system" name="system">
        <template #icon="{ active }">
          <van-icon :name="active ? 'setting' : 'setting-o'" size="20" />
        </template>
        系统管理
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script lang="ts">
export default {
  name: 'AdminLayout',
}
</script>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const activeTab = ref('users')

// 根据路由设置激活的标签
watch(
  () => route.path,
  (path) => {
    if (path.includes('/admin/users')) {
      activeTab.value = 'users'
    } else if (path.includes('/admin/system')) {
      activeTab.value = 'system'
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.admin-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.van-tabbar) {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
