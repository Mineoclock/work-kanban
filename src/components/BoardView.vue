<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { GripVertical, Plus, Trash2 } from 'lucide-vue-next'
import { NButton, NInput, useDialog } from 'naive-ui'
import { useKanbanStore } from '../stores/kanban'
import type { Lane, Project, TodoItem } from '../types'

defineProps<{ project: Project }>()
const store = useKanbanStore()
const dialog = useDialog()
const newTodoText = ref<Record<string, string>>({})
const editingKey = ref('')
const editingText = ref('')
const submittingTodoLanes = new Set<string>()

function startEdit(key: string, text: string) { editingKey.value = key; editingText.value = text; void nextTick(() => document.querySelector<HTMLInputElement>('.inline-editor')?.focus()) }
function cancelEdit() { editingKey.value = ''; editingText.value = '' }
async function finishEdit(save: (value: string) => Promise<void>) { const value = editingText.value.trim(); cancelEdit(); if (value) await save(value) }
function handleEnter(event: KeyboardEvent, action: () => void | Promise<void>) {
  if (event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  void action()
}
function onDragEnd() { void store.persist() }
function blurButton(event: MouseEvent) {
  const target = event.currentTarget
  if (target instanceof HTMLElement) target.blur()
}
async function addTodo(lane: Lane) {
  if (submittingTodoLanes.has(lane.id)) return
  const text = (newTodoText.value[lane.id] ?? '').trim()
  if (!text) return

  submittingTodoLanes.add(lane.id)
  try {
    await store.addTodo(lane, text)
    newTodoText.value[lane.id] = ''
  } finally {
    submittingTodoLanes.delete(lane.id)
  }
}
async function addLane() {
  await store.addLane()
  window.requestAnimationFrame(() => (document.activeElement as HTMLElement | null)?.blur())
}

interface ContextMenuState {
  x: number
  y: number
  kind: 'lane' | 'todo'
  lane: Lane
  todo?: TodoItem
}
const ctxMenu = ref<ContextMenuState | null>(null)
const ctxMenuEl = ref<HTMLElement | null>(null)

function openContextMenu(event: MouseEvent, kind: 'lane' | 'todo', lane: Lane, todo?: TodoItem) {
  event.preventDefault()
  if (kind === 'todo' && todo && editingKey.value === `todo-${todo.id}`) return
  if (kind === 'lane' && editingKey.value === `lane-${lane.id}`) return
  const x = Math.min(Math.max(event.clientX, 8), window.innerWidth - 176)
  const y = Math.min(Math.max(event.clientY, 8), window.innerHeight - 52)
  ctxMenu.value = { x, y, kind, lane, todo }
  window.addEventListener('click', onWindowMenuClick, true)
  window.addEventListener('contextmenu', onWindowMenuContext, true)
  window.addEventListener('wheel', closeContextMenu, { capture: true, passive: true })
  window.addEventListener('keydown', onWindowMenuKey, true)
}
function isInsideMenu(target: EventTarget | null): boolean {
  return Boolean(ctxMenuEl.value && target instanceof Node && ctxMenuEl.value.contains(target))
}
function onWindowMenuClick(event: MouseEvent) { if (!isInsideMenu(event.target)) closeContextMenu() }
function onWindowMenuContext(event: MouseEvent) { if (!isInsideMenu(event.target)) closeContextMenu() }
function onWindowMenuKey(event: KeyboardEvent) { if (event.key === 'Escape') closeContextMenu() }
function closeContextMenu() {
  if (!ctxMenu.value) return
  ctxMenu.value = null
  window.removeEventListener('click', onWindowMenuClick, true)
  window.removeEventListener('contextmenu', onWindowMenuContext, true)
  window.removeEventListener('wheel', closeContextMenu, { capture: true } as EventListenerOptions)
  window.removeEventListener('keydown', onWindowMenuKey, true)
}
onBeforeUnmount(closeContextMenu)

function truncateLabel(text: string): string {
  return text.length > 20 ? `${text.slice(0, 20)}…` : text
}
function requestDelete() {
  const target = ctxMenu.value
  closeContextMenu()
  if (!target) return
  if (target.kind === 'lane') {
    if (target.lane.todos.length === 0) {
      void store.deleteLane(target.lane.id)
      return
    }
    const lane = target.lane
    dialog.error({
      title: '删除状态列',
      content: `确定删除状态列「${truncateLabel(lane.name)}」及其 ${lane.todos.length} 条 Todo 吗？此操作无法撤销。`,
      positiveText: '删除',
      showIcon: false,
      onPositiveClick: () => store.deleteLane(lane.id)
    })
    return
  }
  const todo = target.todo!
  dialog.error({
    title: '删除 Todo',
    content: `确定删除「${truncateLabel(todo.text)}」吗？此操作无法撤销。`,
    positiveText: '删除',
    showIcon: false,
    onPositiveClick: () => store.deleteTodo(todo.id)
  })
}
</script>

<template>
  <main class="board-wrap">
    <VueDraggable v-model="project.lanes" class="lane-list" group="lanes" item-key="id" handle=".lane-grip" ghost-class="lane-ghost" :animation="180" @end="onDragEnd">
      <section v-for="lane in project.lanes" :key="lane.id" class="lane-panel">
        <header class="lane-header" @contextmenu="openContextMenu($event, 'lane', lane)">
          <div class="lane-title-wrap">
            <button class="icon-button lane-grip" title="拖动状态列" aria-label="拖动状态列"><GripVertical :size="16" /></button>
            <input v-if="editingKey === `lane-${lane.id}`" v-model="editingText" class="inline-editor lane-editor" @blur="finishEdit((value) => store.renameLane(lane, value))" @keydown.enter="handleEnter($event, () => finishEdit((value) => store.renameLane(lane, value)))" @keydown.esc.prevent="cancelEdit" />
            <h2 v-else @dblclick="startEdit(`lane-${lane.id}`, lane.name)">{{ lane.name }}</h2>
            <span class="count-badge">{{ lane.todos.length }}</span>
          </div>
        </header>
        <VueDraggable v-model="lane.todos" class="todo-list" :class="{ 'todo-list--empty': lane.todos.length === 0 }" :group="{ name: 'todos', pull: true, put: true }" item-key="id" :animation="180" filter=".inline-editor" :prevent-on-filter="false" ghost-class="todo-ghost" @end="onDragEnd">
          <div v-for="todo in lane.todos" :key="todo.id" class="todo-row" @contextmenu="openContextMenu($event, 'todo', lane, todo)">
            <input v-if="editingKey === `todo-${todo.id}`" v-model="editingText" class="inline-editor todo-editor" @blur="finishEdit((value) => store.renameTodo(todo, value))" @keydown.enter="handleEnter($event, () => finishEdit((value) => store.renameTodo(todo, value)))" @keydown.esc.prevent="cancelEdit" />
            <span v-else class="todo-text" @dblclick="startEdit(`todo-${todo.id}`, todo.text)">{{ todo.text }}</span>
          </div>
        </VueDraggable>
        <form class="todo-form" @submit.prevent="addTodo(lane)">
          <NInput v-model:value="newTodoText[lane.id]" size="small" placeholder="添加 Todo" maxlength="200" @blur="addTodo(lane)" @keydown.enter="handleEnter($event, () => addTodo(lane))"><template #prefix><Plus :size="15" /></template></NInput>
        </form>
      </section>
    </VueDraggable>
    <div class="page-actions" aria-label="看板操作">
      <NButton quaternary @mousedown="blurButton" @click="addLane"><template #icon><Plus :size="16" /></template>新状态列</NButton>
    </div>
    <Teleport to="body">
      <div v-if="ctxMenu" ref="ctxMenuEl" class="ctx-menu" :style="{ left: `${ctxMenu.x}px`, top: `${ctxMenu.y}px` }" @click.stop @contextmenu.prevent.stop>
        <button class="ctx-item ctx-item--danger" @click="requestDelete">
          <Trash2 :size="15" />
          <span>{{ ctxMenu.kind === 'lane' ? '删除状态列' : '删除 Todo' }}</span>
        </button>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.board-wrap { position: relative; display: flex; align-items: stretch; gap: 8px; flex: 1; min-height: 0; box-sizing: border-box; overflow-x: auto; overflow-y: hidden; padding: 16px 16px 0; scrollbar-color: var(--border) transparent; }
.board-wrap::-webkit-scrollbar { height: 8px; background: transparent; }
.board-wrap::-webkit-scrollbar-track { background: transparent; }
.board-wrap::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
.board-wrap::-webkit-scrollbar-thumb:hover { background: var(--accent); }
.lane-list { display: flex; align-items: stretch; gap: 8px; height: 100%; }
.lane-panel { flex: 0 0 280px; width: 280px; height: 100%; box-sizing: border-box; padding: 0 3px; display: flex; flex-direction: column; min-height: 0; overflow-y: auto; scrollbar-width: none; }
.lane-panel::-webkit-scrollbar { display: none; }
.lane-header, .lane-title-wrap { display: flex; align-items: center; }
.lane-header { justify-content: space-between; gap: 8px; }
.lane-title-wrap { min-width: 0; gap: 7px; }
.lane-header { min-height: 32px; flex-shrink: 0; }
.lane-header h2 { margin: 0; cursor: default; font-size: 15px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.count-badge { min-width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; padding: 0 6px; border-radius: 10px; background: var(--muted-bg); color: var(--muted-text); font-size: 11px; }
.icon-button { display: inline-flex; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--muted-text); padding: 3px; border-radius: 5px; }
.lane-grip { cursor: grab !important; }
.lane-grip:active { cursor: grabbing !important; }
.todo-list { display: flex; flex-direction: column; gap: 8px; padding: 12px 0 8px; }
.todo-list--empty { padding: 12px 0 0; }
.todo-row { display: flex; align-items: flex-start; gap: 8px; min-height: 48px; box-sizing: border-box; padding: 12px; border: 1px solid var(--border); border-radius: 5px; background: var(--todo-bg); color: var(--todo-text); box-shadow: 0 1px 2px rgba(0, 0, 0, .025); font-size: 15px; line-height: 1.45; }
.todo-text { flex: 1; cursor: default; word-break: break-word; color: var(--todo-text); }
.lane-ghost, .todo-ghost { opacity: .7; background: transparent; border: 1px dashed var(--border); box-shadow: none; }
.todo-form { margin: 0; }
.todo-form :deep(.n-input) { width: 100%; height: 48px; box-sizing: border-box; background: var(--todo-bg); border: 1px solid var(--border); border-radius: 5px; }
.todo-form :deep(.n-input__border), .todo-form :deep(.n-input__state-border) { display: none; }
.todo-form :deep(.n-input__content) { height: 100%; padding: 0 12px; }
.todo-form :deep(.n-input--focus) { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
.todo-form :deep(.n-input__input-el) { min-height: 46px; padding: 0; font-size: 15px; }
.todo-form :deep(.n-input__input-el) { color: var(--text) !important; caret-color: var(--accent); }
.todo-form :deep(.n-input__placeholder) { color: var(--muted-text) !important; }
.inline-editor { min-width: 0; max-width: 100%; cursor: text; border: 0; outline: 0; border-bottom: 1px solid var(--accent); background: transparent; color: var(--text); font: inherit; padding: 1px 0; }
.lane-editor { width: 130px; font-size: 15px; font-weight: 650; }
.todo-editor { flex: 1; font-size: 15px; }
.page-actions { align-self: flex-start; flex: 0 0 auto; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.page-actions :deep(.n-button) { height: 32px; }
.ctx-menu { position: fixed; z-index: 3000; min-width: 156px; box-sizing: border-box; padding: 4px; border: 1px solid var(--border); border-radius: 8px; background: var(--box-bg); box-shadow: 0 8px 24px rgba(0, 0, 0, .14); }
.ctx-item { display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; padding: 8px 10px; border: 0; border-radius: 6px; background: transparent; color: var(--text); font: inherit; font-size: 14px; line-height: 1.2; text-align: left; }
.ctx-item--danger:hover { background: var(--trash-bg); color: var(--trash-text); }
</style>
