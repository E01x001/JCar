import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Calendar } from "react-native-calendars";
import DatePicker from "react-native-date-picker";
import { AuthContext } from "../context/AuthContext"; // 사용자 정보 가져오기
import firestore from "@react-native-firebase/firestore"; // Firestore 불러오기
import { useNavigation } from '@react-navigation/native'; // navigation을 useNavigation 훅으로 가져오기

const ConsultationRequestScreen = () => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();  // navigation 훅을 사용하여 navigation 객체 가져오기
  const [selectedDate, setSelectedDate] = useState(""); // 선택된 날짜
  const [time, setTime] = useState(new Date()); // 선택된 시간
  const [open, setOpen] = useState(false); // 시간 선택 모달 상태

  // 10분 단위로 시간을 맞추는 함수
  const adjustToNearestTenMinutes = (date) => {
    const minutes = date.getMinutes();
    const remainder = minutes % 10;
    if (remainder !== 0) {
      date.setMinutes(minutes + (10 - remainder), 0, 0);
    }
    return date;
  };

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
  
    if (!selectedDate) {
      Alert.alert("날짜를 선택해주세요.");
      return;
    }
  
    if (!time) {
      Alert.alert("시간을 선택해주세요.");
      return;
    }
  
    // 날짜와 시간 분리
    const formattedDate = selectedDate; // YYYY-MM-DD 형식 그대로 저장
    const formattedTime = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`; // HH:mm 형식
  
    const consultationData = {
      user_id: user.uid,
      user_name: user.displayName || "익명",
      user_phone: user.phoneNumber || "미등록",
      vehicle_id: "알 수 없음", 
      vehicle_name: "알 수 없음",
      preferred_date: formattedDate, // 날짜 저장 (YYYY-MM-DD)
      preferred_time: formattedTime, // 시간 저장 (HH:mm)
      status: "pending",
    };
  
    const success = await saveConsultationRequest(consultationData);
  
    if (success) {
      Alert.alert("구매 상담 요청이 완료되었습니다.");
      navigation.goBack(); // 정상적으로 돌아가게 됨
    } else {
      Alert.alert("상담 요청 저장에 실패했습니다. 다시 시도해주세요.");
    }
  };
  

  return (
    <View style={styles.container}>
      <Text style={styles.title}>구매 상담 일정 선택</Text>

      {/* 날짜 선택 (달력) */}
      <Calendar
        onDayPress={(day) => {
          setSelectedDate(day.dateString); // YYYY-MM-DD 형식
        }}
        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: "#28a745",
            selectedTextColor: "#fff",
          },
        }}
      />

      {/* 선택된 날짜 표시 */}
      <Text style={styles.selectedText}>
        {selectedDate ? `선택된 날짜: ${selectedDate}` : "날짜를 선택하세요"}
      </Text>

      {/* 시간 선택 버튼 */}
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.dateButton}>
        <Text>{`${time.getHours()}시 ${time.getMinutes()}분`}</Text>
      </TouchableOpacity>

      {/* 시간 선택 모달 */}
      <DatePicker
        modal
        open={open}
        date={time}
        mode="time" // 시간만 선택
        minuteInterval={10} // 10분 단위 선택
        onConfirm={(newTime) => {
          const adjustedTime = adjustToNearestTenMinutes(newTime);
          setTime(adjustedTime);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />

      {/* 상담 요청 버튼 */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>상담 요청</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  selectedText: { fontSize: 16, marginVertical: 10 },
  dateButton: { padding: 10, backgroundColor: "#eee", marginTop: 10, alignItems: "center" },
  submitButton: { backgroundColor: "#28a745", padding: 12, marginTop: 20 },
  submitButtonText: { color: "#fff", fontSize: 16, textAlign: "center" },
});

export default ConsultationRequestScreen;
