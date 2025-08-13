# TraceWeaver CLI — stitch mabl step traces into MP4 🎞️

**TraceWeaver CLI** is a command-line tool that stitches the `Screenshot` frames contained in **mabl** step trace JSON files into a single **MP4** video.

- ✅ Works great with **mabl** step traces (https://mabl.com)
- 🧩 **Input**: a `.zip` of trace JSON files (or `-` to read from stdin)
- 🎬 **Output**: `.mp4` (only)
- 📐 **Default size**: 1920×1080 (customizable)
- ⏱️ Traces shorter than **400 ms** are skipped by default
- 🗂️ Files are processed in **name-ascending** order; frames within each file follow the **event order**

---

## Table of contents
- [Prerequisites](#prerequisites)
  - [Node.js + npm](#nodejs--npm)
  - [ffmpeg](#ffmpeg)
- [Install (public npm) > The installed command is **`traceweave`**.](#install-public-npm)
- [Get a mabl step trace .zip](#get-a-mabl-step-trace-zip)
- [Make a video!](#make-a-video)
- [Command reference](#command-reference)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Uninstall](#uninstall)

---

## Prerequisites

### Node.js + npm
TraceWeaver CLI is a Node.js CLI. We support **Node 18+**.

**macOS** (pick one):
- 👉 Easiest: download and run the macOS installer from **https://nodejs.org/**
- or via Homebrew:
  ```bash
  brew install node
  node -v && npm -v
  ```

**Windows** (pick one):
- 👉 Easiest: download and run the Windows installer from **https://nodejs.org/**
- or using **winget** (Windows 10/11):
  ```powershell
  winget install OpenJS.NodeJS.LTS
  node -v
  npm -v
  ```
- or using Chocolatey:
  ```powershell
  choco install nodejs-lts -y
  ```

> If you already have Node, verify with `node -v`. You should see `v18.x` or higher.

### ffmpeg
TraceWeaver CLI uses **ffmpeg** to encode the video.

**macOS**
```bash
brew install ffmpeg
ffmpeg -version
```

**Windows**
```powershell
# winget (recommended)
winget install --id Gyan.FFmpeg -e
ffmpeg -version

# or Chocolatey
choco install ffmpeg -y
```

> If your shell says `ffmpeg: command not found`, ensure it’s installed and on your **PATH**, then restart your terminal.

---

## Install (public npm)

> The installed command is **`traceweave`**.

```bash
# globally
npm i -g traceweaver-cli
traceweave -h

# OR project-local, then use npx
npm i -D traceweaver-cli
npx traceweave -h
```

If `traceweave` isn’t found, see [Troubleshooting](#troubleshooting) for adding npm’s global bin to your PATH.

---

## Get a mabl step trace .zip
Use the **mabl CLI** to export step traces from a test run:

```bash
mabl test-runs export <id> --types step
```

Where to find `<id>`:
- On the mabl test run results page, click the **kebab (⋮) menu** in the top-right → **View CLI Info**.
- Or query via mabl CLI to list your test runs and copy the **Test Run ID**.

This command will download a `.zip` containing the step trace JSON files — that’s the **input** for TraceWeaver CLI.

---

## Make a video!
Basic usage:

```bash
traceweave -i mabl.zip -o output.mp4
```

- `-i, --input <filename>`: your `.zip` of mabl step trace files (or `-` to read from stdin)
- `-o, --output <filename>`: output MP4 file (defaults to `output.mp4`)

---

## Command reference

```text
Usage: traceweave -i <zip> [options]

Options:
  -i, --input <file>   zip of JSON trace files (or - for stdin)           (required)
  -o, --output <file>  output MP4 filename (defaults to output.mp4)
  --min-ms <ms>        minimum total duration per trace (default: 400)
  --width <px>         output width (default: 1920)
  --height <px>        output height (default: 1080)
  -h, --help           display help for command
```

**Behavior details**
- Files are read from the zip in **name-ascending** order.
- Frames inside each file follow the **original event order** (no timestamp re-sort).
- Traces totaling **< 400 ms** are skipped by default (`--min-ms`).
- MP4 encoding uses H.264 (`libx264`, `-preset veryfast`, `-crf 23`, `+faststart`).

---

## Examples

```bash
traceweave -i steps.zip -o stitched.mp4
cat steps.zip | traceweave -i - -o out.mp4
traceweave -i steps.zip --width 1280 --height 720 -o out-720p.mp4
traceweave -i steps.zip --min-ms 0 -o video.mp4
```

---

## Troubleshooting

### “ffmpeg was not found on your PATH”
Install ffmpeg (see [ffmpeg](#ffmpeg) above), then restart your terminal. Verify with:
```bash
which ffmpeg   # macOS/Linux
where ffmpeg   # Windows
ffmpeg -version
```

### “command not found: traceweave” after `npm i -g`
Your global npm **bin** directory may not be on PATH.
- macOS (zsh):
  ```bash
  echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  which traceweave
  ```
- Windows: add your global npm bin path to **System → Environment Variables → Path**, then open a new terminal.

---

## Uninstall
```bash
npm un -g traceweaver-cli
```

---

Happy weaving! ✨
