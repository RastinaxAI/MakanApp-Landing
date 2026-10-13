import { z } from "zod";

// Configure before constructing schemas: CSP must never need dynamic code generation.
z.config({ jitless: true });

export { z };
