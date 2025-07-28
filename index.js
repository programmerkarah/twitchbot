const tmi = require("tmi.js");
const fetch = require("node-fetch");
require("dotenv").config();

const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ Bot is running!");
});

app.listen(PORT, () => {
  console.log(`Bot is live at http://localhost:${PORT}`);
});

// Ambil info dari environment variable
const username = process.env.TWITCH_USERNAME;
const oauth = process.env.TWITCH_OAUTH;
const channel = process.env.TWITCH_CHANNEL;
const GAS_WEBHOOK = process.env.GAS_WEBHOOK;

const dynamicCommands = [
  "!fish",
  "!gamble",
  "!dig",
  "!explore",
  "!blackjack",
  "!hit",
  "!stand",
  "!slot",
  "!mine",
  "!heist",
  "!join",
  "!endheist",
];

// Konfigurasi bot
const client = new tmi.Client({
  identity: {
    username: username,
    password: oauth,
  },
  channels: [channel],
});

client
  .connect()
  .then(() => {
    console.log(`✅ Bot connected as ${username}`);
  })
  .catch(console.error);

// Respon command
client.on("message", async (channel, tags, message, self) => {
  if (self) return;

  const args = message.trim().split(" ");
  const command = args[0].toLowerCase();
  const inputAmount = args[1] || "";
  const target = args[2] || "";
  const username = tags.username;

  if (command === "!halo") {
    client.say(
      channel,
      `Halo ${username}! Aku ${process.env.TWITCH_USERNAME} 👋`,
    );
    return;
  }

  if (dynamicCommands.includes(command)) {
    try {
      const cmdName = command.slice(1); // hapus tanda "!" di depan
      const url = `${GAS_WEBHOOK}?user=${encodeURIComponent(username)}&cmd=${encodeURIComponent(cmdName)}&amount=${encodeURIComponent(inputAmount)}&target=${encodeURIComponent(target)}`;

      const res = await fetch(url);
      const text = await res.text();

      if (text) {
        client.say(channel, text);
      }

      // ⏳ Auto-fetch hasil heist setelah 30 detik
      if (cmdName === "heist") {
        setTimeout(async () => {
          try {
            const resultUrl = `${GAS_WEBHOOK}?cmd=heistresult`;
            const resultRes = await fetch(resultUrl);
            const resultText = await resultRes.text();

            if (resultText && resultText !== "NONE") {
              client.say(channel, resultText);
            }
          } catch (err) {
            console.error("❌ Failed to get heist result:", err);
          }
        }, 300000); // 5 menit (300000 ms)
      }
    } catch (err) {
      console.error(`❌ Error fetch command ${command}:`, err);
      client.say(
        channel,
        `Sorry ${username}, there's a problem while running the command.`,
      );
    }
  }
});

// ⏱ Auto-fetch hasil heist setiap 2 menit
setInterval(async () => {
  try {
    const resultUrl = `${GAS_WEBHOOK}?cmd=heistresult`;
    const resultRes = await fetch(resultUrl);
    const resultText = await resultRes.text();

    if (resultText && resultText !== "NONE") {
      client.say(`#${channel}`, resultText);
    }
  } catch (err) {
    console.error("❌ Failed to get heist result:", err);
  }
}, 120000); // 2 menit
