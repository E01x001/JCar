// src/services/firebaseService.js
import auth from '@react-native-firebase/auth';
import { getFirestore, collection, doc, setDoc, updateDoc, addDoc, getDoc, getDocs, query, where, orderBy, limit, startAfter, onSnapshot, runTransaction, serverTimestamp, deleteField } from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import messaging from '@react-native-firebase/messaging';
import crashlytics from '@react-native-firebase/crashlytics';
import { Alert, Platform, PermissionsAndroid } from 'react-native';

// --------------------
// 회원가입
// --------------------
export const registerUser = async ({ email, password, name, phoneNumber }) => {
  try {
    // Firebase Authentication에 사용자 생성
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const userId = userCredential.user.uid;

    // Firestore에 추가 정보 저장
    const db = getFirestore();
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      name,
      phoneNumber,
      role: 'user', // 기본 역할
      createdAt: serverTimestamp(),
    });

    return { success: true, userId };
  } catch (error) {
    console.error('회원가입 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('registerUser failed');
    Alert.alert('회원가입 오류', error.message || '알 수 없는 오류가 발생했습니다.');
    return { success: false, error };
  }
};

// --------------------
// 로그인
// --------------------
export const loginUser = async ({ email, password }) => {
  try {
    const userCredential = await auth().signInWithEmailAndPassword(email, password);
    return { success: true, userId: userCredential.user.uid };
  } catch (error) {
    console.error('로그인 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('loginUser failed');
    Alert.alert('로그인 오류', error.message || '알 수 없는 오류가 발생했습니다.');
    return { success: false, error };
  }
};

// --------------------
// 상담 요청 저장
// --------------------
export const saveConsultationRequest = async (data) => {
  try {
    const validData = {
      userId: data.userId || null,
      userName: data.userName || '익명',
      userPhone: data.userPhone || '미등록',
      vehicleId: data.vehicleId || null,
      vehicleName: data.vehicleName || '알 수 없음',
      preferredDate: data.preferredDate || null,
      preferredTime: data.preferredTime || null,
      type: data.type || 'buy',
      consultationStatus: data.consultationStatus || 'pending',
      completedAt: data.completedAt || null,
      completedBy: data.completedBy || null,
      dealAmount: data.dealAmount || null,
      adminNotes: data.adminNotes || '',
      createdAt: serverTimestamp(),
    };

    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');
    await addDoc(consultationsRef, validData);
    return { success: true };
  } catch (error) {
    console.error('상담 요청 저장 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('saveConsultationRequest failed');
    Alert.alert('오류', '상담 요청 저장에 실패했습니다.');
    return { success: false, error };
  }
};

// --------------------
// 알림 권한 요청
// --------------------
export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        // Android 13 이상에서는 POST_NOTIFICATIONS 권한 요청
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: '알림 권한 요청',
            message: '중요한 알림을 받으려면 권한이 필요합니다.',
            buttonNeutral: '나중에',
            buttonNegative: '거부',
            buttonPositive: '허용',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ 알림 권한 허용됨');
          return true;
        } else {
          console.log('❌ 알림 권한 거부됨');
          return false;
        }
      } else {
        // Android 12 이하에서는 자동으로 권한 허용
        console.log('✅ Android 12 이하 - 알림 권한 자동 허용');
        return true;
      }
    } else if (Platform.OS === 'ios') {
      // iOS에서는 Firebase Messaging의 requestPermission 사용
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ iOS 알림 권한 허용됨:', authStatus);
        return true;
      } else {
        console.log('❌ iOS 알림 권한 거부됨');
        return false;
      }
    }

    return false;
  } catch (error) {
    console.error('알림 권한 요청 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('requestNotificationPermission failed');
    return false;
  }
};

// --------------------
// FCM 토큰 저장
// --------------------
export const saveFcmToken = async (userId) => {
  try {
    const token = await messaging().getToken();
    if (token) {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, { fcmToken: token });
      console.log('FCM 토큰 저장 완료:', token);
    }
  } catch (error) {
    console.error('FCM 토큰 저장 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('saveFcmToken failed');
  }
};

