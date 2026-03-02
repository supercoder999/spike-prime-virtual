/**
 * Simulation block definitions + JavaScript generators for Robot 3D Simulator.
 * These blocks are used in the code_pybricks Blocks tab alongside the Pybricks blocks.
 * They generate JavaScript `await api.*` calls for the 3D simulator engine.
 */
import * as Blockly from 'blockly';
import { javascriptGenerator } from 'blockly/javascript';

// ===== Register Simulation Block Definitions =====

let _simBlocksRegistered = false;

export function registerSimBlocks(): void {
  if (_simBlocksRegistered) return;
  _simBlocksRegistered = true;

  Blockly.defineBlocksWithJsonArray([
    // ──────────── EVENTS ────────────
    {
      type: 'sim_when_run',
      message0: 'when\n▶ run %1',
      args0: [{ type: 'input_statement', name: 'DO' }],
      style: 'event_blocks',
      tooltip: 'Entry point for simulation block programs.',
      hat: 'cap',
    },

    // ──────────── MOVEMENT ────────────
    {
      type: 'sim_go_straight',
      message0: 'go straight %1 %2 then %3',
      args0: [
        { type: 'input_value', name: 'VALUE', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'UNIT',
          options: [
            ['cm', 'CM'],
            ['rotations', 'ROTATIONS'],
          ],
        },
        {
          type: 'field_dropdown',
          name: 'STOP_MODE',
          options: [
            ['hold', 'HOLD'],
            ['brake', 'BRAKE'],
            ['coast', 'COAST'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip:
        'Drive straight forward by a distance in cm or wheel rotations.\nHold: locks position. Brake: resists movement. Coast: cuts power.',
    },
    {
      type: 'sim_turn_left_degrees',
      message0: 'turn left %1 degrees %2 left wheel %3 % right wheel %4 %',
      args0: [
        { type: 'input_value', name: 'DEGREES', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'TURN_TYPE',
          options: [
            ['point turn', 'POINT'],
            ['pivot turn', 'PIVOT'],
            ['curve turn', 'CURVE'],
          ],
        },
        { type: 'input_value', name: 'LEFT_SPEED', check: 'Number' },
        { type: 'input_value', name: 'RIGHT_SPEED', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip:
        'Turn left. Point = spin in place. Pivot/Curve = set each wheel speed (-100 to 100%).',
    },
    {
      type: 'sim_turn_right_degrees',
      message0: 'turn right %1 degrees %2 left wheel %3 % right wheel %4 %',
      args0: [
        { type: 'input_value', name: 'DEGREES', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'TURN_TYPE',
          options: [
            ['point turn', 'POINT'],
            ['pivot turn', 'PIVOT'],
            ['curve turn', 'CURVE'],
          ],
        },
        { type: 'input_value', name: 'LEFT_SPEED', check: 'Number' },
        { type: 'input_value', name: 'RIGHT_SPEED', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip:
        'Turn right. Point = spin in place. Pivot/Curve = set each wheel speed (-100 to 100%).',
    },
    {
      type: 'sim_set_movement_speed',
      message0: 'set movement speed to %1 %%',
      args0: [{ type: 'input_value', name: 'SPEED', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Set the default speed (%) used by go straight and turn blocks.',
    },
    {
      type: 'sim_drive_for_seconds',
      message0: 'drive throttle %1 %% steering %2 %% for %3 sec',
      args0: [
        { type: 'input_value', name: 'THROTTLE', check: 'Number' },
        { type: 'input_value', name: 'STEERING', check: 'Number' },
        { type: 'input_value', name: 'SECONDS', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Drive with throttle/steering for a duration and then stop.',
    },
    {
      type: 'sim_set_throttle',
      message0: 'set throttle %1 %%',
      args0: [{ type: 'input_value', name: 'THROTTLE', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Set forward/reverse motor power from -100 to 100.',
    },
    {
      type: 'sim_set_steering',
      message0: 'set steering %1 %%',
      args0: [{ type: 'input_value', name: 'STEERING', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Set steering from -100 to 100.',
    },
    {
      type: 'sim_set_brake',
      message0: 'set brake %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'BRAKE_STATE',
          options: [
            ['on', 'ON'],
            ['off', 'OFF'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Turn brake on/off.',
    },
    {
      type: 'sim_stop_robot',
      message0: 'stop robot',
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Stop throttle and steering immediately.',
    },

    // ──────────── MOTORS ────────────
    {
      type: 'sim_run_motor_for',
      message0: 'run motor %1 for %2 %3',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [
            ['A', 'A'],
            ['B', 'B'],
            ['C', 'C'],
            ['D', 'D'],
            ['E', 'E'],
            ['F', 'F'],
          ],
        },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'UNIT',
          options: [
            ['rotations', 'ROTATIONS'],
            ['degrees', 'DEGREES'],
            ['seconds', 'SECONDS'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Run a single motor for a set amount, then stop.',
    },
    {
      type: 'sim_start_motor',
      message0: 'start motor %1 at %2 %%',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [
            ['A', 'A'],
            ['B', 'B'],
            ['C', 'C'],
            ['D', 'D'],
            ['E', 'E'],
            ['F', 'F'],
          ],
        },
        { type: 'input_value', name: 'SPEED', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Start a motor running continuously at the given speed (%).',
    },
    {
      type: 'sim_stop_motor',
      message0: 'stop motor %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [
            ['A', 'A'],
            ['B', 'B'],
            ['C', 'C'],
            ['D', 'D'],
            ['E', 'E'],
            ['F', 'F'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Stop a specific motor.',
    },
    {
      type: 'sim_reset_motor_encoder',
      message0: 'reset motor %1 encoder',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [
            ['A', 'A'],
            ['B', 'B'],
            ['C', 'C'],
            ['D', 'D'],
            ['E', 'E'],
            ['F', 'F'],
          ],
        },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Reset the motor encoder to zero.',
    },
    {
      type: 'sim_open_claw',
      message0: 'open claw',
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Open the claw.',
    },
    {
      type: 'sim_close_claw',
      message0: 'close claw',
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Close the claw.',
    },

    // ──────────── SENSING ────────────
    {
      type: 'sim_get_x_cm',
      message0: 'x position (cm)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current robot X coordinate in centimeters.',
    },
    {
      type: 'sim_get_y_cm',
      message0: 'y position (cm)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current robot Y coordinate in centimeters.',
    },
    {
      type: 'sim_get_heading_deg',
      message0: 'heading (deg)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current robot heading in degrees.',
    },
    {
      type: 'sim_get_speed_cm_s',
      message0: 'speed (cm/s)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current robot speed in centimeters per second.',
    },
    {
      type: 'sim_is_moving',
      message0: 'is moving?',
      output: 'Boolean',
      style: 'sensing_blocks',
      tooltip: 'True while the robot is moving.',
    },
    {
      type: 'sim_left_color',
      message0: 'left color sensor',
      output: 'String',
      style: 'sensing_blocks',
      tooltip: 'Returns the color under the left sensor (black or white).',
    },
    {
      type: 'sim_right_color',
      message0: 'right color sensor',
      output: 'String',
      style: 'sensing_blocks',
      tooltip: 'Returns the color under the right sensor (black or white).',
    },
    {
      type: 'sim_distance_sensor',
      message0: 'distance sensor (cm)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Ultrasonic distance sensor reading in centimeters.',
    },
    {
      type: 'sim_force_sensor',
      message0: 'force sensor (N)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Force sensor reading in Newtons.',
    },
    {
      type: 'sim_force_sensor_pressed',
      message0: 'force sensor pressed?',
      output: 'Boolean',
      style: 'sensing_blocks',
      tooltip: 'True when the robot is pressing against an obstacle.',
    },
    {
      type: 'sim_motor_position',
      message0: 'motor %1 position',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [
            ['A', 'A'],
            ['B', 'B'],
            ['C', 'C'],
            ['D', 'D'],
            ['E', 'E'],
            ['F', 'F'],
          ],
        },
      ],
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current motor encoder position in degrees.',
    },
    {
      type: 'sim_motor_speed',
      message0: 'motor %1 speed',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [
            ['A', 'A'],
            ['B', 'B'],
            ['C', 'C'],
            ['D', 'D'],
            ['E', 'E'],
            ['F', 'F'],
          ],
        },
      ],
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current motor speed in degrees per second.',
    },
    {
      type: 'sim_timer',
      message0: 'timer',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Seconds elapsed since the program started.',
    },
    {
      type: 'sim_reset_timer',
      message0: 'reset timer',
      previousStatement: null,
      nextStatement: null,
      style: 'sensing_blocks',
      tooltip: 'Reset the program timer to zero.',
    },
    {
      type: 'sim_reset_gyro',
      message0: 'reset gyro',
      previousStatement: null,
      nextStatement: null,
      style: 'sensing_blocks',
      tooltip: 'Reset the gyroscope heading to 0 degrees.',
    },

    // ──────────── SOUND & DISPLAY ────────────
    {
      type: 'sim_play_beep',
      message0: 'play beep for %1 sec',
      args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'event_blocks',
      tooltip: 'Play a beep tone for the specified duration.',
    },
    {
      type: 'sim_play_beep_note',
      message0: 'play note %1 for %2 sec',
      args0: [
        {
          type: 'field_dropdown',
          name: 'NOTE',
          options: [
            ['C4', '262'],
            ['D4', '294'],
            ['E4', '330'],
            ['F4', '349'],
            ['G4', '392'],
            ['A4', '440'],
            ['B4', '494'],
            ['C5', '523'],
          ],
        },
        { type: 'input_value', name: 'SECONDS', check: 'Number' },
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'event_blocks',
      tooltip: 'Play a musical note for the specified duration.',
    },
    {
      type: 'sim_display_text',
      message0: 'write %1 on display',
      args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }],
      previousStatement: null,
      nextStatement: null,
      style: 'event_blocks',
      tooltip: 'Show text on the 5×5 LED matrix display.',
    },
    {
      type: 'sim_display_clear',
      message0: 'clear display',
      previousStatement: null,
      nextStatement: null,
      style: 'event_blocks',
      tooltip: 'Turn off all pixels on the 5×5 LED matrix display.',
    },

    // ──────────── CONTROL ────────────
    {
      type: 'sim_wait_seconds',
      message0: 'wait %1 sec',
      args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }],
      previousStatement: null,
      nextStatement: null,
      style: 'control_blocks',
      tooltip: 'Pause program execution.',
    },
  ]);
}

// ===== JavaScript Code Generators (for simulator API) =====

export function registerSimGenerators(): void {
  // Event
  javascriptGenerator.forBlock['sim_when_run'] = (block: Blockly.Block, generator: any) => {
    const branch = generator.statementToCode(block, 'DO');
    return `${branch}\n`;
  };

  // Movement
  javascriptGenerator.forBlock['sim_go_straight'] = (block: Blockly.Block, generator: any) => {
    const value = generator.valueToCode(block, 'VALUE', 0) || '10';
    const unit = block.getFieldValue('UNIT');
    const stopMode = block.getFieldValue('STOP_MODE') || 'BRAKE';
    return `await api.goStraight(${value}, '${unit}', '${stopMode}');\n`;
  };

  javascriptGenerator.forBlock['sim_turn_left_degrees'] = (block: Blockly.Block, generator: any) => {
    const degrees = generator.valueToCode(block, 'DEGREES', 0) || '90';
    const turnType = block.getFieldValue('TURN_TYPE') || 'POINT';
    const leftSpeed = generator.valueToCode(block, 'LEFT_SPEED', 0) || '50';
    const rightSpeed = generator.valueToCode(block, 'RIGHT_SPEED', 0) || '-50';
    return `await api.turnLeftDegrees(${degrees}, '${turnType}', ${leftSpeed}, ${rightSpeed});\n`;
  };

  javascriptGenerator.forBlock['sim_turn_right_degrees'] = (block: Blockly.Block, generator: any) => {
    const degrees = generator.valueToCode(block, 'DEGREES', 0) || '90';
    const turnType = block.getFieldValue('TURN_TYPE') || 'POINT';
    const leftSpeed = generator.valueToCode(block, 'LEFT_SPEED', 0) || '-50';
    const rightSpeed = generator.valueToCode(block, 'RIGHT_SPEED', 0) || '50';
    return `await api.turnRightDegrees(${degrees}, '${turnType}', ${leftSpeed}, ${rightSpeed});\n`;
  };

  javascriptGenerator.forBlock['sim_set_movement_speed'] = (block: Blockly.Block, generator: any) => {
    const speed = generator.valueToCode(block, 'SPEED', 0) || '60';
    return `await api.setMovementSpeed(${speed});\n`;
  };

  javascriptGenerator.forBlock['sim_drive_for_seconds'] = (block: Blockly.Block, generator: any) => {
    const throttle = generator.valueToCode(block, 'THROTTLE', 0) || '0';
    const steering = generator.valueToCode(block, 'STEERING', 0) || '0';
    const seconds = generator.valueToCode(block, 'SECONDS', 0) || '1';
    return `await api.driveForSeconds(${throttle}, ${steering}, ${seconds});\n`;
  };

  javascriptGenerator.forBlock['sim_set_throttle'] = (block: Blockly.Block, generator: any) => {
    const throttle = generator.valueToCode(block, 'THROTTLE', 0) || '0';
    return `await api.setThrottle(${throttle});\n`;
  };

  javascriptGenerator.forBlock['sim_set_steering'] = (block: Blockly.Block, generator: any) => {
    const steering = generator.valueToCode(block, 'STEERING', 0) || '0';
    return `await api.setSteering(${steering});\n`;
  };

  javascriptGenerator.forBlock['sim_set_brake'] = (block: Blockly.Block) => {
    const state = block.getFieldValue('BRAKE_STATE') === 'ON';
    return `await api.setBrake(${state});\n`;
  };

  javascriptGenerator.forBlock['sim_stop_robot'] = () => 'await api.stop();\n';

  // Motors
  javascriptGenerator.forBlock['sim_run_motor_for'] = (block: Blockly.Block, generator: any) => {
    const motor = block.getFieldValue('MOTOR');
    const value = generator.valueToCode(block, 'VALUE', 0) || '1';
    const unit = block.getFieldValue('UNIT');
    return `await api.runMotorFor('${motor}', ${value}, '${unit}');\n`;
  };

  javascriptGenerator.forBlock['sim_start_motor'] = (block: Blockly.Block, generator: any) => {
    const motor = block.getFieldValue('MOTOR');
    const speed = generator.valueToCode(block, 'SPEED', 0) || '75';
    return `await api.startMotor('${motor}', ${speed});\n`;
  };

  javascriptGenerator.forBlock['sim_stop_motor'] = (block: Blockly.Block) => {
    const motor = block.getFieldValue('MOTOR');
    return `await api.stopMotor('${motor}');\n`;
  };

  javascriptGenerator.forBlock['sim_reset_motor_encoder'] = (block: Blockly.Block) => {
    const motor = block.getFieldValue('MOTOR');
    return `await api.resetMotorEncoder('${motor}');\n`;
  };

  javascriptGenerator.forBlock['sim_open_claw'] = () => 'await api.openClaw();\n';
  javascriptGenerator.forBlock['sim_close_claw'] = () => 'await api.closeClaw();\n';

  javascriptGenerator.forBlock['sim_motor_position'] = (block: Blockly.Block) => {
    const motor = block.getFieldValue('MOTOR');
    return [`await api.getMotorPosition('${motor}')`, 0];
  };

  javascriptGenerator.forBlock['sim_motor_speed'] = (block: Blockly.Block) => {
    const motor = block.getFieldValue('MOTOR');
    return [`await api.getMotorSpeed('${motor}')`, 0];
  };

  // Sensing
  javascriptGenerator.forBlock['sim_get_x_cm'] = () => ['await api.getXcm()', 0];
  javascriptGenerator.forBlock['sim_get_y_cm'] = () => ['await api.getYcm()', 0];
  javascriptGenerator.forBlock['sim_get_heading_deg'] = () => ['await api.getHeadingDeg()', 0];
  javascriptGenerator.forBlock['sim_get_speed_cm_s'] = () => ['await api.getSpeedCmPerSec()', 0];
  javascriptGenerator.forBlock['sim_is_moving'] = () => ['await api.isMoving()', 0];
  javascriptGenerator.forBlock['sim_left_color'] = () => ['await api.getLeftColor()', 0];
  javascriptGenerator.forBlock['sim_right_color'] = () => ['await api.getRightColor()', 0];
  javascriptGenerator.forBlock['sim_distance_sensor'] = () => ['await api.getDistanceCm()', 0];
  javascriptGenerator.forBlock['sim_force_sensor'] = () => ['await api.getForceSensorN()', 0];
  javascriptGenerator.forBlock['sim_force_sensor_pressed'] = () => ['await api.isForceSensorPressed()', 0];
  javascriptGenerator.forBlock['sim_timer'] = () => ['await api.getTimer()', 0];
  javascriptGenerator.forBlock['sim_reset_timer'] = () => 'await api.resetTimer();\n';
  javascriptGenerator.forBlock['sim_reset_gyro'] = () => 'await api.resetGyro();\n';

  // Sound & Display
  javascriptGenerator.forBlock['sim_play_beep'] = (block: Blockly.Block, generator: any) => {
    const seconds = generator.valueToCode(block, 'SECONDS', 0) || '0.5';
    return `await api.playBeep(440, ${seconds});\n`;
  };

  javascriptGenerator.forBlock['sim_play_beep_note'] = (block: Blockly.Block, generator: any) => {
    const note = block.getFieldValue('NOTE');
    const seconds = generator.valueToCode(block, 'SECONDS', 0) || '0.5';
    return `await api.playBeep(${note}, ${seconds});\n`;
  };

  javascriptGenerator.forBlock['sim_display_text'] = (block: Blockly.Block, generator: any) => {
    const text = generator.valueToCode(block, 'TEXT', 0) || "'Hello!'";
    return `await api.displayText(${text});\n`;
  };

  javascriptGenerator.forBlock['sim_display_clear'] = () => 'await api.displayClear();\n';

  // Control
  javascriptGenerator.forBlock['sim_wait_seconds'] = (block: Blockly.Block, generator: any) => {
    const seconds = generator.valueToCode(block, 'SECONDS', 0) || '0.2';
    return `await api.waitSeconds(${seconds});\n`;
  };
}

// ===== Simulation Toolbox Categories =====

export const simToolboxCategories = [
  { kind: 'sep' },
  {
    kind: 'category',
    name: '🎮 Sim Events',
    categorystyle: 'event_category',
    contents: [{ kind: 'block', type: 'sim_when_run' }],
  },
  {
    kind: 'category',
    name: '🏎️ Sim Movement',
    categorystyle: 'motion_category',
    contents: [
      {
        kind: 'block',
        type: 'sim_go_straight',
        inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 20 } } } },
      },
      {
        kind: 'block',
        type: 'sim_turn_left_degrees',
        inputs: {
          DEGREES: { shadow: { type: 'math_number', fields: { NUM: 90 } } },
          LEFT_SPEED: { shadow: { type: 'math_number', fields: { NUM: 50 } } },
          RIGHT_SPEED: { shadow: { type: 'math_number', fields: { NUM: -50 } } },
        },
      },
      {
        kind: 'block',
        type: 'sim_turn_right_degrees',
        inputs: {
          DEGREES: { shadow: { type: 'math_number', fields: { NUM: 90 } } },
          LEFT_SPEED: { shadow: { type: 'math_number', fields: { NUM: -50 } } },
          RIGHT_SPEED: { shadow: { type: 'math_number', fields: { NUM: 50 } } },
        },
      },
      {
        kind: 'block',
        type: 'sim_set_movement_speed',
        inputs: { SPEED: { shadow: { type: 'math_number', fields: { NUM: 60 } } } },
      },
      {
        kind: 'block',
        type: 'sim_drive_for_seconds',
        inputs: {
          THROTTLE: { shadow: { type: 'math_number', fields: { NUM: 80 } } },
          STEERING: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          SECONDS: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
        },
      },
      {
        kind: 'block',
        type: 'sim_set_throttle',
        inputs: { THROTTLE: { shadow: { type: 'math_number', fields: { NUM: 60 } } } },
      },
      {
        kind: 'block',
        type: 'sim_set_steering',
        inputs: { STEERING: { shadow: { type: 'math_number', fields: { NUM: 0 } } } },
      },
      { kind: 'block', type: 'sim_set_brake' },
      { kind: 'block', type: 'sim_stop_robot' },
    ],
  },
  {
    kind: 'category',
    name: '🔧 Sim Motors',
    categorystyle: 'motion_category',
    contents: [
      {
        kind: 'block',
        type: 'sim_run_motor_for',
        inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 1 } } } },
      },
      {
        kind: 'block',
        type: 'sim_start_motor',
        inputs: { SPEED: { shadow: { type: 'math_number', fields: { NUM: 75 } } } },
      },
      { kind: 'block', type: 'sim_stop_motor' },
      { kind: 'block', type: 'sim_reset_motor_encoder' },
      { kind: 'block', type: 'sim_motor_position' },
      { kind: 'block', type: 'sim_motor_speed' },
      { kind: 'block', type: 'sim_open_claw' },
      { kind: 'block', type: 'sim_close_claw' },
    ],
  },
  {
    kind: 'category',
    name: '📡 Sim Sensing',
    categorystyle: 'sensing_category',
    contents: [
      { kind: 'block', type: 'sim_distance_sensor' },
      { kind: 'block', type: 'sim_left_color' },
      { kind: 'block', type: 'sim_right_color' },
      { kind: 'block', type: 'sim_get_heading_deg' },
      { kind: 'block', type: 'sim_get_speed_cm_s' },
      { kind: 'block', type: 'sim_force_sensor' },
      { kind: 'block', type: 'sim_force_sensor_pressed' },
      { kind: 'block', type: 'sim_is_moving' },
      { kind: 'block', type: 'sim_get_x_cm' },
      { kind: 'block', type: 'sim_get_y_cm' },
      { kind: 'block', type: 'sim_timer' },
      { kind: 'block', type: 'sim_reset_timer' },
      { kind: 'block', type: 'sim_reset_gyro' },
    ],
  },
  {
    kind: 'category',
    name: '🔊 Sim Sound',
    categorystyle: 'event_category',
    contents: [
      {
        kind: 'block',
        type: 'sim_play_beep',
        inputs: { SECONDS: { shadow: { type: 'math_number', fields: { NUM: 0.5 } } } },
      },
      {
        kind: 'block',
        type: 'sim_play_beep_note',
        inputs: { SECONDS: { shadow: { type: 'math_number', fields: { NUM: 0.5 } } } },
      },
      {
        kind: 'block',
        type: 'sim_display_text',
        inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hello!' } } } },
      },
      { kind: 'block', type: 'sim_display_clear' },
    ],
  },
  {
    kind: 'category',
    name: '⏳ Sim Control',
    categorystyle: 'control_category',
    contents: [
      {
        kind: 'block',
        type: 'sim_wait_seconds',
        inputs: { SECONDS: { shadow: { type: 'math_number', fields: { NUM: 0.5 } } } },
      },
      {
        kind: 'block',
        type: 'controls_repeat_ext',
        inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } },
      },
      { kind: 'block', type: 'controls_whileUntil' },
      { kind: 'block', type: 'controls_if' },
      { kind: 'block', type: 'controls_flow_statements' },
    ],
  },
  {
    kind: 'category',
    name: '🧮 Operators',
    categorystyle: 'operators_category',
    contents: [
      { kind: 'block', type: 'logic_compare' },
      { kind: 'block', type: 'logic_operation' },
      { kind: 'block', type: 'logic_negate' },
      { kind: 'block', type: 'logic_boolean' },
      { kind: 'block', type: 'logic_ternary' },
      { kind: 'block', type: 'math_number' },
      { kind: 'block', type: 'math_arithmetic' },
      { kind: 'block', type: 'math_single' },
      { kind: 'block', type: 'math_round' },
      { kind: 'block', type: 'math_modulo' },
      { kind: 'block', type: 'math_random_int' },
      { kind: 'block', type: 'text' },
      { kind: 'block', type: 'text_join' },
    ],
  },
  {
    kind: 'category',
    name: '📦 Variables',
    categorystyle: 'variable_category',
    custom: 'VARIABLE',
  },
];
