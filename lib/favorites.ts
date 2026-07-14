import { FavoriteRoute } from "./types";
import { readJSON, writeJSON } from "./storage";
import { generateId } from "./id";

const KEY = "tra-favorites";

export function getFavorites(): FavoriteRoute[] {
  return readJSON<FavoriteRoute[]>(KEY, []);
}

function matchKey(fav: FavoriteRoute, fromName: string, toName: string) {
  return fav.fromName === fromName && fav.toName === toName;
}

export function isFavorited(fromName: string, toName: string): boolean {
  return getFavorites().some((f) => matchKey(f, fromName, toName));
}

export function toggleFavorite(fromName: string, toName: string): FavoriteRoute[] {
  const current = getFavorites();
  const exists = current.find((f) => matchKey(f, fromName, toName));
  let next: FavoriteRoute[];
  if (exists) {
    next = current.filter((f) => f.id !== exists.id);
  } else {
    const entry: FavoriteRoute = {
      id: generateId(),
      fromName,
      toName,
      savedAt: Date.now(),
    };
    next = [entry, ...current];
  }
  writeJSON(KEY, next);
  return next;
}

export function removeFavorite(id: string): FavoriteRoute[] {
  const next = getFavorites().filter((f) => f.id !== id);
  writeJSON(KEY, next);
  return next;
}
