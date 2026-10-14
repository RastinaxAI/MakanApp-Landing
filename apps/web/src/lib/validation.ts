import { config } from "zod";

// Configure before constructing schemas: CSP must never need dynamic code generation.
config({ jitless: true });

// Named exports keep unused schema types and locale dictionaries out of public bundles.
export {
  array,
  boolean,
  coerce,
  email,
  enum,
  lazy,
  literal,
  number,
  object,
  record,
  string,
  union,
  unknown,
  ZodError,
  type infer,
  type input,
  type ZodType,
} from "zod";
