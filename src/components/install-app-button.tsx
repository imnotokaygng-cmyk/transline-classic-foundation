import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const handler = (next: Event) => {
      next.preventDefault();
      setEvent(next as InstallEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        if (!event) {
          window.alert("App installation is not available in this browser. Open the browser menu and choose Add to Home screen or Install app.");
          return;
        }
        await event.prompt();
        await event.userChoice;
        setEvent(null);
      }}
      aria-label="Download or install Transline Classic"
    >
      <Download data-icon="inline-start" /> Download app
    </Button>
  );
}
