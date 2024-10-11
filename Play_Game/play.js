import { Images } from "../config.js";

const layout = document.querySelector('.layout');
let playerPanel = document.querySelector('.playerPanel');
let computerPanel = document.querySelector('.computerPanel');
const playerVerticalTargetLine = document.querySelector('.playerVerticalTargetLine');
const playerHorizontalTargetLine = document.querySelector('.playerHorizontalTargetLine');
const computerShips = document.querySelectorAll('.computer-ship');
const overlay = document.querySelector('.overlay ');
const winnerDialog = document.querySelector('.winnerDialog');
const winnerImg = document.getElementById('winner');
const newGameBtn = document.querySelectorAll('.newGame');
const closeBtn = document.querySelector('.closeButton');

const playerShipCells = { playerFirst: [], playerSecond: [], playerThird: [], playerFourth: [], playerFifth: [] };
const computerShipCells = { computerFirst: [], computerSecond: [], computerThird: [], computerFourth: [], computerFifth: [] };
const turnShipCells = [computerShipCells, playerShipCells]; //Refrence for using turn to get access
const cellStatus = {
    destroyed: 'destroyed',
    hited: 'hited',
    missed: 'missed',
    explosion: 'explosion',
    flame: 'flame'
};

const changeTurn = [computerTurn, playerTurn];

const rows = 15, cols = 15;
const computerCells = [];
let tempCells = [];
const directions = ['horizontal', 'vertical'];
const computerShipsHitedAmount = [0, 0, 0, 0, 0];
const playerShipsHitedAmount = [0, 0, 0, 0, 0];
const shipsHitedAmount = [computerShipsHitedAmount, playerShipsHitedAmount];
const counterDestroyed = [0, 0];
const shipsLengths = [3, 4, 4, 4, 5];
let randomMove = [-1, 1];
let move;
let isTaken = 0;
let turn = 0;  //if turn = 0 --> player turn - so access needed for the computer ships data.
let setPositionCell = null;
let isHited = false;
let hitDirection = null;
let lastCellHited = null;
let currentCell = null;


window.onload = function () {
    layout.classList.add('fade-out');
    setTimeout(() => {
        layout.classList.add('hidden');
        layout.classList.remove('fade-out');
    }, 1000);

}

const shipCellsById = JSON.parse(sessionStorage.getItem('shipCellsId'));
const panelData = JSON.parse(sessionStorage.getItem('panelData'));
playerPanel.innerHTML += panelData['html']; //Set the player panel from the strategy panel

const computerVerticalTargetLine = document.querySelector('.computerVerticalTargetLine');
const computerHorizontalTargetLine = document.querySelector('.computerHorizontalTargetLine');
computerHorizontalTargetLine.style.top = '0px';  //Have to initilize for animation works
computerVerticalTargetLine.style.left = '0px';


const playerShips = document.querySelectorAll('.player-ship');
const playerCells = [...document.querySelectorAll('.player-cell')];


Object.keys(shipCellsById).forEach(ship => { //Reconstruct the cells for each ship 
    shipCellsById[ship].forEach(id => {
        let foundCell = playerCells.find(cell => cell.id === id);
        playerShipCells[ship].push(foundCell)
    })
});


setPlayerOnPanel();
createComputerPanel();
shuffle();

newGameBtn.forEach(btn => {
    btn.addEventListener('click', () => {
        winnerDialog.close();
        layout.classList.remove('hidden');
        layout.classList.add('fade-in');
        setTimeout(function () {
            window.location.href = "/Strategy_Panel/index.html";
        }, 1000);
    });
});

[closeBtn, overlay].forEach(btn => {
    btn.addEventListener('click', () => {
        winnerDialog.classList.remove('displaySetting');
        winnerDialog.close();
        overlay.classList.add('hidden');
    });
});

computerPanel.addEventListener('mousemove', (e) => {   //Target animation
    let x = e.clientX - computerPanel.offsetLeft;
    let y = e.clientY - computerPanel.offsetTop;
    playerVerticalTargetLine.style.left = `${x}px`;
    playerHorizontalTargetLine.style.top = `${y}px`;

    playerVerticalTargetLine.classList.remove('hidden');
    playerHorizontalTargetLine.classList.remove('hidden');

    currentCell = e.target;
    currentCell.classList.contains('computer-cell') && (
        currentCell.addEventListener('mousemove', cellMouseMove),
        currentCell.addEventListener('mouseleave', cellMouseLeave),
        currentCell.addEventListener('click', cellClick)
    );

});

computerPanel.addEventListener('mouseleave', () => {  //Hide the target animation while leaving the panel
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
        gameOver();
    }
}

