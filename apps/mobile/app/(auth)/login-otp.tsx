// Redirects to the main login screen which now handles OTP natively
import { useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';

export default function LoginOtpRedirect() {
  const params = useLocalSearchParams();
  useEffect(() => {
    router.replace({ pathname: '/(auth)/login', params });
  }, []);
  return null;
}
