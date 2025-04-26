document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const toggleBall = document.getElementById('toggle-ball');

    // Appliquer la préférence si déjà enregistrée
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
        toggleBall.classList.add('translate-x-8');
        toggleBall.textContent = '🌙';
    }

    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');

        if (document.documentElement.classList.contains('dark')) {
            toggleBall.classList.add('translate-x-8');
            toggleBall.textContent = '🌙';
            localStorage.setItem('theme', 'dark');
        } else {
            toggleBall.classList.remove('translate-x-8');
            toggleBall.textContent = '🌞';
            localStorage.setItem('theme', 'light');
        }
    });
});

