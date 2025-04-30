#!/bin/bash

echo "🔍  민감 정보 포함 여부 검사 중..."

# 위험 키워드
keywords=("apiKey" "password" "secret" "firebaseConfig" "Authorization" "Bearer" "serviceAccount" "keystore" "token")

for word in "${keywords[@]}"; do
  echo "👉  검색어: $word"
  git grep -In --exclude-dir=node_modules "$word"
done

echo "✅  검색 완료. 결과를 확인하세요."