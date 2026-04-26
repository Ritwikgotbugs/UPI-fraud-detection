"""
Seeded data + API routes for the 4 core admin pages:
  1. /api/heatmap/risk        — India risk heatmap (city-level)
  2. /api/heatmap/complaints  — Complaints heatmap (city-level)
  3. /api/intelligence        — Blacklisted IPs, PINs, numbers, UPI IDs (CRUD)
  4. /api/reinforcement       — Reinforcement learning analysis
"""

import random, hashlib, copy
from datetime import datetime, timedelta

random.seed(42)

# ─── Indian cities with real coordinates ───
CITIES = [
    ("Mumbai", "Maharashtra", 19.076, 72.8777),
    ("Delhi", "Delhi", 28.7041, 77.1025),
    ("Bangalore", "Karnataka", 12.9716, 77.5946),
    ("Chennai", "Tamil Nadu", 13.0827, 80.2707),
    ("Hyderabad", "Telangana", 17.385, 78.4867),
    ("Kolkata", "West Bengal", 22.5726, 88.3639),
    ("Pune", "Maharashtra", 18.5204, 73.8567),
    ("Ahmedabad", "Gujarat", 23.0225, 72.5714),
    ("Jaipur", "Rajasthan", 26.9124, 75.7873),
    ("Lucknow", "Uttar Pradesh", 26.8467, 80.9462),
    ("Surat", "Gujarat", 21.1702, 72.8311),
    ("Kanpur", "Uttar Pradesh", 26.4499, 80.3319),
    ("Nagpur", "Maharashtra", 21.1458, 79.0882),
    ("Indore", "Madhya Pradesh", 22.7196, 75.8577),
    ("Thane", "Maharashtra", 19.2183, 72.9781),
    ("Bhopal", "Madhya Pradesh", 23.2599, 77.4126),
    ("Visakhapatnam", "Andhra Pradesh", 17.6868, 83.2185),
    ("Patna", "Bihar", 25.6093, 85.1376),
    ("Vadodara", "Gujarat", 22.3072, 73.1812),
    ("Ghaziabad", "Uttar Pradesh", 28.6692, 77.4538),
    ("Ludhiana", "Punjab", 30.901, 75.8573),
    ("Agra", "Uttar Pradesh", 27.1767, 78.0081),
    ("Nashik", "Maharashtra", 19.9975, 73.7898),
    ("Ranchi", "Jharkhand", 23.3441, 85.3096),
    ("Coimbatore", "Tamil Nadu", 11.0168, 76.9558),
    ("Kochi", "Kerala", 9.9312, 76.2673),
    ("Guwahati", "Assam", 26.1445, 91.7362),
    ("Chandigarh", "Chandigarh", 30.7333, 76.7794),
    ("Mysore", "Karnataka", 12.2958, 76.6394),
    ("Trivandrum", "Kerala", 8.5241, 76.9366),
    ("Varanasi", "Uttar Pradesh", 25.3176, 82.9739),
    ("Amritsar", "Punjab", 31.634, 74.8723),
    ("Jodhpur", "Rajasthan", 26.2389, 73.0243),
    ("Raipur", "Chhattisgarh", 21.2514, 81.6296),
    ("Dehradun", "Uttarakhand", 30.3165, 78.0322),
    ("Goa", "Goa", 15.2993, 74.124),
    ("Shimla", "Himachal Pradesh", 31.1048, 77.1734),
    ("Bhubaneswar", "Odisha", 20.2961, 85.8245),
    ("Mangalore", "Karnataka", 12.9141, 74.856),
    ("Madurai", "Tamil Nadu", 9.9252, 78.1198),
    ("Vijayawada", "Andhra Pradesh", 16.5062, 80.648),
    ("Rajkot", "Gujarat", 22.3039, 70.8022),
    ("Jabalpur", "Madhya Pradesh", 23.1815, 79.9864),
    ("Tiruchirappalli", "Tamil Nadu", 10.7905, 78.7047),
    ("Aurangabad", "Maharashtra", 19.8762, 75.3433),
    ("Jammu", "Jammu & Kashmir", 32.7266, 74.857),
    ("Udaipur", "Rajasthan", 24.5854, 73.7125),
    ("Warangal", "Telangana", 17.9784, 79.5941),
    ("Meerut", "Uttar Pradesh", 28.9845, 77.7064),
    ("Allahabad", "Uttar Pradesh", 25.4358, 81.8463),
]

