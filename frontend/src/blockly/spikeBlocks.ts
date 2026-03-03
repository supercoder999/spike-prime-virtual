/**
 * Blockly toolbox and block definitions for LEGO Spike Prime (Pybricks)
 * Generates Python code from visual blocks
 */
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

// ===== Custom Block Definitions =====

// --- Hub Blocks ---
Blockly.Blocks['spike_init_hub'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Initialize Spike Prime Hub');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip('Initialize the Spike Prime Hub');
  },
};

Blockly.Blocks['spike_hub_display_image'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Display image on hub');
    this.appendValueInput('IMAGE').setCheck('String').appendField('pattern');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip('Display a 5x5 image on the hub matrix');
  },
};

Blockly.Blocks['spike_hub_light'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Set hub light to')
      .appendField(
        new Blockly.FieldDropdown([
          ['Red', 'Color.RED'],
          ['Green', 'Color.GREEN'],
          ['Blue', 'Color.BLUE'],
          ['Yellow', 'Color.YELLOW'],
          ['Orange', 'Color.ORANGE'],
          ['Violet', 'Color.VIOLET'],
          ['White', 'Color.WHITE'],
          ['None', 'Color.NONE'],
        ]),
        'COLOR'
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip('Set the hub status light color');
  },
};

Blockly.Blocks['spike_hub_beep'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Beep');
    this.appendValueInput('FREQUENCY').setCheck('Number').appendField('frequency');
    this.appendValueInput('DURATION').setCheck('Number').appendField('duration (ms)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip('Make the hub beep');
  },
};

Blockly.Blocks['spike_hub_button_pressed'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Button')
      .appendField(
        new Blockly.FieldDropdown([
          ['Left', 'Button.LEFT'],
          ['Right', 'Button.RIGHT'],
          ['Bluetooth', 'Button.BLUETOOTH'],
        ]),
        'BUTTON'
      )
      .appendField('pressed');
    this.setOutput(true, 'Boolean');
    this.setColour(230);
    this.setTooltip('Check if a hub button is pressed');
  },
};

Blockly.Blocks['spike_hub_buttons_pressed'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Hub buttons pressed list');
    this.setOutput(true, null);
    this.setColour(230);
    this.setTooltip('Get list of currently pressed hub buttons');
  },
};

// --- Motor Blocks ---
Blockly.Blocks['spike_motor_init'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Initialize motor')
      .appendField(new Blockly.FieldVariable('motor_a'), 'VAR')
      .appendField('on port')
      .appendField(
        new Blockly.FieldDropdown([
          ['A', 'Port.A'],
          ['B', 'Port.B'],
          ['C', 'Port.C'],
          ['D', 'Port.D'],
          ['E', 'Port.E'],
          ['F', 'Port.F'],
        ]),
        'PORT'
      )
      .appendField('direction')
      .appendField(
        new Blockly.FieldDropdown([
          ['Clockwise', 'Direction.CLOCKWISE'],
          ['Counterclockwise', 'Direction.COUNTERCLOCKWISE'],
        ]),
        'DIRECTION'
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Create a motor on the specified port');
  },
};

Blockly.Blocks['spike_motor_run'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Run motor')
      .appendField(new Blockly.FieldVariable('motor_a'), 'VAR');
    this.appendValueInput('SPEED').setCheck('Number').appendField('at speed (deg/s)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Run motor at given speed indefinitely');
  },
};

Blockly.Blocks['spike_motor_run_time'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Run motor')
      .appendField(new Blockly.FieldVariable('motor_a'), 'VAR');
    this.appendValueInput('SPEED').setCheck('Number').appendField('at speed (deg/s)');
    this.appendValueInput('TIME').setCheck('Number').appendField('for (ms)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Run motor at given speed for a certain time');
  },
};

Blockly.Blocks['spike_motor_run_angle'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Run motor')
      .appendField(new Blockly.FieldVariable('motor_a'), 'VAR');
    this.appendValueInput('SPEED').setCheck('Number').appendField('at speed (deg/s)');
    this.appendValueInput('ANGLE').setCheck('Number').appendField('for angle (deg)');
    this.appendDummyInput()
      .appendField('then')
      .appendField(
        new Blockly.FieldDropdown([
          ['Coast', 'Stop.COAST'],
          ['Brake', 'Stop.BRAKE'],
          ['Hold', 'Stop.HOLD'],
        ]),
        'STOP'
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Run motor at given speed for a certain angle');
  },
};

Blockly.Blocks['spike_motor_stop'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Stop motor')
      .appendField(new Blockly.FieldVariable('motor_a'), 'VAR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Stop the motor');
  },
};

Blockly.Blocks['spike_motor_angle'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Motor')
      .appendField(new Blockly.FieldVariable('motor_a'), 'VAR')
      .appendField('angle');
    this.setOutput(true, 'Number');
    this.setColour(120);
    this.setTooltip('Get the current angle of the motor');
  },
};

