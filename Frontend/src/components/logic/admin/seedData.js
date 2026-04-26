const NAMES = ["Aarav Sharma","Vivaan Patel","Aditya Singh","Vihaan Kumar","Arjun Reddy","Sai Krishnan","Reyansh Gupta","Ayaan Joshi","Krishna Iyer","Ishaan Nair","Kabir Mehta","Shaurya Das","Atharva Rao","Advait Pillai","Dhruv Verma","Pranav Bhat","Arnav Desai","Rudra Menon","Param Choudhury","Darsh Agarwal","Ananya Mishra","Diya Banerjee","Myra Kapoor","Sara Sinha","Aanya Pandey","Aadhya Tiwari","Ira Saxena","Riya Malhotra","Anvi Chatterjee","Prisha Bose","Navya Kulkarni","Anika Hegde","Kiara Nambiar","Avni Thakur","Mira Sethi","Zara Bajaj","Saanvi Dutta","Pihu Ghosh","Kavya Mukherjee","Ishita Sengupta","Rohan Bhatt","Karan Naidu","Nikhil Shetty","Rahul Prasad","Amit Dubey","Suresh Yadav","Vikram Chauhan","Deepak Jain","Manish Goyal","Rajesh Khanna"];
const CITIES = [["Mumbai",19.076,72.8777],["Delhi",28.7041,77.1025],["Bangalore",12.9716,77.5946],["Chennai",13.0827,80.2707],["Hyderabad",17.385,78.4867],["Kolkata",22.5726,88.3639],["Pune",18.5204,73.8567],["Ahmedabad",23.0225,72.5714],["Jaipur",26.9124,75.7873],["Lucknow",26.8467,80.9462],["Surat",21.1702,72.8311],["Kanpur",26.4499,80.3319],["Nagpur",21.1458,79.0882],["Indore",22.7196,75.8577],["Thane",19.2183,72.9781],["Bhopal",23.2599,77.4126],["Visakhapatnam",17.6868,83.2185],["Patna",25.6093,85.1376],["Vadodara",22.3072,73.1812],["Ghaziabad",28.6692,77.4538],["Ludhiana",30.901,75.8573],["Agra",27.1767,78.0081],["Nashik",19.9975,73.7898],["Ranchi",23.3441,85.3096],["Coimbatore",11.0168,76.9558],["Kochi",9.9312,76.2673],["Guwahati",26.1445,91.7362],["Chandigarh",30.7333,76.7794],["Mysore",12.2958,76.6394],["Trivandrum",8.5241,76.9366]];
const TENANTS = ["axis_bank","hdfc_bank","icici_bank","sbi","kotak","yes_bank","pnb","bob","canara","idbi"];
const ROLES = ["admin","analyst","viewer","operator","auditor"];
const RISK = ["high","medium","low"];
const STATUSES = ["active","warning","disabled","enabled"];
const SEVERITIES = ["high","medium","low"];
const ALERT_CATS = ["Risk","Compliance","Security","Fraud","AML","KYC"];
const SERVICES = ["ML Engine","Rule Engine","Device Intel","GeoIP","Challenge Gateway","Kafka","Redis","PostgreSQL","ElasticSearch","API Gateway"];
const TOOLS = ["FlexiSpy","mSpy","Cerberus","AndroRAT","DroidJack","SpyNote","AhMyth","Dendroid","GhostCtrl","HeroRat","PhoneSpy","XploitSPY","Pegasus","Predator","FinSpy"];
const REPOS = ["OSINT Feed","FS-ISAC","Fraud.net","BioCatch","ThreatMetrix","LexisNexis","Emailage","Socure","Sardine","Sift"];
const PROVIDERS = ["Twilio","AWS SNS","Firebase","Vonage","MessageBird","Plivo","Sinch","Infobip","Kaleyra","Gupshup"];
const QUESTIONS = ["What is your mother's maiden name?","What was the name of your first pet?","What city were you born in?","What is your favorite movie?","What was your childhood nickname?","What street did you grow up on?","What is your favorite book?","What was your first car?","What school did you attend?","What is your favorite food?"];

