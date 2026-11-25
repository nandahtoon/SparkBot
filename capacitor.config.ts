import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for packaging SparkBot: Engineering Academy
 * as a full-frame adaptive landscape & portrait Android tablet/phone APK & AAB.
 */
const config: CapacitorConfig = {
  appId: 'com.sparkbot.academy',
  appName: 'SparkBot: Engineering Academy',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    backgroundColor: '#0b1222',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
