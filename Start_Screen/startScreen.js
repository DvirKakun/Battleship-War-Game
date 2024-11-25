import { ref, set, get } from "firebase/database";
import { database } from "../config.js";

// // Create a reference to the 'rooms' key in your database
const roomsObjectRef = ref(database, '/rooms');
let roomsObject;

const startBtn = document.querySelector('.startGameBtn');
const layout = document.querySelector('.layout');
const modeDialog = document.querySelector('.modeDialog');
const overlay = document.querySelector('.overlay');
const loadingContentDialog = document.querySelector('.loading-content');
const spinnerOverlay = document.querySelector('.spinner-overlay');
let closeBtn;

let markup;
let status;
let roomNumber
let roomName;

history.pushState({ page: 'start_screen' }, '', '/Start_Screen/index.html');

const activeLoadingSpinner = function () {
    spinnerOverlay.classList.remove('hidden');
    loadingContentDialog.classList.add('displaySetting');
    loadingContentDialog.show();
}

const deactiveLoadingSpinner = function () {
    spinnerOverlay.classList.add('hidden');
    loadingContentDialog.classList.remove('displaySetting');
    loadingContentDialog.close();
}

const closeDialog = function () {
    modeDialog.classList.remove('displaySettings');
    modeDialog.close();
    overlay.classList.add('hidden');
}


overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDialog();
});


const moveToStrategyPanel = function () {
    closeDialog();

    sessionStorage.setItem('state', JSON.stringify({
        status,
        roomName
    }));

    layout.classList.remove('hidden');
    layout.classList.add('fade-out');

    setTimeout(function () {
        window.location.href = "../Strategy_Panel/index.html";
    }, 3000);
}

const generateRoomNumber = function () {
    roomNumber = Math.floor(1000 + Math.random() * 9000);
    roomName = `room-${roomNumber}`;
    while (roomsObject && Object.hasOwn(roomsObject, roomName)) {
        roomNumber = Math.floor(1000 + Math.random() * 9000);
        roomName = `room-${roomNumber}`;
    };
    return roomNumber;
}

const makeToastAnimation = function (toast) {
    toast.classList.remove('hidden');
    gsap.fromTo(
        toast,
        { y: 50, opacity: 0 },
        {
            y: -70,
            opacity: 1,
            duration: 0.5,
            ease: "power2.out",
            onComplete: () => {
                // Fade out after 2 seconds
                gsap.to(toast, {
                    opacity: 0,
                    duration: 0.5,
                    delay: 2,
                    y: 50,
                    ease: "power2.in",
                    onComplete: () => {
                        toast.classList.add('hidden');
                    },
                });
            },
        }
    );
}

const changeMarkup = function () {
    markup = `<h1 class="game-title">
                    Game PIN: <${status === 'host' ? `span class="game-pin">${generateRoomNumber()}</span>` : 'input class="game-pin"/>'} 
            </h1>
            <button class="playBtn button">PLAY</button>
            <button class="backBtn">&larr;</button>
            <button class="closeButton">&times;</button>
            <div class="toast hidden"></div>
        `;
    modeDialog.innerHTML = markup;

    const toast = document.querySelector('.toast');

    const backBtn = document.querySelector('.backBtn');
    backBtn.addEventListener('click', chooseMode);

    const playBtn = document.querySelector('.playBtn');
    playBtn.addEventListener('click', () => {
        if (status === 'host') {
            const newRoomRef = ref(database, `/rooms/${roomName}`);

            // Set data for the new child
            activeLoadingSpinner();
            set(newRoomRef, {
                roomName,
                currentAmountOfPlayersInTheRoom: 1,
                players: { host: { isReady: false, playAgain: false }, guest: { isReady: false, playAgain: false } },
                locked: false,
                turn: 'host',
            }).then(() => {
                deactiveLoadingSpinner();
                moveToStrategyPanel(); //Start the game
            }).catch((error) => {
                console.log(error); //TODO: Create network error
                toast.textContent = `Error adding new room: ${error}`;
                makeToastAnimation(toast);
            });

        }
        else {
            activeLoadingSpinner();

            get(roomsObjectRef).then((snapshot) => {
                if (snapshot.exists()) {
                    // If data exists under 'rooms'
                    roomsObject = snapshot.val();
                }
            }).then(() => {
                deactiveLoadingSpinner();

                roomNumber = document.querySelector('.game-pin').value;
                roomName = `room-${roomNumber}`;
                if (!Object.hasOwn(roomsObject, roomName)) {
                    toast.textContent = 'Room does not exists';
                    console.log("dsadas");
                    makeToastAnimation(toast);
                    return Promise.reject();
                } else if (roomsObject[roomName].currentAmountOfPlayersInTheRoom == 2) {
                    toast.textContent = 'Room is full';
                    makeToastAnimation(toast);
                    return Promise.reject();
                } else {
                    activeLoadingSpinner();

                    roomsObject[roomName].currentAmountOfPlayersInTheRoom = 2;
                    return set(roomsObjectRef, roomsObject);
                }
            }).then(() => {
                deactiveLoadingSpinner();
                moveToStrategyPanel();
            }).catch((error) => {
                console.log(error); //TODO: Create network error

            });


        }

    });

    closeBtn = document.querySelector('.closeButton');
    closeBtn.addEventListener('click', closeDialog);

}

const chooseMode = function () {
    markup = `  <button class="soloBtn button">Solo Play</button>
                <button class="hostRoomBtn button">Host a Game</button>
                <button class="joinRoomBtn button">Join a Game</button>
                <button class="closeButton">&times;</button>`;
    modeDialog.innerHTML = markup;

    overlay.classList.remove('hidden');
    modeDialog.classList.add('displaySettings');
    modeDialog.show();
    gsap.from(".modeDialog", { opacity: 0, y: 100, duration: 1 });

    const soloBtn = document.querySelector('.soloBtn');
    const hostRoomBtn = document.querySelector('.hostRoomBtn');
    const joinRoomBtn = document.querySelector('.joinRoomBtn');
    closeBtn = document.querySelector('.closeButton');


    soloBtn.addEventListener('click', () => {
        status = "solo";
        moveToStrategyPanel();
    });
    hostRoomBtn.addEventListener('click', () => {
        status = "host";
        changeMarkup();
    });
    joinRoomBtn.addEventListener('click', () => {
        status = "guest";
        changeMarkup();
    });

    closeBtn.addEventListener('click', closeDialog);
}

startBtn.addEventListener('click', chooseMode);
