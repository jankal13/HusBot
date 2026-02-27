# HusBot

The automated husband assistant (sending regular appreciation texts over WhatsApp with AI-generated messages).

## Phase 1: Oracle Cloud setup (Always Free)

1. Create an Oracle Cloud VM instance on the **Always Free Ampere (ARM)** tier using Ubuntu.
2. Connect to the VM using SSH.
3. Install prerequisites:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y chromium-browser
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## Phase 2: Project setup

```bash
mkdir wife-bot && cd wife-bot
npm init -y
npm install whatsapp-web.js qrcode-terminal node-schedule @google/generative-ai
```

Copy this repository's `index.js` into your project and update the placeholders:

- `MY_NUMBER`
- `WIFE_NUMBER`
- `GEMINI_API_KEY`

## Phase 3: Bot behavior included in `index.js`

- Uses `LocalAuth` so WhatsApp login persists after first QR scan.
- Uses Linux Chromium at `/usr/bin/chromium-browser` for cloud/headless runtime.
- Supports control commands by messaging yourself:
  - `/status`
  - `/pause`
  - `/resume`
  - `/send_now`
- Schedules 1–3 AI-generated appreciation messages each week at randomized day/time windows.
- Re-plans automatically every Sunday at 11:59 PM.

## Phase 4: Run forever with PM2

```bash
sudo npm install -g pm2
pm2 start index.js --name wife-bot
pm2 logs wife-bot
```

Scan the QR code from logs via WhatsApp Linked Devices. After that, the bot runs in the background continuously.
