/**
 * Bluetooth Low Energy service for LEGO Spike Prime Hub running Pybricks firmware.
 *
 * Protocol reference: https://github.com/pybricks/pybricks-code
 *
 * This communicates with the hub using the Pybricks BLE protocol:
 * - Pybricks Service UUID for control/command
 * - Nordic UART Service (NUS) for data transfer (stdin/stdout)
 *
 * Programs are executed via MicroPython REPL paste mode (Ctrl-E / Ctrl-D),
 * which accepts raw Python source code. The download protocol
 * (WriteProgramMeta/WriteUserRam) requires compiled .mpy bytecode.
 */

// Pybricks BLE Service UUIDs
const PYBRICKS_SERVICE_UUID = 'c5f50001-8280-46da-89f4-6d8051e4aeef';
const PYBRICKS_CONTROL_EVENT_CHAR_UUID = 'c5f50002-8280-46da-89f4-6d8051e4aeef';
const PYBRICKS_HUB_CAPABILITIES_CHAR_UUID = 'c5f50003-8280-46da-89f4-6d8051e4aeef';

// Nordic UART Service UUIDs
const NORDIC_UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NORDIC_UART_RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write (to hub)
const NORDIC_UART_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify (from hub)

// Device Information Service
const DEVICE_INFO_SERVICE_UUID = 0x180a;
const FIRMWARE_REVISION_CHAR_UUID = 0x2a26;
const SOFTWARE_REVISION_CHAR_UUID = 0x2a28;
// const PNP_ID_CHAR_UUID = 0x2a50;

// Pybricks Command Types (Pybricks Profile v1.4.0)
enum CommandType {
  STOP_USER_PROGRAM = 0,
  START_USER_PROGRAM = 1,
  START_REPL = 2,            // removed in v1.4.0 - use START_USER_PROGRAM with REPL id
  WRITE_USER_PROGRAM_META = 3,
  WRITE_USER_RAM = 4,
  RESET_IN_UPDATE_MODE = 5,
  WRITE_STDIN = 6,
  WRITE_APP_DATA = 7,
}

// Pybricks Event Types
enum EventType {
  STATUS_REPORT = 0,
  WRITE_STDOUT = 1,
  WRITE_APP_DATA = 2,
}

// Status flags
enum StatusFlag {
  BATTERY_LOW_VOLTAGE_WARNING = 1 << 0,
  BATTERY_LOW_VOLTAGE_SHUTDOWN = 1 << 1,
  BATTERY_HIGH_CURRENT = 1 << 2,
  BLE_ADVERTISING = 1 << 3,
  BLE_LOW_SIGNAL = 1 << 4,
  POWER_BUTTON_PRESSED = 1 << 5,
  USER_PROGRAM_RUNNING = 1 << 6,
  SHUTDOWN = 1 << 7,
  SHUTDOWN_REQUESTED = 1 << 8,
}

// Built-in program IDs (Pybricks Profile v1.4.0)
enum BuiltinProgramId {
  REPL = 0x80,
  PORT_VIEW = 0x81,
  IMU_CALIBRATION = 0x82,
}

// Hub capability flags (for reference)
// enum HubCapabilityFlag {
//   HAS_REPL = 1 << 0,
//   USER_PROGRAM_MULTI_MPY6 = 1 << 1,
// }

// MicroPython REPL control characters
const CTRL_C = '\x03'; // Interrupt / KeyboardInterrupt
const CTRL_D = '\x04'; // Soft reset / end paste mode
const CTRL_E = '\x05'; // Enter paste mode

export type BleEventCallback = (event: BleEvent) => void;

export interface BleEvent {
  type: 'connected' | 'disconnected' | 'output' | 'error' | 'status' | 'info';
  data?: string;
  status?: number;
}

export interface HubInfo {
  name: string;
  firmwareVersion: string;
  softwareVersion: string;
}

/** Small delay helper */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isLikelyGattTransientError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes('gatt operation failed') ||
    lower.includes('networkerror') ||
    lower.includes('operation failed') ||
    lower.includes('unknown reason')
  );
};

