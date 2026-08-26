<script setup lang="ts">
import { FilePlus2, FolderOpen } from 'lucide-vue-next'
import { NButton } from 'naive-ui'

const props = defineProps<{
  state: 'needs-file' | 'needs-permission' | 'unsupported' | 'error'
  fileName: string
  error: string
}>()

const emit = defineEmits<{ restore: []; open: []; create: [] }>()
</script>

<template>
  <main class="file-setup">
    <section class="file-card">
      <template v-if="props.state === 'unsupported'">
        <h1 class="file-title">需要支持本地文件的浏览器</h1>
        <p class="file-copy">请使用 Chrome 或 Edge 打开并安装此 PWA，才能直接读取和保存本地看板文件。</p>
      </template>
      <template v-else>
        <h1 class="file-title">选择本地看板文件</h1>
        <p class="file-copy">
          <template v-if="props.state === 'needs-permission'">“{{ props.fileName }}”需要重新授予读写权限。</template>
          <template v-else-if="props.state === 'error'">{{ props.error }}</template>
          <template v-else>看板会直接保存到你选择的 JSON 文件中。</template>
        </p>
        <div class="file-actions">
          <NButton v-if="props.state === 'needs-permission'" class="file-action" @click="emit('restore')"><template #icon><FolderOpen :size="16" /></template>继续打开</NButton>
          <NButton class="file-action" @click="emit('open')"><template #icon><FolderOpen :size="16" /></template>{{ props.state === 'needs-permission' ? '选择其他文件' : '选择看板文件' }}</NButton>
          <NButton v-if="props.state !== 'needs-permission'" class="file-action" @click="emit('create')"><template #icon><FilePlus2 :size="16" /></template>新建看板文件</NButton>
        </div>
      </template>
    </section>
  </main>
</template>

<style scoped>
.file-setup { min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; }
.file-card { width: min(420px, 100%); padding: 28px; box-sizing: border-box; border: 1px solid var(--border); border-radius: 10px; background: var(--box-bg); box-shadow: var(--shadow); }
.file-title { margin: 0 0 10px; font-size: 20px; }
.file-copy { margin: 0; color: var(--muted-text); font-size: 14px; line-height: 1.65; }
.file-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
.file-action { cursor: pointer !important; font-weight: 600; transition: transform .15s ease, box-shadow .15s ease; }
.file-action:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0, 0, 0, .12); }
</style>
