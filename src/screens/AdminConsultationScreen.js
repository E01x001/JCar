import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import firestore from "@react-native-firebase/firestore";
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatPhone } from '../utils/format';
import { sendPushNotification } from '../services/pushNotificationService';

const AdminConsultationScreen = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [showApproved, setShowApproved] = useState(false);
  const [showRejected, setShowRejected] = useState(false);

  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = firestore()
      .collection("consultation_requests")
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const allRequests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setPendingRequests(allRequests.filter(r => r.status === 'pending'));
        setApprovedRequests(allRequests.filter(r => r.status === 'approved'));
        setRejectedRequests(allRequests.filter(r => r.status === 'rejected'));
      });

    return () => unsubscribe();
  }, []);

  const handleNavigateToVehicleDetail = (vehicleId) => {
    navigation.navigate("AdminVehicleDetail", { vehicleId });
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const docRef = firestore().collection("consultation_requests").doc(id);
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();
        await docRef.update({ status: newStatus });

        // ✅ 푸시 알림 전송
        if (data.fcmToken) {
          const title = '상담 상태 변경 알림';
          const body = `상담 요청이 '${newStatus}' 상태로 변경되었습니다.`;
          await sendPushNotification(data.fcmToken, title, body);
        }

        Alert.alert("상태 업데이트 완료", `요청이 '${newStatus}' 상태로 변경되었습니다.`);
      }
    } catch (error) {
      Alert.alert("오류", "상태 업데이트 중 문제가 발생했습니다.");
      console.error("상담 상태 업데이트 오류:", error);
    }
  };

  const renderRequestItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => handleNavigateToVehicleDetail(item.vehicleId)}>
        <Text style={styles.text}>이름: {item.userName}</Text>
        <Text style={styles.text}>전화번호: {formatPhone(item.userPhone)}</Text>
        <Text style={styles.text}>차량명: {item.vehicleName}</Text>
        <Text style={styles.text}>상담 일정: {item.preferredDate} {item.preferredTime}</Text>
        {renderStatus(item.status)}
      </TouchableOpacity>

      {item.status === 'pending' && (
        <View style={styles.statusButtons}>
          <TouchableOpacity onPress={() => handleStatusUpdate(item.id, 'approved')} style={styles.statusButtonGreen}>
            <Text style={styles.statusButtonText}>승인</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleStatusUpdate(item.id, 'rejected')} style={styles.statusButtonRed}>
            <Text style={styles.statusButtonText}>거절</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

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

        {/* 대기중 상담 요청 */}
        <Text style={styles.sectionTitle}>대기중 상담 요청</Text>
        <FlatList
          data={pendingRequests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequestItem}
          contentContainerStyle={styles.flatListContent}
        />

        {/* 승인 목록 펼치기/접기 버튼 */}
        <TouchableOpacity onPress={() => setShowApproved(!showApproved)} style={styles.toggleButton}>
          <Text style={styles.toggleButtonText}>
            {showApproved ? "승인 목록 숨기기" : "승인 목록 보기"}
          </Text>
        </TouchableOpacity>

        {showApproved && (
          <FlatList
            data={approvedRequests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestItem}
            contentContainerStyle={styles.flatListContent}
          />
        )}

        {/* 거절 목록 펼치기/접기 버튼 */}
        <TouchableOpacity onPress={() => setShowRejected(!showRejected)} style={styles.toggleButton}>
          <Text style={styles.toggleButtonText}>
            {showRejected ? "거절 목록 숨기기" : "거절 목록 보기"}
          </Text>
        </TouchableOpacity>

        {showRejected && (
          <FlatList
            data={rejectedRequests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestItem}
            contentContainerStyle={styles.flatListContent}
          />
        )}

        <View style={styles.bottomSpacing}></View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginVertical: 10 },
  card: { padding: 10, borderBottomWidth: 1, borderColor: "#ddd", marginBottom: 10, backgroundColor: "#f9f9f9", borderRadius: 8 },
  text: { fontSize: 16, marginBottom: 5, color: "#333" },
  flatListContent: { paddingBottom: 20 },
  bottomSpacing: { height: 20 },
  statusButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, gap: 10 },
  statusButtonGreen: { backgroundColor: '#28a745', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  statusButtonRed: { backgroundColor: '#dc3545', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  statusButtonText: { color: '#fff', fontWeight: 'bold' },
  toggleButton: {
    padding: 10,
    backgroundColor: "#eee",
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2B4593",
  },
});

export default AdminConsultationScreen;
