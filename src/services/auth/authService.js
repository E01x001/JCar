/**
 * Authentication Service
 *
 * Handles user authentication operations including:
 * - User registration
 * - User login
 * - Session management
 *
 * Task #88: Modular service refactoring
 * Task #92: Integrated global error handler
 */

import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from '@react-native-firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from '@react-native-firebase/firestore';
import { handleFirebaseError } from '../../utils/errorHandler';

/**
 * Register a new user
 * @param {Object} params - Registration parameters
 * @param {string} params.email - User email
 * @param {string} params.password - User password
 * @param {string} params.name - User name
 * @param {string} params.phoneNumber - User phone number
 * @returns {Promise<Object>} User credential
 */
export const registerUser = async ({ email, password, name, phoneNumber }) => {
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;

    // Save additional user info to Firestore
    const db = getFirestore();
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      name,
      phoneNumber,
      role: 'user', // Default role
      createdAt: serverTimestamp(),
    });

    return { success: true, user: userCredential.user };
  } catch (error) {
    // Use global error handler for logging and user-friendly messages
    const userMessage = handleFirebaseError(error, { operation: 'registerUser', email });
    // Create a new error with user-friendly message
    const enhancedError = new Error(userMessage);
    enhancedError.code = error.code;
    enhancedError.originalError = error;
    throw enhancedError;
  }
};

/**
 * Login user with email and password
 * @param {Object} params - Login parameters
 * @param {string} params.email - User email
 * @param {string} params.password - User password
 * @returns {Promise<Object>} User credential
 */
export const loginUser = async ({ email, password }) => {
  try {
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    // Use global error handler for logging and user-friendly messages
    const userMessage = handleFirebaseError(error, { operation: 'loginUser', email });
    // Create a new error with user-friendly message
    const enhancedError = new Error(userMessage);
    enhancedError.code = error.code;
    enhancedError.originalError = error;
    throw enhancedError;
  }
};
