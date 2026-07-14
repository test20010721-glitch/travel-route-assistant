"use client";

import { useState, useRef, useEffect } from "react";
import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n-context";
import { languageNames } from "@/lib/i18n";
import { Language } from "@/lib/types";
import { cn } from "@/lib/cn";

const LANGS: Language[] = ["ja", "en", "es", "ca"];

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-accent transition-colors px-2 py-1.5 rounded-full"
        aria-label={t("languageLabel")}
      >
        <Globe size={18} />
        <span className="hidden sm:inline">{languageNames[lang]}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-white rounded-2xl shadow-card border border-line/60 py-1.5 z-50">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-4 py-2 text-sm hover:bg-subtle transition-colors",
                l === lang ? "text-accent font-medium" : "text-ink"
              )}
            >
              {languageNames[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
