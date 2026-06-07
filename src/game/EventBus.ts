import Phaser from "phaser";
import type { AgentPhase, Branch, TaskLocation, TaskOutcome } from "../data/types";

export type TaskStartPayload = {
  taskId: string;
  title?: string;
  location?: TaskLocation;
};

export type TaskResultPayload = Pick<TaskOutcome, "taskId" | "result"> & {
  title?: string;
  location?: TaskLocation;
};

type GameEvents = {
  "hotspot:click": TaskLocation;
  "hotspot:hover": TaskLocation | null;
  "agent:move-to-location": TaskLocation;
  "agent:phase-change": AgentPhase;
  "task:highlight": string | null;
  "task:start": TaskStartPayload;
  "task:result": TaskResultPayload;
  "day:change": number;
  "branch:change": Branch;
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
