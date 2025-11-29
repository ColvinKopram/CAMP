
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css'
import LandingPage from './pages/LandingPage'
import CrimeGeoGuesser from './pages/CrimeGeoGuesser'
function App() {  

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/crime_guesser" element={<CrimeGeoGuesser />} />
      </Routes>
    </Router>
  )
}

export default App
