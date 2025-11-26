import React, { useState, useContext, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Calendar } from "react-native-calendars";
import DatePicker from "react-native-date-picker";
import { AuthContext } from "../context/AuthContext";
import firestore, { collection, query, where, getDocs } from "@react-native-firebase/firestore";
import { useNavigation } from '@react-navigation/native';
import { saveConsultationRequest } from '../services/firebaseService';

const ConsultationRequestScreen = ({ route }) => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState("");
  const [time, setTime] = useState(new Date());
  const [open, setOpen] = useState(false);
  const { vehicle, isSell } = route.params;

  const adjustToNearestTenMinutes = (date) => {
    const minutes = date.getMinutes();
    const remainder = minutes % 10;
    if (remainder !== 0) {
      date.setMinutes(minutes + (10 - remainder), 0, 0);
    }
    return date;
  };

  const checkDuplicateConsultation = async (userId, vehicleId) => {
    const q = query(
      collection(firestore(), 'consultation_requests'),
      where('userId', '==', userId),
      where('vehicleId', '==', vehicleId)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

  const checkTimeConflict = async (vehicleId, date, time) => {
    const q = query(
      collection(firestore(), 'consultation_requests'),
      where('vehicleId', '==', vehicleId),
      where('preferredDate', '==', date),
      where('preferredTime', '==', time)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  };

    const handleSubmit = async () => {
    console.log("🟡 상담 요청 버튼 클릭됨");

    if (!user) {
      console.warn("⛔ 사용자 정보 없음");
      Alert.alert("로그인이 필요합니다.");
      return;
    }

    if (!selectedDate) {
      console.warn("⛔ 날짜 미선택");
      Alert.alert("날짜를 선택해주세요.");
      return;
    }

    if (!time) {
      console.warn("⛔ 시간 미선택");
      Alert.alert("시간을 선택해주세요.");
      return;
    }

    const formattedDate = selectedDate;
    const formattedTime = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;
    console.log("📅 선택된 날짜:", formattedDate);
    console.log("⏰ 선택된 시간:", formattedTime);

    const isDuplicate = await checkDuplicateConsultation(user.uid, vehicle.vehicleId);
    console.log("🔁 중복 상담 여부:", isDuplicate);

    if (isDuplicate) {
      Alert.alert("중복 요청", "이미 이 차량에 대한 상담을 신청하셨습니다.");
      return;
    }

    const hasConflict = await checkTimeConflict(vehicle.vehicleId, formattedDate, formattedTime);
    console.log("⏳ 시간 중복 여부:", hasConflict);

    if (hasConflict) {
      Alert.alert("이미 선택된 시간입니다.", "다른 시간을 선택해주세요.");
      return;
    }

    const consultationData = {
      userId: user.uid,
      userName: user.displayName || "익명",
      userPhone: user.phoneNumber || "미등록",
      vehicleId: vehicle.vehicleId,
      vehicleName: vehicle.vehicleName,
      preferredDate: formattedDate,
      preferredTime: formattedTime,
      status: "pending",
      type: isSell ? "sell" : "buy",
    };

    console.log("🚀 저장할 상담 요청 데이터:", consultationData);

    const success = await saveConsultationRequest(consultationData);
    console.log("✅ 저장 성공 여부:", success);

    if (success) {
      Alert.alert("상담 요청 완료", "정상적으로 접수되었습니다.", [
        {
          text: "확인",
          onPress: () => navigation.goBack(),
        },
      ]);
    } else {
      Alert.alert("상담 요청 저장에 실패했습니다. 다시 시도해주세요.");
    }
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>구매 상담 일정 선택</Text>

      <Calendar
        onDayPress={(day) => {
          setSelectedDate(day.dateString);
        }}
        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: "#28a745",
            selectedTextColor: "#fff",
          },
        }}
      />

      <Text style={styles.selectedText}>
        {selectedDate ? `선택된 날짜: ${selectedDate}` : "날짜를 선택하세요"}
      </Text>

      <TouchableOpacity onPress={() => setOpen(true)} style={styles.dateButton}>
        <Text>{`${time.getHours()}시 ${time.getMinutes()}분`}</Text>
      </TouchableOpacity>

      <DatePicker
        modal
        open={open}
        date={time}
        mode="time"
        minuteInterval={10}
        onConfirm={(newTime) => {
          const adjustedTime = adjustToNearestTenMinutes(newTime);
          setTime(adjustedTime);
          setOpen(false);
        }}
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
  selectedText: { fontSize: 16, marginVertical: 10 },
  dateButton: { padding: 10, backgroundColor: "#eee", marginTop: 10, alignItems: "center" },
  submitButton: { backgroundColor: "#28a745", padding: 12, marginTop: 20 },
  submitButtonText: { color: "#fff", fontSize: 16, textAlign: "center" },
});

export default ConsultationRequestScreen;