const h = (i, s = 0) => ((i * 2654435761 + s) >>> 0) % 1000;
const pick = (arr, i, s = 0) => arr[((i * 2654435761 + s) >>> 0) % arr.length];
const uuid = (i) => `${(h(i,1)*1e4).toString(16).slice(0,8)}-${h(i,2).toString(16).padStart(4,'0')}-4${h(i,3).toString(16).slice(0,3)}-${h(i,4).toString(16).padStart(4,'0')}-${(h(i,5)*1e6).toString(16).slice(0,12)}`;
const ip = (i) => `${10+h(i,1)%240}.${h(i,2)%256}.${h(i,3)%256}.${h(i,4)%256}`;
const date = (i, s = 0) => { const d = new Date(2025, h(i,s)%12, 1+h(i,s+1)%28, h(i,s+2)%24, h(i,s+3)%60); return d.toISOString().slice(0,16).replace('T',' '); };
const pct = (i, s = 0) => (60 + h(i,s) % 40) + '%';

const gen = (n, fn) => Array.from({length:n}, (_,i) => ({id: i+1, ...fn(i)}));

const GENERATORS = {
  events: (i) => ({customerRef:`CUST-${1000+i}`,deviceUuid:uuid(i),ipAddress:ip(i),riskScore:h(i)%100,riskLevel:pick(RISK,i),status:pick(["active","investigating","resolved","escalated"],i,1),createdAt:date(i)}),
  devices: (i) => ({deviceUuid:uuid(i),riskScore:h(i,7)%100,riskLevel:pick(RISK,i,2),associatedCustomers:1+h(i,3)%5,rooted:h(i,4)%5===0,emulator:h(i,5)%8===0,lastSeen:date(i,6)}),
  customers: (i) => ({customerHash:`CUST-${1000+i}`,riskScore:h(i,10)%100,riskLevel:pick(RISK,i,3),deviceCount:1+h(i,4)%4,assessmentHistory:5+h(i,5)%50,status:pick(["active","flagged","blocked","under_review"],i,6)}),
  alerts: (i) => ({category:pick(ALERT_CATS,i),title:`${pick(ALERT_CATS,i)} Alert #${1000+i}: ${pick(["Unusual pattern","Velocity breach","Geo anomaly","Device mismatch","Amount spike","New device","IP change","Behavioral drift"],i,1)}`,severity:pick(SEVERITIES,i,2),workflow:pick(["open","triaged","investigating","resolved"],i,3),owner:pick(NAMES,i,4),status:pick(["active","acknowledged","resolved","dismissed"],i,5),createdAt:date(i,6)}),
  fraudHeatMap: (i) => {const c=CITIES[i%CITIES.length];return{location:c[0],country:"India",riskScore:20+h(i,1)%80,events:10+h(i,2)%500,lat:c[1]+(h(i,3)%100-50)*0.01,lng:c[2]+(h(i,4)%100-50)*0.01};},
  reports: (i) => ({name:`${pick(["Daily","Weekly","Monthly","Quarterly"],i)} ${pick(["Risk Summary","Fraud Report","Compliance Audit","Transaction Analysis","Device Report","Alert Digest"],i,1)}`,type:pick(["scheduled","on-demand","triggered"],i,2),format:pick(["PDF","CSV","XLSX","JSON"],i,3),status:pick(["active","paused","completed","failed"],i,4),cron:pick(["0 6 * * *","0 0 * * 1","0 0 1 * *","0 0 1 */3 *"],i,5)}),
  challengeAnalytics: (i) => ({method:pick(["SMS OTP","Email OTP","Push Notification","Biometric","Secret Question","Voice Call","WhatsApp OTP","TOTP"],i),volume:100+h(i,1)%5000,successRate:pct(i,2),provider:pick(PROVIDERS,i,3)}),
  outcomeLearning: (i) => ({rule:`RULE-${100+i}: ${pick(["Velocity Check","Geo Fence","Device Trust","Amount Threshold","Time Window","IP Reputation","Behavioral Score","Network Analysis"],i,1)}`,likelyFraud:h(i,2)%500,likelyLegit:500+h(i,3)%2000,unknown:h(i,4)%200,lastSync:date(i,5)}),
  experiments: (i) => ({name:`EXP-${100+i}: ${pick(["Score Threshold A/B","Rule Weight Test","Challenge Flow","UI Variant","Latency Impact","Model Comparison"],i,1)}`,status:pick(["active","paused","completed","draft"],i,2),variants:2+h(i,3)%4,tenantScope:pick(TENANTS,i,4),startDate:date(i,5)}),
  uiExperiments: (i) => ({name:`UI-${100+i}: ${pick(["Dashboard Layout","Alert Card Style","Risk Gauge","Table Density","Color Scheme","Nav Position"],i,1)}`,targetArea:pick(["dashboard","alerts","events","devices","analytics","reports"],i,2),status:pick(["active","paused","completed"],i,3),interactionDelta:`${h(i,4)%30-10}%`}),
  platformSettings: (i) => ({setting:pick(["hard_fail_on_high_risk","auto_challenge_threshold","max_retry_attempts","session_timeout_minutes","geo_fence_radius_km","velocity_window_seconds","min_confidence_score","auto_block_emulators","require_device_binding","enable_behavioral_scoring","ip_reputation_weight","device_age_threshold_days","max_devices_per_customer","auto_escalate_threshold","enable_dark_web_monitoring"],i),enabled:h(i,1)%3!==0,threshold:(h(i,2)%100)/10,weight:(h(i,3)%100)/100}),
  categoryScoring: (i) => ({context:pick(["payment","login","onboarding","profile_change","beneficiary_add","device_bind","password_reset","card_activation"],i),version:`v${1+h(i,1)%5}.${h(i,2)%10}`,status:pick(["active","draft","archived"],i,3),updatedBy:pick(NAMES,i,4)}),
  v2Scoring: (i) => ({ruleName:`${pick(["velocity","geo","device","amount","time","ip","behavioral","network"],i)}_${pick(["check","score","gate","filter","boost","penalty"],i,1)}_${100+i}`,signalWeight:(h(i,2)%100)/10,tenant:pick(TENANTS,i,3),touchpoint:pick(["mobile","web","api","sdk"],i,4),enabled:h(i,5)%4!==0}),
  behavioral: (i) => GENERATORS.outcomeLearning(i),
  challengeRules: (i) => ({tenant:pick(TENANTS,i),method:pick(["SMS OTP","Email OTP","Push","Biometric","Secret Question"],i,1),condition:pick(["risk_score > 70","new_device","geo_anomaly","velocity_breach","amount > 50000","ip_change","night_transaction"],i,2),enabled:h(i,3)%3!==0}),
  challengeProviders: (i) => ({provider:pick(PROVIDERS,i),type:pick(["SMS","Email","Push","Voice","WhatsApp"],i,1),health:pick(["active","degraded","warning"],i,2),enabled:h(i,3)%5!==0}),
  secretQuestions: (i) => ({question:pick(QUESTIONS,i),active:h(i,1)%4!==0,tenant:pick([...TENANTS,"global"],i,2)}),
  intelligence: (i) => ({repository:pick(REPOS,i),entries:1000+h(i,1)%50000,syncSchedule:pick(["hourly","daily","weekly","real-time"],i,2),status:pick(["active","warning","disabled"],i,3)}),
  fraudTools: (i) => ({toolName:pick(TOOLS,i),category:pick(["RAT","Spyware","Rootkit","Overlay","Keylogger","Screen Capture"],i,1),severity:pick(SEVERITIES,i,2),active:h(i,3)%4!==0}),
  emulatorSignatures: (i) => ({signatureType:pick(["build_prop","sensor_count","battery_status","telephony","gl_renderer","hardware_serial","cpu_info","mac_address"],i),value:`${pick(["goldfish","ranchu","generic","sdk_phone","vbox86","nox","bluestacks","genymotion"],i,1)}_${100+i}`,confidence:(50+h(i,2)%50),source:pick(["internal","community","vendor","research"],i,3),active:h(i,4)%3!==0}),
  tenantRetention: (i) => ({tenant:pick(TENANTS,i),dataType:pick(["assessments","events","audit_logs","device_profiles","customer_data","challenge_logs","reports"],i,1),retentionDays:pick([30,60,90,180,365,730],i,2),archiveEnabled:h(i,3)%3!==0}),
  apiKeys: (i) => ({tenant:pick(TENANTS,i),touchpoint:pick(["mobile","web","api","sdk","partner"],i,1),keyName:`key_${pick(TENANTS,i)}_${pick(["prod","staging","dev"],i,2)}_${100+i}`,status:pick(["active","revoked","expired"],i,3),lastUsed:date(i,4)}),
  providers: (i) => ({provider:pick([...PROVIDERS,"Stripe","Razorpay","PayU","Cashfree","PhonePe"],i),serviceType:pick(["SMS","Email","Push","Payment","KYC","AML","Device Intel"],i,1),health:pick(["active","degraded","warning"],i,2),enabled:h(i,3)%5!==0}),
  users: (i) => ({name:pick(NAMES,i),email:`${pick(NAMES,i).toLowerCase().replace(/ /g,'.')}@${pick(["axis","hdfc","icici","sbi","kotak"],i,1)}.com`,tenant:pick(TENANTS,i,2),role:pick(ROLES,i,3),status:pick(["active","disabled","locked"],i,4)}),
  tenants: (i) => ({name:pick(["Axis Bank","HDFC Bank","ICICI Bank","SBI","Kotak Mahindra","Yes Bank","PNB","Bank of Baroda","Canara Bank","IDBI Bank","Federal Bank","IndusInd Bank","RBL Bank","Bandhan Bank","IDFC First"],i),status:pick(["active","trial","suspended"],i,1),plan:pick(["enterprise","professional","starter"],i,2),users:5+h(i,3)%50,touchpoints:1+h(i,4)%6}),
  audit: (i) => ({action:pick(["login","config_change","rule_update","user_create","export_data","api_key_rotate","tenant_update","threshold_change","model_deploy","alert_resolve"],i),user:pick(NAMES,i,1),resource:pick(["scoring_config","challenge_rules","tenant_settings","user_roles","api_keys","retention_policy","platform_config"],i,2),tenant:pick(TENANTS,i,3),timestamp:date(i,4)}),
  hubSpoke: (i) => ({spoke:`spoke-${pick(["mumbai","delhi","bangalore","chennai","hyderabad","kolkata","pune","ahmedabad"],i)}-${1+h(i,1)%3}`,status:pick(["active","degraded","warning"],i,2),lastSync:date(i,3),lagSeconds:h(i,4)%300}),
  hubSharing: (i) => ({resourceType:pick(["scoring_rules","challenge_config","device_signatures","fraud_tools","intelligence_feeds","retention_policies","emulator_sigs"],i),shareEnabled:h(i,1)%3!==0,scope:pick(["all_spokes","selected","hub_only"],i,2)}),
  compliance: (i) => ({requestType:pick(["DSAR","Right to Erasure","Data Portability","Consent Withdrawal","Rectification","Restriction"],i),subjectRef:`SUB-${5000+i}`,status:pick(["active","in_progress","completed","overdue"],i,1),priority:pick(SEVERITIES,i,2),dueDate:date(i,3)}),
  health: (i) => ({service:pick(SERVICES,i),status:pick(["active","degraded","warning"],i,1),latencyMs:5+h(i,2)%200,cpu:`${10+h(i,3)%80}%`,memory:`${20+h(i,4)%70}%`}),
  importData: (i) => ({importType:pick(["customer_bulk","device_sync","rule_import","intelligence_feed","historical_events","tenant_migration"],i),filename:`${pick(["customers","devices","rules","intel","events","tenants"],i,1)}_${date(i,2).slice(0,10).replace(/-/g,'')}.csv`,status:pick(["completed","running","failed","queued"],i,3),rows:100+h(i,4)%50000,runAt:date(i,5)}),
};

