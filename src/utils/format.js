// src/utils/format.js
export const formatPhone = (phone) => {
    if (!phone || phone.length < 10) return phone;
    return phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
  };

export const formatPrice = (price) => {
    const num = parseInt(price, 10);
    if (isNaN(num)) return price;

    const hundredMillion = Math.floor(num / 100000000);
    const tenThousand = Math.floor((num % 100000000) / 10000);

    if (hundredMillion > 0) {
    return `${hundredMillion}억 ${tenThousand.toLocaleString()}만원`;
    } else {
    return `${tenThousand.toLocaleString()}만원`;
    }
};
  