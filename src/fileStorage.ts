import { createDefaultProject, normalizeProject, type BoardFile, type Project } from './types'

interface FilePickerWindow extends Window {
  showOpenFilePicker?: (options: FilePickerOptions) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker?: (options: FilePickerOptions) => Promise<FileSystemFileHandle>
}

interface FilePickerOptions {
  suggestedName?: string
  types?: Array<{
    description: string
    accept: Record<string, string[]>
  }>
}

const filePickerOptions: FilePickerOptions = {
  suggestedName: '看板.json',
  types: [{ description: '看板文件', accept: { 'application/json': ['.json'] } }]
}

function pickerWindow(): FilePickerWindow {
  return window as FilePickerWindow
}

export function supportsLocalFileStorage(): boolean {
  const browser = pickerWindow()
  return Boolean(browser.showOpenFilePicker && browser.showSaveFilePicker)
}

export async function chooseBoardFile(): Promise<FileSystemFileHandle> {
  const pick = pickerWindow().showOpenFilePicker
  if (!pick) throw new Error('当前浏览器不支持选择本地看板文件')
  const [handle] = await pick(filePickerOptions)
  if (!handle) throw new Error('未选择文件')
  return handle
}

export async function createBoardFile(): Promise<FileSystemFileHandle> {
  const save = pickerWindow().showSaveFilePicker
  if (!save) throw new Error('当前浏览器不支持创建本地看板文件')
  return save(filePickerOptions)
}

export async function readBoardFile(handle: FileSystemFileHandle): Promise<Project | null> {
  const file = await handle.getFile()
  const content = await file.text()
  if (!content.trim()) return null

  let value: unknown
  try {
    value = JSON.parse(content) as unknown
  } catch {
    throw new Error('看板文件不是有效的 JSON')
  }
  if (!value || typeof value !== 'object') throw new Error('看板文件格式无效')

  const raw = value as Partial<BoardFile>
  if (raw.format !== 'local-kanban' || raw.schemaVersion !== 1) throw new Error('不支持的看板文件格式')
  const project = normalizeProject(raw.project)
  if (!project) throw new Error('看板文件数据校验失败')
  return project
}

export async function writeBoardFile(handle: FileSystemFileHandle, project: Project): Promise<void> {
  const payload: BoardFile = {
    format: 'local-kanban',
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    project
  }
  const writable = await handle.createWritable()
  try {
    await writable.write(JSON.stringify(payload, null, 2))
  } finally {
    await writable.close()
  }
}

export function defaultBoardProject(): Project {
  return createDefaultProject()
}
