// App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

import Distance from './components/Distance';




const App = () => {
  const [data, setData] = useState([]);
  const [parcelId, setParcelId] = useState('');
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [selectedHub, setSelectedHub] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:4000/api/data');
        setData(response.data);
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = () => {
    const selectedParcel = data.find(item => item.parcelId === parcelId);

    if (selectedParcel) {
      setSelectedAddress(selectedParcel.address);
      setSelectedHub(selectedParcel.hub);
    } else {
      setSelectedAddress(null);
      setSelectedHub(null);
    }
  };
  return (
    <div>
      <h1>Enter Parcel ID to display Address and Hub</h1>
      <input
        type="text"
        value={parcelId}
        onChange={e => setParcelId(e.target.value)}
        placeholder="Enter Parcel ID"
      />
      <button onClick={handleSubmit}>Submit</button>

      {selectedAddress && selectedHub && (
        <div>
          <p>
            <strong>Parcel ID:</strong> {parcelId}, <strong>Address:</strong> {selectedAddress}, <strong>Hub:</strong> {selectedHub}
          </p>
          {/*<MapComponent address={selectedAddress} hub={selectedHub} /> 
          <Map address={selectedAddress}  />
         
          <Line address={selectedAddress} hub={selectedHub} />

           
            <Icon address={selectedAddress} hub={selectedHub} />

            */}


<Distance address={selectedAddress} hub={selectedHub} />


        </div>
      )}
    </div>
  );
};

export default App;
