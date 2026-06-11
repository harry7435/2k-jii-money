const STORAGE_KEY_PREFIX = "jii-money-recent-cats:";

/** 저장 최대 개수 (노출은 호출부에서 별도 슬라이스) */
export const RECENT_CATEGORIES_MAX = 8;

function storageKey(familyId: string): string {
  return `${STORAGE_KEY_PREFIX}${familyId}`;
}

/** MRU 목록 앞에 id 삽입 (중복 제거, 최대 max개 유지) */
export function pushToMru(list: string[], id: string, max: number): string[] {
  return [id, ...list.filter((v) => v !== id)].slice(0, max);
}

/** localStorage에서 최근 사용 카테고리 ID 목록 조회 (최신순) */
export function getRecentCategoryIds(familyId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(familyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

/** 최근 사용 카테고리 ID 기록 */
export function pushRecentCategoryId(
  familyId: string,
  categoryId: string,
): void {
  if (typeof window === "undefined") return;
  try {
    const next = pushToMru(
      getRecentCategoryIds(familyId),
      categoryId,
      RECENT_CATEGORIES_MAX,
    );
    window.localStorage.setItem(storageKey(familyId), JSON.stringify(next));
  } catch {
    // localStorage 사용 불가(시크릿 모드 용량 제한 등) 시 기록 생략
  }
}
