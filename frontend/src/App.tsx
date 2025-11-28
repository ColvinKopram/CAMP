import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
//import CrimeMap from './components/crimeMap'
import LandingPage from './LandingPage'
import Mission from './Mission'
import Maps from './Maps'
import Geoguesser from './Geoguesser'
import Leaderboard from './Leaderboard'
import NotFound from './NotFound'

function App() {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />}/>
        <Route path="/mission" element={<Mission />}/>
        <Route path="/maps" element={<Maps />}/>
        <Route path="/geoguesser" element={<Geoguesser />}/>
        <Route path="/leaderboard" element={<Leaderboard />}/>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

export default App
