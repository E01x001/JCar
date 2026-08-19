/**
 * 인앱 알림센터 데이터 접근.
 *
 * notifications 테이블은 이미 푸시 발송의 아웃박스로 동작한다(트리거가 INSERT하면
 * pg_net이 FCM으로 내보낸다). 같은 행이 인앱 목록의 데이터 소스이기도 하다 —
 * 푸시를 놓쳐도 여기서 확인할 수 있어야 한다는 것이 이 화면의 존재 이유다.
 *
 * RLS: 본인 행만 select/delete 가능하고, update는 컬럼 그랜트로 read 플래그만 열려 있다.
 * 그래서 클라이언트가 title/body를 위조할 수 없다.
 * 스키마: supabase/migrations/20260814164533_notifications.sql
 */
import { supabase } from '../../lib/supabase';
import { rowToApp } from '../../lib/mappers';
import { logger } from '../../utils/logger';

const TABLE = 'notifications';

/** 최신순 알림 목록 */
export const fetchNotifications = async ({ limit = 50 } = {}) => {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, type, title, body, data, read, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) { throw error; }
  return (data ?? []).map(rowToApp);
};

/** 안읽음 개수 (탭 배지용) */
export const fetchUnreadCount = async () => {
  const { count, error } = await supabase
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('read', false);

  if (error) { throw error; }
  return count ?? 0;
};

/** 단건 읽음 처리 — 이미 읽은 건 건드리지 않는다 */
export const markAsRead = async (id) => {
  const { error } = await supabase
    .from(TABLE)
    .update({ read: true })
    .eq('id', id)
    .eq('read', false);

  if (error) { throw error; }
};

/** 전체 읽음 처리 */
export const markAllAsRead = async () => {
  const { error } = await supabase
    .from(TABLE)
    .update({ read: true })
    .eq('read', false);

  if (error) { throw error; }
};

/** 단건 삭제 */
export const deleteNotification = async (id) => {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) { throw error; }
};

/**
 * 실시간 구독 — 새 알림이 들어오면 목록을 다시 읽는다.
 *
 * 차량/상담 구독과 같은 패턴(디바운스 후 재조회)을 쓴다. 개별 이벤트를 병합하는
 * 대신 다시 읽는 이유는, 읽음 처리·삭제까지 한 경로로 수렴시키기 위해서다.
 *
 * @returns {Function} 구독 해제 함수
 */
export const subscribeNotifications = (userId, callback, { channelKey = 'notifications' } = {}) => {
  let disposed = false;
  let timer = null;

  const load = async () => {
    try {
      const list = await fetchNotifications();
      if (!disposed) { callback(list); }
    } catch (error) {
      logger.error('알림 조회 오류:', error);
    }
  };

  const scheduleReload = () => {
    if (timer) { clearTimeout(timer); }
    timer = setTimeout(load, 300);
  };

  load();

  const channel = supabase
    .channel(`${channelKey}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      // 본인 행만 구독 — RLS가 막아주긴 하지만 불필요한 이벤트를 받지 않는다
      { event: '*', schema: 'public', table: TABLE, filter: `user_id=eq.${userId}` },
      scheduleReload,
    )
    .subscribe();

  return () => {
    disposed = true;
    if (timer) { clearTimeout(timer); }
    supabase.removeChannel(channel);
  };
};

export default {
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  subscribeNotifications,
};
