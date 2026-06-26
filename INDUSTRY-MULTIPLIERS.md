# TrustMD Industry Multipliers - Complete Coverage for US Medical Practices

## Overview

TrustMD now supports **comprehensive coverage** of all medical practice types in the United States through an expanded industry multiplier system. This enables accurate risk assessment and compliance tracking for every healthcare specialty and facility type.

## Risk Multiplier Scale

The multipliers are based on regulatory complexity, audit frequency, and compliance requirements:

- **0.4-0.6**: Lower complexity (e.g., counseling, optometry)
- **0.7-0.9**: Moderate complexity (e.g., primary care, dermatology)
- **1.0-1.2**: Higher complexity (e.g., cardiology, radiology)
- **1.3-1.5**: Highest complexity (e.g., trauma centers, teaching hospitals)

## Complete Practice Type Coverage

### Primary Care
- `family_medicine` - 0.8
- `internal_medicine` - 0.8
- `pediatrics` - 0.7
- `geriatrics` - 0.9
- `general_practice` - 0.8

### Medical Specialties
- `cardiology` - 1.1
- `dermatology` - 0.7
- `endocrinology` - 0.9
- `gastroenterology` - 1.0
- `nephrology` - 1.1
- `pulmonology` - 1.0
- `rheumatology` - 0.9
- `infectious_disease` - 1.0

### Surgical Specialties
- `general_surgery` - 1.2
- `orthopedic_surgery` - 1.1
- `neurosurgery` - 1.3
- `cardiothoracic_surgery` - 1.4
- `plastic_surgery` - 0.9
- `vascular_surgery` - 1.2
- `pediatric_surgery` - 1.3
- `urology` - 1.0
- `ophthalmology` - 0.8
- `otolaryngology_ent` - 0.9

### Women's Health
- `obstetrics_gynecology` - 1.0
- `maternal_fetal_medicine` - 1.2
- `reproductive_endocrinology` - 1.1
- `gynecologic_oncology` - 1.3

### Mental Health
- `psychiatry` - 0.8
- `psychology` - 0.6
- `counseling` - 0.5
- `addiction_medicine` - 0.9
- `behavioral_health` - 0.7

### Neurological Specialties
- `neurology` - 1.1
- `neuropsychology` - 0.8
- `sleep_medicine` - 0.9

### Diagnostic Services
- `radiology` - 1.0
- `diagnostic_radiology` - 1.0
- `interventional_radiology` - 1.2
- `nuclear_medicine` - 1.1
- `pathology` - 0.9
- `clinical_pathology` - 0.9
- `anatomic_pathology` - 0.9

### Emergency & Critical Care
- `emergency_medicine` - 1.3
- `critical_care_medicine` - 1.4
- `intensive_care` - 1.4
- `trauma_center` - 1.5

### Anesthesiology & Pain Management
- `anesthesiology` - 1.2
- `pain_management` - 1.0
- `pain_medicine` - 1.0

### Rehabilitation & Physical Medicine
- `physical_medicine_rehabilitation` - 0.9
- `physical_therapy` - 0.6
- `occupational_therapy` - 0.6
- `speech_therapy` - 0.5
- `rehabilitation_medicine` - 0.9

### Oncology
- `medical_oncology` - 1.2
- `radiation_oncology` - 1.3
- `hematology` - 1.1
- `hematology_oncology` - 1.2

### Allergy & Immunology
- `allergy_immunology` - 0.8
- `clinical_immunology` - 0.9

### Preventive Medicine
- `preventive_medicine` - 0.7
- `public_health` - 0.6
- `occupational_medicine` - 0.8
- `aerospace_medicine` - 0.7

### Dental & Oral Health
- `general_dentistry` - 0.6
- `oral_surgery` - 1.0
- `orthodontics` - 0.5
- `periodontics` - 0.7
- `endodontics` - 0.7
- `pediatric_dentistry` - 0.6
- `prosthodontics` - 0.8
- `oral_maxillofacial_surgery` - 1.1

### Eye Care
- `optometry` - 0.5
- `optical_services` - 0.4

### Alternative & Complementary Medicine
- `chiropractic` - 0.6
- `acupuncture` - 0.5
- `naturopathic_medicine` - 0.6
- `integrative_medicine` - 0.7