/** Promise that rejects after a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${(ms / 1000).toFixed(0)}s`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/** Connection timeout constants (ms) */
const GATT_CONNECT_TIMEOUT = 15_000;
const SERVICE_SETUP_TIMEOUT = 10_000;
const MAX_CONNECT_RETRIES = 2;

class BleService {
  private device: BluetoothDevice | null = null;
  private gattServer: BluetoothRemoteGATTServer | null = null;
  private connectAbortController: AbortController | null = null;
  private pybricksControlChar: BluetoothRemoteGATTCharacteristic | null = null;
  private uartTxChar: BluetoothRemoteGATTCharacteristic | null = null;
  private hubCapabilitiesChar: BluetoothRemoteGATTCharacteristic | null = null;
  private eventCallbacks: BleEventCallback[] = [];
  private maxWriteSize = 20; // default BLE ATT_MTU - 3
  private maxUserProgramSize = 0;
  private hubCapabilityFlags = 0;
  private _hubInfo: HubInfo = { name: '', firmwareVersion: '', softwareVersion: '' };
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private lastStatus = 0;
  private _previouslyRunning = false;
  private _useLegacyProtocol = false;
  private preferWriteWithoutResponseForProgram = true;
  private writeQueue: Promise<void> = Promise.resolve();

  get isConnected(): boolean {
    return this.gattServer?.connected ?? false;
  }

  get hubInfo(): HubInfo {
    return this._hubInfo;
  }

  get isProgramRunning(): boolean {
    return (this.lastStatus & StatusFlag.USER_PROGRAM_RUNNING) !== 0;
  }

  /**
   * Register a callback to receive BLE events
   */
  addEventListener(callback: BleEventCallback): void {
    this.eventCallbacks.push(callback);
  }

  removeEventListener(callback: BleEventCallback): void {
    this.eventCallbacks = this.eventCallbacks.filter((cb) => cb !== callback);
  }

  private emit(event: BleEvent): void {
    this.eventCallbacks.forEach((cb) => cb(event));
  }

  /**
   * Check if Web Bluetooth API is available
   */
  isWebBluetoothAvailable(): boolean {
    return typeof navigator !== 'undefined' && navigator.bluetooth !== undefined;
  }

