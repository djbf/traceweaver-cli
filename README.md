# traceweave (CLI)

**traceweave** stitches `Screenshot` filmstrips from Chrome DevTools step trace JSON files into a single **MP4** video.

- Input: a `.zip` of trace JSON files (or `-` for stdin)
- Output: `.mp4` (only)
- Accurate per-frame timings, temp files auto-cleaned, requires system **ffmpeg**

## Install (local dev)

```bash
npm install --include=dev --ignore-scripts
npm run build
npm link   # optional: exposes the `traceweave` command
```

## Usage

```bash
traceweave -i <input.zip> [-o output.mp4] [--min-ms 400] [--width 1920] [--height 1080]
# read from stdin
cat traces.zip | traceweave -i - -o out.mp4
```

**Options**
- `-i, --input <file>`: zip of JSON trace files (or `-` to read from stdin)
- `-o, --output <file>`: output filename, e.g. `out.mp4` (defaults to `output.mp4`)
- `--min-ms <ms>`: minimum total duration (per trace) to keep; default `400`
- `--width <px>` / `--height <px>`: output size (defaults `1920x1080`)

**Examples**
```bash
traceweave -i steps.zip -o stitched.mp4
traceweave -i steps.zip -o stitched.mp4 --min-ms 400 --width 1920 --height 1080
```

## Ordering

Trace JSON files are processed in **name-ascending** order, and frames within each file follow the **event order** as they appear in the trace (no timestamp re-sorting).

## Installing ffmpeg

`traceweave` calls your **system ffmpeg**. Install it once, then verify with `ffmpeg -version`.

### macOS (Homebrew)
```bash
brew install ffmpeg
ffmpeg -version
```

### Windows
**Winget (built-in on Win10/11):**
```powershell
winget install --id Gyan.FFmpeg -e
ffmpeg -version
```
**Chocolatey:**
```powershell
choco install ffmpeg -y
ffmpeg -version
```
**Scoop (no admin):**
```powershell
scoop install ffmpeg
ffmpeg -version
```

> Alternatively, download a prebuilt static build from the official FFmpeg site and add its `bin` folder to your PATH.
