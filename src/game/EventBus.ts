import Phaser from "phaser";
import type { AgentPhase, Branch, TaskLocation, TaskOutcome } from "../data/types";

export type LayoutMode = "desktop" | "compact" | "mobile";

export type LayoutChangedPayload = {
  mode: LayoutMode;
  stagePx: {
    width: number;
    height: number;
  };
  canvasPx?: {
    width: number;
    height: number;
    left: number;
    top: number;
  };
};

export type TaskHighlightPayload = {
  taskId: string;
  location?: TaskLocation;
} | null;

export type TaskResultPayload = Pick<TaskOutcome, "taskId" | "result"> & {
  location?: TaskLocation;
};

type GameEvents = {
  "hotspot:click": TaskLocation;
  "hotspot:hover": TaskLocation | null;
  "agent:move-to-location": TaskLocation;
  "agent:phase-change": AgentPhase;
  "task:highlight": TaskHighlightPayload;
  "task:result": TaskResultPayload;
  "day:change": number;
  "branch:change": Branch;
  "layout:changed": LayoutChangedPayload;
  "agent:arrived": TaskLocation;
  "animation:complete": string;
};

class TypedEventBus extends Phaser.Events.EventEmitter {
  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): boolean {
    return super.emit(event, payload);
  }

  on<K extends keyof GameEvents>(event: K, fn: (payload: GameEvents[K]) => void): this {
    return super.on(event, fn);
  }

  off<K extends keyof GameEvents>(event: K, fn?: (payload: GameEvents[K]) => void): this {
    return super.off(event, fn);
  }
}

export const EventBus = new TypedEventBus();
