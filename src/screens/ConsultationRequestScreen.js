import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import DatePicker from "react-native-date-picker";
import { useRoute, useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext"; // 사용자 정보 가져오기
import firestore from "@react-native-firebase/firestore"; // Firestore 불러오기

const ConsultationRequestScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { vehicle } = route.params;
  const { user } = useContext(AuthContext);
  const [date, setDate] = useState(new Date());  // 초기값을 Date 객체로 설정
  const [open, setOpen] = useState(false);

  // 상담 요청 저장 함수
  const saveConsultationRequest = async (consultationData) => {
    try {
      await firestore().collection("consultation_requests").add(consultationData);
      console.log("상담 요청이 성공적으로 저장되었습니다.");
      return true;
    } catch (error) {
      console.error("상담 요청 저장 오류:", error);
      return false;
    }
  };

  // 상담 요청 제출 핸들러
  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("로그인이 필요합니다.");
      return;
    }

    // vehicle 정보가 존재하는지 확인
    const vehicleId = vehicle?.vehicleId || "알 수 없음";  // 기본값 설정
    const vehicleName = vehicle?.vehicleName || "알 수 없음";  // 기본값 설정

    // 사용자 정보가 존재하지 않을 경우 기본값 설정
    const userName = user.displayName || "익명";
    const userPhone = user.phoneNumber || "미등록";

    const consultationData = {
      user_id: user.uid,
      user_name: userName,
      user_phone: userPhone,
      vehicle_id: vehicleId,
      vehicle_name: vehicleName,  // vehicle_name으로 변경
      preferred_time: firestore.Timestamp.fromDate(date), // Firestore Timestamp로 저장
      status: "pending",
    };

    const success = await saveConsultationRequest(consultationData);

    if (success) {
      Alert.alert("구매 상담 요청이 완료되었습니다.");
      navigation.goBack();
    } else {
      Alert.alert("상담 요청 저장에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // 날짜 포맷팅 함수
  const formattedDate = date.toLocaleDateString() + " " + date.toLocaleTimeString();

  const handleDateConfirm = (newDate) => {
    console.log("선택된 날짜 타입 확인:", typeof newDate);  // newDate 타입 확인
    console.log("선택된 날짜 값 확인:", newDate);  // 선택된 날짜 출력

    if (newDate instanceof Date && !isNaN(newDate)) {
      console.log("유효한 날짜:", newDate);  // 유효한 날짜일 경우 출력
      setDate(newDate);
    } else {
      console.log("유효하지 않은 날짜:", newDate);  // 유효하지 않은 날짜일 경우 출력
    }
    setOpen(false);
  };

  console.log("현재 선택된 날짜:", date);  // 날짜 상태값을 콘솔로 확인

  return (
    <View style={styles.container}>
      <Text style={styles.title}>구매 상담 일정 선택</Text>
      <Text>차량: {vehicle.vehicleName}</Text>  {/* vehicleName으로 변경 */}

      <TouchableOpacity onPress={() => setOpen(true)} style={styles.dateButton}>
        <Text>{formattedDate}</Text>  {/* 포맷팅된 날짜 표시 */}
      </TouchableOpacity>

      <DatePicker
        modal
        open={open}
        date={date}
        onConfirm={handleDateConfirm}  // 날짜 선택 시 handleDateConfirm 호출
        onCancel={() => setOpen(false)}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>상담 요청</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  dateButton: { padding: 10, backgroundColor: "#eee", marginTop: 10 },
  submitButton: { backgroundColor: "#28a745", padding: 12, marginTop: 20 },
  submitButtonText: { color: "#fff", fontSize: 16, textAlign: "center" },
});

export default ConsultationRequestScreen;
