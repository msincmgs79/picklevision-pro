export const metadata = { title: "Offline — PickleVision" };

export default function OfflinePage() {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>📡</div>
      <h1 className="page-title">You&apos;re offline</h1>
      <p className="page-sub" style={{ maxWidth: 440, margin: "10px auto 0" }}>
        PickleVision needs a connection to load matches and run analysis. Reconnect and
        try again — your saved matches will be right here waiting.
      </p>
    </div>
  );
}
