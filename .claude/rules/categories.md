# 카테고리 시스템

## 3단계 계층 구조

```
level 1 (대분류): 수입 / 저축 / 지출
level 2 (중분류): 식비, 생활, 교통 ...
level 3 (소분류): 식재료, 함께외식 ...
```

- `categories.level`: 1=대, 2=중, 3=소
- `categories.parent_id`: 상위 카테고리 UUID (level 1은 null)
- `categories.is_fixed`: 고정지출 여부 (boolean)

## 트랜잭션에서 category_id

항상 **가장 구체적인 레벨**의 ID를 저장:
- 소분류 선택 시 → 소분류 ID
- 중분류까지만 선택 시 → 중분류 ID

## 수입/저축 특이사항

수입·저축 대분류는 중분류(level 2)가 "수입"/"저축"이고 그 아래에 소분류(level 3)가 바로 붙는 구조.
→ 화면에서 중분류 선택 단계를 생략하고 소분류(level 3)를 직접 보여줌.

## 유틸 함수 (`src/lib/utils/categoryUtils.ts`)

```ts
getCategoriesByLevel(categories, level)     // level별 필터
getChildCategories(categories, parentId)    // 직접 자식만
getCategoryPath(categoryId, categories)     // 루트까지 경로 배열 [대, 중, 소]
```

## 대분류 → 거래 타입 매핑

```ts
// src/lib/constants/categories.ts
MAJOR_CATEGORY_TYPE_MAP: { '수입': 'income', '저축': 'savings', '지출': 'expense' }
```
