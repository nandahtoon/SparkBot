import { useEffect, useRef } from 'react';
import {
  resolveAndroidBackAction,
  type AndroidBackAction,
  type AndroidBackState
} from '../game/androidApp';

/**
 * Bridges Android's hardware/gesture Back button (both in installed standalone PWA via popstate
 * and in native Capacitor Android APKs via Capacitor App plugin) to in-app navigation & modals.
 */
export function useAndroidBackButton(
  state: AndroidBackState,
  onBackAction: (action: AndroidBackAction) => void
): void {
  const stateRef = useRef(state);
  stateRef.current = state;
  const handlerRef = useRef(onBackAction);
  handlerRef.current = onBackAction;

  const isGuardActive = resolveAndroidBackAction(state) !== 'none';

  useEffect(() => {
    if (!isGuardActive) return;
    if (window.history.state?.sparkbotBackGuard !== true) {
      try {
        window.history.pushState({ sparkbotBackGuard: true }, '');
      } catch {
        // Ignore restricted iframe history environments
      }
    }
  }, [isGuardActive]);

  useEffect(() => {
    const dispatchBack = (): boolean => {
      const action = resolveAndroidBackAction(stateRef.current);
      if (action === 'none') return false;
      handlerRef.current(action);
      return true;
    };

    const onPopState = () => {
      const handled = dispatchBack();
      if (handled) {
        try {
          window.history.pushState({ sparkbotBackGuard: true }, '');
        } catch {
          // Ignore
        }
      }
    };

    window.addEventListener('popstate', onPopState);

    // Optional native Capacitor Android App plugin listener when packaged as an APK
    type CapListener = { remove?: () => void };
    let capHandle: CapListener | null = null;
    const capApp = (
      window as unknown as {
        Capacitor?: {
          Plugins?: {
            App?: {
              addListener?: (
                ev: string,
                cb: () => void
              ) => Promise<CapListener> | CapListener;
            };
          };
        };
      }
    ).Capacitor?.Plugins?.App;

    if (capApp?.addListener) {
      Promise.resolve(
        capApp.addListener('backButton', () => {
          dispatchBack();
        })
      )
        .then((handle) => {
          capHandle = handle;
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener('popstate', onPopState);
      capHandle?.remove?.();
    };
  }, []);
}
