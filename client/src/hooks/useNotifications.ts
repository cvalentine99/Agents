import { useCallback, useEffect, useState } from "react";

export type NotificationType =
  | "loop_complete"
  | "loop_failed"
  | "circuit_breaker_open"
  | "circuit_breaker_closed"
  | "iteration_milestone"
  | "stuck_detected";

interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  loopComplete: boolean;
  loopFailed: boolean;
  circuitBreakerOpen: boolean;
  circuitBreakerClosed: boolean;
  iterationMilestone: boolean;
  stuckDetected: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  sound: true,
  loopComplete: true,
  loopFailed: true,
  circuitBreakerOpen: true,
  circuitBreakerClosed: true,
  iterationMilestone: false,
  stuckDetected: true,
};

const NOTIFICATION_SOUNDS = {
  success: "/sounds/success.mp3",
  error: "/sounds/error.mp3",
  warning: "/sounds/warning.mp3",
  info: "/sounds/info.mp3",
};

export function useNotifications() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [settings, setSettings] = useState<NotificationSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    const stored = localStorage.getItem("notification_settings");
    return stored
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("notification_settings", JSON.stringify(settings));
  }, [settings]);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    } catch (_error) {
      console.error("Error requesting notification permission:", _error);
      return false;
    }
  }, []);

  const playSound = useCallback(
    (type: "success" | "error" | "warning" | "info") => {
      if (!settings.sound) return;

      try {
        const audio = new Audio(NOTIFICATION_SOUNDS[type]);
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Ignore autoplay restrictions
        });
      } catch (_err) {
        // Ignore sound errors
      }
    },
    [settings.sound]
  );

  const sendNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      body: string,
      options?: {
        icon?: string;
        tag?: string;
        requireInteraction?: boolean;
        actions?: { action: string; title: string }[];
      }
    ) => {
      if (!settings.enabled) return null;
      if (permission !== "granted") return null;

      // Check if this notification type is enabled
      const typeEnabled = {
        loop_complete: settings.loopComplete,
        loop_failed: settings.loopFailed,
        circuit_breaker_open: settings.circuitBreakerOpen,
        circuit_breaker_closed: settings.circuitBreakerClosed,
        iteration_milestone: settings.iterationMilestone,
        stuck_detected: settings.stuckDetected,
      }[type];

      if (!typeEnabled) return null;

      // Determine sound type
      const soundType = {
        loop_complete: "success" as const,
        loop_failed: "error" as const,
        circuit_breaker_open: "warning" as const,
        circuit_breaker_closed: "info" as const,
        iteration_milestone: "info" as const,
        stuck_detected: "warning" as const,
      }[type];

      playSound(soundType);

      // Create notification
      const notification = new Notification(title, {
        body,
        icon: options?.icon || "/logo.png",
        tag: options?.tag || type,
        requireInteraction:
          options?.requireInteraction ??
          (type === "loop_failed" || type === "circuit_breaker_open"),
        badge: "/badge.png",
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    },
    [permission, settings, playSound]
  );

  // Convenience methods for specific notification types
  const notifyLoopComplete = useCallback(
    (sessionName: string, iterations: number) => {
      return sendNotification(
        "loop_complete",
        "✅ RALPH Loop Complete!",
        `Session "${sessionName}" completed successfully after ${iterations} iterations.`,
        { requireInteraction: false }
      );
    },
    [sendNotification]
  );

  const notifyLoopFailed = useCallback(
    (sessionName: string, error: string) => {
      return sendNotification(
        "loop_failed",
        "❌ RALPH Loop Failed",
        `Session "${sessionName}" failed: ${error}`,
        { requireInteraction: true }
      );
    },
    [sendNotification]
  );

  const notifyCircuitBreakerOpen = useCallback(
    (sessionName: string, reason: string) => {
      return sendNotification(
        "circuit_breaker_open",
        "⚠️ Circuit Breaker OPEN",
        `Session "${sessionName}" paused: ${reason}`,
        { requireInteraction: true }
      );
    },
    [sendNotification]
  );

  const notifyCircuitBreakerClosed = useCallback(
    (sessionName: string) => {
      return sendNotification(
        "circuit_breaker_closed",
        "🔄 Circuit Breaker Recovered",
        `Session "${sessionName}" circuit breaker is now CLOSED and ready.`,
        { requireInteraction: false }
      );
    },
    [sendNotification]
  );

  const notifyIterationMilestone = useCallback(
    (sessionName: string, iteration: number, total: number) => {
      return sendNotification(
        "iteration_milestone",
        `📊 Iteration ${iteration}/${total}`,
        `Session "${sessionName}" reached iteration ${iteration}.`,
        { requireInteraction: false }
      );
    },
    [sendNotification]
  );

  const notifyStuckDetected = useCallback(
    (sessionName: string, reason: string) => {
      return sendNotification(
        "stuck_detected",
        "🔴 Stuck Detected",
        `Session "${sessionName}" appears stuck: ${reason}`,
        { requireInteraction: true }
      );
    },
    [sendNotification]
  );

  const updateSettings = useCallback(
    (updates: Partial<NotificationSettings>) => {
      setSettings(prev => ({ ...prev, ...updates }));
    },
    []
  );

  return {
    permission,
    settings,
    requestPermission,
    sendNotification,
    updateSettings,
    // Convenience methods
    notifyLoopComplete,
    notifyLoopFailed,
    notifyCircuitBreakerOpen,
    notifyCircuitBreakerClosed,
    notifyIterationMilestone,
    notifyStuckDetected,
  };
}
