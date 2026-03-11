// Object Storage Service for serving public audio files
// Using Replit's official @replit/object-storage SDK
import { Client } from "@replit/object-storage";
import { Response } from "express";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private client: Client;

  constructor() {
    // Replit SDK automatically handles authentication in dev and production
    this.client = new Client();
  }

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      console.warn(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Object storage will not be available. " +
          "Create a bucket in 'Object Storage' tool and set PUBLIC_OBJECT_SEARCH_PATHS env var."
      );
      return [];
    }
    return paths;
  }

  parseObjectPath(path: string): {
    bucketName: string;
    objectName: string;
  } {
    if (!path.startsWith("/")) {
      path = `/${path}`;
    }
    const pathParts = path.split("/");
    if (pathParts.length < 3) {
      throw new Error("Invalid path: must contain at least a bucket name");
    }

    const bucketName = pathParts[1];
    const objectName = pathParts.slice(2).join("/");

    return {
      bucketName,
      objectName,
    };
  }

  async searchPublicObject(filePath: string): Promise<string | null> {
    const searchPaths = this.getPublicObjectSearchPaths();
    
    // Check each search path using list() with exact prefix match
    for (const searchPath of searchPaths) {
      const fullPath = `${searchPath}/${filePath}`;
      const { objectName } = this.parseObjectPath(fullPath);
      
      try {
        // Use list() with exact object name to check existence
        // This is lightweight and doesn't download the file
        const result = await this.client.list({
          prefix: objectName,
          maxResults: 1
        });
        
        if (result.ok && result.value && result.value.length > 0) {
          // Check if the exact file exists (not just a prefix match)
          const exactMatch = result.value.find(obj => obj.name === objectName);
          if (exactMatch) {
            return objectName;
          }
        }
      } catch (error: any) {
        console.error(`Error checking existence in ${searchPath}:`, error);
        continue;
      }
    }

    return null;
  }

  async downloadObject(objectPath: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      // Determine content type based on file extension
      let contentType = "application/octet-stream";
      if (objectPath.endsWith('.wav')) {
        contentType = "audio/wav";
      } else if (objectPath.endsWith('.mp3')) {
        contentType = "audio/mpeg";
      } else if (objectPath.endsWith('.jpg') || objectPath.endsWith('.jpeg')) {
        contentType = "image/jpeg";
      } else if (objectPath.endsWith('.png')) {
        contentType = "image/png";
      }

      // Set appropriate headers
      res.set({
        "Content-Type": contentType,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      // Use streaming for efficient large file handling
      const stream = this.client.downloadAsStream(objectPath);

      // Handle stream errors
      stream.on('error', (error: any) => {
        console.error("Stream error:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      // Pipe the stream directly to the response
      stream.pipe(res);
    } catch (error: any) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
}
