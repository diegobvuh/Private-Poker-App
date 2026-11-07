export type JudgeObservation = {
  sessionId: string;
  capturedAt: string;
  source: "MANUAL" | "FUTURE_CAMERA_PROVIDER";
  confidence?: number;
  proposedEvent: Record<string, unknown>;
};

export interface TableJudge {
  readonly enabled: boolean;
  observe(): Promise<JudgeObservation>;
}

export const disabledCameraJudge: TableJudge = {
  enabled: false,
  async observe() {
    throw new Error("Camera judging is intentionally disabled in v1");
  },
};
