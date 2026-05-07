import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { AdminTask, ApiClientOptions } from '@kwphoto/core';
import { fetchAdminTasks } from '@kwphoto/core';

import {
  ACTIVE_TASK_EMPTY_LIMIT,
  ACTIVE_TASK_REFETCH_INTERVAL,
} from '../adminConfig';
import type { AdminTab } from '../adminTypes';

interface UseAdminGalleryTaskPollingParams {
  activeTab: AdminTab;
  apiOptions: ApiClientOptions;
  enabled: boolean;
  userId?: number | string;
}

interface UseAdminGalleryTaskPollingResult {
  activeTasks: AdminTask[];
  startPolling: () => void;
}

/**
 * Polls gallery-related active backend tasks while preventing overlapping manual timers.
 */
export const useAdminGalleryTaskPolling = ({
  activeTab,
  apiOptions,
  enabled,
  userId,
}: UseAdminGalleryTaskPollingParams): UseAdminGalleryTaskPollingResult => {
  const emptyPollCountRef = useRef(0);
  const [polling, setPolling] = useState(false);
  const {
    data: activeTasks = [],
    dataUpdatedAt,
    errorUpdatedAt,
    isError,
    refetch,
  } = useQuery({
    enabled: polling && activeTab === 'gallery' && enabled,
    queryFn: () => fetchAdminTasks(apiOptions, 'active'),
    queryKey: ['mobile-admin-gallery-active-tasks', apiOptions.baseUrl, userId],
    refetchInterval: polling ? ACTIVE_TASK_REFETCH_INTERVAL : false,
    retry: false,
  });

  const startPolling = useCallback((): void => {
    emptyPollCountRef.current = 0;
    setPolling(true);
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (enabled && activeTab === 'gallery') {
      startPolling();
    }
  }, [activeTab, enabled, startPolling]);

  useEffect(() => {
    const pollVersion = Math.max(dataUpdatedAt, errorUpdatedAt);

    if (!polling || pollVersion === 0) {
      return;
    }

    if (isError || activeTasks.length === 0) {
      emptyPollCountRef.current += 1;

      if (emptyPollCountRef.current > ACTIVE_TASK_EMPTY_LIMIT) {
        setPolling(false);
      }
      return;
    }

    emptyPollCountRef.current = 0;
  }, [activeTasks.length, dataUpdatedAt, errorUpdatedAt, isError, polling]);

  return {
    activeTasks,
    startPolling,
  };
};
