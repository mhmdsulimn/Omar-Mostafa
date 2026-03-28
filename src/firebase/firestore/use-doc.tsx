'use client';
    
import { useState, useEffect, useRef } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

type WithId<T> = T & { id: string };

export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Optimized with a small delay to prevent Firebase Target ID conflicts (ID: ca9).
 */
export function useDoc<T = any>(
  memoizedDocRef: DocumentReference<DocumentData> | null | undefined,
  options?: { ignorePermissionErrors?: boolean }
): UseDocResult<T> {
  const [state, setState] = useState<UseDocResult<T>>({
    data: null,
    isLoading: !!memoizedDocRef,
    error: null,
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  // Track active path to prevent redundant subscriptions
  const activePathRef = useRef<string | null>(null);

  useEffect(() => {
    const docPath = memoizedDocRef?.path;
    
    // If path is the same as active, or ref is missing, don't restart
    if (!memoizedDocRef || !docPath) {
      setState({ data: null, isLoading: false, error: null });
      activePathRef.current = null;
      return;
    }

    if (docPath === activePathRef.current) return;

    setState(prev => (prev.isLoading ? prev : { ...prev, isLoading: true, error: null }));
    activePathRef.current = docPath;

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    // Small delay (10ms) allows the internal Firebase SDK Watch stream to cleanup 
    // the previous target before adding a new one, preventing the ca9 assertion error.
    const timer = setTimeout(() => {
      if (!isMounted) return;

      try {
        unsubscribe = onSnapshot(
          memoizedDocRef,
          (snapshot: DocumentSnapshot<DocumentData>) => {
            if (!isMounted) return;
            setState({
              data: snapshot.exists() ? { ...(snapshot.data() as T), id: snapshot.id } : null,
              isLoading: false,
              error: null,
            });
          },
          (err: FirestoreError) => {
            if (!isMounted) return;
            
            if (optionsRef.current?.ignorePermissionErrors) {
              setState({ data: null, isLoading: false, error: err });
              return;
            }

            const contextualError = new FirestorePermissionError({
              operation: 'get',
              path: docPath,
            });

            setState({ data: null, isLoading: false, error: contextualError });
            errorEmitter.emit('permission-error', contextualError);
          }
        );
      } catch (e) {
        console.error("Critical hook failure:", e);
      }
    }, 10);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (unsubscribe) {
        unsubscribe();
      }
      activePathRef.current = null;
    };
  }, [memoizedDocRef?.path]); 

  return state;
}