NAMES = [
    "Aarav Sharma", "Vivaan Patel", "Aditya Singh", "Vihaan Kumar", "Arjun Reddy",
    "Sai Krishnan", "Reyansh Gupta", "Ayaan Joshi", "Krishna Iyer", "Ishaan Nair",
    "Ananya Mishra", "Diya Banerjee", "Myra Kapoor", "Sara Sinha", "Aanya Pandey",
    "Rohan Bhatt", "Karan Naidu", "Nikhil Shetty", "Rahul Prasad", "Amit Dubey",
    "Priya Verma", "Neha Agarwal", "Pooja Tiwari", "Sneha Rao", "Meera Pillai",
    "Vikram Chauhan", "Deepak Jain", "Manish Goyal", "Rajesh Khanna", "Suresh Yadav",
]

COMPLAINT_TYPES = [
    "Unauthorized transaction", "Phishing attack", "SIM swap fraud",
    "QR code scam", "Fake UPI ID", "Money not received",
    "Double debit", "Refund not processed", "Account takeover",
    "Impersonation fraud", "Loan fraud via UPI", "Merchant fraud",
]

# ─── 1. RISK HEATMAP SEED ───
def _seed_risk_heatmap():
    data = []
    for i, (city, state, lat, lng) in enumerate(CITIES):
        random.seed(42 + i)
        score = random.randint(15, 95)
        events = random.randint(50, 3000)
        blocked = int(events * random.uniform(0.02, 0.15))
        data.append({
            "id": i + 1,
            "city": city,
            "state": state,
            "lat": lat + random.uniform(-0.05, 0.05),
            "lng": lng + random.uniform(-0.05, 0.05),
            "riskScore": score,
            "riskLevel": "high" if score >= 70 else "medium" if score >= 40 else "low",
            "totalEvents": events,
            "fraudEvents": int(events * random.uniform(0.01, 0.08)),
            "blockedTransactions": blocked,
            "avgAmount": round(random.uniform(500, 25000), 2),
            "topFraudType": random.choice(COMPLAINT_TYPES),
        })
    return data

RISK_HEATMAP = _seed_risk_heatmap()


