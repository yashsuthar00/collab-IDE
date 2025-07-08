import { useState } from 'react';
import { useRoom } from '../contexts/RoomContext';

const RoomSettingsPanel = ({ room, isOwner, onClose }) => {
  const { updateRoomSettings } = useRoom();
  
  const [settings, setSettings] = useState({
    name: room.name,
    description: room.description,
    isPublic: room.isPublic,
    language: room.language,
    settings: {
      ...room.settings
    }
  });
  
  const [saving, setSaving] = useState(false);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      // Handle nested settings
      const [parent, child] = name.split('.');
      setSettings({
        ...settings,
        [parent]: {
          ...settings[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      // Handle top-level settings
      setSettings({
        ...settings,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isOwner) {
      return;
    }
    
    setSaving(true);
    
    try {
      await updateRoomSettings(settings);
      onClose();
    } catch (error) {
      console.error('Failed to update room settings:', error);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Room Settings</h2>
          <button 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Room Name</label>
            <input
              type="text"
              name="name"
              value={settings.name}
              onChange={handleInputChange}
              disabled={!isOwner}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={settings.description}
              onChange={handleInputChange}
              disabled={!isOwner}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              rows="3"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Language</label>
            <select
              name="language"
              value={settings.language}
              onChange={handleInputChange}
              disabled={!isOwner}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="csharp">C#</option>
              <option value="cpp">C++</option>
              <option value="php">PHP</option>
              <option value="go">Go</option>
              <option value="ruby">Ruby</option>
              <option value="rust">Rust</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isPublic"
                checked={settings.isPublic}
                onChange={handleInputChange}
                disabled={!isOwner}
                className="h-4 w-4"
              />
              <span className="text-sm font-medium">Public Room</span>
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Public rooms can be joined by anyone with the link
            </p>
          </div>
          
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2">Editor Settings</h3>
            
            <div className="mb-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="settings.readOnly"
                  checked={settings.settings.readOnly}
                  onChange={handleInputChange}
                  disabled={!isOwner}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Read-only Mode</span>
              </label>
            </div>
            
            <div className="mb-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="settings.autoSave"
                  checked={settings.settings.autoSave}
                  onChange={handleInputChange}
                  disabled={!isOwner}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Auto-save</span>
              </label>
            </div>
            
            <div className="mb-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="settings.wrapLines"
                  checked={settings.settings.wrapLines}
                  onChange={handleInputChange}
                  disabled={!isOwner}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium">Wrap Lines</span>
              </label>
            </div>
            
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">Tab Size</label>
              <select
                name="settings.tabSize"
                value={settings.settings.tabSize}
                onChange={handleInputChange}
                disabled={!isOwner}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              >
                <option value={2}>2 spaces</option>
                <option value={4}>4 spaces</option>
                <option value={8}>8 spaces</option>
              </select>
            </div>
            
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">Theme</label>
              <select
                name="settings.theme"
                value={settings.settings.theme}
                onChange={handleInputChange}
                disabled={!isOwner}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700"
              >
                <option value="system">System Default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
          
          {isOwner && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 mr-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
          
          {!isOwner && (
            <div className="mt-4">
              <p className="text-sm text-yellow-500 dark:text-yellow-400">
                Only the room owner can change these settings.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md"
              >
                Close
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default RoomSettingsPanel;