Blockly.Blocks['spike_motor_run_target'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Run motor')
      .appendField(new Blockly.FieldVariable('motor_a'), 'VAR')
      .appendField('to target angle');
    this.appendValueInput('SPEED').setCheck('Number').appendField('speed (deg/s)');
    this.appendValueInput('TARGET_ANGLE').setCheck('Number').appendField('target angle (deg)');
    this.appendDummyInput()
      .appendField('then')
      .appendField(
        new Blockly.FieldDropdown([
          ['Coast', 'Stop.COAST'],
          ['Brake', 'Stop.BRAKE'],
          ['Hold', 'Stop.HOLD'],
        ]),
        'STOP'
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Run motor to target angle');
  },
};

Blockly.Blocks['spike_motor_dc'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Set motor')
      .appendField(new Blockly.FieldVariable('motor_a'), 'VAR')
      .appendField('duty');
    this.appendValueInput('DUTY').setCheck('Number').appendField('(-100 to 100)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Run motor at duty cycle');
  },
};

Blockly.Blocks['spike_motor_reset_angle'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Reset motor')
      .appendField(new Blockly.FieldVariable('motor_a'), 'VAR')
      .appendField('angle to');
    this.appendValueInput('ANGLE').setCheck('Number').appendField('(deg)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip('Reset motor angle');
  },
};

// --- DriveBase Blocks ---
Blockly.Blocks['spike_drivebase_init'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Initialize DriveBase');
    this.appendDummyInput()
      .appendField('Left motor')
      .appendField(new Blockly.FieldVariable('left_motor'), 'LEFT_MOTOR');
    this.appendDummyInput()
      .appendField('Right motor')
      .appendField(new Blockly.FieldVariable('right_motor'), 'RIGHT_MOTOR');
    this.appendValueInput('WHEEL_DIAMETER')
      .setCheck('Number')
      .appendField('Wheel diameter (mm)');
    this.appendValueInput('AXLE_TRACK')
      .setCheck('Number')
      .appendField('Axle track (mm)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
    this.setTooltip('Initialize a DriveBase with two motors');
  },
};

Blockly.Blocks['spike_drivebase_drive'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Drive');
    this.appendValueInput('SPEED').setCheck('Number').appendField('speed (mm/s)');
    this.appendValueInput('TURN_RATE').setCheck('Number').appendField('turn rate (deg/s)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
    this.setTooltip('Drive at given speed and turn rate');
  },
};

Blockly.Blocks['spike_drivebase_settings_speed'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('DriveBase straight speed');
    this.appendValueInput('SPEED').setCheck('Number').appendField('(mm/s)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
    this.setTooltip('Set DriveBase straight speed setting');
  },
};

Blockly.Blocks['spike_drivebase_settings_acceleration'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('DriveBase straight acceleration');
    this.appendValueInput('ACCEL').setCheck('Number').appendField('(mm/s²)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
    this.setTooltip('Set DriveBase straight acceleration setting');
  },
};

Blockly.Blocks['spike_drivebase_settings_turn_rate'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('DriveBase turn rate');
    this.appendValueInput('TURN_RATE').setCheck('Number').appendField('(deg/s)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
    this.setTooltip('Set DriveBase turn rate setting');
  },
};

Blockly.Blocks['spike_drivebase_use_gyro'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('DriveBase use gyro')
      .appendField(
        new Blockly.FieldDropdown([
          ['True', 'True'],
          ['False', 'False'],
        ]),
        'ENABLED'
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
    this.setTooltip('Enable or disable DriveBase gyro usage');
  },
};

Blockly.Blocks['spike_drivebase_straight'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Drive straight');
    this.appendValueInput('DISTANCE').setCheck('Number').appendField('distance (mm)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
    this.setTooltip('Drive straight for given distance');
  },
};

Blockly.Blocks['spike_drivebase_turn'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Turn');
    this.appendValueInput('ANGLE').setCheck('Number').appendField('angle (degrees)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
    this.setTooltip('Turn in place for given angle');
  },
};

Blockly.Blocks['spike_drivebase_stop'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Stop driving');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
    this.setTooltip('Stop the drive base');
  },
};

Blockly.Blocks['spike_drivebase_reset'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Reset DriveBase distance/angle');
    this.appendValueInput('DISTANCE').setCheck('Number').appendField('distance (mm)');
    this.appendValueInput('ANGLE').setCheck('Number').appendField('angle (deg)');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(65);
    this.setTooltip('Reset DriveBase odometry values');
  },
};

Blockly.Blocks['spike_drivebase_distance'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('DriveBase distance');
    this.setOutput(true, 'Number');
    this.setColour(65);
    this.setTooltip('Get traveled distance in mm');
  },
};

Blockly.Blocks['spike_drivebase_angle'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('DriveBase angle');
    this.setOutput(true, 'Number');
    this.setColour(65);
    this.setTooltip('Get turned angle in degrees');
  },
};

