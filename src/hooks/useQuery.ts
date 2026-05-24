import { useState, useEffect } from "react";
import { collection, query, onSnapshot, QueryConstraint } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";

export function useQuery<T>(colName: string, queryConstraints: QueryConstraint[] = []) {
  const [data, setData] = useState<(T & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, colName), ...queryConstraints);
    const unsubscribe = onSnapshot(q, (snap) => {
      setData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as (T & { id: string }))));
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, colName);
    });

    return () => unsubscribe();
  }, []); // assuming queryConstraints don't change dynamically for these pages

  return { data, loading, refetch: () => {} };
}
