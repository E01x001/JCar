import firestore from '@react-native-firebase/firestore';

const fixAllCollections = async () => {
  try {
    console.log('🛠 consultation_requests 업데이트 시작');

    // 🔹 1. consultation_requests 컬렉션
    let consultationSnapshot = null;
    try {
      consultationSnapshot = await firestore().collection('consultation_requests').get();
    } catch (error) {
      console.error('[consultation_requests] 가져오기 실패:', error);
    }

    if (consultationSnapshot && !consultationSnapshot.empty) {
      const batch = firestore().batch();

      consultationSnapshot.forEach((doc) => {
        const data = doc.data();
        const ref = doc.ref;
        const updates = {};

        if (data.user_id && !data.userId) {
          updates.userId = data.user_id;
          updates.user_id = firestore.FieldValue.delete();
        }
        if (data.user_name && !data.userName) {
          updates.userName = data.user_name;
          updates.user_name = firestore.FieldValue.delete();
        }
        if (data.user_phone && !data.userPhone) {
          updates.userPhone = data.user_phone;
          updates.user_phone = firestore.FieldValue.delete();
        }
        if (!data.createdAt) {
          updates.createdAt = firestore.FieldValue.serverTimestamp();
        }

        if (Object.keys(updates).length > 0) {
          batch.update(ref, updates);
        }
      });

      await batch.commit();
      console.log('✅ consultation_requests 정리 완료');
    } else {
      console.log('consultation_requests 문서 없음 또는 이미 정리됨');
    }

    // 🔹 2. users 컬렉션
    console.log('🛠 users 업데이트 시작');
    let usersSnapshot = null;
    try {
      usersSnapshot = await firestore().collection('users').get();
    } catch (error) {
      console.error('[users] 가져오기 실패:', error);
    }

    if (usersSnapshot && !usersSnapshot.empty) {
      const batch = firestore().batch();

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const ref = doc.ref;
        const updates = {};

        if (!data.name) updates.name = "Unknown";
        if (!data.phoneNumber) updates.phoneNumber = "미등록";
        if (!data.email) updates.email = "미등록";
        if (!data.createdAt) updates.createdAt = firestore.FieldValue.serverTimestamp();

        if (Object.keys(updates).length > 0) {
          batch.update(ref, updates);
        }
      });

      await batch.commit();
      console.log('✅ users 정리 완료');
    } else {
      console.log('users 문서 없음 또는 이미 정리됨');
    }

    // 🔹 3. vehicles 컬렉션
    console.log('🛠 vehicles 업데이트 시작');
    let vehiclesSnapshot = null;
    try {
      vehiclesSnapshot = await firestore().collection('vehicles').get();
    } catch (error) {
      console.error('[vehicles] 가져오기 실패:', error);
    }

    if (vehiclesSnapshot && !vehiclesSnapshot.empty) {
      const batch = firestore().batch();

      vehiclesSnapshot.forEach((doc) => {
        const data = doc.data();
        const ref = doc.ref;
        const updates = {};

        if (!data.sellerId) updates.sellerId = "Unknown";
        if (!data.sellerName) updates.sellerName = "Unknown";
        if (!data.sellerPhone) updates.sellerPhone = "Unknown";
        if (!data.sellerEmail) updates.sellerEmail = "Unknown";
        if (!data.createdAt) updates.createdAt = firestore.FieldValue.serverTimestamp();

        if (Object.keys(updates).length > 0) {
          batch.update(ref, updates);
        }
      });

      await batch.commit();
      console.log('✅ vehicles 정리 완료');
    } else {
      console.log('vehicles 문서 없음 또는 이미 정리됨');
    }

    console.log('🎉 모든 컬렉션 정리 완료!');

  } catch (e) {
    console.error('🔥 fixAllCollections 전체 실패:', e);
  }
};

export default fixAllCollections;
