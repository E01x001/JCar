import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import firestore, { collection, query, where, onSnapshot, orderBy, doc, deleteDoc, getDocs, writeBatch } from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { useToast } from '../hooks/useToast';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';

const MyPageScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const toast = useToast();
  const [vehicles, setVehicles] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [showBuy, setShowBuy] = useState(true);
  const [showSell, setShowSell] = useState(true);

  useEffect(() => {
    if (!user) {return;}

    const vehiclesQuery = query(collection(firestore(), 'vehicles'), where('sellerId', '==', user.uid));
    const unsubscribeVehicles = onSnapshot(vehiclesQuery, snapshot => {
      if (snapshot) {
        const vehicleList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setVehicles(vehicleList);
      }
    }, error => {
      console.error('vehicle snapshot error:', error);
      crashlytics().recordError(error);
      crashlytics().log('MyPageScreen: Vehicle snapshot error');
    });

    const consultationsQuery = query(
      collection(firestore(), 'consultation_requests'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeConsultations = onSnapshot(consultationsQuery, snapshot => {
      if (snapshot) {
        const consultationList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setConsultations(consultationList);
      }
    }, error => {
      console.error('consultation snapshot error:', error);
      crashlytics().recordError(error);
      crashlytics().log('MyPageScreen: Consultation snapshot error');
    });

    return () => {
      unsubscribeVehicles();
      unsubscribeConsultations();
    };
  }, [user]);

  const handleNavigateToVehicleDetail = (vehicleId) => {
    navigation.navigate('VehicleDetail', { vehicleId });
  };

  const getStatusBadge = (status) => {
    if (status === 'approved') {
      return <Badge status="completed" label="승인됨" />;
    } else if (status === 'rejected') {
      return <Badge status="failed" label="거절됨" />;
    }
    return <Badge status="pending" label="대기중" />;
  };


  const handleLogout = async () => {
    try {
      await auth().signOut();
      toast.showSuccess('로그아웃', '정상적으로 로그아웃되었습니다.');
    } catch (error) {
      crashlytics().recordError(error);
      crashlytics().log('MyPageScreen: Logout failed');
      toast.showError('로그아웃 실패', error.message);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert('회원탈퇴', '정말로 회원탈퇴 하시겠습니까? 계정이 삭제됩니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '탈퇴', style: 'destructive', onPress: async () => {
          if (!user) {return;}
          try {
            const q = query(collection(firestore(), 'vehicles'), where('sellerId', '==', user.uid));
            const querySnapshot = await getDocs(q);

            const batch = writeBatch(firestore());
            querySnapshot.forEach(documentSnapshot => batch.delete(documentSnapshot.ref));
            await batch.commit();

            await user.delete();
            toast.showSuccess('탈퇴 완료', '계정이 삭제되었습니다.');
          } catch (error) {
            crashlytics().recordError(error);
            crashlytics().log('MyPageScreen: Delete account failed');
            toast.showError('탈퇴 실패', error.message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
        {/* User Info Card */}
        <Card style={{ marginBottom: theme.spacing.lg }}>
          <Text style={[styles.title, {
            fontSize: theme.typography.fontSize.h2,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
          }]}>마이페이지</Text>
          <Text style={[styles.userInfo, {
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.secondary,
          }]}>이메일: {user?.email ?? '이메일 없음'}</Text>
        </Card>

        {/* Consultations Section */}
        <Text style={[styles.sectionTitle, {
          fontSize: theme.typography.fontSize.h3,
          fontWeight: theme.typography.fontWeight.semiBold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.md,
        }]}>상담 요청 내역</Text>

        {/* Buy Consultations */}
        <TouchableOpacity
          onPress={() => setShowBuy(!showBuy)}
          style={[styles.toggleButton, {
            backgroundColor: theme.colors.background.card,
            borderRadius: theme.borderRadius.medium,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.sm,
          }]}
        >
          <View style={styles.toggleButtonContent}>
            <Text style={[styles.toggleButtonText, {
              fontSize: theme.typography.fontSize.body,
              fontWeight: theme.typography.fontWeight.semiBold,
              color: theme.colors.primary.main,
            }]}>구매 상담</Text>
            <Icon name={showBuy ? 'expand-less' : 'expand-more'} size={24} color={theme.colors.primary.main} />
          </View>
        </TouchableOpacity>
        {showBuy && (
          <View style={{ marginBottom: theme.spacing.md }}>
            {consultations.filter(c => c.type === 'buy' || !c.type).map((item) => (
              <TouchableOpacity key={item.id} onPress={() => handleNavigateToVehicleDetail(item.vehicleId)}>
                <Card style={{ marginBottom: theme.spacing.sm }}>
                  <View style={styles.consultHeader}>
                    <Text style={[styles.consultText, {
                      fontSize: theme.typography.fontSize.body,
                      fontWeight: theme.typography.fontWeight.semiBold,
                      color: theme.colors.text.primary,
                    }]}>{item?.vehicleName ?? '차량명 없음'}</Text>
                    {getStatusBadge(item.status)}
                  </View>
                  <Text style={[styles.consultDetail, {
                    fontSize: theme.typography.fontSize.bodySmall,
                    color: theme.colors.text.secondary,
                    marginTop: theme.spacing.xs,
                  }]}>일정: {item?.preferredDate ?? ''} {item?.preferredTime ?? ''}</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sell Consultations */}
        <TouchableOpacity
          onPress={() => setShowSell(!showSell)}
          style={[styles.toggleButton, {
            backgroundColor: theme.colors.background.card,
            borderRadius: theme.borderRadius.medium,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.sm,
          }]}
        >
          <View style={styles.toggleButtonContent}>
            <Text style={[styles.toggleButtonText, {
              fontSize: theme.typography.fontSize.body,
              fontWeight: theme.typography.fontWeight.semiBold,
              color: theme.colors.primary.main,
            }]}>판매 상담</Text>
            <Icon name={showSell ? 'expand-less' : 'expand-more'} size={24} color={theme.colors.primary.main} />
          </View>
        </TouchableOpacity>
        {showSell && (
          <View style={{ marginBottom: theme.spacing.md }}>
            {consultations.filter(c => c.type === 'sell').map((item) => (
              <TouchableOpacity key={item.id} onPress={() => handleNavigateToVehicleDetail(item.vehicleId)}>
                <Card style={{ marginBottom: theme.spacing.sm }}>
                  <View style={styles.consultHeader}>
                    <Text style={[styles.consultText, {
                      fontSize: theme.typography.fontSize.body,
                      fontWeight: theme.typography.fontWeight.semiBold,
                      color: theme.colors.text.primary,
                    }]}>{item?.vehicleName ?? '차량명 없음'}</Text>
                    {getStatusBadge(item.status)}
                  </View>
                  <Text style={[styles.consultDetail, {
                    fontSize: theme.typography.fontSize.bodySmall,
                    color: theme.colors.text.secondary,
                    marginTop: theme.spacing.xs,
                  }]}>일정: {item?.preferredDate ?? ''} {item?.preferredTime ?? ''}</Text>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* My Vehicles Section */}
        <Text style={[styles.sectionTitle, {
          fontSize: theme.typography.fontSize.h3,
          fontWeight: theme.typography.fontWeight.semiBold,
          color: theme.colors.text.primary,
          marginTop: theme.spacing.lg,
          marginBottom: theme.spacing.md,
        }]}>내 차량</Text>
        {vehicles.map((item) => (
          <TouchableOpacity key={item.id} onPress={() => handleNavigateToVehicleDetail(item.id)}>
            <Card style={{ marginBottom: theme.spacing.sm }}>
              <View style={styles.vehicleRow}>
                <Badge status="completed" label={item.vehicleType ?? '차량'} />
                <Text style={[styles.vehicleName, {
                  fontSize: theme.typography.fontSize.body,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text.primary,
                  marginLeft: theme.spacing.sm,
                }]}>{item.vehicleName ?? '차량명 없음'}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}

        {/* Action Buttons */}
        <Button
          variant="secondary"
          title="로그아웃"
          onPress={handleLogout}
          style={{ marginTop: theme.spacing.xl }}
        />

        <Button
          variant="danger"
          title="회원탈퇴"
          onPress={handleDeleteAccount}
          style={{ marginTop: theme.spacing.md, marginBottom: theme.spacing.xl }}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {},
  userInfo: {},
  sectionTitle: {},
  toggleButton: {},
  toggleButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButtonText: {},
  consultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  consultText: {},
  consultDetail: {},
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleName: {},
});

export default MyPageScreen;
