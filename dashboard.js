/**
 * Dashboard Module
 * Handles lead management, filtering, and actions
 */

// Global state to store leads data
let leadsData = [];
let currentLead = null;
let competitorsData = [];

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    loadDashboardData();

    // Set up event listeners for filters
    document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);

    // Set up event listeners for lead actions
    document.getElementById('save-schedule-btn').addEventListener('click', saveFollowUpSchedule);
    document.getElementById('copy-email-btn').addEventListener('click', copyEmailToClipboard);
    document.getElementById('copy-linkedin-btn').addEventListener('click', copyLinkedInMessageToClipboard);

    // Set up event listeners for export feature
    setupExportFeature();

    // Handle tab changes in lead detail modal
    document.querySelectorAll('#leadDetailTabs button').forEach(button => {
        button.addEventListener('click', function(e) {
            const tabTarget = e.target.getAttribute('data-bs-target');
            if (tabTarget === '#company-tab-content') {
                updateCompanyTabContent(currentLead);
            } else if (tabTarget === '#social-tab-content') {
                updateSocialTabContent(currentLead);
            } else if (tabTarget === '#followup-tab-content') {
                updateFollowUpTabContent(currentLead);
            } else if (tabTarget === '#competitors-tab-content') {
                loadCompetitorsData(currentLead);
            } else if (tabTarget === '#analysis-tab-content') {
                updateAnalysisTabContent(currentLead);
            }
        });
    });
});

/**
 * Load dashboard data and update UI
 */
function loadDashboardData() {
    // Show loading state
    document.getElementById('leads-container').innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Loading leads...</p>
        </div>
    `;

    // Get filter values
    const industry = document.getElementById('industry-filter').value;
    const emailStatus = document.getElementById('email-status-filter').value;
    const companySize = document.getElementById('company-size-filter').value;

    // Build query string
    let queryParams = [];
    if (industry) queryParams.push(`industry=${encodeURIComponent(industry)}`);
    if (emailStatus) queryParams.push(`email_status=${encodeURIComponent(emailStatus)}`);
    if (companySize) queryParams.push(`company_size=${encodeURIComponent(companySize)}`);
    
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

    // Fetch leads data from API
    fetch(`/api/leads${queryString}`)
        .then(response => response.json())
        .then(data => {
            leadsData = data;
            updateDashboardUI(data);
        })
        .catch(error => {
            console.error('Error loading leads:', error);
            document.getElementById('leads-container').innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i> Error Loading Leads</h4>
                    <p>Could not load leads data. Please try refreshing the page.</p>
                    <hr>
                    <p class="mb-0">Error details: ${error.message || 'Unknown error'}</p>
                </div>
            `;
        });
}

/**
 * Update the dashboard UI with leads data
 * @param {Array} leads - Array of lead objects
 */
