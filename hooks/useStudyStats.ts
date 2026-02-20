import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { StudySession } from '../types';

export interface DailyStat {
  dateStr: string; // 表示用の日付文字列 (例: '10/27')
  fullDate: string; // YYYY-MM-DD
  durationMinutes: number;
}

export const useStudyStats = () => {
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      if (!user) {
        if (isMounted) {
          setStats([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 過去7日間のデータを取得するための日付を計算
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const sessionsRef = collection(db, 'users', user.uid, 'study_sessions');
        const q = query(
          sessionsRef,
          where('date', '>=', sevenDaysAgo.toISOString()),
          where('date', '<=', today.toISOString()),
          orderBy('date', 'asc')
        );

        const querySnapshot = await getDocs(q);
        const sessions: StudySession[] = [];
        querySnapshot.forEach((doc) => {
          sessions.push({ id: doc.id, ...doc.data() } as StudySession);
        });

        // 過去7日間の日付配列（空の日も0で埋めるため）
        const daysStats = new Map<string, DailyStat>();
        for (let i = 0; i < 7; i++) {
          const d = new Date(sevenDaysAgo);
          d.setDate(d.getDate() + i);
          
          const month = d.getMonth() + 1;
          const day = d.getDate();
          const dateStr = `${month}/${day}`;
          
          const yyyy = d.getFullYear();
          const mm = String(month).padStart(2, '0');
          const dd = String(day).padStart(2, '0');
          const fullDate = `${yyyy}-${mm}-${dd}`;

          daysStats.set(fullDate, { dateStr, fullDate, durationMinutes: 0 });
        }

        // 取得した学習記録を日別に集計
        sessions.forEach((session) => {
          const sessionDate = new Date(session.date);
          const yyyy = sessionDate.getFullYear();
          const mm = String(sessionDate.getMonth() + 1).padStart(2, '0');
          const dd = String(sessionDate.getDate()).padStart(2, '0');
          const fullDateStr = `${yyyy}-${mm}-${dd}`;

          const existingStat = daysStats.get(fullDateStr);
          if (existingStat) {
            existingStat.durationMinutes += session.durationMinutes;
          }
        });

        if (isMounted) {
          setStats(Array.from(daysStats.values()));
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching study stats:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // デバッグ用に再取得をトリガーできる関数を提供してもよいかも
  // 今回はマウント時またはユーザー変更時に取得するだけでOKとする
  return { stats, loading, error };
};
