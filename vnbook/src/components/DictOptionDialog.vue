<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '50%' }" closeable>
    <div class="dict-option-dialog">
      <h3>基本词典选项</h3>
      <div class="content">
        <van-cell-group>
          <van-cell v-for="dict in activeDicts" :key="dict.key" center>
            <template #title>
              <div class="dict-info">
                <span class="dict-name">{{ dict.name }}</span>
                <van-tag v-if="dict.tag" plain type="primary" class="dict-tag">{{
                  dict.tag
                }}</van-tag>
              </div>
            </template>
            <template #right-icon>
              <van-switch
                :model-value="!isExcluded(dict.key)"
                size="24"
                @update:model-value="(val) => toggleDict(dict.key, val)"
              />
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useBaseDictsStore } from '@/stores/basedicts'
import { usePopupHistory } from '@/composables/usePopupHistory'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'change'): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)
watch(show, (v) => {
  emit('update:modelValue', v)
  if (v && authStore.isLoggedIn) {
    dictsStore.loadDicts()
  }
})
usePopupHistory(show)

const authStore = useAuthStore()
const dictsStore = useBaseDictsStore()

onMounted(() => {
  if (authStore.isLoggedIn && dictsStore.dicts.length === 0) {
    dictsStore.loadDicts()
  }
})

const activeDicts = computed(() => {
  return dictsStore.dicts.filter((d) => d.active === 1)
})

const excludeDicts = computed(() => {
  return (authStore.userInfo?.cfg?.excludeDicts as string[]) || []
})

const isExcluded = (key: string) => {
  return excludeDicts.value.includes(key)
}

const toggleDict = async (key: string, checked: boolean) => {
  const currentExcludes = [...excludeDicts.value]
  let newExcludes: string[]

  if (checked) {
    newExcludes = currentExcludes.filter((k) => k !== key)
  } else {
    if (!currentExcludes.includes(key)) {
      newExcludes = [...currentExcludes, key]
    } else {
      newExcludes = currentExcludes
    }
  }

  await authStore.updateUserConfig({ excludeDicts: newExcludes })
  emit('change')
}
</script>

<style scoped>
.dict-option-dialog {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-top: 16px;
}
h3 {
  text-align: center;
  margin: 0 0 16px;
  flex-shrink: 0;
}
.content {
  flex: 1;
  overflow-y: auto;
}
.dict-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dict-name {
  font-weight: bold;
}
</style>
