const IS_DEV = process.env.APP_ENV === 'development';
const IS_PREVIEW = process.env.APP_ENV === 'preview';

const APP_NAME = 'AM Mart';
const BUNDLE_ID = 'com.ammart.app';
const PACKAGE_NAME = 'com.ammart.app';
const VERSION = '1.0.0';
const BUILD_NUMBER = process.env.BUILD_NUMBER || '1';

module.exports = {
  expo: {
    name: APP_NAME,
    slug: 'am-mart',
    owner: 'ammarket',
    version: VERSION,
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'ammart',
    userInterfaceStyle: 'light',

    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#183522',
    },

    assetBundlePatterns: ['**/*'],

    ios: {
      supportsTablet: true,
      bundleIdentifier: BUNDLE_ID,
      buildNumber: BUILD_NUMBER,
      requireFullScreen: false,
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          'AM Mart uses your location to show nearby stores and track your deliveries.',
        NSLocationAlwaysAndWhenInUseUsageDescription:
          'AM Mart uses your location to update delivery status in real-time.',
        NSCameraUsageDescription:
          'AM Mart needs camera access to upload ID documents for SIM card orders.',
        NSPhotoLibraryUsageDescription:
          'AM Mart needs photo library access to upload product images and ID documents.',
        NSPhotoLibraryAddUsageDescription:
          'AM Mart needs access to save delivery proof photos.',
        NSFaceIDUsageDescription:
          'AM Mart uses Face ID to quickly and securely unlock the app.',
        UIBackgroundModes: ['location', 'remote-notification', 'fetch'],
      },
    },

    android: {
      package: PACKAGE_NAME,
      versionCode: parseInt(BUILD_NUMBER, 10),
      usesCleartextTraffic: true,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#183522',
      },
      googleServicesFile: './google-services.json',
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '',
        },
      },
      permissions: [
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'CAMERA',
        'READ_MEDIA_IMAGES',
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
        'INTERNET',
        'ACCESS_NETWORK_STATE',
        'USE_BIOMETRIC',
        'USE_FINGERPRINT',
      ],
    },

    web: {
      favicon: './assets/favicon.png',
      bundler: 'metro',
    },

    plugins: [
      'expo-router',
      'expo-font',
      'expo-updates',
      // expo-dev-client removed — app runs standalone without development server picker
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow AM Mart to use your location for delivery tracking.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#10B981',
          sounds: [],
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'AM Mart needs access to your photos for uploading documents.',
          cameraPermission:
            'AM Mart needs camera access for uploading documents.',
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 34,
            targetSdkVersion: 34,
            minSdkVersion: 24,
            kotlinVersion: '1.8.10',
          },
          ios: {
            deploymentTarget: '15.1',
            useFrameworks: 'static',
          },
        },
      ],
      [
        '@stripe/stripe-react-native',
        {
          merchantIdentifier: 'merchant.com.ammart.app',
          enableGooglePay: false,
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      eas: {
        projectId: '2e9ab6a3-77f8-4011-bd2c-1b6873d22031',
      },
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
      appEnv: process.env.APP_ENV || 'development',
    },

    updates: {
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/2e9ab6a3-77f8-4011-bd2c-1b6873d22031',
    },

    runtimeVersion: '1.0.0',
  },
};
