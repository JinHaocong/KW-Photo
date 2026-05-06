import { RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchAdminUsers } from '../../services/admin-service';
import type { AdminUserRecord } from '../../services/admin-service';
import type { ApiClientOptions } from '../../services/api-client';
import { getApiErrorMessage } from '../../services/api-client';
import type { CurrentUser } from '../../shared/types';
import { formatAdminDateTime } from './admin-utils';

interface AdminUsersPanelProps {
  apiOptions: ApiClientOptions;
  currentUser?: CurrentUser;
}

/**
 * Lists users when the admin API is available and always keeps the current user visible.
 */
export const AdminUsersPanel = ({ apiOptions, currentUser }: AdminUsersPanelProps) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const visibleUsers = useMemo(
    () => mergeCurrentUser(users, currentUser),
    [currentUser, users],
  );

  const loadUsers = useCallback(async (): Promise<void> => {
    setError('');
    setLoading(true);

    try {
      setUsers(await fetchAdminUsers(apiOptions));
    } catch (requestError) {
      setUsers([]);
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [apiOptions]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  return (
    <div className="admin-panel">
      <div className="section-heading">
        <div>
          <h3>用户管理</h3>
          <p>展示用户与权限状态；创建、删除、重置密码会在后续表单中补齐。</p>
        </div>
        <button className="secondary-btn" disabled={loading} onClick={() => void loadUsers()} type="button">
          <RefreshCw size={15} />
          刷新
        </button>
      </div>

      {error ? <div className="admin-error">{error}，已保留当前登录用户信息。</div> : null}

      <div className="admin-table">
        {loading ? <div className="admin-state">正在读取用户...</div> : null}
        {!loading && visibleUsers.length === 0 ? <div className="admin-state">暂无用户数据。</div> : null}

        {visibleUsers.map((user) => (
          <article className="admin-table-row" key={user.id ?? user.username}>
            <div className="admin-table-row__main">
              <strong title={user.username}>
                <UserRound size={16} />
                {user.username}
              </strong>
              <span>ID：{user.id ?? '-'}</span>
            </div>
            <div className="admin-table-row__meta">
              <span>{user.roleLabel}</span>
              <span>{user.securityLabel}</span>
              <span>最近登录：{formatAdminDateTime(user.lastLogin)}</span>
            </div>
            <span className="admin-status-pill">
              <ShieldCheck size={14} />
              {user.roleLabel}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
};

const mergeCurrentUser = (
  users: AdminUserRecord[],
  currentUser?: CurrentUser,
): AdminUserRecord[] => {
  if (!currentUser) {
    return users;
  }

  const hasCurrentUser = users.some((user) => String(user.id) === String(currentUser.id));

  if (hasCurrentUser) {
    return users;
  }

  return [
    {
      id: currentUser.id,
      roleLabel: currentUser.isSuperAdmin ? '超级管理员' : currentUser.isAdmin ? '管理员' : '普通用户',
      securityLabel: currentUser.otpEnable ? '已开启 2FA' : '未开启 2FA',
      username: currentUser.username,
    },
    ...users,
  ];
};
