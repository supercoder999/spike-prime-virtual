import React from 'react';
import { useStore } from '../store/useStore';
import { Wifi, WifiOff, Battery, BatteryLow, CircleDot } from 'lucide-react';

const StatusBar: React.FC = () => {
  const {
    connectionState,
    hubName,
    hubStatus,
    batteryLevel,
    editorMode,
    pythonCode,
    blocklyXml,
    cCode,
  } = useStore();

  const activeCode = editorMode === 'c' ? cCode : editorMode === 'python' ? pythonCode : '';
  const lineCount = activeCode.split('\n').length;
  const charCount = activeCode.length;

  // For blocks, count <block type="..."> occurrences
  const blockCount = editorMode === 'blocks'
    ? (blocklyXml.match(/<block\s+type="/g) || []).length
    : 0;

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        {/* Connection status */}
        <div className={`status-item connection-status ${connectionState}`}>
          {connectionState === 'connected' ? (
            <Wifi size={12} />
          ) : (
            <WifiOff size={12} />
          )}
          <span>
            {connectionState === 'connected'
              ? hubName
              : connectionState === 'connecting'
              ? 'Connecting...'
              : 'Disconnected'}
          </span>
        </div>

        {/* Hub status */}
        {connectionState === 'connected' && (
          <>
            <div className={`status-item hub-status ${hubStatus}`}>
              <CircleDot size={12} />
              <span>{hubStatus === 'running' ? 'Running' : 'Ready'}</span>
            </div>
            {batteryLevel > 0 && (
              <div className="status-item">
                {batteryLevel < 20 ? (
                  <BatteryLow size={12} color="#f44336" />
                ) : (
                  <Battery size={12} />
                )}
                <span>{batteryLevel}%</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="status-bar-center">
        <a href="/terms.html" target="_blank" rel="noopener noreferrer" className="status-bar-link">
          Terms of Service
        </a>
        <span className="status-bar-link-sep">|</span>
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="status-bar-link">
          Privacy Policy
        </a>
        <span className="status-bar-link-sep">|</span>
        <a href="/contact.html" target="_blank" rel="noopener noreferrer" className="status-bar-link">
          Contact Us
        </a>
        <span className="status-bar-link-sep">|</span>
        <a href="/faq.html" target="_blank" rel="noopener noreferrer" className="status-bar-link">
          FAQ
        </a>
      </div>

      <div className="status-bar-right">
        <div className="status-item">
          <span>
            {editorMode === 'python' ? 'Python Editor' : editorMode === 'blocks' ? 'Block Editor' : 'C Editor'}
          </span>
        </div>
        <div className="status-item">
          <span>
            {editorMode === 'blocks'
              ? `${blockCount} block${blockCount !== 1 ? 's' : ''}`
              : `Ln ${lineCount}, ${charCount} chars`}
          </span>
        </div>
        <div className="status-item">
          <span>Spike Prime</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
