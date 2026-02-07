import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../components/logic/firebase';
import { calculateTrustScore } from '../lib/riskCalculator';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [trustScore, setTrustScore] = useState(100);
  const [riskScore, setRiskScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState('low');
  const [riskBreakdown, setRiskBreakdown] = useState([]);

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
      
      return allTransactions; // Return for score calculation
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return [];
    }
  };

  // Calculate trust/risk scores whenever user data or transactions change
  const recalculateScores = (userTransactionDetails, userTransactions = []) => {
    if (!userTransactionDetails) {
      // New user with no transaction details - use defaults
      setTrustScore(100);
      setRiskScore(0);
      setRiskLevel('low');
      setRiskBreakdown([]);
      return;
    }

    const result = calculateTrustScore(userTransactionDetails, userTransactions);
    console.log('📊 Calculated scores:', {
      trustScore: result.trustScore,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      factors: result.breakdown.length
    });

    setTrustScore(result.trustScore);
    setRiskScore(result.riskScore);
    setRiskLevel(result.riskLevel);
    setRiskBreakdown(result.breakdown);
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
    let unsubscribeUserDoc = null;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      
      // Clean up previous user document listener
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }
      
      if (currentUser) {
        setUser(currentUser);
        try {
          const userRef = doc(db, 'users', currentUser.uid);

          // First check if user doc exists; create admin doc if needed
          const initialDoc = await getDoc(userRef);
          if (!initialDoc.exists()) {
            // Check if email/password user (admin)
            const isEmailPassword = currentUser.providerData.some(p => p.providerId === 'password');
            if (isEmailPassword) {
              const adminData = {
                uid: currentUser.uid,
                name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Admin',
                email: currentUser.email,
                photoURL: currentUser.photoURL || null,
                role: 'admin',
                createdAt: serverTimestamp(),
              };
              await setDoc(userRef, adminData);
              setUserData(adminData);
              setIsAdmin(true);
              setLoading(false);
              return; // Admin created, no need for real-time listener
            }
          }

          // Set up real-time listener for user document
          unsubscribeUserDoc = onSnapshot(userRef, async (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data();
              setUserData(data);
              setIsAdmin(data.role === 'admin');

              if (data.role === 'admin') {
                // Admin users don't need transaction fetching or score calculation
                setLoading(false);
                return;
              }

              // Fetch transactions and calculate scores for regular users
              if (data.upiId) {
                const txList = await fetchTransactions(data.upiId);
                recalculateScores(data.transactionDetails, txList);
              } else {
                recalculateScores(data.transactionDetails, []);
              }
            }
            setLoading(false);
          }, (error) => {
            console.error('Error listening to user document:', error);
          });

        } catch (error) {
          console.error('Error setting up user listener:', error);
        }
      } else {
        setUser(null);
        setUserData(null);
        setIsAdmin(false);
        setTransactions([]);
        setBalance(10000);
        setTotalSpending(0);
        setTotalReceived(0);
        // Reset scores for logged out user
        setTrustScore(100);
        setRiskScore(0);
        setRiskLevel('low');
        setRiskBreakdown([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      isAdmin,
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
      markAllAsRead,
      // Trust and Risk scores
      trustScore,
      riskScore,
      riskLevel,
      riskBreakdown,
      recalculateScores
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
