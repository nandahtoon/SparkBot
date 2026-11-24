/**
 * Capacitor configuration for packaging SparkBot: Engineering Academy
 * as a native Android APK / Google Play App Bundle (AAB).
 */
export interface CapacitorAndroidConfig {
  appId: string;
  appName: string;
  webDir: string;
  bundledWebRuntime: boolean;
  server: {
    androidScheme: 'https' | 'http';
  };
  android: {
    backgroundColor: string;
    allowMixedContent: boolean;
    captureInput: boolean;
    webContentsDebuggingEnabled: boolean;
  };
}

const config: CapacitorAndroidConfig = {
  appId: 'com.sparkbot.academy',
  appName: 'SparkBot: Engineering Academy',
  webDir: 'dist',
  bundledWebRuntime: false,
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
