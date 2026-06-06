import PWAInstallBanner from '@/components/PWAInstallBanner';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PWAInstallBanner />
      {children}
    </>
  );
}
