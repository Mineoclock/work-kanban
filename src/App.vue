<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { darkTheme, NConfigProvider, NDialogProvider, NLayout, NMessageProvider, NSpin } from 'naive-ui'
import BoardView from './components/BoardView.vue'
import FileSetupView from './components/FileSetupView.vue'
import { useKanbanStore } from './stores/kanban'

const store = useKanbanStore()
const isDark = shallowRef(false)
const themeOverrides = { common: { primaryColor: '#2f2f2f', primaryColorHover: '#2f2f2f', primaryColorPressed: '#1f1f1f', borderRadius: '7px' } }
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')

function syncSystemTheme() { isDark.value = systemTheme.matches }
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
  <NConfigProvider :theme="isDark ? darkTheme : null" :theme-overrides="themeOverrides">
    <NMessageProvider><NDialogProvider>
      <NLayout v-if="store.hydrated" class="app-shell" :class="{ dark: isDark }">
        <BoardView v-if="store.currentProject" :project="store.currentProject" />
        <FileSetupView v-else :state="store.fileState === 'loading' || store.fileState === 'ready' ? 'error' : store.fileState" :file-name="store.fileName" :error="store.fileError" @restore="restoreSavedFile" @open="openFile" @create="createFile" />
      </NLayout>
      <div v-else class="loading"><NSpin size="large" /></div>
    </NDialogProvider></NMessageProvider>
  </NConfigProvider>
</template>

<style>
:root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #2f2f2f; background: #f7f7f8; font-synthesis: none; }
:root, body, #app { height: 100%; margin: 0; overflow: hidden; }
:root { --text: #2f2f2f; --todo-text: #2f2f2f; --muted-text: #8e8ea0; --border: #e5e5e5; --lane-bg: transparent; --box-bg: #ffffff; --todo-bg: #fafafa; --muted-bg: #e9e9eb; --accent: #737373; --accent-soft: #e5e5e5; --shadow: 0 2px 10px rgba(0, 0, 0, .035); --trash-border: #d8c0b7; --trash-bg: #fbf4f1; --trash-text: #9c634f; }
.app-shell { min-height: 100vh; background: var(--body-bg, #f7f8fa); color: var(--text); }
.app-shell.dark { color-scheme: dark; --text: #ececec; --todo-text: #ffffff; --muted-text: #a0a0a0; --border: #3d3d3d; --lane-bg: transparent; --box-bg: #242424; --todo-bg: #1c1c1c; --muted-bg: #3a3a3a; --accent: #d4d4d4; --accent-soft: #3a3a3a; --shadow: 0 2px 12px rgba(0, 0, 0, .18); --body-bg: #000000; --trash-border: #765649; --trash-bg: #3a2a25; --trash-text: #e39574; }
.loading { min-height: 100vh; display: grid; place-items: center; background: #f7f7f8; }
button, .n-button, .n-select { cursor: pointer !important; }
input { cursor: text !important; }
.n-button { --n-color-hover: var(--n-color) !important; --n-text-color-hover: var(--n-text-color) !important; --n-border-hover: var(--n-border) !important; }
* { scrollbar-width: none; }
*::-webkit-scrollbar { display: none; }
</style>
