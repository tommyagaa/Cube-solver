import type { CubeState, Face } from '../lib/cube/types'
import '../App.css'

type CubeNetProps = {
  state: CubeState
  onStickerClick?: (face: Face, index: number) => void
}

const faceOrder: Face[] = ['U', 'L', 'F', 'R', 'B', 'D']

const CubeNet = ({ state, onStickerClick }: CubeNetProps) => {
  return (
    <div className="cube-net">
      {faceOrder.map((face) => (
        <div key={face} className={`face face-${face}`}>
          <p className="face-label">{face}</p>
          <div className="grid">
            {state[face].map((color, idx) => (
              <button
                key={idx}
                className="sticker"
                style={{ backgroundColor: color }}
                type="button"
                aria-label={`${face} sticker ${idx}`}
                onClick={() => onStickerClick?.(face, idx)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default CubeNet