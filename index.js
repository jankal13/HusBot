require('dotenv').config(); // This loads the .env file

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const schedule = require('node-schedule');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION VIA .ENV ---
const MY_NUMBER = process.env.MY_NUMBER;
const WIFE_NUMBER = process.env.WIFE_NUMBER;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const missingEnvVars = ['MY_NUMBER', 'WIFE_NUMBER', 'GEMINI_API_KEY'].filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}. Set them in your .env file.`);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// State variables
let scheduledJobs = [];
let upcomingMessageLogs = [];
let isPaused = false;

// Set up WhatsApp Client optimized for a Linux Cloud Server
const client = new Client({
    authStrategy: new LocalAuth(),
    qrMaxRetries: 5, // Give the QR code more chances to refresh
    authTimeoutMs: 60000, // Wait 60 seconds for login to finish
    puppeteer: {
        executablePath: '/usr/bin/chromium-browser',
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', 
            '--disable-gpu',
            '--disable-canvas-aa', // Disable antialiasing
            '--disable-2d-canvas-clip-aa', // Disable antialiasing
            '--disable-gl-drawing-for-tests',
            '--mute-audio',
            '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
        ]
    }
});

// 1. Authentication
client.on('qr', (qr) => {
  console.log('Scan this QR code with your WhatsApp to link the server:');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ Bot is connected and running!');
  // Plan the current week immediately upon startup
  planWeeklyMessages();
});

// 2. The WhatsApp Control Panel (Listens to "Message Yourself")
client.on('message_create', async (message) => {
  if (message.fromMe && message.to.trim() === MY_NUMBER.trim()) {
    
    const command = message.body.toLowerCase().trim(); 

    try {
        if (command === '/status') {
          const statusText = isPaused ? '⏸️ *PAUSED*' : '▶️ *ACTIVE*';
          
          let replyText = "";
          if (upcomingMessageLogs.length === 0) {
            replyText = `🤖 *Status:* ${statusText}\nNo more messages scheduled for this week.`;
          } else {
            const scheduleList = upcomingMessageLogs.map((log) => `• ${log}`).join('\n');
            replyText = `🤖 *Status:* ${statusText}\nUpcoming messages this week:\n${scheduleList}`;
          }
          
          // Notice it uses 'client' here!
          await client.sendMessage(MY_NUMBER, replyText);
        } 
        
        else if (command === '/pause') {
          isPaused = true;
          await client.sendMessage(MY_NUMBER, '⏸️ *Paused:* AI texts will NOT be sent until you type /resume.');
        } 
        
        else if (command === '/resume') {
          isPaused = false;
          await client.sendMessage(MY_NUMBER, '▶️ *Resumed:* AI texts will resume their normal schedule.');
        } 
        
        else if (command === '/send_now') {
          await client.sendMessage(MY_NUMBER, '🚀 Generating and sending a text right now...');
          await generateAndSendText();
        }
    } catch (error) {
        console.error("[Husbot] Error executing command:", error);
    }
  }
});

// 3. The Dynamic Prompt Engine
function getDynamicPrompt() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDay = days[new Date().getDay()];
  const currentHour = new Date().getHours();

  const timeOfDay = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';

  const themes = [
    'how hard she works for our family',
    'how beautiful she looked the last time I saw her',
    "just a random 'thinking of you' vibe",
    'appreciating her patience and support',
    'how she makes mundane days better',
    'anticipating seeing her later tonight',
  ];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];

  const tones = [
    'Keep it super casual, like a passing thought.',
    'Make it slightly affectionate but brief.',
    'Sound a bit tired from work, but happy to be thinking of her.',
    'Very short, direct, and sweet.',
  ];
  const randomTone = tones[Math.floor(Math.random() * tones.length)];

  return `
        You are a husband texting his wife on a ${currentDay} ${timeOfDay}.
        Write a very short text message (1 to 2 sentences maximum) focusing on: ${randomTheme}.

        Strict Rules:
        - ${randomTone}
        - Do NOT sound like a greeting card or poetry. Sound like a normal guy texting.
        - Use NO MORE than one emoji (and it's okay to use zero).
        - Do not use hashtags.
        - Do not say "Dear" or sign off with your name. Just the raw text.
    `;
}

// 4. The AI Generator & Sender
async function generateAndSendText() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const dynamicPrompt = getDynamicPrompt();

    const result = await model.generateContent(dynamicPrompt);
    let textMessage = result.response.text().trim();

    // Strip out wrapping quotes if the AI accidentally adds them
    if (textMessage.startsWith('"') && textMessage.endsWith('"')) {
      textMessage = textMessage.slice(1, -1);
    }

    // Send to wife
    await client.sendMessage(WIFE_NUMBER, textMessage);

    // Notify yourself
    await client.sendMessage(MY_NUMBER, `✅ *Sent just now:*\n"${textMessage}"`);
  } catch (error) {
    console.error('Error generating/sending message:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    await client.sendMessage(MY_NUMBER, `⚠️ Error: Failed to generate or send the message.\n${details}`);
  }
}

// 5. The "Sunday Night" Weekly Planner (Max 3 times a week)
function planWeeklyMessages() {
  scheduledJobs.forEach((job) => job.cancel());
  scheduledJobs = [];
  upcomingMessageLogs = [];

  const numMessages = Math.floor(Math.random() * 3) + 1;
  const availableDays = [1, 2, 3, 4, 5, 6, 7];
  const selectedDays = [];

  for (let i = 0; i < numMessages; i += 1) {
    const randomIndex = Math.floor(Math.random() * availableDays.length);
    selectedDays.push(availableDays[randomIndex]);
    availableDays.splice(randomIndex, 1);
  }

  selectedDays.forEach((day) => {
    const randomHour = Math.floor(Math.random() * (18 - 9 + 1)) + 9;
    const randomMinute = Math.floor(Math.random() * 60);

    const rule = new schedule.RecurrenceRule();
    // node-schedule uses 0-6 (Sunday-Saturday), while selectedDays uses 1-7.
    rule.dayOfWeek = day === 7 ? 0 : day;
    rule.hour = randomHour;
    rule.minute = randomMinute;

    const job = schedule.scheduleJob(rule, async () => {
      upcomingMessageLogs.shift();
      if (!isPaused) {
        console.log('Triggering scheduled text...');
        await generateAndSendText();
      } else {
        console.log('Job triggered but bot is paused. Skipped.');
      }
    });

    scheduledJobs.push(job);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const ampm = randomHour >= 12 ? 'PM' : 'AM';
    const formattedHour = randomHour > 12 ? randomHour - 12 : randomHour;
    const formattedMinute = randomMinute.toString().padStart(2, '0');

    upcomingMessageLogs.push(`${dayNames[rule.dayOfWeek]} at ${formattedHour}:${formattedMinute} ${ampm}`);
  });

  upcomingMessageLogs.sort();
  console.log(`Planned ${numMessages} messages for this week.`);
}

// Trigger the planner every Sunday at 11:59 PM
schedule.scheduleJob('59 23 * * 0', planWeeklyMessages);

// Boot up the client
client.initialize();
