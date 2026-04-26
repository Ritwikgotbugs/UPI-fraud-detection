"""
Fraudulent.ai - Advanced UPI Fraud Detection API
RESTful API using Random Forest ML Model with 20 fraud detection features
Trained on GAN-augmented dataset for enhanced fraud detection
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
from datetime import datetime
import json
import os


from fraud_detection_engine import fraud_engine, FraudDetectionEngine, FEATURE_NAMES
from core_pages import register_core_routes

app = Flask(__name__)

CORS(app)

register_core_routes(app)


ml_model = None
try:
    model_path = "best_rf_model (1).pkl"
    with open(model_path, "rb") as file:
        ml_model = pickle.load(file)
    
    fraud_engine.set_ml_model(ml_model)
    print("[OK] ML model loaded and integrated with fraud engine successfully")
    print(f"   Model type: {type(ml_model).__name__}")
    if hasattr(ml_model, 'n_features_in_'):
        print(f"   Features expected: {ml_model.n_features_in_}")
except Exception as e:
    print(f"[WARN] Warning: ML model not loaded: {e}")
    print("   Running in rule-based fallback mode")



@app.route('/')
def home():
    return jsonify({
        "service": "Fraudulent.ai - UPI Fraud Detection API",
        "version": "3.0",
        "status": "healthy",
        "ml_model_status": "active" if ml_model else "fallback_mode",
        "features_count": 20,
        "feature_names": FEATURE_NAMES,
        "capabilities": [
            "Real-time ML-based fraud prediction",
            "20-parameter fraud analysis",
            "GAN-augmented training data",
            "Behavioral Biometrics",
            "Device Fingerprinting",
            "Geo-location Analysis",
            "VPN/Proxy Detection",
            "Velocity & Burst Detection",
            "Payee Trust Scoring",
            "Blacklist Management",
            "Custom Rule Engine",
            "Admin Dashboard Analytics",
            "Transaction Simulation",
            "Feedback Learning Loop"
        ]
    })



@app.route('/api/analyze', methods=['POST'])
def analyze_transaction():
    """
    Main endpoint for real-time transaction analysis using ML model
    Extracts 20 features and predicts fraud probability
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        
        transaction = {
            'senderUPI': data.get('senderUPI', ''),
            'recipientUPI': data.get('recipientUPI', ''),
            'amount': float(data.get('amount', 0)),
            'remarks': data.get('remarks', ''),
            'timestamp': datetime.fromisoformat(data.get('timestamp').replace('Z', '+00:00')) if data.get('timestamp') else datetime.now()
        }
        
        
        device_info = data.get('deviceInfo', {})
        location = data.get('location', {})
        
        
        result = fraud_engine.process_transaction(
            transaction, 
            device_info, 
            location
        )
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/risk-score', methods=['POST'])
def get_risk_score():
    """Quick risk score using ML model without storing transaction"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        transaction = {
            'senderUPI': data.get('senderUPI', ''),
            'recipientUPI': data.get('recipientUPI', ''),
            'amount': float(data.get('amount', 0)),
            'timestamp': datetime.now()
        }
        
        
        result = fraud_engine.predict_fraud(
            transaction,
            data.get('deviceInfo', {}),
            data.get('location', {})
        )
        
        return jsonify({
            'risk_score': result['risk_score'],
            'risk_level': result['risk_level'],
            'fraud_probability': result['fraud_probability'],
            'is_fraud': result['is_fraud'],
            'should_block': result['should_block'],
            'requires_verification': result['requires_verification'],
            'factors': result['factors'],
            'feature_breakdown': result['feature_breakdown'],
            'recommendations': result['recommendations'],
            'model_used': result['model_used']
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/predict', methods=['POST'])
def predict():
    """
    Direct ML model prediction endpoint
    Accepts either raw features array, named features dict, or transaction data
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        
        if 'features' in data and isinstance(data['features'], dict):
            if ml_model is None:
                return jsonify({"error": "ML model not available"}), 503
            
            
            raw_features = data['features']
            
            
            features = {
                'transaction_amount': raw_features.get('amount', raw_features.get('transaction_amount', 0)),
                'transaction_frequency': raw_features.get('transaction_frequency', 5),
                'recipient_verification_status': raw_features.get('recipient_verification_status', 'verified'),
                'recipient_blacklist_status': raw_features.get('recipient_blacklist_status', 0),
                'device_fingerprinting': raw_features.get('device_fingerprinting', 0.5),
                'vpn_proxy_usage': raw_features.get('vpn_proxy_usage', 0),
                'geo_location_flags': raw_features.get('geo_location_flags', 'normal'),
                'behavioral_biometrics': raw_features.get('behavioral_biometrics', 0.5),
                'time_since_last_transaction': raw_features.get('time_since_last_transaction', 30),
                'social_trust_score': raw_features.get('social_trust_score', 50),
                'account_age': raw_features.get('account_age', 180),
                'high_risk_transaction_times': raw_features.get('high_risk_transaction_times', 0),
                'past_fraudulent_behavior_flags': raw_features.get('past_fraudulent_behavior_flags', 0),
                'location_inconsistent_transactions': raw_features.get('location_inconsistent_transactions', 0),
                'normalized_transaction_amount': raw_features.get('normalized_transaction_amount', 0.1),
                'transaction_context_anomalies': raw_features.get('transaction_context_anomalies', 0),
                'fraud_complaints_count': raw_features.get('fraud_complaints_count', 0),
                'merchant_category_mismatch': raw_features.get('merchant_category_mismatch', 0),
                'user_daily_limit_exceeded': raw_features.get('user_daily_limit_exceeded', 0),
                'recent_high_value_transaction_flags': raw_features.get('recent_high_value_transaction_flags', 0)
            }
            
            
            feature_array = fraud_engine.prepare_features_for_model(features)
            
            prediction = ml_model.predict(feature_array)
            probability = ml_model.predict_proba(feature_array)[0].tolist() if hasattr(ml_model, 'predict_proba') else None
            
            fraud_prob = probability[1] if probability else (0.9 if prediction[0] == 1 else 0.1)
            risk_score = fraud_prob * 100
            
            
            factors = []
            if features['recipient_blacklist_status'] == 1:
                factors.append('[BLOCK] Recipient is on BLACKLIST')
            if features['vpn_proxy_usage'] == 1:
                factors.append('[VPN] VPN/Proxy usage detected')
            if features['geo_location_flags'] == 'high-risk':
                factors.append('[GEO] Transaction from HIGH-RISK geo-location')
            if features['high_risk_transaction_times'] == 1:
                factors.append('[TIME] Transaction at high-risk time')
            if features['fraud_complaints_count'] > 0:
                factors.append(f'[WARN] {features["fraud_complaints_count"]} fraud complaint(s) on record')
            if features['recipient_verification_status'] == 'recently_registered':
                factors.append('[NEW] Recipient is recently registered')
            if features['transaction_amount'] > 1000:
                factors.append(f'[AMT] High transaction amount: Rs.{features["transaction_amount"]}')
            if features['social_trust_score'] < 30:
                factors.append(f'[LOW] Low social trust score: {features["social_trust_score"]}')
            if features['past_fraudulent_behavior_flags'] == 1:
                factors.append('[FLAG] Past fraudulent behavior detected')
            if features['location_inconsistent_transactions'] == 1:
                factors.append('[LOC] Location inconsistent with history')
            if features['user_daily_limit_exceeded'] == 1:
                factors.append('[LIMIT] User daily limit exceeded')
            if features['normalized_transaction_amount'] > 0.5:
                factors.append(f'[HIGH] Normalized amount above threshold: {features["normalized_transaction_amount"]:.2f}')
            
            if not factors:
                factors.append('[OK] No significant risk factors detected')
            
            return jsonify({
                "prediction": prediction.tolist(),
                "probability": probability,
                "is_fraud": bool(prediction[0]),
                "fraud_probability": fraud_prob,
                "risk_score": risk_score,
                "risk_level": 'high' if risk_score >= 70 else 'medium' if risk_score >= 40 else 'low',
                "should_block": risk_score >= 70,
                "requires_verification": 40 <= risk_score < 70,
                "factors": factors,
                "recommendations": [
                    'BLOCK this transaction and flag for review' if prediction[0] == 1 else 'Transaction appears safe',
                    'Notify fraud investigation team' if prediction[0] == 1 else 'Continue monitoring',
                    'Contact user for verification' if prediction[0] == 1 else 'No immediate action required'
                ],
                "feature_breakdown": features,
                "model_used": "random_forest",
                "expected_label": data.get('expected_label')
            })
        
        
        if 'features' in data and isinstance(data['features'], list):
            if ml_model is None:
                return jsonify({"error": "ML model not available"}), 503
            
            features = np.array(data['features']).reshape(1, -1)
            prediction = ml_model.predict(features)
            probability = ml_model.predict_proba(features)[0].tolist() if hasattr(ml_model, 'predict_proba') else None
            
            return jsonify({
                "prediction": prediction.tolist(),
                "probability": probability,
                "is_fraud": bool(prediction[0]),
                "fraud_probability": probability[1] if probability else None,
                "model_used": "random_forest"
            })
        
        
        transaction = {
            'senderUPI': data.get('senderUPI', ''),
            'recipientUPI': data.get('recipientUPI', ''),
            'amount': float(data.get('amount', 0)),
            'timestamp': datetime.now()
        }
        
        result = fraud_engine.predict_fraud(
            transaction,
            data.get('deviceInfo', {}),
            data.get('location', {})
        )
        
        return jsonify({
            "prediction": [1 if result['is_fraud'] else 0],
            "probability": [1 - result['fraud_probability'], result['fraud_probability']],
            "is_fraud": result['is_fraud'],
            "fraud_probability": result['fraud_probability'],
            "risk_score": result['risk_score'],
            "feature_breakdown": result['feature_breakdown'],
            "model_used": result['model_used']
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500



@app.route('/api/extract-features', methods=['POST'])
def extract_features():
    """
    Extract all 20 ML features from transaction data
    Useful for debugging and understanding model inputs
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        transaction = {
            'senderUPI': data.get('senderUPI', ''),
            'recipientUPI': data.get('recipientUPI', ''),
            'amount': float(data.get('amount', 0)),
            'timestamp': datetime.now()
        }
        
        features, reasons = fraud_engine.extract_20_features(
            transaction,
            data.get('deviceInfo', {}),
            data.get('location', {})
        )
        
        
        feature_array = fraud_engine.prepare_features_for_model(features)
        
        return jsonify({
            'features': features,
            'feature_names': FEATURE_NAMES,
            'preprocessed_array': feature_array.tolist()[0],
            'risk_reasons': reasons
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/user/profile/<user_id>', methods=['GET'])
def get_user_profile(user_id):
    """Get user's behavioral profile and risk assessment"""
    try:
        profile = fraud_engine.get_user_risk_profile(user_id)
        return jsonify(profile)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/user/profile/<user_id>/update', methods=['POST'])
def update_user_profile(user_id):
    """Update user's behavioral profile with new transaction"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        fraud_engine.update_behavioral_profile(user_id, data)
        return jsonify({"status": "success", "message": "Profile updated"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/payee/trust/<payee_id>', methods=['GET'])
def get_payee_trust(payee_id):
    """Get trust score for a payee"""
    try:
        risk, reasons = fraud_engine.get_payee_trust_score(payee_id, "anonymous")
        trust_score = 100 - risk
        
        return jsonify({
            'payee_id': payee_id,
            'trust_score': trust_score,
            'risk_score': risk,
            'reasons': reasons,
            'trust_level': 'high' if trust_score >= 70 else ('medium' if trust_score >= 40 else 'low')
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/payee/report', methods=['POST'])
def report_payee():
    """Report a payee as fraudulent"""
    data = request.get_json()
    if not data or not data.get('payeeId'):
        return jsonify({"error": "Payee ID required"}), 400
    
    try:
        payee_id = data['payeeId']
        reporter_id = data.get('reporterId', 'anonymous')
        
        
        fraud_engine.update_payee_trust(payee_id, reporter_id, 0, is_fraud=True)
        
        return jsonify({
            'status': 'success',
            'message': 'Report recorded',
            'payee_id': payee_id
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/failed-attempt', methods=['POST'])
def record_failed_attempt():
    """Record a failed authentication attempt"""
    data = request.get_json()
    if not data or not data.get('userId'):
        return jsonify({"error": "User ID required"}), 400
    
    try:
        fraud_engine.record_failed_attempt(
            data['userId'],
            data.get('attemptType', 'pin')
        )
        return jsonify({"status": "success", "message": "Failed attempt recorded"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/feedback', methods=['POST'])
def submit_feedback():
    """Submit feedback on a transaction (fraud/not fraud)"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        feedback = fraud_engine.record_feedback(
            data.get('transactionId', ''),
            data.get('isFraud', False),
            data.get('reportedBy', 'user')
        )
        return jsonify({"status": "success", "feedback": feedback})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/feedback/stats', methods=['GET'])
def get_feedback_stats():
    """Get feedback statistics for model improvement"""
    try:
        stats = fraud_engine.get_feedback_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/simulate', methods=['POST'])
def simulate_transaction():
    """Simulate a transaction with different scenarios"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        transaction = {
            'senderUPI': data.get('senderUPI', 'test@upi'),
            'recipientUPI': data.get('recipientUPI', 'receiver@upi'),
            'amount': float(data.get('amount', 1000)),
            'timestamp': datetime.now()
        }
        
        scenario = data.get('scenario', 'normal')
        result = fraud_engine.simulate_transaction(transaction, scenario)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/simulate/scenarios', methods=['GET'])
def get_scenarios():
    """Get available simulation scenarios"""
    return jsonify({
        'scenarios': [
            {'id': 'normal', 'name': 'Normal Transaction', 'description': 'Standard transaction with no anomalies'},
            {'id': 'burst_attack', 'name': 'Burst Attack', 'description': 'Multiple rapid transactions'},
            {'id': 'new_device', 'name': 'New Device', 'description': 'Transaction from unknown device'},
            {'id': 'late_night_high', 'name': 'Late Night High Value', 'description': 'Large amount at 2 AM'},
            {'id': 'new_payee_high', 'name': 'New Payee High Value', 'description': 'First-time payee with high amount'},
            {'id': 'location_anomaly', 'name': 'Location Anomaly', 'description': 'Transaction from unusual location'},
            {'id': 'failed_attempts', 'name': 'Failed PIN Attempts', 'description': '5 failed attempts before success'}
        ]
    })


@app.route('/api/replay', methods=['POST'])
def replay_transactions():
    """Replay historical transactions for analysis"""
    data = request.get_json()
    if not data or not data.get('transactions'):
        return jsonify({"error": "Transactions array required"}), 400
    
    try:
        results = fraud_engine.replay_transactions(data['transactions'])
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/admin/dashboard', methods=['GET'])
def get_dashboard():
    """Get comprehensive admin dashboard insights"""
    try:
        insights = fraud_engine.get_dashboard_insights()
        return jsonify(insights)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/risky-users', methods=['GET'])
def get_risky_users():
    """Get list of risky users"""
    try:
        limit = request.args.get('limit', 10, type=int)
        users = fraud_engine._get_risky_users(limit)
        return jsonify({'risky_users': users})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/patterns', methods=['GET'])
def get_fraud_patterns():
    """Get detected fraud patterns"""
    try:
        patterns = fraud_engine._detect_new_patterns()
        return jsonify({'patterns': patterns})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/trends', methods=['GET'])
def get_trends():
    """Get transaction and fraud trends"""
    try:
        insights = fraud_engine.get_dashboard_insights()
        return jsonify({
            'trends': insights.get('trends', {}),
            'hourly_distribution': insights.get('hourly_risk_distribution', {}),
            'summary': insights.get('summary', {})
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/feature-importance', methods=['GET'])
def get_feature_importance():
    """Get ML model feature importance"""
    try:
        importance = fraud_engine._get_feature_importance()
        return jsonify({
            'feature_importance': importance,
            'model_status': 'active' if ml_model else 'fallback_mode'
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/alerts', methods=['GET'])
def get_admin_alerts():
    """Get recent fraud alerts"""
    try:
        limit = request.args.get('limit', 20, type=int)
        alerts = fraud_engine.alerts[-limit:] if fraud_engine.alerts else []
        return jsonify({'alerts': alerts})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/model-info', methods=['GET'])
def get_model_info():
    """Get ML model information"""
    try:
        model_info = {
            'status': 'active' if ml_model else 'fallback_mode',
            'type': type(ml_model).__name__ if ml_model else 'None',
            'features_count': 20,
            'feature_names': FEATURE_NAMES,
            'training_method': 'GAN-augmented Random Forest',
        }
        
        if ml_model and hasattr(ml_model, 'n_features_in_'):
            model_info['n_features_in'] = ml_model.n_features_in_
        if ml_model and hasattr(ml_model, 'n_estimators'):
            model_info['n_estimators'] = ml_model.n_estimators
        if ml_model and hasattr(ml_model, 'feature_importances_'):
            model_info['has_feature_importances'] = True
            
        return jsonify(model_info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/transactions', methods=['GET'])
def get_transactions():
    """Get recent transactions with risk data"""
    try:
        limit = request.args.get('limit', 50, type=int)
        risk_level = request.args.get('risk_level', None)
        
        transactions = fraud_engine.transaction_history[-limit:]
        
        if risk_level:
            transactions = [t for t in transactions if t.get('risk_level') == risk_level]
        
        
        formatted = []
        for tx in transactions:
            formatted.append({
                'id': tx.get('id'),
                'sender': tx.get('senderUPI'),
                'recipient': tx.get('recipientUPI'),
                'amount': tx.get('amount'),
                'timestamp': tx.get('timestamp').isoformat() if hasattr(tx.get('timestamp'), 'isoformat') else str(tx.get('timestamp')),
                'risk_score': tx.get('risk_score'),
                'risk_level': tx.get('risk_level'),
                'is_fraud': tx.get('is_fraud'),
                'blocked': tx.get('blocked'),
                'factors': tx.get('factors', [])
            })
        
        return jsonify({'transactions': formatted})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/rules', methods=['GET'])
def get_rules():
    """Get all custom rules"""
    try:
        rules = fraud_engine.get_rules()
        return jsonify({'rules': rules})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/rules', methods=['POST'])
def add_rule():
    """Add a new custom rule"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Rule data required"}), 400
    
    try:
        rule = fraud_engine.add_custom_rule(data)
        return jsonify({'status': 'success', 'rule': rule})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/rules/<int:rule_id>', methods=['PUT'])
