import { createContext, useContext } from "react";

const SearchContext = createContext<string>("");

export const SearchProvider = SearchContext.Provider;

export function useSearchParams(): URLSearchParams {
  const search = useContext(SearchContext);
  return new URLSearchParams(search);
}

export function useQueryParam(key: string): string | null {
  return useSearchParams().get(key);
}