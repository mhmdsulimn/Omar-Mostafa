'use client';

import * as React from 'react';
import { chatWithAdmin } from '@/ai/flows/admin-assistant';
import { generateSpeech } from '@/ai/flows/text-to-speech';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Trash2, SendHorizontal, BrainCircuit, Volume2, PauseCircle, Copy, Check, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, collectionGroup, doc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import type { Student, Course, Exam, DepositRequest, StudentExam, Announcement, AppSettings, Question } from '@/lib/data';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';

type Message = {
  role: 'user' | 'model';
  content: string;
  image?: string;
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = React.useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "تم النسخ!", description: "تم نسخ رد تسلا بنجاح." });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary transition-colors"
      onClick={handleCopy}
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
};

const ListenButton = ({ text, onActivityChange }: { text: string; onActivityChange: (active: boolean) => void }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    onActivityChange(isPlaying || isLoading);
  }, [isPlaying, isLoading, onActivityChange]);

  const handleToggle = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setIsLoading(true);
    try {
      const { media } = await generateSpeech(text);
      const audio = new Audio(media);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Audio generation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 rounded-full", isPlaying ? "text-primary animate-pulse" : "text-muted-foreground")}
      onClick={handleToggle}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isPlaying ? <PauseCircle className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );
};

const MessageActions = ({ text }: { text: string }) => {
  const [isAudioActive, setIsAudioActive] = React.useState(false);
  return (
    <div className={cn("absolute -bottom-8 left-0 flex items-center gap-1 transition-opacity duration-300 z-10", isAudioActive ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
      <CopyButton text={text} />
      <ListenButton text={text} onActivityChange={setIsAudioActive} />
    </div>
  );
};

const TypewriterMessage = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = React.useState('');
  const [isDone, setIsDone] = React.useState(false);

  React.useEffect(() => {
    setDisplayedText('');
    setIsDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setIsDone(true);
        if (onComplete) onComplete();
      }
    }, 10); 
    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="prose dark:prose-invert prose-sm max-w-none relative">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedText}</ReactMarkdown>
    </div>
  );
};

