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
