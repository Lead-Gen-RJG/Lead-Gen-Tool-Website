// Campaign estimates adapted from Ryan's sliding calculator.
(() => {
  const form = document.getElementById('campaignCalculatorForm');
  if (!form) return;
  const get = id => document.getElementById(id);
  const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
  const salesFormat = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  function calculateCampaign() {
    const records = Number(get('campaignRecords').value);
    const contact = Number(get('campaignContact').value);
    const close = Number(get('campaignClose').value);
    const profitInput = get('campaignProfit');
    const profit = profitInput.valueAsNumber;
    const plan = get('campaignPlan');
    const fee = Number(plan.value);
    const allowance = Number(plan.selectedOptions[0].dataset.allowance);

    for (const [id, value, suffix] of [['campaignRecords', records, ''], ['campaignContact', contact, '%'], ['campaignClose', close, '%']]) {
      const input = get(id);
      get(id + 'Out').textContent = value.toLocaleString('en-GB') + suffix;
      input.style.setProperty('--range-fill', `${(value - Number(input.min)) / (Number(input.max) - Number(input.min)) * 100}%`);
      input.setAttribute('aria-valuetext', suffix ? value + ' percent' : value + ' properties');
    }

    const valid = Number.isFinite(profit) && profitInput.validity.valid;
    profitInput.setAttribute('aria-invalid', String(!valid));
    get('campaignCalcError').textContent = valid ? '' : 'Enter a gross profit from £0 to £1,000,000,000, with up to two decimal places.';
    const sales = records * (contact / 100) * (close / 100);
    const gross = sales * profit;
    get('campaignSales').textContent = salesFormat.format(sales);
    get('campaignFee').textContent = money.format(fee);
    get('campaignGross').textContent = valid ? money.format(gross) : '—';
    get('campaignNet').textContent = valid ? money.format(gross - fee) : '—';

    const note = get('campaignVolumeNote');
    note.hidden = records <= allowance;
    note.textContent = records > allowance
      ? `This scenario uses ${(records - allowance).toLocaleString('en-GB')} more leads than your plan includes. Additional lead costs are not included in these results.`
      : '';
  }

  form.addEventListener('input', calculateCampaign);
  form.addEventListener('change', calculateCampaign);
  form.addEventListener('submit', event => event.preventDefault());
  calculateCampaign();
})();
