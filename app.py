import os
import logging
import traceback
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
import json

# Set up logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
# create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")

# configure the database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///leads.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
# initialize the app with the extension
db.init_app(app)

# Import routes after app initialization to avoid circular imports
from models import Lead, Company, SocialMedia, CompetitorAnalysis
from email_tools import validate_email
from social_media_detector import detect_social_media
from ai_summarizer import summarize_company, analyze_company_value
from scraper import scrape_company_data

# Initialize database
with app.app_context():
    db.create_all()

# Routes
@app.route('/')
def index():
    """Render the main landing page"""
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    """Render the dashboard view"""
    return render_template('dashboard.html')

@app.route('/scraper')
def scraper():
    """Render the dedicated scraper page"""
    return render_template('scraper.html')

@app.route('/api/leads', methods=['GET'])
def get_leads():
    """Get all leads with filtering options"""
    industry = request.args.get('industry')
    email_status = request.args.get('email_status')
    company_size = request.args.get('company_size')
    
    # Start with base query
    query = Lead.query.join(Lead.company)
    
    # Apply filters if provided
    if industry:
        query = query.filter(Company.industry == industry)
    if email_status:
        query = query.filter(Lead.email_status == email_status)
    if company_size:
        query = query.filter(Company.size == company_size)
    
    leads = query.all()
    result = []
    
    for lead in leads:
        social_media = SocialMedia.query.filter_by(company_id=lead.company.id).first()
        lead_data = {
            'id': lead.id,
            'name': lead.name,
            'email': lead.email,
            'email_status': lead.email_status,
            'score': lead.score,
            'position': lead.position,
            'phone': lead.phone,
            'linkedin_profile': lead.linkedin_profile,
            'priority': lead.priority,
            'last_contact_date': lead.last_contact_date.isoformat() if lead.last_contact_date else None,
            'next_follow_up': lead.next_follow_up.isoformat() if lead.next_follow_up else None,
            'follow_up_notes': lead.follow_up_notes,
            'follow_up_type': lead.follow_up_type,
            'ai_analysis': lead.ai_analysis,
            'cold_email_template': lead.cold_email_template,
            'company': {
                'id': lead.company.id,
                'name': lead.company.name,
                'industry': lead.company.industry,
                'size': lead.company.size,
                'description': lead.company.description,
                'summary': lead.company.summary,
                'website': lead.company.website,
                'domain': lead.company.domain,
                'country': lead.company.country,
                'revenue': lead.company.revenue,
                'target_audience': lead.company.target_audience,
                'linkedin_activity': lead.company.linkedin_activity,
                'owner_name': lead.company.owner_name,
                'owner_email': lead.company.owner_email,
                'owner_phone': lead.company.owner_phone,
                'owner_linkedin': lead.company.owner_linkedin
            },
            'social_media': {
                'linkedin': social_media.linkedin if social_media else None,
                'twitter': social_media.twitter if social_media else None,
                'instagram': social_media.instagram if social_media else None,
                'facebook': social_media.facebook if social_media else None
            }
        }
        result.append(lead_data)
    
    return jsonify(result)

