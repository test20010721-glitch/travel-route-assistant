import { SavedSearch, LocationItem, SegmentResult } from "./types";
import { readJSON, writeJSON } from "./storage";
import { generateId } from "./id";

const KEY = "tra-history";
const MAX_ITEMS = 30;

export function getHistory(): SavedSearch[] {
  return readJSON<SavedSearch[]>(KEY, []);
}

export function saveSearchToHistory(
  tripName: string,
  locations: LocationItem[],
  segments: SegmentResult[]
): SavedSearch {
  const entry: SavedSearch = {
    id: generateId(),
    tripName,
    createdAt: Date.now(),
    locations,
    segments,
  };
  const current = getHistory();
  const next = [entry, ...current].slice(0, MAX_ITEMS);
  writeJSON(KEY, next);
  return entry;
}

export function deleteHistoryItem(id: string): void {
  const next = getHistory().filter((h) => h.id !== id);
  writeJSON(KEY, next);
}
