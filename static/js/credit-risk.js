// Credit Risk Assessment JavaScript

// Global variables
let creditData = {};
let riskScoreChart = null;
let defaultTrendChart = null;
let stressTestChart = null;

// Credit scoring weights and thresholds
const creditScoring = {
  creditScore: {
    excellent: { min: 750, weight: 0.3, score: 100 },
    good: { min: 700, weight: 0.3, score: 80 },
    fair: { min: 650, weight: 0.3, score: 60 },
    poor: { min: 600, weight: 0.3, score: 40 },
    veryPoor: { min: 0, weight: 0.3, score: 20 }
  },
  incomeRatio: {
    excellent: { min: 0.2, weight: 0.25, score: 100 },
    good: { min: 0.3, weight: 0.25, score: 80 },
    fair: { min: 0.4, weight: 0.25, score: 60 },
    poor: { min: 0.5, weight: 0.25, score: 40 },
    veryPoor: { min: 1, weight: 0.25, score: 20 }
  },
  employment: {
    'full-time': { weight: 0.2, score: 100 },
    'part-time': { weight: 0.2, score: 70 },
    'self-employed': { weight: 0.2, score: 80 },
    'contractor': { weight: 0.2, score: 60 },
    'unemployed': { weight: 0.2, score: 20 },
    'retired': { weight: 0.2, score: 90 }
  },
  loanTerm: {
    '12': { weight: 0.15, score: 100 },
    '24': { weight: 0.15, score: 90 },
    '36': { weight: 0.15, score: 80 },
    '48': { weight: 0.15, score: 70 },
    '60': { weight: 0.15, score: 60 }
  }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setupEventListeners();
  updateLastUpdatedTime();
});

function initializeApp() {
  // No default values - form will be blank
  // You can add any other initialization code here if needed
}

function setupEventListeners() {
  // Form submission
  document.getElementById('creditForm').addEventListener('submit', handleFormSubmit);
  
  // Clear form button
  document.getElementById('clearForm').addEventListener('click', clearForm);
  
  // Real-time calculation on input change
  const inputs = ['income', 'loanAmount', 'creditScore', 'employmentStatus', 'loanTerm'];
  inputs.forEach(inputId => {
    document.getElementById(inputId).addEventListener('input', calculateRealTimeMetrics);
  });
}

function updateLastUpdatedTime() {
  const now = new Date();
  const timeString = now.toLocaleString();
  document.getElementById('lastUpdated').textContent = timeString;
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const income = parseFloat(document.getElementById('income').value);
  const loanAmount = parseFloat(document.getElementById('loanAmount').value);
  const creditScore = parseInt(document.getElementById('creditScore').value);
  const employmentStatus = document.getElementById('employmentStatus').value;
  const loanTerm = document.getElementById('loanTerm').value;
  
  // Validate inputs
  if (!income || !loanAmount || !creditScore) {
    alert('Please fill in all required fields.');
    return;
  }
  
  if (creditScore < 300 || creditScore > 850) {
    alert('Credit score must be between 300 and 850.');
    return;
  }
  
  // Show loading overlay
  showLoadingOverlay();
  
  // Simulate API call delay
  setTimeout(() => {
    assessCreditRisk(income, loanAmount, creditScore, employmentStatus, loanTerm);
    hideLoadingOverlay();
  }, 2000);
}

function assessCreditRisk(income, loanAmount, creditScore, employment, term) {
  // Store credit data
  creditData = {
    income: income,
    loanAmount: loanAmount,
    creditScore: creditScore,
    employment: employment,
    term: parseInt(term)
  };
  
  // Calculate risk metrics
  const riskMetrics = calculateRiskMetrics(income, loanAmount, creditScore, employment, term);
  
  // Make loan decision
  const decision = makeLoanDecision(riskMetrics);
  
  // Update UI
  updateDecisionCard(decision, riskMetrics);
  updateRiskMetrics(riskMetrics);
  createRiskScoreChart(riskMetrics);
  createDefaultTrendChart();
  
  // Show and scroll to results section
  const resultsSection = document.getElementById('resultsSection');
  if (resultsSection) {
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
  }
}

