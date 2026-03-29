'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Image as ImageIcon, Video, Layers, Camera, ArrowRight, Globe, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

const tools = [
  {
    id: 'imgbb',
    name: 'imgBB',
    description: 'رفع الصور والحصول على روابط مباشرة للأسئلة والكورسات.',
    url: 'https://imgbb.com/',
    icon: ImageIcon,
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    id: 'phet',
    name: 'تجارب PhET',
    description: 'المصدر الرئيسي لتجارب الفيزياء التفاعلية. اختر تجربة HTML5 وانسخ رابط الـ Embed لإضافته في قسم المعمل.',
    url: 'https://phet.colorado.edu/en/simulations/filter?subjects=physics&type=html',
    icon: FlaskConical,
    color: 'bg-cyan-500/10 text-cyan-600',
  },
  {
    id: 'postimages',
    name: 'Postimages',
    description: 'بديل سريع لرفع الصور بروابط دائمة.',
    url: 'https://postimg.cc/files',
    icon: Camera,
    color: 'bg-green-500/10 text-green-600',
  },
  {
    id: 'bunny',
    name: 'Bunny.net',
    description: 'لوحة التحكم في استضافة الفيديوهات والبث (CDN).',
    url: 'https://dash.bunny.net/stream',
    icon: Layers,
    color: 'bg-orange-500/10 text-orange-600',
  },
  {
    id: 'screenpal',
    name: 'ScreenPal',
    description: 'استضافه فيديوهات لا تزيد مدتها عن 15 دقيقه',
    url: 'https://screenpal.com/content/folders',
    icon: Video,
    color: 'bg-purple-500/10 text-purple-600',
  },
];

export default function AdminToolsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black md:text-4xl tracking-tight text-right">أدوات الإدارة</h1>
        <p className="text-muted-foreground text-sm font-medium text-right">كل ما تحتاجه لتجهيز محتوى المنصة. جميع الروابط تفتح في نافذة جديدة لضمان أفضل أداء.</p>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2">
        {tools.map((tool) => (
          <Card key={tool.id} className="flex flex-col border-2 border-transparent hover:border-primary/20 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group rounded-[2rem] bg-card/50 backdrop-blur-sm">
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-4 rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-md", tool.color)}>
                  <tool.icon className="h-7 w-7" />
                </div>
                <div className="text-muted-foreground/30">
                    <ExternalLink className="h-5 w-5" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black text-right">{tool.name}</CardTitle>
              <CardDescription className="text-sm font-medium leading-relaxed mt-2 line-clamp-2 text-right">
                {tool.description}
              </CardDescription>
            </CardHeader>
            <CardFooter className="p-6 pt-2 mt-auto">
              <Button 
                className="w-full font-black h-12 rounded-xl shadow-lg transition-all active:scale-95 gap-2" 
                asChild
              >
                <a href={tool.url} target="_blank" rel="noopener noreferrer">
                  <span>فتح الموقع</span>
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-[2rem]">
        <CardContent className="p-8 flex items-start gap-5">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary shrink-0">
            <Globe className="h-6 w-6" />
          </div>
          <div className="space-y-2 text-right">
            <p className="font-black text-primary text-lg">روابط خارجية مباشرة</p>
            <p className="text-muted-foreground text-sm leading-relaxed font-medium">
              تم إعداد هذه الروابط لتفتح في تبويبات مستقلة. هذا يضمن عدم وجود قيود أمنية على التصفح ويوفر لك المساحة الكاملة للعمل على الملفات التعليمية والرفع.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
