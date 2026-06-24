import { useOffline } from "@/lib/offline-context";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";

export function OfflineBanner() {
  const { isOnline, pendingCount, failedCount, syncing, retry } = useOffline();

  if (failedCount > 0) {
    return (
      <div className="flex items-center justify-between gap-3 bg-destructive/15 border-b border-destructive/40 px-4 py-2 text-sm text-destructive">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {failedCount} modification{failedCount > 1 ? "s" : ""} n'a pas pu être
            synchronisée{failedCount > 1 ? "s" : ""}.
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={retry}
          disabled={!isOnline || syncing}
        >
          {syncing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Réessayer
        </Button>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-sm text-amber-600 dark:text-amber-400">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>
          Hors ligne — vos modifications sont enregistrées et seront synchronisées
          au retour de la connexion.
          {pendingCount > 0 && (
            <strong className="ml-1">
              {pendingCount} en attente
            </strong>
          )}
        </span>
      </div>
    );
  }

  if (syncing || pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 bg-primary/10 border-b border-primary/30 px-4 py-2 text-sm text-primary">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <span>
          Synchronisation en cours…
          {pendingCount > 0 && (
            <strong className="ml-1">{pendingCount} en attente</strong>
          )}
        </span>
      </div>
    );
  }

  return null;
}
