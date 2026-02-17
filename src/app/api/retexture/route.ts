import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const RETEXTURE_PROMPT =
  "restylize this exact photograph in the painterly style of the attached image reference. Do not add words or text of any kind.";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY environment variable is not set." },
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

  const bytes = await file.arrayBuffer();
  const base64Data = Buffer.from(bytes).toString("base64");

  const genAI = new GoogleGenerativeAI(apiKey);

  // gemini-3-pro-image-preview supports multimodal input + image output
  const model = genAI.getGenerativeModel({
    model: "gemini-3-pro-image-preview",
    generationConfig: {
      // @ts-expect-error — responseModalities is a valid parameter for this model
      responseModalities: ["Text", "Image"],
    },
  });

  const refImagePath = path.join(process.cwd(), "public", "style-reference.jpg");
  const refImageData = fs.readFileSync(refImagePath).toString("base64");

  let result;
  try {
    result = await model.generateContent([
      { text: RETEXTURE_PROMPT },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: refImageData,
        },
      },
      {
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      },
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Gemini API error.";
    return NextResponse.json({ error: `Gemini API error: ${message}` }, { status: 502 });
  }

  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));

  if (!imagePart?.inlineData) {
    // Surface any text the model returned for debugging
    const textPart = parts.find((p) => p.text)?.text ?? "No image returned.";
    return NextResponse.json(
      { error: `Retexturing failed: ${textPart}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    image: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  });
}
