"use client";

import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "idle" | "crop" | "processing" | "result" | "error";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dataURLFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function isValidImage(file: File) {
  return ACCEPTED.includes(file.type) && file.size <= 8 * 1024 * 1024;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function getCroppedCanvas(
  imageSrc: string,
  pixelCrop: Area
): Promise<HTMLCanvasElement> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return canvas;
}

async function compositeWithFrame(generatedDataURL: string): Promise<string> {
  const [genImg, frameImg] = await Promise.all([
    loadImage(generatedDataURL),
    loadImage("/CoteMasFrame.png"),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = frameImg.naturalWidth;
  canvas.height = frameImg.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  // Generated image fills the canvas behind the frame
  ctx.drawImage(genImg, 0, 0, canvas.width, canvas.height);
  // Frame sits on top, untouched
  ctx.drawImage(frameImg, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.95);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex flex-col items-center gap-1 select-none">
      {/* Thin decorative rule */}
      <div className="flex items-center gap-3 w-full justify-center">
        <span className="h-px w-12 bg-cm-gold/50" />
        <span className="text-cm-gold text-[10px] tracking-[0.35em] uppercase font-sans">
          Domaines Paul Mas
        </span>
        <span className="h-px w-12 bg-cm-gold/50" />
      </div>
      <h1 className="font-serif text-4xl sm:text-5xl text-cm-charcoal tracking-tight">
        Côté Mas
      </h1>
    </div>
  );
}

function LeafDivider() {
  return (
    <div className="flex items-center gap-3 text-cm-gold/60 my-6 select-none">
      <span className="h-px flex-1 bg-cm-gold/25" />
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 0 0 8 20C19 20 22 3 22 3c-1 2-8 2-8 8" />
      </svg>
      <span className="h-px flex-1 bg-cm-gold/25" />
    </div>
  );
}

// ─── Upload zone ──────────────────────────────────────────────────────────────

interface UploadZoneProps {
  onFile: (file: File) => void;
}

function UploadZone({ onFile }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && isValidImage(file)) onFile(file);
    },
    [onFile]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidImage(file)) onFile(file);
  };

  return (
    <div
      className={`upload-zone flex flex-col items-center justify-center gap-5 p-10 sm:p-16 text-center${
        dragging ? " dragging" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleChange}
      />

      {/* Upload icon */}
      <div className="w-16 h-16 rounded-full bg-cm-gold/10 flex items-center justify-center border border-cm-gold/30">
        <svg
          className="w-7 h-7 text-cm-gold"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
      </div>

      <div>
        <p className="font-serif text-xl text-cm-charcoal">
          Drop your photograph here
        </p>
        <p className="text-sm text-cm-stone mt-1">
          or{" "}
          <span className="text-cm-gold underline underline-offset-2">
            click to browse
          </span>
        </p>
        <p className="text-xs text-cm-stone/70 mt-3">
          JPEG · PNG · WebP &nbsp;·&nbsp; up to 8 MB
        </p>
      </div>
    </div>
  );
}

// ─── Crop view ────────────────────────────────────────────────────────────────

interface CropViewProps {
  src: string;
  onConfirm: (blob: Blob, croppedDataURL: string) => void;
  onCancel: () => void;
}

function CropView({ src, onConfirm, onCancel }: CropViewProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [frameAspect, setFrameAspect] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadImage("/CoteMasFrame.png").then((img) => {
      setFrameAspect(img.naturalWidth / img.naturalHeight);
    });
  }, []);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setConfirming(true);
    try {
      const canvas = await getCroppedCanvas(src, croppedAreaPixels);
      const dataURL = canvas.toDataURL("image/jpeg", 0.92);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error("Canvas export failed")),
          "image/jpeg",
          0.92
        )
      );
      onConfirm(blob, dataURL);
    } catch {
      setConfirming(false);
    }
  };

  return (
    <div className="fade-up w-full space-y-5">
      <div className="result-card overflow-hidden">
        <div className="bg-cm-cream-dark px-4 py-2 border-b border-cm-cream-dark">
          <p className="text-xs tracking-widest uppercase text-cm-stone font-sans">
            Position your photograph
          </p>
        </div>

        {/* Cropper area */}
        <div className="relative w-full h-[420px] bg-black">
          {frameAspect !== null ? (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={frameAspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="spinner" />
            </div>
          )}
        </div>

        {/* Zoom slider */}
        <div className="px-4 py-3 bg-cm-cream-dark flex items-center gap-3">
          <span className="text-xs text-cm-stone uppercase tracking-wider shrink-0">
            Zoom
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 cursor-pointer"
          />
        </div>
      </div>

      <p className="text-xs text-cm-stone/60 text-center">
        Drag to reposition · scroll or use the slider to zoom
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={handleConfirm}
          disabled={confirming || frameAspect === null}
          className="btn-primary"
        >
          {confirming ? "Preparing…" : "Apply Côté Mas style"}
        </button>
        <button
          onClick={onCancel}
          className="px-8 py-3 rounded-full border border-cm-stone/30 text-cm-stone hover:bg-cm-stone/5 transition-all duration-200 active:scale-95"
        >
          Choose a different photo
        </button>
      </div>
    </div>
  );
}

// ─── Before / After display ──────────────────────────────────────────────────

interface ResultProps {
  original: string;
  retextured: string;
  onReset: () => void;
}

function ResultView({ original, retextured, onReset }: ResultProps) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = retextured;
    a.download = "cote-mas-edition.jpg";
    a.click();
  };

  return (
    <div className="fade-up w-full space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="result-card">
          <div className="bg-cm-cream-dark px-4 py-2 border-b border-cm-cream-dark">
            <p className="text-xs tracking-widest uppercase text-cm-stone font-sans">
              Original
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={original}
            alt="Original photograph"
            className="w-full object-cover max-h-[420px]"
          />
        </div>

        <div className="result-card">
          <div className="bg-cm-gold/10 px-4 py-2 border-b border-cm-gold/20">
            <p className="text-xs tracking-widest uppercase text-cm-gold font-sans">
              Côté Mas Edition
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={retextured}
            alt="Retextured photograph"
            className="w-full object-cover max-h-[420px]"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button onClick={handleDownload} className="btn-primary">
          Download your edition
        </button>
        <button
          onClick={onReset}
          className="px-8 py-3 rounded-full border border-cm-gold/50 text-cm-gold font-semibold hover:bg-cm-gold/5 transition-all duration-200 active:scale-95"
        >
          Try another photo
        </button>
      </div>
    </div>
  );
}

// ─── Processing spinner ───────────────────────────────────────────────────────

function ProcessingView() {
  return (
    <div className="fade-up flex flex-col items-center gap-6 py-16">
      <div className="spinner" />
      <div className="text-center space-y-1">
        <p className="font-serif text-xl text-cm-charcoal">
          Painting your Provençal edition…
        </p>
        <p className="text-sm text-cm-stone">
          Our artists are adding the warmth of the south of France.
        </p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [rawDataURL, setRawDataURL] = useState<string>("");
  const [originalDataURL, setOriginalDataURL] = useState<string>("");
  const [retexturedDataURL, setRetexturedDataURL] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleFile = async (file: File) => {
    const dataURL = await dataURLFromFile(file);
    setRawDataURL(dataURL);
    setStage("crop");
  };

  const handleCropConfirm = async (blob: Blob, croppedDataURL: string) => {
    setOriginalDataURL(croppedDataURL);
    setStage("processing");
    setErrorMessage("");

    const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("image", file);

    try {
      const res = await fetch("/api/retexture", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Retexturing failed.");
      }

      const generatedDataURL = `data:${data.mimeType};base64,${data.image}`;
      const composited = await compositeWithFrame(generatedDataURL);
      setRetexturedDataURL(composited);
      setStage("result");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  };

  const handleReset = () => {
    setStage("idle");
    setRawDataURL("");
    setOriginalDataURL("");
    setRetexturedDataURL("");
    setErrorMessage("");
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Soft decorative background blobs */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      >
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-cm-gold/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-24 w-[500px] h-[500px] bg-cm-rose/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-cm-blue/5 rounded-full blur-3xl" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 pt-12 pb-4 text-center px-6">
        <Logo />
        <LeafDivider />
        <p className="font-serif text-lg sm:text-xl text-cm-charcoal/70 max-w-md mx-auto leading-relaxed">
          Transform your photographs into warm, sun-drenched portraits
          <br className="hidden sm:block" /> inspired by the vineyards of
          Provence.
        </p>
      </header>

      {/* ── Main content ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-6 pb-20 pt-10 max-w-3xl mx-auto w-full">
        {stage === "idle" && <UploadZone onFile={handleFile} />}

        {stage === "crop" && (
          <CropView
            src={rawDataURL}
            onConfirm={handleCropConfirm}
            onCancel={handleReset}
          />
        )}

        {stage === "processing" && <ProcessingView />}

        {stage === "result" && (
          <ResultView
            original={originalDataURL}
            retextured={retexturedDataURL}
            onReset={handleReset}
          />
        )}

        {stage === "error" && (
          <div className="fade-up w-full text-center space-y-5">
            <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                />
              </svg>
              {errorMessage}
            </div>
            <button onClick={handleReset} className="btn-primary">
              Try again
            </button>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center pb-8 px-6">
        <p className="text-xs text-cm-stone/50 tracking-wide">
          © {new Date().getFullYear()} Domaines Paul Mas · Côté Mas · Pézenas,
          Languedoc
        </p>
      </footer>
    </div>
  );
}