function updateDashboardUI(leads) {
    // Update statistics
    updateStatistics(leads);

    // Update leads list
    const leadsContainer = document.getElementById('leads-container');
    const noLeadsContainer = document.getElementById('no-leads-container');

    if (leads.length === 0) {
        leadsContainer.innerHTML = '';
        noLeadsContainer.classList.remove('d-none');
    } else {
        noLeadsContainer.classList.add('d-none');
        
        let leadsHTML = '';
        leads.forEach(lead => {
            const scoreClass = lead.score >= 70 ? 'score-high' : (lead.score >= 40 ? 'score-medium' : 'score-low');
            
            let socialMediaHTML = '';
            const socialMedia = lead.social_media || {};
            
            if (socialMedia.linkedin) {
                socialMediaHTML += `<a href="${socialMedia.linkedin}" target="_blank" class="social-badge linkedin"><i class="fab fa-linkedin-in"></i> LinkedIn</a>`;
            }
            
            if (socialMedia.twitter) {
                socialMediaHTML += `<a href="${socialMedia.twitter}" target="_blank" class="social-badge twitter"><i class="fab fa-twitter"></i> Twitter</a>`;
            }
            
            if (socialMedia.instagram) {
                socialMediaHTML += `<a href="${socialMedia.instagram}" target="_blank" class="social-badge instagram"><i class="fab fa-instagram"></i> Instagram</a>`;
            }
            
            if (socialMedia.facebook) {
                socialMediaHTML += `<a href="${socialMedia.facebook}" target="_blank" class="social-badge facebook"><i class="fab fa-facebook-f"></i> Facebook</a>`;
            }
            
            if (!socialMediaHTML) {
                socialMediaHTML = '<p class="text-muted">No social media profiles found</p>';
            }
            
            leadsHTML += `
                <div class="lead-card" data-lead-id="${lead.id}">
                    <div class="lead-card-header d-flex justify-content-between align-items-center">
                        <h4>${lead.name}</h4>
                        <div class="lead-score ${scoreClass}">${lead.score}</div>
                    </div>
                    <div class="lead-card-body">
                        <div class="row mb-3">
                            <div class="col-md-6">
                                <p><strong>Email:</strong> ${lead.email} <span class="badge bg-${getEmailStatusColor(lead.email_status)}">${lead.email_status}</span></p>
                                <p><strong>Company:</strong> ${lead.company.name}</p>
                                <p><strong>Industry:</strong> ${lead.company.industry || 'Unknown'}</p>
                                <p><strong>Size:</strong> ${lead.company.size || 'Unknown'}</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Social Media</strong></p>
                                <div class="mb-3">
                                    ${socialMediaHTML}
                                </div>
                            </div>
                        </div>
                        <div class="d-flex flex-wrap lead-actions">
                            <button class="btn btn-sm btn-primary view-details-btn" onclick="viewLeadDetails(${lead.id})">
                                <i class="fas fa-info-circle me-1"></i> View Details
                            </button>
                            <button class="btn btn-sm btn-outline-primary generate-email-btn" onclick="generateEmail(${lead.id})">
                                <i class="fas fa-envelope me-1"></i> Generate Email
                            </button>
                            <button class="btn btn-sm btn-outline-primary linkedin-connect-btn" onclick="linkedinConnect(${lead.id})">
                                <i class="fab fa-linkedin me-1"></i> LinkedIn Connect
                            </button>
                            <button class="btn btn-sm btn-outline-primary schedule-btn" onclick="scheduleFollowUp(${lead.id})">
                                <i class="fas fa-calendar me-1"></i> Schedule
                            </button>
                            <button class="btn btn-sm btn-outline-primary analyze-btn" onclick="analyzeLead(${lead.id})">
                                <i class="fas fa-chart-pie me-1"></i> Analyze
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        leadsContainer.innerHTML = leadsHTML;
    }
}

/**
 * Update statistics based on leads data
 * @param {Array} leads - Array of lead objects
 */
function updateStatistics(leads) {
    // Calculate statistics
    const totalLeads = leads.length;
    const highValueLeads = leads.filter(lead => lead.score >= 70).length;
    const avgScore = leads.length > 0 
        ? Math.round(leads.reduce((sum, lead) => sum + lead.score, 0) / leads.length) 
        : 0;
    const followUps = leads.filter(lead => lead.next_follow_up).length;
    
    // Update UI
    document.getElementById('stat-total-leads').textContent = totalLeads;
    document.getElementById('stat-high-value-leads').textContent = highValueLeads;
    document.getElementById('stat-avg-score').textContent = avgScore;
    document.getElementById('stat-followups').textContent = followUps;
}

/**
 * Apply filters to the leads data
 */
function applyFilters() {
    loadDashboardData();
}

/**
 * Get the lead object by ID
 * @param {number} leadId - Lead ID
 * @returns {Object} - Lead object
 */
function getLeadById(leadId) {
    return leadsData.find(lead => lead.id === leadId);
}

/**
 * View lead details
 * @param {number} leadId - Lead ID
 */
function viewLeadDetails(leadId) {
    const lead = getLeadById(leadId);
    if (!lead) return;
    
    currentLead = lead;
    
    // Update modal title
    document.getElementById('lead-detail-title').textContent = `${lead.name} - ${lead.company.name}`;
    
    // Update overview tab content
    updateOverviewTabContent(lead);
    
    // Show the modal
    const leadDetailModal = new bootstrap.Modal(document.getElementById('leadDetailModal'));
    leadDetailModal.show();
}

/**
 * Update overview tab content
 * @param {Object} lead - Lead object
 */
function updateOverviewTabContent(lead) {
    const scoreClass = lead.score >= 70 ? 'score-high' : (lead.score >= 40 ? 'score-medium' : 'score-low');
    const emailStatusBadge = `<span class="badge bg-${getEmailStatusColor(lead.email_status)}">${lead.email_status}</span>`;
    
    let overviewHTML = `
        <div class="row">
            <div class="col-md-6">
                <h4 class="mb-3">Contact Information</h4>
                <p><strong>Name:</strong> ${lead.name}</p>
                <p><strong>Email:</strong> ${lead.email} ${emailStatusBadge}</p>
                <p><strong>Phone:</strong> ${lead.phone || 'Not available'}</p>
                <p><strong>LinkedIn:</strong> ${lead.linkedin_profile ? `<a href="${lead.linkedin_profile}" target="_blank">View Profile</a>` : 'Not available'}</p>
                <p><strong>Position:</strong> ${lead.position || 'Not available'}</p>
            </div>
            <div class="col-md-6">
                <h4 class="mb-3">Lead Details</h4>
                <p><strong>Score:</strong> <span class="lead-score ${scoreClass}">${lead.score}</span></p>
                <p><strong>Priority:</strong> ${lead.priority || 'Medium'}</p>
                <p><strong>Last Contact:</strong> ${lead.last_contact_date ? new Date(lead.last_contact_date).toLocaleDateString() : 'Never'}</p>
                <p><strong>Next Follow-up:</strong> ${lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleDateString() : 'Not scheduled'}</p>
                <p><strong>Follow-up Type:</strong> ${lead.follow_up_type || 'Not set'}</p>
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-12">
                <h4 class="mb-3">Notes</h4>
                <div class="p-3 bg-light rounded">
                    ${lead.follow_up_notes || 'No notes available'}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('lead-overview-content').innerHTML = overviewHTML;
}

/**
 * Update company tab content
 * @param {Object} lead - Lead object
 */
function updateCompanyTabContent(lead) {
    const company = lead.company;
    
    let companyHTML = `
        <div class="row">
            <div class="col-md-6">
                <h4 class="mb-3">Company Information</h4>
                <p><strong>Name:</strong> ${company.name}</p>
                <p><strong>Industry:</strong> ${company.industry || 'Unknown'}</p>
                <p><strong>Size:</strong> ${company.size || 'Unknown'}</p>
                <p><strong>Country:</strong> ${company.country || 'Unknown'}</p>
                <p><strong>Website:</strong> ${company.website ? `<a href="${company.website}" target="_blank">${company.website}</a>` : 'Not available'}</p>
                <p><strong>Domain:</strong> ${company.domain || 'Unknown'}</p>
            </div>
            <div class="col-md-6">
                <h4 class="mb-3">Company Owner/Contact</h4>
                <p><strong>Name:</strong> ${company.owner_name || 'Not available'}</p>
                <p><strong>Email:</strong> ${company.owner_email || 'Not available'}</p>
                <p><strong>Phone:</strong> ${company.owner_phone || 'Not available'}</p>
                <p><strong>LinkedIn:</strong> ${company.owner_linkedin ? `<a href="${company.owner_linkedin}" target="_blank">View Profile</a>` : 'Not available'}</p>
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-12">
                <h4 class="mb-3">Company Description</h4>
                <div class="p-3 bg-light rounded">
                    ${company.description || 'No description available'}
                </div>
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-12">
                <h4 class="mb-3">AI Summary</h4>
                <div class="p-3 bg-light rounded">
                    ${company.summary || 'No AI summary available'}
                </div>
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-12">
                <div class="d-flex justify-content-end">
                    <button class="btn btn-primary" onclick="fetchCompetitors(${company.id})">
                        <i class="fas fa-users me-2"></i> Fetch Competitors
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('lead-company-content').innerHTML = companyHTML;
}

/**
 * Update social media tab content
 * @param {Object} lead - Lead object
 */
function updateSocialTabContent(lead) {
    const socialMedia = lead.social_media || {};
    
    let socialHTML = `
        <div class="row mb-4">
            <div class="col-12">
                <h4 class="mb-3">Social Media Profiles</h4>
                <div class="d-flex flex-wrap gap-3">
    `;
    
    if (socialMedia.linkedin) {
        socialHTML += `
            <div class="card" style="width: 18rem;">
                <div class="card-body">
                    <h5 class="card-title"><i class="fab fa-linkedin text-primary me-2"></i> LinkedIn</h5>
                    <p class="card-text">Connect with ${lead.company.name} on LinkedIn</p>
                    <a href="${socialMedia.linkedin}" target="_blank" class="btn btn-primary">
                        <i class="fas fa-external-link-alt me-2"></i> Visit Profile
                    </a>
                </div>
            </div>
        `;
    }
    
    if (socialMedia.twitter) {
        socialHTML += `
            <div class="card" style="width: 18rem;">
                <div class="card-body">
                    <h5 class="card-title"><i class="fab fa-twitter text-info me-2"></i> Twitter</h5>
                    <p class="card-text">Follow ${lead.company.name} on Twitter</p>
                    <a href="${socialMedia.twitter}" target="_blank" class="btn btn-info text-white">
                        <i class="fas fa-external-link-alt me-2"></i> Visit Profile
                    </a>
                </div>
            </div>
        `;
    }
    
    if (socialMedia.instagram) {
        socialHTML += `
            <div class="card" style="width: 18rem;">
                <div class="card-body">
                    <h5 class="card-title"><i class="fab fa-instagram text-danger me-2"></i> Instagram</h5>
                    <p class="card-text">Follow ${lead.company.name} on Instagram</p>
                    <a href="${socialMedia.instagram}" target="_blank" class="btn btn-danger">
                        <i class="fas fa-external-link-alt me-2"></i> Visit Profile
                    </a>
                </div>
            </div>
        `;
    }
    
    if (socialMedia.facebook) {
        socialHTML += `
            <div class="card" style="width: 18rem;">
                <div class="card-body">
                    <h5 class="card-title"><i class="fab fa-facebook text-primary me-2"></i> Facebook</h5>
                    <p class="card-text">Like ${lead.company.name} on Facebook</p>
                    <a href="${socialMedia.facebook}" target="_blank" class="btn btn-primary">
                        <i class="fas fa-external-link-alt me-2"></i> Visit Profile
                    </a>
                </div>
            </div>
        `;
    }
    
    if (!socialMedia.linkedin && !socialMedia.twitter && !socialMedia.instagram && !socialMedia.facebook) {
        socialHTML += `
            <div class="alert alert-info w-100" role="alert">
                <i class="fas fa-info-circle me-2"></i> No social media profiles found for ${lead.company.name}.
            </div>
        `;
    }
    
    socialHTML += `
                </div>
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-12">
                <div class="d-flex justify-content-end">
                    <button class="btn btn-primary" onclick="linkedinConnect(${lead.id})">
                        <i class="fab fa-linkedin me-2"></i> Generate LinkedIn Connect Message
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('lead-social-content').innerHTML = socialHTML;
}

/**
 * Update follow-up tab content
 * @param {Object} lead - Lead object
 */
function updateFollowUpTabContent(lead) {
    let followUpHTML = `
        <div class="row">
            <div class="col-md-6">
                <h4 class="mb-3">Follow-up Schedule</h4>
                <p><strong>Last Contact:</strong> ${lead.last_contact_date ? new Date(lead.last_contact_date).toLocaleDateString() : 'Never'}</p>
                <p><strong>Next Follow-up:</strong> ${lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleDateString() : 'Not scheduled'}</p>
                <p><strong>Follow-up Type:</strong> ${lead.follow_up_type || 'Not set'}</p>
            </div>
            <div class="col-md-6">
                <h4 class="mb-3">Follow-up Actions</h4>
                <button class="btn btn-primary mb-2 w-100" onclick="scheduleFollowUp(${lead.id})">
                    <i class="fas fa-calendar-plus me-2"></i> Schedule New Follow-up
                </button>
                <button class="btn btn-outline-primary mb-2 w-100" onclick="generateEmail(${lead.id})">
                    <i class="fas fa-envelope me-2"></i> Generate Email Template
                </button>
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-12">
                <h4 class="mb-3">Notes</h4>
                <div class="p-3 bg-light rounded">
                    ${lead.follow_up_notes || 'No notes available'}
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('lead-followup-content').innerHTML = followUpHTML;
}

/**
 * Load competitors data for a company
 * @param {Object} lead - Lead object
 */
function loadCompetitorsData(lead) {
    const companyId = lead.company.id;
    
    // Show loading state
    document.getElementById('lead-competitors-content').innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Loading competitors data...</p>
        </div>
    `;
    
    // Fetch competitors data
    fetch(`/api/competitors/${companyId}`)
        .then(response => response.json())
        .then(data => {
            competitorsData = data;
            updateCompetitorsTabContent(lead, data);
        })
        .catch(error => {
            console.error('Error loading competitors:', error);
            document.getElementById('lead-competitors-content').innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i> Error Loading Competitors</h4>
                    <p>Could not load competitors data. Please try again.</p>
                    <hr>
                    <p class="mb-0">Error details: ${error.message || 'Unknown error'}</p>
                </div>
                <div class="d-flex justify-content-end mt-4">
                    <button class="btn btn-primary" onclick="addCompetitor(${companyId})">
                        <i class="fas fa-plus me-2"></i> Add Competitor
                    </button>
                </div>
            `;
        });
}

/**
 * Update competitors tab content
 * @param {Object} lead - Lead object
 * @param {Array} competitors - Array of competitor objects
 */
function updateCompetitorsTabContent(lead, competitors) {
    let competitorsHTML = `
        <div class="row mb-4">
            <div class="col-12">
                <h4 class="mb-3">Competitors for ${lead.company.name}</h4>
    `;
    
    if (competitors.length === 0) {
        competitorsHTML += `
            <div class="alert alert-info" role="alert">
                <i class="fas fa-info-circle me-2"></i> No competitors found for ${lead.company.name}.
            </div>
        `;
    } else {
        competitorsHTML += `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>Competitor</th>
                            <th>Industry</th>
                            <th>Size</th>
                            <th>Market Position</th>
                            <th>Similarity</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        competitors.forEach(competitor => {
            const similarityClass = competitor.similarity_score >= 70 ? 'text-success' : 
                                  (competitor.similarity_score >= 40 ? 'text-warning' : 'text-danger');
            
            competitorsHTML += `
                <tr>
                    <td><strong>${competitor.competitor_name}</strong></td>
                    <td>${competitor.competitor_industry || 'Unknown'}</td>
                    <td>${competitor.competitor_size || 'Unknown'}</td>
                    <td>${competitor.market_position || 'Unknown'}</td>
                    <td><span class="${similarityClass}">${competitor.similarity_score}%</span></td>
                </tr>
            `;
        });
        
        competitorsHTML += `
                    </tbody>
                </table>
            </div>
        `;
    }
    
    competitorsHTML += `
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-12">
                <div class="d-flex justify-content-end">
                    <button class="btn btn-primary" onclick="addCompetitor(${lead.company.id})">
                        <i class="fas fa-plus me-2"></i> Add Competitor
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('lead-competitors-content').innerHTML = competitorsHTML;
}

/**
 * Update analysis tab content
 * @param {Object} lead - Lead object
 */
function updateAnalysisTabContent(lead) {
    let analysisHTML = `
        <div class="row">
            <div class="col-md-6">
                <h4 class="mb-3">Lead Score Analysis</h4>
                <div class="card mb-3">
                    <div class="card-body">
                        <h5 class="card-title">Overall Score: ${lead.score}/100</h5>
                        <div class="progress mb-3">
                            <div class="progress-bar bg-${getScoreColor(lead.score)}" role="progressbar" style="width: ${lead.score}%" 
                                aria-valuenow="${lead.score}" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <div class="mt-3">
                            <p><strong>Email Quality:</strong> ${getEmailQualityText(lead.email_status)}</p>
                            <p><strong>Company Size Value:</strong> ${getCompanySizeValue(lead.company.size)}</p>
                            <p><strong>Social Media Presence:</strong> ${getSocialMediaPresenceText(lead.social_media)}</p>
                            <p><strong>Industry Relevance:</strong> ${getIndustryRelevanceText(lead.company.industry)}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <h4 class="mb-3">AI Analysis</h4>
                <div class="card">
                    <div class="card-body">
                        <p>${lead.ai_analysis || 'No AI analysis available. Click "Analyze" to generate insights.'}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-12">
                <div class="d-flex justify-content-end">
                    <button class="btn btn-primary" onclick="analyzeLead(${lead.id})">
                        <i class="fas fa-brain me-2"></i> Analyze Lead
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('lead-analysis-content').innerHTML = analysisHTML;
}

/**
 * Schedule a follow-up for a lead
 * @param {number} leadId - Lead ID
 */
function scheduleFollowUp(leadId) {
    const lead = getLeadById(leadId);
    if (!lead) return;
    
    // Set lead ID in the form
    document.getElementById('schedule-lead-id').value = leadId;
    
    // Clear form values
    document.getElementById('follow-up-date').value = '';
    document.getElementById('follow-up-type').value = 'email';
    document.getElementById('follow-up-notes').value = lead.follow_up_notes || '';
    
    // Show the modal
    const scheduleModal = new bootstrap.Modal(document.getElementById('scheduleModal'));
    scheduleModal.show();
}

/**
 * Save follow-up schedule
 */
function saveFollowUpSchedule() {
    const leadId = document.getElementById('schedule-lead-id').value;
    const followUpDate = document.getElementById('follow-up-date').value;
    const followUpType = document.getElementById('follow-up-type').value;
    const followUpNotes = document.getElementById('follow-up-notes').value;
    
    if (!followUpDate) {
        showAlert('Please select a follow-up date', 'warning');
        return;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('save-schedule-btn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
    
    // Send request to API
    fetch(`/api/schedule-followup/${leadId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            follow_up_date: followUpDate,
            follow_up_type: followUpType,
            follow_up_notes: followUpNotes
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            const scheduleModal = bootstrap.Modal.getInstance(document.getElementById('scheduleModal'));
            scheduleModal.hide();
            
            // Show success message
            showAlert('Follow-up scheduled successfully', 'success');
            
            // Reload dashboard data
            loadDashboardData();
        } else {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
            showAlert(data.message || 'Failed to schedule follow-up', 'danger');
        }
    })
    .catch(error => {
        console.error('Error scheduling follow-up:', error);
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnText;
        showAlert('An error occurred while scheduling follow-up', 'danger');
    });
}

/**
 * Generate email for a lead
 * @param {number} leadId - Lead ID
 */
function generateEmail(leadId) {
    const lead = getLeadById(leadId);
    if (!lead) return;
    
    // Show loading state in button if it's in the list
    const emailBtn = document.querySelector(`.lead-card[data-lead-id="${leadId}"] .generate-email-btn`);
    if (emailBtn) {
        const originalBtnText = emailBtn.innerHTML;
        emailBtn.disabled = true;
        emailBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    }
    
    // Fetch email template from API
    fetch(`/api/generate-email/${leadId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Reset button state
                if (emailBtn) {
                    emailBtn.disabled = false;
                    emailBtn.innerHTML = '<i class="fas fa-envelope me-1"></i> Generate Email';
                }
                
                // Split template into subject and body
                const parts = data.email_template.split('\n\n');
                const subject = parts[0].replace('Subject: ', '');
                const body = parts.slice(1).join('\n\n');
                
                // Update modal content
                document.getElementById('email-subject').value = subject;
                document.getElementById('email-body').value = body;
                
                // Show the modal
                const emailModal = new bootstrap.Modal(document.getElementById('emailModal'));
                emailModal.show();
            } else {
                // Reset button state
                if (emailBtn) {
                    emailBtn.disabled = false;
                    emailBtn.innerHTML = '<i class="fas fa-envelope me-1"></i> Generate Email';
                }
                
                showAlert(data.message || 'Failed to generate email template', 'danger');
            }
        })
        .catch(error => {
            console.error('Error generating email:', error);
            
            // Reset button state
            if (emailBtn) {
                emailBtn.disabled = false;
                emailBtn.innerHTML = '<i class="fas fa-envelope me-1"></i> Generate Email';
            }
            
            showAlert('An error occurred while generating email template', 'danger');
        });
}

/**
 * Copy email template to clipboard
 */
function copyEmailToClipboard() {
    const subject = document.getElementById('email-subject').value;
    const body = document.getElementById('email-body').value;
    
    // Copy to clipboard
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`)
        .then(() => {
            showAlert('Email template copied to clipboard!', 'success');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            showAlert('Failed to copy to clipboard', 'danger');
        });
}

/**
 * Generate LinkedIn connection message
 * @param {number} leadId - Lead ID
 */
function linkedinConnect(leadId) {
    const lead = getLeadById(leadId);
    if (!lead) return;
    
    // Show loading state in button if it's in the list
    const linkedinBtn = document.querySelector(`.lead-card[data-lead-id="${leadId}"] .linkedin-connect-btn`);
    if (linkedinBtn) {
        const originalBtnText = linkedinBtn.innerHTML;
        linkedinBtn.disabled = true;
        linkedinBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    }
    
    // Fetch LinkedIn connection message from API
    fetch(`/api/linkedin-connect/${leadId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Reset button state
            if (linkedinBtn) {
                linkedinBtn.disabled = false;
                linkedinBtn.innerHTML = '<i class="fab fa-linkedin me-1"></i> LinkedIn Connect';
            }
            
            // Update modal content
            document.getElementById('linkedin-message').value = data.connection_message;
            document.getElementById('linkedin-profile-link').value = data.profile_link || '';
            
            // Update the open link button
            const openLinkBtn = document.getElementById('open-linkedin-link');
            if (data.profile_link) {
                openLinkBtn.href = data.profile_link;
                openLinkBtn.classList.remove('disabled');
            } else {
                openLinkBtn.href = '#';
                openLinkBtn.classList.add('disabled');
            }
            
            // Show the modal
            const linkedinModal = new bootstrap.Modal(document.getElementById('linkedinModal'));
            linkedinModal.show();
        } else {
            // Reset button state
            if (linkedinBtn) {
                linkedinBtn.disabled = false;
                linkedinBtn.innerHTML = '<i class="fab fa-linkedin me-1"></i> LinkedIn Connect';
            }
            
            showAlert(data.message || 'Failed to generate LinkedIn connection message', 'danger');
        }
    })
    .catch(error => {
        console.error('Error generating LinkedIn connection:', error);
        
        // Reset button state
        if (linkedinBtn) {
            linkedinBtn.disabled = false;
            linkedinBtn.innerHTML = '<i class="fab fa-linkedin me-1"></i> LinkedIn Connect';
        }
        
        showAlert('An error occurred while generating LinkedIn connection message', 'danger');
    });
}

/**
 * Copy LinkedIn message to clipboard
 */
function copyLinkedInMessageToClipboard() {
    const message = document.getElementById('linkedin-message').value;
    
    // Copy to clipboard
    navigator.clipboard.writeText(message)
        .then(() => {
            showAlert('LinkedIn message copied to clipboard!', 'success');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            showAlert('Failed to copy to clipboard', 'danger');
        });
}

/**
 * Analyze a lead using AI
 * @param {number} leadId - Lead ID
 */
function analyzeLead(leadId) {
    const lead = getLeadById(leadId);
    if (!lead) return;
    
    // Show loading state in button if it's in the list
    const analyzeBtn = document.querySelector(`.lead-card[data-lead-id="${leadId}"] .analyze-btn`);
    if (analyzeBtn) {
        const originalBtnText = analyzeBtn.innerHTML;
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
    }
    
    // Fetch analysis from API
    fetch(`/api/analyze-lead/${leadId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Reset button state
                if (analyzeBtn) {
                    analyzeBtn.disabled = false;
                    analyzeBtn.innerHTML = '<i class="fas fa-chart-pie me-1"></i> Analyze';
                }
                
                // Update lead data
                const leadIndex = leadsData.findIndex(l => l.id === leadId);
                if (leadIndex !== -1) {
                    leadsData[leadIndex].ai_analysis = data.analysis.reasoning;
                    leadsData[leadIndex].score = Math.max(leadsData[leadIndex].score, data.analysis.score);
                    
                    // If lead detail modal is open and showing the analysis tab, update it
                    if (currentLead && currentLead.id === leadId) {
                        currentLead.ai_analysis = data.analysis.reasoning;
                        currentLead.score = Math.max(currentLead.score, data.analysis.score);
                        
                        // Update tab content if analysis tab is active
                        if (document.getElementById('analysis-tab').classList.contains('active')) {
                            updateAnalysisTabContent(currentLead);
                        }
                    }
                }
                
                showAlert('Lead analyzed successfully!', 'success');
            } else {
                // Reset button state
                if (analyzeBtn) {
                    analyzeBtn.disabled = false;
                    analyzeBtn.innerHTML = '<i class="fas fa-chart-pie me-1"></i> Analyze';
                }
                
                showAlert(data.message || 'Failed to analyze lead', 'danger');
            }
        })
        .catch(error => {
            console.error('Error analyzing lead:', error);
            
            // Reset button state
            if (analyzeBtn) {
                analyzeBtn.disabled = false;
                analyzeBtn.innerHTML = '<i class="fas fa-chart-pie me-1"></i> Analyze';
            }
            
            showAlert('An error occurred while analyzing lead', 'danger');
        });
}

/**
 * Add a competitor for a company
 * @param {number} companyId - Company ID
 */
function addCompetitor(companyId) {
    // Prompt for competitor name
    const competitorName = prompt('Enter competitor name:');
    if (!competitorName) return;
    
    // Show loading message in competitors tab
    document.getElementById('lead-competitors-content').innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Adding competitor and gathering data...</p>
        </div>
    `;
    
    // Send request to API
    fetch('/api/competitors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            company_id: companyId,
            competitor_name: competitorName
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Competitor added successfully!', 'success');
            
            // Reload competitors data
            if (currentLead && currentLead.company.id === companyId) {
                loadCompetitorsData(currentLead);
            }
        } else {
            showAlert(data.message || 'Failed to add competitor', 'danger');
            // Reload competitors data to restore the view
            if (currentLead && currentLead.company.id === companyId) {
                loadCompetitorsData(currentLead);
            }
        }
    })
    .catch(error => {
        console.error('Error adding competitor:', error);
        showAlert('An error occurred while adding competitor', 'danger');
        
        // Reload competitors data to restore the view
        if (currentLead && currentLead.company.id === companyId) {
            loadCompetitorsData(currentLead);
        }
    });
}

/**
 * Set up export feature
 */
function setupExportFeature() {
    window.exportLeads = function(format) {
        if (leadsData.length === 0) {
            showAlert('No leads to export', 'warning');
            return;
        }
        
        // Get all lead IDs
        const leadIds = leadsData.map(lead => lead.id);
        
        // Send request to API
        fetch('/api/leads/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                format: format,
                lead_ids: leadIds
            })
        })
        .then(response => response.json())
        .then(data => {
            if (format === 'json') {
                // For JSON, create and download a JSON file
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                downloadFile(url, `leads_export_${getFormattedDate()}.json`);
            } else if (format === 'csv' || format === 'excel') {
                // For CSV/Excel, convert the data to CSV format
                const csvContent = convertToCSV(data.data);
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                downloadFile(url, `leads_export_${getFormattedDate()}.${format === 'excel' ? 'xlsx' : 'csv'}`);
            }
            
            showAlert(`Leads exported successfully as ${format.toUpperCase()}`, 'success');
        })
        .catch(error => {
            console.error('Error exporting leads:', error);
            showAlert('An error occurred while exporting leads', 'danger');
        });
    };
}