// --- Sensor Blocks ---
Blockly.Blocks['spike_color_sensor_init'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Initialize color sensor')
      .appendField(new Blockly.FieldVariable('color_sensor'), 'VAR')
      .appendField('on port')
      .appendField(
        new Blockly.FieldDropdown([
          ['A', 'Port.A'],
          ['B', 'Port.B'],
          ['C', 'Port.C'],
          ['D', 'Port.D'],
          ['E', 'Port.E'],
          ['F', 'Port.F'],
        ]),
        'PORT'
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setTooltip('Create a color sensor on the specified port');
  },
};

Blockly.Blocks['spike_color_sensor_color'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Color sensor')
      .appendField(new Blockly.FieldVariable('color_sensor'), 'VAR')
      .appendField('color');
    this.setOutput(true, null);
    this.setColour(20);
    this.setTooltip('Get the detected color');
  },
};

Blockly.Blocks['spike_color_sensor_reflection'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Color sensor')
      .appendField(new Blockly.FieldVariable('color_sensor'), 'VAR')
      .appendField('reflection');
    this.setOutput(true, 'Number');
    this.setColour(20);
    this.setTooltip('Get the reflected light intensity (0-100%)');
  },
};

Blockly.Blocks['spike_color_sensor_ambient'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Color sensor')
      .appendField(new Blockly.FieldVariable('color_sensor'), 'VAR')
      .appendField('ambient');
    this.setOutput(true, 'Number');
    this.setColour(20);
    this.setTooltip('Get ambient light intensity (0-100%)');
  },
};

Blockly.Blocks['spike_color_sensor_hsv'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Color sensor')
      .appendField(new Blockly.FieldVariable('color_sensor'), 'VAR')
      .appendField('HSV');
    this.setOutput(true, null);
    this.setColour(20);
    this.setTooltip('Get HSV tuple from color sensor');
  },
};

Blockly.Blocks['spike_ultrasonic_init'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Initialize ultrasonic sensor')
      .appendField(new Blockly.FieldVariable('ultrasonic'), 'VAR')
      .appendField('on port')
      .appendField(
        new Blockly.FieldDropdown([
          ['A', 'Port.A'],
          ['B', 'Port.B'],
          ['C', 'Port.C'],
          ['D', 'Port.D'],
          ['E', 'Port.E'],
          ['F', 'Port.F'],
        ]),
        'PORT'
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setTooltip('Create an ultrasonic sensor on the specified port');
  },
};

Blockly.Blocks['spike_ultrasonic_distance'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Ultrasonic sensor')
      .appendField(new Blockly.FieldVariable('ultrasonic'), 'VAR')
      .appendField('distance (mm)');
    this.setOutput(true, 'Number');
    this.setColour(20);
    this.setTooltip('Get the measured distance in mm');
  },
};

Blockly.Blocks['spike_ultrasonic_presence'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Ultrasonic sensor')
      .appendField(new Blockly.FieldVariable('ultrasonic'), 'VAR')
      .appendField('presence');
    this.setOutput(true, 'Boolean');
    this.setColour(20);
    this.setTooltip('Check if another ultrasonic sensor is nearby');
  },
};

Blockly.Blocks['spike_force_sensor_init'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Initialize force sensor')
      .appendField(new Blockly.FieldVariable('force_sensor'), 'VAR')
      .appendField('on port')
      .appendField(
        new Blockly.FieldDropdown([
          ['A', 'Port.A'],
          ['B', 'Port.B'],
          ['C', 'Port.C'],
          ['D', 'Port.D'],
          ['E', 'Port.E'],
          ['F', 'Port.F'],
        ]),
        'PORT'
      );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(20);
    this.setTooltip('Create a force sensor on the specified port');
  },
};

Blockly.Blocks['spike_force_sensor_force'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Force sensor')
      .appendField(new Blockly.FieldVariable('force_sensor'), 'VAR')
      .appendField('force (N)');
    this.setOutput(true, 'Number');
    this.setColour(20);
    this.setTooltip('Get the measured force in Newtons');
  },
};

Blockly.Blocks['spike_force_sensor_pressed'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Force sensor')
      .appendField(new Blockly.FieldVariable('force_sensor'), 'VAR')
      .appendField('pressed');
    this.setOutput(true, 'Boolean');
    this.setColour(20);
    this.setTooltip('Check if the force sensor is pressed');
  },
};

Blockly.Blocks['spike_force_sensor_distance'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Force sensor')
      .appendField(new Blockly.FieldVariable('force_sensor'), 'VAR')
      .appendField('distance (mm)');
    this.setOutput(true, 'Number');
    this.setColour(20);
    this.setTooltip('Get force sensor distance');
  },
};

// --- Control Blocks ---
Blockly.Blocks['spike_wait'] = {
  init: function (this: Blockly.Block) {
    this.appendValueInput('TIME').setCheck('Number').appendField('Wait');
    this.appendDummyInput().appendField('milliseconds');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
    this.setTooltip('Wait for a specified time in milliseconds');
  },
};

Blockly.Blocks['spike_print'] = {
  init: function (this: Blockly.Block) {
    this.appendValueInput('TEXT').appendField('Print');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip('Print text to the console');
  },
};

