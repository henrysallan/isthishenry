import './App.css'
import Scene from './components/Scene'

function App() {
  return (
    <div className="App">
      <h1>isthishenry</h1>
      <p>React + Vite + Three.js Portfolio</p>
      <div style={{ width: '100vw', height: '100vh' }}>
        <Scene />
      </div>
    </div>
  )
}

export default App
