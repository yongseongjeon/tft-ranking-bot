// TODO: 정식 라이엇 API 키로 변경
import { Client, Intents, MessageEmbed, MessageAttachment } from "discord.js";
import { parseName, sortByMmrInDescend } from "./util.js";
import { requestGetSummonerInfo, requestSummoner } from "./request.js";
import { getValueFromDatabase, setValueToDatabase } from "./db.js";
import "dotenv/config";
import { createCanvas, registerFont } from "canvas";

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});
client.on("ready", handleReady);
client.on("messageCreate", handleMessage);
client.login(process.env.DISCORD_API_KEY);
registerFont("./src/font/Orbit-Regular.ttf", { family: "Orbit-Regular" });

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
    const MAXIMUM_NUMBER_OF_USERS = 20;
    const isMaximumNumberOfUsers = users.length >= MAXIMUM_NUMBER_OF_USERS;
    if (isMaximumNumberOfUsers) {
      message.channel.send(`현재 ${MAXIMUM_NUMBER_OF_USERS}명 이상 추가할 수 없습니다.`);
      return;
    }
    const isAlreadyAddedUser = users.some((user) => user.name === parseName(enteredName));
    if (isAlreadyAddedUser) {
      message.channel.send(`${parseName(enteredName)}님은 이미 추가되었습니다.`);
      return;
    }
    const { id: summonerId } = await requestGetSummonerInfo(parseName(enteredName));
    const isExistUserInLOL = !!summonerId;
    if (!isExistUserInLOL) {
      message.channel.send(`${parseName(enteredName)}님은 존재하지 않는 유저입니다.`);
      return;
    }
    const newUser = { name: parseName(enteredName), summonerId };
    const updatedUsers = [...users, newUser];
    setValueToDatabase("users", updatedUsers);
    message.channel.send(`${parseName(enteredName)}님이 추가되었습니다.`);
    return;
  }
  if (keyword === "삭제") {
    const isAddedUser = users.some((user) => user.name === parseName(enteredName));
    if (!isAddedUser) {
      message.channel.send(`${parseName(enteredName)}님은 순위에 존재하지 않습니다.`);
      return;
    }
    const updatedUsers = users.filter((user) => user.name !== parseName(enteredName));
    setValueToDatabase("users", updatedUsers);
    message.channel.send(`${parseName(enteredName)}님이 삭제되었습니다.`);
    return;
  }
  const isValidKeyword = keyword === "추가" || keyword === "삭제" || keyword === "순위" || keyword === "도움말" || keyword === "캔버스";
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
  // 순위를 embeds로 출력하는 기능이나 모바일에서 제대로 보이지 않아 임시 비활성화
  // if (keyword === "순위") {
  //   if (!hasPeople) {
  //     message.channel.send("현재 추가된 사람이 없습니다.");
  //     return;
  //   }
  //   const requestPromises = users.map(({ name, summonerId }) => requestSummoner(name, summonerId));
  //   const summoners = await Promise.all(requestPromises);
  //   summoners.sort(sortByMmrInDescend);
  //   const names = summoners.map(({ summonerName }) => summonerName);
  //   const ranks = summoners.map(({ tier, rank, leaguePoints }) => {
  //     if (tier === "UNRANKED") {
  //       return `UNRANKED`;
  //     }
  //     return `${tier} ${rank} ${leaguePoints}`;
  //   });
  //   const restRanking = Array.from({ length: Math.max(0, users.length - 3) }, (_, i) => 4 + i);
  //   const table = new MessageEmbed().setTitle("WE CLAN TFT 랭킹").addFields(
  //     {
  //       name: "순위\n",
  //       value: ["🥇", "🥈", "🥉", ...restRanking].join("\n\n"),
  //       inline: true,
  //     },
  //     { name: "닉네임\n", value: names.join("\n\n"), inline: true },
  //     { name: "티어\n", value: ranks.join("\n\n"), inline: true }
  //   );
  //   message.channel.send({ embeds: [table] });
  // }
  if (keyword === "순위") {
    if (!hasPeople) {
      message.channel.send("현재 추가된 사람이 없습니다.");
      return;
    }
    const requestPromises = users.map(({ name, summonerId }) => requestSummoner(name, summonerId));
    const summoners = await Promise.all(requestPromises);
    summoners.sort(sortByMmrInDescend);

    const splitedSummoners = splitArrayByNthELement(summoners, 10);

    const rankingImages = splitedSummoners.map((summoners, i) => {
      const canvas = drawRankingImage(summoners, i);
      return convertCanvasToImage(canvas);
    });

    rankingImages.forEach((rankingImage) => message.channel.send({ files: [rankingImage] }));
  }
}

function drawRankingImage(summoners, i) {
  const names = summoners.map(({ summonerName }) => summonerName);
  const ranks = summoners.map(({ tier, rank, leaguePoints }) => {
    if (tier === "UNRANKED") {
      return tier;
    }
    return `${tier} ${rank} ${leaguePoints}`;
  });
  const ranking = Array.from({ length: summoners.length }, (_, index) => 1 + 10 * i + index);
  const canvas = createCanvas(600, 445);
  const context = canvas.getContext("2d");

  context.fillStyle = "#313338";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "white";
  context.font = "bold 24px Orbit-Regular";

  const cellWidth = canvas.width / 3;
  const cellHeight = 40;

  if (i === 0) {
    context.fillText("순위", 0, cellHeight);
    context.fillText("닉네임", 0.4 * cellWidth, cellHeight);
    context.fillText("티어", 1.4 * cellWidth, cellHeight);

    ranking.forEach((rank, index) => context.fillText(rank, 0, (index + 2) * cellHeight));
    names.forEach((name, index) => context.fillText(name, 0.4 * cellWidth, (index + 2) * cellHeight));
    ranks.forEach((rank, index) => context.fillText(rank, 1.4 * cellWidth, (index + 2) * cellHeight));

    return canvas;
  }
  ranking.forEach((rank, index) => context.fillText(rank, 0, (index + 1) * cellHeight - 15));
  names.forEach((name, index) => context.fillText(name, 0.4 * cellWidth, (index + 1) * cellHeight - 15));
  ranks.forEach((rank, index) => context.fillText(rank, 1.4 * cellWidth, (index + 1) * cellHeight - 15));

  return canvas;
}

function convertCanvasToImage(canvas) {
  const rankingImage = canvas.toBuffer();
  return new MessageAttachment(rankingImage, "rankingImage.png");
}

function splitArrayByNthELement(array, n) {
  const total = [];
  for (let i = 0; i < array.length; i += n) {
    total.push(array.slice(i, i + n));
  }
  return total;
}
