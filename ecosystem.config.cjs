module.exports = {
  apps: [
    {
      // Production site. Cluster mode is what makes zero-downtime deploys
      // possible: the pm2 master owns the listening socket, so during a
      // `pm2 reload` the old worker keeps serving until the new one has
      // signalled ready. With instances: 1 there is nothing to overlap with
      // and every deploy would drop requests.
      name: 'gmjo-web',
      script: 'scripts/server.mjs',
      cwd: __dirname,
      // No `interpreter_args: '--env-file=.env'` here: that flag makes
      // cluster-mode workers exit instantly with no logs. scripts/server.mjs
      // loads .env itself via process.loadEnvFile().
      exec_mode: 'cluster',
      instances: 2,
      // scripts/server.mjs calls process.send('ready') once it is listening;
      // without this pm2 would retire the old worker as soon as the new
      // process is spawned, i.e. before it can accept traffic.
      wait_ready: true,
      listen_timeout: 15000,
      // Must exceed the server's shutdown backstop (10s) so in-flight
      // requests drain instead of being SIGKILLed mid-response.
      kill_timeout: 12000,
      max_memory_restart: '600M',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        // 4322, because gmjo-preview owns 4321 (astro dev's default). Both run
        // side by side on this host, so the ports must not collide.
        PORT: 4322,
        // Symlink swapped atomically by scripts/deploy.sh. Because the env
        // never changes, a plain `pm2 reload` picks up the new release: Node
        // re-resolves the symlink when it spawns the new worker.
        BUILD_DIR: './current',
      },
    },
    {
      // Editor-facing SSR instance on 4321 (see `server.port` in
      // astro.config.mjs). Runs alongside gmjo-web, which is on 4322.
      name: 'gmjo-preview',
      script: 'npm run dev',
      watch: './src',
    },
    {
      name: 'gmjo-webhook',
      script: 'scripts/webhook-receiver.mjs',
      interpreter: 'node',
      interpreter_args: '--env-file=.env',
      env: {
        WEBHOOK_PORT: 4400,
      },
    },
  ],
};
