// Onboarding JavaScript - Practice Information Collection for Risk Engine
// Save onboarding progress to localStorage
    function saveOnboardingProgress(data) {
        try {
            // Save to localStorage with timestamp
            const progressData = {
                ...data,
                timestamp: new Date().toISOString(),
                section: currentSection
            };
            
            localStorage.setItem('onboardingData', JSON.stringify(progressData));
            localStorage.setItem('onboardingProgress', currentSection.toString());
            
            console.log('Onboarding progress saved:', progressData);
        } catch (error) {
            console.error('Error saving onboarding progress:', error);
        }
    }

    // Load onboarding progress from localStorage
    function loadOnboardingProgress() {
        try {
            const saved = localStorage.getItem('onboardingData');
            if (saved) {
                const data = JSON.parse(saved);
                
                // Restore section if saved
                if (data.section) {
                    currentSection = parseInt(data.section);
                }
                
                // Restore onboarding data if recent (within 24 hours)
                const savedTime = new Date(data.timestamp);
                const now = new Date();
                const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
                
                if (hoursDiff < 24) {
                    onboardingData = { ...data };
                    delete onboardingData.timestamp; // Don't restore timestamp
                    delete onboardingData.section; // Don't restore section
                }
                
                console.log('Onboarding progress loaded:', data);
                return data;
            }
        } catch (error) {
            console.error('Error loading onboarding progress:', error);
            return {};
        }
    }

    // Clear onboarding progress
    function clearOnboardingProgress() {
        try {
            localStorage.removeItem('onboardingData');
            localStorage.removeItem('onboardingProgress');
            onboardingData = {};
            currentSection = 1;
            console.log('Onboarding progress cleared');
        } catch (error) {
            console.error('Error clearing onboarding progress:', error);
        }
    }

    // Auto-save progress on section change
    function autoSaveProgress() {
        if (Object.keys(onboardingData).length > 0) {
            saveOnboardingProgress(onboardingData);
        }
    }

    // Load medical specialties from external configuration
    async function loadMedicalSpecialties() {
        try {
            const response = await fetch('/config/medical-specialties.json');
            if (response.ok) {
                const config = await response.json();
                window.medicalSpecialties = config.medicalSpecialties || {};
                window.practiceTypes = config.practiceTypes || {};
                console.log('Medical specialties configuration loaded successfully');
                return true;
            } else {
                console.warn('Failed to load medical specialties configuration, using defaults');
                return false;
            }
        } catch (error) {
            console.error('Error loading medical specialties configuration:', error);
            return false;
        }
    }

