"use client";

import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { Rocket } from "lucide-react";
import { LoadingAnimation } from "@/components/ui/loading-animation";

export default function WelcomePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <LoadingAnimation size="lg" />
      </div>
    );
  }

  const firstName = user?.displayName?.split(" ")[0] || "يا بطل";

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#02040a] text-center select-none font-body">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[5%] h-[40rem] w-[45rem] rounded-full bg-indigo-900/20 filter blur-[120px]"></div>
        <div className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[140%] h-[500px] bg-purple-600/30 rounded-[100%] blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[60%] h-[300px] bg-blue-600/10 rotate-12 rounded-[100%] blur-[100px]"></div>
      </div>

      <div className="relative z-10 max-w-2xl w-full flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in-95 duration-1000">
        {/* Main Welcome Animation */}
        <div className="w-64 h-64 md:w-[400px] md:h-[400px] drop-shadow-2xl">
          <ProjectComponent />
        </div>

        {/* Welcome Header */}
        <div className="space-y-4">
          <p className="text-white text-2xl md:text-3xl font-bold max-w-md mx-auto px-4">
            أهلاً بك يا {firstName} في رحلة التميز مع مستر عمر مصطفي! 🚀
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-4">
          <Button
            onClick={() => router.replace("/")}
            size="lg"
            className="h-14 md:h-16 px-12 md:px-20 text-lg md:text-xl font-bold rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-none ring-2 ring-white/10"
          >
            <span>ابدأ الآن</span>
            <Rocket className="mr-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 opacity-30 pointer-events-none">
        <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-slate-500">
          Mr Omar Mostafa
        </p>
      </div>
    </div>
  );
}

const ProjectComponent = () => {
  return (
    <DotLottieReact
      src="https://lottie.host/566a1c3b-689f-4fb2-a3bc-1d91c85c92c0/kIBRmbYWZo.lottie"
      loop
      autoplay
    />
  );
};
