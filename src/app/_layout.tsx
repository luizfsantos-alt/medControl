import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { init } from '../data/store';
import { iniciarAvisos } from '../notifications/effects';
import { FONTES, useCores } from '../ui/tema';
import { ToastProvider } from '../ui/Toast';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Raiz() {
  const c = useCores();
  const [fontes] = useFonts(FONTES);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    init();
    iniciarAvisos();
    setPronto(true);
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.paper).catch(() => {});
  }, [c.paper]);

  useEffect(() => {
    if (fontes && pronto) SplashScreen.hideAsync().catch(() => {});
  }, [fontes, pronto]);

  if (!fontes || !pronto) return <View style={{ flex: 1, backgroundColor: c.paper }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style={c.escuro ? 'light' : 'dark'} />
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.paper }, animation: 'none' }} />
      </ToastProvider>
    </SafeAreaProvider>
  );
}
