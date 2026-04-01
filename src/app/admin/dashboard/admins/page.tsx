'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, UserSearch, Search, Loader2, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
  setDocumentNonBlocking,
  deleteDocumentNonBlocking,
  useUser,
} from '@/firebase';
import { collection, doc, query, where, getDocs, documentId, setDoc } from 'firebase/firestore';
import type { Student } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LoadingAnimation } from '@/components/ui/loading-animation';

type AdminRole = { id: string, promotedBy: string, date: string };

function AddAdminDialog() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<Student[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState<string | null>(null); // store student id being saved
  const [isOpen, setIsOpen] = React.useState(false);

  // Fetch all students and admins once when dialog opens
  const [allStudents, setAllStudents] = React.useState<Student[]>([]);
  const [adminIds, setAdminIds] = React.useState<Set<string>>(new Set());
  const [isLoadingData, setIsLoadingData] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && firestore && user) {
      const fetchInitialData = async () => {
        setIsLoadingData(true);
        try {
            const usersSnapshot = await getDocs(collection(firestore, 'users'));
            const allUsers = usersSnapshot.docs.map(doc => ({ ...doc.data() as Student, id: doc.id }));
            
            const adminsSnapshot = await getDocs(collection(firestore, 'roles_admin'));
            const currentAdminIds = new Set(adminsSnapshot.docs.map(doc => doc.id));

            setAllStudents(allUsers);
            setAdminIds(currentAdminIds);
        } catch (e) {
            toast({ variant: 'destructive', title: 'فشل تحميل البيانات' });
        } finally {
            setIsLoadingData(false);
        }
      };
      fetchInitialData();
    }
  }, [isOpen, firestore, user, toast]);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
    }
    setIsSearching(true);
    const lowercasedTerm = searchTerm.toLowerCase().trim();
    const searchParts = lowercasedTerm.split(/\s+/).filter(p => p.length > 0);
    const nonAdmins = allStudents.filter(s => !adminIds.has(s.id));
    
    const results = nonAdmins.filter(student => {
        const firstName = (student.firstName || '').toLowerCase();
        const lastName = (student.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();
        const email = (student.email || '').toLowerCase();
        
        // تحسين البحث بالاسم الكامل المدمج (كلمات متعددة)
        return searchParts.every(part => 
            fullName.includes(part) || email.includes(part)
        );
    });

    setSearchResults(results.slice(0, 5)); // Limit to 5 results to keep UI clean
    if(results.length === 0) {
        toast({
            variant: 'destructive',
            title: 'لم يتم العثور على نتائج',
            description: 'لا يوجد طالب يطابق بحثك.',
        });
    }
    setIsSearching(false);
  };

  const handleMakeAdmin = async (studentToPromote: Student) => {
      if(!studentToPromote || !firestore) return;
      setIsSaving(studentToPromote.id);
      
      const adminRoleDoc = doc(firestore, 'roles_admin', studentToPromote.id);
      
      try {
        await setDocumentNonBlocking(adminRoleDoc, { promotedBy: 'admin_panel', date: new Date().toISOString() }, {});

        toast({
          title: 'تمت إضافة المسؤول بنجاح!',
          description: `${studentToPromote.firstName} ${studentToPromote.lastName} لديه الآن صلاحيات المسؤول.`,
        });
        
        // Optimistically update UI
        setAdminIds(prev => new Set(prev).add(studentToPromote.id));
        setSearchResults(prev => prev.filter(s => s.id !== studentToPromote.id));

      } catch (error) {
        toast({ variant: 'destructive', title: 'فشل الحفظ' });
      } finally {
        setIsSaving(null);
      }
  }

  // Reset state on close
  const onOpenChange = (open: boolean) => {
    if (!open) {
        setSearchTerm('');
        setSearchResults([]);
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            إضافة مسؤول
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إضافة مسؤول جديد</DialogTitle>
          <DialogDescription>
            ابحث عن طالب باستخدام اسمه أو بريده الإلكتروني لمنحه صلاحيات المسؤول.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-2">
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="الاسم أو البريد الإلكتروني..."
              className="flex-1"
              disabled={isLoadingData}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
             <Button onClick={handleSearch} disabled={isLoadingData || isSearching || !searchTerm} size="icon">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserSearch className="h-4 w-4" />}
                <span className="sr-only">بحث</span>
             </Button>
          </div>

          {isLoadingData && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

          {searchResults.length > 0 && (
              <div className="mt-4 max-h-60 overflow-y-auto rounded-lg border bg-muted p-2 space-y-2">
                  {searchResults.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-2 bg-background rounded-md">
                        <div className="text-right">
                            <p className="font-semibold">{student.firstName} {student.lastName}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                        <Button size="sm" onClick={() => handleMakeAdmin(student)} disabled={isSaving === student.id}>
                            {isSaving === student.id ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : 'جعله مسؤولاً'}
                        </Button>
                    </div>
                  ))}
              </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminRow({ admin }: { admin: Student }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const handleDeleteAdmin = () => {
    if (admin && firestore) {
      setIsDeleteDialogOpen(false);
      const adminDocRef = doc(firestore, 'roles_admin', admin.id);
      deleteDocumentNonBlocking(adminDocRef);
      toast({ title: 'تمت إزالة المسؤول بنجاح.', variant: 'default' });
    }
  };

  return (
    <>
      <TableRow>
        <TableCell className="text-right">
          <div className="flex items-center gap-3">
            <Avatar className="hidden h-9 w-9 sm:flex">
              <AvatarFallback>{admin.firstName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">
              {admin.firstName} {admin.lastName}
            </span>
          </div>
        </TableCell>
        <TableCell className="text-right">{admin.email}</TableCell>
        <TableCell className="text-center px-2">
           <Button
            variant="destructive"
            size="icon"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={admin.id === currentUser?.uid}
            title={admin.id === currentUser?.uid ? 'لا يمكنك إزالة نفسك' : 'إزالة المسؤول'}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">إزالة المسؤول</span>
          </Button>
        </TableCell>
      </TableRow>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              سيؤدي هذا إلى إزالة صلاحيات المسؤول من المستخدم{' '}
              <span className="font-bold">{admin?.firstName} {admin?.lastName}</span>.
              لن يتمكن من الوصول إلى لوحة تحكم المسؤول بعد الآن.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              إزالة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function AdminAdminsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  const [searchTerm, setSearchTerm] = React.useState('');
  
  const adminsCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'roles_admin') : null),
    [firestore, user]
  );
  // Using ignorePermissionErrors to prevent student redirection triggering global errors
  const { data: adminsRoles, isLoading: isLoadingAdmins } = useCollection<AdminRole>(adminsCollection, { ignorePermissionErrors: true });
  
  const adminIds = React.useMemo(() => adminsRoles?.map(role => role.id).filter(id => !!id) || [], [adminsRoles]);
  
  const adminsQuery = useMemoFirebase(
    () => {
      if (!firestore || !user || adminIds.length === 0) {
        return null;
      }
      return query(collection(firestore, 'users'), where(documentId(), 'in', adminIds));
    },
    [firestore, user, adminIds]
  );
  const { data: allAdminsData, isLoading: isLoadingDetails } = useCollection<Student>(adminsQuery, { ignorePermissionErrors: true });
  
  const filteredAdmins = React.useMemo(() => {
    if (!allAdminsData) {
        return [];
    }
    if (!searchTerm.trim()) {
      return allAdminsData;
    }
    const term = searchTerm.toLowerCase().trim();
    const searchParts = term.split(/\s+/).filter(p => p.length > 0);

    return allAdminsData.filter(admin => {
        const fullName = `${admin.firstName || ''} ${admin.lastName || ''}`.toLowerCase();
        const email = (admin.email || '').toLowerCase();
        
        return searchParts.every(part => 
            fullName.includes(part) || email.includes(part)
        );
    });
  }, [searchTerm, allAdminsData]);

  const isLoading = isLoadingAdmins || (adminIds.length > 0 && isLoadingDetails);
  
    if (isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center" style={{ minHeight: '60vh' }}>
                <LoadingAnimation size="md" />
            </div>
        );
    }

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-lg font-semibold md:text-2xl">المسؤولون</h1>
        <div className="ml-auto flex items-center gap-2">
            <AddAdminDialog />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-right">إدارة المسؤولين</CardTitle>
          <CardDescription className="text-right">
            قائمة بجميع المستخدمين الذين لديهم صلاحيات المسؤول في النظام.
          </CardDescription>
          <div className="relative mt-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="ابحث بالاسم أو البريد الإلكتروني..."
                className="pr-8 text-right"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredAdmins.length === 0 ? (
             <div className="text-center py-10">
              <p className="text-muted-foreground">
                {adminsRoles && adminsRoles.length > 0 ? 'لم يتم العثور على مسؤولين مطابقين للبحث.' : 'لا يوجد مسؤولون حاليًا.'}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-center">
                      الإجراءات
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdmins.map((admin) => (
                    <AdminRow key={admin.id} admin={admin} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
