// Change this date to personalize the live day counter.
const START_DATE = "2026-02-21";

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
let shards = [];
let glyphRows = [];
let animationFrame = 0;
let previousFrame = 0;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mix = (a, b, amount) => a + (b - a) * amount;

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

function makeSceneElements() {
  const seed = Math.round(width * 17 + height * 29);
  const random = randomGenerator(seed || 1);
  const starCount = Math.round(clamp((width * height) / 7800, 90, 210));
  stars = Array.from({ length: starCount }, () => ({
    x: random(),
    y: random() * 0.72,
    radius: random() * 1.15 + 0.2,
    phase: random() * Math.PI * 2,
    alpha: random() * 0.55 + 0.12,
  }));

  const shardCount = Math.round(clamp(width / 35, 13, 34));
  shards = Array.from({ length: shardCount }, (_, index) => ({
    x: random() * width,
    y: height * (0.34 + random() * 0.29),
    size: 16 + random() * Math.min(108, width * 0.12),
    angle: random() * Math.PI * 2,
    spin: (random() - 0.5) * 0.00018,
    alpha: 0.12 + random() * 0.2,
    hue: [178, 203, 342, 28][index % 4],
  }));

  const symbols = "0123456789 /\\[]{}<>:;=+−·░▒▓ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const columns = Math.round(width / 36);
  glyphRows = [];
  for (let column = 0; column < columns; column += 1) {
    let y = height * (0.48 + random() * 0.12);
    const x = column * 36 + random() * 22;
    for (let row = 0; y < height + 30; row += 1) {
      const length = 4 + Math.floor(random() * 16);
      let text = "";
      for (let i = 0; i < length; i += 1) text += symbols[Math.floor(random() * symbols.length)];
      glyphRows.push({ x, y, text, alpha: 0.035 + random() * 0.085, drift: random() * 0.08 });
      y += 13 + random() * 10;
    }
  }
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
  draw(0);
}

