# HusBot

The automated husband assistant (sending regular appreciation texts over WhatsApp with AI-generated messages).

## Phase 1: Cloud setup

1. Create an DigitalOcena VM instance (Droplet, 512 MB) on the cheapest tier using Ubuntu.
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
mkdir husbot && cd husbot
npm init -y
npm install whatsapp-web.js qrcode-terminal node-schedule @google/generative-ai
```

Copy this repository's `index.js` into your project and update the placeholders:

- `MY_NUMBER`
- `WIFE_NUMBER`
- `GEMINI_API_KEY`

Optional `.env` settings:

- `HEARTBEAT_DAYS` — how often (in days) to send a heartbeat ping to your phone (default: `3`)

## Phase 3: Bot behavior included in `index.js`

- Uses `LocalAuth` so WhatsApp login persists after first QR scan.
- Uses Linux Chromium at `/usr/bin/chromium-browser` for cloud/headless runtime.
- Supports control commands by messaging yourself:
  - `/status`
  - `/pause`
  - `/resume`
  - `/send_now`
- Schedules 1–3 AI-generated appreciation messages each week at randomized day/time windows.
- Each AI-generated message is randomly written in **English or German** (command responses and heartbeats are always in English).
- Re-plans automatically every Sunday at 11:59 PM.
- Sends a **heartbeat** message to your phone every few days so you know the bot is still alive (configurable via `HEARTBEAT_DAYS`, default: 3).

## Phase 4: Run forever with PM2

```bash
sudo npm install -g pm2
pm2 start index.js --name wife-bot
pm2 logs wife-bot
```

Scan the QR code from logs via WhatsApp Linked Devices. After that, the bot runs in the background continuously.

## FAQ

If you run into memory problems (e.g. you use a DigitalOcean VPS with not enough RAM), think about creating swap space.
```bash
# Create a 1GB swap file
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent so it stays after a reboot
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```