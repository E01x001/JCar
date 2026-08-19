// src/utils/format.js
export const formatPhone = (phone) => {
    if (!phone || phone.length < 10) {return phone;}
    return phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
  };

export const formatPrice = (price) => {
    const num = parseInt(price, 10);
    if (isNaN(num)) {return price;}

    const hundredMillion = Math.floor(num / 100000000);
    const tenThousand = Math.floor((num % 100000000) / 10000);

    if (hundredMillion > 0) {
    return `${hundredMillion}억 ${tenThousand.toLocaleString()}만원`;
    } else {
    return `${tenThousand.toLocaleString()}만원`;
    }
};

/**
 * Format a date object to YYYY.MM.DD format
 * @param {Date} date - Date object to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) {return '-';}
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {return '-';}

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}.${month}.${day}`;
};

/**
 * Format a date object to HH:MM format
 * @param {Date} date - Date object to format
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
  if (!date) {return '-';}
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {return '-';}

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

/**
 * 상대 시간 표기 ("방금", "3분 전", "어제", "3일 전", 그 이상은 날짜).
 *
 * 알림센터처럼 "언제 왔는지"가 중요한 목록용이다. 7일이 넘으면 상대 표기가
 * 오히려 읽기 어려워지므로 절대 날짜로 넘긴다.
 *
 * @param {Date|number|string} date - Date, epoch ms, 또는 파싱 가능한 문자열
 * @param {Date|number} [now=Date.now()] - 기준 시각(테스트에서 고정하기 위해 주입 가능)
 * @returns {string}
 */
export const formatRelativeTime = (date, now = Date.now()) => {
  if (!date) {return '-';}
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {return '-';}

  const diffMs = (now instanceof Date ? now.getTime() : now) - d.getTime();

  // 미래 시각(기기 시계 어긋남 등)은 "방금"으로 흡수한다
  if (diffMs < 60 * 1000) {return '방금';}

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) {return `${minutes}분 전`;}

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {return `${hours}시간 전`;}

  const days = Math.floor(hours / 24);
  if (days === 1) {return '어제';}
  if (days < 7) {return `${days}일 전`;}

  return formatDate(d);
};
