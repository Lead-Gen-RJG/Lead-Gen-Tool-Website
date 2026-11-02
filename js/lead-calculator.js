// Lead calculator behaviour. Classic script supports direct-file previews.
(() => {
  const calculatorDialog = document.getElementById('calculatorDialog');
  const calculatorProgress = document.getElementById('calculatorProgress');
  const calculatorName = document.getElementById('calculatorName');
  const calculatorSector = document.getElementById('calculatorSector');
  const calculatorPrice = document.getElementById('calculatorPrice');
  const calculatorEmail = document.getElementById('calculatorEmail');
  const calculatorSteps = document.querySelectorAll('.calculator-step');
  const calculatorErrors = {
    1: document.getElementById('calculatorError1'),
    2: document.getElementById('calculatorError2'),
    3: document.getElementById('calculatorError3')
  };

  function showCalculatorStep(step) {
    calculatorSteps.forEach(section => section.classList.toggle('active', section.dataset.step === String(step)));
    calculatorProgress.style.width = `${step * 25}%`;
    if (calculatorErrors[step]) calculatorErrors[step].textContent = '';
  }

  function showCalculatorResult() {
    const averagePrice = Number(calculatorPrice.value);
    const professionalPlanCost = 749;
    const professionalPlanLeads = 2000;
    const leadCost = professionalPlanCost / professionalPlanLeads;
    const spend = 100;
    const leadsPurchased = spend / leadCost;
    const conversionsNeeded = spend / averagePrice;
    const completedSalesNeeded = Math.ceil(conversionsNeeded);
    const preciseConversions = conversionsNeeded.toFixed(3);
    const preciseLeads = leadsPurchased.toFixed(3);
    const conversionRate = (conversionsNeeded / leadsPurchased) * 100;
    const preciseRate = conversionRate.toFixed(3);
    const canBreakEven = conversionsNeeded <= leadsPurchased;
    const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 });
    const displayName = calculatorName.value.trim();
    const sector = calculatorSector.value;

    document.getElementById('resultGreeting').textContent = `${displayName}, here’s your ${sector.toLowerCase()} result.`;
    document.getElementById('resultNumber').textContent = preciseConversions;
    document.getElementById('resultLabel').textContent = canBreakEven
      ? `${conversionsNeeded === 1 ? 'sale' : 'sales'} needed from ${preciseLeads} leads to recover £100`
      : `sales would be needed, so a £100 lead spend would not break even`;
    document.getElementById('resultLeads').textContent = preciseLeads;
    document.getElementById('resultRate').textContent = `${preciseRate}%`;
    document.getElementById('resultSummary').innerHTML = canBreakEven
      ? `At <strong>${currency.format(averagePrice)}</strong> per sale, £100 buys approximately <strong>${preciseLeads} leads</strong>. You need <strong>${preciseConversions} sales</strong>, a <strong>${preciseRate}% conversion rate</strong>, to recover that spend. In practice, <strong>${completedSalesNeeded} completed ${completedSalesNeeded === 1 ? 'sale' : 'sales'}</strong> would cover the cost.`
      : `At <strong>${currency.format(averagePrice)}</strong> per sale, even converting all ${preciseLeads} leads would generate only <strong>${currency.format(leadsPurchased * averagePrice)}</strong>, below the £100 lead spend.`;
    showCalculatorStep(4);
  }

  window.setTimeout(() => {
    if (!calculatorDialog.open && !document.getElementById('demoVideoDialog')?.open) calculatorDialog.showModal();
  }, 2000);

  document.getElementById('calculatorClose').addEventListener('click', () => calculatorDialog.close());
  document.getElementById('calculatorDone').addEventListener('click', () => calculatorDialog.close());
  document.getElementById('calculatorNext1').addEventListener('click', () => {
    if (!calculatorName.value.trim() || !calculatorSector.value) {
      calculatorErrors[1].textContent = 'Please enter your name and choose a sector.';
      return;
    }
    showCalculatorStep(2);
  });
  document.getElementById('calculatorNext2').addEventListener('click', () => {
    if (!calculatorPrice.value || Number(calculatorPrice.value) <= 0) {
      calculatorErrors[2].textContent = 'Please enter an average sale value greater than £0.';
      return;
    }
    showCalculatorStep(3);
  });
  document.getElementById('calculatorShow').addEventListener('click', () => {
    if (!calculatorEmail.value || !calculatorEmail.checkValidity()) {
      calculatorErrors[3].textContent = 'Please enter a valid email address, or use the testing skip button.';
      return;
    }
    showCalculatorResult();
  });
  document.getElementById('calculatorSkip').addEventListener('click', showCalculatorResult);
  document.querySelectorAll('[data-back]').forEach(button => {
    button.addEventListener('click', () => showCalculatorStep(Number(button.dataset.back)));
  });
})();
