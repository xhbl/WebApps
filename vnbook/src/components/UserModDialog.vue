<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '70%' }">
    <div class="editor">
      <h3>当前用户</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <van-field v-model="edit.uname" label="用户名" readonly class="readonly-field" />
          <van-field v-model="edit.dispname" label="显示名" placeholder="留空则显示用户名" />
          <van-field
            v-model="edit.oldpass"
            type="password"
            label="旧密码"
            placeholder="留空则保持不变"
          />
          <van-field
            v-model="edit.newpass"
            type="password"
            label="新密码"
            placeholder="留空则保持不变"
          />
          <van-field
            v-model="edit.newpass2"
            type="password"
            label="确认密码"
            placeholder="留空则保持不变"
          />
        </van-cell-group>

        <div class="actions">
          <van-button round type="primary" native-type="submit">保存</van-button>
          <van-button round @click="onCancel">取消</van-button>
        </div>
      </van-form>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => {
    show.value = v
    if (v) {
      // 每次打开弹窗时重置表单数据，确保显示最新信息并清空密码框
      edit.value.uname = authStore.userInfo?.uname || ''
      edit.value.dispname = authStore.userInfo?.dname || ''
      edit.value.oldpass = ''
      edit.value.newpass = ''
      edit.value.newpass2 = ''
    }
  },
)
watch(show, (v) => emit('update:modelValue', v))

const authStore = useAuthStore()

const edit = ref({
  uname: authStore.userInfo?.uname || '',
  dispname: authStore.userInfo?.dname || '',
  oldpass: '',
  newpass: '',
  newpass2: '',
})

const onSubmit = async () => {
  // 判断是否要修改密码：三项都为空表示不修改
  const hasPassword = edit.value.oldpass || edit.value.newpass || edit.value.newpass2

  if (hasPassword) {
    // 需要校验密码
    if (!edit.value.oldpass) {
      showToast('请输入旧密码')
      return
    }
    if (!edit.value.newpass) {
      showToast('请输入新密码')
      return
    }
    if (edit.value.newpass !== edit.value.newpass2) {
      showToast('两次输入的新密码不一致')
      return
    }
  }

  const success = await authStore.updateUserInfo({
    dispname: edit.value.dispname?.trim(), // 保存前去除首尾空格
    oldpass: hasPassword ? edit.value.oldpass : undefined,
    newpass: hasPassword ? edit.value.newpass : undefined,
    newpass2: hasPassword ? edit.value.newpass2 : undefined,
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
  padding: 20px 16px; /* 适当的边距 */
  display: flex;
  gap: 12px;
  justify-content: center;
}

.actions .van-button {
  /* 这样设置可以让按钮在一定范围内自适应，但不会无限拉长 */
  min-width: 100px;
  max-width: 120px;
  flex: 1;
}

:deep(.van-field__label) {
  font-weight: bold;
}

:deep(.readonly-field .van-field__value) {
  color: var(--van-text-color-2) !important;
}

:deep(.readonly-field input) {
  color: var(--van-text-color-2) !important;
}
</style>