def update_rule(rule_id):
    """Update an existing rule"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Rule data required"}), 400
    
    try:
        rule = fraud_engine.update_rule(rule_id, data)
        if rule:
            return jsonify({'status': 'success', 'rule': rule})
        return jsonify({"error": "Rule not found"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/rules/<int:rule_id>', methods=['DELETE'])
def delete_rule(rule_id):
    """Delete a custom rule"""
    try:
        fraud_engine.delete_rule(rule_id)
        return jsonify({'status': 'success', 'message': 'Rule deleted'})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/analyze/post/<transaction_id>', methods=['GET'])
def post_transaction_analysis(transaction_id):
    """Perform post-transaction analysis"""
    try:
        result = fraud_engine.analyze_post_transaction(transaction_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/config/thresholds', methods=['GET'])
def get_thresholds():
    """Get current risk thresholds"""
    return jsonify(fraud_engine.thresholds)


@app.route('/api/config/thresholds', methods=['PUT'])
def update_thresholds():
    """Update risk thresholds"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Threshold data required"}), 400
    
    try:
        if 'high_risk' in data:
            fraud_engine.thresholds['high_risk'] = float(data['high_risk'])
        if 'medium_risk' in data:
            fraud_engine.thresholds['medium_risk'] = float(data['medium_risk'])
        if 'low_risk' in data:
            fraud_engine.thresholds['low_risk'] = float(data['low_risk'])
        
        return jsonify({'status': 'success', 'thresholds': fraud_engine.thresholds})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/config/weights', methods=['GET'])
