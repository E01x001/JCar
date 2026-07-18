/**
 * Jest mock for src/lib/supabase (jest.config moduleNameMapper 참조)
 * — 체이너블 쿼리 빌더 스텁. 개별 테스트에서 jest.mock으로 세부 동작 재정의 가능.
 */
const chain = () => {
  const q = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit',
  ];
  methods.forEach((m) => { q[m] = jest.fn(() => q); });
  q.single = jest.fn(() => Promise.resolve({ data: null, error: null }));
  q.maybeSingle = jest.fn(() => Promise.resolve({ data: null, error: null }));
  q.then = (resolve) => resolve({ data: [], error: null });
  return q;
};

const channelStub = {
  on: jest.fn(() => channelStub),
  subscribe: jest.fn(() => channelStub),
};

export const supabase = {
  from: jest.fn(() => chain()),
  auth: {
    getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    signInWithPassword: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    signUp: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    resend: jest.fn(() => Promise.resolve({ error: null })),
    resetPasswordForEmail: jest.fn(() => Promise.resolve({ error: null })),
    startAutoRefresh: jest.fn(),
    stopAutoRefresh: jest.fn(),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      remove: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/mock.jpg' } })),
    })),
  },
  functions: {
    invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
  },
  channel: jest.fn(() => channelStub),
  removeChannel: jest.fn(),
};
