import { get, set, del } from "idb-keyval";

const QUEUE_KEY = "homies-offline-queue-v1";

export interface QueuedAttachment {
  type: string;
  filename: string;
  mimeType: string;
  dataBase64: string;
}

export type QueuedOpStatus = "pending" | "failed";

export interface QueuedOp {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  label: string;
  createdAt: number;
  status: QueuedOpStatus;
  error?: string;
  /**
   * Files to upload after this operation replays successfully. Used for troc
   * sales whose attachments must target the product id returned by the server.
   * Successfully uploaded files are removed from this list so a retry only
   * re-sends the ones that still failed.
   */
  attachments?: QueuedAttachment[];
  /**
   * True once the main request has been accepted by the server. Prevents a
   * retry (e.g. after an attachment upload failure) from re-creating the parent
   * record and producing a duplicate sale.
   */
  mainSynced?: boolean;
  /** Product id returned by the server, used as the attachment upload target. */
  trocProductId?: number;
}

type Listener = () => void;

let _queue: QueuedOp[] = [];
let _loaded = false;
let _flushing = false;
const listeners = new Set<Listener>();

async function ensureLoaded(): Promise<void> {
  if (_loaded) return;
  try {
    _queue = (await get<QueuedOp[]>(QUEUE_KEY)) ?? [];
  } catch {
    _queue = [];
  }
  _loaded = true;
}

async function persist(): Promise<void> {
  try {
    await set(QUEUE_KEY, _queue);
  } catch {
    // Best-effort persistence; an in-memory queue still works for the session.
  }
}

function notify(): void {
  for (const l of listeners) l();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getQueueSnapshot(): QueuedOp[] {
  return _queue;
}

export function getPendingCount(): number {
  return _queue.filter((op) => op.status === "pending").length;
}

export function getFailedCount(): number {
  return _queue.filter((op) => op.status === "failed").length;
}

/** Eagerly load the persisted queue so counts are accurate on startup. */
export async function initQueue(): Promise<void> {
  await ensureLoaded();
  notify();
}

export interface EnqueueInput {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  label: string;
  attachments?: QueuedAttachment[];
}

export async function enqueue(input: EnqueueInput): Promise<QueuedOp> {
  await ensureLoaded();
  const op: QueuedOp = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    method: input.method,
    url: input.url,
    headers: input.headers,
    body: input.body,
    label: input.label,
    attachments: input.attachments,
    createdAt: Date.now(),
    status: "pending",
  };
  _queue.push(op);
  await persist();
  notify();
  return op;
}

/**
 * Attach files to an already-queued operation. Used when a troc sale is queued
 * via the shared client's offline handler (which has no file context): the
 * caller enqueues the sale, then attaches its files referencing the queued id.
 */
export async function attachToOp(
  id: string,
  attachments: QueuedAttachment[],
): Promise<void> {
  await ensureLoaded();
  const op = _queue.find((o) => o.id === id);
  if (op) {
    op.attachments = attachments;
    await persist();
    notify();
  }
}

export async function removeOp(id: string): Promise<void> {
  await ensureLoaded();
  _queue = _queue.filter((op) => op.id !== id);
  await persist();
  notify();
}

export async function retryFailed(): Promise<void> {
  await ensureLoaded();
  for (const op of _queue) {
    if (op.status === "failed") {
      op.status = "pending";
      op.error = undefined;
    }
  }
  await persist();
  notify();
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export interface FlushResult {
  synced: number;
  failed: number;
}

/**
 * Replay pending operations in order. Stops early on a network error (leaving
 * remaining ops pending). Server rejections (HTTP errors) mark the op as failed
 * and keep it in the queue for the user to review/retry, then continue.
 */
export async function flush(): Promise<FlushResult> {
  await ensureLoaded();
  if (_flushing) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  _flushing = true;
  let synced = 0;
  let failed = 0;

  try {
    for (const op of [..._queue]) {
      if (op.status !== "pending") continue;

      // Step 1: replay the main request, unless it already succeeded on a prior
      // attempt (re-sending would duplicate the parent record).
      if (!op.mainSynced) {
        let res: Response;
        try {
          res = await fetch(op.url, {
            method: op.method,
            headers: op.headers,
            body: op.body ?? undefined,
            credentials: "include",
          });
        } catch {
          // Network dropped again — keep this and remaining ops pending.
          break;
        }

        if (!res.ok) {
          let message = `Erreur ${res.status}`;
          try {
            const data = await res.clone().json();
            if (data?.error) message = String(data.error);
          } catch {
            // ignore body parse failures
          }
          op.status = "failed";
          op.error = message;
          failed++;
          await persist();
          notify();
          continue;
        }

        op.mainSynced = true;
        if (op.attachments?.length) {
          try {
            const data = await res.clone().json();
            if (typeof data?.trocProductId === "number") {
              op.trocProductId = data.trocProductId;
            }
          } catch {
            // ignore body parse failures
          }
        }
        await persist();
      }

      // Step 2: upload any remaining attachments against the parent product.
      if (op.attachments?.length) {
        if (!op.trocProductId) {
          op.status = "failed";
          op.error = "Pièces jointes: identifiant du produit introuvable";
          failed++;
          await persist();
          notify();
          continue;
        }

        const uploaded = new Set<QueuedAttachment>();
        let networkDropped = false;
        let serverRejected = false;
        for (const att of op.attachments) {
          if (networkDropped) break;
          try {
            const fd = new FormData();
            fd.append(
              "file",
              base64ToBlob(att.dataBase64, att.mimeType),
              att.filename,
            );
            fd.append("type", att.type);
            const ar = await fetch(
              `/api/attachments/products/${op.trocProductId}`,
              { method: "POST", credentials: "include", body: fd },
            );
            if (ar.ok) uploaded.add(att);
            else serverRejected = true;
          } catch {
            networkDropped = true;
          }
        }
        // Drop only the files that uploaded; keep the rest for a retry.
        op.attachments = op.attachments.filter((a) => !uploaded.has(a));
        await persist();

        if (networkDropped) {
          // Connectivity lost mid-upload: keep this op pending and stop.
          notify();
          break;
        }
        if (serverRejected || op.attachments.length > 0) {
          op.status = "failed";
          op.error = "Échec de l'envoi d'une ou plusieurs pièces jointes";
          failed++;
          await persist();
          notify();
          continue;
        }
      }

      // Step 3: fully synced (main request + all attachments).
      _queue = _queue.filter((q) => q.id !== op.id);
      synced++;
      await persist();
      notify();
    }
  } finally {
    _flushing = false;
  }

  return { synced, failed };
}
