import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { useEffect, useRef } from 'react';

/**
 * A component that binds Monaco Editor with Yjs for real-time collaboration
 * This component doesn't render anything, it just sets up the binding
 */
function MonacoYjsBinding({ 
  editor, 
  monaco, 
  yDoc, 
  awareness, 
  roomId, 
  currentUser, 
  readOnly 
}) {
  const bindingRef = useRef(null);

  useEffect(() => {
    // Only set up the binding if we have all required props
    if (!editor || !monaco || !yDoc || !awareness || !roomId) {
      return;
    }

    // Get the text from the yDoc (or create it if it doesn't exist)
    const yText = yDoc.getText('monaco');

    // Set up awareness (for cursor/selection syncing)
    if (currentUser?.id && !readOnly) {
      awareness.setLocalStateField('user', {
        id: currentUser.id,
        name: currentUser.name || currentUser.username || 'Anonymous',
        color: getRandomColor(currentUser.id),
        avatar: currentUser.avatar,
        userId: currentUser.id
      });
    }

    // Create the Monaco binding
    const binding = new MonacoBinding(
      yText,
      editor.getModel(),
      new Set([editor]),
      awareness
    );

    // Store the binding in a ref for cleanup
    bindingRef.current = binding;

    // Clean up function
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
        bindingRef.current = null;
      }
    };
  }, [editor, monaco, yDoc, awareness, roomId, currentUser, readOnly]);

  return null;
}

// Helper function to generate consistent color for a user
function getRandomColor(userId) {
  // Generate a deterministic color based on the userId
  const colors = [
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#F9C80E',
    '#FF8C42', '#A4036F', '#048BA8', '#16DB93', '#EFBCD5'
  ];

  if (!userId) {
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Use a simple hash of the userId to pick a color
  const hash = String(userId).split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  return colors[hash % colors.length];
}

export default MonacoYjsBinding;
