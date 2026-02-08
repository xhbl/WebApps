<template>
  <van-popup v-model:show="show" round position="bottom" :style="{ height: '70%' }">
    <div class="editor">
      <h3>{{ isNew ? '新建用户' : '编辑用户' }}</h3>
      <van-form @submit="onSubmit">
        <van-cell-group>
          <van-field
            v-model="edit.name"
            label="用户名"
            placeholder="限字母数字和._@"
            :rules="[
              { required: true, message: '请输入用户名' },
              { pattern: /^[\w.@]+$/, message: '用户名格式不正确' },
            ]"
            :readonly="!isNew"
            :class="{ 'readonly-field': !isNew }"
          />
          <van-field v-model="edit.dispname" label="显示名" placeholder="留空则显示用户名" />
          <van-field
            v-model="password"
            type="password"
            label="密码"
            :placeholder="isNew ? '请输入密码' : '留空则保持不变'"
            :rules="isNew ? [{ required: true, message: '请输入密码' }] : []"
          />
          <van-field
            v-model="passwordConfirm"
            type="password"
            label="确认密码"
            :placeholder="isNew ? '请再次输入密码' : '留空则保持不变'"
            :rules="isNew ? [{ required: true, message: '请再次输入密码' }] : []"
          />
        </van-cell-group>

        <div class="actions">
          <van-button round type="primary" native-type="submit" :loading="loading">保存</van-button>
          <van-button round @click="onCancel">取消</van-button>
          <van-button v-if="!isNew" round type="danger" @click="onDelete">删除</van-button>
        </div>
      </van-form>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { showToast } from 'vant'
import { useUsersStore } from '@/stores/users'
import { useSubmitLoading } from '@/utils/toast'
import type { User } from '@/types'

const props = defineProps<{
  modelValue: boolean
  user?: User | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'delete', user: User): void
}>()

const show = ref(props.modelValue)
watch(
  () => props.modelValue,
  (v) => {
    show.value = v
    if (v) {
      // 每次打开时初始化数据，解决数据残留和重置问题
      password.value = ''
      passwordConfirm.value = ''
      if (props.user) {
        edit.value = {
          id: props.user.id,
          name: props.user.name,
          dispname: props.user.dispname,
          time_c: props.user.time_c,
          _new: props.user._new ?? 1,
        }
      } else {
        edit.value = { id: 0, name: '', dispname: '', time_c: '', _new: 1 }
      }
    }
  },
)

const isNew = computed(() => !props.user || props.user._new === 1)
const password = ref('')
const passwordConfirm = ref('')
const edit = ref<User>({
  id: 0,
  name: '',
  dispname: '',
  time_c: '',
  _new: 1,
})

watch(show, (v) => emit('update:modelValue', v))

const usersStore = useUsersStore()

const { loading, withLoading } = useSubmitLoading()

const onSubmit = async () => {
  // 检查密码是否一致：如果其中一个有值，两个都必须有值且相同
  if (password.value || passwordConfirm.value) {
    if (password.value !== passwordConfirm.value) {
      showToast('两次输入的密码不一致')
      return
    }
  }

  await withLoading(async () => {
    const u: User = { ...edit.value }
    if (u.dispname) {
      u.dispname = u.dispname.trim()
    }
    if (password.value) {
      u.pass = password.value
    }

    const success = await usersStore.saveUser(u)
    if (success) {
      show.value = false
    }
  })
}

const onCancel = () => (show.value = false)

const onDelete = () => {
  emit('delete', edit.value)
  show.value = false
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
