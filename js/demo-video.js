(() => {
function initDemoVideo() {
  const demoVideoButton = document.getElementById('demoVideoButton');
  const demoVideoDialog = document.getElementById('demoVideoDialog');
  const demoVideo = document.getElementById('demoVideo');
  demoVideoButton.addEventListener('click', event => {
    // The ordinary MP4 link remains usable without dialog support or JavaScript.
    if (typeof demoVideoDialog.showModal !== 'function') return;
    event.preventDefault();
    demoVideoDialog.showModal();
    document.body.classList.add('demo-video-open');
    const source = demoVideo.querySelector('source');
    if (!source.hasAttribute('src')) {
      source.src = source.dataset.src;
      demoVideo.load();
    }
    const playback = demoVideo.play();
    if (playback) playback.catch(() => { /* Native controls remain available. */ });
  });
  document.getElementById('demoVideoClose').addEventListener('click', () => demoVideoDialog.close());
  demoVideoDialog.addEventListener('click', event => {
    if (event.target !== demoVideoDialog) return;
    const box = demoVideoDialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) demoVideoDialog.close();
  });
  demoVideoDialog.addEventListener('close', () => {
    demoVideo.pause();
    demoVideo.currentTime = 0;
    document.body.classList.remove('demo-video-open');
    demoVideoButton.focus({ preventScroll: true });
  });
}

initDemoVideo();
})();
