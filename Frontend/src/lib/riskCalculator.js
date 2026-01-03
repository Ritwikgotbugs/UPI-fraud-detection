/**
 * Risk and Trust Score Calculator
 * 
 * Trust Score: 0-100 (100 = fully trusted, shown to user for their own profile)
 * Risk Score: 100 - Trust Score (shown to others when they're sending payments)
 * 
 * New accounts start with:
 * - Trust Score: 100
 * - Risk Score: 0
 * 
 * Weights based on ML feature importance:
 * - Transaction Amount: 18.4%
 * - High-Risk Location: 18.1%
 * - Blacklist Status: 17.2%
 * - Past Fraud Flags: 14.8%
 * - VPN/Proxy Usage: 7.3%
 * - Time Since Last Tx: 3.0%
 * - Social Trust Score: 2.6% (existing trust modifications)
 * - Normalized Amount: 2.5%
 * - Account Age: 2.4%
 * - Context Anomalies: 2.4%
 */

// Feature weights (must sum to ~100 for risk calculation)
export const RISK_WEIGHTS = {
  transactionAmount: 18.4,       // Large transactions = higher risk
  highRiskLocation: 18.1,       // geo_location_flags
  blacklistStatus: 17.2,        // recipient_blacklist_status
  pastFraudFlags: 14.8,         // past_fraudulent_behavior_flags
  vpnProxyUsage: 7.3,           // vpn_proxy_usage
  timeSinceLastTx: 3.0,         // time_since_last_transaction
  socialTrustModifier: 2.6,     // Based on existing trust adjustments
  normalizedAmount: 2.5,        // normalized_transaction_amount
  accountAge: 2.4,              // account_age
  contextAnomalies: 2.4,        // transaction_context_anomalies
  // Additional factors (within the weights)
  behavioralBiometrics: 2.0,    // behavioral_biometrics
  deviceFingerprinting: 2.0,    // device_fingerprinting
  fraudComplaints: 3.0,         // fraud_complaints_count
  locationInconsistent: 2.5,    // location_inconsistent_transactions
  merchantMismatch: 1.8,        // merchant_category_mismatch
  dailyLimitExceeded: 1.5,      // user_daily_limit_exceeded
  recipientVerification: 2.0,   // recipient_verification_status
  highRiskTimes: 1.5,           // high_risk_transaction_times
};

/**
 * Calculate the base trust score from user profile data
 * @param {Object} transactionDetails - User's transactionDetails from Firestore
 * @param {Object} transactions - User's transaction history
 * @returns {Object} { trustScore, riskScore, breakdown }
 */
