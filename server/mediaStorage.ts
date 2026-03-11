/**
 * Unified media storage service.
 * Automatically uses local filesystem (self-hosted) or Replit Object Storage.
 *
 * Detection:
 *  - LOCAL_STORAGE_PATH is set          → local filesystem
 *  - PUBLIC_OBJECT_SEARCH_PATHS is set  → Replit Object Storage
 *  - Neither set                         → local filesystem at ./uploads (default)
 */
import fs from "fs";
import path from "path";
import { Response } from "express";

function getLocalStoragePath(): string {
  return process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), "uploads");
}

function isReplitStorageConfigured(): boolean {
  const paths = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
  return paths.trim().length > 0;
}

function getContentType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mp3": return "audio/mpeg";
    case "wav": return "audio/wav";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    default: return "application/octet-stream";
  }
}

export async function searchFile(filename: string): Promise<string | null> {
  if (isReplitStorageConfigured()) {
    const { ObjectStorageService } = await import("./objectStorage");
    const svc = new ObjectStorageService();
    return svc.searchPublicObject(filename);
  }

  const baseDir = getLocalStoragePath();
  const filePath = path.join(baseDir, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  for (const subdir of ["public", "audio", "images", "music"]) {
    const sub = path.join(baseDir, subdir, filename);
    if (fs.existsSync(sub)) return sub;
  }

  return null;
}

export async function streamFile(
  filePath: string,
  res: Response,
  cacheTtlSec: number = 3600
): Promise<void> {
  if (isReplitStorageConfigured()) {
    const { ObjectStorageService } = await import("./objectStorage");
    const svc = new ObjectStorageService();
    return svc.downloadObject(filePath, res, cacheTtlSec);
  }

  const contentType = getContentType(filePath);
  res.set({
    "Content-Type": contentType,
    "Cache-Control": `public, max-age=${cacheTtlSec}`,
  });

  const stream = fs.createReadStream(filePath);
  stream.on("error", (err) => {
    console.error("Local file stream error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Error streaming file" });
  });
  stream.pipe(res);
}

export async function readFileAsBytes(filePath: string): Promise<Buffer> {
  if (isReplitStorageConfigured()) {
    const { Client } = await import("@replit/object-storage");
    const client = new Client();
    const result = await client.downloadAsBytes(filePath);
    if (!result.ok || !result.value) {
      throw new Error(`Failed to download from Replit storage: ${filePath}`);
    }
    return Buffer.from(result.value as unknown as ArrayBuffer);
  }

  return fs.promises.readFile(filePath);
}

export function ensureLocalStorageExists(): void {
  if (!isReplitStorageConfigured()) {
    const dir = getLocalStoragePath();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created local uploads directory: ${dir}`);
    }
  }
}
