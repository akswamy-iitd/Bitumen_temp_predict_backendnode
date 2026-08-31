const crypto = require("crypto");

const CAPTCHA_TTL_MS = 5 * 60 * 1000;
const PROOF_TTL_MS = 2 * 60 * 1000;
const CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const challenges = new Map();
const usedProofs = new Set();

function getSecret() {
  return (
    process.env.CAPTCHA_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.JWT_SECRET ||
    "development-captcha-secret-change-in-production"
  );
}

function sign(value) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function removeExpiredEntries() {
  const now = Date.now();
  for (const [id, challenge] of challenges) {
    if (challenge.expiresAt <= now) challenges.delete(id);
  }
}

function randomText(length = 5) {
  return Array.from(
    { length },
    () => CHARACTERS[crypto.randomInt(0, CHARACTERS.length)]
  ).join("");
}

function buildSvg(answer) {
  const letters = [...answer]
    .map((character, index) => {
      const x = 26 + index * 31;
      const y = crypto.randomInt(43, 60);
      const rotation = crypto.randomInt(-22, 23);
      return `<text x="${x}" y="${y}" transform="rotate(${rotation} ${x} ${y})">${character}</text>`;
    })
    .join("");

  const noise = Array.from({ length: 7 }, () => {
    const x1 = crypto.randomInt(0, 190);
    const y1 = crypto.randomInt(0, 70);
    const x2 = crypto.randomInt(0, 190);
    const y2 = crypto.randomInt(0, 70);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="190" height="70" viewBox="0 0 190 70">
    <rect width="190" height="70" rx="8" fill="#18181b" />
    <g stroke="#f59e0b" stroke-width="1" opacity="0.45">${noise}</g>
    <g fill="#fbbf24" font-family="monospace" font-size="34" font-weight="700">${letters}</g>
  </svg>`;
}

function createCaptcha(userId) {
  removeExpiredEntries();
  const id = crypto.randomUUID();
  const answer = randomText();
  challenges.set(id, {
    answer,
    userId: String(userId),
    expiresAt: Date.now() + CAPTCHA_TTL_MS,
  });

  return {
    challengeId: id,
    image: `data:image/svg+xml;base64,${Buffer.from(buildSvg(answer)).toString("base64")}`,
    expiresInSeconds: CAPTCHA_TTL_MS / 1000,
  };
}

function solveCaptcha(challengeId, answer, userId) {
  removeExpiredEntries();
  const challenge = challenges.get(challengeId);
  challenges.delete(challengeId);

  if (
    !challenge ||
    challenge.userId !== String(userId) ||
    typeof answer !== "string" ||
    challenge.answer !== answer.trim().toUpperCase()
  ) {
    return null;
  }

  const proofId = crypto.randomUUID();
  const payload = Buffer.from(
    JSON.stringify({
      id: proofId,
      userId: String(userId),
      expiresAt: Date.now() + PROOF_TTL_MS,
    })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

function consumeCaptchaProof(proof, userId) {
  if (typeof proof !== "string") return false;
  const [payload, signature] = proof.split(".");
  if (!payload || !signature || !secureEqual(sign(payload), signature)) return false;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      data.userId !== String(userId) ||
      data.expiresAt <= Date.now() ||
      usedProofs.has(data.id)
    ) {
      return false;
    }
    usedProofs.add(data.id);
    setTimeout(() => usedProofs.delete(data.id), PROOF_TTL_MS).unref();
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = { createCaptcha, solveCaptcha, consumeCaptchaProof };
