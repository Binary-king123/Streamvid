module.exports = {
    apps: [
        {
            name: 'streamvid-api',
            script: 'src/server.js',
            cwd: './backend',
            instances: 1,
            exec_mode: 'fork',
            node_args: '--max-old-space-size=512',
            env: { NODE_ENV: 'production', PORT: 4000 },
            error_file: '/var/log/streamvid/api-error.log',
            out_file: '/var/log/streamvid/api-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            max_restarts: 10,
            restart_delay: 3000,
            watch: false,
            kill_timeout: 5000
        },
        {
            name: 'streamvid-worker',
            script: 'src/worker/processor.js',
            cwd: './backend',
            instances: 1,
            exec_mode: 'fork',
            node_args: '--max-old-space-size=256',
            env: { NODE_ENV: 'production' },
            error_file: '/var/log/streamvid/worker-error.log',
            out_file: '/var/log/streamvid/worker-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            max_restarts: 10,
            restart_delay: 5000,
            watch: false,
            kill_timeout: 30000  // Allow worker to finish current FFmpeg job
        },
        {
            name: 'streamvid-web',
            // 'next start' from standalone output
            script: '.next/standalone/server.js',
            cwd: './frontend',
            instances: 1,
            exec_mode: 'fork',
            node_args: '--max-old-space-size=512',
            env: { NODE_ENV: 'production', PORT: 3000, HOSTNAME: '127.0.0.1' },
            error_file: '/var/log/streamvid/web-error.log',
            out_file: '/var/log/streamvid/web-out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            max_restarts: 10,
            restart_delay: 3000,
            watch: false,
            kill_timeout: 5000
        }
    ]
}
