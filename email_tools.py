import re
# Import properly from the package
from email_validator import validate_email as check_email, EmailNotValidError

def validate_email(email):
    """
    Validates an email address using multiple checks:
    1. Syntax validation using email-validator
    2. Check against disposable email domains
    3. Optional MX record check (if enabled)
    
    Returns:
        dict: A dictionary with status and details
    """
    # Set initial result dict
    result = {
        'status': 'unknown',  # valid, invalid, risky, unknown
        'reason': None,
        'is_disposable': False,
        'is_well_formed': False
    }
    
    # Basic check for empty email
    if not email or not isinstance(email, str):
        result['status'] = 'invalid'
        result['reason'] = 'Empty or invalid email format'
        return result
    
    # Check syntax using email_validator
    try:
        # Use normalize=True to convert internationalized domain names to ASCII
        # Use check_deliverability=True to check DNS MX records
        validated = check_email(email, check_deliverability=True)
        result['is_well_formed'] = True
    except EmailNotValidError as e:
        # Email is not valid
        result['status'] = 'invalid'
        result['reason'] = str(e)
        return result
    
    # Check for disposable email domains
    disposable_domains = [
        'mailinator.com', 'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 
        'yopmail.com', 'maildrop.cc', '10minutemail.com', 'trashmail.com',
        'disposablemail.com', 'sharklasers.com', 'throwawaymail.com'
    ]
    domain = email.split('@')[-1].lower()
    if domain in disposable_domains:
        result['is_disposable'] = True
        result['status'] = 'risky'
        result['reason'] = 'Disposable email domain detected'
        return result
    
    # Check for well-known domains
    well_known_domains = [
        'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 
        'icloud.com', 'protonmail.com', 'mail.com', 'zoho.com', 'yandex.com'
    ]
    if domain in well_known_domains:
        result['status'] = 'valid'
    else:
        # For other domains, mark as valid but with lower confidence
        result['status'] = 'valid'
    
    return result