import React from 'react';

function Forecast({ forecast }) {
  return (
    <div className="forecast">
      <h2 className="forecast-title">5-Day Forecast</h2>
      <div className="forecast-list">
        {forecast.map((day) => (
          <div key={`${day.day}-${day.temp}-${day.condition}`} className="forecast-item">
            <div className="forecast-day">{day.day}</div>
            <div className="forecast-temp">{day.temp}°C</div>
            <div className="forecast-condition">{day.condition}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Forecast;
