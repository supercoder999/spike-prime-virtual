import './simulator.css'
import * as THREE from 'three'
import * as Blockly from 'blockly'
import { javascriptGenerator } from 'blockly/javascript'

let _animationFrameId = null
let _resizeHandler = null
let _resizeObserver = null
let _keydownHandler = null
let _keyupHandler = null
let _renderer = null
let _destroyed = false
let _simBridgeChannel = null
let _simHeartbeatTimer = null

export function destroySimulator() {
  _destroyed = true
  if (_animationFrameId != null) {
    cancelAnimationFrame(_animationFrameId)
    _animationFrameId = null
  }
  if (_resizeHandler) {
    window.removeEventListener('resize', _resizeHandler)
    _resizeHandler = null
  }
  if (_resizeObserver) {
    _resizeObserver.disconnect()
    _resizeObserver = null
  }
  if (_keydownHandler) {
    window.removeEventListener('keydown', _keydownHandler)
    _keydownHandler = null
  }
  if (_keyupHandler) {
    window.removeEventListener('keyup', _keyupHandler)
    _keyupHandler = null
  }
  if (_renderer) {
    _renderer.dispose()
    _renderer = null
  }
  if (_simHeartbeatTimer) {
    clearInterval(_simHeartbeatTimer)
    _simHeartbeatTimer = null
  }
  if (_simBridgeChannel) {
    _simBridgeChannel.close()
    _simBridgeChannel = null
  }
}

export function initSimulator(container) {
  _destroyed = false

const app = container

app.innerHTML = `
  <div class="hud" id="hudPanel">
    <button class="panel-toggle left-toggle" id="hudToggle" title="Collapse panel">◀</button>
    <div class="hud-content" id="hudContent">
    <h1>Robot 3D Simulator</h1>
    <p>Scale: 1 world unit = 10 cm | 1 tile = 100 cm</p>
    <div class="status-row">
      <label class="select-label">Robot:</label>
      <select id="robotSelect">
        <option value="basicClaw">Basic Claw Robot</option>
        <option value="lineFollow">Line Follow Robot</option>
      </select>
    </div>
    <div class="status-row">
      <label class="select-label">Map:</label>
      <select id="mapSelect">
        <option value="mapCans">Map with Cans</option>
        <option value="mapLine">Line Follow Map</option>
        <option value="mapLineIntermediate">Line Follow Intermediate</option>
        <option value="mapMaze">Maze Map</option>
      </select>
    </div>
    <div class="status-row" id="clawBtnsRow">
      <button id="openClawBtn" type="button">Open Claw</button>
      <button id="closeClawBtn" type="button">Close Claw</button>
    </div>
    <div class="status-row">
      <label class="select-label" for="slipperySlider">Wheel Grip:</label>
      <input id="slipperySlider" type="range" min="0" max="100" value="0" style="width:100px">
      <span id="slipperyValue">0%</span>
    </div>
    <p id="statusText">Input: Keyboard</p>
    <p id="coordsText">Robot: X=0 Y=0 Z=0 cm</p>
    <p id="clickCoordsText" style="display:none">Clicked Coordinate: (0 cm, 0 cm)</p>
    <p id="telemetry">Speed: 0.0 m/s | Steering: 0%</p>
    <p id="sensorText" style="display:none">Left: — | Right: —</p>
    <div class="sensor-panel">
      <h3>Sensor Readings <button id="resetSensorsBtn" type="button" style="margin-left:8px;font-size:11px;padding:1px 8px;vertical-align:middle">Reset</button></h3>
      <div class="sensor-grid">
        <span class="sensor-label">🔄 Gyroscope (Yaw):</span><span id="gyroReading">0.0°</span>
        <span class="sensor-label">📐 Accelerometer:</span><span id="accelReading">0.0 m/s²</span>
        <span class="sensor-label">📏 Distance Sensor:</span><span id="distReading">— cm</span>
        <span class="sensor-label">🎨 Color Sensor:</span><span id="colorReading">—</span>
        <span class="sensor-label">👆 Force Sensor:</span><span id="forceReading">0 N</span>
        <span class="sensor-label">⚙️ Right Motor Encoder:</span><span id="leftEncReading">0°</span>
        <span class="sensor-label">⚙️ Left Motor Encoder:</span><span id="rightEncReading">0°</span>
        <span class="sensor-label">💡 5x5 LED Matrix:</span><span id="matrixReading">Idle</span>
        <span class="sensor-label">🔊 Speaker:</span><span id="speakerReading">Silent</span>
        <span class="sensor-label">📶 Bluetooth:</span><span id="btReading">Disconnected</span>
        <span class="sensor-label">🔋 Battery:</span><span id="batteryReading">100%</span>
      </div>
    </div>
    <details class="port-config" id="portConfigPanel">
      <summary>🔌 Port Wiring</summary>
      <div class="port-grid">
        <label>A:</label><select id="portA"><option value="rightMotor">Right Motor</option><option value="leftMotor">Left Motor</option><option value="claw">Claw</option><option value="color">Color Sensor</option><option value="distance">Distance Sensor</option><option value="force">Force Sensor</option><option value="none">— None —</option></select>
        <label>B:</label><select id="portB"><option value="leftMotor">Left Motor</option><option value="rightMotor">Right Motor</option><option value="claw">Claw</option><option value="color">Color Sensor</option><option value="distance">Distance Sensor</option><option value="force">Force Sensor</option><option value="none">— None —</option></select>
        <label>C:</label><select id="portC"><option value="claw" selected>Claw</option><option value="rightMotor">Right Motor</option><option value="leftMotor">Left Motor</option><option value="color">Color Sensor</option><option value="distance">Distance Sensor</option><option value="force">Force Sensor</option><option value="none">— None —</option></select>
        <label>D:</label><select id="portD"><option value="distance" selected>Distance Sensor</option><option value="rightMotor">Right Motor</option><option value="leftMotor">Left Motor</option><option value="claw">Claw</option><option value="color">Color Sensor</option><option value="force">Force Sensor</option><option value="none">— None —</option></select>
        <label>E:</label><select id="portE"><option value="color" selected>Color Sensor</option><option value="rightMotor">Right Motor</option><option value="leftMotor">Left Motor</option><option value="claw">Claw</option><option value="distance">Distance Sensor</option><option value="force">Force Sensor</option><option value="none">— None —</option></select>
        <label>F:</label><select id="portF"><option value="force" selected>Force Sensor</option><option value="rightMotor">Right Motor</option><option value="leftMotor">Left Motor</option><option value="claw">Claw</option><option value="color">Color Sensor</option><option value="distance">Distance Sensor</option><option value="none">— None —</option></select>
      </div>
    </details>
    <p class="hint">💡 Left-click on robot parts to identify them</p>
    <p class="hint">Serial format: <strong>throttle,steering</strong> (each -100 to 100)</p>
    </div>
  </div>
  <div class="blocks-panel" id="blocksPanel" style="position:absolute;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;">
    <button class="panel-toggle right-toggle" id="blocksToggle" title="Collapse panel">▶</button>
    <div class="blocks-content" id="blocksContent">
    <div class="blocks-header">
      <h2>Scratch Blocks</h2>
      <p>Build a program and click Run to drive the robot.</p>
    </div>
    <div class="blocks-actions">
      <button id="runBlocksBtn" type="button">Run Blocks</button>
      <button id="stopBlocksBtn" type="button" disabled>Stop</button>
      <button id="clearBlocksBtn" type="button">Clear</button>
    </div>
    <div class="mission-row">
      <button id="missionSquareBtn" type="button">Mission: Square</button>
      <button id="missionSlalomBtn" type="button">Mission: Slalom 4 Cans</button>
      <button id="missionGotoBtn" type="button">Mission: Go To Coord</button>
      <div class="mission-dropdown" id="lineFollowDropdown">
        <button type="button" class="mission-dropdown-btn">Line Follow ▾</button>
        <div class="mission-dropdown-content">
          <button id="missionLineFollowBasicBtn" type="button">Basic (Ring)</button>
          <button id="missionLineFollowIntermediateBtn" type="button">Intermediate</button>
        </div>
      </div>
      <button id="missionMazeBtn" type="button">Mission: Maze</button>
    </div>
    <p id="blocksStatus">Blocks: Ready</p>
    <div id="blocklyDiv"></div>
    </div>
  </div>
`

const openClawBtn = app.querySelector('#openClawBtn')
const closeClawBtn = app.querySelector('#closeClawBtn')
const runBlocksBtn = app.querySelector('#runBlocksBtn')
const stopBlocksBtn = app.querySelector('#stopBlocksBtn')
const clearBlocksBtn = app.querySelector('#clearBlocksBtn')
const missionSquareBtn = app.querySelector('#missionSquareBtn')
const missionSlalomBtn = app.querySelector('#missionSlalomBtn')
const missionGotoBtn = app.querySelector('#missionGotoBtn')
const missionLineFollowBasicBtn = app.querySelector('#missionLineFollowBasicBtn')
const missionLineFollowIntermediateBtn = app.querySelector('#missionLineFollowIntermediateBtn')
const missionMazeBtn = app.querySelector('#missionMazeBtn')
const robotSelect = app.querySelector('#robotSelect')
const mapSelect = app.querySelector('#mapSelect')
const clawBtnsRow = app.querySelector('#clawBtnsRow')
const blocksStatus = app.querySelector('#blocksStatus')
const statusText = app.querySelector('#statusText')
const coordsText = app.querySelector('#coordsText')
const clickCoordsText = app.querySelector('#clickCoordsText')
const telemetry = app.querySelector('#telemetry')
const sensorText = app.querySelector('#sensorText')
const slipperySlider = app.querySelector('#slipperySlider')
const slipperyValue = app.querySelector('#slipperyValue')

slipperySlider.addEventListener('input', () => {
  wheelSlippery = Number(slipperySlider.value)
  slipperyValue.textContent = `${wheelSlippery}%`
})

// Port wiring selectors
const portSelects = {
  A: app.querySelector('#portA'),
  B: app.querySelector('#portB'),
  C: app.querySelector('#portC'),
  D: app.querySelector('#portD'),
  E: app.querySelector('#portE'),
  F: app.querySelector('#portF')
}
for (const [letter, sel] of Object.entries(portSelects)) {
  sel.addEventListener('change', () => {
    portMap[letter] = sel.value
  })
}

// Sensor reading elements
const gyroReading = app.querySelector('#gyroReading')
const accelReading = app.querySelector('#accelReading')
const distReading = app.querySelector('#distReading')
const colorReading = app.querySelector('#colorReading')
const forceReading = app.querySelector('#forceReading')
const leftEncReading = app.querySelector('#leftEncReading')
const rightEncReading = app.querySelector('#rightEncReading')
const matrixReading = app.querySelector('#matrixReading')
const speakerReading = app.querySelector('#speakerReading')
const btReading = app.querySelector('#btReading')
const batteryReading = app.querySelector('#batteryReading')
const resetSensorsBtn = app.querySelector('#resetSensorsBtn')

// ── Collapsible panels ────────────────────────────────────────
const hudPanel = app.querySelector('#hudPanel')
const hudToggle = app.querySelector('#hudToggle')
const hudContent = app.querySelector('#hudContent')
const blocksPanel = app.querySelector('#blocksPanel')
const blocksToggle = app.querySelector('#blocksToggle')
const blocksContent = app.querySelector('#blocksContent')

hudToggle.addEventListener('click', () => {
  const collapsed = hudPanel.classList.toggle('collapsed')
  hudToggle.textContent = collapsed ? '▶' : '◀'
  hudToggle.title = collapsed ? 'Expand panel' : 'Collapse panel'
})

blocksToggle.addEventListener('click', () => {
  const collapsed = blocksPanel.classList.toggle('collapsed')
  blocksToggle.textContent = collapsed ? '◀' : '▶'
  blocksToggle.title = collapsed ? 'Expand panel' : 'Collapse panel'
  // Resize Blockly workspace when panel re-expands
  if (!collapsed && blocklyWorkspace) {
    setTimeout(() => Blockly.svgResize(blocklyWorkspace), 200)
  }
})

// ── Part-click tooltip ──────────────────────────────────────────
const partTooltip = document.createElement('div')
partTooltip.className = 'part-tooltip'
partTooltip.style.display = 'none'
app.appendChild(partTooltip)

const raycaster = new THREE.Raycaster()
const clickMouse = new THREE.Vector2()
let leftWheelEncoder = 0
let rightWheelEncoder = 0
let movementSpeedPercent = 60        // default speed for go straight / turn
let motorASpeeed = 0                 // left wheel continuous speed (-100..100)
let motorBSpeed = 0                  // right wheel continuous speed (-100..100)
let motorCSpeed = 0                  // claw motor (not used for continuous)
let programTimerStart = 0            // performance.now() when program starts

// ── Port wiring: port letter → device role ────────────────────
const portMap = {
  A: 'rightMotor',
  B: 'leftMotor',
  C: 'claw',
  D: 'distance',
  E: 'color',
  F: 'force'
}

let explicitMotorPorts = new Set()
const virtualMotorState = {
  A: { speed: 0, encoder: 0 },
  B: { speed: 0, encoder: 0 },
  C: { speed: 0, encoder: 0 },
  D: { speed: 0, encoder: 0 },
  E: { speed: 0, encoder: 0 },
  F: { speed: 0, encoder: 0 }
}

function isVirtualMotorPort(letter, role) {
  return explicitMotorPorts.has(letter) && role !== 'rightMotor' && role !== 'leftMotor' && role !== 'claw'
}

function resetVirtualMotors() {
  for (const key of Object.keys(virtualMotorState)) {
    virtualMotorState[key].speed = 0
    virtualMotorState[key].encoder = 0
  }
}

function setPortRole(letter, role) {
  if (!Object.prototype.hasOwnProperty.call(portMap, letter)) return
  portMap[letter] = role

  const select = portSelects[letter]
  if (!select) return
  const hasRole = Array.from(select.options).some((opt) => opt.value === role)
  if (hasRole) {
    select.value = role
  }
}

/** Resolve a port letter to its device role */
function portRole(letter) {
  return portMap[letter] || 'none'
}

/** Find the first port assigned to a given role */
function portForRole(role) {
  return Object.keys(portMap).find(k => portMap[k] === role) || null
}
let vehicleBlocked = false           // exposed collision flag for force sensor
let audioCtx = null                  // lazy Web Audio context for beep

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x8ec9ff)
scene.fog = new THREE.Fog(0x8ec9ff, 60, 280)

const camera = new THREE.PerspectiveCamera(70, app.clientWidth / app.clientHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(app.clientWidth, app.clientHeight)
renderer.setPixelRatio(window.devicePixelRatio)
renderer.shadowMap.enabled = true
renderer.domElement.style.position = 'absolute'
renderer.domElement.style.top = '0'
renderer.domElement.style.left = '0'
app.style.position = 'relative'
app.appendChild(renderer.domElement)
_renderer = renderer

// --- World coordinate axes widget (bottom-left corner) ---
const axesScene = new THREE.Scene()
const axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10)
axesCamera.position.set(0, 0, 2.5)
axesCamera.lookAt(0, 0, 0)

// Build thick 3D arrows for each axis
function makeArrow(color, dir) {
  const group = new THREE.Group()
  const shaftLen = 0.85, shaftR = 0.045, coneLen = 0.3, coneR = 0.11
  const shaftGeo = new THREE.CylinderGeometry(shaftR, shaftR, shaftLen, 12)
  const coneGeo = new THREE.ConeGeometry(coneR, coneLen, 16)
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 })
  const shaft = new THREE.Mesh(shaftGeo, mat)
  shaft.position.y = shaftLen / 2
  const cone = new THREE.Mesh(coneGeo, mat)
  cone.position.y = shaftLen + coneLen / 2
  group.add(shaft, cone)
  // Default cylinder points +Y, rotate to desired positive axis
  if (dir === 'x') group.rotation.z = Math.PI / 2     // -X visual direction
  else if (dir === 'z') group.rotation.x = -Math.PI / 2 // +Z
  // y stays as-is (+Y)
  return group
}
axesScene.add(makeArrow(0xff3333, 'x'))  // Red  = +X
axesScene.add(makeArrow(0x33cc33, 'y'))  // Green = +Y
axesScene.add(makeArrow(0x3377ff, 'z'))  // Blue  = +Z

// Small sphere at origin
const originSphere = new THREE.Mesh(
  new THREE.SphereGeometry(0.07, 12, 12),
  new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.4 })
)
axesScene.add(originSphere)

// Labels — always visible (depthTest:false, high renderOrder, pushed past arrow tips)
function makeAxisLabel(text, color, pos) {
  const canvas = document.createElement('canvas')
  canvas.width = 64; canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.font = 'bold 48px Arial'
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 32, 32)
  const tex = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.position.copy(pos)
  sprite.scale.set(0.45, 0.45, 1)
  sprite.renderOrder = 999
  return sprite
}
axesScene.add(makeAxisLabel('X', '#ff4444', new THREE.Vector3(-1.45, 0, 0)))
axesScene.add(makeAxisLabel('Y', '#44cc44', new THREE.Vector3(0, 1.45, 0)))
axesScene.add(makeAxisLabel('Z', '#4488ff', new THREE.Vector3(0, 0, 1.45)))
const axesLight = new THREE.AmbientLight(0xffffff, 1.2)
axesScene.add(axesLight)
const axesDirLight = new THREE.DirectionalLight(0xffffff, 1.0)
axesDirLight.position.set(2, 3, 4)
axesScene.add(axesDirLight)

const cameraOrbit = {
  yawOffset: Math.PI,
  pitch: 0.45,
  distance: 12,
  minDistance: 4,
  maxDistance: 28,
  minPitch: 0.1,
  maxPitch: 1.2,
  isDragging: false,
  lastX: 0,
  lastY: 0
}

renderer.domElement.addEventListener('contextmenu', (event) => {
  event.preventDefault()
})

renderer.domElement.addEventListener('mousedown', (event) => {
  if (event.button !== 2) {
    return
  }

  cameraOrbit.isDragging = true
  cameraOrbit.lastX = event.clientX
  cameraOrbit.lastY = event.clientY
})

window.addEventListener('mousemove', (event) => {
  if (!cameraOrbit.isDragging) {
    return
  }

  const deltaX = event.clientX - cameraOrbit.lastX
  const deltaY = event.clientY - cameraOrbit.lastY
  cameraOrbit.lastX = event.clientX
  cameraOrbit.lastY = event.clientY

  cameraOrbit.yawOffset -= deltaX * 0.005
  cameraOrbit.pitch = clamp(cameraOrbit.pitch - deltaY * 0.0035, cameraOrbit.minPitch, cameraOrbit.maxPitch)
})

window.addEventListener('mouseup', () => {
  cameraOrbit.isDragging = false
})

renderer.domElement.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault()
    cameraOrbit.distance = clamp(
      cameraOrbit.distance + event.deltaY * 0.01,
      cameraOrbit.minDistance,
      cameraOrbit.maxDistance
    )
  },
  { passive: false }
)

// Left-click raycaster to identify robot parts
renderer.domElement.addEventListener('click', (event) => {
  // Ignore if clicking on UI
  if (event.target !== renderer.domElement) return

  const rect = renderer.domElement.getBoundingClientRect()
  clickMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  clickMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(clickMouse, camera)
  const intersects = raycaster.intersectObjects(car.children, true)

  if (intersects.length > 0) {
    // Walk up to find the object with partInfo
    let target = intersects[0].object
    while (target && !target.userData.partInfo && target.parent && target.parent !== car) {
      target = target.parent
    }
    // Also check immediate parent group
    if (!target.userData.partInfo && target.parent && target.parent.userData.partInfo) {
      target = target.parent
    }

    const info = target.userData.partInfo
    if (info) {
      partTooltip.innerHTML = `<strong>${info.name}</strong><br>${info.description}`
      partTooltip.style.display = 'block'
      partTooltip.style.left = event.clientX + 12 + 'px'
      partTooltip.style.top = event.clientY - 10 + 'px'
      // Auto-hide after 3s
      clearTimeout(partTooltip._hideTimer)
      partTooltip._hideTimer = setTimeout(() => { partTooltip.style.display = 'none' }, 3500)
    } else {
      partTooltip.style.display = 'none'
    }
  } else {
    partTooltip.style.display = 'none'
    // Raycast against ground plane (y=0) to show clicked world coordinate
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const intersectPoint = new THREE.Vector3()
    if (raycaster.ray.intersectPlane(groundPlane, intersectPoint)) {
      const cx = (intersectPoint.x * CM_PER_WORLD_UNIT).toFixed(1)
      const cz = (intersectPoint.z * CM_PER_WORLD_UNIT).toFixed(1)
      clickCoordsText.textContent = `Clicked Coordinate: (${cx} cm, ${cz} cm)`
      clickCoordsText.style.display = ''
    }
  }
})

const sun = new THREE.DirectionalLight(0xffffff, 1.1)
sun.position.set(60, 90, 20)
sun.castShadow = true
sun.shadow.mapSize.width = 2048
sun.shadow.mapSize.height = 2048
scene.add(sun)
scene.add(new THREE.AmbientLight(0xffffff, 0.4))

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(600, 600),
  new THREE.MeshStandardMaterial({ color: 0x4c8c4f, roughness: 1 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 40),
  new THREE.MeshStandardMaterial({ color: 0x2f2f2f, roughness: 0.9 })
)
road.rotation.x = -Math.PI / 2
road.position.y = 0.01
scene.add(road)

const crossRoad = road.clone()
crossRoad.rotation.z = Math.PI / 2
scene.add(crossRoad)

const grid = new THREE.GridHelper(600, 60, 0x223322, 0x335533)
grid.position.y = 0.02
scene.add(grid)

const CM_PER_WORLD_UNIT = 10
const WHEEL_DIAMETER_CM = 6.24     // 62.4 mm wheel
const WHEEL_WIDTH_CM = 2.0         // 20 mm
const WHEEL_CIRCUMFERENCE_CM = Math.PI * WHEEL_DIAMETER_CM  // ~19.6 cm
const WHEEL_RADIUS_WORLD = (WHEEL_DIAMETER_CM / 2) / CM_PER_WORLD_UNIT  // world units
const DEFAULT_AXLE_TRACK_CM = 8.8
let driveBaseAxleTrackCm = DEFAULT_AXLE_TRACK_CM

