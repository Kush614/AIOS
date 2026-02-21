import { useWindowStore } from "../store/windowStore";

const LEVEL_COLOR: Record<string, string> = {
  info: "#58a6ff",
  warning: "#d29922",
  error: "#f85149",
  success: "#3fb950",
};

const LEVEL_ICON: Record<string, string> = {
  info: "ℹ",
  warning: "⚠",
  error: "✗",
  success: "✓",
};

export function NotificationStack() {
  const { notifications, dismissNotification } = useWindowStore();

  return (
    <div
      style={{
        position: "absolute",
        top: 36,
        right: 16,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      {notifications.map((n) => {
        const color = LEVEL_COLOR[n.level] ?? LEVEL_COLOR.info;
        return (
          <div
            key={n.id}
            onClick={() => dismissNotification(n.id)}
            style={{
              background: "#21262d",
              border: `1px solid ${color}`,
              borderRadius: 6,
              padding: "10px 14px",
              fontSize: 12,
              color: "#e6edf3",
              maxWidth: 320,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              pointerEvents: "auto",
              cursor: "pointer",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              animation: "aios-slide-in 0.2s ease",
            }}
          >
            <span style={{ color, flexShrink: 0 }}>{LEVEL_ICON[n.level]}</span>
            <span>{n.message}</span>
          </div>
        );
      })}

      <style>{`
        @keyframes aios-slide-in {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
