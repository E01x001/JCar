import React, { useState, useEffect, useContext } from 'react';
import { logger } from '../utils/logger';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import { formatPhone } from '../utils/format';
import Card from '../components/Card';
import Tag from '../components/Tag';
import Badge from '../components/Badge';
import Avatar from '../components/Avatar';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';

const AdminUserManagementScreen = () => {
  const theme = useTheme();
  const { user: currentUser } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [searchQuery, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const db = getFirestore();
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersData = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      logger.error('사용자 목록 불러오기 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => {
      const name = user.name?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      const phoneNumber = user.phoneNumber?.toLowerCase() || '';

      return name.includes(query) ||
             email.includes(query) ||
             phoneNumber.includes(query);
    });

    setFilteredUsers(filtered);
  };

  const handleToggleUserStatus = async (userId, currentStatus, userName) => {
    // 관리자 계정은 정지할 수 없음
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role === 'admin') {
      Alert.alert('권한 오류', '관리자 계정은 정지할 수 없습니다.');
      return;
    }

    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const actionText = newStatus === 'suspended' ? '정지' : '활성화';

    Alert.alert(
      `계정 ${actionText} 확인`,
      `정말로 "${userName}" 계정을 ${actionText}하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: actionText,
          style: newStatus === 'suspended' ? 'destructive' : 'default',
          onPress: async () => {
            setUpdatingUserId(userId);
            try {
              const db = getFirestore();
              // Firestore 업데이트
              const userDocRef = doc(db, 'users', userId);
              await updateDoc(userDocRef, {
                status: newStatus,
                statusUpdatedAt: serverTimestamp(),
              });

              // admin_activity_log에 기록
              const activityLogRef = collection(db, 'admin_activity_log');
              await addDoc(activityLogRef, {
                adminUid: currentUser?.uid,
                action: newStatus === 'suspended' ? 'suspend_user' : 'activate_user',
                targetUserId: userId,
                targetUserName: userName,
                previousStatus: currentStatus || 'active',
                newStatus: newStatus,
                timestamp: serverTimestamp(),
              });

              // UI 업데이트
              setUsers(prevUsers =>
                prevUsers.map(user =>
                  user.id === userId ? { ...user, status: newStatus } : user
                )
              );

              Alert.alert('완료', `계정이 ${actionText}되었습니다.`);
            } catch (error) {
              logger.error('사용자 상태 변경 오류:', error);
              Alert.alert('오류', `계정 ${actionText} 중 문제가 발생했습니다.`);
            } finally {
              setUpdatingUserId(null);
            }
          },
        },
      ]
    );
  };

  const renderUserItem = ({ item }) => {
    const isAdmin = item.role === 'admin';
    const isUpdating = updatingUserId === item.id;
    const isSuspended = item.status === 'suspended';

    return (
      <Card elevated style={styles.userCard}>
        <Avatar name={item.name} size={44} />
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={[styles.userName, { color: theme.colors.text.primary }]} numberOfLines={1}>
              {item.name}
            </Text>
            {isAdmin && <Tag variant="accent" label="관리자" />}
          </View>
          <Text style={[styles.userMeta, { color: theme.colors.text.secondary }]} numberOfLines={1}>
            {item.email}
          </Text>
          <Text style={[styles.userMeta, { color: theme.colors.text.secondary }]}>
            {formatPhone(item.phoneNumber)}
          </Text>
          <Badge
            variant="chip"
            status={isSuspended ? 'rejected' : 'approved'}
            label={isSuspended ? '정지됨' : '활성'}
            style={styles.statusChip}
          />
        </View>

        <View style={styles.actionContainer}>
          {isUpdating ? (
            <ActivityIndicator size="small" color={theme.colors.primary.main} />
          ) : (
            <Switch
              value={!isSuspended}
              onValueChange={() => handleToggleUserStatus(item.id, item.status, item.name)}
              trackColor={{ false: theme.colors.danger.main, true: theme.colors.success.main }}
              thumbColor={theme.colors.neutral.white}
              disabled={isAdmin}
            />
          )}
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background.secondary }]}>
        <ActivityIndicator size="large" color={theme.colors.primary.main} />
        <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
          사용자 목록 불러오는 중...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={
          <View>
            <SearchBar
              placeholder="이름, 이메일 또는 전화번호로 검색"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchBar}
            />
            <Text style={[styles.statsText, { color: theme.colors.text.secondary }]}>
              전체 사용자 {users.length}명
              {searchQuery ? ` · 검색 결과 ${filteredUsers.length}명` : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={searchQuery ? '검색 결과가 없어요' : '등록된 사용자가 없어요'}
            message={searchQuery ? '다른 검색어로 시도해 보세요' : undefined}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  searchBar: {
    marginBottom: 12,
  },
  statsText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginHorizontal: 14,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  userMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  statusChip: {
    marginTop: 10,
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 52,
  },
});

export default AdminUserManagementScreen;
