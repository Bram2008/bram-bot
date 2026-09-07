module.exports = {
    apps: [{
        name: 'bram-bot',
        script: 'index.js',
        node_args: '--no-warnings',
        instances: 1,
        exec_mode: 'fork',
        watch: false,
        autorestart: true,
        max_memory_restart: '500M',
        env: {
            NODE_ENV: 'production',
        },
        error_file: 'logs/err.log',
        out_file: 'logs/out.log',
        log_file: 'logs/combined.log',
        time: true,
    }]
};