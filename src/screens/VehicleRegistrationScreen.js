import React, { useState } from "react";
import { View, Text, TextInput, Button, Image, Alert, ScrollView, ActivityIndicator } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { launchImageLibrary } from "react-native-image-picker";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import auth from "@react-native-firebase/auth";

const VehicleRegistrationScreen = () => {
  const [vehicleName, setVehicleName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [year, setYear] = useState("");
  const [mileage, setMileage] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  // 이미지 선택
  const selectImage = () => {
    launchImageLibrary({ mediaType: "photo" }, (response) => {
      if (response.assets && response.assets.length > 0) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  // Firebase에 차량 데이터 저장
  const handleRegister = async () => {
    if (!vehicleName || !manufacturer || !year || !mileage || !fuelType || !transmission || !price || !location || !imageUri) {
      Alert.alert("오류", "모든 필드를 입력하세요.");
      return;
    }

    setLoading(true);

    try {
      const user = auth().currentUser; // 현재 로그인한 사용자 정보 가져오기
      if (!user) {
        Alert.alert("오류", "로그인이 필요합니다.");
        setLoading(false);
        return;
      }

      // Firebase Storage에 이미지 업로드
      const imageRef = storage().ref(`vehicles/${Date.now()}.jpg`);
      await imageRef.putFile(imageUri);
      const imageUrl = await imageRef.getDownloadURL();

      // Firestore에 차량 데이터 저장
      const vehicleRef = await firestore().collection("vehicles").add({
        vehicleName,
        manufacturer,
        year,
        mileage: parseInt(mileage),
        fuelType,
        transmission,
        price: parseInt(price),
        location,
        description,
        imageUrl,
        createdAt: firestore.FieldValue.serverTimestamp(),
        sellerId: user.uid, // 판매자 ID
        sellerName: user.displayName || "Unknown", // 판매자 이름 (회원가입 시 저장된 값)
        sellerPhone: user.phoneNumber || "Unknown", // 판매자 전화번호
      });

      setLoading(false);
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
      setImageUri(null);

    } catch (error) {
      console.error("차량 등록 오류:", error);
      setLoading(false);
      Alert.alert("오류", "차량 등록 중 문제가 발생했습니다.");
    }
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text>차량명</Text>
      <TextInput value={vehicleName} onChangeText={setVehicleName} style={styles.input} />

      <Text>제조사</Text>
      <Picker selectedValue={manufacturer} onValueChange={(itemValue) => setManufacturer(itemValue)}>
        <Picker.Item label="제조사를 선택하세요" value="" />
        <Picker.Item label="현대" value="Hyundai" />
        <Picker.Item label="기아" value="Kia" />
        <Picker.Item label="BMW" value="BMW" />
      </Picker>

      <Text>연식</Text>
      <Picker selectedValue={year} onValueChange={(itemValue) => setYear(itemValue)}>
        <Picker.Item label="연식을 선택하세요" value="" />
        <Picker.Item label="2024" value="2024" />
        <Picker.Item label="2023" value="2023" />
        <Picker.Item label="2022" value="2022" />
      </Picker>

      <Text>주행거리 (km)</Text>
      <TextInput value={mileage} onChangeText={setMileage} keyboardType="numeric" style={styles.input} />

      <Text>연료 종류</Text>
      <Picker selectedValue={fuelType} onValueChange={(itemValue) => setFuelType(itemValue)}>
        <Picker.Item label="연료를 선택하세요" value="" />
        <Picker.Item label="휘발유" value="Gasoline" />
        <Picker.Item label="경유" value="Diesel" />
        <Picker.Item label="전기" value="Electric" />
      </Picker>

      <Text>변속기</Text>
      <Picker selectedValue={transmission} onValueChange={(itemValue) => setTransmission(itemValue)}>
        <Picker.Item label="변속기를 선택하세요" value="" />
        <Picker.Item label="자동" value="Automatic" />
        <Picker.Item label="수동" value="Manual" />
      </Picker>

      <Text>가격 (만원)</Text>
      <TextInput value={price} onChangeText={setPrice} keyboardType="numeric" style={styles.input} />

      <Text>차량 위치</Text>
      <TextInput value={location} onChangeText={setLocation} style={styles.input} />

      <Button title="이미지 선택" onPress={selectImage} />
      {imageUri && <Image source={{ uri: imageUri }} style={{ width: 100, height: 100, marginTop: 10 }} />}

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
