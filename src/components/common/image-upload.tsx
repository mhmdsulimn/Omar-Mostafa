
'use client';

import * as React from 'react';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

/**
 * دالة مستقلة لرفع الصور لـ ImgBB.
 * تقبل الـ apiKey كبارامتر اختياري، وتستخدم مفتاحاً افتراضياً إذا لم يتوفر.
 */
export async function uploadToImgBB(file: File, apiKey?: string): Promise<string> {
  const DEFAULT_KEY = '3940d136f148755904ab3afd4e73d825';
  const finalKey = apiKey || DEFAULT_KEY;
  
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${finalKey}`, {
    method: 'POST',
    body: formData,
  });

  const result = await response.json();
  if (result.success) {
    return result.data.url;
  } else {
    if (result.error?.message?.includes('Invalid API v1 key')) {
        throw new Error("مفتاح الرفع (API Key) غير صالح. يرجى تحديث المفتاح من إعدادات المنصة.");
    }
    throw new Error(result.error?.message || "فشل الرفع لخدمة الصور.");
  }
}

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void;
  defaultValue?: string;
  className?: string;
}

export function ImageUpload({ onImageSelect, defaultValue, className }: ImageUploadProps) {
  const { toast } = useToast();
  const [isCompressing, setIsCompressing] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(defaultValue || null);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        setError("يرجى اختيار ملف صورة صحيح.");
        return;
    }

    setError(null);
    setIsCompressing(true);

    const options = {
      maxSizeMB: 0.4,
      maxWidthOrHeight: 1200,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const localPreview = URL.createObjectURL(compressedFile);
      setPreviewUrl(localPreview);
      onImageSelect(compressedFile);
      setIsCompressing(false);
      toast({ title: 'تمت معالجة الصورة بنجاح.' });
    } catch (err: any) {
      console.error("Compression Error:", err);
      setError("حدث خطأ أثناء معالجة الصورة.");
      setIsCompressing(false);
    }
  };

  const removeImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onImageSelect(null);
    toast({ title: 'سيتم حذف الصورة من المنصة عند الحفظ.' });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-right block w-full text-xs font-bold opacity-70">صورة المرفق</Label>
        {previewUrl && !isCompressing && (
          <Button type="button" variant="ghost" size="sm" onClick={removeImage} className="text-destructive h-8 px-2 shrink-0">
            <X className="h-4 w-4 ml-1" /> إزالة
          </Button>
        )}
      </div>

      <div 
        onClick={() => !isCompressing && fileInputRef.current?.click()}
        className={cn(
          "relative group cursor-pointer border-2 border-dashed rounded-xl transition-all duration-300 min-h-[140px] flex flex-col items-center justify-center overflow-hidden",
          previewUrl ? "border-primary/50 bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5",
          isCompressing && "opacity-70 cursor-wait pointer-events-none"
        )}
      >
        {previewUrl ? (
          <div className="relative w-full h-32">
            <Image src={previewUrl} alt="Preview" fill className="object-contain p-2" unoptimized />
            {!isCompressing && (
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1 shadow-lg">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-muted-foreground group-hover:text-primary transition-colors">
            <Upload className="h-8 w-8" />
            <p className="text-xs font-medium">اضغط لرفع صورة من الجهاز</p>
          </div>
        )}

        {isCompressing && (
          <div className="absolute inset-0 bg-background/90 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 z-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
            <p className="text-xs font-bold text-center">جارِ الضغط...</p>
          </div>
        )}
      </div>

      {error && (
          <div className="flex items-start gap-2 text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-[10px] font-medium leading-relaxed">{error}</p>
          </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isCompressing} />
    </div>
  );
}
