import express, { Request, Response } from "express";
import { getSwimmersContainer, getUserDataContainer, isCosmosConfigured } from "./cosmosClient";
import { userOidMiddleware } from "./middleware/userOid";
import { CountyTimesStore, SwimmerData } from "../types";

interface SwimmerDoc extends SwimmerData {
    id: string;
    userOid: string;
    lastUpdated: string;
}

interface UserDataDoc {
    id: "data";
    userOid: string;
    countyTimesStore: CountyTimesStore;
    activeStandards: string[];
    lastUpdated: string;
}

const router = express.Router();

router.use((req, res, next) => {
    if (!isCosmosConfigured()) {
        res.status(503).json({ error: "Cosmos DB not configured" });
        return;
    }
    next();
});

router.use(userOidMiddleware);

const stripCosmosFields = <T extends { id?: string; _rid?: unknown; _self?: unknown; _etag?: unknown; _attachments?: unknown; _ts?: unknown; userOid?: unknown }>(doc: T): Omit<T, "_rid" | "_self" | "_etag" | "_attachments" | "_ts" | "userOid"> => {
    const { _rid, _self, _etag, _attachments, _ts, userOid, ...rest } = doc;
    void _rid; void _self; void _etag; void _attachments; void _ts; void userOid;
    return rest;
};

router.get("/swimmers", async (req: Request, res: Response) => {
    try {
        const { resources } = await getSwimmersContainer().items
            .query<SwimmerDoc>({
                query: "SELECT * FROM c WHERE c.userOid = @userOid",
                parameters: [{ name: "@userOid", value: req.userOid! }],
            })
            .fetchAll();
        const swimmers = resources.map((doc) => {
            const { id, ...stripped } = stripCosmosFields(doc);
            void id;
            return stripped as unknown as SwimmerData;
        });
        res.json(swimmers);
    } catch (err) {
        console.error("[user] GET /swimmers error:", err);
        res.status(500).json({ error: (err as Error).message });
    }
});

router.put("/swimmers/:tiref", express.json({ limit: "2mb" }), async (req: Request, res: Response) => {
    const tiref = decodeURIComponent(req.params.tiref);
    const body = req.body as SwimmerData;
    if (!body || body.tiref !== tiref) {
        res.status(400).json({ error: "tiref in URL must match tiref in body" });
        return;
    }
    const doc: SwimmerDoc = {
        ...body,
        id: tiref,
        userOid: req.userOid!,
        lastUpdated: new Date().toISOString(),
    };
    try {
        const { resource } = await getSwimmersContainer().items.upsert<SwimmerDoc>(doc);
        const stripped = resource ? stripCosmosFields(resource) : stripCosmosFields(doc);
        const { id, ...rest } = stripped;
        void id;
        res.json(rest as unknown as SwimmerData);
    } catch (err) {
        console.error("[user] PUT /swimmers error:", err);
        res.status(500).json({ error: (err as Error).message });
    }
});

router.delete("/swimmers/:tiref", async (req: Request, res: Response) => {
    const tiref = decodeURIComponent(req.params.tiref);
    try {
        await getSwimmersContainer().item(tiref, req.userOid!).delete();
        res.json({ deleted: true });
    } catch (err) {
        const code = (err as { code?: number }).code;
        if (code === 404) {
            res.json({ deleted: false });
            return;
        }
        console.error("[user] DELETE /swimmers error:", err);
        res.status(500).json({ error: (err as Error).message });
    }
});

router.get("/data", async (req: Request, res: Response) => {
    try {
        const { resource } = await getUserDataContainer().item("data", req.userOid!).read<UserDataDoc>();
        if (!resource) {
            res.json({ countyTimesStore: {}, activeStandards: [] });
            return;
        }
        res.json({
            countyTimesStore: resource.countyTimesStore || {},
            activeStandards: resource.activeStandards || [],
        });
    } catch (err) {
        const code = (err as { code?: number }).code;
        if (code === 404) {
            res.json({ countyTimesStore: {}, activeStandards: [] });
            return;
        }
        console.error("[user] GET /data error:", err);
        res.status(500).json({ error: (err as Error).message });
    }
});

router.put("/data", express.json({ limit: "10mb" }), async (req: Request, res: Response) => {
    const body = req.body as Partial<Pick<UserDataDoc, "countyTimesStore" | "activeStandards">>;
    let existing: UserDataDoc | undefined;
    try {
        const { resource } = await getUserDataContainer().item("data", req.userOid!).read<UserDataDoc>();
        existing = resource;
    } catch (err) {
        if ((err as { code?: number }).code !== 404) {
            console.error("[user] PUT /data read error:", err);
            res.status(500).json({ error: (err as Error).message });
            return;
        }
    }

    const doc: UserDataDoc = {
        id: "data",
        userOid: req.userOid!,
        countyTimesStore: body.countyTimesStore ?? existing?.countyTimesStore ?? {},
        activeStandards: body.activeStandards ?? existing?.activeStandards ?? [],
        lastUpdated: new Date().toISOString(),
    };

    try {
        await getUserDataContainer().items.upsert<UserDataDoc>(doc);
        res.json({
            countyTimesStore: doc.countyTimesStore,
            activeStandards: doc.activeStandards,
        });
    } catch (err) {
        console.error("[user] PUT /data upsert error:", err);
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;
