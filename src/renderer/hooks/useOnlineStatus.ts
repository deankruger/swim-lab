import { useEffect, useState } from "react";
import { isOnline, subscribe } from "../../api/connectivity";

export function useOnlineStatus(): boolean {
    const [online, setOnline] = useState<boolean>(() => isOnline());

    useEffect(() => {
        setOnline(isOnline());
        return subscribe(setOnline);
    }, []);

    return online;
}
