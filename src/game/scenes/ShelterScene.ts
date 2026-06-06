import Phaser from "phaser";
import { image2Assets } from "../../data/image2Assets";
import { tasksById } from "../../data/taskData";
import type { AgentPhase, TaskLocation, TaskOutcome } from "../../data/types";
import { EventBus, type LayoutChangedPayload, type TaskHighlightPayload, type TaskResultPayload } from "../EventBus";

type HotspotDef = {
  id: TaskLocation;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  accent: number;
};

type CharacterDef = {
  id: string;
  baseTexture: string;
  activeTexture?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  activeW?: number;
  activeH?: number;
  glow: number;
  idleOffset: number;
};

type CharacterActor = {
  def: CharacterDef;
  container: Phaser.GameObjects.Container;
  image?: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Ellipse;
};

type CharacterAnchor = {
  x: number;
  y: number;
  w: number;
  h: number;
};

const LEGACY_WORLD_WIDTH = 960;
const LEGACY_WORLD_HEIGHT = 540;
const VIRTUAL_WORLD_WIDTH = 1280;
const VIRTUAL_WORLD_HEIGHT = 720;
const WORLD_ZOOM = VIRTUAL_WORLD_WIDTH / LEGACY_WORLD_WIDTH;

const hotspots: HotspotDef[] = [
  { id: "water", label: "水处理区", x: 34, y: 154, w: 228, h: 146, accent: 0x5dbfd9 },
  { id: "medical", label: "医疗角", x: 288, y: 334, w: 238, h: 112, accent: 0xffd60a },
  { id: "security", label: "门禁 / 安防区", x: 382, y: 174, w: 144, h: 126, accent: 0xe84545 },
  { id: "ventilation", label: "通风机房", x: 508, y: 172, w: 144, h: 124, accent: 0x8fd0b0 },
  { id: "communication", label: "通信台", x: 654, y: 166, w: 242, h: 130, accent: 0x9db4ff },
  { id: "whiteboard", label: "白板 / 任务墙", x: 650, y: 348, w: 254, h: 120, accent: 0xff8c42 },
  { id: "residents", label: "居民区", x: 278, y: 314, w: 580, h: 150, accent: 0xffb15f },
  { id: "beacon", label: "屋顶信标", x: 430, y: 46, w: 118, h: 82, accent: 0x9eeaff }
];

const locationCharacterFocus: Partial<Record<TaskLocation, string[]>> = {
  water: ["maDehai"],
  medical: ["shenZhiyue", "xiaoTie"],
  security: ["maDehai"],
  ventilation: ["maDehai"],
  communication: ["laoQian"],
  whiteboard: ["shenZhiyue", "laoQian"],
  residents: ["maDehai", "shenZhiyue", "xiaoTie", "laoQian"],
  beacon: ["laoQian"]
};

const characterInteractionAnchors: Partial<Record<TaskLocation, Partial<Record<string, CharacterAnchor>>>> = {
  water: {
    maDehai: { x: 208, y: 256, w: 47, h: 86 }
  },
  medical: {
    shenZhiyue: { x: 420, y: 388, w: 56, h: 70 },
    xiaoTie: { x: 344, y: 402, w: 120, h: 77 }
  },
  security: {
    maDehai: { x: 426, y: 252, w: 47, h: 86 }
  },
  ventilation: {
    maDehai: { x: 512, y: 252, w: 47, h: 86 }
  },
  communication: {
    laoQian: { x: 778, y: 244, w: 54, h: 74 }
  },
  whiteboard: {
    shenZhiyue: { x: 702, y: 404, w: 56, h: 70 },
    laoQian: { x: 798, y: 398, w: 54, h: 74 }
  },
  residents: {
    maDehai: { x: 458, y: 400, w: 47, h: 86 },
    shenZhiyue: { x: 418, y: 388, w: 56, h: 70 },
    xiaoTie: { x: 344, y: 402, w: 120, h: 77 },
    laoQian: { x: 732, y: 400, w: 54, h: 74 }
  },
  beacon: {
    laoQian: { x: 676, y: 248, w: 54, h: 74 }
  }
};

