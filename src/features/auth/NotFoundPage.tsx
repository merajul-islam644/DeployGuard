import { Home } from "lucide-react";
import { useNavigate } from "../../app/router/navigation";
import { useT } from "../../lib/i18n/LocalizationProvider";

export function NotFoundPage({ onNavigate }: { onNavigate?: (path: string) => void } = {}) {
  const { t } = useT();
  const navigate = useNavigate();
  const go = onNavigate ?? navigate;

  return (
    <section className="not-found">
      <h2>{t("notFound.title")}</h2>
      <p>{t("notFound.message")}</p>
      <button
        className="primary-button"
        onClick={(event) => {
          event.preventDefault();
          go("/");
        }}
      >
        <Home size={16} /> {t("notFound.home")}
      </button>
    </section>
  );
}