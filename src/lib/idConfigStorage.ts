import { yearPrefix } from "@/lib/idGenerators";

export type YearPrefixMode = "AUTO" | "Q26" | "Q27";

export type IdConfig = {
  yearPrefixMode: YearPrefixMode;
  sequenceStart: number; // used when table is empty
};

export const DEFAULT_ID_CONFIG: IdConfig = {
  yearPrefixMode: "AUTO",
  sequenceStart: 1,
};

const STORAGE_KEY = "sirkito_admin_id_config_v1";

export function loadIdConfig(): IdConfig {
  if (typeof window === "undefined") return DEFAULT_ID_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ID_CONFIG;
    const parsed = JSON.parse(raw) as Partial<IdConfig>;

    const mode = parsed.yearPrefixMode;
    const yearPrefixMode: YearPrefixMode =
      mode === "Q26" || mode === "Q27" || mode === "AUTO" ? mode : "AUTO";

    const sequenceStartNum = Number(parsed.sequenceStart);
    const sequenceStart =
      Number.isFinite(sequenceStartNum) && sequenceStartNum >= 1
        ? Math.max(1, Math.trunc(sequenceStartNum))
        : DEFAULT_ID_CONFIG.sequenceStart;

    return { yearPrefixMode, sequenceStart };
  } catch {
    return DEFAULT_ID_CONFIG;
  }
}

export function saveIdConfig(cfg: IdConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
}

export function getEffectiveYearPrefix(
  cfg: IdConfig,
  now: Date | number = Date.now(),
): string {
  return cfg.yearPrefixMode === "AUTO" ? yearPrefix(now) : cfg.yearPrefixMode;
}

