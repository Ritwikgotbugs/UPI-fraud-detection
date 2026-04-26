import { collection, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebase";

let _seeded = {};

const NAMES = ["Aarav Sharma","Vivaan Patel","Aditya Singh","Arjun Reddy","Sai Krishnan","Ananya Mishra","Diya Banerjee","Myra Kapoor","Rohan Bhatt","Karan Naidu","Priya Verma","Neha Agarwal","Rahul Prasad","Amit Dubey","Sneha Rao"];
const UPIS = ["aarav99@oksbi","vivaan12@okaxis","aditya45@okhdfcbank","arjun78@paytm","sai33@ybl","ananya56@oksbi","diya88@okaxis","myra21@okicici","rohan67@paytm","karan44@ybl","priya11@oksbi","neha90@okaxis","rahul55@okhdfcbank","amit32@paytm","sneha77@ybl"];
const REMARKS = ["Bill payment","Rent transfer","Online shopping","Food delivery","Recharge","Loan EMI","Investment","Gift","Salary","Freelance payment"];
const FRAUD_TYPES = ["Unauthorized transaction","Phishing attack","SIM swap fraud","QR code scam","Account takeover","Impersonation fraud"];
const pick = (arr, i) => arr[i % arr.length];

function hoursAgo(h) {
  return Timestamp.fromDate(new Date(Date.now() - h * 3600000));
}

export async function seedTransactions() {
  if (_seeded.transactions) return;
  _seeded.transactions = true;
  const snap = await getDocs(collection(db, "transactions"));
  if (snap.size > 5) return; // already has data

  const ref = collection(db, "transactions");
  for (let i = 0; i < 80; i++) {
    const sIdx = i % NAMES.length;
    const rIdx = (i + 3) % NAMES.length;
    const amount = [150, 500, 1200, 2500, 4999, 7500, 12000, 25000, 49999, 75000][i % 10] + (i * 17 % 500);
    const isHighRisk = i % 7 === 0;
    const isMedRisk = i % 4 === 0 && !isHighRisk;

    await addDoc(ref, {
      senderUPI: pick(UPIS, sIdx),
      recipientUPI: pick(UPIS, rIdx),
      senderName: pick(NAMES, sIdx),
      recipientName: pick(NAMES, rIdx),
      amount,
      remarks: pick(REMARKS, i),
      transactionType: "sent",
      status: isHighRisk ? "blocked" : isMedRisk ? "flagged" : "completed",
      riskLevel: isHighRisk ? "high" : isMedRisk ? "medium" : "low",
      createdAt: hoursAgo(i * 2 + (i % 5)),
      modelData: {
        recipientBlacklistStatus: isHighRisk ? 1 : 0,
        vpnProxyUsage: isHighRisk || (i % 9 === 0) ? 1 : 0,
        geoLocationFlags: isHighRisk ? "high-risk" : "normal",
        highRiskTransactionTimes: i % 6 === 0 ? 1 : 0,
        pastFraudulentBehavior: isHighRisk ? 1 : 0,
        deviceFingerprinting: 0.3 + (i % 7) * 0.1,
        socialTrustScore: isHighRisk ? 15 : 50 + (i % 40),
        behavioralBiometrics: 0.4 + (i % 5) * 0.1,
        recipientVerificationStatus: isHighRisk ? "recently_registered" : "verified",
        fraudComplaintsCount: isHighRisk ? 2 + (i % 3) : 0,
      },
    });
  }
}

export async function seedCases() {
  if (_seeded.cases) return;
  _seeded.cases = true;
  const snap = await getDocs(collection(db, "fraud_cases"));
  if (snap.size > 0) return;

  const ref = collection(db, "fraud_cases");
  const casesData = [
    { title: "Suspicious high-value transfer from aarav99@oksbi", description: "Rs.75,000 sent to newly registered UPI at 2AM with VPN detected", priority: "critical", status: "open", assignedTo: "Priya Verma", amountAtRisk: 75000, transactionId: "" },
    { title: "Multiple failed PIN attempts on vivaan12@okaxis", description: "5 failed attempts followed by successful transaction to unknown payee", priority: "high", status: "investigating", assignedTo: "Rohan Bhatt", amountAtRisk: 25000, transactionId: "" },
    { title: "SIM swap suspected for karan44@ybl", description: "Device fingerprint changed, new SIM detected, immediate high-value transfer", priority: "critical", status: "investigating", assignedTo: "Neha Agarwal", amountAtRisk: 49999, transactionId: "" },
    { title: "Geo anomaly: Delhi to Mumbai in 10 minutes", description: "Transaction from Delhi IP followed by Mumbai IP within 10 min window", priority: "high", status: "open", assignedTo: "", amountAtRisk: 12000, transactionId: "" },
    { title: "Blacklisted recipient received funds", description: "sneha77@ybl sent Rs.7,500 to a known fraud UPI ID on blacklist", priority: "high", status: "resolved", assignedTo: "Amit Dubey", amountAtRisk: 7500, transactionId: "" },
    { title: "Burst attack pattern detected", description: "8 transactions in 2 minutes from same sender to different recipients", priority: "critical", status: "open", assignedTo: "", amountAtRisk: 32000, transactionId: "" },
    { title: "QR code phishing complaint", description: "Customer reports scanning fake QR code at petrol pump, Rs.4,999 debited", priority: "medium", status: "investigating", assignedTo: "Priya Verma", amountAtRisk: 4999, transactionId: "" },
    { title: "Unusual late-night activity on rahul55@okhdfcbank", description: "3 transactions between 1AM-3AM totaling Rs.18,000 to new payees", priority: "medium", status: "open", assignedTo: "", amountAtRisk: 18000, transactionId: "" },
    { title: "Account takeover attempt on diya88@okaxis", description: "Password reset + device change + immediate transfer pattern", priority: "critical", status: "investigating", assignedTo: "Rohan Bhatt", amountAtRisk: 50000, transactionId: "" },
    { title: "Merchant fraud report - fake e-commerce", description: "Multiple customers report paying for goods never delivered via UPI", priority: "high", status: "open", assignedTo: "Neha Agarwal", amountAtRisk: 95000, transactionId: "" },
    { title: "Loan fraud via UPI collect request", description: "Victim received fake loan approval collect request, approved Rs.15,000", priority: "medium", status: "resolved", assignedTo: "Amit Dubey", amountAtRisk: 15000, transactionId: "" },
    { title: "Impersonation of bank official", description: "Caller posed as SBI official, obtained OTP, transferred Rs.28,000", priority: "high", status: "closed", assignedTo: "Priya Verma", amountAtRisk: 28000, transactionId: "" },
  ];

  for (let i = 0; i < casesData.length; i++) {
    await addDoc(ref, {
      ...casesData[i],
      notes: i < 4 ? [
        { text: "Initial triage completed. Flagged for investigation.", author: "Admin", timestamp: new Date(Date.now() - (48 - i * 6) * 3600000).toISOString() },
        { text: `Contacted ${pick(NAMES, i)} for verification.`, author: casesData[i].assignedTo || "Admin", timestamp: new Date(Date.now() - (24 - i * 3) * 3600000).toISOString() },
      ] : [],
      createdAt: hoursAgo(i * 12 + (i % 5) * 3),
    });
  }
}
