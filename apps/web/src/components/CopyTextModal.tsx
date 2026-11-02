"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
  isLoading?: boolean;
  /** 미리보기 위에 렌더링할 옵션 영역 */
  children?: ReactNode;
}

/** 텍스트 미리보기 + 클립보드 복사 모달 껍데기. */
export function CopyTextModal({
  isOpen,
  onClose,
  title,
  text,
  isLoading = false,
  children,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setCopyFailed(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleCopy() {
    setCopyFailed(false);
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyFailed(true);
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {children}

          {isLoading ? (
            <div className="h-56 flex items-center justify-center text-sm text-gray-500">
              불러오는 중...
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              readOnly
              value={text}
              className="w-full h-56 text-xs font-mono border border-gray-200 rounded-lg p-2 resize-none"
            />
          )}

          {copyFailed && (
            <p className="text-xs text-red-500">
              자동 복사가 안 돼요. 선택된 내용을 직접 복사해 주세요.
            </p>
          )}

          <button
            onClick={handleCopy}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-teal-400 text-white text-sm font-semibold disabled:opacity-50"
          >
            {copied ? "복사됨 ✓" : "복사"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
