
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export type WithId<T> = T & { id: string };

export interface UseCollectionResult<T> {
  data: WithId<T>[] | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Optimized with a small delay to prevent Firebase Target ID conflicts (ID: ca9).
 */
export function useCollection<T = any>(
  memoizedTargetRefOrQuery:
    | (CollectionReference<DocumentData> | Query<DocumentData>)
    | null
    | undefined,
  options?: { ignorePermissionErrors?: boolean }
): UseCollectionResult<T> {
  const [state, setState] = useState<UseCollectionResult<T>>({
    data: null,
    isLoading: !!memoizedTargetRefOrQuery,
    error: null,
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!memoizedTargetRefOrQuery) {
      setState({ data: null, isLoading: false, error: null });
      return;
    }

    setState(prev => (prev.isLoading ? prev : { ...prev, isLoading: true, error: null }));

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    // Small delay (10ms) allows the internal Firebase SDK Watch stream to cleanup 
    // the previous target before adding a new one, preventing the ca9 assertion error.
    const timer = setTimeout(() => {
      if (!isMounted) return;

      try {
        unsubscribe = onSnapshot(
          memoizedTargetRefOrQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            if (!isMounted) return;
            
            const results = snapshot.docs.map(doc => ({ ...(doc.data() as T), id: doc.id }));
            setState({ data: results, isLoading: false, error: null });
          },
          (err: FirestoreError) => {
            if (!isMounted) return;
            
            if (optionsRef.current?.ignorePermissionErrors) {
              setState({ data: null, isLoading: false, error: err });
              return;
            }

            let path = 'collection_query';
            try {
                if ('path' in (memoizedTargetRefOrQuery as any)) {
                    path = (memoizedTargetRefOrQuery as any).path;
                } else {
                    // For collection group queries, fallback to providing the ID if available
                    const internalQuery = (memoizedTargetRefOrQuery as any)._query;
                    if (internalQuery && internalQuery.path) {
                        path = `group/${internalQuery.path.toString()}`;
                    }
                }
            } catch {}

            const contextualError = new FirestorePermissionError({
              operation: 'list',
              path,
            });

            setState({ data: null, isLoading: false, error: contextualError });
            errorEmitter.emit('permission-error', contextualError);
          }
        );
      } catch (e) {
        console.error("Critical collection hook failure:", e);
      }
    }, 10);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [memoizedTargetRefOrQuery]); 

  return state;
}
