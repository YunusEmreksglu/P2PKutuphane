import { Routes, Route } from 'react-router-dom';
import Library from './pages/Library';
import Reader from './pages/Reader';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/read/:filename" element={<Reader />} />
      </Routes>
    </div>
  );
}

export default App;
