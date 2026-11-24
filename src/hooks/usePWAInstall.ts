import { useCallback, useEffect, useState } from 'react';
import {
  detectMobilePlatform,
  isStandaloneDisplayMode,
  type MobilePlatform
} from '../game/androidApp';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface UsePWAInstallResult {
  isInstallable: boolean;
  isInstalled: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  platform: MobilePlatform;
  install: () => Promise<boolean>;
}

export function usePWAInstall(): UsePWAInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() =>
    typeof window !== 'undefined' ? isStandaloneDisplayMode(window) : false
  );
  const [platform, setPlatform] = useState<MobilePlatform>(() =>
    typeof navigator !== 'undefined' ? detectMobilePlatform(navigator.userAgent) : 'desktop'
  );

  useEffect(() => {
    setIsInstalled(isStandaloneDisplayMode(window));
    setPlatform(detectMobilePlatform(window.navigator.userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const mq = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      setIsInstalled(isStandaloneDisplayMode(window));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    mq?.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mq?.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [deferredPrompt]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isAndroid: platform === 'android',
    isIOS: platform === 'ios',
    platform,
    install
  };
}