export function calculateTrustScore(transactionDetails = {}, transactions = []) {
  // Start with 100 trust (0 risk) for new/clean accounts
  let trustScore = 100;
  const breakdown = [];
  
  // Helper to decrease trust and log reason
  const decreaseTrust = (amount, reason, weight) => {
    if (amount > 0) {
      trustScore -= amount;
      breakdown.push({ factor: reason, impact: -amount, weight });
    }
  };

  // 1. Blacklist Status (17.2% weight)
  if (transactionDetails.recipientBlacklistStatus) {
    decreaseTrust(RISK_WEIGHTS.blacklistStatus, 'Blacklisted contact interaction', RISK_WEIGHTS.blacklistStatus);
  }

  // 2. High-Risk Location (18.1% weight)
  const geoFlags = transactionDetails.geoLocationFlags?.toLowerCase() || '';
  if (geoFlags === 'high-risk') {
    decreaseTrust(RISK_WEIGHTS.highRiskLocation, 'High-risk location detected', RISK_WEIGHTS.highRiskLocation);
  } else if (geoFlags === 'unusual') {
    decreaseTrust(RISK_WEIGHTS.highRiskLocation * 0.5, 'Unusual location activity', RISK_WEIGHTS.highRiskLocation);
  }

  // 3. Past Fraud Flags (14.8% weight)
  const pastFraud = Number(transactionDetails.pastFraudulentBehavior || transactionDetails.pastFraudulentBehaviorFlags || 0);
  if (pastFraud > 0) {
    const impact = Math.min(RISK_WEIGHTS.pastFraudFlags, pastFraud * 5);
    decreaseTrust(impact, 'Past fraudulent behavior', RISK_WEIGHTS.pastFraudFlags);
  }

  // 4. VPN/Proxy Usage (7.3% weight)
  if (transactionDetails.vpnProxyUsage) {
    decreaseTrust(RISK_WEIGHTS.vpnProxyUsage, 'VPN/Proxy usage detected', RISK_WEIGHTS.vpnProxyUsage);
  }

  // 5. Account Age (2.4% weight) - newer accounts are riskier
  const accountAge = Number(transactionDetails.accountAge || 365);
  if (accountAge < 30) {
    decreaseTrust(RISK_WEIGHTS.accountAge, 'New account (< 30 days)', RISK_WEIGHTS.accountAge);
  } else if (accountAge < 90) {
    decreaseTrust(RISK_WEIGHTS.accountAge * 0.5, 'Young account (< 90 days)', RISK_WEIGHTS.accountAge);
  }

  // 6. Fraud Complaints (3% weight)
  const fraudComplaints = Number(transactionDetails.fraudComplaintsCount || 0);
  if (fraudComplaints > 0) {
    const impact = Math.min(RISK_WEIGHTS.fraudComplaints * 3, fraudComplaints * 3);
    decreaseTrust(impact, `${fraudComplaints} fraud complaint(s)`, RISK_WEIGHTS.fraudComplaints);
  }

  // 7. Device Fingerprinting (2% weight) - high values indicate suspicious device patterns
  const deviceFp = Number(transactionDetails.deviceFingerprinting || 0);
  if (deviceFp > 0.7) {
    decreaseTrust(RISK_WEIGHTS.deviceFingerprinting, 'Suspicious device patterns', RISK_WEIGHTS.deviceFingerprinting);
  } else if (deviceFp > 0.5) {
    decreaseTrust(RISK_WEIGHTS.deviceFingerprinting * 0.5, 'Unusual device patterns', RISK_WEIGHTS.deviceFingerprinting);
  }

  // 8. Behavioral Biometrics (2% weight) - high values indicate unusual behavior
  const behavioral = Number(transactionDetails.behavioralBiometrics || 0);
  if (behavioral > 0.7) {
    decreaseTrust(RISK_WEIGHTS.behavioralBiometrics, 'Unusual behavioral patterns', RISK_WEIGHTS.behavioralBiometrics);
  } else if (behavioral > 0.5) {
    decreaseTrust(RISK_WEIGHTS.behavioralBiometrics * 0.5, 'Slightly unusual behavior', RISK_WEIGHTS.behavioralBiometrics);
  }

  // 9. Location Inconsistent Transactions (2.5% weight)
  if (transactionDetails.locationInconsistentTransactions) {
    decreaseTrust(RISK_WEIGHTS.locationInconsistent, 'Location inconsistencies', RISK_WEIGHTS.locationInconsistent);
  }

  // 10. Merchant Category Mismatch (1.8% weight)
  if (transactionDetails.merchantCategoryMismatch) {
    decreaseTrust(RISK_WEIGHTS.merchantMismatch, 'Merchant category mismatch', RISK_WEIGHTS.merchantMismatch);
  }

  // 11. Daily Limit Exceeded (1.5% weight)
  if (transactionDetails.userDailyLimitExceeded) {
    decreaseTrust(RISK_WEIGHTS.dailyLimitExceeded, 'Daily limit exceeded', RISK_WEIGHTS.dailyLimitExceeded);
  }

  // 12. Recipient Verification Status (2% weight)
  const verificationStatus = (transactionDetails.recipientVerificationStatus || '').toLowerCase();
  if (verificationStatus === 'unverified') {
    decreaseTrust(RISK_WEIGHTS.recipientVerification, 'Unverified recipient', RISK_WEIGHTS.recipientVerification);
  } else if (verificationStatus === 'recently_registered') {
    decreaseTrust(RISK_WEIGHTS.recipientVerification * 0.5, 'Recently registered recipient', RISK_WEIGHTS.recipientVerification);
  }

  // 13. High-Risk Transaction Times (1.5% weight)
  if (transactionDetails.highRiskTransactionTimes) {
    decreaseTrust(RISK_WEIGHTS.highRiskTimes, 'High-risk transaction times', RISK_WEIGHTS.highRiskTimes);
  }

  // 14. Context Anomalies (2.4% weight)
  if (transactionDetails.transactionContextAnomalies) {
    decreaseTrust(RISK_WEIGHTS.contextAnomalies, 'Transaction context anomalies', RISK_WEIGHTS.contextAnomalies);
  }

  // 15. Transaction History Analysis (dynamic based on past transactions)
  if (transactions && transactions.length > 0) {
    // Check for high-risk patterns in recent transactions
    const recentTx = transactions.slice(0, 20); // Last 20 transactions
    const highRiskTx = recentTx.filter(tx => {
      const risk = Number(tx.riskScore || tx.risk_score || 0);
      return risk > 70;
    });
    
    if (highRiskTx.length >= 5) {
      decreaseTrust(10, 'Multiple high-risk transactions', RISK_WEIGHTS.transactionAmount);
    } else if (highRiskTx.length >= 2) {
      decreaseTrust(5, 'Some high-risk transactions', RISK_WEIGHTS.transactionAmount);
    }

    // Check for blocked transactions
    const blockedTx = recentTx.filter(tx => tx.status === 'blocked');
    if (blockedTx.length > 0) {
      decreaseTrust(blockedTx.length * 5, `${blockedTx.length} blocked transaction(s)`, RISK_WEIGHTS.pastFraudFlags);
    }
  }

  // Ensure trust score stays within bounds
  trustScore = Math.max(0, Math.min(100, Math.round(trustScore)));
  
  // Risk score is inverse of trust score
  const riskScore = 100 - trustScore;

  return {
    trustScore,
    riskScore,
    breakdown,
    riskLevel: riskScore >= 60 ? 'high' : riskScore >= 35 ? 'medium' : 'low'
  };
}

