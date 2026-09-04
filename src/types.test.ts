import { describe, expect, it } from 'vitest'
import { normalizeProject } from './types'

describe('normalizeProject', () => {
  it('接受结构完整的项目', () => {
    const project = normalizeProject({
      id: 'project-1',
      name: '我的项目',
      lanes: [
        {
          id: 'lane-1',
          name: '待处理',
          todos: [
            { id: 'todo-1', text: '写文档' },
            { id: 'todo-2', text: '修 bug' }
          ]
        }
      ]
    })
    expect(project).toEqual({
      id: 'project-1',
      name: '我的项目',
      lanes: [
        {
          id: 'lane-1',
          name: '待处理',
          todos: [
            { id: 'todo-1', text: '写文档' },
            { id: 'todo-2', text: '修 bug' }
          ]
        }
      ]
    })
  })

  it('todos 不是数组时按空列表处理', () => {
    const project = normalizeProject({
      id: 'p',
      name: 'n',
      lanes: [{ id: 'l', name: '列', todos: null }]
    })
    expect(project?.lanes[0].todos).toEqual([])
  })

  it('跳过 todos 中结构非法的条目（如误拖入的状态列对象），不丢失其余数据', () => {
    const project = normalizeProject({
      id: 'p',
      name: 'n',
      lanes: [
        {
          id: 'lane-1',
          name: '待处理',
          todos: [
            { id: 'todo-1', text: '正常条目' },
            // 模拟状态列被错误拖入 todo 列表后落盘的数据
            { id: 'lane-2', name: '进行中', todos: [{ id: 'todo-9', text: '被带走的条目' }] },
            { id: 'todo-bad' },
            null,
            'not-an-object'
          ]
        },
        { id: 'lane-3', name: '完成', todos: [] }
      ]
    })
    expect(project).not.toBeNull()
    expect(project?.lanes).toHaveLength(2)
    expect(project?.lanes[0].todos).toEqual([{ id: 'todo-1', text: '正常条目' }])
  })

  it('跳过结构非法的状态列，不丢失其余列', () => {
    const project = normalizeProject({
      id: 'p',
      name: 'n',
      lanes: [
        { id: 'lane-1', name: '待处理', todos: [] },
        { name: '缺少 id' },
        null,
        { id: 'lane-4', name: '完成', todos: [{ id: 'todo-1', text: 'x' }] }
      ]
    })
    expect(project?.lanes.map((lane) => lane.id)).toEqual(['lane-1', 'lane-4'])
  })

  it('顶层结构非法时返回 null', () => {
    expect(normalizeProject(null)).toBeNull()
    expect(normalizeProject({})).toBeNull()
    expect(normalizeProject({ id: 'p', name: 'n' })).toBeNull()
    expect(normalizeProject({ id: 1, name: 'n', lanes: [] })).toBeNull()
  })
})
