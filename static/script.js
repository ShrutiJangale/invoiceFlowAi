// Global variables
let selectedFile = null;
let selectedCategory = '';

// DOM elements
const uploadContainer = document.getElementById('uploadContainer');
const fileInput = document.getElementById('fileInput');
const categorySelect = document.getElementById('categorySelect');
const uploadBtn = document.getElementById('uploadBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultsSection = document.getElementById('resultsSection');
const resultsContainer = document.getElementById('resultsContainer');
const fileInfo = document.getElementById('fileInfo');
const fileDetails = document.getElementById('fileDetails');

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateUploadButton();
});

function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Category selection
    categorySelect.addEventListener('change', handleCategoryChange);
    
    // Upload button click
    uploadBtn.addEventListener('click', handleUpload);
    
    // Drag and drop events
    uploadContainer.addEventListener('dragover', handleDragOver);
    uploadContainer.addEventListener('dragleave', handleDragLeave);
    uploadContainer.addEventListener('drop', handleDrop);
    
    // Click to upload
    uploadContainer.addEventListener('click', () => fileInput.click());
}

// File selection handling
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        selectedFile = file;
        uploadContainer.classList.add('has-file');
        displayFileInfo(file);
        updateUploadButton();
    }
}

// Category selection handling
function handleCategoryChange(event) {
    selectedCategory = event.target.value;
    updateUploadButton();
}

// Drag and drop handling
function handleDragOver(event) {
    event.preventDefault();
    uploadContainer.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadContainer.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadContainer.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (isValidFile(file)) {
            selectedFile = file;
            fileInput.files = files;
            uploadContainer.classList.add('has-file');
            displayFileInfo(file);
            updateUploadButton();
        } else {
            showError('Please select a valid file type (PDF, PNG, JPG, JPEG)');
        }
    }
}

// File validation
function isValidFile(file) {
    const validTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg'
    ];
    return validTypes.includes(file.type);
}

// Display file information
function displayFileInfo(file) {
    fileInfo.style.display = 'block';
    fileInfo.classList.add('fade-in');
    
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    const fileType = file.type.split('/')[1].toUpperCase();
    
    fileDetails.innerHTML = `
        <div class="file-info-grid">
            <div class="info-item">
                <strong>File Name:</strong> ${file.name}
            </div>
            <div class="info-item">
                <strong>File Size:</strong> ${fileSize} MB
            </div>
            <div class="info-item">
                <strong>File Type:</strong> ${fileType}
            </div>
            <div class="info-item">
                <strong>Last Modified:</strong> ${new Date(file.lastModified).toLocaleDateString()}
            </div>
        </div>
    `;
}

// Update upload button state
function updateUploadButton() {
    const canUpload = selectedFile && selectedCategory;
    uploadBtn.disabled = !canUpload;
    
    if (canUpload) {
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Process Invoice';
        uploadBtn.classList.remove('disabled');
        uploadBtn.style.background = 'linear-gradient(135deg, #28a745 0%, #20c997 100%)';
    } else {
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Process Invoice';
        uploadBtn.classList.add('disabled');
        uploadBtn.style.background = '#ccc';
    }
}

// Reset file selection
function resetFileSelection() {
    selectedFile = null;
    fileInput.value = '';
    uploadContainer.classList.remove('has-file');
    fileInfo.style.display = 'none';
    updateUploadButton();
}

// Handle upload process
async function handleUpload() {
    if (!selectedFile || !selectedCategory) {
        showError('Please select both a file and a category');
        return;
    }
    
    try {
        // Show progress
        showProgress();
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('category', selectedCategory);
        
        // Update progress
        updateProgress(30);
        progressText.textContent = "Processing PDF and extracting text...";
        
        // Send to backend API
        const response = await fetch('/api/process', {
            method: 'POST',
            body: formData
        });
        
        // Update progress
        updateProgress(70);
        progressText.textContent = "Extracting entities with AI...";
        
        const result = await response.json();
        
        if (result.success) {
            // Update progress to completion
            updateProgress(100);
            progressText.textContent = "Processing complete!";
            
            // Show results
            showResults(result);
        } else {
            showError('Processing failed: ' + (result.error || 'Unknown error'));
        }
        
    } catch (error) {
        showError('Upload failed: ' + error.message);
    } finally {
        hideProgress();
    }
}

// Show progress section
function showProgress() {
    progressSection.style.display = 'block';
    progressSection.classList.add('fade-in');
    
    // Show initial progress
    updateProgress(10);
    progressText.textContent = "Uploading file...";
}

// Update progress bar
function updateProgress(percentage) {
    progressFill.style.width = percentage + '%';
    progressText.textContent = `Processing... ${Math.round(percentage)}%`;
}

// Hide progress section
function hideProgress() {
    progressSection.style.display = 'none';
}



// Show results
function showResults(result) {
    hideProgress();
    displayResults(result);
}

// Display results
function displayResults(results) {
    resultsSection.style.display = 'block';
    resultsSection.classList.add('fade-in');
    
    if (results.success) {
        resultsSection.className = 'results-section success fade-in';

        // Show PDF preview (if a PDF)
        const pdfPreview = document.getElementById('pdfPreview');
        if (results.pdf_url && results.original_file.toLowerCase().endsWith('.pdf')) {
            pdfPreview.src = results.pdf_url + '#toolbar=1&navpanes=0';
        } else {
            pdfPreview.src = '';
        }

        // Render key-value table
        const tbody = document.querySelector('#kvTable tbody');
        tbody.innerHTML = '';
        const kv = results.key_values || {};
        const keys = Object.keys(kv);
        if (keys.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="2">No fields extracted.</td>';
            tbody.appendChild(tr);
        } else {
            keys.forEach(k => {
                const tr = document.createElement('tr');
                const v = typeof kv[k] === 'object' ? JSON.stringify(kv[k]) : kv[k];
                tr.innerHTML = `<td>${escapeHtml(k)}</td><td>${escapeHtml(String(v ?? ''))}</td>`;
                tbody.appendChild(tr);
            });
        }
    } else {
        resultsSection.className = 'results-section error fade-in';
        const tbody = document.querySelector('#kvTable tbody');
        tbody.innerHTML = `<tr><td colspan="2">${results.error || 'An unknown error occurred during processing.'}</td></tr>`;
    }
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Show error message
function showError(message) {
    // Create a temporary error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add styles
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(220, 53, 69, 0.3);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentElement) {
            errorDiv.remove();
        }
    }, 5000);
}

// Utility function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Add some additional CSS for the file info grid
const additionalStyles = `
    .file-info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
    }
    
    .info-item {
        padding: 10px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
    }
    
    .page-info {
        background: #f8f9fa;
        padding: 15px;
        margin: 10px 0;
        border-radius: 8px;
        border: 1px solid #e9ecef;
    }
    
    .page-info h4 {
        color: #667eea;
        margin-bottom: 10px;
    }
    
    .result-summary, .pages-details, .next-steps {
        margin-bottom: 20px;
    }
    
    .result-summary h4, .pages-details h4, .next-steps h4 {
        color: #333;
        margin-bottom: 10px;
        border-bottom: 2px solid #667eea;
        padding-bottom: 5px;
    }
    
    .error-notification button {
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        margin-left: 10px;
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
