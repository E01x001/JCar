import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import firestore from "@react-native-firebase/firestore";

const AdminConsultationScreen = () => {
  const [requests, setRequests] = useState([]);

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>구매 상담 요청 목록</Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.userName} - {item.vehicleModel}</Text>
            <Text>상담 일정: {new Date(item.consultationDate).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  card: { padding: 10, borderBottomWidth: 1, borderColor: "#ddd" },
});

export default AdminConsultationScreen;