const dayFocusLocations: Record<number, TaskLocation> = {
  0: "whiteboard",
  1: "security",
  2: "water",
  3: "medical",
  4: "communication",
  5: "security",
  6: "whiteboard",
  7: "whiteboard",
  8: "water",
  9: "water",
  10: "medical",
  11: "ventilation",
  12: "beacon"
};

function spotCenter(location: TaskLocation) {
  const spot = hotspots.find((item) => item.id === location) ?? hotspots[0];
  return {
    x: spot.x + spot.w / 2,
    y: spot.y + spot.h / 2
  };
}

export class ShelterScene extends Phaser.Scene {
  private hotspotRects = new Map<TaskLocation, Phaser.GameObjects.Rectangle>();
  private hotspotGlows = new Map<TaskLocation, Phaser.GameObjects.Ellipse>();
  private characterGlows = new Map<string, Phaser.GameObjects.Ellipse>();
  private characterActors = new Map<string, CharacterActor>();
  private characterFocusLocation: TaskLocation | null = null;
  private activeLocation: TaskLocation | null = null;
  private aura?: Phaser.GameObjects.Container;
  private auraBody?: Phaser.GameObjects.Image;
  private auraScan?: Phaser.GameObjects.Ellipse;
  private progressFill?: Phaser.GameObjects.Rectangle;
  private pathSprite?: Phaser.GameObjects.Rectangle;
  private resultEffect?: Phaser.GameObjects.GameObject;

  private onMoveToLocation = (location: TaskLocation) => this.moveAgent(location);
  private onPhaseChange = (phase: AgentPhase) => this.setAgentPhase(phase);
  private onHighlightTask = (payload: TaskHighlightPayload) => this.highlightTask(payload);
  private onTaskResult = (payload: TaskResultPayload) => this.showTaskResult(payload);
  private onDayChange = (day: number) => this.moveAgent(dayFocusLocations[day] ?? "whiteboard");
  private onLayoutChanged = (payload: LayoutChangedPayload) => this.applyCameraLayout(payload);
  private onBranchChange = (branch: "common" | "rescue" | "lighthouse") => {
    if (branch === "rescue") this.moveAgent("communication");
    if (branch === "lighthouse") this.moveAgent("whiteboard");
  };

  constructor() {
    super("ShelterScene");
  }

  create() {
    this.cameras.main.setRoundPixels(true);
    this.applyCameraLayout();
    this.drawAtmosphere();
    this.drawAmbientLife();
    this.drawStoryCharacters();
    this.drawHotspots();
    this.drawAgent();
    this.registerBus();
  }

