<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '60%' }">
    <div class="editor">
      <h3>修改用户信息</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <van-field
            v-model="edit.dispname"
            label="显示名"
            placeholder="请输入显示名"
            :rules="[{ required: true, message: '请输入显示名' }]"
          />
          <van-field
            v-model="edit.oldpass"
            type="password"
            label="旧密码（可选）"
            placeholder="要修改密码请输入"
          />
          <van-field
            v-model="edit.newpass"
            type="password"
            label="新密码（可选）"
            placeholder="新密码"
          />
          <van-field
            v-model="edit.newpass2"
            type="password"
            label="确认密码"
            placeholder="再次输入新密码"
          />
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
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => (show.value = v),
)
watch(show, (v) => emit('update:modelValue', v))

const authStore = useAuthStore()

const edit = ref({
  dispname: authStore.userInfo?.dname || '',
  oldpass: '',
  newpass: '',
  newpass2: '',
})

const onSubmit = async () => {
  if (edit.value.newpass && edit.value.newpass !== edit.value.newpass2) {
    alert('两次输入的密码不一致')
    return
  }

  const success = await authStore.updateUserInfo({
    dispname: edit.value.dispname,
    oldpass: edit.value.oldpass || undefined,
    newpass: edit.value.newpass || undefined,
    newpass2: edit.value.newpass2 || undefined,
  })

  if (success) {
    show.value = false
  }
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
