import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const Icon = ({ address, hub }) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const tomtomApiKey = 'yEUe2tq2wA9cUsyryFi2D7T32akU1UGW'; // Replace with your TomTom API key

  useEffect(() => {
    // Initialize map
    mapRef.current = L.map('map', {
      center: [0, 0], // Initial center
      zoom: 2, // Initial zoom level
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
      // Function to get coordinates from an address
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

      // Function to get all possible routes between two coordinates
      const getAllRoutes = async (start, end) => {
        const response = await fetch(`https://api.tomtom.com/routing/1/calculateRoute/${start.lat},${start.lon}:${end.lat},${end.lon}/json?key=${tomtomApiKey}&maxAlternatives=3`);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          return data.routes.map(route => ({
            points: route.legs[0].points.map(point => [point.latitude, point.longitude]),
            length: route.summary.lengthInMeters
          }));
        } else {
          throw new Error('Routes not found');
        }
      };

      // Fetch coordinates and update map
      const updateMap = async () => {
        try {
          const addressCoords = await getCoordinates(address);
          const hubCoords = await getCoordinates(hub);

          map.setView([addressCoords.lat, addressCoords.lon], 12);

          // Add marker for address with custom icon
          const addressMarker = L.marker([addressCoords.lat, addressCoords.lon], {
            icon: L.icon({
              iconUrl: process.env.PUBLIC_URL + '/Images/address-icon.svg',
              iconSize: [25, 41], // Size of the icon
              iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
              popupAnchor: [1, -34] // Point from which the popup should open relative to the iconAnchor
            })
          }).addTo(map).bindPopup(address).openPopup();

          // Add marker for hub with custom icon
          const hubMarker = L.marker([hubCoords.lat, hubCoords.lon], {
            icon: L.icon({
              iconUrl: process.env.PUBLIC_URL + '/Images/hub-icon.svg',
              iconSize: [25, 41], // Size of the icon
              iconAnchor: [12, 41], // Point of the icon which will correspond to marker's location
              popupAnchor: [1, -34] // Point from which the popup should open relative to the iconAnchor
            })
          }).addTo(map).bindPopup(hub).openPopup();

          // Get all routes between the address and hub
          const routes = await getAllRoutes(hubCoords, addressCoords);

          // Draw all routes on the map in yellow
          routes.forEach(route => {
            const polyline = L.polyline(route.points, { color: 'black' }).addTo(map);
          });

          // Find the shortest route
          const shortestRoute = routes.reduce((prev, curr) => (prev.length < curr.length ? prev : curr));

          // Draw the shortest route on the map in blue
          const polylineShortest = L.polyline(shortestRoute.points, { color: 'red' }).addTo(map);

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
