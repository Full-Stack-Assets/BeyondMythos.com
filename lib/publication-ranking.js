"use strict";

function rankPublications(rows, { minimumDays = 28, winnerCount = 12 } = {}) {
  if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
  const eligible = rows.filter((row) => Number(row.measurementDays || 0) >= minimumDays).map((row) => {
    const score =
      Number(row.organicClicks || 0) +
      Number(row.engagedSessions || 0) * 0.25 +
      Number(row.newsletterSignups || 0) * 15 +
      Number(row.monetizationClicks || 0) * 3 +
      Number(row.publisherRevenue || 0) * 10;
    return { ...row, score: Number(score.toFixed(2)) };
  });
  return eligible.sort((a, b) => b.score - a.score).slice(0, winnerCount);
}

module.exports = { rankPublications };
