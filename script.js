// Change this date to personalize the live day counter.
const START_DATE = "2026-02-21";
const POSTER = new Image();
POSTER.src = "./assets/reference-texture.webp";

const canvas = document.querySelector("#architecture");
const ctx = canvas.getContext("2d", { alpha: false });
const dayNodes = [document.querySelector("#days"), document.querySelector("#dialog-days")];
const dateNode = document.querySelector("#start-date");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let width = 0;
let height = 0;
let pixelRatio = 1;
let pointer = { x: 0, y: 0 };
let stars = [];
let glyphRows = [];
let lightLeaks = [];
let sideBackdrop = document.createElement("canvas");
let sideContext = sideBackdrop.getContext("2d");
let animationFrame = 0;
let previousFrame = 0;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function randomGenerator(seed) {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function setCounter() {
  const [year, month, day] = START_DATE.split("-").map(Number);
  const start = Date.UTC(year, month - 1, day);
  const today = new Date();
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const elapsed = Math.max(0, Math.floor((todayUtc - start) / 86400000));
  for (const node of dayNodes) node.textContent = elapsed.toLocaleString("en-US");
  dateNode.dateTime = START_DATE;
  dateNode.textContent = START_DATE.replaceAll("-", ".");
}

function prepareAtmosphere() {
  if (!POSTER.complete || !POSTER.naturalWidth || !sideContext) return;
  const bufferWidth = Math.max(1, Math.round(width * 0.5));
  const bufferHeight = Math.max(1, Math.round(height * 0.5));
  sideBackdrop.width = bufferWidth;
  sideBackdrop.height = bufferHeight;
  const scale = Math.max(bufferWidth / POSTER.width, bufferHeight / POSTER.height);
  const drawWidth = POSTER.width * scale;
  const drawHeight = POSTER.height * scale;
  sideContext.clearRect(0, 0, bufferWidth, bufferHeight);
  sideContext.filter = `blur(${Math.max(14, height * 0.022)}px) brightness(0.34) saturate(0.48)`;
  sideContext.drawImage(POSTER, (bufferWidth - drawWidth) / 2, (bufferHeight - drawHeight) / 2, drawWidth, drawHeight);
  sideContext.filter = "none";
}

function makeSceneElements() {
  const random = randomGenerator(Math.round(width * 19 + height * 31) || 1);
  stars = Array.from({ length: Math.round(clamp(width * height / 10000, 80, 180)) }, () => ({
    x: random(),
    y: random() * 0.58,
    radius: random() * 1.15 + 0.2,
    phase: random() * Math.PI * 2,
    alpha: 0.1 + random() * 0.44,
  }));

  const glyphs = "0123456789 /\\[]{}<>:;=+−·░▒▓ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  glyphRows = [];
  for (let x = -12; x < width + 20; x += 20 + random() * 18) {
    let y = height * (0.49 + random() * 0.1);
    const drift = 0.018 + random() * 0.07;
    while (y < height + 25) {
      const length = 3 + Math.floor(random() * 11);
      let text = "";
      for (let i = 0; i < length; i += 1) text += glyphs[Math.floor(random() * glyphs.length)];
      glyphRows.push({ x: x + random() * 8, y, text, alpha: 0.035 + random() * 0.095, drift, phase: random() * 8 });
      y += 15 + random() * 20;
    }
  }

  lightLeaks = Array.from({ length: 16 }, () => ({
    x: random(),
    y: 0.39 + random() * 0.22,
    width: 18 + random() * 95,
    phase: random() * Math.PI * 2,
    hue: [184, 202, 326, 39][Math.floor(random() * 4)],
    alpha: 0.04 + random() * 0.12,
  }));
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  pixelRatio = Math.min(window.devicePixelRatio || 1, 1.8);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  makeSceneElements();
  prepareAtmosphere();
  draw(0);
}

function drawBackdrop(time) {
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, "#252d30");
  base.addColorStop(0.34, "#151b1e");
  base.addColorStop(0.64, "#080b0d");
  base.addColorStop(1, "#020304");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  if (sideBackdrop.width) ctx.drawImage(sideBackdrop, 0, 0, width, height);

  if (POSTER.complete && POSTER.naturalWidth) {
    const imageScale = height / POSTER.height;
    const imageWidth = POSTER.width * imageScale;
    const floatX = reducedMotion.matches ? 0 : Math.sin(time * 0.11) * 2.2 + pointer.x * 2.5;
    const floatY = reducedMotion.matches ? 0 : Math.sin(time * 0.08) * 1.5 + pointer.y * 1.8;
    ctx.save();
    ctx.globalAlpha = 0.98;
    ctx.drawImage(POSTER, (width - imageWidth) / 2 + floatX, floatY, imageWidth, height);
    ctx.restore();
  }

  // Fade the lettering baked into the reference frame before the live HTML title.
  const fade = ctx.createLinearGradient(0, height * 0.5, 0, height * 0.73);
  fade.addColorStop(0, "rgba(2, 4, 5, 0)");
  fade.addColorStop(0.26, "rgba(2, 4, 5, 0.16)");
  fade.addColorStop(0.61, "rgba(2, 4, 5, 0.96)");
  fade.addColorStop(1, "rgba(2, 4, 5, 0.99)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, height * 0.5, width, height * 0.5);
}

function drawCodeField(time) {
  ctx.save();
  for (let i = 0; i < glyphRows.length; i += 1) {
    const glyph = glyphRows[i];
    const drift = reducedMotion.matches ? 0 : Math.sin(time * 0.28 + glyph.phase) * glyph.drift;
    const y = glyph.y + drift;
    const fontSize = Math.max(5, Math.min(8.5, width / 115));
    ctx.font = `${fontSize}px "Space Mono", "Courier New", monospace`;
    ctx.fillStyle = `rgba(197, 206, 201, ${glyph.alpha})`;
    ctx.fillText(glyph.text, glyph.x, y);
  }
  ctx.restore();
}

function drawGlints(time) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < lightLeaks.length; i += 1) {
    const leak = lightLeaks[i];
    const flicker = 0.55 + Math.sin(time * 1.2 + leak.phase) * 0.45;
    const x = leak.x * width + (reducedMotion.matches ? 0 : Math.sin(time * 0.12 + leak.phase) * 8);
    const y = leak.y * height;
    const line = ctx.createLinearGradient(x - leak.width / 2, y, x + leak.width / 2, y);
    line.addColorStop(0, `hsla(${leak.hue}, 88%, 72%, 0)`);
    line.addColorStop(0.5, `hsla(${leak.hue}, 88%, 77%, ${leak.alpha * flicker})`);
    line.addColorStop(1, `hsla(${(leak.hue + 65) % 360}, 88%, 72%, 0)`);
    ctx.fillStyle = line;
    ctx.fillRect(x - leak.width / 2, y, leak.width, 1 + flicker * 2);
  }

  // Fine scan lines and occasional RGB split echo the chromatic edges in the clip.
  const scanY = height * (0.43 + ((time * 0.025) % 0.17));
  const scan = ctx.createLinearGradient(0, scanY - 32, 0, scanY + 32);
  scan.addColorStop(0, "rgba(0, 0, 0, 0)");
  scan.addColorStop(0.48, "rgba(191, 218, 215, 0.035)");
  scan.addColorStop(0.5, "rgba(239, 249, 242, 0.13)");
  scan.addColorStop(0.53, "rgba(210, 76, 139, 0.045)");
  scan.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = scan;
  ctx.fillRect(0, scanY - 32, width, 64);
  ctx.restore();
}

