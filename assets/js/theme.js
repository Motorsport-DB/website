document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const toggleBall = document.getElementById('toggle-ball');
    const isDark = localStorage.getItem('theme') === 'dark';

    document.documentElement.classList.toggle('dark', isDark);
    toggleBall.classList.toggle('translate-x-8', isDark);
    toggleBall.textContent = isDark ? '🌙' : '🌞';

    themeToggle.addEventListener('click', () => {
        const darkMode = document.documentElement.classList.toggle('dark');
        toggleBall.classList.toggle('translate-x-8', darkMode);
        toggleBall.textContent = darkMode ? '🌙' : '🌞';
        localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    });
});
