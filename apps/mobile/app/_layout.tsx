import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProviders, useApp } from '../src/providers';
import { Platform, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Montserrat_400Regular } from '@expo-google-fonts/montserrat/400Regular';
import { Montserrat_500Medium } from '@expo-google-fonts/montserrat/500Medium';
import { Montserrat_600SemiBold } from '@expo-google-fonts/montserrat/600SemiBold';
import { Montserrat_700Bold } from '@expo-google-fonts/montserrat/700Bold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Roboto_400Regular } from '@expo-google-fonts/roboto/400Regular';
import { Roboto_500Medium } from '@expo-google-fonts/roboto/500Medium';
import { Mulish_700Bold } from '@expo-google-fonts/mulish/700Bold';
import { Mulish_300Light } from '@expo-google-fonts/mulish/300Light';
import { Roboto_800ExtraBold } from '@expo-google-fonts/roboto/800ExtraBold';
import { Poppins_300Light } from '@expo-google-fonts/poppins/300Light';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { Mulish_400Regular } from '@expo-google-fonts/mulish/400Regular';

function Navigation() {
  const { dark, colors } = useApp();
  const pathname = usePathname();
  const routeCorners =
    Platform.OS === 'web' &&
    (['/collection-directions', '/collection-route'].includes(pathname) ||
      pathname.startsWith('/handbook/types/'));
  const modern = [
    '/',
    '/profile',
    '/login',
    '/register',
    '/forgot-password',
    '/verify-email',
    '/reset-password',
    '/onboarding',
    '/change-password',
    '/connected-account',
  ].includes(pathname);
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 428,
          alignSelf: 'center',
          overflow: 'hidden',
          borderRadius:
            Platform.OS === 'web'
              ? pathname === '/collection' || pathname === '/collection-explore'
                ? 50
                : (pathname.startsWith('/collection-') && pathname !== '/collection-route') ||
                    ['/journey', '/point-proposal', '/point-report'].includes(pathname)
                  ? 28
                  : modern
                    ? 32
                    : 25
              : 0,
          borderTopLeftRadius: routeCorners ? 25 : undefined,
          borderTopRightRadius: routeCorners ? 25 : undefined,
          borderBottomLeftRadius: routeCorners ? 50 : undefined,
          borderBottomRightRadius: routeCorners ? 50 : undefined,
        }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </View>
    </>
  );
}
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Kavivanar_400Regular: require('../assets/fonts/kavivanar/Kavivanar-Regular.ttf'),
    InknutAntiqua_400Regular: require('../assets/fonts/inknut-antiqua/InknutAntiqua-Regular.ttf'),
    InknutAntiqua_700Bold: require('../assets/fonts/inknut-antiqua/InknutAntiqua-Bold.ttf'),
    BackupNotoSans_300Light: require('../assets/fonts/noto-sans/NotoSans-Light.ttf'),
    BackupNotoSans_500Medium: require('../assets/fonts/noto-sans/NotoSans-Medium.ttf'),
    BackupNotoSans_400Regular: require('../assets/fonts/noto-sans/NotoSans-Regular.ttf'),
    BackupInter_300Light: require('../assets/fonts/inter-3.19/Inter-Light.otf'),
    BackupInter_400Regular: require('../assets/fonts/inter-3.19/Inter-Regular.otf'),
    BackupInter_500Medium: require('../assets/fonts/inter-3.19/Inter-Medium.otf'),
    BackupInter_600SemiBold: require('../assets/fonts/inter-3.19/Inter-SemiBold.otf'),
    BackupInter_700Bold: require('../assets/fonts/inter-3.19/Inter-Bold.otf'),
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Inter_400Regular,
    Inter_700Bold,
    Inter_600SemiBold,
    Inter_500Medium,
    Roboto_400Regular,
    Roboto_500Medium,
    Mulish_700Bold,
    Mulish_300Light,
    Roboto_800ExtraBold,
    Poppins_300Light,
    Poppins_500Medium,
    Poppins_400Regular,
    Poppins_700Bold,
    Mulish_400Regular,
  });
  if (!fontsLoaded && !fontError) return null;
  return (
    <SafeAreaProvider>
      <AppProviders>
        <Navigation />
      </AppProviders>
    </SafeAreaProvider>
  );
}
