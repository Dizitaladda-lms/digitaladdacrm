import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import "./PwaUpdatePrompt.css";

const PWA_UPDATE_EVENT = "dizitaladda:pwa-update-ready";

const PwaUpdatePrompt = () => {
  const [updateReady, setUpdateReady] = useState(
    () => Boolean(window.__dizitalAddaUpdateReady)
  );
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Latest features are ready. Update karke app refresh karein.");
  const [needsReload, setNeedsReload] = useState(false);
  const timersRef = useRef([]);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  useEffect(() => {
    const showUpdate = () => setUpdateReady(true);
    window.addEventListener(PWA_UPDATE_EVENT, showUpdate);
    return () => {
      window.removeEventListener(PWA_UPDATE_EVENT, showUpdate);
      clearTimers();
    };
  }, []);

  const startProgress = () => {
    clearTimers();
    setUpdating(true);
    setNeedsReload(false);
    setProgress(15);
    setStatusText("Preparing the latest version...");

    const onControllerChange = () => {
      clearTimers();
      setProgress(100);
      setStatusText("Update installed. Reloading CRM...");
    };
    navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange, { once: true });

    timersRef.current = [
      setTimeout(() => {
        setProgress(45);
        setStatusText("Downloading and applying new features...");
      }, 350),
      setTimeout(() => {
        setProgress(75);
        setStatusText("Almost done. Activating the update...");
      }, 1500),
      setTimeout(() => {
        setProgress(92);
        setStatusText("Waiting for the browser to switch to the new version...");
      }, 3500),
      setTimeout(() => {
        setProgress(95);
        setUpdating(false);
        setNeedsReload(true);
        setStatusText("Update is ready. Close other CRM tabs, then tap Reload now.");
      }, 8000),
    ];

  };

  const applyUpdate = async () => {
    startProgress();
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();

      const updateApp = window.__dizitalAddaApplyUpdate;
      if (typeof updateApp === "function") {
        window.__dizitalAddaUpdateReady = false;
        await updateApp();
        return;
      }

      if (registration?.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      // There is no waiting worker, so the current build is already the
      // newest one. Reload once to ensure the portal starts from that build.
      clearTimers();
      setProgress(100);
      setStatusText("CRM is already on the latest version. Reloading...");
      setTimeout(() => window.location.reload(), 450);
    } catch {
      clearTimers();
      setUpdating(false);
      setNeedsReload(true);
      setStatusText("Could not apply the update automatically. Please reload CRM.");
    }
  };

  const reloadNow = () => {
    navigator.serviceWorker?.getRegistration().then((registration) => {
      registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
      return registration?.update();
    }).catch(() => {}).finally(() => window.location.reload());
  };

  const dismiss = () => {
    window.__dizitalAddaUpdateReady = false;
    setUpdateReady(false);
  };

  if (!updateReady) return null;

  return (
    <section className="pwa-update-prompt" role="status" aria-live="polite">
      <button
        type="button"
        className="pwa-update-dismiss"
        onClick={dismiss}
        aria-label="Update later"
      >
        <X size={17} />
      </button>
      <div className="pwa-update-icon"><Download size={21} /></div>
      <div className="pwa-update-copy">
        <strong>{progress > 0 || window.__dizitalAddaUpdateReady ? "New CRM update available" : "Update your CRM"}</strong>
        <span>{statusText}</span>
        {updating || progress > 0 ? (
          <span className="pwa-update-progress" aria-label={`Update progress ${progress}%`}>
            <span className="pwa-update-progress-track"><span style={{ width: `${progress}%` }} /></span>
            <b>{progress}%</b>
          </span>
        ) : null}
      </div>
      <button type="button" className="pwa-update-button" onClick={needsReload ? reloadNow : applyUpdate} disabled={updating}>
        <RefreshCw size={15} className={updating ? "pwa-update-spin" : ""} />
        {updating ? "Updating..." : needsReload ? "Reload now" : "Update now"}
      </button>
    </section>
  );
};

export default PwaUpdatePrompt;