  private registerBus() {
    EventBus.on("agent:move-to-location", this.onMoveToLocation);
    EventBus.on("agent:phase-change", this.onPhaseChange);
    EventBus.on("task:highlight", this.onHighlightTask);
    EventBus.on("task:result", this.onTaskResult);
    EventBus.on("day:change", this.onDayChange);
    EventBus.on("branch:change", this.onBranchChange);
    EventBus.on("layout:changed", this.onLayoutChanged);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off("agent:move-to-location", this.onMoveToLocation);
      EventBus.off("agent:phase-change", this.onPhaseChange);
      EventBus.off("task:highlight", this.onHighlightTask);
      EventBus.off("task:result", this.onTaskResult);
      EventBus.off("day:change", this.onDayChange);
      EventBus.off("branch:change", this.onBranchChange);
      EventBus.off("layout:changed", this.onLayoutChanged);
    });
  }

  private applyCameraLayout(_payload?: LayoutChangedPayload) {
    this.cameras.main.setBounds(0, 0, LEGACY_WORLD_WIDTH, LEGACY_WORLD_HEIGHT);
    this.cameras.main.setViewport(0, 0, VIRTUAL_WORLD_WIDTH, VIRTUAL_WORLD_HEIGHT);
    this.cameras.main.setZoom(WORLD_ZOOM);
    this.cameras.main.centerOn(LEGACY_WORLD_WIDTH / 2, LEGACY_WORLD_HEIGHT / 2);
  }

  private drawAtmosphere() {
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
    if (this.textures.exists(image2Assets.shelterBackground.key)) {
      this.add.image(480, 270, image2Assets.shelterBackground.key).setDisplaySize(960, 540).setDepth(1);
    }

    const haze = this.add.rectangle(480, 270, 960, 540, 0xd05a2a, 0.06).setDepth(2);
    this.tweens.add({ targets: haze, alpha: 0.12, duration: 2200, yoyo: true, repeat: -1 });
  }

  private drawAmbientLife() {
    this.drawDust();
    this.drawLights();
    this.drawWater();
    this.drawVentilation();
    this.drawBeacon();
    this.drawConsoleBlinkers();
  }

  private drawDust() {
    for (let i = 0; i < 32; i += 1) {
      const speck = this.add
        .rectangle((i * 71) % 960, 24 + ((i * 37) % 320), 2 + (i % 3), 1 + (i % 2), 0xffb15f, 0.18 + (i % 4) * 0.04)
        .setDepth(4);
      this.tweens.add({
        targets: speck,
        x: speck.x + 48 + (i % 5) * 18,
        alpha: 0.02,
        duration: 2400 + (i % 7) * 360,
        delay: i * 90,
        repeat: -1,
        yoyo: true
      });
    }
  }

  private drawLights() {
    const lamps: Array<[number, number, number, number, number, number]> = [
      [158, 174, 84, 74, 0x5dbfd9, 0],
      [412, 180, 78, 82, 0xffb15f, 220],
      [565, 178, 72, 72, 0xffe0a0, 440],
      [778, 176, 72, 72, 0x8feaff, 620],
      [364, 326, 84, 88, 0xffb15f, 760],
      [756, 326, 98, 92, 0xffb15f, 900]
    ];

    lamps.forEach(([x, y, w, h, color, delay]) => {
      const cone = this.add.triangle(x - w / 2, y + 4, 0, 0, w, 0, w / 2, h, color, 0.035).setOrigin(0, 0).setDepth(7);
      const halo = this.add.ellipse(x, y + h * 0.34, w * 1.38, h * 0.98, color, 0.045).setDepth(7);
      const lens = this.add.ellipse(x, y, w * 0.28, 8, color, 0.42).setDepth(8);
      const core = this.add.circle(x, y + 1, 4, color, 0.72).setDepth(9);
      const spark = this.add.circle(x + w * 0.13, y + 2, 2, 0xffffff, 0.22).setDepth(10);
      [cone, halo, lens, core, spark].forEach((light) => light.setBlendMode(Phaser.BlendModes.ADD));
      this.tweens.add({
        targets: [cone, halo],
        alpha: { from: 0.035, to: 0.14 },
        duration: 1100 + delay * 0.08,
        delay,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      this.tweens.add({
        targets: [lens, core, spark],
        alpha: { from: 0.36, to: 0.86 },
        duration: 1100 + delay * 0.08,
        delay,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    });
  }

  private drawWater() {
    for (let i = 0; i < 8; i += 1) {
      const stream = this.add.rectangle(104 + i * 9, 268 + (i % 3) * 10, 3, 38, 0x5dbfd9, 0.16).setDepth(8);
      this.tweens.add({
        targets: stream,
        y: stream.y + 12,
        alpha: 0.42,
        duration: 640 + i * 55,
        yoyo: true,
        repeat: -1,
        ease: "Stepped",
        easeParams: [4]
      });
    }

    for (let i = 0; i < 5; i += 1) {
      const ripple = this.add.ellipse(118 + i * 16, 294, 16, 5, 0x8feaff, 0.18).setDepth(9);
      this.tweens.add({
        targets: ripple,
        scaleX: 1.9,
        alpha: 0.02,
        duration: 900 + i * 120,
        repeat: -1,
        delay: i * 160
      });
    }
  }

  private drawVentilation() {
    const fanX = 566;
    const fanY = 236;
    const rim = this.add.ellipse(fanX, fanY, 66, 66).setStrokeStyle(2, 0x8fd0b0, 0.22).setDepth(9);
    const pulse = this.add.ellipse(fanX, fanY, 82, 82, 0x8fd0b0, 0.035).setDepth(8);
    [rim, pulse].forEach((item) => item.setBlendMode(Phaser.BlendModes.ADD));

    const rotor = this.textures.exists(image2Assets.fanRotor.key)
      ? this.add.image(fanX, fanY, image2Assets.fanRotor.key).setDisplaySize(72, 72).setDepth(10)
      : this.add.ellipse(fanX, fanY, 52, 52, 0x8fd0b0, 0.24).setDepth(10);
    rotor.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: rotor, angle: 360, duration: 980, repeat: -1, ease: "Linear" });
    this.tweens.add({ targets: pulse, alpha: 0.1, scale: 1.08, duration: 980, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    for (let i = 0; i < 7; i += 1) {
      const airflow = this.add.ellipse(514 + i * 18, 228 + (i % 2) * 12, 24, 4, 0x8fd0b0, 0.055).setDepth(8);
      airflow.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: airflow,
        x: airflow.x + 42,
        alpha: 0.18,
        duration: 980 + i * 70,
        delay: i * 90,
        repeat: -1,
        yoyo: true,
        ease: "Sine.easeInOut"
      });
    }
  }

  private drawBeacon() {
    const beaconCore = this.add.rectangle(486, 60, 12, 16, 0x8feaff, 0.68).setDepth(10);
    const beaconHalo = this.add.ellipse(486, 60, 88, 62, 0x8feaff, 0.08).setDepth(9);
    this.tweens.add({
      targets: [beaconCore, beaconHalo],
      alpha: { from: 0.12, to: 0.86 },
      scaleX: { from: 0.8, to: 1.18 },
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: "Stepped",
      easeParams: [4]
    });
  }

  private drawConsoleBlinkers() {
    const points: Array<[number, number, number]> = [
      [716, 236, 0x8feaff],
      [748, 238, 0x8feaff],
      [786, 238, 0x8feaff],
      [826, 247, 0xffd60a],
      [424, 232, 0x79d6a8],
      [560, 374, 0x79d6a8],
      [758, 386, 0xffd60a],
      [806, 388, 0xff8c42],
      [112, 236, 0x5dbfd9],
      [142, 254, 0x5dbfd9]
    ];

    points.forEach(([x, y, color], index) => {
      const dot = this.add.rectangle(x, y, 5, 5, color, 0.32).setDepth(10);
      this.tweens.add({
        targets: dot,
        alpha: 0.95,
        duration: 320 + (index % 4) * 110,
        delay: index * 130,
        yoyo: true,
        repeat: -1,
        ease: "Stepped",
        easeParams: [2]
      });
    });
  }

  private drawStoryCharacters() {
    const characters: CharacterDef[] = [
      {
        id: "maDehai",
        baseTexture: image2Assets.maDehai.key,
        activeTexture: image2Assets.maDehaiInteract.key,
        x: 402,
        y: 250,
        w: 34,
        h: 82,
        activeW: 47,
        activeH: 86,
        glow: 0xffb15f,
        idleOffset: 0
      },
      {
        id: "shenZhiyue",
        baseTexture: image2Assets.shenZhiyue.key,
        activeTexture: image2Assets.shenZhiyueMedic.key,
        x: 424,
        y: 400,
        w: 34,
        h: 88,
        activeW: 56,
        activeH: 70,
        glow: 0xffd60a,
        idleOffset: 210
      },
      {
        id: "xiaoTie",
        baseTexture: image2Assets.xiaoTieSickCot.key,
        activeTexture: image2Assets.xiaoTieSickCot.key,
        x: 344,
        y: 402,
        w: 120,
        h: 77,
        activeW: 120,
        activeH: 77,
        glow: 0x8feaff,
        idleOffset: 420
      },
      {
        id: "laoQian",
        baseTexture: image2Assets.laoQian.key,
        activeTexture: image2Assets.laoQianRadio.key,
        x: 730,
        y: 405,
        w: 42,
        h: 84,
        activeW: 54,
        activeH: 74,
        glow: 0x9db4ff,
        idleOffset: 630
      }
    ];

    characters.forEach((def) => this.addStoryCharacter(def));
    this.drawCharacterMicroActions();
  }

  private addStoryCharacter(def: CharacterDef) {
    const shadow = this.add.ellipse(0, def.h / 2 - 4, def.w * 0.95, 8, 0x000000, 0.32);
    const rim = this.add.ellipse(0, 2, def.w * 1.22, def.h * 0.92, def.glow, 0.028);
    const glow = this.add.ellipse(def.x, def.y + def.h / 2 - 8, def.w * 1.55, 14, def.glow, 0.025).setDepth(11);
    const image = this.textures.exists(def.baseTexture)
      ? this.add.image(0, 0, def.baseTexture).setDisplaySize(def.w, def.h).setAlpha(0.98)
      : this.add.rectangle(0, 0, def.w, def.h, def.glow, 0.72);
    const container = this.add.container(def.x, def.y, [rim, shadow, image]).setDepth(12);
    this.characterGlows.set(def.id, glow);
    this.characterActors.set(def.id, {
      def,
      container,
      image: image instanceof Phaser.GameObjects.Image ? image : undefined,
      glow
    });

    this.tweens.add({
      targets: image,
      y: -2,
      duration: 1180 + def.idleOffset,
      delay: def.idleOffset,
      yoyo: true,
      repeat: -1,
      ease: "Stepped",
      easeParams: [2]
    });
  }

  private moveFocusedCharacters(location: TaskLocation | null) {
    if (this.characterFocusLocation === location) return;
    this.characterFocusLocation = location;
    const focusedCharacters = location ? new Set(locationCharacterFocus[location] ?? []) : new Set<string>();
    const anchors = location ? characterInteractionAnchors[location] ?? {} : {};

    this.characterActors.forEach((actor, id) => {
      const isFocused = focusedCharacters.has(id);
      const anchor = isFocused ? anchors[id] : undefined;
      const target = anchor ?? { x: actor.def.x, y: actor.def.y, w: actor.def.w, h: actor.def.h };
      const texture = isFocused && actor.def.activeTexture ? actor.def.activeTexture : actor.def.baseTexture;
      const displayW = anchor?.w ?? (isFocused ? actor.def.activeW ?? actor.def.w : actor.def.w);
      const displayH = anchor?.h ?? (isFocused ? actor.def.activeH ?? actor.def.h : actor.def.h);

      if (actor.image && this.textures.exists(texture)) {
        actor.image.setTexture(texture).setDisplaySize(displayW, displayH);
      }
      actor.container.setDepth(isFocused ? 18 : 12);
      actor.glow
        .setPosition(target.x, target.y + displayH / 2 - 8)
        .setDisplaySize(displayW * 1.45, id === "xiaoTie" ? 18 : 14)
        .setDepth(isFocused ? 17 : 11);

      this.tweens.killTweensOf(actor.container);
      this.tweens.add({
        targets: actor.container,
        x: target.x,
        y: target.y,
        duration: isFocused ? 420 : 340,
        ease: "Stepped",
        easeParams: [8]
      });
    });
  }

  private drawCharacterMicroActions() {
    this.addSpark(418, 246, 0xffb15f, 0);
    this.addSpark(426, 250, 0xffd60a, 360);

    const medPulse = this.add.ellipse(356, 400, 66, 16, 0xffd60a, 0.045).setDepth(11);
    this.tweens.add({ targets: medPulse, alpha: 0.22, scaleX: 1.2, duration: 900, yoyo: true, repeat: -1 });

    for (let i = 0; i < 3; i += 1) {
      const breath = this.add.ellipse(292 + i * 2, 384, 7, 3, 0xd8f5ff, 0.16).setDepth(13);
      this.tweens.add({
        targets: breath,
        y: breath.y - 18,
        x: breath.x + 8,
        alpha: 0,
        duration: 1100,
        delay: i * 360,
        repeat: -1
      });
    }

    for (let i = 0; i < 3; i += 1) {
      const wave = this.add.arc(748, 392, 14 + i * 7, -45, 45, false, 0x8feaff, 0.1).setDepth(11);
      this.tweens.add({
        targets: wave,
        alpha: 0.38,
        scaleX: 1.14,
        scaleY: 1.14,
        duration: 760,
        delay: i * 220,
        yoyo: true,
        repeat: -1
      });
    }
  }

  private addSpark(x: number, y: number, color: number, delay: number) {
    const spark = this.add.rectangle(x, y, 10, 2, color, 0).setDepth(13);
    spark.setRotation(Phaser.Math.DegToRad(28));
    this.tweens.add({
      targets: spark,
      alpha: 0.92,
      scaleX: 1.7,
      duration: 120,
      delay,
      yoyo: true,
      repeat: -1,
      repeatDelay: 720
    });
  }

  private drawHotspots() {
    hotspots.forEach((spot) => {
      const glow = this.add.ellipse(spot.x + spot.w / 2, spot.y + spot.h * 0.72, spot.w * 0.78, spot.h * 0.28, spot.accent, 0).setDepth(11);
      const rect = this.add
        .rectangle(spot.x + spot.w / 2, spot.y + spot.h / 2, spot.w, spot.h, spot.accent, 0)
        .setInteractive({ useHandCursor: true })
        .setDepth(20);

      rect.on("pointerover", () => {
        glow.setAlpha(0.18);
        EventBus.emit("hotspot:hover", spot.id);
      });
      rect.on("pointerout", () => {
        if (this.activeLocation !== spot.id) glow.setAlpha(0);
        EventBus.emit("hotspot:hover", null);
      });
      rect.on("pointerdown", () => {
        this.cameras.main.shake(40, 0.0015);
        EventBus.emit("hotspot:click", spot.id);
      });

      this.hotspotRects.set(spot.id, rect);
      this.hotspotGlows.set(spot.id, glow);
    });
  }

  private drawAgent() {
    this.auraScan = this.add.ellipse(0, 0, 78, 78).setStrokeStyle(2, 0x8feaff, 0.5);
    this.auraBody = this.textures.exists(image2Assets.auraIdle.key)
      ? this.add.image(0, 0, image2Assets.auraIdle.key).setDisplaySize(56, 68).setDepth(21)
      : undefined;
    const body = this.auraBody ?? this.add.circle(0, 0, 24, 0x9eeaff, 0.9);

    this.progressFill = this.add.rectangle(-25, 36, 50, 4, 0x8feaff, 0.88).setOrigin(0, 0.5).setScale(0, 1);
    const auraChildren = ([this.auraScan, body, this.progressFill] as Array<Phaser.GameObjects.GameObject | undefined>).filter(
      (child): child is Phaser.GameObjects.GameObject => Boolean(child)
    );
    this.aura = this.add.container(540, 396, auraChildren).setDepth(24);
    this.progressFill.setVisible(false);

    this.pathSprite = this.add.rectangle(0, 0, 120, 4, 0x8feaff, 0).setDepth(19).setVisible(false);

    this.tweens.add({ targets: this.auraScan, scale: 1.12, alpha: 0.22, duration: 900, yoyo: true, repeat: -1 });
  }

  private moveAgent(location: TaskLocation) {
    if (!this.aura || !this.pathSprite) return;
    this.focusLocation(location);
    const target = spotCenter(location);
    const distance = Phaser.Math.Distance.Between(this.aura.x, this.aura.y, target.x, target.y);
    const angle = Phaser.Math.Angle.Between(this.aura.x, this.aura.y, target.x, target.y);

    this.pathSprite
      .setPosition((this.aura.x + target.x) / 2, (this.aura.y + target.y) / 2)
      .setRotation(angle)
      .setDisplaySize(distance, 5)
      .setAlpha(0.34)
      .setVisible(true);
    this.setAuraTexture("moving");
    this.tweens.killTweensOf(this.aura);
    this.tweens.add({
      targets: this.aura,
      x: target.x,
      y: target.y,
      duration: 620,
      ease: "Stepped",
      easeParams: [10],
      onComplete: () => {
        this.pathSprite?.setVisible(false);
        EventBus.emit("agent:arrived", location);
      }
    });
  }

  private setAgentPhase(phase: AgentPhase) {
    this.setAuraTexture(phase);
    const isExecuting = phase === "executing" || phase === "resolving";
    this.progressFill?.setVisible(isExecuting).setScale(0, 1);
    if (this.progressFill) this.tweens.killTweensOf(this.progressFill);

    if (phase === "thinking") {
      this.auraScan?.setVisible(true).setAlpha(0.72);
      this.tweens.add({ targets: this.auraScan, angle: 360, duration: 800, repeat: 1 });
    }

    if (isExecuting && this.progressFill) {
      this.tweens.add({ targets: this.progressFill, scaleX: 1, duration: phase === "executing" ? 1100 : 500, ease: "Stepped", easeParams: [8] });
    }
  }

  private setAuraTexture(phase: AgentPhase | "moving") {
    if (!this.auraBody) return;
    const key =
      phase === "thinking"
        ? image2Assets.auraThinking.key
        : phase === "moving"
          ? image2Assets.auraMoving.key
          : phase === "executing" || phase === "resolving" || phase === "state_updated" || phase === "replay_logged"
            ? image2Assets.auraExecuting.key
            : image2Assets.auraIdle.key;
    if (this.textures.exists(key)) {
      this.auraBody.setTexture(key).setDisplaySize(phase === "moving" ? 62 : 56, 68);
    }
  }

  private focusLocation(location: TaskLocation | null) {
    this.activeLocation = location;
    this.moveFocusedCharacters(location);
    this.hotspotGlows.forEach((glow, id) => {
      const active = id === location;
      glow.setAlpha(active ? 0.26 : 0);
      if (active) {
        this.tweens.add({ targets: glow, alpha: 0.08, duration: 640, yoyo: true, repeat: 1 });
      }
    });

    const focusedCharacters = location ? locationCharacterFocus[location] ?? [] : [];
    this.characterGlows.forEach((glow, id) => {
      glow.setAlpha(focusedCharacters.includes(id) ? 0.34 : 0);
    });
  }

  private highlightTask(payload: TaskHighlightPayload) {
    const location = payload?.location ?? (payload?.taskId ? tasksById[payload.taskId]?.location : null) ?? null;
    this.focusLocation(location);
  }

  private showTaskResult(payload: Pick<TaskOutcome, "taskId" | "result"> & { location?: TaskLocation }) {
    const location = payload.location ?? tasksById[payload.taskId]?.location;
    if (!location) return;
    const spot = hotspots.find((item) => item.id === location);
    if (!spot) return;
    const center = spotCenter(location);
    const success = payload.result === "success";
    const partial = payload.result === "partial";
    const color = success ? 0x79d6a8 : partial ? 0xffd60a : 0xe84545;

    this.resultEffect?.destroy();
    const pulse = this.add.ellipse(center.x, center.y, spot.w * 0.72, spot.h * 0.36, color, 0.18).setDepth(18);
    pulse.setStrokeStyle(2, color, 0.44);
    this.resultEffect = pulse;
    this.cameras.main.shake(payload.result === "failed" || payload.result === "missing" ? 160 : 70, success ? 0.002 : 0.006);
    this.tweens.add({
      targets: pulse,
      alpha: 0,
      scaleX: 1.24,
      scaleY: 1.24,
      duration: 620,
      onComplete: () => pulse.destroy()
    });
    EventBus.emit("animation:complete", `task:${payload.taskId}:${payload.result}`);
  }
}
