/**
 * 키보드가 떠 있는가.
 *
 * 안드로이드는 `adjustResize`라 키보드가 뜨면 창 자체가 줄어든다. 그런데 화면
 * 상단이 `flex: 1`로 남는 공간을 흡수하는 구조라면, 줄어든 만큼 상단만 줄고
 * **아래쪽 입력칸은 그대로 키보드 뒤로 밀린다.** ScrollView를 씌워도 소용없다 —
 * 내용 높이가 뷰포트와 같으면 넘치는 것이 없어 스크롤이 생기지 않는다.
 *
 * 그래서 키보드가 뜬 것을 알아채고 **상단을 직접 접어야** 한다. 이 훅은 그
 * 판단만 제공한다.
 *
 * 이벤트 이름이 플랫폼마다 다르다. iOS는 will*(애니메이션 시작 시점)이 있어
 * 화면 변화가 키보드와 함께 움직이고, 안드로이드에는 did*만 있다.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export const useKeyboardVisible = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return visible;
};

export default useKeyboardVisible;
