import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const Icon = ({ address, hub }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const tomtomApiKey = 'yEUe2tq2wA9cUsyryFi2D7T32akU1UGW'; 

  useEffect(() => {
    
    mapRef.current = L.map('map', {
      center: [0, 0], 
      zoom: 2, 
      layers: [
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
      ]
    });

    setMap(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (map) {
      
      const getCoordinates = async (location) => {
        const response = await fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(location)}.json?key=${tomtomApiKey}`);
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const { lat, lon } = data.results[0].position;
          return { lat, lon };
        } else {
          throw new Error('Address not found');
        }
      };

      
      const getAllRoutes = async (start, end) => {
        const response = await fetch(`https://api.tomtom.com/routing/1/calculateRoute/${start.lat},${start.lon}:${end.lat},${end.lon}/json?key=${tomtomApiKey}&maxAlternatives=2&routeType=shortest`);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          return data.routes.map(route => ({
            points: route.legs[0].points.map(point => [point.latitude, point.longitude]),
            duration: route.summary.travelTimeInSeconds
          }));
        } else {
          throw new Error('Routes not found');
        }
      };

      
      const updateMap = async () => {
        try {
          const addressCoords = await getCoordinates(address);
          const hubCoords = await getCoordinates(hub);

          map.setView([addressCoords.lat, addressCoords.lon], 12);

          
          L.marker([addressCoords.lat, addressCoords.lon], {
            icon: L.icon({
              iconUrl: process.env.PUBLIC_URL + '/Images/address-icon.svg',
              iconSize: [25, 41], // Size of the icon
              iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
              popupAnchor: [1, -34] // Point from which the popup should open relative to the iconAnchor
            })
          }).addTo(map).bindPopup(address).openPopup();

          // Add marker for hub with custom icon
          L.marker([hubCoords.lat, hubCoords.lon], {
            icon: L.icon({
              iconUrl: process.env.PUBLIC_URL + '/Images/hub-icon.svg',
              iconSize: [25, 41], // Size of the icon
              iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
              popupAnchor: [1, -34] // Point from which the popup should open relative to the iconAnchor
            })
          }).addTo(map).bindPopup(hub).openPopup();

          // Get all routes between the address and hub
          const routes = await getAllRoutes(hubCoords, addressCoords);

          console.log('Routes:', routes); // Log routes for debugging

          // Define an array of colors for the routes
          const colors = ['red', 'black', 'black'];

          // Draw all routes on the map
          routes.forEach((route, index) => {
            L.polyline(route.points, { color: colors[index % colors.length] }).addTo(map);
          });

          // Find the shortest route
          const shortestRoute = routes.reduce((prev, curr) => (prev.duration < curr.duration ? prev : curr));

          // Draw the shortest route on the map in red
          const polylineShortest = L.polyline(shortestRoute.points, { color: 'black' }).addTo(map);

          // Adjust map view to fit the shortest route
          map.fitBounds(polylineShortest.getBounds());
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      };

      updateMap();
    }
  }, [map, address, hub, tomtomApiKey]);

  return <div id="map" style={{ width: '100%', height: '400px' }} />;
};

export default Icon;
