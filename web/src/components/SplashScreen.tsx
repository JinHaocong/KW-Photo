interface SplashScreenProps {
  visible?: boolean;
}

/**
 * Renders a boot overlay while the saved session is being restored.
 */
export const SplashScreen = ({ visible = true }: SplashScreenProps) => {
  return (
    <main className={`splash-screen ${visible ? 'splash-screen--visible' : 'splash-screen--hidden'}`}>
      <div className="brand-mark">MT</div>
      <strong>正在恢复会话</strong>
      <span>连接 MT Photos 服务端...</span>
    </main>
  );
};
