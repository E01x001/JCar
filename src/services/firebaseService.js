import firestore from "@react-native-firebase/firestore";

export const saveConsultationRequest = async (data) => {
  try {
    // 필드 검증 및 undefined 값을 null로 대체
    const validData = {
      user_id: data.user_id || null,  // 예: user_id가 없으면 null로 처리
      vehicle_id: data.vehicle_id || null,  // 예: vehicle_id가 없으면 null로 처리
      preferred_time: data.preferred_time ? firestore.Timestamp.fromDate(new Date(data.preferred_time)) : null, // preferred_time이 있으면 Timestamp로 변환, 없으면 null로 처리
      message: data.message || "",  // 메시지가 없으면 빈 문자열로 처리
      // 필요한 추가 필드가 있으면 이와 같은 방식으로 처리
    };

    // 요청 데이터를 Firestore에 저장
    await firestore().collection("consultation_requests").add(validData);
    console.log("상담 요청이 성공적으로 저장되었습니다.");
  } catch (error) {
    console.error("상담 요청 저장 오류:", error);
  }
};
