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
        try {
          const response = await fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(location)}.json?key=${tomtomApiKey}`);
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const { lat, lon } = data.results[0].position;
            return { lat, lon };
          } else {
            throw new Error('Address not found');
          }
        } catch (error) {
          console.error(`Error fetching coordinates for ${location}:`, error);
          throw error;
        }
      };

      const getAllRoutes = async (start, end) => {
        try {
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
        } catch (error) {
          console.error('Error fetching routes:', error);
          throw error;
        }
      };

      const updateMap = async () => {
        try {
          const addressCoords = await getCoordinates(address);
          const hubCoords = await getCoordinates(hub);

          map.setView([addressCoords.lat, addressCoords.lon], 12);

         
          map.eachLayer((layer) => {
            if (layer instanceof L.Marker || layer instanceof L.Polyline) {
              map.removeLayer(layer);
            }
          });

        
          L.marker([addressCoords.lat, addressCoords.lon], {
            icon: L.icon({
              iconUrl: process.env.PUBLIC_URL + '/Images/address-icon.svg',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34]
            })
          }).addTo(map).bindPopup(address).openPopup();

          L.marker([hubCoords.lat, hubCoords.lon], {
            icon: L.icon({
              iconUrl: process.env.PUBLIC_URL + '/Images/hub-icon.svg',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34]
            })
          }).addTo(map).bindPopup(hub).openPopup();

          const routes = await getAllRoutes(hubCoords, addressCoords);
          console.log('Routes:', routes);

          const colors = ['red', 'black', 'black'];

         
          routes.forEach((route, index) => {
            L.polyline(route.points, { color: colors[index % colors.length] }).addTo(map);
          });

          
          await fetch('http://localhost:3001/api/save-routes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ addressCoords, hubCoords, routes })
          });

          
          const shortestRouteResponse = await fetch('http://localhost:3001/api/shortest-route');
          const shortestRoute = await shortestRouteResponse.json();

          console.log('Shortest route from server:', shortestRoute);

          const polylineShortest = L.polyline(shortestRoute.points, { color: 'black' }).addTo(map);

          map.fitBounds(polylineShortest.getBounds());
        } catch (error) {
          console.error('Error updating map:', error);
        }
      };

      updateMap();
    }
  }, [map, address, hub, tomtomApiKey]);

  return <div id="map" style={{ width: '100%', height: '400px' }} />;
};

export default Icon;
