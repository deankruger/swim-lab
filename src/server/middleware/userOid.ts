import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, JwtHeader, SigningKeyCallback } from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const tenantId = process.env.EXTERNAL_ID_TENANT_ID;
const clientId = process.env.EXTERNAL_ID_CLIENT_ID;

if (!tenantId || !clientId) {
    console.warn(
        "[userOid] EXTERNAL_ID_TENANT_ID or EXTERNAL_ID_CLIENT_ID not set — production token validation will reject all requests"
    );
}

const expectedIssuer = `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`;
const jwksUri = `https://${tenantId}.ciamlogin.com/${tenantId}/discovery/v2.0/keys`;

const keysClient = jwksClient({
    jwksUri,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 24 * 60 * 60 * 1000,
    rateLimit: true,
});

function getKey(header: JwtHeader, callback: SigningKeyCallback): void {
    if (!header.kid) {
        callback(new Error("Token header missing kid"));
        return;
    }
    keysClient.getSigningKey(header.kid, (err, key) => {
        if (err) {
            callback(err);
            return;
        }
        callback(null, key?.getPublicKey());
    });
}

function verifyToken(token: string): Promise<JwtPayload> {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            getKey,
            {
                issuer: expectedIssuer,
                audience: clientId,
                algorithms: ["RS256"],
            },
            (err, decoded) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!decoded || typeof decoded === "string") {
                    reject(new Error("Token payload is not an object"));
                    return;
                }
                resolve(decoded);
            }
        );
    });
}

export async function userOidMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        if (process.env.NODE_ENV !== "production") {
            req.userOid = "local-dev-user";
            next();
            return;
        }
        res.status(401).json({ error: "Missing or invalid Authorization header" });
        return;
    }

    const token = authHeader.slice("Bearer ".length).trim();

    try {
        const payload = await verifyToken(token);
        const oid = typeof payload.oid === "string" ? payload.oid : undefined;
        if (!oid) {
            res.status(401).json({ error: "Token missing oid claim" });
            return;
        }
        req.userOid = oid;
        next();
    } catch (err) {
        console.warn("[userOid] token verification failed:", (err as Error).message);
        res.status(401).json({ error: "Invalid token" });
    }
}
