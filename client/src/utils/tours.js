import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { getFromStorage, saveToStorage } from './storage';

/**
 * Create tour guides for new users using driver.js
 */

// Main app tour
export const createMainTour = () => {
  return driver({
    showProgress: true,
    animate: true,
    steps: [
      {
        element: '#navbar',
        popover: {
          title: 'Welcome to CollabIDE',
          description: 'This is a collaborative code editor where you can write, run, and share code in real-time.',
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '#language-selector',
        popover: {
          title: 'Select Language',
          description: 'Choose from various programming languages. Your code will be executed in the selected language.',
          side: 'bottom',
        }
      },
      {
        element: '#code-editor',
        popover: {
          title: 'Code Editor',
          description: 'Write your code here. All changes are saved automatically if auto-save is enabled.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '#run-button',
        popover: {
          title: 'Run Code',
          description: 'Execute your code by clicking this button or pressing Ctrl+Enter (Cmd+Enter on Mac).',
          side: 'bottom'
        }
      },
      {
        element: '#output-panel',
        popover: {
          title: 'Output Panel',
          description: 'View the results of your code execution here, including any output or errors.',
          side: 'left',
          align: 'start'
        }
      },
      {
        element: '#collaboration-button',
        popover: {
          title: 'Collaborate',
          description: 'Click here to create or join a collaborative session with others.',
          side: 'bottom'
        }
      },
      {
        element: '#theme-toggle',
        popover: {
          title: 'Theme Toggle',
          description: 'Switch between light and dark themes.',
          side: 'bottom'
        }
      },
      {
        element: '#auto-save-toggle',
        popover: {
          title: 'Auto-Save',
          description: 'Toggle automatic saving of your code. When enabled, your code will be saved locally.',
          side: 'bottom'
        }
      },
      {
        element: '#help-button',
        popover: {
          title: 'Help',
          description: 'Click here anytime to see this tour again.',
          side: 'bottom'
        }
      }
    ],
    nextBtnText: 'Next',
    prevBtnText: 'Previous',
    doneBtnText: 'Done',
    closeBtnText: 'Close',
    onHighlightStarted: (element) => {
      // Ensures mobile view is correct when highlighting elements
      if (window.innerWidth < 768) {
        if (element.id === 'code-editor') {
          // If we're on mobile and highlighting the editor, make sure we're in code view
          const event = new CustomEvent('switch-mobile-view', { detail: 'code' });
          window.dispatchEvent(event);
        } else if (element.id === 'output-panel') {
          // If we're on mobile and highlighting the output, make sure we're in output view
          const event = new CustomEvent('switch-mobile-view', { detail: 'output' });
          window.dispatchEvent(event);
        }
      }
    },
    onDestroyed: () => {
      saveToStorage('has_seen_main_tour', 'true');
    }
  });
};

// Input panel tour - specifically for explaining the input functionality
export const createInputPanelTour = () => {
  return driver({
    showProgress: true,
    animate: true,
    steps: [
      {
        element: '#input-tab-button',
        popover: {
          title: 'Input Tab',
          description: 'Click here to switch to the input tab where you can provide input data for your program.',
          side: 'top',
        }
      },
      {
        element: '#input-textarea',
        popover: {
          title: 'Program Input',
          description: 'Type any input your program needs here. For example, if your program reads from stdin or expects command-line arguments.',
          side: 'left',
          align: 'start'
        }
      },
      {
        element: '#run-button',
        popover: {
          title: 'Run With Input',
          description: 'Click run or press Ctrl+Enter to execute your code with the provided input.',
          side: 'bottom'
        }
      }
    ],
    nextBtnText: 'Next',
    prevBtnText: 'Previous',
    doneBtnText: 'Done',
    closeBtnText: 'Close',
    onDestroyed: () => {
      saveToStorage('has_seen_input_tour', 'true');
    }
  });
};

// User panel tour (when a user opens the users panel)
export const createUserPanelTour = () => {
  return driver({
    showProgress: true,
    animate: true,
    steps: [
      {
        element: '#user-panel-content',
        popover: {
          title: 'Collaboration Panel',
          description: 'This panel shows all users in the room and allows you to manage permissions.',
          side: 'left',
        }
      },
      {
        element: '#room-id-display',
        popover: {
          title: 'Room ID',
          description: 'This is your room\'s unique identifier. Share this ID with others so they can join your session.',
          side: 'bottom',
        }
      },
      {
        element: '#copy-room-id',
        popover: {
          title: 'Copy Room ID',
          description: 'Click to copy the room ID to your clipboard for easy sharing.',
          side: 'bottom'
        }
      },
      {
        element: '#users-list',
        popover: {
          title: 'Collaborators',
          description: 'All users currently in the room are listed here. Green dots indicate online users.',
          side: 'left'
        }
      },
      {
        element: '#access-level-controls',
        popover: {
          title: 'Permission Controls',
          description: 'As the room owner, you can change other users\' permissions to control what they can do.',
          side: 'left'
        }
      }
    ],
    nextBtnText: 'Next',
    prevBtnText: 'Previous',
    doneBtnText: 'Done',
    closeBtnText: 'Close',
    onDestroyed: () => {
      saveToStorage('has_seen_user_panel_tour', 'true');
    }
  });
};

// Collaboration tour (for when user has joined a room)
export const createCollaborationTour = () => {
  return driver({
    showProgress: true,
    animate: true,
    beforeHighlighted: (element) => {
      // When we're about to highlight the users-panel-button, click it automatically
      if (element.id === 'users-panel-button') {
        setTimeout(() => {
          document.getElementById('users-panel-button')?.click();
        }, 300);
      }
    },
    steps: [
      {
        element: '#room-info',
        popover: {
          title: 'Collaboration Room',
          description: 'You\'re now in a collaborative session. Any changes you make will be seen by others in real-time.',
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '#users-panel-button',
        popover: {
          title: 'Room Members',
          description: 'Click here to see who else is in the room and manage their permissions. The panel has already been opened for you.',
          side: 'bottom'
        }
      },
      {
        element: '#user-panel-content',
        popover: {
          title: 'Users Panel',
          description: 'This panel shows all users in the room and their permissions.',
          side: 'left'
        }
      },
      {
        element: '#room-id-display',
        popover: {
          title: 'Room ID',
          description: 'This is your room\'s unique identifier. Share this ID with others so they can join your session.',
          side: 'bottom',
        }
      },
      {
        element: '#collaborator-avatars',
        popover: {
          title: 'Active Collaborators',
          description: 'These avatars show other users currently editing the document. You can see their cursors in the editor.',
          side: 'bottom'
        },
        onNext: () => {
          // Find the close button
          const closeButton = document.querySelector('#user-panel-content button[aria-label="Close panel"]');
          if (closeButton) {
            // Add visual feedback for the click
            closeButton.style.transform = 'scale(0.95)';
            closeButton.style.transition = 'transform 0.1s';
            
            // Revert and click after a short delay
            setTimeout(() => {
              closeButton.style.transform = '';
              setTimeout(() => closeButton.click(), 50);
            }, 150);
          }
          
          // Allow time for the panel to close
          return new Promise(resolve => setTimeout(resolve, 400));
        }
      },
      {
        element: '#leave-room-button',
        popover: {
          title: 'Leave Room',
          description: 'Click here when you\'re done collaborating to exit the room.',
          side: 'bottom'
        }
      }
    ],
    nextBtnText: 'Next',
    prevBtnText: 'Previous',
    doneBtnText: 'Done',
    closeBtnText: 'Close',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    onDestroyStarted: () => {
      // Make sure panel is closed when tour is destroyed
      const closeButton = document.querySelector('#user-panel-content button[aria-label="Close panel"]');
      if (closeButton) {
        closeButton.click();
      }
    },
    onDestroyed: () => {
      saveToStorage('has_seen_collab_tour', 'true');
    }
  });
};

// Check if a specific tour has been seen by the user
export const hasTourBeenSeen = (tourName) => {
  return !!getFromStorage(`has_seen_${tourName}_tour`);
};

// Function to clear a specific tour seen status (for testing)
export const clearTourSeenStatus = (tourName) => {
  localStorage.removeItem(`has_seen_${tourName}_tour`);
};

// Clear all tour seen statuses (useful for testing)
export const clearAllTourStatus = () => {
  localStorage.removeItem('has_seen_main_tour');
  localStorage.removeItem('has_seen_collab_tour');
  localStorage.removeItem('has_seen_input_tour');
  localStorage.removeItem('has_seen_user_panel_tour');
};
