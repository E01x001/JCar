import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from "react-native";
import firestore from "@react-native-firebase/firestore";
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatPhone } from '../utils/format';
import DateTimePicker from '@react-native-community/datetimepicker';

const AdminConsultationScreen = () => {
  const [pendingBuy, setPendingBuy] = useState([]);
  const [pendingSell, setPendingSell] = useState([]);
  const [approvedBuy, setApprovedBuy] = useState([]);
  const [approvedSell, setApprovedSell] = useState([]);
  const [rejectedBuy, setRejectedBuy] = useState([]);
  const [rejectedSell, setRejectedSell] = useState([]);
  const [showApproved, setShowApproved] = useState(false);
  const [showRejected, setShowRejected] = useState(false);

  const [editingItem, setEditingItem] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = firestore()
      .collection("consultation_requests")
      .orderBy('createdAt', 'desc')
      .onSnapshot((snapshot) => {
        const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setPendingBuy(all.filter(r => r.status === 'pending' && r.type !== 'sell'));
        setPendingSell(all.filter(r => r.status === 'pending' && r.type === 'sell'));

        setApprovedBuy(all.filter(r => r.status === 'approved' && r.type !== 'sell'));
        setApprovedSell(all.filter(r => r.status === 'approved' && r.type === 'sell'));

        setRejectedBuy(all.filter(r => r.status === 'rejected' && r.type !== 'sell'));
        setRejectedSell(all.filter(r => r.status === 'rejected' && r.type === 'sell'));
      });

    return () => unsubscribe();
  }, []);

  const handleNavigateToVehicleDetail = (vehicleId) => {
    navigation.navigate("AdminVehicleDetail", { vehicleId });
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const ref = firestore().collection("consultation_requests").doc(id);
      const doc = await ref.get();
      if (doc.exists) {
        await ref.update({ status: newStatus });
        Alert.alert("완료", `요청이 '${newStatus}'로 변경되었습니다.`);
      }
    } catch (error) {
      Alert.alert("오류", "상태 업데이트 중 문제가 발생했습니다.");
    }
  };

  const renderRequestItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => handleNavigateToVehicleDetail(item.vehicleId)}>
        <Text style={styles.text}>
          [{item.type === 'sell' ? '판매' : '구매'}] {item.userName}
        </Text>
        <Text style={styles.text}>전화번호: {formatPhone(item.userPhone)}</Text>
        <Text style={styles.text}>차량명: {item.vehicleName}</Text>
        <Text style={styles.text}>상담 일정: {item.preferredDate} {item.preferredTime}</Text>
        {renderStatus(item.status)}
      </TouchableOpacity>

      {item.status === 'pending' && (
        <>
          <View style={styles.statusButtons}>
            <TouchableOpacity onPress={() => handleStatusUpdate(item.id, 'approved')} style={styles.statusButtonGreen}>
              <Text style={styles.statusButtonText}>승인</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleStatusUpdate(item.id, 'rejected')} style={styles.statusButtonRed}>
              <Text style={styles.statusButtonText}>거절</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => {
            setEditingItem(item);
            setShowDatePicker(true);
          }}>
            <Text style={{ color: '#007bff', fontWeight: 'bold', marginTop: 6 }}>📅 일정 수정</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  const renderStatus = (status) => {
    let color = '#6c757d', icon = 'hourglass-empty';
    if (status === 'approved') { color = '#28a745'; icon = 'check-circle'; }
    else if (status === 'rejected') { color = '#dc3545'; icon = 'cancel'; }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <Icon name={icon} size={18} color={color} style={{ marginRight: 6 }} />
        <Text style={{ color, fontWeight: 'bold' }}>{status}</Text>
      </View>
    );
  };

  const handleTimeConfirm = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime && editingItem?.id) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`;

      firestore()
        .collection('consultation_requests')
        .doc(editingItem.id)
        .update({
          preferredDate: editingItem.preferredDate,
          preferredTime: formattedTime,
        })
        .then(() => {
          Alert.alert('성공', '일정이 수정되었습니다.');
          setEditingItem(null);
        })
        .catch((error) => {
          console.error(error);
          Alert.alert('오류', '일정 수정에 실패했습니다.');
        });
    }
  };

  const handleDateConfirm = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setShowTimePicker(true);
      setEditingItem(prev => ({
        ...prev,
        preferredDate: selectedDate.toISOString().split('T')[0],
      }));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <Text style={styles.title}>상담 요청 목록</Text>

        <Text style={styles.sectionTitle}>🟡 대기중 - 구매 상담</Text>
        <FlatList data={pendingBuy} keyExtractor={item => item.id} renderItem={renderRequestItem} contentContainerStyle={styles.flatListContent} />

        <Text style={styles.sectionTitle}>🟠 대기중 - 판매 상담</Text>
        <FlatList data={pendingSell} keyExtractor={item => item.id} renderItem={renderRequestItem} contentContainerStyle={styles.flatListContent} />

        <TouchableOpacity onPress={() => setShowApproved(!showApproved)} style={styles.toggleButton}>
          <Text style={styles.toggleButtonText}>{showApproved ? "✅ 승인 목록 숨기기" : "✅ 승인 목록 보기"}</Text>
        </TouchableOpacity>

        {showApproved && (
          <>
            <Text style={styles.sectionTitle}>구매 상담 승인</Text>
            <FlatList data={approvedBuy} keyExtractor={item => item.id} renderItem={renderRequestItem} contentContainerStyle={styles.flatListContent} />
            <Text style={styles.sectionTitle}>판매 상담 승인</Text>
            <FlatList data={approvedSell} keyExtractor={item => item.id} renderItem={renderRequestItem} contentContainerStyle={styles.flatListContent} />
          </>
        )}

        <TouchableOpacity onPress={() => setShowRejected(!showRejected)} style={styles.toggleButton}>
          <Text style={styles.toggleButtonText}>{showRejected ? "❌ 거절 목록 숨기기" : "❌ 거절 목록 보기"}</Text>
        </TouchableOpacity>

        {showRejected && (
          <>
            <Text style={styles.sectionTitle}>구매 상담 거절</Text>
            <FlatList data={rejectedBuy} keyExtractor={item => item.id} renderItem={renderRequestItem} contentContainerStyle={styles.flatListContent} />
            <Text style={styles.sectionTitle}>판매 상담 거절</Text>
            <FlatList data={rejectedSell} keyExtractor={item => item.id} renderItem={renderRequestItem} contentContainerStyle={styles.flatListContent} />
          </>
        )}

        <View style={styles.bottomSpacing} />

        {showDatePicker && (
          <DateTimePicker mode="date" value={new Date()} display="default" onChange={handleDateConfirm} />
        )}
        {showTimePicker && (
          <DateTimePicker mode="time" value={new Date()} display="spinner" minuteInterval={10} onChange={handleTimeConfirm} />
        )}
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
