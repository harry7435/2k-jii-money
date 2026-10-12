/**
 * 다른 조회의 결과를 기다리지 않고 먼저 보내 둔 요청 묶음.
 *
 * 각 요청은 `take()`로 한 번만 꺼낼 수 있다. 꺼낸 뒤에는 `null`이 나오므로
 * 이후의 재조회(invalidate, 리페치)는 호출자가 평소 경로로 보내게 된다.
 * 먼저 보낸 요청이 실패해도 `null`로 바뀌어, 호출자가 평소 경로로 다시 시도할 수 있다.
 */
export function createEarlyFetch<T extends Record<string, Promise<unknown>>>(
  requests: T,
) {
  const pending = new Map<keyof T, Promise<unknown>>();
  for (const key of Object.keys(requests) as (keyof T)[]) {
    pending.set(
      key,
      requests[key].catch(() => null),
    );
  }

  return {
    take<K extends keyof T>(key: K): Promise<Awaited<T[K]> | null> {
      const request = pending.get(key);
      pending.delete(key);
      return (request ?? Promise.resolve(null)) as Promise<Awaited<
        T[K]
      > | null>;
    },
  };
}
