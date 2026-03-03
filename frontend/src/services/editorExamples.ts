export interface PythonExample {
  id: string;
  name: string;
  code: string;
}

export interface BlockExample {
  id: string;
  name: string;
  xml: string;
}

export const PYTHON_EXAMPLES: PythonExample[] = [
  {
    id: 'line_follow_basic_map',
    name: 'Line Follow (Basic Map)',
    code: `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Color, Direction, Port
from pybricks.robotics import DriveBase
from pybricks.tools import wait

# Simulator: Map = Line Follow Map, Robot = Line Follow
hub = PrimeHub()
left_motor = Motor(Port.A)
right_motor = Motor(Port.B, Direction.COUNTERCLOCKWISE)
drive_base = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=114)

hub.light.on(Color.BLUE)
hub.speaker.beep(600, 100)
drive_base.settings(straight_speed=220)

drive_base.straight(420)
wait(120)
drive_base.turn(90)
drive_base.straight(420)
wait(120)
drive_base.turn(90)
drive_base.straight(420)
wait(120)
drive_base.turn(90)
drive_base.straight(420)
wait(120)
drive_base.turn(90)

drive_base.stop()
hub.light.on(Color.GREEN)
print("Basic line map lap complete")
`,
  },
  {
    id: 'line_follow_intermediate_map',
    name: 'Line Follow (Intermediate Map)',
    code: `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Color, Direction, Port
from pybricks.robotics import DriveBase
from pybricks.tools import wait

# Simulator: Map = Line Follow Intermediate, Robot = Line Follow
hub = PrimeHub()
left_motor = Motor(Port.A)
right_motor = Motor(Port.B, Direction.COUNTERCLOCKWISE)
drive_base = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=114)

hub.light.on(Color.YELLOW)
drive_base.settings(straight_speed=190)

drive_base.straight(180)
drive_base.turn(35)
drive_base.straight(140)
drive_base.turn(-30)
drive_base.straight(180)
drive_base.turn(45)
drive_base.straight(120)
drive_base.turn(-50)
drive_base.straight(210)
drive_base.turn(40)
drive_base.straight(140)
wait(120)

drive_base.stop()
hub.light.on(Color.GREEN)
print("Intermediate line route complete")
`,
  },
  {
    id: 'slalom_map_solver',
    name: 'Slalom Map Solver',
    code: `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Color, Direction, Port
from pybricks.robotics import DriveBase
from pybricks.tools import wait

# Simulator: Map = Map with Cans (slalom mission)
hub = PrimeHub()
left_motor = Motor(Port.A)
right_motor = Motor(Port.B, Direction.COUNTERCLOCKWISE)
drive_base = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=114)

hub.light.on(Color.YELLOW)
drive_base.settings(straight_speed=210)

drive_base.straight(170)
drive_base.turn(38)
drive_base.straight(150)
drive_base.turn(-75)
drive_base.straight(220)
drive_base.turn(75)
drive_base.straight(150)
drive_base.turn(-38)
drive_base.straight(190)
wait(120)

drive_base.stop()
hub.light.on(Color.GREEN)
print("Slalom route complete")
`,
  },
  {
    id: 'maze_map_solver',
    name: 'Maze Map Solver',
    code: `from pybricks.hubs import PrimeHub
from pybricks.pupdevices import Motor
from pybricks.parameters import Color, Direction, Port
from pybricks.robotics import DriveBase
from pybricks.tools import wait

# Simulator: Map = Maze Map (robot starts at START)
hub = PrimeHub()
left_motor = Motor(Port.A)
right_motor = Motor(Port.B, Direction.COUNTERCLOCKWISE)
drive_base = DriveBase(left_motor, right_motor, wheel_diameter=56, axle_track=114)

hub.light.on(Color.WHITE)
drive_base.settings(straight_speed=180)

# Grid route: RR, DD, RRRRRR, DD, RR
drive_base.turn(-90)
drive_base.straight(100)
drive_base.turn(90)
drive_base.straight(100)
drive_base.turn(-90)
drive_base.straight(300)
drive_base.turn(90)
drive_base.straight(100)
drive_base.turn(-90)
drive_base.straight(100)
wait(150)

drive_base.stop()
hub.light.on(Color.GREEN)
print("Maze route complete")
`,
  },
];

