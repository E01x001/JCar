import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import firestore from "@react-native-firebase/firestore";
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatPhone } from '../utils/format';

const AdminConsultationScreen = () => {
  const [requests, setRequests] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = firestore()
      .collection("consultation_requests")
      .onSnapshot((snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRequests(data);
      });

    return () => unsubscribe();
  }, []);

  const handleNavigateToVehicleDetail = (vehicleId) => {
    navigation.navigate("AdminVehicleDetail", { vehicleId });
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await firestore().collection("consultation_requests").doc(id).update({ status: newStatus });
      Alert.alert("상태 업데이트 완료", `요청이 '${newStatus}' 상태로 변경되었습니다.`);
    } catch (error) {
      Alert.alert("오류", "상태 업데이트 중 문제가 발생했습니다.");
      console.error("상담 상태 업데이트 오류:", error);
    }
  };

  const renderStatus = (status) => {
    let color = '#6c757d';
    let icon = 'hourglass-empty';
    if (status === 'approved') {
      color = '#28a745';
      icon = 'check-circle';
    } else if (status === 'rejected') {
      color = '#dc3545';
      icon = 'cancel';
    }
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Icon name={icon} size={18} color={color} style={{ marginRight: 6 }} />
        <Text style={{ color, fontWeight: 'bold' }}>{status}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Text style={styles.title}>구매 상담 요청 목록</Text>

        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <TouchableOpacity onPress={() => handleNavigateToVehicleDetail(item.vehicleId)}>
                <Text style={styles.text}>이름: {item.user_name}</Text>
                <Text style={styles.text}>전화번호: {formatPhone(item.user_phone)}</Text>
                <Text style={styles.text}>차량명: {item.vehicleName}</Text>
                <Text style={styles.text}>상담 일정: {item.preferred_date} {item.preferred_time}</Text>
                {renderStatus(item.status)}
              </TouchableOpacity>
              <View style={styles.statusButtons}>
                <TouchableOpacity onPress={() => handleStatusUpdate(item.id, 'approved')} style={styles.statusButtonGreen}>
                  <Text style={styles.statusButtonText}>승인</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleStatusUpdate(item.id, 'rejected')} style={styles.statusButtonRed}>
                  <Text style={styles.statusButtonText}>거절</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.flatListContent}
        />
        <View style={styles.bottomSpacing}></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  card: { padding: 10, borderBottomWidth: 1, borderColor: "#ddd", marginBottom: 10, backgroundColor: "#f9f9f9", borderRadius: 8 },
  text: { fontSize: 16, marginBottom: 5, color: "#333" },
  flatListContent: { paddingBottom: 20 },
  bottomSpacing: { height: 20 },
  statusButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 10 },
  statusButtonGreen: { backgroundColor: '#28a745', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  statusButtonRed: { backgroundColor: '#dc3545', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  statusButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default AdminConsultationScreen;