@app.route('/api/lead/<int:lead_id>', methods=['GET'])
def get_lead(lead_id):
    """Get a specific lead by ID"""
    lead = Lead.query.get_or_404(lead_id)
    social_media = SocialMedia.query.filter_by(company_id=lead.company.id).first()
    
    lead_data = {
        'id': lead.id,
        'name': lead.name,
        'email': lead.email,
        'email_status': lead.email_status,
        'score': lead.score,
        'position': lead.position,
        'phone': lead.phone,
        'linkedin_profile': lead.linkedin_profile,
        'priority': lead.priority,
        'last_contact_date': lead.last_contact_date.isoformat() if lead.last_contact_date else None,
        'next_follow_up': lead.next_follow_up.isoformat() if lead.next_follow_up else None,
        'follow_up_notes': lead.follow_up_notes,
        'follow_up_type': lead.follow_up_type,
        'ai_analysis': lead.ai_analysis,
        'cold_email_template': lead.cold_email_template,
        'company': {
            'id': lead.company.id,
            'name': lead.company.name,
            'industry': lead.company.industry,
            'size': lead.company.size,
            'description': lead.company.description,
            'summary': lead.company.summary,
            'website': lead.company.website,
            'domain': lead.company.domain,
            'country': lead.company.country,
            'revenue': lead.company.revenue,
            'target_audience': lead.company.target_audience,
            'linkedin_activity': lead.company.linkedin_activity,
            'owner_name': lead.company.owner_name,
            'owner_email': lead.company.owner_email,
            'owner_phone': lead.company.owner_phone,
            'owner_linkedin': lead.company.owner_linkedin
        },
        'social_media': {
            'linkedin': social_media.linkedin if social_media else None,
            'twitter': social_media.twitter if social_media else None,
            'instagram': social_media.instagram if social_media else None,
            'facebook': social_media.facebook if social_media else None
        }
    }
    
    return jsonify(lead_data)

@app.route('/api/lead/<int:lead_id>', methods=['PUT'])
def update_lead(lead_id):
    """Update a specific lead"""
    lead = Lead.query.get_or_404(lead_id)
    data = request.json
    
    # Update lead fields
    if 'name' in data:
        lead.name = data['name']
    if 'email' in data:
        lead.email = data['email']
        # Re-validate email if it changed
        email_result = validate_email(data['email'])
        lead.email_status = email_result['status']
    if 'position' in data:
        lead.position = data['position']
    if 'phone' in data:
        lead.phone = data['phone']
    if 'linkedin_profile' in data:
        lead.linkedin_profile = data['linkedin_profile']
    if 'priority' in data:
        lead.priority = data['priority']
    if 'follow_up_notes' in data:
        lead.follow_up_notes = data['follow_up_notes']
    if 'follow_up_type' in data:
        lead.follow_up_type = data['follow_up_type']
    
    # Update company information if provided
    if 'company' in data:
        company_data = data['company']
        company = lead.company
        
        if 'name' in company_data:
            company.name = company_data['name']
        if 'industry' in company_data:
            company.industry = company_data['industry']
        if 'size' in company_data:
            company.size = company_data['size']
        if 'description' in company_data:
            company.description = company_data['description']
        if 'website' in company_data:
            company.website = company_data['website']
        if 'country' in company_data:
            company.country = company_data['country']
    
    # Recalculate lead score based on updated information
    lead.score = calculate_lead_score(lead.email_status, lead.company)
    
    db.session.commit()
    
    return jsonify({'success': True, 'id': lead.id})

