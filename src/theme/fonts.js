/**
 * JCar Design System - Fonts (Pretendard)
 *
 * 시안(J-Car.dc.html)이 쓰는 Pretendard를 앱에 번들. Android에서는 fontWeight만으로는
 * 정적 웨이트 파일이 선택되지 않으므로, weight → 파일명(fontFamily) 매핑을 제공한다.
 * 파일명은 react-native-asset이 등록하는 이름과 동일해야 한다(src/assets/fonts/*.ttf).
 */

export const fontFamily = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semiBold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extraBold: 'Pretendard-ExtraBold',
};

// fontWeight 값 → Pretendard 패밀리 매핑
export const familyForWeight = (weight) => {
  switch (String(weight)) {
    case '500':
      return fontFamily.medium;
    case '600':
      return fontFamily.semiBold;
    case '700':
    case 'bold':
      return fontFamily.bold;
    case '800':
    case '900':
      return fontFamily.extraBold;
    case '400':
    case 'normal':
    default:
      return fontFamily.regular;
  }
};

export const fonts = { fontFamily, familyForWeight };

export default fonts;
