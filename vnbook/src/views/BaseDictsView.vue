<template>
  <div class="base-dicts-view" @click="closeAllPopovers">
    <van-nav-bar title="基本词典管理" :fixed="false" :placeholder="false" z-index="100">
      <template #left>
        <van-icon name="arrow-left" class="nav-bar-icon" @click="onBack" />
      </template>
      <template #right>
        <van-icon name="plus" class="nav-bar-icon" @click="openNewDict" />
      </template>
    </van-nav-bar>

    <div class="content" ref="contentRef" @scroll="onScroll">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh" class="full-height-refresh">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else>
          <van-cell
            v-for="dict in store.dicts"
            :key="dict.key"
            is-link
            @click="openEditDict(dict)"
            :class="{ 'gen-dict': dict.key === GEN_DICT_KEY }"
          >
            <template #icon>
              <div class="icon-wrapper" @click.stop>
                <van-popover
                  v-model:show="popoverMap[dict.key]"
                  :actions="getDictActions(dict)"
                  placement="bottom-start"
                  @select="(action) => onDictAction(action, dict)"
                  @open="onPopoverOpen(dict.key)"
                >
                  <template #reference>
                    <van-icon name="notes-o" class="list-leading-icon" />
                  </template>
                </van-popover>
              </div>
            </template>
            <template #title>
              <div class="dict-title-row">
                <span class="dict-name">{{ dict.name }}</span>
                <span v-if="dict.desc" class="dict-desc">{{ dict.desc }}</span>
              </div>
            </template>
            <template #label>
              <div class="dict-label">
                <van-tag
                  v-if="dict.tag"
                  :type="dict.active ? 'success' : 'default'"
                  class="dict-tag"
                  >{{ dict.tag }}</van-tag
                >
                <span v-if="store.stats[dict.key]" class="dict-stats">
                  词条: {{ store.stats[dict.key]?.wordCount }} 释义:
                  {{ store.stats[dict.key]?.defCount }}
                </span>
              </div>
            </template>
            <template #right-icon>
              <van-switch
                :model-value="dict.active === 1"
                size="18px"
                @click.stop
                @change="(val) => handleActiveChange(dict, val)"
              />
            </template>
          </van-cell>
          <van-empty v-if="store.dicts.length === 0" description="暂无词典，点击右上角➕新建" />
        </div>
      </van-pull-refresh>
    </div>

    <DictEditorDialog v-model="showEditor" :dict="editorDict" @delete="handleDeleteDict" />
  </div>
</template>

<script lang="ts">
export default {
  name: 'BaseDicts',
}
</script>

<script setup lang="ts">
import { ref, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useScrollPosition } from '@/composables/useScrollPosition'
import { usePopoverMap } from '@/composables/usePopoverMap'
import { type BaseDict, GEN_DICT_KEY } from '@/api/basedicts'
import DictEditorDialog from '@/components/DictEditorDialog.vue'
import { useBaseDictsStore } from '@/stores/basedicts'
import { useDictOperations } from '@/composables/useDictOperations'

const router = useRouter()
const store = useBaseDictsStore()

const { contentRef, onScroll, restoreScroll } = useScrollPosition('BaseDicts')
const { popoverMap, onOpen: onPopoverOpen, closeAll: closeAllPopovers } = usePopoverMap()
const {
  showEditor,
  editorDict,
  openNewDict,
  openEditDict,
  handleDeleteDict,
  handleActiveChange,
  handleMoveDict,
} = useDictOperations()

const loading = ref(true)
const refreshing = ref(false)

const loadDicts = async () => {
  try {
    await store.loadDicts()
  } catch (error) {
    console.error('Failed to load base dicts:', error)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const onRefresh = async () => {
  refreshing.value = true
  await loadDicts()
}

const onBack = () => {
  router.back()
}

const getDictActions = (dict: BaseDict) => {
  const actions = [{ text: '编辑', icon: 'edit', key: 'edit' }]
  // gen 不参与移动
  if (dict.key === GEN_DICT_KEY) return actions

  const index = store.dicts.findIndex((d) => d.key === dict.key)
  if (index > 1) {
    // index 0 是 gen，所以 index > 1 才能上移
    actions.push({ text: '上移', icon: 'arrow-up', key: 'moveUp' })
  }
  if (index < store.dicts.length - 1) {
    actions.push({ text: '下移', icon: 'arrow-down', key: 'moveDown' })
  }
  return actions
}

const onDictAction = async (action: { key: string }, dict: BaseDict) => {
  popoverMap.value[dict.key] = false

  if (action.key === 'edit') {
    openEditDict(dict)
  } else if (action.key === 'moveUp') {
    await handleMoveDict(dict, -1)
  } else if (action.key === 'moveDown') {
    await handleMoveDict(dict, 1)
  }
}

onMounted(() => {
  loadDicts()
})

onActivated(() => {
  restoreScroll()
})
</script>

<style scoped>
.base-dicts-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding-top: 0;
  background-color: var(--van-background);
  box-sizing: border-box;
}

.content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.loading {
  padding: 20px;
  text-align: center;
  color: var(--van-text-color-2);
}

.full-height-refresh {
  min-height: 100%;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 40px;
  height: 44px;
  margin-left: -16px;
  padding-left: 10px;
  margin-right: 2px;
  cursor: pointer;
}

.list-leading-icon {
  font-size: 22px;
  color: var(--van-nav-bar-icon-color);
  display: flex;
  align-items: center;
  height: 100%;
  font-weight: 700;
}

.gen-dict {
  background-color: var(--van-gray-1);
}

/* 图标点击样式 */
.van-icon {
  font-weight: 700;
  cursor: pointer;
}

.nav-bar-icon {
  font-size: 22px;
}

.dict-name {
  font-size: var(--van-font-size-md);
  font-weight: bold;
}

.dict-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dict-desc {
  margin-left: 8px;
  font-size: var(--van-font-size-sm);
  color: var(--van-text-color-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  text-align: right;
}

.dict-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dict-tag {
  font-size: var(--van-font-size-xs);
  white-space: nowrap;
}

.dict-stats {
  font-size: var(--van-font-size-xs);
  color: var(--van-text-color-2);
  white-space: nowrap;
  margin-left: auto;
}

.content :deep(.van-cell__title) {
  flex: 1;
  margin-right: 8px;
}

.content :deep(.van-cell__label) {
  margin-top: 4px;
}

.content :deep(.van-cell__right-icon) {
  display: flex;
  align-items: center;
}

.content :deep(.van-switch) {
  margin-left: 8px;
  flex-shrink: 0;
}

.content :deep(.van-switch--disabled) {
  opacity: 0.5;
}

/* 顶部导航栏样式 */
:deep(.van-nav-bar) {
  padding-top: calc(var(--vnb-pad-top) + env(safe-area-inset-top));
  box-sizing: content-box;
  background-color: var(--vnb-nav-background);
}

/* 调整标题字号 */
:deep(.van-nav-bar__title) {
  font-size: var(--van-font-size-lg);
}

/* 确保单元格内容与图标对齐 */
.content :deep(.van-cell) {
  align-items: center;
}
</style>
