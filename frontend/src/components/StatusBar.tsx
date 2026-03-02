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

  const activeCode = editorMode === 'c' ? cCode : editorMode === 'blocks' ? blocklyXml : pythonCode;
  const lineCount = activeCode.split('\n').length;
  const charCount = activeCode.length;

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

      <div className="status-bar-right">
        <div className="status-item">
          <span>
            {editorMode === 'python'
              ? 'Python Editor'
              : editorMode === 'c'
              ? 'C Editor'
              : 'Block Editor'}
          </span>
        </div>
        <div className="status-item">
          <span>
            Ln {lineCount}, {charCount} chars
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
