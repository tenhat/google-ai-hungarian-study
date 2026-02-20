import { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { CEFRLevel } from '../types';
import { doc as firestoreDoc, getDoc as firestoreGetDoc, setDoc as firestoreSetDoc, updateDoc as firestoreUpdateDoc } from 'firebase/firestore';

export const useHungarianLevel = () => {
  const { user } = useAuth();
  const [level, setLevel] = useState<CEFRLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchLevel = async () => {
      if (!user) {
        if (isMounted) {
          setLevel(null);
          setLoading(false);
        }
        return;
      }

      try {
        const userDocRef = firestoreDoc(db, 'users', user.uid);
        const userDocSnap = await firestoreGetDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          if (isMounted) {
            setLevel(data.hungarianLevel || null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch Hungarian level:', err);
        if (isMounted) {
          setError('レベルの取得に失敗しました');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchLevel();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  const saveLevel = async (newLevel: CEFRLevel) => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    try {
      const userDocRef = firestoreDoc(db, 'users', user.uid);
      const userDocSnap = await firestoreGetDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        await firestoreUpdateDoc(userDocRef, {
          hungarianLevel: newLevel
        });
      } else {
        await firestoreSetDoc(userDocRef, {
          hungarianLevel: newLevel
        }, { merge: true });
      }
      
      setLevel(newLevel);
    } catch (err) {
      console.error('Failed to save Hungarian level:', err);
      setError('レベルの保存に失敗しました');
      throw err; // コンポーネント側でエラー・ハンドリングできるように投げる
    } finally {
      setLoading(false);
    }
  };

  return { level, loading, error, saveLevel };
};
