// TrustMD State Compliance Testing Framework
// Comprehensive testing for all state compliance modules

class StateComplianceTestFramework {
    constructor() {
        this.testResults = [];
        this.testSuites = [
            'basic_functionality',
            'compliance_validation', 
            'state_specific_logic',
            'error_handling',
            'performance'
        ];
    }

    // Run all tests for a state compliance manager
    async runAllTests(stateManager, stateCode) {
        console.log(`Running tests for ${stateCode} compliance manager...`);
        
        const results = {
            stateCode,
            timestamp: new Date().toISOString(),
            suites: {},
            overall: {
                passed: 0,
                failed: 0,
                total: 0,
                score: 0
            }
        };

        // Run all test suites
        for (const suite of this.testSuites) {
            results.suites[suite] = await this.runTestSuite(suite, stateManager);
        }

        // Calculate overall results
        for (const suite of Object.values(results.suites)) {
            results.overall.passed += suite.passed;
            results.overall.failed += suite.failed;
            results.overall.total += suite.total;
        }

        results.overall.score = Math.round((results.overall.passed / results.overall.total) * 100);

        this.testResults.push(results);
        return results;
    }

    // Run specific test suite
    async runTestSuite(suiteName, stateManager) {
        const suite = {
            name: suiteName,
            passed: 0,
            failed: 0,
            total: 0,
            tests: []
        };

        switch (suiteName) {
            case 'basic_functionality':
                await this.runBasicFunctionalityTests(suite, stateManager);
                break;
            case 'compliance_validation':
                await this.runComplianceValidationTests(suite, stateManager);
                break;
            case 'state_specific_logic':
                await this.runStateSpecificTests(suite, stateManager);
                break;
            case 'error_handling':
                await this.runErrorHandlingTests(suite, stateManager);
                break;
            case 'performance':
                await this.runPerformanceTests(suite, stateManager);
                break;
        }

        return suite;
    }

    // Basic functionality tests
    async runBasicFunctionalityTests(suite, stateManager) {
        const tests = [
            {
                name: 'constructor_initialization',
                test: () => {
                    return stateManager.stateCode && 
                           stateManager.stateName && 
                           stateManager.regulatoryBurden !== undefined;
                }
            },
            {
                name: 'base_class_inheritance',
                test: () => {
                    return typeof stateManager.validateComplianceData === 'function' &&
                           typeof stateManager.getRequirements === 'function';
                }
            },
            {
                name: 'state_info_retrieval',
                test: () => {
                    const info = stateManager.getStateInfo();
                    return info && info.code && info.name && info.regulatoryBurden !== undefined;
                }
            },
            {
                name: 'compliance_score_calculation',
                test: () => {
                    const score = stateManager.calculateComplianceScore({
                        licenseNumber: 'TEST123',
                        licenseExpired: false,
                        cmeComplete: true,
                        privacyTraining: true,
                        insuranceCurrent: true,
                        backgroundCheckCurrent: true
                    });
                    return typeof score === 'number' && score >= 0 && score <= 100;
                }
            }
        ];

        await this.executeTests(suite, tests);
    }

    // Compliance validation tests
    async runComplianceValidationTests(suite, stateManager) {
        const tests = [
            {
                name: 'valid_compliance_data',
                test: () => {
                    const validData = {
                        licenseNumber: 'TEST123',
                        expirationDate: '2025-12-31',
                        cmeHours: 50
                    };
                    const result = stateManager.validateComplianceData(validData);
                    return result && typeof result.isValid === 'boolean';
                }
            },
            {
                name: 'invalid_compliance_data',
                test: () => {
                    const invalidData = {
                        licenseNumber: '',
                        expirationDate: 'invalid-date',
                        cmeHours: -10
                    };
                    const result = stateManager.validateComplianceData(invalidData);
                    return result && result.isValid === false && result.errors.length > 0;
                }
            },
            {
                name: 'missing_required_fields',
                test: () => {
                    const incompleteData = {
                        licenseNumber: 'TEST123'
                        // Missing expirationDate and cmeHours
                    };
                    const result = stateManager.validateComplianceData(incompleteData);
                    return result && result.isValid === false;
                }
            }
        ];

        await this.executeTests(suite, tests);
    }

    // State-specific tests
    async runStateSpecificTests(suite, stateManager) {
        const stateCode = stateManager.stateCode;
        const tests = [
            {
                name: 'state_specific_validation_method',
                test: () => {
                    const methodName = `validate${stateManager.stateName.replace(/\s+/g, '')}Compliance`;
                    return typeof stateManager[methodName] === 'function';
                }
            },
            {
                name: 'state_specific_report_method',
                test: () => {
                    const methodName = `generate${stateManager.stateName.replace(/\s+/g, '')}Report`;
                    return typeof stateManager[methodName] === 'function';
                }
            },
            {
                name: 'regulatory_burden_appropriate',
                test: () => {
                    const burden = stateManager.regulatoryBurden;
                    return typeof burden === 'number' && burden >= 0 && burden <= 1.4;
                }
            }
        ];

        await this.executeTests(suite, tests);
    }

