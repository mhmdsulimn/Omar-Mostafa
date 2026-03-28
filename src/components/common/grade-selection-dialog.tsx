'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { Student } from '@/lib/data';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from 'firebase/auth';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface GradeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: {
    grade: Student['grade'];
    fullName: string;
  }) => Promise<void>;
  user: User | null;
}

export function GradeSelectionDialog({
  isOpen,
  onClose,
  onSave,
  user,
}: GradeSelectionDialogProps) {
  const [grade, setGrade] = React.useState<Student['grade'] | ''>('');
  const [fullName, setFullName] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // منع الحروف غير العربية والمسافات فورياً
    const filteredValue = value.replace(/[^\u0600-\u06FF\s]/g, '');
    setFullName(filteredValue);
  };

  const handleSave = async () => {
    if (!grade || !fullName.trim()) {
      toast({
        variant: 'destructive',
        title: 'البيانات ناقصة',
        description: 'يرجى كتابة الاسم بالعربي واختيار الصف.',
      });
      return;
    }

    if (fullName.trim().split(' ').length < 2) {
      toast({
        variant: 'destructive',
        title: 'الاسم غير مكتمل',
        description: 'يرجى كتابة الاسم ثنائياً على الأقل.',
      });
      return;
    }

    setIsSaving(true);
    await onSave({ grade: grade as Student['grade'], fullName: fullName.trim() });
    setIsSaving(false);
    setGrade('');
    setFullName('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isOpen && toast({ title: 'مطلوب إكمال التسجيل', variant: 'destructive' })}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
        <DialogHeader className="text-right">
          <DialogTitle>إكمال بيانات الطالب</DialogTitle>
          <DialogDescription>
            اكتب اسمك الكامل <span className="font-bold text-primary">باللغة العربية</span>، واختر صفك الدراسي.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-primary/10">
              <AvatarFallback className="text-2xl font-bold">{fullName.charAt(0) || '؟'}</AvatarFallback>
            </Avatar>
            <div className="w-full space-y-2">
              <Label className="text-right block">الاسم الكامل (بالعربي)</Label>
              <Input
                value={fullName}
                onChange={handleFullNameChange}
                placeholder="مثال: محمد احمد علي"
                disabled={isSaving}
                autoComplete="off"
                className="text-right h-12 rounded-xl"
              />
            </div>
          </div>
          <div className="space-y-2 text-right">
            <Label>الصف الدراسي</Label>
            <Select dir="rtl" value={grade} onValueChange={(v) => setGrade(v as any)} disabled={isSaving}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="اختر صفك" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="first_secondary">الصف الأول الثانوي</SelectItem>
                <SelectItem value="second_secondary">الصف الثاني الثانوي</SelectItem>
                <SelectItem value="third_secondary">الصف الثالث الثانوي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving || !grade || !fullName.trim()} className="w-full h-12 font-bold rounded-xl">
            {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'بدء الرحلة التعليمية'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
