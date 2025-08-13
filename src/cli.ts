#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { program } from "commander";
import JSZip from "jszip";

/** A single screenshot with a timestamp (trace clock units) and data URL payload */
type Shot = { ts: number; dataUrl: string };
type TraceFile = { name: string; frames: Shot[]; durationMs: number };

function toDurations(shots: Shot[]): number[] {
  if (shots.length === 0) return [];
  const ts = shots.map(s => s.ts);
  const deltas = ts.slice(1).map((t, i) => Math.max(0, t - ts[i]));
  const median = deltas.length ? deltas.slice().sort((a,b)=>a-b)[Math.floor(deltas.length/2)] : 0;
  const scale = median > 10000 ? 1/1000 : 1; // µs -> ms
  const d: number[] = [];
  for (let i = 0; i < shots.length; i++) {
    const a = shots[i], b = shots[i+1];
    const dur = b ? Math.max(1, (b.ts - a.ts) * scale)
                  : Math.max(33, Math.round(median * scale) || 33);
    d.push(dur);
  }
  return d;
}

async function ensureFFmpeg(): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    proc.on("error", () => {
      const msg = `ffmpeg was not found on your PATH.

Install it and restart your terminal:
  • macOS (Homebrew):  brew install ffmpeg
  • Windows (winget):  winget install --id Gyan.FFmpeg -e
    (or: choco install ffmpeg  |  scoop install ffmpeg)

After installing, verify with: ffmpeg -version`;
      reject(new Error(msg));
    });
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error("ffmpeg -version returned non-zero exit code"))
    );
  });
}

async function readStdin(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", c => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks)));
    process.stdin.on("error", reject);
  });
}

function get(obj: any, pathStr: string): any {
  return pathStr.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
}

function extractScreenshotsFromTraceJson(json: any): Shot[] {
  const frames: Shot[] = [];

  // Use event order as-is; do NOT sort by timestamp (web-app parity)
  const events = Array.isArray(json?.traceEvents) ? json.traceEvents
               : Array.isArray(json?.events) ? json.events : [];
  for (const e of events) {
    const name = e?.name || e?.ph;
    const snap = e?.args?.snapshot || e?.args?.data?.snapshot;
    if (name === "Screenshot" && snap) {
      frames.push({ ts: Number(e.ts ?? e?.args?.ts ?? 0), dataUrl: snap });
    }
  }

  if (frames.length === 0) {
    const candidates: any[] = [];
    const a = get(json, "Tracing.dataCollected") || get(json, "dataCollected");
    if (Array.isArray(a)) candidates.push(...a);
    for (const e of candidates) {
      const name = e?.name;
      const snap = e?.args?.snapshot;
      const ts = Number(e?.ts ?? 0);
      if (name === "Screenshot" && snap) frames.push({ ts, dataUrl: snap });
    }
  }

  return frames;
}

function dataUrlToBuffer(dataUrl: string): Buffer {
  const s = (dataUrl ?? "").toString().trim();
  // Case 1: full data URL with base64 payload
  const m = /^data:[^;]+;base64,([A-Za-z0-9+/=\s]+)$/i.exec(s);
  if (m) {
    return Buffer.from(m[1].replace(/\s+/g, ""), "base64");
  }
  // Case 2: plain base64 (common in Chrome traces)
  if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length >= 16) {
    return Buffer.from(s.replace(/\s+/g, ""), "base64");
  }
  throw new Error("Invalid screenshot data URL");
}

async function parseZipOfTracesNode(zipPath: string): Promise<TraceFile[]> {
  const buf = zipPath === "-" ? await readStdin()
                              : await fs.readFile(path.resolve(process.cwd(), zipPath));
  const zip = await JSZip.loadAsync(buf);
  const entries = Object.values(zip.files)
    .filter(f => !f.dir && f.name.toLowerCase().endsWith(".json"))
    .sort((a: any, b: any) => a.name.localeCompare(b.name)); // filename asc

  const traces: TraceFile[] = [];
  for (const entry of entries) {
    try {
      const text = await zip.file(entry.name)!.async("text");
      const json = JSON.parse(text);
      const frames = extractScreenshotsFromTraceJson(json);
      const durs = toDurations(frames);
      const durationMs = durs.reduce((a,b)=>a+b, 0);
      traces.push({ name: entry.name, frames, durationMs });
    } catch (err) {
      console.warn("Skipping invalid JSON in zip:", (entry as any).name, err);
    }
  }
  return traces;
}

