#!/usr/bin/env node
/**
 * Bulk URL Builder — Helps generate URL lists for scraping
 * Takes a site's search/listing page and extracts all video URLs
 * Output: urls.txt ready for `node scrape.js file urls.txt`
 */

import { program } from 'commander'
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import chalk from 'chalk'

program
    .name('urlextract')
    .description('Extract video URLs from a listing/search page → urls.txt')

program.command('page <url>')
    .description('Extract all video links from a listing page')
    .option('-o, --output <file>', 'Output file', 'urls.txt')
    .option('--max <n>', 'Max URLs', '500')
    .action((url, opts) => {
        console.log(chalk.blue('ℹ'), `Extracting URLs from: ${url}`)
        try {
            const out = execSync(
                `yt-dlp --flat-playlist --get-url --playlist-end ${opts.max} --no-warnings "${url}"`,
                { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
            )
            const urls = out.split('\n').filter(l => l.trim().startsWith('http'))
            writeFileSync(opts.output, urls.join('\n'))
            console.log(chalk.green('✓'), `${urls.length} URLs → ${opts.output}`)
            console.log(chalk.dim(`  Now run: node scrape.js file ${opts.output}`))
        } catch (e) {
            console.log(chalk.red('✗'), 'Failed:', e.message)
        }
    })

program.parse()
