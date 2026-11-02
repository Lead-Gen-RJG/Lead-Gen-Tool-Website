// Faq behaviour. Classic script supports direct-file previews.
(() => {
  const chatAnswer = document.getElementById('chatAnswer');
  const chatIntro = document.getElementById('chatIntro');
  const chatAssistant = document.querySelector('.chat-assistant');
  const chatMinimize = document.getElementById('chatMinimize');
  chatMinimize.addEventListener('click', () => {
    const collapsed = chatAssistant.classList.toggle('collapsed');
    chatMinimize.textContent = collapsed ? '+' : '−';
    chatMinimize.setAttribute('aria-expanded', String(!collapsed));
    chatMinimize.setAttribute('aria-label', collapsed ? 'Expand quick questions' : 'Minimise quick questions');
  });
  document.querySelectorAll('.chat-question[data-answer]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.chat-question[data-answer]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      chatIntro.hidden = true;
      chatAnswer.textContent = button.dataset.answer;
      chatAnswer.classList.add('visible');
    });
  });
})();
