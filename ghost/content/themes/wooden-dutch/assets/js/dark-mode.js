(function () {
    var toggle = document.querySelector('.dark-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme');
        var next = current === 'Dark' ? 'Light' : 'Dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('wd-theme', next);
    });
})();
