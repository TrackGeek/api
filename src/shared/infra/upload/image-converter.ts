import sharp from "sharp";

export const WEBP_CONTENT_TYPE = "image/webp";
export const DEFAULT_WEBP_QUALITY = 82;

export async function convertImageToWebp(buffer: Buffer, quality = DEFAULT_WEBP_QUALITY): Promise<Buffer> {
  return sharp(buffer, { animated: true }).rotate().webp({ quality, effort: 4 }).toBuffer();
}
