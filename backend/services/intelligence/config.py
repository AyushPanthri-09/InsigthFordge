from typing import Dict, List, Any

# Central Configuration for InsightForge Semantic Intelligence Engine

# Thresholds for confidence classification
CONFIDENCE_THRESHOLDS = {
    "high": 0.8,
    "medium": 0.5,
}

# Standard Abbreviation Normalization Map
ABBREVIATIONS: Dict[str, str] = {
    "qty": "Quantity",
    "amt": "Amount",
    "dob": "Date of Birth",
    "cust": "Customer",
    "id": "Identifier",
    "rev": "Revenue",
    "prod": "Product",
    "tx": "Transaction",
    "desc": "Description",
    "num": "Number",
    "val": "Value",
    "sal": "Salary",
    "dept": "Department",
    "emp": "Employee",
    "mgr": "Manager",
    "loc": "Location",
    "src": "Source",
    "dest": "Destination",
    "cat": "Category",
    "subcat": "Subcategory",
    "attr": "Attribute",
    "pct": "Percentage",
    "curr": "Currency",
    "addr": "Address",
    "tel": "Telephone",
    "phone_num": "Phone Number",
    "pos": "Position",
    "stat": "Status",
    "msg": "Message",
    "org": "Organization",
    "biz": "Business",
    "fin": "Finance",
    "hr": "Human Resources",
}

# Canonical concepts synonym mapping
ONTOLOGY_ALIASES: Dict[str, List[str]] = {
    "revenue": ["rev", "revenue", "sales", "income", "turnover", "gross_sales", "amt", "amount", "total_amt", "net_sales", "earnings"],
    "customer": ["cust_id", "customer", "client", "consumer", "buyer", "user_id", "purchaser", "member"],
    "product": ["prod", "product", "item", "sku", "article", "merchandise", "good"],
    "date": ["date", "order_date", "dob", "birth_date", "timestamp", "created_at", "updated_at", "day", "time"],
    "quantity": ["qty", "quantity", "units", "count", "volume", "amount_sold"],
    "salary": ["salary", "wage", "compensation", "earnings", "pay", "income_level"],
    "cost": ["cost", "expense", "spend", "charge", "fee"],
    "profit": ["profit", "margin", "net_income", "gain"],
    "location": ["region", "country", "state", "city", "location", "address", "zip", "zipcode", "postal_code", "lat", "lon", "latitude", "longitude"],
    "status": ["status", "state", "stage", "phase", "active_flag", "is_active", "enabled", "status_code"],
}

# Domain keyword maps and rules to detect business domains.
# Maps a domain to a list of characteristic keywords, prefixes, or suffixes found in columns or content.
DOMAIN_RULES: Dict[str, Dict[str, Any]] = {
    "Retail": {
        "keywords": ["retail", "store", "sale", "pos", "receipt", "register", "cashier", "checkout", "basket", "cart", "sku", "inventory", "product", "merchandise", "price", "discount", "coupon"],
        "min_matches": 1,
    },
    "Healthcare": {
        "keywords": ["patient", "clinical", "heart", "blood", "medical", "treatment", "doctor", "physician", "nurse", "hospital", "clinic", "diagnosis", "icd", "prescription", "drug", "disease", "allergy", "admission", "discharge"],
        "min_matches": 1,
    },
    "Finance": {
        "keywords": ["balance", "loan", "interest", "credit", "rate", "account", "ledger", "debit", "portfolio", "equity", "asset", "liability", "deposit", "transaction", "payment", "bank", "teller", "tax", "stock", "dividend"],
        "min_matches": 1,
    },
    "Manufacturing": {
        "keywords": ["factory", "batch", "machine", "sensor", "assembly", "defect", "downtime", "maintenance", "production_line", "part_number", "serial_number", "operator", "throughput", "yield", "raw_material"],
        "min_matches": 1,
    },
    "Education": {
        "keywords": ["student", "teacher", "professor", "course", "grade", "gpa", "enrollment", "class", "semester", "school", "college", "university", "major", "curriculum", "transcript", "exam"],
        "min_matches": 1,
    },
    "HR": {
        "keywords": ["employee", "salary", "attendance", "leave", "vacation", "payroll", "hire_date", "termination_date", "resume", "recruit", "performance", "department", "manager", "appraisal", "job_title"],
        "min_matches": 1,
    },
    "Marketing": {
        "keywords": ["campaign", "lead", "click", "impression", "ctr", "ad", "advertisement", "bounce_rate", "utm", "conversion", "funnel", "subscriber", "channel", "reach", "attribution"],
        "min_matches": 1,
    },
    "Sales": {
        "keywords": ["deal", "pipeline", "quota", "opportunity", "revenue", "leads", "forecast", "commission", "win_rate", "closed_won", "closed_lost", "stage", "salesperson", "account_executive"],
        "min_matches": 1,
    },
    "Supply Chain": {
        "keywords": ["warehouse", "shipment", "carrier", "logistics", "freight", "lead_time", "stockout", "reorder_point", "supplier", "vendor", "inventory", "delivery", "transit", "shipping_cost"],
        "min_matches": 1,
    },
    "Insurance": {
        "keywords": ["claim", "premium", "policy", "insurer", "insured", "deductible", "coverage", "underwriter", "actuary", "damage", "incident", "loss_ratio", "beneficiary"],
        "min_matches": 1,
    },
    "Real Estate": {
        "keywords": ["property", "lease", "rent", "tenant", "landlord", "mortgage", "agent", "broker", "listing", "square_feet", "sqft", "bedroom", "bathroom", "amenity", "hoa", "appraisal"],
        "min_matches": 1,
    },
    "Telecommunications": {
        "keywords": ["subscriber", "sim", "carrier", "bandwidth", "call", "sms", "data_usage", "roaming", "recharge", "plan", "network", "signal", "churn", "cdr", "minutes"],
        "min_matches": 1,
    },
    "Government": {
        "keywords": ["citizen", "taxpayer", "municipality", "agency", "regulation", "compliance", "permit", "license", "public_service", "grant", "budget", "election", "district"],
        "min_matches": 1,
    },
    "Logistics": {
        "keywords": ["delivery", "route", "fleet", "vehicle", "driver", "dispatch", "gps", "tracking", "origin", "destination", "manifest", "freight", "carrier"],
        "min_matches": 1,
    },
    "Energy": {
        "keywords": ["grid", "utility", "kw", "kwh", "power", "solar", "wind", "turbine", "meter", "consumption", "oil", "gas", "generator", "voltage", "current"],
        "min_matches": 1,
    },
}
