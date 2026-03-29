'use client';

import * as React from 'react';
import { chatWithMohamed } from '@/ai/flows/chat-assistant';
import { generateSpeech } from '@/ai/flows/text-to-speech';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, Loader2, Trash2, SendHorizontal, Timer, Volume2, PauseCircle, Copy, Check, X, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Student, StudentExam } from '@/lib/data';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
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
      toast({ title: "تم النسخ!", description: "تم نسخ النص إلى الحافظة بنجاح." });
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

const ListenButton = ({ text }: { text: string }) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

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
      className={cn("h-8 w-8 rounded-full transition-colors", isPlaying ? "text-primary animate-pulse" : "text-muted-foreground")}
      onClick={handleToggle}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isPlaying ? <PauseCircle className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
    </Button>
  );
};

const MessageActions = ({ text }: { text: string }) => {
  return (
    <div className="absolute -bottom-8 left-0 flex items-center gap-1 transition-opacity duration-300 z-10 opacity-100">
      <CopyButton text={text} />
      <ListenButton text={text} />
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
    }, 15);

    return () => clearInterval(interval);
  }, [text]);

  return (
    <div className="prose dark:prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-li:my-1 prose-strong:text-primary relative">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedText}</ReactMarkdown>
    </div>
  );
};

export default function AssistantPage() {
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

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: studentData, isLoading: isStudentDataLoading } = useDoc<Student>(userDocRef);

  const studentExamsQuery = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'studentExams') : null, [user, firestore]);
  const { data: exams } = useCollection<StudentExam>(studentExamsQuery);

  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const studentContextInfo = React.useMemo(() => {
    if (!studentData) return undefined;
    let performance = "لا توجد نتائج مسجلة.";
    if (exams && exams.length > 0) {
        const sortedExams = [...exams].sort((a,b) => new Date(b.submissionDate).getTime() - new Date(a.submissionDate).getTime()).slice(0, 3);
        performance = sortedExams.map(e => `${e.score}% بتاريخ ${new Date(e.submissionDate).toLocaleDateString('ar-EG')}`).join('، ');
    }
    return {
        name: studentData.firstName,
        grade: studentData.grade,
        recentPerformance: performance,
        balance: studentData.balance
    };
  }, [studentData, exams]);

  React.useEffect(() => {
    if (messages.length === 0 && studentData) {
      const name = studentData.firstName || 'يا بطل';
      setIsTyping(true);
      setMessages([{ 
        role: 'model', 
        content: `أهلاً بيك يا ${name}، أنا تسلا المساعد الذكي بتاعك. قولي أقدر أساعدك إزاي النهاردة؟ تقدر تسألني أي حاجة أو تبعتلي صورة سؤال واقف قدامك! 😊` 
      }]);
    }
  }, [messages.length, !!studentData]);

  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    target.style.height = 'inherit';
    target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
    setInput(target.value);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'ملف غير صالح', description: 'يرجى اختيار صورة فقط.' });
      return;
    }

    setIsCompressing(true);
    try {
      const options = { maxSizeMB: 0.1, maxWidthOrHeight: 1024, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setIsCompressing(false);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error("Compression error:", error);
      setIsCompressing(false);
    }
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
    setCooldown(8);

    try {
      const response = await chatWithMohamed({
        message: userMessage || "شرح هذه الصورة",
        photoDataUri: currentImage || undefined,
        history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        studentInfo: studentContextInfo
      });
      setIsTyping(true);
      setMessages([...newMessages, { role: 'model', content: response }]);
    } catch (error) {
      setIsTyping(false);
      setMessages([...newMessages, { role: 'model', content: "عذراً يا بطل، حصلت مشكلة في الاتصال. جرب كمان شوية." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl border border-primary/20">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold md:text-2xl">المساعد الذكي (تسلا)</h1>
            <p className="text-xs text-muted-foreground">صديقك الذكي في رحلة التفوق</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => {
          setMessages([{ role: 'model', content: `أهلاً بك مجدداً. كيف يمكنني مساعدتك؟` }]);
          textareaRef.current?.focus();
        }}>
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-none shadow-none md:border md:shadow-lg bg-transparent md:bg-card">
        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea ref={scrollRef} className="h-full p-4 md:p-6">
            <div className="space-y-10">
              {messages.map((m, index) => {
                const isLast = index === messages.length - 1;
                return (
                  <div key={index} className={cn("flex w-full items-start gap-3", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                    <Avatar className={cn("h-9 w-9 shadow-sm flex items-center justify-center overflow-hidden border-2", m.role === 'model' ? "bg-primary/10 border-primary/20" : "bg-muted border-border")}>
                      {m.role === 'model' ? (
                        <div className="flex h-full w-full items-center justify-center bg-primary/10"><Bot className="h-5 w-5 text-primary" /></div>
                      ) : (
                        <AvatarFallback className="text-sm font-bold flex items-center justify-center leading-none bg-muted text-foreground">
                          {studentData?.firstName?.charAt(0) || 'أ'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col gap-2 max-w-[85%]">
                      {m.image && (
                        <div className={cn("relative rounded-2xl overflow-hidden border shadow-md bg-muted/20 aspect-video w-full max-w-sm", m.role === 'user' ? "border-primary/20" : "border-border")}>
                          <Image src={m.image} alt="User upload" fill className="object-cover" />
                        </div>
                      )}
                      <div className={cn(
                        "relative rounded-2xl px-4 py-2 text-sm md:text-base shadow-sm whitespace-pre-wrap group", 
                        m.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted/50 border border-border/50 rounded-tl-none"
                      )}>
                        {m.role === 'model' ? (
                          <>
                            {isLast ? (
                              <TypewriterMessage text={m.content} onComplete={() => { setIsTyping(false); scrollToBottom(); textareaRef.current?.focus(); }} />
                            ) : (
                              <div className="prose dark:prose-invert prose-sm max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                              </div>
                            )}
                            {!isTyping && <MessageActions text={m.content} />}
                          </>
                        ) : (
                          m.content
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex w-full items-start gap-3 animate-pulse">
                  <Avatar className="h-9 w-9 bg-primary/10 flex items-center justify-center border-2 border-primary/20"><Bot className="h-5 w-5 text-primary" /></Avatar>
                  <div className="bg-muted/50 border border-border/50 rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground italic">تسلا بيفكر...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        <CardFooter className="p-4 border-t bg-background/50 backdrop-blur-sm flex flex-col gap-3">
          {selectedImage && (
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-primary shadow-lg group">
              <Image src={selectedImage} alt="Preview" fill className="object-cover" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-1 right-1 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          
          <div className="flex w-full items-end gap-2">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />

            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                rows={1}
                placeholder={cooldown > 0 ? `استنى ${cooldown}ث...` : "اسأل تسلا..."}
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
              {cooldown > 0 && <div className="absolute left-12 bottom-3 text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /><span className="text-[10px] font-mono">{cooldown}s</span></div>}
            </div>
            
            <Button 
              type="button" 
              onClick={handleSend}
              disabled={isLoading || isTyping || (!input.trim() && !selectedImage) || cooldown > 0} 
              size="icon" 
              className="h-11 w-11 rounded-full shadow-lg shrink-0 bg-primary hover:bg-primary/90 transition-transform active:scale-95"
            >
              <SendHorizontal className="h-5 w-5 rotate-180 text-primary-foreground" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
