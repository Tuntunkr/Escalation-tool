import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { UPLOAD_ROOT } from "../lib/paths.js";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;

export async function saveVocFiles(
  escalationId: string,
  files: File[]
): Promise<
  Array<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
  }>
> {
  if (files.length > MAX_FILES) {
    throw new Error(`Max ${MAX_FILES} files allowed`);
  }

  const dir = join(UPLOAD_ROOT, "voc", escalationId);
  await mkdir(dir, { recursive: true });

  const saved = [];
  for (const file of files) {
    if (!ALLOWED.has(file.type) && !file.type.startsWith("image/")) {
      throw new Error(`File type not allowed: ${file.type || file.name}`);
    }
    if (file.size > MAX_BYTES) {
      throw new Error(`${file.name} exceeds 10 MB`);
    }

    const ext = extname(file.name).toLowerCase() || ".bin";
    const safe = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
    const diskPath = join(dir, safe);
    await writeFile(diskPath, Buffer.from(await file.arrayBuffer()));

    saved.push({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storagePath: `/uploads/voc/${escalationId}/${safe}`,
    });
  }

  return saved;
}

export function collectFilesFromBody(body: Record<string, unknown>): File[] {
  const files: File[] = [];
  const raw = body.files ?? body.voc ?? body.file;
  if (!raw) return files;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (item instanceof File) files.push(item);
    }
  } else if (raw instanceof File) {
    files.push(raw);
  }
  return files;
}