@app.route('/api/leads', methods=['POST'])
def add_lead():
    """Add a new lead"""
    data = request.json
    
    # Validate email
    email_result = validate_email(data.get('email', ''))
    
    # Create or get company
    company_name = data.get('company_name', '')
    company = Company.query.filter_by(name=company_name).first()
    
    if not company:
        # Use provided company data or scrape company data
        if 'company_data' in data and data['company_data']:
            company_data = data['company_data']
        else:
            company_data = scrape_company_data(company_name)
        
        # Summarize company with AI
        if company_data.get('description'):
            summary = summarize_company(company_data.get('description', ''))
        else:
            summary = ""
        
        company = Company(
            name=company_name,
            industry=company_data.get('industry', 'Unknown'),
            size=company_data.get('size', 'Unknown'),
            description=company_data.get('description', ''),
            summary=summary,
            website=company_data.get('website', ''),
            domain=company_data.get('domain', ''),
            country=company_data.get('country', 'Unknown'),
            owner_name=company_data.get('owner_name', ''),
            owner_email=company_data.get('owner_email', ''),
            owner_email_status=company_data.get('owner_email_status', 'unknown'),
            owner_phone=company_data.get('owner_phone', ''),
            owner_linkedin=company_data.get('owner_linkedin', ''),
            target_audience=company_data.get('target_audience', ''),
            revenue=company_data.get('revenue', 'Unknown'),
            linkedin_activity=company_data.get('linkedin_activity', 'Unknown')
        )
        db.session.add(company)
        db.session.flush()  # Get ID without committing
        
        # Detect social media
        if 'social_media' in company_data and company_data['social_media']:
            social_links = company_data['social_media']
        else:
            social_links = detect_social_media(company_name)
        
        social_media = SocialMedia(
            company_id=company.id,
            linkedin=social_links.get('linkedin'),
            twitter=social_links.get('twitter'),
            instagram=social_links.get('instagram'),
            facebook=social_links.get('facebook')
        )
        db.session.add(social_media)
    
    # Generate AI analysis for the lead
    ai_analysis = ""
    cold_email_template = ""
    
    try:
        company_data_for_analysis = {
            'name': company.name,
            'industry': company.industry,
            'size': company.size,
            'description': company.description,
            'social_media': {
                'linkedin': social_media.linkedin if 'social_media' in locals() else None,
                'twitter': social_media.twitter if 'social_media' in locals() else None,
                'instagram': social_media.instagram if 'social_media' in locals() else None,
                'facebook': social_media.facebook if 'social_media' in locals() else None
            }
        }
        analysis_result = analyze_company_value(company_data_for_analysis)
        ai_analysis = analysis_result.get('reasoning', '')
    except Exception as e:
        logging.error(f"Error generating AI analysis: {e}")
    
    # Create lead
    lead = Lead(
        name=data.get('name', ''),
        email=data.get('email', ''),
        email_status=email_result['status'],
        position=data.get('position', ''),
        phone=data.get('phone', ''),
        linkedin_profile=data.get('linkedin_profile', ''),
        priority=data.get('priority', 'medium'),
        follow_up_notes=data.get('follow_up_notes', ''),
        follow_up_type=data.get('follow_up_type', ''),
        ai_analysis=ai_analysis,
        cold_email_template=cold_email_template,
        score=calculate_lead_score(email_result['status'], company),
        company_id=company.id
    )
    
    db.session.add(lead)
    db.session.commit()
    
    return jsonify({'success': True, 'id': lead.id})

@app.route('/api/leads/export', methods=['POST'])
def export_leads():
    """Export leads in the specified format"""
    data = request.json
    format_type = data.get('format', 'csv')
    lead_ids = data.get('lead_ids', [])
    
    # Get leads to export
    if lead_ids:
        leads = Lead.query.filter(Lead.id.in_(lead_ids)).all()
    else:
        leads = Lead.query.all()
    
    # Format leads data
    leads_data = []
    for lead in leads:
        social_media = SocialMedia.query.filter_by(company_id=lead.company.id).first()
        lead_data = {
            'id': lead.id,
            'name': lead.name,
            'email': lead.email,
            'email_status': lead.email_status,
            'score': lead.score,
            'position': lead.position,
            'phone': lead.phone,
            'linkedin_profile': lead.linkedin_profile,
            'priority': lead.priority,
            'last_contact_date': lead.last_contact_date.isoformat() if lead.last_contact_date else None,
            'next_follow_up': lead.next_follow_up.isoformat() if lead.next_follow_up else None,
            'follow_up_notes': lead.follow_up_notes,
            'follow_up_type': lead.follow_up_type,
            'company_name': lead.company.name,
            'industry': lead.company.industry,
            'company_size': lead.company.size,
            'company_description': lead.company.description,
            'company_summary': lead.company.summary,
            'company_website': lead.company.website,
            'company_domain': lead.company.domain,
            'company_country': lead.company.country,
            'owner_name': lead.company.owner_name,
            'owner_email': lead.company.owner_email,
            'owner_phone': lead.company.owner_phone,
            'owner_linkedin': lead.company.owner_linkedin,
            'linkedin': social_media.linkedin if social_media else None,
            'twitter': social_media.twitter if social_media else None,
            'instagram': social_media.instagram if social_media else None,
            'facebook': social_media.facebook if social_media else None
        }
        leads_data.append(lead_data)
    
    # Return data in requested format
    if format_type == 'json':
        return jsonify(leads_data)
    else:
        # For CSV and Excel, return the data as JSON for client-side processing
        return jsonify({
            'format': format_type,
            'data': leads_data
        })

