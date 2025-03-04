import firestore from "@react-native-firebase/firestore";

export const saveConsultationRequest = async (data) => {
  try {
    await firestore().collection("consultation_requests").add(data);
  } catch (error) {
    console.error("상담 요청 저장 오류:", error);
  }
};
