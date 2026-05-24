import { useState, useEffect } from "react";
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";

export type UserRole = "admin" | "member";

export interface UserProfile {
  displayName: string;
  email: string;
  role: UserRole;
  borrowedCount: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            // First time login - Create member profile
            const newProfile: UserProfile = {
              displayName: currentUser.displayName || "Unknown User",
              email: currentUser.email || "",
              role: currentUser.email === "dawood.mehmood945@gmail.com" ? "admin" : "member",
              borrowedCount: 0,
            };
            await setDoc(docRef, newProfile);
          }

          unsubscribeProfile = onSnapshot(docRef, (snap) => {
             if (snap.exists()) {
               setProfile(snap.data() as UserProfile);
             }
             setLoading(false);
          }, (err) => {
             handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
             setLoading(false);
          });
          
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
        if (unsubscribeProfile) unsubscribeProfile();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return { user, profile, loading, signIn, signOut };
}