/**
 * Convert data to CSV format
 * @param {Array} data - Array of objects to convert
 * @returns {string} - CSV string
 */
function convertToCSV(data) {
    if (!data || !data.length) return '';
    
    // Get headers from the first object
    const headers = Object.keys(data[0]);
    
    // Create CSV rows
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const value = row[header];
            
            // Handle null values
            if (value === null || value === undefined) return '';
            
            // Convert to string and handle commas
            const stringValue = String(value);
            return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
        });
        
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
}

/**
 * Download a file
 * @param {string} url - File URL
 * @param {string} filename - File name
 */
function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Get formatted date for file names
 * @returns {string} - Formatted date (YYYY-MM-DD)
 */
function getFormattedDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get email status color for badges
 * @param {string} status - Email status
 * @returns {string} - Bootstrap color class
 */
function getEmailStatusColor(status) {
    switch (status) {
        case 'valid':
            return 'success';
        case 'risky':
            return 'warning';
        case 'invalid':
            return 'danger';
        default:
            return 'secondary';
    }
}

/**
 * Get score color for progress bars
 * @param {number} score - Lead score
 * @returns {string} - Bootstrap color class
 */
function getScoreColor(score) {
    if (score >= 70) return 'success';
    if (score >= 40) return 'warning';
    return 'danger';
}

