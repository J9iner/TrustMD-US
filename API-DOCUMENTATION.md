# TrustMD State Compliance API Documentation
## Modern Two-File Architecture v2.0

---

## 🏗️ **Architecture Overview**

The TrustMD State Compliance System has been refactored into a modern two-file architecture that separates **configuration data** from **business logic** for maximum maintainability and flexibility.

### **File Structure**
```
states/
├── base-state-compliance-manager.js    # Base class with common functionality
├── [state]-compliance.js              # Business logic for each state
├── [state]-regulations.json           # Configuration data for each state
└── README.md                         # This documentation
```

---

## 📋 **Configuration Files (.json)**

### **Purpose**
Externalize all regulatory requirements, penalties, and state-specific rules into maintainable JSON configuration files.

### **File Naming Convention**
`{state-code}-regulations.json`
- `california-regulations.json`
- `new-york-regulations.json`
- `wyoming-regulations.json`

### **JSON Structure**
```json
{
  "medicalBoard": {
    "licenseRenewal": "biennial",
    "cmeHours": 50,
    "painManagementHours": 12,
    "controlledSubstancesHours": 8,
    "ethicsHours": 0,
    "telemedicineRequired": false,
    "licenseVerification": true,
    "backgroundCheck": true,
    "malpracticeInsurance": true,
    "specialRequirements": [
      "State-specific requirement 1",
      "State-specific requirement 2"
    ]
  },
  "privacy": {
    "hipaaCompliance": true,
    "statePrivacyLaws": false,
    "breachNotification": "72_hours",
    "patientRights": true,
    "dataRetention": "6_years",
    "marketingRestrictions": false,
    "socialMediaPolicy": false
  },
  "reporting": {
    "incidentReporting": true,
    "adverseEventReporting": true,
    "prescriptionMonitoring": false,
    "cmeReporting": true,
    "licenseStatusReporting": true
  },
  "inspections": {
    "frequency": "biennial",
    "unannounced": false,
    "telemedicineInspection": false,
    "documentationReview": true,
    "facilityInspection": true
  },
  "penalties": {
    "licenseViolation": "500-5000",
    "privacyViolation": "1000-10000",
    "reportingViolation": "500-5000",
    "practiceViolation": "1000-25000",
    "criminalPenalties": "misdemeanor"
  },
  "specialRegulations": {
    "standardCompliance": {
      "enabled": true,
      "description": "Standard compliance requirements",
      "requirements": [
        "Basic medical board compliance",
        "Standard CME requirements",
        "HIPAA compliance"
      ]
    }
  },
  "stateCode": "CA",
  "stateName": "California",
  "regulatoryBurden": 1.4,
  "lastUpdated": "2024-02-24T00:00:00Z",
  "version": "1.0.0"
}
```

### **Configuration Fields**

#### **medicalBoard**
- `licenseRenewal`: License renewal frequency ("annual", "biennial", "triennial")
- `cmeHours`: Required CME hours per renewal period
- `painManagementHours`: Required pain management CME hours
- `controlledSubstancesHours`: Required controlled substances CME hours
- `ethicsHours`: Required ethics CME hours
- `telemedicineRequired`: Boolean indicating telemedicine requirements
- `licenseVerification`: Boolean for license verification requirements
- `backgroundCheck`: Boolean for background check requirements
- `malpracticeInsurance`: Boolean for malpractice insurance requirements
- `specialRequirements`: Array of state-specific medical board requirements

#### **privacy**
- `hipaaCompliance`: Boolean for HIPAA compliance requirements
- `statePrivacyLaws`: Boolean for additional state privacy laws
- `breachNotification`: Breach notification timeframe
- `patientRights`: Boolean for patient rights requirements
- `dataRetention`: Data retention period
- `marketingRestrictions`: Boolean for marketing restrictions
- `socialMediaPolicy`: Boolean for social media policy requirements

