/**
 * Web Scraper Module
 * Handles company data extraction from websites and displays results
 */

// Global state to store scraped company data
let scrapedCompanyData = null;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize scraper functionality
    const scraperForm = document.getElementById('scraper-form');
    const addLeadForm = document.getElementById('add-lead-form');
    const submitLeadBtn = document.getElementById('submit-lead-btn');
    const startScrapeBtn = document.getElementById('startScrapeBtn');

    // Set up event listeners
    if (scraperForm) {
        scraperForm.addEventListener('submit', handleScrapeFormSubmit);
    }

    if (addLeadForm && submitLeadBtn) {
        submitLeadBtn.addEventListener('click', handleAddLeadSubmit);
    }
    
    if (startScrapeBtn) {
        startScrapeBtn.addEventListener('click', handleModalScrapeSubmit);
    }

    // Set up other modal form handlers if they exist
    const manualForm = document.getElementById('manualForm');
    if (manualForm) {
        manualForm.addEventListener('submit', handleManualLeadSubmit);
    }
});

/**
 * Handle the main scraper form submission
 * @param {Event} e - Form submit event
 */
function handleScrapeFormSubmit(e) {
    e.preventDefault();
    
    const source = document.getElementById('scrape-source').value.trim();
    if (!source) {
        showAlert('Please enter a website URL or company name', 'warning');
        return;
    }
    
    // Show loading state
    const resultsContainer = document.getElementById('scrape-results');
    resultsContainer.classList.remove('d-none');
    resultsContainer.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Scraping data... This may take a moment.</p>
        </div>
    `;
    
    // Call the scraping API
    fetch('/api/scrape', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source_url: source })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            scrapedCompanyData = data.company_data;
            displayScrapedResults(data.company_data);
        } else {
            showScrapingError(data.message || 'Failed to scrape data');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showScrapingError('An error occurred while scraping the data');
    });
}

/**
 * Handle scraping from the modal form
 */
function handleModalScrapeSubmit() {
    const source = document.getElementById('sourceUrl').value.trim();
    const leadCount = document.getElementById('leadCount').value;
    const industryFilter = document.getElementById('industryFilter').value;
    
    if (!source) {
        showAlert('Please enter a website URL ', 'warning');
        return;
    }
    
    // Show loading indicator in the modal
    const modalBody = document.querySelector('#scrape-content');
    const originalContent = modalBody.innerHTML;
    modalBody.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Scraping data... This may take a moment.</p>
        </div>
    `;
    
    // Call the scraping API
    fetch('/api/scrape', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            source_url: source,
            max_leads: leadCount,
            industry_filter: industryFilter
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Hide modal and redirect to dashboard with success message
            const bsModal = bootstrap.Modal.getInstance(document.getElementById('scrapeModal'));
            bsModal.hide();
            
            // Show success notification
            showAlert('Successfully scraped company data!', 'success');
            
            // Add the lead to the database
            addLeadFromScrapedData(data.company_data);
            
            // Reload dashboard data if we're on the dashboard page
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            // Restore original form and show error
            modalBody.innerHTML = originalContent;
            showAlert(data.message || 'Failed to scrape data', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        // Restore original form and show error
        modalBody.innerHTML = originalContent;
        showAlert('An error occurred while scraping the data', 'danger');
    });
}

/**
 * Handle manual lead form submission from the modal
 */
