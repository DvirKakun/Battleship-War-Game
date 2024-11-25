import { SAMLAuthProvider } from "firebase/auth/web-extension";
import { Images, ROWS, COLS, shipsLengths } from "../config.js";
import { database } from "../config.js";
import { ref, off, get, set, onValue, onChildChanged, update } from "firebase/database";
import { doc } from "firebase/firestore/lite";



const layout = document.querySelector('.layout');
let playerPanel = document.querySelector('.playerPanel');
let opponentPanel = document.querySelector('.opponentPanel');
const playerVerticalTargetLine = document.querySelector('.playerVerticalTargetLine');
const playerHorizontalTargetLine = document.querySelector('.playerHorizontalTargetLine');
const opponentShips = document.querySelectorAll('.opponent-ship');
const overlay = document.querySelector('.overlay ');
const winnerDialog = document.querySelector('.winnerDialog');
const winnerImg = document.getElementById('winner');
const newGameBtn = document.querySelectorAll('.newGame');
const closeBtn = document.querySelector('.closeButton');
const loadingContentDialog = document.querySelector('.loading-content');
const spinnerOverlay = document.querySelector('.spinner-overlay');
const quitGameBtnContainer = document.querySelector('.quitGameContainer');
const quitGameBtn = document.querySelector('.quitGame');
const playAgainBtn = document.querySelector('.playAgain');

const playerShipCells = { playerFirst: [], playerSecond: [], playerThird: [], playerFourth: [], playerFifth: [] };
const opponentShipCells = { opponentFirst: [], opponentSecond: [], opponentThird: [], opponentFourth: [], opponentFifth: [] };
const turnShipCells = [opponentShipCells, playerShipCells]; //Refrence for using turn to get access
const cellStatus = {
    destroyed: 'destroyed',
    hited: 'hited',
    missed: 'missed',
    explosion: 'explosion',
    flame: 'flame'
};


const opponentCells = [];
let tempCells = [];
const directions = ['horizontal', 'vertical'];

const opponentShipsHitedAmount = [0, 0, 0, 0, 0];
const playerShipsHitedAmount = [0, 0, 0, 0, 0];
const shipsHitedAmount = [opponentShipsHitedAmount, playerShipsHitedAmount];
const counterDestroyed = [0, 0];

let lengthsCopy = [...shipsLengths];
let randomMove = [-1, 1];
let move;
let isTaken = 0;
let turn = 0;  //if turn = 0 --> player turn - so access needed for the opponent ships data.
let setPositionCell = null;
let isHited = false;
let hitDirection = null;
let lastCellHited = null;
let currentCell = null;
let status = null;
let isGameStarted = false;
let isWantToPlayAgain = false;

let hostRef, hostData;
let guestRef, guestData;
let roomObjRef;
let hostShipDestroyedRef, guestShipDestroyedRef;
let winnerRef;
let selfRef, opponentRef;

history.pushState({ page: 'play' }, '', '/index.html');

window.onload = function () {
    layout.classList.add('fade-out');
    setTimeout(() => {
        layout.classList.add('hidden');
        layout.classList.remove('fade-out');
    }, 1000);
}

window.addEventListener('popstate', (event) => {
    if (event.state?.page === 'play') {
        if (state.status === 'solo') {
            window.location.href = '../Strategy_Panel/index.html';
        } else {
            window.location.href = '../Start_Screen/index.html';
        }
    }
});

const state = JSON.parse(sessionStorage.getItem('state'));

const activeLoadingSpinner = function (text = 'Waiting for the second player...') {
    loadingContentDialog.querySelector("p").textContent = text;
    spinnerOverlay.classList.remove('hidden');
    loadingContentDialog.classList.add('displaySetting');
    loadingContentDialog.show();
}

const deactiveLoadingSpinner = function () {

    spinnerOverlay.classList.add('hidden');
    loadingContentDialog.classList.remove('displaySetting');
    loadingContentDialog.close();
}

