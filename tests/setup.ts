import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Jeder Testlauf nutzt einen eigenen, leeren Datenordner.
process.env.DATA_DIR = mkdtempSync(path.join(tmpdir(), "buergerportal-test-"));
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
process.env.VIRUS_SCAN = "off";
process.env.MAIL_TRANSPORT = "console";
