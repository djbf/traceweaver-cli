# Traceweaver CLI — stitch mabl step traces into MP4 🎞️

**Traceweaver CLI** is a tiny, production-ready command‑line tool that stitches the `Screenshot` frames contained in **mabl** step trace JSON files into a single **MP4** video.

- ✅ **Designed for mabl (https://mabl.com)** step traces
- 🧩 **Input**: a `.zip` of trace JSON files (or `-` to read from stdin)
- 🎬 **Output**: `.mp4` (only)
- 📐 **Default size**: 1920×1080 (customizable)
- ⏱️ Frame timing is preserved from the trace; traces shorter than **400 ms** are skipped by default
- 🗂️ Files are processed in **name‑ascending** order; frames within each file follow the **event order**

---

## Table of contents
- [What you need (prereqs)](#what-you-need-prereqs)
  - [Node.js + npm](#nodejs--npm)
  - [ffmpeg](#ffmpeg)
  - [Access to GitHub Packages](#access-to-github-packages)
- [Install Traceweaver CLI](#install-traceweaver-cli)
- [Get a mabl step trace .zip](#get-a-mabl-step-trace-zip)
- [Make a video!](#make-a-video)
- [Command reference](#command-reference)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)
- [Uninstall](#uninstall)

---

## What you need (prereqs)

### Node.js + npm
Traceweaver CLI is a Node.js CLI. We support **Node 18+**.

**macOS** (pick one):
- 👉 Easiest: download and run the macOS installer from **https://nodejs.org/**
- or via Homebrew (if you have it):
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
Traceweaver CLI shells out to your system **ffmpeg** to encode the video.

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

### Access to GitHub Packages
This package is published privately to **GitHub Packages** under the `@djbf` scope.

1. Create a **GitHub Personal Access Token (PAT)** with **read:packages**.
2. Add the following to your `~/.npmrc` (macOS) or `%USERPROFILE%\.npmrc` (Windows):
   ```ini
   @djbf:registry=https://npm.pkg.github.com
   //npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
   always-auth=true
   ```

> If your organization enforces SSO for packages, make sure your PAT is authorized.

---

## Install Traceweaver CLI
Once Node/npm and your `.npmrc` are set up:

```bash
npm i -g @djbf/traceweaver-cli
# verify
traceweave -h
```

If `traceweave` isn’t found, try `npm config get prefix` to confirm your global npm bin directory is on PATH.
- macOS (zsh): add `export PATH="$(npm config get prefix)/bin:$PATH"` to your `~/.zshrc`
- Windows (PowerShell): ensure the global npm bin folder is listed in **System Environment Variables → Path**

---

## Get a mabl step trace .zip
Use the **mabl CLI** to export step traces from a test run:

```bash
mabl test-runs export <id> --types step
```

Where to find `<id>`:
- In the mabl test run results page, click the **kebab (⋮) menu** in the top‑right → **View CLI Info**.
- Or query via mabl CLI to list your test runs and copy the **Test Run ID**.

This command will download a `.zip` containing the step trace JSON files — that’s the **input** for Traceweave.

> Tip: keep the file names as‑is; Traceweaver CLI processes files in **name‑ascending** order to match the expected flow.

---

## Make a video!
Basic usage:

```bash
traceweave -i steps.zip -o stitched.mp4
```

- `-i, --input <file>`: your `.zip` of mabl step trace JSON files (or `-` to read from stdin)
- `-o, --output <file>`: output MP4 file (defaults to `output.mp4`)

That’s it — you’ll get a single MP4 with the frames stitched in order.

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
- Files are read from the zip in **name‑ascending** order.
- Frames inside each file follow the **original event order** in the trace (we do not re‑sort by timestamp).
- Any trace whose total duration is **< 400 ms** is skipped by default (`--min-ms`).
- MP4 encoding uses H.264 (`libx264`, `-preset veryfast`, `-crf 23`, `+faststart`).

---

## Examples

**Standard run**
```bash
traceweave -i steps.zip -o stitched.mp4
```

**Read from stdin**
```bash
cat steps.zip | traceweave -i - -o out.mp4
```

**Change output size**
```bash
traceweave -i steps.zip --width 1280 --height 720 -o out-720p.mp4
```

**Include very short traces**
```bash
traceweave -i steps.zip --min-ms 0 -o out.mp4
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

### “E401 / needs authentication / unable to authenticate, need: Basic realm=\"GitHub Package Registry\"”
Your `.npmrc` may be missing the GitHub Packages config or your PAT is invalid/expired.
- Confirm `~/.npmrc` (or `%USERPROFILE%\.npmrc`) contains:
  ```ini
  @djbf:registry=https://npm.pkg.github.com
  //npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
  always-auth=true
  ```
- Ensure the PAT has **read:packages** and (if required) is SSO‑authorized for your org.

### “command not found: traceweave” after `npm i -g`
Your global npm **bin** directory may not be on PATH.
- macOS (zsh):
  ```bash
  echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  which traceweave
  ```
- Windows: add your global npm bin path to **System → Environment Variables → Path**, then open a new terminal.

### Empty or out‑of‑order output
- Ensure your zip is the **step traces** export from mabl: `mabl test-runs export <id> --types step`
- We rely on **filename order** (ascending); rename files if needed to reflect the desired ordering (e.g., `001_...`, `002_...`).

---

## FAQ

**Q: Why MP4 only?**  
A: MP4 (H.264) is broadly compatible and fast to encode. WebM was slower in practice; we removed it to keep the tool lean.

**Q: Where does the output go?**  
A: The output file (default `output.mp4`) is written to your current working directory.

**Q: Can I change frame rate, quality, or presets?**  
A: Not yet via flags — the defaults are tuned for speed and compatibility. If you need knobs, open an issue and we can add `--fps`, `--crf`, and `--preset` options.

**Q: How does duration work?**  
A: We compute per‑frame durations from trace timestamps (µs or ms). Traces totaling under **400 ms** are skipped by default (`--min-ms` to change).

---

## Uninstall
```bash
npm un -g @djbf/traceweaver-cli
```

---

Happy weaving! ✨