if (state.status !== 'solo') {
    newGameBtn[0].classList.add('hidden');
    quitGameBtnContainer.classList.remove('hidden');
    playAgainBtn.classList.remove('hidden');
    activeLoadingSpinner();

    hostRef = ref(database, `rooms/${state.roomName}/players/host`);
    guestRef = ref(database, `rooms/${state.roomName}/players/guest`);
    hostCellsRef = ref(database, `rooms/${state.roomName}/players/host/cells`);
    guestCellsRef = ref(database, `rooms/${state.roomName}/players/guest/cells`);
    roomObjRef = ref(database, `rooms/${state.roomName}`);
    hostShipDestroyedRef = ref(database, `rooms/${state.roomName}/players/host/shipDestroyed`);
    guestShipDestroyedRef = ref(database, `rooms/${state.roomName}/players/guest/shipDestroyed`);
    winnerRef = ref(database, `rooms/${state.roomName}/winner`);
    selfRef = ref(database, `rooms/${state.roomName}/players/${state.status}`);
    state.status === 'guest' ? opponentRef = hostRef : opponentRef = guestRef;

    get(hostRef)
        .then((snapshot) => {
            if (snapshot.exists()) {
                hostData = snapshot.val();

                return get(guestRef);
            }
        }).then((snapshot) => {
            if (snapshot.exists()) {
                guestData = snapshot.val();
                if (guestData.isReady && hostData.isReady) {
                    update(roomObjRef, { locked: true })
                        .then(() => {
                            deactiveLoadingSpinner();
                            startGame();
                        })
                        .catch((error) => console.error("Error getting data:", error));
                }
            }
        }).catch((error) => {
            console.error("Error getting data:", error);
        });

    let changedData;
    onChildChanged(hostRef, (snapshot) => {
        changedData = snapshot.val();
        if (snapshot.ref.key == 'isReady' && changedData == true) {
            update(roomObjRef, { locked: true })
                .then(() => {
                    deactiveLoadingSpinner();
                    if (!isGameStarted) startGame();
                })
                .catch((error) => console.error("Error getting data:", error));
        }
        else if (snapshot.ref.key === 'playAgain' && changedData === true) {
            activeLoadingSpinner('Loading...');
            get(guestRef).then((snapshot) => {
                deactiveLoadingSpinner();

                if (snapshot.val().playAgain === true) {
                    playAgain();
                }
            })
        }
    });
    onChildChanged(guestRef, (snapshot) => {
        changedData = snapshot.val();
        if (snapshot.ref.key == 'isReady' && changedData == true) {
            update(roomObjRef, { locked: true })
                .then(() => {
                    deactiveLoadingSpinner();
                    if (!isGameStarted) startGame();
                })
                .catch((error) => console.error("Error getting data:", error));
        }
        else if (snapshot.ref.key === 'playAgain' && changedData === true) {
            activeLoadingSpinner('Loading...');
            get(hostRef).then((snapshot) => {
                deactiveLoadingSpinner();

                if (snapshot.val().playAgain === true) {
                    playAgain();
                }
            })
        }
    });
    onChildChanged(hostCellsRef, (snapshot) => {
        changedData = snapshot.val();
        if (state.status === 'host') {
            let changedCell = document.getElementById(changedData.id);
            changedCell.classList.add(...changedData.classList);
        }
    });
    onChildChanged(guestCellsRef, (snapshot) => {
        changedData = snapshot.val();
        if (state.status === 'guest') {
            let changedCell = document.getElementById(changedData.id);
            changedCell.classList.add(...changedData.classList);
        }
    });
    onValue(hostShipDestroyedRef, (snapshot) => {
        if (snapshot.exists() && state.status === 'host') {
            document.getElementById(`${snapshot.val()}`).classList.add('hidden');
        }
    });
    onValue(guestShipDestroyedRef, (snapshot) => {
        if (snapshot.exists() && state.status === 'guest') {
            document.getElementById(`${snapshot.val()}`).classList.add('hidden');
        }
    });

    onValue(winnerRef, (snapshot) => {
        if (snapshot.exists()) {
            opponentShips.forEach(ship => {
                if (!opponentShipCells[ship.id][0].classList.contains('destroyed')) {
                    ship.classList.remove('hidden');
                }
            });

            gameOver(snapshot.val());
        }
    });
}
else {
    startGame();
}

function playAgain() {
    activeLoadingSpinner('Loading...');
    set(roomObjRef, {
        roomName: state.roomName,
        currentAmountOfPlayersInTheRoom: 2,
        players: { host: { isReady: false, playAgain: false }, guest: { isReady: false, playAgain: false } },
        locked: false,
        turn: 'host',
    }).then(() => {
        deactiveLoadingSpinner();

        winnerDialog.close();
        layout.classList.remove('hidden');
        layout.classList.add('fade-in');
        setTimeout(function () {
            window.location.href = '../Strategy_Panel/index.html';
        }, 1000);

    }).catch((error) => {
        console.log(error); //TODO: Create network error
    });
}

