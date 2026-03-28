'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Student } from '@/lib/data';
import { LoadingAnimation } from '@/components/ui/loading-animation';

export default function StudentProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [grade, setGrade] = useState<Student['grade'] | ''>('');

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: studentData, isLoading: isStudentDataLoading } = useDoc<Student>(userDocRef);

  useEffect(() => {
    if (studentData) {
      setGrade(studentData.grade);
      setFullName(`${studentData.firstName} ${studentData.lastName}`.trim());
    }
    if(user) {
        setEmail(user.email || '');
    }
  }, [studentData, user]);

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // منع الحروف غير العربية والمسافات فورياً
    const filteredValue = value.replace(/[^\u0600-\u06FF\s]/g, '');
    setFullName(filteredValue);
  };

  const handleSaveChanges = async () => {
    if (!user || !firestore || !studentData) return;

    if (!fullName.trim()) {
        toast({ variant: 'destructive', title: 'الاسم مطلوب' });
        return;
    }

    setIsSaving(true);
    const gradeHasChanged = grade && grade !== studentData.grade;

    try {
      const trimmedName = fullName.trim();
      const [firstName, ...lastNameParts] = trimmedName.split(' ');
      const lastName = lastNameParts.join(' ');
      
      const userDataToUpdate: Partial<Student> = {
        id: user.uid,
        firstName: firstName || '',
        lastName: lastName || '',
        grade: grade as Student['grade'],
      };

      if (gradeHasChanged) {
        const batch = writeBatch(firestore);

        const studentExamsRef = collection(firestore, 'users', user.uid, 'studentExams');
        const studentExamsSnap = await getDocs(studentExamsRef);
        studentExamsSnap.forEach(doc => batch.delete(doc.ref));

        const studentCoursesRef = collection(firestore, 'users', user.uid, 'studentCourses');
        const studentCoursesSnap = await getDocs(studentCoursesRef);
        for (const courseDoc of studentCoursesSnap.docs) {
            batch.delete(courseDoc.ref);
            const progressRef = collection(courseDoc.ref, 'progress');
            const progressSnap = await getDocs(progressRef);
            progressSnap.forEach(progressDoc => batch.delete(progressDoc.ref));
        }

        userDataToUpdate.rewardedExams = [];
        batch.set(userDocRef!, userDataToUpdate, { merge: true });
        await batch.commit();
        
        toast({
          title: 'تم تحديث الملف الشخصي بنجاح!',
          description: 'تم تغيير صفك الدراسي ومسح اشتراكاتك ونتائجك السابقة للبدء من جديد.',
        });

      } else {
        await setDoc(userDocRef!, userDataToUpdate, { merge: true });
        toast({
            title: 'تم تحديث الملف الشخصي',
            description: 'تم حفظ معلوماتك بنجاح.',
        });
      }

      if (trimmedName !== user.displayName) {
          await updateProfile(user, { displayName: trimmedName });
      }

    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast({
        variant: 'destructive',
        title: 'فشل تحديث الملف الشخصي',
        description: error.message || 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isUserLoading || isStudentDataLoading;

  if (isLoading || !user) {
    return (
        <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '50vh' }}>
            <LoadingAnimation size="md" />
        </div>
    );
  }

  return (
    <>
      <div className="flex items-center mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">الملف الشخصي</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>تعديل الملف الشخصي</CardTitle>
          <CardDescription>
            قم بتحديث معلوماتك. يرجى استخدام <span className="font-bold text-primary">اللغة العربية</span> لكتابة الاسم.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
             <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl font-bold">{fullName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
              </Avatar>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">الاسم (باللغة العربية)</Label>
            <Input
              id="name"
              value={fullName}
              onChange={handleFullNameChange}
              placeholder="اكتب اسمك بالعربي فقط"
              disabled={isSaving}
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled 
                dir="ltr"
                className="text-left placeholder:text-left"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">الصف الدراسي</Label>
              <Select dir="rtl" value={grade} onValueChange={(value) => setGrade(value as Student['grade'])} disabled={isSaving}>
                <SelectTrigger id="grade">
                  <SelectValue placeholder="اختر صفك الدراسي" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_secondary">الصف الأول الثانوي</SelectItem>
                  <SelectItem value="second_secondary">الصف الثاني الثانوي</SelectItem>
                  <SelectItem value="third_secondary">الصف الثالث الثانوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'جارِ الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
