import React, { useState, useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import DatePicker from "react-native-date-picker";
import { useRoute, useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext"; // 사용자 정보 가져오기
import { saveConsultationRequest } from "../services/firebaseService";

const ConsultationRequestScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { vehicle } = route.params;
  const { user } = useContext(AuthContext);
  
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("로그인이 필요합니다.");
      return;
    }

    const consultationData = {
      userId: user.uid,
      userName: user.displayName || "익명",
      userPhone: user.phoneNumber || "미등록",
      vehicleId: vehicle.id,
      vehicleModel: vehicle.model,
      consultationDate: date.toISOString(),
      status: "pending",
    };

    await saveConsultationRequest(consultationData);
    Alert.alert("구매 상담 요청이 완료되었습니다.");
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>구매 상담 일정 선택</Text>
      <Text>차량: {vehicle.model}</Text>

      <TouchableOpacity onPress={() => setOpen(true)} style={styles.dateButton}>
        <Text>{date.toLocaleString()}</Text>
      </TouchableOpacity>

      <DatePicker
        modal
        open={open}
        date={date}
        onConfirm={(newDate) => {
          setOpen(false);
          setDate(newDate);
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
  dateButton: { padding: 10, backgroundColor: "#eee", marginTop: 10 },
  submitButton: { backgroundColor: "#28a745", padding: 12, marginTop: 20 },
  submitButtonText: { color: "#fff", fontSize: 16, textAlign: "center" },
});

export default ConsultationRequestScreen;
