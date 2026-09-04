export interface TodoItem {
  id: string
  text: string
}

export interface Lane {
  id: string
  name: string
  todos: TodoItem[]
}

export interface Project {
  id: string
  name: string
  lanes: Lane[]
}

export interface BoardFile {
  format: 'local-kanban'
  schemaVersion: 1
  updatedAt: string
  project: Project
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export function createDefaultProject(name = '我的项目'): Project {
  return {
    id: createId('project'),
    name,
    lanes: [
      {
        id: createId('lane'),
        name: '待处理',
        todos: []
      }
    ]
  }
}

export function normalizeProject(value: unknown): Project | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<Project>
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string' || !Array.isArray(raw.lanes)) return null
  const lanes: Lane[] = []
  for (const laneValue of raw.lanes) {
    // 跳过结构非法的状态列，避免单条坏数据导致整个看板文件无法打开
    if (!laneValue || typeof laneValue !== 'object') continue
    const lane = laneValue as Partial<Lane>
    if (typeof lane.id !== 'string' || typeof lane.name !== 'string') continue
    const laneTodos = Array.isArray(lane.todos) ? lane.todos : []
    const todos: TodoItem[] = []
    for (const todoValue of laneTodos) {
      // 跳过结构非法的条目（例如误拖入 todo 列表的状态列对象）
      if (!todoValue || typeof todoValue !== 'object') continue
      const todo = todoValue as Partial<TodoItem>
      if (typeof todo.id !== 'string' || typeof todo.text !== 'string') continue
      todos.push({ id: todo.id, text: todo.text })
    }
    lanes.push({ id: lane.id, name: lane.name, todos })
  }
  return { id: raw.id, name: raw.name, lanes }
}
