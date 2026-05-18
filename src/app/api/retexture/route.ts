import OpenAI, { toFile } from "openai";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const RETEXTURE_PROMPT =
  "You are given two input images. " +
  "Image 1 is the STYLE REFERENCE: a painterly Provençal / Saint-Tropez illustration in colored-pencil and pastel texture, with a warm saturated Mediterranean palette (deep pinks, lavenders, ochre yellows, sea blues) and visible paper grain. " +
  "Image 2 is the USER PHOTOGRAPH. Its subject, composition, framing, and proportions must be preserved exactly — do not change what it depicts or where things sit in the frame. " +
  "Re-render image 2 in the artistic style of image 1: match its brushwork, palette, linework, and texture. Output the stylized version of image 2 only. Do not add words, captions, watermarks, signatures, or text of any kind.";

const REF_PATH = path.join(process.cwd(), "public", "style-reference.jpg");
const REF_BUFFER = fs.readFileSync(REF_PATH);

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY environment variable is not set." },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data." },
      { status: 400 }
    );
  }

  const file = formData.get("image") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No image file provided." }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a JPEG, PNG, WebP, or GIF." },
      { status: 400 }
    );
  }

  const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 8 MB." },
      { status: 400 }
    );
  }

  const userBuffer = Buffer.from(await file.arrayBuffer());

  const client = new OpenAI({ apiKey });

  let result;
  try {
    result = await client.images.edit({
      model: "gpt-image-2-2026-04-21",
      image: [
        await toFile(REF_BUFFER, "style-reference.jpg", { type: "image/jpeg" }),
        await toFile(userBuffer, "user-photo", { type: file.type }),
      ],
      prompt: RETEXTURE_PROMPT,
      size: "1536x1024",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown OpenAI API error.";
    return NextResponse.json({ error: `OpenAI API error: ${message}` }, { status: 502 });
  }

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    return NextResponse.json(
      { error: "Retexturing failed: no image returned." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    image: b64,
    mimeType: "image/png",
  });
}
