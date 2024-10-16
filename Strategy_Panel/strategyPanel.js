import { Images } from "../config.js";

const layout = document.querySelector('.layout');
const panel = document.querySelector('.panel');
const front = document.querySelector('.front');
const container = document.querySelector('.container');
const shuffleBtn = document.getElementById('shuffleBtn');
const rotateBtn = document.getElementById('rotateBtn');
const clearBtn = document.getElementById('clearBtn');
const playBtn = document.getElementById('playBtn');

let rows = 15;
let cols = 15;
const cells = [];
let shipCells = {
    playerFirst: [], playerSecond: [], playerThird: [], playerFourth: [], playerFifth: []
};
const ships = document.querySelectorAll('.player-ship');
const shipsLengths = [3, 4, 4, 4, 5];
const directions = ['horizontal', 'vertical'];
let currentCell = null, setPositionCell = null, isTaken = 0, prevShip = null, curShip = null, tempCells = [];
let shipSize = null;
let x, y;

window.onload = function () {
    layout.classList.add('fade-out');
    setTimeout(() => {
        layout.classList.add('hidden');
        layout.classList.remove('fade-out');
    }, 1000);
}

createStrategyPanel();

ships.forEach(ship => {
    ship.dataset.direction = 1;
    ship.style.zIndex = '1000';
    ship.addEventListener('mousedown', (e) => {
        e.preventDefault();
        prevShip = curShip;
        if (prevShip) {
            shipCells[prevShip.id].forEach(shipCell => {
                shipCell.classList.remove('current');
            });
        }
        curShip = ship;
        ships.forEach(ship => { ship.style.pointerEvents = 'none' });   // Make the ship goes to the background
        prepareShip(ship);  //Prepare ship for set to the panel

        shipSize = ship.getBoundingClientRect();
        x = e.clientX - (shipSize.width / 2);                  //Set the ship starting position while clicking on it
        y = e.clientY - (shipSize.height / 2);
        ship.style.transform = `translate(${x}px, ${y}px)`;

        removeFrame(ship);  //Remove the frame cells of the current ship while click it

        function onMouseMove(event) {
            event.preventDefault();
            x = event.clientX - (shipSize.width / 2);
            y = event.clientY - (shipSize.height / 2);             //Move the ship with the cursor
            ship.style.transform = `translate(${x}px, ${y}px)`;
        }

        function onMouseUp(event) {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);         //remove all listeners for avoiding collapse
            panel.removeEventListener('mousemove', onMouseHover);

            ships.forEach(ship => { ship.style.pointerEvents = 'auto' });   // Make the ship goes to the foreground

            let set = placeShip(ship);  //Place the ship
            set === 'panel' && (rotateBtn.classList.remove('hidden'), shipCells[curShip.id].forEach(shipCell => {
                shipCell.classList.add('current'); //Allow rotate after dragging ship and mark the current ship frame
            }));

            container.children.length === 0 && playBtn.classList.remove('hidden');

        }

        function onMouseHover(e) {
            currentCell = e.target;
            getTempCells(currentCell, ship); //Get the cells to fit the ship in
            tempCells.forEach(shipCell => { shipCell.classList.add('drag-over') });

            function onMouseLeave() {
                tempCells.forEach(shipCell => { shipCell.classList.remove('drag-over') });
                tempCells = [];
            }
            currentCell && (currentCell.addEventListener('mouseleave', onMouseLeave));
        }
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        panel.addEventListener('mousemove', onMouseHover);

    });
});

function createStrategyPanel() {
    for (let row = 1; row <= rows; row++) {
        for (let col = 1; col <= cols; col++) {
            const div = document.createElement('div');
            div.className = 'player-cell';
            div.id = `player-cell-${row}-${col}`;
            cells.push(div);
            panel.appendChild(div);
        }
    }
}

function prepareShip(ship) {
    ship.style.position = 'absolute';
    front.appendChild(ship); //For clicking again on the ship after it appends to the panel without destryoing its position
}

function getTempCells(curCell, ship, offset) {
    tempCells = [];
    let row = Math.floor((cells.indexOf(curCell) / rows)) + 1;
    let col = Math.floor((cells.indexOf(curCell) % cols)) + 1;
    let index = Object.keys(shipCells).indexOf(ship.id);
    let shipLength = shipsLengths[index];
    offset ??= Math.floor(shipLength / 2);
    let direction = +ship.dataset.direction; //convert the direction into numeric
    for (let i = 0; i < shipLength; i++) { //find the cells for the ship 
        tempCells.push(
            cells.find(cell => cell.id === `player-cell-${row + (i - offset) * direction}-${col + (i - offset) * +!direction}`)
        )
    }
    tempCells = tempCells.filter(cell => cell !== undefined); //remove the undefined cells 
}

function isInBound(ship) {
    let index = Object.keys(shipCells).indexOf(ship.id);
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

    tempCells.forEach(cell => { cell.classList.remove('drag-over') }); //Remove the drag-over style from the temporary cells;

    if (!isInBound(ship) || isCellsTaken()) {
        backToContainer(ship);   //Checks if cells not available --> move ship back to the container4
        return "container";
    }
    else {
        setOnPanel(ship);       //Checks if cells available --> set the ship on them and update ship's cells
        return "panel";
    }
}

function backToContainer(ship) {
    x = 0;
    y = 0;
    container.appendChild(ship);
    ship.src = Images[`vertical${ship.id.charAt(6) + ship.id.slice(7)}Ship`];
    ship.style.transform = `translate(${x}px, ${y}px)`;
    ship.style.position = 'relative';
    ship.dataset.direction = 1;

    removeFrame(ship);

    shipCells[ship.id] = [];
    tempCells = [];
    isTaken = 0;
    curShip = null;
    currentCell = null;
    setPositionCell = null;
    shipSize = null;

    rotateBtn.classList.add('hidden');
    playBtn.classList.add('hidden');
}

