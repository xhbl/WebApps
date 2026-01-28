import React from 'react';

function CurrentWeather({ weather }) {
  const { city, country, temp, condition, humidity, windSpeed } = weather;

  return (
    <div className="current-weather">
      <div className="location">
        {city}, {country}
      </div>
      <div className="weather-main">
        <div>
          <div className="temperature">{temp}°C</div>
          <div className="condition">{condition}</div>
        </div>
      </div>
      <div className="weather-details">
        <div className="detail-item">
          <div className="detail-label">Humidity</div>
          <div className="detail-value">{humidity}%</div>
        </div>
        <div className="detail-item">
          <div className="detail-label">Wind Speed</div>
          <div className="detail-value">{windSpeed} km/h</div>
        </div>
      </div>
    </div>
  );
}

export default CurrentWeather;
