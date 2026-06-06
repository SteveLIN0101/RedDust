import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { ShelterScene } from "./scenes/ShelterScene";
import { EventBus, type LayoutMode } from "./EventBus";

const VIRTUAL_WIDTH = 1280;
const VIRTUAL_HEIGHT = 720;

function layoutMode(width: number, height: number): LayoutMode {
  if (width < 760) return "mobile";
  if (width < 1040 || height < 620) return "compact";
  return "desktop";
}

export function PhaserGame() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) return;

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      backgroundColor: "rgba(0,0,0,0)",
      transparent: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: VIRTUAL_WIDTH,
        height: VIRTUAL_HEIGHT,
        min: {
          width: 320,
          height: 180
        },
        max: {
          width: 1920,
          height: 1080
        }
      },
      render: {
        pixelArt: true,
        antialias: false
      },
      scene: [BootScene, PreloadScene, ShelterScene]
    });

    let raf = 0;
    const emitLayout = () => {
      const host = hostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const canvas = host.querySelector("canvas");
      const canvasRect = canvas?.getBoundingClientRect();
      gameRef.current?.scale.refresh();
      EventBus.emit("layout:changed", {
        mode: layoutMode(window.innerWidth, window.innerHeight),
        stagePx: {
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        canvasPx: canvasRect
          ? {
              width: Math.round(canvasRect.width),
              height: Math.round(canvasRect.height),
              left: Math.round(canvasRect.left),
              top: Math.round(canvasRect.top)
            }
          : undefined
      });
    };
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(emitLayout);
    });
    observer.observe(hostRef.current);
    emitLayout();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(raf);
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div className="phaser-host" ref={hostRef} aria-label="Red Dust side-view shelter scene" />;
}
