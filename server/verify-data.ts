import { db } from "./db";
import { songs, merchandise } from "@shared/schema";
import { eq } from "drizzle-orm";

async function verifyDataIntegrity() {
  console.log("🔍 Verifying data integrity...\n");

  try {
    const allSongs = await db.select().from(songs);
    const allMerch = await db.select().from(merchandise);

    console.log(`📊 Database Stats:`);
    console.log(`   Total songs: ${allSongs.length}`);
    console.log(`   Total merchandise: ${allMerch.length}\n`);

    const featuredSongs = allSongs.filter(s => s.featured === 1);
    const catalogSongs = allSongs.filter(s => s.featured === 0);

    console.log(`🎵 Songs Breakdown:`);
    console.log(`   Featured (tracks 1-13): ${featuredSongs.length} songs`);
    console.log(`   Catalog (tracks 14+): ${catalogSongs.length} songs\n`);

    if (featuredSongs.length !== 13) {
      console.error(`❌ ERROR: Expected 13 featured songs, found ${featuredSongs.length}`);
      console.log(`   Featured songs found: ${featuredSongs.map(s => `${s.trackNumber}. ${s.title}`).join(', ')}\n`);
    } else {
      console.log(`✅ Featured songs count correct (13)\n`);
    }

    const tracks1to13 = allSongs.filter(s => s.trackNumber >= 1 && s.trackNumber <= 13);
    const incorrectFeatured = tracks1to13.filter(s => s.featured !== 1);
    
    if (incorrectFeatured.length > 0) {
      console.error(`❌ ERROR: Tracks 1-13 should all be featured=1`);
      console.log(`   Tracks with incorrect featured flag:`);
      incorrectFeatured.forEach(s => {
        console.log(`   - Track ${s.trackNumber}: ${s.title} (featured=${s.featured})`);
      });
      console.log();
    } else {
      console.log(`✅ All tracks 1-13 are correctly marked as featured\n`);
    }

    console.log(`🛍️  Merchandise Breakdown:`);
    const merchWithImages = allMerch.filter(m => m.imageUrl !== null);
    const merchWithoutImages = allMerch.filter(m => m.imageUrl === null);
    
    console.log(`   With images: ${merchWithImages.length}`);
    console.log(`   Without images: ${merchWithoutImages.length}\n`);

    if (merchWithoutImages.length > 0) {
      console.warn(`⚠️  WARNING: Some merchandise items are missing images:`);
      merchWithoutImages.forEach(m => {
        console.log(`   - ${m.name}`);
      });
      console.log();
    } else {
      console.log(`✅ All merchandise items have images\n`);
    }

    console.log(`✨ Data verification complete!`);
    
  } catch (error) {
    console.error("❌ Error verifying data:", error);
    process.exit(1);
  }
}

verifyDataIntegrity().catch(console.error);
