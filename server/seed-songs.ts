import { db } from "./db";
import { songs } from "@shared/schema";

const greatAttractorTracks = [
  { trackNumber: 1, title: "Go", audioUrl: "/attached_assets/1 - Shakim & Project DNA - Go_1759614436287.wav", featured: 1 },
  { trackNumber: 2, title: "That Guy", audioUrl: "/attached_assets/2 - Shakim & Project DNA - That Guy_1759614436288.wav", featured: 1 },
  { trackNumber: 3, title: "My Home", audioUrl: "/attached_assets/3 - Shakim & Project DNA - My Home_1759614436288.wav", featured: 1 },
  { trackNumber: 4, title: "Celebrate", audioUrl: "/attached_assets/4 - Shakim & Project DNA - Celebrate_1759614469272.wav", featured: 1 },
  { trackNumber: 5, title: "CountyLine Rd", audioUrl: "/attached_assets/5 - Shakim & Project DNA - CountyLine Rd_1759614469273.wav", featured: 1 },
  { trackNumber: 6, title: "I Won't Give Up", audioUrl: "/attached_assets/6 - Shakim & Project DNA - I Won't Give Up_1759614469273.wav", featured: 1 },
  { trackNumber: 7, title: "I Won't Let You", audioUrl: "/attached_assets/7 - Shakim & Project DNA - I Won't Let You_1759614514902.wav", featured: 1 },
  { trackNumber: 8, title: "Love Take Over", audioUrl: "/attached_assets/8 - Shakim & Project DNA - Love Take Over_1759614514903.wav", featured: 1 },
  { trackNumber: 9, title: "Take Control", audioUrl: "/attached_assets/9 - Shakim & Project DNA - Take Control_1759614514904.wav", featured: 1 },
  { trackNumber: 10, title: "Say Something 2 Me", audioUrl: "/attached_assets/10 - Shakim & Project DNA - Say Something 2 Me_1759614561710.wav", featured: 1 },
  { trackNumber: 11, title: "No Mor", audioUrl: "/attached_assets/11 - Shakim & Project DNA - No Mor_1759614561711.wav", featured: 1 },
  { trackNumber: 12, title: "HighLight of My Life", audioUrl: "/attached_assets/12 - Shakim & Project DNA - HighLight of My Life_1759614561712.wav", featured: 1 },
  { trackNumber: 13, title: "Abstract Luv", audioUrl: "/attached_assets/13 - Shakim & Project DNA - Abstract Luv_1759614606314.wav", featured: 1 },
];

async function seedSongs() {
  console.log("Seeding songs...");
  
  for (const track of greatAttractorTracks) {
    await db.insert(songs).values({
      title: track.title,
      artist: "Shakim & Project DNA",
      album: "The Great Attractor",
      trackNumber: track.trackNumber,
      audioUrl: track.audioUrl,
      price: "0.99",
      featured: track.featured,
    });
    console.log(`✓ Added: Track ${track.trackNumber} - ${track.title}`);
  }
  
  console.log("✓ All songs seeded successfully!");
}

seedSongs().catch(console.error);
