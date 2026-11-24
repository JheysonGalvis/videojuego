// Pixel-Art Sprite & Tile Baker (Offscreen Canvas Caching)
(function () {
  "use strict";

  function bakeMatrix(rows, palette) {
    const h = rows.length;
    const w = rows[0].length;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (ch === "." || ch === " ") continue;
        const color = palette[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }

  // Astronaut Palette
  const ASTRO_PAL = {
    O: "#141626", // dark outline
    W: "#f4f7ff", // white suit
    S: "#b8c5e3", // suit shadow
    C: "#4ef2ff", // visor cyan
    V: "#1b4b72", // visor dark
    H: "#ffffff", // visor highlight
    R: "#ff4d6d", // red accent
    G: "#ffd447", // gold trim / gun tip
    D: "#58668a", // gun metal / pack
    B: "#2d3550"  // boots
  };

  const ASTRO_FRAMES = {
    idle: [
      "....OOOOOO......",
      "...OWWWWWWO.....",
      "..OWWHCCCVWO....",
      "..OWWCCCCVWO....",
      "..OWWVVVVVWO....",
      "...OWWWWWWO.....",
      "..OORRRRRROO....",
      ".ODOWWWWWWDDO...",
      ".ODOWWGGWWDDGO..",
      ".ODOWWWWWWDDO...",
      "..OOSWWWWSSO....",
      "...OWWWWWWO.....",
      "...OWWOOWWO.....",
      "...OSSOSSO......",
      "...OBBOOBBO.....",
      "..OBBBOOBBBO...."
    ],
    walk1: [
      "....OOOOOO......",
      "...OWWWWWWO.....",
      "..OWWHCCCVWO....",
      "..OWWCCCCVWO....",
      "..OWWVVVVVWO....",
      "...OWWWWWWO.....",
      "..OORRRRRROO....",
      ".ODOWWWWWWDDO...",
      ".ODOWWGGWWDDGO..",
      ".ODOWWWWWWDDO...",
      "..OOSWWWWSSO....",
      "...OWWWWWWO.....",
      "..OWWOO.OWWO....",
      ".OSSO....OSSO...",
      ".OBBO.....OBBBO.",
      "OBBBO......OOOO."
    ],
    walk2: [
      "....OOOOOO......",
      "...OWWWWWWO.....",
      "..OWWHCCCVWO....",
      "..OWWCCCCVWO....",
      "..OWWVVVVVWO....",
      "...OWWWWWWO.....",
      "..OORRRRRROO....",
      ".ODOWWWWWWDDO...",
      ".ODOWWGGWWDDGO..",
      ".ODOWWWWWWDDO...",
      "..OOSWWWWSSO....",
      "...OWWWWWWO.....",
      "...OWWO.OWWO....",
      "...OSSO.OSSO....",
      "..OBBBO..OBBO...",
      "..OOOO...OBBBO.."
    ],
    jump: [
      "....OOOOOO......",
      "...OWWWWWWO.....",
      "..OWWHCCCVWO....",
      "..OWWCCCCVWO....",
      "..OWWVVVVVWO....",
      "...OWWWWWWO.....",
      ".OOORRRRRROOO...",
      "ODDOWWWWWWDDO...",
      "ODDOWWGGWWDDGO..",
      ".ODOWWWWWWDDO...",
      "..OOSWWWWSSO....",
      "..OWWOOOOOWWO...",
      ".OSSO.....OSSO..",
      ".OBBBO...OBBBO..",
      "..OOOO....OOOO..",
      "................"
    ],
    shoot: [
      "....OOOOOO......",
      "...OWWWWWWO.....",
      "..OWWHCCCVWO....",
      "..OWWCCCCVWO....",
      "..OWWVVVVVWO....",
      "...OWWWWWWO.....",
      "..OORRRRRROO....",
      ".ODOWWWWWWWWW...",
      ".ODOWWGGWWDDDGG.",
      ".ODOWWWWWWWDD...",
      "..OOSWWWWSSO....",
      "...OWWWWWWO.....",
      "...OWWOOWWO.....",
      "...OSSOSSO......",
      "...OBBOOBBO.....",
      "..OBBBOOBBBO...."
    ]
  };

  // Miniature Schnauzer Palette (Salt & Pepper + Space Bandana + Bubble Helmet Rim)
  const DOG_PAL = {
    O: "#141626", // outline
    G: "#8c96a8", // grey fur
    D: "#5a6375", // dark grey back/ears
    W: "#f4f6fc", // white beard & eyebrows
    R: "#ff4d6d", // red space bandana
    N: "#11131f", // black nose/eye
    C: "#8cf7ff", // helmet glass glint
    P: "#ff9eb5"  // tongue
  };

  const DOG_FRAMES = {
    idle1: [
      "......CC.OO.OO..",
      ".....C..ODDODDO.",
      "....C...OGGGGGGO",
      "....C..OOWWNWWNO",
      "....C..OGWWWWWW.",
      ".OO.C...OORRRRO.",
      "OGGO...OGGGGGGO.",
      ".OGOOOOGGGDDDGGO",
      "..OGGGGGGGDDDGG.",
      "..OGGGGGGGGGGGGO",
      "..OGGO.....OGGO.",
      "..OWWO.....OWWO."
    ],
    idle2: [
      "......CC.OO.OO..",
      ".....C..ODDODDO.",
      "....C...OGGGGGGO",
      "....C..OOWWNWWNO",
      "..O.C..OGWWWWWW.",
      ".OGO....OORRRRO.",
      ".OGOOO.OGGGGGGO.",
      "..OGGGGGGGDDDGGO",
      "..OGGGGGGGDDDGG.",
      "..OGGGGGGGGGGGGO",
      "..OGGO.....OGGO.",
      "..OWWO.....OWWO."
    ],
    run1: [
      "......CC.OO.OO..",
      ".....C..ODDODDO.",
      "....C...OGGGGGGO",
      "....C..OOWWNWWNO",
      "....C..OGWWWWWW.",
      ".OO.C...OORRRRO.",
      "OGGO...OGGGGGGO.",
      ".OGOOOOGGGDDDGGO",
      "..OGGGGGGGDDDGG.",
      "..OGGGGGGGGGGGGO",
      ".OGGO.......OGGO",
      ".OWWO.......OWWO"
    ],
    run2: [
      "......CC.OO.OO..",
      ".....C..ODDODDO.",
      "....C...OGGGGGGO",
      "....C..OOWWNWWNO",
      "....C..OGWWWWWW.",
      "OO..C...OORRRRO.",
      ".GGO...OGGGGGGO.",
      ".OGOOOOGGGDDDGGO",
      "..OGGGGGGGDDDGG.",
      "..OGGGGGGGGGGGGO",
      "...OGGO...OGGO..",
      "...OWWO...OWWO.."
    ],
    bark: [
      "......CC.OO.OO..",
      ".....C..ODDODDO.",
      "....C...OGGGGGGO",
      "....C..OOWWNWWNO",
      "....C..OGWWPWWW.",
      ".OO.C...OORRRRO.",
      "OGGO...OGGGGGGO.",
      ".OGOOOOGGGDDDGGO",
      "..OGGGGGGGDDDGG.",
      "..OGGGGGGGGGGGGO",
      "..OGGO.....OGGO.",
      "..OWWO.....OWWO."
    ]
  };

  // Star (12x12)
  const STAR_PAL = {
    O: "#663900",
    Y: "#ffd447",
    L: "#fff7b2",
    A: "#ff9e1b"
  };

  const STAR_FRAMES = [
    [
      ".....OO.....",
      "....OLLO....",
      "....OYYO....",
      ".OOOOLYOOOO.",
      "OLLLLYYYYAAO",
      ".OYYYYYYAAO.",
      "..OYYYYAAO..",
      "..OYYOOYYO..",
      ".OYYO..OYYO.",
      ".OAO....OAO.",
      ".OO......OO.",
      "............"
    ],
    [
      ".....OO.....",
      "....OYYO....",
      "....OLLO....",
      ".OOOOYLOOOO.",
      "OYYYYLLLLAAO",
      ".OYYYYLLAAO.",
      "..OYYYYAAO..",
      "..OYYOOYYO..",
      ".OYYO..OYYO.",
      ".OAO....OAO.",
      ".OO......OO.",
      "............"
    ]
  ];

  // Comet (16x10) - flies left by default
  const COMET_PAL = {
    O: "#182442",
    C: "#4ef2ff",
    W: "#e8ffff",
    B: "#2980ff",
    F: "#ff8c2b",
    Y: "#ffe066"
  };

  const COMET_FRAMES = [
    [
      "....OOOO........",
      "..OOWCCCOBB.....",
      ".OWWWCCCCBBBB.B.",
      "OWWWWCCCCCCCBBBB",
      "OWWWWCCCCCCCCBB.",
      "OWWWWCCCCCCCBBBB",
      ".OWWWCCCCBBBB...",
      "..OOWCCCOBB...B.",
      "....OOOO........",
      "................"
    ],
    [
      "....OOOO........",
      "..OOWCCCOBB..B..",
      ".OWWWCCCCBBBB...",
      "OWWWWCCCCCCCBBB.",
      "OWWWWCCCCCCCCBBB",
      "OWWWWCCCCCCCBBB.",
      ".OWWWCCCCBBBB.B.",
      "..OOWCCCOBB.....",
      "....OOOO........",
      "................"
    ]
  ];

  // Fire Comet variant
  const FIRE_COMET_FRAMES = [
    [
      "....OOOO........",
      "..OOWYYYOFF.....",
      ".OWWWYYYYFFFF.F.",
      "OWWWWYYYYYYYFFFF",
      "OWWWWYYYYYYYYFF.",
      "OWWWWYYYYYYYFFFF",
      ".OWWWYYYYFFFF...",
      "..OOWYYYOFF...F.",
      "....OOOO........",
      "................"
    ],
    [
      "....OOOO........",
      "..OOWYYYOFF..F..",
      ".OWWWYYYYFFFF...",
      "OWWWWYYYYYYYFFF.",
      "OWWWWYYYYYYYYFFF",
      "OWWWWYYYYYYYFFF.",
      ".OWWWYYYYFFFF.F.",
      "..OOWYYYOFF.....",
      "....OOOO........",
      "................"
    ]
  ];

  // Meteor (16x16)
  const METEOR_PAL = {
    O: "#1a1118",
    R: "#6e5561",
    D: "#45333d",
    L: "#9e818c",
    M: "#ff5722",
    Y: "#ffcc33"
  };

  const METEOR_SPRITE = [
    "....OOOOOOOO....",
    "..OOLLLLRRRRRO..",
    ".OLLLRRDDDDDRRO.",
    ".OLRRDDMMDDDDRO.",
    "OLRRDDMYYMDDDRRO",
    "ORRDDMMYYMDDDRDO",
    "ORDDDDDMMDDRRDDO",
    "ORRDDRRRRRDRRDDO",
    "ORDDDDDDDRMMRDDO",
    "ODDRRMMDDRYYMDDO",
    ".ODDRYYMDDRMMDO.",
    ".ODDDMMDDDDDDDO.",
    "..ODDDDDDRDDDO..",
    "...OOOOOOOOOO...",
    "................",
    "................"
  ];

  // Power-ups (14x14)
  const POWER_PAL = {
    O: "#141626",
    C: "#4ef2ff",
    W: "#ffffff",
    M: "#ff4dff",
    R: "#ff3355",
    P: "#ff99aa"
  };

  const POWER_BLASTER = [
    "...OOOOOOOO...",
    "..OCCCCCCCCO..",
    ".OCWWWWWWWWCO.",
    ".OCWMMMMMMWCO.",
    ".OCWMCCCCMWCO.",
    ".OCWMCWWCMWCO.",
    ".OCWMCWWCMWCO.",
    ".OCWMCCCCMWCO.",
    ".OCWMMMMMMWCO.",
    ".OCWWWWWWWWCO.",
    "..OCCCCCCCCO..",
    "...OOOOOOOO...",
    "..............",
    ".............."
  ];

  const POWER_HEART = [
    "..............",
    "..OOOO..OOOO..",
    ".ORRRROORRRRO.",
    "ORWWWRRORRRRRO",
    "ORWWRRRRRRRRRO",
    "ORRRRRRRRRRRRO",
    "ORRRRRRRRRPPPO",
    ".ORRRRRRRPPPO.",
    "..ORRRRRPPPO..",
    "...ORRRPPPO...",
    "....ORRPO.....",
    ".....ORO......",
    "......O.......",
    ".............."
  ];

  // Planet Themes for Tiles
  const PLANET_PALETTES = [
    // 0: Crater Moon
    {
      top: "#9aa8c7",
      topHi: "#ced9f0",
      dirt: "#55607d",
      dirtDark: "#384159",
      brick: "#7482a3",
      brickDark: "#45506b",
      accent: "#4ef2ff"
    },
    // 1: Crimson Mars
    {
      top: "#e06d44",
      topHi: "#ffa075",
      dirt: "#963b22",
      dirtDark: "#5e2112",
      brick: "#b84e2c",
      brickDark: "#6e2a14",
      accent: "#ffd447"
    },
    // 2: Crystal Nebula
    {
      top: "#55d6e8",
      topHi: "#a6f8ff",
      dirt: "#3a4b8c",
      dirtDark: "#232d59",
      brick: "#6b55b5",
      brickDark: "#3c2e73",
      accent: "#ff66e5"
    }
  ];

  function createTileSet(themeIdx) {
    const p = PLANET_PALETTES[themeIdx % PLANET_PALETTES.length];
    const tiles = {};

    // Ground Top (16x16)
    tiles.groundTop = (() => {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      const g = c.getContext("2d");
      g.fillStyle = p.dirt;
      g.fillRect(0, 0, 16, 16);
      g.fillStyle = p.top;
      g.fillRect(0, 0, 16, 5);
      g.fillStyle = p.topHi;
      g.fillRect(0, 0, 16, 2);
      g.fillStyle = p.dirtDark;
      g.fillRect(2, 8, 4, 3);
      g.fillRect(10, 11, 4, 3);
      g.fillRect(0, 5, 16, 1);
      return c;
    })();

    // Ground Deep (16x16)
    tiles.groundDeep = (() => {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      const g = c.getContext("2d");
      g.fillStyle = p.dirt;
      g.fillRect(0, 0, 16, 16);
      g.fillStyle = p.dirtDark;
      g.fillRect(1, 2, 4, 4);
      g.fillRect(9, 8, 5, 4);
      g.fillRect(3, 12, 3, 3);
      return c;
    })();

    // Space Brick (16x16)
    tiles.brick = (() => {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      const g = c.getContext("2d");
      g.fillStyle = p.brickDark;
      g.fillRect(0, 0, 16, 16);
      g.fillStyle = p.brick;
      g.fillRect(1, 1, 6, 6);
      g.fillRect(9, 1, 6, 6);
      g.fillRect(0, 9, 3, 6);
      g.fillRect(5, 9, 6, 6);
      g.fillRect(13, 9, 3, 6);
      g.fillStyle = p.topHi;
      g.fillRect(1, 1, 6, 1);
      g.fillRect(9, 1, 6, 1);
      return c;
    })();

    // Question Block (16x16)
    tiles.qblock = (() => {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      const g = c.getContext("2d");
      g.fillStyle = "#8a4b00";
      g.fillRect(0, 0, 16, 16);
      g.fillStyle = "#ffb703";
      g.fillRect(1, 1, 14, 14);
      g.fillStyle = "#ffe57f";
      g.fillRect(1, 1, 14, 2);
      g.fillRect(1, 1, 2, 14);
      // Corner rivets
      g.fillStyle = "#8a4b00";
      g.fillRect(2, 2, 1, 1);
      g.fillRect(13, 2, 1, 1);
      g.fillRect(2, 13, 1, 1);
      g.fillRect(13, 13, 1, 1);
      // '?' symbol
      g.fillStyle = "#fff";
      g.fillRect(5, 4, 6, 2);
      g.fillRect(9, 6, 2, 2);
      g.fillRect(7, 8, 2, 2);
      g.fillRect(7, 11, 2, 2);
      return c;
    })();

    // Used Block (16x16)
    tiles.usedBlock = (() => {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      const g = c.getContext("2d");
      g.fillStyle = "#222638";
      g.fillRect(0, 0, 16, 16);
      g.fillStyle = "#485070";
      g.fillRect(1, 1, 14, 14);
      g.fillStyle = "#222638";
      g.fillRect(3, 3, 1, 1);
      g.fillRect(12, 3, 1, 1);
      g.fillRect(3, 12, 1, 1);
      g.fillRect(12, 12, 1, 1);
      return c;
    })();

    // Platform Metal (16x16)
    tiles.platform = (() => {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 16;
      const g = c.getContext("2d");
      g.fillStyle = "#2b334f";
      g.fillRect(0, 0, 16, 8);
      g.fillStyle = p.accent;
      g.fillRect(0, 0, 16, 2);
      g.fillStyle = "#6e7da8";
      g.fillRect(2, 4, 3, 2);
      g.fillRect(11, 4, 3, 2);
      return c;
    })();

    // Rocket Goal (24x48)
    tiles.rocket = (() => {
      const c = document.createElement("canvas");
      c.width = 24;
      c.height = 48;
      const g = c.getContext("2d");
      // Nose cone
      g.fillStyle = "#ff4d6d";
      g.fillRect(10, 2, 4, 4);
      g.fillRect(8, 6, 8, 4);
      // Body
      g.fillStyle = "#f4f7ff";
      g.fillRect(6, 10, 12, 24);
      g.fillStyle = "#b8c5e3";
      g.fillRect(14, 10, 4, 24);
      // Window
      g.fillStyle = "#1b4b72";
      g.fillRect(9, 14, 6, 6);
      g.fillStyle = "#4ef2ff";
      g.fillRect(10, 15, 4, 4);
      g.fillStyle = "#fff";
      g.fillRect(10, 15, 1, 1);
      // Fins
      g.fillStyle = "#ff4d6d";
      g.fillRect(2, 24, 4, 12);
      g.fillRect(18, 24, 4, 12);
      // Thruster
      g.fillStyle = "#58668a";
      g.fillRect(8, 34, 8, 4);
      // Flame
      g.fillStyle = "#ff9e1b";
      g.fillRect(9, 38, 6, 5);
      g.fillStyle = "#ffd447";
      g.fillRect(10, 38, 4, 8);
      return c;
    })();

    return tiles;
  }

  window.Sprites = {
    astro: {
      idle: bakeMatrix(ASTRO_FRAMES.idle, ASTRO_PAL),
      walk1: bakeMatrix(ASTRO_FRAMES.walk1, ASTRO_PAL),
      walk2: bakeMatrix(ASTRO_FRAMES.walk2, ASTRO_PAL),
      jump: bakeMatrix(ASTRO_FRAMES.jump, ASTRO_PAL),
      shoot: bakeMatrix(ASTRO_FRAMES.shoot, ASTRO_PAL)
    },
    dog: {
      idle1: bakeMatrix(DOG_FRAMES.idle1, DOG_PAL),
      idle2: bakeMatrix(DOG_FRAMES.idle2, DOG_PAL),
      run1: bakeMatrix(DOG_FRAMES.run1, DOG_PAL),
      run2: bakeMatrix(DOG_FRAMES.run2, DOG_PAL),
      bark: bakeMatrix(DOG_FRAMES.bark, DOG_PAL)
    },
    star: [
      bakeMatrix(STAR_FRAMES[0], STAR_PAL),
      bakeMatrix(STAR_FRAMES[1], STAR_PAL)
    ],
    cometIce: [
      bakeMatrix(COMET_FRAMES[0], COMET_PAL),
      bakeMatrix(COMET_FRAMES[1], COMET_PAL)
    ],
    cometFire: [
      bakeMatrix(FIRE_COMET_FRAMES[0], COMET_PAL),
      bakeMatrix(FIRE_COMET_FRAMES[1], COMET_PAL)
    ],
    meteor: bakeMatrix(METEOR_SPRITE, METEOR_PAL),
    powerBlaster: bakeMatrix(POWER_BLASTER, POWER_PAL),
    powerHeart: bakeMatrix(POWER_HEART, POWER_PAL),
    tilesets: [createTileSet(0), createTileSet(1), createTileSet(2)]
  };
})();
