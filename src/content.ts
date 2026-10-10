import { startController } from "./controller.ts";
import { isAllowedLocation } from "./dom.ts";

if (isAllowedLocation(location)) startController(document);
