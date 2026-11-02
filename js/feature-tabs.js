// Feature tabs behaviour. Classic script supports direct-file previews.
(() => {
  const featureCopy = document.getElementById('featureCopy');
  const dashFeature = document.getElementById('dashFeature');
  document.querySelectorAll('.feature-button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.feature-button').forEach(item => {
        item.classList.remove('active');
        item.setAttribute('aria-selected', 'false');
        item.lastElementChild.textContent = '○';
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      button.lastElementChild.textContent = '●';
      featureCopy.textContent = button.dataset.copy;
      dashFeature.textContent = button.dataset.feature;
    });
  });
})();
