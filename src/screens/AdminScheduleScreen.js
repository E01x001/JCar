import React, { useEffect, useState, useContext } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import firestore, { collection, onSnapshot, doc, updateDoc } from '@react-native-firebase/firestore';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import Card from '../components/Card';
import Button from '../components/Button';
import StateScreen from '../components/StateScreen';

// Calendar 한글 설정
LocaleConfig.locales.ko = {
  monthNames: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  monthNamesShort: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

const AdminScheduleScreen = () => {
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {return () => {};}

    const consultationCollection = collection(firestore(), 'consultation_requests');
    const unsubscribe = onSnapshot(consultationCollection, snapshot => {
      const all = [];
      const marks = {};

      snapshot.docs.forEach(d => {
        const data = d.data();
        const date = data.preferredDate;
        const color =
          data.status === 'approved' ? theme.colors.success.main
            : data.status === 'rejected' ? theme.colors.danger.main
              : theme.colors.text.tertiary;

        all.push({ id: d.id, ...data });

        if (!marks[date]) {
          marks[date] = { marked: true, dots: [{ color }] };
        } else {
          marks[date].dots.push({ color });
        }
      });

      setConsultations(all);
      setMarkedDates(marks);
    });

    return () => unsubscribe();
  }, [user]);

  const updateStatus = async (id, status) => {
    try {
      const docRef = doc(firestore(), 'consultation_requests', id);
      await updateDoc(docRef, { status });
    } catch (error) {
      Alert.alert('오류', '상태 변경 실패');
      console.error(error);
    }
  };

  const confirmReject = (id) => {
    Alert.alert(
      '거절 확인',
      '정말 거절하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '거절', style: 'destructive', onPress: () => updateStatus(id, 'rejected') },
      ]
    );
  };

  const translateStatus = (status) => {
    if (status === 'approved') {return '승인됨';}
    if (status === 'rejected') {return '거절됨';}
    return '대기중';
  };

  const filteredConsultations = consultations.filter(
    item => item.preferredDate === selectedDate
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    // Since we're using onSnapshot, the data will automatically update
    // Just simulate a refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.secondary }]} edges={['bottom']}>
      <View style={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md }}>
        <Calendar
          markedDates={markedDates}
          markingType="multi-dot"
          onDayPress={(day) => setSelectedDate(day.dateString)}
          monthFormat={'yyyy년 MM월'}
          firstDay={0}
          theme={{
            backgroundColor: theme.colors.background.card,
            calendarBackground: theme.colors.background.card,
            textSectionTitleColor: theme.colors.text.primary,
            selectedDayBackgroundColor: theme.colors.primary.main,
            selectedDayTextColor: '#ffffff',
            todayTextColor: theme.colors.primary.main,
            dayTextColor: theme.colors.text.primary,
            textDisabledColor: theme.colors.text.tertiary,
            dotColor: theme.colors.primary.main,
            selectedDotColor: '#ffffff',
            arrowColor: theme.colors.primary.main,
            monthTextColor: theme.colors.text.primary,
            textDayFontWeight: '600',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
            textDayHeaderFontSize: 14,
            textMonthFontSize: theme.typography.fontSize.h3,
            textDayFontSize: theme.typography.fontSize.body,
          }}
          dayNames={['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']}
          dayNamesShort={['일', '월', '화', '수', '목', '금', '토']}
        />
      </View>

      {selectedDate && (
        <>
          <Text style={[styles.listTitle, {
            fontSize: theme.typography.fontSize.h3,
            fontWeight: theme.typography.fontWeight.semiBold,
            color: theme.colors.text.primary,
            marginTop: theme.spacing.md,
            marginHorizontal: theme.spacing.md,
            marginBottom: theme.spacing.xs,
          }]}>{selectedDate} 상담 내역</Text>

          {filteredConsultations.length === 0 ? (
            <StateScreen
              icon="event-busy"
              title="예정된 상담이 없습니다"
              message={`${selectedDate}에 예정된 상담이 없습니다.`}
            />
          ) : (
            <FlatList
              data={filteredConsultations}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary.main]}
                  tintColor={theme.colors.primary.main}
                />
              }
              contentContainerStyle={{
                paddingHorizontal: theme.spacing.md,
                paddingBottom: theme.spacing.md,
              }}
              renderItem={({ item }) => (
                <Card style={{ marginBottom: theme.spacing.sm }}>
                  <Text style={[styles.itemText, {
                    fontSize: theme.typography.fontSize.body,
                    color: theme.colors.text.primary,
                    marginBottom: theme.spacing.xs,
                  }]}>차량명: {item.vehicleName}</Text>
                  <Text style={[styles.itemText, {
                    fontSize: theme.typography.fontSize.bodySmall,
                    color: theme.colors.text.secondary,
                  }]}>시간: {item.preferredTime}</Text>
                  <Text style={[styles.itemText, {
                    fontSize: theme.typography.fontSize.bodySmall,
                    color: theme.colors.text.secondary,
                  }]}>상태: {translateStatus(item.status)}</Text>

                  <View style={[styles.buttonGroup, { marginTop: theme.spacing.md, gap: theme.spacing.sm }]}>
                    <Button
                      variant="primary"
                      title="승인"
                      onPress={() => updateStatus(item.id, 'approved')}
                      style={{ flex: 1 }}
                    />
                    <Button
                      variant="danger"
                      title="거절"
                      onPress={() => confirmReject(item.id)}
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              )}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {},
  listTitle: {},
  itemText: {},
  buttonGroup: {
    flexDirection: 'row',
  },
});

export default AdminScheduleScreen;
