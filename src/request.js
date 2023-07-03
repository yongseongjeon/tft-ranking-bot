import fetch from "node-fetch";

export async function request({ url, method, body }) {
  const headers = {
    "X-Riot-Token": process.env.REACT_APP_RIOT_API_KEY,
  };
  const options = { method, headers };
  const hasBody = !!body;
  if (hasBody) {
    options.body = JSON.stringify(body);
  }
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error("Request가 실패했습니다.");
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
  const { tier, rank, summonerName, leaguePoints } = res[0];
  return { tier, rank, summonerName, leaguePoints };
}

export async function requestSummoner(name) {
  const { id: summonerId } = await requestGetSummonerInfo(name);
  const { tier, rank, summonerName, leaguePoints } = await requestGetTftRankInfo(summonerId);
  return { tier, rank, summonerName, leaguePoints, mmr: getMmr(tier, rank, leaguePoints) };
}
