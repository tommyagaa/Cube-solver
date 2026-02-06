import { useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { CubeState, Face, Move, MoveModifier } from '../lib/cube/types'
import { cloneCube } from '../lib/cube/state'
import { applyMove } from '../lib/cube/moves'

const COLOR_MAP: Record<string, string> = {
  white: '#f8fafc',
  yellow: '#fde047',
  green: '#22c55e',
  blue: '#3b82f6',
  orange: '#fb923c',
  red: '#f43f5e',
  neutral: '#0f172a',
}

const GRID_STEP = 0.92
const STICKER_SIZE = 0.88
const HALF_CUBE = 1.5
const EPSILON = 0.01
const BASE_ANIMATION_MS = 260

const AXIS_INDEX: Record<'x' | 'y' | 'z', number> = {
  x: 0,
  y: 1,
  z: 2,
}

type FaceBasis = {
  normal: THREE.Vector3
  up: THREE.Vector3
  right: THREE.Vector3
  axis: 'x' | 'y' | 'z'
}

const FACE_BASES: Record<Face, FaceBasis> = {
  U: {
    normal: new THREE.Vector3(0, 1, 0),
    up: new THREE.Vector3(0, 0, -1),
    right: new THREE.Vector3(1, 0, 0),
    axis: 'y',
  },
  D: {
    normal: new THREE.Vector3(0, -1, 0),
    up: new THREE.Vector3(0, 0, 1),
    right: new THREE.Vector3(1, 0, 0),
    axis: 'y',
  },
  F: {
    normal: new THREE.Vector3(0, 0, 1),
    up: new THREE.Vector3(0, 1, 0),
    right: new THREE.Vector3(1, 0, 0),
    axis: 'z',
  },
  B: {
    normal: new THREE.Vector3(0, 0, -1),
    up: new THREE.Vector3(0, 1, 0),
    right: new THREE.Vector3(-1, 0, 0),
    axis: 'z',
  },
  R: {
    normal: new THREE.Vector3(1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    right: new THREE.Vector3(0, 0, -1),
    axis: 'x',
  },
  L: {
    normal: new THREE.Vector3(-1, 0, 0),
    up: new THREE.Vector3(0, 1, 0),
    right: new THREE.Vector3(0, 0, 1),
    axis: 'x',
  },
}

type FaceRotationConfig = {
  axis: 'x' | 'y' | 'z'
  layerValue: number
  cwSign: 1 | -1
}

const FACE_ROTATION_CONFIG: Record<Face, FaceRotationConfig> = {
  U: { axis: 'y', layerValue: HALF_CUBE, cwSign: -1 },
  D: { axis: 'y', layerValue: -HALF_CUBE, cwSign: 1 },
  F: { axis: 'z', layerValue: HALF_CUBE, cwSign: -1 },
  B: { axis: 'z', layerValue: -HALF_CUBE, cwSign: 1 },
  R: { axis: 'x', layerValue: HALF_CUBE, cwSign: -1 },
  L: { axis: 'x', layerValue: -HALF_CUBE, cwSign: 1 },
}

type StickerEntry = {
  face: Face
  index: number
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  axis: 'x' | 'y' | 'z'
  layerValue: number
  material: THREE.MeshBasicMaterial
}

type Cube3DProps = {
  state: CubeState
  moveFeedVersion: number
  moveQueueRef: MutableRefObject<Move[]>
}

type ParsedMove = {
  face: Face
  turns: number
  direction: 1 | -1
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

const parseMove = (move: Move): ParsedMove => {
  const face = move[0] as Face
  const modifier = (move.slice(1) as MoveModifier) || ''
  const turns = modifier === '2' ? 2 : 1
  const direction: 1 | -1 = modifier === "'" ? -1 : 1
  return { face, turns, direction }
}

const getColorHex = (colorName: string) => {
  return COLOR_MAP[colorName] ?? COLOR_MAP.neutral
}

type ViewerStatus = 'loading' | 'ready' | 'unsupported' | 'error'

const isWebGLSupported = () => {
  if (typeof document === 'undefined') {
    return false
  }
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  return Boolean(context)
}

const Cube3D = ({ state, moveFeedVersion, moveQueueRef }: Cube3DProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const cubeGroupRef = useRef<THREE.Group | null>(null)
  const stickerEntriesRef = useRef<StickerEntry[]>([])
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const resizeHandlerRef = useRef<(() => void) | null>(null)
  const pendingMovesRef = useRef<Move[]>([])
  const isAnimatingRef = useRef(false)
  const latestStateRef = useRef(cloneCube(state))
  const displayedStateRef = useRef(cloneCube(state))
  const animationFrameRef = useRef<number | null>(null)
  const [viewerStatus, setViewerStatus] = useState<ViewerStatus>('loading')
  const [viewerMessage, setViewerMessage] = useState('Inizializzazione vista 3D...')
  const [initAttempt, setInitAttempt] = useState(0)
  const pointerCleanupRef = useRef<(() => void) | null>(null)

  const cleanupAnimationFrame = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  const applyColors = (cubeState: CubeState) => {
    stickerEntriesRef.current.forEach(({ face, index, material }) => {
      const nextColor = cubeState[face][index]
      material.color.set(getColorHex(nextColor))
    })
  }

  const syncDisplayedState = (cubeState: CubeState) => {
    displayedStateRef.current = cloneCube(cubeState)
    applyColors(displayedStateRef.current)
  }

  const buildStickers = (group: THREE.Group) => {
    const entries: StickerEntry[] = []
    const geometry = new THREE.PlaneGeometry(STICKER_SIZE, STICKER_SIZE)

    ;(Object.keys(FACE_BASES) as Face[]).forEach((face) => {
      const basis = FACE_BASES[face]
      for (let index = 0; index < 9; index += 1) {
        const row = Math.floor(index / 3)
        const col = index % 3
        const localX = (col - 1) * GRID_STEP
        const localY = (1 - row) * GRID_STEP
        const position = new THREE.Vector3()
          .copy(basis.normal)
          .multiplyScalar(HALF_CUBE)
          .add(basis.right.clone().multiplyScalar(localX))
          .add(basis.up.clone().multiplyScalar(localY))

        const rotationMatrix = new THREE.Matrix4().makeBasis(basis.right, basis.up, basis.normal)
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix)

        const material = new THREE.MeshBasicMaterial({ color: COLOR_MAP.neutral, side: THREE.FrontSide })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.copy(position)
        mesh.quaternion.copy(quaternion)

        group.add(mesh)

        const axisIndex = AXIS_INDEX[basis.axis]
        entries.push({
          face,
          index,
          mesh,
          axis: basis.axis,
          layerValue: position.getComponent(axisIndex),
          material,
        })
      }
    })

    stickerEntriesRef.current = entries
  }

  const attachCanvasInteractions = () => {
    const container = containerRef.current
    const renderer = rendererRef.current
    if (!container || !renderer) {
      return
    }
    const canvas = renderer.domElement
    canvas.style.cursor = 'grab'
    const handlePointerDown = () => container.classList.add('dragging')
    const handlePointerUp = () => container.classList.remove('dragging')
    canvas.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)
    pointerCleanupRef.current = () => {
      canvas.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      container.classList.remove('dragging')
    }
  }

  const initializeScene = (): ViewerStatus => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      setViewerStatus('error')
      setViewerMessage('La vista 3D è disponibile solo nel browser.')
      return 'error'
    }
    if (!isWebGLSupported()) {
      setViewerStatus('unsupported')
      setViewerMessage('WebGL non è supportato o è disattivato nel browser: abilitalo per vedere il cubo 3D.')
      return 'unsupported'
    }
    if (!containerRef.current) {
      return 'error'
    }
    try {
      const width = containerRef.current.clientWidth || 480
      const height = containerRef.current.clientHeight || 360

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.setSize(width, height)
      containerRef.current.appendChild(renderer.domElement)
      rendererRef.current = renderer

      const scene = new THREE.Scene()
      scene.background = new THREE.Color('#020617')
      sceneRef.current = scene

      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
      camera.position.set(6, 5, 6)
      cameraRef.current = camera

      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.target.set(0, 0, 0)
      controls.minDistance = 4
      controls.maxDistance = 12
      controlsRef.current = controls

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.85)
      scene.add(ambientLight)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.35)
      directionalLight.position.set(6, 8, 4)
      scene.add(directionalLight)

      const cubeGroup = new THREE.Group()
      scene.add(cubeGroup)
      cubeGroupRef.current = cubeGroup

      buildStickers(cubeGroup)
      syncDisplayedState(state)

      setViewerStatus('ready')
      setViewerMessage('')
      attachCanvasInteractions()

      renderer.setAnimationLoop(() => {
        controls.update()
        renderer.render(scene, camera)
      })

      if (typeof ResizeObserver !== 'undefined') {
        const resizeObserver = new ResizeObserver(([entry]) => {
          const { width: nextWidth, height: nextHeight } = entry.contentRect
          if (cameraRef.current && rendererRef.current) {
            cameraRef.current.aspect = nextWidth / nextHeight
            cameraRef.current.updateProjectionMatrix()
            rendererRef.current.setSize(nextWidth, nextHeight)
          }
        })
        resizeObserver.observe(containerRef.current)
        resizeObserverRef.current = resizeObserver
      } else {
        const resizeHandler = () => {
          if (!containerRef.current || !cameraRef.current || !rendererRef.current) {
            return
          }
          const { clientWidth: nextWidth, clientHeight: nextHeight } = containerRef.current
          cameraRef.current.aspect = nextWidth / nextHeight
          cameraRef.current.updateProjectionMatrix()
          rendererRef.current.setSize(nextWidth, nextHeight)
        }
        window.addEventListener('resize', resizeHandler)
        resizeHandlerRef.current = () => window.removeEventListener('resize', resizeHandler)
      }

      return 'ready'
    } catch (error) {
      console.error('Impossibile inizializzare la scena 3D', error)
      setViewerStatus('error')
      setViewerMessage('Errore durante l’inizializzazione 3D. Aggiorna la pagina o riprova più tardi.')
      return 'error'
    }
  }

  const rotateLayer = (move: Move): Promise<void> => {
    return new Promise((resolve) => {
      const parsed = parseMove(move)
      const config = FACE_ROTATION_CONFIG[parsed.face]
      const cubeGroup = cubeGroupRef.current
      if (!config || !cubeGroup) {
        resolve()
        return
      }

      const targetStickers = stickerEntriesRef.current.filter((entry) => {
        return Math.abs(entry.layerValue - config.layerValue) < EPSILON
      })

      if (!targetStickers.length) {
        resolve()
        return
      }

      const rotationGroup = new THREE.Group()
      cubeGroup.add(rotationGroup)
      targetStickers.forEach((entry) => {
        rotationGroup.attach(entry.mesh)
      })

      const baseAngle = (Math.PI / 2) * parsed.turns
      const targetAngle = baseAngle * parsed.direction * config.cwSign
      const duration = BASE_ANIMATION_MS * parsed.turns
      const start = performance.now()

      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1)
        const eased = easeOutCubic(progress)
        rotationGroup.rotation[config.axis] = targetAngle * eased
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(step)
        } else {
          cleanupAnimationFrame()
          rotationGroup.rotation[config.axis] = 0
          while (rotationGroup.children.length) {
            cubeGroup.attach(rotationGroup.children[0])
          }
          cubeGroup.remove(rotationGroup)
          resolve()
        }
      }

      animationFrameRef.current = requestAnimationFrame(step)
    })
  }

  const processQueue = async () => {
    if (isAnimatingRef.current) {
      return
    }
    const nextMove = pendingMovesRef.current.shift()
    if (!nextMove) {
      syncDisplayedState(latestStateRef.current)
      return
    }
    isAnimatingRef.current = true
    await rotateLayer(nextMove)
    const nextDisplayState = applyMove(displayedStateRef.current, nextMove)
    displayedStateRef.current = nextDisplayState
    applyColors(displayedStateRef.current)
    isAnimatingRef.current = false
    processQueue()
  }

  useEffect(() => {
    setViewerStatus('loading')
    setViewerMessage('Inizializzazione vista 3D...')
    const status = initializeScene()
    if (status === 'error') {
      setViewerStatus('error')
      setViewerMessage('Impossibile avviare il renderer 3D. Riprova a ricaricare la pagina o usa un browser compatibile.')
    }
    return () => {
      cleanupAnimationFrame()
      resizeObserverRef.current?.disconnect()
      resizeHandlerRef.current?.()
      pointerCleanupRef.current?.()
      if (rendererRef.current) {
        rendererRef.current.setAnimationLoop(null)
        const canvasElement = rendererRef.current.domElement
        rendererRef.current.dispose()
        if (canvasElement?.parentNode) {
          canvasElement.parentNode.removeChild(canvasElement)
        }
      }
      stickerEntriesRef.current = []
      sceneRef.current?.clear()
      rendererRef.current = null
      sceneRef.current = null
      cameraRef.current = null
      controlsRef.current = null
      cubeGroupRef.current = null
      pendingMovesRef.current = []
      isAnimatingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initAttempt])

  useEffect(() => {
    latestStateRef.current = cloneCube(state)
    if (!isAnimatingRef.current && pendingMovesRef.current.length === 0) {
      syncDisplayedState(state)
    }
  }, [state])

  useEffect(() => {
    const queue = moveQueueRef.current
    if (!queue.length) {
      return
    }
    pendingMovesRef.current.push(...queue.splice(0))
    processQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveFeedVersion])

  return (
    <div className={`cube-3d-panel ${viewerStatus}`} ref={containerRef}>
      {viewerStatus !== 'ready' && (
        <div className="cube-3d-overlay">
          <p className="cube-3d-message">{viewerMessage}</p>
          {viewerStatus === 'error' && (
            <button
              type="button"
              className="cube-3d-retry"
              onClick={() => setInitAttempt((prev) => prev + 1)}
            >
              Riprova
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default Cube3D
