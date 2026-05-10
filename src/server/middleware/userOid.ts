import { NextFunction, Request, Response } from "express";

const OID_CLAIM_TYPES = [
    "http://schemas.microsoft.com/identity/claims/objectidentifier",
    "oid",
];

export function userOidMiddleware(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers["x-ms-client-principal"];
    if (typeof header === "string" && header.length > 0) {
        try {
            const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf8")) as {
                claims?: Array<{ typ: string; val: string }>;
            };
            const oid = (decoded.claims || []).find((c) => OID_CLAIM_TYPES.includes(c.typ))?.val;
            if (oid) req.userOid = oid;
        } catch (err) {
            console.warn("[userOid] failed to parse x-ms-client-principal:", (err as Error).message);
        }
    }

    if (!req.userOid && process.env.NODE_ENV !== "production") {
        req.userOid = "local-dev-user";
    }

    if (!req.userOid) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }

    next();
}
