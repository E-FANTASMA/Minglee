import "../src/env.js";
import { supabase } from "../src/supabase.js";
import { normalizeWhatsappNumber } from "../src/utils/whatsappNumber.js";

const DEFAULT_BATCH_SIZE = 500;

function parseArgs(argv) {
  const options = {
    apply: false,
    batchSize: DEFAULT_BATCH_SIZE
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      options.apply = true;
      continue;
    }

    if (arg.startsWith("--batch-size=")) {
      const raw = Number(arg.slice("--batch-size=".length));
      if (!Number.isInteger(raw) || raw < 1 || raw > 1000) {
        throw new Error("Invalid --batch-size. Use an integer between 1 and 1000.");
      }

      options.batchSize = raw;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function fetchAllUsers(batchSize) {
  const users = [];
  let from = 0;

  while (true) {
    const to = from + batchSize - 1;
    const { data, error } = await supabase
      .from("users")
      .select("id,name,whatsapp_number")
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to read users: ${error.message}`);
    }

    if (!data || data.length === 0) break;
    users.push(...data);

    if (data.length < batchSize) break;
    from += batchSize;
  }

  return users;
}

function buildPlan(users) {
  const byNormalized = new Map();
  const valid = [];
  const invalid = [];
  const unchanged = [];

  for (const user of users) {
    const normalized = normalizeWhatsappNumber(user.whatsapp_number);
    const entry = {
      id: user.id,
      name: user.name,
      current: user.whatsapp_number,
      normalized
    };

    if (!normalized) {
      invalid.push(entry);
      continue;
    }

    valid.push(entry);
    if (normalized === user.whatsapp_number) {
      unchanged.push(entry);
    }

    const group = byNormalized.get(normalized) ?? [];
    group.push(entry);
    byNormalized.set(normalized, group);
  }

  const conflicts = [];
  const updates = [];

  for (const group of byNormalized.values()) {
    if (group.length > 1) {
      conflicts.push(...group);
      continue;
    }

    const [entry] = group;
    if (entry.current !== entry.normalized) {
      updates.push(entry);
    }
  }

  return { valid, invalid, unchanged, conflicts, updates };
}

async function applyUpdates(updates) {
  let updatedCount = 0;

  for (const entry of updates) {
    const { error } = await supabase
      .from("users")
      .update({ whatsapp_number: entry.normalized })
      .eq("id", entry.id);

    if (error) {
      throw new Error(`Failed to update ${entry.id}: ${error.message}`);
    }

    updatedCount += 1;
    console.log(`Updated ${entry.id}: ${entry.current} -> ${entry.normalized}`);
  }

  return updatedCount;
}

function logEntries(title, entries, formatter) {
  if (entries.length === 0) return;

  console.log("");
  console.log(title);
  for (const entry of entries) {
    console.log(formatter(entry));
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const users = await fetchAllUsers(options.batchSize);
  const plan = buildPlan(users);

  console.log(`Users scanned: ${users.length}`);
  console.log(`Already normalized: ${plan.unchanged.length}`);
  console.log(`Ready to update: ${plan.updates.length}`);
  console.log(`Skipped invalid numbers: ${plan.invalid.length}`);
  console.log(`Skipped conflicts: ${plan.conflicts.length}`);

  logEntries("Planned updates:", plan.updates, (entry) => `${entry.id} | ${entry.name} | ${entry.current} -> ${entry.normalized}`);
  logEntries("Invalid numbers:", plan.invalid, (entry) => `${entry.id} | ${entry.name} | ${entry.current}`);
  logEntries("Conflicting normalized values:", plan.conflicts, (entry) => `${entry.id} | ${entry.name} | ${entry.current} -> ${entry.normalized}`);

  if (!options.apply) {
    console.log("");
    console.log("Dry run only. Re-run with --apply to write the updates.");
    return;
  }

  if (plan.conflicts.length > 0) {
    throw new Error("Resolve conflicting numbers before applying updates.");
  }

  if (plan.updates.length === 0) {
    console.log("No updates needed.");
    return;
  }

  const updatedCount = await applyUpdates(plan.updates);
  console.log(`Updated ${updatedCount} user(s).`);
}

main().catch((error) => {
  console.error(error.message);
  if (String(error.message).includes("fetch failed")) {
    console.error("Hint: this usually means Node could not establish the HTTPS connection to Supabase.");
    console.error("In this project, try running the script with NODE_OPTIONS=--use-system-ca.");
    console.error("PowerShell: $env:NODE_OPTIONS='--use-system-ca'; npm run fix:whatsapp");
  }
  process.exit(1);
});
