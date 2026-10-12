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

수입·저축은 **2단계까지만** 있다. 기본 트리(`DEFAULT_CATEGORY_TREE`)에서 "급여"·"적금" 같은 항목이
대분류 바로 아래 **중분류(level 2)** 로 들어가고, 그 밑에 소분류는 없다. 3단계까지 내려가는 것은 지출뿐이다.

- `createDefaultCategories`·`insertMissingSubCategories` 모두 대분류의 자식을 level 2로 넣는다
- 화면(`AddTransactionModal`)은 대분류의 자식 → 그 자식의 자식 순으로 일반적으로 보여주므로, 수입·저축은 중분류를 고르면 끝이고 소분류 단계가 나타나지 않는다
- 따라서 수입·저축 거래의 `category_id`는 level 2 ID다

예전 문서에는 "중분류가 '수입'/'저축'이고 그 아래 소분류가 붙는다"고 적혀 있었는데 코드와 맞지 않아 2026-10-12에 고쳤다.
코드 기준으로 확인한 것이며, 운영 DB의 실제 level 분포는 따로 확인하지 않았다.

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

## 이름 수정과 삭제 (`app/home/settings/page.tsx`)

- 중분류·소분류는 설정 화면의 연필 버튼으로 이름을 바꿀 수 있다 (`updateCategory`). 거래·예산은 `category_id`로 참조하므로 이름을 바꿔도 기존 데이터는 그대로다
- **대분류(수입/저축/지출)는 이름을 바꾸지 못하게 둔다** — `MAJOR_CATEGORY_TYPE_MAP`이 이름으로 거래 타입을 정한다
- 같은 상위 분류 아래 같은 이름은 막는다 — `insertMissingSubCategories`가 `parentId:name`으로 존재 여부를 판단한다
- 삭제 가능 여부는 `is_default`로만 가른다 (기본 항목은 삭제 불가, 직접 추가한 항목만 삭제). 예전에는 "기본 트리에 없는 이름의 중분류"를 구항목으로 보고 삭제 버튼을 붙였는데, 이름을 바꿀 수 있게 되면서 이름 기반 판정은 쓸 수 없어 제거했다
- 기본 트리(`DEFAULT_CATEGORY_TREE`)에는 특정인 이름을 넣지 않는다. 가입하는 모든 가족에게 복사되는 값이다
