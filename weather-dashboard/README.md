# Weather Dashboard

A modern weather dashboard application built with React demonstrating real-time weather information.

## Features

- 🌤️ Display weather information for multiple cities
- 🔍 Search by city name (case-insensitive)
- 📊 5-day weather forecast
- 🌡️ Temperature display in Celsius
- 💨 Wind speed and humidity information
- 📱 Responsive design
- 🎨 Beautiful modern UI

## Technologies

- React.js (Hooks)
- CSS3
- Component-based architecture
- Simulated weather data

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open your browser to `http://localhost:3000`

## Building for Production

```bash
npm run build
```

## Project Structure

```
weather-dashboard/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── SearchBar.js
│   │   ├── CurrentWeather.js
│   │   └── Forecast.js
│   ├── App.js
│   ├── App.css
│   └── index.js
├── package.json
└── README.md
```

## Note

This demo uses simulated static weather data for demonstration purposes. To use real weather data, obtain an API key from a weather service provider like OpenWeatherMap and integrate it into the application.
