"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Language } from "./types";
import { t as translate } from "./i18n";
import { fetchExchangeRates, formatMoney as formatMoneyRaw, ExchangeRates } from "./currency";

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  formatMoney: (valueJPY: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "tra-language";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("ja");
  const [rates, setRates] = useState<ExchangeRates | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved) setLangState(saved);
    else {
      const browserLang = navigator.language.slice(0, 2);
      if (["ja", "en", "es", "ca"].includes(browserLang)) {
        setLangState(browserLang as Language);
      }
    }
  }, []);

  useEffect(() => {
    fetchExchangeRates().then(setRates);
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: string) => translate(lang, key);
  const formatMoney = (valueJPY: number) =>
    formatMoneyRaw(valueJPY, lang, rates, translate(lang, "checkFares"));

  return (
    <I18nContext.Provider value={{ lang, setLang, t, formatMoney }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
