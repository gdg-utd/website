"use client";

import { useEffect, useRef, type RefObject } from "react";

const WARNING = "You have unsaved changes. Leave without saving?";

function answers(form: HTMLFormElement) {
  return JSON.stringify(Array.from(new FormData(form)).filter(([name]) => name.startsWith("field:")));
}

/** No storage or network writes: the last rendered saved draft is the baseline. */
export function useUnsavedChanges(formRef: RefObject<HTMLFormElement | null>, revision: number) {
  const refreshRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const saved = answers(form);
    let dirty = false;
    let leaving = false;

    function beforeUnload(event: BeforeUnloadEvent) {
      if (!dirty || leaving) return;
      event.preventDefault();
      event.returnValue = "";
    }
    function refresh() {
      if (!formRef.current) return;
      const nextDirty = answers(formRef.current) !== saved;
      leaving = false;
      if (nextDirty === dirty) return;
      dirty = nextDirty;
      if (dirty) window.addEventListener("beforeunload", beforeUnload);
      else window.removeEventListener("beforeunload", beforeUnload);
    }
    refreshRef.current = refresh;
    function changed(event: Event) {
      if (event.target instanceof Node && formRef.current?.contains(event.target)) refresh();
    }
    function confirmLeave() {
      if (!dirty || leaving) return true;
      if (!window.confirm(WARNING)) return false;
      leaving = true;
      return true;
    }
    function click(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.download || (link.target && link.target !== "_self")) return;
      const url = new URL(link.href);
      if (!["http:", "https:"].includes(url.protocol)) return;
      if (url.origin === location.origin && url.pathname === location.pathname && url.search === location.search) return;
      if (!confirmLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    // Modern browsers expose cancellable same-document Back/Forward navigation.
    // Link clicks use capture above; full document departures use beforeunload.
    const navigation = (window as Window & { navigation?: EventTarget }).navigation;
    function navigate(rawEvent: Event) {
      const event = rawEvent as Event & { navigationType: string; destination: { url: string; sameDocument: boolean } };
      if (event.navigationType !== "traverse" || !event.destination.sameDocument || !event.cancelable) return;
      const url = new URL(event.destination.url);
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (!confirmLeave()) event.preventDefault();
    }
    document.addEventListener("input", changed);
    document.addEventListener("change", changed);
    document.addEventListener("click", click, true);
    navigation?.addEventListener("navigate", navigate);
    return () => {
      refreshRef.current = null;
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("input", changed);
      document.removeEventListener("change", changed);
      document.removeEventListener("click", click, true);
      navigation?.removeEventListener("navigate", navigate);
    };
  }, [formRef]);

  // A failed save reconstructs the form, but must not make its answers "saved".
  useEffect(() => { refreshRef.current?.(); }, [revision]);
}