function createLabelSprite(text) {
  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 64
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#f8f9fc'
  ctx.font = 'bold 26px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.minFilter = THREE.LinearFilter
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(3.6, 0.95, 1)
  return sprite
}

function addCentimeterRulers() {
  const group = new THREE.Group()
  const halfMapCm = 300 * CM_PER_WORLD_UNIT
  const minorStepCm = 10
  const majorStepCm = 100
  const labelStepCm = 500

  const xTickPositions = []
  const zTickPositions = []

  for (let cm = -halfMapCm; cm <= halfMapCm; cm += minorStepCm) {
    const worldPos = cm / CM_PER_WORLD_UNIT
    const isMajor = cm % majorStepCm === 0
    const majorSize = 1.15
    const minorSize = 0.42
    const tickSize = isMajor ? majorSize : minorSize

    xTickPositions.push(worldPos, 0.05, -20)
    xTickPositions.push(worldPos, 0.05, -20 - tickSize)

    zTickPositions.push(-20, 0.05, worldPos)
    zTickPositions.push(-20 - tickSize, 0.05, worldPos)

    if (cm % labelStepCm === 0) {
      const xLabel = createLabelSprite(`${cm} cm`)
      xLabel.position.set(worldPos, 0.35, -22.3)
      group.add(xLabel)

      const zLabel = createLabelSprite(`${cm} cm`)
      zLabel.position.set(-22.3, 0.35, worldPos)
      zLabel.material.rotation = Math.PI / 2
      group.add(zLabel)
    }
  }

  const xTickGeometry = new THREE.BufferGeometry()
  xTickGeometry.setAttribute('position', new THREE.Float32BufferAttribute(xTickPositions, 3))
  const zTickGeometry = new THREE.BufferGeometry()
  zTickGeometry.setAttribute('position', new THREE.Float32BufferAttribute(zTickPositions, 3))

  const minorMaterial = new THREE.LineBasicMaterial({ color: 0xe4e9f2, transparent: true, opacity: 0.7 })
  group.add(new THREE.LineSegments(xTickGeometry, minorMaterial))
  group.add(new THREE.LineSegments(zTickGeometry, minorMaterial))

  const rulerLineMaterial = new THREE.LineBasicMaterial({ color: 0xffdf6b })
  const xBaseGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-300, 0.05, -20),
    new THREE.Vector3(300, 0.05, -20)
  ])
  group.add(new THREE.Line(xBaseGeometry, rulerLineMaterial))

  const zBaseGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-20, 0.05, -300),
    new THREE.Vector3(-20, 0.05, 300)
  ])
  group.add(new THREE.Line(zBaseGeometry, rulerLineMaterial))

  const originTag = createLabelSprite('0 cm')
  originTag.position.set(-20, 0.45, -20)
  originTag.scale.set(2.8, 0.85, 1)
  group.add(originTag)

  scene.add(group)
}

addCentimeterRulers()

const obstacleBoxes = []
const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x8f7b5c, roughness: 0.8 })

const buildings = []
for (let i = 0; i < 60; i += 1) {
  const width = 6 + Math.random() * 14
  const depth = 6 + Math.random() * 14
  const height = 8 + Math.random() * 34
  const building = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    obstacleMaterial
  )

  const x = (Math.random() - 0.5) * 520
  const z = (Math.random() - 0.5) * 520

  if (Math.abs(x) < 28 || Math.abs(z) < 28) {
    i -= 1
    continue
  }

  building.position.set(x, height / 2, z)
  building.castShadow = true
  building.receiveShadow = true
  scene.add(building)
  buildings.push(building)
  obstacleBoxes.push(new THREE.Box3().setFromObject(building))
}

// ====== MAP ELEMENTS (swappable) ======
const mapElements = [] // tracks all map-specific objects in scene

const canBodyMaterial = new THREE.MeshStandardMaterial({ color: 0xd13f34, roughness: 0.4, metalness: 0.78 })
const canTopMaterial = new THREE.MeshStandardMaterial({ color: 0xc6ccd6, roughness: 0.35, metalness: 0.92 })
const canRadius = 0.33
const canHeight = 1.2
let cans = []
let mazeWallBoxes = []  // obstacle boxes added by the maze map

function clearMapElements() {
  for (const elem of mapElements) scene.remove(elem)
  mapElements.length = 0
  cans = []
  // Remove maze wall boxes from obstacleBoxes
  for (const box of mazeWallBoxes) {
    const idx = obstacleBoxes.indexOf(box)
    if (idx !== -1) obstacleBoxes.splice(idx, 1)
  }
  mazeWallBoxes = []
}

function createMapCans() {
  clearMapElements()
  const positions = [
    new THREE.Vector3(-6, 0, 30),
    new THREE.Vector3(6, 0, 56),
    new THREE.Vector3(-6, 0, 82),
    new THREE.Vector3(6, 0, 108)
  ]
  for (const canPos of positions) {
    const canGroup = new THREE.Group()
    canGroup.position.set(canPos.x, 0, canPos.z)

    const canBody = new THREE.Mesh(new THREE.CylinderGeometry(canRadius, canRadius, canHeight, 28), canBodyMaterial)
    canBody.position.y = canHeight / 2
    canBody.castShadow = true
    canBody.receiveShadow = true
    canGroup.add(canBody)

    const canTop = new THREE.Mesh(new THREE.CylinderGeometry(canRadius - 0.02, canRadius - 0.02, 0.08, 28), canTopMaterial)
    canTop.position.y = canHeight + 0.04
    canTop.castShadow = true
    canGroup.add(canTop)

    const canBottom = new THREE.Mesh(new THREE.CylinderGeometry(canRadius - 0.02, canRadius - 0.02, 0.06, 28), canTopMaterial)
    canBottom.position.y = 0.03
    canGroup.add(canBottom)

    const canLabel = createLabelSprite('330ml')
    canLabel.scale.set(1.7, 0.5, 1)
    canLabel.position.y = canHeight + 0.35
    canGroup.add(canLabel)

    scene.add(canGroup)
    mapElements.push(canGroup)
    cans.push({ group: canGroup, grabbed: false })
  }
}

// Line follow map: black oval/circle track on the ground
const lineTrackRadius = 18 // world units = 180 cm radius
const lineTrackWidth = 1.4 // world units = 14 cm wide black line

function createMapLine() {
  clearMapElements()

  // Create a black ring on the ground using a RingGeometry
  const outerR = lineTrackRadius + lineTrackWidth / 2
  const innerR = lineTrackRadius - lineTrackWidth / 2
  const trackGeo = new THREE.RingGeometry(innerR, outerR, 128)
  const trackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95, side: THREE.DoubleSide })
  const trackMesh = new THREE.Mesh(trackGeo, trackMat)
  trackMesh.rotation.x = -Math.PI / 2
  trackMesh.position.set(0, 0.015, 20) // centered slightly ahead of start
  scene.add(trackMesh)
  mapElements.push(trackMesh)

  // Start marker
  const startMarker = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 3),
    new THREE.MeshStandardMaterial({ color: 0x22cc44, roughness: 0.8, side: THREE.DoubleSide })
  )
  startMarker.rotation.x = -Math.PI / 2
  startMarker.position.set(0, 0.02, 20 + lineTrackRadius)
  scene.add(startMarker)
  mapElements.push(startMarker)

  const startLabel = createLabelSprite('START')
  startLabel.position.set(0, 0.6, 20 + lineTrackRadius)
  scene.add(startLabel)
  mapElements.push(startLabel)
}

// ── Intermediate Line Follow Map ─────────────────────────────────
// Winding path with multiple colours and two dead-end branches
const intermediateTrackDef = [
  // Start section – go right
  { x1: 0, z1: 40, x2: 12, z2: 40, color: 'black' },
  // Turn south
  { x1: 12, z1: 40, x2: 12, z2: 30, color: 'black' },
  // JUNCTION 1 – dead end right (red)
  { x1: 12, z1: 30, x2: 22, z2: 30, color: 'red' },
  // Continue left
  { x1: 12, z1: 30, x2: 0, z2: 30, color: 'black' },
  // Turn south
  { x1: 0, z1: 30, x2: 0, z2: 22, color: 'black' },
  // JUNCTION 2 – dead end left (blue)
  { x1: 0, z1: 22, x2: -10, z2: 22, color: 'blue' },
  // Continue right
  { x1: 0, z1: 22, x2: 10, z2: 22, color: 'black' },
  // Turn south
  { x1: 10, z1: 22, x2: 10, z2: 14, color: 'black' },
  // Finish (green)
  { x1: 10, z1: 14, x2: 10, z2: 12, color: 'green' },
]

function createMapLineIntermediate() {
  clearMapElements()

  const segColorMap = {
    black: 0x111111, red: 0xcc2222, blue: 0x2244cc, green: 0x22cc44,
  }

  for (const seg of intermediateTrackDef) {
    const dx = seg.x2 - seg.x1
    const dz = seg.z2 - seg.z1
    const len = Math.sqrt(dx * dx + dz * dz)
    if (len === 0) continue
    const dirX = dx / len
    const dirZ = dz / len
    // Normal (perpendicular in XZ plane)
    const nx = -dirZ
    const nz = dirX
    const hw = lineTrackWidth / 2
    // Extend each end by hw so corners overlap
    const ax = seg.x1 - dirX * hw, az = seg.z1 - dirZ * hw
    const bx = seg.x2 + dirX * hw, bz = seg.z2 + dirZ * hw

    const verts = new Float32Array([
      ax + nx * hw, 0, az + nz * hw,
      ax - nx * hw, 0, az - nz * hw,
      bx - nx * hw, 0, bz - nz * hw,
      bx + nx * hw, 0, bz + nz * hw,
    ])
    const geo = new THREE.BufferGeometry()
    geo.setIndex([0, 1, 2, 0, 2, 3])
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    geo.computeVertexNormals()

    const mat = new THREE.MeshStandardMaterial({
      color: segColorMap[seg.color] || 0x111111,
      roughness: 0.95,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: seg.color === 'black' ? -1 : -2,
      polygonOffsetUnits: seg.color === 'black' ? -1 : -2,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = seg.color === 'black' ? 0.015 : 0.016
    scene.add(mesh)
    mapElements.push(mesh)
  }

  // Start marker (placed beside the track, not on it)
  const startMarker = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 3),
    new THREE.MeshStandardMaterial({ color: 0x22cc44, roughness: 0.8, side: THREE.DoubleSide })
  )
  startMarker.rotation.x = -Math.PI / 2
  startMarker.position.set(-2.5, 0.02, 40)
  scene.add(startMarker)
  mapElements.push(startMarker)

  const startLabel = createLabelSprite('START')
  startLabel.position.set(-2.5, 0.6, 40)
  scene.add(startLabel)
  mapElements.push(startLabel)

  // End marker (placed beside the track, not on it)
  const endMarker = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 3),
    new THREE.MeshStandardMaterial({ color: 0x22cc44, roughness: 0.8, side: THREE.DoubleSide })
  )
  endMarker.rotation.x = -Math.PI / 2
  endMarker.position.set(12.5, 0.02, 12)
  scene.add(endMarker)
  mapElements.push(endMarker)

  const endLabel = createLabelSprite('END')
  endLabel.position.set(12.5, 0.6, 12)
  scene.add(endLabel)
  mapElements.push(endLabel)

  // Dead-end markers
  const de1Label = createLabelSprite('DEAD END')
  de1Label.position.set(22, 0.6, 30)
  scene.add(de1Label)
  mapElements.push(de1Label)

  const de2Label = createLabelSprite('DEAD END')
  de2Label.position.set(-10, 0.6, 22)
  scene.add(de2Label)
  mapElements.push(de2Label)
}

// Colour sensing for intermediate track – checks point-to-segment distance
function sampleIntermediateColor(worldX, worldZ) {
  const hw = lineTrackWidth / 2
  for (const seg of intermediateTrackDef) {
    const dx = seg.x2 - seg.x1
    const dz = seg.z2 - seg.z1
    const lenSq = dx * dx + dz * dz
    if (lenSq === 0) continue
    const t = Math.max(0, Math.min(1, ((worldX - seg.x1) * dx + (worldZ - seg.z1) * dz) / lenSq))
    const cx = seg.x1 + t * dx
    const cz = seg.z1 + t * dz
    const distSq = (worldX - cx) ** 2 + (worldZ - cz) ** 2
    if (distSq <= hw * hw) return seg.color
  }
  return 'white'
}

// ── Maze Map ─────────────────────────────────────────────────────
// Grid-based maze: each cell is CELL_SIZE world units.
// Walls are thin boxes that also act as collision obstacles.
const MAZE_CELL = 5            // world units per cell (= 50 cm)
const MAZE_WALL_H = 1.2        // wall height
const MAZE_WALL_T = 0.35       // wall thickness
const mazeWallMat = new THREE.MeshStandardMaterial({ color: 0x4a6fa5, roughness: 0.6, metalness: 0.15 })
const mazeFloorMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })

