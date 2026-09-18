import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MediaAsset, MediaProcessingStatus } from '../src/types.js';
import { db } from './db.js';

export interface ValidatedMediaFile {
  buffer: Buffer;
  detectedMime: string;
  extension: string;
  mediaType: 'image' | 'diagram' | 'audio';
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  checksum: string;
}

export class MediaSecurityService {
  private static readonly MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
  private static readonly MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB
  private static readonly MAX_DIMENSION = 8192; // 8K max width/height

  private static readonly STORAGE_ROOT = path.resolve(process.cwd(), 'storage', 'media');

  /**
   * Validates file signature (magic bytes) and extracts dimensions/metadata.
   * Strictly rejects SVG, HTML, executable polyglots, and unsupported extensions.
   */
  public static validateBuffer(buffer: Buffer, clientMime?: string): ValidatedMediaFile {
    if (!buffer || buffer.length === 0) {
      throw new Error('INVALID_MEDIA: Empty file buffer provided.');
    }

    // Magic bytes detection
    const mime = this.detectMagicBytes(buffer);
    if (!mime) {
      throw new Error('INVALID_MEDIA: Unsupported or unverified file signature (magic bytes mismatch).');
    }

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    if (mime.startsWith('image/')) {
      if (buffer.length > this.MAX_IMAGE_BYTES) {
        throw new Error(`OVERSIZED_MEDIA: Image exceeds limit of ${this.MAX_IMAGE_BYTES / (1024 * 1024)}MB.`);
      }

      const dimensions = this.extractImageDimensions(buffer, mime);
      if (dimensions) {
        if (dimensions.width > this.MAX_DIMENSION || dimensions.height > this.MAX_DIMENSION) {
          throw new Error(`PIXEL_FLOOD_DETECTED: Dimensions ${dimensions.width}x${dimensions.height} exceed safety cap of ${this.MAX_DIMENSION}px.`);
        }
      }

      const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';

      return {
        buffer,
        detectedMime: mime,
        extension: ext,
        mediaType: 'image', // default to image, can be refined to diagram during analysis
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
        durationSeconds: null,
        checksum,
      };
    } else if (mime.startsWith('audio/')) {
      if (buffer.length > this.MAX_AUDIO_BYTES) {
        throw new Error(`OVERSIZED_MEDIA: Audio file exceeds limit of ${this.MAX_AUDIO_BYTES / (1024 * 1024)}MB.`);
      }

      const ext = mime === 'audio/wav' ? 'wav' : mime === 'audio/ogg' ? 'ogg' : 'mp3';

      return {
        buffer,
        detectedMime: mime,
        extension: ext,
        mediaType: 'audio',
        width: null,
        height: null,
        durationSeconds: null,
        checksum,
      };
    }

    throw new Error(`UNSUPPORTED_MEDIA_TYPE: Detected type '${mime}' is not authorized.`);
  }

  /**
   * Detects MIME type via magic bytes inspection.
   */
  private static detectMagicBytes(buf: Buffer): string | null {
    if (buf.length < 12) return null;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a
    ) {
      return 'image/png';
    }

