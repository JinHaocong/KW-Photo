interface QueuedAsyncTask<TResult> {
  reject: (reason?: unknown) => void;
  resolve: (value: TResult | PromiseLike<TResult>) => void;
  task: () => Promise<TResult>;
}

export interface AsyncConcurrencyLimiter {
  /**
   * Drops tasks that have not started yet.
   * @param reason Rejection reason passed to queued callers.
   */
  clear: (reason?: unknown) => void;
  /**
   * Runs a task when the limiter has an available slot.
   * @param task Async task guarded by the shared concurrency limit.
   * @returns The task result.
   */
  run: <TResult>(task: () => Promise<TResult>) => Promise<TResult>;
}

/**
 * Creates a FIFO async task limiter for request-heavy UI flows.
 * @param concurrency Maximum number of active tasks.
 * @returns A limiter that queues extra tasks until a slot is available.
 */
export const createAsyncConcurrencyLimiter = (concurrency: number): AsyncConcurrencyLimiter => {
  const maxConcurrency = Math.max(1, Math.floor(concurrency));
  const queuedTasks: Array<QueuedAsyncTask<unknown>> = [];
  let activeCount = 0;

  /**
   * Starts queued tasks while free slots are available.
   */
  const startQueuedTasks = (): void => {
    while (activeCount < maxConcurrency && queuedTasks.length > 0) {
      const queuedTask = queuedTasks.shift();

      if (!queuedTask) {
        return;
      }

      activeCount += 1;
      Promise.resolve()
        .then(queuedTask.task)
        .then(queuedTask.resolve, queuedTask.reject)
        .finally(() => {
          activeCount -= 1;
          startQueuedTasks();
        });
    }
  };

  return {
    clear: (reason = new Error('Async concurrency limiter queue cleared')): void => {
      const pendingTasks = queuedTasks.splice(0);

      pendingTasks.forEach((queuedTask) => queuedTask.reject(reason));
    },
    run: <TResult>(task: () => Promise<TResult>): Promise<TResult> => {
      return new Promise<TResult>((resolve, reject) => {
        queuedTasks.push({
          reject,
          resolve: resolve as (value: unknown | PromiseLike<unknown>) => void,
          task: task as () => Promise<unknown>,
        });
        startQueuedTasks();
      });
    },
  };
};
