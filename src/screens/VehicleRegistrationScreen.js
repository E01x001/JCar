import React, { useState, useContext } from "react";
import { View, Text, TextInput, Button, Alert, ScrollView, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import firestore from "@react-native-firebase/firestore";
import { AuthContext } from "../context/AuthContext";

const VehicleRegistrationScreen = () => {
  const { user, sellerName, sellerPhone } = useContext(AuthContext);

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
      await firestore().collection("vehicles").add({
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
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ color: "black" }}>차량명</Text>
      <TextInput value={vehicleName} onChangeText={setVehicleName} style={styles.input} />

      <Text style={{ color: "black" }}>제조사</Text>
      <Picker selectedValue={manufacturer} onValueChange={(itemValue) => setManufacturer(itemValue)}>
        <Picker.Item label="제조사를 선택하세요" value="" />
        <Picker.Item label="현대" value="Hyundai" />
        <Picker.Item label="기아" value="Kia" />
        <Picker.Item label="BMW" value="BMW" />
      </Picker>

      <Text style={{ color: "black" }}>연식</Text>
      <Picker selectedValue={year} onValueChange={(itemValue) => setYear(itemValue)}>
        <Picker.Item label="연식을 선택하세요" value="" />
        <Picker.Item label="2024" value="2024" />
        <Picker.Item label="2023" value="2023" />
        <Picker.Item label="2022" value="2022" />
      </Picker>

      <Text style={{ color: "black" }}>주행거리 (km)</Text>
      <TextInput value={mileage} onChangeText={setMileage} keyboardType="numeric" style={styles.input} />

      <Text style={{ color: "black" }}>연료 종류</Text>
      <Picker selectedValue={fuelType} onValueChange={(itemValue) => setFuelType(itemValue)}>
        <Picker.Item label="연료를 선택하세요" value="" />
        <Picker.Item label="휘발유" value="Gasoline" />
        <Picker.Item label="경유" value="Diesel" />
        <Picker.Item label="전기" value="Electric" />
      </Picker>

      <Text style={{ color: "black" }}>변속기</Text>
      <Picker selectedValue={transmission} onValueChange={(itemValue) => setTransmission(itemValue)}>
        <Picker.Item label="변속기를 선택하세요" value="" />
        <Picker.Item label="자동" value="Automatic" />
        <Picker.Item label="수동" value="Manual" />
      </Picker>

      <Text style={{ color: "black" }}>가격 (만원)</Text>
      <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" style={styles.input} />

      <Text style={{ color: "black" }}>차량 위치</Text>
      <TextInput value={location} onChangeText={setLocation} style={styles.input} />

      <Button title="차량 등록" onPress={handleRegister} disabled={loading} />
      {loading && <ActivityIndicator size="large" color="#0000ff" />}
    </ScrollView>
  );
};

const styles = {
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
};

export default VehicleRegistrationScreen;
