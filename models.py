from app import db
from datetime import datetime

class Lead(db.Model):
    """Model for lead data"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    email_status = db.Column(db.String(20), default='unknown')  # valid, invalid, risky, unknown
    score = db.Column(db.Integer, default=0)  # 0-100 lead score
    
    # New fields for advanced features
    phone = db.Column(db.String(30))
    position = db.Column(db.String(100))
    linkedin_profile = db.Column(db.String(255))
    
    # Follow-up scheduling
    last_contact_date = db.Column(db.DateTime, nullable=True)
    next_follow_up = db.Column(db.DateTime, nullable=True)
    follow_up_notes = db.Column(db.Text)
    follow_up_type = db.Column(db.String(50))  # email, call, message, etc.
    
    # Lead prioritization
    priority = db.Column(db.String(20), default='medium')  # low, medium, high
    ai_analysis = db.Column(db.Text)  # AI-generated insights about the lead
    cold_email_template = db.Column(db.Text)  # AI-generated email template
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    company = db.relationship('Company', backref=db.backref('leads', lazy=True))
    
    def __repr__(self):
        return f'<Lead {self.name} ({self.email})>'

class Company(db.Model):
    """Model for company data"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    industry = db.Column(db.String(100))
    size = db.Column(db.String(50))  # SMB, Mid-Market, Enterprise
    description = db.Column(db.Text)
    summary = db.Column(db.Text)  # AI-generated summary
    website = db.Column(db.String(255))
    
    # New fields
    domain = db.Column(db.String(255))  # Company domain name
    country = db.Column(db.String(100))
    revenue = db.Column(db.String(100))
    linkedin_activity = db.Column(db.String(100))  # High, Medium, Low
    target_audience = db.Column(db.Text)
    
    # Owner information
    owner_name = db.Column(db.String(100))
    owner_email = db.Column(db.String(120))
    owner_email_status = db.Column(db.String(20), default='unknown')  # valid, invalid, unknown
    owner_phone = db.Column(db.String(30))
    owner_linkedin = db.Column(db.String(255))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<Company {self.name}>'

class SocialMedia(db.Model):
    """Model for social media presence"""
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    linkedin = db.Column(db.String(255))
    twitter = db.Column(db.String(255))
    instagram = db.Column(db.String(255))
    facebook = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    company = db.relationship('Company', backref=db.backref('social_media', lazy=True))
    
    def __repr__(self):
        return f'<SocialMedia for {self.company.name}>'
        
class CompetitorAnalysis(db.Model):
    """Model for competitor analysis data"""
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    competitor_name = db.Column(db.String(100), nullable=False)
    competitor_website = db.Column(db.String(255))
    competitor_industry = db.Column(db.String(100))
    competitor_size = db.Column(db.String(50))
    market_position = db.Column(db.String(50))  # leader, challenger, follower, niche
    strengths = db.Column(db.Text)
    weaknesses = db.Column(db.Text)
    similarity_score = db.Column(db.Integer)  # 0-100 score for how similar to target company
    ai_comparison = db.Column(db.Text)  # AI-generated competitor comparison
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    company = db.relationship('Company', backref=db.backref('competitors', lazy=True))
    
    def __repr__(self):
        return f'<Competitor {self.competitor_name} for {self.company.name}>'
        
class SentimentAnalysis(db.Model):
    """Model for sentiment analysis of reviews and online presence"""
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company.id'), nullable=False)
    source = db.Column(db.String(100))  # Trustpilot, G2, etc.
    rating = db.Column(db.Float)  # Average rating (0-5)
    review_count = db.Column(db.Integer)
    sentiment_score = db.Column(db.Float)  # -1 to 1 (negative to positive)
    key_positives = db.Column(db.Text)
    key_negatives = db.Column(db.Text)
    summary = db.Column(db.Text)  # AI-generated summary of sentiment
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    company = db.relationship('Company', backref=db.backref('sentiment_analyses', lazy=True))
    
    def __repr__(self):
        return f'<SentimentAnalysis for {self.company.name} from {self.source}>'
        
class AutoScraperSchedule(db.Model):
    """Model for automated scraping schedule"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    frequency = db.Column(db.String(20), nullable=False)  # daily, weekly, monthly, custom
    custom_cron = db.Column(db.String(100))  # For custom cron schedules
    source_url = db.Column(db.String(255))
    source_type = db.Column(db.String(50))  # website, search, directory
    max_leads = db.Column(db.Integer, default=20)
    industry_filter = db.Column(db.String(100))
    country_filter = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    last_run = db.Column(db.DateTime)
    next_run = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<AutoScraperSchedule {self.name} ({self.frequency})>'