function createMapMaze() {
  clearMapElements()

  // Maze grid definition: 0 = path, 1 = wall
  // 11 columns × 11 rows  (odd = corridors, even = walls/pillars)
  const grid = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,0,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1],
  ]

  const rows = grid.length
  const cols = grid[0].length
  const mazeW = cols * MAZE_CELL
  const mazeD = rows * MAZE_CELL
  // Offset so the maze is centered around (0, mazeD/2 + 4) — slightly ahead of robot start
  const ox = -mazeW / 2
  const oz = 4  // robot starts at (0,0), maze starts just ahead

  // Floor under maze
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(mazeW + 2, mazeD + 2),
    mazeFloorMat
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.set(ox + mazeW / 2, 0.06, oz + mazeD / 2)
  scene.add(floor)
  mapElements.push(floor)

  // Build wall blocks from grid
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== 1) continue
      const wx = ox + c * MAZE_CELL + MAZE_CELL / 2
      const wz = oz + r * MAZE_CELL + MAZE_CELL / 2
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(MAZE_CELL, MAZE_WALL_H, MAZE_CELL),
        mazeWallMat
      )
      wall.position.set(wx, MAZE_WALL_H / 2, wz)
      wall.castShadow = true
      wall.receiveShadow = true
      scene.add(wall)
      mapElements.push(wall)
      const box = new THREE.Box3().setFromObject(wall)
      obstacleBoxes.push(box)
      mazeWallBoxes.push(box)
    }
  }

  // START marker — cell (1,1)
  const startX = ox + 1 * MAZE_CELL + MAZE_CELL / 2
  const startZ = oz + 1 * MAZE_CELL + MAZE_CELL / 2
  const startPad = new THREE.Mesh(
    new THREE.PlaneGeometry(MAZE_CELL * 0.8, MAZE_CELL * 0.8),
    new THREE.MeshStandardMaterial({ color: 0x22cc44, roughness: 0.8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  )
  startPad.rotation.x = -Math.PI / 2
  startPad.position.set(startX, 0.07, startZ)
  scene.add(startPad)
  mapElements.push(startPad)

  const startLbl = createLabelSprite('START')
  startLbl.position.set(startX, 1.8, startZ)
  scene.add(startLbl)
  mapElements.push(startLbl)

  // END marker — cell (11,5)  (row 11, col 5 — near bottom-center)
  const endX = ox + 11 * MAZE_CELL + MAZE_CELL / 2
  const endZ = oz + 5 * MAZE_CELL + MAZE_CELL / 2
  const endPad = new THREE.Mesh(
    new THREE.PlaneGeometry(MAZE_CELL * 0.8, MAZE_CELL * 0.8),
    new THREE.MeshStandardMaterial({ color: 0xee3333, roughness: 0.8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })
  )
  endPad.rotation.x = -Math.PI / 2
  endPad.position.set(endX, 0.07, endZ)
  scene.add(endPad)
  mapElements.push(endPad)

  const endLbl = createLabelSprite('FINISH')
  endLbl.position.set(endX, 1.8, endZ)
  scene.add(endLbl)
  mapElements.push(endLbl)

  // Store maze metadata for mission use
  createMapMaze.startPos = { x: startX, z: startZ }
  createMapMaze.endPos   = { x: endX,   z: endZ }
}

// Color sensor ground sampling — returns colour name
function sampleGroundColor(worldX, worldZ) {
  if (currentMapType === 'mapLineIntermediate') return sampleIntermediateColor(worldX, worldZ)
  // Only detect black when the line map is active
  if (currentMapType !== 'mapLine') return 'white'
  // Track center is at (0, 20) with radius lineTrackRadius
  const cx = 0, cz = 20
  const dx = worldX - cx
  const dz = worldZ - cz
  const dist = Math.sqrt(dx * dx + dz * dz)
  const halfW = lineTrackWidth / 2
  if (dist >= lineTrackRadius - halfW && dist <= lineTrackRadius + halfW) {
    return 'black'
  }
  return 'white'
}

// ====== ROBOT MODELS (swappable) ======
let currentRobotType = 'basicClaw'
let currentMapType = 'mapCans'

const car = new THREE.Group()
const driveWheels = []
const robotParts = [] // parts added to car that can be cleared

const claw = {
  openRatio: 1,
  targetOpenRatio: 1,
  minSpread: 0.78,
  maxSpread: 1.8,
  grabbedCan: null
}
let leftClawPivot = null
let rightClawPivot = null

// Color sensor positions (in car-local coords, pre-scale)
// Placed at the bottom front, slightly left and right of center
const colorSensorOffsetX = 0.55  // how far left/right from center (narrow so both sensors stay on the line)
const colorSensorLocalZ = 3.5   // how far forward from center
let leftSensorMesh = null
let rightSensorMesh = null
let hasColorSensors = false

function clearRobotParts() {
  for (const p of robotParts) car.remove(p)
  robotParts.length = 0
  driveWheels.length = 0
  leftClawPivot = null
  rightClawPivot = null
  leftSensorMesh = null
  rightSensorMesh = null
  hasColorSensors = false
  claw.grabbedCan = null
  claw.openRatio = 1
  claw.targetOpenRatio = 1
}

function tagPart(mesh, name, description) {
  mesh.userData.partInfo = { name, description }
  // Also tag children so raycaster hits them
  mesh.traverse(child => { child.userData.partInfo = { name, description } })
}

function addCommonWheelsAndChassis() {
  const hubBody = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 1.55, 3.5),
    new THREE.MeshStandardMaterial({ color: 0xf4d42f, roughness: 0.62, metalness: 0.05 })
  )
  hubBody.position.y = 1.42
  hubBody.castShadow = true
  hubBody.receiveShadow = true
  car.add(hubBody); robotParts.push(hubBody)
  tagPart(hubBody, 'Hub (Body)', 'Main processing unit with ARM Cortex-M4 processor. Houses the 6-axis gyroscope, accelerometer, 5x5 LED matrix, speaker, and 6 input/output ports.')

  const hubTop = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.22, 2.9),
    new THREE.MeshStandardMaterial({ color: 0x21242a, roughness: 0.35, metalness: 0.1 })
  )
  hubTop.position.set(0, 2.31, 0)
  hubTop.castShadow = true
  car.add(hubTop); robotParts.push(hubTop)
  tagPart(hubTop, 'Hub Top Cover', 'Protective top cover of the hub. Contains the 5x5 LED matrix display and center button.')

  const matrixPanel = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.08, 1.35),
    new THREE.MeshStandardMaterial({ color: 0x0f1216, roughness: 0.5 })
  )
  matrixPanel.position.set(0, 2.46, -0.92)
  matrixPanel.castShadow = true
  car.add(matrixPanel); robotParts.push(matrixPanel)
  tagPart(matrixPanel, '5×5 LED Matrix', 'Programmable 5x5 LED matrix display. Can show images, text, numbers, and animations. Also acts as a basic light sensor.')

  const matrixFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 0.05, 1.55),
    new THREE.MeshStandardMaterial({ color: 0xeceff3, roughness: 0.45, metalness: 0.1 })
  )
  matrixFrame.position.set(0, 2.43, -0.92)
  matrixFrame.castShadow = true
  car.add(matrixFrame); robotParts.push(matrixFrame)
  tagPart(matrixFrame, '5×5 LED Matrix Frame', 'White frame around the 5x5 LED matrix display.')

  const hubButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.07, 24),
    new THREE.MeshStandardMaterial({ color: 0xf7f8fa, roughness: 0.35, metalness: 0.08 })
  )
  hubButton.rotation.x = Math.PI / 2
  hubButton.position.set(0, 2.47, -0.16)
  hubButton.castShadow = true
  car.add(hubButton); robotParts.push(hubButton)
  tagPart(hubButton, 'Hub Center Button', 'Power button and program selector. Press to turn on/off the hub, or cycle through stored programs.')

  const sideBeamMaterial = new THREE.MeshStandardMaterial({ color: 0x2f343c, roughness: 0.65 })
  const leftBeam = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.28, 3.2), sideBeamMaterial)
  leftBeam.position.set(-1.57, 1.02, 0)
  leftBeam.castShadow = true
  car.add(leftBeam); robotParts.push(leftBeam)
  tagPart(leftBeam, 'Right Frame Beam', 'Structural beam connecting the hub to the right wheel assembly.')

  const rightBeam = leftBeam.clone()
  rightBeam.position.x = 1.57
  car.add(rightBeam); robotParts.push(rightBeam)
  tagPart(rightBeam, 'Left Frame Beam', 'Structural beam connecting the hub to the left wheel assembly.')

  const axle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 3.56, 18),
    new THREE.MeshStandardMaterial({ color: 0x8d939c, roughness: 0.35, metalness: 0.75 })
  )
  axle.rotation.z = Math.PI / 2
  axle.position.set(0, 1.0, 0)
  axle.castShadow = true
  car.add(axle); robotParts.push(axle)
  tagPart(axle, 'Drive Axle', 'Steel axle connecting both drive wheels. Transfers motor torque to the wheels.')

  const CAR_SCALE = 0.45
  const wheelLocalRadius = (WHEEL_DIAMETER_CM / 2) / (CM_PER_WORLD_UNIT * CAR_SCALE)  // ~0.693
  const wheelLocalWidth = WHEEL_WIDTH_CM / (CM_PER_WORLD_UNIT * CAR_SCALE)             // ~0.444
  const wheelGeometry = new THREE.CylinderGeometry(wheelLocalRadius, wheelLocalRadius, wheelLocalWidth, 32)
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.85 })
  const wheelSpokeMaterial = new THREE.MeshStandardMaterial({ color: 0xc8ced6, roughness: 0.35, metalness: 0.55 })

  for (const x of [-2.03, 2.03]) {
    const wheelGroup = new THREE.Group()

    const tire = new THREE.Mesh(wheelGeometry, tireMaterial)
    tire.rotation.z = Math.PI / 2
    tire.castShadow = true
    wheelGroup.add(tire)

    const hubCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.23, 0.6, 20),
      wheelSpokeMaterial
    )
    hubCap.rotation.z = Math.PI / 2
    hubCap.castShadow = true
    wheelGroup.add(hubCap)

    const spokeBarA = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.05), wheelSpokeMaterial)
    spokeBarA.castShadow = true
    wheelGroup.add(spokeBarA)

    const spokeBarB = spokeBarA.clone()
    spokeBarB.rotation.z = Math.PI / 2
    wheelGroup.add(spokeBarB)

    wheelGroup.position.set(x, 1.0, 0)
    car.add(wheelGroup); robotParts.push(wheelGroup)
    driveWheels.push(wheelGroup)
    const side = x < 0 ? 'Right' : 'Left'
    const port = x < 0 ? 'Port E' : 'Port F'
    tagPart(wheelGroup, `${side} Motor + Encoder`, `${side} drive wheel with built-in medium motor (${port}). Includes a rotation encoder that measures position in degrees (±0.3° accuracy) and speed in RPM.`)
  }

  const casterBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 14, 12),
    new THREE.MeshStandardMaterial({ color: 0xb3bbc5, roughness: 0.45, metalness: 0.5 })
  )
  casterBall.position.set(0, 0.24, 1.62)
  casterBall.castShadow = true
  car.add(casterBall); robotParts.push(casterBall)
  tagPart(casterBall, 'Caster Wheel (Ball)', 'Passive caster ball providing stability. Allows free rotation in all directions for differential-drive steering.')

  const casterFork = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x30343b, roughness: 0.65 })
  )
  casterFork.position.set(0, 0.43, 1.62)
  casterFork.castShadow = true
  car.add(casterFork); robotParts.push(casterFork)
  tagPart(casterFork, 'Caster Fork', 'Mounting bracket for the caster ball.')

  const hubPortMaterial = new THREE.MeshStandardMaterial({ color: 0x2d3138, roughness: 0.5 })
  for (const x of [-0.95, -0.57, -0.19, 0.19, 0.57, 0.95]) {
    const topPort = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.24), hubPortMaterial)
    topPort.position.set(x, 2.45, 1.18)
    topPort.castShadow = true
    car.add(topPort); robotParts.push(topPort)
    tagPart(topPort, 'I/O Port', 'LPF2 input/output port. Connect motors, color sensor, distance sensor, or force sensor. 6 ports total (A–F).')
  }

  const facingArrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.34, 3),
    new THREE.MeshStandardMaterial({ color: 0x00a3ff, roughness: 0.45 })
  )
  facingArrow.rotation.x = Math.PI / 2
  facingArrow.position.set(0, 2.16, 1.52)
  facingArrow.castShadow = true
  car.add(facingArrow); robotParts.push(facingArrow)
  tagPart(facingArrow, 'Forward Direction Indicator', 'Blue arrow showing the robot\'s forward-facing direction.')

  // ── Built-in Sensors ────────────────────────────────────────────

  // Speaker grill (left side of hub)
  const speakerGrill = new THREE.Group()
  const grillMat = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.7 })
  for (let i = 0; i < 4; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.42), grillMat)
    slot.position.set(-1.43, 1.62 + i * 0.10, -0.35)
    speakerGrill.add(slot)
  }
  speakerGrill.castShadow = true
  car.add(speakerGrill); robotParts.push(speakerGrill)
  tagPart(speakerGrill, 'Speaker', 'Built-in speaker for playing sounds, notes, and beeps. Supports different frequencies and durations for audio feedback.')

  // Bluetooth LED indicator (small blue dot near the hub button)
  const btLed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.03, 12),
    new THREE.MeshStandardMaterial({ color: 0x2196f3, roughness: 0.2, emissive: 0x2196f3, emissiveIntensity: 0.8 })
  )
  btLed.rotation.x = Math.PI / 2
  btLed.position.set(0.32, 2.47, -0.16)
  car.add(btLed); robotParts.push(btLed)
  tagPart(btLed, 'Bluetooth LED', 'Bluetooth 4.2 BLE status indicator. Blue = connected, blinking = pairing mode. Used for wireless communication with tablets and computers.')

  // Battery compartment (back of hub)
  const batterySlot = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x30363e, roughness: 0.55, metalness: 0.15 })
  )
  batterySlot.position.set(0, 1.38, -1.82)
  batterySlot.castShadow = true
  car.add(batterySlot); robotParts.push(batterySlot)
  tagPart(batterySlot, 'Rechargeable Battery', 'Built-in 2100 mAh LiPo rechargeable battery. Provides approximately 4-8 hours of use. Charges via Micro-USB cable.')

  const batteryLed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10),
    new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.25, emissive: 0x4caf50, emissiveIntensity: 0.7 })
  )
  batteryLed.rotation.x = Math.PI / 2
  batteryLed.position.set(0.6, 1.58, -1.82)
  car.add(batteryLed); robotParts.push(batteryLed)
  tagPart(batteryLed, 'Battery Status LED', 'Green = fully charged, yellow = medium, red = low battery. Blinks when charging.')

  // 6-Axis Gyroscope / Accelerometer chip (on hub top, small labeled chip)
  const gyroChip = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.04, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.45, metalness: 0.25 })
  )
  gyroChip.position.set(-0.6, 2.35, 0.4)
  car.add(gyroChip); robotParts.push(gyroChip)
  tagPart(gyroChip, '6-Axis Gyroscope / Accelerometer', 'Built-in IMU sensor measuring orientation, tilt, and acceleration on 3 axes. Detects yaw (heading), pitch, and roll angles. Used for precise turns and balance.')

  const gyroDot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.02, 8),
    new THREE.MeshStandardMaterial({ color: 0xff9800, roughness: 0.3, emissive: 0xff6600, emissiveIntensity: 0.3 })
  )
  gyroDot.position.set(-0.6, 2.39, 0.4)
  car.add(gyroDot); robotParts.push(gyroDot)
  tagPart(gyroDot, '6-Axis Gyroscope / Accelerometer', 'IMU status indicator. Measures rotation rate (°/s) and linear acceleration (m/s²) in X, Y, and Z axes.')

  // ── External Sensors ────────────────────────────────────────────

  // Distance Sensor (ultrasonic, front-mounted with two "eye" LEDs)
  const distSensorBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.7, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.45, metalness: 0.08 })
  )
  distSensorBody.position.set(0, 1.0, 2.15)
  distSensorBody.castShadow = true
  car.add(distSensorBody); robotParts.push(distSensorBody)
  tagPart(distSensorBody, 'Ultrasonic Distance Sensor', 'Measures distance using ultrasonic waves (1–200 cm range, Port D). Features two "eye" LEDs that can be individually programmed. Emits 40kHz sound pulses and measures echo time.')

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.4 })
  const eyeRimMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.5 })
  for (const ex of [-0.28, 0.28]) {
    // eye rim
    const eyeRim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 18), eyeRimMat)
    eyeRim.rotation.x = Math.PI / 2
    eyeRim.position.set(ex, 1.04, 2.43)
    car.add(eyeRim); robotParts.push(eyeRim)
    tagPart(eyeRim, 'Distance Sensor Eye', 'Ultrasonic transducer element. Left eye emits sound pulses, right eye receives echoes. The 4 LEDs around the eyes can be programmed to display patterns.')
    // eye iris
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.07, 18), eyeMat)
    eye.rotation.x = Math.PI / 2
    eye.position.set(ex, 1.04, 2.46)
    car.add(eye); robotParts.push(eye)
    tagPart(eye, 'Distance Sensor Eye', 'Ultrasonic transducer iris. Part of the distance measurement system.')
    // eye LED (programmable light)
    const eyeLed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10),
      new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.2, emissive: 0x00bcd4, emissiveIntensity: 0.6 })
    )
    eyeLed.rotation.x = Math.PI / 2
    eyeLed.position.set(ex, 1.04, 2.49)
    car.add(eyeLed); robotParts.push(eyeLed)
    tagPart(eyeLed, 'Distance Sensor LED', 'Programmable LED "eye" light. Can be set to different brightness levels (0–100%) independently.')
  }

  // Force Sensor (pressure button on top-right of hub)
  const forceSensorBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.25, 0.65),
    new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.45, metalness: 0.08 })
  )
  forceSensorBody.position.set(1.0, 2.45, 0.6)
  forceSensorBody.castShadow = true
  car.add(forceSensorBody); robotParts.push(forceSensorBody)
  tagPart(forceSensorBody, 'Force Sensor (Port C)', 'Touch/pressure sensor detecting force up to 10 Newtons. Has a pressable button surface. Can detect press, release, and measure applied force. Useful for bumper detection and user input.')

  const forceButton = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.55, metalness: 0.3 })
  )
  forceButton.position.set(1.0, 2.63, 0.6)
  forceButton.castShadow = true
  car.add(forceButton); robotParts.push(forceButton)
  tagPart(forceButton, 'Force Sensor Button', 'Pressable button surface on the force sensor. Measures applied pressure from 0 to 10 Newtons with ~0.1N resolution.')

  // Color Sensor (bottom-mounted, facing down – all robots)
  const colorSensorBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.22, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.45, metalness: 0.08 })
  )
  colorSensorBody.position.set(0, 0.15, 1.0)
  colorSensorBody.castShadow = true
  car.add(colorSensorBody); robotParts.push(colorSensorBody)
  tagPart(colorSensorBody, 'Color Sensor (Port B)', 'Detects colors (red, blue, green, yellow, black, white, none), ambient light intensity (0–100%), and reflected light intensity. Faces downward for line following and surface detection.')

  const colorLens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.05, 14),
    new THREE.MeshStandardMaterial({ color: 0xff1744, roughness: 0.25, emissive: 0xcc0000, emissiveIntensity: 0.4 })
  )
  colorLens.position.set(0, 0.02, 1.0)
  car.add(colorLens); robotParts.push(colorLens)
  tagPart(colorLens, 'Color Sensor Lens', 'Optical lens with red LED illumination. Shines light on surface and measures reflected color/intensity for detection.')
}

function addClawToRobot() {
  const clawFrame = new THREE.Group()
  clawFrame.position.set(0, 1.34, 2.18)

  const clawBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b2533, roughness: 0.48, metalness: 0.42,
    emissive: 0x0b1118, emissiveIntensity: 0.35
  })
  const clawJawMaterial = new THREE.MeshStandardMaterial({
    color: 0xff5a66, roughness: 0.32, metalness: 0.58,
    emissive: 0x220000, emissiveIntensity: 0.28
  })

  const clawBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.26, 0.8), clawBodyMaterial)
  clawBase.castShadow = true; clawBase.receiveShadow = true
  clawFrame.add(clawBase)

  leftClawPivot = new THREE.Group()
  leftClawPivot.position.set(-0.42, 0, 0.38)
  const leftJawStem = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 1.1, 6, 12), clawJawMaterial)
  leftJawStem.rotation.x = Math.PI / 2
  leftJawStem.position.set(0, 0.02, 0.62)
  leftJawStem.castShadow = true; leftJawStem.receiveShadow = true
  leftClawPivot.add(leftJawStem)

  const leftJawHook = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.10, 14, 36, Math.PI), clawJawMaterial)
  leftJawHook.rotation.x = Math.PI / 2
  leftJawHook.rotation.z = Math.PI * 0.52
  leftJawHook.position.set(0.18, -0.03, 1.28)
  leftJawHook.castShadow = true; leftJawHook.receiveShadow = true
  leftClawPivot.add(leftJawHook)
  clawFrame.add(leftClawPivot)

  rightClawPivot = new THREE.Group()
  rightClawPivot.position.set(0.42, 0, 0.38)
  const rightJawStem = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 1.1, 6, 12), clawJawMaterial)
  rightJawStem.rotation.x = Math.PI / 2
  rightJawStem.position.set(0, 0.02, 0.62)
  rightJawStem.castShadow = true; rightJawStem.receiveShadow = true
  rightClawPivot.add(rightJawStem)

  const rightJawHook = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.10, 14, 36, Math.PI), clawJawMaterial)
  rightJawHook.rotation.x = Math.PI / 2
  rightJawHook.rotation.z = -Math.PI * 0.52
  rightJawHook.position.set(-0.18, -0.03, 1.28)
  rightJawHook.castShadow = true; rightJawHook.receiveShadow = true
  rightClawPivot.add(rightJawHook)
  clawFrame.add(rightClawPivot)

  car.add(clawFrame); robotParts.push(clawFrame)
  tagPart(clawFrame, 'Claw Attachment (Port A)', 'Motorized gripper claw powered by a medium motor. Opens and closes to grab and release objects like cans. Controlled via keyboard (O/P) or program blocks.')
}

function addColorSensorsToRobot() {
  hasColorSensors = true
  const sensorMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.6 })
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, roughness: 0.3, metalness: 0.3, emissive: 0x004466, emissiveIntensity: 0.5 })
  const bracketMat = new THREE.MeshStandardMaterial({ color: 0x2f343c, roughness: 0.65 })

  // Left sensor housing
  const leftHousing = new THREE.Group()
  const lBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.6), sensorMat)
  lBox.castShadow = true
  leftHousing.add(lBox)
  const lLens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16), lensMat)
  lLens.rotation.x = Math.PI / 2
  lLens.position.set(0, -0.16, 0)
  leftHousing.add(lLens)
  leftHousing.position.set(-colorSensorOffsetX, 0.18, colorSensorLocalZ)
  car.add(leftHousing); robotParts.push(leftHousing)
  leftSensorMesh = leftHousing
  tagPart(leftHousing, 'Right Color Sensor (Line Follow)', 'Right-side downward-facing color sensor for line following. Detects black/white surface to steer the robot. Wider offset for faster response.')

  // Left sensor mounting arm (connects sensor to frame beam)
  const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, colorSensorLocalZ - 0.3), bracketMat)
  lArm.position.set(-colorSensorOffsetX, 0.6, colorSensorLocalZ / 2)
  lArm.castShadow = true
  car.add(lArm); robotParts.push(lArm)
  // Left vertical strut
  const lStrut = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), bracketMat)
  lStrut.position.set(-colorSensorOffsetX, 0.55, 0.15)
  lStrut.castShadow = true
  car.add(lStrut); robotParts.push(lStrut)

  // Right sensor housing
  const rightHousing = new THREE.Group()
  const rBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.6), sensorMat)
  rBox.castShadow = true
  rightHousing.add(rBox)
  const rLens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16), lensMat)
  rLens.rotation.x = Math.PI / 2
  rLens.position.set(0, -0.16, 0)
  rightHousing.add(rLens)
  rightHousing.position.set(colorSensorOffsetX, 0.18, colorSensorLocalZ)
  car.add(rightHousing); robotParts.push(rightHousing)
  rightSensorMesh = rightHousing
  tagPart(rightHousing, 'Left Color Sensor (Line Follow)', 'Left-side downward-facing color sensor for line following. Works in pair with the right sensor to detect line edges and guide steering.')

  // Right sensor mounting arm (connects sensor to frame beam)
  const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, colorSensorLocalZ - 0.3), bracketMat)
  rArm.position.set(colorSensorOffsetX, 0.6, colorSensorLocalZ / 2)
  rArm.castShadow = true
  car.add(rArm); robotParts.push(rArm)
  // Right vertical strut
  const rStrut = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.18), bracketMat)
  rStrut.position.set(colorSensorOffsetX, 0.55, 0.15)
  rStrut.castShadow = true
  car.add(rStrut); robotParts.push(rStrut)

  // Label
  const sensorLabel = createLabelSprite('Color Sensors')
  sensorLabel.scale.set(2.5, 0.6, 1)
  sensorLabel.position.set(0, 2.7, 1.0)
  car.add(sensorLabel); robotParts.push(sensorLabel)
}

function buildRobot(type) {
  clearRobotParts()
  currentRobotType = type
  addCommonWheelsAndChassis()

  if (type === 'basicClaw') {
    addClawToRobot()
    clawBtnsRow.style.display = ''
    vehicle.maxForwardSpeed = 22
    vehicle.steerRate = 1.75
  } else if (type === 'lineFollow') {
    clawBtnsRow.style.display = 'none'
    addColorSensorsToRobot()
    vehicle.maxForwardSpeed = 6
    vehicle.steerRate = 3.0
  }

  car.scale.set(0.45, 0.45, 0.45)
  if (type !== 'lineFollow') applyClawPose()

  // Show/hide sensor readout
  if (sensorText) sensorText.style.display = (type === 'lineFollow') ? '' : 'none'
}

function buildMap(type) {
  currentMapType = type
  if (type === 'mapCans') {
    createMapCans()
  } else if (type === 'mapLine') {
    createMapLine()
  } else if (type === 'mapLineIntermediate') {
    createMapLineIntermediate()
  } else if (type === 'mapMaze') {
    createMapMaze()
  }
}

function getLeftSensorReading() {
  if (!hasColorSensors) return 'white'
  const S = 0.45
  const cosH = Math.cos(vehicle.heading)
  const sinH = Math.sin(vehicle.heading)
  const lx = colorSensorOffsetX * S
  const lz = colorSensorLocalZ * S
  const wx = car.position.x + cosH * lx + sinH * lz
  const wz = car.position.z - sinH * lx + cosH * lz
  return sampleGroundColor(wx, wz)
}

function getRightSensorReading() {
  if (!hasColorSensors) return 'white'
  const S = 0.45
  const cosH = Math.cos(vehicle.heading)
  const sinH = Math.sin(vehicle.heading)
  const lx = -colorSensorOffsetX * S
  const lz = colorSensorLocalZ * S
  const wx = car.position.x + cosH * lx + sinH * lz
  const wz = car.position.z - sinH * lx + cosH * lz
  return sampleGroundColor(wx, wz)
}

// Declare vehicle state BEFORE buildRobot (which sets vehicle properties)
const worldLimit = 290

const input = {
  keyboardThrottle: 0,
  keyboardSteering: 0,
  brake: false,
  spikeThrottle: 0,
  spikeSteering: 0,
  useSpike: false,
  scriptThrottle: 0,
  scriptSteering: 0,
  scriptTurning: false,
  useScript: false
}

let wheelSlippery = 0  // 0 = full grip, 100 = ice-like

const vehicle = {
  speed: 0,
  heading: 0,
  maxForwardSpeed: 22,
  maxReverseSpeed: 8,
  acceleration: 16,
  braking: 28,
  drag: 8.5,
  steerRate: 1.75
}

// Build initial robot and map
buildRobot('basicClaw')
buildMap('mapCans')

car.position.set(0, 0, 0)
scene.add(car)

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function moveTowardZero(value, delta) {
  if (value > 0) {
    return Math.max(0, value - delta)
  }

  if (value < 0) {
    return Math.min(0, value + delta)
  }

  return 0
}

function normalizeHeadingDeg(value) {
  return ((value % 360) + 360) % 360
}

function headingDegToRad(value) {
  return normalizeHeadingDeg(value) * Math.PI / 180
}

function activeThrottle() {
  if (input.useScript) {
    return input.scriptThrottle
  }

  return input.useSpike ? input.spikeThrottle : input.keyboardThrottle
}

function activeSteering() {
  if (input.useScript) {
    return input.scriptSteering
  }

  return input.useSpike ? input.spikeSteering : input.keyboardSteering
}

function updateStatus(message) {
  statusText.textContent = message
}

function applyClawPose() {
  if (!leftClawPivot || !rightClawPivot) {
    return
  }

  const spread = THREE.MathUtils.lerp(claw.minSpread, claw.maxSpread, claw.openRatio)
  const turn = THREE.MathUtils.lerp(0.18, 0.48, claw.openRatio)

  leftClawPivot.position.x = -spread / 2
  rightClawPivot.position.x = spread / 2

  leftClawPivot.rotation.y = -turn
  rightClawPivot.rotation.y = turn
}

function setClawTarget(isOpen) {
  claw.targetOpenRatio = isOpen ? 1 : 0
}

function updateClaw(dt) {
  claw.openRatio = THREE.MathUtils.lerp(claw.openRatio, claw.targetOpenRatio, 1 - Math.exp(-8 * dt))
  applyClawPose()
}

// Helper: push a can out of a circle at (cx,cz) with collisionRadius
function pushCanFromCircle(can, cx, cz, collisionRadius) {
  const dx = can.group.position.x - cx
  const dz = can.group.position.z - cz
  const distSq = dx * dx + dz * dz
  const minDist = collisionRadius + canRadius
  if (distSq < minDist * minDist && distSq > 0.0001) {
    const dist = Math.sqrt(distSq)
    const overlap = minDist - dist
    can.group.position.x += (dx / dist) * overlap
    can.group.position.z += (dz / dist) * overlap
  }
}

// Helper: push a can out of a line segment (p1→p2) with given radius
function pushCanFromSegment(can, p1x, p1z, p2x, p2z, segRadius) {
  const ex = p2x - p1x
  const ez = p2z - p1z
  const lenSq = ex * ex + ez * ez
  if (lenSq < 0.0001) { pushCanFromCircle(can, p1x, p1z, segRadius); return }
  const dx = can.group.position.x - p1x
  const dz = can.group.position.z - p1z
  let t = (dx * ex + dz * ez) / lenSq
  t = Math.max(0, Math.min(1, t))
  const nearX = p1x + ex * t
  const nearZ = p1z + ez * t
  pushCanFromCircle(can, nearX, nearZ, segRadius)
}

