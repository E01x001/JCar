import React, { useState, useContext, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Calendar } from "react-native-calendars";
import DatePicker from "react-native-date-picker";
import { AuthContext } from "../context/AuthContext";
import firestore from "@react-native-firebase/firestore";
import { useNavigation } from '@react-navigation/native';
import { saveConsultationRequest } from '../services/firebaseService';

const ConsultationRequestScreen = ({ route }) => {
  const { user } = useContext(AuthContext);
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState("");
  const [time, setTime] = useState(new Date());
  const [open, setOpen] = useState(false);
  const { vehicle } = route.params;

  const adjustToNearestTenMinutes = (date) => {
    const minutes = date.getMinutes();
    const remainder = minutes % 10;
    if (remainder !== 0) {
      date.setMinutes(minutes + (10 - remainder), 0, 0);
    }
    return date;
  };

  const checkDuplicateConsultation = async (userId, vehicleId) => {
    const snapshot = await firestore()
      .collection('consultation_requests')
      .where('user_id', '==', userId)
      .where('vehicleId', '==', vehicleId)
      .get();

    return !snapshot.empty;
  };

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

    const formattedDate = selectedDate;
    const formattedTime = `${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`;

    const isDuplicate = await checkDuplicateConsultation(user.uid, vehicle.vehicleId);
    if (isDuplicate) {
      Alert.alert("중복 요청", "이미 이 차량에 대한 상담을 신청하셨습니다.");
      return;
    }

    const consultationData = {
      user_id: user.uid,
      user_name: user.displayName || "익명",
      user_phone: user.phoneNumber || "미등록",
      vehicleId: vehicle.vehicleId,
      vehicleName: vehicle.vehicleName,
      preferred_date: formattedDate,
      preferred_time: formattedTime,
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