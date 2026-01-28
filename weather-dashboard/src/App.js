import React, { useState } from 'react';
import './App.css';
import SearchBar from './components/SearchBar';
import CurrentWeather from './components/CurrentWeather';
import Forecast from './components/Forecast';

// Simulated weather data
const weatherData = {
  'London': {
    city: 'London',
    country: 'UK',
    temp: 15,
    condition: 'Cloudy',
    humidity: 72,
    windSpeed: 18,
    forecast: [
      { day: 'Mon', temp: 16, condition: 'Rainy' },
      { day: 'Tue', temp: 14, condition: 'Cloudy' },
      { day: 'Wed', temp: 17, condition: 'Sunny' },
      { day: 'Thu', temp: 15, condition: 'Cloudy' },
      { day: 'Fri', temp: 13, condition: 'Rainy' }
    ]
  },
  'New York': {
    city: 'New York',
    country: 'USA',
    temp: 22,
    condition: 'Sunny',
    humidity: 55,
    windSpeed: 12,
    forecast: [
      { day: 'Mon', temp: 23, condition: 'Sunny' },
      { day: 'Tue', temp: 25, condition: 'Sunny' },
      { day: 'Wed', temp: 21, condition: 'Cloudy' },
      { day: 'Thu', temp: 19, condition: 'Rainy' },
      { day: 'Fri', temp: 20, condition: 'Cloudy' }
    ]
  },
  'Tokyo': {
    city: 'Tokyo',
    country: 'Japan',
    temp: 18,
    condition: 'Partly Cloudy',
    humidity: 65,
    windSpeed: 15,
    forecast: [
      { day: 'Mon', temp: 19, condition: 'Sunny' },
      { day: 'Tue', temp: 20, condition: 'Sunny' },
      { day: 'Wed', temp: 18, condition: 'Cloudy' },
      { day: 'Thu', temp: 17, condition: 'Rainy' },
      { day: 'Fri', temp: 19, condition: 'Partly Cloudy' }
    ]
  },
  'Paris': {
    city: 'Paris',
    country: 'France',
    temp: 16,
    condition: 'Sunny',
    humidity: 60,
    windSpeed: 10,
    forecast: [
      { day: 'Mon', temp: 17, condition: 'Sunny' },
      { day: 'Tue', temp: 18, condition: 'Partly Cloudy' },
      { day: 'Wed', temp: 16, condition: 'Cloudy' },
      { day: 'Thu', temp: 15, condition: 'Rainy' },
      { day: 'Fri', temp: 17, condition: 'Sunny' }
    ]
  }
};

function App() {
  const [weather, setWeather] = useState(weatherData['London']);
  const [error, setError] = useState('');

  const handleSearch = (city) => {
    // Case-insensitive search
    const cityKey = Object.keys(weatherData).find(
      key => key.toLowerCase() === city.toLowerCase()
    );
    
    if (cityKey) {
      setWeather(weatherData[cityKey]);
      setError('');
    } else {
      setError('City not found. Try: London, New York, Tokyo, or Paris');
    }
  };

  return (
    <div className="App">
      <div className="weather-container">
        <h1 className="app-title">🌤️ Weather Dashboard</h1>
        <SearchBar onSearch={handleSearch} />
        {error && <div className="error-message">{error}</div>}
        {!error && weather && (
          <>
            <CurrentWeather weather={weather} />
            <Forecast forecast={weather.forecast} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