const STATS = {
  events: [{label:"Total Events",value:12847},{label:"High Risk",value:1893},{label:"Investigating",value:342},{label:"Resolved Today",value:567}],
  devices: [{label:"Total Devices",value:8432},{label:"Rooted",value:234},{label:"Emulators",value:89},{label:"New Today",value:156}],
  customers: [{label:"Total Customers",value:45231},{label:"Flagged",value:892},{label:"Blocked",value:123},{label:"Under Review",value:456}],
  alerts: [{label:"Open Alerts",value:1247},{label:"Critical",value:89},{label:"Acknowledged",value:345},{label:"Resolved Today",value:234}],
  fraudHeatMap: [{label:"Hotspots",value:30},{label:"High Risk Zones",value:8},{label:"Total Events",value:15234},{label:"Countries",value:1}],
  reports: [{label:"Total Reports",value:2341},{label:"Scheduled",value:156},{label:"Completed",value:2089},{label:"Failed",value:12}],
  challengeAnalytics: [{label:"Total Challenges",value:34521},{label:"Success Rate",value:"87%"},{label:"Avg Response",value:"4.2s"},{label:"Providers",value:8}],
  outcomeLearning: [{label:"Rules Tracked",value:120},{label:"Fraud Confirmed",value:4521},{label:"Legit Confirmed",value:28934},{label:"Unknown",value:1234}],
  experiments: [{label:"Active",value:12},{label:"Completed",value:45},{label:"Avg Lift",value:"3.2%"},{label:"Tenants",value:8}],
  uiExperiments: [{label:"Active",value:6},{label:"Completed",value:23},{label:"Avg Interaction Lift",value:"5.1%"},{label:"Areas Tested",value:6}],
  platformSettings: [{label:"Total Settings",value:120},{label:"Enabled",value:98},{label:"Disabled",value:22},{label:"Last Updated",value:"2h ago"}],
  categoryScoring: [{label:"Categories",value:8},{label:"Active Versions",value:15},{label:"Draft",value:4},{label:"Archived",value:23}],
  v2Scoring: [{label:"Total Rules",value:234},{label:"Enabled",value:198},{label:"Avg Weight",value:4.7},{label:"Tenants",value:10}],
  behavioral: [{label:"Rules Tracked",value:120},{label:"Fraud Confirmed",value:4521},{label:"Legit Confirmed",value:28934},{label:"Unknown",value:1234}],
  challengeRules: [{label:"Total Rules",value:156},{label:"Enabled",value:134},{label:"Tenants",value:10},{label:"Methods",value:5}],
  challengeProviders: [{label:"Providers",value:10},{label:"Active",value:8},{label:"Degraded",value:1},{label:"Disabled",value:1}],
  secretQuestions: [{label:"Total Questions",value:120},{label:"Active",value:98},{label:"Global",value:45},{label:"Tenant-Specific",value:75}],
  intelligence: [{label:"Repositories",value:10},{label:"Total Entries",value:234567},{label:"Active Feeds",value:8},{label:"Last Sync",value:"5m ago"}],
  fraudTools: [{label:"Known Tools",value:120},{label:"Critical",value:23},{label:"Active Sigs",value:98},{label:"New This Week",value:5}],
  emulatorSignatures: [{label:"Signatures",value:120},{label:"Active",value:98},{label:"High Confidence",value:67},{label:"Sources",value:4}],
  tenantRetention: [{label:"Policies",value:70},{label:"Tenants",value:10},{label:"Avg Retention",value:"180d"},{label:"Archive Enabled",value:45}],
  apiKeys: [{label:"Total Keys",value:156},{label:"Active",value:123},{label:"Revoked",value:21},{label:"Expired",value:12}],
  providers: [{label:"Providers",value:15},{label:"Active",value:12},{label:"Degraded",value:2},{label:"Disabled",value:1}],
  users: [{label:"Total Users",value:234},{label:"Active",value:198},{label:"Locked",value:12},{label:"New This Month",value:23}],
  tenants: [{label:"Total Tenants",value:15},{label:"Enterprise",value:8},{label:"Trial",value:4},{label:"Suspended",value:1}],
  audit: [{label:"Total Logs",value:89432},{label:"Today",value:1234},{label:"Config Changes",value:456},{label:"Logins",value:5678}],
  hubSpoke: [{label:"Spokes",value:24},{label:"Active",value:21},{label:"Degraded",value:2},{label:"Avg Lag",value:"12s"}],
  hubSharing: [{label:"Resources",value:7},{label:"Shared",value:5},{label:"Hub Only",value:2},{label:"Policies",value:15}],
  compliance: [{label:"Open Requests",value:89},{label:"Overdue",value:12},{label:"Completed",value:567},{label:"Avg Resolution",value:"3.2d"}],
  health: [{label:"Services",value:10},{label:"Healthy",value:8},{label:"Degraded",value:1},{label:"Avg Latency",value:"23ms"}],
  importData: [{label:"Total Imports",value:456},{label:"Completed",value:423},{label:"Failed",value:12},{label:"Running",value:3}],
  dashboard: [{label:"Assessments Today",value:12847},{label:"Avg Latency",value:"18ms"},{label:"Fraud Rate",value:"2.3%"},{label:"Active Rules",value:234}],
  analytics: [{label:"Total Assessments",value:1284732},{label:"Avg Score",value:34.2},{label:"P95 Latency",value:"45ms"},{label:"Active Models",value:3}],
};

const DASHBOARD_EXTRA = {
  trend: Array.from({length:12},(_,i)=>({bucket:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],assessments:8000+((i*2654435761)>>>0)%5000,latencyMs:15+((i*2654435761+1)>>>0)%30})),
  risk_distribution: [{name:"high",value:1893},{name:"medium",value:5432},{name:"low",value:5522}],
  system_connections: [{name:"ML Engine",status:"active"},{name:"Rule Engine",status:"active"},{name:"Device Intel",status:"active"},{name:"GeoIP",status:"warning"},{name:"Challenge Gateway",status:"active"},{name:"Kafka",status:"active"}],
};

export function getSeedData(configKey) {
  const generator = GENERATORS[configKey];
  const items = generator ? gen(120, generator) : [];
  const stats = STATS[configKey] || [];
  const extra = (configKey === "dashboard" || configKey === "analytics") ? DASHBOARD_EXTRA : {};
  return { stats, items, ...extra };
}
