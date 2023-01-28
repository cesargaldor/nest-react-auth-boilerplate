import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

function App() {
  const [isLoggedIn, setLoginStatus] = useState(null);

  const handleLogin = (token) => {
    axios.post('http://localhost:4000/auth/google', { token }).then((res) => {
      if (res.status > 200) {
        setLoginStatus(`Hola, ${res.data.name}`);
      }
    });
  };

  return (
    <div className="App">
      {!isLoggedIn ? (
        <GoogleLogin
          onSuccess={({ credential }) => handleLogin(credential)}
          onError={() => {
            console.log('Login Failed');
          }}
        />
      ) : (
        <div>{isLoggedIn}</div>
      )}
    </div>
  );
}

export default App;
