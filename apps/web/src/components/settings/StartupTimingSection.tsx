"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  clearStartupRecords,
  loadStartupRecords,
  type RequestTiming,
  type StartupRecord,
} from "@/src/lib/perf/startupTiming";

const sec = (ms: number) => (ms / 1000).toFixed(1);

// /rest/v1/ 접두사는 떼고, rpc/...와 /auth/v1/... 는 알아볼 수 있게 둔다
const shortPath = (p: string) => p.replace(/^\/rest\/v1\//, "");

function RequestRow({ q }: { q: RequestTiming }) {
  return (
    <li className="text-[10px] text-gray-400 leading-tight">
      <span className="text-gray-500">{shortPath(q.path)}</span>
      {" · "}시작 {sec(q.start)}s · 소요 {sec(q.duration)}s
      {q.connect !== null && (
        <> · {q.connect === 0 ? "재사용" : `연결 ${sec(q.connect)}s`}</>
      )}
      {q.dns !== null && <> · DNS {sec(q.dns)}s</>}
      {q.wait !== null && <> · 대기 {sec(q.wait)}s</>}
      {q.protocol && <> · {q.protocol}</>}
    </li>
  );
}

// 진단용 섹션. 앱을 열 때마다 쌓인 시작 시간(최근 10건)을 보여준다.
export function StartupTimingSection() {
  // localStorage는 SSR에 없으므로 마운트 후에 읽는다 (hydration 불일치 방지)
  const [records, setRecords] = useState<StartupRecord[]>([]);

  useEffect(() => {
    // effect 본문에서 동기로 setState하면 연쇄 렌더가 생겨 마이크로태스크로 미룬다
    queueMicrotask(() => setRecords(loadStartupRecords()));
  }, []);

  return (
    <div className="bg-white mt-2 px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase">
          앱 시작 시간
        </p>
        {records.length > 0 && (
          <button
            onClick={() => {
              clearStartupRecords();
              setRecords([]);
            }}
            className="text-xs text-gray-400"
          >
            기록 지우기
          </button>
        )}
      </div>
      {records.length === 0 ? (
        <p className="text-xs text-gray-400">
          거래 화면으로 앱을 열면 기록이 쌓여요
        </p>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li key={r.at} className="text-xs text-gray-600 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-700">
                  {format(r.at, "M/d HH:mm")}
                </span>
                <span className="text-gray-400">
                  {r.standalone ? "PWA" : "브라우저"}
                </span>
                {r.redirected && (
                  <span className="px-1.5 rounded bg-orange-50 text-orange-500 text-[10px]">
                    리다이렉트
                  </span>
                )}
                {r.tokenRefresh && (
                  <span className="px-1.5 rounded bg-orange-50 text-orange-500 text-[10px]">
                    토큰 갱신
                  </span>
                )}
              </div>
              <p className="text-gray-500">
                응답 시작 {sec(r.ttfb)}초 · 문서 {sec(r.docLoaded)}초 · 화면
                준비 {sec(r.hydrated)}초 · 데이터 {sec(r.dataReady)}초
              </p>
              {r.requests && r.requests.length > 0 && (
                <details>
                  <summary className="text-[10px] text-gray-400">
                    요청 {r.requests.length}개
                  </summary>
                  <ul className="mt-1 space-y-0.5">
                    {r.requests.map((q, i) => (
                      <RequestRow key={i} q={q} />
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