Blockly.Blocks['spike_comment'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Comment')
      .appendField(new Blockly.FieldTextInput('my note'), 'TEXT');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
    this.setTooltip('Add a Python comment line');
  },
};

Blockly.Blocks['spike_stopwatch'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput().appendField('Create StopWatch');
    this.setOutput(true, null);
    this.setColour(290);
    this.setTooltip('Create a new StopWatch');
  },
};

Blockly.Blocks['spike_stopwatch_init'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Initialize StopWatch')
      .appendField(new Blockly.FieldVariable('stopwatch'), 'VAR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
    this.setTooltip('Create and store a new StopWatch');
  },
};

Blockly.Blocks['spike_stopwatch_time'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('StopWatch')
      .appendField(new Blockly.FieldVariable('stopwatch'), 'VAR')
      .appendField('time (ms)');
    this.setOutput(true, 'Number');
    this.setColour(290);
    this.setTooltip('Get elapsed time in milliseconds');
  },
};

Blockly.Blocks['spike_stopwatch_reset'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Reset StopWatch')
      .appendField(new Blockly.FieldVariable('stopwatch'), 'VAR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
    this.setTooltip('Reset stopwatch to zero');
  },
};

Blockly.Blocks['spike_stopwatch_pause'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Pause StopWatch')
      .appendField(new Blockly.FieldVariable('stopwatch'), 'VAR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
    this.setTooltip('Pause stopwatch');
  },
};

Blockly.Blocks['spike_stopwatch_resume'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Resume StopWatch')
      .appendField(new Blockly.FieldVariable('stopwatch'), 'VAR');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(290);
    this.setTooltip('Resume paused stopwatch');
  },
};

// --- Parameter Value Blocks ---
Blockly.Blocks['spike_value_button'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Button')
      .appendField(
        new Blockly.FieldDropdown([
          ['Left', 'Button.LEFT'],
          ['Right', 'Button.RIGHT'],
          ['Bluetooth', 'Button.BLUETOOTH'],
        ]),
        'VALUE'
      );
    this.setOutput(true, null);
    this.setColour(40);
    this.setTooltip('Button enum value');
  },
};

Blockly.Blocks['spike_value_color'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Color')
      .appendField(
        new Blockly.FieldDropdown([
          ['Red', 'Color.RED'],
          ['Green', 'Color.GREEN'],
          ['Blue', 'Color.BLUE'],
          ['Yellow', 'Color.YELLOW'],
          ['Orange', 'Color.ORANGE'],
          ['Violet', 'Color.VIOLET'],
          ['White', 'Color.WHITE'],
          ['None', 'Color.NONE'],
        ]),
        'VALUE'
      );
    this.setOutput(true, null);
    this.setColour(40);
    this.setTooltip('Color enum value');
  },
};

Blockly.Blocks['spike_value_direction'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Direction')
      .appendField(
        new Blockly.FieldDropdown([
          ['Clockwise', 'Direction.CLOCKWISE'],
          ['Counterclockwise', 'Direction.COUNTERCLOCKWISE'],
        ]),
        'VALUE'
      );
    this.setOutput(true, null);
    this.setColour(40);
    this.setTooltip('Direction enum value');
  },
};

Blockly.Blocks['spike_value_port'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Port')
      .appendField(
        new Blockly.FieldDropdown([
          ['A', 'Port.A'],
          ['B', 'Port.B'],
          ['C', 'Port.C'],
          ['D', 'Port.D'],
          ['E', 'Port.E'],
          ['F', 'Port.F'],
        ]),
        'VALUE'
      );
    this.setOutput(true, null);
    this.setColour(40);
    this.setTooltip('Port enum value');
  },
};

Blockly.Blocks['spike_value_side'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Side')
      .appendField(
        new Blockly.FieldDropdown([
          ['Left', 'Side.LEFT'],
          ['Right', 'Side.RIGHT'],
        ]),
        'VALUE'
      );
    this.setOutput(true, null);
    this.setColour(40);
    this.setTooltip('Side enum value');
  },
};

Blockly.Blocks['spike_value_stop'] = {
  init: function (this: Blockly.Block) {
    this.appendDummyInput()
      .appendField('Stop')
      .appendField(
        new Blockly.FieldDropdown([
          ['Coast', 'Stop.COAST'],
          ['Brake', 'Stop.BRAKE'],
          ['Hold', 'Stop.HOLD'],
        ]),
        'VALUE'
      );
    this.setOutput(true, null);
    this.setColour(40);
    this.setTooltip('Stop enum value');
  },
};

// ===== Python Code Generators =====

