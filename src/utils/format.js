// src/utils/format.js
export const formatPhone = (phone) => {
    if (!phone || phone.length < 10) return phone;
    return phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
  };