import dotenv from "dotenv";
import path from "node:path";

const envPath =
  process.env.DOTENV_CONFIG_PATH ||
  path.resolve(process.cwd(), ".env");

dotenv.config({ path: envPath });