import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { AuthContext } from '../context/AuthContext';

const AdminUserManagementScreen = () => {
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
      const snapshot = await firestore().collection('users').get();
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
      setFilteredUsers(usersData);
    } catch (error) {
      console.error('사용자 목록 불러오기 오류:', error);
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
              // Firestore 업데이트
              await firestore()
                .collection('users')
                .doc(userId)
                .update({
                  status: newStatus,
                  statusUpdatedAt: firestore.FieldValue.serverTimestamp(),
                });

              // admin_activity_log에 기록
              await firestore().collection('admin_activity_log').add({
                adminUid: currentUser?.uid,
                action: newStatus === 'suspended' ? 'suspend_user' : 'activate_user',
                targetUserId: userId,
                targetUserName: userName,
                previousStatus: currentStatus || 'active',
                newStatus: newStatus,
                timestamp: firestore.FieldValue.serverTimestamp(),
              });

              // UI 업데이트
              setUsers(prevUsers =>
                prevUsers.map(user =>
                  user.id === userId ? { ...user, status: newStatus } : user
                )
              );

              Alert.alert('완료', `계정이 ${actionText}되었습니다.`);
            } catch (error) {
              console.error('사용자 상태 변경 오류:', error);
              Alert.alert('오류', `계정 ${actionText} 중 문제가 발생했습니다.`);
            } finally {
              setUpdatingUserId(null);
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status) => {
    if (status === 'suspended') {
      return {
        text: '정지됨',
        color: '#dc3545',
        icon: 'block',
      };
    }
    return {
      text: '활성',
      color: '#28a745',
      icon: 'check-circle',
    };
  };

  const renderUserItem = ({ item }) => {
    const statusBadge = getStatusBadge(item.status);
    const isAdmin = item.role === 'admin';
    const isUpdating = updatingUserId === item.id;
    const isSuspended = item.status === 'suspended';

    return (
      <View style={styles.userItem}>
        <View style={styles.userInfo}>
          <View style={styles.userHeader}>
            <Text style={styles.userName}>{item.name}</Text>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>관리자</Text>
              </View>
            )}
          </View>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userPhone}>{item.phoneNumber}</Text>

          <View style={styles.statusRow}>
            <Icon name={statusBadge.icon} size={16} color={statusBadge.color} />
            <Text style={[styles.statusText, { color: statusBadge.color }]}>
              {statusBadge.text}
            </Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          {isUpdating ? (
            <ActivityIndicator size="small" color="#007bff" />
          ) : (
            <View style={styles.switchContainer}>
              <Text style={styles.switchLabel}>
                {isSuspended ? '정지' : '활성'}
              </Text>
              <Switch
                value={!isSuspended}
                onValueChange={() => handleToggleUserStatus(item.id, item.status, item.name)}
                trackColor={{ false: '#dc3545', true: '#28a745' }}
                thumbColor="#fff"
                disabled={isAdmin}
              />
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>사용자 목록 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={24} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="이름, 이메일 또는 전화번호로 검색"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="clear" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          전체 사용자: {users.length}명
          {searchQuery && ` (검색 결과: ${filteredUsers.length}명)`}
        </Text>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 사용자가 없습니다.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  statsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 12,
    borderRadius: 8,
    elevation: 1,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 15,
  },
  userItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flex: 1,
    marginRight: 15,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  adminBadge: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
  },
  actionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  switchContainer: {
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: '600',
  },
});

export default AdminUserManagementScreen;
