// Connectivity signal that combines OS-level online/offline events with
// observed network behaviour. navigator.onLine alone lies on iOS Safari and
// in some Chromium setups (e.g. captive portals, VPN drops), so we layer an
// `observed` flag on top that authedFetch updates from real fetch outcomes.

type Listener = () => void;

const listeners = new Set<Listener>();
let osOnline: boolean = typeof navigator === "undefined" ? true : navigator.onLine;
let observed: boolean = true;

function notify(): void {
    for (const l of listeners) l();
}

if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
        osOnline = true;
        observed = true;
        notify();
    });
    window.addEventListener("offline", () => {
        osOnline = false;
        notify();
    });
}

export function isOnline(): boolean {
    return osOnline && observed;
}

export function reportNetworkSuccess(): void {
    if (!observed) {
        observed = true;
        notify();
    }
}

export function reportNetworkFailure(): void {
    if (observed) {
        observed = false;
        notify();
    }
}

export function subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function isNetworkError(err: unknown): boolean {
    if (err instanceof TypeError) return true; // fetch throws TypeError on network failure
    if (err && typeof err === "object" && "name" in err) {
        const name = (err as { name?: string }).name ?? "";
        if (name === "OfflineError" || name === "TimeoutError") return true;
        if (/network|offline/i.test(name)) return true;
    }
    if (err && typeof err === "object" && "message" in err) {
        const msg = (err as { message?: string }).message ?? "";
        if (/network|offline|failed to fetch|timed? ?out/i.test(msg)) return true;
    }
    return false;
}
