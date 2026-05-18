// ── MUSIC.JS ── Lo-fi YouTube player with track switching

const trackBtns = document.querySelectorAll('.track-btn');
const ytPlayer  = document.getElementById('yt-player');

trackBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const videoId = btn.dataset.id;

    // Update active state
    trackBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Swap the YouTube embed src (autoplay=1 so it plays immediately)
    ytPlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&loop=1&playlist=${videoId}`;
  });
});