@app.route('/api/scrape', methods=['POST'])
def scrape_leads():
    """Scrape leads from a source"""
    data = request.json
    source_url = data.get('source_url')
    
    if not source_url:
        return jsonify({
            'success': False,
            'message': 'No source URL or company name provided'
        }), 400
    
    try:
        logging.info(f"Starting scraping for: {source_url}")
        # Get company data from the scraper
        company_data = scrape_company_data(source_url)
        
        if not company_data or not company_data.get('name'):
            return jsonify({
                'success': False,
                'message': 'Failed to scrape company data',
                'error': 'No company information found'
            }), 404
        
        logging.info(f"Successfully scraped data for {company_data.get('name')}")
        
        # Generate a summary if we have a description
        if company_data.get('description'):
            try:
                company_data['summary'] = summarize_company(company_data['description'])
                logging.info(f"Generated summary for {company_data.get('name')}")
            except Exception as e:
                logging.error(f"Error generating summary: {e}")
                company_data['summary'] = "Summary generation failed."
        
        # Detect social media profiles
        try:
            if not company_data.get('social_media') or not any(company_data.get('social_media', {}).values()):
                social_media_data = detect_social_media(company_data.get('name', ''))
                company_data['social_media'] = social_media_data
                logging.info(f"Detected social media for {company_data.get('name')}")
        except Exception as e:
            logging.error(f"Error detecting social media: {e}")
            company_data['social_media'] = {
                'linkedin': None,
                'twitter': None,
                'instagram': None,
                'facebook': None
            }
        
        return jsonify({
            'success': True,
            'message': f'Successfully scraped data for {company_data.get("name")}',
            'company_data': company_data
        })
        
    except Exception as e:
        logging.error(f"Error during scraping: {e}")
        logging.debug(f"Scraping error details: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': 'Error during scraping process',
            'error': str(e)
        }), 500

@app.route('/api/competitors/<int:company_id>', methods=['GET'])
def get_competitors(company_id):
    """Get competitors for a specific company"""
    company = Company.query.get_or_404(company_id)
    competitors = CompetitorAnalysis.query.filter_by(company_id=company_id).all()
    
    result = []
    for competitor in competitors:
        result.append({
            'id': competitor.id,
            'competitor_name': competitor.competitor_name,
            'competitor_website': competitor.competitor_website,
            'competitor_industry': competitor.competitor_industry,
            'competitor_size': competitor.competitor_size,
            'market_position': competitor.market_position,
            'strengths': competitor.strengths,
            'weaknesses': competitor.weaknesses,
            'similarity_score': competitor.similarity_score,
            'ai_comparison': competitor.ai_comparison
        })
    
    return jsonify(result)

