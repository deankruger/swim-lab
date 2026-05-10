declare global {
    namespace Express {
        interface Request {
            userOid?: string;
        }
    }
}

export { };
