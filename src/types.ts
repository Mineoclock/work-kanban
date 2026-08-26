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
    if (!laneValue || typeof laneValue !== 'object') return null
    const lane = laneValue as Partial<Lane>
    if (typeof lane.id !== 'string' || typeof lane.name !== 'string') return null
    const laneTodos = Array.isArray(lane.todos) ? lane.todos : []
    const todos: TodoItem[] = []
    for (const todoValue of laneTodos) {
      if (!todoValue || typeof todoValue !== 'object') return null
      const todo = todoValue as Partial<TodoItem>
      if (typeof todo.id !== 'string' || typeof todo.text !== 'string') return null
      todos.push({ id: todo.id, text: todo.text })
    }
    lanes.push({ id: lane.id, name: lane.name, todos })
  }
  return { id: raw.id, name: raw.name, lanes }
}