@app.route('/api/competitors', methods=['POST'])
def add_competitor():
    """Add a competitor for a company"""
    data = request.json
    company_id = data.get('company_id')
    competitor_name = data.get('competitor_name')
    
    if not company_id or not competitor_name:
        return jsonify({
            'success': False,
            'message': 'Company ID and competitor name are required'
        }), 400
    
    # Check if company exists
    company = Company.query.get(company_id)
    if not company:
        return jsonify({
            'success': False,
            'message': 'Company not found'
        }), 404
    
    try:
        # Scrape competitor data
        competitor_data = scrape_company_data(competitor_name)
        
        if not competitor_data or not competitor_data.get('name'):
            return jsonify({
                'success': False,
                'message': 'Failed to scrape competitor data',
                'error': 'No competitor information found'
            }), 404
        
        # Calculate similarity score (simple implementation)
        similarity_score = 0
        if company.industry == competitor_data.get('industry'):
            similarity_score += 30
        if company.size == competitor_data.get('size'):
            similarity_score += 20
        if company.country == competitor_data.get('country'):
            similarity_score += 20
        # Add additional 30 points based on target audience similarity
        similarity_score += 30
        
        # Generate AI comparison
        try:
            ai_comparison = f"Both {company.name} and {competitor_data.get('name')} operate in the {company.industry} industry. "
            if company.size == competitor_data.get('size'):
                ai_comparison += f"They are similar in size ({company.size}). "
            else:
                ai_comparison += f"While {company.name} is {company.size}, {competitor_data.get('name')} is {competitor_data.get('size')}. "
            
            # Add strengths and weaknesses
            strengths = f"{competitor_data.get('name')} has a strong online presence." if any(competitor_data.get('social_media', {}).values()) else f"{competitor_data.get('name')} has limited online visibility."
            weaknesses = "Further analysis required to determine specific weaknesses."
        except Exception as e:
            logging.error(f"Error generating AI comparison: {e}")
            ai_comparison = "Comparison not available."
            strengths = "Not determined."
            weaknesses = "Not determined."
        
        # Create competitor analysis
        competitor = CompetitorAnalysis(
            company_id=company_id,
            competitor_name=competitor_data.get('name', competitor_name),
            competitor_website=competitor_data.get('website', ''),
            competitor_industry=competitor_data.get('industry', 'Unknown'),
            competitor_size=competitor_data.get('size', 'Unknown'),
            market_position='challenger',  # Default position
            strengths=strengths,
            weaknesses=weaknesses,
            similarity_score=similarity_score,
            ai_comparison=ai_comparison
        )
        
        db.session.add(competitor)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'id': competitor.id,
            'message': f'Successfully added competitor {competitor_data.get("name")}'
        })
        
    except Exception as e:
        logging.error(f"Error adding competitor: {e}")
        logging.debug(f"Error details: {traceback.format_exc()}")
        return jsonify({
            'success': False,
            'message': 'Error adding competitor',
            'error': str(e)
        }), 500

@app.route('/api/generate-email/<int:lead_id>', methods=['GET'])
def generate_email(lead_id):
    """Generate a cold email template for a lead"""
    lead = Lead.query.get_or_404(lead_id)
    company = lead.company
    
    try:
        # Prepare data for email generation
        company_data = {
            'name': company.name,
            'industry': company.industry,
            'size': company.size,
            'description': company.description,
            'summary': company.summary
        }
        
        recipient_name = lead.name or "there"
        company_name = company.name
        industry = company.industry or "your industry"
        
        # Generate a personalized email template
        template = f"""Subject: Helping {company_name} improve results in {industry}

Hi {recipient_name},

I noticed {company_name} has been doing great work in the {industry} space, and I thought you might be interested in how we've been helping similar companies improve their results.

Our platform has helped companies like yours achieve:
- 30% increase in qualified leads
- 25% reduction in customer acquisition costs
- 40% faster sales cycle

Would you be open to a quick 15-minute call next week to discuss how we might help {company_name} achieve similar results?

Looking forward to hearing from you,

[Your Name]
[Your Position]
[Your Company]
[Your Contact Info]"""
        
        # Save the template to the lead
        lead.cold_email_template = template
        db.session.commit()
        
        return jsonify({
            'success': True,
            'email_template': template
        })
        
    except Exception as e:
        logging.error(f"Error generating email template: {e}")
        return jsonify({
            'success': False,
            'message': 'Error generating email template',
            'error': str(e)
        }), 500