def get_weights():
    """Get current risk factor weights"""
    return jsonify(fraud_engine.weights)


@app.route('/api/config/weights', methods=['PUT'])
def update_weights():
    """Update risk factor weights"""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Weight data required"}), 400
    
    try:
        for key, value in data.items():
            if key in fraud_engine.weights:
                fraud_engine.weights[key] = float(value)
        
        return jsonify({'status': 'success', 'weights': fraud_engine.weights})
    except Exception as e:
        return jsonify({"error": str(e)}), 500



@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Get recent alerts"""
    try:
        
        alerts = []
        for tx in fraud_engine.transaction_history[-100:]:
            if tx.get('risk_level') in ['high', 'medium']:
                alert = fraud_engine.generate_alert(
                    {'risk_score': tx.get('risk_score', 0),
                     'risk_level': tx.get('risk_level', 'low'),
                     'factors': tx.get('factors', []),
                     'breakdown': {},
                     'recommendations': []},
                    tx
                )
                alerts.append(alert)
        
        return jsonify({'alerts': alerts[-20:]})  
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    
    fraud_engine.add_custom_rule({
        'name': 'Block very high value transactions',
        'condition': {'field': 'amount', 'operator': '>', 'value': 100000},
        'action': 'block',
        'enabled': True
    })
    
    fraud_engine.add_custom_rule({
        'name': 'Flag late night high value',
        'condition': {'field': 'amount', 'operator': '>', 'value': 10000},
        'additional_conditions': [
            {'field': 'hour', 'operator': 'in', 'value': [23, 0, 1, 2, 3, 4, 5]}
        ],
        'action': 'add_risk',
        'risk_modifier': 20,
        'enabled': True
    })
    
    print("\n=== UPI Fraud Detection API ===")
    print("Starting server on http://localhost:5000")
    print("Documentation: http://localhost:5000/")
    
    app.run(debug=True, port=5000)
