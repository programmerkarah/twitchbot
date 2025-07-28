const tmi = require("tmi.js");
const fetch = require("node-fetch");
require("dotenv").config();
const express = require("express");
const fs = require("fs");
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("✅ Bot is running!");
});

app.listen(PORT, () => {
  console.log(`Bot is live at http://localhost:${PORT}`);
});

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
  "!heistresult",
];

async function refreshAccessToken() {
  const url = "https://id.twitch.tv/oauth2/token";
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", process.env.TWITCH_REFRESH_TOKEN);
  params.append("client_id", process.env.TWITCH_CLIENT_ID);
  params.append("client_secret", process.env.TWITCH_CLIENT_SECRET);

  try {
    const res = await fetch(url, { method: "POST", body: params });
    const data = await res.json();

    if (data.access_token) {
      console.log("✅ Access token refreshed successfully");
      process.env.TWITCH_ACCESS_TOKEN = data.access_token;
      fs.writeFileSync(".env", updateEnvToken(data.access_token));
      return data.access_token;
    } else {
      console.error("❌ Failed to refresh token:", data);
    }
  } catch (err) {
    console.error("❌ Error refreshing token:", err);
  }
}

function updateEnvToken(newToken) {
  const env = fs
    .readFileSync(".env", "utf8")
    .split("\n")
    .map((line) => {
      if (line.startsWith("TWITCH_ACCESS_TOKEN=")) {
        return `TWITCH_ACCESS_TOKEN=${newToken}`;
      }
      return line;
    });
  return env.join("\n");
}

const client = new tmi.Client({
  identity: { username: username, password: oauth },
  channels: [channel],
});

client
  .connect()
  .then(() => console.log(`✅ Bot connected as ${username}`))
  .catch(console.error);

client.on("message", async (channel, tags, message, self) => {
  if (self) return;
  const args = message.trim().split(" ");
  const command = args[0].toLowerCase();
  const inputAmount = args[1] || "";
  const target = args[2] || "";
  const username = tags.username;

  if (command === "!hello") {
    client.say(
      channel,
      `Hello ${username}! I'm ${process.env.TWITCH_USERNAME} personal bot👋`,
    );
    return;
  }

  if (dynamicCommands.includes(command)) {
    try {
      const cmdName = command.slice(1);
      const url = `${GAS_WEBHOOK}?user=${encodeURIComponent(username)}&cmd=${encodeURIComponent(cmdName)}&amount=${encodeURIComponent(inputAmount)}&target=${encodeURIComponent(target)}`;
      const res = await fetch(url);
      const text = await res.text();

      if (text) client.say(channel, text);

      if (cmdName === "heist") {
        setTimeout(async () => {
          try {
            const resultUrl = `${GAS_WEBHOOK}?cmd=endheist&user=${encodeURIComponent(username)}`;
            const resultRes = await fetch(resultUrl);
            const resultText = await resultRes.text();
            if (resultText && resultText !== "NONE")
              client.say(channel, resultText);
          } catch (err) {
            console.error("❌ Failed to get heist result:", err);
          }
        }, 300000); // 5 menit
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

setInterval(async () => {
  try {
    const resultUrl = `${GAS_WEBHOOK}?cmd=heistresult&user=systemcheck`;
    const resultRes = await fetch(resultUrl);
    const resultText = await resultRes.text();
    if (resultText && resultText !== "NONE")
      client.say(`#${channel}`, resultText);
  } catch (err) {
    console.error("❌ Failed to auto-fetch heist result:", err);
  }
}, 120000);
