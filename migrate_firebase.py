#!/usr/bin/env python3
"""
Script to migrate firebaseService.js from namespaced API to modular API
"""
import re

def migrate_firebase_service():
    file_path = 'src/services/firebaseService.js'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace firestore.FieldValue.serverTimestamp() with serverTimestamp()
    content = re.sub(r'firestore\.FieldValue\.serverTimestamp\(\)', 'serverTimestamp()', content)

    # Replace firestore.FieldValue.delete() with deleteField()
    content = re.sub(r'firestore\.FieldValue\.delete\(\)', 'deleteField()', content)

    # Replace firestore().collection('name').doc('id').update(data)
    # with: const db = getFirestore(); const ref = doc(db, 'name', 'id'); await updateDoc(ref, data)
    # This is complex - we'll do it function by function

    # For simple .update() calls
    pattern1 = r'await firestore\(\)\s*\.collection\([\'"]([^\'"]+)[\'"]\)\s*\.doc\(([^)]+)\)\s*\.update\(([^;]+)\);'
    replacement1 = r'''const db = getFirestore();
    const docRef = doc(db, '\1', \2);
    await updateDoc(docRef, \3);'''
    content = re.sub(pattern1, replacement1, content)

    # For .runTransaction() calls - replace firestore() with getFirestore()
    content = re.sub(r'await firestore\(\)\.runTransaction', 'const db = getFirestore();\n    const result = await runTransaction(db', content)

    # Replace firestore().collection inside transactions
    content = re.sub(r'firestore\(\)\.collection\([\'"]([^\'"]+)[\'"]\)\.doc\(([^)]+)\)', r"doc(getFirestore(), '\1', \2)", content)

    # For query patterns
    content = re.sub(r'let query = firestore\(\)\s*\.collection\([\'"]([^\'"]+)[\'"]\)', r"const db = getFirestore();\n    let q = collection(db, '\1')", content)

    # Replace .where(), .orderBy(), .limit() chained calls
    content = re.sub(r'\.where\(([^)]+)\)', r', where(\1)', content)
    content = re.sub(r'\.orderBy\(([^)]+)\)', r', orderBy(\1)', content)
    content = re.sub(r'\.limit\(([^)]+)\)', r', limit(\1)', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ Migrated {file_path}")

if __name__ == '__main__':
    migrate_firebase_service()
