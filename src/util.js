export const parseName = (name) => {
  if (name.length === 2) {
    return name[0] + " " + name[1];
  }
  return name;
};

export function calculateMmr(tier, rank, leaguePoints) {
  const TIER = {
    IRON: 0,
    BRONZE: 401,
    SILVER: 802,
    GOLD: 1203,
    PLATINUM: 1604,
    DIAMOND: 2005,
    MASTER: 2406,
    GRANDMASTER: 2406,
    CHALLENGER: 2406,
  };
  const RANK = {
    IV: 0,
    III: 100,
    II: 200,
    I: 300,
  };
  if (tier === "UNRANKED") {
    return -1;
  }
  return TIER[tier] + RANK[rank] + leaguePoints;
}

export function sortByMmrInDescend(a, b) {
  return b.mmr - a.mmr;
}
