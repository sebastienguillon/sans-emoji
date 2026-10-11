import { fileURLToPath } from "node:url";
import { packageProject } from "../tooling/package.ts";

await packageProject(fileURLToPath(new URL("../", import.meta.url)));
