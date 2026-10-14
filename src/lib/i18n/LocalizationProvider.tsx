import { createContext, useContext, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { blocksClient } from "../blocks/client";
import { defaultDictionary } from "./dictionary";

type Dictionary = Record<string, string>;
export type LocalizationLanguage = { code: string; isDefault: boolean; name: string };
type TranslateVars = Record<string, string | number>;
type LocalizationValue = {
  language: string;
  languages: LocalizationLanguage[];
  setLanguage: (language: string) => void;
  t: (key: string, fallback?: string, vars?: TranslateVars) => string;
};

const LocalizationContext = createContext<LocalizationValue | undefined>(undefined);
const LANGUAGE_KEY = "deployguard:language";
// One module per screen would keep the initial payload small, but DeployGuard
// ships every string through the shared "common" module.
const MODULES = ["common"];
// DeployGuard ships exactly two languages; the tenant may have others
// configured, but the app offers only these.
const SUPPORTED_LANGUAGES = ["en-US", "bn-BD"];
// Each language is named in its own script, the way a switcher should read.
const LANGUAGE_LABELS: Record<string, string> = { "en-US": "English", "bn-BD": "\u09ac\u09be\u0982\u09b2\u09be" };

function normalizeLanguage(raw: Record<string, unknown>): LocalizationLanguage {
  const code = raw.languageCode ?? raw.code ?? raw.culture ?? "en";
  const name = raw.languageName ?? raw.displayName ?? raw.name ?? String(code);
  return { code: String(code), isDefault: Boolean(raw.isDefault), name: String(name) };
}

export function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [languageOverride, setLanguageOverride] = useState(() => localStorage.getItem(LANGUAGE_KEY) ?? "");

  const languagesQuery = useQuery({
    queryFn: () => blocksClient.localization.languages(),
    queryKey: ["i18n", "languages"],
    staleTime: 5 * 60_000
  });

  // Offer only the two languages DeployGuard supports, in a fixed order, even
  // if the tenant has others configured.
  const languages = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map((code) => {
        const configured = (languagesQuery.data ?? []).map(normalizeLanguage).find((entry) => entry.code === code);
        return { code, isDefault: code === "en-US", name: LANGUAGE_LABELS[code] ?? configured?.name ?? code };
      }),
    [languagesQuery.data]
  );
  const remembered = SUPPORTED_LANGUAGES.includes(languageOverride) ? languageOverride : "";
  // English is the app's own default until the person chooses otherwise.
  const language = remembered || "en-US";

  function setLanguage(next: string) {
    localStorage.setItem(LANGUAGE_KEY, next);
    setLanguageOverride(next);
  }

  // One cached query per module for the active language -- TanStack Query
  // dedupes/caches by queryKey, so switching languages (or remounting) never
  // re-fetches a (language, module) pair that's already in cache.
  const moduleQueries = useQueries({
    queries: MODULES.map((moduleName) => ({
      queryFn: () => blocksClient.localization.translations(moduleName, language),
      queryKey: ["i18n", "translations", language, moduleName],
      staleTime: 5 * 60_000
    }))
  });

  const cloudDictionary = useMemo<Dictionary>(() => {
    const merged: Dictionary = {};
    moduleQueries.forEach((query, index) => {
      const moduleName = MODULES[index];
      for (const [key, value] of Object.entries(query.data ?? {})) {
        const appKey = moduleName === "common" && key in defaultDictionary ? key : `${moduleName}.${key}`;
        merged[appKey] = value;
      }
    });
    return merged;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleQueries.map((query) => query.dataUpdatedAt).join()]);

  const value = useMemo<LocalizationValue>(() => ({
    language,
    languages,
    setLanguage,
    t: (key, fallback, vars) =>
      interpolate(cloudDictionary[key] ?? (defaultDictionary as Record<string, string>)[key] ?? fallback ?? key, vars)
  }), [cloudDictionary, language, languages]);

  return <LocalizationContext.Provider value={value}>{children}</LocalizationContext.Provider>;
}

export function useT() {
  const context = useContext(LocalizationContext);
  if (!context) throw new Error("useT must be used within LocalizationProvider");
  return context;
}
