import { defineStore } from 'pinia'
import { db, type ProjectRecord } from '../db'
import {
  createId,
  type Lane,
  type Project,
  type TodoItem
} from '../types'
import {
  chooseBoardFile,
  createBoardFile,
  defaultBoardProject,
  readBoardFile,
  supportsLocalFileStorage,
  writeBoardFile
} from '../fileStorage'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

let activeFileHandle: FileSystemFileHandle | null = null
let pendingProject: Project | null = null
let writeQueue: Promise<void> = Promise.resolve()

type PermissionAwareFileHandle = FileSystemFileHandle & {
  queryPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(options: { mode: 'readwrite' }): Promise<PermissionState>
}

function queueProjectWrite(handle: FileSystemFileHandle, project: Project): Promise<void> {
  const snapshot = clone(project)
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    await writeBoardFile(handle, snapshot)
  })
  return writeQueue
}

export const useKanbanStore = defineStore('kanban', {
  state: () => ({
    project: null as Project | null,
    hydrated: false,
    fileState: 'loading' as 'loading' | 'needs-file' | 'needs-permission' | 'unsupported' | 'ready' | 'error',
    fileName: '',
    fileError: ''
  }),
  getters: {
    currentProject: (state) => state.project
  },
  actions: {
    async hydrate() {
      const records = await db.projects.toArray()
      const latestRecord = records.reduce<ProjectRecord | null>(
        (latest, record) => (!latest || record.updatedAt > latest.updatedAt ? record : latest),
        null
      )
      if (latestRecord) {
        const { updatedAt: _updatedAt, ...project } = latestRecord
        pendingProject = project
      }

      if (!supportsLocalFileStorage()) {
        this.fileState = 'unsupported'
        this.hydrated = true
        return
      }

      const savedHandle = await db.fileHandles.get('board-file')
      if (!savedHandle) {
        this.fileState = 'needs-file'
        this.hydrated = true
        return
      }

      activeFileHandle = savedHandle.handle
      this.fileName = activeFileHandle.name
      const permission = await (activeFileHandle as PermissionAwareFileHandle).queryPermission({ mode: 'readwrite' })
      if (permission !== 'granted') {
        this.fileState = 'needs-permission'
        this.hydrated = true
        return
      }

      try {
        const project = await readBoardFile(activeFileHandle)
        if (!project) throw new Error('看板文件为空，请重新选择文件或新建文件')
        this.project = project
        this.fileState = 'ready'
      } catch (error) {
        this.fileError = error instanceof Error ? error.message : '读取看板文件失败'
        this.fileState = 'error'
      }
      this.hydrated = true
    },
    async persist() {
      if (!this.project || !activeFileHandle) throw new Error('请先选择本地看板文件')
      try {
        await queueProjectWrite(activeFileHandle, this.project)
      } catch (error) {
        this.fileError = error instanceof Error ? error.message : '保存看板文件失败'
        throw error
      }
    },
    async openFile() {
      const handle = await chooseBoardFile()
      const project = await readBoardFile(handle)
      if (!project) throw new Error('看板文件为空，请使用“新建看板文件”创建它')
      activeFileHandle = handle
      this.project = project
      this.fileName = handle.name
      await db.fileHandles.put({ key: 'board-file', handle })
      this.fileError = ''
      this.fileState = 'ready'
    },
    async restoreSavedFile() {
      if (!activeFileHandle) {
        const savedHandle = await db.fileHandles.get('board-file')
        if (!savedHandle) throw new Error('没有已保存的看板文件')
        activeFileHandle = savedHandle.handle
      }
      const handle = activeFileHandle as PermissionAwareFileHandle
      const permission = await handle.requestPermission({ mode: 'readwrite' })
      if (permission !== 'granted') throw new Error('需要授予文件读写权限才能打开看板')

      const project = await readBoardFile(handle)
      if (!project) throw new Error('看板文件为空，请选择其他文件或新建看板文件')
      this.project = project
      this.fileName = handle.name
      this.fileError = ''
      this.fileState = 'ready'
    },
    async createFile() {
      const handle = await createBoardFile()
      activeFileHandle = handle
      this.project = pendingProject ?? defaultBoardProject()
      this.fileName = handle.name
      await this.persist()
      await db.fileHandles.put({ key: 'board-file', handle })
      pendingProject = null
      this.fileError = ''
      this.fileState = 'ready'
    },
    async addLane() {
      if (!this.currentProject) return
      this.currentProject.lanes.push({ id: createId('lane'), name: '新状态列', todos: [] })
      await this.persist()
    },
    async renameLane(lane: Lane, name: string) {
      if (!name.trim()) return
      lane.name = name.trim()
      await this.persist()
    },
    async deleteLane(laneId: string): Promise<boolean> {
      const project = this.currentProject
      const lane = project?.lanes.find((item) => item.id === laneId)
      if (!project || !lane || lane.todos.length > 0) return false
      project.lanes = project.lanes.filter((item) => item.id !== laneId)
      await this.persist()
      return true
    },
    async addTodo(box: Lane, text: string) {
      if (!text.trim()) return
      box.todos.push({ id: createId('todo'), text: text.trim() })
      await this.persist()
    },
    async renameTodo(todo: TodoItem, text: string) {
      if (!text.trim()) return
      todo.text = text.trim()
      await this.persist()
    },
    async deleteDragged(kind: 'lane' | 'todo', id: string): Promise<boolean> {
      const project = this.currentProject
      if (!project) return false
      if (kind === 'lane') {
        const lane = project.lanes.find((item) => item.id === id)
        if (!lane || lane.todos.length > 0) return false
        project.lanes = project.lanes.filter((item) => item.id !== id)
      } else {
        for (const lane of project.lanes) {
          if (kind === 'todo' && lane.todos.some((todo) => todo.id === id)) {
            lane.todos = lane.todos.filter((todo) => todo.id !== id)
            await this.persist()
            return true
          }
        }
        return false
      }
      await this.persist()
      return true
    }
  }
})
