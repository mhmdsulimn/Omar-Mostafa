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
import { useUser, useFirestore } from '@/firebase';
import { updateProfile } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import type { Student } from '@/lib/data';
import { LoadingAnimation } from '@/components/ui/loading-animation';

export default function AdminProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = React.useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user && firestore) {
      setFullName(user.displayName || '');
      setEmail(user.email || '');

      const userDocRef = doc(firestore, 'users', user.uid);
      const unsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Student;
          setFullName(`${data.firstName} ${data.lastName}`.trim());
        }
      });
      return () => unsub();
    }
  }, [user, firestore]);

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // منع الحروف غير العربية والمسافات فورياً
    const filteredValue = value.replace(/[^\u0600-\u06FF\s]/g, '');
    setFullName(filteredValue);
  };

  const handleSaveChanges = async () => {
    if (!user || !firestore) return;

    if (!fullName.trim()) {
        toast({ variant: 'destructive', title: 'الاسم مطلوب' });
        return;
    }

    setIsSaving(true);
    try {
        const trimmedName = fullName.trim();
        const [firstName, ...lastNameParts] = trimmedName.split(' ');
        const lastName = lastNameParts.join(' ');
        
        const authUpdatePayload: { displayName?: string } = {};
        if (trimmedName !== user.displayName) {
            authUpdatePayload.displayName = trimmedName;
        }

        const firestoreUpdatePayload: Partial<Student> = {
            id: user.uid,
            firstName: firstName || '',
            lastName: lastName || '',
        };

        if (Object.keys(authUpdatePayload).length > 0) {
            await updateProfile(user, authUpdatePayload);
        }

        const userDocRef = doc(firestore, 'users', user.uid);
        await setDoc(userDocRef, firestoreUpdatePayload, { merge: true });

        toast({
            title: 'تم تحديث الملف الشخصي',
            description: 'تم حفظ معلوماتك بنجاح.',
        });
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

  if (isUserLoading || !user) {
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
          <CardTitle>تعديل الملف الشخصي للمسؤول</CardTitle>
          <CardDescription>
            قم بتحديث معلوماتك. يجب أن يكون الاسم <span className="font-bold text-primary">باللغة العربية</span> فقط.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative flex justify-center">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-2xl font-bold">{fullName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">الاسم الكامل (بالعربي)</Label>
            <Input
              id="name"
              value={fullName}
              onChange={handleFullNameChange}
              placeholder="اكتب اسمك بالعربي فقط"
              disabled={isSaving}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled 
              dir="ltr"
              className="text-left"
            />
          </div>
          <Button onClick={() => handleSaveChanges()} disabled={isSaving}>
            {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'جارِ الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
