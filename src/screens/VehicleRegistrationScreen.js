import React, { useState, useContext } from "react";
import { View, Text, TextInput, Button, Alert, ScrollView, ActivityIndicator, StyleSheet, SafeAreaView } from "react-native";
import { Picker } from "@react-native-picker/picker";
import firestore from "@react-native-firebase/firestore";
import { AuthContext } from "../context/AuthContext";

const VehicleRegistrationScreen = () => {
  const { user, sellerName, sellerPhone, sellerEmail } = useContext(AuthContext);

  const [vehicleName, setVehicleName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  // 차량 등록 처리
  const handleRegister = async () => {
    if (!user) {
      Alert.alert("로그인 필요", "로그인이 필요합니다.");
      return;
    }

    if (!vehicleName || !manufacturer || !year || !mileage || !fuelType || !transmission || !price || !location) {
      Alert.alert("입력 오류", "모든 필드를 입력하세요.");
      return;
    }

    setLoading(true);

    try {
      // Firestore에 차량 등록
      const docRef = await firestore().collection("vehicles").add({
        vehicleName,
        manufacturer,
        year,
        mileage: isNaN(parseInt(mileage)) ? 0 : parseInt(mileage),
        fuelType,
        transmission,
        price: isNaN(parseInt(price)) ? 0 : parseInt(price),
        location,
        description,
        createdAt: firestore.FieldValue.serverTimestamp(),
        sellerId: user.uid,
        sellerName: sellerName || "Unknown",
        sellerPhone: sellerPhone || "Unknown",
        sellerEmail: sellerEmail || "Unknown",
      });

      // 등록된 문서의 ID를 가져와 필드에 추가
      await docRef.update({
        vehicleId: docRef.id,  // 문서 ID를 vehicleId 필드로 추가
      });

      Alert.alert("성공", "차량이 등록되었습니다.");

      // 입력 필드 초기화
      setVehicleName("");
      setManufacturer("");
      setYear("");
      setMileage("");
      setFuelType("");
      setTransmission("");
      setPrice("");
      setLocation("");
      setDescription("");
    } catch (error) {
      console.error("차량 등록 오류:", error);
      Alert.alert("오류", error.message || "차량 등록 중 문제가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.label}>차량명</Text>
        <TextInput value={vehicleName} onChangeText={setVehicleName} style={styles.input} />

        <Text style={styles.label}>제조사</Text>
        <Picker selectedValue={manufacturer} onValueChange={(itemValue) => setManufacturer(itemValue)} style={styles.picker}>
          <Picker.Item label="제조사를 선택하세요" value="" />
          <Picker.Item label="현대" value="Hyundai" />
          <Picker.Item label="기아" value="Kia" />
          <Picker.Item label="BMW" value="BMW" />
        </Picker>

        <Text style={styles.label}>연식</Text>
        <Picker selectedValue={year} onValueChange={(itemValue) => setYear(itemValue)} style={styles.picker}>
          <Picker.Item label="연식을 선택하세요" value="" />
          <Picker.Item label="2024" value="2024" />
          <Picker.Item label="2023" value="2023" />
          <Picker.Item label="2022" value="2022" />
        </Picker>

        <Text style={styles.label}>주행거리 (km)</Text>
        <TextInput value={mileage} onChangeText={setMileage} keyboardType="numeric" style={styles.input} />

        <Text style={styles.label}>연료 종류</Text>
        <Picker selectedValue={fuelType} onValueChange={(itemValue) => setFuelType(itemValue)} style={styles.picker}>
          <Picker.Item label="연료를 선택하세요" value="" />
          <Picker.Item label="휘발유" value="Gasoline" />
          <Picker.Item label="경유" value="Diesel" />
          <Picker.Item label="전기" value="Electric" />
        </Picker>

        <Text style={styles.label}>변속기</Text>
        <Picker selectedValue={transmission} onValueChange={(itemValue) => setTransmission(itemValue)} style={styles.picker}>
          <Picker.Item label="변속기를 선택하세요" value="" />
          <Picker.Item label="자동" value="Automatic" />
          <Picker.Item label="수동" value="Manual" />
        </Picker>

        <Text style={styles.label}>가격 (만원)</Text>
        <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" style={styles.input} />

        <Text style={styles.label}>차량 위치</Text>
        <TextInput value={location} onChangeText={setLocation} style={styles.input} />

        <Text style={styles.label}>차량 설명</Text>
        <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.textArea]} multiline />

        <View style={styles.buttonContainer}>
          <Button title="차량 등록" onPress={handleRegister} disabled={loading} color="#2B4593" />
          {loading && <ActivityIndicator size="large" color="#2B4593" />}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 30, // SafeAreaView 여백 확보를 위해 아래쪽 여백 추가
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000", // 모든 텍스트 색상 검정으로 변경
    marginBottom: 5, // 레이블과 입력창 간의 여백을 조정
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12, // 입력칸 패딩을 통일
    marginBottom: 15,
    borderRadius: 8, // 둥근 모서리 적용
    backgroundColor: "#fff",
    fontSize: 16, // 텍스트 크기를 통일
  },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8, // 둥근 모서리 적용
    marginBottom: 15,
    backgroundColor: "#fff",
    fontSize: 16, // 텍스트 크기를 통일
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  buttonContainer: {
    marginTop: 20,
    alignItems: "center",
  },
});

export default VehicleRegistrationScreen;