@app.route('/api/linkedin-connect/<int:lead_id>', methods=['POST'])
def linkedin_connect(lead_id):
    """Generate LinkedIn connection message"""
    lead = Lead.query.get_or_404(lead_id)
    company = lead.company
    
    try:
        # Generate a personalized connection message
        recipient_name = lead.name.split()[0] if lead.name else "there"
        company_name = company.name
        industry = company.industry or "your industry"
        
        connection_message = f"""Hi {recipient_name}, I noticed your work at {company_name} in the {industry} space. I'd love to connect and share ideas on how we might collaborate. Looking forward to connecting!"""
        
        return jsonify({
            'success': True,
            'connection_message': connection_message,
            'profile_link': lead.linkedin_profile or company.owner_linkedin
        })
        
    except Exception as e:
        logging.error(f"Error generating LinkedIn connection: {e}")
        return jsonify({
            'success': False,
            'message': 'Error generating LinkedIn connection message',
            'error': str(e)
        }), 500

@app.route('/api/schedule-followup/<int:lead_id>', methods=['POST'])
def schedule_followup(lead_id):
    """Schedule a follow-up for a lead"""
    data = request.json
    follow_up_date = data.get('follow_up_date')
    follow_up_type = data.get('follow_up_type', 'email')
    follow_up_notes = data.get('follow_up_notes', '')
    
    if not follow_up_date:
        return jsonify({
            'success': False,
            'message': 'Follow-up date is required'
        }), 400
    
    try:
        lead = Lead.query.get_or_404(lead_id)
        
        # Update lead with follow-up information
        lead.next_follow_up = follow_up_date
        lead.follow_up_type = follow_up_type
        lead.follow_up_notes = follow_up_notes
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Follow-up scheduled successfully'
        })
        
    except Exception as e:
        logging.error(f"Error scheduling follow-up: {e}")
        return jsonify({
            'success': False,
            'message': 'Error scheduling follow-up',
            'error': str(e)
        }), 500

@app.route('/api/analyze-lead/<int:lead_id>', methods=['GET'])
def analyze_lead(lead_id):
    """Analyze a lead using AI"""
    lead = Lead.query.get_or_404(lead_id)
    company = lead.company
    
    try:
        # Prepare data for analysis
        company_data = {
            'name': company.name,
            'industry': company.industry,
            'size': company.size,
            'description': company.description,
            'summary': company.summary
        }
        
        # Get social media data
        social_media = SocialMedia.query.filter_by(company_id=company.id).first()
        if social_media:
            company_data['social_media'] = {
                'linkedin': social_media.linkedin,
                'twitter': social_media.twitter,
                'instagram': social_media.instagram,
                'facebook': social_media.facebook
            }
        
        # Perform AI analysis
        analysis = analyze_company_value(company_data)
        
        # Update lead with analysis
        lead.ai_analysis = analysis.get('reasoning', '')
        lead.score = max(lead.score, analysis.get('score', 50))  # Use higher of current score or AI score
        db.session.commit()
        
        return jsonify({
            'success': True,
            'analysis': analysis
        })
        
    except Exception as e:
        logging.error(f"Error analyzing lead: {e}")
        return jsonify({
            'success': False,
            'message': 'Error analyzing lead',
            'error': str(e)
        }), 500

def calculate_lead_score(email_status, company):
    """
    Calculate a lead score based on various factors:
    - Email validity (0-40 points)
    - Company size (0-20 points)
    - Social media presence (0-20 points)
    - Industry relevance (0-20 points)
    """
    score = 0
    
    # Email status score
    if email_status == 'valid':
        score += 40
    elif email_status == 'risky':
        score += 20
    
    # Company size score
    if company.size == 'Enterprise':
        score += 20
    elif company.size == 'Mid-Market':
        score += 15
    elif company.size == 'SMB':
        score += 10
    
    # Social media presence score
    social_media = SocialMedia.query.filter_by(company_id=company.id).first()
    if social_media:
        presence_count = sum(1 for link in [
            social_media.linkedin, 
            social_media.twitter, 
            social_media.instagram, 
            social_media.facebook
        ] if link)
        score += min(presence_count * 5, 20)
    
    # Industry relevance score (simplified)
    relevant_industries = ['Technology', 'Finance', 'Healthcare', 'Retail']
    if company.industry in relevant_industries:
        score += 20
    else:
        score += 10
    
    return score