export default function AdminAssistantPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isTyping, setIsTyping] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const studentsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'users') : null), [firestore, user]);
  const adminsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'roles_admin') : null), [firestore, user]);
  const coursesQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'courses') : null), [firestore, user]);
  const examsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'exams') : null), [firestore, user]);
  const allQuestionsQuery = useMemoFirebase(() => (firestore && user ? collectionGroup(firestore, 'questions') : null), [firestore, user]);
  const allPaymentsQuery = useMemoFirebase(() => (firestore && user ? collectionGroup(firestore, 'depositRequests') : null), [firestore, user]);
  const recentSubmissionsQuery = useMemoFirebase(() => (firestore && user ? query(collectionGroup(firestore, 'studentExams')) : null), [firestore, user]);
  const announcementsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'announcements') : null), [firestore, user]);
  const settingsDocRef = useMemoFirebase(() => (firestore && user ? doc(firestore, 'settings', 'global') : null), [firestore, user]);

  const { data: students } = useCollection<Student>(studentsQuery, { ignorePermissionErrors: true });
  const { data: adminRoles } = useCollection<{id: string, promotedBy: string, date: string}>(adminsQuery, { ignorePermissionErrors: true });
  const { data: courses } = useCollection<Course>(coursesQuery, { ignorePermissionErrors: true });
  const { data: exams } = useCollection<Exam>(examsQuery, { ignorePermissionErrors: true });
  const { data: allQuestions } = useCollection<Question>(allQuestionsQuery, { ignorePermissionErrors: true });
  const { data: allPayments } = useCollection<DepositRequest>(allPaymentsQuery, { ignorePermissionErrors: true });
  const { data: recentSubmissions } = useCollection<StudentExam>(recentSubmissionsQuery, { ignorePermissionErrors: true });
  const { data: announcements } = useCollection<Announcement>(announcementsQuery, { ignorePermissionErrors: true });
  const { data: appSettings } = useDoc<AppSettings>(settingsDocRef);

  const richPlatformData = React.useMemo(() => {
    if (!students || !adminRoles || !appSettings) return undefined;
    
    const adminIdsMap = new Map(adminRoles.map(r => [r.id, r]));
    const actualStudents = students.filter(s => !adminIdsMap.has(s.id));
    const adminList = students.filter(s => adminIdsMap.has(s.id)).map(s => ({
        ...s,
        promotedBy: adminIdsMap.get(s.id)?.promotedBy || 'غير معروف',
        date: adminIdsMap.get(s.id)?.date || 'غير معروف'
    }));
    
    const studentsSummary = actualStudents.map(s => ({
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        grade: s.grade,
        balance: s.balance,
        isBanned: s.isBanned || false
    }));

    // تجميع بنك الأسئلة لكل امتحان بشكل مفصل
    const questionsByExam = new Map<string, any[]>();
    allQuestions?.forEach(q => {
        const list = questionsByExam.get(q.examId) || [];
        const correctText = q[q.correctAnswer as keyof Question] || "غير محدد";
        list.push({ 
            text: q.text, 
            options: [q.option1, q.option2, q.option3, q.option4],
            correctAnswer: correctText, 
            points: q.points 
        });
        questionsByExam.set(q.examId, list);
    });

    const examsSummary = exams?.map(e => ({ 
        title: e.title, 
        duration: e.duration, 
        questionCount: e.questionCount, 
        grade: e.grade, 
        isPrivate: e.isPrivate,
        questions: (questionsByExam.get(e.id) || []).slice(0, 100) // إرسال كامل محتوى بنك الأسئلة
    }));

    const resultsSummary = recentSubmissions?.map(sub => {
        const student = students.find(s => s.id === sub.studentId);
        const exam = exams?.find(e => e.id === sub.examId);
        return {
            studentName: student ? `${student.firstName} ${student.lastName}` : "غير معروف",
            examTitle: exam?.title || "غير معروف",
            score: sub.score,
            submissionDate: sub.submissionDate ? new Date(sub.submissionDate).toLocaleDateString('ar-EG') : 'N/A'
        };
    }).sort((a,b) => b.score - a.score).slice(0, 30);

    const totalBalance = actualStudents.reduce((acc, s) => acc + (s.balance || 0), 0);
    const gradeStats = {
        first_secondary: actualStudents.filter(s => s.grade === 'first_secondary').length,
        second_secondary: actualStudents.filter(s => s.grade === 'second_secondary').length,
        third_secondary: actualStudents.filter(s => s.grade === 'third_secondary').length,
    };

    return {
        students: studentsSummary,
        admins: adminList.map(a => ({ firstName: a.firstName, lastName: a.lastName, promotedBy: a.promotedBy, date: a.date })),
        courses: courses?.map(c => ({ title: c.title, price: c.price, grade: c.grade, isPublished: c.isPublished })),
        exams: examsSummary,
        payments: allPayments?.map(p => ({ studentName: p.studentName, amount: p.amount, senderPhoneNumber: p.senderPhoneNumber, status: p.status, reviewerNotes: p.reviewerNotes || 'لا يوجد' })),
        announcements: announcements?.map(a => ({ message: a.message, targetGrade: a.targetGrade, isActive: a.isActive })),
        recentResults: resultsSummary,
        settings: appSettings,
        systemStats: {
            totalBalance,
            pendingPaymentsCount: allPayments?.filter(p => p.status === 'pending').length || 0,
            studentsPerGrade: gradeStats
        }
    };
  }, [students, adminRoles, courses, exams, allQuestions, allPayments, recentSubmissions, announcements, appSettings]);

  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  React.useEffect(() => {
    if (messages.length === 0 && user && richPlatformData) {
      const name = user.displayName?.split(' ')[0] || 'أستاذي';
      setIsTyping(true);
      setMessages([{ 
        role: 'model', 
        content: `أهلاً بك يا ${name}، أنا تسلا (نسخة المسؤول). راداري الآن مطلع على "كل كبيرة وصغيرة" في قاعدة بياناتك؛ من إعدادات المنصة، للمسؤولين، لطلبات الدفع، للطلاب، وصولاً لمحتوى الأسئلة والإجابات النموذجية داخل كافة الامتحانات. كيف يمكنني خدمتك في التحليل اليوم؟ 📊💎` 
      }]);
    }
  }, [messages.length, user, !!richPlatformData]);

  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, []);

  React.useEffect(() => { window.scrollTo(0, 0); scrollToBottom(); }, [messages, isLoading, scrollToBottom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = 'inherit';
    target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
    setInput(target.value);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    try {
      const options = { maxSizeMB: 0.1, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => { setSelectedImage(reader.result as string); setIsCompressing(false); };
      reader.readAsDataURL(compressedFile);
    } catch (error) { console.error(error); setIsCompressing(false); }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading || isTyping || cooldown > 0) return;
    const userMessage = input.trim();
    const currentImage = selectedImage;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '40px'; 
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    const newMessages = [...messages, { role: 'user', content: userMessage, image: currentImage } as Message];
    setMessages(newMessages);
    setIsLoading(true);
    setCooldown(5);
    try {
      const response = await chatWithAdmin({
        message: userMessage || "أريد تحليلاً شاملاً للمنصة",
        photoDataUri: currentImage || undefined,
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
        adminInfo: { 
            name: user?.displayName || 'المسؤول', 
            fullData: richPlatformData 
        }
      });
      setIsTyping(true);
      setMessages([...newMessages, { role: 'model', content: response.text }]);
    } catch (error) {
      setIsTyping(false);
      setMessages([...newMessages, { role: 'model', content: "عذراً يا أستاذي، حدثت مشكلة في الاتصال بعقل تسلا. الرجاء المحاولة مرة أخرى." }]);
    } finally { setIsLoading(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl border border-primary/20"><BrainCircuit className="h-6 w-6 text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold md:text-2xl">خبير المنصة الشامل (تسلا)</h1>
            <p className="text-xs text-muted-foreground">مطلع على الإعدادات، الدفع، المسؤولين، والطلاب وبنوك الأسئلة</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMessages([{ role: 'model', content: `أهلاً بك مجدداً يا أستاذي. البيانات محدثة وجاهز لأي تحليل دقيق من قبل تسلا.` }])}><Trash2 className="h-5 w-5" /></Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none md:border md:shadow-lg bg-transparent md:bg-card">
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea ref={scrollRef} className="h-full p-4 md:p-6">
            <div className="space-y-10">
              {messages.map((m, index) => (
                <div key={index} className={cn("flex w-full items-start gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                  <Avatar className={cn("h-9 w-9 border-2 flex items-center justify-center overflow-hidden", m.role === 'model' ? "bg-primary text-primary-foreground border-primary/20" : "bg-muted border-border")}>
                    {m.role === 'model' ? <BrainCircuit className="h-5 w-5" /> : <AvatarFallback>{user?.displayName?.charAt(0) || 'أ'}</AvatarFallback>}
                  </Avatar>
                  <div className="flex flex-col gap-3 max-w-[85%]">
                    {m.image && (
                      <div className={cn("relative rounded-2xl overflow-hidden border shadow-md bg-muted/30 aspect-video w-full max-w-md", m.role === 'user' ? "border-primary/20" : "border-border")}>
                        <Image src={m.image} alt="Upload" fill className="object-cover" />
                      </div>
                    )}
                    <div className={cn(
                      "relative rounded-2xl px-4 py-2.5 text-sm shadow-sm whitespace-pre-wrap group", 
                      m.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted/50 border border-border/50 rounded-tl-none"
                    )}>
                      {m.role === 'model' ? (
                        <>
                          {index === messages.length - 1 ? <TypewriterMessage text={m.content} onComplete={() => { setIsTyping(false); scrollToBottom(); textareaRef.current?.focus(); }} /> : <div className="prose dark:prose-invert prose-sm"><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown></div>}
                          {!isTyping && <MessageActions text={m.content} />}
                        </>
                      ) : m.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && <div className="flex w-full items-start gap-3 animate-pulse"><Avatar className="h-9 w-9 bg-primary/10 flex items-center justify-center"><BrainCircuit className="h-5 w-5 text-primary" /></Avatar><div className="bg-muted/50 rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-primary" /><span className="text-xs text-muted-foreground italic">تسلا يراجع كافة سجلات المنصة وبنوك الأسئلة...</span></div></div>}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 border-t bg-background/50 flex flex-col gap-3">
          {selectedImage && <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-primary shadow-lg group"><Image src={selectedImage} alt="Preview" fill className="object-cover" /><button onClick={() => setSelectedImage(null)} className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button></div>}
          <div className="flex w-full items-end gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
            
            <div className="relative flex-1">
              <Textarea 
                ref={textareaRef} 
                rows={1}
                placeholder="اسأل تسلا عن محتوى الامتحانات أو أي ركن في المنصة..." 
                value={input} 
                onChange={handleInputChange} 
                disabled={isLoading || isTyping || cooldown > 0} 
                className="w-full min-h-[40px] max-h-[150px] py-3 pl-12 pr-4 rounded-[28px] text-right bg-background/80 border-muted-foreground/20 shadow-sm resize-none overflow-y-hidden transition-all focus-visible:ring-primary/20" 
                dir="auto" 
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} 
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute left-2 bottom-1.5 h-8 w-8 rounded-full text-muted-foreground hover:text-primary transition-colors"
                onClick={() => fileInputRef.current?.click()} 
                disabled={isLoading || isCompressing}
              >
                {isCompressing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
            </div>
            
            <Button 
              type="button" 
              onClick={handleSend}
              disabled={isLoading || isTyping || (!input.trim() && !selectedImage) || cooldown > 0} 
              size="icon" 
              className="h-11 w-11 rounded-full shadow-lg shrink-0 bg-primary hover:bg-primary/90 transition-transform active:scale-95"
            >
              <SendHorizontal className="h-5 w-5 rotate-180" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