// Convert a car-local XZ point to world XZ
function localToWorld(lx, lz, cosH, sinH) {
  return {
    x: car.position.x + (cosH * lx + sinH * lz),
    z: car.position.z + (-sinH * lx + cosH * lz)
  }
}

function updateCanPhysics() {
  const cosH = Math.cos(vehicle.heading)
  const sinH = Math.sin(vehicle.heading)

  const S = 0.45 // car scale

  // Robot body push OBB (world-scaled)
  const bodyHX = 1.6 * S
  const bodyBackZ = -2.0 * S
  const bodyFrontZ = 2.0 * S

  // Claw geometry in car-local coords (pre-scale)
  // clawFrame at (0, 1.34, 2.18); pivots at (±spread/2, 0, 0.38) relative to clawFrame
  // Stem center at (0, 0, 0.62) relative to pivot; hook at (±0.18, 0, 1.28) relative to pivot
  const spread = THREE.MathUtils.lerp(claw.minSpread, claw.maxSpread, claw.openRatio)
  const jawTurn = THREE.MathUtils.lerp(0.18, 0.48, claw.openRatio)

  // Compute left and right jaw world positions
  // Left pivot local X = -spread/2, Z = clawFrame.z + 0.38 = 2.56
  // Right pivot local X = spread/2
  const clawBaseZ = 2.18
  const pivotDZ = 0.38

  // Left jaw: pivot at (-spread/2, clawBaseZ + pivotDZ) then rotated by -jawTurn around Y
  // Stem runs from pivot to pivot + rotated(0, 0.62+0.55)  in pivot-local
  // We simplify: model each jaw as a line segment from stem start to hook tip in car-local,
  // then transform to world coords.

  function jawEndpoints(side) {
    // side: -1 for left, +1 for right
    const pivotX = side * spread / 2
    const pivotZ = clawBaseZ + pivotDZ
    const turn = side === -1 ? -jawTurn : jawTurn

    const cosT = Math.cos(turn)
    const sinT = Math.sin(turn)

    // Stem start (pivot-local z=0.07)
    const s0lx = 0, s0lz = 0.07
    // Hook end (pivot-local: side=-1 → (0.18, 1.28), side=+1 → (-0.18, 1.28))
    const hklx = side === -1 ? 0.18 : -0.18
    const hklz = 1.28

    // Rotate pivot-local by turn angle (Y axis rotation → XZ plane)
    const startX = pivotX + (cosT * s0lx + sinT * s0lz)
    const startZ = pivotZ + (-sinT * s0lx + cosT * s0lz)
    const endX = pivotX + (cosT * hklx + sinT * hklz)
    const endZ = pivotZ + (-sinT * hklx + cosT * hklz)

    return { startX, startZ, endX, endZ }
  }

  const leftJaw = jawEndpoints(-1)
  const rightJaw = jawEndpoints(1)

  // Scale to world and rotate by heading
  const jawCollisionR = 0.15 * S // jaw tube radius in world

  function jawSegWorld(jaw) {
    const lsx = jaw.startX * S, lsz = jaw.startZ * S
    const lex = jaw.endX * S, lez = jaw.endZ * S
    const ws = localToWorld(lsx, lsz, cosH, sinH)
    const we = localToWorld(lex, lez, cosH, sinH)
    return { s: ws, e: we }
  }

  const leftJawW = jawSegWorld(leftJaw)
  const rightJawW = jawSegWorld(rightJaw)

  for (const can of cans) {
    if (can.grabbed) continue

    const dx = can.group.position.x - car.position.x
    const dz = can.group.position.z - car.position.z

    // Transform to car-local space
    const lx = cosH * dx + sinH * dz
    const lz = -sinH * dx + cosH * dz

    // Body OBB push
    const nx = Math.max(-bodyHX, Math.min(bodyHX, lx))
    const nz = Math.max(bodyBackZ, Math.min(bodyFrontZ, lz))

    const sepX = lx - nx
    const sepZ = lz - nz
    const distSq = sepX * sepX + sepZ * sepZ
    const pushR = canRadius + 0.08

    if (distSq < pushR * pushR) {
      if (distSq < 0.0001) {
        const pushAmt = bodyFrontZ + pushR - lz
        can.group.position.x += sinH * pushAmt
        can.group.position.z += cosH * pushAmt
      } else {
        const dist = Math.sqrt(distSq)
        const overlap = pushR - dist
        const dLX = sepX / dist
        const dLZ = sepZ / dist
        const wdx = cosH * dLX - sinH * dLZ
        const wdz = sinH * dLX + cosH * dLZ
        can.group.position.x += wdx * overlap
        can.group.position.z += wdz * overlap
      }
    }

    // Claw jaw push — left jaw segment
    pushCanFromSegment(can, leftJawW.s.x, leftJawW.s.z, leftJawW.e.x, leftJawW.e.z, jawCollisionR)
    // Claw jaw push — right jaw segment
    pushCanFromSegment(can, rightJawW.s.x, rightJawW.s.z, rightJawW.e.x, rightJawW.e.z, jawCollisionR)
  }

  // ── Can-to-can collisions (prevent overlap) ──
  const canCanDist = canRadius * 2 + 0.06  // minimum separation between can centers
  for (let i = 0; i < cans.length; i++) {
    if (cans[i].grabbed) continue
    for (let j = i + 1; j < cans.length; j++) {
      if (cans[j].grabbed) continue
      const dx = cans[j].group.position.x - cans[i].group.position.x
      const dz = cans[j].group.position.z - cans[i].group.position.z
      const distSq = dx * dx + dz * dz
      if (distSq < canCanDist * canCanDist && distSq > 0.0001) {
        const dist = Math.sqrt(distSq)
        const overlap = canCanDist - dist
        const nx = dx / dist
        const nz = dz / dist
        // Push each can apart by half the overlap
        const half = overlap * 0.5
        cans[i].group.position.x -= nx * half
        cans[i].group.position.z -= nz * half
        cans[j].group.position.x += nx * half
        cans[j].group.position.z += nz * half
      }
    }
  }

  // ── Can-to-wall & obstacle collisions ──
  for (const can of cans) {
    if (can.grabbed) continue
    const cx = can.group.position.x
    const cz = can.group.position.z
    const r = canRadius + 0.04

    // World boundary clamp
    can.group.position.x = clamp(cx, -worldLimit + r, worldLimit - r)
    can.group.position.z = clamp(cz, -worldLimit + r, worldLimit - r)

    // Push can out of obstacle boxes
    for (const box of obstacleBoxes) {
      const px = can.group.position.x
      const pz = can.group.position.z
      // Check if can center is within expanded obstacle box
      const minX = box.min.x - r
      const maxX = box.max.x + r
      const minZ = box.min.z - r
      const maxZ = box.max.z + r
      if (px > minX && px < maxX && pz > minZ && pz < maxZ) {
        // Find shortest push-out direction
        const pushLeft = px - minX
        const pushRight = maxX - px
        const pushBack = pz - minZ
        const pushFront = maxZ - pz
        const minPush = Math.min(pushLeft, pushRight, pushBack, pushFront)
        if (minPush === pushLeft) can.group.position.x = minX
        else if (minPush === pushRight) can.group.position.x = maxX
        else if (minPush === pushBack) can.group.position.z = minZ
        else can.group.position.z = maxZ
      }
    }
  }

  // Grab check — when claw nearly closed and near a can
  const clawCenterZ = 3.56 * S
  if (claw.openRatio < 0.15 && !claw.grabbedCan) {
    const tipWX = car.position.x + sinH * clawCenterZ
    const tipWZ = car.position.z + cosH * clawCenterZ

    for (const can of cans) {
      if (can.grabbed) continue
      const cdx = can.group.position.x - tipWX
      const cdz = can.group.position.z - tipWZ
      const dist = Math.sqrt(cdx * cdx + cdz * cdz)
      if (dist < canRadius + 0.7) {
        can.grabbed = true
        claw.grabbedCan = can
        scene.remove(can.group)
        car.add(can.group)
        const invS = 1 / S
        can.group.scale.set(invS, invS, invS)
        can.group.position.set(0, -canHeight * 0.1 / invS, 3.56)
        break
      }
    }
  }

  // Release — when claw opens
  if (claw.openRatio > 0.5 && claw.grabbedCan) {
    const can = claw.grabbedCan
    can.grabbed = false
    claw.grabbedCan = null
    const wp = new THREE.Vector3()
    can.group.getWorldPosition(wp)
    car.remove(can.group)
    scene.add(can.group)
    can.group.position.set(wp.x, 0, wp.z)
    can.group.scale.set(1, 1, 1)
  }
}

function getRobotState() {
  const xCm = car.position.x * CM_PER_WORLD_UNIT
  const yCm = car.position.z * CM_PER_WORLD_UNIT
  const headingDegRaw = THREE.MathUtils.radToDeg(vehicle.heading)
  const headingDeg = ((headingDegRaw % 360) + 360) % 360
  const speedCmPerSec = vehicle.speed * CM_PER_WORLD_UNIT

  return {
    xCm,
    yCm,
    headingDeg,
    speedCmPerSec,
    moving: Math.abs(vehicle.speed) > 0.05
  }
}

let blocklyWorkspace = null
let blockRunToken = 0

function updateBlocksStatus(message) {
  blocksStatus.textContent = `Blocks: ${message}`
}

function clampPercentToUnit(value) {
  return clamp(Number(value) / 100, -1, 1)
}

