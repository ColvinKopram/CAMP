// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell
} from "recharts";

const CrimeGeoGuesser = () => {
  const [ws, setWs] = useState(null);
  const [gameState, setGameState] = useState('menu');
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [players, setPlayers] = useState({});
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(3);
  const [streetViewUrl, setStreetViewUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [hasGuessed, setHasGuessed] = useState(false);
  const [roundResults, setRoundResults] = useState(null);
  const [actualLocation, setActualLocation] = useState(null);
  const [myGuess, setMyGuess] = useState(null);
  const [finalScores, setFinalScores] = useState(null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [crimeStats, setCrimeStats] = useState([]);
  const [zipCode, setZipCode] = useState('');
  
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected, skipping...');
      return;
    }
    
    if (wsRef.current) {
      console.log('Old WebSocket exists but not open, cleaning up...');
      try {
        wsRef.current.close();
      } catch (e) {
        console.log('Error closing old socket:', e);
      }
      wsRef.current = null;
    }

    console.log('Creating new WebSocket connection...');
    const socket = new WebSocket('ws://localhost:8080/socket.io/?EIO=4&transport=websocket');
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket opened');
      setWs(socket);
    };

    socket.onmessage = (event) => {
      try {
        const message = event.data;
        console.log('Received raw message:', message);
        if (message.startsWith('42')) {
          const jsonStr = message.substring(2);
          const [eventName, data] = JSON.parse(jsonStr);
          handleSocketEvent(eventName, data);
        } else if (message.startsWith('0')) {
          console.log('SocketIO handshake complete - NOW CONNECTED');
          setConnected(true);
          console.log('Joining default namespace...');
          socket.send('40');
        } else if (message.startsWith('2')) {
          console.log('Received ping, sending pong');
          socket.send('3');
        } else if (message.startsWith('40')) {
          console.log('Connected to namespace - READY TO SEND EVENTS');
          setConnected(true);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error');
    };

    socket.onclose = () => {
      console.log('Disconnected from server');
      setConnected(false);
      wsRef.current = null;
    };

    return () => {
      console.log('Cleaning up WebSocket connection');
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
      wsRef.current = null;
    };
  }, []);

  const sendSocketEvent = (eventName, data) => {
    console.log('Attempting to send event:', eventName, data);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = `42${JSON.stringify([eventName, data])}`;
      console.log('Sending message:', message);
      wsRef.current.send(message);
    } else {
      console.error('WebSocket not ready. State:', wsRef.current?.readyState);
      setError('Not connected to server. Please refresh the page.');
    }
  };

  const handleSocketEvent = (eventName, data) => {
    console.log('Received event:', eventName, data);

    switch(eventName) {
      case 'connected':
        console.log('Server acknowledged connection');
        break;

      case 'room_created':
        setRoomCode(data.room_code);
        setPlayerId(data.player_id);
        setGameState('lobby');
        setError('');
        break;

      case 'room_joined':
        setRoomCode(data.room_code);
        setPlayerId(data.player_id);
        setGameState('lobby');
        setError('');
        break;

      case 'player_joined':
        setPlayers(data.players);
        break;

      case 'ready_to_start':
        break;

      case 'round_start':
        console.log('Round starting, cleaning up old map...');
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {
            console.log('Error removing old map:', e);
          }
          mapInstanceRef.current = null;
          markerRef.current = null;
        }
        
        setGameState('playing');
        setCurrentRound(data.round);
        setTotalRounds(data.total_rounds);
        setStreetViewUrl(data.location.street_view_url);
        setCrimeStats(data.location.crime_stats || []);
        setZipCode(data.location.zip_code || '');
        setTimeLeft(30);
        setHasGuessed(false);
        setMyGuess(null);
        setRoundResults(null);
        setActualLocation(null);
        setImageError(false);
        
        setTimeout(() => {
          console.log('Initializing map for new round...');
          initMap();
        }, 100);
        break;

      case 'round_end':
        console.log('Round ended, showing results...');
        setGameState('round_end');
        setRoundResults(data.results);
        setActualLocation(data.actual_location);
        
        setTimeout(() => {
          if (mapInstanceRef.current && data.actual_location && window.L) {
            const L = window.L;
            
            try {
              if (markerRef.current) {
                mapInstanceRef.current.removeLayer(markerRef.current);
                markerRef.current = null;
              }
              
              const actualMarker = L.marker([data.actual_location.latitude, data.actual_location.longitude], {
                icon: L.icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                })
              }).addTo(mapInstanceRef.current);
              actualMarker.bindPopup('Actual Crime Location').openPopup();
              
              data.results.forEach((result) => {
                const guessLat = result.guess.latitude;
                const guessLng = result.guess.longitude;
                const actualLat = data.actual_location.latitude;
                const actualLng = data.actual_location.longitude;
                const isCurrentPlayer = result.player_id === playerId;
                
                console.log('Adding marker for:', result.player_name, 'isCurrentPlayer:', isCurrentPlayer);
                
                L.polyline(
                  [[guessLat, guessLng], [actualLat, actualLng]],
                  {
                    color: '#3B82F6',
                    weight: 3,
                    opacity: 0.7,
                    dashArray: '10, 10',
                  }
                ).addTo(mapInstanceRef.current);
                
                const markerColor = isCurrentPlayer ? 'blue' : 'green';
                console.log('Marker color:', markerColor, 'for', result.player_name);
                
                const guessMarker = L.marker([guessLat, guessLng], {
                  icon: L.icon({
                    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  })
                }).addTo(mapInstanceRef.current);
                
                guessMarker.bindPopup(`${result.player_name}'s guess`);
                
                if (isCurrentPlayer) {
                  console.log('Adding YOU label for current player');
                  const labelMarker = L.marker([guessLat, guessLng], {
                    icon: L.divIcon({
                      className: 'you-label',
                      html: '<div style="background-color: #3B82F6; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 14px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); text-align: center; border: 2px solid white;">You</div>',
                      iconSize: [60, 30],
                      iconAnchor: [30, 60]
                    })
                  }).addTo(mapInstanceRef.current);
                  console.log('YOU label added');
                }
              });
              
              const bounds = L.latLngBounds([
                [data.actual_location.latitude, data.actual_location.longitude],
                ...data.results.map(r => [r.guess.latitude, r.guess.longitude])
              ]);
              mapInstanceRef.current.fitBounds(bounds, { padding: [80, 80] });
              
            } catch (e) {
              console.log('Error adding round end markers:', e);
            }
          }
        }, 100);
        break;

      case 'game_end':
        setGameState('game_end');
        setFinalScores(data.final_scores);
        break;

      case 'player_left':
        setError(data.message);
        if (data.players) {
          setPlayers(data.players);
        }
        if (gameState !== 'lobby') {
          setTimeout(() => {
            setError('');
          }, 5000);
        }
        break;

      case 'room_closed':
        setError(data.message);
        setTimeout(() => {
          backToMenu();
        }, 2000);
        break;

      case 'error':
        setError(data.message);
        break;
    }
  };

  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0 && !hasGuessed) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, timeLeft, hasGuessed]);

  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'round_end') return;

    if (window.L) {
      initMap();
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    script.onload = () => initMap();
    document.head.appendChild(script);
  }, [gameState]);

  const initMap = () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const L = window.L;
    if (!L) return;

    const map = L.map(mapRef.current).setView([40.7128, -74.0060], 11);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    map.on('click', (e) => {
      if (hasGuessed || gameState !== 'playing') return;

      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }

      const marker = L.marker([e.latlng.lat, e.latlng.lng], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }).addTo(map);
      markerRef.current = marker;
    });
  };

  const createRoom = () => {
    console.log('Create room clicked, player name:', playerName);
    console.log('Connected status:', connected);
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!connected) {
      setError('Still connecting... please wait a moment');
      return;
    }
    console.log('Sending create_room event...');
    sendSocketEvent('create_room', { player_name: playerName });
  };

  const joinRoom = () => {
    if (!playerName.trim() || !roomCode.trim()) {
      setError('Please enter your name and room code');
      return;
    }
    sendSocketEvent('join_room', { room_code: roomCode, player_name: playerName });
  };

  const startGame = () => {
    sendSocketEvent('start_game', { room_code: roomCode });
  };

  const submitGuess = () => {
    if (!markerRef.current) {
      setError('Please click on the map to make a guess');
      return;
    }

    const latlng = markerRef.current.getLatLng();
    setMyGuess(latlng);
    setHasGuessed(true);
    
    if (markerRef.current && mapInstanceRef.current && window.L) {
      const L = window.L;
      
      mapInstanceRef.current.off('click');
      
      if (markerRef.current.dragging) {
        markerRef.current.dragging.disable();
      }
      
      const youLabel = L.marker([latlng.lat, latlng.lng], {
        icon: L.divIcon({
          className: 'you-label',
          html: '<div style="background-color: #3B82F6; color: white; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 14px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.3); text-align: center; border: 2px solid white;">You</div>',
          iconSize: [60, 30],
          iconAnchor: [30, 60]
        })
      }).addTo(mapInstanceRef.current);
      
      console.log('✓ Added YOU label to locked marker');
    }
    
    sendSocketEvent('submit_guess', {
      room_code: roomCode,
      latitude: latlng.lat,
      longitude: latlng.lng
    });
  };

  const nextRound = () => {
    sendSocketEvent('ready_for_next_round', { room_code: roomCode });
  };

  const backToMenu = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (e) {
        console.log('Error cleaning up map:', e);
      }
      mapInstanceRef.current = null;
    }
    setGameState('menu');
    setRoomCode('');
    setPlayerName('');
    setError('');
    setPlayers({});
    setRoundResults(null);
    setFinalScores(null);
    setHasGuessed(false);
    setMyGuess(null);
    setActualLocation(null);
  };

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">NYC Crime GeoGuesser</h1>
          <p className="text-center text-gray-600 mb-6">Guess the crime location!</p>
          
          <div className="mb-4 text-center">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${connected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {connected ? '🟢 Connected' : '🟡 Connecting...'}
            </span>
          </div>
          
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          
          <button
            onClick={createRoom}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mb-3 transition"
          >
            Create Room
          </button>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>
          
          <input
            type="text"
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          
          <button
            onClick={joinRoom}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'lobby') {
    const playerCount = Object.keys(players).length;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-3xl font-bold text-center mb-4 text-gray-800">Room: {roomCode}</h2>
          <p className="text-center text-gray-600 mb-6">Share this code with your friend!</p>
          
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <h3 className="font-bold mb-2 text-gray-700">Players ({playerCount}/2):</h3>
            {Object.values(players).map((player, idx) => (
              <div key={idx} className="flex items-center mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-800">{player.name}</span>
                {idx === 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Host</span>}
              </div>
            ))}
            {playerCount < 2 && (
              <div className="flex items-center mb-2 text-gray-400">
                <div className="w-3 h-3 border-2 border-gray-400 rounded-full mr-2"></div>
                <span className="italic">Waiting for player...</span>
              </div>
            )}
          </div>
          
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          
          {playerCount === 2 ? (
            <button
              onClick={startGame}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
            >
              Start Game
            </button>
          ) : (
            <p className="text-center text-gray-600">Waiting for opponent...</p>
          )}
          
          <button
            onClick={backToMenu}
            className="w-full mt-3 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 rounded-lg transition"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <div className="text-xl font-bold">Round {currentRound}/{totalRounds}</div>
          <div className={`text-2xl font-bold ${timeLeft < 10 ? 'text-red-500' : ''}`}>
            ⏱️ {timeLeft}s
          </div>
          <div className="text-lg">Room: {roomCode}</div>
        </div>
        
        <div className="flex-1 flex">
          <div className="w-1/2 flex flex-col">
            <div className="h-1/2 bg-black flex items-center justify-center border-b-2 border-gray-700">
              {streetViewUrl && streetViewUrl !== '' && !imageError ? (
                <img 
                  src={streetViewUrl} 
                  alt="Street View" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error('Street View image failed to load:', streetViewUrl);
                    setImageError(true);
                  }}
                  onLoad={() => console.log('Street View image loaded successfully')}
                />
              ) : (
                <div className="text-white text-center p-8">
                  <div className="bg-gray-800 rounded-lg p-12">
                    <p className="text-xl mb-4">🗽 Street View</p>
                    <p className="text-sm text-gray-400">
                      {imageError 
                        ? 'Failed to load Street View image - check API key' 
                        : streetViewUrl === ''
                        ? 'No API key configured'
                        : 'Loading...'}
                    </p>
                    {imageError && (
                      <p className="text-xs text-gray-500 mt-2">
                        Check browser console for details
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="h-1/2 bg-black p-4 text-white">
            <h2 className="text-center text-xl font-bold mb-3">
              Crime Distribution in ZIP {zipCode}
            </h2>

            {crimeStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={crimeStats}  style={{ backgroundColor: "#000000" }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                  <XAxis dataKey="crime_type" stroke="#ccc" tick={{ fill: "#ccc" }} />
                  <YAxis stroke="#ccc" tick={{ fill: "#ccc" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#222", border: "1px solid #555" }}
                    labelStyle={{ color: "#fff" }}
                  />
                  <Legend wrapperStyle={{ color: "#ccc" }} />
                  
                  <Bar dataKey="count" name="Incidents">
  {crimeStats.map((entry, index) => (
    <Cell key={`cell-${index}`} fill={entry.color} />
  ))}
</Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-400 mt-8">
                No crime data available...
              </div>
            )}
          </div>
          </div>
          
          <div className="w-1/2 relative">
            <div ref={mapRef} className="w-full h-full"></div>
            
            {!hasGuessed && (
              <button
                onClick={submitGuess}
                className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition z-[1000]"
              >
                Submit Guess
              </button>
            )}
            {hasGuessed && (
              <div className="absolute bottom-4 right-4 bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg z-[1000]">
                ✓ Guess Locked - Waiting for opponent...
              </div>
            )}
            {hasGuessed && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg z-[1000]">
                <p className="text-sm">Your guess is locked!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'round_end') {
    return (
      <div className="h-screen flex flex-col bg-gray-900">
        <div className="bg-gray-800 text-white p-4 text-center">
          <h2 className="text-2xl font-bold">Round {currentRound} Results</h2>
          <p className="text-sm mt-2 text-gray-400">Review the results and click Next Round when ready</p>
        </div>
        
        <div className="flex-1 flex">
          <div className="w-1/2 bg-gray-800 text-white p-8 overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Scores:</h3>
            {roundResults && roundResults.map((result, idx) => (
              <div key={idx} className={`rounded-lg p-4 mb-4 ${result.player_id === playerId ? 'bg-blue-700' : 'bg-gray-700'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg">{result.player_name}</span>
                  <span className={result.player_id === playerId ? 'text-yellow-400' : ''}>
                    {result.player_id === playerId ? '(You)' : ''}
                  </span>
                </div>
                <div className="text-sm">
                  <p>Distance: {result.distance_km} km</p>
                  <p className="text-green-400">Round Score: +{result.round_score}</p>
                  <p className="text-xl font-bold mt-2">Total: {result.total_score}</p>
                </div>
              </div>
            ))}
            
            <button
              onClick={nextRound}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-4 transition"
            >
              {currentRound >= totalRounds ? 'View Final Results' : 'Next Round →'}
            </button>
            
            <p className="text-center text-sm text-gray-400 mt-3">
              Either player can advance when ready
            </p>
          </div>
          
          <div className="w-1/2 relative">
            <div ref={mapRef} className="w-full h-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'game_end') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-800">Game Over!</h2>
          
          {finalScores && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-lg p-6 mb-4 text-center">
                <p className="text-2xl font-bold text-white">🏆 Winner 🏆</p>
                <p className="text-3xl font-bold text-white mt-2">{finalScores[0].player_name}</p>
                <p className="text-xl text-white">{finalScores[0].score} points</p>
              </div>
              
              <div className="bg-gray-100 rounded-lg p-4">
                <h3 className="font-bold mb-2 text-gray-700">Final Scores:</h3>
                {finalScores.map((player, idx) => (
                  <div key={idx} className="flex justify-between items-center mb-2">
                    <span className="text-gray-800">{idx + 1}. {player.player_name}</span>
                    <span className="font-bold text-gray-800">{player.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <button
            onClick={backToMenu}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default CrimeGeoGuesser;