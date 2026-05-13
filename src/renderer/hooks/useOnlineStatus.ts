import { useSyncExternalStore } from "react";
import { isOnline, subscribe } from "../../api/connectivity";

export function useOnlineStatus(): boolean {
    return useSyncExternalStore(subscribe, isOnline, () => true);
}