#### **reporting**
- `incidentReporting`: Boolean for incident reporting requirements
- `adverseEventReporting`: Boolean for adverse event reporting
- `prescriptionMonitoring`: Boolean for prescription monitoring program
- `cmeReporting`: Boolean for CME reporting requirements
- `licenseStatusReporting`: Boolean for license status reporting

#### **inspections**
- `frequency`: Inspection frequency ("annual", "biennial", "triennial")
- `unannounced`: Boolean for unannounced inspections
- `telemedicineInspection`: Boolean for telemedicine-specific inspections
- `documentationReview`: Boolean for documentation review requirements
- `facilityInspection`: Boolean for facility inspection requirements

#### **penalties**
- `licenseViolation`: Penalty range for license violations
- `privacyViolation`: Penalty range for privacy violations
- `reportingViolation`: Penalty range for reporting violations
- `practiceViolation`: Penalty range for practice violations
- `criminalPenalties`: Criminal penalty classification

#### **specialRegulations**
- `standardCompliance`: Object containing state-specific compliance requirements
- `enabled`: Boolean indicating if special regulations apply
- `description`: Description of special regulations
- `requirements`: Array of specific regulatory requirements

#### **Metadata**
- `stateCode`: Two-letter state abbreviation
- `stateName`: Full state name
- `regulatoryBurden`: Numeric multiplier (0.0-1.4) indicating complexity
- `lastUpdated`: ISO timestamp of last update
- `version`: Configuration version number

---

## 🔧 **Compliance Files (.js)**

### **Purpose**
Contain business logic, validation methods, and reporting functionality for each state's compliance requirements.

### **File Naming Convention**
`{state}-compliance.js`
- `california-compliance.js`
- `new-york-compliance.js`
- `wyoming-compliance.js`

### **Class Structure**
```javascript
/**
 * [State] State Compliance Manager
 * Handles all [state]-specific regulatory compliance requirements
 */
class [State]ComplianceManager extends BaseStateComplianceManager {
    /**
     * @param {SupabaseClient} supabaseClient - Supabase client instance
     * @param {string} tenantId - Tenant identifier
     */
    constructor(supabaseClient, tenantId) {
        super(supabaseClient, tenantId, '[STATE_CODE]', '[State Name]', [regulatoryBurden]);
    }

    // State-specific compliance validation
    async validate[State]Compliance(complianceData) {
        // Implementation
    }

    // Perform state-specific validations
    perform[State]Validations(complianceData) {
        // Implementation
    }

    // Generate state-specific compliance report
    async generate[State]Report() {
        // Implementation
    }

    // Generate state-specific recommendations
    generate[State]Recommendations(score, complianceData) {
        // Implementation
    }

    // Get compliance status
    getComplianceStatus(score) {
        // Implementation
    }
}
```

### **Constructor Parameters**
- `supabaseClient`: Supabase client instance for database operations
- `tenantId`: String identifier for tenant isolation
- `stateCode`: Two-letter state abbreviation (passed to base class)
- `stateName`: Full state name (passed to base class)
- `regulatoryBurden`: Numeric multiplier (0.0-1.4) for complexity scoring

### **Core Methods**

#### **validate[State]Compliance(complianceData)**
**Purpose**: Validate compliance data against state-specific requirements

**Parameters**:
- `complianceData` (Object): Compliance data to validate
  - `cmeHours`: Number - CME hours completed
  - `licenseCurrent`: Boolean - Current license status
  - `basicCompliance`: Boolean - Basic compliance status
  - `ruralHealthCompliance`: Boolean - Rural healthcare compliance (frontier states)
  - `frontierHealthcareCompliance`: Boolean - Frontier healthcare provisions

**Returns**:
```javascript
{
    compliant: Boolean,
    score: Number,
    issues: Array<String>,
    warnings: Array<String>,
    [state]Specific: Object
}
```

#### **perform[State]Validations(complianceData)**
**Purpose**: Perform state-specific validation logic

**Parameters**: Same as `validate[State]Compliance`

**Returns**:
```javascript
{
    isValid: Boolean,
    score: Number,
    errors: Array<String>,
    warnings: Array<String>
}
```

