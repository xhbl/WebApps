/**
 * Application information constants
 */

export const APP_NAME = '单词记录本'

export const APP_COPYRIGHT = '著左权所有 (C) 2026 XHBL'

export function getAppVersion(): string {
  return import.meta.env.VITE_APP_VERSION || '2.1'
}

export function getAppAboutText(): string {
  return `${APP_NAME} 网页应用程序 v${getAppVersion()}\n${APP_COPYRIGHT}`
}
