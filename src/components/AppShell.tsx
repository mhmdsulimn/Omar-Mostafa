'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { Student } from '@/lib/data';
import { doc } from 'firebase/firestore';

/**
 * AppShell is a client-side component responsible for syncing the user's
 * theme preferences from Firestore to the browser's CSS variables and localStorage.
 * It does not render any UI itself, but wraps the main application content.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    // Memoize the document reference to prevent re-fetching on every render.
    const userDocRef = useMemoFirebase(
      () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
      [user, firestore]
    );
    const { data: studentData } = useDoc<Student>(userDocRef);

    // This effect syncs the theme from Firestore.
    // The initial, flicker-free theme application is handled by an inline script in layout.tsx.
    // This effect ensures that if the theme is changed in another tab, it syncs here.
    React.useEffect(() => {
      const root = document.documentElement;
      if (studentData) {
        const primaryColorHSL = studentData.theme?.primaryColor;
        if (primaryColorHSL) {
            // If the color in Firestore is different from localStorage, update it.
            if (localStorage.getItem('primary-color') !== primaryColorHSL) {
              localStorage.setItem('primary-color', primaryColorHSL);
            }
            const [h, s] = primaryColorHSL.split(' ');
            root.style.setProperty('--primary-h', h);
            root.style.setProperty('--primary-s', s);
        } else {
            // If no theme is set in Firestore, reset to the default.
            if (localStorage.getItem('primary-color')) {
                localStorage.removeItem('primary-color');
                root.style.removeProperty('--primary-h');
                root.style.removeProperty('--primary-s');
            }
        }
      } else if (!isUserLoading && !user) {
          // If the user is definitively logged out, clear the theme.
          if (localStorage.getItem('primary-color')) {
              localStorage.removeItem('primary-color');
              root.style.removeProperty('--primary-h');
              root.style.removeProperty('--primary-s');
          }
      }
    }, [studentData, isUserLoading, user]);

    return <>{children}</>;
}
