import { db } from "./db";
import { songs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { objectStorageClient } from "./objectStorage";
import * as fs from "fs";
import * as path from "path";

async function migrateAudioFiles() {
  console.log("Starting audio file migration to object storage...\n");

  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) {
    throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  }

  const bucket = objectStorageClient.bucket(bucketId);

  const allSongs = await db.select().from(songs);
  console.log(`Found ${allSongs.length} songs in database\n`);

  let uploaded = 0;
  let failed = 0;

  for (const song of allSongs) {
    try {
      if (!song.audioUrl) {
        console.log(`⚠️  Song ${song.id} has no audioUrl, skipping...`);
        failed++;
        continue;
      }

      const originalPath = song.audioUrl.replace(/^\//, "");
      const localFilePath = path.join(process.cwd(), originalPath);

      if (!fs.existsSync(localFilePath)) {
        console.log(`⚠️  File not found: ${localFilePath}`);
        failed++;
        continue;
      }

      const fileName = path.basename(originalPath);
      const objectPath = `public/${fileName}`;

      console.log(`Uploading: ${song.title} (${fileName})...`);

      await bucket.upload(localFilePath, {
        destination: objectPath,
        metadata: {
          contentType: "audio/wav",
          cacheControl: "public, max-age=31536000",
        },
      });

      const newAudioUrl = `/public-objects/${fileName}`;

      await db
        .update(songs)
        .set({ audioUrl: newAudioUrl })
        .where(eq(songs.id, song.id));

      console.log(`✅ Success: ${song.title}`);
      console.log(`   Old URL: ${song.audioUrl}`);
      console.log(`   New URL: ${newAudioUrl}\n`);
      uploaded++;
    } catch (error) {
      console.error(`❌ Error uploading ${song.title}:`, error);
      failed++;
    }
  }

  console.log("\n=================================");
  console.log("Migration Complete!");
  console.log(`✅ Uploaded: ${uploaded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log("=================================\n");
}

migrateAudioFiles()
  .then(() => {
    console.log("Migration script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
