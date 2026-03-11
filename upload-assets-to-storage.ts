// Script to upload all attached_assets to object storage
import { objectStorageClient } from './server/objectStorage.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUCKET_ID = 'replit-objstore-c130fddd-8682-41ac-93a1-7eada20b5c8b';
const ATTACHED_ASSETS_DIR = path.join(__dirname, 'attached_assets');

async function uploadFile(localPath: string, objectName: string) {
  const bucket = objectStorageClient.bucket(BUCKET_ID);
  const file = bucket.file(`public/${objectName}`);
  
  try {
    await bucket.upload(localPath, {
      destination: `public/${objectName}`,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
    console.log(`✅ Uploaded: ${objectName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to upload ${objectName}:`, error);
    return false;
  }
}

async function uploadAllAssets() {
  const files = fs.readdirSync(ATTACHED_ASSETS_DIR);
  
  // Filter for images, audio, and video files
  const assetsToUpload = files.filter(file => 
    /\.(jpg|jpeg|png|webp|mp3|mp4)$/i.test(file)
  );
  
  console.log(`\n📤 Uploading ${assetsToUpload.length} files to object storage...\n`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const file of assetsToUpload) {
    const localPath = path.join(ATTACHED_ASSETS_DIR, file);
    const success = await uploadFile(localPath, file);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n✨ Upload complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
}

uploadAllAssets().catch(console.error);