    // Error handling tests
    async runErrorHandlingTests(suite, stateManager) {
        const tests = [
            {
                name: 'null_data_handling',
                test: () => {
                    try {
                        stateManager.validateComplianceData(null);
                        return false; // Should throw error
                    } catch (error) {
                        return true;
                    }
                }
            },
            {
                name: 'undefined_data_handling',
                test: () => {
                    try {
                        stateManager.validateComplianceData(undefined);
                        return false; // Should throw error
                    } catch (error) {
                        return true;
                    }
                }
            },
            {
                name: 'malformed_data_handling',
                test: () => {
                    const malformedData = {
                        licenseNumber: { invalid: 'object' },
                        expirationDate: [1, 2, 3],
                        cmeHours: 'not-a-number'
                    };
                    const result = stateManager.validateComplianceData(malformedData);
                    return result && result.isValid === false;
                }
            }
        ];

        await this.executeTests(suite, tests);
    }

    // Performance tests
    async runPerformanceTests(suite, stateManager) {
        const tests = [
            {
                name: 'validation_performance',
                test: async () => {
                    const startTime = Date.now();
                    for (let i = 0; i < 100; i++) {
                        stateManager.validateComplianceData({
                            licenseNumber: `TEST${i}`,
                            expirationDate: '2025-12-31',
                            cmeHours: 50
                        });
                    }
                    const endTime = Date.now();
                    return (endTime - startTime) < 1000; // Should complete in < 1 second
                }
            },
            {
                name: 'compliance_score_performance',
                test: async () => {
                    const startTime = Date.now();
                    for (let i = 0; i < 100; i++) {
                        stateManager.calculateComplianceScore({
                            licenseNumber: `TEST${i}`,
                            licenseExpired: false,
                            cmeComplete: true,
                            privacyTraining: true,
                            insuranceCurrent: true,
                            backgroundCheckCurrent: true
                        });
                    }
                    const endTime = Date.now();
                    return (endTime - startTime) < 500; // Should complete in < 500ms
                }
            }
        ];

        await this.executeTests(suite, tests);
    }

    // Execute tests in a suite
    async executeTests(suite, tests) {
        for (const test of tests) {
            suite.total++;
            
            try {
                const result = await test.test();
                if (result) {
                    suite.passed++;
                    suite.tests.push({
                        name: test.name,
                        status: 'passed',
                        duration: 0
                    });
                } else {
                    suite.failed++;
                    suite.tests.push({
                        name: test.name,
                        status: 'failed',
                        error: 'Test returned false',
                        duration: 0
                    });
                }
            } catch (error) {
                suite.failed++;
                suite.tests.push({
                    name: test.name,
                    status: 'failed',
                    error: error.message,
                    duration: 0
                });
            }
        }
    }

    // Generate test report
    generateTestReport(stateCode) {
        const stateResults = this.testResults.find(r => r.stateCode === stateCode);
        if (!stateResults) {
            return { error: `No test results found for ${stateCode}` };
        }

        return {
            stateCode,
            timestamp: stateResults.timestamp,
            overall: stateResults.overall,
            suites: stateResults.suites,
            recommendations: this.generateRecommendations(stateResults),
            summary: {
                totalTests: stateResults.overall.total,
                passedTests: stateResults.overall.passed,
                failedTests: stateResults.overall.failed,
                successRate: `${stateResults.overall.score}%`,
                status: stateResults.overall.score >= 90 ? 'excellent' : 
                        stateResults.overall.score >= 80 ? 'good' : 
                        stateResults.overall.score >= 70 ? 'acceptable' : 'needs_improvement'
            }
        };
    }

    // Generate recommendations based on test results
    generateRecommendations(results) {
        const recommendations = [];

        // Check for failed tests
        for (const [suiteName, suite] of Object.entries(results.suites)) {
            if (suite.failed > 0) {
                recommendations.push({
                    priority: 'high',
                    category: suiteName,
                    action: `Fix ${suite.failed} failing tests in ${suiteName} suite`,
                    description: `${suiteName} suite has ${suite.failed} failed tests out of ${suite.total}`
                });
            }
        }

        // Check overall score
        if (results.overall.score < 90) {
            recommendations.push({
                priority: 'medium',
                category: 'overall',
                action: 'Improve test coverage and quality',
                description: `Overall test success rate is ${results.overall.score}%, target is 90%+`
            });
        }

        return recommendations;
    }

    // Get all test results
    getAllResults() {
        return this.testResults;
    }

    // Clear all test results
    clearResults() {
        this.testResults = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StateComplianceTestFramework;
} else {
    window.StateComplianceTestFramework = StateComplianceTestFramework;
}
