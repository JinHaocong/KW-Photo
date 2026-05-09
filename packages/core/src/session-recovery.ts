export type PreferredServerRole = 'primary' | 'backup';

export interface PreferredServerCandidate {
  role: PreferredServerRole;
  url: string;
}

export interface PreferredServerProbeSuccess<TValue> {
  candidate: PreferredServerCandidate;
  status: 'fulfilled';
  value: TValue;
}

export interface PreferredServerProbeFailure {
  candidate: PreferredServerCandidate;
  error: unknown;
  status: 'rejected';
}

export type PreferredServerProbeResult<TValue> =
  | PreferredServerProbeFailure
  | PreferredServerProbeSuccess<TValue>;

export interface PreferredServerSelection<TValue> {
  available: Array<PreferredServerProbeSuccess<TValue>>;
  candidate: PreferredServerCandidate;
  failures: PreferredServerProbeFailure[];
  value: TValue;
}

export interface SelectPreferredServerParams<TValue> {
  candidates: PreferredServerCandidate[];
  preferredRole: PreferredServerRole;
  probeCandidate: (candidate: PreferredServerCandidate) => Promise<TValue>;
  timeoutMessage?: string;
  timeoutMs: number;
}

/**
 * Raised when neither configured server address is reachable within the recovery window.
 */
export class PreferredServerUnavailableError extends Error {
  readonly failures: PreferredServerProbeFailure[];

  constructor(failures: PreferredServerProbeFailure[]) {
    super('主地址和备用地址当前都不可用');
    this.name = 'PreferredServerUnavailableError';
    this.failures = failures;
  }
}

/**
 * Probes primary and backup addresses in parallel, then chooses the preferred reachable server.
 */
export const selectPreferredServer = async <TValue>({
  candidates,
  preferredRole,
  probeCandidate,
  timeoutMessage = '服务器探活超时，请稍后重试',
  timeoutMs,
}: SelectPreferredServerParams<TValue>): Promise<PreferredServerSelection<TValue>> => {
  const uniqueCandidates = deduplicateCandidates(candidates);
  const results = await Promise.all(
    uniqueCandidates.map((candidate) =>
      probeServerCandidate(candidate, probeCandidate, timeoutMs, timeoutMessage),
    ),
  );
  const available = results.filter(isProbeSuccess);
  const failures = results.filter(isProbeFailure);

  if (available.length === 0) {
    throw new PreferredServerUnavailableError(failures);
  }

  const selected = available.find((result) => result.candidate.role === preferredRole) ?? available[0];

  return {
    available,
    candidate: selected.candidate,
    failures,
    value: selected.value,
  };
};

const probeServerCandidate = async <TValue>(
  candidate: PreferredServerCandidate,
  probeCandidate: (candidate: PreferredServerCandidate) => Promise<TValue>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<PreferredServerProbeResult<TValue>> => {
  try {
    const value = await withTimeout(
      probeCandidate(candidate),
      timeoutMs,
      `${timeoutMessage}: ${candidate.url}`,
    );

    return {
      candidate,
      status: 'fulfilled',
      value,
    };
  } catch (error) {
    return {
      candidate,
      error,
      status: 'rejected',
    };
  }
};

/**
 * Bounds one probe so recovery always makes a decision inside the configured window.
 */
const withTimeout = async <TValue,>(
  promise: Promise<TValue>,
  timeoutMs: number,
  message: string,
): Promise<TValue> => {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

/**
 * Keeps repeated role/url pairs from starting duplicate probes.
 */
const deduplicateCandidates = (candidates: PreferredServerCandidate[]): PreferredServerCandidate[] => {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = `${candidate.role}:${candidate.url}`;

    if (!candidate.url || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const isProbeSuccess = <TValue>(
  result: PreferredServerProbeResult<TValue>,
): result is PreferredServerProbeSuccess<TValue> => {
  return result.status === 'fulfilled';
};

const isProbeFailure = <TValue>(
  result: PreferredServerProbeResult<TValue>,
): result is PreferredServerProbeFailure => {
  return result.status === 'rejected';
};