#### **generate[State]Report()**
**Purpose**: Generate comprehensive compliance report for the state

**Returns**:
```javascript
{
    stateCode: String,
    stateName: String,
    overallScore: Number,
    status: String, // 'excellent', 'good', 'acceptable', 'needs_improvement', 'critical'
    regulatoryBurden: Number,
    breakdown: {
        base: Object,
        [state]Specific: Object
    },
    [state]Specific: {
        standardCompliance: String,
        cmeCompliance: String,
        // Additional state-specific fields
    },
    recommendations: Array<Object>,
    lastUpdated: String
}
```

#### **generate[State]Recommendations(score, complianceData)**
**Purpose**: Generate actionable recommendations based on compliance score

**Parameters**:
- `score` (Number): Overall compliance score
- `complianceData` (Object): Compliance data and validation results

**Returns**:
```javascript
[
    {
        priority: String, // 'critical', 'high', 'medium', 'low'
        category: String, // 'compliance', 'improvement', 'frontier', etc.
        action: String,
        description: String
    }
]
```

#### **getComplianceStatus(score)**
**Purpose**: Convert numeric score to status classification

**Parameters**:
- `score` (Number): Compliance score (0-100)

**Returns**:
- `String`: Status classification
  - `95-100`: 'excellent'
  - `85-94`: 'good'
  - `70-84`: 'acceptable'
  - `60-69`: 'needs_improvement'
  - `0-59`: 'critical'

---

## 🏛️ **Base Class: BaseStateComplianceManager**

### **Purpose**
Provides common functionality shared across all state compliance managers.

### **Core Functionality**
- Regulation loading from JSON files with fallback
- Input validation schemas
- Common compliance validation methods
- Error handling and logging
- Database integration
- Tenant isolation

### **Key Methods**

#### **loadRegulations()**
```javascript
async loadRegulations() {
    try {
        const response = await fetch(`/states/${this.stateCode.toLowerCase()}-regulations.json`);
        if (!response.ok) {
            throw new Error(`Failed to load ${this.stateCode} regulations`);
        }
        this.requirements = await response.json();
    } catch (error) {
        console.error(`Failed to load ${this.stateCode} regulations:`, error);
        this.requirements = this.getDefaultRequirements();
    }
}
```

#### **validateComplianceData(complianceData)**
```javascript
validateComplianceData(complianceData) {
    // Schema-based validation
    // Type checking
    // Required field validation
    // Returns validation result object
}
```

#### **getDefaultRequirements()**
```javascript
getDefaultRequirements() {
    return {
        medicalBoard: { /* default values */ },
        privacy: { /* default values */ },
        reporting: { /* default values */ },
        inspections: { /* default values */ },
        penalties: { /* default values */ }
    };
}
```

---

## 🌐 **Browser Compatibility**

### **Export Pattern**
All compliance modules use browser-compatible exports:

```javascript
// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = [State]ComplianceManager;
} else {
    window.[State]ComplianceManager = [State]ComplianceManager;
}
```

### **Browser Support**
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ✅ Node.js 12+

---

## 📊 **Usage Examples**

### **Basic Usage**
```javascript
// Initialize compliance manager
const complianceManager = new CaliforniaComplianceManager(supabaseClient, 'tenant-123');

// Validate compliance
const result = await complianceManager.validateCaliforniaCompliance({
    cmeHours: 45,
    licenseCurrent: true,
    basicCompliance: true
});

console.log(result.compliant); // false
console.log(result.score); // 85
console.log(result.issues); // ['California requires minimum 50 CME hours triennially']
```

### **Generate Report**
```javascript
// Generate comprehensive report
const report = await complianceManager.generateCaliforniaReport();

console.log(report.overallScore); // 88
console.log(report.status); // 'good'
console.log(report.recommendations); // Array of recommendations
```

