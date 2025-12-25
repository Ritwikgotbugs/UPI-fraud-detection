import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../components/logic/firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(10000);
  const [transactions, setTransactions] = useState([]);
  const [totalSpending, setTotalSpending] = useState(0);
  const [totalReceived, setTotalReceived] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchTransactions = async (upiId) => {
    if (!upiId) return;
    
    try {
      const txRef = collection(db, "transactions");
      
      
      const sentQuery = query(txRef, where("senderUPI", "==", upiId), where("transactionType", "==", "sent"));
      const sentSnapshot = await getDocs(sentQuery);
      const sentList = sentSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        transactionType: "sent"
      }));
      
      
      const receivedQuery = query(txRef, where("recipientUPI", "==", upiId), where("transactionType", "==", "received"));
      const receivedSnapshot = await getDocs(receivedQuery);
      const receivedList = receivedSnapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        transactionType: "received"
      }));
      
      
      const allTransactions = [...sentList, ...receivedList];
      allTransactions.sort((a, b) => {
        const timeA = a.createdAt?.toDate?.() || a.timestamp?.toDate?.() || new Date(0);
        const timeB = b.createdAt?.toDate?.() || b.timestamp?.toDate?.() || new Date(0);
        return timeB - timeA;
      });
      
      const spent = sentList.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
      const received = receivedList.reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);
      
      setTransactions(allTransactions);
      setTotalSpending(spent);
      setTotalReceived(received);
      setBalance(10000 - spent + received);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  const refreshData = async () => {
    if (userData?.upiId) {
      await fetchTransactions(userData.upiId);
    }
  };

  
  useEffect(() => {
    if (!userData?.upiId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let unsubscribe = null;
    const setupListener = async () => {
      try {
        const notifRef = collection(db, "notifications");
        const notifQuery = query(notifRef, where("recipientUPI", "==", userData.upiId));

        unsubscribe = onSnapshot(
          notifQuery,
          (snapshot) => {
            const notifList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            notifList.sort((a, b) => {
              const timeA = a.createdAt?.toDate?.() || new Date(0);
              const timeB = b.createdAt?.toDate?.() || new Date(0);
              return timeB - timeA;
            });
            setNotifications(notifList);
            setUnreadCount(notifList.filter(n => !n.read).length);
          },
          (error) => {
            console.error("Error fetching notifications:", error);
            setNotifications([]);
            setUnreadCount(0);
          }
        );
      } catch (error) {
        console.error("Error setting up notification listener:", error);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userData?.upiId]);

  const markAsRead = async (notifId) => {
    try {
      await updateDoc(doc(db, "notifications", notifId), { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifs.map(n => updateDoc(doc(db, "notifications", n.id), { read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            
            await fetchTransactions(data.upiId);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUser(null);
        setUserData(null);
        setTransactions([]);
        setBalance(10000);
        setTotalSpending(0);
        setTotalReceived(0);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      balance, 
      transactions, 
      totalSpending, 
      totalReceived,
      refreshData,
      setBalance,
      setTransactions,
      setTotalSpending,
      setTotalReceived,
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
