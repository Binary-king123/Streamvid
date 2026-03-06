#!/usr/bin/env node
/**
 * StreamVid Scraper — CLI Tool
 * Extracts video metadata from permitted sources
 * Outputs CSV ready for Admin → Batch Import
 *
 * Usage:
 *   node scrape.js url https://example.com/video     # Single URL
 *   node scrape.js file urls.txt                     # Text file of URLs
 *   node scrape.js search "desi" --source xvideos    # Search scrape
 *   node scrape.js channel "https://channel-url"     # Full channel
 *
 * Output: output/videos_TIMESTAMP.csv
 */

import { program } from 'commander'
import { execSync, spawn } from 'child_process'
import { createWriteStream, readFileSync, mkdirSync, existsSync } from 'fs'
import { stringify } from 'csv-stringify/sync'
import chalk from 'chalk'
import pLimit from 'p-limit'
import path from 'path'

// ─── Setup ───────────────────────────────────────────────────────────────────
const OUTPUT_DIR = './output'
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true })

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const log = {
    info: msg => console.log(chalk.blue('ℹ'), msg),
    success: msg => console.log(chalk.green('✓'), msg),
    warn: msg => console.log(chalk.yellow('⚠'), msg),
    error: msg => console.log(chalk.red('✗'), msg),
}

// ─── Check yt-dlp is installed ────────────────────────────────────────────────
function checkYtDlp() {
    try {
        execSync('yt-dlp --version', { stdio: 'pipe' })
        return true
    } catch {
        log.error('yt-dlp not found. Install with: pip3 install yt-dlp')
        process.exit(1)
    }
}

// ─── Extract metadata from single URL via yt-dlp ─────────────────────────────
async function extractMeta(url, opts = {}) {
    return new Promise((resolve) => {
        const args = [
            '--dump-json',
            '--no-download',
            '--no-playlist',
            '--geo-bypass',
            url
        ]

        let output = ''
        let error = ''
        const proc = spawn('yt-dlp', args)
        proc.stdout.on('data', d => output += d.toString())
        proc.stderr.on('data', d => error += d.toString())

        proc.on('close', (code) => {
            if (code !== 0 || !output.trim()) {
                resolve(null)
                return
            }
            try {
                const info = JSON.parse(output.trim())
                resolve({
                    url: url,
                    title: info.title || '',
                    code: extractCode(info.title || '') || '',
                    genreName: opts.genre || guessGenre(info.title || '', info.tags || []),
                    tags: (info.tags || []).slice(0, 10).join(';'),
                    actors: extractActors(info.title || '', info.description || ''),
                    isAdult: 'true',
                    duration: info.duration || 0,
                    views: info.view_count || 0,
                    thumb: info.thumbnail || '',
                    source: info.webpage_url_domain || '',
                })
            } catch {
                resolve(null)
            }
        })
    })
}

// ─── Extract video code from title (JAV/FC2 codes) ───────────────────────────
function extractCode(title) {
    // JAV codes: SSIS-001, IPX-001, etc.
    const javMatch = title.match(/\b([A-Z]{2,6}-\d{2,5})\b/i)
    if (javMatch) return javMatch[1].toUpperCase()

    // FC2 codes: FC2-PPV-1234567
    const fc2Match = title.match(/FC2[-\s]?PPV[-\s]?(\d{5,8})/i)
    if (fc2Match) return `FC2-PPV-${fc2Match[1]}`

    return ''
}

// ─── Guess genre from title/tags ──────────────────────────────────────────────
function guessGenre(title, tags) {
    const t = (title + ' ' + tags.join(' ')).toLowerCase()
    if (/tamil|telugu|kannada|malayalam|mallu/.test(t)) return 'Tamil'
    if (/japanese|jav|uncensored/.test(t)) return 'JAV'
    if (/milf|mature|aunty|aunti/.test(t)) return 'MILF'
    if (/desi|indian|bhabhi|hindi/.test(t)) return 'Desi'
    if (/amateur|homemade|hidden/.test(t)) return 'Amateur'
    if (/office|boss|secretary/.test(t)) return 'Office'
    return 'Desi'
}

