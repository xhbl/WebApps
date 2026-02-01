<template>
  <div class="login-view">
    <div class="login-container">
      <div class="logo">
        <h1 class="logo-title">
          <img class="logo-icon" src="/resources/icons/favicon-96.png" alt="单词本" />
          <span>单词本</span>
        </h1>
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
          <van-field label="保持登录">
            <template #input>
              <van-checkbox v-model="formData.remember" />
            </template>
          </van-field>
        </van-cell-group>

        <div class="submit-btn">
          <van-button round block type="primary" native-type="submit" :loading="loading">
            登录
          </van-button>
        </div>

        <div class="footer-info">
          <p>单词记录本 网页应用程序 v2.1</p>
          <p>著左权所有 (C) 2026 XHBL</p>
          <p class="apply-link">
            <a
              href="mailto:newxhbl@hotmail.com?subject=申请单词本帐号&body=请提供你的用户名和初始密码: "
              >申请账号</a
            >
          </p>
        </div>
      </van-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
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

const loading = ref(false)

const onSubmit = async () => {
  if (loading.value) return // 防止重复提交

  loading.value = true
  try {
    const success = await authStore.login(formData)

    if (success) {
      // 登录成功，管理员跳转到用户管理，普通用户跳转到单词本列表
      const redirect = route.query.redirect as string

      // 修正：如果是管理员，且重定向是首页或单词本列表（通常是默认路由产生的），则优先跳转到用户管理
      if (authStore.isAdmin && (!redirect || redirect === '/' || redirect === '/books')) {
        router.push('/users')
      } else if (redirect) {
        router.push(redirect)
      } else {
        router.push('/books')
      }
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: rgb(238, 235, 238);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 400px;
  margin-top: 4vh;
  transition: margin-top 0.3s ease;
}

.logo {
  text-align: center;
  color: #323233;
  margin-bottom: 12px;
}

.logo h1 {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 10px 0;
}

.logo-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.logo p {
  font-size: 18px;
  margin: 0;
  opacity: 0.9;
}

.submit-btn {
  padding: 15px 16px;
}

:deep(.van-cell-group--inset) {
  margin: 0;
}

:deep(.van-field__label) {
  font-weight: bold;
}

.footer-info {
  text-align: center;
  font-size: var(--van-font-size-sm);
  color: rgb(128, 128, 128);
  margin-top: 10px;
  padding: 0 16px;
}

.footer-info p {
  margin: 1px 0;
  line-height: 1.2;
}

.apply-link {
  margin-top: 10px !important;
}

.apply-link {
  font-size: var(--van-font-size-xs);
}

.apply-link a:hover {
  text-decoration: underline;
}
</style>