/**
 * Calculate risk score for a specific transaction
 * @param {Object} params - Transaction parameters
 * @returns {Object} { riskScore, factors }
 */
export function calculateTransactionRisk(params = {}) {
  let riskScore = 0;
  const factors = [];

  // 1. Transaction Amount Risk (18.4%)
  const amount = Number(params.amount || 0);
  if (amount > 50000) {
    riskScore += RISK_WEIGHTS.transactionAmount;
    factors.push({ factor: 'Very high transaction amount', impact: RISK_WEIGHTS.transactionAmount });
  } else if (amount > 10000) {
    const impact = RISK_WEIGHTS.transactionAmount * 0.6;
    riskScore += impact;
    factors.push({ factor: 'High transaction amount', impact });
  } else if (amount > 5000) {
    const impact = RISK_WEIGHTS.transactionAmount * 0.3;
    riskScore += impact;
    factors.push({ factor: 'Moderate transaction amount', impact });
  }

  // 2. Normalized Amount (2.5%)
  const normalizedAmount = Number(params.normalizedTransactionAmount || params.normalized_transaction_amount || 0);
  if (normalizedAmount > 0.7) {
    riskScore += RISK_WEIGHTS.normalizedAmount;
    factors.push({ factor: 'High normalized amount', impact: RISK_WEIGHTS.normalizedAmount });
  }

  // 3. Time Since Last Transaction (3%)
  const timeSince = Number(params.timeSinceLastTransaction || params.time_since_last_transaction || 30);
  if (timeSince < 5) {
    riskScore += RISK_WEIGHTS.timeSinceLastTx;
    factors.push({ factor: 'Very frequent transactions', impact: RISK_WEIGHTS.timeSinceLastTx });
  }

  // Include all profile-based factors
  const profileRisk = calculateTrustScore(params);
  riskScore += profileRisk.riskScore * 0.5; // Weight profile risk at 50%

  // Normalize to 0-100
  riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

  return {
    riskScore,
    factors,
    riskLevel: riskScore >= 60 ? 'high' : riskScore >= 35 ? 'medium' : 'low'
  };
}

/**
 * Get the default transaction details for a new user
 * These ensure new users start with 100 trust score (0 risk)
 */
export function getDefaultTransactionDetails() {
  return {
    recipientBlacklistStatus: 0,
    vpnProxyUsage: 0,
    geoLocationFlags: 'normal',
    highRiskTransactionTimes: 0,
    fraudComplaintsCount: 0,
    pastFraudulentBehavior: 0,
    pastFraudulentBehaviorFlags: 0,
    deviceFingerprinting: 0.2,
    behavioralBiometrics: 0.2,
    locationInconsistentTransactions: 0,
    merchantCategoryMismatch: 0,
    userDailyLimitExceeded: 0,
    recipientVerificationStatus: 'verified',
    accountAge: 1, // New account
    socialTrustScore: 100, // Start with full trust
    transactionFrequency: 0,
    timeSinceLastTransaction: 60,
    normalizedTransactionAmount: 0,
    transactionContextAnomalies: 0,
    recentHighValueTransactionFlags: 0
  };
}

/**
 * Format risk level for display
 */
export function getRiskLevelDisplay(riskScore) {
  if (riskScore >= 60) {
    return { level: 'high', label: 'High Risk', color: '#ef4444', bgColor: '#fef2f2' };
  } else if (riskScore >= 35) {
    return { level: 'medium', label: 'Medium Risk', color: '#f59e0b', bgColor: '#fffbeb' };
  } else {
    return { level: 'low', label: 'Low Risk', color: '#10b981', bgColor: '#ecfdf5' };
  }
}

/**
 * Format trust level for display
 */
export function getTrustLevelDisplay(trustScore) {
  if (trustScore >= 80) {
    return { level: 'high', label: 'Highly Trusted', color: '#10b981', bgColor: '#ecfdf5' };
  } else if (trustScore >= 50) {
    return { level: 'medium', label: 'Moderate Trust', color: '#f59e0b', bgColor: '#fffbeb' };
  } else {
    return { level: 'low', label: 'Low Trust', color: '#ef4444', bgColor: '#fef2f2' };
  }
}