async function sleepWithToken(ms, token) {
  const deadline = performance.now() + ms

  while (performance.now() < deadline) {
    if (token !== blockRunToken) {
      throw new Error('__BLOCK_RUN_STOPPED__')
    }

    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

function stopBlocklyProgram(updateUi = true) {
  blockRunToken += 1
  input.useScript = false
  input.scriptThrottle = 0
  input.scriptSteering = 0
  input.scriptTurning = false
  smoothedSteering = 0
  input.brake = false

  runBlocksBtn.disabled = false
  stopBlocksBtn.disabled = true

  if (updateUi) {
    updateBlocksStatus('Stopped')
    updateStatus(input.useSpike ? 'Input: Hub connected (USB serial)' : 'Input: Keyboard')
  }
}

function createCmraTheme() {
  return Blockly.Theme.defineTheme('cmraSpikeTheme', {
    base: Blockly.Themes.Zelos,
    blockStyles: {
      event_blocks: {
        colourPrimary: '#ffbf00',
        colourSecondary: '#e6a800',
        colourTertiary: '#cc9400'
      },
      motion_blocks: {
        colourPrimary: '#4c97ff',
        colourSecondary: '#3373cc',
        colourTertiary: '#285a9e'
      },
      sensing_blocks: {
        colourPrimary: '#5cb1d6',
        colourSecondary: '#3d8fb1',
        colourTertiary: '#2f708b'
      },
      control_blocks: {
        colourPrimary: '#ffab19',
        colourSecondary: '#d98b00',
        colourTertiary: '#b36f00'
      },
      operators_blocks: {
        colourPrimary: '#59c059',
        colourSecondary: '#389438',
        colourTertiary: '#2d762d'
      }
    },
    categoryStyles: {
      event_category: { colour: '#ffbf00' },
      motion_category: { colour: '#4c97ff' },
      sensing_category: { colour: '#5cb1d6' },
      control_category: { colour: '#ffab19' },
      operators_category: { colour: '#59c059' },
      variable_category: { colour: '#ff8c1a' }
    },
    componentStyles: {
      workspaceBackgroundColour: '#1f2938',
      toolboxBackgroundColour: '#121a29',
      toolboxForegroundColour: '#e9eef7',
      flyoutBackgroundColour: '#172233',
      flyoutForegroundColour: '#f2f6ff',
      flyoutOpacity: 0.96,
      scrollbarColour: '#6f89b6',
      insertionMarkerColour: '#f5d842',
      insertionMarkerOpacity: 0.3,
      scrollbarOpacity: 0.45,
      cursorColour: '#f5d842'
    },
    fontStyle: {
      family: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, sans-serif',
      weight: '600',
      size: 12
    },
    startHats: true
  })
}

function defineCustomBlocks() {
  if (Blockly.Blocks.spike_when_run) {
    return
  }

  Blockly.defineBlocksWithJsonArray([
    {
      type: 'spike_when_run',
      message0: 'when %1 run %2',
      args0: [
        {
          type: 'input_dummy'
        },
        {
          type: 'input_statement',
          name: 'DO'
        }
      ],
      style: 'event_blocks',
      tooltip: 'Entry point for block programs.',
      hat: 'cap'
    },
    {
      type: 'spike_set_throttle',
      message0: 'set throttle %1 %%',
      args0: [
        {
          type: 'input_value',
          name: 'THROTTLE',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Set forward/reverse motor power from -100 to 100.'
    },
    {
      type: 'spike_set_steering',
      message0: 'set steering %1 %%',
      args0: [
        {
          type: 'input_value',
          name: 'STEERING',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Set steering from -100 to 100.'
    },
    {
      type: 'spike_drive_for_seconds',
      message0: 'drive throttle %1 %% steering %2 %% for %3 sec',
      args0: [
        {
          type: 'input_value',
          name: 'THROTTLE',
          check: 'Number'
        },
        {
          type: 'input_value',
          name: 'STEERING',
          check: 'Number'
        },
        {
          type: 'input_value',
          name: 'SECONDS',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Drive with throttle/steering for a duration and then stop.'
    },
    {
      type: 'spike_wait_seconds',
      message0: 'wait %1 sec',
      args0: [
        {
          type: 'input_value',
          name: 'SECONDS',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'control_blocks',
      tooltip: 'Pause program execution.'
    },
    {
      type: 'spike_set_brake',
      message0: 'set brake %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'BRAKE_STATE',
          options: [
            ['on', 'ON'],
            ['off', 'OFF']
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Turn brake on/off.'
    },
    {
      type: 'spike_stop_robot',
      message0: 'stop robot',
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Stop throttle and steering immediately.'
    },
    {
      type: 'spike_open_claw',
      message0: 'open claw',
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Open the claw.'
    },
    {
      type: 'spike_close_claw',
      message0: 'close claw',
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Close the claw.'
    },
    {
      type: 'spike_get_x_cm',
      message0: 'x position (cm)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current robot X coordinate in centimeters.'
    },
    {
      type: 'spike_get_y_cm',
      message0: 'y position (cm)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current robot Y coordinate on the table in centimeters.'
    },
    {
      type: 'spike_get_heading_deg',
      message0: 'heading (deg)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current robot heading in degrees.'
    },
    {
      type: 'spike_get_speed_cm_s',
      message0: 'speed (cm/s)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current robot speed in centimeters per second.'
    },
    {
      type: 'spike_is_moving',
      message0: 'is moving?',
      output: 'Boolean',
      style: 'sensing_blocks',
      tooltip: 'True while the robot is moving.'
    },
    {
      type: 'spike_left_color',
      message0: 'left color sensor',
      output: 'String',
      style: 'sensing_blocks',
      tooltip: 'Returns the color under the left sensor (black or white).'
    },
    {
      type: 'spike_right_color',
      message0: 'right color sensor',
      output: 'String',
      style: 'sensing_blocks',
      tooltip: 'Returns the color under the right sensor (black or white).'
    },
    {
      type: 'spike_turn_left_degrees',
      message0: 'turn left %1 degrees %2 left wheel %3 % right wheel %4 %',
      args0: [
        {
          type: 'input_value',
          name: 'DEGREES',
          check: 'Number'
        },
        {
          type: 'field_dropdown',
          name: 'TURN_TYPE',
          options: [
            ['point turn', 'POINT'],
            ['pivot turn', 'PIVOT'],
            ['curve turn', 'CURVE']
          ]
        },
        {
          type: 'input_value',
          name: 'LEFT_SPEED',
          check: 'Number'
        },
        {
          type: 'input_value',
          name: 'RIGHT_SPEED',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Turn left. Point = spin in place (ignores wheel speeds). Pivot/Curve = set each wheel speed (-100 to 100%).'
    },
    {
      type: 'spike_turn_right_degrees',
      message0: 'turn right %1 degrees %2 left wheel %3 % right wheel %4 %',
      args0: [
        {
          type: 'input_value',
          name: 'DEGREES',
          check: 'Number'
        },
        {
          type: 'field_dropdown',
          name: 'TURN_TYPE',
          options: [
            ['point turn', 'POINT'],
            ['pivot turn', 'PIVOT'],
            ['curve turn', 'CURVE']
          ]
        },
        {
          type: 'input_value',
          name: 'LEFT_SPEED',
          check: 'Number'
        },
        {
          type: 'input_value',
          name: 'RIGHT_SPEED',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Turn right. Point = spin in place (ignores wheel speeds). Pivot/Curve = set each wheel speed (-100 to 100%).'
    },
    {
      type: 'spike_go_straight',
      message0: 'go straight %1 %2 then %3',
      args0: [
        {
          type: 'input_value',
          name: 'VALUE',
          check: 'Number'
        },
        {
          type: 'field_dropdown',
          name: 'UNIT',
          options: [
            ['cm', 'CM'],
            ['rotations', 'ROTATIONS']
          ]
        },
        {
          type: 'field_dropdown',
          name: 'STOP_MODE',
          options: [
            ['hold', 'HOLD'],
            ['brake', 'BRAKE'],
            ['coast', 'COAST']
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Drive straight forward by a distance in cm or wheel rotations (62.4 mm wheel).\nHold: actively locks position (high energy).\nBrake: resists movement via motor phases (medium energy).\nCoast: cuts power, momentum carries (low energy).'
    },
    // ── Motor blocks (SPIKE Prime style) ─────────────────────────
    {
      type: 'spike_set_movement_speed',
      message0: 'set movement speed to %1 %%',
      args0: [
        { type: 'input_value', name: 'SPEED', check: 'Number' }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Set the default speed (%) used by go straight and turn blocks.'
    },
    {
      type: 'spike_run_motor_for',
      message0: 'run motor %1 for %2 %3',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E'], ['F', 'F']]
        },
        { type: 'input_value', name: 'VALUE', check: 'Number' },
        {
          type: 'field_dropdown',
          name: 'UNIT',
          options: [['rotations', 'ROTATIONS'], ['degrees', 'DEGREES'], ['seconds', 'SECONDS']]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Run a single motor for a set amount (rotations, degrees, or seconds), then stop.'
    },
    {
      type: 'spike_start_motor',
      message0: 'start motor %1 at %2 %%',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E'], ['F', 'F']]
        },
        { type: 'input_value', name: 'SPEED', check: 'Number' }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Start a motor running continuously at the given speed (%). Does not block.'
    },
    {
      type: 'spike_stop_motor',
      message0: 'stop motor %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E'], ['F', 'F']]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Stop a specific motor.'
    },
    {
      type: 'spike_motor_position',
      message0: 'motor %1 position',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E'], ['F', 'F']]
        }
      ],
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current motor encoder position in degrees.'
    },
    {
      type: 'spike_motor_speed',
      message0: 'motor %1 speed',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E'], ['F', 'F']]
        }
      ],
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Current motor speed in degrees per second.'
    },
    {
      type: 'spike_reset_motor_encoder',
      message0: 'reset motor %1 encoder',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MOTOR',
          options: [['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D'], ['E', 'E'], ['F', 'F']]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'motion_blocks',
      tooltip: 'Reset the motor encoder to zero.'
    },
    // ── Additional Sensing blocks ────────────────────────────────
    {
      type: 'spike_distance_sensor',
      message0: 'distance sensor (cm)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Ultrasonic distance sensor reading in centimeters (1–200 cm).'
    },
    {
      type: 'spike_force_sensor',
      message0: 'force sensor (N)',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Force sensor reading in Newtons (non-zero when bumping into obstacles).'
    },
    {
      type: 'spike_force_sensor_pressed',
      message0: 'force sensor pressed?',
      output: 'Boolean',
      style: 'sensing_blocks',
      tooltip: 'True when the robot is pressing against an obstacle.'
    },
    {
      type: 'spike_timer',
      message0: 'timer',
      output: 'Number',
      style: 'sensing_blocks',
      tooltip: 'Seconds elapsed since the program started (or since last reset timer).'
    },
    {
      type: 'spike_reset_timer',
      message0: 'reset timer',
      previousStatement: null,
      nextStatement: null,
      style: 'sensing_blocks',
      tooltip: 'Reset the program timer to zero.'
    },
    {
      type: 'spike_reset_gyro',
      message0: 'reset gyro',
      previousStatement: null,
      nextStatement: null,
      style: 'sensing_blocks',
      tooltip: 'Reset the gyroscope heading to 0 degrees.'
    },
    // ── Sound & Display blocks ───────────────────────────────────
    {
      type: 'spike_play_beep',
      message0: 'play beep for %1 sec',
      args0: [
        { type: 'input_value', name: 'SECONDS', check: 'Number' }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'event_blocks',
      tooltip: 'Play a beep tone for the specified duration.'
    },
    {
      type: 'spike_play_beep_note',
      message0: 'play note %1 for %2 sec',
      args0: [
        {
          type: 'field_dropdown',
          name: 'NOTE',
          options: [
            ['C4', '262'], ['D4', '294'], ['E4', '330'], ['F4', '349'],
            ['G4', '392'], ['A4', '440'], ['B4', '494'], ['C5', '523']
          ]
        },
        { type: 'input_value', name: 'SECONDS', check: 'Number' }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'event_blocks',
      tooltip: 'Play a musical note for the specified duration.'
    },
    {
      type: 'spike_display_text',
      message0: 'write %1 on display',
      args0: [
        { type: 'input_value', name: 'TEXT', check: 'String' }
      ],
      previousStatement: null,
      nextStatement: null,
      style: 'event_blocks',
      tooltip: 'Show text on the 5×5 LED matrix display.'
    },
    {
      type: 'spike_display_clear',
      message0: 'clear display',
      previousStatement: null,
      nextStatement: null,
      style: 'event_blocks',
      tooltip: 'Turn off all pixels on the 5×5 LED matrix display.'
    }
  ])

  javascriptGenerator.forBlock.spike_when_run = (block, generator) => {
    const branch = generator.statementToCode(block, 'DO')
    return `${branch}\n`
  }

  javascriptGenerator.forBlock.spike_set_throttle = (block, generator) => {
    const throttle = generator.valueToCode(block, 'THROTTLE', javascriptGenerator.ORDER_NONE) || '0'
    return `await api.setThrottle(${throttle});\n`
  }

  javascriptGenerator.forBlock.spike_set_steering = (block, generator) => {
    const steering = generator.valueToCode(block, 'STEERING', javascriptGenerator.ORDER_NONE) || '0'
    return `await api.setSteering(${steering});\n`
  }

  javascriptGenerator.forBlock.spike_drive_for_seconds = (block, generator) => {
    const throttle = generator.valueToCode(block, 'THROTTLE', javascriptGenerator.ORDER_NONE) || '0'
    const steering = generator.valueToCode(block, 'STEERING', javascriptGenerator.ORDER_NONE) || '0'
    const seconds = generator.valueToCode(block, 'SECONDS', javascriptGenerator.ORDER_NONE) || '1'
    return `await api.driveForSeconds(${throttle}, ${steering}, ${seconds});\n`
  }

  javascriptGenerator.forBlock.spike_wait_seconds = (block, generator) => {
    const seconds = generator.valueToCode(block, 'SECONDS', javascriptGenerator.ORDER_NONE) || '0.2'
    return `await api.waitSeconds(${seconds});\n`
  }

  javascriptGenerator.forBlock.spike_set_brake = (block) => {
    const state = block.getFieldValue('BRAKE_STATE') === 'ON'
    return `await api.setBrake(${state});\n`
  }

  javascriptGenerator.forBlock.spike_stop_robot = () => 'await api.stop();\n'
  javascriptGenerator.forBlock.spike_open_claw = () => 'await api.openClaw();\n'
  javascriptGenerator.forBlock.spike_close_claw = () => 'await api.closeClaw();\n'

  javascriptGenerator.forBlock.spike_get_x_cm = () => ['await api.getXcm()', javascriptGenerator.ORDER_FUNCTION_CALL]
  javascriptGenerator.forBlock.spike_get_y_cm = () => ['await api.getYcm()', javascriptGenerator.ORDER_FUNCTION_CALL]
  javascriptGenerator.forBlock.spike_get_heading_deg = () => ['await api.getHeadingDeg()', javascriptGenerator.ORDER_FUNCTION_CALL]
  javascriptGenerator.forBlock.spike_get_speed_cm_s = () => ['await api.getSpeedCmPerSec()', javascriptGenerator.ORDER_FUNCTION_CALL]
  javascriptGenerator.forBlock.spike_is_moving = () => ['await api.isMoving()', javascriptGenerator.ORDER_NONE]
  javascriptGenerator.forBlock.spike_left_color = () => ['await api.getLeftColor()', javascriptGenerator.ORDER_FUNCTION_CALL]
  javascriptGenerator.forBlock.spike_right_color = () => ['await api.getRightColor()', javascriptGenerator.ORDER_FUNCTION_CALL]

  javascriptGenerator.forBlock.spike_turn_left_degrees = (block, generator) => {
    const degrees = generator.valueToCode(block, 'DEGREES', javascriptGenerator.ORDER_NONE) || '90'
    const turnType = block.getFieldValue('TURN_TYPE') || 'POINT'
    const leftSpeed = generator.valueToCode(block, 'LEFT_SPEED', javascriptGenerator.ORDER_NONE) || '50'
    const rightSpeed = generator.valueToCode(block, 'RIGHT_SPEED', javascriptGenerator.ORDER_NONE) || '-50'
    return `await api.turnLeftDegrees(${degrees}, '${turnType}', ${leftSpeed}, ${rightSpeed});\n`
  }

  javascriptGenerator.forBlock.spike_turn_right_degrees = (block, generator) => {
    const degrees = generator.valueToCode(block, 'DEGREES', javascriptGenerator.ORDER_NONE) || '90'
    const turnType = block.getFieldValue('TURN_TYPE') || 'POINT'
    const leftSpeed = generator.valueToCode(block, 'LEFT_SPEED', javascriptGenerator.ORDER_NONE) || '-50'
    const rightSpeed = generator.valueToCode(block, 'RIGHT_SPEED', javascriptGenerator.ORDER_NONE) || '50'
    return `await api.turnRightDegrees(${degrees}, '${turnType}', ${leftSpeed}, ${rightSpeed});\n`
  }

  javascriptGenerator.forBlock.spike_go_straight = (block, generator) => {
    const value = generator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_NONE) || '10'
    const unit = block.getFieldValue('UNIT')
    const stopMode = block.getFieldValue('STOP_MODE') || 'BRAKE'
    return `await api.goStraight(${value}, '${unit}', '${stopMode}');\n`
  }

  // ── Motor block generators ────────────────────────────────────
  javascriptGenerator.forBlock.spike_set_movement_speed = (block, generator) => {
    const speed = generator.valueToCode(block, 'SPEED', javascriptGenerator.ORDER_NONE) || '60'
    return `await api.setMovementSpeed(${speed});\n`
  }

  javascriptGenerator.forBlock.spike_run_motor_for = (block, generator) => {
    const motor = block.getFieldValue('MOTOR')
    const value = generator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_NONE) || '1'
    const unit = block.getFieldValue('UNIT')
    return `await api.runMotorFor('${motor}', ${value}, '${unit}');\n`
  }

  javascriptGenerator.forBlock.spike_start_motor = (block, generator) => {
    const motor = block.getFieldValue('MOTOR')
    const speed = generator.valueToCode(block, 'SPEED', javascriptGenerator.ORDER_NONE) || '75'
    return `await api.startMotor('${motor}', ${speed});\n`
  }

  javascriptGenerator.forBlock.spike_stop_motor = (block) => {
    const motor = block.getFieldValue('MOTOR')
    return `await api.stopMotor('${motor}');\n`
  }

  javascriptGenerator.forBlock.spike_motor_position = (block) => {
    const motor = block.getFieldValue('MOTOR')
    return [`await api.getMotorPosition('${motor}')`, javascriptGenerator.ORDER_FUNCTION_CALL]
  }

  javascriptGenerator.forBlock.spike_motor_speed = (block) => {
    const motor = block.getFieldValue('MOTOR')
    return [`await api.getMotorSpeed('${motor}')`, javascriptGenerator.ORDER_FUNCTION_CALL]
  }

  javascriptGenerator.forBlock.spike_reset_motor_encoder = (block) => {
    const motor = block.getFieldValue('MOTOR')
    return `await api.resetMotorEncoder('${motor}');\n`
  }

  // ── Sensor block generators ───────────────────────────────────
  javascriptGenerator.forBlock.spike_distance_sensor = () =>
    ['await api.getDistanceCm()', javascriptGenerator.ORDER_FUNCTION_CALL]

  javascriptGenerator.forBlock.spike_force_sensor = () =>
    ['await api.getForceSensorN()', javascriptGenerator.ORDER_FUNCTION_CALL]

  javascriptGenerator.forBlock.spike_force_sensor_pressed = () =>
    ['await api.isForceSensorPressed()', javascriptGenerator.ORDER_FUNCTION_CALL]

  javascriptGenerator.forBlock.spike_timer = () =>
    ['await api.getTimer()', javascriptGenerator.ORDER_FUNCTION_CALL]

  javascriptGenerator.forBlock.spike_reset_timer = () =>
    'await api.resetTimer();\n'

  javascriptGenerator.forBlock.spike_reset_gyro = () =>
    'await api.resetGyro();\n'

  // ── Sound & Display generators ────────────────────────────────
  javascriptGenerator.forBlock.spike_play_beep = (block, generator) => {
    const seconds = generator.valueToCode(block, 'SECONDS', javascriptGenerator.ORDER_NONE) || '0.5'
    return `await api.playBeep(440, ${seconds});\n`
  }

  javascriptGenerator.forBlock.spike_play_beep_note = (block, generator) => {
    const note = block.getFieldValue('NOTE')
    const seconds = generator.valueToCode(block, 'SECONDS', javascriptGenerator.ORDER_NONE) || '0.5'
    return `await api.playBeep(${note}, ${seconds});\n`
  }

  javascriptGenerator.forBlock.spike_display_text = (block, generator) => {
    const text = generator.valueToCode(block, 'TEXT', javascriptGenerator.ORDER_NONE) || "'Hello!'"
    return `await api.displayText(${text});\n`
  }

  javascriptGenerator.forBlock.spike_display_clear = () =>
    'await api.displayClear();\n'
}

function toolboxConfig() {
  return {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category',
        name: 'Events',
        categorystyle: 'event_category',
        contents: [
          { kind: 'block', type: 'spike_when_run' }
        ]
      },
      {
        kind: 'category',
        name: 'Movement',
        categorystyle: 'motion_category',
        contents: [
          {
            kind: 'block',
            type: 'spike_go_straight',
            inputs: {
              VALUE: { shadow: { type: 'math_number', fields: { NUM: 20 } } }
            }
          },
          {
            kind: 'block',
            type: 'spike_turn_left_degrees',
            inputs: {
              DEGREES: { shadow: { type: 'math_number', fields: { NUM: 90 } } },
              LEFT_SPEED: { shadow: { type: 'math_number', fields: { NUM: 50 } } },
              RIGHT_SPEED: { shadow: { type: 'math_number', fields: { NUM: -50 } } }
            }
          },
          {
            kind: 'block',
            type: 'spike_turn_right_degrees',
            inputs: {
              DEGREES: { shadow: { type: 'math_number', fields: { NUM: 90 } } },
              LEFT_SPEED: { shadow: { type: 'math_number', fields: { NUM: -50 } } },
              RIGHT_SPEED: { shadow: { type: 'math_number', fields: { NUM: 50 } } }
            }
          },
          {
            kind: 'block',
            type: 'spike_set_movement_speed',
            inputs: {
              SPEED: { shadow: { type: 'math_number', fields: { NUM: 60 } } }
            }
          },
          {
            kind: 'block',
            type: 'spike_drive_for_seconds',
            inputs: {
              THROTTLE: { shadow: { type: 'math_number', fields: { NUM: 80 } } },
              STEERING: { shadow: { type: 'math_number', fields: { NUM: 0 } } },
              SECONDS: { shadow: { type: 'math_number', fields: { NUM: 1 } } }
            }
          },
          {
            kind: 'block',
            type: 'spike_set_throttle',
            inputs: {
              THROTTLE: { shadow: { type: 'math_number', fields: { NUM: 60 } } }
            }
          },
          {
            kind: 'block',
            type: 'spike_set_steering',
            inputs: {
              STEERING: { shadow: { type: 'math_number', fields: { NUM: 0 } } }
            }
          },
          { kind: 'block', type: 'spike_set_brake' },
          { kind: 'block', type: 'spike_stop_robot' }
        ]
      },
      {
        kind: 'category',
        name: 'Motors',
        categorystyle: 'motion_category',
        contents: [
          {
            kind: 'block',
            type: 'spike_run_motor_for',
            inputs: {
              VALUE: { shadow: { type: 'math_number', fields: { NUM: 1 } } }
            }
          },
          {
            kind: 'block',
            type: 'spike_start_motor',
            inputs: {
              SPEED: { shadow: { type: 'math_number', fields: { NUM: 75 } } }
            }
          },
          { kind: 'block', type: 'spike_stop_motor' },
          { kind: 'block', type: 'spike_reset_motor_encoder' },
          { kind: 'block', type: 'spike_motor_position' },
          { kind: 'block', type: 'spike_motor_speed' },
          { kind: 'block', type: 'spike_open_claw' },
          { kind: 'block', type: 'spike_close_claw' }
        ]
      },
      {
        kind: 'category',
        name: 'Sensing',
        categorystyle: 'sensing_category',
        contents: [
          { kind: 'block', type: 'spike_distance_sensor' },
          { kind: 'block', type: 'spike_left_color' },
          { kind: 'block', type: 'spike_right_color' },
          { kind: 'block', type: 'spike_get_heading_deg' },
          { kind: 'block', type: 'spike_get_speed_cm_s' },
          { kind: 'block', type: 'spike_force_sensor' },
          { kind: 'block', type: 'spike_force_sensor_pressed' },
          { kind: 'block', type: 'spike_is_moving' },
          { kind: 'block', type: 'spike_get_x_cm' },
          { kind: 'block', type: 'spike_get_y_cm' },
          { kind: 'block', type: 'spike_timer' },
          { kind: 'block', type: 'spike_reset_timer' },
          { kind: 'block', type: 'spike_reset_gyro' }
        ]
      },
      {
        kind: 'category',
        name: 'Sound & Display',
        categorystyle: 'event_category',
        contents: [
          {
            kind: 'block',
            type: 'spike_play_beep',
            inputs: {
              SECONDS: { shadow: { type: 'math_number', fields: { NUM: 0.5 } } }
            }
          },
          {
            kind: 'block',
            type: 'spike_play_beep_note',
            inputs: {
              SECONDS: { shadow: { type: 'math_number', fields: { NUM: 0.5 } } }
            }
          },
          {
            kind: 'block',
            type: 'spike_display_text',
            inputs: {
              TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hello!' } } }
            }
          },
          { kind: 'block', type: 'spike_display_clear' }
        ]
      },
      {
        kind: 'category',
        name: 'Control',
        categorystyle: 'control_category',
        contents: [
          {
            kind: 'block',
            type: 'spike_wait_seconds',
            inputs: {
              SECONDS: { shadow: { type: 'math_number', fields: { NUM: 0.5 } } }
            }
          },
          { kind: 'block', type: 'controls_repeat_ext' },
          { kind: 'block', type: 'controls_whileUntil' },
          { kind: 'block', type: 'controls_if' },
          { kind: 'block', type: 'controls_flow_statements' }
        ]
      },
      {
        kind: 'category',
        name: 'Operators',
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
          { kind: 'block', type: 'text_join' }
        ]
      },
      {
        kind: 'category',
        name: 'Variables',
        categorystyle: 'variable_category',
        custom: 'VARIABLE'
      }
    ]
  }
}

function createStarterProgram(workspace) {
  const xmlText = `
  <xml xmlns="https://developers.google.com/blockly/xml">
    <block type="spike_when_run" x="18" y="18">
      <statement name="DO">
        <block type="controls_repeat_ext">
          <value name="TIMES">
            <shadow type="math_number">
              <field name="NUM">4</field>
            </shadow>
          </value>
          <statement name="DO">
            <block type="spike_drive_for_seconds">
              <value name="THROTTLE">
                <shadow type="math_number"><field name="NUM">80</field></shadow>
              </value>
              <value name="STEERING">
                <shadow type="math_number"><field name="NUM">0</field></shadow>
              </value>
              <value name="SECONDS">
                <shadow type="math_number"><field name="NUM">0.7</field></shadow>
              </value>
              <next>
                <block type="spike_drive_for_seconds">
                  <value name="THROTTLE">
                    <shadow type="math_number"><field name="NUM">70</field></shadow>
                  </value>
                  <value name="STEERING">
                    <shadow type="math_number"><field name="NUM">55</field></shadow>
                  </value>
                  <value name="SECONDS">
                    <shadow type="math_number"><field name="NUM">0.5</field></shadow>
                  </value>
                </block>
              </next>
            </block>
          </statement>
        </block>
      </statement>
    </block>
  </xml>`

  const xml = Blockly.utils.xml.textToDom(xmlText)
  Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, workspace)
}

const missionTemplates = {
  square: `
  <xml xmlns="https://developers.google.com/blockly/xml">
    <block type="spike_when_run" x="20" y="20">
      <statement name="DO">
        <block type="controls_repeat_ext">
          <value name="TIMES">
            <shadow type="math_number"><field name="NUM">4</field></shadow>
          </value>
          <statement name="DO">
            <block type="spike_go_straight">
              <value name="VALUE">
                <shadow type="math_number"><field name="NUM">30</field></shadow>
              </value>
              <field name="UNIT">CM</field>
              <next>
                <block type="spike_turn_right_degrees">
                  <value name="DEGREES">
                    <shadow type="math_number"><field name="NUM">90</field></shadow>
                  </value>
                </block>
              </next>
            </block>
          </statement>
        </block>
      </statement>
    </block>
  </xml>`,
  slalom: `
  <xml xmlns="https://developers.google.com/blockly/xml">
    <block type="spike_when_run" x="20" y="20">
      <statement name="DO">
        <block type="spike_drive_for_seconds">
          <value name="THROTTLE">
            <shadow type="math_number"><field name="NUM">60</field></shadow>
          </value>
          <value name="STEERING">
            <shadow type="math_number"><field name="NUM">0</field></shadow>
          </value>
          <value name="SECONDS">
            <shadow type="math_number"><field name="NUM">1</field></shadow>
          </value>
          <next>
            <block type="spike_drive_for_seconds">
              <value name="THROTTLE"><shadow type="math_number"><field name="NUM">60</field></shadow></value>
              <value name="STEERING"><shadow type="math_number"><field name="NUM">30</field></shadow></value>
              <value name="SECONDS"><shadow type="math_number"><field name="NUM">1.2</field></shadow></value>
              <next>
                <block type="spike_drive_for_seconds">
                  <value name="THROTTLE"><shadow type="math_number"><field name="NUM">60</field></shadow></value>
                  <value name="STEERING"><shadow type="math_number"><field name="NUM">-30</field></shadow></value>
                  <value name="SECONDS"><shadow type="math_number"><field name="NUM">1.8</field></shadow></value>
                  <next>
                    <block type="spike_drive_for_seconds">
                      <value name="THROTTLE"><shadow type="math_number"><field name="NUM">60</field></shadow></value>
                      <value name="STEERING"><shadow type="math_number"><field name="NUM">30</field></shadow></value>
                      <value name="SECONDS"><shadow type="math_number"><field name="NUM">1.8</field></shadow></value>
                      <next>
                        <block type="spike_drive_for_seconds">
                          <value name="THROTTLE"><shadow type="math_number"><field name="NUM">60</field></shadow></value>
                          <value name="STEERING"><shadow type="math_number"><field name="NUM">-30</field></shadow></value>
                          <value name="SECONDS"><shadow type="math_number"><field name="NUM">1.8</field></shadow></value>
                          <next>
                            <block type="spike_drive_for_seconds">
                              <value name="THROTTLE"><shadow type="math_number"><field name="NUM">60</field></shadow></value>
                              <value name="STEERING"><shadow type="math_number"><field name="NUM">0</field></shadow></value>
                              <value name="SECONDS"><shadow type="math_number"><field name="NUM">0.5</field></shadow></value>
                              <next>
                                <block type="spike_stop_robot"></block>
                              </next>
                            </block>
                          </next>
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
  gotoCoordinate: `
  <xml xmlns="https://developers.google.com/blockly/xml">
    <block type="spike_when_run" x="20" y="20">
      <statement name="DO">
        <block type="variables_set">
          <field name="VAR" id="targetX">targetX</field>
          <value name="VALUE">
            <shadow type="math_number"><field name="NUM">120</field></shadow>
          </value>
          <next>
            <block type="variables_set">
              <field name="VAR" id="targetY">targetY</field>
              <value name="VALUE">
                <shadow type="math_number"><field name="NUM">120</field></shadow>
              </value>
              <next>
                <block type="controls_whileUntil">
                  <field name="MODE">WHILE</field>
                  <value name="BOOL">
                    <block type="logic_operation">
                      <field name="OP">AND</field>
                      <value name="A">
                        <block type="logic_compare">
                          <field name="OP">LT</field>
                          <value name="A">
                            <block type="spike_get_x_cm"></block>
                          </value>
                          <value name="B">
                            <block type="variables_get"><field name="VAR" id="targetX">targetX</field></block>
                          </value>
                        </block>
                      </value>
                      <value name="B">
                        <block type="logic_compare">
                          <field name="OP">LT</field>
                          <value name="A">
                            <block type="spike_get_y_cm"></block>
                          </value>
                          <value name="B">
                            <block type="variables_get"><field name="VAR" id="targetY">targetY</field></block>
                          </value>
                        </block>
                      </value>
                    </block>
                  </value>
                  <statement name="DO">
                    <block type="spike_set_throttle">
                      <value name="THROTTLE">
                        <shadow type="math_number"><field name="NUM">75</field></shadow>
                      </value>
                      <next>
                        <block type="spike_set_steering">
                          <value name="STEERING">
                            <shadow type="math_number"><field name="NUM">25</field></shadow>
                          </value>
                          <next>
                            <block type="spike_wait_seconds">
                              <value name="SECONDS">
                                <shadow type="math_number"><field name="NUM">0.2</field></shadow>
                              </value>
                            </block>
                          </next>
                        </block>
                      </next>
                    </block>
                  </statement>
                  <next>
                    <block type="spike_stop_robot"></block>
                  </next>
                </block>
              </next>
            </block>
          </next>
        </block>
      </statement>
    </block>
  </xml>`,
  lineFollow: `
  <xml xmlns="https://developers.google.com/blockly/xml">
    <block type="spike_when_run" x="20" y="20">
      <statement name="DO">
        <block type="spike_set_throttle">
          <value name="THROTTLE">
            <shadow type="math_number"><field name="NUM">25</field></shadow>
          </value>
          <next>
            <block type="controls_whileUntil">
              <field name="MODE">WHILE</field>
              <value name="BOOL">
                <block type="logic_boolean"><field name="BOOL">TRUE</field></block>
              </value>
              <statement name="DO">
                <block type="controls_if">
                  <mutation elseif="2" else="1"></mutation>
                  <value name="IF0">
                    <block type="logic_operation">
                      <field name="OP">AND</field>
                      <value name="A">
                        <block type="logic_compare">
                          <field name="OP">EQ</field>
                          <value name="A"><block type="spike_left_color"></block></value>
                          <value name="B"><block type="text"><field name="TEXT">black</field></block></value>
                        </block>
                      </value>
                      <value name="B">
                        <block type="logic_compare">
                          <field name="OP">EQ</field>
                          <value name="A"><block type="spike_right_color"></block></value>
                          <value name="B"><block type="text"><field name="TEXT">black</field></block></value>
                        </block>
                      </value>
                    </block>
                  </value>
                  <statement name="DO0">
                    <block type="spike_set_steering">
                      <value name="STEERING">
                        <shadow type="math_number"><field name="NUM">0</field></shadow>
                      </value>
                    </block>
                  </statement>
                  <value name="IF1">
                    <block type="logic_compare">
                      <field name="OP">EQ</field>
                      <value name="A"><block type="spike_left_color"></block></value>
                      <value name="B"><block type="text"><field name="TEXT">white</field></block></value>
                    </block>
                  </value>
                  <statement name="DO1">
                    <block type="spike_set_steering">
                      <value name="STEERING">
                        <shadow type="math_number"><field name="NUM">35</field></shadow>
                      </value>
                    </block>
                  </statement>
                  <value name="IF2">
                    <block type="logic_compare">
                      <field name="OP">EQ</field>
                      <value name="A"><block type="spike_right_color"></block></value>
                      <value name="B"><block type="text"><field name="TEXT">white</field></block></value>
                    </block>
                  </value>
                  <statement name="DO2">
                    <block type="spike_set_steering">
                      <value name="STEERING">
                        <shadow type="math_number"><field name="NUM">-35</field></shadow>
                      </value>
                    </block>
                  </statement>
                  <statement name="ELSE">
                    <block type="spike_set_steering">
                      <value name="STEERING">
                        <shadow type="math_number"><field name="NUM">0</field></shadow>
                      </value>
                    </block>
                  </statement>
                  <next>
                    <block type="spike_wait_seconds">
                      <value name="SECONDS">
                        <shadow type="math_number"><field name="NUM">0.05</field></shadow>
                      </value>
                    </block>
                  </next>
                </block>
              </statement>
            </block>
          </next>
        </block>
      </statement>
    </block>
  </xml>`,
  lineFollowIntermediate: `
  <xml xmlns="https://developers.google.com/blockly/xml">
    <block type="spike_when_run" x="20" y="20">
      <statement name="DO">
        <block type="spike_set_throttle">
          <value name="THROTTLE">
            <shadow type="math_number"><field name="NUM">15</field></shadow>
          </value>
          <next>
            <block type="controls_whileUntil">
              <field name="MODE">WHILE</field>
              <value name="BOOL">
                <block type="logic_boolean"><field name="BOOL">TRUE</field></block>
              </value>
              <statement name="DO">
                <block type="controls_if">
                  <mutation elseif="2" else="1"></mutation>
                  <value name="IF0">
                    <block type="logic_operation">
                      <field name="OP">AND</field>
                      <value name="A">
                        <block type="logic_negate">
                          <value name="BOOL">
                            <block type="logic_compare">
                              <field name="OP">EQ</field>
                              <value name="A"><block type="spike_left_color"></block></value>
                              <value name="B"><block type="text"><field name="TEXT">white</field></block></value>
                            </block>
                          </value>
                        </block>
                      </value>
                      <value name="B">
                        <block type="logic_negate">
                          <value name="BOOL">
                            <block type="logic_compare">
                              <field name="OP">EQ</field>
                              <value name="A"><block type="spike_right_color"></block></value>
                              <value name="B"><block type="text"><field name="TEXT">white</field></block></value>
                            </block>
                          </value>
                        </block>
                      </value>
                    </block>
                  </value>
                  <statement name="DO0">
                    <block type="spike_set_steering">
                      <value name="STEERING">
                        <shadow type="math_number"><field name="NUM">0</field></shadow>
                      </value>
                    </block>
                  </statement>
                  <value name="IF1">
                    <block type="logic_compare">
                      <field name="OP">EQ</field>
                      <value name="A"><block type="spike_left_color"></block></value>
                      <value name="B"><block type="text"><field name="TEXT">white</field></block></value>
                    </block>
                  </value>
                  <statement name="DO1">
                    <block type="spike_set_steering">
                      <value name="STEERING">
                        <shadow type="math_number"><field name="NUM">30</field></shadow>
                      </value>
                    </block>
                  </statement>
                  <value name="IF2">
                    <block type="logic_compare">
                      <field name="OP">EQ</field>
                      <value name="A"><block type="spike_right_color"></block></value>
                      <value name="B"><block type="text"><field name="TEXT">white</field></block></value>
                    </block>
                  </value>
                  <statement name="DO2">
                    <block type="spike_set_steering">
                      <value name="STEERING">
                        <shadow type="math_number"><field name="NUM">-30</field></shadow>
                      </value>
                    </block>
                  </statement>
                  <statement name="ELSE">
                    <block type="spike_set_steering">
                      <value name="STEERING">
                        <shadow type="math_number"><field name="NUM">0</field></shadow>
                      </value>
                    </block>
                  </statement>
                  <next>
                    <block type="spike_wait_seconds">
                      <value name="SECONDS">
                        <shadow type="math_number"><field name="NUM">0.05</field></shadow>
                      </value>
                    </block>
                  </next>
                </block>
              </statement>
            </block>
          </next>
        </block>
      </statement>
    </block>
  </xml>`,
  maze: `
  <xml xmlns="https://developers.google.com/blockly/xml">
    <block type="spike_when_run" x="20" y="20">
      <statement name="DO">
        <block type="spike_set_movement_speed">
          <value name="SPEED"><shadow type="math_number"><field name="NUM">45</field></shadow></value>
          <next>
            <block type="controls_whileUntil">
              <field name="MODE">WHILE</field>
              <value name="BOOL"><block type="logic_boolean"><field name="BOOL">TRUE</field></block></value>
              <statement name="DO">
                <!-- Step 1: Turn right and check -->
                <block type="spike_turn_right_degrees">
                  <value name="DEGREES"><shadow type="math_number"><field name="NUM">90</field></shadow></value>
                  <next>
                    <block type="controls_if">
                      <mutation else="1"></mutation>
                      <value name="IF0">
                        <block type="logic_compare"><field name="OP">GT</field>
                          <value name="A"><block type="spike_distance_sensor"></block></value>
                          <value name="B"><block type="math_number"><field name="NUM">30</field></block></value>
                        </block>
                      </value>
                      <!-- Right is open: go forward -->
                      <statement name="DO0">
                        <block type="spike_go_straight">
                          <value name="VALUE"><shadow type="math_number"><field name="NUM">40</field></shadow></value>
                          <field name="UNIT">CM</field>
                        </block>
                      </statement>
                      <!-- Right is blocked: turn back left to face original direction -->
                      <statement name="ELSE">
                        <block type="spike_turn_left_degrees">
                          <value name="DEGREES"><shadow type="math_number"><field name="NUM">90</field></shadow></value>
                          <next>
                            <block type="controls_if">
                              <mutation else="1"></mutation>
                              <value name="IF0">
                                <block type="logic_compare"><field name="OP">GT</field>
                                  <value name="A"><block type="spike_distance_sensor"></block></value>
                                  <value name="B"><block type="math_number"><field name="NUM">30</field></block></value>
                                </block>
                              </value>
                              <!-- Straight is open: go forward -->
                              <statement name="DO0">
                                <block type="spike_go_straight">
                                  <value name="VALUE"><shadow type="math_number"><field name="NUM">40</field></shadow></value>
                                  <field name="UNIT">CM</field>
                                </block>
                              </statement>
                              <!-- Straight is blocked: turn left and check -->
                              <statement name="ELSE">
                                <block type="spike_turn_left_degrees">
                                  <value name="DEGREES"><shadow type="math_number"><field name="NUM">90</field></shadow></value>
                                  <next>
                                    <block type="controls_if">
                                      <mutation else="1"></mutation>
                                      <value name="IF0">
                                        <block type="logic_compare"><field name="OP">GT</field>
                                          <value name="A"><block type="spike_distance_sensor"></block></value>
                                          <value name="B"><block type="math_number"><field name="NUM">30</field></block></value>
                                        </block>
                                      </value>
                                      <!-- Left is open: go forward -->
                                      <statement name="DO0">
                                        <block type="spike_go_straight">
                                          <value name="VALUE"><shadow type="math_number"><field name="NUM">40</field></shadow></value>
                                          <field name="UNIT">CM</field>
                                        </block>
                                      </statement>
                                      <!-- Dead end: turn around -->
                                      <statement name="ELSE">
                                        <block type="spike_turn_left_degrees">
                                          <value name="DEGREES"><shadow type="math_number"><field name="NUM">90</field></shadow></value>
                                        </block>
                                      </statement>
                                    </block>
                                  </next>
                                </block>
                              </statement>
                            </block>
                          </next>
                        </block>
                      </statement>
                    </block>
                  </next>
                </block>
              </statement>
            </block>
          </next>
        </block>
      </statement>
    </block>
  </xml>`
}

function loadMissionTemplate(key) {
  if (!blocklyWorkspace || !missionTemplates[key]) {
    return
  }

  stopBlocklyProgram(false)
  const xml = Blockly.utils.xml.textToDom(missionTemplates[key])
  Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, blocklyWorkspace)
  updateBlocksStatus(`Loaded mission: ${key}`)
}

async function runBlocklyProgram() {
  if (!blocklyWorkspace) {
    return
  }

  stopBlocklyProgram(false)
  const code = javascriptGenerator.workspaceToCode(blocklyWorkspace)
  if (!code.trim()) {
    updateBlocksStatus('No blocks to run')
    return
  }

  await runSimulatorScript(code, 'Scratch Blocks')
}

async function runBlocklyXmlProgram(xmlText, sourceLabel = 'IDE Python') {
  if (!blocklyWorkspace) {
    return
  }

  try {
    stopBlocklyProgram(false)
    const xml = Blockly.utils.xml.textToDom(xmlText)
    Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, blocklyWorkspace)
    updateBlocksStatus('Loaded from IDE')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    updateBlocksStatus(`Error: ${message}`)
    if (_simBridgeChannel) {
      _simBridgeChannel.postMessage({ type: 'SIM_RUN_STATUS', level: 'error', text: `Run Sim failed: ${message}` })
    }
    return
  }

  await runBlocklyProgram()
}

async function runSimulatorScript(code, sourceLabel = 'Scratch Blocks') {
  stopBlocklyProgram(false)
  const token = blockRunToken

  input.useScript = true
  programTimerStart = performance.now()
  movementSpeedPercent = 60
  motorASpeeed = 0
  motorBSpeed = 0
  motorCSpeed = 0
  driveBaseAxleTrackCm = DEFAULT_AXLE_TRACK_CM
  updateStatus(`Input: ${sourceLabel}`)
  updateBlocksStatus('Running')
  runBlocksBtn.disabled = true
  stopBlocksBtn.disabled = false

  const api = {
    async setDriveBaseAxleTrackMm(mm) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const mmValue = Number(mm)
      if (!Number.isFinite(mmValue) || mmValue <= 0) return
      driveBaseAxleTrackCm = clamp(mmValue / 10, 4, 30)
    },
    async setThrottle(percent) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      input.scriptThrottle = clampPercentToUnit(percent)
    },
    async setSteering(percent) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      input.scriptSteering = clampPercentToUnit(percent)
    },
    async setBrake(enabled) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      input.brake = Boolean(enabled)
    },
    async stop() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      input.scriptThrottle = 0
      input.scriptSteering = 0
      input.scriptTurning = false
      smoothedSteering = 0
      const grip = 1 - (wheelSlippery / 100) * 0.85
      input.brake = true
      await sleepWithToken(Math.round(110 / grip), token)
      input.brake = false
    },
    async openClaw() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      setClawTarget(true)
      await sleepWithToken(320, token)
    },
    async closeClaw() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      setClawTarget(false)
      await sleepWithToken(320, token)
    },
    async waitSeconds(seconds) {
      const safeSeconds = clamp(Number(seconds) || 0, 0, 60)
      await sleepWithToken(safeSeconds * 1000, token)
    },
    async driveForSeconds(throttle, steering, seconds) {
      await this.setThrottle(throttle)
      await this.setSteering(steering)
      await this.waitSeconds(seconds)
      await this.stop()
    },
    async getXcm() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      return getRobotState().xCm
    },
    async getYcm() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      return getRobotState().yCm
    },
    async getHeadingDeg() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      return getRobotState().headingDeg
    },
    async getSpeedCmPerSec() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      return getRobotState().speedCmPerSec
    },
    async isMoving() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      return getRobotState().moving
    },
    async getLeftColor() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      return getLeftSensorReading()
    },
    async getRightColor() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      return getRightSensorReading()
    },
    async turnLeftDegrees(degrees, turnType = 'POINT', leftSpeed = 50, rightSpeed = -50) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const deg = clamp(Math.abs(Number(degrees) || 90), 0, 3600)
      const startHeading = getRobotState().headingDeg
      const targetHeading = normalizeHeadingDeg(startHeading - deg)
      input.scriptTurning = true
      // Set throttle and steering based on turn type
      if (turnType === 'POINT') {
        input.scriptThrottle = 0
        input.scriptSteering = -1   // negative steering = left turn (decreasing heading)
      } else {
        // Pivot or Curve: use user-configurable wheel speeds
        const lSpd = clamp(Number(leftSpeed) || 0, -100, 100) / 100
        const rSpd = clamp(Number(rightSpeed) || 0, -100, 100) / 100
        input.scriptThrottle = (lSpd + rSpd) / 2
        input.scriptSteering = (lSpd - rSpd) / 2
      }
      let accumulated = 0
      let prevHeading = startHeading
      let estimatedDegPerSec = 0
      let prevTick = performance.now()
      while (accumulated < deg) {
        if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
        await new Promise(r => setTimeout(r, 16))
        const curHeading = getRobotState().headingDeg
        let delta = prevHeading - curHeading   // left turn: heading decreases
        if (delta < -180) delta += 360
        if (delta > 180) delta -= 360
        const appliedDelta = Math.max(0, delta)
        accumulated += appliedDelta
        const now = performance.now()
        const dtSec = Math.max(0.008, (now - prevTick) / 1000)
        const instDegPerSec = appliedDelta / dtSec
        estimatedDegPerSec = estimatedDegPerSec === 0
          ? instDegPerSec
          : (estimatedDegPerSec * 0.7 + instDegPerSec * 0.3)
        const leadMargin = clamp(estimatedDegPerSec * 0.06, 0.6, 8)
        prevTick = now
        prevHeading = curHeading
        if ((deg - accumulated) <= leadMargin) {
          break
        }
      }
      input.scriptThrottle = 0
      input.scriptSteering = 0
      input.scriptTurning = false
      smoothedSteering = 0
      vehicle.heading = headingDegToRad(targetHeading)
      car.rotation.y = vehicle.heading
      const gripL = 1 - (wheelSlippery / 100) * 0.85
      input.brake = true
      await sleepWithToken(Math.round(110 / gripL), token)
      input.brake = false
    },
    async turnRightDegrees(degrees, turnType = 'POINT', leftSpeed = -50, rightSpeed = 50) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const deg = clamp(Math.abs(Number(degrees) || 90), 0, 3600)
      const startHeading = getRobotState().headingDeg
      const targetHeading = normalizeHeadingDeg(startHeading + deg)
      input.scriptTurning = true
      // Set throttle and steering based on turn type
      if (turnType === 'POINT') {
        input.scriptThrottle = 0
        input.scriptSteering = 1    // positive steering = right turn (increasing heading)
      } else {
        // Pivot or Curve: use user-configurable wheel speeds
        const lSpd = clamp(Number(leftSpeed) || 0, -100, 100) / 100
        const rSpd = clamp(Number(rightSpeed) || 0, -100, 100) / 100
        input.scriptThrottle = (lSpd + rSpd) / 2
        input.scriptSteering = (lSpd - rSpd) / 2
      }
      let accumulated = 0
      let prevHeading = startHeading
      let estimatedDegPerSec = 0
      let prevTick = performance.now()
      while (accumulated < deg) {
        if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
        await new Promise(r => setTimeout(r, 16))
        const curHeading = getRobotState().headingDeg
        let delta = curHeading - prevHeading   // right turn: heading increases
        if (delta < -180) delta += 360
        if (delta > 180) delta -= 360
        const appliedDelta = Math.max(0, delta)
        accumulated += appliedDelta
        const now = performance.now()
        const dtSec = Math.max(0.008, (now - prevTick) / 1000)
        const instDegPerSec = appliedDelta / dtSec
        estimatedDegPerSec = estimatedDegPerSec === 0
          ? instDegPerSec
          : (estimatedDegPerSec * 0.7 + instDegPerSec * 0.3)
        const leadMargin = clamp(estimatedDegPerSec * 0.06, 0.6, 8)
        prevTick = now
        prevHeading = curHeading
        if ((deg - accumulated) <= leadMargin) {
          break
        }
      }
      input.scriptThrottle = 0
      input.scriptSteering = 0
      input.scriptTurning = false
      smoothedSteering = 0
      vehicle.heading = headingDegToRad(targetHeading)
      car.rotation.y = vehicle.heading
      const gripR = 1 - (wheelSlippery / 100) * 0.85
      input.brake = true
      await sleepWithToken(Math.round(110 / gripR), token)
      input.brake = false
    },
    async goStraight(value, unit, stopMode = 'BRAKE') {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const signed = Number(value) || 0
      const direction = signed >= 0 ? 1 : -1
      const num = Math.abs(signed)
      const targetCm = unit === 'ROTATIONS'
        ? num * WHEEL_CIRCUMFERENCE_CM
        : num  // already cm
      if (targetCm <= 0) return
      const startX = car.position.x
      const startZ = car.position.z
      input.scriptThrottle = direction * clamp(movementSpeedPercent / 100, 0.1, 1)
      input.scriptSteering = 0
      let travelledCm = 0
      while (travelledCm < targetCm) {
        if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
        await new Promise(r => setTimeout(r, 16))
        const dx = car.position.x - startX
        const dz = car.position.z - startZ
        travelledCm = Math.sqrt(dx * dx + dz * dz) * CM_PER_WORLD_UNIT
      }
      input.scriptThrottle = 0
      const grip = 1 - (wheelSlippery / 100) * 0.85
      if (stopMode === 'HOLD') {
        // Hold: instant stop scaled by grip — on slippery surface, can't fully lock
        vehicle.speed *= (1 - grip)
        input.brake = true
        await sleepWithToken(Math.round(50 / grip), token)
        input.brake = false
      } else if (stopMode === 'BRAKE') {
        // Brake: moderate braking via motor phases, longer on slippery
        input.brake = true
        await sleepWithToken(Math.round(110 / grip), token)
        input.brake = false
      } else {
        // Coast: cut power, let momentum carry
        // no brake applied — vehicle decelerates via drag only (grip already in physics loop)
        await sleepWithToken(50, token)
      }
    },

    async goStraightByEncoder(valueCm, stopMode = 'BRAKE') {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const signed = Number(valueCm) || 0
      const direction = signed >= 0 ? 1 : -1
      const targetCm = Math.abs(signed)
      if (targetCm <= 0) return

      const targetWheelDeg = (targetCm / WHEEL_CIRCUMFERENCE_CM) * 360
      const startLeft = leftWheelEncoder
      const startRight = rightWheelEncoder

      input.scriptTurning = false
      input.scriptThrottle = direction * clamp(movementSpeedPercent / 100, 0.1, 1)
      input.scriptSteering = 0

      while (true) {
        if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
        await new Promise(r => setTimeout(r, 16))
        const leftProgress = Math.abs(leftWheelEncoder - startLeft)
        const rightProgress = Math.abs(rightWheelEncoder - startRight)
        const avgProgress = (leftProgress + rightProgress) / 2
        if (avgProgress >= targetWheelDeg) break
      }

      input.scriptThrottle = 0
      const grip = 1 - (wheelSlippery / 100) * 0.85
      if (stopMode === 'HOLD') {
        vehicle.speed *= (1 - grip)
        input.brake = true
        await sleepWithToken(Math.round(50 / grip), token)
        input.brake = false
      } else if (stopMode === 'BRAKE') {
        input.brake = true
        await sleepWithToken(Math.round(110 / grip), token)
        input.brake = false
      } else {
        await sleepWithToken(50, token)
      }
    },

    async turnByEncoder(degrees, stopMode = 'BRAKE') {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const signed = Number(degrees) || 0
      const direction = signed >= 0 ? 1 : -1
      const deg = Math.abs(signed)
      if (deg <= 0) return

      const wheelTravelCm = Math.PI * driveBaseAxleTrackCm * (deg / 360)
      const targetWheelDeg = (wheelTravelCm / WHEEL_CIRCUMFERENCE_CM) * 360
      const startLeft = leftWheelEncoder
      const startRight = rightWheelEncoder

      input.scriptTurning = true
      input.scriptThrottle = 0
      input.scriptSteering = direction > 0 ? 1 : -1

      while (true) {
        if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
        await new Promise(r => setTimeout(r, 16))
        const leftProgress = Math.abs(leftWheelEncoder - startLeft)
        const rightProgress = Math.abs(rightWheelEncoder - startRight)
        const avgProgress = (leftProgress + rightProgress) / 2
        if (avgProgress >= targetWheelDeg) break
      }

      input.scriptThrottle = 0
      input.scriptSteering = 0
      input.scriptTurning = false
      smoothedSteering = 0
      const grip = 1 - (wheelSlippery / 100) * 0.85
      if (stopMode === 'HOLD') {
        vehicle.speed *= (1 - grip)
        input.brake = true
        await sleepWithToken(Math.round(50 / grip), token)
        input.brake = false
      } else if (stopMode === 'BRAKE') {
        input.brake = true
        await sleepWithToken(Math.round(110 / grip), token)
        input.brake = false
      } else {
        await sleepWithToken(50, token)
      }
    },

    // ── Motor API (port-aware) ──────────────────────────────────
    async setMovementSpeed(percent) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      movementSpeedPercent = clamp(Number(percent) || 60, 0, 100)
    },

    async runMotorFor(motor, value, unit) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const role = portRole(motor)
      const num = Math.abs(Number(value) || 1)
      const speedFraction = clamp(movementSpeedPercent / 100, 0.1, 1)

      if (role === 'claw') {
        if (unit === 'SECONDS') {
          setClawTarget(true)
          await sleepWithToken(num * 1000, token)
          return
        }
        setClawTarget(num > 0)
        await sleepWithToken(320, token)
        return
      }

      if (isVirtualMotorPort(motor, role)) {
        const state = virtualMotorState[motor]
        if (unit === 'SECONDS') {
          state.speed = movementSpeedPercent
          await sleepWithToken(num * 1000, token)
          state.encoder += state.speed * 10 * num
          state.speed = 0
          return
        }

        const targetDeg = unit === 'ROTATIONS' ? num * 360 : num
        state.speed = movementSpeedPercent
        const degPerSec = Math.max(60, Math.abs(state.speed) * 10)
        await sleepWithToken((targetDeg / degPerSec) * 1000, token)
        state.encoder += targetDeg
        state.speed = 0
        return
      }

      if (role !== 'rightMotor' && role !== 'leftMotor') return  // not a motor port

      if (unit === 'SECONDS') {
        if (role === 'rightMotor') { motorASpeeed = movementSpeedPercent; motorBSpeed = 0 }
        else                       { motorBSpeed = movementSpeedPercent; motorASpeeed = 0 }
        applyDifferentialDrive()
        await sleepWithToken(num * 1000, token)
        if (role === 'rightMotor') motorASpeeed = 0; else motorBSpeed = 0
        applyDifferentialDrive()
        const gripMs = 1 - (wheelSlippery / 100) * 0.85
        input.brake = true
        await sleepWithToken(Math.round(110 / gripMs), token)
        input.brake = false
        return
      }

      // ROTATIONS or DEGREES → track encoder
      const targetDeg = unit === 'ROTATIONS' ? num * 360 : num
      const encoder = role === 'rightMotor' ? () => leftWheelEncoder : () => rightWheelEncoder
      const startEnc = encoder()

      if (role === 'rightMotor') { motorASpeeed = movementSpeedPercent; motorBSpeed = 0 }
      else                       { motorBSpeed = movementSpeedPercent; motorASpeeed = 0 }
      applyDifferentialDrive()

      while (Math.abs(encoder() - startEnc) < targetDeg) {
        if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
        await new Promise(r => setTimeout(r, 16))
      }
      if (role === 'rightMotor') motorASpeeed = 0; else motorBSpeed = 0
      applyDifferentialDrive()
      const gripM2 = 1 - (wheelSlippery / 100) * 0.85
      input.brake = true
      await sleepWithToken(Math.round(110 / gripM2), token)
      input.brake = false
    },

    async startMotor(motor, speed) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const role = portRole(motor)
      const s = clamp(Number(speed) || 0, -100, 100)
      if (role === 'rightMotor') motorASpeeed = s
      else if (role === 'leftMotor') motorBSpeed = s
      else if (role === 'claw') {
        setClawTarget(s <= 0)
        return
      } else if (isVirtualMotorPort(motor, role)) {
        virtualMotorState[motor].speed = s
        return
      } else return
      applyDifferentialDrive()
    },

    async stopMotor(motor) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const role = portRole(motor)
      if (role === 'rightMotor') motorASpeeed = 0
      else if (role === 'leftMotor') motorBSpeed = 0
      else if (role === 'claw') { /* claw stays */ }
      else if (isVirtualMotorPort(motor, role)) {
        virtualMotorState[motor].speed = 0
        return
      }
      else return
      applyDifferentialDrive()
    },

    async getMotorPosition(motor) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const role = portRole(motor)
      if (role === 'rightMotor') return Math.round(leftWheelEncoder)
      if (role === 'leftMotor') return Math.round(rightWheelEncoder)
      if (isVirtualMotorPort(motor, role)) return Math.round(virtualMotorState[motor].encoder)
      return 0
    },

    async getMotorSpeed(motor) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const role = portRole(motor)
      if (role === 'rightMotor' || role === 'leftMotor') {
        const degPerSec = (vehicle.speed / WHEEL_RADIUS_WORLD) * (180 / Math.PI)
        return Math.round(degPerSec)
      }
      if (isVirtualMotorPort(motor, role)) return Math.round(virtualMotorState[motor].speed * 10)
      return 0
    },

    async resetMotorEncoder(motor) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const role = portRole(motor)
      if (role === 'rightMotor') leftWheelEncoder = 0
      else if (role === 'leftMotor') rightWheelEncoder = 0
      else if (isVirtualMotorPort(motor, role)) virtualMotorState[motor].encoder = 0
    },

    // ── Sensor API ───────────────────────────────────────────────
    async getDistanceCm() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const S = 0.45
      const fwdX = Math.sin(vehicle.heading)
      const fwdZ = Math.cos(vehicle.heading)
      const sx = car.position.x + fwdX * 2.5 * S
      const sz = car.position.z + fwdZ * 2.5 * S
      let minDist = 200
      for (const c of cans) {
        const dx = c.group.position.x - sx
        const dz = c.group.position.z - sz
        const dot = dx * fwdX + dz * fwdZ
        if (dot > 0) {
          const d = Math.sqrt(dx * dx + dz * dz) * CM_PER_WORLD_UNIT
          if (d < minDist) minDist = d
        }
      }
      // Ray-step through obstacle boxes
      const stepSize = 0.5
      const maxSteps = Math.ceil(20 / stepSize)
      for (let i = 1; i <= maxSteps; i++) {
        const px = sx + fwdX * stepSize * i
        const pz = sz + fwdZ * stepSize * i
        const probe = new THREE.Box3(
          new THREE.Vector3(px - 0.1, 0, pz - 0.1),
          new THREE.Vector3(px + 0.1, MAZE_WALL_H, pz + 0.1)
        )
        let hit = false
        for (const ob of obstacleBoxes) {
          if (probe.intersectsBox(ob)) { hit = true; break }
        }
        if (hit) {
          const d = stepSize * i * CM_PER_WORLD_UNIT
          if (d < minDist) minDist = d
          break
        }
      }
      return Math.round(minDist)
    },

    async getForceSensorN() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      return vehicleBlocked ? +(Math.abs(vehicle.speed) * 1.5).toFixed(1) : 0
    },

    async isForceSensorPressed() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      return vehicleBlocked
    },

    async getTimer() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      return +((performance.now() - programTimerStart) / 1000).toFixed(2)
    },

    async resetTimer() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      programTimerStart = performance.now()
    },

    async resetGyro() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      vehicle.heading = 0
    },

    // ── Sound & Display API ──────────────────────────────────────
    async playBeep(freq, seconds) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      const dur = clamp(Number(seconds) || 0.5, 0.05, 10)
      const hz = clamp(Number(freq) || 440, 100, 2000)
      try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.type = 'square'
        osc.frequency.value = hz
        gain.gain.value = 0.15
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start()
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur)
        osc.stop(audioCtx.currentTime + dur)
      } catch (_) { /* audio not supported */ }
      speakerReading.textContent = `♪ ${hz} Hz`
      await sleepWithToken(dur * 1000, token)
      speakerReading.textContent = 'Silent'
    },

    async displayText(text) {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      matrixReading.textContent = String(text).slice(0, 20)
    },

    async displayClear() {
      if (token !== blockRunToken) throw new Error('__BLOCK_RUN_STOPPED__')
      matrixReading.textContent = 'Idle'
    }
  }

  // Helper: convert individual motor speeds → differential throttle + steering
  function applyDifferentialDrive() {
    const a = clamp(motorASpeeed, -100, 100) / 100
    const b = clamp(motorBSpeed, -100, 100) / 100
    input.scriptThrottle = (a + b) / 2
    input.scriptSteering = (b - a) / 2   // positive = turn right
  }

  try {
    const runProgram = new Function('api', `"use strict"; return (async () => {\n${code}\n})();`)
    await runProgram(api)

    if (token === blockRunToken) {
      input.scriptThrottle = 0
      input.scriptSteering = 0
      input.useScript = false
      runBlocksBtn.disabled = false
      stopBlocksBtn.disabled = true
      updateBlocksStatus('Completed')
      updateStatus(input.useSpike ? 'Input: Hub connected (USB serial)' : 'Input: Keyboard')
      if (_simBridgeChannel) {
        _simBridgeChannel.postMessage({ type: 'SIM_RUN_STATUS', level: 'info', text: `Simulator run completed (${sourceLabel}).` })
      }
    }
  } catch (error) {
    if (error.message === '__BLOCK_RUN_STOPPED__') {
      return
    }

    input.useScript = false
    runBlocksBtn.disabled = false
    stopBlocksBtn.disabled = true
    updateBlocksStatus(`Error: ${error.message}`)
    updateStatus('Input: Keyboard')
    if (_simBridgeChannel) {
      _simBridgeChannel.postMessage({ type: 'SIM_RUN_STATUS', level: 'error', text: `Simulator error: ${error.message}` })
    }
  }
}

function transpilePythonToSimulatorJs(pythonCode) {
  const lines = String(pythonCode || '').split(/\r?\n/)
  const motorPorts = new Map()
  const motorDirections = new Map()
  const variables = new Map()
  const hubVars = new Set(['hub', 'prime_hub'])
  const driveBaseVars = new Set(['drive_base'])
  const driveBaseUseGyro = new Map([['drive_base', false]])
  const driveBaseAxleTrackMm = new Map([['drive_base', 88]])
  const declaredMotorPorts = new Set()
  let driveBasePorts = null
  let driveBaseForwardSign = 1
  const output = []
  const warnings = []

  const evalExpr = (exprText) => {
    const expr = String(exprText || '').trim()
    if (!expr) return { ok: false, error: 'Empty expression' }

    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return { ok: true, value: Number(expr) }
    }

    const tokenRegex = /[A-Za-z_]\w*/g
    const unknown = []
    const replaced = expr.replace(tokenRegex, (name) => {
      if (variables.has(name)) return String(variables.get(name))
      unknown.push(name)
      return name
    })

    if (unknown.length > 0) {
      return { ok: false, error: `Undefined variable(s): ${unknown.join(', ')}` }
    }

    if (!/^[0-9+\-*/().\s]+$/.test(replaced)) {
      return { ok: false, error: `Unsupported expression: ${expr}` }
    }

    try {
      const value = Function(`"use strict"; return (${replaced});`)()
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return { ok: false, error: `Expression is not a finite number: ${expr}` }
      }
      return { ok: true, value }
    } catch {
      return { ok: false, error: `Could not evaluate expression: ${expr}` }
    }
  }

  const toNum = (text, fallback = 0, lineNo = null) => {
    const result = evalExpr(text)
    if (result.ok) return result.value
    if (lineNo != null) {
      warnings.push(`Line ${lineNo}: ${result.error}`)
    } else {
      warnings.push(result.error)
    }
    return fallback
  }

  const speedToPercent = (speedDegPerSec) => {
    const s = toNum(speedDegPerSec, 0)
    return Math.max(-100, Math.min(100, Math.round(s / 10)))
  }

  const stripInlineComment = (text) => {
    let inSingle = false
    let inDouble = false
    let escaped = false
    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i]
      if (escaped) {
        escaped = false
        continue
      }
      if (ch === '\\') {
        escaped = true
        continue
      }
      if (ch === "'" && !inDouble) {
        inSingle = !inSingle
        continue
      }
      if (ch === '"' && !inSingle) {
        inDouble = !inDouble
        continue
      }
      if (ch === '#' && !inSingle && !inDouble) {
        return text.slice(0, i).trim()
      }
    }
    return text.trim()
  }

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]
    const lineNo = index + 1
    const line = stripInlineComment(rawLine)
    if (!line || line.startsWith('#')) continue

    // Numeric variable assignment, e.g. mm = 120 or mm = 2 * 50
    let m = line.match(/^(\w+)\s*=\s*(.+)$/)
    if (m && !/\b(Motor|DriveBase|PrimeHub|ColorSensor|UltrasonicSensor|ForceSensor)\b/.test(m[2])) {
      const assignResult = evalExpr(m[2])
      if (assignResult.ok) {
        variables.set(m[1], assignResult.value)
      } else {
        warnings.push(`Line ${lineNo}: ${assignResult.error}`)
      }
      continue
    }

    m = line.match(/^(\w+)\s*=\s*Motor\(\s*Port\.([A-Z])(?:\s*,\s*Direction\.(CLOCKWISE|COUNTERCLOCKWISE))?.*\)$/)
    if (m) {
      if (!'ABCDEF'.includes(m[2])) {
        warnings.push(`Line ${lineNo}: Unsupported motor port Port.${m[2]} (sim supports A-F)`)
        continue
      }
      motorPorts.set(m[1], m[2])
      const directionName = m[3] || 'CLOCKWISE'
      motorDirections.set(m[1], directionName === 'COUNTERCLOCKWISE' ? -1 : 1)
      declaredMotorPorts.add(m[2])
      continue
    }

    m = line.match(/^(\w+)\s*=\s*PrimeHub\(\)$/)
    if (m) {
      hubVars.add(m[1])
      continue
    }

    m = line.match(/^(\w+)\s*=\s*DriveBase\(\s*(\w+)\s*,\s*(\w+)\s*,\s*([^,]+)\s*,\s*([^\)]+)\s*\)/)
    if (m) {
      driveBaseVars.add(m[1])
      if (!driveBaseUseGyro.has(m[1])) driveBaseUseGyro.set(m[1], false)
      const axleTrack = toNum(m[5], 88, lineNo)
      driveBaseAxleTrackMm.set(m[1], axleTrack)
      output.push(`await api.setDriveBaseAxleTrackMm(${axleTrack});`)
      const leftPort = motorPorts.get(m[2])
      const rightPort = motorPorts.get(m[3])
      if (leftPort && rightPort) {
        driveBasePorts = { leftPort, rightPort }
      }

      const leftDirection = motorDirections.get(m[2])
      const rightDirection = motorDirections.get(m[3])
      if (leftDirection === -1 && rightDirection === 1) {
        driveBaseForwardSign = 1
      } else if (leftDirection === 1 && rightDirection === -1) {
        driveBaseForwardSign = -1
      } else if (leftDirection != null && rightDirection != null) {
        warnings.push(`Line ${lineNo}: Unusual DriveBase motor directions (left=${leftDirection}, right=${rightDirection}); using default forward sign.`)
        driveBaseForwardSign = 1
      }
      continue
    }

    m = line.match(/^(\w+)\.use_gyro\(\s*(True|False|true|false)\s*\)$/)
    if (m) {
      if (!driveBaseVars.has(m[1])) {
        warnings.push(`Line ${lineNo}: Unknown DriveBase variable: ${m[1]}`)
        continue
      }
      driveBaseUseGyro.set(m[1], /^true$/i.test(m[2]))
      continue
    }

    m = line.match(/^wait\((.+)\)$/)
    if (m) {
      const ms = toNum(m[1], 0, lineNo)
      output.push(`await api.waitSeconds(${ms} / 1000);`)
      continue
    }

    m = line.match(/^(\w+)\.speaker\.beep\((.*)\)$/)
    if (m) {
      if (!hubVars.has(m[1])) {
        warnings.push(`Line ${lineNo}: Unknown hub variable: ${m[1]}`)
        continue
      }
      const args = m[2].split(',').map((s) => s.trim()).filter(Boolean)
      const freq = toNum(args[0], 440, lineNo)
      const ms = args.length > 1 ? toNum(args[1], 250, lineNo) : 250
      output.push(`await api.playBeep(${freq}, ${ms} / 1000);`)
      continue
    }

    m = line.match(/^(\w+)\.straight\((.+)\)$/)
    if (m) {
      if (!driveBaseVars.has(m[1])) {
        warnings.push(`Line ${lineNo}: Unknown DriveBase variable: ${m[1]}`)
        continue
      }
      const mm = toNum(m[2], 0, lineNo)
      const cmSigned = (mm / 10) * driveBaseForwardSign
      const useGyro = Boolean(driveBaseUseGyro.get(m[1]))
      if (useGyro) {
        output.push(`await api.goStraight(${cmSigned}, 'CM', 'BRAKE');`)
      } else {
        output.push(`await api.goStraightByEncoder(${cmSigned}, 'BRAKE');`)
      }
      continue
    }

    m = line.match(/^(\w+)\.turn\((.+)\)$/)
    if (m) {
      if (!driveBaseVars.has(m[1])) {
        warnings.push(`Line ${lineNo}: Unknown DriveBase variable: ${m[1]}`)
        continue
      }
      const angle = toNum(m[2], 0, lineNo)
      const useGyro = Boolean(driveBaseUseGyro.get(m[1]))
      if (useGyro) {
        if (angle >= 0) {
          output.push(`await api.turnRightDegrees(${Math.abs(angle)}, 'POINT', -50, 50);`)
        } else {
          output.push(`await api.turnLeftDegrees(${Math.abs(angle)}, 'POINT', 50, -50);`)
        }
      } else {
        output.push(`await api.turnByEncoder(${angle}, 'BRAKE');`)
      }
      continue
    }

    m = line.match(/^(\w+)\.stop\(\)$/)
    if (m && driveBaseVars.has(m[1])) {
      output.push('await api.stop();')
      continue
    }

    m = line.match(/^(\w+)\.run_time\(([^,]+),\s*([^\)]+)\)$/)
    if (m) {
      const port = motorPorts.get(m[1])
      if (!port) {
        warnings.push(`Line ${lineNo}: Unknown motor variable: ${m[1]}`)
        continue
      }
      const speedPct = speedToPercent(toNum(m[2], 0, lineNo))
      const ms = toNum(m[3], 0, lineNo)
      output.push(`await api.startMotor('${port}', ${speedPct});`)
      output.push(`await api.waitSeconds(${ms} / 1000);`)
      output.push(`await api.stopMotor('${port}');`)
      continue
    }

    m = line.match(/^(\w+)\.run_angle\(([^,]+),\s*([^,\)]+).*$|^(\w+)\.run_target\(([^,]+),\s*([^,\)]+).*/)
    if (m) {
      const varName = m[1] || m[4]
      const angleArg = m[3] || m[6]
      const port = motorPorts.get(varName)
      if (!port) {
        warnings.push(`Line ${lineNo}: Unknown motor variable: ${varName}`)
        continue
      }
      const deg = Math.abs(toNum(angleArg, 0, lineNo))
      output.push(`await api.runMotorFor('${port}', ${deg}, 'DEGREES');`)
      continue
    }

    m = line.match(/^(\w+)\.(run|dc)\(([^\)]+)\)$/)
    if (m) {
      const port = motorPorts.get(m[1])
      if (!port) {
        warnings.push(`Line ${lineNo}: Unknown motor variable: ${m[1]}`)
        continue
      }
      const speedPct = m[2] === 'dc' ? toNum(m[3], 0, lineNo) : speedToPercent(toNum(m[3], 0, lineNo))
      output.push(`await api.startMotor('${port}', ${Math.max(-100, Math.min(100, speedPct))});`)
      continue
    }

    m = line.match(/^(\w+)\.stop\(\)$/)
    if (m && motorPorts.has(m[1])) {
      output.push(`await api.stopMotor('${motorPorts.get(m[1])}');`)
      continue
    }

    m = line.match(/^print\((.*)\)$/)
    if (m) {
      const t = m[1] || "''"
      output.push(`await api.displayText(String(${t}));`)
      continue
    }

    if (/^from\s+|^import\s+/.test(line)) {
      continue
    }

    warnings.push(`Line ${lineNo}: Unsupported line: ${line}`)
  }

  return { jsCode: output.join('\n'), warnings, declaredMotorPorts: Array.from(declaredMotorPorts), driveBasePorts }
}

function setupSimBridge() {
  if (typeof BroadcastChannel === 'undefined') {
    return
  }

  _simBridgeChannel = new BroadcastChannel('code-pybricks-sim-bridge')

  const announce = () => {
    if (_simBridgeChannel) {
      _simBridgeChannel.postMessage({ type: 'SIM_HEARTBEAT', ts: Date.now() })
    }
  }

  _simBridgeChannel.onmessage = async (event) => {
    const message = event.data || {}
    if (message.type === 'SIM_PING') {
      if (_simBridgeChannel) {
        _simBridgeChannel.postMessage({ type: 'SIM_PONG', ts: Date.now() })
      }
      return
    }

    if (message.type === 'SIM_STOP') {
      stopBlocklyProgram(true)
      return
    }

    if (message.type === 'SIM_RUN_JS' && typeof message.code === 'string') {
      await runSimulatorScript(message.code, message.sourceLabel || 'IDE Blocks')
      return
    }

    if (message.type === 'SIM_RUN_SPIKE_XML' && typeof message.xml === 'string') {
      await runBlocklyXmlProgram(message.xml, message.sourceLabel || 'IDE Python')
      return
    }

    if (message.type === 'SIM_RUN_PYTHON' && typeof message.code === 'string') {
      const { jsCode, warnings, declaredMotorPorts, driveBasePorts } = transpilePythonToSimulatorJs(message.code)

      explicitMotorPorts = new Set(declaredMotorPorts || [])
      resetVirtualMotors()

      if (driveBasePorts && driveBasePorts.leftPort && driveBasePorts.rightPort) {
        setPortRole(driveBasePorts.leftPort, 'leftMotor')
        setPortRole(driveBasePorts.rightPort, 'rightMotor')
      }

      if (!jsCode.trim()) {
        if (_simBridgeChannel) {
          _simBridgeChannel.postMessage({
            type: 'SIM_RUN_STATUS',
            level: 'error',
            text: warnings.length > 0
              ? `Python code could not run in sim. ${warnings[0]}`
              : 'Python code has no supported simulator commands.',
          })
        }
        return
      }

      if (warnings.length > 0 && _simBridgeChannel) {
        _simBridgeChannel.postMessage({
          type: 'SIM_RUN_STATUS',
          level: 'info',
          text: `Python→Sim: ${warnings.length} warning(s). First: ${warnings[0]}`,
        })
      }

      await runSimulatorScript(jsCode, message.sourceLabel || 'IDE Python')
    }
  }

  if (_simBridgeChannel) {
    _simBridgeChannel.postMessage({ type: 'SIM_READY', ts: Date.now() })
  }
  _simHeartbeatTimer = setInterval(announce, 1000)
}

function setupBlocklyEditor() {
  defineCustomBlocks()
  blocklyWorkspace = Blockly.inject('blocklyDiv', {
    toolbox: toolboxConfig(),
    theme: createCmraTheme(),
    trashcan: true,
    renderer: 'zelos',
    move: {
      scrollbars: true,
      drag: true,
      wheel: true
    },
    zoom: {
      controls: true,
      wheel: true,
      startScale: 0.85,
      minScale: 0.4,
      maxScale: 1.4,
      scaleSpeed: 1.2
    },
    grid: {
      spacing: 20,
      length: 3,
      colour: '#2b3340',
      snap: true
    }
  })

  createStarterProgram(blocklyWorkspace)
  updateBlocksStatus('Ready')
}

setupBlocklyEditor()
applyClawPose()
setupSimBridge()

runBlocksBtn.addEventListener('click', () => {
  runBlocklyProgram()
})

stopBlocksBtn.addEventListener('click', () => {
  stopBlocklyProgram(true)
})

clearBlocksBtn.addEventListener('click', () => {
  stopBlocklyProgram(false)
  blocklyWorkspace.clear()
  updateBlocksStatus('Cleared')
})

missionSquareBtn.addEventListener('click', () => {
  stopBlocklyProgram(false)
  robotSelect.value = 'basicClaw'
  mapSelect.value = 'mapCans'
  buildRobot('basicClaw')
  buildMap('mapCans')
  car.position.set(0, 0, 0)
  vehicle.heading = 0
  vehicle.speed = 0
  loadMissionTemplate('square')
})

missionSlalomBtn.addEventListener('click', () => {
  stopBlocklyProgram(false)
  robotSelect.value = 'basicClaw'
  mapSelect.value = 'mapCans'
  buildRobot('basicClaw')
  buildMap('mapCans')
  car.position.set(0, 0, 0)
  vehicle.heading = 0
  vehicle.speed = 0
  loadMissionTemplate('slalom')
})

missionGotoBtn.addEventListener('click', () => {
  stopBlocklyProgram(false)
  robotSelect.value = 'basicClaw'
  mapSelect.value = 'mapCans'
  buildRobot('basicClaw')
  buildMap('mapCans')
  car.position.set(0, 0, 0)
  vehicle.heading = 0
  vehicle.speed = 0
  loadMissionTemplate('gotoCoordinate')
})

missionLineFollowBasicBtn.addEventListener('click', () => {
  document.activeElement.blur()
  stopBlocklyProgram(false)
  robotSelect.value = 'lineFollow'
  mapSelect.value = 'mapLine'
  buildRobot('lineFollow')
  buildMap('mapLine')
  car.position.set(0, 0, 20 + lineTrackRadius)
  vehicle.heading = Math.PI / 2
  vehicle.speed = 0
  loadMissionTemplate('lineFollow')
})

missionLineFollowIntermediateBtn.addEventListener('click', () => {
  document.activeElement.blur()
  stopBlocklyProgram(false)
  robotSelect.value = 'lineFollow'
  mapSelect.value = 'mapLineIntermediate'
  buildRobot('lineFollow')
  buildMap('mapLineIntermediate')
  car.position.set(0, 0, 40)
  vehicle.heading = Math.PI / 2
  vehicle.speed = 0
  loadMissionTemplate('lineFollowIntermediate')
})

missionMazeBtn.addEventListener('click', () => {
  stopBlocklyProgram(false)
  robotSelect.value = 'basicClaw'
  mapSelect.value = 'mapMaze'
  buildRobot('basicClaw')
  buildMap('mapMaze')
  const sp = createMapMaze.startPos || { x: 0, z: 0 }
  car.position.set(sp.x, 0, sp.z)
  vehicle.heading = 0
  vehicle.speed = 0
  loadMissionTemplate('maze')
})

robotSelect.addEventListener('change', () => {
  stopBlocklyProgram(false)
  buildRobot(robotSelect.value)
  car.position.set(0, 0, 0)
  vehicle.heading = 0
  vehicle.speed = 0
})

mapSelect.addEventListener('change', () => {
  buildMap(mapSelect.value)
  // Reset robot position; if line map, place on track
  if (mapSelect.value === 'mapLine') {
    car.position.set(0, 0, 20 + lineTrackRadius)
    vehicle.heading = Math.PI / 2
  } else if (mapSelect.value === 'mapLineIntermediate') {
    car.position.set(0, 0, 40)
    vehicle.heading = Math.PI / 2
  } else {
    car.position.set(0, 0, 0)
    vehicle.heading = 0
  }
  vehicle.speed = 0
})

openClawBtn.addEventListener('click', () => {
  setClawTarget(true)
})

closeClawBtn.addEventListener('click', () => {
  setClawTarget(false)
})

resetSensorsBtn.addEventListener('click', () => {
  // Nudge robot backward out of any wall collision
  const nudge = 0.6
  car.position.x -= Math.sin(vehicle.heading) * nudge
  car.position.z -= Math.cos(vehicle.heading) * nudge
  vehicle.heading = 0
  vehicle.speed = 0
  vehicleBlocked = false

  // Reset state variables
  leftWheelEncoder = 0
  rightWheelEncoder = 0
  programTimerStart = performance.now()

  // Reset HUD text to initial values
  gyroReading.textContent = '0.0°'
  accelReading.textContent = '0.0 m/s²'
  distReading.textContent = '— cm'
  colorReading.textContent = '—'
  colorReading.style.color = '#f3f5f7'
  forceReading.textContent = '0 N'
  leftEncReading.textContent = '0°'
  rightEncReading.textContent = '0°'
  matrixReading.textContent = 'Idle'
  speakerReading.textContent = 'Silent'
  if (sensorText) sensorText.textContent = 'Left: — | Right: —'
})

class SpikePrimeSerialController {
  constructor(onControl, onStatus) {
    this.port = null
    this.reader = null
    this.keepReading = false
    this.onControl = onControl
    this.onStatus = onStatus
  }

  async connect() {
    if (!('serial' in navigator)) {
      throw new Error('Web Serial is not supported in this browser. Use Chrome/Edge over HTTPS or localhost.')
    }

    this.port = await navigator.serial.requestPort()
    await this.port.open({ baudRate: 115200 })
    this.keepReading = true
    this.onStatus('Hub connected (USB serial)')
    this.readLoop()
  }

  parseLine(line) {
    const value = line.trim()

    if (!value) {
      return
    }

    let throttle
    let steering

    if (value.startsWith('{')) {
      const parsed = JSON.parse(value)
      throttle = Number(parsed.throttle)
      steering = Number(parsed.steering)
    } else {
      const [throttlePart, steeringPart] = value.split(',')
      throttle = Number(throttlePart)
      steering = Number(steeringPart)
    }

    if (Number.isNaN(throttle) || Number.isNaN(steering)) {
      return
    }

    this.onControl({
      throttle: clamp(throttle / 100, -1, 1),
      steering: clamp(steering / 100, -1, 1)
    })
  }

  async readLoop() {
    const textDecoder = new TextDecoderStream()
    const readableClosed = this.port.readable.pipeTo(textDecoder.writable)
    this.reader = textDecoder.readable.getReader()

    let pending = ''

    try {
      while (this.keepReading) {
        const { value, done } = await this.reader.read()
        if (done) {
          break
        }

        pending += value
        const lines = pending.split(/\r?\n/)
        pending = lines.pop() ?? ''

        for (const line of lines) {
          this.parseLine(line)
        }
      }
    } catch (error) {
      this.onStatus(`SPIKE read error: ${error.message}`)
    } finally {
      this.reader.releaseLock()
      await readableClosed.catch(() => null)
    }
  }

  async disconnect() {
    this.keepReading = false

    if (this.reader) {
      await this.reader.cancel().catch(() => null)
      this.reader = null
    }

    if (this.port) {
      await this.port.close().catch(() => null)
      this.port = null
    }

    this.onStatus('Hub disconnected')
  }
}

const spikeController = new SpikePrimeSerialController(
  ({ throttle, steering }) => {
    input.spikeThrottle = throttle
    input.spikeSteering = steering
    input.useSpike = true
  },
  (status) => updateStatus(`Input: ${status}`)
)



_keydownHandler = (event) => {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      input.keyboardThrottle = 1
      break
    case 'KeyS':
    case 'ArrowDown':
      input.keyboardThrottle = -1
      break
    case 'KeyA':
    case 'ArrowLeft':
      input.keyboardSteering = 0.3
      break
    case 'KeyD':
    case 'ArrowRight':
      input.keyboardSteering = -0.3
      break
    case 'Space':
      input.brake = true
      break
    case 'KeyO':
      setClawTarget(true)
      break
    case 'KeyP':
      setClawTarget(false)
      break
    default:
      break
  }
}
window.addEventListener('keydown', _keydownHandler)

_keyupHandler = (event) => {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
    case 'KeyS':
    case 'ArrowDown':
      input.keyboardThrottle = 0
      break
    case 'KeyA':
    case 'ArrowLeft':
    case 'KeyD':
    case 'ArrowRight':
      input.keyboardSteering = 0
      break
    case 'Space':
      input.brake = false
      break
    default:
      break
  }
}
window.addEventListener('keyup', _keyupHandler)

const clock = new THREE.Clock()
let smoothedSteering = 0

function updateVehicle(dt) {
  const prevX = car.position.x
  const prevZ = car.position.z
  const prevHeading = vehicle.heading
  const throttle = activeThrottle()
  const rawSteering = activeSteering()
  let steering = rawSteering
  if (input.useScript && input.scriptTurning) {
    smoothedSteering = rawSteering
  } else {
    // Smoothly ramp steering toward target
    const steerSpeed = Math.abs(rawSteering) > Math.abs(smoothedSteering) ? 2.5 : 5.0
    smoothedSteering += (rawSteering - smoothedSteering) * Math.min(steerSpeed * dt, 1)
    steering = smoothedSteering
  }

  // Slippery factor: 0 = full grip, 1 = ice
  const slip = wheelSlippery / 100
  const gripFactor = 1 - slip * 0.85          // drag/brake effectiveness (1.0 → 0.15)
  const steerGripFactor = 1 - slip * 0.7      // steering responsiveness (1.0 → 0.3)

  if (Math.abs(throttle) > 0.01) {
    vehicle.speed += throttle * vehicle.acceleration * dt
  } else {
    vehicle.speed = moveTowardZero(vehicle.speed, vehicle.drag * gripFactor * dt)
  }

  if (input.brake) {
    vehicle.speed = moveTowardZero(vehicle.speed, vehicle.braking * gripFactor * dt)
  }

  vehicle.speed = clamp(vehicle.speed, -vehicle.maxReverseSpeed, vehicle.maxForwardSpeed)

  // Slow down during turns — reduce effective speed proportional to steering magnitude
  const absSteer = Math.abs(steering)
  if (absSteer > 0.05) {
    const turnSlowFactor = 1 - absSteer * 0.15  // mild slowdown during turns
    vehicle.speed *= turnSlowFactor
  }

  const steerScale = 0.35 + (Math.abs(vehicle.speed) / vehicle.maxForwardSpeed) * 0.9
  vehicle.heading += steering * vehicle.steerRate * steerGripFactor * steerScale * dt

  const nextX = car.position.x + Math.sin(vehicle.heading) * vehicle.speed * dt
  const nextZ = car.position.z + Math.cos(vehicle.heading) * vehicle.speed * dt

  const carBox = new THREE.Box3(
    new THREE.Vector3(nextX - 1.3, 0, nextZ - 0.95),
    new THREE.Vector3(nextX + 1.3, 1.3, nextZ + 0.95)
  )

  let blocked = false

  if (Math.abs(nextX) > worldLimit || Math.abs(nextZ) > worldLimit) {
    blocked = true
  }
  vehicleBlocked = blocked  // expose for force sensor

  if (!blocked) {
    for (const obstacle of obstacleBoxes) {
      if (carBox.intersectsBox(obstacle)) {
        blocked = true
        break
      }
    }
  }

  // ── Claw collider against walls & obstacles ──
  if (!blocked) {
    const S = 0.45
    const cosH = Math.cos(vehicle.heading)
    const sinH = Math.sin(vehicle.heading)
    const spread = THREE.MathUtils.lerp(claw.minSpread, claw.maxSpread, claw.openRatio)
    const jawTurn = THREE.MathUtils.lerp(0.18, 0.48, claw.openRatio)
    const clawBaseZ = 2.18
    const pivotDZ = 0.38

    // Compute claw tip points in world space at the proposed position
    function clawTipWorld(side) {
      const pivotX = side * spread / 2
      const pivotZ = clawBaseZ + pivotDZ
      const turn = side === -1 ? -jawTurn : jawTurn
      const cosT = Math.cos(turn)
      const sinT = Math.sin(turn)
      const hklx = side === -1 ? 0.18 : -0.18
      const hklz = 1.28
      const tipLX = (pivotX + cosT * hklx + sinT * hklz) * S
      const tipLZ = (pivotZ - sinT * hklx + cosT * hklz) * S
      return {
        x: nextX + cosH * tipLX + sinH * tipLZ,
        z: nextZ - sinH * tipLX + cosH * tipLZ
      }
    }

    const leftTip = clawTipWorld(-1)
    const rightTip = clawTipWorld(1)

    // Also check claw base center (top of claw frame)
    const clawFrontLZ = (clawBaseZ + pivotDZ + 1.28) * S
    const clawCenter = {
      x: nextX + sinH * clawFrontLZ,
      z: nextZ + cosH * clawFrontLZ
    }

    const clawPoints = [leftTip, rightTip, clawCenter]

    for (const pt of clawPoints) {
      if (Math.abs(pt.x) > worldLimit || Math.abs(pt.z) > worldLimit) {
        blocked = true
        break
      }
      // Check against obstacle boxes — expand point into a small box
      const ptBox = new THREE.Box3(
        new THREE.Vector3(pt.x - 0.08, 0, pt.z - 0.08),
        new THREE.Vector3(pt.x + 0.08, 1.3, pt.z + 0.08)
      )
      for (const obstacle of obstacleBoxes) {
        if (ptBox.intersectsBox(obstacle)) {
          blocked = true
          break
        }
      }
      if (blocked) break
    }
  }

  vehicleBlocked = blocked  // keep exposed flag up-to-date after all checks

  if (blocked) {
    vehicle.speed = -vehicle.speed * 0.25
  } else {
    car.position.x = nextX
    car.position.z = nextZ
  }

  const wheelSpin = (vehicle.speed * dt) / WHEEL_RADIUS_WORLD
  for (const wheel of driveWheels) {
    wheel.rotation.x -= wheelSpin
  }

  // Track encoder degrees (cumulative wheel rotation in degrees)
  const actualDx = car.position.x - prevX
  const actualDz = car.position.z - prevZ
  const movedWorld = Math.hypot(actualDx, actualDz)
  const signedCenterWorld = movedWorld > 1e-7
    ? (vehicle.speed >= 0 ? movedWorld : -movedWorld)
    : 0
  const headingDelta = Math.atan2(
    Math.sin(vehicle.heading - prevHeading),
    Math.cos(vehicle.heading - prevHeading)
  )
  const axleTrackWorld = Math.max(0.1, driveBaseAxleTrackCm / CM_PER_WORLD_UNIT)
  const leftDistWorld = signedCenterWorld - (headingDelta * axleTrackWorld) / 2
  const rightDistWorld = signedCenterWorld + (headingDelta * axleTrackWorld) / 2
  const wheelCircumferenceWorld = WHEEL_CIRCUMFERENCE_CM / CM_PER_WORLD_UNIT
  leftWheelEncoder += (leftDistWorld / wheelCircumferenceWorld) * 360
  rightWheelEncoder += (rightDistWorld / wheelCircumferenceWorld) * 360

  updateClaw(dt)
  updateCanPhysics()

  car.rotation.y = vehicle.heading

  const yaw = vehicle.heading + cameraOrbit.yawOffset
  const horizontalDistance = Math.cos(cameraOrbit.pitch) * cameraOrbit.distance
  const verticalDistance = Math.sin(cameraOrbit.pitch) * cameraOrbit.distance
  const chaseOffset = new THREE.Vector3(
    Math.sin(yaw) * horizontalDistance,
    verticalDistance,
    Math.cos(yaw) * horizontalDistance
  )

  const cameraTarget = car.position.clone().add(chaseOffset)
  camera.position.lerp(cameraTarget, 1 - Math.exp(-6 * dt))
  camera.lookAt(car.position.x, car.position.y + 0.65, car.position.z)

  const rxCm = (car.position.x * CM_PER_WORLD_UNIT).toFixed(1)
  const ryCm = (car.position.y * CM_PER_WORLD_UNIT).toFixed(1)
  const rzCm = (car.position.z * CM_PER_WORLD_UNIT).toFixed(1)
  coordsText.textContent = `Robot: X=${rxCm}  Y=${ryCm}  Z=${rzCm} cm`

  telemetry.textContent = `Speed: ${vehicle.speed.toFixed(1)} m/s | Steering: ${(steering * 100).toFixed(0)}%`

  // Update color sensor readout
  if (hasColorSensors && sensorText) {
    const lc = getLeftSensorReading()
    const rc = getRightSensorReading()
    sensorText.textContent = `Left sensor: ${lc} | Right sensor: ${rc}`
    sensorText.style.color = (lc === 'black' || rc === 'black') ? '#ffdd44' : '#f3f5f7'
  }

  // ── Update sensor readings panel ──
  const headingDeg = ((vehicle.heading * 180 / Math.PI) % 360 + 360) % 360
  gyroReading.textContent = `${headingDeg.toFixed(1)}°`

  const accelVal = Math.abs(throttle * vehicle.acceleration)
  accelReading.textContent = `${accelVal.toFixed(1)} m/s²`

  // Distance sensor: find nearest can/obstacle in front (ray-march)
  const S = 0.45
  const fwdX = Math.sin(vehicle.heading)
  const fwdZ = Math.cos(vehicle.heading)
  const sensorWorldX = car.position.x + fwdX * 2.5 * S
  const sensorWorldZ = car.position.z + fwdZ * 2.5 * S
  let minDist = 200
  // Check cans
  for (const c of cans) {
    const dx = c.group.position.x - sensorWorldX
    const dz = c.group.position.z - sensorWorldZ
    // Check if can is roughly in front (dot product)
    const dot = dx * fwdX + dz * fwdZ
    if (dot > 0) {
      const dist = Math.sqrt(dx * dx + dz * dz) * CM_PER_WORLD_UNIT
      if (dist < minDist) minDist = dist
    }
  }
  // Check obstacle boxes (buildings + maze walls) via ray stepping
  {
    const stepSize = 0.5  // world units
    const maxSteps = Math.ceil(20 / stepSize) // ~200 cm range
    for (let i = 1; i <= maxSteps; i++) {
      const px = sensorWorldX + fwdX * stepSize * i
      const pz = sensorWorldZ + fwdZ * stepSize * i
      const probe = new THREE.Box3(
        new THREE.Vector3(px - 0.1, 0, pz - 0.1),
        new THREE.Vector3(px + 0.1, MAZE_WALL_H, pz + 0.1)
      )
      let hit = false
      for (const ob of obstacleBoxes) {
        if (probe.intersectsBox(ob)) { hit = true; break }
      }
      if (hit) {
        const d = stepSize * i * CM_PER_WORLD_UNIT
        if (d < minDist) minDist = d
        break
      }
    }
  }
  distReading.textContent = minDist < 200 ? `${minDist.toFixed(0)} cm` : '> 200 cm'

  // Color sensor uses the center bottom sensor
  const colorWx = car.position.x + fwdX * 1.0 * S
  const colorWz = car.position.z + fwdZ * 1.0 * S
  const groundColor = sampleGroundColor(colorWx, colorWz)
  colorReading.textContent = groundColor
  colorReading.style.color = groundColor === 'black' ? '#ffdd44' : '#f3f5f7'

  // Force sensor (simulated - 0 unless bumping)
  const forceVal = blocked ? (Math.abs(vehicle.speed) * 1.5).toFixed(1) : '0.0'
  forceReading.textContent = `${forceVal} N`

  // Motor encoders
  leftEncReading.textContent = `${leftWheelEncoder.toFixed(0)}°`
  rightEncReading.textContent = `${rightWheelEncoder.toFixed(0)}°`

  // Static readings
  matrixReading.textContent = input.useScript ? 'Running' : 'Idle'
  speakerReading.textContent = 'Silent'
  btReading.textContent = input.useSpike ? 'Connected' : 'Disconnected'
  btReading.style.color = input.useSpike ? '#4caf50' : '#f3f5f7'
  batteryReading.textContent = '100%'
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05)
  updateVehicle(dt)
  renderer.render(scene, camera)

  // Render world axes widget in bottom-right corner
  const axesSize = 140
  const axesX = Math.max(0, app.clientWidth - axesSize)
  renderer.setViewport(axesX, 0, axesSize, axesSize)
  renderer.setScissor(axesX, 0, axesSize, axesSize)
  renderer.setScissorTest(true)
  renderer.setClearColor(0x1a1a2e, 0.75)
  renderer.clear(true, true, false)
  // Fixed elevated view that yaws with the robot heading so all 3 axes stay visible
  const axesDist = 2.8
  const axesElev = 0.95   // ~35° above horizontal
  const heading = vehicle.heading
  axesCamera.position.set(
    Math.sin(heading) * axesDist * Math.cos(axesElev),
    axesDist * Math.sin(axesElev),
    Math.cos(heading) * axesDist * Math.cos(axesElev)
  )
  axesCamera.lookAt(0, 0, 0)
  renderer.render(axesScene, axesCamera)
  renderer.setScissorTest(false)
  renderer.setViewport(0, 0, app.clientWidth, app.clientHeight)

  if (!_destroyed) _animationFrameId = requestAnimationFrame(animate)
}

animate()

_resizeHandler = () => {
  if (!app || _destroyed) return
  const w = app.clientWidth, h = app.clientHeight
  if (w === 0 || h === 0) return
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)

  if (blocklyWorkspace) {
    Blockly.svgResize(blocklyWorkspace)
  }
}
window.addEventListener('resize', _resizeHandler)

// Also observe container size changes (e.g. panels opening/closing)
_resizeObserver = new ResizeObserver(_resizeHandler)
_resizeObserver.observe(app)

} // end initSimulator
