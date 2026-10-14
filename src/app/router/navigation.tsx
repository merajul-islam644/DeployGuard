import { createContext, useContext } from "react";

type NavigateFn = (path: string) => void;

const NavigationContext = createContext<NavigateFn>(() => undefined);

export const NavigationProvider = NavigationContext.Provider;

export function useNavigate(): NavigateFn {
  return useContext(NavigationContext);
}