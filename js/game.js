// ASTRO & SCHNAUZER: Odyssey 198X - Core Game Engine
(function () {
  "use strict";

  const TILE = 16;
  const VIEW_W = 480;
  const VIEW_H = 270;

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // Overlays & Buttons
  const overlayTitle = document.getElementById("overlay-title");
  const overlayPause = document.getElementById("overlay-pause");
  const overlayClear = document.getElementById("overlay-clear");
  const overlayEnd = document.getElementById("overlay-end");
  const clearTitle = document.getElementById("clear-title");
  const clearStats = document.getElementById("clear-stats");
  const endEyebrow = document.getElementById("end-eyebrow");
  const endTitle = document.getElementById("end-title");
  const endSubtitle = document.getElementById("end-subtitle");
  const endStats = document.getElementById("end-stats");
  const canvasWrapper = document.getElementById("canvas-wrapper");

  const btnStart = document.getElementById("btn-start");
  const btnResume = document.getElementById("btn-resume");
  const btnRestartLevel = document.getElementById("btn-restart-level");
  const btnNextLevel = document.getElementById("btn-next-level");
  const btnPlayAgain = document.getElementById("btn-play-again");
  const btnCrt = document.getElementById("btn-crt");
  const btnMusic = document.getElementById("btn-music");
  const btnSfx = document.getElementById("btn-sfx");
  const btnPause = document.getElementById("btn-pause");

  // Input State
  const keys = {
    left: false,
    right: false,
    jump: false,
    shoot: false
  };
  let jumpJustPressed = false;
  let shootJustPressed = false;

  // Game State
  let gameState = "TITLE"; // TITLE, PLAYING, PAUSED, CLEAR, GAMEOVER, VICTORY
  let currentLevelIdx = 0;
  let score = 0;
  let starsTotal = 0;
  let lives = 3;
  let globalTick = 0;
  let screenShake = 0;

  // Level Runtime Data
  let levelData = null;
  let tiles = [];
  let mapCols = 0;
  let mapRows = 0;
  let blockOffsets = {}; // "c,r" -> bounce y offset
  let usedBlocks = new Set();
  let stars = [];
  let powerups = [];
  let enemies = [];
  let projectiles = [];
  let particles = [];
  let floatingTexts = [];
  let rocketGoal = null;
  let skyMeteorTimer = 0;
  let bgStars = [];

  // Entities
  let player = null;
  let dog = null;
  let camX = 0;

  function initBgStars() {
    bgStars = [];
    for (let i = 0; i < 85; i++) {
      bgStars.push({
        x: Math.random() * VIEW_W,
        y: Math.random() * (VIEW_H - 40),
        size: Math.random() < 0.2 ? 2 : 1,
        speed: 0.08 + Math.random() * 0.25,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function showOverlay(el) {
    [overlayTitle, overlayPause, overlayClear, overlayEnd].forEach((o) => o.classList.remove("active"));
    if (el) el.classList.add("active");
  }

  function loadLevel(idx, keepUpgrades = false) {
    currentLevelIdx = idx;
    levelData = window.Levels[idx];
    tiles = levelData.map.map((row) => row.split(""));
    mapRows = tiles.length;
    mapCols = tiles[0].length;
    blockOffsets = {};
    usedBlocks = new Set();
    stars = [];
    powerups = [];
    enemies = [];
    projectiles = [];
    particles = [];
    floatingTexts = [];
    rocketGoal = null;
    skyMeteorTimer = levelData.skyMeteorInterval || 0;

    // Parse entities from map
    for (let r = 0; r < mapRows; r++) {
      for (let c = 0; c < mapCols; c++) {
        const ch = tiles[r][c];
        const wx = c * TILE;
        const wy = r * TILE;

        if (ch === "*") {
          tiles[r][c] = ".";
          stars.push({ x: wx + 2, y: wy + 2, w: 12, h: 12, phase: Math.random() * 6 });
        } else if (ch === "C") {
          tiles[r][c] = ".";
          enemies.push({
            type: "comet",
            x: wx,
            y: wy + 2,
            baseY: wy + 2,
            w: 16,
            h: 10,
            vx: -levelData.cometSpeed,
            originX: wx,
            range: 96,
            hp: idx === 2 ? 2 : 1,
            fire: idx >= 1 && Math.random() < 0.5,
            phase: Math.random() * 6,
            flash: 0
          });
        } else if (ch === "M") {
          tiles[r][c] = ".";
          enemies.push({
            type: "meteor",
            x: wx,
            y: wy,
            w: 16,
            h: 16,
            vx: -0.75 - idx * 0.15,
            vy: 0,
            hp: idx >= 1 ? 2 : 1,
            flash: 0
          });
        } else if (ch === "R") {
          tiles[r][c] = ".";
          rocketGoal = { x: wx - 4, y: (r + 1) * TILE - 48, w: 24, h: 48 };
        }
      }
    }

    const prevUpgraded = keepUpgrades && player ? player.upgraded : false;
    const prevHp = keepUpgrades && player ? Math.max(2, player.hp) : 3;

    player = {
      x: 36,
      y: 11 * TILE,
      w: 14,
      h: 16,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      coyote: 0,
      jumpBuffer: 0,
      shootCooldown: 0,
      shootAnim: 0,
      invuln: 0,
      hp: prevHp,
      maxHp: 3,
      upgraded: prevUpgraded,
      walkTimer: 0
    };

    dog = {
      x: 16,
      y: 11 * TILE + 4,
      w: 14,
      h: 12,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      barkTimer: 0,
      barkCooldown: 0,
      walkTimer: 0
    };

    camX = 0;
    window.RetroAudio.startMusic(idx);
  }

  function startNewGame() {
    score = 0;
    starsTotal = 0;
    lives = 3;
    loadLevel(0, false);
    gameState = "PLAYING";
    showOverlay(null);
  }

  function addFloatingText(x, y, text, color = "#ffd447") {
    floatingTexts.push({ x, y, text, color, life: 42 });
  }

  function spawnParticles(x, y, color, count = 8, speed = 2.2) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 0.4 + Math.random() * speed;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 0.5,
        size: Math.random() < 0.4 ? 3 : 2,
        color,
        life: 18 + Math.floor(Math.random() * 18)
      });
    }
  }

  function isSolid(c, r) {
    if (c < 0 || c >= mapCols) return true;
    if (r < 0) return false;
    if (r >= mapRows) return false;
    const ch = tiles[r][c];
    return ch === "#" || ch === "B" || ch === "?" || ch === "P" || ch === "=" || ch === "U";
  }

  function activateBlock(c, r) {
    const ch = tiles[r][c];
    if (ch !== "?" && ch !== "P" && ch !== "B") return;
    const key = `${c},${r}`;
    blockOffsets[key] = -4;

    if (ch === "B") {
      if (player.upgraded) {
        tiles[r][c] = ".";
        spawnParticles(c * TILE + 8, r * TILE + 8, "#b8c5e3", 10, 2.5);
        window.RetroAudio.explode();
        score += 50;
      } else {
        window.RetroAudio.bump();
      }
      return;
    }

    if (usedBlocks.has(key)) {
      window.RetroAudio.bump();
      return;
    }

    usedBlocks.add(key);
    tiles[r][c] = "U";
    window.RetroAudio.bump();

    if (ch === "?") {
      stars.push({
        x: c * TILE + 2,
        y: r * TILE - 14,
        w: 12,
        h: 12,
        phase: 0,
        popVy: -2.4
      });
      score += 100;
      addFloatingText(c * TILE + 4, r * TILE - 10, "+100", "#ffd447");
    } else if (ch === "P") {
      const kind = !player.upgraded ? "blaster" : "heart";
      powerups.push({
        kind,
        x: c * TILE + 1,
        y: r * TILE - 14,
        w: 14,
        h: 14,
        vx: 0.75,
        vy: -1.8
      });
      window.RetroAudio.powerup();
    }
  }

  function rectOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function moveEntityWithTiles(ent, bounceFromBelow = false) {
    // Horizontal
    ent.x += ent.vx;
    let left = Math.floor(ent.x / TILE);
    let right = Math.floor((ent.x + ent.w - 0.01) / TILE);
    let top = Math.floor(ent.y / TILE);
    let bottom = Math.floor((ent.y + ent.h - 0.01) / TILE);

    let hitWall = false;
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (isSolid(c, r)) {
          if (ent.vx > 0) {
            ent.x = c * TILE - ent.w;
            hitWall = true;
          } else if (ent.vx < 0) {
            ent.x = (c + 1) * TILE;
            hitWall = true;
          }
          ent.vx = 0;
        }
      }
    }

    // Vertical
    ent.y += ent.vy;
    ent.onGround = false;
    left = Math.floor(ent.x / TILE);
    right = Math.floor((ent.x + ent.w - 0.01) / TILE);
    top = Math.floor(ent.y / TILE);
    bottom = Math.floor((ent.y + ent.h - 0.01) / TILE);

    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (isSolid(c, r)) {
          if (ent.vy > 0) {
            ent.y = r * TILE - ent.h;
            ent.vy = 0;
            ent.onGround = true;
          } else if (ent.vy < 0) {
            ent.y = (r + 1) * TILE;
            ent.vy = 0;
            if (bounceFromBelow) {
              activateBlock(c, r);
            }
          }
        }
      }
    }

    return hitWall;
  }

  function hurtPlayer() {
    if (player.invuln > 0) return;
    window.RetroAudio.hurt();
    screenShake = 8;

    if (player.upgraded) {
      player.upgraded = false;
      player.invuln = 75;
      addFloatingText(player.x, player.y - 8, "ESCUDO ROTO", "#ff4d6d");
      spawnParticles(player.x + 7, player.y + 8, "#4ef2ff", 12, 2.8);
      return;
    }

    player.hp -= 1;
    player.invuln = 75;
    player.vy = -3.4;
    spawnParticles(player.x + 7, player.y + 8, "#ff4d6d", 12, 2.5);

    if (player.hp <= 0) {
      loseLife();
    }
  }

  function loseLife() {
    lives -= 1;
    if (lives <= 0) {
      gameState = "GAMEOVER";
      window.RetroAudio.stopMusic();
      window.RetroAudio.gameOver();
      endEyebrow.textContent = "MISIÓN INTERRUMPIDA";
      endTitle.textContent = "GAME OVER";
      endSubtitle.textContent = "Los cometas superaron tu traje espacial, ¡pero tu schnauzer confía en ti!";
      endStats.innerHTML = `PLANETA: ${levelData.world} ${levelData.name}<br>PUNTUACIÓN: ${score}<br>ESTRELLAS: ★ ${starsTotal}`;
      showOverlay(overlayEnd);
    } else {
      loadLevel(currentLevelIdx, false);
    }
  }

  function updatePlayer(dt) {
    const accel = player.onGround ? 0.34 : 0.24;
    const maxSpd = 2.4;

    if (keys.left) {
      player.vx = Math.max(-maxSpd, player.vx - accel);
      player.facing = -1;
    } else if (keys.right) {
      player.vx = Math.min(maxSpd, player.vx + accel);
      player.facing = 1;
    } else {
      player.vx *= player.onGround ? 0.78 : 0.9;
      if (Math.abs(player.vx) < 0.05) player.vx = 0;
    }

    // Coyote & Jump Buffer
    if (player.onGround) {
      player.coyote = 7;
    } else if (player.coyote > 0) {
      player.coyote--;
    }

    if (jumpJustPressed) {
      player.jumpBuffer = 7;
    } else if (player.jumpBuffer > 0) {
      player.jumpBuffer--;
    }

    if (player.jumpBuffer > 0 && player.coyote > 0) {
      player.vy = -6.55;
      player.onGround = false;
      player.coyote = 0;
      player.jumpBuffer = 0;
      window.RetroAudio.jump();
      spawnParticles(player.x + 7, player.y + 16, "#ced9f0", 5, 1.3);
    }

    // Variable jump height
    if (!keys.jump && player.vy < -2.2) {
      player.vy *= 0.62;
    }

    // Gravity
    player.vy = Math.min(6.5, player.vy + levelData.gravity);

    // Move & Collide
    moveEntityWithTiles(player, true);
    player.x = Math.max(0, Math.min(mapCols * TILE - player.w, player.x));

    // Pit fall
    if (player.y > VIEW_H + 20) {
      window.RetroAudio.hurt();
      loseLife();
      return;
    }

    // Shoot Space Pistol
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (player.shootAnim > 0) player.shootAnim--;
    if (player.invuln > 0) player.invuln--;

    if ((shootJustPressed || (player.upgraded && keys.shoot)) && player.shootCooldown <= 0) {
      const dir = player.facing;
      const bx = dir > 0 ? player.x + player.w : player.x - 6;
      const by = player.y + 7;

      if (player.upgraded) {
        projectiles.push({ x: bx, y: by, w: 7, h: 3, vx: dir * 5.2, vy: 0, color: "#ff66e5", life: 65 });
        projectiles.push({ x: bx, y: by, w: 6, h: 3, vx: dir * 4.8, vy: -0.75, color: "#4ef2ff", life: 55 });
        projectiles.push({ x: bx, y: by, w: 6, h: 3, vx: dir * 4.8, vy: 0.75, color: "#4ef2ff", life: 55 });
        player.shootCooldown = 11;
      } else {
        projectiles.push({ x: bx, y: by, w: 7, h: 3, vx: dir * 4.8, vy: 0, color: "#4ef2ff", life: 65 });
        player.shootCooldown = 14;
      }

      player.shootAnim = 8;
      window.RetroAudio.laser(player.upgraded);
      spawnParticles(bx, by + 1, player.upgraded ? "#ff66e5" : "#4ef2ff", 4, 1.5);
    }

    if (Math.abs(player.vx) > 0.25 && player.onGround) {
      player.walkTimer += dt * 10;
    } else {
      player.walkTimer = 0;
    }

    // Rocket Goal check
    if (rocketGoal && rectOverlap(player, rocketGoal)) {
      completeLevel();
    }
  }

  function updateDog(dt) {
    const targetX = player.x - player.facing * 20;
    const dx = targetX - dog.x;
    const dist = Math.hypot(dx, player.y - dog.y);

    // Teleport with space-warp if too far or fell in pit
    if (dist > 140 || dog.y > VIEW_H + 16) {
      dog.x = player.x - player.facing * 16;
      dog.y = player.y - 6;
      dog.vx = 0;
      dog.vy = 0;
      spawnParticles(dog.x + 7, dog.y + 6, "#4ef2ff", 8, 2);
    } else {
      if (Math.abs(dx) > 5) {
        const spd = Math.min(2.35, Math.abs(dx) * 0.14);
        dog.vx = Math.sign(dx) * spd;
        dog.facing = Math.sign(dx);
      } else {
        dog.vx *= 0.75;
        dog.facing = player.facing;
      }
    }

    dog.vy = Math.min(6.0, dog.vy + levelData.gravity);
    const hitWall = moveEntityWithTiles(dog, false);

    // Smart jump: wall ahead, player above, or pit ahead
    if (dog.onGround) {
      const aheadCol = Math.floor((dog.x + (dog.facing > 0 ? dog.w + 4 : -4)) / TILE);
      const footRow = Math.floor((dog.y + dog.h + 4) / TILE);
      const pitAhead = footRow < mapRows && !isSolid(aheadCol, footRow) && !isSolid(aheadCol, footRow + 1);

      if (hitWall || (player.y + 12 < dog.y && Math.abs(dx) < 55) || (pitAhead && Math.abs(dx) > 10)) {
        dog.vy = -5.6;
        dog.onGround = false;
      }
    }

    if (Math.abs(dog.vx) > 0.25 && dog.onGround) {
      dog.walkTimer += dt * 12;
    }

    // Bark when enemy is nearby
    if (dog.barkTimer > 0) dog.barkTimer--;
    if (dog.barkCooldown > 0) dog.barkCooldown--;
    if (dog.barkCooldown <= 0) {
      for (const e of enemies) {
        if (Math.hypot(e.x - dog.x, e.y - dog.y) < 75) {
          dog.barkTimer = 18;
          dog.barkCooldown = 140;
          window.RetroAudio.bark();
          addFloatingText(dog.x, dog.y - 8, "¡GUAU!", "#8cf7ff");
          break;
        }
      }
    }
  }

  function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      const c = Math.floor((p.x + p.w * 0.5) / TILE);
      const r = Math.floor((p.y + p.h * 0.5) / TILE);
      if (r >= 0 && r < mapRows && c >= 0 && c < mapCols && isSolid(c, r)) {
        const ch = tiles[r][c];
        if (ch === "?" || ch === "P") {
          activateBlock(c, r);
        }
        spawnParticles(p.x, p.y, p.color, 5, 1.5);
        projectiles.splice(i, 1);
        continue;
      }

      // Hit enemies
      let hit = false;
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j];
        if (rectOverlap(p, e)) {
          e.hp -= 1;
          e.flash = 6;
          hit = true;
          if (e.hp <= 0) {
            destroyEnemy(j);
          } else {
            window.RetroAudio.hitEnemy();
            spawnParticles(p.x, p.y, "#ffd447", 5, 1.8);
          }
          break;
        }
      }

      if (hit || p.life <= 0 || p.x < camX - 20 || p.x > camX + VIEW_W + 20) {
        projectiles.splice(i, 1);
      }
    }
  }

  function destroyEnemy(idx) {
    const e = enemies[idx];
    window.RetroAudio.explode();
    screenShake = 4;
    const pts = e.type === "comet" ? 150 : 200;
    score += pts;
    addFloatingText(e.x, e.y - 6, `+${pts}`, "#ffd447");
    spawnParticles(e.x + e.w / 2, e.y + e.h / 2, e.fire ? "#ff8c2b" : "#4ef2ff", 14, 2.8);

    // Chance to drop a bonus star from meteors
    if (e.type === "meteor" && Math.random() < 0.65) {
      stars.push({ x: e.x + 2, y: e.y, w: 12, h: 12, phase: 0, popVy: -2.2 });
    }
    enemies.splice(idx, 1);
  }

  function updateEnemies() {
    // Ambient falling sky meteors on Mars & Crystal Nebula
    if (levelData.skyMeteorInterval > 0) {
      skyMeteorTimer -= 1 / 60;
      if (skyMeteorTimer <= 0) {
        skyMeteorTimer = levelData.skyMeteorInterval * (0.75 + Math.random() * 0.5);
        const spawnX = camX + 120 + Math.random() * (VIEW_W - 80);
        if (spawnX < mapCols * TILE - 120) {
          enemies.push({
            type: "skyMeteor",
            x: spawnX,
            y: -18,
            w: 16,
            h: 16,
            vx: -1.1 - Math.random() * 0.6,
            vy: 1.9 + currentLevelIdx * 0.25,
            hp: 1,
            flash: 0
          });
        }
      }
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      if (e.flash > 0) e.flash--;

      if (e.type === "comet") {
        e.phase += 0.08;
        e.x += e.vx;
        e.y = e.baseY + Math.sin(e.phase) * 7;
        if (Math.abs(e.x - e.originX) > e.range) {
          e.vx *= -1;
        }
      } else if (e.type === "meteor") {
        e.vy = Math.min(5.0, e.vy + levelData.gravity * 0.85);
        const hitWall = moveEntityWithTiles(e, false);
        if (hitWall) {
          e.vx = (e.vx === 0 ? (Math.random() < 0.5 ? -0.8 : 0.8) : -e.vx);
        }
        if (e.onGround) {
          e.vy = -3.8; // bouncing magma rock
        }
        if (e.y > VIEW_H + 30) {
          enemies.splice(i, 1);
          continue;
        }
      } else if (e.type === "skyMeteor") {
        e.x += e.vx;
        e.y += e.vy;
        if (Math.random() < 0.45) {
          spawnParticles(e.x + 8, e.y + 4, "#ff9e1b", 1, 0.7);
        }
        const c = Math.floor((e.x + 8) / TILE);
        const r = Math.floor((e.y + 14) / TILE);
        if (r >= 0 && r < mapRows && c >= 0 && c < mapCols && isSolid(c, r)) {
          spawnParticles(e.x + 8, e.y + 8, "#ff5722", 10, 2.2);
          enemies.splice(i, 1);
          continue;
        }
        if (e.y > VIEW_H + 20) {
          enemies.splice(i, 1);
          continue;
        }
      }

      // Player collision with enemy
      if (rectOverlap(player, e)) {
        // Stomp check (falling onto top half of meteor/comet)
        if (player.vy > 0 && player.y + player.h - player.vy <= e.y + e.h * 0.55) {
          player.vy = -5.0;
          e.hp -= 1;
          e.flash = 6;
          if (e.hp <= 0) {
            destroyEnemy(i);
          } else {
            window.RetroAudio.hitEnemy();
          }
        } else {
          hurtPlayer();
        }
      }
    }
  }

  function updateCollectibles() {
    for (let i = stars.length - 1; i >= 0; i--) {
      const s = stars[i];
      s.phase += 0.12;
      if (s.popVy !== undefined) {
        s.y += s.popVy;
        s.popVy += 0.16;
        if (s.popVy > 1.2) s.popVy = undefined;
      }

      if (rectOverlap(player, s) || rectOverlap(dog, s)) {
        starsTotal += 1;
        score += 100;
        window.RetroAudio.star();
        spawnParticles(s.x + 6, s.y + 6, "#ffd447", 7, 1.8);
        if (starsTotal % 50 === 0) {
          lives += 1;
          addFloatingText(s.x, s.y - 8, "1UP!", "#5effc8");
          window.RetroAudio.powerup();
        }
        stars.splice(i, 1);
      }
    }

    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.vy = Math.min(4.0, pu.vy + 0.22);
      const hitWall = moveEntityWithTiles(pu, false);
      if (hitWall) pu.vx = -0.75;

      if (rectOverlap(player, pu)) {
        window.RetroAudio.powerup();
        if (pu.kind === "blaster") {
          player.upgraded = true;
          score += 500;
          addFloatingText(pu.x, pu.y - 8, "PLASMA LÁSER!", "#4ef2ff");
        } else {
          if (player.hp < player.maxHp) {
            player.hp += 1;
            addFloatingText(pu.x, pu.y - 8, "+1 ESCUDO", "#ff4d6d");
          } else {
            lives += 1;
            addFloatingText(pu.x, pu.y - 8, "1UP!", "#5effc8");
          }
          score += 300;
        }
        spawnParticles(pu.x + 7, pu.y + 7, "#ffffff", 12, 2.2);
        powerups.splice(i, 1);
      }
    }
  }

  function completeLevel() {
    window.RetroAudio.stopMusic();
    window.RetroAudio.levelClear();
    score += 1000;

    if (currentLevelIdx < window.Levels.length - 1) {
      gameState = "CLEAR";
      clearTitle.textContent = levelData.name;
      clearStats.innerHTML = `PUNTUACIÓN: ${score}<br>ESTRELLAS: ★ ${starsTotal}<br>VIDAS: ${lives}`;
      showOverlay(overlayClear);
    } else {
      gameState = "VICTORY";
      endEyebrow.textContent = "¡MISIÓN GALÁCTICA CUMPLIDA!";
      endTitle.textContent = "¡VICTORIA!";
      endSubtitle.textContent = "¡Tú y tu fiel schnauzer espacial conquistaron los 3 planetas y salvaron la galaxia!";
      endStats.innerHTML = `PUNTUACIÓN FINAL: ${score}<br>ESTRELLAS TOTALES: ★ ${starsTotal}<br>VIDAS RESTANTES: ${lives}`;
      showOverlay(overlayEnd);
    }
  }

  function update() {
    globalTick++;
    if (gameState !== "PLAYING") return;

    const dt = 1 / 60;
    updatePlayer(dt);
    updateDog(dt);
    updateProjectiles();
    updateEnemies();
    updateCollectibles();

    // Block bounce decay
    for (const k of Object.keys(blockOffsets)) {
      blockOffsets[k] += 0.6;
      if (blockOffsets[k] >= 0) delete blockOffsets[k];
    }

    // Particles & Floating text
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.08;
      pt.life--;
      if (pt.life <= 0) particles.splice(i, 1);
    }

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 0.45;
      ft.life--;
      if (ft.life <= 0) floatingTexts.splice(i, 1);
    }

    // Camera follow
    const targetCamX = Math.max(0, Math.min(mapCols * TILE - VIEW_W, player.x - VIEW_W * 0.36));
    camX += (targetCamX - camX) * 0.16;

    if (screenShake > 0) screenShake--;

    jumpJustPressed = false;
    shootJustPressed = false;
  }

  function drawBackground() {
    const ld = levelData || window.Levels[0];
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, ld.skyTop);
    grad.addColorStop(1, ld.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // Parallax stars
    for (const s of bgStars) {
      const sx = ((s.x - camX * s.speed) % VIEW_W + VIEW_W) % VIEW_W;
      const alpha = 0.45 + 0.55 * Math.sin(globalTick * 0.05 + s.phase);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.fillRect(Math.floor(sx), Math.floor(s.y), s.size, s.size);
    }

    // Distant planet
    const bp = ld.bgPlanet;
    const px = Math.floor(bp.x - camX * 0.08);
    const py = bp.y;
    ctx.fillStyle = bp.color;
    ctx.beginPath();
    ctx.arc(px, py, bp.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bp.hi;
    ctx.beginPath();
    ctx.arc(px - bp.r * 0.25, py - bp.r * 0.25, bp.r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    if (bp.ring) {
      ctx.strokeStyle = bp.ringColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(px, py + 2, bp.r * 1.65, bp.r * 0.36, -0.22, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawSprite(img, x, y, flipX = false) {
    const dx = Math.floor(x - camX);
    const dy = Math.floor(y);
    if (!flipX) {
      ctx.drawImage(img, dx, dy);
    } else {
      ctx.save();
      ctx.translate(dx + img.width, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }
  }

  function drawHUD() {
    ctx.fillStyle = "rgba(7, 10, 22, 0.72)";
    ctx.fillRect(0, 0, VIEW_W, 24);

    ctx.font = "8px 'Press Start 2P', monospace";
    ctx.textBaseline = "top";

    ctx.fillStyle = "#ffffff";
    ctx.fillText(`SCORE ${String(score).padStart(6, "0")}`, 10, 8);

    ctx.fillStyle = "#ffd447";
    ctx.fillText(`★ ${String(starsTotal).padStart(2, "0")}`, 142, 8);

    ctx.fillStyle = "#4ef2ff";
    ctx.fillText(`PLANETA ${levelData.world}`, 212, 8);

    // HP Hearts
    let hpText = "";
    for (let i = 0; i < player.maxHp; i++) {
      hpText += i < player.hp ? "♥" : "♡";
    }
    ctx.fillStyle = "#ff4d6d";
    ctx.fillText(hpText, 336, 8);

    ctx.fillStyle = "#5effc8";
    ctx.fillText(`x${lives}`, 386, 8);

    ctx.fillStyle = player.upgraded ? "#ff66e5" : "#9aa7d1";
    ctx.fillText(player.upgraded ? "PLASMA" : "LÁSER", 418, 8);
  }

  function render() {
    ctx.save();
    if (screenShake > 0) {
      ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
    }

    drawBackground();

    if (levelData) {
      const ts = window.Sprites.tilesets[currentLevelIdx % window.Sprites.tilesets.length];
      const startCol = Math.max(0, Math.floor(camX / TILE) - 1);
      const endCol = Math.min(mapCols - 1, Math.ceil((camX + VIEW_W) / TILE) + 1);

      // Draw Tiles
      for (let r = 0; r < mapRows; r++) {
        for (let c = startCol; c <= endCol; c++) {
          const ch = tiles[r][c];
          if (ch === ".") continue;
          const offY = blockOffsets[`${c},${r}`] || 0;
          const dx = Math.floor(c * TILE - camX);
          const dy = Math.floor(r * TILE + offY);

          if (ch === "#") {
            const aboveSolid = r > 0 && tiles[r - 1][c] === "#";
            ctx.drawImage(aboveSolid ? ts.groundDeep : ts.groundTop, dx, dy);
          } else if (ch === "B") {
            ctx.drawImage(ts.brick, dx, dy);
          } else if (ch === "?" || ch === "P") {
            ctx.drawImage(ts.qblock, dx, dy);
          } else if (ch === "U") {
            ctx.drawImage(ts.usedBlock, dx, dy);
          } else if (ch === "=") {
            ctx.drawImage(ts.platform, dx, dy);
          }
        }
      }

      // Draw Rocket Goal
      if (rocketGoal) {
        const hover = Math.sin(globalTick * 0.08) * 1.5;
        drawSprite(ts.rocket, rocketGoal.x, rocketGoal.y + hover, false);
      }

      // Draw Stars
      const starFrame = Math.floor(globalTick / 12) % 2;
      for (const s of stars) {
        const bob = Math.sin(s.phase) * 1.5;
        drawSprite(window.Sprites.star[starFrame], s.x, s.y + bob, false);
      }

      // Draw Powerups
      for (const pu of powerups) {
        const img = pu.kind === "blaster" ? window.Sprites.powerBlaster : window.Sprites.powerHeart;
        drawSprite(img, pu.x, pu.y, false);
      }

      // Draw Enemies
      const cometFrame = Math.floor(globalTick / 6) % 2;
      for (const e of enemies) {
        if (e.flash > 0 && e.flash % 2 === 0) continue;
        if (e.type === "comet") {
          const spr = e.fire ? window.Sprites.cometFire[cometFrame] : window.Sprites.cometIce[cometFrame];
          drawSprite(spr, e.x, e.y, e.vx > 0);
        } else {
          drawSprite(window.Sprites.meteor, e.x, e.y, false);
        }
      }

      // Draw Schnauzer Companion
      let dogSpr = Math.floor(globalTick / 16) % 2 === 0 ? window.Sprites.dog.idle1 : window.Sprites.dog.idle2;
      if (dog.barkTimer > 0) {
        dogSpr = window.Sprites.dog.bark;
      } else if (Math.abs(dog.vx) > 0.25) {
        dogSpr = Math.floor(dog.walkTimer) % 2 === 0 ? window.Sprites.dog.run1 : window.Sprites.dog.run2;
      }
      drawSprite(dogSpr, dog.x, dog.y, dog.facing < 0);

      // Draw Astronaut Player
      if (player.invuln === 0 || Math.floor(player.invuln / 4) % 2 === 0) {
        let pSpr = window.Sprites.astro.idle;
        if (player.shootAnim > 0) {
          pSpr = window.Sprites.astro.shoot;
        } else if (!player.onGround) {
          pSpr = window.Sprites.astro.jump;
        } else if (Math.abs(player.vx) > 0.25) {
          pSpr = Math.floor(player.walkTimer) % 2 === 0 ? window.Sprites.astro.walk1 : window.Sprites.astro.walk2;
        }
        drawSprite(pSpr, player.x - 1, player.y, player.facing < 0);
      }

      // Draw Projectiles
      for (const p of projectiles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x - camX), Math.floor(p.y), p.w, p.h);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(Math.floor(p.x - camX + 1), Math.floor(p.y + 1), Math.max(2, p.w - 3), 1);
      }

      // Draw Particles
      for (const pt of particles) {
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.floor(pt.x - camX), Math.floor(pt.y), pt.size, pt.size);
      }

      // Draw Floating Texts
      ctx.font = "7px 'Press Start 2P', monospace";
      for (const ft of floatingTexts) {
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, Math.floor(ft.x - camX), Math.floor(ft.y));
      }

      drawHUD();
    }

    ctx.restore();
  }

  // Fixed-step loop
  let lastTime = performance.now();
  let accumulator = 0;
  const STEP = 1000 / 60;

  function loop(now) {
    const delta = Math.min(50, now - lastTime);
    lastTime = now;
    accumulator += delta;

    while (accumulator >= STEP) {
      update();
      accumulator -= STEP;
    }

    render();
    requestAnimationFrame(loop);
  }

  // Keyboard Controls
  window.addEventListener("keydown", (e) => {
    const code = e.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(code)) {
      e.preventDefault();
    }
    if (code === "ArrowLeft" || code === "KeyA") keys.left = true;
    if (code === "ArrowRight" || code === "KeyD") keys.right = true;
    if (code === "Space" || code === "ArrowUp" || code === "KeyW") {
      if (!keys.jump) jumpJustPressed = true;
      keys.jump = true;
    }
    if (code === "KeyZ" || code === "KeyJ" || code === "ControlLeft" || code === "ControlRight") {
      if (!keys.shoot) shootJustPressed = true;
      keys.shoot = true;
    }
    if (code === "KeyP" || code === "Escape") {
      togglePause();
    }
    if (code === "Enter" && gameState === "TITLE") {
      startNewGame();
    }
  });

  window.addEventListener("keyup", (e) => {
    const code = e.code;
    if (code === "ArrowLeft" || code === "KeyA") keys.left = false;
    if (code === "ArrowRight" || code === "KeyD") keys.right = false;
    if (code === "Space" || code === "ArrowUp" || code === "KeyW") keys.jump = false;
    if (code === "KeyZ" || code === "KeyJ" || code === "ControlLeft" || code === "ControlRight") keys.shoot = false;
  });

  // Mouse click on canvas to shoot
  canvas.addEventListener("mousedown", () => {
    if (gameState === "PLAYING") {
      shootJustPressed = true;
      keys.shoot = true;
    }
  });
  window.addEventListener("mouseup", () => {
    keys.shoot = false;
  });

  // Touch controls
  document.querySelectorAll(".touch-btn").forEach((btn) => {
    const key = btn.dataset.key;
    const press = (ev) => {
      ev.preventDefault();
      if (key === "jump" && !keys.jump) jumpJustPressed = true;
      if (key === "shoot" && !keys.shoot) shootJustPressed = true;
      keys[key] = true;
    };
    const release = (ev) => {
      ev.preventDefault();
      keys[key] = false;
    };
    btn.addEventListener("touchstart", press, { passive: false });
    btn.addEventListener("touchend", release, { passive: false });
    btn.addEventListener("touchcancel", release, { passive: false });
  });

  function togglePause() {
    if (gameState === "PLAYING") {
      gameState = "PAUSED";
      showOverlay(overlayPause);
    } else if (gameState === "PAUSED") {
      gameState = "PLAYING";
      showOverlay(null);
    }
  }

  // UI Button Bindings
  btnStart.addEventListener("click", startNewGame);
  btnResume.addEventListener("click", togglePause);
  btnPause.addEventListener("click", togglePause);

  btnRestartLevel.addEventListener("click", () => {
    loadLevel(currentLevelIdx, false);
    gameState = "PLAYING";
    showOverlay(null);
  });

  btnNextLevel.addEventListener("click", () => {
    loadLevel(currentLevelIdx + 1, true);
    gameState = "PLAYING";
    showOverlay(null);
  });

  btnPlayAgain.addEventListener("click", startNewGame);

  btnCrt.addEventListener("click", () => {
    canvasWrapper.classList.toggle("crt-on");
    btnCrt.textContent = canvasWrapper.classList.contains("crt-on") ? "CRT: ON" : "CRT: OFF";
  });

  btnMusic.addEventListener("click", () => {
    window.RetroAudio.musicEnabled = !window.RetroAudio.musicEnabled;
    btnMusic.textContent = window.RetroAudio.musicEnabled ? "MUS: ON" : "MUS: OFF";
    if (window.RetroAudio.musicEnabled && gameState === "PLAYING") {
      window.RetroAudio.startMusic(currentLevelIdx);
    } else {
      window.RetroAudio.stopMusic();
    }
  });

  btnSfx.addEventListener("click", () => {
    window.RetroAudio.sfxEnabled = !window.RetroAudio.sfxEnabled;
    btnSfx.textContent = window.RetroAudio.sfxEnabled ? "SFX: ON" : "SFX: OFF";
  });

  // Boot
  initBgStars();
  requestAnimationFrame(loop);
})();
