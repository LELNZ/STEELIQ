import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectStorageService {
  constructor() {}

  // Gets the private object directory
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Object storage needs to be configured."
      );
    }
    return dir;
  }

  // Gets the upload URL for a quote document
  async getQuoteDocumentUploadURL(rfqResponseId: number, fileName: string): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const extension = fileName.split('.').pop() || 'pdf';
    const fullPath = `${privateObjectDir}/rfq-quotes/${rfqResponseId}/${objectId}.${extension}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    // Sign URL for PUT method with TTL
    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900, // 15 minutes
    });
  }

  // Downloads an object to the response
  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      // Get file metadata
      const [metadata] = await file.getMetadata();
      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `private, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets a file object from cloud storage
  async getFile(cloudPath: string): Promise<File> {
    const { bucketName, objectName } = parseObjectPath(cloudPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error(`File not found: ${cloudPath}`);
    }
    
    return file;
  }

  // Deletes a file from cloud storage
  async deleteFile(cloudPath: string): Promise<void> {
    const { bucketName, objectName } = parseObjectPath(cloudPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    
    await file.delete();
  }

  // Upload a buffer directly to cloud storage (for server-side uploads like time clock photos)
  async uploadBuffer({
    buffer,
    mimeType,
    path,
    metadata = {},
  }: {
    buffer: Buffer;
    mimeType: string;
    path: string;
    metadata?: Record<string, string>;
  }): Promise<{ objectPath: string; signedUrl: string }> {
    const { bucketName, objectName } = parseObjectPath(path);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        ...metadata,
      },
    });

    const signedUrl = await signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec: 3600,
    });

    return { objectPath: path, signedUrl };
  }

  // Generate a signed URL for reading a file
  async getSignedReadUrl(cloudPath: string, ttlSec: number = 3600): Promise<string> {
    const { bucketName, objectName } = parseObjectPath(cloudPath);
    return signObjectURL({
      bucketName,
      objectName,
      method: "GET",
      ttlSec,
    });
  }

  // Check if a file exists
  async fileExists(cloudPath: string): Promise<boolean> {
    try {
      const { bucketName, objectName } = parseObjectPath(cloudPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      return exists;
    } catch {
      return false;
    }
  }

  // Read file contents as buffer
  async readFileAsBuffer(cloudPath: string): Promise<Buffer> {
    const { bucketName, objectName } = parseObjectPath(cloudPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [contents] = await file.download();
    return contents;
  }

  // Get upload URL for time clock photos
  async getTimeClockPhotoUploadURL(userId: number, clockType: string): Promise<{ uploadUrl: string; objectPath: string }> {
    const privateObjectDir = this.getPrivateObjectDir();
    const timestamp = Date.now();
    const objectId = randomUUID().substring(0, 8);
    const fullPath = `${privateObjectDir}/time-clock-photos/${userId}/${timestamp}_${objectId}_${clockType}.jpg`;

    const { bucketName, objectName } = parseObjectPath(fullPath);
    const uploadUrl = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });

    return { uploadUrl, objectPath: fullPath };
  }

  // Upload time clock photo directly (for base64 uploads from mobile)
  async uploadTimeClockPhoto({
    userId,
    clockType,
    buffer,
    mimeType,
    fileHash,
  }: {
    userId: number;
    clockType: string;
    buffer: Buffer;
    mimeType: string;
    fileHash: string;
  }): Promise<{ objectPath: string; signedUrl: string }> {
    const privateObjectDir = this.getPrivateObjectDir();
    const timestamp = Date.now();
    const objectId = randomUUID().substring(0, 8);
    const extension = mimeType.includes('png') ? 'png' : 'jpg';
    const fullPath = `${privateObjectDir}/time-clock-photos/${userId}/${timestamp}_${objectId}_${clockType}.${extension}`;

    return this.uploadBuffer({
      buffer,
      mimeType: `image/${extension}`,
      path: fullPath,
      metadata: {
        'x-steeliq-user-id': userId.toString(),
        'x-steeliq-clock-type': clockType,
        'x-steeliq-file-hash': fileHash,
        'x-steeliq-upload-time': new Date().toISOString(),
      },
    });
  }
}

function parseObjectPath(path: string): {
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

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}