export function registerGenerators(): void {
  if (!pythonGenerator) {
    console.warn('Python generator not available');
    return;
  }

  // Blockly's default Python generator prepends variable declarations like
  // `x = None`. For Pybricks workflows, this overwrites meaningful
  // initializations generated by our custom blocks.
  const originalInit = pythonGenerator.init.bind(pythonGenerator);
  pythonGenerator.init = function (workspace: Blockly.Workspace) {
    originalInit(workspace);
    const defs = (pythonGenerator as any).definitions_;
    if (defs && typeof defs === 'object') {
      delete defs.variables;
    }
  };

  // Hub
  pythonGenerator.forBlock['spike_init_hub'] = function () {
    return 'hub = PrimeHub()\n';
  };

  pythonGenerator.forBlock['spike_hub_display_image'] = function (block: Blockly.Block) {
    const image = pythonGenerator.valueToCode(block, 'IMAGE', 0) || "''";
    return `hub.display.image(${image})\n`;
  };

  pythonGenerator.forBlock['spike_hub_light'] = function (block: Blockly.Block) {
    const color = block.getFieldValue('COLOR');
    return `hub.light.on(${color})\n`;
  };

  pythonGenerator.forBlock['spike_hub_beep'] = function (block: Blockly.Block) {
    const freq = pythonGenerator.valueToCode(block, 'FREQUENCY', 0) || '500';
    const duration = pythonGenerator.valueToCode(block, 'DURATION', 0) || '200';
    return `hub.speaker.beep(${freq}, ${duration})\n`;
  };

  pythonGenerator.forBlock['spike_hub_button_pressed'] = function (block: Blockly.Block) {
    const button = block.getFieldValue('BUTTON');
    return [`${button} in hub.buttons.pressed()`, 0];
  };

  pythonGenerator.forBlock['spike_hub_buttons_pressed'] = function () {
    return ['hub.buttons.pressed()', 0];
  };

  // Motors
  pythonGenerator.forBlock['spike_motor_init'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    const port = block.getFieldValue('PORT');
    const direction = block.getFieldValue('DIRECTION') || 'Direction.CLOCKWISE';
    return `${varName} = Motor(${port}, ${direction})\n`;
  };

  pythonGenerator.forBlock['spike_motor_run'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    const speed = pythonGenerator.valueToCode(block, 'SPEED', 0) || '500';
    return `${varName}.run(${speed})\n`;
  };

  pythonGenerator.forBlock['spike_motor_run_time'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    const speed = pythonGenerator.valueToCode(block, 'SPEED', 0) || '500';
    const time = pythonGenerator.valueToCode(block, 'TIME', 0) || '1000';
    return `${varName}.run_time(${speed}, ${time})\n`;
  };

  pythonGenerator.forBlock['spike_motor_run_angle'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    const speed = pythonGenerator.valueToCode(block, 'SPEED', 0) || '500';
    const angle = pythonGenerator.valueToCode(block, 'ANGLE', 0) || '360';
    const stopMode = block.getFieldValue('STOP') || 'Stop.COAST';
    return `${varName}.run_angle(${speed}, ${angle}, ${stopMode})\n`;
  };

  pythonGenerator.forBlock['spike_motor_stop'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return `${varName}.stop()\n`;
  };

  pythonGenerator.forBlock['spike_motor_angle'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return [`${varName}.angle()`, 0];
  };

  pythonGenerator.forBlock['spike_motor_run_target'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    const speed = pythonGenerator.valueToCode(block, 'SPEED', 0) || '500';
    const targetAngle = pythonGenerator.valueToCode(block, 'TARGET_ANGLE', 0) || '0';
    const stopMode = block.getFieldValue('STOP') || 'Stop.COAST';
    return `${varName}.run_target(${speed}, ${targetAngle}, ${stopMode})\n`;
  };

  pythonGenerator.forBlock['spike_motor_dc'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    const duty = pythonGenerator.valueToCode(block, 'DUTY', 0) || '50';
    return `${varName}.dc(${duty})\n`;
  };

  pythonGenerator.forBlock['spike_motor_reset_angle'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    const angle = pythonGenerator.valueToCode(block, 'ANGLE', 0) || '0';
    return `${varName}.reset_angle(${angle})\n`;
  };

  // DriveBase
  pythonGenerator.forBlock['spike_drivebase_init'] = function (block: Blockly.Block) {
    const leftMotor = pythonGenerator.getVariableName(block.getFieldValue('LEFT_MOTOR'));
    const rightMotor = pythonGenerator.getVariableName(block.getFieldValue('RIGHT_MOTOR'));
    const wheelDiameter = pythonGenerator.valueToCode(block, 'WHEEL_DIAMETER', 0) || '56';
    const axleTrack = pythonGenerator.valueToCode(block, 'AXLE_TRACK', 0) || '114';
    return `drive_base = DriveBase(${leftMotor}, ${rightMotor}, ${wheelDiameter}, ${axleTrack})\n`;
  };

  pythonGenerator.forBlock['spike_drivebase_drive'] = function (block: Blockly.Block) {
    const speed = pythonGenerator.valueToCode(block, 'SPEED', 0) || '200';
    const turnRate = pythonGenerator.valueToCode(block, 'TURN_RATE', 0) || '0';
    return `drive_base.drive(${speed}, ${turnRate})\n`;
  };

  pythonGenerator.forBlock['spike_drivebase_settings_speed'] = function (block: Blockly.Block) {
    const speed = pythonGenerator.valueToCode(block, 'SPEED', 0) || '200';
    return `drive_base.settings(straight_speed=${speed})\n`;
  };

  pythonGenerator.forBlock['spike_drivebase_settings_acceleration'] = function (block: Blockly.Block) {
    const accel = pythonGenerator.valueToCode(block, 'ACCEL', 0) || '1000';
    return `drive_base.settings(straight_acceleration=${accel})\n`;
  };

  pythonGenerator.forBlock['spike_drivebase_settings_turn_rate'] = function (block: Blockly.Block) {
    const turnRate = pythonGenerator.valueToCode(block, 'TURN_RATE', 0) || '90';
    return `drive_base.settings(turn_rate=${turnRate})\n`;
  };

  pythonGenerator.forBlock['spike_drivebase_use_gyro'] = function (block: Blockly.Block) {
    const enabled = block.getFieldValue('ENABLED') || 'True';
    return `drive_base.use_gyro(${enabled})\n`;
  };

  pythonGenerator.forBlock['spike_drivebase_straight'] = function (block: Blockly.Block) {
    const distance = pythonGenerator.valueToCode(block, 'DISTANCE', 0) || '200';
    return `drive_base.straight(${distance})\n`;
  };

  pythonGenerator.forBlock['spike_drivebase_turn'] = function (block: Blockly.Block) {
    const angle = pythonGenerator.valueToCode(block, 'ANGLE', 0) || '90';
    return `drive_base.turn(${angle})\n`;
  };

  pythonGenerator.forBlock['spike_drivebase_stop'] = function () {
    return 'drive_base.stop()\n';
  };

  pythonGenerator.forBlock['spike_drivebase_reset'] = function (block: Blockly.Block) {
    const distance = pythonGenerator.valueToCode(block, 'DISTANCE', 0) || '0';
    const angle = pythonGenerator.valueToCode(block, 'ANGLE', 0) || '0';
    return `drive_base.reset(${distance}, ${angle})\n`;
  };

  pythonGenerator.forBlock['spike_drivebase_distance'] = function () {
    return ['drive_base.distance()', 0];
  };

  pythonGenerator.forBlock['spike_drivebase_angle'] = function () {
    return ['drive_base.angle()', 0];
  };

  // Sensors
  pythonGenerator.forBlock['spike_color_sensor_init'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    const port = block.getFieldValue('PORT');
    return `${varName} = ColorSensor(${port})\n`;
  };

  pythonGenerator.forBlock['spike_color_sensor_color'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return [`${varName}.color()`, 0];
  };

  pythonGenerator.forBlock['spike_color_sensor_reflection'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return [`${varName}.reflection()`, 0];
  };

  pythonGenerator.forBlock['spike_color_sensor_ambient'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return [`${varName}.ambient()`, 0];
  };

  pythonGenerator.forBlock['spike_color_sensor_hsv'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return [`${varName}.hsv()`, 0];
  };

  pythonGenerator.forBlock['spike_ultrasonic_init'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    const port = block.getFieldValue('PORT');
    return `${varName} = UltrasonicSensor(${port})\n`;
  };

  pythonGenerator.forBlock['spike_ultrasonic_distance'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return [`${varName}.distance()`, 0];
  };

  pythonGenerator.forBlock['spike_ultrasonic_presence'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return [`${varName}.presence()`, 0];
  };

  pythonGenerator.forBlock['spike_force_sensor_init'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    const port = block.getFieldValue('PORT');
    return `${varName} = ForceSensor(${port})\n`;
  };

  pythonGenerator.forBlock['spike_force_sensor_force'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return [`${varName}.force()`, 0];
  };

  pythonGenerator.forBlock['spike_force_sensor_pressed'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return [`${varName}.pressed()`, 0];
  };

  pythonGenerator.forBlock['spike_force_sensor_distance'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return [`${varName}.distance()`, 0];
  };

  // Control
  pythonGenerator.forBlock['spike_wait'] = function (block: Blockly.Block) {
    const time = pythonGenerator.valueToCode(block, 'TIME', 0) || '1000';
    return `wait(${time})\n`;
  };

  pythonGenerator.forBlock['spike_print'] = function (block: Blockly.Block) {
    const text = pythonGenerator.valueToCode(block, 'TEXT', 0) || "''";
    return `print(${text})\n`;
  };

  pythonGenerator.forBlock['spike_comment'] = function (block: Blockly.Block) {
    const rawText = block.getFieldValue('TEXT') || '';
    const sanitized = rawText.replace(/\r?\n/g, ' ');
    return `# ${sanitized}\n`;
  };

  pythonGenerator.forBlock['spike_stopwatch'] = function () {
    return ['StopWatch()', 0];
  };

  pythonGenerator.forBlock['spike_stopwatch_init'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return `${varName} = StopWatch()\n`;
  };

  pythonGenerator.forBlock['spike_stopwatch_time'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return [`${varName}.time()`, 0];
  };

  pythonGenerator.forBlock['spike_stopwatch_reset'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return `${varName}.reset()\n`;
  };

  pythonGenerator.forBlock['spike_stopwatch_pause'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return `${varName}.pause()\n`;
  };

  pythonGenerator.forBlock['spike_stopwatch_resume'] = function (block: Blockly.Block) {
    const varName = pythonGenerator.getVariableName(block.getFieldValue('VAR'));
    return `${varName}.resume()\n`;
  };

  pythonGenerator.forBlock['spike_value_button'] = function (block: Blockly.Block) {
    return [block.getFieldValue('VALUE') || 'Button.LEFT', 0];
  };

  pythonGenerator.forBlock['spike_value_color'] = function (block: Blockly.Block) {
    return [block.getFieldValue('VALUE') || 'Color.RED', 0];
  };

  pythonGenerator.forBlock['spike_value_direction'] = function (block: Blockly.Block) {
    return [block.getFieldValue('VALUE') || 'Direction.CLOCKWISE', 0];
  };

  pythonGenerator.forBlock['spike_value_port'] = function (block: Blockly.Block) {
    return [block.getFieldValue('VALUE') || 'Port.A', 0];
  };

  pythonGenerator.forBlock['spike_value_side'] = function (block: Blockly.Block) {
    return [block.getFieldValue('VALUE') || 'Side.LEFT', 0];
  };

  pythonGenerator.forBlock['spike_value_stop'] = function (block: Blockly.Block) {
    return [block.getFieldValue('VALUE') || 'Stop.COAST', 0];
  };
}

