module.exports = {
  apps: [
    {
      name: "gmjo-preview",
      script: "npm run dev",
      watch: "./src",
    },
    {
      name: "gmjo-webhook",
      script: "scripts/webhook-receiver.mjs",
      interpreter: "node",
      interpreter_args: "--env-file=.env",
      env: {
        WEBHOOK_PORT: 4400,
      },
    },
  ],
};
