import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useT } from "../../lib/i18n/LocalizationProvider";

const THEME_KEY = "deployguard:theme";
type Theme = "dark" | "light";

function readInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return { theme, toggle: () => setTheme((value) => (value === "dark" ? "light" : "dark")) };
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const { t } = useT();
  return (
    <button
      className="icon-button"
      onClick={toggle}
      aria-label={theme === "dark" ? t("nav.switchToLight", "Switch to light appearance") : t("nav.switchToDark", "Switch to dark appearance")}
      title={t("nav.appearance", "Appearance")}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}