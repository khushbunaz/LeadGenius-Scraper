# LeadGenius: Lead Generation Tool

## Overview
LeadGenius is a web-based tool designed to automate lead generation by extracting business contact information. It provides an intuitive UI, filtering options, and CSV export functionality to streamline sales outreach.

## Features
- **Automated Web Scraping**: Extracts key business data from multiple sources.
- **Data Cleaning & Deduplication**: Ensures high-quality, unique leads.
- **User-Friendly Interface**: Allows filtering and searching of leads.
- **CSV Export**: Easily download leads for further processing.
- **Database Integration**: Uses SQLite for structured storage.

## Installation
### Prerequisites
- Python 3.x
- SQLite
- Required Python libraries (see `requirements.txt`)

### Setup Instructions
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/LeadGenius.git
   cd LeadGenius
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the application:
   ```bash
   python app.py
   ```
4. Open in browser:
   - Navigate to `http://localhost:5000/`

## Usage
- Upload a list of URLs or keywords to scrape.
- Filter and manage leads using the UI.
- Export leads to CSV for sales team integration.

## Project Structure
```
LeadGenius/
│── app.py                 # Main application script
│── templates/             # HTML templates for UI
│── static/                # CSS and JS files
│── database.db            # SQLite database
│── requirements.txt       # List of dependencies
│── README.md              # Project documentation
```

## License
MIT License

## Contributors
- Khushbunaz Dalal ([https://github.com/khushbunaz])

---
Feel free to contribute by submitting issues or pull requests!