/**
 * Get email quality text based on status
 * @param {string} status - Email status
 * @returns {string} - Quality description
 */
function getEmailQualityText(status) {
    switch (status) {
        case 'valid':
            return 'High quality (40/40 points)';
        case 'risky':
            return 'Medium quality (20/40 points)';
        case 'invalid':
            return 'Low quality (0/40 points)';
        default:
            return 'Unknown quality (0/40 points)';
    }
}

/**
 * Get company size value description
 * @param {string} size - Company size
 * @returns {string} - Value description
 */
function getCompanySizeValue(size) {
    switch (size) {
        case 'Enterprise':
            return 'High value (20/20 points)';
        case 'Mid-Market':
            return 'Medium value (15/20 points)';
        case 'SMB':
            return 'Standard value (10/20 points)';
        default:
            return 'Unknown value (0/20 points)';
    }
}

/**
 * Get social media presence description
 * @param {Object} socialMedia - Social media object
 * @returns {string} - Presence description
 */
function getSocialMediaPresenceText(socialMedia) {
    if (!socialMedia) return 'No presence (0/20 points)';
    
    const count = Object.values(socialMedia).filter(Boolean).length;
    
    switch (count) {
        case 4:
            return 'Very strong presence (20/20 points)';
        case 3:
            return 'Strong presence (15/20 points)';
        case 2:
            return 'Moderate presence (10/20 points)';
        case 1:
            return 'Limited presence (5/20 points)';
        default:
            return 'No presence (0/20 points)';
    }
}

/**
 * Get industry relevance description
 * @param {string} industry - Industry
 * @returns {string} - Relevance description
 */
function getIndustryRelevanceText(industry) {
    const relevantIndustries = ['Technology', 'Finance', 'Healthcare', 'Retail'];
    
    if (relevantIndustries.includes(industry)) {
        return 'High relevance (20/20 points)';
    }
    
    return 'Moderate relevance (10/20 points)';
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