# ─── 2. COMPLAINTS HEATMAP SEED ───
def _seed_complaints():
    data = []
    idx = 1
    for i, (city, state, lat, lng) in enumerate(CITIES):
        random.seed(100 + i)
        count = random.randint(5, 60)
        for j in range(count):
            random.seed(100 + i * 1000 + j)
            days_ago = random.randint(0, 90)
            data.append({
                "id": idx,
                "city": city,
                "state": state,
                "lat": lat + random.uniform(-0.08, 0.08),
                "lng": lng + random.uniform(-0.08, 0.08),
                "complainant": random.choice(NAMES),
                "upiId": f"{random.choice(NAMES).split()[0].lower()}{random.randint(10,99)}@{'okaxis' if random.random()>0.5 else 'oksbi'}",
                "type": random.choice(COMPLAINT_TYPES),
                "amount": round(random.uniform(100, 50000), 2),
                "status": random.choice(["open", "investigating", "resolved", "escalated"]),
                "severity": random.choice(["high", "medium", "low"]),
                "date": (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d"),
                "description": f"{random.choice(COMPLAINT_TYPES)} reported from {city}",
            })
            idx += 1
    return data

COMPLAINTS = _seed_complaints()


# ─── 3. INTELLIGENCE SEED ───
def _seed_intelligence():
    random.seed(200)
    blacklisted_ips = []
    for i in range(80):
        random.seed(200 + i)
        blacklisted_ips.append({
            "id": f"ip-{i+1}",
            "type": "ip",
            "value": f"{random.randint(1,223)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}",
            "reason": random.choice(["Brute force attack", "Bot traffic", "Known proxy", "Tor exit node", "VPN endpoint", "Spam source", "DDoS origin"]),
            "severity": random.choice(["critical", "high", "medium"]),
            "addedBy": random.choice(NAMES),
            "addedAt": (datetime.now() - timedelta(days=random.randint(0, 180))).strftime("%Y-%m-%d"),
            "hits": random.randint(1, 5000),
            "active": random.random() > 0.1,
        })

    blacklisted_pincodes = []
    high_risk_pins = [
        ("110001", "Delhi"), ("400001", "Mumbai"), ("700001", "Kolkata"),
        ("600001", "Chennai"), ("500001", "Hyderabad"), ("560001", "Bangalore"),
        ("380001", "Ahmedabad"), ("302001", "Jaipur"), ("226001", "Lucknow"),
        ("411001", "Pune"), ("395001", "Surat"), ("208001", "Kanpur"),
        ("440001", "Nagpur"), ("452001", "Indore"), ("400601", "Thane"),
        ("462001", "Bhopal"), ("530001", "Visakhapatnam"), ("800001", "Patna"),
        ("390001", "Vadodara"), ("201001", "Ghaziabad"), ("141001", "Ludhiana"),
        ("282001", "Agra"), ("422001", "Nashik"), ("834001", "Ranchi"),
        ("641001", "Coimbatore"), ("682001", "Kochi"), ("781001", "Guwahati"),
        ("160001", "Chandigarh"), ("570001", "Mysore"), ("695001", "Trivandrum"),
    ]
    for i, (pin, city) in enumerate(high_risk_pins):
        random.seed(300 + i)
        blacklisted_pincodes.append({
            "id": f"pin-{i+1}",
            "type": "pincode",
            "value": pin,
            "city": city,
            "reason": random.choice(["High fraud density", "Synthetic ID cluster", "Money mule hub", "SIM swap hotspot", "Phishing origin"]),
            "severity": random.choice(["critical", "high", "medium"]),
            "fraudCount": random.randint(10, 500),
            "addedAt": (datetime.now() - timedelta(days=random.randint(0, 365))).strftime("%Y-%m-%d"),
            "active": True,
        })

    blacklisted_numbers = []
    for i in range(60):
        random.seed(400 + i)
        blacklisted_numbers.append({
            "id": f"num-{i+1}",
            "type": "phone",
            "value": f"+91{random.choice(['6','7','8','9'])}{random.randint(100000000,999999999)}",
            "reason": random.choice(["SIM swap fraud", "OTP interception", "Phishing calls", "Vishing attack", "Spam caller", "Fake KYC"]),
            "severity": random.choice(["critical", "high", "medium"]),
            "reports": random.randint(1, 200),
            "addedBy": random.choice(["system", "manual", "partner_bank"]),
            "addedAt": (datetime.now() - timedelta(days=random.randint(0, 120))).strftime("%Y-%m-%d"),
            "active": random.random() > 0.05,
        })

    blacklisted_upis = []
    banks = ["okaxis", "oksbi", "okhdfcbank", "okicici", "paytm", "ybl", "ibl", "apl"]
    for i in range(70):
        random.seed(500 + i)
        name = random.choice(NAMES).split()[0].lower()
        blacklisted_upis.append({
            "id": f"upi-{i+1}",
            "type": "upi",
            "value": f"{name}{random.randint(1,999)}@{random.choice(banks)}",
            "reason": random.choice(["Confirmed fraud recipient", "Money mule account", "Fake merchant", "Phishing UPI", "Impersonation", "Lottery scam"]),
            "severity": random.choice(["critical", "high", "medium"]),
            "fraudAmount": round(random.uniform(1000, 500000), 2),
            "victims": random.randint(1, 50),
            "addedBy": random.choice(["system", "manual", "RBI_alert", "bank_report"]),
            "addedAt": (datetime.now() - timedelta(days=random.randint(0, 90))).strftime("%Y-%m-%d"),
            "active": random.random() > 0.05,
        })

    return {
        "ips": blacklisted_ips,
        "pincodes": blacklisted_pincodes,
        "phones": blacklisted_numbers,
        "upis": blacklisted_upis,
    }

INTELLIGENCE = _seed_intelligence()


# ─── 4. REINFORCEMENT LEARNING SEED ───
def _seed_reinforcement():
    random.seed(600)
    epochs = []
    accuracy = 0.72
    precision = 0.68
    recall = 0.65
    f1 = 0.66
    false_pos = 0.15
    false_neg = 0.12
    total_samples = 5000

    for i in range(50):
        random.seed(600 + i)
        # Model improves over time with some noise
        accuracy = min(0.99, accuracy + random.uniform(0.002, 0.008))
        precision = min(0.99, precision + random.uniform(0.001, 0.009))
        recall = min(0.99, recall + random.uniform(0.002, 0.007))
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        false_pos = max(0.01, false_pos - random.uniform(0.001, 0.004))
        false_neg = max(0.01, false_neg - random.uniform(0.001, 0.003))
        total_samples += random.randint(80, 300)

        epochs.append({
            "epoch": i + 1,
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1Score": round(f1, 4),
            "falsePositiveRate": round(false_pos, 4),
            "falseNegativeRate": round(false_neg, 4),
            "totalSamples": total_samples,
            "newFraudPatterns": random.randint(0, 5),
            "rulesUpdated": random.randint(0, 3),
            "timestamp": (datetime.now() - timedelta(hours=(50 - i) * 6)).strftime("%Y-%m-%d %H:%M"),
        })

    # Per-rule learning
    rules = [
        "velocity_check", "geo_fence", "device_trust", "amount_threshold",
        "time_window", "ip_reputation", "behavioral_score", "network_analysis",
        "sim_swap_detect", "new_payee_risk", "burst_detection", "blacklist_match",
    ]
    rule_performance = []
    for r in rules:
        random.seed(hash(r) % 10000)
        rule_performance.append({
            "rule": r,
            "initialAccuracy": round(random.uniform(0.60, 0.80), 4),
            "currentAccuracy": round(random.uniform(0.88, 0.98), 4),
            "improvement": round(random.uniform(0.08, 0.25), 4),
            "samplesProcessed": random.randint(2000, 50000),
            "falsePositives": random.randint(10, 500),
            "falseNegatives": random.randint(5, 200),
            "lastUpdated": (datetime.now() - timedelta(hours=random.randint(1, 72))).strftime("%Y-%m-%d %H:%M"),
        })

    # Confusion matrix for latest epoch
    tp = random.randint(800, 1200)
    fp = random.randint(30, 100)
    fn = random.randint(20, 80)
    tn = total_samples - tp - fp - fn

    return {
        "epochs": epochs,
        "rulePerformance": rule_performance,
        "confusionMatrix": {"tp": tp, "fp": fp, "fn": fn, "tn": tn},
        "summary": {
            "totalEpochs": len(epochs),
            "currentAccuracy": epochs[-1]["accuracy"],
            "currentF1": epochs[-1]["f1Score"],
            "totalSamplesProcessed": total_samples,
            "modelVersion": "v3.2.1",
            "lastTrainedAt": epochs[-1]["timestamp"],
            "improvementFromBaseline": round(epochs[-1]["accuracy"] - epochs[0]["accuracy"], 4),
        },
    }

REINFORCEMENT = _seed_reinforcement()


# ─── Flask route registration ───
def register_core_routes(app):
    """Call this from app.py to register all 4 page endpoints."""

    # ── Risk Heatmap ──
    @app.route("/api/heatmap/risk", methods=["GET"])
    def get_risk_heatmap():
        return {"points": RISK_HEATMAP, "total": len(RISK_HEATMAP)}

    # ── Complaints Heatmap ──
    @app.route("/api/heatmap/complaints", methods=["GET"])
    def get_complaints_heatmap():
        city = (app.current_request_args or {}).get("city") if hasattr(app, "current_request_args") else None
        # flask request
        from flask import request as _req
        city = _req.args.get("city")
        severity = _req.args.get("severity")
        status = _req.args.get("status")
        filtered = COMPLAINTS
        if city:
            filtered = [c for c in filtered if c["city"].lower() == city.lower()]
        if severity:
            filtered = [c for c in filtered if c["severity"] == severity]
        if status:
            filtered = [c for c in filtered if c["status"] == status]

        # Aggregate by city for map
        city_agg = {}
        for c in COMPLAINTS:
            key = c["city"]
            if key not in city_agg:
                city_agg[key] = {"city": key, "state": c["state"], "lat": 0, "lng": 0, "count": 0, "totalAmount": 0, "n": 0}
            city_agg[key]["count"] += 1
            city_agg[key]["totalAmount"] += c["amount"]
            city_agg[key]["lat"] += c["lat"]
            city_agg[key]["lng"] += c["lng"]
            city_agg[key]["n"] += 1
        aggregated = []
        for v in city_agg.values():
            v["lat"] = round(v["lat"] / v["n"], 4)
            v["lng"] = round(v["lng"] / v["n"], 4)
            v["avgAmount"] = round(v["totalAmount"] / v["count"], 2)
            del v["n"]
            aggregated.append(v)

        return {
            "complaints": filtered,
            "aggregated": aggregated,
            "total": len(filtered),
            "totalAll": len(COMPLAINTS),
        }

    # ── Intelligence CRUD ──
    @app.route("/api/intelligence", methods=["GET"])
    def get_intelligence():
        from flask import request as _req
        tab = _req.args.get("tab", "all")
        if tab == "ips":
            return {"items": INTELLIGENCE["ips"], "total": len(INTELLIGENCE["ips"])}
        elif tab == "pincodes":
            return {"items": INTELLIGENCE["pincodes"], "total": len(INTELLIGENCE["pincodes"])}
        elif tab == "phones":
            return {"items": INTELLIGENCE["phones"], "total": len(INTELLIGENCE["phones"])}
        elif tab == "upis":
            return {"items": INTELLIGENCE["upis"], "total": len(INTELLIGENCE["upis"])}
        else:
            all_items = INTELLIGENCE["ips"] + INTELLIGENCE["pincodes"] + INTELLIGENCE["phones"] + INTELLIGENCE["upis"]
            return {
                "items": all_items,
                "total": len(all_items),
                "counts": {
                    "ips": len(INTELLIGENCE["ips"]),
                    "pincodes": len(INTELLIGENCE["pincodes"]),
                    "phones": len(INTELLIGENCE["phones"]),
                    "upis": len(INTELLIGENCE["upis"]),
                },
            }

    @app.route("/api/intelligence", methods=["POST"])
    def add_intelligence():
        from flask import request as _req
        data = _req.get_json()
        if not data or not data.get("type") or not data.get("value"):
            return {"error": "type and value required"}, 400
        entry_type = data["type"]
        bucket = {"ip": "ips", "pincode": "pincodes", "phone": "phones", "upi": "upis"}.get(entry_type)
        if not bucket:
            return {"error": "type must be ip, pincode, phone, or upi"}, 400
        new_id = f"{entry_type}-{len(INTELLIGENCE[bucket]) + 1}"
        entry = {
            "id": new_id,
            "type": entry_type,
            "value": data["value"],
            "reason": data.get("reason", "Manual entry"),
            "severity": data.get("severity", "medium"),
            "addedBy": data.get("addedBy", "manual"),
            "addedAt": datetime.now().strftime("%Y-%m-%d"),
            "active": True,
        }
        # type-specific fields
        if entry_type == "ip":
            entry["hits"] = 0
        elif entry_type == "pincode":
            entry["city"] = data.get("city", "Unknown")
            entry["fraudCount"] = 0
        elif entry_type == "phone":
            entry["reports"] = 0
        elif entry_type == "upi":
            entry["fraudAmount"] = 0
            entry["victims"] = 0
        INTELLIGENCE[bucket].append(entry)
        return {"status": "created", "entry": entry}, 201

    @app.route("/api/intelligence/<entry_id>", methods=["DELETE"])
    def delete_intelligence(entry_id):
        for bucket in INTELLIGENCE.values():
            for i, item in enumerate(bucket):
                if item["id"] == entry_id:
                    bucket.pop(i)
                    return {"status": "deleted", "id": entry_id}
        return {"error": "not found"}, 404

    @app.route("/api/intelligence/<entry_id>/toggle", methods=["PUT"])
    def toggle_intelligence(entry_id):
        for bucket in INTELLIGENCE.values():
            for item in bucket:
                if item["id"] == entry_id:
                    item["active"] = not item["active"]
                    return {"status": "toggled", "entry": item}
        return {"error": "not found"}, 404

    # ── Reinforcement Learning ──
    @app.route("/api/reinforcement", methods=["GET"])
    def get_reinforcement():
        return REINFORCEMENT

    @app.route("/api/reinforcement/retrain", methods=["POST"])
    def trigger_retrain():
        """Simulate a retraining epoch."""
        last = REINFORCEMENT["epochs"][-1]
        random.seed(int(datetime.now().timestamp()))
        new_epoch = {
            "epoch": last["epoch"] + 1,
            "accuracy": round(min(0.995, last["accuracy"] + random.uniform(0.001, 0.005)), 4),
            "precision": round(min(0.995, last["precision"] + random.uniform(0.001, 0.006)), 4),
            "recall": round(min(0.995, last["recall"] + random.uniform(0.001, 0.005)), 4),
            "f1Score": 0,
            "falsePositiveRate": round(max(0.005, last["falsePositiveRate"] - random.uniform(0.001, 0.003)), 4),
            "falseNegativeRate": round(max(0.005, last["falseNegativeRate"] - random.uniform(0.001, 0.002)), 4),
            "totalSamples": last["totalSamples"] + random.randint(100, 400),
            "newFraudPatterns": random.randint(0, 3),
            "rulesUpdated": random.randint(0, 2),
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
        }
        new_epoch["f1Score"] = round(2 * (new_epoch["precision"] * new_epoch["recall"]) / (new_epoch["precision"] + new_epoch["recall"]), 4)
        REINFORCEMENT["epochs"].append(new_epoch)
        REINFORCEMENT["summary"]["totalEpochs"] = len(REINFORCEMENT["epochs"])
        REINFORCEMENT["summary"]["currentAccuracy"] = new_epoch["accuracy"]
        REINFORCEMENT["summary"]["currentF1"] = new_epoch["f1Score"]
        REINFORCEMENT["summary"]["lastTrainedAt"] = new_epoch["timestamp"]
        return {"status": "retrained", "epoch": new_epoch}
