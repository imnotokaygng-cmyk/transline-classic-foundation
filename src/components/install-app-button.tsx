import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    let mounted = true;

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (mounted) setInstallEvent(event as InstallEvent);
    };

    const handleAppInstalled = () => {
      if (mounted) {
        setInstalled(true);
        setInstallEvent(null);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Unable to register Transline app service worker", error);
      });
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => {
      mounted = false;
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleInstall() {
    if (!installEvent) {
      window.alert(
        "Your browser has not provided the install option yet. In Chrome or Edge, open the browser menu and choose Install app or Add to Home screen.",
      );
      return;
    }

    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleInstall}
      aria-label="Install Transline Classic as an app"
      title="Install Transline Classic as an app"
    >
      <Download data-icon="inline-start" /> Install app
    </Button>
  );
}
