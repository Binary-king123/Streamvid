# StreamVid Scraper

Extracts video metadata from permitted sources and outputs CSV files ready to paste into the Admin → Batch Import panel.

**Requires: yt-dlp installed** (`pip3 install yt-dlp` or `sudo pip3 install yt-dlp`)

---

## Install

```bash
cd scraper
npm install
```

---

## Usage — 4 Modes

### 1. Single URL
```bash
node scrape.js url "https://www.xvideos.com/video12345/title" --genre "Desi"
```

### 2. File of URLs (most common)
```bash
# Add URLs to urls.txt (one per line)
node scrape.js file urls.txt --genre "Desi" --concurrency 3

# Output: output/batch_2025-03-01.csv
```

### 3. Full Channel / Playlist
```bash
node scrape.js channel "https://www.xhamster.com/users/creator/videos" --max 500
```

### 4. Search Query
```bash
node scrape.js search "desi bhabhi" --count 100 --source xvideos
node scrape.js search "japanese jav" --count 200 --source spankbang
```

---

## URL Extractor Helper

First extract all video URLs from a listing page, then scrape them:

```bash
# Step 1: Get all video URLs from a page
node urlextract.js page "https://site.com/category/desi" --max 500

# Step 2: Scrape extracted URLs  
node scrape.js file urls.txt --genre "Desi"
```

---

## Output CSV Format

The CSV columns match exactly what the Admin Batch Import expects:

```
url, title, genreName, code, tags, actors, isAdult
```

---

## Auto-Detection

The scraper automatically:
- **Extracts video codes** from titles: `SSIS-001`, `FC2-PPV-3928471`
- **Detects genre** from title + tags: Tamil, JAV, MILF, Desi, Amateur
- **Extracts actor names** from title/description
- **Fetches**: title, duration, view count, thumbnail URL

---

## Workflow

```
1. Collect URLs → urls.txt
2. node scrape.js file urls.txt
3. Open output/batch_*.csv
4. Admin Panel → Batch CSV → paste CSV → Import
5. Server downloads + encodes all videos in background
```

---

## Rate Limiting

Use `--concurrency 2` (default 3) to be respectful of source servers.
Never scrape more than 10 concurrent requests.

---

## Legal Note

Only scrape sites where you have permission or the ToS permits scraping.
Many affiliate programs (DMM, C4S) provide their catalog via API — 
use those whenever available instead of scraping HTML.