export const BLOCK_EXAMPLES: BlockExample[] = [
  {
    id: 'line_follow_basic_map',
    name: 'Line Follow (Basic Map)',
    xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="sim_when_run" x="18" y="18">
    <statement name="DO">
      <block type="sim_set_movement_speed">
        <value name="SPEED"><shadow type="math_number"><field name="NUM">70</field></shadow></value>
        <next>
          <block type="controls_repeat_ext">
            <value name="TIMES"><shadow type="math_number"><field name="NUM">4</field></shadow></value>
            <statement name="DO">
              <block type="sim_go_straight">
                <value name="VALUE"><shadow type="math_number"><field name="NUM">42</field></shadow></value>
                <field name="UNIT">CM</field>
                <field name="STOP_MODE">BRAKE</field>
                <next>
                  <block type="sim_turn_right_degrees">
                    <value name="DEGREES"><shadow type="math_number"><field name="NUM">90</field></shadow></value>
                    <field name="TURN_TYPE">POINT</field>
                    <value name="LEFT_SPEED"><shadow type="math_number"><field name="NUM">70</field></shadow></value>
                    <value name="RIGHT_SPEED"><shadow type="math_number"><field name="NUM">-70</field></shadow></value>
                  </block>
                </next>
              </block>
            </statement>
            <next><block type="sim_stop_robot"></block></next>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`,
  },
  {
    id: 'line_follow_intermediate_map',
    name: 'Line Follow (Intermediate Map)',
    xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="sim_when_run" x="18" y="18">
    <statement name="DO">
      <block type="sim_set_movement_speed">
        <value name="SPEED"><shadow type="math_number"><field name="NUM">58</field></shadow></value>
        <next>
          <block type="sim_go_straight">
            <value name="VALUE"><shadow type="math_number"><field name="NUM">18</field></shadow></value>
            <field name="UNIT">CM</field><field name="STOP_MODE">BRAKE</field>
            <next>
              <block type="sim_turn_right_degrees">
                <value name="DEGREES"><shadow type="math_number"><field name="NUM">35</field></shadow></value>
                <field name="TURN_TYPE">POINT</field>
                <value name="LEFT_SPEED"><shadow type="math_number"><field name="NUM">60</field></shadow></value>
                <value name="RIGHT_SPEED"><shadow type="math_number"><field name="NUM">-60</field></shadow></value>
                <next>
                  <block type="sim_go_straight">
                    <value name="VALUE"><shadow type="math_number"><field name="NUM">16</field></shadow></value>
                    <field name="UNIT">CM</field><field name="STOP_MODE">BRAKE</field>
                    <next>
                      <block type="sim_turn_left_degrees">
                        <value name="DEGREES"><shadow type="math_number"><field name="NUM">30</field></shadow></value>
                        <field name="TURN_TYPE">POINT</field>
                        <value name="LEFT_SPEED"><shadow type="math_number"><field name="NUM">-60</field></shadow></value>
                        <value name="RIGHT_SPEED"><shadow type="math_number"><field name="NUM">60</field></shadow></value>
                        <next><block type="sim_stop_robot"></block></next>
                      </block>
                    </next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`,
  },
  {
    id: 'slalom_map_solver',
    name: 'Slalom Map Solver',
    xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="sim_when_run" x="18" y="18">
    <statement name="DO">
      <block type="sim_set_movement_speed">
        <value name="SPEED"><shadow type="math_number"><field name="NUM">62</field></shadow></value>
        <next>
          <block type="sim_go_straight"><value name="VALUE"><shadow type="math_number"><field name="NUM">17</field></shadow></value><field name="UNIT">CM</field><field name="STOP_MODE">BRAKE</field>
            <next>
              <block type="sim_turn_right_degrees"><value name="DEGREES"><shadow type="math_number"><field name="NUM">38</field></shadow></value><field name="TURN_TYPE">POINT</field><value name="LEFT_SPEED"><shadow type="math_number"><field name="NUM">70</field></shadow></value><value name="RIGHT_SPEED"><shadow type="math_number"><field name="NUM">-70</field></shadow></value>
                <next>
                  <block type="sim_go_straight"><value name="VALUE"><shadow type="math_number"><field name="NUM">15</field></shadow></value><field name="UNIT">CM</field><field name="STOP_MODE">BRAKE</field>
                    <next><block type="sim_stop_robot"></block></next>
                  </block>
                </next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`,
  },
  {
    id: 'maze_map_solver',
    name: 'Maze Map Solver',
    xml: `<xml xmlns="https://developers.google.com/blockly/xml">
  <block type="sim_when_run" x="18" y="18">
    <statement name="DO">
      <block type="sim_set_movement_speed">
        <value name="SPEED"><shadow type="math_number"><field name="NUM">55</field></shadow></value>
        <next>
          <block type="sim_turn_left_degrees"><value name="DEGREES"><shadow type="math_number"><field name="NUM">90</field></shadow></value><field name="TURN_TYPE">POINT</field><value name="LEFT_SPEED"><shadow type="math_number"><field name="NUM">-65</field></shadow></value><value name="RIGHT_SPEED"><shadow type="math_number"><field name="NUM">65</field></shadow></value>
            <next>
              <block type="sim_go_straight"><value name="VALUE"><shadow type="math_number"><field name="NUM">10</field></shadow></value><field name="UNIT">CM</field><field name="STOP_MODE">BRAKE</field>
                <next><block type="sim_stop_robot"></block></next>
              </block>
            </next>
          </block>
        </next>
      </block>
    </statement>
  </block>
</xml>`,
  },
];

export const DEFAULT_PYTHON_EXAMPLE_ID = 'line_follow_basic_map';
export const DEFAULT_BLOCK_EXAMPLE_ID = 'line_follow_basic_map';
