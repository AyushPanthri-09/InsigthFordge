import re
from typing import Dict, List, Optional
from backend.services.intelligence.config import ABBREVIATIONS, ONTOLOGY_ALIASES

class OntologyManager:
    """
    Manages naming conventions, abbreviation normalization, and canonical concept resolution.
    """

    @staticmethod
    def normalize_name(name: str) -> str:
        """
        Normalizes a column name by expanding abbreviations and formatting words.
        Example: 'cust_id' -> 'Customer Identifier'
                 'order_qty' -> 'Order Quantity'
                 'DOB' -> 'Date Of Birth'
        """
        if not name:
            return ""
            
        # Convert camelCase / PascalCase to snake_case style spacing
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1 \2', name)
        s2 = re.sub('([a-z0-9])([A-Z])', r'\1 \2', s1)
        
        # Split by non-alphanumeric characters
        tokens = re.split(r'[^a-zA-Z0-9]+', s2.lower())
        tokens = [t for t in tokens if t]
        
        # Check if the whole string matches an abbreviation directly (e.g. 'dob' -> 'Date of Birth')
        joined_lower = "".join(tokens)
        if joined_lower in ABBREVIATIONS:
            return ABBREVIATIONS[joined_lower]
            
        normalized_tokens = []
        for token in tokens:
            if token in ABBREVIATIONS:
                normalized_tokens.append(ABBREVIATIONS[token])
            else:
                normalized_tokens.append(token.capitalize())
                
        return " ".join(normalized_tokens)

    @staticmethod
    def resolve_concept(name: str) -> str:
        """
        Resolves a column name to a canonical business concept.
        Returns the canonical concept name, or 'generic' if no match.
        """
        if not name:
            return "generic"
            
        name_lower = name.lower()
        # Clean naming characters to allow easier substring matches
        name_clean = re.sub(r'[^a-z0-9]+', ' ', name_lower).strip()
        tokens = name_clean.split()
        
        # 1. Look for exact matches or full token matches on ontology aliases
        for concept, aliases in ONTOLOGY_ALIASES.items():
            if name_lower == concept or name_lower in aliases or name_clean == concept:
                return concept
            for token in tokens:
                if token == concept or token in aliases:
                    return concept
                    
        # 2. Look for substring matches
        for concept, aliases in ONTOLOGY_ALIASES.items():
            if concept in name_lower or concept in name_clean:
                return concept
            for alias in aliases:
                # Clean up alias for space-agnostic checks
                alias_clean = alias.replace("_", " ").replace("-", " ")
                if ((alias in name_lower or alias in name_clean or alias_clean in name_clean) 
                        and len(alias) > 2):
                    return concept
                    
        return "generic"

    @staticmethod
    def get_description_for_column(col_name: str, concept: str) -> str:
        """
        Generates a standard business definition for a column name based on its concept.
        """
        norm_name = OntologyManager.normalize_name(col_name)
        
        concept_descriptions = {
            "revenue": "Represents monetary income generated from sales or business activities.",
            "customer": "Identifies the buyer, client, or consumer entity associated with the record.",
            "product": "Refers to the specific item, merchandise, SKU, or service offered.",
            "date": "Specifies a temporal point or calendar date.",
            "quantity": "Denotes the count or volume of items or units.",
            "salary": "Represents employee compensation or earnings.",
            "cost": "Represents the expenses incurred to acquire or produce items.",
            "profit": "Represents the net financial gain after expenses are deducted.",
            "location": "Specifies geographic information (e.g. region, country, state, city).",
            "status": "Indicates the state, condition, phase, or active status of an entity.",
        }
        
        desc = concept_descriptions.get(concept)
        if desc:
            return f"[{norm_name}] {desc}"
        else:
            return f"Represents '{norm_name}' column containing data values."
