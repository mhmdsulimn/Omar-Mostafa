'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Headset, MessageSquare, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import type { Student, AppSettings } from '@/lib/data';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

const WhatsAppIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.79.52 3.48 1.47 4.94L2 22l5.25-1.38c1.41.87 3.02 1.38 4.79 1.38h.01c5.46 0 9.91-4.45 9.91-9.91 0-5.46-4.45-9.91-9.91-9.91zM18.1 16.51c-.14-.28-.52-.45-.78-.52-.26-.07-1.52-.75-1.75-.83s-.39-.14-.56.14c-.17.28-.66.83-.81.99-.15.17-.29.19-.54.06s-1.05-.38-2-1.23c-.74-.66-1.23-1.47-1.38-1.72s-.03-.39.11-.51c.13-.13.28-.34.42-.51.14-.17.19-.28.28-.47.09-.19.05-.36-.02-.51s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.42h-.48c-.17 0-.45.09-.68.34-.23.25-.87.85-.87 2.07s.9 2.4.99 2.57.87 1.33 2.08 1.84c.31.13.56.21.75.26.33.09.65.07.87-.04.25-.13.78-.31.89-.62.11-.3.11-.56.08-.62s-.11-.14-.26-.25z" />
    </svg>
  );

const gradeMap: Record<Student['grade'], string> = {
    first_secondary: 'الصف الأول الثانوي',
    second_secondary: 'الصف الثاني الثانوي',
    third_secondary: 'الصف الثالث الثانوي',
};

export default function SupportPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [problemDescription, setProblemDescription] = React.useState('');

  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [user, firestore]
  );
  const { data: studentData, isLoading: isStudentDataLoading } = useDoc<Student>(userDocRef);

  const settingsDocRef = useMemoFirebase(() => (firestore ? doc(firestore, 'settings', 'global') : null), [firestore]);
  const { data: appSettings, isLoading: isLoadingSettings } = useDoc<AppSettings>(settingsDocRef);
  
  const handleSendWhatsApp = () => {
      if (!studentData) return;

      const fullName = `${studentData.firstName} ${studentData.lastName}`;
      const grade = studentData.grade ? gradeMap[studentData.grade] : 'غير محدد';

      const supportPhoneNumber = appSettings?.supportPhoneNumber || '201090404090';

      const message = `
**بيانات الطالب:**
- الاسم: ${fullName}
- البريد الإلكتروني: ${studentData.email}
- الصف: ${grade}

**المشكلة:**
${problemDescription}
      `.trim();
      
      const whatsappUrl = `https://wa.me/${supportPhoneNumber}?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  }

  const isLoading = isStudentDataLoading || isLoadingSettings;

  return (
    <div className="relative -mx-3 md:-mx-6 -mt-3 md:-mt-6 -mb-3 md:-mb-6 min-h-[calc(100vh-80px)] md:min-h-[calc(100vh-100px)] flex flex-col items-center justify-center overflow-hidden p-6 bg-background transition-colors duration-500">
      
      {/* Cinematic Background Elements - Enhanced Colors & Animation */}
      <div className="absolute inset-0 pointer-events-none select-none z-0">
        {/* Animated Blobs with Neon Palette */}
        <div className="absolute top-[-10%] left-[-5%] h-[35rem] w-[35rem] rounded-full bg-primary/10 dark:bg-primary/20 filter blur-[100px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-5%] h-[30rem] w-[30rem] rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 filter blur-[90px] animate-blob [animation-delay:-4s]"></div>
        <div className="absolute top-[30%] right-[-10%] h-[25rem] w-[25rem] rounded-full bg-fuchsia-500/10 dark:bg-fuchsia-500/15 filter blur-[110px] animate-blob [animation-delay:-2s]"></div>
        <div className="absolute bottom-[20%] left-[-10%] h-[20rem] w-[20rem] rounded-full bg-indigo-600/10 dark:bg-indigo-600/15 filter blur-[80px] animate-blob [animation-delay:-6s]"></div>
        
        {/* Cinematic Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl flex flex-col gap-6 animate-fade-in py-10">
        <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 mb-2 animate-pulse-soft">
                <Headset className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight drop-shadow-sm">الدعم الفني</h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto">
                نحن هنا لمساعدتك! صِف مشكلتك وسنقوم بتوجيهك مباشرة لفريق الدعم عبر واتساب.
            </p>
        </div>

        <Card className="rounded-3xl border-white/20 dark:border-white/10 bg-card/60 dark:bg-card/30 backdrop-blur-2xl shadow-2xl overflow-hidden">
            <CardHeader className="border-b border-white/10 pb-6">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">أرسل استفسارك</CardTitle>
                </div>
                <CardDescription>
                    سيتم إرفاق بياناتك الدراسية تلقائياً مع الرسالة.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                {isLoading ? (
                    <div className='flex flex-col items-center justify-center h-48 gap-4'>
                        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
                        <p className="text-xs text-muted-foreground italic">جارِ تحضير بيانات الطالب...</p>
                    </div>
                ) : (
                    <div className='space-y-4'>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="problem-description" className="text-xs font-bold uppercase tracking-wider opacity-70">وصف المشكلة بالتفصيل</Label>
                            <Badge variant="outline" className="text-[10px] gap-1 px-2 border-primary/20 bg-primary/5 text-primary">
                                <Sparkles className="h-2 w-2" />
                                رد سريع
                            </Badge>
                        </div>
                        <Textarea
                            id="problem-description"
                            placeholder="اكتب هنا كل ما يخص المشكلة التي تواجهك ليتمكن فريقنا من مساعدتك بسرعة..."
                            value={problemDescription}
                            onChange={(e) => setProblemDescription(e.target.value)}
                            rows={6}
                            className="rounded-2xl bg-background/50 border-white/10 focus-visible:ring-primary/20 transition-all resize-none text-right leading-relaxed"
                        />
                    </div>
                )}
            </CardContent>
            <CardFooter className="bg-black/5 p-6 border-t border-white/5">
                <Button
                    onClick={handleSendWhatsApp}
                    disabled={isLoading || !problemDescription || !studentData}
                    className="w-full h-14 text-lg font-bold rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-[0_10px_20px_-5px_rgba(37,211,102,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] gap-3"
                >
                    {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <WhatsAppIcon />}
                    <span>إرسال عبر واتساب الآن</span>
                </Button>
            </CardFooter>
        </Card>

        <div className="flex items-center justify-center gap-6 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
            <p className="text-[10px] md:text-xs font-medium uppercase tracking-widest">متاح 24/7 لخدمتكم</p>
        </div>
      </div>
    </div>
  );
}
