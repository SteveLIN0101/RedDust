import type { Branch, TaskLocation } from "./types";

export type CampaignEvent = {
  seq: number;
  at: string;
  type:
    | "campaign_created"
    | "agent_connected"
    | "campaign_started"
    | "task_started"
    | "action_executed"
    | "task_submitted"
    | "slot_completed"
    | "day_changed"
    | "branch_changed"
    | "branch_decided"
    | "story_event"
    | "branch_scene"
    | "final_audit"
    | "campaign_complete";
  campaign_id: string;
  payload: Record<string, unknown>;
};

export type CampaignFrontendTask = {
  id: string;
  real_task_id?: string;
  title: string;
  day: number;
  branch: Branch;
  location: TaskLocation;
  category?: string;
  description?: string;
  objective?: string;
  agentAction?: string;
  reasoningSummary?: string;
  executionText?: string;
  successText?: string;
  failureText?: string;
};

export type CampaignReplayItem = {
  seq: number;
  phase_hint: string;
  state_before: Record<string, unknown>;
  state_after: Record<string, unknown>;
  frontend_task: CampaignFrontendTask;
  outcome: {
    taskId: string;
    result: "success" | "partial" | "failed" | "missing";
    scoreLabel: string;
    stateDelta: Record<string, number>;
    explanation: string;
  };
  replay_event: Record<string, unknown>;
};

export type CampaignTrace = {
  campaign_id: string;
  status: string;
  global_state: Record<string, unknown>;
  replay_log: Record<string, unknown>[];
  frontend_trace?: CampaignReplayItem[];
  events?: CampaignEvent[];
  ending?: { title?: string; text?: string; branch?: Branch; ending_key?: string; audit?: Record<string, unknown> };
  branch_decision?: Record<string, unknown>;
  story_version?: string;
  story_flags?: string[];
  story_unlocks?: string[];
  routeLeaning?: string;
};

export type CampaignState = CampaignTrace & {
  current_day: number;
  active_branch: Branch;
  current_slot_id?: string;
  current_task_id?: string;
  current_slot?: Record<string, unknown>;
  current_run?: Record<string, unknown>;
  latest_event_seq?: number;
  connected_agent?: Record<string, unknown> | null;
  wait_for_start?: boolean;
};

export type CampaignEventsResponse = {
  campaign_id: string;
  events: CampaignEvent[];
  latest_seq: number;
  state: CampaignState;
};

export function defaultCampaignApiBase() {
  const params = new URLSearchParams(window.location.search);
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return (
    params.get("api") ||
    env?.VITE_REDDUST_API_BASE ||
    "http://127.0.0.1:7001"
  ).replace(/\/$/, "");
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return (await response.json()) as T;
}

export class CampaignClient {
  constructor(public readonly baseUrl: string = defaultCampaignApiBase()) {}

  createCampaign(payload: Record<string, unknown>) {
    return fetchJson<CampaignState>(`${this.baseUrl}/campaigns`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  getState(campaignId: string) {
    return fetchJson<CampaignState>(`${this.baseUrl}/campaigns/${campaignId}/state`);
  }

  getTrace(campaignId: string) {
    return fetchJson<CampaignTrace>(`${this.baseUrl}/campaigns/${campaignId}/trace`);
  }

  getTraceUrl(traceUrl: string) {
    return fetchJson<CampaignTrace>(traceUrl);
  }

  getEvents(campaignId: string, after = 0) {
    return fetchJson<CampaignEventsResponse>(`${this.baseUrl}/campaigns/${campaignId}/events?after=${after}`);
  }

  connect(campaignId: string, payload: Record<string, unknown>) {
    return fetchJson<{ ok: boolean; state: CampaignState; event: CampaignEvent }>(`${this.baseUrl}/campaigns/${campaignId}/connect`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  start(campaignId: string) {
    return fetchJson<{ ok: boolean; state: CampaignState }>(`${this.baseUrl}/campaigns/${campaignId}/start`, {
      method: "POST",
      body: JSON.stringify({})
    });
  }
}
