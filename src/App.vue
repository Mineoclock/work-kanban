<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { darkTheme, NConfigProvider, NDialogProvider, NMessageProvider, NSpin } from 'naive-ui'
import BoardView from './components/BoardView.vue'
import FileSetupView from './components/FileSetupView.vue'
import { useKanbanStore } from './stores/kanban'

const store = useKanbanStore()
const isDark = shallowRef(false)
const themeOverrides = {
  common: { primaryColor: '#2f2f2f', primaryColorHover: '#2f2f2f', primaryColorPressed: '#1f1f1f', borderRadius: '7px' },
  Button: {
    colorHover: 'var(--n-color)',
    colorSecondaryHover: 'var(--n-color)',
    colorTertiaryHover: 'var(--n-color)',
    colorQuaternaryHover: 'var(--n-color)',
    colorHoverPrimary: 'var(--n-color)',
    colorHoverInfo: 'var(--n-color)',
    colorHoverSuccess: 'var(--n-color)',
    colorHoverWarning: 'var(--n-color)',
    colorHoverError: 'var(--n-color)',
    textColorHover: 'var(--n-text-color)',
    textColorTextHover: 'var(--n-text-color)',
    textColorGhostHover: 'var(--n-text-color)',
    textColorHoverPrimary: 'var(--n-text-color)',
    textColorHoverInfo: 'var(--n-text-color)',
    textColorHoverSuccess: 'var(--n-text-color)',
    textColorHoverWarning: 'var(--n-text-color)',
    textColorHoverError: 'var(--n-text-color)',
    textColorTextHoverPrimary: 'var(--n-text-color)',
    textColorTextHoverInfo: 'var(--n-text-color)',
    textColorTextHoverSuccess: 'var(--n-text-color)',
    textColorTextHoverWarning: 'var(--n-text-color)',
    textColorTextHoverError: 'var(--n-text-color)',
    textColorGhostHoverPrimary: 'var(--n-text-color)',
    textColorGhostHoverInfo: 'var(--n-text-color)',
    textColorGhostHoverSuccess: 'var(--n-text-color)',
    textColorGhostHoverWarning: 'var(--n-text-color)',
    textColorGhostHoverError: 'var(--n-text-color)',
    borderHover: 'var(--n-border)',
    borderHoverPrimary: 'var(--n-border)',
    borderHoverInfo: 'var(--n-border)',
    borderHoverSuccess: 'var(--n-border)',
    borderHoverWarning: 'var(--n-border)',
    borderHoverError: 'var(--n-border)'
  }
}
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')

function syncSystemTheme() {
  isDark.value = systemTheme.matches
  document.documentElement.classList.toggle('dark', systemTheme.matches)
}
onMounted(() => {
  void store.hydrate()
  syncSystemTheme()
  systemTheme.addEventListener('change', syncSystemTheme)
})
onBeforeUnmount(() => systemTheme.removeEventListener('change', syncSystemTheme))

async function openFile() {
  try { await store.openFile() } catch (error) { window.alert(error instanceof Error ? error.message : '打开看板文件失败') }
}
async function restoreSavedFile() {
  try { await store.restoreSavedFile() } catch (error) { window.alert(error instanceof Error ? error.message : '打开看板文件失败') }
}
async function createFile() {
  try { await store.createFile() } catch (error) { window.alert(error instanceof Error ? error.message : '创建看板文件失败') }
}
</script>

<template>
  <NConfigProvider abstract :theme="isDark ? darkTheme : null" :theme-overrides="themeOverrides">
    <NMessageProvider><NDialogProvider>
      <div v-if="store.hydrated" class="app-shell">
        <BoardView v-if="store.currentProject" :project="store.currentProject" />
        <FileSetupView v-else :state="store.fileState === 'loading' || store.fileState === 'ready' ? 'error' : store.fileState" :file-name="store.fileName" :error="store.fileError" @restore="restoreSavedFile" @open="openFile" @create="createFile" />
      </div>
      <div v-else class="loading"><NSpin size="large" /></div>
    </NDialogProvider></NMessageProvider>
  </NConfigProvider>
</template>

<style>
:root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #2f2f2f; background: #f7f7f8; font-synthesis: none; }
:root, body, #app { height: 100%; margin: 0; overflow: hidden; }
:root { --text: #2f2f2f; --todo-text: #2f2f2f; --muted-text: #8e8ea0; --border: #e5e5e5; --lane-bg: transparent; --box-bg: #ffffff; --todo-bg: #fafafa; --muted-bg: #e9e9eb; --accent: #737373; --accent-soft: #e5e5e5; --shadow: 0 2px 10px rgba(0, 0, 0, .035); --trash-border: #d8c0b7; --trash-bg: #fbf4f1; --trash-text: #9c634f; }
.app-shell { height: 100%; display: flex; flex-direction: column; background: var(--body-bg, #f7f8fa); color: var(--text); }
:root.dark { color-scheme: dark; --text: #ececec; --todo-text: #ffffff; --muted-text: #a0a0a0; --border: #3d3d3d; --lane-bg: transparent; --box-bg: #242424; --todo-bg: #1c1c1c; --muted-bg: #3a3a3a; --accent: #d4d4d4; --accent-soft: #3a3a3a; --shadow: 0 2px 12px rgba(0, 0, 0, .18); --body-bg: #000000; --trash-border: #765649; --trash-bg: #3a2a25; --trash-text: #e39574; }
.loading { min-height: 100vh; display: grid; place-items: center; background: #f7f7f8; }
input { cursor: text !important; }
</style>
