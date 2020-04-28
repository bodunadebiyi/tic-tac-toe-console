const myArgs = process.argv.slice(2);
const delay = getArgs('delay', 2000);
const gridSize = getArgs('gridSize', 3);
const player1 = getArgs('player1', 'X');
const player2 = getArgs('player2', '0');

let { gridMatrix, gridMatrixIndexes: possiblePositions } = initializeGrid(gridSize);
const winPatterns = generateWinPattern(gridSize)

let currentPlayer = player1;
let gameOver = false;

function initializeGrid(size) {
    const gridMatrix = [];
    const gridMatrixIndexes = []

    for (let i=0; i < (size ** 2); i++) {
        gridMatrix.push('');
        gridMatrixIndexes.push(i);
    }

    return { gridMatrix, gridMatrixIndexes }
}

function generateWinPattern(gSize) {
    const horizontalPatterns = [];
    const verticalPatterns = [];
    const diagonalPatterns = [];

    for (let i=0; i < gSize; i++) {
        let hPattern = [];
        let vPattern = [];
        let dPattern = [];
        let gridLevel = i * gSize;

        for (let y=0; y < gSize; y++) {
            hPattern.push(y + gridLevel);
            vPattern.push(i + (y * gSize))

            if (i === 0) {
                dPattern.push((y * gSize) + y)
            }

            if (i === gSize - 1) {
                dPattern.push((gSize - 1) * (y + 1))
            }
        }

        horizontalPatterns.push(hPattern);
        verticalPatterns.push(vPattern);

        if (dPattern.length) diagonalPatterns.push(dPattern);
    }

    return [
        ...horizontalPatterns,
        ...verticalPatterns,
        ...diagonalPatterns
    ]
}

function getArgs(argName, defaultValue) {
    const foundArg = ((myArgs.find(e => e.includes(`--${argName}`)) || '')
        .match(/--.*=(.)/) || [])[1];

    if (!foundArg) return defaultValue;

    return Number.isNaN(Number(foundArg)) ? foundArg : +foundArg;
}

function checkIfWinPatternMatches(winPattern, playerPattern) {
    return winPattern.every(e => playerPattern.includes(e))
}

function getCurrentPlayerPattern(matrix, player) {
    const playerPattern = [];
    matrix.forEach((e, i) => {
        if (e === player) playerPattern.push(i);
    })

    return playerPattern;
}

function renderGrid() {
    let grid = '';

    gridMatrix.forEach((element, index) => {
        grid += `| ${element || " "} `;

        if ((index + 1) % gridSize === 0) {
            grid += '|\n';
        }
    })

    console.log(grid);
}

function pickRandomPosition(positions) {
    return Math.floor(Math.random() * positions.length);
}

function checkForWinner() {
    const currentPlayerPattern = getCurrentPlayerPattern(gridMatrix, currentPlayer);
    if (currentPlayerPattern.length < 3) return; 

    winPatterns.forEach(winPattern => {
        if (checkIfWinPatternMatches(winPattern, currentPlayerPattern)) {
            gameOver = true;
            console.log('GAME OVER, winner is ' + currentPlayer);
        }
    })
}

function checkIfGameIsOver() {
    if (gameOver) return;
    const noAvailablePosition = gridMatrix.filter(e => e !== '').length === gridSize ** 2;
    const noPossibleMovesToPlay = possiblePositions.length === 0;

    if (noAvailablePosition || noPossibleMovesToPlay) {
        gameOver = true;
        console.log('Game over! There is no winner')
    }
}

function pickRandomChoiceAndUpdateGridMatrix() {
    const randomPosition = possiblePositions[pickRandomPosition(possiblePositions)]
    possiblePositions = possiblePositions.filter((e) => e !== randomPosition);
    gridMatrix[randomPosition] = currentPlayer === player1 ? player1 : player2;
}

function updateCurrentPlayer() {
    currentPlayer = currentPlayer === player1 ? player2 : player1;
}

function runGame() {
    if (gameOver) {
        return;
    }

    console.log(`player ${currentPlayer} is playing...`);

    pickRandomChoiceAndUpdateGridMatrix();
    renderGrid();
    checkForWinner();
    checkIfGameIsOver();
    updateCurrentPlayer();

    setTimeout(runGame, delay);
}


runGame();