// ─── Extract actor names from title/description ───────────────────────────────
function extractActors(title, description) {
    // Common pattern: "Actor Name - video title" or "Starring Actor Name"
    const patterns = [
        /starring[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/gi,
        /with [A-Z][a-z]+ [A-Z][a-z]+/gi,
    ]
    const actors = new Set()
    for (const p of patterns) {
        const matches = (title + ' ' + description).matchAll(p)
        for (const m of matches) actors.add(m[1] || m[0])
    }
    return [...actors].slice(0, 3).join(';')
}

// ─── Process a list of URLs → CSV rows ───────────────────────────────────────
async function processUrls(urls, opts = {}) {
    const limit = pLimit(opts.concurrency || 3)
    const results = []
    let done = 0

    log.info(`Processing ${urls.length} URLs (${opts.concurrency || 3} concurrent)...`)

    const tasks = urls.map(url =>
        limit(async () => {
            const meta = await extractMeta(url.trim(), opts)
            done++
            if (meta) {
                results.push(meta)
                process.stdout.write(`\r  ${chalk.green('✓')} ${done}/${urls.length} — ${chalk.dim(meta.title.slice(0, 50))}`)
            } else {
                process.stdout.write(`\r  ${chalk.red('✗')} ${done}/${urls.length} — failed: ${url.slice(0, 40)}`)
            }
        })
    )

    await Promise.all(tasks)
    console.log('')
    return results
}

// ─── Write results to CSV ─────────────────────────────────────────────────────
function writeCSV(rows, filename) {
    const csvRows = rows.map(r => ({
        url: r.url,
        title: r.title,
        genreName: r.genreName,
        code: r.code,
        tags: r.tags,
        actors: r.actors,
        isAdult: r.isAdult,
    }))

    const csv = stringify(csvRows, { header: true })
    const outPath = path.join(OUTPUT_DIR, filename)
    createWriteStream(outPath).end(csv)
    return outPath
}

// ─── CLI Commands ─────────────────────────────────────────────────────────────
program
    .name('scrape')
    .description('StreamVid Video Scraper — outputs CSV for batch import')
    .version('1.0.0')

// Single URL
program.command('url <url>')
    .description('Scrape metadata from a single video URL')
    .option('-g, --genre <genre>', 'Override genre', 'Desi')
    .action(async (url, opts) => {
        checkYtDlp()
        log.info(`Extracting: ${url}`)
        const meta = await extractMeta(url, opts)
        if (!meta) { log.error('Failed to extract metadata'); process.exit(1) }

        const filename = `single_${timestamp()}.csv`
        const outPath = writeCSV([meta], filename)
        log.success(`Saved to: ${outPath}`)
        console.log(chalk.dim(JSON.stringify(meta, null, 2)))
    })

// File of URLs
program.command('file <filepath>')
    .description('Scrape a text file containing one URL per line')
    .option('-g, --genre <genre>', 'Genre for all videos', 'Desi')
    .option('-c, --concurrency <n>', 'Concurrent requests', '3')
    .action(async (filepath, opts) => {
        checkYtDlp()
        const urls = readFileSync(filepath, 'utf8')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l && l.startsWith('http'))

        if (!urls.length) { log.error('No valid URLs in file'); process.exit(1) }
        log.info(`Found ${urls.length} URLs in ${filepath}`)

        const rows = await processUrls(urls, { ...opts, concurrency: parseInt(opts.concurrency) })
        const filename = `batch_${timestamp()}.csv`
        const outPath = writeCSV(rows, filename)

        log.success(`\nDone! ${rows.length}/${urls.length} videos scraped`)
        log.success(`CSV saved: ${outPath}`)
        log.info(`→ Admin panel → Batch CSV → paste contents → Import`)
    })

// Channel / Playlist
program.command('channel <url>')
    .description('Scrape all videos from a channel or playlist URL')
    .option('-g, --genre <genre>', 'Genre for all videos', 'Desi')
    .option('-c, --concurrency <n>', 'Concurrent requests', '2')
    .option('--max <n>', 'Maximum videos to scrape', '500')
    .action(async (url, opts) => {
        checkYtDlp()
        log.info(`Extracting channel/playlist URLs from: ${url}`)

        // First, get all video URLs from channel
        let urlList = ''
        try {
            urlList = execSync(
                `yt-dlp --flat-playlist --get-url --no-warnings "${url}"`,
                { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }
            )
        } catch (e) {
            log.error('Failed to get playlist URLs: ' + e.message)
            process.exit(1)
        }

        const urls = urlList.split('\n')
            .map(l => l.trim())
            .filter(l => l && l.startsWith('http'))
            .slice(0, parseInt(opts.max))

        log.info(`Found ${urls.length} videos (limit: ${opts.max})`)
        const rows = await processUrls(urls, { ...opts, concurrency: parseInt(opts.concurrency) })
        const filename = `channel_${timestamp()}.csv`
        const outPath = writeCSV(rows, filename)

        log.success(`Done! ${rows.length} videos scraped`)
        log.success(`CSV: ${outPath}`)
    })

// Search scrape
program.command('search <query>')
    .description('Search and scrape results from a source')
    .option('-n, --count <n>', 'Number of results to get', '50')
    .option('-g, --genre <genre>', 'Genre', 'Desi')
    .option('--source <source>', 'Source to search (xvideos|xhamster|spankbang)', 'xvideos')
    .action(async (query, opts) => {
        checkYtDlp()
        const searchUrls = {
            xvideos: `https://www.xvideos.com/?k=${encodeURIComponent(query)}`,
            xhamster: `https://xhamster.com/search/${encodeURIComponent(query)}`,
            spankbang: `https://spankbang.com/s/${encodeURIComponent(query)}/`
        }

        const searchUrl = searchUrls[opts.source]
        if (!searchUrl) { log.error('Unknown source. Use: xvideos, xhamster, spankbang'); process.exit(1) }

        log.info(`Searching "${query}" on ${opts.source} (getting ${opts.count} results)...`)

        let urlList = ''
        try {
            urlList = execSync(
                `yt-dlp --flat-playlist --get-url --playlist-end ${opts.count} --no-warnings "${searchUrl}"`,
                { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
            )
        } catch (e) {
            log.error('Search failed: ' + e.message)
            process.exit(1)
        }

        const urls = urlList.split('\n').map(l => l.trim()).filter(l => l.startsWith('http'))
        log.info(`Got ${urls.length} video URLs`)

        const rows = await processUrls(urls, opts)
        const filename = `search_${query.replace(/\s+/g, '_')}_${timestamp()}.csv`
        const outPath = writeCSV(rows, filename)

        log.success(`Done! ${rows.length} videos → ${outPath}`)
    })

program.parse()
