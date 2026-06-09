export default function Custom500() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#05080f",
        color: "#e5eef7",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div>
        <p style={{ color: "#27f58a", fontSize: 12, fontWeight: 800, letterSpacing: 4 }}>
          SERVER ERROR
        </p>
        <h1 style={{ margin: "12px 0", fontSize: 32 }}>页面暂时不可用</h1>
        <p style={{ margin: 0, color: "#94a3b8" }}>请稍后刷新，或返回首页继续查看世界杯预测。</p>
      </div>
    </main>
  );
}
