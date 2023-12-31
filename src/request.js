import fetch from "node-fetch";
import { calculateMmr } from "./util.js";

export async function request({ url, method, body }) {
  const headers = {
    "X-Riot-Token": process.env.RIOT_API_KEY,
  };
  const options = { method, headers };
  const hasBody = !!body;
  if (hasBody) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    return false;
  }
  const hasBodyOfRes = !!res.headers.get("Content-Type");
  if (!hasBodyOfRes) {
    return res;
  }
  const resJson = await res.json();
  return resJson;
}

export async function requestGetSummonerInfo(summonerName) {
  const res = await request({
    url: `https://kr.api.riotgames.com/tft/summoner/v1/summoners/by-name/${summonerName}`,
    method: "GET",
  });
  return res;
}

export async function requestGetTftRankInfo(summonerId) {
  const res = await request({
    url: `https://kr.api.riotgames.com/tft/league/v1/entries/by-summoner/${summonerId}`,
    method: "GET",
  });
  const isFailRequest = !res;
  if (isFailRequest) {
    return false;
  }
  const hasTftStatus = res.length >= 1;
  if (!hasTftStatus) {
    return { tier: "UNRANKED" };
  }
  const [soloRankRes] = res.filter((x) => x.queueType === "RANKED_TFT");
  const { tier, rank, summonerName, leaguePoints } = soloRankRes;
  return { tier, rank, summonerName, leaguePoints };
}

export async function requestSummoner(name, summonerId) {
  const res = await requestGetTftRankInfo(summonerId);
  if (!res) {
    return false;
  }
  const { tier, rank, summonerName, leaguePoints } = res;
  return { tier, rank, summonerName: summonerName || name, leaguePoints, mmr: calculateMmr(tier, rank, leaguePoints) };
}