async function writeFrames(shots: Shot[], dir: string): Promise<string[]> {
  await fs.mkdir(dir, { recursive: true });
  const files: string[] = [];
  for (let i = 0; i < shots.length; i++) {
    const p = path.join(dir, `frame_${String(i+1).padStart(6,"0")}.png`);
    await fs.writeFile(p, dataUrlToBuffer(shots[i].dataUrl));
    files.push(p);
  }
  return files;
}

async function writeConcatFile(shots: Shot[], frames: string[], outPath: string) {
  const durs = toDurations(shots);
  const lines: string[] = ["ffconcat version 1.0"];
  for (let i = 0; i < frames.length; i++) {
    const sec = Math.max(0.001, durs[i] / 1000);
    lines.push(`file '${frames[i].replace(/'/g, "'\\''")}'`);
    lines.push(`duration ${sec.toFixed(6)}`);
  }
  // Some ffmpeg builds require repeating the last frame without duration
  if (frames.length > 0) lines.push(`file '${frames[frames.length-1].replace(/'/g, "'\\''")}'`);
  await fs.writeFile(outPath, lines.join("\n"), "utf8");
}

function runFFmpeg(
  listPath: string,
  outFile: string,
  width: number,
  height: number
): Promise<void> {
  const vf = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
  const args = [
    "-loglevel", "panic",
    "-safe", "0",
    "-f", "concat",
    "-i", listPath,
    "-r", "30",
    "-pix_fmt", "yuv420p",
    "-vf", vf,
    "-c:v", "libx264",
    "-crf", "23",
    "-preset", "veryfast",
    "-movflags", "+faststart",
    outFile
  ];
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: "inherit" });
    proc.on("error", reject);
    proc.on("close", code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`)));
  });
}

async function main() {
  await ensureFFmpeg();

  program
    .name("traceweave")
    .description("TraceWeaver CLI stitches mabl step trace screenshots into a single MP4")
    .requiredOption("-i, --input <file>", "zip of JSON trace files (use - to read from stdin)")
    .option("-o, --output <file>", "output MP4 filename (defaults to output.mp4)", "output.mp4")
    .option("--min-ms <ms>", "minimum total trace duration to keep (per trace)", "400")
    .option("--width <px>", "output width", "1920")
    .option("--height <px>", "output height", "1080")
    .addHelpText("after", `
Examples:
  # Basic: zip of step traces -> MP4
  traceweave -i steps.zip -o stitched.mp4

  # Read zip from stdin, skip short traces, render 1080p MP4
  cat steps.zip | traceweave -i - -o stitched.mp4 --min-ms 400 --width 1920 --height 1080

Options:
  -i, --input <file>     zip of JSON trace files (or - for stdin)
  -o, --output <file>    output MP4 filename (defaults to output.mp4)
  --min-ms <ms>          minimum total duration per trace (default: 400)
  --width <px>           output width (default: 1920)
  --height <px>          output height (default: 1080)
`).parse(process.argv);

  const opts = program.opts() as {
    input: string;
    output?: string;
    minMs: string;
    width: string;
    height: string;
  };

  const zipPath = opts.input;
  const outFile = path.resolve(process.cwd(), opts.output || "output.mp4");
  const ext = path.extname(outFile).toLowerCase();
  if (ext && ext !== ".mp4") {
    throw new Error("Only MP4 is supported. Please use an output filename ending with .mp4");
  }

  const minMs = Math.max(0, Number(opts.minMs || "400")) || 400;
  const width = Math.max(16, Number(opts.width || "1920")) || 1920;
  const height = Math.max(16, Number(opts.height || "1080")) || 1080;

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "traceweave-"));
  try {
    const traces = await parseZipOfTracesNode(zipPath);
    const kept = traces.filter(t => t.frames.length > 0 && t.durationMs >= minMs);
    if (kept.length === 0) {
      const names = traces.map(t => `${t.name} (${t.frames.length} frames, ${t.durationMs.toFixed(0)}ms)`).join(", ");
      throw new Error(`No usable traces. Parsed: [${names}]`);
    }

    const shots: Shot[] = [];
    for (const t of kept) shots.push(...t.frames);

    const framesDir = path.join(tmp, "frames");
    const frames = await writeFrames(shots, framesDir);
    if (!frames.length) throw new Error("No frames extracted from traces.");

    const listPath = path.join(tmp, "frames.txt");
    await writeConcatFile(shots, frames, listPath);

    await runFFmpeg(listPath, outFile, width, height);
    console.log("Wrote", outFile);
  } finally {
    try { await fs.rm(tmp, { recursive: true, force: true }); } catch {}
  }
}

main().catch(err => {
  console.error("[traceweave] Error:", err?.message || err);
  process.exit(1);
});
