export const PROTOCOL_VERSION=16;
export const NET = {
  tickRate:30, snapshotRate:20, inputRate:30, interpolationMs:100,
  smallError:12, snapError:120, correctionRate:8, inputTimeoutMs:250,
  personalityMax:100, moveSpeed:245, maxPlayers:4, knockbackDecay:8, maxKnockback:600, maxInputsPerSecond:120,
} as const;
