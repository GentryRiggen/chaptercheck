import * as Haptics from "expo-haptics";

export function hapticLight() {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // never crash
  }
}

export function hapticMedium() {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // never crash
  }
}

export function hapticHeavy() {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch {
    // never crash
  }
}

export function hapticSuccess() {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // never crash
  }
}

export function hapticSelection() {
  try {
    Haptics.selectionAsync();
  } catch {
    // never crash
  }
}
