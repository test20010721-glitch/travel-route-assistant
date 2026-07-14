import { Language } from "./types";

export type CurrencyCode = "JPY" | "USD" | "EUR";

export interface ExchangeRates {
  USD: number; // 1 JPY = X USD
  EUR: number; // 1 JPY = X EUR
}

export function currencyForLang(lang: Language): CurrencyCode {
  if (lang === "en") return "USD";
  if (lang === "es" || lang === "ca") return "EUR";
  return "JPY";
}

function localeForLang(lang: Language): string {
  switch (lang) {
    case "en":
      return "en-US";
    case "es":
      return "es-ES";
    case "ca":
      return "ca-ES";
    default:
      return "ja-JP";
  }
}

let cachedRates: ExchangeRates | null = null;
let cachedAt = 0;
let inflight: Promise<ExchangeRates | null> | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches live JPY->USD/EUR rates from our /api/exchange-rates route,
 * caching in memory for an hour so repeated renders/language switches don't
 * re-fetch. Returns null on failure (callers should fall back to JPY).
 */
export async function fetchExchangeRates(): Promise<ExchangeRates | null> {
  const now = Date.now();
  if (cachedRates && now - cachedAt < CACHE_TTL_MS) return cachedRates;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/exchange-rates");
      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data.rates?.USD === "number" && typeof data.rates?.EUR === "number") {
        cachedRates = { USD: data.rates.USD, EUR: data.rates.EUR };
        cachedAt = Date.now();
        return cachedRates;
      }
      return null;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/**
 * Formats a JPY amount for display in the currency associated with `lang`
 * (ja -> JPY, en -> USD, es/ca -> EUR), converting using live rates when
 * available. Falls back to JPY if rates haven't loaded yet, and to
 * `checkFaresText` for non-finite values (e.g. flight fares we can't
 * estimate at all).
 */
export function formatMoney(
  valueJPY: number,
  lang: Language,
  rates: ExchangeRates | null,
  checkFaresText: string
): string {
  if (!Number.isFinite(valueJPY)) return checkFaresText;

  const currency = currencyForLang(lang);

  if (currency === "JPY" || !rates) {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(Math.round(valueJPY));
  }

  const converted = valueJPY * rates[currency];
  return new Intl.NumberFormat(localeForLang(lang), {
    style: "currency",
    currency,
  }).format(converted);
}
