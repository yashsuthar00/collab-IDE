/**
 * Operational Transformation utilities for collaborative text editing
 */

// Operation types
export const OpType = {
  INSERT: 'insert',
  DELETE: 'delete',
  RETAIN: 'retain'
};

/**
 * Create an insert operation
 * @param {number} position - Position to insert at
 * @param {string} text - Text to insert
 * @returns {Object} Insert operation
 */
export const createInsertOp = (position, text) => ({
  type: OpType.INSERT,
  position,
  text
});

/**
 * Create a delete operation
 * @param {number} position - Position to delete from
 * @param {number} length - Number of characters to delete
 * @returns {Object} Delete operation
 */
export const createDeleteOp = (position, length) => ({
  type: OpType.DELETE,
  position,
  length
});

/**
 * Create a retain operation (skip characters)
 * @param {number} length - Number of characters to retain/skip
 * @returns {Object} Retain operation
 */
export const createRetainOp = (length) => ({
  type: OpType.RETAIN,
  length
});

/**
 * Convert a Monaco editor change to an OT operation
 * @param {Object} change - Monaco editor change event
 * @param {string} prevText - Previous text content
 * @returns {Array} Array of operations
 */
export function monacoChangeToOp(change, prevText) {
  const ops = [];
  
  // Handle text changes
  for (const e of change.changes) {
    const startOffset = getOffsetFromLineAndColumn(prevText, e.range.startLineNumber, e.range.startColumn);
    
    // If we need to skip characters first
    if (startOffset > 0) {
      ops.push(createRetainOp(startOffset));
    }
    
    // If we're deleting text
    if (e.rangeLength > 0) {
      ops.push(createDeleteOp(startOffset, e.rangeLength));
    }
    
    // If we're inserting text
    if (e.text.length > 0) {
      ops.push(createInsertOp(startOffset, e.text));
    }
  }
  
  return ops;
}

/**
 * Apply an operational transformation operation to text
 * @param {string} text - Original text
 * @param {Array} ops - Array of operations to apply
 * @returns {string} - New text after applying operations
 */
export function applyOps(text, ops) {
  let newText = text;
  let offset = 0;
  
  for (const op of ops) {
    switch (op.type) {
      case OpType.INSERT:
        newText = newText.substring(0, op.position + offset) + 
                  op.text + 
                  newText.substring(op.position + offset);
        offset += op.text.length;
        break;
        
      case OpType.DELETE:
        newText = newText.substring(0, op.position + offset) + 
                  newText.substring(op.position + offset + op.length);
        offset -= op.length;
        break;
        
      case OpType.RETAIN:
        // Just skip these characters
        break;
    }
  }
  
  return newText;
}

/**
 * Transform operation A against operation B
 * @param {Object} opA - First operation
 * @param {Object} opB - Second operation
 * @returns {Object} - Transformed operation A'
 */
export function transformOp(opA, opB) {
  // This is a simplified OT implementation - a real one would be more complex
  if (opA.type === OpType.INSERT && opB.type === OpType.INSERT) {
    // If both insert at the same position, break ties using client IDs
    if (opA.position === opB.position) {
      return opA.clientId < opB.clientId 
        ? opA 
        : { ...opA, position: opA.position + opB.text.length };
    }
    // If B inserts before A, adjust A's position
    if (opB.position < opA.position) {
      return { ...opA, position: opA.position + opB.text.length };
    }
  } else if (opA.type === OpType.INSERT && opB.type === OpType.DELETE) {
    // If B deletes before A, adjust A's position
    if (opB.position < opA.position) {
      return { ...opA, position: Math.max(opB.position, opA.position - opB.length) };
    }
  } else if (opA.type === OpType.DELETE && opB.type === OpType.INSERT) {
    // If B inserts before or at A's position, adjust A's position
    if (opB.position <= opA.position) {
      return { ...opA, position: opA.position + opB.text.length };
    }
  } else if (opA.type === OpType.DELETE && opB.type === OpType.DELETE) {
    if (opB.position >= opA.position + opA.length) {
      // B is after A, no change needed
      return opA;
    } else if (opB.position + opB.length <= opA.position) {
      // B is before A, adjust A's position
      return { ...opA, position: opA.position - opB.length };
    } else {
      // B overlaps with A, adjust A's length and position
      const positionDiff = Math.max(0, opB.position - opA.position);
      const overlapLength = Math.min(
        opA.position + opA.length - opB.position,
        opB.length - positionDiff
      );
      return {
        ...opA,
        position: opA.position - Math.min(opB.position, opA.position),
        length: opA.length - overlapLength
      };
    }
  }
  
  return opA;
}

/**
 * Transform an array of operations against another operation
 * @param {Array} ops - Operations to transform
 * @param {Object} op - Operation to transform against
 * @returns {Array} - Transformed operations
 */
export function transformOps(ops, op) {
  return ops.map(o => transformOp(o, op));
}

/**
 * Calculate character offset from line and column in text
 * @param {string} text - Text content
 * @param {number} lineNumber - Line number (1-based)
 * @param {number} column - Column number (1-based)
 * @returns {number} - Character offset (0-based)
 */
export function getOffsetFromLineAndColumn(text, lineNumber, column) {
  const lines = text.split('\n');
  let offset = 0;
  
  for (let i = 0; i < lineNumber - 1; i++) {
    offset += lines[i].length + 1; // +1 for newline character
  }
  
  return offset + column - 1;
}

/**
 * Calculate line and column from character offset in text
 * @param {string} text - Text content
 * @param {number} offset - Character offset (0-based)
 * @returns {Object} - Line and column (both 1-based)
 */
export function getLineAndColumnFromOffset(text, offset) {
  const lines = text.split('\n');
  let currentOffset = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const lineLength = lines[i].length + 1; // +1 for newline
    
    if (currentOffset + lineLength > offset) {
      return {
        lineNumber: i + 1,
        column: offset - currentOffset + 1
      };
    }
    
    currentOffset += lineLength;
  }
  
  // If we're at the very end of the text
  const lastLineIndex = lines.length - 1;
  return {
    lineNumber: lastLineIndex + 1,
    column: (lines[lastLineIndex]?.length || 0) + 1
  };
}

/**
 * Convert a Monaco position to a character offset
 * @param {string} text - Current text content
 * @param {Object} position - Monaco position with lineNumber and column
 * @returns {number} - Character offset
 */
export function positionToOffset(text, position) {
  return getOffsetFromLineAndColumn(text, position.lineNumber, position.column);
}

/**
 * Convert a character offset to a Monaco position
 * @param {string} text - Current text content
 * @param {number} offset - Character offset
 * @returns {Object} - Monaco position with lineNumber and column
 */
export function offsetToPosition(text, offset) {
  return getLineAndColumnFromOffset(text, offset);
}
