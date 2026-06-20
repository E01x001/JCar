/**
 * Migration Screen
 *
 * Temporary screen to run Firestore data migrations.
 * This screen should be removed after migration is complete.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import Button from '../components/Button';
import Card from '../components/Card';
import { migrateConsultationStatusField } from '../scripts/migrateConsultationStatus';
import { migrateVehiclePII } from '../scripts/migrateVehiclePII';

const MigrationScreen = ({ navigation }) => {
  const theme = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [isRunningPII, setIsRunningPII] = useState(false);
  const [piiResult, setPiiResult] = useState(null);

  const runMigration = async () => {
    Alert.alert(
      '마이그레이션 실행',
      '모든 상담 요청의 status 필드를 consultationStatus로 마이그레이션합니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '실행',
          style: 'destructive',
          onPress: async () => {
            setIsRunning(true);
            setResult(null);

            try {
              const migrationResult = await migrateConsultationStatusField();
              setResult(migrationResult);

              Alert.alert(
                '마이그레이션 완료',
                `성공: ${migrationResult.migrated}건\n스킵: ${migrationResult.skipped}건`,
                [{ text: '확인' }]
              );
            } catch (error) {
              console.error('Migration error:', error);
              Alert.alert('오류', '마이그레이션 중 오류가 발생했습니다.');
              setResult({ success: false, error: error.message });
            } finally {
              setIsRunning(false);
            }
          },
        },
      ]
    );
  };

  const runVehiclePIIMigration = async () => {
    Alert.alert(
      '차량 PII 마이그레이션',
      '기존 차량 문서의 판매자 연락처(이름/전화/이메일/소유자명/차량번호/VIN)를 비공개 서브문서로 옮기고 공개 문서에서 제거합니다. 보안 규칙 배포 후 실행하세요. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '실행',
          style: 'destructive',
          onPress: async () => {
            setIsRunningPII(true);
            setPiiResult(null);

            try {
              const r = await migrateVehiclePII();
              setPiiResult(r);
              Alert.alert(
                '마이그레이션 완료',
                `이전: ${r.migrated}건\n스킵: ${r.skipped}건`,
                [{ text: '확인' }]
              );
            } catch (error) {
              Alert.alert('오류', '차량 PII 마이그레이션 중 오류가 발생했습니다.');
              setPiiResult({ success: false, error: error.message });
            } finally {
              setIsRunningPII(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <Card style={{ margin: theme.spacing.md }}>
        <Text style={[styles.title, {
          fontSize: theme.typography.fontSize.h3,
          fontWeight: theme.typography.fontWeight.bold,
          color: theme.colors.text.primary,
          marginBottom: theme.spacing.md,
        }]}>
          Consultation Status 마이그레이션
        </Text>

        <Text style={[styles.description, {
          fontSize: theme.typography.fontSize.body,
          color: theme.colors.text.secondary,
          marginBottom: theme.spacing.lg,
          lineHeight: 22,
        }]}>
          모든 consultation_requests 문서의 'status' 필드를 'consultationStatus'로 복사하고, 기존 'status' 필드를 삭제합니다.
        </Text>

        <Button
          variant="primary"
          title={isRunning ? '마이그레이션 실행 중...' : '마이그레이션 실행'}
          onPress={runMigration}
          disabled={isRunning}
          loading={isRunning}
        />

        {result && (
          <View style={[styles.resultContainer, {
            marginTop: theme.spacing.lg,
            padding: theme.spacing.md,
            backgroundColor: result.success ? theme.colors.success.light + '20' : theme.colors.danger.light + '20',
            borderRadius: theme.borderRadius.md,
          }]}>
            <Text style={[styles.resultTitle, {
              fontSize: theme.typography.fontSize.h4,
              fontWeight: theme.typography.fontWeight.semiBold,
              color: result.success ? theme.colors.success.dark : theme.colors.danger.dark,
              marginBottom: theme.spacing.sm,
            }]}>
              {result.success ? '✅ 성공' : '❌ 실패'}
            </Text>

            {result.success && (
              <>
                <Text style={[styles.resultText, {
                  fontSize: theme.typography.fontSize.body,
                  color: theme.colors.text.primary,
                }]}>
                  마이그레이션 완료: {result.migrated}건
                </Text>
                <Text style={[styles.resultText, {
                  fontSize: theme.typography.fontSize.body,
                  color: theme.colors.text.secondary,
                }]}>
                  스킵 (이미 마이그레이션됨): {result.skipped}건
                </Text>
              </>
            )}

            {!result.success && (
              <Text style={[styles.resultText, {
                fontSize: theme.typography.fontSize.body,
                color: theme.colors.danger.main,
              }]}>
                에러: {result.error}
              </Text>
            )}
          </View>
        )}

        <View style={{
          marginTop: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border.light,
        }}>
          <Text style={[styles.title, {
            fontSize: theme.typography.fontSize.h4,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text.primary,
            marginBottom: theme.spacing.sm,
          }]}>
            차량 PII 마이그레이션 (Task 125)
          </Text>
          <Text style={[styles.description, {
            fontSize: theme.typography.fontSize.body,
            color: theme.colors.text.secondary,
            marginBottom: theme.spacing.md,
            lineHeight: 22,
          }]}>
            기존 차량 문서의 판매자 연락처를 비공개 서브문서로 이전하고 공개 문서에서 제거합니다. (보안 규칙 배포 후 실행)
          </Text>
          <Button
            variant="primary"
            title={isRunningPII ? '실행 중...' : '차량 PII 마이그레이션 실행'}
            onPress={runVehiclePIIMigration}
            disabled={isRunningPII}
            loading={isRunningPII}
          />
          {piiResult && (
            <Text style={[styles.resultText, {
              marginTop: theme.spacing.sm,
              fontSize: theme.typography.fontSize.body,
              color: piiResult.success ? theme.colors.success.dark : theme.colors.danger.main,
            }]}>
              {piiResult.success ? `✅ 이전 ${piiResult.migrated}건 / 스킵 ${piiResult.skipped}건` : `❌ ${piiResult.error}`}
            </Text>
          )}
        </View>

        <Button
          variant="secondary"
          title="뒤로 가기"
          onPress={() => navigation.goBack()}
          style={{ marginTop: theme.spacing.md }}
        />
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {},
  description: {},
  resultContainer: {},
  resultTitle: {},
  resultText: {
    marginBottom: 4,
  },
});

export default MigrationScreen;
