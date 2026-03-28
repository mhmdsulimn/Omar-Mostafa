import { ModeToggle } from '@/components/mode-toggle';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 select-none font-body transition-colors duration-500">
      {/* Cinematic Background - Optimized for both modes */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft Animated Blobs - Enhanced for Light Mode vibrancy */}
        <div className="absolute top-[-10%] right-[-5%] h-[40rem] w-[45rem] rounded-full bg-primary/10 dark:bg-primary/10 filter blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] left-[-5%] h-[35rem] w-[40rem] rounded-full bg-cyan-500/10 dark:bg-cyan-500/10 filter blur-[100px] animate-blob [animation-delay:-4s]"></div>
        
        {/* Subtle Grid Pattern - More visible in Light Mode for texture */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      {/* Top Bar Actions */}
      <div className="absolute top-6 left-6 z-50 animate-in fade-in slide-in-from-top-2 duration-1000">
        <ModeToggle />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full flex justify-center items-center">
        {children}
      </div>

      {/* Footer Decoration */}
      <div className="absolute bottom-6 text-center z-10 opacity-30 dark:opacity-20">
        <p className="text-[9px] uppercase tracking-[0.3em] font-bold">Developed by Mohamed Suliman</p>
      </div>
    </div>
  );
}