  /**
   * Serialize BLE writes to avoid GATT busy errors.
   * Each write waits for the previous one to complete.
   */
  private async serialWrite(
    char: BluetoothRemoteGATTCharacteristic,
    data: BufferSource,
    withResponse = true,
    retries = 2,
  ): Promise<void> {
    const doWrite = async (): Promise<void> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          if (withResponse) {
            await char.writeValueWithResponse(data);
          } else {
            await char.writeValueWithoutResponse(data);
          }
          return;
        } catch (error) {
          if (attempt < retries) {
            // Wait before retrying - exponential backoff
            await delay(50 * (attempt + 1));
            continue;
          }
          throw error;
        }
      }
    };

    // Queue the write to serialize all BLE writes
    this.writeQueue = this.writeQueue.then(doWrite, doWrite);
    return this.writeQueue;
  }

  /**
   * Abort an in-progress connection attempt.
   */
  abortConnection(): void {
    if (this.connectAbortController) {
      this.connectAbortController.abort();
      this.connectAbortController = null;
    }
    // Force-close GATT if it was partially established
    if (this.gattServer?.connected) {
      try { this.gattServer.disconnect(); } catch { /* ignore */ }
    }
    this.cleanup();
    this.emit({ type: 'info', data: 'Connection cancelled by user' });
    this.emit({ type: 'disconnected' });
  }

  /**
   * Connect to a Pybricks hub via BLE.
   * Includes per-step timeouts, automatic retry, and abort support.
   */
  async connect(): Promise<void> {
    if (!this.isWebBluetoothAvailable()) {
      throw new Error(
        'Web Bluetooth is not available. Please use Chrome/Edge and enable Bluetooth.'
      );
    }

    // Set up abort controller for this connection attempt
    this.connectAbortController = new AbortController();
    const signal = this.connectAbortController.signal;

    const checkAborted = () => {
      if (signal.aborted) throw new Error('Connection aborted');
    };

    try {
      this.emit({ type: 'info', data: 'Requesting Bluetooth device...' });

      // Request the device - user picks from a dialog
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [PYBRICKS_SERVICE_UUID] }],
        optionalServices: [
          PYBRICKS_SERVICE_UUID,
          NORDIC_UART_SERVICE_UUID,
          DEVICE_INFO_SERVICE_UUID,
        ],
      });

      if (!this.device) {
        throw new Error('No device selected');
      }

      checkAborted();

      this._hubInfo.name = this.device.name || 'Unknown Hub';

      // Listen for disconnection
      this.device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnect();
      });

      // Retry loop for GATT connection + service setup
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= MAX_CONNECT_RETRIES; attempt++) {
        checkAborted();

        if (attempt > 1) {
          this.emit({
            type: 'info',
            data: `Retrying connection (attempt ${attempt}/${MAX_CONNECT_RETRIES})...`,
          });
          await delay(1500);
        } else {
          this.emit({ type: 'info', data: `Connecting to ${this._hubInfo.name}...` });
        }

        try {
          // Connect GATT server with timeout
          this.gattServer = await withTimeout(
            this.device.gatt!.connect(),
            GATT_CONNECT_TIMEOUT,
            'GATT connection',
          );

          checkAborted();

          // Give OS Bluetooth stack time to settle
          await delay(500);

          checkAborted();

          // Get device info (non-critical, short timeout)
          try {
            await withTimeout(this.readDeviceInfo(), 5_000, 'Device info');
          } catch {
            this.emit({ type: 'info', data: 'Could not read device info (non-critical)' });
          }

          checkAborted();

          // Set up Pybricks service with timeout
          await withTimeout(
            this.setupPybricksService(),
            SERVICE_SETUP_TIMEOUT,
            'Pybricks service setup',
          );

          checkAborted();

          // Set up Nordic UART service with timeout
          await withTimeout(
            this.setupUartService(),
            SERVICE_SETUP_TIMEOUT,
            'UART service setup',
          );

          // Success!
          lastError = null;
          break;
        } catch (innerError) {
          lastError = innerError instanceof Error ? innerError : new Error(String(innerError));

          // If aborted, don't retry
          if (signal.aborted) throw lastError;

          // Disconnect GATT before retrying
          if (this.gattServer?.connected) {
            try { this.gattServer.disconnect(); } catch { /* ignore */ }
          }
          this.gattServer = null;
          this.pybricksControlChar = null;
          this.uartTxChar = null;
          this.hubCapabilitiesChar = null;

          if (attempt < MAX_CONNECT_RETRIES) {
            this.emit({
              type: 'info',
              data: `Connection attempt ${attempt} failed: ${lastError.message}`,
            });
          }
        }
      }

      if (lastError) {
        throw lastError;
      }

      this.connectAbortController = null;

      this.emit({ type: 'connected', data: this._hubInfo.name });
      this.emit({
        type: 'info',
        data: `Connected to ${this._hubInfo.name} (FW: ${this._hubInfo.firmwareVersion}, max write: ${this.maxWriteSize}B)`,
      });
    } catch (error) {
      this.connectAbortController = null;
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('User cancelled') || message.includes('aborted')) {
        this.emit({ type: 'info', data: 'Connection cancelled' });
      } else if (message.includes('timed out')) {
        this.emit({
          type: 'error',
          data: `Connection failed: ${message}. Try: 1) Turn the hub OFF and ON again, 2) Move closer to the hub, 3) Close other Bluetooth apps`,
        });
      } else {
        this.emit({
          type: 'error',
          data: `Connection failed: ${message}. If this persists, reboot the hub by holding the center button for 5 seconds.`,
        });
      }
      this.cleanup();
      throw error;
    }
  }

  /**
   * Disconnect from the hub
   */
  async disconnect(): Promise<void> {
    if (this.gattServer?.connected) {
      this.gattServer.disconnect();
    }
    this.cleanup();
  }

  /**
   * Run a Python program on the hub.
   *
   * Uses MicroPython REPL paste mode (Ctrl-E / code / Ctrl-D).
   * This works with raw Python source and doesn't require mpy-cross compilation.
   */
  async runProgram(pythonCode: string): Promise<void> {
    if (!this.isConnected || !this.pybricksControlChar) {
      throw new Error('Not connected to hub');
    }

    try {
      // Stop any currently running program first
      if (this.isProgramRunning) {
        await this.stopProgram();
        await this.waitForProgramStop(3000);
      }

      // Start the REPL
      await this.startRepl();

      // Give the REPL time to initialize
      await delay(300);

      // Use MicroPython paste mode to send the entire program:
      // 1. Ctrl-C to interrupt any previous state
      // 2. Ctrl-E to enter paste mode
      // 3. Send the Python code
      // 4. Ctrl-D to execute

      // First Ctrl-C to clean state
      await this.writeStdinRaw(CTRL_C);
      await delay(100);

      // Enter paste mode
      await this.writeStdinRaw(CTRL_E);
      await delay(100);

      // Send the Python source code in chunks
      await this.writeStdinChunked(pythonCode);
      await delay(50);

      // Execute with Ctrl-D
      await this.writeStdinRaw(CTRL_D);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit({ type: 'error', data: `Failed to run program: ${message}` });
      throw error;
    }
  }

  /**
   * Download a compiled program (mpy bytecode) to the hub and run it.
   * This is the standard Pybricks download protocol.
   */
  async downloadAndRun(compiledData: Uint8Array, slot = 0): Promise<void> {
    if (!this.isConnected || !this.pybricksControlChar) {
      throw new Error('Not connected to hub');
    }

    try {
      if (this.maxUserProgramSize > 0 && compiledData.length > this.maxUserProgramSize) {
        throw new Error(
          `Program too large for hub (${compiledData.length} bytes > max ${this.maxUserProgramSize} bytes)`
        );
      }

      // Stop any currently running program first
      if (this.isProgramRunning) {
        await this.stopProgram();
        await this.waitForProgramStop(3000);
      }

      let completed = false;
      let lastDownloadError: unknown;

      for (let transferAttempt = 0; transferAttempt < 2; transferAttempt++) {
        try {
          this.emit({
            type: 'info',
            data: transferAttempt === 0 ? 'Downloading program...' : 'Retrying download...'
          });

          // Step 1: Clear previous program slot
          await this.writeProgramMeta(0);
          await delay(25);

          // Step 2: Set target program size before data upload
          await this.writeProgramMeta(compiledData.length);
          await delay(25);

          // Step 3: Write program data in chunks
          await this.writeProgramData(compiledData);
          await delay(40);

          // Step 4: Start the program (retry if BLE stack is briefly busy)
          let started = false;
          let lastStartError: unknown;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              await this.startProgram(slot);
              started = true;
              break;
            } catch (error) {
              lastStartError = error;
              if (!isLikelyGattTransientError(error) || attempt === 2) {
                throw error;
              }
              await delay(150 * (attempt + 1));
            }
          }

          if (!started && lastStartError) {
            throw lastStartError;
          }

          completed = true;
          break;
        } catch (error) {
          lastDownloadError = error;
          if (!isLikelyGattTransientError(error) || transferAttempt === 1) {
            throw error;
          }
          await delay(250);
        }
      }

      if (!completed && lastDownloadError) {
        throw lastDownloadError;
      }

      this.emit({ type: 'info', data: 'Program started!' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.emit({ type: 'error', data: `Failed to download program: ${message}` });
      throw error;
    }
  }

  /**
   * Stop the currently running program
   */
  async stopProgram(): Promise<void> {
    if (!this.isConnected || !this.pybricksControlChar) {
      throw new Error('Not connected to hub');
    }

    const command = new Uint8Array([CommandType.STOP_USER_PROGRAM]);
    await this.serialWrite(this.pybricksControlChar, command);
    this.emit({ type: 'info', data: 'Stop command sent' });
  }

  /**
   * Start interactive REPL
   */
  async startRepl(): Promise<void> {
    if (!this.isConnected || !this.pybricksControlChar) {
      throw new Error('Not connected to hub');
    }

    if (this._useLegacyProtocol) {
      // Legacy: use START_REPL command (Pybricks Profile < v1.4.0)
      const command = new Uint8Array([CommandType.START_REPL]);
      await this.serialWrite(this.pybricksControlChar, command);
    } else {
      // Modern: use START_USER_PROGRAM with REPL builtin ID (Pybricks Profile >= v1.4.0)
      const command = new Uint8Array([CommandType.START_USER_PROGRAM, BuiltinProgramId.REPL]);
      await this.serialWrite(this.pybricksControlChar, command);
    }
    this.emit({ type: 'info', data: 'REPL started' });
  }

  /**
   * Write raw bytes to stdin (for REPL input)
   */
  private async writeStdinRaw(data: string): Promise<void> {
    if (!this.isConnected || !this.pybricksControlChar) {
      return;
    }

    const encoded = this.encoder.encode(data);
    const chunkSize = Math.max(this.maxWriteSize - 1, 19); // 1 byte for command prefix

    for (let i = 0; i < encoded.length; i += chunkSize) {
      const chunk = encoded.slice(i, i + chunkSize);
      const payload = new Uint8Array(1 + chunk.length);
      payload[0] = CommandType.WRITE_STDIN;
      payload.set(chunk, 1);

      await this.serialWrite(this.pybricksControlChar, payload);

      // Small delay between chunks to avoid BLE congestion
      if (i + chunkSize < encoded.length) {
        await delay(10);
      }
    }
  }

  /**
   * Send Python source code via stdin in appropriately-sized chunks.
   * Handles line splitting for proper paste mode behavior.
   */
  private async writeStdinChunked(pythonCode: string): Promise<void> {
    // In paste mode, send code line by line to avoid buffer overflow
    const lines = pythonCode.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] + (i < lines.length - 1 ? '\n' : '');
      await this.writeStdinRaw(line);
      // Small delay between lines to let the REPL process
      await delay(5);
    }
  }

  /**
   * Write data to the hub's stdin (public API for terminal input)
   */
  async writeStdin(data: string): Promise<void> {
    if (!this.isConnected || !this.pybricksControlChar) {
      return;
    }

    await this.writeStdinRaw(data);
  }

  /**
   * Wait for the program to stop, with timeout
   */
  private waitForProgramStop(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isProgramRunning) {
        resolve();
        return;
      }

      const startTime = Date.now();
      const check = () => {
        if (!this.isProgramRunning || Date.now() - startTime > timeoutMs) {
          resolve();
          return;
        }
        setTimeout(check, 50);
      };
      check();
    });
  }

  // --- Private methods ---

  private async readDeviceInfo(): Promise<void> {
    try {
      const service = await this.gattServer!.getPrimaryService(DEVICE_INFO_SERVICE_UUID);

      try {
        const fwChar = await service.getCharacteristic(FIRMWARE_REVISION_CHAR_UUID);
        const fwValue = await fwChar.readValue();
        this._hubInfo.firmwareVersion = this.decoder.decode(fwValue);
      } catch {
        this._hubInfo.firmwareVersion = 'unknown';
      }

      try {
        const swChar = await service.getCharacteristic(SOFTWARE_REVISION_CHAR_UUID);
        const swValue = await swChar.readValue();
        this._hubInfo.softwareVersion = this.decoder.decode(swValue);
      } catch {
        this._hubInfo.softwareVersion = 'unknown';
      }
    } catch {
      this.emit({ type: 'info', data: 'Device Information Service not available' });
    }
  }

  private async setupPybricksService(): Promise<void> {
    const service = await this.gattServer!.getPrimaryService(PYBRICKS_SERVICE_UUID);

    // Control/Event characteristic
    this.pybricksControlChar = await service.getCharacteristic(
      PYBRICKS_CONTROL_EVENT_CHAR_UUID
    );

    // IMPORTANT: On Linux (BlueZ), notifications may not work after reconnect
    // unless we stop and restart them. This is a known Chromium/BlueZ bug.
    // https://crbug.com/1170085
    try {
      await this.pybricksControlChar.stopNotifications();
    } catch {
      // May fail if notifications weren't started - that's OK
    }

    // Subscribe to notifications
    await this.pybricksControlChar.startNotifications();
    this.pybricksControlChar.addEventListener(
      'characteristicvaluechanged',
      (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (target.value) {
          this.handlePybricksEvent(target.value);
        }
      }
    );

    // Read hub capabilities (introduced in Pybricks Profile v1.2.0)
    try {
      this.hubCapabilitiesChar = await service.getCharacteristic(
        PYBRICKS_HUB_CAPABILITIES_CHAR_UUID
      );
      const capValue = await this.hubCapabilitiesChar.readValue();
      this.parseHubCapabilities(capValue);
      this._useLegacyProtocol = false;
    } catch {
      // Older firmware may not have capabilities characteristic
      this._useLegacyProtocol = true;
      this.emit({ type: 'info', data: 'Hub capabilities not available (older firmware?)' });
    }
  }

  private async setupUartService(): Promise<void> {
    try {
      const service = await this.gattServer!.getPrimaryService(NORDIC_UART_SERVICE_UUID);

      await service.getCharacteristic(NORDIC_UART_RX_CHAR_UUID);
      this.uartTxChar = await service.getCharacteristic(NORDIC_UART_TX_CHAR_UUID);

      // Stop then start notifications (Linux BlueZ workaround)
      try {
        await this.uartTxChar.stopNotifications();
      } catch {
        // OK if not previously started
      }

      // Subscribe to TX notifications (data from hub)
      await this.uartTxChar.startNotifications();
      this.uartTxChar.addEventListener('characteristicvaluechanged', (event: Event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (target.value) {
          const text = this.decoder.decode(target.value);
          this.emit({ type: 'output', data: text });
        }
      });
    } catch {
      this.emit({ type: 'info', data: 'Nordic UART Service not available' });
    }
  }

  private handlePybricksEvent(data: DataView): void {
    const eventType = data.getUint8(0);

    switch (eventType) {
      case EventType.STATUS_REPORT: {
        if (data.byteLength >= 5) {
          const status = data.getUint32(1, true);
          const wasRunning = this._previouslyRunning;
          const isNowRunning = (status & StatusFlag.USER_PROGRAM_RUNNING) !== 0;
          this._previouslyRunning = isNowRunning;
          this.lastStatus = status;
          this.emit({ type: 'status', status });

          // Detect program finished: was running, now stopped
          if (wasRunning && !isNowRunning) {
            this.emit({ type: 'info', data: 'Program finished.' });
            // Send stop command to ensure all motors/outputs are stopped
            this.stopAfterProgram();
          }

          if (status & StatusFlag.BATTERY_LOW_VOLTAGE_WARNING) {
            this.emit({ type: 'info', data: '⚠️ Battery low!' });
          }
        }
        break;
      }
      case EventType.WRITE_STDOUT: {
        const text = this.decoder.decode(
          new Uint8Array(data.buffer, data.byteOffset + 1)
        );
        this.emit({ type: 'output', data: text });
        break;
      }
      case EventType.WRITE_APP_DATA: {
        // App data - can be used for custom communication
        break;
      }
    }
  }

  /**
   * Parse hub capabilities characteristic value.
   *
   * Layout (Pybricks Profile v1.2.0+):
   *   offset 0: maxWriteSize (uint16 LE) - max BLE characteristic write size
   *   offset 2: flags (uint32 LE) - capability flags
   *   offset 6: maxUserProgramSize (uint32 LE) - max program storage
   *   offset 10: numOfSlots (uint8) - number of program slots (v1.5.0+)
   */
  private parseHubCapabilities(data: DataView): void {
    if (data.byteLength >= 10) {
      this.maxWriteSize = data.getUint16(0, true);
      this.hubCapabilityFlags = data.getUint32(2, true);
      this.maxUserProgramSize = data.getUint32(6, true);

      this.emit({
        type: 'info',
        data: `Hub caps: maxWrite=${this.maxWriteSize}, maxProgram=${this.maxUserProgramSize}, flags=0x${this.hubCapabilityFlags.toString(16)}`,
      });
    } else if (data.byteLength >= 6) {
      // Partial capabilities (older firmware)
      this.maxWriteSize = data.getUint16(0, true);
      this.hubCapabilityFlags = data.getUint32(2, true);
    }

    // Safety cap: ensure maxWriteSize is at least 20 and reasonable
    if (this.maxWriteSize < 20) {
      this.maxWriteSize = 20;
    }
  }

  /**
   * Write program metadata (used for download protocol).
   * size=0 clears the current stored program.
   */
  private async writeProgramMeta(size: number): Promise<void> {
    const payload = new Uint8Array(5);
    payload[0] = CommandType.WRITE_USER_PROGRAM_META;
    new DataView(payload.buffer).setUint32(1, size, true);
    await this.serialWrite(this.pybricksControlChar!, payload);
  }

  /**
   * Write compiled program data to hub RAM in chunks (download protocol).
   */
  private async writeProgramData(data: Uint8Array): Promise<void> {
    // Chunk size = max write size - 5 bytes overhead (1 cmd + 4 offset)
    // Use a very conservative cap for browser/OS BLE stack stability.
    const chunkSize = Math.max(Math.min(this.maxWriteSize - 5, 15), 15);
    let offset = 0;
    const totalChunks = Math.ceil(data.length / chunkSize);

    while (offset < data.length) {
      const chunk = data.slice(offset, offset + chunkSize);
      const payload = new Uint8Array(5 + chunk.length);
      payload[0] = CommandType.WRITE_USER_RAM;
      new DataView(payload.buffer).setUint32(1, offset, true);
      payload.set(chunk, 5);

      let written = false;
      let lastChunkError: unknown;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          if (this.preferWriteWithoutResponseForProgram) {
            try {
              await this.serialWrite(this.pybricksControlChar!, payload, false, 1);
            } catch {
              this.preferWriteWithoutResponseForProgram = false;
              await this.serialWrite(this.pybricksControlChar!, payload, true, 3);
            }
          } else {
            await this.serialWrite(this.pybricksControlChar!, payload, true, 3);
          }
          written = true;
          break;
        } catch (error) {
          lastChunkError = error;
          if (!isLikelyGattTransientError(error) || attempt === 3) {
            throw error;
          }
          await delay(40 * (attempt + 1));
        }
      }

      if (!written && lastChunkError) {
        throw lastChunkError;
      }

      offset += chunk.length;

      // Progress feedback
      const currentChunk = Math.ceil(offset / chunkSize);
      if (totalChunks > 5 && currentChunk % 5 === 0) {
        this.emit({
          type: 'info',
          data: `Downloading... ${Math.round((offset / data.length) * 100)}%`,
        });
      }

      // Small delay between chunks to avoid BLE congestion
      await delay(25);
    }
  }

  /**
   * Start the user program on the hub.
   */
  private async startProgram(slot = 0): Promise<void> {
    if (this._useLegacyProtocol) {
      // Legacy: START_USER_PROGRAM with no parameter
      const command = new Uint8Array([CommandType.START_USER_PROGRAM]);
      await this.serialWrite(this.pybricksControlChar!, command);
    } else {
      // Modern: START_USER_PROGRAM with slot ID
      const command = new Uint8Array([CommandType.START_USER_PROGRAM, slot]);
      await this.serialWrite(this.pybricksControlChar!, command);
    }
  }

  /**
   * Send a stop command after program finishes to ensure motors are stopped.
   * This is fire-and-forget — we don't want to block or throw.
   */
  private stopAfterProgram(): void {
    if (!this.isConnected || !this.pybricksControlChar) return;

    const command = new Uint8Array([CommandType.STOP_USER_PROGRAM]);
    this.serialWrite(this.pybricksControlChar, command).catch(() => {
      // Ignore errors — hub might have already cleaned up
    });
  }

  private handleDisconnect(): void {
    this.emit({ type: 'disconnected' });
    this.emit({ type: 'info', data: 'Disconnected from hub' });
    this.cleanup();
  }

  private cleanup(): void {
    this.pybricksControlChar = null;
    this.uartTxChar = null;
    this.hubCapabilitiesChar = null;
    this.gattServer = null;
    this.device = null;
    this.lastStatus = 0;
    this._previouslyRunning = false;
    this._useLegacyProtocol = false;
    this.writeQueue = Promise.resolve();
  }
}

// Singleton instance
export const bleService = new BleService();
