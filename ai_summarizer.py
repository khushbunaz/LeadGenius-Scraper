import os
import json
import logging
from openai import OpenAI

# Initialize OpenAI client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")  # Retrieve from the environment

if not OPENAI_API_KEY:
    raise ValueError("Missing OpenAI API key. Set the OPENAI_API_KEY environment variable.")

openai = OpenAI(api_key=OPENAI_API_KEY)


def summarize_company(description):
    """
    Summarize company descriptions using OpenAI's GPT-4o model
    
    Args:
        description (str): The company description to summarize
    
    Returns:
        str: A summarized version of the company description
    """
    if not description or len(description) < 50:
        return description
    
    try:
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        prompt = (
            "Please summarize the following company description in a concise, "
            "professional manner (2-3 sentences max):\n\n"
            f"{description}"
        )
        
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150
        )
        
        summary = response.choices[0].message.content.strip()
        logging.debug(f"AI summarization complete: {summary[:50]}...")
        return summary
        
    except Exception as e:
        logging.error(f"Error summarizing with AI: {e}")
        # Return a truncated version as fallback
        return description[:200] + "..." if len(description) > 200 else description

def analyze_company_value(company_data):
    """
    Analyze a company's potential value as a lead using AI
    
    Args:
        company_data (dict): Company information including industry, size, etc.
    
    Returns:
        dict: Analysis results including score and reasoning
    """
    try:
        # Format the company data as a string for the prompt
        company_info = (
            f"Company: {company_data.get('name', 'Unknown')}\n"
            f"Industry: {company_data.get('industry', 'Unknown')}\n"
            f"Size: {company_data.get('size', 'Unknown')}\n"
            f"Description: {company_data.get('description', 'N/A')}\n"
            f"Social Media Presence: {', '.join(k for k, v in company_data.get('social_media', {}).items() if v)}"
        )
        
        prompt = (
            "Analyze this company as a potential sales lead. "
            "Rate its potential value on a scale of 1-100 and provide a brief "
            "explanation for this rating. Respond in JSON format with 'score' (number) "
            "and 'reasoning' (text) fields.\n\n"
            f"{company_info}"
        )
        
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024.
        # do not change this unless explicitly requested by the user
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return {
            'score': result.get('score', 50),
            'reasoning': result.get('reasoning', 'No analysis provided')
        }
        
    except Exception as e:
        logging.error(f"Error analyzing company value: {e}")
        return { 'score': 50, 'reasoning': 'Unable to analyze due to an error'}
