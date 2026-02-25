<template>
  <div class="system-manage-view">
    <van-nav-bar title="系统管理" :fixed="false" :placeholder="false" z-index="100">
      <template #right>
        <van-icon name="ellipsis" class="nav-bar-icon" @click="openMenu" />
      </template>
    </van-nav-bar>

    <div class="content">
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
        <van-cell title="词条数" :value="info?.baseWordCount ?? '-'" />
        <van-cell title="释义数" :value="info?.baseDefCount ?? '-'" />
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
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { getAppVersion } from '@/constants/appInfo'
import { getSystemInfo, type SystemInfo } from '@/api/system'
import { useUserOperations } from '@/composables/useUserOperations'
import { useAppMenu } from '@/composables/useAppMenu'

const appVersion = 'v' + getAppVersion()

const { handleResetAllUserData } = useUserOperations()

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

onMounted(() => {
  loadInfo()
})

const onExportData = () => {
  showToast('导出数据功能开发中')
}

const onImportData = () => {
  showToast('导入数据功能开发中')
}

const onResetData = async () => {
  const success = await handleResetAllUserData()
  if (success) {
    loadInfo()
  }
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
  font-size: 12px;
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

:deep(.van-cell) {
  padding: 10px 8px;
}

:deep(.van-cell__title) {
  flex: none;
  width: auto;
  margin-right: 12px;
  font-size: var(--van-font-size-md);
  font-weight: 600;
}

:deep(.van-cell__value) {
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
</style>
