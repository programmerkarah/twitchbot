const tmi = require("tmi.js");
const fetch = require("node-fetch"); // tambahkan ini di atas
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
  const command = args[0].toLowerCase(); // misal: !gamble
  const inputAmount = args[1] || ""; // misal: 100
  const target = args[2] || ""; // misal: spikeunaa
  const username = tags.username;

  // Handle command lokal (contoh !halo)
  if (command === "!halo") {
    client.say(
      channel,
      `Halo ${username}! Aku ${process.env.TWITCH_USERNAME} 👋`,
    );
    return;
  }

  // Handle command dinamis via Google Apps Script
  if (dynamicCommands.includes(command)) {
    try {
      const base = process.env.GAS_WEBHOOK;
      const url = `${base}?user=${encodeURIComponent(username)}&cmd=${encodeURIComponent(command.slice(1))}&amount=${encodeURIComponent(inputAmount)}&target=${encodeURIComponent(target)}`;

      const res = await fetch(url);
      const text = await res.text();

      if (text) {
        client.say(channel, text);
      }
    } catch (err) {
      console.error(`❌ Error fetch command ${command}:`, err);
      client.say(
        channel,
        `Maaf ${username}, terjadi kesalahan saat menjalankan perintah.`,
      );
    }
    return;
  }
});
