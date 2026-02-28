<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '70%' }">
    <div class="editor">
      <h3>{{ isNew ? '新建词典' : '编辑词典' }}</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <van-field
            v-model="edit.key"
            label="标识符"
            placeholder="如: med, tech"
            :rules="[
              { required: true, message: '请输入标识符' },
              {
                pattern: /^[a-z][a-z0-9_]*$/,
                message: '标识符格式不正确，必须以字母开头，只能包含字母、数字和下划线',
              },
            ]"
            :readonly="!isNew"
            :class="{ 'readonly-field': !isNew }"
          />
          <van-field
            v-model="edit.tag"
            label="标签"
            placeholder="如: 医学, 技术"
            :rules="[{ required: true, message: '请输入标签' }]"
          />
          <van-field
            v-model="edit.name"
            label="名称"
            placeholder="如: 医学词库"
            :rules="[{ required: true, message: '请输入名称' }]"
          />
          <van-field
            v-model="edit.desc"
            type="textarea"
            label="描述"
            placeholder="词典的详细说明或来源"
            rows="1"
            autosize
          />
          <van-field name="active" label="启用状态" :border="false">
            <template #input>
              <van-switch v-model="edit.active" size="20" />
            </template>
          </van-field>
        </van-cell-group>

        <div class="actions">
          <van-button round type="primary" native-type="submit" :loading="loading">保存</van-button>
          <van-button round @click="onCancel">取消</van-button>
          <van-button
            v-if="!isNew && edit.key !== GEN_DICT_KEY"
            round
            type="danger"
            @click="onDelete"
            >删除</van-button
          >
        </div>
      </van-form>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { GEN_DICT_KEY } from '@/api/basedicts'
import { useSubmitLoading } from '@/utils/toast'
import type { BaseDict } from '@/api/basedicts'
import { usePopupHistory } from '@/composables/usePopupHistory'
import { useBaseDictsStore } from '@/stores/basedicts'

const props = defineProps<{
  modelValue: boolean
  dict?: BaseDict | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'delete', dict: any): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => {
    show.value = v
    if (v) {
      if (props.dict) {
        edit.value = {
          key: props.dict.key,
          tag: props.dict.tag,
          name: props.dict.name,
          active: props.dict.active === 1,
          desc: props.dict.desc || '',
        }
      } else {
        edit.value = {
          key: '',
          tag: '',
          name: '',
          active: true,
          desc: '',
        }
      }
    }
  },
)
const { close } = usePopupHistory(show)

const isNew = computed(() => !props.dict)
const edit = ref({
  key: '',
  tag: '',
  name: '',
  active: true,
  desc: '',
})

watch(show, (v) => emit('update:modelValue', v))

const { loading, withLoading } = useSubmitLoading()
const store = useBaseDictsStore()

const onSubmit = async () => {
  await withLoading(async () => {
    const params = {
      key: edit.value.key,
      tag: edit.value.tag,
      name: edit.value.name,
      active: edit.value.active ? 1 : 0,
      desc: edit.value.desc || undefined,
    }

    const success = await store.saveDict(params, isNew.value)
    if (success) {
      show.value = false
    }
  })
}

const onCancel = () => (show.value = false)

const onDelete = async () => {
  await close()
  emit('delete', edit.value)
}
</script>

<style scoped>
.editor {
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

h3 {
  margin: 0 0 16px 0;
  text-align: center;
}

.van-form {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.actions {
  margin-top: auto;
  padding: 20px 16px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.actions .van-button {
  min-width: 90px;
  max-width: 120px;
  flex: 1;
}

:deep(.van-field__label) {
  font-weight: bold;
  width: 5em;
  flex: none;
}

:deep(.readonly-field .van-field__value) {
  color: var(--van-text-color-2) !important;
}

:deep(.readonly-field input) {
  color: var(--van-text-color-2) !important;
}
</style>
