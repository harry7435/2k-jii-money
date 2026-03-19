import type { Category } from '@2k-jii-money/supabase-types'

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[]
}

/** 평면 카테고리 배열을 계층 트리로 변환 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const map = new Map<string, CategoryTreeNode>()
  const roots: CategoryTreeNode[] = []

  // 노드 생성
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] })
  }

  // 부모-자식 연결
  for (const cat of categories) {
    const node = map.get(cat.id)!
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node)
    } else if (!cat.parent_id) {
      roots.push(node)
    }
  }

  return roots
}

/** 카테고리 ID로부터 대분류(level 1) 조상 찾기 */
export function findMajorCategory(categoryId: string, categories: Category[]): Category | undefined {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  let current = catMap.get(categoryId)
  while (current && current.level > 1 && current.parent_id) {
    current = catMap.get(current.parent_id)
  }
  return current?.level === 1 ? current : undefined
}

/** 카테고리 ID로부터 중분류(level 2) 조상 찾기 */
export function findMiddleCategory(categoryId: string, categories: Category[]): Category | undefined {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  let current = catMap.get(categoryId)
  while (current && current.level > 2 && current.parent_id) {
    current = catMap.get(current.parent_id)
  }
  return current?.level === 2 ? current : undefined
}

/** 카테고리 계층 경로 반환 (대>중>소) */
export function getCategoryPath(categoryId: string, categories: Category[]): Category[] {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const path: Category[] = []
  let current = catMap.get(categoryId)
  while (current) {
    path.unshift(current)
    current = current.parent_id ? catMap.get(current.parent_id) : undefined
  }
  return path
}

/** 특정 레벨의 카테고리만 필터 */
export function getCategoriesByLevel(categories: Category[], level: number): Category[] {
  return categories.filter((c) => c.level === level)
}

/** 특정 부모의 자식 카테고리 반환 */
export function getChildCategories(categories: Category[], parentId: string): Category[] {
  return categories.filter((c) => c.parent_id === parentId)
}
