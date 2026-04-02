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
import { Loader2, Phone, UserRound } from 'lucide-react';
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [parentPhoneNumber, setParentPhoneNumber] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: studentData, isLoading: isStudentDataLoading } = useDoc<Student>(userDocRef);

  useEffect(() => {
    if (studentData && !hasInitialized) {
      setGrade(studentData.grade);
      setFullName(`${studentData.firstName} ${studentData.lastName}`.trim());
      setPhoneNumber(studentData.phoneNumber || '');
      setParentPhoneNumber(studentData.parentPhoneNumber || '');
      setHasInitialized(true);
    }
    if(user) {
        setEmail(user.email || '');
    }
  }, [studentData, user, hasInitialized]);

  const hasChanges = React.useMemo(() => {
    if (!studentData) return false;
    const dbFullName = `${studentData.firstName} ${studentData.lastName}`.trim();
    return (
      fullName.trim() !== dbFullName ||
      grade !== studentData.grade ||
      phoneNumber !== (studentData.phoneNumber || '') ||
      parentPhoneNumber !== (studentData.parentPhoneNumber || '')
    );
  }, [fullName, grade, phoneNumber, parentPhoneNumber, studentData]);

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

  const handleSaveChanges = async () => {
    if (!user || !firestore || !studentData) return;

    if (!fullName.trim() || !phoneNumber || !parentPhoneNumber) {
        toast({ variant: 'destructive', title: 'البيانات ناقصة', description: 'يرجى ملء كافة الحقول بما في ذلك أرقام الهواتف.' });
        return;
    }

    if (phoneNumber.length < 11 || parentPhoneNumber.length < 11) {
        toast({ variant: 'destructive', title: 'رقم هاتف غير صحيح', description: 'يجب أن يتكون رقم الهاتف من 11 رقم.' });
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
        phoneNumber: phoneNumber,
        parentPhoneNumber: parentPhoneNumber,
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
            progressSnap.forEach(progressDoc => progressDoc.ref && batch.delete(progressDoc.ref));
        }

        userDataToUpdate.rewardedExams = [];
        batch.set(userDocRef!, userDataToUpdate, { merge: true });
        await batch.commit();
        
        toast({
          title: 'تم تحديث الملف بنجاح!',
          description: 'تم تغيير الصف الدراسي ومسح البيانات القديمة لبدء صف جديد.',
        });

      } else {
        await setDoc(userDocRef!, userDataToUpdate, { merge: true });
        toast({
            title: 'تم حفظ التعديلات',
            description: 'تم تحديث بياناتك الشخصية بنجاح.',
        });
      }

      if (trimmedName !== user.displayName) {
          await updateProfile(user, { displayName: trimmedName });
      }

    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast({
        variant: 'destructive',
        title: 'فشل التحديث',
        description: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.',
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
        <h1 className="text-lg font-semibold md:text-2xl text-primary font-bold">تعديل الملف الشخصي</h1>
      </div>
      <Card className="rounded-2xl shadow-lg border-primary/5">
        <CardHeader className="text-right">
          <CardTitle className="font-bold">بياناتي الشخصية</CardTitle>
          <CardDescription className="font-medium">
            تأكد من دقة أرقام الهواتف لتلقي التحديثات الهامة.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
             <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                <AvatarFallback className="text-2xl font-bold">{fullName?.charAt(0) || '؟'}</AvatarFallback>
              </Avatar>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="font-bold">الاسم الكامل (باللغة العربية)</Label>
            <Input
              id="name"
              value={fullName}
              onChange={handleFullNameChange}
              placeholder="اكتب اسمك بالعربي فقط"
              disabled={isSaving}
              className="h-11 rounded-xl font-bold"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled 
                dir="ltr"
                className="text-left h-11 rounded-xl opacity-70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade" className="font-bold">الصف الدراسي</Label>
              <Select dir="rtl" value={grade} onValueChange={(value) => setGrade(value as Student['grade'])} disabled={isSaving}>
                <SelectTrigger id="grade" className="h-11 rounded-xl font-bold">
                  <SelectValue placeholder="اختر صفك الدراسي" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_secondary" className="font-bold">الصف الأول الثانوي</SelectItem>
                  <SelectItem value="second_secondary" className="font-bold">الصف الثاني الثانوي</SelectItem>
                  <SelectItem value="third_secondary" className="font-bold">الصف الثالث الثانوي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-primary/5">
            <div className="space-y-2 text-right">
              <Label htmlFor="phone" className="font-bold flex items-center justify-start gap-2" dir="rtl">رقم هاتف الطالب <Phone className="h-3 w-3 text-primary" /></Label>
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e, 'student')}
                placeholder="01xxxxxxxxx"
                disabled={isSaving}
                className="text-center h-11 rounded-xl font-mono"
                dir="ltr"
              />
            </div>
            <div className="space-y-2 text-right">
              <Label htmlFor="parentPhone" className="font-bold flex items-center justify-start gap-2" dir="rtl">رقم هاتف ولي الأمر <UserRound className="h-3 w-3 text-primary" /></Label>
              <Input
                id="parentPhone"
                value={parentPhoneNumber}
                onChange={(e) => handlePhoneChange(e, 'parent')}
                placeholder="01xxxxxxxxx"
                disabled={isSaving}
                className="text-center h-11 rounded-xl font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <Button onClick={handleSaveChanges} disabled={isSaving || !hasChanges} className="w-full md:w-auto px-8 h-12 font-bold rounded-xl shadow-md">
            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            حفظ التغييرات
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
