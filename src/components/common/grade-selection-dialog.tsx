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
import { Loader2, Phone, UserRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from 'firebase/auth';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface GradeSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (details: {
    grade: Student['grade'];
    fullName: string;
    phoneNumber: string;
    parentPhoneNumber: string;
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
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [parentPhoneNumber, setParentPhoneNumber] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const filteredValue = value.replace(/[^\u0600-\u06FF\s]/g, '');
    setFullName(filteredValue);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'student' | 'parent') => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 11) {
      if (type === 'student') setPhoneNumber(value);
      else setParentPhoneNumber(value);
    }
  };

  const handleSave = async () => {
    if (!grade || !fullName.trim() || !phoneNumber || !parentPhoneNumber) {
      toast({
        variant: 'destructive',
        title: 'البيانات ناقصة',
        description: 'يرجى ملء كافة الحقول المطلوبة.',
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

    // اشتراط ١١ رقماً بالضبط
    if (phoneNumber.length !== 11 || parentPhoneNumber.length !== 11) {
      toast({
        variant: 'destructive',
        title: 'رقم هاتف غير صحيح',
        description: 'يجب أن يتكون رقم الهاتف من ١١ رقماً بالضبط.',
      });
      return;
    }

    setIsSaving(true);
    await onSave({ 
      grade: grade as Student['grade'], 
      fullName: fullName.trim(),
      phoneNumber,
      parentPhoneNumber
    });
    setIsSaving(false);
    setGrade('');
    setFullName('');
    setPhoneNumber('');
    setParentPhoneNumber('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isOpen && toast({ title: 'مطلوب إكمال التسجيل', variant: 'destructive' })}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-hide" onInteractOutside={(e) => e.preventDefault()} hideCloseButton>
        <DialogHeader className="text-right">
          <DialogTitle className="font-bold">إكمال بيانات الطالب</DialogTitle>
          <DialogDescription className="font-medium">
            أهلاً بك! يرجى إدخال بياناتك بدقة للانضمام لمنصة الأستاذ عمر مصطفى.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-4">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/10">
              <AvatarFallback className="text-xl font-bold">{fullName.charAt(0) || '؟'}</AvatarFallback>
            </Avatar>
            <div className="w-full space-y-2">
              <Label className="text-right block font-bold">الاسم الكامل (بالعربي)</Label>
              <Input
                value={fullName}
                onChange={handleFullNameChange}
                placeholder="مثال: محمد احمد علي"
                disabled={isSaving}
                autoComplete="off"
                className="text-right h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2 text-right">
            <Label className="font-bold">الصف الدراسي</Label>
            <Select dir="rtl" value={grade} onValueChange={(v) => setGrade(v as any)} disabled={isSaving}>
              <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue placeholder="اختر صفك" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="first_secondary" className="font-bold">الصف الأول الثانوي</SelectItem>
                <SelectItem value="second_secondary" className="font-bold">الصف الثاني الثانوي</SelectItem>
                <SelectItem value="third_secondary" className="font-bold">الصف الثالث الثانوي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2 text-right" dir="rtl">
              <Label className="font-bold flex items-center justify-start gap-2">
                <Phone className="h-3 w-3 text-primary" />
                رقم هاتف الطالب
              </Label>
              <Input
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e, 'student')}
                placeholder="01xxxxxxxxx"
                disabled={isSaving}
                className="text-center h-11 rounded-xl font-mono"
                dir="ltr"
              />
            </div>
            <div className="space-y-2 text-right" dir="rtl">
              <Label className="font-bold flex items-center justify-start gap-2">
                <UserRound className="h-3 w-3 text-primary" />
                رقم هاتف ولي الأمر
              </Label>
              <Input
                value={parentPhoneNumber}
                onChange={(e) => handlePhoneChange(e, 'parent')}
                placeholder="01xxxxxxxxx"
                disabled={isSaving}
                className="text-center h-11 rounded-xl font-mono"
                dir="ltr"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSaving || !grade || !fullName.trim() || !phoneNumber || !parentPhoneNumber} className="w-full h-12 font-bold rounded-xl shadow-lg">
            {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'بدء الرحلة التعليمية'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
