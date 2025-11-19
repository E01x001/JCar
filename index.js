/**
 * @format
 */

import {AppRegistry} from 'react-native';

// Firebase 초기화
import '@react-native-firebase/app';

import App from './src/App';
import {name as appName} from './app.json';

// console.log('📱 Registering app component:', appName);

AppRegistry.registerComponent(appName, () => App);