### **Multi-State Comparison**
```javascript
// Compare compliance across states
const states = ['California', 'New York', 'Texas'];
const reports = [];

for (const state of states) {
    const manager = new window[`${state}ComplianceManager`](supabaseClient, 'tenant-123');
    const report = await manager[`generate${state}Report`]();
    reports.push(report);
}

// Sort by compliance score
reports.sort((a, b) => b.overallScore - a.overallScore);
```

---

## 🔧 **Configuration Management**

### **Updating Regulations**
1. **Edit JSON File**: Modify `[state]-regulations.json`
2. **Version Bump**: Update `version` and `lastUpdated` fields
3. **Test**: Run validation with new configuration
4. **Deploy**: No code changes required

### **Adding New State**
1. **Create JSON Config**: Copy existing template and customize
2. **Create JS Module**: Copy existing template and implement state logic
3. **Update Registry**: Add to state registry if needed
4. **Test**: Validate implementation

### **Regulatory Burden Levels**
- **0.0**: Minimal burden (frontier states)
- **1.0**: Standard burden (most states)
- **1.2-1.3**: Medium-high burden
- **1.4**: High burden (California, New York, Massachusetts)

---

## 🧪 **Testing**

### **Test Framework Location**
`tests/state-compliance-test-framework.js`

### **Test Categories**
- **Basic Functionality**: Constructor, method execution
- **Compliance Validation**: Input validation, scoring
- **State-Specific Logic**: Custom validation rules
- **Error Handling**: Invalid inputs, network failures
- **Performance**: Validation speed, memory usage

### **Running Tests**
```javascript
// Run all tests
const testFramework = new StateComplianceTestFramework();
const results = await testFramework.runAllTests();

// Run specific state tests
const californiaResults = await testFramework.testState('California');
```

---

## 📈 **Analytics & Monitoring**

### **Compliance Metrics**
- **Overall Score**: Weighted compliance score (0-100)
- **Status Classification**: Excellent/Good/Acceptable/Needs Improvement/Critical
- **Issue Tracking**: Categorized compliance issues
- **Recommendation Generation**: Actionable improvement suggestions

### **State Comparison**
- **Regulatory Burden**: Complexity comparison across states
- **Compliance Rankings**: Relative performance metrics
- **Trend Analysis**: Historical compliance data
- **Benchmarking**: Industry standard comparisons

---

## 🔒 **Security Considerations**

### **Data Protection**
- **Tenant Isolation**: Multi-tenant data separation
- **Input Validation**: Schema-based validation prevents injection
- **Error Handling**: Secure error message handling
- **Logging**: Comprehensive audit trails

### **Configuration Security**
- **JSON Validation**: Prevent malicious configuration injection
- **Version Control**: Track configuration changes
- **Access Control**: Restrict configuration modifications
- **Backup/Recovery**: Configuration backup procedures

---

## 📞 **Support & Maintenance**

### **Common Issues**
1. **JSON Loading Failures**: Check file paths and network connectivity
2. **Validation Errors**: Verify input data structure and types
3. **Browser Compatibility**: Ensure modern browser usage
4. **Performance Issues**: Monitor validation complexity

### **Maintenance Tasks**
- **Regular Updates**: Update JSON configurations for regulatory changes
- **Performance Monitoring**: Track validation times and resource usage
- **Testing**: Run comprehensive test suite regularly
- **Documentation**: Keep API documentation current

---

## 📋 **API Reference Summary**

### **Configuration Files**
- **50 JSON files** with regulatory requirements
- **Standardized structure** across all states
- **Version control** for change tracking
- **Easy updates** without code changes

### **Compliance Classes**
- **50 JavaScript classes** extending BaseStateComplianceManager
- **Browser-compatible exports** for universal usage
- **Comprehensive validation** and reporting methods
- **State-specific logic** for unique requirements

### **Base Functionality**
- **Common validation** methods
- **Error handling** and logging
- **Database integration** with Supabase
- **Multi-tenant support** with isolation

---

**TrustMD State Compliance API v2.0 - Modern, Maintainable, and Comprehensive** 🚀