function calculateRiskMetrics(income, loanAmount, creditScore, employment, term) {
  // Calculate monthly income
  const monthlyIncome = income / 12;
  
  // Estimate monthly debt payments (including the new loan)
  // For existing debts, we'll use a simple estimation based on credit score
  // In a real application, this would come from credit report data
  let existingMonthlyDebt = 0;
  if (creditScore < 600) {
    existingMonthlyDebt = monthlyIncome * 0.35; // Higher debt for lower credit scores
  } else if (creditScore < 700) {
    existingMonthlyDebt = monthlyIncome * 0.25;
  } else if (creditScore < 800) {
    existingMonthlyDebt = monthlyIncome * 0.15;
  } else {
    existingMonthlyDebt = monthlyIncome * 0.10;
  }
  
  // Calculate monthly payment for the requested loan
  const monthlyRate = 0.05 / 12; // Assuming 5% annual interest rate
  const numPayments = term;
  let monthlyLoanPayment = 0;
  if (monthlyRate > 0) {
    monthlyLoanPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                        (Math.pow(1 + monthlyRate, numPayments) - 1);
  } else {
    monthlyLoanPayment = loanAmount / numPayments; // Handle 0% interest case
  }
  
  // Calculate total monthly debt payments (existing + new loan)
  const totalMonthlyDebt = existingMonthlyDebt + monthlyLoanPayment;
  
  // Calculate debt-to-income ratio (as a percentage)
  const dti = (totalMonthlyDebt / monthlyIncome);
  
  // Calculate credit score component
  const creditScoreComponent = getCreditScoreComponent(creditScore);
  
  // Calculate income ratio component
  const incomeRatioComponent = getIncomeRatioComponent(dti);
  
  // Calculate employment component
  const employmentComponent = creditScoring.employment[employment];
  
  // Calculate loan term component
  const termComponent = creditScoring.loanTerm[term.toString()];
  
  // Calculate overall risk score (0-100, higher is better)
  const riskScore = (
    creditScoreComponent.score * creditScoreComponent.weight +
    incomeRatioComponent.score * incomeRatioComponent.weight +
    employmentComponent.score * employmentComponent.weight +
    termComponent.score * termComponent.weight
  );
  
  // Calculate probability of default (PD) - inverse relationship with risk score
  const pd = Math.max(0.1, (100 - riskScore) / 100 * 10); // 0.1% to 10%
  
  // Calculate expected loss (EL) = PD * LGD * EAD
  const lgd = 0.4; // Loss Given Default (40%)
  const ead = loanAmount; // Exposure at Default
  const el = pd / 100 * lgd * ead;
  
  // Calculate risk-weighted assets (RWA) - simplified Basel III approach
  const rwa = loanAmount * (1 + pd / 100 * 10); // Simplified calculation
  
  // Calculate interest rate based on risk
  const baseRate = 5.0; // Base rate
  const riskPremium = (100 - riskScore) / 10; // Risk premium
  const interestRate = baseRate + riskPremium;
  
  // Calculate monthly payment (already calculated above, reusing the value)
  const monthlyPayment = monthlyLoanPayment;
  
  return {
    riskScore: riskScore,
    pd: pd,
    el: el,
    rwa: rwa,
    dti: dti,
    interestRate: interestRate,
    monthlyPayment: monthlyPayment,
    components: {
      creditScore: creditScoreComponent,
      incomeRatio: incomeRatioComponent,
      employment: employmentComponent,
      term: termComponent
    }
  };
}

function getCreditScoreComponent(score) {
  const categories = creditScoring.creditScore;
  for (const [category, data] of Object.entries(categories)) {
    if (score >= data.min) {
      return { ...data, category: category };
    }
  }
  return { ...categories.veryPoor, category: 'veryPoor' };
}

function getIncomeRatioComponent(dti) {
  const categories = creditScoring.incomeRatio;
  for (const [category, data] of Object.entries(categories)) {
    if (dti <= data.min) {
      return { ...data, category: category };
    }
  }
  return { ...categories.veryPoor, category: 'veryPoor' };
}

