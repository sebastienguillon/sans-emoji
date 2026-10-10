import { fileURLToPath } from "node:url";
import { buildProject } from "../tooling/build.ts";

await buildProject(fileURLToPath(new URL("../", import.meta.url)));
