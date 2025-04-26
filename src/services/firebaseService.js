import firestore from "@react-native-firebase/firestore";

export const saveConsultationRequest = async (data) => {
  try {
    const validData = {
      userId: data.userId || null,
      userName: data.userName || "익명",
      userPhone: data.userPhone || "미등록",
      vehicleId: data.vehicleId || null,
      vehicleName: data.vehicleName || "알 수 없음",
      preferredDate: data.preferredDate || null,
      preferredTime: data.preferredTime || null,
      status: data.status || "pending",
      createdAt: firestore.FieldValue.serverTimestamp(), // ✅ 추가
    };

    await firestore().collection("consultation_requests").add(validData);
    console.log("상담 요청이 성공적으로 저장되었습니다.");
    return true;
  } catch (error) {
    console.error("상담 요청 저장 오류:", error);
    return false;
  }
};
