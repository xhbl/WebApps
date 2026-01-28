<template>
  <div class="login-view">
    <div class="login-container">
      <div class="logo">
        <h1>单词本</h1>
        <p>VnBook</p>
      </div>

      <van-form @submit="onSubmit">
        <van-cell-group inset>
          <van-field
            v-model="formData.uname"
            name="uname"
            label="用户名"
            placeholder="请输入用户名"
            :rules="[{ required: true, message: '请输入用户名' }]"
            autocomplete="username"
          />
          <van-field
            v-model="formData.pass"
            type="password"
            name="pass"
            label="密码"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请输入密码' }]"
            autocomplete="current-password"
          />
        </van-cell-group>

        <div class="remember-me">
          <van-checkbox v-model="formData.remember">记住我</van-checkbox>
        </div>

        <div class="submit-btn">
          <van-button round block type="primary" native-type="submit"> 登录 </van-button>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formData = reactive({
  uname: '',
  pass: '',
  remember: true,
})

const onSubmit = async () => {
  const success = await authStore.login(formData)

  if (success) {
    // 登录成功，管理员跳转到用户管理，普通用户跳转到单词本列表
    const redirect = route.query.redirect as string
    if (redirect) {
      router.push(redirect)
    } else if (authStore.isAdmin) {
      router.push('/users')
    } else {
      router.push('/books')
    }
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.logo {
  text-align: center;
  color: white;
  margin-bottom: 40px;
}

.logo h1 {
  font-size: 36px;
  font-weight: bold;
  margin: 0 0 10px 0;
}

.logo p {
  font-size: 18px;
  margin: 0;
  opacity: 0.9;
}

.remember-me {
  padding: 15px 16px;
}

.submit-btn {
  padding: 15px 16px;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}
</style>
