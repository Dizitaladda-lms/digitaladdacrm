import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import "./PwaUpdatePrompt.css";

const PWA_UPDATE_EVENT = "dizitaladda:pwa-update-ready";

const PwaUpdatePrompt = () => {
  const [updateReady, setUpdateReady] = useState(
    () => Boolean(window.__dizitalAddaUpdateReady)
  );
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const showUpdate = () => setUpdateReady(true);
    window.addEventListener(PWA_UPDATE_EVENT, showUpdate);
    return () => window.removeEventListener(PWA_UPDATE_EVENT, showUpdate);
  }, []);

  const applyUpdate = () => {
    const updateApp = window.__dizitalAddaApplyUpdate;
    if (typeof updateApp !== "function") return;
    setUpdating(true);
    updateApp();
  };

  if (!updateReady) return null;

  return (
    <section className="pwa-update-prompt" role="status" aria-live="polite">
      <button
        type="button"
        className="pwa-update-dismiss"
        onClick={() => setUpdateReady(false)}
        aria-label="Update later"
      >
        <X size={17} />
      </button>
      <div className="pwa-update-icon"><Download size={21} /></div>
      <div className="pwa-update-copy">
        <strong>New CRM update available</strong>
        <span>Latest features are ready. Update karke app refresh karein.</span>
      </div>
      <button type="button" className="pwa-update-button" onClick={applyUpdate} disabled={updating}>
        <RefreshCw size={15} className={updating ? "pwa-update-spin" : ""} />
        {updating ? "Updating..." : "Update now"}
      </button>
    </section>
  );
};

export default PwaUpdatePrompt;
