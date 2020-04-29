const myArgs = process.argv.slice(2);
const chalk = require('chalk');

function userInputIsValid(userInput, validPositions) {
    if (Number.isNaN(Number(userInput)) || 
        !validPositions.includes(userInput)
    ) {
        console.log(danger('Invalid input, your possible options are: \n'), validPositions.join(', '));
        return false;
    }

    return true;
}

function danger(element) {
    return chalk.bold.red(element);
}

function grey(element) {
    return chalk.gray(element);
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

function initializeGrid(size) {
    const gridMatrix = [];
    const gridMatrixIndexes = []

    for (let i=0; i < (size ** 2); i++) {
        gridMatrix.push('');
        gridMatrixIndexes.push(i);
    }

    return { gridMatrix, gridMatrixIndexes }
}

function getArgs(argName, defaultValue, isBoolValue=false) {
    const argFieldName = myArgs.find(e => e.includes(`--${argName}`)) || '';
    if (isBoolValue) return !!argFieldName;

    const foundArg = (argFieldName.match(/--.*=(.*)/) || [])[1];

    if (!foundArg) return defaultValue;

    return Number.isNaN(Number(foundArg)) ? foundArg : +foundArg;
}

function checkIfWinPatternMatches(winPattern, playerPattern) {
    return winPattern.every(e => playerPattern.includes(e))
}

module.exports = {
    userInputIsValid,
    danger,
    grey,
    generateWinPattern,
    initializeGrid,
    getArgs,
    checkIfWinPatternMatches,
}