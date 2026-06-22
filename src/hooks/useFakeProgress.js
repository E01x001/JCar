import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * useFakeProgress — 단일 요청(실제 진행률 없음)을 위한 추정형 진행 훅.
 *
 * 동작 원칙(정직):
 * - start() 후 진행률이 시간 곡선을 따라 cap(기본 90%)까지 점근적으로 차오른다.
 *   응답이 오기 전에는 절대 100%에 도달하지 않는다.
 * - finish() 호출 시(=실제 응답 도착) 빠르게 100%로 마무리 후 잠깐 뒤 숨긴다.
 * - cancel() 은 즉시 초기화(에러/취소).
 *
 * 임계값 기반 메시지 교체로 대기 지루함을 줄인다.
 *
 * @param {Array<{at:number,text:string}>} messages - 진행률 임계값별 안내 문구
 * @param {Object} [opts] - { tickMs, cap, ease, finishMs }
 */
export const useFakeProgress = (messages = [], opts = {}) => {
  const { tickMs = 130, cap = 90, ease = 0.06, finishMs = 450 } = opts;
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const runRef = useRef(null);
  const finishRef = useRef(null);
  const hideRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (runRef.current) { clearInterval(runRef.current); runRef.current = null; }
    if (finishRef.current) { clearInterval(finishRef.current); finishRef.current = null; }
    if (hideRef.current) { clearTimeout(hideRef.current); hideRef.current = null; }
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setProgress(0);
    setActive(true);
    runRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.max(0.4, (cap - p) * ease);
        return next >= cap ? cap : next;
      });
    }, tickMs);
  }, [cap, ease, tickMs, clearTimers]);

  const finish = useCallback(() => {
    if (runRef.current) { clearInterval(runRef.current); runRef.current = null; }
    finishRef.current = setInterval(() => {
      setProgress((p) => {
        const next = p + (100 - p) * 0.4 + 3;
        if (next >= 100) {
          if (finishRef.current) { clearInterval(finishRef.current); finishRef.current = null; }
          hideRef.current = setTimeout(() => {
            setActive(false);
            setProgress(0);
          }, finishMs);
          return 100;
        }
        return next;
      });
    }, 45);
  }, [finishMs]);

  const cancel = useCallback(() => {
    clearTimers();
    setActive(false);
    setProgress(0);
  }, [clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  // 현재 진행률에 해당하는 메시지(임계값을 넘은 마지막 문구)
  let message = messages.length ? messages[0].text : '';
  for (let i = 0; i < messages.length; i++) {
    if (progress >= messages[i].at) { message = messages[i].text; }
  }

  return { active, progress: Math.round(progress), message, start, finish, cancel };
};

export default useFakeProgress;
