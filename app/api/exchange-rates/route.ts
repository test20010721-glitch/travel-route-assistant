import { NextResponse } from "next/server";

/**
 * Serves JPY -> USD/EUR exchange rates via Frankfurter (ECB reference
 * rates), a free, keyless, no-rate-limit API. Cached for an hour via
 * Next's fetch cache so we don't hit the upstream on every client request
 * (rates only update once a day anyway).
 */
export async function GET() {
  try {
    const res = await fetch(
      "https://api.frankfurter.dev/v1/latest?base=JPY&symbols=USD,EUR",
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch exchange rates" },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (typeof data.rates?.USD !== "number" || typeof data.rates?.EUR !== "number") {
      return NextResponse.json(
        { error: "Unexpected exchange rate response" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      base: "JPY",
      rates: { USD: data.rates.USD, EUR: data.rates.EUR },
      date: data.date ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to reach exchange rate service" },
      { status: 502 }
    );
  }
}
