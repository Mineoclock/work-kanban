<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { GripVertical, Plus, Trash2 } from 'lucide-vue-next'
import { NButton, NInput, useMessage } from 'naive-ui'
import { useKanbanStore } from '../stores/kanban'
import type { Lane, Project, TodoItem } from '../types'

defineProps<{ project: Project }>()
const store = useKanbanStore()
const message = useMessage()
const newTodoText = ref<Record<string, string>>({})
const editingKey = ref('')
const editingText = ref('')
const isDragging = ref(false)
const trashItems = ref<unknown[]>([])
const submittingTodoLanes = new Set<string>()

function startEdit(key: string, text: string) { editingKey.value = key; editingText.value = text; void nextTick(() => document.querySelector<HTMLInputElement>('.inline-editor')?.focus()) }
function cancelEdit() { editingKey.value = ''; editingText.value = '' }
async function finishEdit(save: (value: string) => Promise<void>) { const value = editingText.value.trim(); cancelEdit(); if (value) await save(value) }
function handleEnter(event: KeyboardEvent, action: () => void | Promise<void>) {
  if (event.isComposing || event.keyCode === 229) return
  event.preventDefault()
  void action()
}
function onDragStart() { isDragging.value = true }
function onDragEnd() { void store.persist(); window.setTimeout(() => { isDragging.value = false }, 0) }
function canTrashMove(event: { draggedContext?: { element?: unknown } }) { return Boolean(event.draggedContext?.element) }
function blurButton(event: MouseEvent) {
  const target = event.currentTarget
  if (target instanceof HTMLElement) target.blur()
}
async function handleTrashAdd(event: { item: HTMLElement; newIndex?: number }) {
  const kind = event.item.dataset.dragKind as 'lane' | 'todo' | undefined
  const id = event.item.dataset.dragId
  if (event.newIndex !== undefined) trashItems.value.splice(event.newIndex, 1)
  if (!kind || !id) return
  const deleted = await store.deleteDragged(kind, id)
  if (!deleted) message.warning('只能删除空状态列')
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
</script>

<template>
  <main class="board-wrap">
    <VueDraggable v-model="project.lanes" class="lane-list" group="lanes" item-key="id" handle=".lane-grip" ghost-class="lane-ghost" :animation="180" @start="onDragStart" @end="onDragEnd">
      <section v-for="lane in project.lanes" :key="lane.id" class="lane-panel" data-drag-kind="lane" :data-drag-id="lane.id">
        <header class="lane-header">
          <div class="lane-title-wrap">
            <button class="icon-button lane-grip" title="拖动状态列" aria-label="拖动状态列"><GripVertical :size="16" /></button>
            <input v-if="editingKey === `lane-${lane.id}`" v-model="editingText" class="inline-editor lane-editor" @blur="finishEdit((value) => store.renameLane(lane, value))" @keydown.enter="handleEnter($event, () => finishEdit((value) => store.renameLane(lane, value)))" @keydown.esc.prevent="cancelEdit" />
            <h2 v-else @dblclick="startEdit(`lane-${lane.id}`, lane.name)">{{ lane.name }}</h2>
            <span class="count-badge">{{ lane.todos.length }}</span>
          </div>
        </header>
        <VueDraggable v-model="lane.todos" class="todo-list" :class="{ 'todo-list--empty': lane.todos.length === 0 }" :group="{ name: 'todos', pull: true, put: true }" item-key="id" :animation="180" filter=".inline-editor" :prevent-on-filter="false" ghost-class="todo-ghost" @start="onDragStart" @end="onDragEnd">
          <div v-for="todo in lane.todos" :key="todo.id" class="todo-row" data-drag-kind="todo" :data-drag-id="todo.id">
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
    <VueDraggable v-model="trashItems" class="trash-drop" :class="{ 'trash-drop--visible': isDragging }" item-key="id" :group="{ name: 'trash', pull: false, put: true }" :sort="false" :move="canTrashMove" aria-hidden="true" @add="handleTrashAdd"><Trash2 :size="19" /><span>拖到这里删除</span></VueDraggable>
  </main>
</template>

<style scoped>
.board-wrap { position: relative; display: flex; align-items: stretch; gap: 8px; flex: 1; height: 100vh; min-height: 0; box-sizing: border-box; overflow: auto; padding: 16px; scrollbar-width: none; }
.board-wrap::-webkit-scrollbar { display: none; }
.lane-list { display: flex; align-items: stretch; gap: 8px; min-height: 100%; }
.lane-panel { flex: 0 0 280px; width: 280px; box-sizing: border-box; min-height: calc(100vh - 32px); padding: 0 3px; }
.lane-header, .lane-title-wrap { display: flex; align-items: center; }
.lane-header { justify-content: space-between; gap: 8px; }
.lane-title-wrap { min-width: 0; gap: 7px; }
.lane-header { min-height: 32px; }
.lane-header h2 { margin: 0; cursor: default; font-size: 15px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.count-badge { min-width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; padding: 0 6px; border-radius: 10px; background: var(--muted-bg); color: var(--muted-text); font-size: 11px; }
.icon-button { display: inline-flex; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--muted-text); padding: 3px; border-radius: 5px; }
.lane-grip { cursor: grab !important; }
.lane-grip:active { cursor: grabbing !important; }
.todo-list { min-height: 0; display: flex; flex-direction: column; gap: 8px; padding: 12px 0 8px; }
.todo-list--empty { margin-bottom: 0; }
.todo-row { display: flex; align-items: flex-start; gap: 8px; min-height: 48px; box-sizing: border-box; padding: 12px; border: 1px solid var(--border); border-radius: 5px; background: var(--todo-bg); color: var(--todo-text); box-shadow: 0 1px 2px rgba(0, 0, 0, .025); font-size: 15px; line-height: 1.45; }
.todo-text { flex: 1; cursor: default; word-break: break-word; color: var(--todo-text); }
.lane-ghost, .todo-ghost { opacity: .7; background: transparent; border: 1px dashed var(--border); box-shadow: none; }
.todo-form { margin: 0 0 20px; }
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
.trash-drop { position: fixed; right: 28px; bottom: 24px; z-index: 5; display: block; width: 220px; height: 88px; box-sizing: border-box; flex: 0 0 220px; min-width: 0; min-height: 0; overflow: hidden; white-space: nowrap; padding: 11px 14px; border: 1px dashed var(--trash-border); border-radius: 8px; background: var(--trash-bg); color: var(--trash-text); font-size: 12px; opacity: 0; pointer-events: none; transform: translateY(6px); }
.trash-drop > svg, .trash-drop > span { position: absolute; top: 50%; transform: translateY(-50%); }
.trash-drop > svg { left: calc(50% - 56px); }
.trash-drop > span { left: calc(50% - 28px); }
.trash-drop > [data-drag-kind] { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.trash-drop--visible { opacity: 1; pointer-events: auto; transform: translateY(0); }
</style>
