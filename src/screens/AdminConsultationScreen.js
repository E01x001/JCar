import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import firestore from "@react-native-firebase/firestore";
import { useNavigation } from '@react-navigation/native';

const AdminConsultationScreen = () => {
  const [requests, setRequests] = useState([]);
  const navigation = useNavigation(); // 네비게이션을 사용하여 화면 전환하기

  useEffect(() => {
    const unsubscribe = firestore()
      .collection("consultation_requests") // 상담 요청 컬렉션
      .onSnapshot((snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRequests(data);
      });

    return () => unsubscribe(); // 컴포넌트가 unmount될 때 리스너 해제
  }, []);

  const handleNavigateToVehicleDetail = (vehicleId) => {
    // 차량 상세 화면으로 네비게이션
    navigation.navigate("AdminVehicleDetail", { vehicleId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Text style={styles.title}>구매 상담 요청 목록</Text>

        {/* 상담 요청 목록을 FlatList로 렌더링 */}
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleNavigateToVehicleDetail(item.vehicleId)} style={styles.card}>
              <Text style={styles.text}>이름: {item.user_name}</Text>
              <Text style={styles.text}>전화번호: {formatPhone(item.userPhone)}</Text>
              <Text style={styles.text}>차량명: {item.vehicleName}</Text>
              <Text style={styles.text}>
                상담 일정: {item.preferred_date} {item.preferred_time}
              </Text>
              <Text style={styles.text}>상태: {item.status}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.flatListContent}
        />
        <View style={styles.bottomSpacing}></View> {/* 하단 공백 추가 */}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  card: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
    marginBottom: 5,
    color: "#333",
  },
  flatListContent: {
    paddingBottom: 20, // FlatList에 여유 공간 추가
  },
  bottomSpacing: {
    height: 20, // 하단 공백
  },
});

export default AdminConsultationScreen;
