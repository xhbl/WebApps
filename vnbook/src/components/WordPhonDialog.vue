<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '40%' }">
    <div class="editor">
      <h3>编辑音标</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <van-field v-model="phon" label="音标" placeholder="请输入音标" />
        </van-cell-group>

        <div class="actions">
          <van-button round type="primary" native-type="submit">保存</van-button>
          <van-button round class="ml" @click="onCancel">取消</van-button>
        </div>
      </van-form>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{ modelValue: boolean; phon?: string }>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', p: string): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)
watch(show, (v) => emit('update:modelValue', v))

const phon = ref(props.phon || '')

const onSubmit = () => {
  emit('save', phon.value)
  show.value = false
}

const onCancel = () => (show.value = false)
</script>

<style scoped>
.editor {
  padding: 16px;
}
.actions {
  padding: 12px 0;
  display: flex;
  gap: 12px;
}
.ml {
  margin-left: 8px;
}
</style>