async function makeShot(cell) {
    let status = null;
    if (!cell.classList.contains('original')) {
        status = 'missed';
        changeCellStatus(cell, cellStatus['missed']);
        changeTurn[turn]();
    }
    else {
        status = 'hited';

        computerPanel.style.pointerEvents = 'none'; //Prevent the player from shoot until the animation over

        cell.style.zIndex = '2000'; //Make cell be in the front

        changeCellStatus(cell, cellStatus['hited']); //Hit animation

        await delay(500);

        changeCellStatus(cell, cellStatus['flame']); //Flame animation

        let ship = cell.dataset.ship;
        let index = Object.keys(turnShipCells[turn]).indexOf(ship);
        shipsHitedAmount[turn][index]++;

        if (turn === 0) {  //Add flame affect in the computer fleet
            const markup = `
                   <img
                    src= ${Images.flame}
                  />
                     `;
            document.querySelector(`.${ship}StatusContainer`).insertAdjacentHTML('beforeend', markup);
        }

        if (shipsHitedAmount[turn][index] === shipsLengths[index]) {   //Make the explosion affect
            status = 'destroyed';
            counterDestroyed[turn]++;

            for (const cell of turnShipCells[turn][ship]) {
                if (!cell.classList.contains('original')) changeCellStatus(cell, cellStatus['missed']);
                else {
                    changeCellStatus(cell, cellStatus['explosion']);
                    setTimeout(() => {
                        changeCellStatus(cell, cellStatus['destroyed']);
                    }, 700);
                }
            }

            if (turn === 0) {
                document.querySelector(`.${ship}StatusContainer`).innerHTML = '';
                document.getElementById(`${ship}Status`).src = Images[`${ship}Sunk`];
            }

            ship = document.getElementById(`${ship}`);
            ship.classList.add('hidden');

        }

        computerPanel.style.pointerEvents = ''; //Allow the player to shoot again
    }
    return status;
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function changeCellStatus(cell, status) {
    cell.classList.add(status);
}

async function computerTurn() {
    playerPanel.classList.remove('deactive');
    computerPanel.classList.add('deactive');

    playerVerticalTargetLine.classList.add('hidden');
    playerHorizontalTargetLine.classList.add('hidden');

    turn = +!turn;

    await delay(1000);

    let status;
    let cell;

    do {
        while (!isCellAvailable(cell)) //Keep choosing cell until it was available
            cell = chooseCell();

        locateCell(cell);   //Make animation

        await delay(1000); //Let the locating done before make the shot

        status = await makeShot(cell);

        if (status === 'hited') { //Ship hited
            let ship = document.getElementById(`${cell.dataset.ship}`);
            hitDirection = isHited && +ship.dataset.direction; //if isHited = true --> hitDirection get direction
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
            computerShips.forEach(ship => {
                if (!computerShipCells[ship.id][0].classList.contains('destroyed'))
                    ship.classList.remove('hidden')
            });

            gameOver();
            break;
        }
    }
    while (cell.classList.contains('hited')); //Computer keeps shooting until it missed
}

function chooseCell() {
    let cell;
    let row = Math.floor((playerCells.indexOf(lastCellHited) / rows)) + 1;
    let col = Math.floor((playerCells.indexOf(lastCellHited) % cols)) + 1;

    if (isHited && hitDirection !== false) {
        if (lastCellHited.classList.contains('missed')) randomMove = randomMove.filter(number => number !== move); //Make the computer choose the right direction after missed
        move = randomMove[Math.floor(Math.random() * randomMove.length)];
        cell = playerCells.find(cell => cell.id === `player-cell-${row + (move * hitDirection)}-${col + (move * +!hitDirection)}`);
        lastCellHited = cell || lastCellHited; //if cell = undefined lastCellHited equlas to lastCellHited, otherwise to cell
    }
    else if (isHited) {
        let randDirection = Math.floor(Math.random() * randomMove.length);
        move = randomMove[Math.floor(Math.random() * randomMove.length)];
        cell = playerCells.find(cell => cell.id === `player-cell-${row + (move * randDirection)}-${col + (move * +!randDirection)}`);

    } else {
        let randCellNumber = Math.floor(Math.random() * rows * cols);            //Choose random cell
        cell = playerCells[randCellNumber];
    }
    return cell;

}

function gameOver() {
    playerPanel.classList.add('deactive');
    computerPanel.classList.add('deactive');
    overlay.classList.remove('hidden');
    winnerDialog.classList.add('displaySetting');
    winnerImg.src = Images[`Winner${turn}`];

    winnerDialog.show();
}

function isCellAvailable(cell) {
    return cell !== undefined && !cell.classList.contains('missed') && !cell.classList.contains('hited');
}

function locateCell(randCell) {
    let cellSize = randCell.getBoundingClientRect();
    computerHorizontalTargetLine.classList.remove('hidden'); //Prepare for animation
    computerVerticalTargetLine.classList.remove('hidden');
    computerHorizontalTargetLine.style.transition = 'all 1s ease-in-out';
    computerVerticalTargetLine.style.transition = 'all 1s ease-in-out';

    computerHorizontalTargetLine.style.top = `${randCell.offsetTop + (cellSize.height / 2)}px`;
    computerVerticalTargetLine.style.left = `${randCell.offsetLeft + (cellSize.width / 2)}px`;
}

function playerTurn() {
    turn = +!turn;
    playerPanel.classList.add('deactive');
    computerPanel.classList.remove('deactive');
}


function setPlayerOnPanel() {
    playerShips.forEach(ship => {
        setPositionCell = playerShipCells[ship.id][0]; //Set position according the first cell
        ship.style.transform = `translate(${setPositionCell.offsetLeft}px, ${setPositionCell.offsetTop}px)`;
    });
}

function createComputerPanel() {
    for (let row = 1; row <= rows; row++) {
        for (let col = 1; col <= cols; col++) {
            const div = document.createElement('div');
            div.className = 'computer-cell';
            div.id = `computer-cell-${row}-${col}`;
            computerCells.push(div);
            computerPanel.appendChild(div);
        }
    }
}

function shuffle() {
    computerShips.forEach(ship => {
        ship.style.pointerEvents = 'none';   // Make the ship goes to the background
        let set;
        do {
            let randCellNumber = Math.floor(Math.random() * rows * cols);
            let randCell = computerCells[randCellNumber];
            let randDirection = Math.floor(Math.random() * 2);
            let strDirection = directions[randDirection];
            ship.dataset.direction = randDirection;
            ship.src = Images[`${strDirection}${ship.id.charAt(8) + ship.id.slice(9)}Ship`];

            getTempCells(randCell, ship);
            set = placeShip(ship);
        }
        while (set === 'container');
    });
}

function getTempCells(curCell, ship, offset) {
    tempCells = [];
    let row = Math.floor((computerCells.indexOf(curCell) / rows)) + 1;
    let col = Math.floor((computerCells.indexOf(curCell) % cols)) + 1;
    let index = Object.keys(computerShipCells).indexOf(ship.id);
    let shipLength = shipsLengths[index];
    offset ??= Math.floor(shipLength / 2);
    let direction = +ship.dataset.direction; //convert the direction into numeric
    for (let i = 0; i < shipLength; i++) { //find the cells for the ship 
        tempCells.push(
            computerCells.find(cell => cell.id === `computer-cell-${row + (i - offset) * direction}-${col + (i - offset) * +!direction}`)
        );
    }
    tempCells = tempCells.filter(cell => cell !== undefined); //remove the undefined cells 
}

function isInBound(ship) {
    let index = Object.keys(computerShipCells).indexOf(ship.id);
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
        setComputerOnPanel(ship);       //Checks if cells available --> set the ship on them and update ship's cells
        return "panel";
    }
}

