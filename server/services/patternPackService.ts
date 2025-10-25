/**
 * Minimal, safe implementation to satisfy default import usage across the codebase.
 * Replace implementations later with the real logic.
 */

export type Pattern = {
  id: string
  name: string
  metadata?: Record<string, unknown>
};

export const patternPackService = {
  async load(): Promise<{ patterns: Pattern[]; version: string }> {
    // TODO: wire to your real pattern pack loader
    return { patterns: [], version: "stub-0" };
  },
  getPattern(_id: string): Pattern | null {
    // TODO: look up an actual pattern by id
    return null;
  }
};

// back-compat: default import works under any local name
export default patternPackService;
