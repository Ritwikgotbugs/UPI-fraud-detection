"""
Fraudulent.ai - Advanced UPI Fraud Detection Engine
Uses trained Random Forest model with GAN-augmented data
Implements all 20 fraud detection parameters from the ML model
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List, Tuple, Optional, Any
import hashlib

# Feature names matching the ML model's training data (exact order from CSV)
FEATURE_NAMES = [
    'Transaction Amount',
    'Transaction Frequency',
    'Recipient Verification Status',
    'Recipient Blacklist Status',
    'Device Fingerprinting',
    'VPN or Proxy Usage',
    'Geo-Location Flags',
    'Behavioral Biometrics',
    'Time Since Last Transaction',
    'Social Trust Score',
    'Account Age',
    'High-Risk Transaction Times',
    'Past Fraudulent Behavior Flags',
    'Location-Inconsistent Transactions',
    'Normalized Transaction Amount',
    'Transaction Context Anomalies',
    'Fraud Complaints Count',
    'Merchant Category Mismatch',
    'User Daily Limit Exceeded',
    'Recent High-Value Transaction Flags'
]

# Categorical feature values (from training data)
VERIFICATION_STATUS_VALUES = ['verified', 'recently_registered', 'suspicious']
GEO_LOCATION_VALUES = ['normal', 'high-risk', 'unusual']


class UserProfile:
    """Stores user transaction history and behavioral patterns"""
    def __init__(self):
        self.transactions: List[dict] = []
        self.avg_amount: float = 0
        self.total_transactions: int = 0
        self.account_created: datetime = datetime.now()
        self.daily_limit: float = 100000
        self.known_devices: set = set()
        self.known_locations: set = set()
        self.last_transaction_time: Optional[datetime] = None
        self.fraud_complaints: int = 0
        self.past_fraudulent_flags: int = 0
        self.behavioral_score: float = 0.5


class RecipientProfile:
    """Stores recipient/payee information"""
    def __init__(self):
        self.verification_status: str = 'recently_registered'
        self.is_blacklisted: bool = False
        self.trust_score: float = 50
        self.transaction_count: int = 0
        self.unique_senders: set = set()
        self.created_at: datetime = datetime.now()
        self.fraud_reports: int = 0
        self.merchant_category: Optional[str] = None


class FraudDetectionEngine:
    """
    Main fraud detection engine using trained Random Forest model
    Processes transactions and extracts all 20 features for prediction
    """
    
    def __init__(self):
        # User and recipient profiles
        self.user_profiles: Dict[str, UserProfile] = {}
        self.recipient_profiles: Dict[str, RecipientProfile] = {}
        
        # Transaction history
        self.transaction_history: List[dict] = []
        self.alerts: List[dict] = []
        
        # ML Model (loaded externally)
        self.ml_model = None
        
        # Risk thresholds
        self.thresholds = {
            'high_risk': 70,
            'medium_risk': 40,
            'low_risk': 20
        }
        
        # Weights for hybrid scoring
        self.weights = {
            'ml_prediction': 0.7,
            'rule_based': 0.3
        }
        
        # Custom rules
        self.custom_rules: List[dict] = []
        
        # Feedback records
        self.feedback_records: List[dict] = []
        
        # Blacklist
        self.blacklisted_recipients: set = set()
    
    def set_ml_model(self, model):
        """Set the trained ML model"""
        self.ml_model = model
        print("ML model set in fraud engine")
    
    def get_or_create_user_profile(self, user_id: str) -> UserProfile:
        """Get or create a user profile"""
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = UserProfile()
        return self.user_profiles[user_id]
    
    def get_or_create_recipient_profile(self, recipient_id: str) -> RecipientProfile:
        """Get or create a recipient profile"""
        if recipient_id not in self.recipient_profiles:
            self.recipient_profiles[recipient_id] = RecipientProfile()
        return self.recipient_profiles[recipient_id]
    
    def extract_20_features(self, transaction: dict, device_info: dict = None, 
                           location_info: dict = None) -> Tuple[dict, List[str]]:
        """
        Extract all 20 features from transaction data matching ML model training format
        Returns feature dict and list of risk reasons
        """
        user_id = transaction.get('senderUPI', '')
        recipient_id = transaction.get('recipientUPI', '')
        amount = float(transaction.get('amount', 0))
        timestamp = transaction.get('timestamp', datetime.now())
        
        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except:
                timestamp = datetime.now()
        
        device_info = device_info or {}
        location_info = location_info or {}
        
        user_profile = self.get_or_create_user_profile(user_id)
        recipient_profile = self.get_or_create_recipient_profile(recipient_id)
        
        features = {}
        reasons = []
        
        # ===== FEATURE 1: Transaction Amount =====
        features['Transaction Amount'] = amount
        if amount > 5000:
            reasons.append(f"High transaction amount: ₹{amount:.2f}")
        
        # ===== FEATURE 2: Transaction Frequency (transactions in last hour) =====
        recent_txns = [t for t in user_profile.transactions 
                      if (timestamp - t.get('timestamp', timestamp)).total_seconds() < 3600]
        frequency = len(recent_txns)
        features['Transaction Frequency'] = frequency
        if frequency >= 5:
            reasons.append(f"High frequency: {frequency} transactions in last hour")
        
        # ===== FEATURE 3: Recipient Verification Status =====
        verification_status = recipient_profile.verification_status
        features['Recipient Verification Status'] = verification_status
        if verification_status in ['recently_registered', 'suspicious']:
            reasons.append(f"Recipient status: {verification_status}")
        
        # ===== FEATURE 4: Recipient Blacklist Status =====
        is_blacklisted = 1 if (recipient_profile.is_blacklisted or recipient_id in self.blacklisted_recipients) else 0
        features['Recipient Blacklist Status'] = is_blacklisted
        if is_blacklisted:
            reasons.append("⚠️ Recipient is BLACKLISTED")
        
        # ===== FEATURE 5: Device Fingerprinting (new device = 1) =====
        device_fingerprint = self._get_device_fingerprint(device_info)
        is_new_device = 1 if device_fingerprint not in user_profile.known_devices else 0
        features['Device Fingerprinting'] = is_new_device
        if is_new_device and user_profile.total_transactions > 0:
            reasons.append("Transaction from new/unknown device")
        
        # ===== FEATURE 6: VPN or Proxy Usage =====
        vpn_detected = self._detect_vpn_proxy(device_info)
        features['VPN or Proxy Usage'] = vpn_detected
        if vpn_detected:
            reasons.append("VPN/Proxy detected - masked IP address")
        
        # ===== FEATURE 7: Geo-Location Flags =====
        geo_flag = self._get_geo_location_flag(location_info, user_profile)
        features['Geo-Location Flags'] = geo_flag
        if geo_flag == 'high-risk':
            reasons.append("High-risk geographic location")
        elif geo_flag == 'unusual':
            reasons.append("Unusual geographic location")
        
        # ===== FEATURE 8: Behavioral Biometrics =====
        behavioral_score = self._calculate_behavioral_score(user_profile, transaction)
        features['Behavioral Biometrics'] = round(behavioral_score, 4)
        if behavioral_score > 1.5:
            reasons.append(f"Unusual behavioral pattern (score: {behavioral_score:.2f})")
        
        # ===== FEATURE 9: Time Since Last Transaction (hours) =====
        if user_profile.last_transaction_time:
            time_since_last = (timestamp - user_profile.last_transaction_time).total_seconds() / 3600
        else:
            time_since_last = 24.0
        features['Time Since Last Transaction'] = round(time_since_last, 2)
        
        # ===== FEATURE 10: Social Trust Score =====
        trust_score = recipient_profile.trust_score
        features['Social Trust Score'] = trust_score
        if trust_score < 30:
            reasons.append(f"Low recipient trust score: {trust_score}")
        
        # ===== FEATURE 11: Account Age (years) =====
        account_age = (datetime.now() - user_profile.account_created).days / 365
        features['Account Age'] = round(account_age, 2)
        if account_age < 0.1:
            reasons.append("New account (less than 1 month old)")
        
        # ===== FEATURE 12: High-Risk Transaction Times =====
        hour = timestamp.hour
        is_high_risk_time = 1 if (hour >= 23 or hour < 5) else 0
        features['High-Risk Transaction Times'] = is_high_risk_time
        if is_high_risk_time:
            reasons.append(f"Transaction at high-risk time ({hour}:00)")
        
        # ===== FEATURE 13: Past Fraudulent Behavior Flags =====
        past_fraud_flags = user_profile.past_fraudulent_flags
        features['Past Fraudulent Behavior Flags'] = past_fraud_flags
        if past_fraud_flags > 0:
            reasons.append(f"User has {past_fraud_flags} past fraud flags")
        
        # ===== FEATURE 14: Location-Inconsistent Transactions =====
        location_inconsistent = self._check_location_inconsistency(user_profile, location_info, timestamp)
        features['Location-Inconsistent Transactions'] = location_inconsistent
        if location_inconsistent:
            reasons.append("Location inconsistency detected (impossible travel)")
        
        # ===== FEATURE 15: Normalized Transaction Amount =====
        if user_profile.avg_amount > 0:
            normalized_vs_avg = amount / user_profile.avg_amount
        else:
            normalized_vs_avg = 1.0
        features['Normalized Transaction Amount'] = round(min(normalized_vs_avg, 5.0), 4)
        if normalized_vs_avg > 2:
            reasons.append(f"Amount is {normalized_vs_avg:.1f}x user's average")
        
        # ===== FEATURE 16: Transaction Context Anomalies =====
        context_anomaly = self._detect_context_anomaly(user_profile, transaction)
        features['Transaction Context Anomalies'] = round(context_anomaly, 4)
        if context_anomaly > 1.0:
            reasons.append("Transaction doesn't match typical spending pattern")
        
        # ===== FEATURE 17: Fraud Complaints Count =====
        complaints_count = recipient_profile.fraud_reports
        features['Fraud Complaints Count'] = complaints_count
        if complaints_count > 0:
            reasons.append(f"Recipient has {complaints_count} fraud complaints")
        
        # ===== FEATURE 18: Merchant Category Mismatch =====
        merchant_mismatch = self._check_merchant_mismatch(recipient_profile, amount)
        features['Merchant Category Mismatch'] = merchant_mismatch
        if merchant_mismatch:
            reasons.append("Transaction amount doesn't match merchant category")
        
        # ===== FEATURE 19: User Daily Limit Exceeded =====
        daily_total = self._get_daily_total(user_id, timestamp)
        limit_exceeded = 1 if (daily_total + amount) > user_profile.daily_limit else 0
        features['User Daily Limit Exceeded'] = limit_exceeded
        if limit_exceeded:
            reasons.append(f"Daily limit exceeded (₹{daily_total + amount:.0f}/₹{user_profile.daily_limit:.0f})")
        
        # ===== FEATURE 20: Recent High-Value Transaction Flags =====
        recent_high_value = self._check_recent_high_value(user_id, timestamp)
        features['Recent High-Value Transaction Flags'] = recent_high_value
        if recent_high_value:
            reasons.append("Recent high-value transaction detected")
        
        return features, reasons
    
    def prepare_features_for_model(self, features: dict) -> np.ndarray:
        """
        Convert features dict to numpy array matching ML model's expected format
        Applies same preprocessing as training (normalization + one-hot encoding)
        """
        # Normalize numerical features to match training preprocessing
        amount_normalized = min(features['Transaction Amount'] / 5000, 1.0)
        frequency_normalized = min(features['Transaction Frequency'] / 10, 1.0)
        time_since_normalized = min(features['Time Since Last Transaction'] / 30, 1.0)
        trust_score_normalized = features['Social Trust Score'] / 100
        account_age_normalized = min(features['Account Age'] / 5, 1.0)
        complaints_normalized = min(features['Fraud Complaints Count'] / 5, 1.0)
        behavioral_normalized = min(features['Behavioral Biometrics'] / 3, 1.0)
        normalized_amount = min(features['Normalized Transaction Amount'] / 5, 1.0)
        context_anomaly_normalized = min(features['Transaction Context Anomalies'] / 3, 1.0)
        
        # Build feature array (numerical features first)
        feature_array = [
            amount_normalized,                              # Transaction Amount
            frequency_normalized,                           # Transaction Frequency
            features['Recipient Blacklist Status'],         # Recipient Blacklist Status
            features['Device Fingerprinting'],              # Device Fingerprinting
            features['VPN or Proxy Usage'],                 # VPN or Proxy Usage
            behavioral_normalized,                          # Behavioral Biometrics
            time_since_normalized,                          # Time Since Last Transaction
            trust_score_normalized,                         # Social Trust Score
            account_age_normalized,                         # Account Age
            features['High-Risk Transaction Times'],        # High-Risk Transaction Times
            features['Past Fraudulent Behavior Flags'],     # Past Fraudulent Behavior Flags
            features['Location-Inconsistent Transactions'], # Location-Inconsistent Transactions
            normalized_amount,                              # Normalized Transaction Amount
            context_anomaly_normalized,                     # Transaction Context Anomalies
            complaints_normalized,                          # Fraud Complaints Count
            features['Merchant Category Mismatch'],         # Merchant Category Mismatch
            features['User Daily Limit Exceeded'],          # User Daily Limit Exceeded
            features['Recent High-Value Transaction Flags'],# Recent High-Value Transaction Flags
        ]
        
        # One-hot encode Recipient Verification Status (drop_first=True removes 'verified')
        verification_status = features['Recipient Verification Status']
        feature_array.append(1 if verification_status == 'recently_registered' else 0)
        feature_array.append(1 if verification_status == 'suspicious' else 0)
        
        # One-hot encode Geo-Location Flags (drop_first=True removes 'normal')
        geo_flag = features['Geo-Location Flags']
        feature_array.append(1 if geo_flag == 'high-risk' else 0)
        feature_array.append(1 if geo_flag == 'unusual' else 0)
        
        return np.array(feature_array).reshape(1, -1)
    
    def _get_device_fingerprint(self, device_info: dict) -> str:
        """Generate device fingerprint from device info"""
        fp_string = f"{device_info.get('userAgent', '')}{device_info.get('platform', '')}{device_info.get('screenRes', '')}"
        return hashlib.md5(fp_string.encode()).hexdigest()
    
    def _detect_vpn_proxy(self, device_info: dict) -> int:
        """Detect VPN or proxy usage"""
        user_agent = device_info.get('userAgent', '').lower()
        if 'proxy' in user_agent or 'vpn' in user_agent:
            return 1
        return 1 if device_info.get('vpnDetected', False) else 0
    
    def _get_geo_location_flag(self, location_info: dict, user_profile: UserProfile) -> str:
        """Determine geo-location risk flag"""
        if not location_info:
            return 'normal'
        
        city = location_info.get('city', '').lower()
        country = location_info.get('country', 'india').lower()
        
        high_risk_countries = ['russia', 'china', 'nigeria', 'ukraine', 'north korea']
        if country in high_risk_countries:
            return 'high-risk'
        
        if city and user_profile.known_locations and city not in [loc.lower() for loc in user_profile.known_locations]:
            if user_profile.total_transactions > 5:
                return 'unusual'
        
        return 'normal'
    
    def _calculate_behavioral_score(self, user_profile: UserProfile, transaction: dict) -> float:
        """Calculate behavioral biometrics deviation score"""
        if user_profile.total_transactions < 3:
            return 0.5
        
        amount = transaction.get('amount', 0)
        if user_profile.avg_amount > 0:
            return min(abs(amount - user_profile.avg_amount) / max(user_profile.avg_amount, 1), 3.0)
        return 0.5
    
    def _check_location_inconsistency(self, user_profile: UserProfile, location_info: dict, timestamp: datetime) -> int:
        """Check for impossible travel"""
        if not location_info or user_profile.total_transactions < 2:
            return 0
        
        current_city = location_info.get('city', '')
        recent_txns = [t for t in user_profile.transactions[-5:] if t.get('location')]
        
        for txn in recent_txns:
            txn_time = txn.get('timestamp', timestamp)
            txn_location = txn.get('location', {}).get('city', '')
            
            if txn_location and current_city and txn_location.lower() != current_city.lower():
                time_diff = abs((timestamp - txn_time).total_seconds()) / 3600
                if time_diff < 2:  # Less than 2 hours between different cities
                    return 1
        return 0
    
    def _detect_context_anomaly(self, user_profile: UserProfile, transaction: dict) -> float:
        """Detect transaction context anomalies using z-score"""
        if user_profile.total_transactions < 5:
            return 0.5
        
        amount = transaction.get('amount', 0)
        recent_amounts = [t.get('amount', 0) for t in user_profile.transactions[-20:]]
        
        if not recent_amounts:
            return 0.5
        
        avg = np.mean(recent_amounts)
        std = np.std(recent_amounts) if len(recent_amounts) > 1 else avg * 0.5
        
        if std > 0:
            return min(abs(amount - avg) / std, 3.0)
        return 0.5
    
    def _check_merchant_mismatch(self, recipient_profile: RecipientProfile, amount: float) -> int:
        """Check if amount mismatches merchant category"""
        category = recipient_profile.merchant_category
        if not category:
            return 0
        
        category_limits = {
            'small_vendor': 1000,
            'retail': 10000,
            'restaurant': 5000,
            'utility': 20000,
            'large_merchant': 100000
        }
        
        limit = category_limits.get(category, 50000)
        return 1 if amount > limit * 2 else 0
    
    def _get_daily_total(self, user_id: str, timestamp: datetime) -> float:
        """Get total transaction amount for user today"""
        today_start = timestamp.replace(hour=0, minute=0, second=0, microsecond=0)
        
        daily_txns = [t for t in self.transaction_history 
                     if t.get('senderUPI') == user_id 
                     and t.get('timestamp', datetime.min) >= today_start]
        
        return sum(t.get('amount', 0) for t in daily_txns)
    
    def _check_recent_high_value(self, user_id: str, timestamp: datetime) -> int:
        """Check for recent high-value transactions"""
        cutoff = timestamp - timedelta(hours=24)
        
        recent_txns = [t for t in self.transaction_history 
                      if t.get('senderUPI') == user_id 
                      and t.get('timestamp', datetime.min) >= cutoff
                      and t.get('amount', 0) > 10000]
        
        return 1 if len(recent_txns) > 0 else 0
    
    def predict_fraud(self, transaction: dict, device_info: dict = None, 
                     location_info: dict = None) -> dict:
        """
        Main prediction method using ML model for fraud detection
        """
        # Extract all 20 features
        features, reasons = self.extract_20_features(transaction, device_info, location_info)
        
        # Prepare features for ML model
        feature_array = self.prepare_features_for_model(features)
        
        # Get ML prediction
        ml_probability = 0.0
        model_used = 'rule_based'
        
        if self.ml_model is not None:
            try:
                ml_probability = float(self.ml_model.predict_proba(feature_array)[0][1])
                model_used = 'random_forest'
            except Exception as e:
                print(f"ML prediction error: {e}")
                ml_probability = self._rule_based_score(features)
        else:
            ml_probability = self._rule_based_score(features)
        
        # Calculate final risk score (0-100)
        risk_score = ml_probability * 100
        
        # Determine risk level and actions
        if risk_score >= self.thresholds['high_risk']:
            risk_level = 'high'
            should_block = True
            requires_verification = True
        elif risk_score >= self.thresholds['medium_risk']:
            risk_level = 'medium'
            should_block = False
            requires_verification = True
        else:
            risk_level = 'low'
            should_block = False
            requires_verification = False
        
        # Apply custom rules
        should_block, requires_verification, rule_reasons = self._apply_custom_rules(
            features, should_block, requires_verification
        )
        reasons.extend(rule_reasons)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(risk_level, reasons)
        
        return {
            'is_fraud': ml_probability >= 0.5,
            'fraud_probability': round(ml_probability, 4),
            'risk_score': round(risk_score, 2),
            'risk_level': risk_level,
            'should_block': should_block,
            'requires_verification': requires_verification,
            'factors': reasons,
            'feature_breakdown': features,
            'recommendations': recommendations,
            'model_used': model_used
        }
    
    def _rule_based_score(self, features: dict) -> float:
        """Fallback rule-based scoring"""
        score = 0.0
        
        # High impact
        if features.get('Recipient Blacklist Status', 0) == 1:
            score += 0.4
        if features.get('Past Fraudulent Behavior Flags', 0) > 0:
            score += 0.25
        if features.get('VPN or Proxy Usage', 0) == 1:
            score += 0.15
        
        # Medium impact
        if features.get('Geo-Location Flags') == 'high-risk':
            score += 0.2
        if features.get('Location-Inconsistent Transactions', 0) == 1:
            score += 0.15
        if features.get('Device Fingerprinting', 0) == 1:
            score += 0.1
        if features.get('High-Risk Transaction Times', 0) == 1:
            score += 0.1
        
        # Low impact
        if features.get('User Daily Limit Exceeded', 0) == 1:
            score += 0.08
        if features.get('Recent High-Value Transaction Flags', 0) == 1:
            score += 0.08
        if features.get('Transaction Frequency', 0) > 5:
            score += 0.08
        if features.get('Social Trust Score', 100) < 30:
            score += 0.08
        
        # Verification status
        status = features.get('Recipient Verification Status', 'verified')
        if status == 'suspicious':
            score += 0.12
        elif status == 'recently_registered':
            score += 0.08
        
        return min(score, 1.0)
    
    def _apply_custom_rules(self, features: dict, should_block: bool, 
                           requires_verification: bool) -> Tuple[bool, bool, List[str]]:
        """Apply custom rules"""
        reasons = []
        
        for rule in self.custom_rules:
            if not rule.get('enabled', True):
                continue
            
            if self._evaluate_rule(rule, features):
                action = rule.get('action', 'flag')
                if action == 'block':
                    should_block = True
                    reasons.append(f"Custom rule: {rule.get('name')}")
                elif action == 'flag':
                    requires_verification = True
                    reasons.append(f"Flagged by rule: {rule.get('name')}")
        
        return should_block, requires_verification, reasons
    
    def _evaluate_rule(self, rule: dict, features: dict) -> bool:
        """Evaluate a custom rule"""
        condition = rule.get('condition', {})
        field = condition.get('field', '')
        operator = condition.get('operator', '>')
        value = condition.get('value', 0)
        
        field_map = {
            'amount': 'Transaction Amount',
            'frequency': 'Transaction Frequency',
            'trust_score': 'Social Trust Score',
            'complaints': 'Fraud Complaints Count',
            'account_age': 'Account Age'
        }
        
        feature_name = field_map.get(field, field)
        feature_value = features.get(feature_name, 0)
        
        if operator == '>':
            return feature_value > value
        elif operator == '<':
            return feature_value < value
        elif operator == '>=':
            return feature_value >= value
        elif operator == '<=':
            return feature_value <= value
        elif operator == '==':
            return feature_value == value
        
        return False
    
    def _generate_recommendations(self, risk_level: str, reasons: List[str]) -> List[str]:
        """Generate recommendations"""
        recommendations = []
        
        if risk_level == 'high':
            recommendations.append("Block transaction immediately")
            recommendations.append("Verify user identity through alternate channel")
            recommendations.append("Review account for suspicious activity")
        elif risk_level == 'medium':
            recommendations.append("Request additional verification (OTP/Biometric)")
            recommendations.append("Monitor subsequent transactions closely")
        else:
            recommendations.append("Transaction appears safe")
        
        for reason in reasons:
            if 'blacklist' in reason.lower():
                recommendations.append("Report to fraud investigation team")
            if 'vpn' in reason.lower():
                recommendations.append("Verify user's actual location")
            if 'device' in reason.lower():
                recommendations.append("Confirm device ownership with user")
        
        return list(set(recommendations))
    
    def process_transaction(self, transaction: dict, device_info: dict = None,
                           location_info: dict = None, ml_prediction: float = None) -> dict:
        """Process a transaction - predict fraud and update profiles"""
        result = self.predict_fraud(transaction, device_info, location_info)
        
        # Generate transaction ID
        tx_id = hashlib.md5(
            f"{transaction.get('senderUPI')}{transaction.get('recipientUPI')}{datetime.now().isoformat()}".encode()
        ).hexdigest()[:12]
        
        # Update profiles
        user_id = transaction.get('senderUPI', '')
        recipient_id = transaction.get('recipientUPI', '')
        amount = float(transaction.get('amount', 0))
        timestamp = transaction.get('timestamp', datetime.now())
        
        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except:
                timestamp = datetime.now()
        
        user_profile = self.get_or_create_user_profile(user_id)
        recipient_profile = self.get_or_create_recipient_profile(recipient_id)
        
        # Update user profile
        user_profile.transactions.append({
            'amount': amount,
            'timestamp': timestamp,
            'recipient': recipient_id,
            'location': location_info
        })
        user_profile.total_transactions += 1
        user_profile.last_transaction_time = timestamp
        
        # Update running average
        if user_profile.avg_amount == 0:
            user_profile.avg_amount = amount
        else:
            user_profile.avg_amount = (user_profile.avg_amount * 0.9) + (amount * 0.1)
        
        # Update known devices/locations
        if device_info:
            fp = self._get_device_fingerprint(device_info)
            user_profile.known_devices.add(fp)
        if location_info and location_info.get('city'):
            user_profile.known_locations.add(location_info.get('city'))
        
        # Update recipient profile
        recipient_profile.transaction_count += 1
        recipient_profile.unique_senders.add(user_id)
        
        # Store transaction
        tx_record = {
            'id': tx_id,
            'senderUPI': user_id,
            'recipientUPI': recipient_id,
            'amount': amount,
            'timestamp': timestamp,
            'risk_score': result['risk_score'],
            'risk_level': result['risk_level'],
            'is_fraud': result['is_fraud'],
            'blocked': result['should_block'],
            'factors': result['factors']
        }
        self.transaction_history.append(tx_record)
        
        # Generate alert if needed
        alert = None
        if result['risk_level'] in ['high', 'medium']:
            alert = {
                'alert_id': f"ALT-{tx_id}",
                'transaction_id': tx_id,
                'timestamp': datetime.now().isoformat(),
                'severity': result['risk_level'],
                'risk_score': result['risk_score'],
                'transaction': {
                    'sender': user_id,
                    'recipient': recipient_id,
                    'amount': amount
                },
                'factors': result['factors'],
                'recommendations': result['recommendations']
            }
            self.alerts.append(alert)
        
        return {
            'transaction_id': tx_id,
            'status': 'blocked' if result['should_block'] else 'approved',
            'risk_assessment': result,
            'alert': alert
        }
    
    def calculate_risk_score(self, transaction: dict, device_info: dict = None, 
                            location: dict = None) -> dict:
        """Wrapper for backward compatibility"""
        return self.predict_fraud(transaction, device_info, location)
    
    # ==================== Admin Dashboard Methods ====================
    
    def get_dashboard_insights(self) -> dict:
        """Get comprehensive dashboard insights"""
        now = datetime.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today - timedelta(days=7)
        
        # Ensure valid timestamps
        for t in self.transaction_history:
            if isinstance(t.get('timestamp'), str):
                try:
                    t['timestamp'] = datetime.fromisoformat(t['timestamp'].replace('Z', '+00:00'))
                except:
                    t['timestamp'] = now - timedelta(hours=1)
        
        today_txns = [t for t in self.transaction_history 
                     if t.get('timestamp', datetime.min) >= today]
        week_txns = [t for t in self.transaction_history 
                    if t.get('timestamp', datetime.min) >= week_ago]
        
        high_risk_today = sum(1 for t in today_txns if t.get('risk_level') == 'high')
        medium_risk_today = sum(1 for t in today_txns if t.get('risk_level') == 'medium')
        blocked_today = sum(1 for t in today_txns if t.get('blocked', False))
        fraud_detected = sum(1 for t in today_txns if t.get('is_fraud', False))
        
        return {
            'summary': {
                'total_transactions_today': len(today_txns),
                'total_transactions_week': len(week_txns),
                'total_transactions_all': len(self.transaction_history),
                'high_risk_today': high_risk_today,
                'medium_risk_today': medium_risk_today,
                'blocked_today': blocked_today,
                'fraud_detected_today': fraud_detected,
                'total_amount_today': sum(t.get('amount', 0) for t in today_txns),
                'fraud_detection_rate': round((high_risk_today + medium_risk_today) / max(len(today_txns), 1) * 100, 2),
                'active_users': len(self.user_profiles),
                'monitored_recipients': len(self.recipient_profiles),
                'blacklisted_count': len(self.blacklisted_recipients)
            },
            'trends': self._calculate_trends(week_txns),
            'top_risky_users': self._get_risky_users(),
            'new_fraud_patterns': self._detect_new_patterns(),
            'payee_trust_distribution': self._get_trust_distribution(),
            'hourly_risk_distribution': self._get_hourly_distribution(today_txns),
            'feature_importance': self._get_feature_importance(),
            'feedback_stats': self._get_feedback_stats(),
            'recent_alerts': self.alerts[-20:],
            'model_info': {
                'type': 'Random Forest Classifier',
                'trained_with': 'GAN-augmented data',
                'features_count': 20,
                'feature_names': FEATURE_NAMES,
                'status': 'active' if self.ml_model else 'fallback_mode'
            }
        }
    
    def _calculate_trends(self, transactions: List[dict]) -> dict:
        """Calculate daily trends"""
        daily_counts = defaultdict(lambda: {'count': 0, 'amount': 0, 'high_risk': 0, 'fraud_detected': 0})
        
        for tx in transactions:
            ts = tx.get('timestamp', datetime.now())
            day = ts.strftime('%Y-%m-%d') if hasattr(ts, 'strftime') else str(ts)[:10]
            daily_counts[day]['count'] += 1
            daily_counts[day]['amount'] += tx.get('amount', 0)
            if tx.get('risk_level') == 'high':
                daily_counts[day]['high_risk'] += 1
            if tx.get('is_fraud'):
                daily_counts[day]['fraud_detected'] += 1
        
        return dict(daily_counts)
    
    def _get_risky_users(self, limit: int = 10) -> List[dict]:
        """Get users with highest risk"""
        user_risks = defaultdict(lambda: {'total_risk': 0, 'count': 0, 'high_risk_count': 0})
        
        for tx in self.transaction_history[-1000:]:
            user_id = tx.get('senderUPI', '')
            risk = tx.get('risk_score', 0)
            user_risks[user_id]['total_risk'] += risk
            user_risks[user_id]['count'] += 1
            if tx.get('risk_level') == 'high':
                user_risks[user_id]['high_risk_count'] += 1
        
        risky_users = []
        for user_id, data in user_risks.items():
            if data['count'] > 0:
                avg_risk = data['total_risk'] / data['count']
                risky_users.append({
                    'user_id': user_id,
                    'avg_risk': round(avg_risk, 2),
                    'transaction_count': data['count'],
                    'high_risk_transactions': data['high_risk_count']
                })
        
        return sorted(risky_users, key=lambda x: x['avg_risk'], reverse=True)[:limit]
    
    def _detect_new_patterns(self) -> List[dict]:
        """Detect fraud patterns"""
        patterns = []
        recent = self.transaction_history[-100:]
        
        if not recent:
            return patterns
        
        # Burst pattern
        burst_count = sum(1 for t in recent if 'frequency' in str(t.get('factors', [])).lower())
        if burst_count > 5:
            patterns.append({
                'pattern': 'Burst Transaction Pattern',
                'description': f'{burst_count} high-frequency transactions detected',
                'severity': 'high' if burst_count > 10 else 'medium',
                'count': burst_count
            })
        
        # New device
        new_device_count = sum(1 for t in recent if 'device' in str(t.get('factors', [])).lower())
        if new_device_count > 3:
            patterns.append({
                'pattern': 'New Device Login Spike',
                'description': f'{new_device_count} transactions from new devices',
                'severity': 'medium',
                'count': new_device_count
            })
        
        # Late night
        late_night = sum(1 for t in recent if 'high-risk time' in str(t.get('factors', [])).lower())
        if late_night > 5:
            patterns.append({
                'pattern': 'Late Night Activity',
                'description': f'{late_night} transactions during high-risk hours',
                'severity': 'medium',
                'count': late_night
            })
        
        # VPN usage
        vpn_count = sum(1 for t in recent if 'vpn' in str(t.get('factors', [])).lower())
        if vpn_count > 2:
            patterns.append({
                'pattern': 'VPN Usage Increase',
                'description': f'{vpn_count} transactions with VPN detected',
                'severity': 'medium',
                'count': vpn_count
            })
        
        return patterns
    
    def _get_trust_distribution(self) -> dict:
        """Get recipient trust score distribution"""
        distribution = {'high': 0, 'medium': 0, 'low': 0}
        
        for profile in self.recipient_profiles.values():
            score = profile.trust_score
            if score >= 70:
                distribution['high'] += 1
            elif score >= 40:
                distribution['medium'] += 1
            else:
                distribution['low'] += 1
        
        return distribution
    
    def _get_hourly_distribution(self, transactions: List[dict]) -> dict:
        """Get hourly risk distribution"""
        hourly = {str(h): {'count': 0, 'total_risk': 0, 'avg_risk': 0} for h in range(24)}
        
        for tx in transactions:
            ts = tx.get('timestamp', datetime.now())
            hour = str(ts.hour if hasattr(ts, 'hour') else 12)
            hourly[hour]['count'] += 1
            hourly[hour]['total_risk'] += tx.get('risk_score', 0)
        
        for hour in hourly:
            if hourly[hour]['count'] > 0:
                hourly[hour]['avg_risk'] = round(hourly[hour]['total_risk'] / hourly[hour]['count'], 2)
        
        return hourly
    
    def _get_feature_importance(self) -> List[dict]:
        """Get feature importance from ML model or defaults"""
        if self.ml_model is not None and hasattr(self.ml_model, 'feature_importances_'):
            importances = self.ml_model.feature_importances_
            
            feature_names_encoded = [
                'Transaction Amount', 'Transaction Frequency', 'Blacklist Status',
                'Device Fingerprinting', 'VPN/Proxy Usage', 'Behavioral Biometrics',
                'Time Since Last Tx', 'Social Trust Score', 'Account Age',
                'High-Risk Time', 'Past Fraud Flags', 'Location Inconsistent',
                'Normalized Amount', 'Context Anomalies', 'Fraud Complaints',
                'Merchant Mismatch', 'Daily Limit Exceeded', 'Recent High Value',
                'Recently Registered', 'Suspicious Status', 'High-Risk Location', 'Unusual Location'
            ]
            
            result = []
            for i, name in enumerate(feature_names_encoded[:min(len(importances), len(feature_names_encoded))]):
                result.append({
                    'feature': name,
                    'importance': round(float(importances[i]) * 100, 2)
                })
            
            return sorted(result, key=lambda x: x['importance'], reverse=True)
        
        # Default importance based on rule weights
        return [
            {'feature': 'Recipient Blacklist Status', 'importance': 18.5},
            {'feature': 'Past Fraudulent Behavior', 'importance': 15.2},
            {'feature': 'VPN/Proxy Usage', 'importance': 12.8},
            {'feature': 'Geo-Location Flags', 'importance': 11.5},
            {'feature': 'Device Fingerprinting', 'importance': 10.2},
            {'feature': 'Transaction Amount', 'importance': 8.5},
            {'feature': 'High-Risk Transaction Times', 'importance': 7.8},
            {'feature': 'Transaction Frequency', 'importance': 6.5},
            {'feature': 'Social Trust Score', 'importance': 5.2},
            {'feature': 'Account Age', 'importance': 3.8}
        ]
    
    def _get_feedback_stats(self) -> dict:
        """Get feedback statistics"""
        total = len(self.feedback_records)
        fraud_confirmed = sum(1 for f in self.feedback_records if f.get('is_fraud'))
        
        return {
            'total_feedback': total,
            'fraud_reports': fraud_confirmed,
            'false_positives': total - fraud_confirmed,
            'feedback_rate': round(total / max(len(self.transaction_history), 1) * 100, 2)
        }
    
    # ==================== Rules Management ====================
    
    def add_custom_rule(self, rule: dict) -> dict:
        """Add a custom rule"""
        rule['id'] = len(self.custom_rules) + 1
        rule['created_at'] = datetime.now().isoformat()
        rule['enabled'] = rule.get('enabled', True)
        self.custom_rules.append(rule)
        return rule
    
    def get_rules(self) -> List[dict]:
        """Get all rules"""
        return self.custom_rules
    
    def update_rule(self, rule_id: int, updates: dict) -> Optional[dict]:
        """Update a rule"""
        for rule in self.custom_rules:
            if rule.get('id') == rule_id:
                rule.update(updates)
                return rule
        return None
    
    def delete_rule(self, rule_id: int):
        """Delete a rule"""
        self.custom_rules = [r for r in self.custom_rules if r.get('id') != rule_id]
    
    # ==================== Feedback ====================
    
    def record_feedback(self, transaction_id: str, is_fraud: bool, reported_by: str = 'user') -> dict:
        """Record feedback"""
        feedback = {
            'transaction_id': transaction_id,
            'is_fraud': is_fraud,
            'reported_by': reported_by,
            'timestamp': datetime.now().isoformat()
        }
        self.feedback_records.append(feedback)
        
        # Update profiles based on feedback
        for tx in self.transaction_history:
            if tx.get('id') == transaction_id:
                if is_fraud:
                    user_id = tx.get('senderUPI')
                    recipient_id = tx.get('recipientUPI')
                    
                    if user_id in self.user_profiles:
                        self.user_profiles[user_id].past_fraudulent_flags += 1
                    
                    if recipient_id in self.recipient_profiles:
                        self.recipient_profiles[recipient_id].fraud_reports += 1
                        self.recipient_profiles[recipient_id].trust_score = max(0, 
                            self.recipient_profiles[recipient_id].trust_score - 20)
                break
        
        return feedback
    
    def get_feedback_stats(self) -> dict:
        """Get feedback stats"""
        return self._get_feedback_stats()
    
    # ==================== Simulation ====================
    
    def simulate_transaction(self, transaction: dict, scenario: str = 'normal') -> dict:
        """Simulate transaction scenarios"""
        sim_transaction = transaction.copy()
        device_info = {}
        location_info = {}
        
        user_id = transaction.get('senderUPI', 'test@upi')
        
        if scenario == 'burst_attack':
            user_profile = self.get_or_create_user_profile(user_id)
            for i in range(5):
                user_profile.transactions.append({
                    'amount': transaction.get('amount', 1000),
                    'timestamp': datetime.now() - timedelta(minutes=i*2),
                    'recipient': transaction.get('recipientUPI', 'merchant@upi')
                })
            user_profile.total_transactions += 5
        
        elif scenario == 'new_device':
            device_info = {
                'userAgent': 'Unknown/New Device Browser',
                'platform': 'UnknownOS',
                'screenRes': '9999x9999'
            }
        
        elif scenario == 'late_night_high':
            sim_transaction['timestamp'] = datetime.now().replace(hour=2)
            sim_transaction['amount'] = float(transaction.get('amount', 1000)) * 5
        
        elif scenario == 'new_payee_high':
            sim_transaction['amount'] = float(transaction.get('amount', 1000)) * 3
            recipient_id = sim_transaction.get('recipientUPI', 'new@upi')
            recipient = self.get_or_create_recipient_profile(recipient_id)
            recipient.trust_score = 20
            recipient.verification_status = 'recently_registered'
        
        elif scenario == 'location_anomaly':
            location_info = {'city': 'Unknown City', 'country': 'russia'}
        
        elif scenario == 'vpn_detected':
            device_info = {'userAgent': 'Mozilla vpn proxy', 'vpnDetected': True}
        
        elif scenario == 'blacklisted_recipient':
            recipient_id = sim_transaction.get('recipientUPI', 'blocked@upi')
            self.blacklisted_recipients.add(recipient_id)
            recipient = self.get_or_create_recipient_profile(recipient_id)
            recipient.is_blacklisted = True
        
        result = self.predict_fraud(sim_transaction, device_info, location_info)
        result['scenario'] = scenario
        result['simulated'] = True
        
        return result
    
    def replay_transactions(self, transactions: List[dict]) -> List[dict]:
        """Replay transactions for analysis"""
        results = []
        for tx in transactions:
            result = self.calculate_risk_score(tx)
            result['transaction_id'] = tx.get('id')
            results.append(result)
        return results
    
    # ==================== Blacklist ====================
    
    def blacklist_recipient(self, recipient_id: str, reason: str = '') -> dict:
        """Add to blacklist"""
        self.blacklisted_recipients.add(recipient_id)
        profile = self.get_or_create_recipient_profile(recipient_id)
        profile.is_blacklisted = True
        profile.trust_score = 0
        
        return {
            'recipient_id': recipient_id,
            'blacklisted': True,
            'reason': reason,
            'timestamp': datetime.now().isoformat()
        }
    
    def remove_from_blacklist(self, recipient_id: str) -> dict:
        """Remove from blacklist"""
        self.blacklisted_recipients.discard(recipient_id)
        if recipient_id in self.recipient_profiles:
            self.recipient_profiles[recipient_id].is_blacklisted = False
            self.recipient_profiles[recipient_id].trust_score = 30
        
        return {
            'recipient_id': recipient_id,
            'blacklisted': False,
            'timestamp': datetime.now().isoformat()
        }
    
    # ==================== User Risk Profile ====================
    
    def get_user_risk_profile(self, user_id: str) -> dict:
        """Get user risk profile"""
        profile = self.user_profiles.get(user_id)
        
        if not profile:
            return {
                'user_id': user_id,
                'status': 'new_user',
                'risk_level': 'unknown',
                'total_transactions': 0
            }
        
        # Calculate user's average risk
        user_txns = [t for t in self.transaction_history if t.get('senderUPI') == user_id]
        avg_risk = np.mean([t.get('risk_score', 0) for t in user_txns]) if user_txns else 0
        
        return {
            'user_id': user_id,
            'status': 'active',
            'risk_level': 'high' if avg_risk >= 70 else ('medium' if avg_risk >= 40 else 'low'),
            'avg_risk_score': round(avg_risk, 2),
            'total_transactions': profile.total_transactions,
            'avg_amount': round(profile.avg_amount, 2),
            'known_devices': len(profile.known_devices),
            'known_locations': list(profile.known_locations),
            'past_fraud_flags': profile.past_fraudulent_flags,
            'account_age_days': (datetime.now() - profile.account_created).days
        }
    
    # ==================== Alerts ====================
    
    def generate_alert(self, risk_result: dict, transaction: dict) -> dict:
        """Generate alert from risk result"""
        return {
            'alert_id': hashlib.md5(f"{transaction.get('senderUPI')}{datetime.now().isoformat()}".encode()).hexdigest()[:12],
            'timestamp': datetime.now().isoformat(),
            'severity': risk_result.get('risk_level', 'low'),
            'risk_score': risk_result.get('risk_score', 0),
            'transaction': {
                'sender': transaction.get('senderUPI'),
                'recipient': transaction.get('recipientUPI'),
                'amount': transaction.get('amount'),
            },
            'factors': risk_result.get('factors', []),
            'recommendations': risk_result.get('recommendations', [])
        }
    
    def analyze_post_transaction(self, transaction_id: str) -> dict:
        """Post-transaction analysis"""
        for tx in self.transaction_history:
            if tx.get('id') == transaction_id:
                return {
                    'transaction_id': transaction_id,
                    'risk_score': tx.get('risk_score'),
                    'risk_level': tx.get('risk_level'),
                    'factors': tx.get('factors', []),
                    'blocked': tx.get('blocked', False),
                    'analysis_time': datetime.now().isoformat()
                }
        
        return {'error': 'Transaction not found'}


# Create global instance
fraud_engine = FraudDetectionEngine()