function reset(ship) {
    ship.src = Images[`vertical${ship.id.charAt(8) + ship.id.slice(9)}Ship`];
    ship.dataset.direction = 1;
    computerShipCells[ship.id] = [];
    tempCells = [];
    isTaken = 0;
}

function setComputerOnPanel(ship) {
    setPositionCell = tempCells[0]; //Set position according the first cell
    ship.style.transform = `translate(${setPositionCell.offsetLeft}px, ${setPositionCell.offsetTop}px)`;

    tempCells.forEach(cell => { cell.classList.add('original'); cell.dataset.ship = ship.id; }); //Mark the ship's cells as taken exclude frame

    captureFrame(ship);

    computerShipCells[ship.id] = tempCells;
    computerShipCells[ship.id].forEach(shipCell => {
        shipCell.classList.add('taken');
    }); //Mark the ship's cells as taken include frame

    tempCells = [];
}


function captureFrame(ship) {
    let index = Object.keys(computerShipCells).indexOf(ship.id);
    let row = Math.floor((computerCells.indexOf(setPositionCell) / rows)) + 1;
    let col = Math.floor((computerCells.indexOf(setPositionCell) % cols)) + 1;
    let direction = +ship.dataset.direction;

    for (let i = row - 1; i <= row + (direction * shipsLengths[index]) + (1 - direction); i++) {
        for (let j = col - 1; j <= col + (+!direction * shipsLengths[index]) + (1 - +!direction); j++) {
            tempCells.push(
                computerCells.find(cell => cell.id === `computer-cell-${i}-${j}` && !tempCells.includes(cell))
            );  //direction = 1 --> i between row - 1 to row + shipLength  , j between col - 1 to col + 1
            //direction = 0 --> i between row - 1 to row + 1 , j between col - 1 to col + shipLength
        }
    }
    tempCells = tempCells.filter(cell => cell !== undefined); //remove the undefined cells 
}

function removeFrame(ship) {
    let otherCells = [];
    for (let id in computerShipCells) {
        if (id !== ship.id) {
            otherCells.push(...computerShipCells[id]);
        }
    }
    computerShipCells[ship.id].forEach(shipCell => { //Remove the taken cells at the moment ship is clicked
        if (!otherCells.includes(shipCell))
            shipCell.classList.remove('taken');
    });
}