function makeLoanDecision(riskMetrics) {
  const { riskScore, pd, dti, components } = riskMetrics;
  const reasons = [];
  
  // Check credit score
  if (components.creditScore.category === 'veryPoor' || components.creditScore.category === 'poor') {
    reasons.push('low credit score');
  }
  
  // Check debt-to-income ratio
  if (dti > 0.4) {
    reasons.push('high debt-to-income ratio');
  }
  
  // Check employment status
  if (components.employment.score < 60) {
    reasons.push('employment status');
  }
  
  // Check loan term
  if (components.term.score < 70) {
    reasons.push('longer loan term');
  }
  
  // Decision criteria
  const approved = riskScore >= 60 && pd <= 5 && dti <= 0.4;
  
  // Format rejection reasons
  let reasonMessage = '';
  if (!approved) {
    if (reasons.length > 0) {
      if (reasons.length === 1) {
        reasonMessage = `due to ${reasons[0]}`;
      } else if (reasons.length === 2) {
        reasonMessage = `due to ${reasons[0]} and ${reasons[1]}`;
      } else {
        const lastReason = reasons.pop();
        reasonMessage = `due to ${reasons.join(', ')}, and ${lastReason}`;
      }
    } else {
      reasonMessage = 'due to overall risk assessment';
    }
  }
  
  return {
    approved: approved,
    reason: approved ? 
      'Meets all credit criteria' : 
      `Does not meet minimum credit requirements ${reasonMessage}`,
    riskLevel: riskScore >= 80 ? 'Low' : riskScore >= 60 ? 'Medium' : 'High',
    rejectionReasons: reasons
  };
}

function updateDecisionCard(decision, metrics) {
  const decisionCard = document.getElementById('decisionCard');
  const decisionStatus = document.getElementById('decisionStatus');
  const decisionMessage = document.getElementById('decisionMessage');
  const confidenceLevel = document.getElementById('confidenceLevel');
  const decisionDetails = document.getElementById('decisionDetails');
  
  if (!decisionCard || !decisionStatus || !decisionMessage || !confidenceLevel) {
    console.error('Required decision card elements not found');
    return;
  }
  
  // Reset classes
  decisionCard.className = 'decision-card';
  
  if (decision.approved) {
    decisionCard.classList.add('approved');
    
    // More conversational approval messages based on risk level
    let approvalMessage = '';
    if (metrics.riskScore >= 80) {
      approvalMessage = 'Your loan application is very likely to be approved! 🎉';
    } else if (metrics.riskScore >= 60) {
      approvalMessage = 'Your loan application is likely to be approved! 👍';
    } else {
      approvalMessage = 'Your loan application has a good chance of approval. ✅';
    }
    
    decisionStatus.innerHTML = '<i class="fas fa-check-circle me-2"></i>High Approval Likelihood';
    decisionMessage.textContent = approvalMessage;
    confidenceLevel.textContent = `${Math.round(metrics.riskScore)}%`;
    confidenceLevel.style.width = `${metrics.riskScore}%`;
    confidenceLevel.classList.remove('bg-danger');
    confidenceLevel.classList.add('bg-success');
  } else {
    decisionCard.classList.add('rejected');
    
    // Generate specific rejection reasons
    const rejectionReasons = [];
    
    // Credit score related
    if (metrics.components.creditScore.category === 'veryPoor' || 
        metrics.components.creditScore.category === 'poor') {
      rejectionReasons.push(`Your credit score (${creditData.creditScore}) is considered too low for approval. Most lenders look for scores above 650.`);
    }
    
    // Debt-to-income ratio
    if (metrics.dti > 0.4) {
      const currentDTI = (metrics.dti * 100).toFixed(1);
      const monthlyIncome = creditData.income / 12;
      const newLoanRatio = monthlyIncome > 0 ? (metrics.monthlyPayment / monthlyIncome * 100).toFixed(1) : '0.0';
      rejectionReasons.push(`Your total debt-to-income ratio (${currentDTI}%) exceeds the recommended maximum of 40%`);
      rejectionReasons.push(`The new loan payment would be ${newLoanRatio}% of your monthly income`);
    }
    
    // Employment status
    if (metrics.components.employment.score < 60) {
      rejectionReasons.push(`Your employment status (${creditData.employment}) may be affecting your application. Stable, long-term employment is preferred.`);
    }
    
    // Loan term
    if (metrics.components.term.score < 70) {
      rejectionReasons.push(`The requested loan term (${creditData.term} months) may be too long for the requested amount.`);
    }
    
    // Note: General advice is now handled in the rejectionHTML template
    
    // Create structured HTML for rejection message
    let rejectionHTML = `
      <div class="rejection-header mb-3">
        <strong>Your loan application is unlikely to be approved in its current form due to the following reasons:</strong>
      </div>
      <ul class="rejection-reasons mb-3">
        ${rejectionReasons.map(reason => `<li>${reason}</li>`).join('')}
      </ul>
      <div class="improvement-tips">
        <div class="mb-2"><strong>To improve your chances of approval:</strong></div>
        <ul class="mb-0">
          <li>Paying down existing debts</li>
          <li>Increasing your income</li>
          <li>Applying for a smaller loan amount</li>
          <li>Improving your credit score</li>
          <li>Adding a co-signer with good credit</li>
        </ul>
      </div>
    `;
    
    // Update the UI
    decisionStatus.innerHTML = '<i class="fas fa-times-circle me-2"></i>Approval Unlikely';
    decisionMessage.innerHTML = rejectionHTML;
    confidenceLevel.textContent = `${Math.round(100 - metrics.riskScore)}%`;
    confidenceLevel.style.width = `${100 - metrics.riskScore}%`;
    confidenceLevel.classList.remove('bg-success');
    confidenceLevel.classList.add('bg-danger');
  }
  
  // Update risk metrics if they exist
  updateRiskMetrics(metrics);
}