### Long-term Care & Facilities
- `nursing_home` - 1.1
- `skilled_nursing_facility` - 1.2
- `assisted_living` - 0.9
- `rehabilitation_facility` - 1.0
- `hospice` - 1.0
- `palliative_care` - 0.9

### Home Health & Mobile Services
- `home_health` - 0.8
- `mobile_health` - 0.7
- `telemedicine` - 0.6
- `virtual_care` - 0.6

### Specialty Clinics
- `wound_care_center` - 1.0
- `infusion_center` - 1.1
- `dialysis_center` - 1.2
- `sleep_center` - 0.9
- `ambulatory_surgery_center` - 1.1

### Research & Academic
- `medical_research` - 0.8
- `clinical_trials` - 1.0
- `academic_medical_center` - 1.3
- `teaching_hospital` - 1.4

### Corporate & Occupational Health
- `occupational_health` - 0.8
- `corporate_health` - 0.7
- `employee_health` - 0.7
- `workplace_health` - 0.8

### Retail & Convenience Care
- `retail_clinic` - 0.6
- `convenience_clinic` - 0.6
- `pharmacy_clinic` - 0.7

### Multi-Specialty Groups
- `multi_specialty_group` - 1.0
- `physician_group_practice` - 0.9
- `medical_group` - 0.9

### Other Healthcare Services
- `case_management` - 0.6
- `care_coordination` - 0.6
- `health_coaching` - 0.5
- `medical_consulting` - 0.7

### General Practice Types
- `hospital` - 1.2
- `clinic` - 1.0
- `private_practice` - 0.8
- `urgent_care` - 1.1
- `specialty_care` - 0.9

## Usage Examples

### Basic Risk Calculation
```javascript
const riskEngine = new TrustMDRiskEngine();

// Direct practice type
const assessmentData = {
    practiceType: 'cardiology',
    // ... other assessment data
};

// With fuzzy matching
const assessmentData2 = {
    practiceType: 'Cardio',  // Will map to 'cardiology'
    // ... other assessment data
};

// With validation
const validatedType = riskEngine.validatePracticeType('Family Doc');
// Returns: 'family_medicine'
```

### Getting All Practice Types
```javascript
// Get all available practice types
const allTypes = riskEngine.getAllPracticeTypes();

// Get practice types by category
const categories = riskEngine.getPracticeTypesByCategory();
const primaryCareTypes = categories['Primary Care'];
// Returns: ['family_medicine', 'internal_medicine', 'pediatrics', 'geriatrics', 'general_practice']
```

### Getting Risk Multiplier
```javascript
const multiplier = riskEngine.getRiskMultiplier('dermatology');
// Returns: 0.7

const fuzzyMultiplier = riskEngine.getRiskMultiplier('Derm');
// Returns: 0.7 (maps to dermatology)
```

## Fuzzy Matching Support

The system includes intelligent fuzzy matching for common variations:

### Medical Specialty Shortcuts
- `cardio` → `cardiology`
- `derm` → `dermatology`
- `endo` → `endocrinology`
- `gi` → `gastroenterology`
- `pulm` → `pulmonology`

### Surgical Variations
- `ortho` → `orthopedic_surgery`
- `neurosurg` → `neurosurgery`
- `ent` → `otolaryngology_ent`

### Common Abbreviations
- `gp` → `general_practice`
- `er` → `emergency_medicine`
- `icu` → `intensive_care`
- `snf` → `skilled_nursing_facility`

## Regulatory Domain Coverage

This expanded system supports all five regulatory domains:

1. **Data & Privacy (HIPAA, Digital Security)** - All practice types
2. **Workplace & People (OSHA, Labor)** - Facility-based practices
3. **Clinical Care (Documentation, Infection Control)** - Clinical practices
4. **Financial & Billing (CMS, Fraud)** - All billing practices
5. **Licensing & Governance (State/Federal Rules)** - All licensed practices

## Implementation Benefits

- **Universal Coverage**: Every US medical practice type is supported
- **Accurate Risk Assessment**: Specialty-specific risk multipliers
- **Intelligent Matching**: Fuzzy matching handles variations
- **Scalable Architecture**: Easy to add new practice types
- **Compliance Ready**: Supports all regulatory domains

## Future Enhancements

- State-specific regulatory overlays
- Sub-specialty granularity
- Dynamic multiplier adjustments
- Integration with licensing databases
- Real-time regulatory updates