// ===== Toolbox Configuration =====
export const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '🏠 Hub',
      colour: '230',
      contents: [
        { kind: 'block', type: 'spike_init_hub' },
        { kind: 'block', type: 'spike_hub_light' },
        {
          kind: 'block',
          type: 'spike_hub_beep',
          inputs: {
            FREQUENCY: { shadow: { type: 'math_number', fields: { NUM: 500 } } },
            DURATION: { shadow: { type: 'math_number', fields: { NUM: 200 } } },
          },
        },
        { kind: 'block', type: 'spike_hub_display_image' },
        { kind: 'block', type: 'spike_hub_button_pressed' },
        { kind: 'block', type: 'spike_hub_buttons_pressed' },
      ],
    },
    {
      kind: 'category',
      name: '⚙️ Motors',
      colour: '120',
      contents: [
        { kind: 'block', type: 'spike_motor_init' },
        {
          kind: 'block',
          type: 'spike_motor_run',
          inputs: {
            SPEED: { shadow: { type: 'math_number', fields: { NUM: 500 } } },
          },
        },
        {
          kind: 'block',
          type: 'spike_motor_run_time',
          inputs: {
            SPEED: { shadow: { type: 'math_number', fields: { NUM: 500 } } },
            TIME: { shadow: { type: 'math_number', fields: { NUM: 1000 } } },
          },
        },
        {
          kind: 'block',
          type: 'spike_motor_run_angle',
          inputs: {
            SPEED: { shadow: { type: 'math_number', fields: { NUM: 500 } } },
            ANGLE: { shadow: { type: 'math_number', fields: { NUM: 360 } } },
          },
        },
        { kind: 'block', type: 'spike_motor_stop' },
        { kind: 'block', type: 'spike_motor_angle' },
        {
          kind: 'block',
          type: 'spike_motor_run_target',
          inputs: {
            SPEED: { shadow: { type: 'math_number', fields: { NUM: 500 } } },
            TARGET_ANGLE: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          },
        },
        {
          kind: 'block',
          type: 'spike_motor_dc',
          inputs: {
            DUTY: { shadow: { type: 'math_number', fields: { NUM: 50 } } },
          },
        },
        {
          kind: 'block',
          type: 'spike_motor_reset_angle',
          inputs: {
            ANGLE: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: '🚗 DriveBase',
      colour: '65',
      contents: [
        {
          kind: 'block',
          type: 'spike_drivebase_init',
          inputs: {
            WHEEL_DIAMETER: { shadow: { type: 'math_number', fields: { NUM: 56 } } },
            AXLE_TRACK: { shadow: { type: 'math_number', fields: { NUM: 114 } } },
          },
        },
        {
          kind: 'block',
          type: 'spike_drivebase_drive',
          inputs: {
            SPEED: { shadow: { type: 'math_number', fields: { NUM: 200 } } },
            TURN_RATE: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          },
        },
        {
          kind: 'block',
          type: 'spike_drivebase_settings_speed',
          inputs: {
            SPEED: { shadow: { type: 'math_number', fields: { NUM: 200 } } },
          },
        },
        {
          kind: 'block',
          type: 'spike_drivebase_settings_acceleration',
          inputs: {
            ACCEL: { shadow: { type: 'math_number', fields: { NUM: 1500 } } },
          },
        },
        {
          kind: 'block',
          type: 'spike_drivebase_settings_turn_rate',
          inputs: {
            TURN_RATE: { shadow: { type: 'math_number', fields: { NUM: 90 } } },
          },
        },
        { kind: 'block', type: 'spike_drivebase_use_gyro' },
        {
          kind: 'block',
          type: 'spike_drivebase_straight',
          inputs: {
            DISTANCE: { shadow: { type: 'math_number', fields: { NUM: 200 } } },
          },
        },
        {
          kind: 'block',
          type: 'spike_drivebase_turn',
          inputs: {
            ANGLE: { shadow: { type: 'math_number', fields: { NUM: 90 } } },
          },
        },
        { kind: 'block', type: 'spike_drivebase_stop' },
        {
          kind: 'block',
          type: 'spike_drivebase_reset',
          inputs: {
            DISTANCE: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
            ANGLE: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
          },
        },
        { kind: 'block', type: 'spike_drivebase_distance' },
        { kind: 'block', type: 'spike_drivebase_angle' },
      ],
    },
    {
      kind: 'category',
      name: '📡 Sensors',
      colour: '20',
      contents: [
        { kind: 'block', type: 'spike_color_sensor_init' },
        { kind: 'block', type: 'spike_color_sensor_color' },
        { kind: 'block', type: 'spike_color_sensor_reflection' },
        { kind: 'block', type: 'spike_color_sensor_ambient' },
        { kind: 'block', type: 'spike_color_sensor_hsv' },
        { kind: 'block', type: 'spike_ultrasonic_init' },
        { kind: 'block', type: 'spike_ultrasonic_distance' },
        { kind: 'block', type: 'spike_ultrasonic_presence' },
        { kind: 'block', type: 'spike_force_sensor_init' },
        { kind: 'block', type: 'spike_force_sensor_force' },
        { kind: 'block', type: 'spike_force_sensor_pressed' },
        { kind: 'block', type: 'spike_force_sensor_distance' },
      ],
    },
    {
      kind: 'category',
      name: '⏱️ Control',
      colour: '290',
      contents: [
        {
          kind: 'block',
          type: 'spike_wait',
          inputs: {
            TIME: { shadow: { type: 'math_number', fields: { NUM: 1000 } } },
          },
        },
        { kind: 'block', type: 'spike_print' },
        { kind: 'block', type: 'spike_comment' },
        { kind: 'block', type: 'spike_stopwatch' },
        { kind: 'block', type: 'spike_stopwatch_init' },
        { kind: 'block', type: 'spike_stopwatch_time' },
        { kind: 'block', type: 'spike_stopwatch_reset' },
        { kind: 'block', type: 'spike_stopwatch_pause' },
        { kind: 'block', type: 'spike_stopwatch_resume' },
      ],
    },
    {
      kind: 'category',
      name: '📚 Parameters',
      colour: '40',
      contents: [
        { kind: 'block', type: 'spike_value_button' },
        { kind: 'block', type: 'spike_value_color' },
        { kind: 'block', type: 'spike_value_direction' },
        { kind: 'block', type: 'spike_value_port' },
        { kind: 'block', type: 'spike_value_side' },
        { kind: 'block', type: 'spike_value_stop' },
      ],
    },
    { kind: 'sep' },
    {
      kind: 'category',
      name: '🔀 Logic',
      colour: '210',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' },
      ],
    },
    {
      kind: 'category',
      name: '🔁 Loops',
      colour: '120',
      contents: [
        { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'controls_whileUntil' },
        { kind: 'block', type: 'controls_for' },
        { kind: 'block', type: 'controls_forEach' },
        { kind: 'block', type: 'controls_flow_statements' },
      ],
    },
    {
      kind: 'category',
      name: '🔢 Math',
      colour: '230',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_single' },
        { kind: 'block', type: 'math_random_int' },
        { kind: 'block', type: 'math_modulo' },
        { kind: 'block', type: 'math_constrain' },
        { kind: 'block', type: 'math_number_property' },
      ],
    },
    {
      kind: 'category',
      name: '📝 Text',
      colour: '160',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_join' },
        { kind: 'block', type: 'text_append' },
        { kind: 'block', type: 'text_length' },
      ],
    },
    {
      kind: 'category',
      name: '📦 Variables',
      colour: '330',
      custom: 'VARIABLE',
    },
    {
      kind: 'category',
      name: '🔧 Functions',
      colour: '290',
      custom: 'PROCEDURE',
    },
  ],
};

/**
 * Generate Pybricks Python code from Blockly workspace
 */
export function generatePythonCode(workspace: Blockly.Workspace): string {
  if (!pythonGenerator) {
    return '# Error: Python generator not available';
  }

  const code = pythonGenerator.workspaceToCode(workspace);

  // Add Pybricks imports
  const imports = `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor, ColorSensor, UltrasonicSensor, ForceSensor
from pybricks.parameters import Button, Color, Direction, Port, Side, Stop
from pybricks.robotics import DriveBase
from pybricks.tools import wait, StopWatch

`;

  return imports + code;
}