function updateRiskMetrics(metrics) {
  // Only update elements that exist
  const updateIfExists = (id, value) => {
    const el = document.getElementById(id);
    if (el) {
      if (value === null || value === undefined) {
        el.textContent = '--';
      } else if (typeof value === 'number') {
        // Format numbers with appropriate decimal places
        if (id.includes('pd') || id.includes('dti') || id.includes('interestRate')) {
          el.textContent = `${value.toFixed(1)}%`;
        } else if (id.includes('el') || id.includes('rwa')) {
          el.textContent = `$${value.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
        } else if (id.includes('monthlyPayment')) {
          el.textContent = `$${value.toFixed(2)}`;
        } else {
          el.textContent = value.toFixed(2);
        }
      } else {
        el.textContent = value;
      }
    }
  };
  
  // Update all metrics
  updateIfExists('pdValue', metrics.pd);
  updateIfExists('elValue', metrics.el);
  updateIfExists('rwaValue', metrics.rwa);
  updateIfExists('dtiValue', metrics.dti * 100);
  updateIfExists('interestRateValue', metrics.interestRate);
  updateIfExists('monthlyPaymentValue', metrics.monthlyPayment);
  
  // Update risk level indicator
  const riskLevelEl = document.getElementById('riskLevel');
  if (riskLevelEl) {
    riskLevelEl.textContent = metrics.riskLevel;
    riskLevelEl.className = `badge ${getRiskLevelClass(metrics.riskLevel)}`;
  }
}

function getRiskLevelClass(level) {
  switch(level.toLowerCase()) {
    case 'low': return 'bg-success';
    case 'medium': return 'bg-warning';
    case 'high': return 'bg-danger';
    default: return 'bg-secondary';
  }
}

function createRiskScoreChart(metrics) {
  const ctx = document.getElementById('riskScoreChart').getContext('2d');
  
  if (riskScoreChart) {
    riskScoreChart.destroy();
  }
  
  const components = metrics.components;
  const labels = ['Credit Score', 'Income Ratio', 'Employment', 'Loan Term'];
  const scores = [
    components.creditScore.score,
    components.incomeRatio.score,
    components.employment.score,
    components.term.score
  ];
  const colors = [
    'rgba(99, 102, 241, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(6, 182, 212, 0.8)',
    'rgba(16, 185, 129, 0.8)'
  ];
  
  riskScoreChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: scores,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
        title: {
          display: true,
          text: 'Risk Score Components'
        }
      }
    }
  });
}

function createDefaultTrendChart() {
  const ctx = document.getElementById('defaultTrendChart').getContext('2d');
  
  if (defaultTrendChart) {
    defaultTrendChart.destroy();
  }
  
  // Generate sample trend data
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const basePd = creditData ? calculateRiskMetrics(
    creditData.income, 
    creditData.loanAmount, 
    creditData.creditScore, 
    creditData.employment, 
    creditData.term
  ).pd : 2.3;
  
  const trendData = months.map((_, index) => {
    const variation = (Math.random() - 0.5) * 0.5; // ±0.25% variation
    return Math.max(0.1, basePd + variation);
  });
  
  defaultTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Probability of Default (%)',
        data: trendData,
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: '12-Month Default Probability Trend'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          ticks: {
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          }
        }
      }
    }
  });
}

function calculateRealTimeMetrics() {
  // Only calculate if form is valid
  const income = parseFloat(document.getElementById('income').value);
  const loanAmount = parseFloat(document.getElementById('loanAmount').value);
  const creditScore = parseInt(document.getElementById('creditScore').value);
  const employment = document.getElementById('employmentStatus').value;
  const term = document.getElementById('loanTerm').value;
  
  if (income && loanAmount && creditScore && employment && term) {
    const metrics = calculateRiskMetrics(income, loanAmount, creditScore, employment, parseInt(term));
    const decision = makeLoanDecision(metrics);
    
    // Update decision preview (if results section is visible)
    if (document.getElementById('resultsSection').style.display !== 'none') {
      updateDecisionCard(decision, metrics);
      updateRiskMetrics(metrics);
    }
  }
}

function showLoadingOverlay() {
  document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoadingOverlay() {
  document.getElementById('loadingOverlay').classList.remove('show');
}

function clearForm() {
  document.getElementById('creditForm').reset();
  document.getElementById('resultsSection').style.display = 'none';
  
  // Clear charts
  if (riskScoreChart) {
    riskScoreChart.destroy();
    riskScoreChart = null;
  }
  if (defaultTrendChart) {
    defaultTrendChart.destroy();
    defaultTrendChart = null;
  }
  if (stressTestChart) {
    stressTestChart.destroy();
    stressTestChart = null;
  }
  
  // Reset credit data
  creditData = {};
}

// Stress Test Modal Functionality
document.addEventListener('DOMContentLoaded', function() {
  // Initialize stress test chart when modal is shown
  const stressTestModal = document.getElementById('stressTestModal');
  if (stressTestModal) {
    stressTestModal.addEventListener('shown.bs.modal', function() {
      createStressTestChart();
    });
  }
});

function createStressTestChart() {
  const ctx = document.getElementById('stressTestChart').getContext('2d');
  
  if (stressTestChart) {
    stressTestChart.destroy();
  }
  
  if (!creditData.income) return;
  
  // Calculate base case metrics
  const baseMetrics = calculateRiskMetrics(
    creditData.income,
    creditData.loanAmount,
    creditData.creditScore,
    creditData.employment,
    creditData.term
  );
  
  // Calculate adverse scenario metrics
  const adverseMetrics = calculateRiskMetrics(
    creditData.income * 0.8, // 20% income reduction
    creditData.loanAmount,
    Math.max(300, creditData.creditScore - 50), // 50 point credit score reduction
    creditData.employment,
    creditData.term
  );
  
  const scenarios = ['Base Case', 'Adverse Scenario'];
  const pdData = [baseMetrics.pd, adverseMetrics.pd];
  const elData = [baseMetrics.el, adverseMetrics.el];
  const rwaData = [baseMetrics.rwa, adverseMetrics.rwa];
  
  stressTestChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: scenarios,
      datasets: [
        {
          label: 'Probability of Default (%)',
          data: pdData,
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Expected Loss ($)',
          data: elData,
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: 'rgba(245, 158, 11, 1)',
          borderWidth: 1,
          yAxisID: 'y1'
        },
        {
          label: 'Risk-Weighted Assets ($)',
          data: rwaData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Stress Test Results Comparison'
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Probability of Default (%)'
          },
          ticks: {
            callback: function(value) {
              return value.toFixed(1) + '%';
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Amount ($)'
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            callback: function(value) {
              return '$' + value.toFixed(0);
            }
          }
        }
      }
    }
  });
}

// Add CSS for additional styling
const style = document.createElement('style');
style.textContent = `
  .decision-card {
    transition: all 0.3s ease;
  }
  
  .decision-card.approved {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(6, 182, 212, 0.05));
  }
  
  .decision-card.rejected {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.05), rgba(245, 158, 11, 0.05));
  }
  
  .metric-card {
    transition: all 0.3s ease;
  }
  
  .metric-card:hover {
    transform: translateY(-4px);
  }
  
  .stress-test-card {
    transition: all 0.3s ease;
  }
  
  .stress-test-card:hover {
    box-shadow: var(--shadow-lg);
  }
  
  .table tbody tr:hover {
    background-color: var(--gray-50);
  }
  
  .finding-item,
  .recommendation-item {
    transition: all 0.3s ease;
  }
  
  .finding-item:hover,
  .recommendation-item:hover {
    transform: translateX(4px);
  }
`;
document.head.appendChild(style);