function drawAtmosphere(time) {
  const glow = ctx.createRadialGradient(width * 0.5, height * 0.2, 0, width * 0.5, height * 0.2, width * 0.78);
  glow.addColorStop(0, "rgba(196, 211, 202, 0.08)");
  glow.addColorStop(0.7, "rgba(77, 99, 104, 0.035)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0.18)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height * 0.78);

  for (const star of stars) {
    const pulse = reducedMotion.matches ? 1 : 0.72 + Math.sin(time * 1.25 + star.phase) * 0.28;
    ctx.globalAlpha = star.alpha * pulse;
    ctx.fillStyle = "#d8e3e0";
    ctx.beginPath();
    ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawVignette() {
  const shade = ctx.createRadialGradient(width * 0.5, height * 0.34, height * 0.08, width * 0.5, height * 0.47, height * 0.8);
  shade.addColorStop(0, "rgba(0, 0, 0, 0)");
  shade.addColorStop(0.72, "rgba(0, 0, 0, 0.12)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0.58)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
}

function draw(timestamp) {
  animationFrame = 0;
  const time = timestamp * 0.001;
  drawBackdrop(time);
  drawAtmosphere(time);
  drawCodeField(time);
  drawGlints(time);
  drawVignette();
}

function frame(timestamp) {
  if (timestamp - previousFrame > 32) {
    previousFrame = timestamp;
    draw(timestamp);
  }
  if (!reducedMotion.matches && !document.hidden) animationFrame = requestAnimationFrame(frame);
}

function startAnimation() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  if (reducedMotion.matches) draw(0);
  else animationFrame = requestAnimationFrame(frame);
}

const dialog = document.querySelector("#memory-dialog");
document.querySelector("#enter").addEventListener("click", () => dialog.showModal());
document.querySelector("#close-dialog").addEventListener("click", () => dialog.close());
document.querySelector("#return").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener("close", () => document.querySelector("#enter").focus());

POSTER.addEventListener("load", () => {
  prepareAtmosphere();
  startAnimation();
});
window.addEventListener("resize", resize, { passive: true });
window.addEventListener("pointermove", (event) => {
  pointer.x = clamp((event.clientX / width - 0.5) * 2, -1, 1);
  pointer.y = clamp((event.clientY / height - 0.5) * 2, -1, 1);
}, { passive: true });
document.addEventListener("visibilitychange", () => {
  if (document.hidden && animationFrame) cancelAnimationFrame(animationFrame);
  else startAnimation();
});
reducedMotion.addEventListener("change", startAnimation);

setCounter();
window.setInterval(setCounter, 60_000);
resize();
startAnimation();
