const chalk = require('chalk');
const readlineSync = require('readline-sync');
const net = require('net');
const {
    userInputIsValid,
    grey,
    generateWinPattern,
    initializeGrid,
    getArgs,
    checkIfWinPatternMatches,
    getCurrentPlayerPattern,
    pickRandomPosition
} = require('./helpers');

const defaultGridSize = 3;
const defaultDelay = 2000;

const player1 = getArgs('player1', 'X');
const player2 = getArgs('player2', 'O');

const gameOptions = {
    NO_DELAY: 0,
    DELAY: getArgs('delay', defaultDelay),
    GRID_SIZE: getArgs('gridSize', defaultGridSize),
    HUMAN_GAME_PLAY: getArgs('humanGamePlay', false, true),
    PLAY_WITH_REMOTE_PLAYER: getArgs('playWithRemotePlayer', false, true),
    PORT: getArgs('port', false),
    HOST: getArgs('host', false),
}

const gameState = {
    firstTimeRunning: true,
    winPatterns: generateWinPattern(gameOptions.GRID_SIZE),
    currentPlayer: player1,
    gameOver: false,
    hasRecievedGameState: false,
    ...initializeGrid(gameOptions.GRID_SIZE)
}


function colorize(element) {
    return element === player1 ? chalk.red.bold(element) : chalk.green.bold(element);
}

function printGameOverMessage(winner) {
    console.log('GAME OVER, winner is ' + colorize(winner));
}

function renderGrid() {
    let grid = '';
    const { gridMatrix } = gameState;
    const { GRID_SIZE } = gameOptions;

    gridMatrix.forEach((element, index) => {
        grid += '|';
        grid += element ? `  ${colorize(element)}  ` : (index > 9 ? ` ${grey(index)}  ` : `  ${grey(index)}  `)

        if ((index + 1) % GRID_SIZE === 0) {
            grid += '|\n';
        }
    })

    console.log(grid);
}

function checkForWinner() {
    const { gridMatrix, currentPlayer, winPatterns } = gameState;
    const currentPlayerPattern = getCurrentPlayerPattern(gridMatrix, currentPlayer);
    if (currentPlayerPattern.length < 3) return; 

    winPatterns.forEach(winPattern => {
        if (checkIfWinPatternMatches(winPattern, currentPlayerPattern)) {
            gameState.gameOver = true;
            printGameOverMessage(currentPlayer);
        }
    })
}

function checkIfGameIsOver() {
    if (gameState.gameOver) return;

    const { gridMatrix, possiblePositions } = gameState;
    const { GRID_SIZE } = gameOptions;
    const noAvailablePosition = gridMatrix.filter(e => e !== '').length === GRID_SIZE ** 2;
    const noPossibleMovesToPlay = possiblePositions.length === 0;

    if (noAvailablePosition || noPossibleMovesToPlay) {
        gameState.gameOver = true;
        console.log('Game over! There is no winner')
    }
}

function pickRandomChoiceAndUpdateGridMatrix() {
    const { possiblePositions } = gameState;
    const randomChoice = possiblePositions[pickRandomPosition(possiblePositions)]
    processSelectedChoice(randomChoice);
}

function processSelectedChoice(selectedChoice) {   
    const { possiblePositions, currentPlayer } = gameState;
    gameState.possiblePositions = possiblePositions.filter((e) => e !== selectedChoice);
    gameState.gridMatrix[selectedChoice] = currentPlayer === player1 ? player1 : player2;
}

function updateCurrentPlayer() {
    const { currentPlayer } = gameState;
    gameState.currentPlayer = currentPlayer === player1 ? player2 : player1;
}

function acceptAndProcessUserInput() {
    const { currentPlayer, possiblePositions } = gameState;
    const userInput = +readlineSync.question(`Player ${colorize(currentPlayer)} choose from the available options:: `)
    
    if (userInputIsValid(userInput, possiblePositions)) {
        processSelectedChoice(userInput);
        return userInput;
    } else {
       return acceptAndProcessUserInput()
    }
}

function displayWhoIsCurrentlyPlaying() {
    const { currentPlayer } = gameState;
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
    if (gameState.gameOver) {
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
    if (gameState.gameOver) client.destroy();
}

function createGameServer() {
    console.log('Game server running, waiting for player 2 to connect')
    let serverSocket = null;

    const server = net.createServer(function(socket) {
        const { gridMatrix, possiblePositions, winPatterns, gridSize } = gameState;
        serverSocket = socket;
        socket.write(JSON.stringify({
            gridMatrix, possiblePositions, winPatterns,
            gridSize
        }));
        socket.on('data', function(data) {
            processSelectedChoice(+data);
            processPlayerGamePlay(server);
            
            if (gameState.gameOver) {
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
        if (!gameState.hasRecievedGameState) {
            const state = JSON.parse(data);
            gameState = {
                ...state,
                hasRecievedGameState: true,
            }

            renderGrid();
            return;
        }

        processSelectedChoice(+data);
        processPlayerGamePlay(client);

        if (gameState.gameOver) {
            client.destroy();
        } else {
            processPlayer2GamePlay(client);
        }
    })

    client.on('error', function() {
        console.log('Unable to connect with player 1')
    })
}

function runOfflineGame() {
    const { gameOver, firstTimeRunning } = gameState;
    const { HUMAN_GAME_PLAY, DELAY, NO_DELAY } = gameOptions;

    if (gameOver) return;

    if (firstTimeRunning) {
        gameState.firstTimeRunning = false;
        renderGrid();
    } else {
        displayWhoIsCurrentlyPlaying();

        if (HUMAN_GAME_PLAY) {
            acceptAndProcessUserInput();
        } else {
            pickRandomChoiceAndUpdateGridMatrix();
        }

        renderGrid();
        checkForWinner();
        checkIfGameIsOver();
        updateCurrentPlayer();
    }


    setTimeout(runOfflineGame, HUMAN_GAME_PLAY ? NO_DELAY : DELAY);
}

function startGame() {
    const { PLAY_WITH_REMOTE_PLAYER, PORT, HOST } = gameOptions;

    if (PLAY_WITH_REMOTE_PLAYER) {
        createGameServer();
    } else if (PORT && HOST) {
        createGameClient();
    } else {
        runOfflineGame();
    }
}


startGame();

