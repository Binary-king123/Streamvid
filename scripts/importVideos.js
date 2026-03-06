/**
 * StreamVid Bulk Embed Importer
 * Usage: node importVideos.js --source sample_videos.json
 * 
 * Supports PM2: pm2 start importVideos.js -- --source data.json
 */
import fs from 'fs'
import path from 'path'

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:4000'
const BATCH_SIZE = 100 // Max 100 per request allowed by backend

// Parse arguments
const args = process.argv.slice(2)
const sourceArg = args.findIndex(a => a === '--source')
if (sourceArg === -1 || !args[sourceArg + 1]) {
    console.error('❌ Missing --source argument.\\nUsage: node importVideos.js --source <path.json>')
    process.exit(1)
}

const sourceFile = path.resolve(args[sourceArg + 1])

if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Source file not found: ${sourceFile}`)
    process.exit(1)
}

async function run() {
    console.log(`🚀 Starting Bulk Embed Import from: ${sourceFile}`)

    // Read JSON data
    let videos = []
    try {
        const data = fs.readFileSync(sourceFile, 'utf8')
        videos = JSON.parse(data)
    } catch (err) {
        console.error(`❌ Error parsing JSON file: ${err.message}`)
        process.exit(1)
    }

    if (!Array.isArray(videos)) {
        console.error('❌ Data must be a JSON array of video objects')
        process.exit(1)
    }

    const total = videos.length
    console.log(`📦 Found ${total} videos to import`)

    if (total === 0) return

    // Chunk into batches
    const chunks = []
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
        chunks.push(videos.slice(i, i + BATCH_SIZE))
    }

    let totalImported = 0
    let totalErrors = 0

    // Process each batch
    for (let i = 0; i < chunks.length; i++) {
        const batch = chunks[i]
        console.log(`\\n⏳ Processing batch ${i + 1}/${chunks.length} (${batch.length} videos)`)

        try {
            const res = await fetch(`${API_URL}/api/admin/videos/bulk-embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch)
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(`API Error ${res.status}: ${text}`)
            }

            const result = await res.json()
            totalImported += result.imported || 0
            totalErrors += result.errors || 0

            console.log(`✅ Batch ${i + 1} Done -> Imported: ${result.imported} | Errors: ${result.errors}`)

            if (result.errorList && result.errorList.length > 0) {
                console.log('⚠️ Batch Errors:')
                result.errorList.forEach(e => console.log(`   - [${e.row.title || 'Unknown'}] ${e.error}`))
            }

        } catch (err) {
            console.error(`❌ Batch ${i + 1} Failed completely: ${err.message}`)
            totalErrors += batch.length
        }
    }

    console.log(`\\n🎉 Import Complete!`)
    console.log(`📊 Total Imported: ${totalImported} / ${total}`)
    console.log(`❌ Total Errors:   ${totalErrors} / ${total}`)
}

run()