// --------------------
// Callable Functions 예시
// --------------------
export const deleteVehicleAdmin = async (vehicleId) => {
  try {
    const callable = functions().httpsCallable('deleteVehicleAdmin');
    await callable({ vehicleId });
    Alert.alert('알림', '차량이 삭제되었습니다.');
  } catch (error) {
    console.error('차량 삭제 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('deleteVehicleAdmin failed');
    Alert.alert('오류', error.message || '차량 삭제 중 오류가 발생했습니다.');
  }
};

export const deleteConsultationAdmin = async (consultationId) => {
  try {
    const callable = functions().httpsCallable('deleteConsultationAdmin');
    await callable({ consultationId });
    Alert.alert('알림', '상담이 삭제되었습니다.');
  } catch (error) {
    console.error('상담 삭제 실패:', error);
    crashlytics().recordError(error);
    crashlytics().log('deleteConsultationAdmin failed');
    Alert.alert('오류', error.message || '상담 삭제 중 오류가 발생했습니다.');
  }
};

// --------------------
// 상담 상태 업데이트
// --------------------
export const updateConsultationStatus = async (consultationId, newStatus, adminId = null, notes = '', rejectionReason = null) => {
  try {
    const updateData = {
      consultationStatus: newStatus,
    };

    // Add adminNotes only if provided
    if (notes) {
      updateData.adminNotes = notes;
    }

    // Add rejectionReason only if provided and status is 'rejected'
    if (newStatus === 'rejected' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
      updateData.rejectedAt = serverTimestamp();
    }

    // Add completedBy only if adminId is provided
    if (adminId) {
      updateData.completedBy = adminId;
    }

    // Automatically add completedAt timestamp when status is 'completed'
    if (newStatus === 'completed') {
      updateData.completedAt = serverTimestamp();
    }

    const db = getFirestore();
    const consultationRef = doc(db, 'consultation_requests', consultationId);
    await updateDoc(consultationRef, updateData);

    return { success: true };
  } catch (error) {
    console.error('상담 상태 업데이트 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('updateConsultationStatus failed');
    // Don't show Alert here - let the caller handle user feedback
    throw error; // Re-throw error for caller to handle
  }
};

// --------------------
// 관리자 메모 업데이트
// --------------------
export const updateAdminMemo = async (consultationId, adminMemo) => {
  try {
    const db = getFirestore();
    const consultationRef = doc(db, 'consultation_requests', consultationId);
    await updateDoc(consultationRef, {
      adminMemo: adminMemo,
      memoUpdatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('관리자 메모 업데이트 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('updateAdminMemo failed');
    throw error; // Re-throw error for caller to handle
  }
};

// --------------------
// 대체 시간 제안 업데이트
// --------------------
/**
 * Update alternative time slot suggestions for a consultation
 * @param {string} consultationId - Firestore consultation document ID
 * @param {Array<Date>} suggestedSlots - Array of Date objects representing alternative time slots
 * @returns {Promise<{success: boolean}>}
 */
export const updateSuggestedSlots = async (consultationId, suggestedSlots) => {
  try {
    // Convert Date objects to alternativeSlots format {date, time}
    const alternativeSlots = suggestedSlots.map(slot => ({
      date: `${slot.getFullYear()}-${String(slot.getMonth() + 1).padStart(2, '0')}-${String(slot.getDate()).padStart(2, '0')}`,
      time: `${String(slot.getHours()).padStart(2, '0')}:${String(slot.getMinutes()).padStart(2, '0')}`,
    }));

    const db = getFirestore();
    const consultationRef = doc(db, 'consultation_requests', consultationId);
    await updateDoc(consultationRef, {
      alternativeSlots,
      alternativeSlotsUpdatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('대체 시간 제안 업데이트 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('updateSuggestedSlots failed');
    throw error; // Re-throw for caller to handle
  }
};

// --------------------
// 상담 거래 완료
// --------------------
export const completeConsultation = async ({ docId, dealAmount, adminNotes = '', completedBy, isSell = false }) => {
  try {
    const db = getFirestore();

    // If NOT a sell-type consultation, use simple update
    if (!isSell) {
      const updateData = {
        consultationStatus: 'completed',
        completedAt: serverTimestamp(),
        dealAmount: Number(dealAmount),
        completedBy: completedBy,
      };

      // Add adminNotes only if provided
      if (adminNotes) {
        updateData.adminNotes = adminNotes;
      }

      const consultationRef = doc(db, 'consultation_requests', docId);
      await updateDoc(consultationRef, updateData);

      return { success: true };
    }

    // For sell-type consultations, use transaction
    const result = await runTransaction(db, async (transaction) => {
      const consultationRef = doc(db, 'consultation_requests', docId);
      const consultationDoc = await transaction.get(consultationRef);

      if (!consultationDoc.exists()) {
        throw new Error('상담 정보를 찾을 수 없습니다.');
      }

      const consultationData = consultationDoc.data();
      const vehicleId = consultationData.vehicleId;

      if (!vehicleId) {
        throw new Error('차량 정보가 없습니다.');
      }

      // Read vehicle document
      const vehicleRef = doc(db, 'vehicles', vehicleId);
      const vehicleDoc = await transaction.get(vehicleRef);

      if (!vehicleDoc.exists()) {
        throw new Error('차량 정보를 찾을 수 없습니다.');
      }

      const vehicleData = vehicleDoc.data();

      // 1. Update consultation status
      const consultationUpdateData = {
        consultationStatus: 'completed',
        completedAt: serverTimestamp(),
        dealAmount: Number(dealAmount),
        completedBy: completedBy,
      };

      if (adminNotes) {
        consultationUpdateData.adminNotes = adminNotes;
      }

      transaction.update(consultationRef, consultationUpdateData);

      // 2. Create admin_owned_vehicles document
      const ownedVehiclesCol = collection(db, 'admin_owned_vehicles');
      const ownedVehicleRef = doc(ownedVehiclesCol);
      transaction.set(ownedVehicleRef, {
        vehicleId: vehicleId,
        vehicleName: consultationData.vehicleName || vehicleData.vehicleName || '알 수 없음',
        purchasePrice: Number(dealAmount),
        purchaseDate: serverTimestamp(),
        consultationId: docId,
        previousOwnerId: consultationData.userId,
        previousOwnerName: consultationData.userName,
        status: 'owned',
        soldDate: null,
        soldPrice: null,
        // Copy vehicle details
        manufacturer: vehicleData.manufacturer,
        model: vehicleData.model,
        year: vehicleData.year,
        mileage: vehicleData.mileage,
        imageUrl: vehicleData.imageUrl,
        createdAt: serverTimestamp(),
      });

      // 3. Update vehicle status to 'sold'
      transaction.update(vehicleRef, {
        status: 'sold',
        soldDate: serverTimestamp(),
      });

      return { success: true };
    });

    return result;
  } catch (error) {
    console.error('거래완료 처리 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('completeConsultation failed');
    throw error; // Re-throw for caller to handle
  }
};

// --------------------
// 거래완료 처리 (트랜잭션)
// --------------------
export const completeConsultationDeal = async ({
  consultationId,
  dealAmount,
  adminId,
  adminNotes = '',
  shouldAddToOwnedVehicles = false,
  vehicleData = null,
}) => {
  try {
    const db = getFirestore();
    const result = await runTransaction(db, async (transaction) => {
      const consultationRef = doc(db, 'consultation_requests', consultationId);
      const consultationDoc = await transaction.get(consultationRef);

      if (!consultationDoc.exists()) {
        throw new Error('상담 정보를 찾을 수 없습니다.');
      }

      const consultationData = consultationDoc.data();

      transaction.update(consultationRef, {
        consultationStatus: 'completed',
        completedAt: serverTimestamp(),
        completedBy: adminId,
        dealAmount: dealAmount,
        adminNotes: adminNotes,
      });

      if (shouldAddToOwnedVehicles && vehicleData) {
        const vehicleRef = doc(db, 'vehicles', consultationData.vehicleId);
        transaction.update(vehicleRef, {
          status: 'sold',
        });

        const ownedVehiclesCol = collection(db, 'admin_owned_vehicles');
        const ownedVehicleRef = doc(ownedVehiclesCol);
        transaction.set(ownedVehicleRef, {
          vehicleId: consultationData.vehicleId,
          vehicleName: consultationData.vehicleName,
          purchasePrice: dealAmount,
          purchaseDate: serverTimestamp(),
          consultationId: consultationId,
          previousOwnerId: consultationData.userId,
          previousOwnerName: consultationData.userName,
          status: 'owned',
          soldDate: null,
          soldPrice: null,
          createdAt: serverTimestamp(),
          ...vehicleData,
        });
      }

      return { success: true };
    });

    Alert.alert('알림', '거래가 완료되었습니다.');
    return result;
  } catch (error) {
    console.error('거래완료 처리 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('completeConsultationDeal failed');
    Alert.alert('오류', error.message || '거래완료 처리에 실패했습니다.');
    return { success: false, error };
  }
};

// --------------------
// 관리자 소유 차량 생성
// --------------------
export const createAdminOwnedVehicle = async (vehicleData) => {
  try {
    const validData = {
      vehicleId: vehicleData.vehicleId,
      vehicleName: vehicleData.vehicleName,
      purchasePrice: vehicleData.purchasePrice,
      purchaseDate: vehicleData.purchaseDate || serverTimestamp(),
      consultationId: vehicleData.consultationId,
      previousOwnerId: vehicleData.previousOwnerId,
      previousOwnerName: vehicleData.previousOwnerName,
      status: vehicleData.status || 'owned',
      soldDate: vehicleData.soldDate || null,
      soldPrice: vehicleData.soldPrice || null,
      createdAt: serverTimestamp(),
    };

    const db = getFirestore();
    const ownedVehiclesRef = collection(db, 'admin_owned_vehicles');
    const docRef = await addDoc(ownedVehiclesRef, validData);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('관리자 소유 차량 생성 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('createAdminOwnedVehicle failed');
    Alert.alert('오류', '차량 등록에 실패했습니다.');
    return { success: false, error };
  }
};

// --------------------
// 관리자 소유 차량 조회
// --------------------
export const getAdminOwnedVehicles = async (statusFilter = null) => {
  try {
    const db = getFirestore();
    const ownedVehiclesRef = collection(db, 'admin_owned_vehicles');

    const constraints = [orderBy('purchaseDate', 'desc')];
    if (statusFilter) {
      constraints.push(where('status', '==', statusFilter));
    }

    const q = query(ownedVehiclesRef, ...constraints);
    const snapshot = await getDocs(q);
    const vehicles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, vehicles };
  } catch (error) {
    console.error('관리자 소유 차량 조회 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('getAdminOwnedVehicles failed');
    return { success: false, error, vehicles: [] };
  }
};

// --------------------
// 관리자 소유 차량 업데이트
// --------------------
export const updateAdminOwnedVehicle = async (vehicleId, updateData) => {
  try {
    const db = getFirestore();
    const vehicleDocRef = doc(db, 'admin_owned_vehicles', vehicleId);
    await updateDoc(vehicleDocRef, updateData);

    return { success: true };
  } catch (error) {
    console.error('관리자 소유 차량 업데이트 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('updateAdminOwnedVehicle failed');
    Alert.alert('오류', '차량 정보 업데이트에 실패했습니다.');
    return { success: false, error };
  }
};

// --------------------
// 구매상담 실시간 구독
// --------------------
export const subscribeToBuyConsultations = (callback) => {
  try {
    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');
    const q = query(
      consultationsRef,
      where('consultationStatus', 'in', ['pending', 'confirmed', 'on-hold', 'rejected']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const consultations = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(c => c.type !== 'sell');
        callback(consultations);
      },
      (error) => {
        console.error('구매상담 구독 오류:', error);
        crashlytics().recordError(error);
        crashlytics().log('subscribeToBuyConsultations failed');
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('구매상담 구독 설정 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('subscribeToBuyConsultations setup failed');
    return () => {};
  }
};

// --------------------
// 판매상담 실시간 구독
// --------------------
export const subscribeToSellConsultations = (callback) => {
  try {
    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');
    const q = query(
      consultationsRef,
      where('type', '==', 'sell'),
      where('consultationStatus', 'in', ['pending', 'confirmed', 'on-hold', 'rejected']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const consultations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        callback(consultations);
      },
      (error) => {
        console.error('판매상담 구독 오류:', error);
        crashlytics().recordError(error);
        crashlytics().log('subscribeToSellConsultations failed');
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('판매상담 구독 설정 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('subscribeToSellConsultations setup failed');
    return () => {};
  }
};

// --------------------
// 거래완료 상담 실시간 구독 (Task 50: includes both 'completed' and 'archived' statuses)
// --------------------
/**
 * Subscribe to completed and archived consultations in real-time
 *
 * Performance Optimization (Task 56):
 * - Server-side orderBy removed to avoid redundant sorting
 * - Uses client-side sorting by archivedAt || completedAt for correct chronological order
 * - Client-side sorting is acceptable because:
 *   1. Small dataset: completed/archived consultations are typically limited
 *   2. Custom logic: sorting by archivedAt OR completedAt requires client-side processing
 *   3. Composite index: firestore.indexes.json includes consultationStatus + createdAt for efficient filtering
 *
 * Note: If dataset grows significantly (>1000 items), consider implementing server-side pagination
 *
 * @param {Function} callback - Function to call with consultation array
 * @returns {Function} Unsubscribe function
 */
export const subscribeToCompletedConsultations = (callback) => {
  try {
    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');
    const q = query(
      consultationsRef,
      where('consultationStatus', 'in', ['completed', 'archived'])
      // No orderBy here - client-side sorting handles chronological order
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const consultations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Client-side sort by archivedAt or completedAt (most recent first)
        // This is necessary because consultations can have either field set
        consultations.sort((a, b) => {
          const aDate = a.archivedAt || a.completedAt;
          const bDate = b.archivedAt || b.completedAt;
          if (!aDate) {return 1;}  // Items without dates go to end
          if (!bDate) {return -1;} // Items without dates go to end
          return bDate.toMillis() - aDate.toMillis(); // Descending order
        });

        callback(consultations);
      },
      (error) => {
        console.error('거래완료 상담 구독 오류:', error);
        crashlytics().recordError(error);
        crashlytics().log('subscribeToCompletedConsultations failed');
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error) {
    console.error('거래완료 상담 구독 설정 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('subscribeToCompletedConsultations setup failed');
    return () => {};
  }
};

// --------------------
// 거래완료 상담 페이지네이션 조회 (Task 58)
// --------------------
/**
 * Fetch completed/archived consultations with pagination support
 *
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of items per page (default: 50)
 * @param {Object} options.startAfterDoc - Firestore DocumentSnapshot for pagination cursor
 * @param {string} options.monthFilter - Month filter in 'YYYY-MM' format (optional)
 * @param {string} options.typeFilter - Consultation type filter: 'buy', 'sell', or 'all' (default: 'all')
 * @returns {Promise<{consultations: Array, lastVisibleDoc: Object, hasMore: boolean}>}
 */
export const fetchCompletedConsultationsPaginated = async ({
  limit: pageLimit = 50,
  startAfterDoc = null,
  monthFilter = 'all',
  typeFilter = 'all',
}) => {
  try {
    const db = getFirestore();
    const consultationsRef = collection(db, 'consultation_requests');

    const constraints = [
      where('consultationStatus', 'in', ['completed', 'archived']),
    ];

    // Apply pagination cursor
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    // Apply limit + 1 to check if there are more results
    constraints.push(limit(pageLimit + 1));

    const q = query(consultationsRef, ...constraints);
    const snapshot = await getDocs(q);
    const docs = snapshot.docs;

    // Check if there are more results
    const hasMore = docs.length > pageLimit;

    // Remove the extra document if exists
    const consultationDocs = hasMore ? docs.slice(0, pageLimit) : docs;

    let consultations = consultationDocs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      _doc: doc, // Store document reference for pagination
    }));

    // Client-side filtering by month
    if (monthFilter !== 'all') {
      consultations = consultations.filter(c => {
        const timestamp = c.archivedAt || c.completedAt;
        if (!timestamp) {return false;}
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === monthFilter;
      });
    }

    // Client-side filtering by type
    if (typeFilter !== 'all') {
      consultations = consultations.filter(c => {
        if (typeFilter === 'buy') {return c.type !== 'sell';}
        if (typeFilter === 'sell') {return c.type === 'sell';}
        return true;
      });
    }

    // Client-side sort by archivedAt or completedAt (most recent first)
    consultations.sort((a, b) => {
      const aDate = a.archivedAt || a.completedAt;
      const bDate = b.archivedAt || b.completedAt;
      if (!aDate) {return 1;}
      if (!bDate) {return -1;}
      return bDate.toMillis() - aDate.toMillis();
    });

    // Get last visible document for next page
    const lastVisibleDoc = consultationDocs.length > 0
      ? consultationDocs[consultationDocs.length - 1]
      : null;

    return {
      consultations,
      lastVisibleDoc,
      hasMore,
    };
  } catch (error) {
    console.error('거래완료 상담 페이지네이션 조회 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('fetchCompletedConsultationsPaginated failed');
    return {
      consultations: [],
      lastVisibleDoc: null,
      hasMore: false,
    };
  }
};

// --------------------
// 사용자 상담 취소
// --------------------
/**
 * Cancel a consultation request by the user
 * @param {string} consultationId - Firestore consultation document ID
 * @returns {Promise<{success: boolean}>}
 */
export const cancelConsultation = async (consultationId) => {
  try {
    const db = getFirestore();
    const consultationRef = doc(db, 'consultation_requests', consultationId);
    await updateDoc(consultationRef, {
      consultationStatus: 'cancelled', // Fixed: use consultationStatus instead of status
      cancelledAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('상담 취소 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('cancelConsultation failed');
    throw error; // Re-throw error for caller to handle
  }
};

// --------------------
// 상담 재신청
// --------------------
/**
 * Resubmit a rejected consultation with new date/time
 * @param {string} consultationId - Firestore consultation document ID
 * @param {string} preferredDate - New preferred date (YYYY-MM-DD or formatted string)
 * @param {string} preferredTime - New preferred time (HH:MM or formatted string)
 * @returns {Promise<{success: boolean}>}
 */
export const resubmitConsultation = async (consultationId, preferredDate, preferredTime) => {
  try {
    const db = getFirestore();
    const consultationRef = doc(db, 'consultation_requests', consultationId);
    await updateDoc(consultationRef, {
      status: 'pending',
      preferredDate,
      preferredTime,
      rejectionReason: deleteField(),
      alternativeSlots: deleteField(),
      rejectedAt: deleteField(),
      resubmittedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('상담 재신청 오류:', error);
    crashlytics().recordError(error);
    crashlytics().log('resubmitConsultation failed');
    throw error; // Re-throw error for caller to handle
  }
};