function handleManualLeadSubmit(e) {
    e.preventDefault();
    
    const manualName = document.getElementById('manualName').value.trim();
    const manualEmail = document.getElementById('manualEmail').value.trim();
    const manualCompany = document.getElementById('manualCompany').value.trim();
    const manualIndustry = document.getElementById('manualIndustry').value;
    const manualSize = document.getElementById('manualSize').value;
    
    if (!manualName || !manualEmail || !manualCompany) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    // Create lead data structure
    const leadData = {
        name: manualName,
        email: manualEmail,
        company_name: manualCompany,
        company_data: {
            name: manualCompany,
            industry: manualIndustry,
            size: manualSize,
            description: '',
            social_media: {}
        }
    };
    
    // Show loading state
    const submitBtn = document.querySelector('#manual-content button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';
    
    // Add the lead to the database
    fetch('/api/leads', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal and show success message
            const bsModal = bootstrap.Modal.getInstance(document.getElementById('scrapeModal'));
            bsModal.hide();
            
            showAlert('Lead added successfully!', 'success');
            
            // Reload dashboard data if we're on the dashboard page
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            showAlert(data.message || 'Failed to add lead', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        showAlert('An error occurred while adding the lead', 'danger');
    });
}

/**
 * Handle adding a lead from the scanned data
 */
function handleAddLeadSubmit() {
    const leadName = document.getElementById('lead-name').value.trim();
    const leadEmail = document.getElementById('lead-email').value.trim();
    const companyData = JSON.parse(document.getElementById('lead-company-data').value);
    
    if (!leadName || !leadEmail) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    // Prepare data for API
    const leadData = {
        name: leadName,
        email: leadEmail,
        company_name: companyData.name,
        company_data: companyData
    };
    
    // Show loading state
    const submitBtn = document.getElementById('submit-lead-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Adding...';
    
    // Add the lead to the database
    fetch('/api/leads', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal and show success message
            const bsModal = bootstrap.Modal.getInstance(document.getElementById('add-lead-modal'));
            bsModal.hide();
            
            showAlert('Lead added successfully!', 'success');
            
            // Reload dashboard data if we're on the dashboard page
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            showAlert(data.message || 'Failed to add lead', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        showAlert('An error occurred while adding the lead', 'danger');
    });
}

/**
 * Add a lead directly from scraped data
 * @param {Object} companyData - The scraped company data
 */
function addLeadFromScrapedData(companyData) {
    // Create a simplified lead structure
    const leadData = {
        name: companyData.owner_name || 'Contact ' + companyData.name,
        email: companyData.owner_email || `info@${companyData.domain || 'example.com'}`,
        company_name: companyData.name,
        company_data: companyData
    };
    
    // Add the lead to the database
    fetch('/api/leads', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Lead added successfully!', 'success');
            
            // Reload dashboard data if we're on the dashboard page
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        } else {
            showAlert(data.message || 'Failed to add lead', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('An error occurred while adding the lead', 'danger');
    });
}

/**
 * Display the scraped results in the UI
 * @param {Object} companyData - The scraped company data
 */
function displayScrapedResults(companyData) {
    const resultsContainer = document.getElementById('scrape-results');
    resultsContainer.classList.remove('d-none');
    
    // Create HTML for social media profiles
    let socialMediaHTML = '';
    const socialMedia = companyData.social_media || {};
    
    // Function to validate social media URLs
    const isValidUrl = (url) => {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    };
    
    // Function to fix common Twitter URL issues
    const fixTwitterUrl = (url) => {
        if (!url) return null;
        
        // Check if it's a valid URL first
        if (!isValidUrl(url)) {
            // If it's just a username handle
            if (url.startsWith('@')) {
                return `https://twitter.com/${url.substring(1)}`;
            }
            // If it's just a username without @
            return `https://twitter.com/${url}`;
        }
        
        // Fix common mistakes in Twitter URLs
        if (url.includes('twitter.com') && !url.includes('https://')) {
            return 'https://' + url.replace(/^(www\.|http:\/\/)/, '');
        }
        
        return url;
    };
    
    if (socialMedia.linkedin && isValidUrl(socialMedia.linkedin)) {
        socialMediaHTML += `<a href="${socialMedia.linkedin}" target="_blank" class="social-badge linkedin"><i class="fab fa-linkedin-in"></i> LinkedIn</a>`;
    } else if (companyData.name) {
        // Fallback to search if company name is available
        const linkedinSearchUrl = `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyData.name)}`;
        socialMediaHTML += `<a href="${linkedinSearchUrl}" target="_blank" class="social-badge linkedin"><i class="fab fa-linkedin-in"></i> Find on LinkedIn</a>`;
    }
    
    const twitterUrl = fixTwitterUrl(socialMedia.twitter);
    if (twitterUrl) {
        socialMediaHTML += `<a href="${twitterUrl}" target="_blank" class="social-badge twitter"><i class="fab fa-twitter"></i> Twitter/X</a>`;
    } else if (companyData.name) {
        // Fallback to search if company name is available
        const twitterSearchUrl = `https://twitter.com/search?q=${encodeURIComponent(companyData.name)}`;
        socialMediaHTML += `<a href="${twitterSearchUrl}" target="_blank" class="social-badge twitter"><i class="fab fa-twitter"></i> Find on Twitter/X</a>`;
    }
    
    if (socialMedia.instagram && isValidUrl(socialMedia.instagram)) {
        socialMediaHTML += `<a href="${socialMedia.instagram}" target="_blank" class="social-badge instagram"><i class="fab fa-instagram"></i> Instagram</a>`;
    }
    
    if (socialMedia.facebook && isValidUrl(socialMedia.facebook)) {
        socialMediaHTML += `<a href="${socialMedia.facebook}" target="_blank" class="social-badge facebook"><i class="fab fa-facebook-f"></i> Facebook</a>`;
    }
    
    if (!socialMediaHTML) {
        socialMediaHTML = '<p class="text-muted">No social media profiles found</p>';
    }
    
    // Create company preview HTML
    resultsContainer.innerHTML = `
        <div class="results-container">
            <h4 class="mb-4">Scraping Results</h4>
            
            <div class="company-preview">
                <div class="company-preview-header">
                    <h3>${companyData.name || 'Unknown Company'}</h3>
                </div>
                <div class="company-preview-body">
                    <div class="row">
                        <div class="col-md-6">
                            <p><strong>Industry:</strong> ${companyData.industry || 'Unknown'}</p>
                            <p><strong>Size:</strong> ${companyData.size || 'Unknown'}</p>
                            <p><strong>Country:</strong> ${companyData.country || 'Unknown'}</p>
                            <p><strong>Website:</strong> <a href="${companyData.website || '#'}" target="_blank">${companyData.website || 'Not available'}</a></p>
                        </div>
                        <div class="col-md-6">
                            <p><strong>Owner/CEO:</strong> ${companyData.owner_name || (companyData.name ? companyData.name + ' Management' : 'Not found')}</p>
                            <p><strong>Contact Email:</strong> ${companyData.owner_email || (companyData.domain ? 'contact@' + companyData.domain : 'Not found')}</p>
                            <p><strong>Contact Phone:</strong> ${companyData.owner_phone || 'Not found'}</p>
                            <p><strong>LinkedIn Profile:</strong> ${
                                companyData.owner_linkedin ? `<a href="${companyData.owner_linkedin}" target="_blank">View Profile</a>` : 
                                (companyData.name ? `<a href="https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(companyData.name)}" target="_blank">Search on LinkedIn</a>` : 'Not found')
                            }</p>
                        </div>
                    </div>
                    
                    <div class="company-detail-text">
                        <h5>Company Description</h5>
                        <p class="company-description">${companyData.description || 'No description available'}</p>
                        ${companyData.summary && companyData.summary !== "Summary generation failed." ?   `<div class="ai-summary"><strong>AI Summary:</strong> ${companyData.summary}</div>` : ''}
                    </div>
                    
                    <h5>Social Media Profiles</h5>
                    <div class="mb-4">
                        ${socialMediaHTML}
                    </div>
                    
                    <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                        <button type="button" class="btn btn-outline-primary me-md-2" onclick="generateSalesEmail()">
                            <i class="fas fa-envelope me-2"></i> Generate Sales Email
                        </button>
                        <button type="button" class="btn btn-primary" onclick="showAddLeadModal()">
                            <i class="fas fa-user-plus me-2"></i> Add as Lead
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show scraping error in the results container
 * @param {string} message - Error message to display
 */
function showScrapingError(message) {
    const resultsContainer = document.getElementById('scrape-results');
    resultsContainer.classList.remove('d-none');
    
    resultsContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <h4 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i> Scraping Failed</h4>
            <p>${message}</p>
            <hr>
            <p class="mb-0">Please try again with a different website URL or company name.</p>
        </div>
    `;
}

/**
 * Show the add lead modal with the scraped data
 */
function showAddLeadModal() {
    if (!scrapedCompanyData) {
        showAlert('No company data available', 'warning');
        return;
    }
    
    // Pre-populate modal fields
    document.getElementById('lead-name').value = scrapedCompanyData.owner_name || '';
    document.getElementById('lead-email').value = scrapedCompanyData.owner_email || '';
    document.getElementById('lead-company-data').value = JSON.stringify(scrapedCompanyData);
    
    // Show the modal
    const addLeadModal = new bootstrap.Modal(document.getElementById('add-lead-modal'));
    addLeadModal.show();
}

/**
 * Generate a sales email based on company data
 */
function generateSalesEmail() {
    if (!scrapedCompanyData) {
        showAlert('No company data available', 'warning');
        return;
    }
    
    // Generate a sales email template
    const companyName = scrapedCompanyData.name || 'your company';
    const recipientName = scrapedCompanyData.owner_name || 'there';
    const industry = scrapedCompanyData.industry || 'your industry';
    
    // Create modal with email template
    const modalHTML = `
        <div class="modal fade" id="email-template-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Sales Email Template</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <label class="form-label">Subject Line</label>
                            <input type="text" class="form-control" value="Helping ${companyName} improve results in ${industry}" readonly>
                        </div>
                        <div class="mb-3">
                            <label class="form-label">Email Body</label>
                            <textarea class="form-control" rows="10" readonly>Hi ${recipientName},

I noticed ${companyName} has been doing great work in the ${industry} space, and I thought you might be interested in how we've been helping similar companies improve their results.

Our platform has helped companies like yours achieve:
- 30% increase in qualified leads
- 25% reduction in customer acquisition costs
- 40% faster sales cycle

Would you be open to a quick 15-minute call next week to discuss how we might help ${companyName} achieve similar results?

Looking forward to hearing from you,

[Your Name]
[Your Position]
[Your Company]
[Your Contact Info]</textarea>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" onclick="copyEmailTemplate()">
                            <i class="fas fa-copy me-2"></i> Copy to Clipboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to the document
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
    
    // Show the modal
    const emailModal = new bootstrap.Modal(document.getElementById('email-template-modal'));
    emailModal.show();
    
    // Remove the modal from DOM when hidden
    document.getElementById('email-template-modal').addEventListener('hidden.bs.modal', function() {
        document.body.removeChild(modalContainer);
    });
}

/**
 * Copy email template to clipboard
 */
function copyEmailTemplate() {
    const emailSubject = document.querySelector('#email-template-modal input').value;
    const emailBody = document.querySelector('#email-template-modal textarea').value;
    
    // Copy to clipboard
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`)
        .then(() => {
            showAlert('Email template copied to clipboard!', 'success');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            showAlert('Failed to copy to clipboard', 'danger');
        });
}

/**
 * Show an alert message
 * @param {string} message - Message to display
 * @param {string} type - Alert type (success, danger, warning, info)
 */
function showAlert(message, type = 'info') {
    // Create alert element
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-4`;
    alertElement.style.zIndex = '9999';
    alertElement.style.minWidth = '300px';
    alertElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to document
    document.body.appendChild(alertElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alertElement.parentNode) {
            alertElement.classList.remove('show');
            setTimeout(() => {
                if (alertElement.parentNode) {
                    document.body.removeChild(alertElement);
                }
            }, 150);
        }
    }, 5000);
}
