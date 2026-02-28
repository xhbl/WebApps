<template>
  <div class="system-manage-view">
    <van-nav-bar title="系统管理" :fixed="false" :placeholder="false" z-index="100">
      <template #right>
        <van-icon name="ellipsis" class="nav-bar-icon" @click="openMenu" />
      </template>
    </van-nav-bar>

    <div class="content" ref="contentRef" @scroll="onScroll">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh" class="full-height-refresh">
        <!-- 系统信息 -->
        <van-cell-group inset title="系统信息" class="info-group">
          <van-cell title="当前版本" :value="appVersion" />
          <van-cell title="入口地址" :value="baseUrl" class="url-cell" />
          <van-cell title="Web服务" :value="info?.serverSoftware || '-'" />
          <van-cell title="PHP版本" :value="info?.phpVersion || '-'" />
          <van-cell title="数据库" :value="info?.dbVersion || '-'" />
        </van-cell-group>

        <!-- 基本词典库 -->
        <van-cell-group inset title="基本词典库" class="info-group">
          <van-cell title="库名称" :value="info?.baseDbName || '-'" />
          <van-cell
            title="包含词典"
            :value="info?.baseDictCount ?? '-'"
            is-link
            @click="onManageBaseDicts"
          />
        </van-cell-group>

        <!-- 用户数据库 -->
        <van-cell-group inset title="用户数据库" class="info-group">
          <van-cell title="库名称" :value="info?.vnbDbName || '-'" />
          <van-cell title="用户数" :value="info?.userCount ?? '-'" />
          <van-cell title="导出数据" is-link @click="onExportData">
            <template #right-icon>
              <van-icon name="share-o" class="cell-icon normal-icon" />
            </template>
          </van-cell>
          <van-cell title="导入数据" is-link @click="onImportData">
            <template #right-icon>
              <van-icon name="upgrade" class="cell-icon normal-icon" />
            </template>
          </van-cell>
          <van-cell title="清空重置" is-link class="danger-cell" @click="onResetData">
            <template #right-icon>
              <van-icon name="replay" class="cell-icon danger-icon" />
            </template>
          </van-cell>
        </van-cell-group>
      </van-pull-refresh>
    </div>

    <AppMenu />
    <UserDialog />
  </div>
</template>

<script lang="ts">
export default {
  name: 'SystemManage',
}
</script>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { getAppVersion } from '@/constants/appInfo'
import { getSystemInfo, type SystemInfo } from '@/api/system'
import { useUserOperations } from '@/composables/useUserOperations'
import { useAppMenu } from '@/composables/useAppMenu'
import { useUsersStore } from '@/stores/users'
import { useScrollPosition } from '@/composables/useScrollPosition'

const router = useRouter()
const appVersion = 'v' + getAppVersion()

const usersStore = useUsersStore()
const { handleResetAllUserData, handleExportUserData, handleImportUserData } = useUserOperations()

const { contentRef, onScroll, restoreScroll } = useScrollPosition('SystemManage')

const { openMenu, AppMenu, UserDialog } = useAppMenu({
  items: [],
  userIcon: 'manager-o',
  showAbout: true,
})

/**
 * 获取应用部署根路径的完整 URL
 * 利用浏览器 <a> 标签自动解析相对路径的能力
 */
const getAppBase = () => {
  const a = document.createElement('a')
  a.href = import.meta.env.BASE_URL // 传入 "./" 或 "/app/"
  return a.href // 浏览器返回完整的 "https://example.com/app/"
}

const baseUrl = getAppBase()

const info = ref<SystemInfo | null>(null)
const refreshing = ref(false)

const loadInfo = async () => {
  try {
    const response = await getSystemInfo()
    if (response.data.success && response.data.info) {
      info.value = response.data.info
    }
  } catch (error) {
    console.error('Failed to load system info:', error)
  }
}

const onRefresh = async () => {
  refreshing.value = true
  await loadInfo()
  refreshing.value = false
}

onMounted(() => {
  loadInfo()
})

onActivated(() => {
  restoreScroll()
  loadInfo()
})

const onExportData = async () => {
  await handleExportUserData()
}

const onImportData = async () => {
  const success = await handleImportUserData()
  if (success) {
    // 刷新系统信息和用户列表（添加 await 等待完成）
    await loadInfo()
    await usersStore.loadUsers()
  }
}

const onResetData = async () => {
  const success = await handleResetAllUserData()
  if (success) {
    // 刷新系统信息和用户列表（添加 await 等待完成）
    await loadInfo()
    await usersStore.loadUsers()
  }
}

const onManageBaseDicts = () => {
  router.push({ name: 'BaseDicts' })
}
</script>

<style scoped>
.system-manage-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: 0;
  background-color: var(--van-background);
}

.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0;
  padding-bottom: calc(var(--van-tabbar-height, 50px) + 24px + env(safe-area-inset-bottom));
}

.info-group {
  margin-top: 8px;
}

.url-cell :deep(.van-cell__value) {
  font-size: var(--van-font-size-xs) !important;
}

.cell-icon {
  font-size: var(--van-font-size-md);
  font-weight: 600;
  margin-left: auto;
}

.danger-cell :deep(.van-cell__title) {
  color: var(--van-danger-color);
}

.danger-icon {
  color: var(--van-danger-color);
}

.normal-icon {
  color: var(--van-text-color);
}

/* 导航栏图标 */
.nav-bar-icon {
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
}

.content :deep(.van-cell) {
  padding: 10px 8px;
}

.content :deep(.van-cell__title) {
  flex: none;
  width: auto;
  margin-right: 12px;
  font-size: var(--van-font-size-md);
  font-weight: 600;
}

.content :deep(.van-cell__value) {
  color: var(--van-text-color-2);
  font-size: var(--van-font-size-sm);
  flex: 1;
  word-break: break-all;
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

:deep(.van-cell-group__title) {
  font-size: var(--van-font-size-sm);
  color: var(--van-text-color-2);
  padding: 16px 0 0 24px;
}

.full-height-refresh {
  min-height: 100%;
}
</style>