function drawAtmosphere(time) {
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#11181b");
  background.addColorStop(0.28, "#0a1012");
  background.addColorStop(0.56, "#080c0e");
  background.addColorStop(1, "#020304");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const halo = ctx.createRadialGradient(width * 0.5, height * 0.22, 2, width * 0.5, height * 0.22, width * 0.74);
  halo.addColorStop(0, "rgba(150, 177, 180, 0.15)");
  halo.addColorStop(0.48, "rgba(54, 76, 81, 0.09)");
  halo.addColorStop(1, "rgba(3, 5, 6, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height * 0.74);

  for (const star of stars) {
    const pulse = 0.72 + Math.sin(time * 1.2 + star.phase) * 0.28;
    ctx.globalAlpha = star.alpha * pulse;
    ctx.fillStyle = star.radius > 0.95 ? "#dbe5e2" : "#9baeb0";
    ctx.beginPath();
    ctx.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawDome(time) {
  const cx = width * 0.5 + pointer.x * 13;
  const cy = height * 0.255 + pointer.y * 5;
  const rx = width * 0.62;
  const ry = Math.min(height * 0.225, width * 0.43);
  const blue = "rgba(193, 213, 211, ";

  ctx.save();
  ctx.lineWidth = 0.7;
  ctx.strokeStyle = "rgba(122, 165, 173, 0.16)";
  ctx.beginPath();
  ctx.ellipse(cx, cy + ry * 0.12, rx * 1.09, ry * 0.52, -0.025, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy + ry * 0.09, rx * 1.15, ry * 0.31, 0.035, 0, Math.PI * 2);
  ctx.stroke();

  for (let meridian = 0; meridian < 56; meridian += 1) {
    const longitude = (meridian / 56) * Math.PI * 2;
    const depth = Math.cos(longitude);
    const alpha = depth > 0 ? 0.15 + depth * 0.28 : 0.055;
    ctx.beginPath();
    for (let step = 0; step <= 48; step += 1) {
      const latitude = -Math.PI / 2 + (step / 48) * Math.PI;
      const x = cx + rx * Math.cos(latitude) * Math.sin(longitude);
      const y = cy + ry * Math.sin(latitude);
      if (step === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = meridian % 7 === 0 ? 1.2 : 0.65;
    ctx.strokeStyle = `${blue}${alpha})`;
    ctx.stroke();
  }

  for (let ring = 1; ring <= 18; ring += 1) {
    const latitude = -1.48 + (ring / 19) * 2.96;
    const radiusX = rx * Math.cos(latitude);
    const y = cy + ry * Math.sin(latitude);
    const radiusY = Math.max(0.7, ry * 0.024 * Math.cos(latitude));
    const gleam = ring % 4 === 0 ? 0.3 : 0.13;
    ctx.beginPath();
    ctx.ellipse(cx, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.lineWidth = ring % 4 === 0 ? 1.1 : 0.55;
    ctx.strokeStyle = `${blue}${gleam})`;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(222, 232, 227, 0.62)";
  ctx.shadowColor = "rgba(191, 226, 228, 0.4)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const irisY = cy - ry * 0.48;
  for (let ring = 0; ring < 4; ring += 1) {
    ctx.beginPath();
    ctx.ellipse(cx, irisY, rx * (0.13 + ring * 0.035), ry * (0.18 + ring * 0.05), 0, 0, Math.PI * 2);
    ctx.lineWidth = ring === 0 ? 1.3 : 0.75;
    ctx.strokeStyle = ring === 0 ? "rgba(237, 239, 228, 0.8)" : "rgba(183, 207, 204, 0.36)";
    ctx.stroke();
  }
  for (let spoke = 0; spoke < 24; spoke += 1) {
    const a = (spoke / 24) * Math.PI * 2;
    const outerX = cx + Math.cos(a) * rx * 0.27;
    const outerY = irisY + Math.sin(a) * ry * 0.31;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rx * 0.055, irisY + Math.sin(a) * ry * 0.07);
    ctx.lineTo(outerX, outerY);
    ctx.lineWidth = spoke % 3 === 0 ? 1 : 0.6;
    ctx.strokeStyle = `rgba(212, 225, 219, ${spoke % 3 === 0 ? 0.52 : 0.24})`;
    ctx.stroke();
  }

  const windowCount = Math.max(11, Math.round(width / 72));
  const baseY = cy + ry * 0.8;
  for (let i = 0; i < windowCount; i += 1) {
    const x = mix(width * 0.08, width * 0.92, i / (windowCount - 1));
    const edge = Math.abs(x - cx) / (width * 0.42);
    const top = baseY - height * (0.105 * (1 - edge * 0.5));
    const w = Math.min(42, width / (windowCount * 1.5));
    const bottom = baseY + height * 0.065;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, bottom);
    ctx.lineTo(x - w / 2, top + w * 0.45);
    ctx.quadraticCurveTo(x - w / 2, top, x, top);
    ctx.quadraticCurveTo(x + w / 2, top, x + w / 2, top + w * 0.45);
    ctx.lineTo(x + w / 2, bottom);
    ctx.strokeStyle = "rgba(193, 215, 210, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, top + 4);
    ctx.lineTo(x, bottom);
    ctx.strokeStyle = "rgba(187, 211, 207, 0.12)";
    ctx.stroke();
  }

  const glint = (time * 0.13) % 1;
  const glintX = cx + Math.sin(glint * Math.PI * 2) * rx * 0.86;
  const glintY = cy + ry * Math.sin(glint * Math.PI * 1.8);
  const glintGradient = ctx.createRadialGradient(glintX, glintY, 0, glintX, glintY, 26);
  glintGradient.addColorStop(0, "rgba(238, 244, 231, 0.6)");
  glintGradient.addColorStop(1, "rgba(205, 226, 226, 0)");
  ctx.fillStyle = glintGradient;
  ctx.fillRect(glintX - 28, glintY - 28, 56, 56);
  ctx.restore();
}

function drawGround(time) {
  const horizon = height * 0.47;
  const vanishX = width * 0.5 + pointer.x * 8;

  ctx.save();
  for (let i = 0; i < 18; i += 1) {
    const x = (i / 17) * width;
    const h = 13 + ((i * 19) % 39);
    ctx.fillStyle = i % 3 === 0 ? "rgba(151, 174, 170, 0.11)" : "rgba(82, 105, 107, 0.13)";
    ctx.fillRect(x, horizon - h * 0.25, width / 30, h);
    ctx.strokeStyle = "rgba(178, 198, 192, 0.14)";
    ctx.lineWidth = 0.65;
    ctx.strokeRect(x + 2, horizon - h * 0.25 + 2, width / 30 - 4, h - 4);
  }

  const gridGlow = ctx.createLinearGradient(0, horizon, 0, height);
  gridGlow.addColorStop(0, "rgba(123, 153, 154, 0.17)");
  gridGlow.addColorStop(1, "rgba(110, 137, 137, 0.015)");
  ctx.strokeStyle = gridGlow;
  ctx.lineWidth = 0.72;
  for (let i = -15; i <= 15; i += 1) {
    const bottomX = vanishX + i * width * 0.08;
    ctx.beginPath();
    ctx.moveTo(vanishX, horizon);
    ctx.lineTo(bottomX, height * 1.04);
    ctx.stroke();
  }
  for (let row = 0; row < 17; row += 1) {
    const progress = row / 16;
    const y = horizon + Math.pow(progress, 1.62) * (height - horizon) * 1.04;
    const halfWidth = mix(width * 0.06, width * 1.1, Math.pow(progress, 1.2));
    ctx.beginPath();
    ctx.ellipse(vanishX, y, halfWidth, Math.max(1.5, 1 + progress * 5), 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i <= 12; i += 1) {
    const x = (i / 12) * width;
    const bottomX = x + (vanishX - x) * 0.18;
    ctx.beginPath();
    ctx.moveTo(x, horizon - 7);
    ctx.lineTo(bottomX, height * 0.78);
    ctx.lineWidth = i % 3 === 0 ? 1.25 : 0.7;
    ctx.strokeStyle = i % 3 === 0 ? "rgba(199, 213, 204, 0.22)" : "rgba(137, 164, 161, 0.12)";
    ctx.stroke();
  }

  for (let i = 0; i < glyphRows.length; i += 1) {
    const item = glyphRows[i];
    const y = item.y + Math.sin(time * 0.25 + i) * item.drift;
    ctx.font = `${Math.max(6, Math.min(9, width / 120))}px "Space Mono", monospace`;
    ctx.fillStyle = `rgba(186, 202, 194, ${item.alpha})`;
    ctx.fillText(item.text, item.x, y);
  }
  ctx.restore();
}

function drawShards(time) {
  ctx.save();
  for (let index = 0; index < shards.length; index += 1) {
    const shard = shards[index];
    const drift = Math.sin(time * 0.16 + index * 1.7) * 9;
    const angle = shard.angle + time * shard.spin * 60;
    const points = [[-0.62, -0.42], [0.48, -0.58], [0.7, 0.34], [-0.17, 0.56]];
    const transformed = points.map(([x, y]) => {
      const px = x * shard.size;
      const py = y * shard.size;
      return [
        shard.x + drift + px * Math.cos(angle) - py * Math.sin(angle),
        shard.y + px * Math.sin(angle) + py * Math.cos(angle),
      ];
    });
    ctx.beginPath();
    transformed.forEach(([x, y], point) => (point === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
    ctx.closePath();
    const fill = ctx.createLinearGradient(transformed[0][0], transformed[0][1], transformed[2][0], transformed[2][1]);
    fill.addColorStop(0, `hsla(${shard.hue}, 76%, 70%, ${shard.alpha * 0.18})`);
    fill.addColorStop(1, "rgba(139, 168, 170, 0.015)");
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = `hsla(${shard.hue}, 76%, 71%, ${shard.alpha})`;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(transformed[0][0], transformed[0][1]);
    ctx.lineTo(transformed[2][0], transformed[2][1]);
    ctx.strokeStyle = `rgba(221, 233, 225, ${shard.alpha * 0.65})`;
    ctx.lineWidth = 0.55;
    ctx.stroke();
  }
  ctx.restore();
}

function drawVignette() {
  const shade = ctx.createRadialGradient(width * 0.5, height * 0.34, height * 0.05, width * 0.5, height * 0.45, height * 0.82);
  shade.addColorStop(0, "rgba(0, 0, 0, 0)");
  shade.addColorStop(0.68, "rgba(0, 0, 0, 0.08)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0.72)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width, height);
}

function draw(timestamp) {
  animationFrame = 0;
  const time = reducedMotion.matches ? 0 : timestamp * 0.001;
  drawAtmosphere(time);
  drawGround(time);
  drawDome(time);
  drawShards(time);
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
