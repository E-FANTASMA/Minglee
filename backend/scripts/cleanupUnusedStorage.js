import "../src/env.js";
import { supabase } from "../src/supabase.js";

const DEFAULT_BUCKET = process.env.SUPABASE_USER_PHOTOS_BUCKET || "user-photos";
const DEFAULT_BATCH_SIZE = 100;

function parseArgs(argv) {
  const options = {
    bucket: DEFAULT_BUCKET,
    delete: false,
    prefix: null,
    batchSize: DEFAULT_BATCH_SIZE
  };

  for (const arg of argv) {
    if (arg === "--delete") {
      options.delete = true;
      continue;
    }

    if (arg.startsWith("--bucket=")) {
      options.bucket = arg.slice("--bucket=".length);
      continue;
    }

    if (arg.startsWith("--prefix=")) {
      options.prefix = arg.slice("--prefix=".length);
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

function getStoragePathFromUrl(imageUrl, bucket) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const publicPrefix = `/storage/v1/object/public/${bucket}/`;

    if (!url.pathname.startsWith(publicPrefix)) return null;
    return decodeURIComponent(url.pathname.slice(publicPrefix.length));
  } catch {
    return null;
  }
}

async function fetchAllUsedPaths(bucket) {
  const usedPaths = new Set();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("user_photos")
      .select("image_url")
      .range(from, to);

    if (error) {
      throw new Error(`Failed to read user_photos: ${error.message}`);
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      const storagePath = getStoragePathFromUrl(row.image_url, bucket);
      if (storagePath) usedPaths.add(storagePath);
    }

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return usedPaths;
}

async function fetchAllBucketObjects(bucket, prefix) {
  const normalizedPrefix = prefix?.replace(/^\/+|\/+$/g, "") ?? "";
  const startPath = normalizedPrefix;
  const objects = [];

  async function listFolder(folderPath) {
    let offset = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(folderPath, {
        limit: pageSize,
        offset,
        sortBy: { column: "name", order: "asc" }
      });

      if (error) {
        throw new Error(`Failed to list storage bucket: ${error.message}`);
      }

      if (!data || data.length === 0) break;

      for (const item of data) {
        const fullPath = folderPath ? `${folderPath}/${item.name}` : item.name;

        if (item.id === null) {
          await listFolder(fullPath);
          continue;
        }

        objects.push({
          id: item.id,
          name: fullPath,
          created_at: item.created_at
        });
      }

      if (data.length < pageSize) break;
      offset += pageSize;
    }
  }

  await listFolder(startPath);
  return objects;
}

function buildPublicUrl(bucket, storagePath) {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  return `${baseUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
}

async function removeInBatches(bucket, paths, batchSize) {
  let deletedCount = 0;

  for (let index = 0; index < paths.length; index += batchSize) {
    const batch = paths.slice(index, index + batchSize);
    const { data, error } = await supabase.storage.from(bucket).remove(batch);

    if (error) {
      throw new Error(`Failed to delete batch starting at ${index + 1}: ${error.message}`);
    }

    deletedCount += data?.length ?? batch.length;
    console.log(`Deleted batch ${Math.floor(index / batchSize) + 1}: ${batch.length} object(s)`);
  }

  return deletedCount;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const usedPaths = await fetchAllUsedPaths(options.bucket);
  const bucketObjects = await fetchAllBucketObjects(options.bucket, options.prefix);

  const unusedObjects = bucketObjects.filter((object) => !usedPaths.has(object.name));

  console.log(`Bucket: ${options.bucket}`);
  console.log(`Used paths referenced in user_photos: ${usedPaths.size}`);
  console.log(`Objects found in bucket${options.prefix ? ` with prefix "${options.prefix}"` : ""}: ${bucketObjects.length}`);
  console.log(`Unused objects: ${unusedObjects.length}`);

  if (unusedObjects.length === 0) {
    console.log("No unused storage objects found.");
    return;
  }

  for (const object of unusedObjects) {
    console.log(`${object.name} | ${object.created_at} | ${buildPublicUrl(options.bucket, object.name)}`);
  }

  if (!options.delete) {
    console.log("");
    console.log("Dry run only. Re-run with --delete to remove these files.");
    return;
  }

  const deletedCount = await removeInBatches(
    options.bucket,
    unusedObjects.map((object) => object.name),
    options.batchSize
  );

  console.log(`Deleted ${deletedCount} unused object(s).`);
}

main().catch((error) => {
  console.error(error.message);
  if (String(error.message).includes("fetch failed")) {
    console.error("Hint: this usually means Node could not establish the HTTPS connection to Supabase.");
    console.error("In this project, try running the script with NODE_OPTIONS=--use-system-ca.");
    console.error("PowerShell: $env:NODE_OPTIONS='--use-system-ca'; npm run cleanup:storage");
  }
  process.exit(1);
});
