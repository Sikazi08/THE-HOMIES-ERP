import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setOfflineWriteHandler, type OfflineRequest } from "@workspace/api-client-react";
import { toast } from "sonner";
import {
  enqueue,
  flush,
  initQueue,
  subscribe,
  getPendingCount,
  getFailedCount,
  retryFailed,
} from "./offline-queue";

interface OfflineContextValue {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  syncing: boolean;
  retry: () => void;
}

const OfflineContext = createContext<OfflineContextValue | null>(null);

// Map a request to a human-readable French label for the sync banner.
function labelForRequest(req: OfflineRequest): string {
  const url = req.url.split("?")[0];
  const map: Array<[RegExp, string, string]> = [
    [/\/api\/sales\/\d+\/cancel$/, "POST", "Annulation de vente"],
    [/\/api\/sales$/, "POST", "Vente"],
    [/\/api\/expenses\/\d+$/, "DELETE", "Suppression de dépense"],
    [/\/api\/expenses$/, "POST", "Dépense"],
    [/\/api\/partners\/movements\/send$/, "POST", "Envoi au partenaire"],
    [/\/api\/partners\/movements\/return$/, "POST", "Retour de partenaire"],
    [/\/api\/partners\/\d+$/, "DELETE", "Suppression de partenaire"],
    [/\/api\/partners$/, "POST", "Partenaire"],
    [/\/api\/clients\/\d+$/, "DELETE", "Suppression de client"],
    [/\/api\/clients$/, "POST", "Client"],
    [/\/api\/products\/\d+$/, "DELETE", "Suppression de produit"],
    [/\/api\/products$/, "POST", "Produit"],
    [/\/api\/sellers/, "", "Vendeur"],
    [/\/api\/users/, "", "Utilisateur"],
  ];
  for (const [pattern, method, label] of map) {
    if (pattern.test(url) && (method === "" || method === req.method)) {
      return label;
    }
  }
  return "Modification";
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const runFlush = async () => {
    if (syncingRef.current) return;
    if (getPendingCount() === 0) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await flush();
      if (result.synced > 0) {
        await queryClient.invalidateQueries();
        toast.success(
          `${result.synced} modification${result.synced > 1 ? "s" : ""} synchronisée${result.synced > 1 ? "s" : ""} ✓`,
        );
      }
      if (result.failed > 0) {
        toast.error(
          `${result.failed} modification${result.failed > 1 ? "s" : ""} en échec. Vérifiez la file de synchronisation.`,
        );
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  };

  useEffect(() => {
    // Register the offline write handler so failed mutations are queued.
    setOfflineWriteHandler(async (req) => {
      // Authentication requests are pointless to queue while offline.
      if (req.url.includes("/api/auth/")) {
        throw new TypeError("offline-auth");
      }
      const op = await enqueue({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        label: labelForRequest(req),
      });
      toast("📴 Enregistré hors-ligne", {
        description: "Sera synchronisé au retour de la connexion.",
      });
      return { _offline: true, id: op.id };
    });

    const unsubscribe = subscribe(() => {
      setPendingCount(getPendingCount());
      setFailedCount(getFailedCount());
    });

    initQueue().then(() => {
      setPendingCount(getPendingCount());
      setFailedCount(getFailedCount());
      if (navigator.onLine) void runFlush();
    });

    const handleOnline = () => {
      setIsOnline(true);
      void runFlush();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      setOfflineWriteHandler(null);
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = () => {
    void retryFailed().then(() => runFlush());
  };

  return (
    <OfflineContext.Provider
      value={{ isOnline, pendingCount, failedCount, syncing, retry }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return ctx;
}
