/**
 * Renders a minimal boot screen while the saved session is being restored.
 */
export const SplashScreen = () => {
  return (
    <main className="splash-screen">
      <div className="brand-mark">MT</div>
      <strong>正在恢复会话</strong>
      <span>连接 MT Photos 服务端...</span>
    </main>
  );
};
