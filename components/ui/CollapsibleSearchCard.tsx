"use client";

import { useCallback, useSyncExternalStore } from "react";

type CollapsibleSearchCardProps = {
  // sessionStorageのキー(画面ごとに一意。例: "/resumes")
  storageKey: string;
  children: React.ReactNode;
};

const OPEN_PREFIX = "search-card-open:";
const AUTOCLOSE_PREFIX = "search-card-autoclose:";
const TOGGLE_EVENT = "search-card-toggle";

function readFlag(key: string, defaultValue: boolean): boolean {
  const stored = window.sessionStorage.getItem(key);
  return stored === null ? defaultValue : stored === "true";
}

function writeFlag(key: string, value: boolean) {
  window.sessionStorage.setItem(key, String(value));
  window.dispatchEvent(new Event(TOGGLE_EVENT));
}

// 検索実行時にフォーム側から呼ぶ。「検索後に閉じる」がON(既定)のとき
// カードを閉じる。OFFなら何もしない。
export function notifySearchExecuted(storageKey: string) {
  if (readFlag(AUTOCLOSE_PREFIX + storageKey, true)) {
    writeFlag(OPEN_PREFIX + storageKey, false);
  }
}

// 検索条件カードの開閉ラッパー(resume-list/account-list共通)。
// 開閉はユーザーの明示的な操作と「検索後に閉じる」トグル(既定ON)のみで決まる。
// どちらもsessionStorageに記憶し、記憶がなければ「開」/「ONあつかい」。
// sessionStorageは外部システムのためuseSyncExternalStoreで購読する。
export function CollapsibleSearchCard({
  storageKey,
  children,
}: CollapsibleSearchCardProps) {
  const openKey = OPEN_PREFIX + storageKey;
  const autoCloseKey = AUTOCLOSE_PREFIX + storageKey;

  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener(TOGGLE_EVENT, onStoreChange);
    return () => window.removeEventListener(TOGGLE_EVENT, onStoreChange);
  }, []);

  const open = useSyncExternalStore(
    subscribe,
    () => readFlag(openKey, true),
    () => true,
  );
  const autoClose = useSyncExternalStore(
    subscribe,
    () => readFlag(autoCloseKey, true),
    () => true,
  );

  return (
    <div className="rounded-2xl border border-surface-border">
      {/* トグルは「検索条件」のすぐ右隣に置く */}
      <div className="flex items-center gap-4 px-4 py-2">
        <button
          type="button"
          onClick={() => writeFlag(openKey, !open)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full px-2 py-1 text-left text-sm font-semibold text-brand hover:bg-primary/10"
        >
          <span
            aria-hidden
            className={`text-xs text-primary-dark transition-transform ${open ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          検索条件
        </button>
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-foreground/60">
          <input
            type="checkbox"
            checked={autoClose}
            onChange={(e) => writeFlag(autoCloseKey, e.target.checked)}
            className="accent-primary"
          />
          検索後に閉じる
        </label>
      </div>
      {/* 閉じてもフォームの入力状態を保持するためアンマウントせずhiddenにする */}
      <div hidden={!open} className="border-t border-surface-border p-4">
        {children}
      </div>
    </div>
  );
}
