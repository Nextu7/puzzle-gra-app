document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.collection-menu li.has-children > a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            link.parentElement.classList.toggle('open');
        });
    });
});