document.addEventListener('DOMContentLoaded', function() {
    // Add security headers first
    addSecurityHeaders();
    
    // Load medical specialties configuration
    loadMedicalSpecialties().then(success => {
        if (!success) {
            console.warn('Using fallback medical specialties data');
        }
    });
    
    // Load saved progress on initialization
    const savedProgress = loadOnboardingProgress();
    if (Object.keys(savedProgress).length > 0) {
        console.log('Restored saved onboarding progress');
    }
    // Global state
    let currentSection = 1;
    const totalSections = 5;
    let onboardingData = {};
    let selectedSpecialties = [];
    
    // Medical specialties data from INDUSTRY-MULTIPLIERS.md
    const medicalSpecialties = {
        // Primary Care
        'family_medicine': { name: 'Family Medicine', multiplier: 0.8, category: 'primary_care' },
        'internal_medicine': { name: 'Internal Medicine', multiplier: 0.8, category: 'primary_care' },
        'pediatrics': { name: 'Pediatrics', multiplier: 0.7, category: 'primary_care' },
        'geriatrics': { name: 'Geriatrics', multiplier: 0.9, category: 'primary_care' },
        'general_practice': { name: 'General Practice', multiplier: 0.8, category: 'primary_care' },
        
        // Medical Specialties
        'cardiology': { name: 'Cardiology', multiplier: 1.1, category: 'medical_specialties' },
        'dermatology': { name: 'Dermatology', multiplier: 0.7, category: 'medical_specialties' },
        'endocrinology': { name: 'Endocrinology', multiplier: 0.9, category: 'medical_specialties' },
        'gastroenterology': { name: 'Gastroenterology', multiplier: 1.0, category: 'medical_specialties' },
        'nephrology': { name: 'Nephrology', multiplier: 1.1, category: 'medical_specialties' },
        'pulmonology': { name: 'Pulmonology', multiplier: 1.0, category: 'medical_specialties' },
        'rheumatology': { name: 'Rheumatology', multiplier: 0.9, category: 'medical_specialties' },
        'infectious_disease': { name: 'Infectious Disease', multiplier: 1.0, category: 'medical_specialties' },
        
        // Surgical Specialties
        'general_surgery': { name: 'General Surgery', multiplier: 1.2, category: 'surgical_specialties' },
        'orthopedic_surgery': { name: 'Orthopedic Surgery', multiplier: 1.1, category: 'surgical_specialties' },
        'neurosurgery': { name: 'Neurosurgery', multiplier: 1.3, category: 'surgical_specialties' },
        'cardiothoracic_surgery': { name: 'Cardiothoracic Surgery', multiplier: 1.4, category: 'surgical_specialties' },
        'plastic_surgery': { name: 'Plastic Surgery', multiplier: 0.9, category: 'surgical_specialties' },
        'vascular_surgery': { name: 'Vascular Surgery', multiplier: 1.2, category: 'surgical_specialties' },
        'pediatric_surgery': { name: 'Pediatric Surgery', multiplier: 1.3, category: 'surgical_specialties' },
        'urology': { name: 'Urology', multiplier: 1.0, category: 'surgical_specialties' },
        'ophthalmology': { name: 'Ophthalmology', multiplier: 0.8, category: 'surgical_specialties' },
        'otolaryngology_ent': { name: 'Otolaryngology (ENT)', multiplier: 0.9, category: 'surgical_specialties' },
        
        // Women's Health
        'obstetrics_gynecology': { name: 'Obstetrics & Gynecology', multiplier: 1.0, category: 'womens_health' },
        'maternal_fetal_medicine': { name: 'Maternal-Fetal Medicine', multiplier: 1.2, category: 'womens_health' },
        'reproductive_endocrinology': { name: 'Reproductive Endocrinology', multiplier: 1.1, category: 'womens_health' },
        'gynecologic_oncology': { name: 'Gynecologic Oncology', multiplier: 1.3, category: 'womens_health' },
        
        // Mental Health
        'psychiatry': { name: 'Psychiatry', multiplier: 0.8, category: 'mental_health' },
        'psychology': { name: 'Psychology', multiplier: 0.6, category: 'mental_health' },
        'counseling': { name: 'Counseling', multiplier: 0.5, category: 'mental_health' },
        'addiction_medicine': { name: 'Addiction Medicine', multiplier: 0.9, category: 'mental_health' },
        'behavioral_health': { name: 'Behavioral Health', multiplier: 0.7, category: 'mental_health' },
        
        // Neurological Specialties
        'neurology': { name: 'Neurology', multiplier: 1.1, category: 'neurological' },
        'neuropsychology': { name: 'Neuropsychology', multiplier: 0.8, category: 'neurological' },
        'sleep_medicine': { name: 'Sleep Medicine', multiplier: 0.9, category: 'neurological' },
        
        // Diagnostic Services
        'radiology': { name: 'Radiology', multiplier: 1.0, category: 'diagnostic' },
        'diagnostic_radiology': { name: 'Diagnostic Radiology', multiplier: 1.0, category: 'diagnostic' },
        'interventional_radiology': { name: 'Interventional Radiology', multiplier: 1.2, category: 'diagnostic' },
        'nuclear_medicine': { name: 'Nuclear Medicine', multiplier: 1.1, category: 'diagnostic' },
        'pathology': { name: 'Pathology', multiplier: 0.9, category: 'diagnostic' },
        'clinical_pathology': { name: 'Clinical Pathology', multiplier: 0.9, category: 'diagnostic' },
        'anatomic_pathology': { name: 'Anatomic Pathology', multiplier: 0.9, category: 'diagnostic' },
        
        // Emergency & Critical Care
        'emergency_medicine': { name: 'Emergency Medicine', multiplier: 1.3, category: 'emergency' },
        'critical_care_medicine': { name: 'Critical Care Medicine', multiplier: 1.4, category: 'emergency' },
        'intensive_care': { name: 'Intensive Care', multiplier: 1.4, category: 'emergency' },
        'trauma_center': { name: 'Trauma Center', multiplier: 1.5, category: 'emergency' },
        
        // Anesthesiology & Pain Management
        'anesthesiology': { name: 'Anesthesiology', multiplier: 1.2, category: 'anesthesiology' },
        'pain_management': { name: 'Pain Management', multiplier: 1.0, category: 'anesthesiology' },
        'pain_medicine': { name: 'Pain Medicine', multiplier: 1.0, category: 'anesthesiology' },
        
        // Rehabilitation & Physical Medicine
        'physical_medicine_rehabilitation': { name: 'Physical Medicine & Rehabilitation', multiplier: 0.9, category: 'rehabilitation' },
        'physical_therapy': { name: 'Physical Therapy', multiplier: 0.6, category: 'rehabilitation' },
        'occupational_therapy': { name: 'Occupational Therapy', multiplier: 0.6, category: 'rehabilitation' },
        'speech_therapy': { name: 'Speech Therapy', multiplier: 0.5, category: 'rehabilitation' },
        'rehabilitation_medicine': { name: 'Rehabilitation Medicine', multiplier: 0.9, category: 'rehabilitation' },
        
        // Oncology
        'medical_oncology': { name: 'Medical Oncology', multiplier: 1.2, category: 'oncology' },
        'radiation_oncology': { name: 'Radiation Oncology', multiplier: 1.3, category: 'oncology' },
        'hematology': { name: 'Hematology', multiplier: 1.1, category: 'oncology' },
        'hematology_oncology': { name: 'Hematology-Oncology', multiplier: 1.2, category: 'oncology' },
        
        // Allergy & Immunology
        'allergy_immunology': { name: 'Allergy & Immunology', multiplier: 0.8, category: 'allergy' },
        'clinical_immunology': { name: 'Clinical Immunology', multiplier: 0.9, category: 'allergy' },
        
        // Preventive Medicine
        'preventive_medicine': { name: 'Preventive Medicine', multiplier: 0.7, category: 'preventive' },
        'public_health': { name: 'Public Health', multiplier: 0.6, category: 'preventive' },
        'occupational_medicine': { name: 'Occupational Medicine', multiplier: 0.8, category: 'preventive' },
        'aerospace_medicine': { name: 'Aerospace Medicine', multiplier: 0.7, category: 'preventive' },
        
        // Dental & Oral Health
        'general_dentistry': { name: 'General Dentistry', multiplier: 0.6, category: 'dental' },
        'oral_surgery': { name: 'Oral Surgery', multiplier: 1.0, category: 'dental' },
        'orthodontics': { name: 'Orthodontics', multiplier: 0.5, category: 'dental' },
        'periodontics': { name: 'Periodontics', multiplier: 0.7, category: 'dental' },
        'endodontics': { name: 'Endodontics', multiplier: 0.7, category: 'dental' },
        'pediatric_dentistry': { name: 'Pediatric Dentistry', multiplier: 0.6, category: 'dental' },
        'prosthodontics': { name: 'Prosthodontics', multiplier: 0.8, category: 'dental' },
        'oral_maxillofacial_surgery': { name: 'Oral & Maxillofacial Surgery', multiplier: 1.1, category: 'dental' },
        
        // Eye Care
        'optometry': { name: 'Optometry', multiplier: 0.5, category: 'eye_care' },
        'optical_services': { name: 'Optical Services', multiplier: 0.4, category: 'eye_care' },
        
        // Alternative & Complementary Medicine
        'chiropractic': { name: 'Chiropractic', multiplier: 0.6, category: 'alternative' },
        'acupuncture': { name: 'Acupuncture', multiplier: 0.5, category: 'alternative' },
        'naturopathic_medicine': { name: 'Naturopathic Medicine', multiplier: 0.6, category: 'alternative' },
        'integrative_medicine': { name: 'Integrative Medicine', multiplier: 0.7, category: 'alternative' },
        
        // Long-term Care & Facilities
        'nursing_home': { name: 'Nursing Home', multiplier: 1.1, category: 'long_term_care' },
        'skilled_nursing_facility': { name: 'Skilled Nursing Facility', multiplier: 1.2, category: 'long_term_care' },
        'assisted_living': { name: 'Assisted Living', multiplier: 0.9, category: 'long_term_care' },
        'rehabilitation_facility': { name: 'Rehabilitation Facility', multiplier: 1.0, category: 'long_term_care' },
        'hospice': { name: 'Hospice', multiplier: 1.0, category: 'long_term_care' },
        'palliative_care': { name: 'Palliative Care', multiplier: 0.9, category: 'long_term_care' },
        
        // Home Health & Mobile Services
        'home_health': { name: 'Home Health', multiplier: 0.8, category: 'home_health' },
        'mobile_health': { name: 'Mobile Health', multiplier: 0.7, category: 'home_health' },
        'telemedicine': { name: 'Telemedicine', multiplier: 0.6, category: 'home_health' },
        'virtual_care': { name: 'Virtual Care', multiplier: 0.6, category: 'home_health' },
        
        // Specialty Clinics
        'wound_care_center': { name: 'Wound Care Center', multiplier: 1.0, category: 'specialty_clinics' },
        'infusion_center': { name: 'Infusion Center', multiplier: 1.1, category: 'specialty_clinics' },
        'dialysis_center': { name: 'Dialysis Center', multiplier: 1.2, category: 'specialty_clinics' },
        'sleep_center': { name: 'Sleep Center', multiplier: 0.9, category: 'specialty_clinics' },
        'ambulatory_surgery_center': { name: 'Ambulatory Surgery Center', multiplier: 1.1, category: 'specialty_clinics' },
        
        // Research & Academic
        'medical_research': { name: 'Medical Research', multiplier: 0.8, category: 'research' },
        'clinical_trials': { name: 'Clinical Trials', multiplier: 1.0, category: 'research' },
        'academic_medical_center': { name: 'Academic Medical Center', multiplier: 1.3, category: 'research' },
        'teaching_hospital': { name: 'Teaching Hospital', multiplier: 1.4, category: 'research' },
        
        // Corporate & Occupational Health
        'occupational_health': { name: 'Occupational Health', multiplier: 0.8, category: 'corporate' },
        'corporate_health': { name: 'Corporate Health', multiplier: 0.7, category: 'corporate' },
        'employee_health': { name: 'Employee Health', multiplier: 0.7, category: 'corporate' },
        'workplace_health': { name: 'Workplace Health', multiplier: 0.8, category: 'corporate' },
        
        // Retail & Convenience Care
        'retail_clinic': { name: 'Retail Clinic', multiplier: 0.6, category: 'retail' },
        'convenience_clinic': { name: 'Convenience Clinic', multiplier: 0.6, category: 'retail' },
        'pharmacy_clinic': { name: 'Pharmacy Clinic', multiplier: 0.7, category: 'retail' },
        
        // Multi-Specialty Groups
        'multi_specialty_group': { name: 'Multi-Specialty Group', multiplier: 1.0, category: 'multi_specialty' },
        'physician_group_practice': { name: 'Physician Group Practice', multiplier: 0.9, category: 'multi_specialty' },
        'medical_group': { name: 'Medical Group', multiplier: 0.9, category: 'multi_specialty' }
    };

    // Initialize the onboarding
    initializeOnboarding();
    
    function initializeOnboarding() {
        setupSpecialtySearch();
        setupFormValidation();
        setupRiskCalculation();
        updateProgressBar();
    }

    // Navigation functions
    window.changeSection = function(direction) {
        const newSection = currentSection + direction;
        
        if (newSection >= 1 && newSection <= totalSections) {
            // Validate current section before moving forward
            if (direction > 0 && !validateSection(currentSection)) {
                return;
            }
            
            // Save current section data
            saveSectionData(currentSection);
            
            // Auto-save progress
            autoSaveProgress();
            
            // Update current section
            currentSection = newSection;
            
            // Update UI
            showSection(currentSection);
            updateProgressBar();
            updateNavigationButtons();
            
            // Generate review content if on review section
            if (currentSection === 5) {
                generateReviewContent();
            }
        }
    };

    function showSection(sectionNumber) {
        // Hide all sections
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show current section
        const currentSectionElement = document.querySelector(`[data-section="${sectionNumber}"]`);
        if (currentSectionElement) {
            currentSectionElement.classList.add('active');
        }
        
        // Update progress steps
        document.querySelectorAll('.progress-step').forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 < sectionNumber) {
                step.classList.add('completed');
            } else if (index + 1 === sectionNumber) {
                step.classList.add('active');
            }
        });
    }

    function updateProgressBar() {
        const progressLine = document.getElementById('progressLine');
        const progressPercentage = ((currentSection - 1) / (totalSections - 1)) * 100;
        progressLine.style.width = `${progressPercentage}%`;
    }

    function updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');
        
        // Show/hide previous button
        prevBtn.style.display = currentSection === 1 ? 'none' : 'block';
        
        // Show/hide next and submit buttons
        if (currentSection === totalSections) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            submitBtn.style.display = 'none';
        }
    }

    function validateSection(sectionNumber) {
        const section = document.querySelector(`[data-section="${sectionNumber}"]`);
        const requiredFields = section.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.style.borderColor = 'var(--danger-color)';
                isValid = false;
            } else {
                field.style.borderColor = '#e1e8ed';
            }
        });
        
        if (!isValid) {
            showNotification('Please fill in all required fields', 'error');
        }
        
        return isValid;
    }

    function saveSectionData(sectionNumber) {
        const section = document.querySelector(`[data-section="${sectionNumber}"]`);
        const inputs = section.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                if (input.checked) {
                    if (!onboardingData[input.name]) {
                        onboardingData[input.name] = [];
                    }
                    onboardingData[input.name].push(input.value);
                }
            } else if (input.type === 'radio') {
                if (input.checked) {
                    onboardingData[input.name] = input.value;
                }
            } else {
                onboardingData[input.name] = input.value;
            }
        });
        
        // Save specialties separately
        onboardingData.primarySpecialty = document.getElementById('primarySpecialty').value;
        onboardingData.additionalSpecialties = selectedSpecialties;
    }

    // Specialty search functionality
    function setupSpecialtySearch() {
        const primaryInput = document.getElementById('primarySpecialty');
        const additionalInput = document.getElementById('additionalSpecialties');
        const primarySuggestions = document.getElementById('primarySuggestions');
        const additionalSuggestions = document.getElementById('additionalSuggestions');
        
        // Primary specialty search
        primaryInput.addEventListener('input', function() {
            showSpecialtySuggestions(this.value, primarySuggestions, this);
        });
        
        primaryInput.addEventListener('focus', function() {
            if (this.value) {
                showSpecialtySuggestions(this.value, primarySuggestions, this);
            }
        });
        
        // Additional specialties search
        additionalInput.addEventListener('input', function() {
            showSpecialtySuggestions(this.value, additionalSuggestions, this);
        });
        
        additionalInput.addEventListener('focus', function() {
            if (this.value) {
                showSpecialtySuggestions(this.value, additionalSuggestions, this);
            }
        });
        
        // Close suggestions when clicking outside
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.specialty-search')) {
                primarySuggestions.classList.remove('show');
                additionalSuggestions.classList.remove('show');
            }
        });
    }

    function showSpecialtySuggestions(query, suggestionsContainer, inputElement) {
        if (!query) {
            suggestionsContainer.classList.remove('show');
            return;
        }
        
        const matches = Object.entries(medicalSpecialties).filter(([key, specialty]) => {
            const searchTerm = query.toLowerCase();
            return specialty.name.toLowerCase().includes(searchTerm) || 
                   key.toLowerCase().includes(searchTerm) ||
                   specialty.category.toLowerCase().includes(searchTerm);
        });
        
        if (matches.length === 0) {
            suggestionsContainer.classList.remove('show');
            return;
        }
        
        suggestionsContainer.innerHTML = '';
        matches.slice(0, 10).forEach(([key, specialty]) => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.innerHTML = `
                <strong>${specialty.name}</strong>
                <small style="display: block; color: #666;">${key} • Risk: ${specialty.multiplier}x</small>
            `;
            
            suggestionItem.addEventListener('click', function() {
                if (inputElement.id === 'primarySpecialty') {
                    inputElement.value = specialty.name;
                    onboardingData.primarySpecialtyKey = key;
                    updateRiskCalculation();
                } else {
                    addSpecialty(key, specialty.name);
                    inputElement.value = '';
                }
                suggestionsContainer.classList.remove('show');
            });
            
            suggestionsContainer.appendChild(suggestionItem);
        });
        
        suggestionsContainer.classList.add('show');
    }

    function addSpecialty(key, name) {
        if (!selectedSpecialties.find(s => s.key === key)) {
            selectedSpecialties.push({ key, name });
            updateSelectedSpecialtiesDisplay();
            updateRiskCalculation();
        }
    }

    function removeSpecialty(key) {
        selectedSpecialties = selectedSpecialties.filter(s => s.key !== key);
        updateSelectedSpecialtiesDisplay();
        updateRiskCalculation();
    }

    function updateSelectedSpecialtiesDisplay() {
        const container = document.getElementById('selectedSpecialties');
        container.innerHTML = '';
        
        selectedSpecialties.forEach(specialty => {
            const tag = document.createElement('span');
            tag.className = 'specialty-tag';
            tag.style.cssText = `
                display: inline-block;
                background: var(--primary-color);
                color: white;
                padding: 0.25rem 0.75rem;
                border-radius: 20px;
                margin: 0.25rem;
                font-size: 0.9rem;
                cursor: pointer;
            `;
            tag.innerHTML = `${specialty.name} <i class="fas fa-times" style="margin-left: 0.5rem;"></i>`;
            tag.onclick = () => removeSpecialty(specialty.key);
            container.appendChild(tag);
        });
    }

    // Risk calculation functionality
    function setupRiskCalculation() {
        // Add event listeners for real-time risk calculation
        const practiceType = document.getElementById('practiceType');
        const providerCount = document.getElementById('providerCount');
        const staffCount = document.getElementById('staffCount');
        const patientVolume = document.getElementById('patientVolume');
        const locations = document.getElementById('locations');
        
        [practiceType, providerCount, staffCount, patientVolume, locations].forEach(element => {
            if (element) {
                element.addEventListener('change', updateRiskCalculation);
                element.addEventListener('input', updateRiskCalculation);
            }
        });
    }

    function updateRiskCalculation() {
        const primarySpecialtyKey = onboardingData.primarySpecialtyKey;
        const practiceType = document.getElementById('practiceType')?.value;
        const providerCount = parseInt(document.getElementById('providerCount')?.value) || 0;
        const staffCount = parseInt(document.getElementById('staffCount')?.value) || 0;
        const patientVolume = parseInt(document.getElementById('patientVolume')?.value) || 0;
        const locations = parseInt(document.getElementById('locations')?.value) || 1;
        
        let baseRisk = 'Medium';
        let specialtyMultiplier = 1.0;
        let sizeFactor = 1.0;
        
        // Calculate specialty multiplier
        if (primarySpecialtyKey && medicalSpecialties[primarySpecialtyKey]) {
            specialtyMultiplier = medicalSpecialties[primarySpecialtyKey].multiplier;
        }
        
        // Calculate size factor
        const totalPeople = providerCount + staffCount;
        if (totalPeople > 50 || patientVolume > 5000 || locations > 3) {
            sizeFactor = 1.2;
            baseRisk = 'High';
        } else if (totalPeople > 20 || patientVolume > 2000 || locations > 1) {
            sizeFactor = 1.1;
            baseRisk = 'Medium';
        } else {
            sizeFactor = 1.0;
            baseRisk = 'Low';
        }
        
        // Adjust for practice type
        if (practiceType === 'hospital' || practiceType === 'teaching_hospital') {
            sizeFactor *= 1.3;
            baseRisk = 'High';
        } else if (practiceType === 'urgent_care' || practiceType === 'emergency_medicine') {
            sizeFactor *= 1.2;
        }
        
        // Update UI
        updateRiskDisplay(baseRisk, specialtyMultiplier, sizeFactor);
        
        // Store risk calculations
        onboardingData.riskAssessment = {
            baseRisk,
            specialtyMultiplier,
            sizeFactor,
            totalMultiplier: specialtyMultiplier * sizeFactor
        };
    }

    function updateRiskDisplay(baseRisk, specialtyMultiplier, sizeFactor) {
        const baseRiskElement = document.getElementById('baseRisk');
        const specialtyMultiplierElement = document.getElementById('specialtyMultiplier');
        const sizeFactorElement = document.getElementById('sizeFactor');
        
        if (baseRiskElement) {
            baseRiskElement.textContent = baseRisk;
            baseRiskElement.className = `risk-value risk-${baseRisk.toLowerCase()}`;
        }
        
        if (specialtyMultiplierElement) {
            specialtyMultiplierElement.textContent = `${specialtyMultiplier}x`;
            specialtyMultiplierElement.className = `risk-value ${specialtyMultiplier > 1.2 ? 'risk-high' : specialtyMultiplier > 1.0 ? 'risk-medium' : 'risk-low'}`;
        }
        
        if (sizeFactorElement) {
            sizeFactorElement.textContent = `${sizeFactor}x`;
            sizeFactorElement.className = `risk-value ${sizeFactor > 1.1 ? 'risk-high' : sizeFactor > 1.0 ? 'risk-medium' : 'risk-low'}`;
        }
    }

    // Review section functionality
    function generateReviewContent() {
        const reviewContent = document.getElementById('reviewContent');
        
        const reviewHTML = `
            <div class="review-section">
                <h3>Practice Information</h3>
                <p><strong>Practice Name:</strong> ${onboardingData.practiceName || 'Not provided'}</p>
                <p><strong>Legal Entity:</strong> ${onboardingData.legalEntity || 'Not provided'}</p>
                <p><strong>Practice Type:</strong> ${onboardingData.practiceType || 'Not provided'}</p>
                <p><strong>Primary Specialty:</strong> ${onboardingData.primarySpecialty || 'Not provided'}</p>
            </div>
            
            <div class="review-section">
                <h3>Size & Operations</h3>
                <p><strong>Providers:</strong> ${onboardingData.providerCount || 'Not provided'}</p>
                <p><strong>Staff:</strong> ${onboardingData.staffCount || 'Not provided'}</p>
                <p><strong>Monthly Patients:</strong> ${onboardingData.patientVolume || 'Not provided'}</p>
                <p><strong>Locations:</strong> ${onboardingData.locations || 'Not provided'}</p>
            </div>
            
            <div class="review-section">
                <h3>Risk Assessment</h3>
                <p><strong>Base Risk Level:</strong> ${onboardingData.riskAssessment?.baseRisk || 'Medium'}</p>
                <p><strong>Specialty Multiplier:</strong> ${onboardingData.riskAssessment?.specialtyMultiplier || '1.0'}x</p>
                <p><strong>Size Factor:</strong> ${onboardingData.riskAssessment?.sizeFactor || '1.0'}x</p>
                <p><strong>Total Risk Multiplier:</strong> ${onboardingData.riskAssessment?.totalMultiplier?.toFixed(2) || '1.00'}x</p>
            </div>
            
            <div class="review-section">
                <h3>Compliance Information</h3>
                <p><strong>EHR System:</strong> ${onboardingData.currentEHR || 'Not provided'}</p>
                <p><strong>Certifications:</strong> ${onboardingData.certifications?.join(', ') || 'None'}</p>
                <p><strong>Audit History:</strong> ${onboardingData.auditHistory?.join(', ') || 'None'}</p>
            </div>
        `;
        
        reviewContent.innerHTML = reviewHTML;
    }

    // Form submission
    function setupFormValidation() {
        const form = document.getElementById('onboardingForm');
        form.addEventListener('submit', handleFormSubmit);
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Save final section data
        saveSectionData(currentSection);
        
        // Validate required confirmations
        const accuracyConfirmed = document.getElementById('accuracyConfirmation').checked;
        const termsAccepted = document.getElementById('termsAcceptance').checked;
        
        if (!accuracyConfirmed || !termsAccepted) {
            showNotification('Please confirm accuracy and accept terms to continue', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;
        
        try {
            // Prepare data for risk engine
            const practiceProfile = {
                ...onboardingData,
                userId: 'test@trustmd.com',
                tier: 'professional', // Always professional tier
                timestamp: new Date().toISOString(),
                riskEngineConfig: generateRiskEngineConfig()
            };
            
            // Store practice profile
            localStorage.setItem('practiceProfile', JSON.stringify(practiceProfile));
            
            // Mark onboarding as completed
            localStorage.setItem('onboardingCompleted', 'true');
            
            // Simulate API call to backend
            await submitOnboardingData(practiceProfile);
            
            showNotification('Onboarding completed successfully! Redirecting to dashboard...', 'success');
            
            // Redirect to dashboard after delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } catch (error) {
            console.error('Onboarding submission error:', error);
            showNotification('Failed to complete onboarding. Please try again.', 'error');
        } finally {
            // Restore button state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    function generateRiskEngineConfig() {
        const primarySpecialtyKey = onboardingData.primarySpecialtyKey;
        const specialty = medicalSpecialties[primarySpecialtyKey];
        
        return {
            practiceType: onboardingData.practiceType,
            specialty: primarySpecialtyKey,
            category: specialty?.category,
            multiplier: specialty?.multiplier || 1.0,
            size: {
                providers: parseInt(onboardingData.providerCount) || 0,
                staff: parseInt(onboardingData.staffCount) || 0,
                patientVolume: parseInt(onboardingData.patientVolume) || 0,
                locations: parseInt(onboardingData.locations) || 1
            },
            services: onboardingData.services || [],
            compliance: {
                ehr: onboardingData.currentEHR,
                certifications: onboardingData.certifications || [],
                auditHistory: onboardingData.auditHistory || []
            },
            riskFactors: onboardingData.riskAssessment || {}
        };
    }

    // Validate onboarding data
    function validateOnboardingData(data) {
        const errors = [];
        
        // Validate practice name
        if (!data.practiceName || data.practiceName.trim().length < 2) {
            errors.push('Practice name is required and must be at least 2 characters');
        }
        
        // Validate practice type
        if (!data.practiceType) {
            errors.push('Practice type is required');
        }
        
        // Validate primary specialty
        if (!data.primarySpecialty) {
            errors.push('Primary specialty is required');
        }
        
        // Validate provider count
        if (!data.providerCount || data.providerCount < 1) {
            errors.push('Provider count must be at least 1');
        }
        
        // Validate staff count
        if (!data.staffCount || data.staffCount < 1) {
            errors.push('Staff count must be at least 1');
        }
        
        // Validate patient volume
        if (!data.patientVolume || data.patientVolume < 1) {
            errors.push('Patient volume must be at least 1');
        }
        
        // Validate locations
        if (!data.locations || data.locations < 1) {
            errors.push('At least one location is required');
        }
        
        // Validate user ID format
        if (data.userId && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(data.userId)) {
            errors.push('Valid user ID is required');
        }
        
        return errors;
    }

    // Sanitize onboarding data to prevent XSS
    function sanitizeOnboardingData(data) {
        const sanitized = { ...data };
        
        // Sanitize string fields
        const stringFields = ['practiceName', 'practiceType', 'primarySpecialty', 'userId'];
        
        for (const field of stringFields) {
            if (sanitized[field]) {
                sanitized[field] = sanitizeString(sanitized[field]);
            }
        }
        
        // Sanitize arrays
        const arrayFields = ['services', 'certifications', 'auditHistory'];
        for (const field of arrayFields) {
            if (sanitized[field] && Array.isArray(sanitized[field])) {
                sanitized[field] = sanitized[field].map(item => sanitizeString(item));
            }
        }
        
        return sanitized;
    }

    // Basic string sanitization
    function sanitizeString(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
    }

    async function submitOnboardingData(data) {
        try {
            // Validate onboarding data before submission
            const validationErrors = validateOnboardingData(data);
            
            if (validationErrors.length > 0) {
                showNotification(`Please correct the following errors: ${validationErrors.join(', ')}`, 'error');
                return { success: false, errors: validationErrors };
            }

            // Sanitize data to prevent XSS
            const sanitizedData = sanitizeOnboardingData(data);
            
            // Simulate API call
            return new Promise((resolve) => {
                setTimeout(() => {
                    console.log('Onboarding data submitted:', sanitizedData);
                    resolve({ success: true });
                }, 1500);
            });
        } catch (error) {
            console.error('Error submitting onboarding data:', error);
            return { success: false, error: error.message };
        }
    }

    // Utility functions
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        `;
        
        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.background = '#27ae60';
                break;
            case 'error':
                notification.style.background = '#e74c3c';
                break;
            case 'info':
                notification.style.background = '#3498db';
                break;
            default:
                notification.style.background = '#95a5a6';
        }
        
        // Add to page
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    // Initialize on first load
    updateNavigationButtons();
});

// Skip onboarding for testing
window.skipOnboarding = function() {
    if (confirm('Skip onboarding for testing? This will use default practice data.')) {
        // Create default practice profile
        const defaultProfile = {
            practiceName: 'Test Practice',
            practiceType: 'private_practice',
            primarySpecialty: 'Family Medicine',
            primarySpecialtyKey: 'family_medicine',
            providerCount: 3,
            staffCount: 5,
            patientVolume: 500,
            locations: 1,
            userId: 'test@trustmd.com',
            tier: 'professional', // Always professional tier
            timestamp: new Date().toISOString(),
            riskEngineConfig: {
                practiceType: 'private_practice',
                specialty: 'family_medicine',
                category: 'primary_care',
                multiplier: 0.8,
                size: {
                    providers: 3,
                    staff: 5,
                    patientVolume: 500,
                    locations: 1
                },
                services: [],
                compliance: {
                    ehr: null,
                    certifications: [],
                    auditHistory: []
                },
                riskFactors: {
                    baseRisk: 'Low',
                    specialtyMultiplier: 0.8,
                    sizeFactor: 1.0,
                    totalMultiplier: 0.8
                }
            }
        };
        
        localStorage.setItem('practiceProfile', JSON.stringify(defaultProfile));
        localStorage.setItem('onboardingCompleted', 'true');
        
        showNotification('Using default practice data for testing', 'info');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
    }
};
