import React, { useState, useContext } from "react";
import { View, Text, TextInput, Button, Alert, ScrollView, ActivityIndicator, StyleSheet, SafeAreaView, Image, TouchableOpacity } from "react-native";
import { Picker } from '@react-native-picker/picker';
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";
import { launchImageLibrary } from "react-native-image-picker";
import { AuthContext } from "../context/AuthContext";

const VehicleRegistrationScreen = () => {
  const { user, sellerName, sellerPhone, sellerEmail } = useContext(AuthContext);

  const [regiNumber, setRegiNumber] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [vehicleType, setVehicleType] = useState(""); // ✅ 초기값 "" (선택 안 한 상태)
  const [loading, setLoading] = useState(false);
  const [vehicleData, setVehicleData] = useState(null);
  const [imageUri, setImageUri] = useState(null);

  const isValidRegiNumber = (number) => {
    const regex = /^([가-힣]{0,2})?(\d{2,3})([가-힣A-Z외임])\s?(\d{3,4})$/;
    return regex.test(number);
  };

  const formatRegiNumber = (input) => {
    const cleanInput = input.replace(/\s+/g, "");
    const regex = /^([가-힣]{0,2})?(\d{2,3})([가-힣A-Z외임])(\d{3,4})$/;
    const match = cleanInput.match(regex);

    if (match) {
      const region = match[1] || "";
      const firstNumbers = match[2];
      const letter = match[3];
      const lastNumbers = match[4];
      return `${region}${firstNumbers}${letter} ${lastNumbers}`;
    }
    return input;
  };

  const handleImageSelect = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo' });
    if (!result.didCancel && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const fetchVehicleInfo = async () => {
    if (!regiNumber || !ownerName) {
      Alert.alert("입력 오류", "차량번호와 소유자명을 입력하세요.");
      return;
    }

    if (!isValidRegiNumber(regiNumber)) {
      Alert.alert("입력 오류", "올바른 차량번호 형식이 아닙니다. 예: 서울12가 3456");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://datahub-dev.scraping.co.kr/assist/common/carzen/CarAllInfoInquiry", {
        method: "POST",
        headers: {
          "Authorization": "7c112786a95c41dd9d3f24895f47e6cbc62c6b48",
          "Content-Type": "application/json;charset=UTF-8",
        },
        body: JSON.stringify({ REGINUMBER: regiNumber, OWNERNAME: ownerName }),
      });

      const jsonResponse = await response.json();
      console.log("API 응답:", jsonResponse);

      if (jsonResponse.errCode !== "0000" || jsonResponse.result !== "SUCCESS" || jsonResponse.data.STATUS !== "200") {
        Alert.alert("조회 실패", jsonResponse.errMsg || "차량 정보를 찾을 수 없습니다.");
        return;
      }

      setVehicleData(jsonResponse.data);

    } catch (error) {
      console.error("API 요청 실패:", error);
      Alert.alert("오류", "차량 정보를 조회하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const saveVehicleData = async () => {
    if (!vehicleData) {
      Alert.alert("오류", "조회된 차량 정보가 없습니다.");
      return;
    }
  
    const validVehicleTypes = ["승용차", "택시", "렌터카", "화물차", "군용차", "외교차"];
  
    if (!validVehicleTypes.includes(vehicleType)) {
      Alert.alert("입력 오류", "차량 종류를 정확히 선택해주세요.");
      return;
    }
  
    try {
      const currentUser = auth().currentUser;
      let uploadedImageUrl = `https://www.cartory.net/cars/${vehicleData.CARURL}`;
  
      if (imageUri) {
        const filename = imageUri.substring(imageUri.lastIndexOf('/') + 1);
        const reference = storage().ref(`/vehicles/${filename}`);
        await reference.putFile(imageUri);
        uploadedImageUrl = await reference.getDownloadURL();
      }
  
      const docRef = await firestore().collection("vehicles").add({
        vehicleName: vehicleData.CARNAME,
        subModel: vehicleData.SUBMODEL,
        manufacturer: vehicleData.CARVENDER,
        year: vehicleData.CARYEAR,
        driveType: vehicleData.DRIVE,
        fuelType: vehicleData.FUEL,
        price: vehicleData.PRICE,
        cc: vehicleData.CC,
        transmission: vehicleData.MISSION,
        imageUrl: uploadedImageUrl,
        vin: vehicleData.VIN,
        frontTire: vehicleData.FRONTTIRE,
        rearTire: vehicleData.REARTIRE,
        engineOilLiter: vehicleData.EOILLITER,
        wiperInfo: vehicleData.WIPER,
        seats: vehicleData.SEATS,
        battery: Array.isArray(vehicleData.BATTERYLIST) && vehicleData.BATTERYLIST.length > 0 ? vehicleData.BATTERYLIST[0].MODEL : "Unknown",
        fuelEco: vehicleData.FUELECO,
        fuelTank: vehicleData.FUELTANK,
        regiNumber,
        ownerName,
        vehicleType,
        createdAt: firestore.FieldValue.serverTimestamp(),
        sellerId: user.uid,
        sellerName: sellerName || "Unknown",
        sellerPhone: sellerPhone || "Unknown",
        sellerEmail: sellerEmail || "Unknown",
      });
  
      await docRef.update({ vehicleId: docRef.id });
  
      Alert.alert("성공", "차량 정보가 저장되었습니다.");
      setRegiNumber("");
      setOwnerName("");
      setVehicleData(null);
      setImageUri(null);
      setVehicleType(""); // 저장 완료 후 차량 종류도 리셋
    } catch (error) {
      console.error("Firestore 저장 오류:", error);
      Alert.alert("오류", "차량 정보를 저장하는 중 문제가 발생했습니다.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.label}>차량번호</Text>
        <TextInput
          value={regiNumber}
          onChangeText={(text) => setRegiNumber(formatRegiNumber(text))}
          style={styles.input}
          placeholder="예: 서울12가 3456"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>소유자명</Text>
        <TextInput
          value={ownerName}
          onChangeText={setOwnerName}
          style={styles.input}
          placeholder="소유자 이름 입력"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>차량 종류</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={vehicleType}
            onValueChange={(itemValue) => setVehicleType(itemValue)}
            style={[styles.picker, { color: vehicleType ? '#000' : '#aaa' }]} // ✅ 선택 여부에 따라 글자색 다르게
            dropdownIconColor="#000"
          >
            <Picker.Item label="차량 종류 선택" value="" color="#aaa" />
            <Picker.Item label="승용차" value="승용차" color="#eeeeee" />
            <Picker.Item label="택시" value="택시" color="#eeeeee" />
            <Picker.Item label="렌터카" value="렌터카" color="#eeeeee" />
            <Picker.Item label="화물차" value="화물차" color="#eeeeee" />
            <Picker.Item label="군용차" value="군용차" color="#eeeeee" />
            <Picker.Item label="외교차" value="외교차" color="#eeeeee" />
          </Picker>
        </View>

        <TouchableOpacity onPress={handleImageSelect} style={styles.imageButton}>
          <Text style={styles.imageButtonText}>추가 사진 선택 (선택)</Text>
        </TouchableOpacity>

        {imageUri && <Image source={{ uri: imageUri }} style={styles.imagePreview} />}

        <View style={styles.buttonContainer}>
          <Button title="차량 정보 조회" onPress={fetchVehicleInfo} disabled={loading} color="#2B4593" />
          {loading && <ActivityIndicator size="large" color="#2B4593" />}
        </View>

        {vehicleData && (
          <View style={styles.vehiclePreview}>
            <Text style={styles.previewTitle}>🚗 차량 정보 미리보기</Text>
            {vehicleData.CARURL && (
              <Image
                source={{ uri: `https://www.cartory.net/cars/${vehicleData.CARURL}` }}
                style={styles.vehicleImage}
              />
            )}
            <Text>🔹 차량번호: {regiNumber}</Text>
            <Text>🔹 소유자명: {ownerName}</Text>
            <Text>🔹 차량명: {vehicleData.CARNAME}</Text>
            <Text>🔹 제조사: {vehicleData.CARVENDER}</Text>
            <Text>🔹 연식: {vehicleData.CARYEAR}</Text>
            <Text>🔹 연료: {vehicleData.FUEL}</Text>
            <Text>🔹 변속기: {vehicleData.MISSION}</Text>
            <Text>🔹 배기량: {vehicleData.CC} cc</Text>
            <Text>🔹 연비: {vehicleData.FUELECO} km/L</Text>

            <View style={styles.buttonContainer}>
              <Button title="차량 정보 저장" onPress={saveVehicleData} color="#2B4593" />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollViewContent: { padding: 20, paddingBottom: 30 },
  label: { fontSize: 16, fontWeight: "600", color: "#000", marginBottom: 5 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 12, marginBottom: 15, borderRadius: 8, backgroundColor: "#fff", fontSize: 16 },
  pickerContainer: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, overflow: 'hidden', marginBottom: 15, backgroundColor: '#fff' },
  picker: { height: 55, width: '100%', fontSize: 16 }, // ✅ 높이와 글자 크기 조정
  buttonContainer: { marginTop: 20, alignItems: "center" },
  vehiclePreview: { marginTop: 30, padding: 15, backgroundColor: "#fff", borderRadius: 10, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
  previewTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  vehicleImage: { width: "100%", height: 200, resizeMode: "contain", marginBottom: 10 },
  imageButton: { padding: 10, backgroundColor: "#e0e0e0", alignItems: "center", marginBottom: 10, borderRadius: 6 },
  imageButtonText: { color: "#333" },
  imagePreview: { width: "100%", height: 200, resizeMode: "cover", borderRadius: 6, marginBottom: 15 },
});

export default VehicleRegistrationScreen;
