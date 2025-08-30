const tmi = require("tmi.js");
const fetch = require("node-fetch");
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
const channel = process.env.TWITCH_CHANNEL;
const GAS_WEBHOOK = process.env.GAS_WEBHOOK;
const clientId = process.env.TWITCH_CLIENT_ID;
const clientSecret = process.env.TWITCH_CLIENT_SECRET;
const refreshToken = process.env.TWITCH_REFRESH_TOKEN;

let oauth = process.env.TWITCH_OAUTH; // akan diganti jika refresh sukses
let client; // biar bisa di-recreate

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
  "!heistresult",
  "!help"
];

// 🔄 Fungsi refresh token
async function refreshAccessToken() {
  try {
    const res = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const data = await res.json();

    if (data.access_token) {
      console.log("✅ Access token refreshed successfully");
      oauth = `oauth:${data.access_token}`;
      return oauth;
    } else {
      console.error("❌ Failed to refresh token:", data);
      return null;
    }
  } catch (err) {
    console.error("❌ Error refreshing token:", err);
    return null;
  }
}

// 🔄 Fungsi untuk buat ulang client TMI
async function connectBot() {
  client = new tmi.Client({
    identity: {
      username: username,
      password: oauth,
    },
    channels: [channel],
  });

  client.on("message", onMessageHandler);

  try {
    await client.connect();
    console.log(`✅ Bot connected as ${username}`);
  } catch (err) {
    console.error("❌ Failed to connect:", err.message);

    // Coba refresh token
    console.log("🔄 Trying to refresh access token...");
    const newOauth = await refreshAccessToken();
    if (newOauth) {
      oauth = newOauth;
      console.log("🔄 Reconnecting with refreshed token...");
      await connectBot();
    } else {
      console.error("❌ Cannot reconnect, refresh failed.");
    }
  }
}

// 🎯 Handler command
async function onMessageHandler(channel, tags, message, self) {
  if (self) return;

  const args = message.trim().split(" ");
  const command = args[0].toLowerCase();
  const inputAmount = args[1] || "";
  const target = args[2] || "";
  const username = tags.username;

  if (command === "!halo") {
    client.say(channel, `Halo ${username}! Aku ${process.env.TWITCH_USERNAME} 👋`);
    return;
  }

  if (dynamicCommands.includes(command)) {
    try {
      const cmdName = command.slice(1);
      const url = `${GAS_WEBHOOK}?user=${encodeURIComponent(
        username
      )}&cmd=${encodeURIComponent(cmdName)}&amount=${encodeURIComponent(
        inputAmount
      )}&target=${encodeURIComponent(target)}`;

      const res = await fetch(url);
      const text = await res.text();

      if (text) {
        client.say(channel, text);
      }

      if (cmdName === "heist") {
        setTimeout(async () => {
          try {
            const resultUrl = `${GAS_WEBHOOK}?cmd=endheist&user=${encodeURIComponent(username)}`;
            const resultRes = await fetch(resultUrl);
            const resultText = await resultRes.text();

            if (resultText && resultText !== "NONE") {
              client.say(channel, resultText);
            }
          } catch (err) {
            console.error("❌ Failed to get heist result:", err);
          }
        }, 120000); // 2 menit
      }
    } catch (err) {
      console.error(`❌ Error fetch command ${command}:`, err);
      client.say(channel, `Sorry ${username}, there's a problem while running the command.`);
    }
  }
}

// 🚀 Start bot
connectBot();
