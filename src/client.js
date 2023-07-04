import { Client, Intents, MessageEmbed } from "discord.js";
import { parseName, sortByMmrInDescend } from "./util.js";
import { requestSummoner } from "./request.js";
import { getValueFromDatabase, setValueToDatabase } from "./db.js";
import "dotenv/config";

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
client.on("ready", handleReady);
client.on("messageCreate", handleMessage);
client.login(process.env.DISCORD_API_KEY);

function handleReady() {
  console.log("TFT RANKING BOT이 온라인입니다.");
}

async function handleMessage(message) {
  if (message.author.bot) {
    return;
  }
  if (!message.content) {
    return;
  }
  const users = await getValueFromDatabase("users");
  const [_, keyword, enteredName] = message.content
    .trim()
    .replace(/^<@[!&]?\d+>/, "")
    .split(" ");
  if (keyword === "추가") {
    const isAlreadyExistUser = users.includes(parseName(enteredName));
    if (isAlreadyExistUser) {
      message.channel.send(`${parseName(enteredName)}님은 이미 추가되었습니다.`);
      return;
    }
    const updatedUsers = [...users, parseName(enteredName)];
    setValueToDatabase("users", updatedUsers);
    message.channel.send(`${parseName(enteredName)}님이 추가되었습니다.`);
    return;
  }
  if (keyword === "삭제") {
    const isExistUser = users.includes(parseName(enteredName));
    if (!isExistUser) {
      message.channel.send(`${parseName(enteredName)}님은 순위에 존재하지 않습니다.`);
      return;
    }
    const updatedUsers = users.filter((userName) => userName !== parseName(enteredName));
    setValueToDatabase("users", updatedUsers);
    message.channel.send(`${parseName(enteredName)}님이 삭제되었습니다.`);
    return;
  }
  const isValidKeyword = keyword === "추가" || keyword === "삭제" || keyword === "순위" || keyword === "도움말";
  if (!isValidKeyword) {
    message.channel.send("올바른 명령어가 아닙니다. 도움말을 확인하시려면 `@WE TFT Ranking 도움말`을 입력해주세요.");
    return;
  }
  if (keyword === "도움말") {
    message.channel.send(
      "모든 명령어는 다음과 같이 봇을 멘션하여 사용해야 합니다. 예시) `@WE TFT Ranking` 명령어\n\n명령어 목록은 아래와 같습니다.\n\n- **추가 <롤 닉네임>** | 띄어쓰기를 제외한 롤 닉네임을 입력하여 순위에 추가할 수 있습니다.\n  - 예시) `@WE TFT Ranking` 추가 김점중\n- **삭제 <롤 닉네임>** | 띄어쓰기를 제외한 롤 닉네임을 입력하여 순위에서 삭제할 수 있습니다.\n  - 예시) `@WE TFT Ranking` 삭제 김점중\n- **순위** | 추가된 사람들의 TFT 순위를 확인할 수 있습니다.\n   - 예시) `@WE TFT Ranking` 순위"
    );
    return;
  }
  const hasPeople = users.length >= 1;
  if (keyword === "순위") {
    if (!hasPeople) {
      message.channel.send("현재 추가된 사람이 없습니다.");
      return;
    }
    const requestPromises = users.map(requestSummoner);
    const summoners = await Promise.all(requestPromises);
    summoners.sort(sortByMmrInDescend);
    const names = summoners.map(({ summonerName }) => summonerName);
    const ranks = summoners.map(({ tier, rank, leaguePoints }) => {
      if (tier === "UNRANKED") {
        return `UNRANKED`;
      }
      return `${tier} ${rank} ${leaguePoints}`;
    });
    const restRanking = Array.from({ length: Math.max(0, users.length - 3) }, (_, i) => 4 + i);
    const table = new MessageEmbed().setTitle("WE CLAN TFT 랭킹").addFields(
      {
        name: "순위\n",
        value: ["🥇", "🥈", "🥉", ...restRanking].join("\n\n"),
        inline: true,
      },
      { name: "닉네임\n", value: names.join("\n\n"), inline: true },
      { name: "티어\n", value: ranks.join("\n\n"), inline: true }
    );
    message.channel.send({ embeds: [table] });
  }
}