function setOnPanel(ship) {
    panel.appendChild(ship);
    setPositionCell = tempCells[0]; //Set position according the first cell
    ship.style.transform = `translate(${setPositionCell.offsetLeft}px, ${setPositionCell.offsetTop}px)`;

    tempCells.forEach(cell => { cell.classList.add('original'); cell.dataset.ship = ship.id; }); //Mark the ship's cells as taken exclude frame

    captureFrame(ship);

    shipCells[ship.id] = tempCells.map(shipCell => {    //Mark the ship's cells as taken include frame
        shipCell.classList.add('taken');
        // shipCell.dataset.ship = ship.id;
        return shipCell;
    });

    tempCells = [];
}

function captureFrame(ship) {
    let index = Object.keys(shipCells).indexOf(ship.id);
    // let cellsArray = Array.from(cells);
    let row = Math.floor((cells.indexOf(setPositionCell) / rows)) + 1;
    let col = Math.floor((cells.indexOf(setPositionCell) % cols)) + 1;
    let direction = +ship.dataset.direction;

    for (let i = row - 1; i <= row + (direction * shipsLengths[index]) + (1 - direction); i++) {
        for (let j = col - 1; j <= col + (+!direction * shipsLengths[index]) + (1 - +!direction); j++) {
            tempCells.push(
                cells.find(cell => cell.id === `player-cell-${i}-${j}` && !tempCells.includes(cell))
            );  //direction = 1 --> i between row - 1 to row + shipLength  , j between col - 1 to col + 1
            //direction = 0 --> i between row - 1 to row + 1 , j between col - 1 to col + shipLength
        }
    }
    tempCells = tempCells.filter(cell => cell !== undefined); //remove the undefined cells 
}

function removeFrame(ship) {
    let otherCells = [];
    for (const [shipId, cells] of Object.entries(shipCells)) {  //Get all the cells exclude the chosen ship cells
        if (shipId !== ship.id)
            otherCells.push(...cells);
    }

    shipCells[ship.id].forEach(shipCell => { //Remove the taken cells at the moment ship is clicked
        shipCell.classList.remove('current');

        if (!otherCells.includes(shipCell)) {
            shipCell.classList.remove('taken');
            shipCell.classList.remove('original');
            shipCell.removeAttribute(`data-ship`);
        }
    });
}

function rotate() {
    if (curShip) {
        let numDirection = +curShip.dataset.direction;
        numDirection = +!numDirection;
        curShip.dataset.direction = numDirection; //1 = Vertical, 0 = Horizontal
        let strDirection = directions[numDirection];

        getTempCells(shipCells[curShip.id][0], curShip, 0); //rotate from the top cell or from the left cell
        prepareShip(curShip);
        curShip.src = Images[`${strDirection}${curShip.id.charAt(6) + curShip.id.slice(7)}Ship`];
        let status = placeShip(curShip);
        status === 'panel' && shipCells[curShip.id].forEach(shipCell => {
            shipCell.classList.add('current');
        });

    }
}

function clear() {
    ships.forEach(ship => {
        ship.parentElement === panel && backToContainer(ship);
    });
}

const waitForImageToLoad = function (ship) {
    return new Promise((resolve, reject) => {
        ship.onload = () => resolve();  // Resolve the promise when the image loads
    });
}
async function shuffle() {
    for (const ship of ships) {
        let set;
        do {
            let randCellNumber = Math.floor(Math.random() * rows * cols);
            let randCell = cells[randCellNumber];
            let randDirection = Math.floor(Math.random() * 2);
            let strDirection = directions[randDirection];
            ship.dataset.direction = randDirection;
            ship.src = Images[`${strDirection}${ship.id.charAt(6).toUpperCase() + ship.id.slice(7)}Ship`];

            await waitForImageToLoad(ship);

            getTempCells(randCell, ship);
            prepareShip(ship);
            set = placeShip(ship);
        }
        while (set === 'container');
    }
    playBtn.classList.remove('hidden');
}

function play() {
    const childrenHTML = [];
    const serializedShipCells = {
        playerFirst: [], playerSecond: [], playerThird: [], playerFourth: [], playerFifth: []
    };

    Array.from(panel.children).forEach(child => {
        childrenHTML.push(child.outerHTML);
    });
    const panelChildrenHTML = childrenHTML.join('');

    sessionStorage.setItem('panelData', JSON.stringify({
        html: panelChildrenHTML,
    }));

    Object.keys(shipCells).forEach(ship => { shipCells[ship].forEach(cell => { serializedShipCells[ship].push(cell.id) }) });
    sessionStorage.setItem('shipCellsId', JSON.stringify(serializedShipCells));


    layout.classList.remove('hidden');
    layout.classList.add('fade-in');
    setTimeout(function () {
        window.location.href = "/Play_Game/index.html";
    }, 1000);
}

let timer;
let easterEggActive = 0;
function eyalEasterEgg() {
    timer = setTimeout(() => {
        easterEggActive ? clearBtn.style.backgroundImage = `url(${Images["clear"]})` : clearBtn.style.backgroundImage = `url(${Images["eyal"]})`;
        easterEggActive = +!easterEggActive;
    }, 3000);
}

function releaseTimer() {
    clearTimeout(timer);
}

shuffleBtn.addEventListener('click', shuffle);
rotateBtn.addEventListener('click', rotate);
clearBtn.addEventListener('click', clear);
clearBtn.addEventListener('mousedown', eyalEasterEgg);
clearBtn.addEventListener('mouseup', releaseTimer);
playBtn.addEventListener('click', play);