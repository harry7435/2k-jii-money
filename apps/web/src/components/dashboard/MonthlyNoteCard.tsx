"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMonthlyNote, upsertMonthlyNote } from "@/src/lib/supabase/queries";

interface Props {
  familyId: string;
  yearMonth: string;
}

export function MonthlyNoteCard({ familyId, yearMonth }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: note } = useQuery({
    queryKey: ["monthly-note", familyId, yearMonth],
    queryFn: () => getMonthlyNote(familyId, yearMonth),
    enabled: !!familyId,
  });

  const mutation = useMutation({
    mutationFn: (content: string) =>
      upsertMonthlyNote(familyId, yearMonth, content),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["monthly-note", familyId, yearMonth],
      });
    },
  });

  const handleEdit = () => {
    setDraft(note?.content ?? "");
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 30);
  };

  const handleSave = () => {
    mutation.mutate(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleBlur = () => {
    handleSave();
  };

  const hasContent = !!note?.content;

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-amber-500 text-[18px]">
            edit_note
          </span>
          <span className="text-sm font-bold text-amber-800">이 달의 메모</span>
        </div>
        {!editing && (
          <button
            onClick={handleEdit}
            className="text-xs text-amber-600 font-medium px-2 py-0.5 rounded-full hover:bg-amber-100 active:bg-amber-200 transition-colors"
          >
            {hasContent ? "수정" : "추가"}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            placeholder={
              "예) A군 결혼식, 명절 지출 많음\n연말정산 환급, 아르바이트 수입 등"
            }
            className="w-full text-sm text-gray-700 bg-white/60 rounded-xl p-2.5 resize-none outline-none focus:bg-white/80 min-h-[72px] placeholder:text-gray-400"
            rows={3}
          />
          <div className="flex justify-end gap-2 mt-1.5">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleCancel}
              className="text-xs text-gray-400 px-3 py-1 rounded-full hover:bg-amber-100 active:bg-amber-200"
            >
              취소
            </button>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSave}
              className="text-xs text-amber-700 font-semibold px-3 py-1 rounded-full bg-amber-100 hover:bg-amber-200 active:bg-amber-300"
            >
              저장
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={handleEdit}
          className="text-sm text-gray-700 min-h-[36px] cursor-pointer"
        >
          {hasContent ? (
            <p className="whitespace-pre-wrap leading-relaxed">
              {note.content}
            </p>
          ) : (
            <p className="text-gray-400 text-xs leading-relaxed">
              결혼식, 명절, 연말정산, 당근 수입 등 이 달의 특이사항을 기록하세요
            </p>
          )}
        </div>
      )}
    </div>
  );
}
