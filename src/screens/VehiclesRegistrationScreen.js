import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const VehicleRegistrationScreen = () => {
  const [carModel, setCarModel] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const currentUser = auth().currentUser;

  const handleRegisterVehicle = async () => {
    if (!carModel || !price || !status) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    try {
      // Firestore에 차량 정보 등록
      await firestore().collection('vehicles').add({
        model: carModel,
        price: price,
        status: status,
        sellerName: currentUser.displayName, // Firebase Auth에서 이름 가져오기
        sellerPhone: currentUser.phoneNumber, // Firebase Auth에서 전화번호 가져오기
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      alert('차량 등록이 완료되었습니다.');
    } catch (e) {
      setError('차량 등록에 실패했습니다: ' + e.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="차량 모델"
        value={carModel}
        onChangeText={setCarModel}
      />
      <TextInput
        style={styles.input}
        placeholder="가격"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="상태 (새차/중고차 등)"
        value={status}
        onChangeText={setStatus}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Button title="차량 등록" onPress={handleRegisterVehicle} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingLeft: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 12,
  },
});

export default VehicleRegistrationScreen;
