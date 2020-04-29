const chalk = require('chalk');
const {
    userInputIsValid,
    grey,
    generateWinPattern,
    initializeGrid,
    getArgs,
    checkIfWinPatternMatches 
} = require('./helpers');
const delay = getArgs('delay', 2000);
let gridSize = getArgs('gridSize', 3);
const humanGamePlay = getArgs('humanGamePlay', false, true);
const playWithRemotePlayer = getArgs('playWithRemotePlayer', false, true);
const player1 = getArgs('player1', 'X');
const player2 = getArgs('player2', 'O');
const port = getArgs('port', false);
const host = getArgs('host', false);
const readlineSync = require('readline-sync');
const net = require('net');

let firstTimeRunning = true;
let { gridMatrix, gridMatrixIndexes: possiblePositions } = initializeGrid(gridSize);
let winPatterns = generateWinPattern(gridSize)

let currentPlayer = player1;
let gameOver = false;
let hasRecievedGameState = false;


function getCurrentPlayerPattern(matrix, player) {
    const playerPattern = [];
    matrix.forEach((e, i) => {
        if (e === player) playerPattern.push(i);
    })

    return playerPattern;
}

function colorize(element) {
    return element === player1 ? chalk.red.bold(element) : chalk.green.bold(element);
}

function printGameOverMessage(winner) {
    console.log('GAME OVER, winner is ' + colorize(winner));
}

function renderGrid() {
    let grid = '';

    gridMatrix.forEach((element, index) => {
        grid += '|';
        grid += element ? `  ${colorize(element)}  ` : (index > 9 ? ` ${grey(index)}  ` : `  ${grey(index)}  `)

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
            printGameOverMessage(currentPlayer);
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
    const randomChoice = possiblePositions[pickRandomPosition(possiblePositions)]
    processSelectedChoice(randomChoice);
}

function processSelectedChoice(selectedChoice) {   
    possiblePositions = possiblePositions.filter((e) => e !== selectedChoice);
    gridMatrix[selectedChoice] = currentPlayer === player1 ? player1 : player2;
}

function updateCurrentPlayer() {
    currentPlayer = currentPlayer === player1 ? player2 : player1;
}

function acceptAndProcessUserInput() {
    const userInput = +readlineSync.question(`Player ${colorize(currentPlayer)} choose from the available options:: `)
    
    if (userInputIsValid(userInput, possiblePositions)) {
        processSelectedChoice(userInput);
        return userInput;
    } else {
       return acceptAndProcessUserInput()
    }
}

function displayWhoIsCurrentlyPlaying() {
    console.log(`Player ${colorize(currentPlayer)} is playing...`);
}

function processPlayerGamePlay() {
    renderGrid();
    checkForWinner();
    checkIfGameIsOver();

    if (!gameOver) updateCurrentPlayer();
}

function processPlayer1GamePlay(serverSocket, server) {
    displayWhoIsCurrentlyPlaying();
    const userInput = String(acceptAndProcessUserInput());

    serverSocket.write(userInput);
    processPlayerGamePlay(server)
    if (gameOver) {
        server.close();
    } else {
        displayWhoIsCurrentlyPlaying();
    }
}

function processPlayer2GamePlay(client) {
    displayWhoIsCurrentlyPlaying();
    const userInput = String(acceptAndProcessUserInput());

    client.write(userInput)
    processPlayerGamePlay()
    if (gameOver) client.destroy();
}

function createGameServer() {
    console.log('Game server running, waiting for player 2 to connect')
    let serverSocket = null;

    const server = net.createServer(function(socket) {
        serverSocket = socket;
        socket.write(JSON.stringify({
            gridMatrix, possiblePositions, winPatterns,
            gridSize
        }));
        socket.on('data', function(data) {
            processSelectedChoice(+data);
            processPlayerGamePlay(server);
            
            if (gameOver) {
                server.close();
            } else {
                processPlayer1GamePlay(socket, server);
            }
        })
    });
    
    server.listen(1337, '0.0.0.0');

    server.on('connection', function() {
        console.log('player 2 has connected');

        renderGrid();
        processPlayer1GamePlay(serverSocket, server);
    })
}

function createGameClient() {
    const client = new net.Socket();

    client.connect(+port, host, function() {
        console.log('You are connected with player1');
        displayWhoIsCurrentlyPlaying();
    })

    client.on('data', function(data) {
        if (!hasRecievedGameState) {
            const gameState = JSON.parse(data);
            gridMatrix = gameState.gridMatrix;
            possiblePositions = gameState.possiblePositions;
            winPatterns = gameState.winPatterns;
            gridSize = gameState.gridSize;

            hasRecievedGameState = true;
            renderGrid();
            return;
        }

        processSelectedChoice(+data);
        processPlayerGamePlay(client);

        if (gameOver) {
            client.destroy();
        } else {
            processPlayer2GamePlay(client);
        }
    })

    client.on('error', function() {
        console.log('Unable to connect with player 1')
    })
}

function runGame() {
    if (gameOver) {
        return;
    }

    if (firstTimeRunning) {
        firstTimeRunning = false;
        renderGrid();
    } else {
        displayWhoIsCurrentlyPlaying();

        if (humanGamePlay) {
            acceptAndProcessUserInput();
        } else {
            pickRandomChoiceAndUpdateGridMatrix();
        }

        renderGrid();
        checkForWinner();
        checkIfGameIsOver();
        updateCurrentPlayer();
    }


    setTimeout(runGame, humanGamePlay ? 0 : delay);
}

function startGame() {
    if (playWithRemotePlayer) {
        createGameServer();
    } else if (port && host) {
        createGameClient();
    } else {
        runGame();
    }
}


startGame();

