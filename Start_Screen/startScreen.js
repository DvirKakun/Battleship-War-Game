
const startBtn = document.querySelector('.startGameBtn');
const layout = document.querySelector('.layout');
const moveToStrategyPanel = function () {
    layout.classList.remove('hidden');
    layout.classList.add('fade-out');
    setTimeout(function () {
        window.location.href = "../Strategy_Panel/index.html";
    }, 1000);
}

startBtn.addEventListener('click', moveToStrategyPanel);