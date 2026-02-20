import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

export function useHaptics() {
  const trigger = useCallback(
    (
      type: Haptics.ImpactFeedbackStyle | Haptics.NotificationFeedbackType
    ) => {
      if (
        Object.values(Haptics.ImpactFeedbackStyle).includes(
          type as Haptics.ImpactFeedbackStyle
        )
      ) {
        Haptics.impactAsync(type as Haptics.ImpactFeedbackStyle);
      } else if (
        Object.values(Haptics.NotificationFeedbackType).includes(
          type as Haptics.NotificationFeedbackType
        )
      ) {
        Haptics.notificationAsync(type as Haptics.NotificationFeedbackType);
      }
    },
    []
  );

  const success = useCallback(() => {
    trigger(Haptics.NotificationFeedbackType.Success);
  }, [trigger]);

  const warning = useCallback(() => {
    trigger(Haptics.NotificationFeedbackType.Warning);
  }, [trigger]);

  const error = useCallback(() => {
    trigger(Haptics.NotificationFeedbackType.Error);
  }, [trigger]);

  const light = useCallback(() => {
    trigger(Haptics.ImpactFeedbackStyle.Light);
  }, [trigger]);

  const medium = useCallback(() => {
    trigger(Haptics.ImpactFeedbackStyle.Medium);
  }, [trigger]);

  const heavy = useCallback(() => {
    trigger(Haptics.ImpactFeedbackStyle.Heavy);
  }, [trigger]);

  const selection = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  return { success, warning, error, light, medium, heavy, selection };
}
