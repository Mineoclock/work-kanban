import Dexie, { type Table } from 'dexie'
import type { Project } from './types'

export interface ProjectRecord extends Project {
  updatedAt: number
}

export interface FileHandleRecord {
  key: 'board-file'
  handle: FileSystemFileHandle
}

class KanbanDatabase extends Dexie {
  projects!: Table<ProjectRecord, string>
  fileHandles!: Table<FileHandleRecord, 'board-file'>

  constructor() {
    super('local-kanban')
    // This migration only adds a store for the browser-granted file handle;
    // existing board records are kept so they can be written into the first
    // local file a user creates after upgrading.
    this.version(6).stores({ projects: 'id, updatedAt', fileHandles: 'key' })
  }
}

export const db = new KanbanDatabase()
