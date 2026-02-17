import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

// The predefined retexturing style for the Côté Mas brand.
// Users never need to write this — it is always applied automatically.
const RETEXTURE_PROMPT = `You are a fine-art photo editor working exclusively for Côté Mas, a prestigious Provençal wine estate in the south of France.

Your task is to retexture the supplied photograph so it feels like it belongs in the Côté Mas world. Apply the following treatment:

• Warm golden-hour light — bathe the scene in the soft amber and rose-gold tones of a late-afternoon sun over the Languedoc hills
• Painterly texture — add a subtle impressionistic brushstroke quality, as if the photo were gently translated into a watercolour or oil-pastel study
• Colour palette — lean into cream, warm gold (#C4933F), dusty rose (#C8687A), Mediterranean blue (#3A6B8C), and sage green (#5B7A4E)
• Atmosphere — introduce a faint haze or bokeh softness to convey warmth and languor, without obscuring the subject
• Preserve composition — keep the original subjects, faces, and layout intact; only the texture, light, and colour grading should change

Return ONLY the retextured image. Do not add text, watermarks, borders, or any other elements.`;

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

  // gemini-2.0-flash-exp-image-generation supports multimodal input + image output
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp-image-generation",
    generationConfig: {
      // @ts-expect-error — responseModalities is a valid parameter for this model
      responseModalities: ["Text", "Image"],
    },
  });

  let result;
  try {
    result = await model.generateContent([
      { text: RETEXTURE_PROMPT },
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
