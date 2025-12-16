import React, { useState, useEffect } from 'react';

export default function ChessGame() {
  const [board, setBoard] = useState(initializeBoard());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [gameStatus, setGameStatus] = useState('playing');
  const [moveHistory, setMoveHistory] = useState([]);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [isThinking, setIsThinking] = useState(false);

  const pieceSymbols = {
    white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
    black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
  };

  function initializeBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Black pieces
    board[0] = [
      { type: 'rook', color: 'black' }, { type: 'knight', color: 'black' },
      { type: 'bishop', color: 'black' }, { type: 'queen', color: 'black' },
      { type: 'king', color: 'black' }, { type: 'bishop', color: 'black' },
      { type: 'knight', color: 'black' }, { type: 'rook', color: 'black' }
    ];
    board[1] = Array(8).fill({ type: 'pawn', color: 'black' });
    
    // White pieces
    board[6] = Array(8).fill({ type: 'pawn', color: 'white' });
    board[7] = [
      { type: 'rook', color: 'white' }, { type: 'knight', color: 'white' },
      { type: 'bishop', color: 'white' }, { type: 'queen', color: 'white' },
      { type: 'king', color: 'white' }, { type: 'bishop', color: 'white' },
      { type: 'knight', color: 'white' }, { type: 'rook', color: 'white' }
    ];
    
    return board;
  }

  function isValidMove(board, fromRow, fromCol, toRow, toCol, piece) {
    if (toRow < 0 || toRow > 7 || toCol < 0 || toCol > 7) return false;
    
    const targetPiece = board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) return false;

    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;

    switch (piece.type) {
      case 'pawn':
        const direction = piece.color === 'white' ? -1 : 1;
        const startRow = piece.color === 'white' ? 6 : 1;
        
        if (colDiff === 0) {
          if (rowDiff === direction && !targetPiece) return true;
          if (fromRow === startRow && rowDiff === 2 * direction && !targetPiece && !board[fromRow + direction][fromCol]) return true;
        }
        if (Math.abs(colDiff) === 1 && rowDiff === direction && targetPiece) return true;
        return false;

      case 'rook':
        if (rowDiff === 0 || colDiff === 0) {
          return isPathClear(board, fromRow, fromCol, toRow, toCol);
        }
        return false;

      case 'knight':
        return (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 1) ||
               (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 2);

      case 'bishop':
        if (Math.abs(rowDiff) === Math.abs(colDiff)) {
          return isPathClear(board, fromRow, fromCol, toRow, toCol);
        }
        return false;

      case 'queen':
        if (rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)) {
          return isPathClear(board, fromRow, fromCol, toRow, toCol);
        }
        return false;

      case 'king':
        return Math.abs(rowDiff) <= 1 && Math.abs(colDiff) <= 1;

      default:
        return false;
    }
  }

  function isPathClear(board, fromRow, fromCol, toRow, toCol) {
    const rowStep = toRow > fromRow ? 1 : toRow < fromRow ? -1 : 0;
    const colStep = toCol > fromCol ? 1 : toCol < fromCol ? -1 : 0;
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
      if (board[currentRow][currentCol] !== null) return false;
      currentRow += rowStep;
      currentCol += colStep;
    }
    
    return true;
  }

  function getValidMoves(board, row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    
    const moves = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (isValidMove(board, row, col, i, j, piece)) {
          moves.push({ row: i, col: j });
        }
      }
    }
    return moves;
  }

  function isKingInCheck(board, color) {
    let kingPos = null;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (board[i][j]?.type === 'king' && board[i][j]?.color === color) {
          kingPos = { row: i, col: j };
          break;
        }
      }
      if (kingPos) break;
    }
    
    if (!kingPos) return false;
    
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.color !== color) {
          if (isValidMove(board, i, j, kingPos.row, kingPos.col, piece)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function hasValidMoves(board, color) {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.color === color) {
          const moves = getValidMoves(board, i, j);
          for (const move of moves) {
            const testBoard = board.map(row => [...row]);
            testBoard[move.row][move.col] = testBoard[i][j];
            testBoard[i][j] = null;
            if (!isKingInCheck(testBoard, color)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  function handleSquareClick(row, col) {
    if (gameStatus !== 'playing' || currentPlayer === 'black' || isThinking) return;

    if (selectedSquare) {
      const move = validMoves.find(m => m.row === row && m.col === col);
      if (move) {
        makeMove(selectedSquare.row, selectedSquare.col, row, col);
      }
      setSelectedSquare(null);
      setValidMoves([]);
    } else {
      const piece = board[row][col];
      if (piece && piece.color === currentPlayer) {
        setSelectedSquare({ row, col });
        const moves = getValidMoves(board, row, col).filter(move => {
          const testBoard = board.map(r => [...r]);
          testBoard[move.row][move.col] = testBoard[row][col];
          testBoard[row][col] = null;
          return !isKingInCheck(testBoard, currentPlayer);
        });
        setValidMoves(moves);
      }
    }
  }

  function makeMove(fromRow, fromCol, toRow, toCol) {
    const newBoard = board.map(row => [...row]);
    const piece = newBoard[fromRow][fromCol];
    const capturedPiece = newBoard[toRow][toCol];
    
    if (capturedPiece) {
      setCapturedPieces(prev => ({
        ...prev,
        [piece.color]: [...prev[piece.color], capturedPiece]
      }));
    }
    
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = null;
    
    // Pawn promotion
    if (piece.type === 'pawn' && (toRow === 0 || toRow === 7)) {
      newBoard[toRow][toCol] = { type: 'queen', color: piece.color };
    }
    
    setBoard(newBoard);
    setMoveHistory([...moveHistory, { from: [fromRow, fromCol], to: [toRow, toCol], piece }]);
    
    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
    
    if (isKingInCheck(newBoard, nextPlayer)) {
      if (!hasValidMoves(newBoard, nextPlayer)) {
        setGameStatus(`checkmate-${currentPlayer}`);
        return;
      }
    } else if (!hasValidMoves(newBoard, nextPlayer)) {
      setGameStatus('stalemate');
      return;
    }
    
    setCurrentPlayer(nextPlayer);
  }

  useEffect(() => {
    if (currentPlayer === 'black' && gameStatus === 'playing' && !isThinking) {
      setIsThinking(true);
      setTimeout(() => makeAIMove(), 800);
    }
  }, [currentPlayer, gameStatus]);

  async function makeAIMove() {
    const allMoves = [];
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = board[i][j];
        if (piece && piece.color === 'black') {
          const moves = getValidMoves(board, i, j);
          for (const move of moves) {
            const testBoard = board.map(r => [...r]);
            testBoard[move.row][move.col] = testBoard[i][j];
            testBoard[i][j] = null;
            if (!isKingInCheck(testBoard, 'black')) {
              allMoves.push({ from: { row: i, col: j }, to: move });
            }
          }
        }
      }
    }

    if (allMoves.length > 0) {
      const scoredMoves = allMoves.map(move => {
        const testBoard = board.map(r => [...r]);
        const capturedPiece = testBoard[move.to.row][move.to.col];
        testBoard[move.to.row][move.to.col] = testBoard[move.from.row][move.from.col];
        testBoard[move.from.row][move.from.col] = null;
        
        let score = Math.random() * 10;
        
        if (capturedPiece) {
          const pieceValues = { pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 };
          score += pieceValues[capturedPiece.type] * 10;
        }
        
        if (isKingInCheck(testBoard, 'white')) {
          score += 50;
        }
        
        return { move, score };
      });
      
      scoredMoves.sort((a, b) => b.score - a.score);
      const bestMove = scoredMoves[0].move;
      
      makeMove(bestMove.from.row, bestMove.from.col, bestMove.to.row, bestMove.to.col);
    }
    
    setIsThinking(false);
  }

  function resetGame() {
    setBoard(initializeBoard());
    setSelectedSquare(null);
    setValidMoves([]);
    setCurrentPlayer('white');
    setGameStatus('playing');
    setMoveHistory([]);
    setCapturedPieces({ white: [], black: [] });
    setIsThinking(false);
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-8">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * { font-family: 'Crimson Pro', serif; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        
        @keyframes slideIn {
          from { transform: translateX(-20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        
        .chess-square {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .chess-square:hover {
          transform: scale(1.02);
        }
        
        .chess-piece {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor: pointer;
        }
        
        .chess-piece:hover {
          transform: scale(1.15) rotate(-5deg);
        }
        
        .valid-move {
          animation: pulse 2s ease-in-out infinite;
        }
        
        .game-container {
          animation: fadeIn 0.6s ease-out;
        }
        
        .move-history-item {
          animation: slideIn 0.3s ease-out;
        }
        
        .thinking-indicator {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="game-container max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-sm shadow-2xl p-8 border border-neutral-200">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-light tracking-tight text-neutral-900 mb-1">Chess</h1>
                <p className="text-sm text-neutral-500 font-light">
                  {gameStatus === 'playing' ? (
                    <span>
                      {currentPlayer === 'white' ? 'Your turn' : 'AI thinking...'}
                      {isThinking && <span className="thinking-indicator ml-2">●</span>}
                    </span>
                  ) : gameStatus.startsWith('checkmate') ? (
                    <span className="text-neutral-900 font-normal">
                      Checkmate — {gameStatus.includes('white') ? 'You win' : 'AI wins'}
                    </span>
                  ) : (
                    <span className="text-neutral-900 font-normal">Stalemate — Draw</span>
                  )}
                </p>
              </div>
              <button
                onClick={resetGame}
                className="px-6 py-2 bg-neutral-900 text-white text-sm font-light tracking-wide rounded-sm hover:bg-neutral-700 transition-colors"
              >
                New Game
              </button>
            </div>

            <div className="inline-block border-2 border-neutral-900 shadow-xl">
              {board.map((row, rowIndex) => (
                <div key={rowIndex} className="flex">
                  {row.map((piece, colIndex) => {
                    const isLight = (rowIndex + colIndex) % 2 === 0;
                    const isSelected = selectedSquare?.row === rowIndex && selectedSquare?.col === colIndex;
                    const isValidMove = validMoves.some(m => m.row === rowIndex && m.col === colIndex);
                    
                    return (
                      <div
                        key={colIndex}
                        onClick={() => handleSquareClick(rowIndex, colIndex)}
                        className={`chess-square w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center cursor-pointer relative ${
                          isLight ? 'bg-neutral-300' : 'bg-amber-800'
                        } ${isSelected ? 'ring-4 ring-amber-600 ring-inset' : ''}`}
                      >
                        {piece && (
                          <span className={`chess-piece text-5xl sm:text-6xl ${
                            piece.color === 'white' ? 'text-neutral-100 drop-shadow-lg' : 'text-neutral-900'
                          }`}>
                            {pieceSymbols[piece.color][piece.type]}
                          </span>
                        )}
                        {isValidMove && (
                          <div className={`valid-move absolute inset-0 flex items-center justify-center pointer-events-none`}>
                            <div className={`w-4 h-4 rounded-full ${piece ? 'border-4 border-red-500' : 'bg-red-500/70'}`}></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-300 rounded-sm shadow-xl p-6 border border-neutral-200">
            <h2 className="text-xl font-light mb-4 text-neutral-900 border-b border-neutral-200 pb-2">
              Captured Pieces
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-neutral-500 mb-2 tracking-wide uppercase">You captured</p>
                <div className="flex flex-wrap gap-1">
                  {capturedPieces.white.map((piece, i) => (
                    <span key={i} className="text-2xl text-neutral-900">
                      {pieceSymbols.black[piece.type]}
                    </span>
                  ))}
                  {capturedPieces.white.length === 0 && (
                    <span className="text-neutral-400 text-sm">None yet</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-2 tracking-wide uppercase">AI captured</p>
                <div className="flex flex-wrap gap-1">
                  {capturedPieces.black.map((piece, i) => (
                    <span key={i} className="text-2xl text-neutral-100 drop-shadow">
                      {pieceSymbols.white[piece.type]}
                    </span>
                  ))}
                  {capturedPieces.black.length === 0 && (
                    <span className="text-neutral-400 text-sm">None yet</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-300 rounded-sm shadow-xl p-6 border border-neutral-200">
            <h2 className="text-xl font-light mb-4 text-neutral-900 border-b border-neutral-200 pb-2">
              Move History
            </h2>
            <div className="space-y-1 max-h-64 overflow-y-auto text-sm">
              {moveHistory.length === 0 ? (
                <p className="text-neutral-400">No moves yet</p>
              ) : (
                moveHistory.map((move, i) => (
                  <div key={i} className="move-history-item flex items-center gap-2 py-1 font-mono text-xs">
                    <span className="text-neutral-400 w-8">{i + 1}.</span>
                    <span className={move.piece.color === 'white' ? 'text-neutral-900' : 'text-neutral-600'}>
                      {pieceSymbols[move.piece.color][move.piece.type]}
                    </span>
                    <span className="text-neutral-500">
                      {String.fromCharCode(97 + move.from[1])}{8 - move.from[0]} → {String.fromCharCode(97 + move.to[1])}{8 - move.to[0]}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