    // JPEG: FF D8 FF
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return 'image/jpeg';
    }

    // WEBP: 'RIFF' .... 'WEBP'
    if (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50
    ) {
      return 'image/webp';
    }

    // WAV: 'RIFF' .... 'WAVE'
    if (
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x41 &&
      buf[10] === 0x56 &&
      buf[11] === 0x45
    ) {
      return 'audio/wav';
    }

    // OGG: 'OggS'
    if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) {
      return 'audio/ogg';
    }

    // MP3 with ID3v2 header: 'ID3'
    if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
      return 'audio/mpeg';
    }

    // MP3 raw frame sync: 11 bits set (0xFF followed by 0xFB, 0xF3, 0xF2)
    if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
      return 'audio/mpeg';
    }

    return null;
  }

  /**
   * Binary dimension header extraction for PNG and JPEG without heavy external dependencies.
   */
  private static extractImageDimensions(buf: Buffer, mime: string): { width: number; height: number } | null {
    try {
      if (mime === 'image/png' && buf.length >= 24) {
        // PNG IHDR is at offset 12; width at 16 (4 bytes big-endian), height at 20 (4 bytes)
        const width = buf.readUInt32BE(16);
        const height = buf.readUInt32BE(20);
        return { width, height };
      }

      if (mime === 'image/jpeg') {
        let offset = 2;
        while (offset < buf.length - 8) {
          if (buf[offset] !== 0xff) {
            offset++;
            continue;
          }
          const marker = buf[offset + 1];
          // SOF0 (0xC0) or SOF2 (0xC2) markers contain dimensions
          if (marker === 0xc0 || marker === 0xc2) {
            const height = buf.readUInt16BE(offset + 5);
            const width = buf.readUInt16BE(offset + 7);
            return { width, height };
          }
          // Move to next marker
          const length = buf.readUInt16BE(offset + 2);
          offset += 2 + length;
        }
      }

      if (mime === 'image/webp' && buf.length >= 30) {
        // Simple VP8 / VP8L parsing
        // VP8L: 14 bytes header, byte 21 has signature 0x2f
        if (buf.slice(12, 16).toString('ascii') === 'VP8L' && buf[20] === 0x2f) {
          const b0 = buf[21];
          const b1 = buf[22];
          const b2 = buf[23];
          const b3 = buf[24];
          const width = 1 + (((b1 & 0x3f) << 8) | b0);
          const height = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
          return { width, height };
        }
      }
    } catch {
      // Gracefully fall back if image headers are malformed or non-standard
    }
    return null;
  }

  /**
   * Sanitizes user-supplied filenames to prevent path traversal and injection.
   */
  public static sanitizeFilename(originalFilename: string, safeExt: string): string {
    const base = path.basename(originalFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const safeBase = base.slice(0, 50).replace(/\.[^.]+$/, '');
    return `${safeBase || 'media'}_${crypto.randomUUID().slice(0, 8)}.${safeExt}`;
  }

  /**
   * Stores buffer securely under project directory and writes asset record.
   */
  public static async storeMediaAsset(params: {
    projectId: string;
    spaceId: string;
    ownerUserId: string;
    originalFilename: string;
    buffer: Buffer;
    clientMime?: string;
  }): Promise<MediaAsset> {
    const validated = this.validateBuffer(params.buffer, params.clientMime);
    const mediaId = `med_${crypto.randomUUID().slice(0, 12)}`;
    const safeFilename = this.sanitizeFilename(params.originalFilename, validated.extension);

    const projectDir = path.join(this.STORAGE_ROOT, params.projectId);
    fs.mkdirSync(projectDir, { recursive: true });

    const storagePath = path.join(projectDir, `${mediaId}.${validated.extension}`);
    fs.writeFileSync(storagePath, validated.buffer);

    const asset: MediaAsset = {
      id: mediaId,
      ownerUserId: params.ownerUserId,
      spaceId: params.spaceId,
      projectId: params.projectId,
      filename: safeFilename,
      mimeType: validated.detectedMime,
      fileSize: validated.buffer.length,
      storagePath,
      checksum: validated.checksum,
      width: validated.width,
      height: validated.height,
      durationSeconds: validated.durationSeconds,
      mediaType: validated.mediaType,
      processingStatus: 'UPLOADED',
      processingError: null,
      metadata: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.mediaAssets.set(mediaId, asset);
    return asset;
  }

  /**
   * Retrieves a media asset, verifying strict project and ownership isolation.
   */
  public static getMediaAsset(params: {
    mediaId: string;
    projectId: string;
    userId: string;
  }): { asset: MediaAsset; buffer: Buffer } {
    const asset = db.mediaAssets.get(params.mediaId);
    if (!asset) {
      throw new Error('MEDIA_NOT_FOUND: Media asset does not exist.');
    }

    if (asset.projectId !== params.projectId) {
      throw new Error('CROSS_PROJECT_FORBIDDEN: Asset belongs to another project.');
    }

    if (asset.ownerUserId !== params.userId) {
      throw new Error('UNAUTHORIZED_ACCESS: Asset owner mismatch.');
    }

    if (!fs.existsSync(asset.storagePath)) {
      throw new Error('STORAGE_ERROR: Binary file missing from disk.');
    }

    const buffer = fs.readFileSync(asset.storagePath);
    return { asset, buffer };
  }
}