function gameOver(winner = 'none') {
    playerPanel.classList.add('deactive');
    opponentPanel.classList.add('deactive');
    overlay.classList.remove('hidden');
    winnerDialog.classList.add('displaySetting');

    if (state.status === 'solo') {
        winnerImg.src = Images[`Winner${turn}`];
    } else {
        if (state.status === 'host' && winner === 'host') winnerImg.src = Images[`Winner0`];
        if (state.status === 'host' && winner === 'guest') winnerImg.src = Images[`Winner1`];
        if (state.status === 'guest' && winner === 'guest') winnerImg.src = Images[`Winner0`];
        if (state.status === 'guest' && winner === 'host') winnerImg.src = Images[`Winner1`];
    }

    winnerDialog.show();
}


function startGame() {
    isGameStarted = true;

    const changeTurn = [opponentTurn, playerTurn];

    if (state.status === 'guest') {
        opponentTurn();
    }

    const shipCellsById = JSON.parse(sessionStorage.getItem('shipCellsId'));
    const panelData = JSON.parse(sessionStorage.getItem('panelData'));

    // sessionStorage.removeItem('shipCellsId');
    // sessionStorage.removeItem('panelData');

    playerPanel.innerHTML += panelData['html']; //Set the player panel from the strategy panel

    const opponentVerticalTargetLine = document.querySelector('.opponentVerticalTargetLine');
    const opponentHorizontalTargetLine = document.querySelector('.opponentHorizontalTargetLine');
    opponentHorizontalTargetLine.style.top = '0px';  //Have to initilize for animation works
    opponentVerticalTargetLine.style.left = '0px';

    const playerShips = document.querySelectorAll('.player-ship');
    const playerCells = [...document.querySelectorAll('.player-cell')];

    Object.keys(shipCellsById).forEach(ship => { //Reconstruct the cells for each ship 
        shipCellsById[ship].forEach(id => {
            let foundCell = playerCells.find(cell => cell.id === id);
            playerShipCells[ship].push(foundCell)
        })
    });

    if (state.status !== 'solo') {
        const cellsDataList = playerCells.map(cell => ({
            id: cell.id, // or another unique identifier
            classList: cell.classList,
            ...(cell.dataset.ship && { data: cell.dataset.ship }),
        }));
        const cellsPerShip = Object.fromEntries(
            Object.entries(playerShipCells).map(([ship, cells]) => [ship, cells.map(cell => cell.id)])
        );
        let shipsDirections = {};
        playerShips.forEach(ship => shipsDirections[ship.id] = ship.dataset.direction);


        activeLoadingSpinner("Loading...");
        update(selfRef, { cells: cellsDataList, cellsPerShip, shipsDirections }).then(() => {
            deactiveLoadingSpinner();

            setPlayerOnPanel();
            createopponentPanel();
            setOpponentShips();

        }).catch((error) => console.error(error));

        onChildChanged(roomObjRef, (snapshot) => {
            let key = snapshot.key;
            changedData = snapshot.val();
            if (key === 'turn') {
                if (state.status === changedData) changeTurn[turn]();
            }
        })
    }
    else {
        setPlayerOnPanel();
        createopponentPanel();
        setOpponentShips();
    }

    newGameBtn.forEach(btn => {
        btn.addEventListener('click', () => {
            winnerDialog.close();
            layout.classList.remove('hidden');
            layout.classList.add('fade-in');
            setTimeout(function () {
                if (state.status === 'solo') {
                    window.location.href = "/Strategy_Panel/index.html";
                } else {
                    window.location.href = "/Start_Screen/index.html";
                }
            }, 1000);
        });
    });

    quitGameBtn.addEventListener('click', () => {
        activeLoadingSpinner('Loading...');
        if (state.status === 'host') {
            set(winnerRef, 'guest').then(() => deactiveLoadingSpinner()).catch((error) => console.error(error));
        }
        else {
            set(winnerRef, 'host').then(() => deactiveLoadingSpinner()).catch((error) => console.error(error));
        }

        window.location.href = "/Start_Screen/index.html";
    });

    playAgainBtn.addEventListener('click', () => {
        isWantToPlayAgain = true;

        playAgainBtn.style.backgroundImage = 'linear-gradient(to top left,  #808080, #404040)';
        playAgainBtn.style.pointerEvents = 'none';
        playAgainBtn.style.opacity = '0.6';

        activeLoadingSpinner('Loading...');
        update(selfRef, { playAgain: true }).then(() => deactiveLoadingSpinner()).catch((error) => console.error(error));
    });

    [closeBtn, overlay].forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target === closeBtn || e.target === overlay) {
                winnerDialog.classList.remove('displaySetting');
                winnerDialog.close();
                overlay.classList.add('hidden');
            }
        });
    });

    opponentPanel.addEventListener('mousemove', (e) => {   //Target animation
        let x = e.clientX - opponentPanel.offsetLeft;
        let y = e.clientY - opponentPanel.offsetTop;
        playerVerticalTargetLine.style.left = `${x}px`;
        playerHorizontalTargetLine.style.top = `${y}px`;

        playerVerticalTargetLine.classList.remove('hidden');
        playerHorizontalTargetLine.classList.remove('hidden');

        currentCell = e.target;
        currentCell.classList.contains('opponent-cell') && (
            currentCell.addEventListener('mousemove', cellMouseMove),
            currentCell.addEventListener('mouseleave', cellMouseLeave),
            currentCell.addEventListener('click', cellClick)
        );

    });

    playerCells.forEach(cell => cell.style.zIndex = '2000');

    opponentPanel.addEventListener('mouseleave', () => {  //Hide the target animation while leaving the panel
        playerVerticalTargetLine.classList.add('hidden');
        playerHorizontalTargetLine.classList.add('hidden');
    })


    function cellMouseMove() {
        currentCell.classList.add('drag-over');
    }
    function cellMouseLeave() {
        currentCell.classList.remove('drag-over');
        currentCell.removeEventListener('mousemove', cellMouseMove);
        currentCell.removeEventListener('mouseleave', cellMouseLeave);
        currentCell.removeEventListener('click', cellClick);
    }
    async function cellClick() {
        currentCell.classList.remove('drag-over');
        await makeShot(currentCell);
        if (counterDestroyed[turn] === shipsLengths.length) {
            if (state.status !== 'solo') {
                activeLoadingSpinner('Loading...');
                set(winnerRef, `${state.status}`).then(() => deactiveLoadingSpinner()).catch((error) => console.error(error));
            } else {
                gameOver();
            }
        }
    }

    async function makeShot(cell) {
        if (!cell.classList.contains('original')) {
            status = 'missed';
            changeCellStatus(cell, cellStatus['missed']);
            changeTurn[turn]();

            if (state.status !== 'solo') {
                activeLoadingSpinner("Loading...");
                let turnRef = ref(database, `rooms/${state.roomName}`);
                get(turnRef).then((snapshot) => {
                    const data = snapshot.val();
                    if (data.turn === 'host') return update(turnRef, { turn: 'guest' });
                    else return update(turnRef, { turn: 'host' });
                }).then(() => deactiveLoadingSpinner()).catch((error) => console.error(error));
            }
        }
        else {
            status = 'hited';

            opponentPanel.style.pointerEvents = 'none'; //Prevent the player from shoot until the animation over

            //    cell.style.zIndex = '2000'; //Make cell be in the front

            changeCellStatus(cell, cellStatus['hited']); //Hit animation

            await delay(500);

            changeCellStatus(cell, cellStatus['flame']); //Flame animation

            let ship = cell.dataset.ship;
            let index = Object.keys(turnShipCells[turn]).indexOf(ship);
            shipsHitedAmount[turn][index]++;

            if (turn === 0) {  //Add flame affect in the opponent fleet
                const markup = `<img src=${Images.flame}/>`;
                document.querySelector(`.${ship}StatusContainer`).insertAdjacentHTML('beforeend', markup);
            }

            if (shipsHitedAmount[turn][index] === shipsLengths[index]) {   //Make the explosion affect

                let shipEl = document.getElementById(`${ship}`);
                shipEl.classList.add('hidden');

                if (state.status !== 'solo') {
                    activeLoadingSpinner("Loading");

                    let opponentShipDestroyedRef;
                    state.status === 'host' ?
                        opponentShipDestroyedRef = guestShipDestroyedRef :
                        opponentShipDestroyedRef = hostShipDestroyedRef;

                    set(opponentShipDestroyedRef, ship.replace("opponent", "player"))
                        .then(() => deactiveLoadingSpinner())
                        .catch((error) => console.error(error));
                }


                status = 'destroyed';
                counterDestroyed[turn]++;

                const promises = [];
                for (const cell of turnShipCells[turn][ship]) {
                    if (!cell.classList.contains('original')) changeCellStatus(cell, cellStatus['missed']);
                    else {
                        changeCellStatus(cell, cellStatus['explosion']);

                        promises.push(
                            new Promise((resolve) => {
                                setTimeout(() => {
                                    changeCellStatus(cell, cellStatus['destroyed']);
                                    resolve();
                                }, 700);
                            }));
                    }
                }

                await Promise.all(promises);


                if (turn === 0) {
                    document.querySelector(`.${ship}StatusContainer`).innerHTML = '';
                    document.getElementById(`${ship}Status`).src = Images[`${ship}Sunk`];
                } else {
                    lengthsCopy.splice(lengthsCopy.findIndex(len => len === shipsLengths[index]), 1);
                }


            }

            opponentPanel.style.pointerEvents = ''; //Allow the player to shoot again
        }

    }
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function changeCellStatus(cell, status) {
        cell.classList.add(status);

        let opponentCellsRef;
        let opponentCellsData;
        let cellIndex;
        if (state.status !== 'solo') {
            activeLoadingSpinner("Loading...");
            state.status === 'host' ?
                opponentCellsRef = ref(database, `rooms/${state.roomName}/players/guest`) :
                opponentCellsRef = ref(database, `rooms/${state.roomName}/players/host`);

            cellIndex = opponentCells.indexOf(cell);
            get(opponentCellsRef).then((snapshot) => {
                opponentCellsData = snapshot.val();
                opponentCellsData.cells[cellIndex].classList = cell.classList;
                return update(opponentCellsRef, { cells: opponentCellsData.cells });
            }).then(() => deactiveLoadingSpinner()).catch((error) => console.error(error));
        }
    }

    async function opponentTurn() {
        playerPanel.classList.remove('deactive');
        opponentPanel.classList.add('deactive');

        playerVerticalTargetLine.classList.add('hidden');
        playerHorizontalTargetLine.classList.add('hidden');

        turn = +!turn;

        await delay(1000);

        if (state.status === 'solo') {
            let cell;

            do {
                while (!isCellAvailable(cell)) //Keep choosing cell until it was available
                    cell = chooseCell();

                locateCell(cell);   //Make animation

                await delay(1000); //Let the locating done before make the shot

                await makeShot(cell);


                if (status === 'hited') { //Ship hited
                    let ship = document.getElementById(`${cell.dataset.ship}`);
                    hitDirection = isHited && +ship.dataset.direction; //if isHited = true --> hitDirection get direction, else, hitDirection set to false
                    isHited = true;
                    lastCellHited = cell;
                }
                else if (status === 'destroyed') { //Ship destroyed --> initilize variables
                    lastCellHited = null;
                    isHited = false;
                    hitDirection = null;
                    randomMove = [-1, 1];
                }

                if (counterDestroyed[turn] === shipsLengths.length) {
                    opponentShips.forEach(ship => {
                        if (!opponentShipCells[ship.id][0].classList.contains('destroyed'))
                            ship.classList.remove('hidden')
                    });

                    gameOver();
                    break;
                }
            }
            while (cell.classList.contains('hited')); //opponent keeps shooting until it missed
        }
    }

    function chooseCell() {
        let cell;
        let row = Math.floor((playerCells.indexOf(lastCellHited) / ROWS)) + 1;
        let col = Math.floor((playerCells.indexOf(lastCellHited) % COLS)) + 1;

        if (isHited && hitDirection !== false) {
            if (lastCellHited.classList.contains('missed')) randomMove = randomMove.filter(number => number !== move); //Make the opponent choose the right direction after missed
            move = randomMove[Math.floor(Math.random() * randomMove.length)];
            cell = playerCells.find(cell => cell.id === `player-cell-${row + (move * hitDirection)}-${col + (move * +!hitDirection)}`);
            lastCellHited = cell || lastCellHited; //if cell = undefined lastCellHited equlas to lastCellHited, otherwise to cell
        }
        else if (isHited) {
            let randDirection = Math.floor(Math.random() * randomMove.length);
            move = randomMove[Math.floor(Math.random() * randomMove.length)];
            cell = playerCells.find(cell => cell.id === `player-cell-${row + (move * randDirection)}-${col + (move * +!randDirection)}`);

        } else {
            let randCellNumber = Math.floor(Math.random() * ROWS * COLS);            //Choose random cell
            cell = playerCells[randCellNumber];
        }
        return cell;

    }

    function isCellAvailable(cell) {
        if (cell === undefined || cell.classList.contains('missed') || cell.classList.contains('hited')) return false;

        const min = lengthsCopy[0];
        const index = playerCells.indexOf(cell);

        if (!isHited)
            return checkIfCellMakeSense(cell, index, min);
        if (isHited && hitDirection === false) { //opponent hit the ship but has not found yet the direction of the ship
            const ship = lastCellHited.dataset.ship;
            const shipIndex = Object.keys(turnShipCells[turn]).indexOf(ship);
            const lastCellIndex = playerCells.indexOf(lastCellHited);
            if (lastCellIndex + 1 === index || lastCellIndex - 1 === index) return checkHorizontally(cell, index, shipsLengths[shipIndex], 1); //If opponent hit one cell so he need to check if the amount of available cells equal/greater than the current ship length - 1
            if (lastCellIndex + COLS === index || lastCellIndex - COLS === index) return checkVertically(cell, index, shipsLengths[shipIndex], 1);
        }
        return true; //return true if opponent knows the direction, it means that  the chosen cell is neccessarlly make sense and available 
    }

    function checkIfCellMakeSense(cell, index, min) { //Checks if there is enough cells to hit the current mininmum ship from the reciving cell horizontally or vertically 

        return checkHorizontally(cell, index, min) || checkVertically(cell, index, min);

    }
    function checkHorizontally(cell, index, min, hitedAmount = 0) {
        let amountHorizontalCellsAvailable = 1; //The current cell always count
        let i = 1;

        while (playerCells[index + i] && (index + i) % COLS !== 0 && !playerCells[index + i].classList.contains('missed')) { //Check right side
            if (!playerCells[index + i].classList.contains('hited'))
                amountHorizontalCellsAvailable++;
            i++;
            if (amountHorizontalCellsAvailable >= min - hitedAmount) {
                return true;
            }
        }
        i = 1;
        while (playerCells[index - i] && (index - i) % COLS !== COLS - 1 && !playerCells[index - i].classList.contains('missed')) { //Check left side
            if (!playerCells[index - i].classList.contains('hited'))
                amountHorizontalCellsAvailable++;
            i++;
            if (amountHorizontalCellsAvailable >= min - hitedAmount) {
                return true;
            }
        }
        return false;
    }

    function checkVertically(cell, index, min, hitedAmount = 0) {
        let amountVerticalCellsAvailable = 1;
        let j = 1;

        while (playerCells[index + (j * ROWS)] && !playerCells[index + (j * ROWS)].classList.contains('missed')) { //Check up
            if (!playerCells[index + (j * ROWS)].classList.contains('hited'))
                amountVerticalCellsAvailable++;
            j++;
            if (amountVerticalCellsAvailable >= min - hitedAmount) {
                return true;
            }
        }
        j = 1;
        while (playerCells[index - (j * ROWS)] && !playerCells[index - (j * ROWS)].classList.contains('missed')) { //Check down
            if (!playerCells[index - (j * ROWS)].classList.contains('hited'))
                amountVerticalCellsAvailable++;
            j++;
            if (amountVerticalCellsAvailable >= min - hitedAmount) {
                return true;
            }
        }
        return false;
    }

    function locateCell(randCell) {
        let cellSize = randCell.getBoundingClientRect();
        opponentHorizontalTargetLine.classList.remove('hidden'); //Prepare for animation
        opponentVerticalTargetLine.classList.remove('hidden');
        opponentHorizontalTargetLine.style.transition = 'all 1s ease-in-out';
        opponentVerticalTargetLine.style.transition = 'all 1s ease-in-out';

        opponentHorizontalTargetLine.style.top = `${randCell.offsetTop + (cellSize.height / 2)}px`;
        opponentVerticalTargetLine.style.left = `${randCell.offsetLeft + (cellSize.width / 2)}px`;
    }

    function playerTurn() {
        turn = +!turn;

        playerPanel.classList.add('deactive');
        opponentPanel.classList.remove('deactive');
    }


    function setPlayerOnPanel() {
        playerShips.forEach(ship => {
            setPositionCell = playerShipCells[ship.id][0]; //Set position according the first cell
            ship.style.transform = `translate(${setPositionCell.offsetLeft}px, ${setPositionCell.offsetTop}px)`;
        });
    }

    function createopponentPanel() {
        for (let row = 1; row <= ROWS; row++) {
            for (let col = 1; col <= COLS; col++) {
                const div = document.createElement('div');
                div.className = 'opponent-cell';
                div.id = `opponent-cell-${row}-${col}`;
                opponentCells.push(div);
                opponentPanel.appendChild(div);
            }
        }
    }

    function setOpponentShips() {
        if (state.status === 'solo') {
            opponentShips.forEach(ship => {
                ship.style.pointerEvents = 'none';   // Make the ship goes to the background
                let set;
                do {
                    let randCellNumber = Math.floor(Math.random() * ROWS * COLS);
                    let randCell = opponentCells[randCellNumber];
                    let randDirection = Math.floor(Math.random() * 2);
                    let strDirection = directions[randDirection];
                    ship.dataset.direction = randDirection;
                    ship.src = Images[`${strDirection}${ship.id.charAt(8) + ship.id.slice(9)}Ship`];

                    getTempCells(randCell, ship);
                    set = placeShip(ship);
                }
                while (set === 'container');
            });
        } else {
            let opponentCellsRef;
            let oppnenetCellsPerShipRef;
            if (state.status === 'host') {
                opponentCellsRef = ref(database, `rooms/${state.roomName}/players/guest/cells`);
                oppnenetCellsPerShipRef = ref(database, `rooms/${state.roomName}/players/guest/cellsPerShip`);
                opponentShipsDirectionsRef = ref(database, `rooms/${state.roomName}/players/guest/shipsDirections`)
            }
            else {
                opponentCellsRef = ref(database, `rooms/${state.roomName}/players/host/cells`);
                oppnenetCellsPerShipRef = ref(database, `rooms/${state.roomName}/players/host/cellsPerShip`);
                opponentShipsDirectionsRef = ref(database, `rooms/${state.roomName}/players/host/shipsDirections`)
            }

            activeLoadingSpinner("Loading...");

            function onCellsCreated(snapshot) {
                if (snapshot.exists()) {

                    const opponentCellsData = snapshot.val();
                    for (let i = 0; i < ROWS * COLS; i++) {
                        opponentCells[i].classList.add(...(opponentCellsData[i].classList.map(classItem => classItem.replace("player", "opponent"))));
                        opponentCells[i].dataset.ship = opponentCellsData[i].data?.replace("player", "opponent");
                    }

                    get(oppnenetCellsPerShipRef).then(snap => {
                        deactiveLoadingSpinner();

                        const data = snap.val();
                        Object.keys(data).forEach(ship => {
                            // Get the array of IDs from newObj
                            const shipKey = ship.replace("player", "opponent");
                            const shipsIds = data[ship].map(id => id.replace("player", "opponent"));

                            // Map each item ID to its corresponding item from items
                            opponentShipCells[shipKey] = shipsIds.map(id => {
                                // Find the item with the matching id
                                return opponentCells.find(cell => cell.id === id);
                            });
                        });
                        return get(opponentShipsDirectionsRef);

                    }).then((snapshot) => {
                        let opponentShipsDirections = {};
                        Object.entries(snapshot.val()).forEach(([ship, direction]) => {
                            opponentShipsDirections[`${ship.replace("player", "opponent")}`] = direction;
                        });

                        opponentShips.forEach(ship => {
                            let direction = opponentShipsDirections[ship.id];
                            let strDirection = directions[parseInt(direction, 10)];
                            ship.dataset.direction = direction;
                            ship.src = Images[`${strDirection}${ship.id.charAt(8) + ship.id.slice(9)}Ship`];
                            setopponentOnPanel(ship);
                        });
                    }).catch(error => console.error(error));

                    off(opponentCellsRef, "value", onCellsCreated);

                }
            }
            onValue(opponentCellsRef, onCellsCreated);
        }
    }

    function getTempCells(curCell, ship, offset) {
        tempCells = [];
        let row = Math.floor((opponentCells.indexOf(curCell) / ROWS)) + 1;
        let col = Math.floor((opponentCells.indexOf(curCell) % COLS)) + 1;
        let index = Object.keys(opponentShipCells).indexOf(ship.id);
        let shipLength = shipsLengths[index];
        offset ??= Math.floor(shipLength / 2);
        let direction = +ship.dataset.direction; //convert the direction into numeric
        for (let i = 0; i < shipLength; i++) { //find the cells for the ship 
            tempCells.push(
                opponentCells.find(cell => cell.id === `opponent-cell-${row + (i - offset) * direction}-${col + (i - offset) * +!direction}`)
            );
        }
        tempCells = tempCells.filter(cell => cell !== undefined); //remove the undefined cells 
    }

    function isInBound(ship) {
        let index = Object.keys(opponentShipCells).indexOf(ship.id);
        return tempCells.length === shipsLengths[index];
    }
    function isCellsTaken() {
        tempCells.forEach(shipCell => {
            isTaken ||= +(shipCell.classList.contains('taken'));
        });
        return isTaken;
    }

    function placeShip(ship) {
        removeFrame(ship);

        if (!isInBound(ship) || isCellsTaken()) {  //Checks if cells not available --> move ship back to the container
            reset(ship);
            return "container";
        }
        else {
            setopponentOnPanel(ship);       //Checks if cells available --> set the ship on them and update ship's cells
            return "panel";
        }
    }

    function reset(ship) {
        ship.src = Images[`vertical${ship.id.charAt(8) + ship.id.slice(9)}Ship`];
        ship.dataset.direction = 1;
        opponentShipCells[ship.id] = [];
        tempCells = [];
        isTaken = 0;
    }

    function setopponentOnPanel(ship) {
        if (state.status !== 'solo') {
            setPositionCell = opponentShipCells[ship.id][0]; //Set position according the first cell
            ship.style.transform = `translate(${setPositionCell.offsetLeft}px, ${setPositionCell.offsetTop}px)`;
        } else {
            setPositionCell = tempCells[0]; //Set position according the first cell
            ship.style.transform = `translate(${setPositionCell.offsetLeft}px, ${setPositionCell.offsetTop}px)`;

            tempCells.forEach(cell => { cell.classList.add('original'); cell.dataset.ship = ship.id; }); //Mark the ship's cells as taken exclude frame

            captureFrame(ship);

            opponentShipCells[ship.id] = tempCells;
            opponentShipCells[ship.id].forEach(shipCell => {
                shipCell.classList.add('taken');
            }); //Mark the ship's cells as taken include frame

            tempCells = [];
        }
    }


    function captureFrame(ship) {
        let index = Object.keys(opponentShipCells).indexOf(ship.id);
        let row = Math.floor((opponentCells.indexOf(setPositionCell) / ROWS)) + 1;
        let col = Math.floor((opponentCells.indexOf(setPositionCell) % COLS)) + 1;
        let direction = +ship.dataset.direction;

        for (let i = row - 1; i <= row + (direction * shipsLengths[index]) + (1 - direction); i++) {
            for (let j = col - 1; j <= col + (+!direction * shipsLengths[index]) + (1 - +!direction); j++) {
                tempCells.push(
                    opponentCells.find(cell => cell.id === `opponent-cell-${i}-${j}` && !tempCells.includes(cell))
                );  //direction = 1 --> i between row - 1 to row + shipLength  , j between col - 1 to col + 1
                //direction = 0 --> i between row - 1 to row + 1 , j between col - 1 to col + shipLength
            }
        }
        tempCells = tempCells.filter(cell => cell !== undefined); //remove the undefined cells 
    }

    function removeFrame(ship) {
        let otherCells = [];
        for (let id in opponentShipCells) {
            if (id !== ship.id) {
                otherCells.push(...opponentShipCells[id]);
            }
        }
        opponentShipCells[ship.id].forEach(shipCell => { //Remove the taken cells at the moment ship is clicked
            if (!otherCells.includes(shipCell))
                shipCell.classList.remove('taken');
        });
    }

}