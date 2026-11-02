import { useState } from "react";
import { X } from "lucide-react";

const DISMISSED_KEY = "dizitaladda_diwali_greeting_dismissed";

const FestivalGreeting = () => {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Dismissal still applies for this page when session storage is unavailable.
    }
  };

  return (
    <aside className="diwali-greeting" aria-label="Diwali wishes">
      <span>Shubh Deepawali! 🪔 Dizital Adda ki taraf se aapko aur parivar ko Diwali ki shubhkamnayein.</span>
      <button type="button" onClick={dismiss} aria-label="Dismiss Diwali greeting">
        <X size={16} />
      </button>
    </aside>
  );
};

export default FestivalGreeting;
